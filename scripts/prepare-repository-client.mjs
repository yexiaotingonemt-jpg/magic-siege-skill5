import {cp,mkdir,mkdtemp,readdir,readFile,writeFile,rm,stat,open} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {SERVER_VERSION,CLIENT_VERSION,GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
const root=fileURLToPath(new URL('..',import.meta.url)),bundle=path.resolve(process.argv[2]||'');
if(process.platform!=='win32'||SERVER_VERSION!==CLIENT_VERSION)throw Error('需要 Windows 和统一的两端发布号');
const meta=JSON.parse(await readFile(path.join(bundle,'VERSION.json'),'utf8'));
if(meta.clientVersion!==CLIENT_VERSION||meta.gameVersion!==GAME_VERSION)throw Error('桌面包与源码版本不一致');
const hash=async file=>{const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');};
const runtimeVersion=`${meta.electronVersion}-win32-x64`,runtimeDir=path.join(root,'desktop-runtime',runtimeVersion),runtimeManifest=path.join(runtimeDir,'runtime.json');
let sdk;
try{sdk=JSON.parse(await readFile(runtimeManifest,'utf8'));for(const part of sdk.parts)if(await hash(path.join(root,part.file))!==part.sha256)throw Error('运行环境分片校验失败');}
catch(error){if(error.code!=='ENOENT')throw error;
 await mkdir(runtimeDir,{recursive:true});const scratch=await mkdtemp(path.join(tmpdir(),'magic-repository-runtime-'));
 try{
  const files=path.join(scratch,'sdk');await mkdir(files);
  for(const item of await readdir(bundle,{withFileTypes:true}))if(!['resources','VERSION.json','使用说明.txt'].includes(item.name))await cp(path.join(bundle,item.name),path.join(files,item.name),{recursive:true});
  const archive=path.join(scratch,'runtime.zip');
  execFileSync('powershell.exe',['-NoProfile','-Command','Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:MAGIC_SDK_SOURCE,$env:MAGIC_SDK_ZIP,[IO.Compression.CompressionLevel]::Optimal,$false)'],{env:{...process.env,MAGIC_SDK_SOURCE:files,MAGIC_SDK_ZIP:archive},windowsHide:true});
  sdk={version:runtimeVersion,sha256:await hash(archive),parts:[]};const size=(await stat(archive)).size,chunkSize=48*1024*1024;
  for(let start=0,n=1;start<size;start+=chunkSize,n++){
   const dest=path.join(runtimeDir,'runtime.zip.'+String(n).padStart(3,'0'));
   await pipeline(createReadStream(archive,{start,end:Math.min(size-1,start+chunkSize-1)}),createWriteStream(dest));
   sdk.parts.push({file:path.relative(root,dest).replaceAll('\\','/'),sha256:await hash(dest)});
  }
  await writeFile(runtimeManifest,JSON.stringify(sdk,null,2)+'\n');
 }finally{if(path.dirname(scratch)!==tmpdir()||!path.basename(scratch).startsWith('magic-repository-runtime-'))throw Error('临时目录无效');await rm(scratch,{recursive:true,force:true});}
}
if(process.argv.includes('--reuse-launcher')){
 const prior=JSON.parse(await readFile(path.join(root,'desktop-client.json'),'utf8'));
 if(await hash(path.join(root,'魔法王座.exe'))!==prior.files['魔法王座.exe'])throw Error('既有启动器校验失败，不能复用');
}else execFileSync('go',['build','-trimpath','-ldflags=-s -w -H windowsgui','-o',path.join(root,'魔法王座.exe'),path.join(root,'client/bootstrap/main_windows.go')],{cwd:root,stdio:'inherit',windowsHide:true});
const prebuilt=path.join(root,'client/prebuilt');
if(path.resolve(prebuilt)!==path.resolve(root,'client/prebuilt'))throw Error('预构建目录无效');
await rm(prebuilt,{recursive:true,force:true});await mkdir(prebuilt);
for(const item of await readdir(path.join(root,'client/dist'),{withFileTypes:true}))if(item.name!=='art')await cp(path.join(root,'client/dist',item.name),path.join(prebuilt,item.name),{recursive:true});
const files={};
async function record(folder){for(const item of await readdir(path.join(root,folder),{withFileTypes:true})){const file=path.posix.join(folder,item.name);if(item.isDirectory())await record(file);else files[file]=await hash(path.join(root,file));}}
await record('client/prebuilt');await record('client/desktop');
for(const file of ['魔法王座.exe','client/launcher.mjs','client/client-config.json','shared/protocol.js'])files[file]=await hash(path.join(root,file));
await writeFile(path.join(root,'desktop-client.json'),JSON.stringify({version:CLIENT_VERSION,serverVersion:SERVER_VERSION,gameVersion:GAME_VERSION,protocolVersion:PROTOCOL_VERSION,files,runtime:sdk},null,2)+'\n');
console.log(JSON.stringify({version:CLIENT_VERSION,launcher:path.join(root,'魔法王座.exe'),runtime:sdk.version,parts:sdk.parts.length,files:Object.keys(files).length}));

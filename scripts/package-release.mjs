import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildManifest} from '../server/release-manifest.mjs';
// Client releases and combat compatibility are versioned independently.
import {SERVER_VERSION,CLIENT_VERSION,GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
if(SERVER_VERSION!==CLIENT_VERSION)throw Error('客户端与服务器发布版本必须一致');
const root=fileURLToPath(new URL('..',import.meta.url));
const kind=process.argv[2];
if(!['client','server'].includes(kind))throw Error('Usage: node scripts/package-release.mjs client|server [--server URL] [--no-runtime]');
const stamp=new Date().toISOString().replace(/[-:.TZ]/g,'');
const name=`magic-siege-${kind}-v${kind==='client'?CLIENT_VERSION:SERVER_VERSION}-${stamp}`,output=path.join(process.env.MAGIC_RELEASE_DIR?path.resolve(process.env.MAGIC_RELEASE_DIR):path.join(root,'release'),name);
await mkdir(output,{recursive:true});
const copy=(source,dest=source)=>cp(path.join(root,source),path.join(output,dest),{recursive:true});
if(kind==='client'){
 const builtVersion=JSON.parse(await readFile(path.join(root,'client/dist/client-version.json'),'utf8'));
 if(builtVersion.clientVersion!==CLIENT_VERSION||builtVersion.gameVersion!==GAME_VERSION||builtVersion.protocolVersion!==PROTOCOL_VERSION)throw Error('客户端构建版本已过期，请先运行 npm run build');
 const {parseServerUrl}=await import('../client/launcher.mjs');
 const option=process.argv.indexOf('--server');
 const config=JSON.parse(await readFile(path.join(root,'client/client-config.json'),'utf8'));
 config.serverUrl=parseServerUrl(process.env.MAGIC_SERVER_URL||(option>=0?process.argv[option+1]:config.serverUrl)).origin;
 await copy('client/dist');
 for(const f of ['launcher.mjs','Start-Client.cmd'])await copy('client/'+f);
 await copy('shared/protocol.js');
 await writeFile(path.join(output,'client/client-config.json'),JSON.stringify(config,null,2)+'\n');
 const bundledRuntime=process.platform==='win32'&&!process.argv.includes('--no-runtime');
 if(bundledRuntime){
  await mkdir(path.join(output,'client/runtime'),{recursive:true});
  await cp(process.execPath,path.join(output,'client/runtime/node.exe'));
  const licenseUrl=`https://raw.githubusercontent.com/nodejs/node/v${process.versions.node}/LICENSE`;
  const license=process.env.NODE_LICENSE_FILE?await readFile(process.env.NODE_LICENSE_FILE,'utf8'):await fetch(licenseUrl,{signal:AbortSignal.timeout(20000)}).then(async response=>{if(!response.ok)throw Error(`无法下载Node.js许可证（${response.status}），可用NODE_LICENSE_FILE指定本地完整许可证`);return response.text();});
  if(!license.includes('Node.js is licensed for use as follows'))throw Error('Node.js许可证内容不正确，请核对NODE_LICENSE_FILE');
  await writeFile(path.join(output,'client/runtime/NODE-LICENSE.txt'),license);
 }
 await writeFile(path.join(output,'Start-Client.cmd'),'@echo off\r\ncall "%~dp0client\\Start-Client.cmd"\r\n');
 await writeFile(path.join(output,'README.txt'),`魔法王座本地客户端\n\n1. 完整解压，不要在压缩包中运行。\n2. 管理者在 client/client-config.json 中填写战斗服务器 serverUrl。当前：${config.serverUrl}\n3. Windows 双击根目录 Start-Client.cmd；其他系统执行 node client/launcher.mjs。\n4. 浏览器从本机加载画面与美术，只有登录、操作和战局状态连接远端。\n5. 游戏期间保持启动窗口运行，关闭窗口即断开本地客户端。\n6. 更新时完整解压新包，关闭旧启动器再启动。不要直接双击 dist/index.html。\n\n${bundledRuntime?'已附带 Windows '+process.arch+' Node.js 运行环境，无需安装依赖。':'此包未附带运行环境，需要本机安装兼容的 Node.js。'}\n`);
}else{
 for(const f of ['server','shared','deploy'])await copy(f);
 await copy('deploy/README.md','README.md');
}
await writeFile(path.join(output,'package.json'),JSON.stringify({name:'magic-siege-'+kind,version:kind==='client'?CLIENT_VERSION:SERVER_VERSION,private:true,type:'module',scripts:{start:kind==='server'?'node server/index.mjs':'node client/launcher.mjs'}},null,2)+'\n');
await writeFile(path.join(output,'VERSION.json'),JSON.stringify({serverVersion:SERVER_VERSION,clientVersion:CLIENT_VERSION,gameVersion:GAME_VERSION,protocolVersion:PROTOCOL_VERSION},null,2)+'\n');
if(kind==='server')await writeFile(path.join(output,'server-manifest.json'),JSON.stringify(await buildManifest(output),null,2)+'\n');
// Ship the licenses for the bundled browser libraries with the player package.
if(kind==='client')for(const [source,dest]of [['node_modules/phaser/LICENSE.md','PHASER-LICENSE.md'],['node_modules/eventemitter3/LICENSE','EVENTEMITTER3-LICENSE.txt']])await copy(source,dest);
console.log('Release directory: '+output);
if(process.platform==='win32'){
 const zip=output+'.zip';
 execFileSync('powershell.exe',['-NoProfile','-Command','Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory($env:MAGIC_PACKAGE_PATH, $env:MAGIC_PACKAGE_ZIP, [System.IO.Compression.CompressionLevel]::Optimal, $true)'],{env:{...process.env,MAGIC_PACKAGE_PATH:output,MAGIC_PACKAGE_ZIP:zip},windowsHide:true,stdio:'pipe'});
 const digest=createHash('sha256').update(await readFile(zip)).digest('hex');
 await writeFile(zip+'.sha256',`${digest}  ${path.basename(zip)}\n`);
 console.log('ZIP: '+zip+'\nSHA256: '+digest);
}

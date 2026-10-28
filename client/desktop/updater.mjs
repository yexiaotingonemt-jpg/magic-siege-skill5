import {verify,createHash,randomUUID} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {readFile,mkdir,stat,rename,unlink,writeFile,copyFile,statfs,open} from 'node:fs/promises';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable,Transform} from 'node:stream';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {UPDATE_PUBLIC_KEY,canonicalRelease,validateRelease} from '../../shared/update-protocol.js';
import {GAME_VERSION,PROTOCOL_VERSION} from '../../shared/protocol.js';
export function verifyUpdate(manifest,version,arch,publicKey=UPDATE_PUBLIC_KEY){
 const release=validateRelease(manifest.release,version,arch);
 if(!verify(null,Buffer.from(canonicalRelease(release)),publicKey,Buffer.from(manifest.signature||'','base64')))throw Error('更新签名校验失败，请稍后重试');
 return release;
}
export async function downloadUpdate(url,file,release,onProgress=()=>{}){
 await mkdir(path.dirname(file),{recursive:true});
 const partial=file+'.part';let offset=await stat(partial).then(s=>s.size).catch(()=>0);if(offset>release.size){await unlink(partial);offset=0;}
 if(offset<release.size){
  const response=await fetch(url,{redirect:'error',headers:offset?{Range:`bytes=${offset}-`}:{},signal:AbortSignal.timeout(20*60*1000)});
  if(!response.ok)throw Error('更新下载失败，请检查网络');
  if(offset&&response.status!==206)offset=0;
  if(response.status===206&&response.headers.get('content-range')!==`bytes ${offset}-${release.size-1}/${release.size}`)throw Error('更新下载范围不正确');
  let received=offset;
  const meter=new Transform({transform(chunk,_encoding,callback){received+=chunk.length;if(received>release.size)return callback(Error('更新包大小不正确'));onProgress({received,total:release.size,percent:Math.floor(received/release.size*100)});callback(null,chunk);}});
  await pipeline(Readable.fromWeb(response.body),meter,createWriteStream(partial,{flags:offset?'a':'w'}));
 }
 const size=(await stat(partial)).size,hash=createHash('sha256');for await(const chunk of createReadStream(partial))hash.update(chunk);
 if(size!==release.size||hash.digest('hex')!==release.sha256){await unlink(partial);throw Error('更新文件校验失败，已保留当前版本');}
 await rename(partial,file);return file;
}
export function createUpdater({app,serverUrl,window,getVersion}){
 let active,status={phase:'idle'},blocked=process.argv.includes('--update-failed');
 const publish=value=>{status=value;if(!window.isDestroyed())window.webContents.send('magic:update-status',value);};
 const run=async()=>{
  const versionResponse=await fetch(serverUrl+'/api/version',{redirect:'error',signal:AbortSignal.timeout(10000)});if(!versionResponse.ok)throw Error('无法获取服务器更新版本');
  const required=await versionResponse.json();if(required.clientVersion===getVersion()&&required.gameVersion===GAME_VERSION&&required.protocolVersion===PROTOCOL_VERSION){publish({phase:'current',message:'客户端已是当前版本'});window.reload();return;}
  if(!app.isPackaged)throw Error('开发运行模式不替换源码，请使用桌面发布包验证更新');
  publish({phase:'checking',message:'正在获取更新…'});
  const feed=serverUrl+'/api/updates/win32-'+process.arch;
  const response=await fetch(feed,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('服务器更新正在准备，请稍后重试');
  const release=verifyUpdate(await response.json(),required.clientVersion,process.arch);
  if(release.gameVersion!==required.gameVersion||release.protocolVersion!==required.protocolVersion)throw Error('更新包战斗兼容版本不正确');
  const installDir=path.dirname(process.execPath),parent=path.dirname(installDir);
  if(installDir===parent)throw Error('请将游戏放在独立文件夹中运行');
  const space=await statfs(parent);if(space.bavail*space.bsize<release.size*5)throw Error('磁盘空间不足，请腾出空间后重试');
  // Probe the installation parent before downloading; no elevation is requested.
  const probe=path.join(parent,'.magic-write-'+randomUUID());await writeFile(probe,'');await unlink(probe);
  const cache=path.join(app.getPath('userData'),'updates'),file=path.join(cache,release.sha256+'.zip');
  for(let attempt=0;attempt<3;attempt++){
   try{publish({phase:'downloading',version:release.version,message:'正在下载更新…',percent:0});await downloadUpdate(feed+'/package.zip',file,release,progress=>publish({phase:'downloading',version:release.version,message:'正在下载更新…',...progress}));break;}
   catch(error){if(attempt===2)throw error;publish({phase:'retrying',message:'网络暂时中断，正在自动重试…'});await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));}
  }
  publish({phase:'installing',message:'下载完成，正在更新并重新启动…',percent:100});
  const token=randomUUID().replaceAll('-',''),transaction=path.join(cache,token);await mkdir(transaction,{recursive:true});
  const helper=path.join(transaction,'install-update.ps1');await copyFile(fileURLToPath(new URL('./install-update.ps1',import.meta.url)),helper);
  const plan={token,pid:process.pid,currentExe:process.execPath,installDir,packagePath:file,userData:app.getPath('userData'),transaction,release};
  const planFile=path.join(transaction,'plan.json');await writeFile(planFile,JSON.stringify(plan),{mode:0o600});
  const log=await open(path.join(transaction,'installer-bootstrap.log'),'a');
  const shell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  // PowerShell needs its own hidden console to survive the old Electron console.
  // CREATE_DETACHED_PROCESS alone silently exits on Windows PowerShell 5.
  const helperEnv={...process.env,MAGIC_UPDATE_HELPER:helper,MAGIC_UPDATE_PLAN:planFile,MAGIC_UPDATE_TRANSACTION:transaction,MAGIC_UPDATE_SHELL:shell};delete helperEnv.PSModulePath;
  const command=`$ErrorActionPreference='Stop'; Start-Process -FilePath $env:MAGIC_UPDATE_SHELL -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',('"'+$env:MAGIC_UPDATE_HELPER+'"'),'-PlanFile',('"'+$env:MAGIC_UPDATE_PLAN+'"')) -WindowStyle Hidden -WorkingDirectory $env:MAGIC_UPDATE_TRANSACTION -RedirectStandardOutput (Join-Path $env:MAGIC_UPDATE_TRANSACTION 'installer.log') -RedirectStandardError (Join-Path $env:MAGIC_UPDATE_TRANSACTION 'installer-error.log')`;
  const child=spawn(shell,['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{cwd:transaction,env:helperEnv,stdio:['ignore',log.fd,log.fd],windowsHide:true});
  child.once('exit',(code,signal)=>{writeFile(path.join(transaction,'helper-exit.json'),JSON.stringify({code,signal})).catch(()=>{});});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
  await log.close();
  let started=false;for(let i=0;i<100;i++){if(await stat(path.join(transaction,'helper-ready')).catch(()=>false)){started=true;break;}await new Promise(resolve=>setTimeout(resolve,100));}
  if(!started)throw Error('无法启动更新安装程序，请重试');
  setTimeout(()=>app.quit(),150);
 };
 return {get status(){return status;},start(manual=false){if(blocked&&!manual){publish({phase:'error',message:'上次更新未成功，已恢复旧版。正在等待重试。'});return Promise.resolve(status);}if(active)return active;blocked=false;active=run().catch(error=>{publish({phase:'error',message:error.message});}).finally(()=>{active=null;});return active;}};
}

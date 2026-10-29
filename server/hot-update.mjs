import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile,realpath,mkdir,chmod,lstat,unlink,stat} from 'node:fs/promises';
import {symlinkSync,renameSync,appendFileSync,unlinkSync} from 'node:fs';
import {verifyRelease,newerVersion} from './release-manifest.mjs';
import {GitHubSourceVerifier} from './source-provenance.mjs';

const fixedFiles=['server/index.mjs','server/hot-update.mjs','server/release-manifest.mjs','server/source-provenance.mjs'];
export function createHotUpdater({getRuntime,setRuntime,quiesce,resume,runtimeRoot,appRoot,runtimeOptions={},sourceVerifier=new GitHubSourceVerifier({cacheDir:path.join(appRoot||runtimeRoot,'shared/runtime/github-source.git')})}){
 let activeRoot=path.resolve(runtimeRoot),busy=false,reloads=0;
 const status=async()=>({releaseDir:activeRoot,manifest:await verifyRelease(activeRoot),...getRuntime().metadata,matchId:getRuntime().room.matchId,reloads});
 const update=async({releaseDir,baseDigest,battle='preserve'}={})=>{
  if(busy)throw Error('已有热更正在执行');
  if(!['preserve','restart'].includes(battle))throw Error('battle 必须为 preserve 或 restart');
  if(reloads>=50)throw Error('热更次数达到限制，请安排常规进程重启');
  busy=true;let paused=false,prepared,prior,oldRoot,switched=false;
  function switchLink(target){
   const link=path.join(appRoot,'current'),temporary=path.join(appRoot,'current-hot-'+process.pid);
   symlinkSync(target,temporary,'dir');try{renameSync(temporary,link);}catch(error){unlinkSync(temporary);throw error;}
  }
  try{
   if(typeof releaseDir!=='string'||!path.isAbsolute(releaseDir))throw Error('需要发布目录的绝对路径');
   const target=await realpath(releaseDir),current=await verifyRelease(activeRoot),next=await verifyRelease(target);
   if(target===await realpath(activeRoot)||next.digest===current.digest)throw Error('目标版本已经生效');
   if(baseDigest!==current.digest)throw Error('基准版本已变化，请重新生成差异包');
   if(!newerVersion(next.version.serverVersion,current.version.serverVersion))throw Error('新发布号必须高于当前版本');
   if(appRoot){
    const releases=await realpath(path.join(appRoot,'releases'));
    if(path.dirname(target)!==releases||(await realpath(path.join(appRoot,'current')))!==await realpath(activeRoot))throw Error('发布目录或 current 指向不正确');
   }
   for(const name of fixedFiles)if(next.files[name]!==current.files[name])throw Error('引导文件改变，需要常规部署：'+name);
   const sourceProof=await sourceVerifier.verifyManifest(next,current);
   // Verify GitHub provenance before importing any candidate code.
   const module=await import(pathToFileURL(path.join(target,'server/game-runtime.mjs')).href);
   if(typeof module.prepareGameRuntime!=='function')throw Error('目标版本不支持热更');
   paused=true;await quiesce();prior=getRuntime();oldRoot=activeRoot;
   prepared=module.prepareGameRuntime(runtimeOptions,prior,{restartBattle:battle==='restart'});
   for(const key of ['serverVersion','clientVersion','gameVersion','protocolVersion'])if(prepared.runtime.metadata[key]!==next.version[key])throw Error('运行代码与发布清单版本不一致');
   if(appRoot&&(await realpath(path.join(appRoot,'current')))!==await realpath(activeRoot))throw Error('激活前 current 已被其他部署修改');
   const record={at:new Date().toISOString(),previous:activeRoot,releaseDir:target,baseDigest,digest:next.digest,source:sourceProof,battle,previousMatchId:prior.room.matchId,matchId:prepared.runtime.room.matchId,...prepared.runtime.metadata};
   // No await after commit: no timer or command can observe a half-applied runtime.
   prepared.commit();setRuntime(prepared.runtime);
   JSON.stringify(prepared.runtime.room.snapshot());
   if(appRoot){switchLink(target);switched=true;process.chdir(target);appendFileSync(path.join(appRoot,'shared/runtime/hot-updates.jsonl'),JSON.stringify(record)+'\n',{mode:0o600});}
   activeRoot=target;reloads++;
   // Every client must reconnect and pass the new release-version gate.
   for(const client of [...prior.room.clients]){try{client.res.end();}catch{}}
   return {ok:true,...record,reloads};
  }catch(error){
   if(prepared){prepared.rollback();setRuntime(prior);}
   if(switched){switchLink(oldRoot);process.chdir(oldRoot);}
   throw error;
  }finally{if(paused)resume();busy=false;}
 };
 return {status,update};
}

// Private Unix socket, never a public game API.
export async function listenHotControl(socketPath,updater){
 if(process.platform==='win32')throw Error('本机热更控制服务需运行于 Linux/Unix；Windows 支持制作差异包');
 const parent=path.dirname(socketPath);await mkdir(parent,{recursive:true,mode:0o700});
 const parentInfo=await lstat(parent);
 if(!parentInfo.isDirectory()||parentInfo.isSymbolicLink()||parentInfo.uid!==process.getuid())throw Error('控制目录必须为服务账号拥有的普通目录');
 await chmod(parent,0o700);
 const existing=await lstat(socketPath).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
 if(existing){
  if(!existing.isSocket()||existing.uid!==process.getuid())throw Error('控制 socket 路径被其他文件占用');
  await new Promise((resolve,reject)=>{const probe=net.createConnection(socketPath);probe.setTimeout(1000,()=>probe.destroy(Error('控制 socket 探测超时')));probe.once('connect',()=>{probe.destroy();reject(Error('已有服务使用热更控制 socket'));});probe.once('error',error=>{if(error.code==='ECONNREFUSED')resolve();else reject(error);});});
  await unlink(socketPath);
 }
 const control=http.createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  try{
   if(req.method==='GET'&&req.url==='/status')return send(200,await updater.status());
   if(req.method!=='POST'||req.url!=='/update')return send(404,{error:'不存在的控制命令'});
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)throw Error('控制命令过大');}
   send(200,await updater.update(JSON.parse(raw)));
  }catch(error){send(400,{error:error.message});}
 });
 control.requestTimeout=15000;
 await new Promise((resolve,reject)=>{control.once('error',reject);control.listen(socketPath,resolve);});
 try{await chmod(socketPath,0o600);}catch(error){control.close();throw error;}
 return control;
}

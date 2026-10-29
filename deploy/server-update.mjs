import http from 'node:http';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {readFile,writeFile,mkdir,copyFile,realpath,rmdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validateManifest,verifyRelease,regularFile,sha256} from '../server/release-manifest.mjs';

const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function changes(base,next){
 return {changed:Object.keys(next.files).filter(name=>base.files[name]!==next.files[name]).sort(),removed:Object.keys(base.files).filter(name=>!(name in next.files)).sort()};
}
export async function packDelta({baseFile,source,output}){
 const input=JSON.parse(await readFile(baseFile,'utf8')),base=validateManifest(input.manifest||input),next=await verifyRelease(source);
 if(base.digest===next.digest)throw Error('没有需要发布的差异');
 const delta={format:1,baseDigest:base.digest,manifest:next,...changes(base,next)};
 await mkdir(output,{recursive:false});
 for(const name of delta.changed){
  const sourceFile=await regularFile(source,name),target=path.join(output,'payload',name);
  await mkdir(path.dirname(target),{recursive:true});await copyFile(sourceFile,target);
 }
 await writeFile(path.join(output,'delta.json'),JSON.stringify(delta,null,2)+'\n');
 return {output:path.resolve(output),baseDigest:base.digest,digest:next.digest,changed:delta.changed,removed:delta.removed};
}
export function controlRequest(socketPath,route,body){
 return new Promise((resolve,reject)=>{
  const request=http.request({socketPath,path:route,method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{}},response=>{
   let data='';response.setEncoding('utf8');response.on('data',chunk=>{data+=chunk;if(data.length>1024*1024)response.destroy(Error('控制响应过大'));});
   response.on('error',reject);response.on('end',()=>{try{const value=JSON.parse(data);if(response.statusCode!==200)throw Error(value.error||'热更失败');resolve(value);}catch(error){reject(error);}});
  });
  request.setTimeout(120000,()=>request.destroy(Error('控制请求超时；先查询 status，勿直接重试发布')));
  request.on('error',reject);request.end(body?JSON.stringify(body):undefined);
 });
}
export async function stageDelta({appRoot,bundle}){
 const root=await realpath(appRoot),current=await realpath(path.join(root,'current'));
 const releases=await realpath(path.join(root,'releases'));
 if(path.dirname(current)!==releases)throw Error('current 未指向本项目 releases 下的版本');
 const base=await verifyRelease(current),delta=JSON.parse(await readFile(path.join(bundle,'delta.json'),'utf8'));
 if(delta.format!==1||delta.baseDigest!==base.digest)throw Error('差异包基准与线上版本不一致');
 const next=validateManifest(delta.manifest),expected=changes(base,next);
 if(!equal(delta.changed,expected.changed)||!equal(delta.removed,expected.removed))throw Error('差异文件列表与发布清单不一致');
 const changed=new Set(delta.changed);
 // Verify every payload before creating a release. Never change current in place or hard-link rollback files.
 for(const name of delta.changed)if(sha256(await readFile(await regularFile(path.join(bundle,'payload'),name)))!==next.files[name])throw Error('差异文件校验失败：'+name);
 const target=path.join(releases,'hot-'+randomUUID());await mkdir(target,{mode:0o700});
 for(const name of Object.keys(next.files)){
  const from=await regularFile(changed.has(name)?path.join(bundle,'payload'):current,name),to=path.join(target,name);
  await mkdir(path.dirname(to),{recursive:true});await copyFile(from,to,constants.COPYFILE_FICLONE);
 }
 await writeFile(path.join(target,'server-manifest.json'),JSON.stringify(next,null,2)+'\n');
 await verifyRelease(target);
 return {releaseDir:target,baseDigest:base.digest,changed:delta.changed.length,removed:delta.removed.length};
}
export async function applyDelta({appRoot,bundle,battle='preserve',socketPath=path.join(appRoot,'shared/runtime/hot-update.sock')}){
 if(!['preserve','restart'].includes(battle))throw Error('--battle 必须为 preserve 或 restart');
 const runtime=path.join(appRoot,'shared/runtime');await mkdir(runtime,{recursive:true,mode:0o700});
 const lock=path.join(runtime,'hot-update-deploy.lock');await mkdir(lock,{mode:0o700});
 try{
  const active=await controlRequest(socketPath,'/status');
  const current=await realpath(path.join(appRoot,'current'));
  if(await realpath(active.releaseDir)!==current)throw Error('进程与 current 目录不一致');
  const staged=await stageDelta({appRoot,bundle});
  if(staged.baseDigest!==active.manifest.digest)throw Error('运行中的版本与差异包基准不一致');
  const result=await controlRequest(socketPath,'/update',{releaseDir:staged.releaseDir,baseDigest:staged.baseDigest,battle});
  const verified=await controlRequest(socketPath,'/status');
  if(verified.manifest.digest!==result.digest||verified.matchId!==result.matchId)throw Error('热更后读回不一致，请检查状态');
  return {...result,changed:staged.changed,removed:staged.removed,verified:true};
 }finally{await rmdir(lock);}
}
async function main(){
 const [command,...args]=process.argv.slice(2),flags={};
 for(let i=0;i<args.length;i+=2){if(!args[i].startsWith('--')||!args[i+1]||args[i+1].startsWith('--'))throw Error('参数必须为 --名称 值');flags[args[i].slice(2)]=args[i+1];}
 const allowed={status:['root','socket'],pack:['base','source','output'],apply:['root','bundle','battle','socket']}[command];
 if(!allowed||Object.keys(flags).some(key=>!allowed.includes(key)))throw Error('用法：status --root APP | pack --base STATUS.json --source SERVER_PACKAGE --output NEW_DIR | apply --root APP --bundle DELTA_DIR [--battle preserve|restart]');
 const required=command==='pack'?['base','source','output']:command==='apply'?['root','bundle']:['root'];
 if(required.some(key=>!flags[key]))throw Error('缺少必需参数：'+required.join(', '));
 let result;
 if(command==='pack')result=await packDelta({baseFile:flags.base,source:path.resolve(flags.source),output:path.resolve(flags.output)});
 if(command==='status')result=await controlRequest(flags.socket||path.join(path.resolve(flags.root),'shared/runtime/hot-update.sock'),'/status');
 if(command==='apply')result=await applyDelta({appRoot:path.resolve(flags.root),bundle:path.resolve(flags.bundle),battle:flags.battle||'preserve',...(flags.socket?{socketPath:flags.socket}:{})});
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{console.error(error.message);process.exitCode=1;});

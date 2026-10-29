import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir} from 'node:fs/promises';
import {sha256,validateManifest} from './release-manifest.mjs';

const exec=promisify(execFile);
export const GITHUB_REPOSITORY='https://github.com/yexiaotingonemt-jpg/magic-siege-skill5.git';
export const DEFAULT_RELEASE_REF='refs/heads/main';
const scope=['server','shared','deploy','package.json','package-lock.json','README.md'];
export async function git(directory,args){
 return (await exec('git',['-C',directory,...args],{encoding:'buffer',maxBuffer:16*1024*1024,timeout:60000,windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}})).stdout;
}
async function blobs(directory,objects){
 const data=await new Promise((resolve,reject)=>{
  const child=spawn('git',['-C',directory,'cat-file','--batch'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  const chunks=[];let size=0;const timer=setTimeout(()=>child.kill(),60000);
  child.on('error',error=>{clearTimeout(timer);reject(error);});child.stdout.on('data',chunk=>{size+=chunk.length;if(size>16*1024*1024)child.kill();else chunks.push(chunk);});
  child.stderr.resume();child.stdin.on('error',reject);child.on('close',code=>{clearTimeout(timer);if(code!==0)reject(Error('无法读取提交中的服务端文件'));else resolve(Buffer.concat(chunks));});
  child.stdin.end(objects.join('\n')+'\n');
 });
 const result=[];let offset=0;
 for(const object of objects){const end=data.indexOf(10,offset),header=data.subarray(offset,end).toString('ascii').split(' '),size=Number(header[2]);if(end<0||header[0]!==object||header[1]!=='blob'||!Number.isSafeInteger(size)||size<0||end+size+2>data.length)throw Error('Git blob 数据格式错误');result.push(data.subarray(end+1,end+1+size));offset=end+size+2;}
 if(offset!==data.length)throw Error('Git blob 响应长度不一致');return result;
}
function validateRef(ref){if(typeof ref!=='string'||!/^refs\/heads\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref)||ref.includes('..')||ref.endsWith('.lock')||ref.endsWith('/'))throw Error('发布分支必须为有效的 refs/heads/分支名');return ref;}
function checkSource(source,ref){
 if(source?.repository!==GITHUB_REPOSITORY||source.ref!==ref||!/^[a-f0-9]{40}$/.test(source.commit))throw Error('发布来源必须绑定本项目 GitHub 发布分支和完整提交 SHA');
}
async function fetchRef(directory,ref,transport=GITHUB_REPOSITORY){
 validateRef(ref);
 const verifiedRef='refs/deploy-verification/'+sha256(Buffer.from(ref)).slice(0,24);
 try{await git(directory,['fetch','--force','--no-tags','--no-recurse-submodules','--',transport,ref+':'+verifiedRef]);}
 catch{throw Error('无法从 GitHub 验证发布分支，请检查网络和 Git 只读认证；禁止离线跳过验证');}
 // Fork's background fetch may replace FETCH_HEAD; pin the explicitly fetched branch instead.
 return (await git(directory,['rev-parse',verifiedRef])).toString().trim();
}
async function ancestor(directory,older,newer,message){
 try{await git(directory,['merge-base','--is-ancestor',older,newer]);}catch{throw Error(message);}
}
function readVersion(protocol,packageFile,lockFile){
 const read=name=>{
  const match=protocol.toString('utf8').match(new RegExp('^export\\s+const\\s+'+name+'\\s*=\\s*(?:[\'\"]([^\'\"]+)[\'\"]|(\\d+))\\s*;','m'));
  if(!match)throw Error('提交中的版本定义无法读取：'+name);
  return name==='PROTOCOL_VERSION'?Number(match[2]):match[1];
 };
 const version={serverVersion:read('SERVER_VERSION'),clientVersion:read('CLIENT_VERSION'),gameVersion:read('GAME_VERSION'),protocolVersion:read('PROTOCOL_VERSION')};
 const pkg=JSON.parse(packageFile),lock=JSON.parse(lockFile);
 if(version.serverVersion!==version.clientVersion||pkg.version!==version.serverVersion||lock.version!==pkg.version||lock.packages?.['']?.version!==pkg.version)throw Error('GitHub 提交中的两端、package 和 lockfile 版本不一致');
 return version;
}
// Read immutable Git blobs, never copy an edited or untracked working-tree file into a server release.
export async function committedLayout(directory,commit){
 if(!/^[a-f0-9]{40}$/.test(commit))throw Error('需要完整提交 SHA');
 const entries=(await git(directory,['ls-tree','-rz',commit,'--',...scope])).toString('utf8').split('\0').filter(Boolean);
 const files=new Map(),names=[],objects=[];
 for(const row of entries){
  const tab=row.indexOf('\t'),[mode,type,object]=row.slice(0,tab).split(' '),name=row.slice(tab+1);
  if(!['100644','100755'].includes(mode)||type!=='blob')throw Error('服务端提交不可包含链接或子模块：'+name);
  names.push(name);objects.push(object);
 }
 const contents=await blobs(directory,objects);names.forEach((name,index)=>files.set(name,contents[index]));
 for(const name of ['server/index.mjs','server/game-runtime.mjs','shared/protocol.js','package.json','package-lock.json','README.md'])if(!files.has(name))throw Error('GitHub 提交缺少服务端文件：'+name);
 const version=readVersion(files.get('shared/protocol.js'),files.get('package.json'),files.get('package-lock.json'));
 files.delete('package-lock.json');
 return {files,version};
}
export async function prepareCommittedPackage(repository,{ref=process.env.MAGIC_DEPLOY_REF||DEFAULT_RELEASE_REF,transport=GITHUB_REPOSITORY}={}){
 validateRef(ref);
 if((await git(repository,['status','--porcelain=v1','--untracked-files=all'])).length)throw Error('工作区存在未提交内容；先提交并推送 GitHub，再生成服务端包');
 const commit=(await git(repository,['rev-parse','HEAD'])).toString().trim();
 const head=await fetchRef(repository,ref,transport);
 await ancestor(repository,commit,head,'当前提交尚未推送或尚未合入 GitHub 发布分支');
 const source={repository:GITHUB_REPOSITORY,ref,commit};
 return {...await committedLayout(repository,commit),source};
}
export class GitHubSourceVerifier{
 // transport is an in-process test seam for isolated local Git remotes; no CLI/payload can override it.
 constructor({cacheDir,ref=process.env.MAGIC_DEPLOY_REF||DEFAULT_RELEASE_REF,transport=GITHUB_REPOSITORY}){this.cacheDir=cacheDir;this.ref=validateRef(ref);this.transport=transport;}
 async verifyManifest(next,base){
  validateManifest(next);checkSource(next.version.source,this.ref);
  if(base){validateManifest(base);checkSource(base.version.source,this.ref);}
  await mkdir(this.cacheDir,{recursive:true,mode:0o700});
  let bare=false;try{bare=(await git(this.cacheDir,['rev-parse','--is-bare-repository'])).toString().trim()==='true';}catch{}
  if(!bare)await exec('git',['init','--bare',this.cacheDir],{windowsHide:true});
  const head=await fetchRef(this.cacheDir,this.ref,this.transport);
  await ancestor(this.cacheDir,next.version.source.commit,head,'目标提交不在 GitHub 发布分支历史中');
  if(base)await ancestor(this.cacheDir,base.version.source.commit,next.version.source.commit,'目标提交未包含线上已发布提交；请先同步并合入其他人的更新，不能只刷新差异基准');
  for(const manifest of base?[base,next]:[next]){
   const {files,version}=await committedLayout(this.cacheDir,manifest.version.source.commit);
   const expectedVersion={...version,source:manifest.version.source};
   if(JSON.stringify(expectedVersion)!==JSON.stringify(manifest.version))throw Error('发布版本元数据与 GitHub 提交不一致');
   const expected=Object.fromEntries([...files].map(([name,bytes])=>[name,sha256(bytes)]));
   expected['VERSION.json']=sha256(Buffer.from(JSON.stringify(expectedVersion,null,2)+'\n'));
   const names=Object.keys(expected).sort();
   if(JSON.stringify(names)!==JSON.stringify(Object.keys(manifest.files).sort())||names.some(name=>expected[name]!==manifest.files[name]))throw Error('服务端发布文件与 GitHub 提交内容不一致');
  }
  return {repository:GITHUB_REPOSITORY,ref:this.ref,branchHead:head,commit:next.version.source.commit,previousCommit:base?.version.source.commit||null,verifiedAt:new Date().toISOString()};
 }
}

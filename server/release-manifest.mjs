import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readdir,readFile,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function hashFile(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export function newerVersion(next,current){const a=next.split('.').map(Number),b=current.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;}
export function releasePath(name){
 if(typeof name!=='string'||name.includes('\\')||name.includes(':')||name.includes('\0')||name.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('非法发布路径');
 if(!/^(server|shared|deploy)\//.test(name)&&!['package.json','VERSION.json','README.md'].includes(name))throw Error('发布文件不在允许目录：'+name);
 if(/(^|\/)(node_modules|data|updates|\.git)(\/|$)/.test(name)||/\.(pem|key|clixml)$/i.test(name)||/accounts\.json$/i.test(name))throw Error('发布包包含运维数据或凭据');
 return name;
}
export function manifestDigest(value){return sha256(JSON.stringify({format:value.format,files:Object.fromEntries(Object.entries(value.files).sort(([a],[b])=>a.localeCompare(b,'en'))),version:value.version}));}
export function validateManifest(value){
 if(value?.format!==1||!value.files||typeof value.files!=='object'||Array.isArray(value.files)||Object.keys(value.files).length>2000)throw Error('发布清单格式错误');
 for(const [name,digest]of Object.entries(value.files)){releasePath(name);if(!/^[a-f0-9]{64}$/.test(digest))throw Error('文件哈希格式错误');}
 for(const name of ['server/index.mjs','server/game-runtime.mjs','server/hot-update.mjs','shared/protocol.js','package.json','VERSION.json'])if(!value.files[name])throw Error('发布清单缺少：'+name);
 if(!value.version||value.version.serverVersion!==value.version.clientVersion||!/^\d+\.\d+\.\d+$/.test(value.version.serverVersion)||!value.version.gameVersion||!Number.isInteger(value.version.protocolVersion))throw Error('发布版本不一致');
 if(value.digest!==manifestDigest(value))throw Error('发布清单摘要错误');
 return value;
}
export async function regularFile(root,name){
 releasePath(name);let current=root;
 for(const part of name.split('/')){current=path.join(current,part);const info=await lstat(current);if(info.isSymbolicLink())throw Error('发布文件不可为链接：'+name);}
 if(!(await lstat(current)).isFile())throw Error('发布项不是普通文件：'+name);
 return current;
}
export async function buildManifest(directory){
 const root=await realpath(directory),files={};
 async function walk(relative){
  const full=path.join(root,relative),info=await lstat(full);
  if(info.isSymbolicLink())throw Error('发布目录包含链接：'+relative);
  if(info.isDirectory()){for(const name of (await readdir(full)).sort())await walk(relative+'/'+name);}
  else if(info.isFile()){releasePath(relative);files[relative]=sha256(await readFile(full));}
  else throw Error('发布目录包含特殊文件');
 }
 for(const directory of ['server','shared','deploy'])await walk(directory);
 for(const name of ['package.json','VERSION.json','README.md'])await walk(name);
 const version=JSON.parse(await readFile(path.join(root,'VERSION.json'),'utf8'));
 const value={format:1,files,version};value.digest=manifestDigest(value);return validateManifest(value);
}
export async function verifyRelease(directory){
 const expected=validateManifest(JSON.parse(await readFile(path.join(directory,'server-manifest.json'),'utf8')));
 const actual=await buildManifest(directory);
 if(actual.digest!==expected.digest)throw Error('发布目录与清单不一致');
 return actual;
}

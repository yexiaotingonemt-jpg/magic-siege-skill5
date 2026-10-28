import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';

function valid(value){return value&&typeof value.name==='string'&&value.name.length>=2&&value.name.length<=20&&typeof value.password==='string'&&value.password.length>=1&&value.password.length<=128;}

// 按远端服务器隔离账号，避免本机代理端口每次启动变化导致记录丢失。
export function createLoginCredentials({directory,serverUrl,safeStorage}){
 const server=new URL(serverUrl).origin;
 const file=path.join(directory,'login-credentials-'+createHash('sha256').update(server).digest('hex')+'.bin');
 return {
  async read(){
   try{
    if(!await safeStorage.isAsyncEncryptionAvailable())return null;
    const {result}=await safeStorage.decryptStringAsync(await readFile(file));
    const saved=JSON.parse(result);
    return saved.server===server&&valid(saved)?{name:saved.name,password:saved.password}:null;
   }catch{return null;}
  },
  async save(credentials){
   try{
    if(!valid(credentials)||!await safeStorage.isAsyncEncryptionAvailable())return false;
    const encrypted=await safeStorage.encryptStringAsync(JSON.stringify({server,name:credentials.name,password:credentials.password}));
    await mkdir(directory,{recursive:true});
    await writeFile(file+'.tmp',encrypted,{mode:0o600});
    await rename(file+'.tmp',file);
    return true;
   }catch{return false;}
  },
 };
}

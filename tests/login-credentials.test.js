import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createLoginCredentials} from '../client/desktop/login-credentials.mjs';

test('加密凭据可跨实例恢复、按服务器隔离，损坏记录和存储异常不阻断登录',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'magic-login-credentials-')),key=randomBytes(32);
 assert.equal(path.dirname(path.resolve(directory)),path.resolve(tmpdir()));assert.ok(path.basename(directory).startsWith('magic-login-credentials-'));
 const safeStorage={
  async isAsyncEncryptionAvailable(){return true;},
  async encryptStringAsync(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]);},
  async decryptStringAsync(value){const decipher=createDecipheriv('aes-256-gcm',key,value.subarray(0,12));decipher.setAuthTag(value.subarray(12,28));return {result:Buffer.concat([decipher.update(value.subarray(28)),decipher.final()]).toString('utf8')};},
 };
 const options={directory,serverUrl:'http://example.test:5183',safeStorage},saved={name:'测试账号',password:'1'};
 try{
  const store=createLoginCredentials(options);assert.equal(await store.read(),null);assert.equal(await store.save(saved),true);
  assert.deepEqual(await createLoginCredentials(options).read(),saved);
  const other=createLoginCredentials({...options,serverUrl:'http://another.test:5183'});assert.equal(await other.read(),null);
  assert.equal(await store.save({name:'错误账号',password:''}),false);assert.deepEqual(await store.read(),saved);
  const unavailable=createLoginCredentials({...options,safeStorage:{async isAsyncEncryptionAvailable(){return false;}}});assert.equal(await unavailable.read(),null);assert.equal(await unavailable.save(saved),false);
  const throwing=createLoginCredentials({...options,safeStorage:{async isAsyncEncryptionAvailable(){throw Error('unavailable');}}});assert.equal(await throwing.read(),null);assert.equal(await throwing.save(saved),false);
  const [file]=await readdir(directory);await writeFile(path.join(directory,file),'corrupted');assert.equal(await store.read(),null);
  assert.equal(await store.save(saved),true);assert.deepEqual(await store.read(),saved);
  await rm(directory,{recursive:true});await writeFile(directory,'blocks-directory');assert.equal(await store.save(saved),false);
 }finally{await rm(directory,{recursive:true,force:true});}
});

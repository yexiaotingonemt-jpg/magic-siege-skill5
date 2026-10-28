import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {verifyUpdate,downloadUpdate} from '../client/desktop/updater.mjs';
import {canonicalRelease} from '../shared/update-protocol.js';
import {createGameServer} from '../server/index.mjs';
test('更新签名拒绝篡改、伪造和错误版本',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const release={version:'0.4.1',gameVersion:'0.3.0',platform:'win32',arch:'x64',protocolVersion:1,sha256:'a'.repeat(64),size:100,file:'package.zip',folder:'release'};
 const manifest={release,signature:sign(null,Buffer.from(canonicalRelease(release)),privateKey).toString('base64')};
 assert.equal(verifyUpdate(manifest,'0.4.1','x64',publicKey).version,'0.4.1');
 assert.throws(()=>verifyUpdate({...manifest,release:{...release,sha256:'b'.repeat(64)}},'0.4.1','x64',publicKey),/签名/);
 assert.throws(()=>verifyUpdate(manifest,'0.4.0','x64',publicKey));
 assert.throws(()=>verifyUpdate({...manifest,signature:'fake'},'0.4.1','x64',publicKey));
 assert.throws(()=>verifyUpdate({...manifest,release:{...release,file:'../bad.zip'}},'0.4.1','x64',publicKey));
});
test('更新断点续传校验大小和SHA256，损坏文件不成为可安装包',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'magic-update-download-')),bytes=Buffer.from('signed update archive '.repeat(100)),ranges=[];
 const server=http.createServer((req,res)=>{ranges.push(req.headers.range);const offset=Number((req.headers.range||'bytes=0-').match(/\d+/)[0]);res.writeHead(offset?206:200,{'Content-Length':bytes.length-offset,...(offset?{'Content-Range':`bytes ${offset}-${bytes.length-1}/${bytes.length}`}:{})});res.end(bytes.subarray(offset));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const file=path.join(dir,'update.zip'),release={size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  await writeFile(file+'.part',bytes.subarray(0,50));await downloadUpdate(`http://127.0.0.1:${server.address().port}`,file,release);
  assert.equal(ranges[0],'bytes=50-');assert.deepEqual(await readFile(file),bytes);
  const corrupt=path.join(dir,'bad.zip');await assert.rejects(downloadUpdate(`http://127.0.0.1:${server.address().port}`,corrupt,{...release,sha256:'b'.repeat(64)}),/校验失败/);
  await assert.rejects(readFile(corrupt));await assert.rejects(readFile(corrupt+'.part'));
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
test('更新接口无需旧版登录；未发布或签名错误不提供可执行下载',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'magic-update-feed-'));
 const game=createGameServer({dataDir:path.join(dir,'data'),updateDir:path.join(dir,'updates'),gameVersion:'0.3.0',clientVersion:'0.4.1'});
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${game.server.address().port}`;
 try{
  assert.equal((await fetch(base+'/api/updates/win32-x64')).status,503);
  const root=path.join(dir,'updates/0.4.1/win32-x64');await mkdir(root,{recursive:true});await writeFile(path.join(root,'manifest.json'),JSON.stringify({release:{version:'0.4.1'},signature:'fake'}));
  assert.equal((await fetch(base+'/api/updates/win32-x64/package.zip')).status,503);
  assert.equal((await fetch(base+'/api/me')).status,409);
 }finally{game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));await rm(dir,{recursive:true,force:true});}
});

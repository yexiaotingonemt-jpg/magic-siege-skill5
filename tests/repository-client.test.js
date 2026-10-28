import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {findRepositoryUpdate} from '../client/desktop/repository-client.mjs';
import {createLocalClient} from '../client/launcher.mjs';

test('只有完整校验通过且与正式服版本一致的本机仓库才能免下载切换',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'magic-repository-update-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const root=path.join(dir,'checkout'),profile=path.join(dir,'profile');await mkdir(root);await mkdir(profile);
 const launcher=path.join(root,'魔法王座.exe'),bytes=Buffer.from('fixture launcher');await writeFile(launcher,bytes);
 const manifest={version:'0.4.4',serverVersion:'0.4.4',gameVersion:'0.3.1',protocolVersion:1,files:{'魔法王座.exe':createHash('sha256').update(bytes).digest('hex')}};
 await writeFile(path.join(root,'desktop-client.json'),JSON.stringify(manifest));await writeFile(path.join(profile,'repository-source.json'),JSON.stringify({root,launcher}));
 const required={clientVersion:'0.4.4',gameVersion:'0.3.1',protocolVersion:1};
 assert.deepEqual(await findRepositoryUpdate(required,profile),{root,launcher});
 assert.equal(await findRepositoryUpdate({...required,clientVersion:'0.4.5'},profile),null);
 assert.equal(await findRepositoryUpdate({...required,gameVersion:'0.3.0'},profile),null);
 await writeFile(launcher,'corrupt');assert.equal(await findRepositoryUpdate(required,profile),null);
});

test('仓库预构建页面复用已拉取美术，静态访问仍限制在各自资源根目录',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'magic-prebuilt-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const dist=path.join(root,'prebuilt'),art=path.join(root,'art');await mkdir(dist);await mkdir(art);
 await writeFile(path.join(dist,'index.html'),'prebuilt game');await writeFile(path.join(art,'sprite.png'),'local art');await writeFile(path.join(root,'private.txt'),'secret');
 const client=createLocalClient({serverUrl:'http://127.0.0.1:1',distDir:dist,artDir:art});await new Promise(r=>client.server.listen(0,'127.0.0.1',r));
 t.after(async()=>{client.server.closeAllConnections();await new Promise(r=>client.server.close(r));});
 const base='http://127.0.0.1:'+client.server.address().port;
 assert.equal(await (await fetch(base)).text(),'prebuilt game');assert.equal(await (await fetch(base+'/art/sprite.png')).text(),'local art');
 assert.notEqual((await fetch(base+'/art/%2e%2e%2fprivate.txt')).status,200);
});

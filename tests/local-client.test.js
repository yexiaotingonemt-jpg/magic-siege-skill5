import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient,parseServerUrl} from '../client/launcher.mjs';
import {GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
const listen=async server=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;};
async function setup(t,{differentAssets=false}={}){
 const dir=await mkdtemp(path.join(tmpdir(),'magic-local-')),distDir=path.join(dir,'dist');
 await mkdir(distDir);await writeFile(path.join(distDir,'index.html'),'<html>local assets</html>');await writeFile(path.join(distDir,'sprite.webp'),'test-image');
 const game=createGameServer({dataDir:path.join(dir,'data')}),remote=await listen(game.server),seen=[];
 game.server.on('request',req=>seen.push(req.url));
 const updatedDist=path.join(dir,'updated-dist');
 if(differentAssets){await mkdir(updatedDist);await writeFile(path.join(updatedDist,'index.html'),'<html>updated interface</html>');await writeFile(path.join(updatedDist,'sprite.webp'),'updated-art');}
 const clients=[createLocalClient({serverUrl:remote,distDir}),createLocalClient({serverUrl:remote,distDir:differentAssets?updatedDist:distDir})];
 const bases=await Promise.all(clients.map(c=>listen(c.server)));
 t.after(async()=>{for(const c of game.room.clients)c.res.end();for(const server of [...clients.map(c=>c.server),game.server]){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await rm(dir,{recursive:true,force:true});});
 return {game,remote,seen,bases};
}
async function request(base,route,body,cookie,headers={}){
 const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),...headers,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}

test('仅界面与美术不同的客户端包沿用兼容版本，可登录同一服务器并操作与订阅战局',async t=>{
 const {bases:[oldClient,newClient]}=await setup(t,{differentAssets:true});
 assert.match(await (await fetch(oldClient)).text(),/local assets/);
 assert.match(await (await fetch(newClient)).text(),/updated interface/);
 assert.equal(await (await fetch(oldClient+'/sprite.webp')).text(),'test-image');
 assert.equal(await (await fetch(newClient+'/sprite.webp')).text(),'updated-art');
 const oldInfo=await (await fetch(oldClient+'/client-info')).json(),newInfo=await (await fetch(newClient+'/client-info')).json();
 assert.equal(oldInfo.gameVersion,GAME_VERSION);assert.deepEqual(newInfo,oldInfo);
 const account={name:'同版不同资源',password:'compatible-assets-password',side:0};
 assert.equal((await request(oldClient,'/api/register',account)).status,200);
 let matchId;
 for(const base of [oldClient,newClient]){
  const login=await request(base,'/api/login',account);assert.equal(login.status,200);
  const state=await request(base,'/api/state',null,login.cookie);assert.equal(state.status,200);
  matchId??=state.body.matchId;assert.equal(state.body.matchId,matchId);
  assert.equal((await request(base,'/api/action',{type:'stamina'},login.cookie)).status,200);
  const controller=new AbortController();
  try{
   const stream=await fetch(base+`/api/events?clientVersion=${GAME_VERSION}&protocolVersion=${PROTOCOL_VERSION}`,{headers:{Cookie:login.cookie},signal:controller.signal});
   assert.equal(stream.status,200);const reader=stream.body.getReader();let text='';
   while(!text.includes('event: identity')){const {done,value}=await reader.read();assert.equal(done,false);text+=new TextDecoder().decode(value);}
  }finally{controller.abort();}
 }
});
test('两个本地客户端登录同一远端，独立身份、命令与SSE实时同步',async t=>{
 const {game,bases:[a,b]}=await setup(t),password='local-client-password';
 const alice=await request(a,'/api/register',{name:'本地甲',password,side:0},null,{Origin:a});assert.equal(alice.status,200);assert.ok(alice.cookie);
 const bob=await request(b,'/api/register',{name:'本地乙',password,side:1},null,{Origin:b});assert.equal(bob.status,200);
 const sa=await request(a,'/api/state',null,alice.cookie),sb=await request(b,'/api/state',null,bob.cookie);
 assert.equal(sa.body.matchId,sb.body.matchId);assert.notEqual(sa.body.playerId,sb.body.playerId);
 const controller=new AbortController();t.after(()=>controller.abort());
 const stream=await fetch(b+'/api/events',{headers:{'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),Cookie:bob.cookie},signal:controller.signal});assert.equal(stream.status,200);
 const reader=stream.body.getReader();let text='';
 const readUntil=async predicate=>{while(!predicate(text)){const {value,done}=await reader.read();if(done)throw Error('SSE unexpectedly closed');text+=new TextDecoder().decode(value);}};
 await readUntil(text=>text.includes('event: identity')&&text.includes('data: {"matchId"'));
 const action=await request(a,'/api/action',{type:'pause',args:{paused:true},id:'pause-once'},alice.cookie,{Origin:a});assert.equal(action.status,200);
 await readUntil(text=>text.includes('"paused":true'));assert.ok(game.room.paused);
 controller.abort();
 assert.equal((await request(a,'/api/action',{type:'pause',args:{paused:false}},bob.cookie,{Origin:a})).status,400);
 assert.equal((await request(a,'/api/logout',{},alice.cookie,{Origin:a})).status,200);
 assert.equal((await request(a,'/api/me',null,alice.cookie)).status,401);
});
test('页面和美术仅从本地加载，远端拒绝静态资源，离线仍可读取本地文件',async t=>{
 const {game,remote,seen,bases:[a]}=await setup(t);
 assert.match(await (await fetch(a)).text(),/local assets/);
 const image=await fetch(a+'/sprite.webp');assert.equal(image.headers.get('content-type'),'image/webp');assert.equal(await image.text(),'test-image');
 assert.deepEqual(seen,[]);assert.equal((await fetch(remote+'/')).status,404);assert.equal((await fetch(remote+'/art/test.png')).status,404);
 game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));
 assert.equal((await fetch(a+'/')).status,200);const failed=await request(a,'/api/health');assert.equal(failed.status,502);assert.match(failed.body.error,/无法连接战斗服务器/);
});
test('本地入口拒绝外部来源、伪造Host与越界文件，协议不兼容给出更新提示',async t=>{
 const {bases:[a]}=await setup(t);
 assert.equal((await request(a,'/api/register',{name:'外部来源',password:'test-password',side:0},null,{Origin:'https://external.example'})).status,403);
 const fakeHostStatus=await new Promise((resolve,reject)=>http.get(a,{headers:{'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),Host:'external.example'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject));
 assert.equal(fakeHostStatus,403);
 assert.equal((await fetch(a+'/%2e%2e%5cpackage.json')).status,403);
 const user=await request(a,'/api/register',{name:'协议测试',password:'test-password',side:0});
 const result=await request(a,'/api/me',null,user.cookie,{'X-Magic-Protocol':String(PROTOCOL_VERSION+1)});assert.equal(result.status,409);assert.match(result.body.error,/更新客户端/);
 assert.equal((await request(a,'/api/health')).body.protocolVersion,PROTOCOL_VERSION);
 for(const url of ['file:///test','https://name:pass@example.com','https://example.com/path','https://example.com/?a=1'])assert.throws(()=>parseServerUrl(url));
});
test('服务端不依赖客户端，共享模块不依赖两端或DOM，根目录无旧源码入口',async()=>{
 for(const folder of ['shared','server'])for(const file of await readdir(new URL('../'+folder+'/',import.meta.url))){
  if(!/\.(mjs|js)$/.test(file))continue;
  const text=await readFile(new URL('../'+folder+'/'+file,import.meta.url),'utf8');
  assert.ok(!/from\s+['"][^'"]*client\//.test(text),`${folder}/${file} depends on client`);
  if(folder==='shared')assert.ok(!/\b(document|window)\.|from\s+['"](?:node:|[^'"]*server\/|phaser)/.test(text),`${file} must be platform independent`);
 }
 const root=await readdir(new URL('..',import.meta.url));for(const old of ['src','public','server.mjs','index.html','vite.config.js'])assert.ok(!root.includes(old),old+' should have moved');
});

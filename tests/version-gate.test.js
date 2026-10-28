import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';
import {CLIENT_VERSION,GAME_VERSION,PROTOCOL_VERSION,UPDATE_REQUIRED_CODE} from '../shared/protocol.js';
import {checkServerVersion} from '../client/src/network.js';
const current={'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION)};
async function setup(t){
 const dataDir=await mkdtemp(path.join(tmpdir(),'magic-version-')),game=createGameServer({dataDir});
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 const remote=`http://127.0.0.1:${game.server.address().port}`,local=createLocalClient({serverUrl:remote});
 await new Promise(resolve=>local.server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{for(const c of game.room.clients)c.res.end();for(const server of [local.server,game.server]){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await rm(dataDir,{recursive:true,force:true});});
 return {game,remote,local:`http://127.0.0.1:${local.server.address().port}`};
}
test('健康与版本信息公开；缺失或不匹配的战斗兼容版本均拒绝注册、登录、状态、命令及SSE',async t=>{
 const {game,remote}=await setup(t);
 assert.equal((await (await fetch(remote+'/api/health')).json()).gameVersion,GAME_VERSION);
 assert.deepEqual(await (await fetch(remote+'/api/version')).json(),{gameVersion:GAME_VERSION,clientVersion:CLIENT_VERSION,protocolVersion:PROTOCOL_VERSION});
 for(const version of [undefined,'','0.1.0','999.0.0',GAME_VERSION+'+other'])for(const route of ['register','login','me','state','action','events']){
  const isPost=['register','login','action'].includes(route);
  const response=await fetch(remote+'/api/'+route,{method:isPost?'POST':'GET',headers:{'X-Magic-Protocol':String(PROTOCOL_VERSION),...(version!==undefined?{'X-Magic-Version':version}:{}),'Content-Type':'application/json'},body:isPost?JSON.stringify({name:'拒绝旧版',password:'test-password',side:0,type:'stamina'}):undefined});
  assert.equal(response.status,409,`${route}/${version}`);const error=await response.json();assert.equal(error.code,UPDATE_REQUIRED_CODE);assert.equal(error.requiredVersion,GAME_VERSION);assert.match(error.error,/更新客户端/);
 }
 assert.equal(game.accounts.rows.length,0);assert.equal(game.room.clients.size,0);assert.equal(game.room.sequence,0);
});

test('客户端只检查战斗兼容版本与协议；发布批次或诊断修订变化不触发更新',async t=>{
 let version={gameVersion:GAME_VERSION,protocolVersion:PROTOCOL_VERSION};
 t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify(version),{headers:{'Content-Type':'application/json'}}));
 await checkServerVersion();
 for(const revision of ['ui-art-refresh','server-performance-fix']){
  version={...version,revision,buildId:revision};
  assert.deepEqual(await checkServerVersion(),version);
 }
 version={gameVersion:GAME_VERSION+'-incompatible-combat',protocolVersion:PROTOCOL_VERSION};
 await assert.rejects(checkServerVersion(),error=>error.code===UPDATE_REQUIRED_CODE&&error.requiredVersion===version.gameVersion);
 version={gameVersion:GAME_VERSION,protocolVersion:PROTOCOL_VERSION+1};
 await assert.rejects(checkServerVersion(),error=>error.code===UPDATE_REQUIRED_CODE);
});
test('客户端发布版本独立控制桌面更新，不改变战斗兼容检查',async t=>{
 let version={clientVersion:CLIENT_VERSION,gameVersion:GAME_VERSION,protocolVersion:PROTOCOL_VERSION};
 t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify(version)));
 await checkServerVersion({desktop:true});
 version={...version,clientVersion:CLIENT_VERSION+'-new-ui'};
 await checkServerVersion({desktop:false});
 await assert.rejects(checkServerVersion({desktop:true}),e=>e.code===UPDATE_REQUIRED_CODE&&e.requiredClientVersion===version.clientVersion&&e.requiredVersion===GAME_VERSION);
 version={clientVersion:CLIENT_VERSION,gameVersion:GAME_VERSION+'-new-rules',protocolVersion:PROTOCOL_VERSION};
 for(const desktop of [false,true])await assert.rejects(checkServerVersion({desktop}),e=>e.requiredVersion===version.gameVersion);
});
test('同版本可注册与操作；游戏版本相同但协议不匹配仍被拒绝',async t=>{
 const {remote}=await setup(t);
 const registration=await fetch(remote+'/api/register',{method:'POST',headers:{...current,'Content-Type':'application/json'},body:JSON.stringify({name:'版本一致',password:'test-password',side:0})});assert.equal(registration.status,200);
 const Cookie=registration.headers.get('set-cookie').split(';')[0];
 assert.equal((await fetch(remote+'/api/me',{headers:{...current,Cookie}})).status,200);
 for(const protocol of [undefined,'','999']){
  const response=await fetch(remote+'/api/action',{method:'POST',headers:{'X-Magic-Version':GAME_VERSION,...(protocol!==undefined?{'X-Magic-Protocol':protocol}:{}),Cookie,'Content-Type':'application/json'},body:JSON.stringify({type:'stamina'})});assert.equal(response.status,409);
 }
 assert.equal((await fetch(remote+'/api/action',{method:'POST',headers:{...current,Cookie,'Content-Type':'application/json'},body:JSON.stringify({type:'stamina'})})).status,200);
});
test('SSE支持查询参数校验，过旧版本或冲突的头/参数不能建立连接',async t=>{
 const {game,remote}=await setup(t);
 const registration=await fetch(remote+'/api/register',{method:'POST',headers:{...current,'Content-Type':'application/json'},body:JSON.stringify({name:'事件流版本',password:'test-password',side:0})});const Cookie=registration.headers.get('set-cookie').split(';')[0];
 for(const [query,headers]of [[`clientVersion=0.1.0&protocolVersion=${PROTOCOL_VERSION}`,{Cookie}],[`clientVersion=0.1.0&protocolVersion=${PROTOCOL_VERSION}`,{...current,Cookie}],[`clientVersion=${GAME_VERSION}&protocolVersion=999`,{...current,Cookie}]]){
  assert.equal((await fetch(remote+'/api/events?'+query,{headers})).status,409);assert.equal(game.room.clients.size,0);
 }
 const abort=new AbortController();t.after(()=>abort.abort());
 const response=await fetch(remote+`/api/events?clientVersion=${GAME_VERSION}&protocolVersion=${PROTOCOL_VERSION}`,{headers:{Cookie},signal:abort.signal});assert.equal(response.status,200);
 const reader=response.body.getReader(),decoder=new TextDecoder();let text='';
 while(!text.includes('event: identity')){const chunk=await reader.read();assert.equal(chunk.done,false);text+=decoder.decode(chunk.value,{stream:true});}
 abort.abort();
});
test('本地代理不会把缺失或旧版浏览器版本伪装为当前版本',async t=>{
 const {local}=await setup(t);
 assert.equal((await (await fetch(local+'/client-info')).json()).gameVersion,GAME_VERSION);
 for(const headers of [{},{'X-Magic-Version':'0.1.0','X-Magic-Protocol':String(PROTOCOL_VERSION)}]){
  const response=await fetch(local+'/api/register',{method:'POST',headers:{...headers,Origin:local,'Content-Type':'application/json'},body:JSON.stringify({name:'旧版代理',password:'test-password',side:0})});assert.equal(response.status,409);assert.equal((await response.json()).code,UPDATE_REQUIRED_CODE);
 }
});

import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createGameServer} from '../server.mjs';
let game,base,host,guest;
async function request(route,body,cookie){
 const response=await fetch(base+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const add=(account,args={},id=crypto.randomUUID())=>request('/api/action',{type:'stamina',args,id},account.cookie);
before(async()=>{
 game=createGameServer({dataDir:await mkdtemp(path.join(tmpdir(),'kc5-stamina-'))});game.room.paused=true;
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+game.server.address().port;
 host=await request('/api/register',{name:'体力房主',password:'isolated-test-password',side:0});
 guest=await request('/api/register',{name:'体力访客',password:'isolated-test-password',side:1});
});
after(async()=>{for(const client of [...game.room.clients])client.res.end();game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));});
test('自助体力操作要求账号登录',async()=>{assert.equal((await add({})).status,401);});
test('普通玩家可以加100体力，伪造目标和数量不能影响其他玩家',async()=>{
 const [a,b]=game.accounts.rows.map(account=>game.room.player(account));a.stamina=17;b.stamina=2;
 const response=await add(guest,{playerId:a.id,accountId:host.data.account.id,amount:999999,stamina:0});
 assert.equal(response.status,200);assert.equal(response.data.ok,true);assert.equal(b.stamina,102);assert.equal(a.stamina,17);
 const own=await request('/api/state',null,guest.cookie),other=await request('/api/state',null,host.cookie);
 assert.equal(own.data.players.find(p=>p.id===b.id).stamina,102);assert.equal(other.data.players.find(p=>p.id===b.id).stamina,102);
 assert.equal(own.data.matchId,other.data.matchId);
});
test('房主操作同样只给自己增加体力，连续点击可以累计',async()=>{
 const [a,b]=game.accounts.rows.map(account=>game.room.player(account)),before=b.stamina;
 assert.equal((await add(host)).data.ok,true);assert.equal((await add(host)).data.ok,true);
 assert.equal(a.stamina,217);assert.equal(b.stamina,before);
});
test('重复请求只增加一次体力，各账号请求ID互不干扰',async()=>{
 const [a,b]=game.accounts.rows.map(account=>game.room.player(account)),old=[a.stamina,b.stamina],id=crypto.randomUUID();
 const first=await add(guest,{},id),repeated=await add(guest,{},id);assert.deepEqual(first.data,repeated.data);assert.equal(b.stamina,old[1]+100);
 assert.equal((await add(host,{},id)).data.ok,true);assert.equal(a.stamina,old[0]+100);
});

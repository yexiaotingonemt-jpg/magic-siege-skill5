import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {Room} from '../server/room.mjs';
import {Simulation} from '../shared/simulation.js';
import {defaults,liveConfig,contractType} from '../shared/config.js';
import {contractHistoryPage} from '../shared/contract-history.js';
import {createGameServer} from '../server/index.mjs';
import {CLIENT_VERSION,GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
import {contractHistoryHTML} from '../client/src/contract-history.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function recruit(s,p,id=4){p.stamina=10000;p.classId=id;assert.ok(s.contract(p,s.spawn(p.side,contractType(id),0,1).id));return s.hero(p);}
function finish(s,p,h){s.time+=10;s.die(h,null);assert.equal(p.heroId,null);}

test('按契约独立输出当前值、职业、体力与新KDA，结算不重复且死后贡献归原契约',()=>{
 const s=new Simulation(liveConfig()),p=s.player,h=recruit(s,p);s.stat(h,'heroDamage',1000);
 let page=contractHistoryPage(s,p),row=page.entries[0];assert.equal(row.current,true);assert.equal(row.classId,4);assert.equal(row.number,1);near(row.points,p.totalPoints);near(row.kda,(row.points-300)/21);assert.equal(row.staminaSpent,3);
 finish(s,p,h);s.settle(h,'重复结算');const second=recruit(s,p,0);s.stat(second,'healing',100);
 page=contractHistoryPage(s,p);assert.equal(page.total,2);assert.deepEqual(page.entries.map(r=>r.classId),[0,4]);assert.deepEqual(page.entries.map(r=>r.number),[2,1]);assert.equal(page.entries[1].duration,10);assert.equal(page.entries[1].reason,'阵亡');
 const before=page.entries[1].points;s.stat(h,'heroDamage',500);page=contractHistoryPage(s,p);assert.ok(page.entries[1].points>before);near(page.entries[0].points+page.entries[1].points,p.totalPoints);
 assert.notEqual(page.entries[1].parts,s.reports[0].parts);assert.equal(s.reports.length,1);
});
test('全局100条截断后仍可逐页查看玩家每次契约，当前契约排序在前且不串同名玩家',()=>{
 const s=new Simulation(liveConfig()),p=s.player,other=s.makePlayer(0,false);p.name=other.name='同名';
 for(let i=0;i<121;i++){const h=recruit(s,p);s.stat(h,'heroDamage',i+1);finish(s,p,h);}
 recruit(s,p);const otherHero=recruit(s,other);finish(s,other,otherHero);
 const all=[];let before=null;
 do{const page=contractHistoryPage(s,p,{before});assert.ok(page.entries.length<=20);assert.equal(page.total,122);all.push(...page.entries);before=page.nextCursor;}while(before);
 assert.equal(s.reports.length,100);assert.equal(all.length,122);assert.equal(new Set(all.map(r=>r.id)).size,122);assert.equal(all[0].current,true);assert.equal(all.at(-1).number,1);assert.equal(contractHistoryPage(s,other).total,1);
 assert.throws(()=>contractHistoryPage(s,p,{before:'99999999'}),/游标/);
});
test('清榜不删除单次契约贡献，战区重建归档，重开本局清空；SSE不夹带完整历史',()=>{
 const room=new Room(),account={id:'test',name:'契约者9',side:0,isSuperAdmin:true},p=room.player(account),h=recruit(room.sim,p);room.sim.stat(h,'heroDamage',1000);
 const before=contractHistoryPage(room.sim,p).entries[0].points;
 assert.equal(room.command(account,{type:'clearRanking'}).ok,true);assert.equal(p.totalPoints,0);near(contractHistoryPage(room.sim,p).entries[0].points,before);
 room.sim.resetMap();assert.equal(contractHistoryPage(room.sim,p).entries[0].current,false);assert.equal(contractHistoryPage(room.sim,p).total,1);
 assert.ok(!JSON.stringify(room.snapshot()).includes('contractHistories'));
 room.restartMatch();assert.equal(contractHistoryPage(room.sim,room.player(account)).total,0);
});
test('旧战局可恢复现存结算，不把同名或缺少起点的记录伪造成完整数据',()=>{
 const s=new Simulation(defaults),p=s.player;p.name='旧玩家';s.reports=[{name:p.name,classId:4,reason:'阵亡',time:10,parts:[{key:'staminaSpent',value:3,points:300}]}];
 const page=contractHistoryPage(s,p);assert.equal(page.total,1);assert.equal(page.partial,true);assert.equal(page.entries[0].numberKnown,false);assert.equal(page.entries[0].start,null);assert.equal(page.entries[0].duration,null);assert.equal(page.entries[0].kda,100);
 const collision=new Simulation(defaults);collision.player.name='重复';collision.makePlayer(0).name='重复';collision.reports=[{...s.reports[0],name:'重复'}];assert.equal(contractHistoryPage(collision,collision.player).total,0);
});
test('契约记录API要求登录和正确版本，普通玩家可读他人，输入错误明确返回',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'contract-history-')),game=createGameServer({dataDir});
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${game.server.address().port}`,headers={'X-Magic-Client-Version':CLIENT_VERSION,'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),'Content-Type':'application/json'};
 try{
  const owner=await game.accounts.register({name:'历史房主',password:'contract-test',side:0});await game.accounts.register({name:'历史读者',password:'contract-test',side:0});
  const p=game.room.player(owner);recruit(game.room.sim,p);
  assert.equal((await fetch(base+'/api/contract-history?playerId='+p.id,{headers})).status,401);
  const login=await fetch(base+'/api/login',{method:'POST',headers,body:JSON.stringify({name:'历史读者',password:'contract-test'})});const authenticated={...headers,Cookie:login.headers.get('set-cookie').split(';')[0]};
  const result=await fetch(base+'/api/contract-history?playerId='+p.id,{headers:authenticated});assert.equal(result.status,200);const body=await result.json();assert.equal(body.player.id,p.id);assert.equal(body.total,1);assert.equal(body.matchId,game.room.matchId);
  for(const [query,status] of [['',400],['?playerId=-1',400],['?playerId=999999',404],[`?playerId=${p.id}&before=bad`,400]])assert.equal((await fetch(base+'/api/contract-history'+query,{headers:authenticated})).status,status);
  assert.equal((await fetch(base+'/api/contract-history?playerId='+p.id,{headers:{...authenticated,'X-Magic-Client-Version':'0.0.0'}})).status,409);
 }finally{game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));assert.equal(path.dirname(path.resolve(dataDir)),path.resolve(tmpdir()));await rm(dataDir,{recursive:true,force:true});}
});
test('历史文案转义动态内容，不输出可执行HTML',()=>{
 const html=contractHistoryHTML([{id:'" onclick="bad',number:1,classId:4,level:0,start:0,end:1,duration:1,reason:'<img src=x>',points:300,kda:0,staminaSpent:3,parts:[{key:'<script>',value:0,points:0}]}]);assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('贡献明细'));
});

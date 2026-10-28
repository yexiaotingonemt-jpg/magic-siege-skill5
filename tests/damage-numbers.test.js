import {GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Simulation} from '../shared/simulation.js';
import {contractType} from '../shared/config.js';
import {createGameServer} from '../server/index.mjs';
import {createCombatNumberModel} from '../client/src/combat-numbers.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const advance=(s,n)=>{const end=s.time+n;while(s.time<end-1e-8)s.tick(Math.min(.05,end-s.time));};
const numbers=s=>s.animations.filter(e=>e.kind==='damage');
function arena(id=4){
 const s=new Simulation();s.units=[];s.player.retired=true;s.waveAt=s.populationAt=1e9;for(const t of s.towers)t.x=100;
 const make=(classId,x,y)=>{const p=s.makePlayer(classId===3?1:0,false);p.classId=classId;p.level=6;p.builds[classId]=[1,1,1,1];p.stamina=100;const h=s.spawn(p.side,contractType(classId),0,1,x);assert.ok(s.contract(p,h.id));Object.assign(h,{x,y,speed:0,cd:1e9,hp:1e7,maxHp:1e7});return {p,h};};
 const {p,h}=make(id,0,0),enemy=make(id===3?0:3,0,id===3?-3:3).h;s.localPlayerId=p.id;
 const target=(x,y,side=enemy.side)=>{const u=s.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp:1e7,maxHp:1e7,speed:0,cd:1e9});return u;};
 return {s,p,h,enemy,target};
}

test('单体技能飘字事件使用实际结算伤害并保留施法和目标身份',()=>{
 const {s,p,h,enemy}=arena(),hp=enemy.hp;s.cast(0,p);advance(s,.4);const [e]=numbers(s);
 assert.equal(numbers(s).length,1);near(e.amount,hp-enemy.hp);near(e.hpDamage,e.amount);near(e.shieldDamage,0);
 assert.deepEqual([e.sourceId,e.classId,e.side,e.skill,e.targetId,e.targetHero,e.targetTower],[h.id,4,0,0,enemy.id,true,false]);
 assert.deepEqual(e.to,{x:enemy.x,y:enemy.y});near(e.until-e.start,1.2);
});
test('护甲和减伤后的真实扣血进入飘字，非技能系数或减免前伤害',()=>{
 const {s,p,h,enemy}=arena();enemy.armor=50;enemy.guards=[{ratio:.4,until:10,value:null}];const hp=enemy.hp;
 s.cast(0,p);advance(s,.4);const [e]=numbers(s);near(e.amount,h.attack*16*.4);near(e.amount,hp-enemy.hp);
});
test('技能击中护盾分别记录扣血与吸收，合计等于实际伤害',()=>{
 const {s,p,h,enemy}=arena();s.shield(enemy,80,enemy,10);const hp=enemy.hp;
 s.cast(0,p);advance(s,.4);const [e]=numbers(s);near(e.shieldDamage,80);near(e.hpDamage,hp-enemy.hp);near(e.amount,e.hpDamage+e.shieldDamage);near(e.amount,h.attack*16);
});
test('完全被护盾吸收的技能仍有吸收反馈，生命伤害为零',()=>{
 const {s,p,h,enemy}=arena();s.shield(enemy,1e5,enemy,10);const hp=enemy.hp;
 s.cast(0,p);advance(s,.4);const [e]=numbers(s);near(e.hpDamage,0);near(e.shieldDamage,h.attack*16);near(e.amount,e.shieldDamage);near(enemy.hp,hp);
});
test('击杀飘字只记录剩余生命，目标从战场移除后仍保留命中位置',()=>{
 const {s,p,enemy}=arena();enemy.hp=17;const pos={x:enemy.x,y:enemy.y};s.cast(0,p);advance(s,.4);
 const [e]=numbers(s);near(e.amount,17);near(e.hpDamage,17);assert.equal(s.get(enemy.id),undefined);assert.deepEqual(e.to,pos);assert.equal(e.targetId,enemy.id);
});
test('没有真实伤害、普通攻击、反伤和非英雄伤害均不产生技能伤害飘字',()=>{
 const {s,p,h,enemy,target}=arena();s.cast(0,p);s.skillValues.at(-1).spent=s.skillValues.at(-1).limit;advance(s,.4);assert.deepEqual(numbers(s),[]);
 s.damage(h,enemy,100,true);s.damage(h,enemy,100);s.damage(h,enemy,100,false,true,{value:{skill:0,limit:1000,spent:0,parts:{}}});
 const soldier=target(0,0,h.side);s.damage(soldier,enemy,100,false,false,{value:{skill:0,limit:1000,spent:0,parts:{}}});assert.deepEqual(numbers(s),[]);
});
test('群攻对每个实际命中的英雄与小兵分别生成独立事件',()=>{
 const {s,p,h,enemy,target}=arena(3),soldiers=[target(-2,-3),target(2,-3)];s.cast(0,p);advance(s,.4);
 const events=numbers(s);assert.equal(events.length,3);assert.deepEqual(new Set(events.map(e=>e.targetId)),new Set([enemy.id,...soldiers.map(u=>u.id)]));
 assert.equal(new Set(events.map(e=>e.id)).size,3);for(const e of events)near(e.amount,h.attack*3.2);assert.equal(events.filter(e=>e.targetHero).length,1);
});
test('火焰盾每秒独立跳伤生成新事件，离场灼烧继续归属原技能',()=>{
 const {s,p,h,enemy}=arena(3);s.cast(2,p);advance(s,.4);enemy.y=-20;advance(s,1);const first=numbers(s)[0];
 near(first.amount,h.attack*.4);assert.equal(first.skill,2);advance(s,1.1);const events=numbers(s);assert.equal(events.length,2);assert.notEqual(events[0].id,events[1].id);
 for(const e of events){near(e.amount,h.attack*.4);assert.equal(e.sourceId,h.id);assert.equal(e.targetId,enemy.id);assert.equal(e.skill,2);}
});
test('冲锋沿途伤害产生飘字且同一目标不重复记录',()=>{
 const {s,p,h,enemy,target}=arena(3);enemy.y=-10;const wing=target(3,-7);assert.ok(s.setManualTarget(enemy.id,p));s.cast(1,p);advance(s,1.7);
 const events=numbers(s);assert.equal(events.filter(e=>e.targetId===wing.id).length,1);assert.ok(events.some(e=>e.targetId===enemy.id));for(const e of events){assert.equal(e.skill,1);near(e.amount,h.attack*2.4);}
});
test('领主大招的附加伤害飘字与普通攻击主目标分开，额度耗尽无零伤害事件',()=>{
 const {s,p,h,enemy,target}=arena(3),extras=[target(-1,-3),target(1,-3)];s.cast(3,p);advance(s,.4);s.afterBasicAttack(h,enemy);
 assert.equal(numbers(s).length,2);for(const e of numbers(s)){assert.equal(e.skill,3);assert.ok(extras.some(u=>u.id===e.targetId));near(e.amount,h.attack*6);}
 s.damage(h,enemy,h.attack,true);assert.equal(numbers(s).length,2);for(let i=0;i<3;i++)s.afterBasicAttack(h,enemy);const count=numbers(s).length;s.afterBasicAttack(h,enemy);assert.equal(numbers(s).length,count);
});
test('来源阵亡后的在途技能炮弹仍同步原英雄身份和实际伤害',()=>{
 const {s,p,h,enemy}=arena(2);enemy.y=10;enemy.hp=enemy.maxHp=10000;s.cast(0,p);advance(s,.4);h.hp=1;s.damage(null,h,2);advance(s,1);
 const [e]=numbers(s);near(e.amount,800);assert.equal(e.sourceId,h.id);assert.equal(e.classId,2);assert.equal(e.skill,0);assert.equal(e.targetId,enemy.id);assert.equal(s.get(h.id),undefined);
});
test('技能对防御塔造成伤害时记录塔身份和减伤后的伤害',()=>{
 const {s,p,h,enemy}=arena();enemy.x=100;const tower=s.towers[0];Object.assign(tower,{x:0,y:3,cd:1e9,hp:1e5,maxHp:1e5,towerGuardUntil:10});
 const hp=tower.hp;s.cast(0,p);advance(s,.4);const [e]=numbers(s);assert.equal(e.targetId,tower.id);assert.equal(e.targetTower,true);assert.equal(e.targetHero,false);near(e.amount,h.attack*8);near(e.amount,hp-tower.hp);
});

test('两账号HTTP快照拥有同一技能伤害事件，重复读取不重新生成事件',async()=>{
 const game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-damage-test-'))});game.room.paused=true;
 await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
 const call=async(route,body,cookie)=>{const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});assert.equal(response.status,200);return {data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};};
 try{
  const clients=[];for(const side of [0,1])clients.push(await call('/api/register',{name:'伤害同步'+side,password:'isolated-damage-test',side}));
  const s=game.room.sim;s.units=[];s.waveAt=s.populationAt=1e9;for(const t of s.towers)t.x=100;
  const actors=game.accounts.rows.map((a,i)=>{const p=game.room.player(a);p.classId=i?3:4;p.level=6;p.builds[p.classId]=[1,1,1,1];const h=s.spawn(p.side,contractType(p.classId),0,1,0);assert.ok(s.contract(p,h.id));Object.assign(h,{x:0,y:i?3:0,cd:1e9,speed:0,hp:1e5,maxHp:1e5});return {p,h};});
  assert.ok((await call('/api/action',{id:crypto.randomUUID(),type:'cast',args:{skill:0}},clients[0].cookie)).data.ok);advance(s,.4);
  const snapshots=await Promise.all(clients.map(c=>call('/api/state',null,c.cookie)));const es=snapshots.map(r=>r.data.animations.filter(e=>e.kind==='damage'));
  assert.equal(es[0].length,1);assert.deepEqual(es[0],es[1]);near(es[0][0].amount,actors[0].h.attack*16);
  const repeated=(await call('/api/state',null,clients[0].cookie)).data.animations.filter(e=>e.kind==='damage');assert.deepEqual(repeated,es[0]);
 }finally{for(const c of [...game.room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));}
});

const floatEvent=(id,start=.1,extra={})=>({id,kind:'damage',sourceId:1,targetId:2,classId:4,side:0,skill:0,to:{x:0,y:3},start,until:start+1.2,amount:10,hpDamage:10,shieldDamage:0,...extra});
const floatState=()=>({matchId:'test-a',sequence:0,time:0,speed:1,animations:[],player:{heroId:1,side:0}});
test('飘字模型去重和短时同源合并不重置出生时间，暂停时照常淡出且不重播',()=>{
 const model=createCombatNumberModel(),s=floatState();model.update(s,0);s.sequence++;s.time=.1;s.animations=[floatEvent(1)];model.update(s,100);assert.equal(model.entries.length,1);
 s.sequence++;model.update(s,130);assert.deepEqual(model.entries[0].eventIds,[1]);s.animations.push(floatEvent(2,.12,{amount:20,hpDamage:20}));s.sequence++;s.time=.12;model.update(s,150);
 assert.equal(model.entries.length,1);near(model.entries[0].amount,30);assert.deepEqual(model.entries[0].eventIds,[1,2]);assert.equal(model.entries[0].bornAt,100);
 s.sequence++;model.update(s,1001);assert.deepEqual(model.entries,[]);s.sequence++;model.update(s,1100);assert.deepEqual(model.entries,[]);
});
test('四倍速首达事件年龄0.8秒仍显示，已经过期的旧事件不播放',()=>{
 const model=createCombatNumberModel(),s=floatState();s.speed=4;model.update(s,0);s.sequence++;s.time=.9;s.animations=[floatEvent(1,.1)];model.update(s,100);assert.equal(model.entries.length,1);
 s.sequence++;s.time=5;s.animations=[floatEvent(2,.1)];model.update(s,1100);assert.deepEqual(model.entries,[]);
});
test('首次快照、旧sequence、换局与时间回退均不会重播旧伤害',()=>{
 const model=createCombatNumberModel(),s=floatState();s.time=.1;s.animations=[floatEvent(1)];model.update(s,0);assert.deepEqual(model.entries,[]);
 s.time=.2;s.sequence=2;s.animations.push(floatEvent(2,.2));model.update(s,100);assert.deepEqual(model.entries[0].eventIds,[2]);s.sequence=1;s.animations.push(floatEvent(3,.2));model.update(s,120);assert.deepEqual(model.entries[0].eventIds,[2]);
 s.matchId='test-b';s.sequence=0;s.time=0;s.animations=[floatEvent(1,0)];model.update(s,140);assert.deepEqual(model.entries,[]);
 s.sequence=1;s.time=1;s.animations=[floatEvent(2,1)];model.update(s,160);assert.equal(model.entries.length,1);s.time=0;s.sequence=2;model.update(s,170);assert.deepEqual(model.entries,[]);
});
test('飘字总池与每目标数量均受控，目标内合并保留所有金额和事件ID',()=>{
 const model=createCombatNumberModel({maxActive:3,maxPerTarget:2,mergeWindow:0}),s=floatState();model.update(s,0);s.sequence++;s.time=.6;s.animations=[floatEvent(1,.1),floatEvent(2,.3),floatEvent(3,.5)];
 model.update(s,100);assert.equal(model.entries.length,2);near(model.entries.reduce((n,e)=>n+e.amount,0),30);assert.deepEqual(new Set(model.entries.flatMap(e=>e.eventIds)),new Set([1,2,3]));
 s.sequence++;s.animations.push(floatEvent(4,.6,{targetId:3}),floatEvent(5,.6,{targetId:4}));model.update(s,200);assert.equal(model.entries.length,3);assert.ok(model.stats.dropped>0);
});

test('密集同目标同阵营爆发跨来源合并，保留总金额、护盾分量和本人优先级',()=>{
 const model=createCombatNumberModel(),s=floatState();model.update(s,0);s.sequence++;s.time=.15;
 s.animations=[floatEvent(1,.1,{sourceId:5,amount:10,hpDamage:8,shieldDamage:2}),floatEvent(2,.12,{sourceId:1,skill:1,amount:20,hpDamage:15,shieldDamage:5})];
 model.update(s,100);assert.equal(model.entries.length,1);const e=model.entries[0];near(e.amount,30);near(e.hpDamage,23);near(e.shieldDamage,7);assert.deepEqual(e.eventIds,[1,2]);assert.deepEqual(new Set(e.sourceIds),new Set([5,1]));assert.equal(e.priority,3);
});

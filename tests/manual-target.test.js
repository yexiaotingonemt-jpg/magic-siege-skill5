import {GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Simulation} from '../shared/simulation.js';
import {contractType} from '../shared/config.js';
import {createGameServer} from '../server/index.mjs';
import {MANUAL_TARGET_RANGE,manualTarget} from '../shared/manual-target.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(id=4){
 const s=new Simulation();s.units=[];s.players[0].retired=true;s.waveAt=s.populationAt=1e9;for(const t of s.towers){t.x=100;t.cd=1e9;}
 const make=(classId,x,y)=>{const p=s.makePlayer(classId===3?1:0,false);p.classId=classId;p.level=6;p.builds[classId]=[1,1,1,1];p.stamina=100;const h=s.spawn(p.side,contractType(classId),0,1,x);assert.ok(s.contract(p,h.id));Object.assign(h,{x,y,hp:1e7,maxHp:1e7,speed:0,cd:1e9});return {p,h};};
 const {p,h}=make(id,0,0);s.localPlayerId=p.id;
 const soldier=(x,y,side=1-h.side)=>{const u=s.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp:1e7,maxHp:1e7,speed:0,cd:1e9});return u;};
 return {s,p,h,make,soldier};
}
function advance(s,time){const end=s.time+time;while(s.time<end-1e-8)s.tick(Math.min(.05,end-s.time));}

test('手动目标接受20格内敌兵、敌英雄、敌塔及等距边界；立即切换且不重置普攻冷却',()=>{
 const {s,p,h,make,soldier}=arena();const minion=soldier(0,20),hero=make(3,0,20).h,tower=s.towers.find(t=>t.side!==h.side);Object.assign(tower,{x:0,y:20});
 for(const target of [minion,hero,tower]){const cd=h.cd;assert.equal(s.setManualTarget(target.id,p),true,s.notice);assert.equal(h.manualTargetId,target.id);assert.equal(h.targetId,target.id);assert.equal(s.choose(h).id,target.id);assert.equal(h.cd,cd);}
});
test('超过20格、友方、死目标、非法ID拒绝，并保留原手动目标',()=>{
 const {s,p,h,soldier}=arena(),chosen=soldier(0,2),outside=soldier(0,MANUAL_TARGET_RANGE+.001),ally=soldier(0,1,h.side),dead=soldier(1,1);dead.hp=0;assert.ok(s.setManualTarget(chosen.id,p));
 for(const id of [outside.id,ally.id,dead.id,999999,null,'1',-1,NaN]){assert.equal(s.setManualTarget(id,p),false,`accepted ${id}`);assert.equal(h.manualTargetId,chosen.id);assert.equal(h.targetId,chosen.id);}
});
test('没有存活契约英雄时不能手动选择',()=>{
 const {s,p,h,soldier}=arena(),target=soldier(0,2);h.hp=0;assert.equal(s.setManualTarget(target.id,p),false);assert.equal(target.manualTargetId,undefined);
});
test('警戒外20格内的手动小兵优先于自动英雄，死亡或离开20格后解除并恢复自动索敌',()=>{
 for(const invalid of ['death','range']){const {s,p,h,make,soldier}=arena(),enemy=make(3,0,3).h,chosen=soldier(0,15);assert.ok(s.setManualTarget(chosen.id,p));assert.equal(s.choose(h).id,chosen.id);if(invalid==='death')chosen.hp=0;else chosen.y=MANUAL_TARGET_RANGE+.01;assert.equal(s.choose(h).id,enemy.id);assert.ok(!h.manualTargetId);}
});

test('20格锁定不扩大普通警戒、普攻或技能范围；可追击警戒外的手动目标',()=>{
 const {s,p,h,make,soldier}=arena(4),close=make(3,0,1).h,chosen=soldier(0,10),far=soldier(0,15),aggro=h.aggro,range=h.range;
 assert.ok(s.setManualTarget(chosen.id,p));assert.equal(s.castPlan(1,p).t.id,chosen.id);assert.equal(s.castPlan(0,p).code,'range');
 assert.ok(s.setManualTarget(far.id,p));assert.equal(manualTarget(s,h,12),null);assert.equal(s.castPlan(1,p).code,'range');
 h.speed=2;const hp=far.hp,cd=h.cd;advance(s,.1);assert.ok(h.y>0);assert.equal(h.targetId,far.id);near(far.hp,hp);near(h.cd,cd);assert.equal(h.aggro,aggro);assert.equal(h.range,range);
 h.manualTargetId=null;h.manualAttackTargetId=null;h.targetId=null;close.hp=0;chosen.hp=0;assert.equal(s.choose(h),null);
});
test('有效嘲讽优先于手动目标，拒绝切换；结束后恢复原自动优先级',()=>{
 const {s,p,h,make,soldier}=arena(),enemy=make(3,0,3).h,chosen=soldier(0,4),taunter=soldier(0,2);assert.ok(s.setManualTarget(chosen.id,p));h.tauntId=taunter.id;h.tauntUntil=s.time+1;assert.equal(s.choose(h).id,taunter.id);assert.ok(!h.manualTargetId);assert.equal(s.setManualTarget(chosen.id,p),false);s.time+=2;assert.equal(s.choose(h).id,enemy.id);
});
test('眩晕中选择目标不绕过无法行动状态，不清空眩晕或冷却',()=>{
 const {s,p,h,soldier}=arena(),chosen=soldier(0,3);h.speed=2;h.cd=0;h.stunUntil=2;assert.ok(s.setManualTarget(chosen.id,p));const pos={x:h.x,y:h.y},hp=chosen.hp;advance(s,.5);near(h.x,pos.x);near(h.y,pos.y);near(chosen.hp,hp);assert.equal(h.stunUntil,2);
});

for(const [id,skills]of [[0,[0,2]],[2,[0,1,2,3]],[3,[0,1]],[4,[0,1,2,3]],[5,[0]]])test(`职业${id}手选敌人超距时不改选近敌、不扣费，边界内恢复施法`,()=>{
 const {s,p,h,make}=arena(id),chosen=make(id===3?0:3,0,19).h;
 make(id===3?0:3,0,1);assert.ok(s.setManualTarget(chosen.id,p));
 for(const i of skills){
  const skill=s.config.heroes[id].skills[i],before={stamina:p.stamina,cd:p.cd[i],score:p.score,xp:p.xp,casts:s.metrics.casts};
  chosen.y=skill.targetRange+.001;
  const plan=s.castPlan(i,p);assert.equal(plan.ok,false);assert.equal(plan.code,'range');assert.equal(plan.reason,'目标太远');
  assert.equal(s.cast(i,p),false);assert.equal(s.notice,'目标太远');
  assert.deepEqual({stamina:p.stamina,cd:p.cd[i],score:p.score,xp:p.xp,casts:s.metrics.casts},before);
  chosen.y=skill.targetRange;
  if(id===0&&i===2){const ally=s.units.find(u=>u.side===h.side&&u.id!==h.id);if(ally)chosen.targetId=ally.id;else{const u=s.spawn(h.side,'melee',0,1,0);Object.assign(u,{x:0,y:1});chosen.targetId=u.id;}}
  assert.ok(s.castPlan(i,p).ok,s.castPlan(i,p).reason);
 }
});

test('超距提示覆盖已解锁技能的冷却和体力状态，未加点仍显示锁定',()=>{
 const {s,p,soldier}=arena(),chosen=soldier(0,15);assert.ok(s.setManualTarget(chosen.id,p));
 p.cd[0]=99;p.stamina=0;assert.equal(s.castPlan(0,p).code,'range');
 p.builds[p.classId][0]=0;assert.equal(s.castPlan(0,p).code,'locked');
});
for(const id of [0,2,3,4,5])test(`职业${id}可定向敌方技能使用手动目标并保持原技能范围`,()=>{
 const {s,p,h,make,soldier}=arena(id),closer=make(id===3?0:3,0,1).h,chosen=soldier(0,Math.min(4,h.aggro));assert.ok(s.setManualTarget(chosen.id,p));
 const skills=id===0?[0]:id===2?[0,1,2,3]:id===3?[0,1]:id===4?[0,1,2,3]:[0];
 for(const i of skills){const plan=s.castPlan(i,p);assert.ok(plan.ok,plan.reason);assert.equal(plan.t.id,chosen.id,`skill ${i}`);if(plan.targets.length)assert.equal(plan.targets[0].id,chosen.id,`first recipient skill ${i}`);}
 if(id===4){chosen.y=6;s.config.heroes[id].skills[0].targetRange=2;assert.ok(s.setManualTarget(chosen.id,p));assert.equal(s.castPlan(0,p).code,'range');}
});
test('范围多目标技能保留手动目标，其他目标遵守原数量上限与选择规则',()=>{
 const {s,p,h,soldier}=arena(4),chosen=soldier(0,4);chosen.hp=9e6;h.heat=4;const enemies=Array.from({length:8},(_,i)=>soldier((i-3.5)*.1,2));enemies.forEach((u,i)=>u.hp=100+i);assert.ok(s.setManualTarget(chosen.id,p));const plan=s.castPlan(3,p);assert.equal(plan.targets[0].id,chosen.id);assert.equal(plan.targets.length,plan.s.targets+Math.floor(h.heat/plan.s.heatStep));assert.equal(new Set(plan.targets.map(u=>u.id)).size,plan.targets.length);assert.equal(plan.targets[1].id,enemies[0].id);
});
test('领主扇形朝向手动目标，目标即使同坐标或数量超限仍计入首位',()=>{
 for(const coincident of [false,true]){const {s,p,h,soldier}=arena(3),chosen=soldier(coincident?0:4,0);for(let i=0;i<8;i++)soldier(coincident?0:1+i*.1,coincident?0:.1);assert.ok(s.setManualTarget(chosen.id,p));const plan=s.castPlan(0,p);assert.ok(plan.ok);assert.equal(plan.t.id,chosen.id);assert.equal(plan.targets[0].id,chosen.id);assert.equal(plan.targets.length,plan.s.targets);}
});
test('自身技能与友方治疗不将敌方手动目标当作受益者',()=>{
 for(const id of [0,3,5]){const {s,p,h,make,soldier}=arena(id),chosen=soldier(0,3),ally=make(id===3?3:0,1,0).h;h.hp*=.5;ally.hp*=.5;s.debuff(ally,chosen,'moveSlow',.2,5,null,true);assert.ok(s.setManualTarget(chosen.id,p));if(id===5)assert.ok(s.setManualTarget(ally.id,p));const skills=id===0?[1,3]:id===3?[2,3]:[1,2,3];for(const i of skills){const plan=s.castPlan(i,p);assert.ok(plan.ok,plan.reason);assert.equal(plan.t.side,h.side);assert.ok(plan.targets.every(u=>u.side===h.side));assert.notEqual(plan.t.id,chosen.id);}}
});
test('兽人救援按手动敌英雄正在攻击的友军换位，手动小兵不改变救援类型',()=>{
 const {s,p,h,make,soldier}=arena(0),nearEnemy=make(3,0,1).h,chosen=make(3,0,4).h,allyA=make(4,1,0).h,allyB=make(5,-1,0).h;nearEnemy.targetId=allyA.id;chosen.targetId=allyB.id;assert.ok(s.setManualTarget(chosen.id,p));assert.equal(s.castPlan(2,p).t.id,allyB.id);chosen.targetId=null;assert.equal(s.castPlan(2,p).ok,false);assert.ok(s.setManualTarget(soldier(0,2).id,p));assert.equal(s.castPlan(2,p).t.id,allyA.id);
});
test('已开始的前摇锁定原目标，切换手动目标只改变后续施法',()=>{
 const {s,p,h,soldier}=arena(4),a=soldier(0,2),b=soldier(1,3);assert.ok(s.setManualTarget(a.id,p));assert.ok(s.cast(0,p));assert.ok(s.setManualTarget(b.id,p));const ahp=a.hp,bhp=b.hp;advance(s,.4);assert.ok(a.hp<ahp);near(b.hp,bhp);p.cd[0]=0;assert.equal(s.castPlan(0,p).t.id,b.id);
});
test('飞行中炮弹锁定原目标，后续手动选择不会转向',()=>{
 const {s,p,h,soldier}=arena(2),a=soldier(0,10),b=soldier(2,8);assert.ok(s.setManualTarget(a.id,p));assert.ok(s.cast(0,p));advance(s,.4);assert.equal(s.projectiles.length,1);assert.ok(s.setManualTarget(b.id,p));assert.equal(s.projectiles[0].targetId,a.id);const ahp=a.hp,bhp=b.hp;advance(s,1.5);assert.ok(a.hp<ahp);near(b.hp,bhp);
});
test('连轰固定场地保留施法时的手动目标名额，后续切换不改变场地或锁定对象',()=>{
 const {s,p,h,soldier}=arena(2),crowd=Array.from({length:6},()=>soldier(0,5)),chosen=soldier(0,5),next=soldier(8,0);assert.ok(s.setManualTarget(chosen.id,p));assert.ok(s.cast(2,p));advance(s,.4);assert.ok(s.setManualTarget(next.id,p));const hp=chosen.hp,nextHp=next.hp;advance(s,1);assert.ok(chosen.hp<hp);near(next.hp,nextHp);const field=s.fields.find(f=>f.kind==='runeBarrage');near(field.x,0);near(field.y,5);const hits=s.animations.filter(e=>e.kind==='damage'&&e.skill===2);assert.equal(hits.length,s.config.heroes[2].skills[2].targets);assert.ok(hits.some(e=>e.targetId===chosen.id));assert.ok(crowd.some(u=>u.hp===u.maxHp));
});
test('震荡弹重叠人群超上限时仍命中手动中心目标且不扩大伤害人数',()=>{
 const {s,p,h,soldier}=arena(2);for(let i=0;i<8;i++)soldier(0,5);const chosen=soldier(0,5);assert.ok(s.setManualTarget(chosen.id,p));assert.ok(s.cast(3,p));advance(s,1.5);assert.ok(chosen.hp<chosen.maxHp);const hits=s.animations.filter(e=>e.kind==='damage'&&e.skill===3);assert.equal(hits.length,s.config.heroes[2].skills[3].targets);assert.ok(hits.some(e=>e.targetId===chosen.id));
});
test('领主冲锋穿越超上限敌兵时为手动终点目标预留名额且不突破目标上限',()=>{
 const {s,p,h,soldier}=arena(3);for(let i=0;i<8;i++)soldier(0,-1-i*.1);const chosen=soldier(0,-5);assert.ok(s.setManualTarget(chosen.id,p));assert.ok(s.cast(1,p));advance(s,1.25);assert.ok(chosen.hp<chosen.maxHp);const hits=s.animations.filter(e=>e.kind==='damage'&&e.skill===1);assert.equal(hits.length,s.config.heroes[3].skills[1].targets);assert.ok(hits.some(e=>e.targetId===chosen.id));
});
test('联机 target 指令仅影响当前登录英雄，同局快照同步，伪造来源无效且重复ID不重复执行',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'kc5-manual-target-')),game=createGameServer({dataDir});game.room.paused=true;await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+game.server.address().port;
 const call=async(route,body,cookie)=>{const res=await fetch(base+route,{method:body?'POST':'GET',headers:{'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 try{const a=await call('/api/register',{name:'手动目标进攻',password:'isolated-manual-target',side:0}),b=await call('/api/register',{name:'手动目标防守',password:'isolated-manual-target',side:1});const s=game.room.sim,p=game.room.player(game.accounts.rows[0]),q=game.room.player(game.accounts.rows[1]);p.classId=4;q.classId=3;p.stamina=q.stamina=100;const one=s.spawn(0,'ranged',0,1,0),two=s.spawn(1,'melee',0,1,0);assert.ok(s.contract(p,one.id));assert.ok(s.contract(q,two.id));Object.assign(one,{x:0,y:0});Object.assign(two,{x:0,y:3});const body={type:'target',id:'manual-same-id',args:{unitId:two.id,playerId:q.id,sourceId:two.id}};const first=await call('/api/action',body,a.cookie);assert.equal(first.data.ok,true,first.data.message);assert.equal(one.manualTargetId,two.id);assert.ok(!two.manualTargetId);const copy=await call('/api/state',null,b.cookie);assert.equal(copy.data.units.find(u=>u.id===one.id).manualTargetId,two.id);two.y=100;const duplicate=await call('/api/action',body,a.cookie);assert.deepEqual(duplicate.data,first.data);assert.equal((await call('/api/action',{...body,id:'manual-outside'},a.cookie)).data.ok,false);assert.equal((await call('/api/action',body)).status,401);
 }finally{for(const c of [...game.room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));}
});

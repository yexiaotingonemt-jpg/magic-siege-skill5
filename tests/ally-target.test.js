import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Simulation} from '../src/simulation.js';
import {contractType} from '../src/config.js';
import {canSelectAllies,manualTarget} from '../src/manual-target.js';
import {createGameServer} from '../server.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(id=5){
 const s=new Simulation();s.units=[];s.players[0].retired=true;s.waveAt=s.populationAt=1e9;for(const t of s.towers){t.x=100;t.cd=1e9;}
 const make=(classId,x=0,y=0)=>{const p=s.makePlayer(classId===3?1:0,false);p.classId=classId;p.level=6;p.builds[classId]=[1,1,1,1];p.stamina=100;const h=s.spawn(p.side,contractType(classId),0,1,x);assert.ok(s.contract(p,h.id));Object.assign(h,{x,y,hp:1e6,maxHp:1e7,speed:0,cd:1e9});return {p,h};};
 const {p,h}=make(id);s.localPlayerId=p.id;
 const troop=(x,y,side=h.side)=>{const u=s.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp:1e6,maxHp:1e7,speed:0,cd:1e9});return u;};
 return {s,p,h,make,troop};
}
function advance(s,duration){const end=s.time+duration;while(s.time<end-1e-8)s.tick(Math.min(.05,end-s.time));}

test('手选友方技能目标后保留警戒外20格内的原手动敌方锁定并继续追击',()=>{
 for(const id of [0,5]){const {s,p,h,make,troop}=arena(id),enemy=make(3,0,15).h,friend=troop(2,0);h.speed=2;assert.ok(s.setManualTarget(enemy.id,p));assert.ok(s.setManualTarget(friend.id,p));assert.equal(h.manualTargetId,friend.id);assert.equal(h.manualAttackTargetId,enemy.id);assert.equal(s.choose(h).id,enemy.id);advance(s,.2);assert.ok(h.y>0);assert.equal(h.targetId,enemy.id);assert.equal(h.manualTargetId,friend.id);friend.hp=0;assert.equal(s.choose(h).id,enemy.id);assert.equal(h.manualTargetId,null);enemy.y=h.y+20.01;assert.equal(s.choose(h),null);assert.equal(h.manualAttackTargetId,null);}
});
test('嘲讽解除敌方追击锁与友方技能锁，不能保留隐藏手动目标',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,15).h,friend=troop(2,0),taunter=troop(0,2,1);assert.ok(s.setManualTarget(enemy.id,p));assert.ok(s.setManualTarget(friend.id,p));h.tauntId=taunter.id;h.tauntUntil=3;assert.equal(s.choose(h).id,taunter.id);assert.equal(h.manualAttackTargetId,null);assert.equal(h.manualTargetId,null);s.time=4;assert.notEqual(s.choose(h)?.id,enemy.id);
});

test('兽人和精灵按职业能力选择20格友方、自己及塔，不依赖当前加点或冷却',()=>{
 for(const id of [0,5]){const {s,p,h,make,troop}=arena(id),enemy=make(3,0,3).h,ally=troop(0,20),tower=s.towers[0];Object.assign(tower,{side:h.side,x:0,y:20});p.builds[id]=[1,0,0,0];p.cd=[99,99,99,99];h.targetId=enemy.id;
  assert.equal(canSelectAllies(h),true);for(const u of [ally,h,tower]){assert.ok(s.setManualTarget(u.id,p),s.notice);assert.equal(manualTarget(s,h).id,u.id);assert.equal(h.targetId,enemy.id);near(h.cd,1e9);}
 }
});
test('战车、领主和火法不能选择友方或自己，自身增益不授予友方选中能力',()=>{
 for(const id of [2,3,4]){const {s,p,h,troop}=arena(id),enemy=troop(0,2,1-h.side),ally=troop(1,1);assert.ok(s.setManualTarget(enemy.id,p));assert.equal(canSelectAllies(h),false);for(const u of [ally,h]){assert.equal(s.setManualTarget(u.id,p),false);assert.match(s.notice,/职业/);assert.equal(h.manualTargetId,enemy.id);assert.equal(h.targetId,enemy.id);}}
});
test('友方超出20格或阵亡后拒选并保留之前的友方与敌方普攻目标',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,2).h,ally=troop(0,4),outside=troop(0,20.001),dead=troop(2,2);dead.hp=0;h.targetId=enemy.id;assert.ok(s.setManualTarget(ally.id,p));for(const u of [outside,dead]){assert.equal(s.setManualTarget(u.id,p),false);assert.equal(h.manualTargetId,ally.id);assert.equal(h.targetId,enemy.id);}
});
test('手选友方不追击或普攻友军，继续原敌方普攻，并保留友方手选',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,1).h,ally=troop(8,0);h.targetId=enemy.id;h.speed=2;h.cd=0;const before=ally.hp,enemyBefore=enemy.hp;assert.ok(s.setManualTarget(ally.id,p));assert.equal(s.choose(h).id,enemy.id);advance(s,1);near(h.x,0);near(h.y,0);near(ally.hp,before);assert.ok(enemy.hp<enemyBefore);assert.equal(h.manualTargetId,ally.id);assert.equal(h.targetId,enemy.id);
});
test('没有敌人时手选侧方友军仍按原规则前进，不向其寻路',()=>{
 const {s,p,h,troop}=arena(),ally=troop(8,0);h.speed=2;assert.ok(s.setManualTarget(ally.id,p));assert.equal(s.choose(h),null);advance(s,.2);near(h.x,0);assert.ok(h.y>0);assert.equal(h.targetId,null);assert.equal(h.manualTargetId,ally.id);
});
test('友方死亡或离开20格清理手选，原有效敌方攻击目标不被清空',()=>{
 for(const reason of ['death','range']){const {s,p,h,make,troop}=arena(),enemy=make(3,0,2).h,ally=troop(0,4);h.targetId=enemy.id;assert.ok(s.setManualTarget(ally.id,p));if(reason==='death')ally.hp=0;else ally.y=20.01;assert.equal(s.choose(h).id,enemy.id);assert.ok(!h.manualTargetId);assert.equal(h.targetId,enemy.id);}
});
test('嘲讽优先友方手选，控制期间选友方不会绕过眩晕',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,2).h,ally=troop(0,3);assert.ok(s.setManualTarget(ally.id,p));h.tauntId=enemy.id;h.tauntUntil=2;assert.equal(s.choose(h).id,enemy.id);assert.ok(!h.manualTargetId);assert.equal(s.setManualTarget(ally.id,p),false);h.tauntUntil=0;h.stunUntil=2;assert.ok(s.setManualTarget(ally.id,p));h.cd=0;const hp=enemy.hp;advance(s,.5);near(enemy.hp,hp);near(h.x,0);near(h.y,0);
});
test('兽人和精灵的敌方技能在手选友方时仍选择敌人，不产生友伤',()=>{
 for(const id of [0,5]){const {s,p,h,make,troop}=arena(id),enemy=make(3,0,2).h,ally=troop(1,2);h.targetId=enemy.id;assert.ok(s.setManualTarget(ally.id,p));const plan=s.castPlan(0,p);assert.equal(plan.t.id,enemy.id);assert.ok(s.cast(0,p));const before=ally.hp,hp=enemy.hp;advance(s,.4);assert.ok(enemy.hp<hp);assert.ok(ally.hp>=before);}
});
test('兽人群守优先手选友军但仍以自身为中心，保留自己与原人数上限',()=>{
 const {s,p,h,troop}=arena(0),nearby=Array.from({length:5},(_,i)=>troop(.1*i,1)),chosen=troop(0,6),outside=troop(0,6.01);assert.ok(s.setManualTarget(chosen.id,p));let plan=s.castPlan(1,p);assert.equal(plan.t.id,h.id);assert.equal(plan.targets[0].id,h.id);assert.equal(plan.targets[1].id,chosen.id);assert.equal(plan.targets.length,plan.s.targets+1);assert.ok(s.cast(1,p));advance(s,.4);assert.ok(chosen.guards?.length);assert.equal(nearby.filter(u=>u.guards?.length).length,2);assert.ok(!outside.guards?.length);p.cd[1]=0;assert.ok(s.setManualTarget(outside.id,p));plan=s.castPlan(1,p);assert.ok(!plan.targets.some(u=>u.id===outside.id));
});
test('兽人手选救援友军仍要求范围内敌英雄正攻击该友军，合法时实际换位',()=>{
 const {s,p,h,make,troop}=arena(0),nearEnemy=make(3,0,2).h,other=troop(1,2),chosen=troop(4,3);nearEnemy.targetId=other.id;assert.ok(s.setManualTarget(chosen.id,p));assert.equal(s.castPlan(2,p).ok,false);nearEnemy.targetId=chosen.id;let plan=s.castPlan(2,p);assert.ok(plan.ok,plan.reason);assert.equal(plan.t.id,chosen.id);assert.ok(s.cast(2,p));advance(s,.4);near(h.x,4);near(h.y,3);near(chosen.x,0);near(chosen.y,0);
});
test('精灵链接手选友军优于最低血量，技能距离仍为12格，禁止链接自己与塔',()=>{
 const {s,p,h,troop}=arena(),low=troop(0,2),chosen=troop(0,12);low.hp=1;assert.ok(s.setManualTarget(chosen.id,p));assert.equal(s.castPlan(1,p).t.id,chosen.id);assert.ok(s.cast(1,p));advance(s,.4);assert.equal(h.linkId,chosen.id);p.cd[1]=0;chosen.y=12.01;assert.equal(s.castPlan(1,p).t.id,low.id);assert.ok(s.setManualTarget(h.id,p));assert.equal(s.castPlan(1,p).t.id,low.id);const tower=s.towers[0];Object.assign(tower,{side:h.side,x:0,y:2});assert.ok(s.setManualTarget(tower.id,p));assert.equal(s.castPlan(1,p).t.id,low.id);
});
test('精灵净化优先手选有负面友军，健康者不占名额且不扩大人数',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,3).h,nearby=Array.from({length:4},(_,i)=>troop(i*.2,1)),chosen=troop(0,12);for(const u of [...nearby,chosen])s.debuff(u,enemy,'moveSlow',.3,10,null,true);assert.ok(s.setManualTarget(chosen.id,p));let plan=s.castPlan(2,p);assert.equal(plan.targets[0].id,chosen.id);assert.equal(plan.targets.length,3);assert.ok(s.cast(2,p));advance(s,.4);assert.equal(s.hasNegative(chosen),false);assert.equal(nearby.filter(u=>!s.hasNegative(u)).length,2);p.cd[2]=0;assert.ok(s.setManualTarget(troop(0,.2).id,p));plan=s.castPlan(2,p);assert.ok(plan.targets.every(u=>s.hasNegative(u)));
});
test('精灵群疗优先手选但保持自身加四友军和原12格中心，实际不治疗圈外对象',()=>{
 const {s,p,h,troop}=arena(),nearby=Array.from({length:5},(_,i)=>troop(i*.2,1)),chosen=troop(0,12),outside=troop(0,12.01);for(const [i,u]of nearby.entries())u.hp=100+i;assert.ok(s.setManualTarget(chosen.id,p));const plan=s.castPlan(3,p);assert.equal(plan.t.id,h.id);assert.equal(plan.targets[1].id,chosen.id);assert.equal(plan.targets.length,5);const hp=chosen.hp,outHp=outside.hp;assert.ok(s.cast(3,p));advance(s,.4);assert.ok(chosen.hp>hp);near(outside.hp,outHp);assert.equal(nearby.filter(u=>u.hp>1000).length,3);
});
test('精灵冲击保持敌方主目标，副治疗圈内手选友军优先且允许圈内原本超12格者',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,12).h;h.targetId=enemy.id;const crowd=Array.from({length:4},(_,i)=>troop(i*.1,12)),chosen=troop(0,17),outside=troop(0,17.01);assert.ok(s.setManualTarget(chosen.id,p));assert.equal(s.castPlan(0,p).t.id,enemy.id);const before=chosen.hp,outsideHp=outside.hp;assert.ok(s.cast(0,p));advance(s,.4);assert.ok(chosen.hp>before);near(outside.hp,outsideHp);assert.equal(crowd.filter(u=>u.hp>1e6).length,2);
});
test('自身技能不转给手选友军，前摇中的友方技能保持已锁定目标',()=>{
 const orc=arena(0),friend=orc.troop(1,1);assert.ok(orc.s.setManualTarget(friend.id,orc.p));assert.equal(orc.s.castPlan(3,orc.p).t.id,orc.h.id);assert.ok(orc.s.cast(3,orc.p));advance(orc.s,.4);assert.ok(orc.h.damageStore);assert.ok(!friend.damageStore);
 const {s,p,h,troop}=arena(),one=troop(1,1),two=troop(-1,1);assert.ok(s.setManualTarget(one.id,p));assert.ok(s.cast(1,p));assert.ok(s.setManualTarget(two.id,p));advance(s,.4);assert.equal(h.linkId,one.id);p.cd[1]=0;assert.equal(s.castPlan(1,p).t.id,two.id);
});
test('友方塔可手选但不会扩展到链接、净化、治疗和群守原技能目标类型',()=>{
 for(const id of [0,5]){const {s,p,h,make,troop}=arena(id),enemy=make(3,0,3).h,friend=troop(1,1),tower=s.towers[0];Object.assign(tower,{side:h.side,x:0,y:2,hp:100,maxHp:1000});s.debuff(friend,enemy,'moveSlow',.3,10,null,true);s.debuff(tower,enemy,'moveSlow',.3,10,null,true);assert.ok(s.setManualTarget(tower.id,p));for(const i of id===0?[1]:[1,2,3]){const plan=s.castPlan(i,p);assert.ok(plan.ok,plan.reason);assert.notEqual(plan.t.id,tower.id);assert.ok(!plan.targets.some(u=>u.id===tower.id));}}
});
test('HTTP友方锁定仅操作登录英雄，跨端同步，非法职业和重复指令不绕过限制',async()=>{
 const game=createGameServer({dataDir:await mkdtemp(path.join(tmpdir(),'kc5-ally-target-'))});game.room.paused=true;await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+game.server.address().port;
 const call=async(route,body,cookie)=>{const res=await fetch(base+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 try{const a=await call('/api/register',{name:'友方锁定精灵',password:'isolated-ally-target',side:0}),b=await call('/api/register',{name:'友方锁定火法',password:'isolated-ally-target',side:0}),s=game.room.sim,p=game.room.player(game.accounts.rows[0]),q=game.room.player(game.accounts.rows[1]);p.classId=5;q.classId=4;p.stamina=q.stamina=100;const one=s.spawn(0,'ranged',0,1,0),two=s.spawn(0,'ranged',0,1,0);assert.ok(s.contract(p,one.id));assert.ok(s.contract(q,two.id));Object.assign(one,{x:0,y:0});Object.assign(two,{x:0,y:2});const enemy=s.spawn(1,'melee',0,1,0);Object.assign(enemy,{x:0,y:1});one.targetId=enemy.id;const body={id:'ally-repeat',type:'target',args:{unitId:two.id,playerId:q.id,sourceId:two.id}};const first=await call('/api/action',body,a.cookie);assert.equal(first.data.ok,true,first.data.message);assert.equal(one.manualTargetId,two.id);assert.equal(one.targetId,enemy.id);assert.ok(!two.manualTargetId);const state=await call('/api/state',null,b.cookie);assert.equal(state.data.units.find(u=>u.id===one.id).manualTargetId,two.id);const rejected=await call('/api/action',{...body,id:'fire-invalid',args:{unitId:one.id}},b.cookie);assert.equal(rejected.data.ok,false);assert.match(rejected.data.message,/职业/);two.y=100;assert.deepEqual((await call('/api/action',body,a.cookie)).data,first.data);assert.equal((await call('/api/action',{...body,id:'new-outside'},a.cookie)).data.ok,false);assert.equal((await call('/api/action',body)).status,401);
 }finally{for(const c of [...game.room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));}
});

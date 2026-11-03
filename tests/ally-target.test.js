import {CLIENT_VERSION,GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Simulation} from '../shared/simulation.js';
import {contractType} from '../shared/config.js';
import {canSelectAllies,manualTarget} from '../shared/manual-target.js';
import {createGameServer} from '../server/index.mjs';
import {navigate} from '../shared/navigation.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(id=5){
 const s=new Simulation();s.units=[];s.players[0].retired=true;s.waveAt=s.populationAt=1e9;for(const t of s.towers){t.x=100;t.cd=1e9;}
 const make=(classId,x=0,y=0)=>{const p=s.makePlayer(classId===3?1:0,false);p.classId=classId;p.level=6;p.builds[classId]=[1,1,1,1];p.stamina=100;const h=s.spawn(p.side,contractType(classId),0,1,x);assert.ok(s.contract(p,h.id));p.xp=0;Object.assign(h,{x,y,hp:1e6,maxHp:1e7,speed:0,cd:1e9});return {p,h};};
 const {p,h}=make(id);s.localPlayerId=p.id;
 const troop=(x,y,side=h.side)=>{const u=s.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp:1e6,maxHp:1e7,speed:0,cd:1e9});return u;};
 return {s,p,h,make,troop};
}
function advance(s,duration){const end=s.time+duration;while(s.time<end-1e-8)s.tick(Math.min(.05,end-s.time));}

test('所有职业先朝友军移动，抵达自身射程后重新警戒索敌，不追击友军的敌人',()=>{
 for(const id of [0,2,3,4,5]){
  const {s,p,h,troop}=arena(id),old=troop(0,16,1-h.side),enemy=troop(0,15,1-h.side),friend=troop(10,0),local=troop(10-h.range,1,1-h.side);
  h.x=-10;h.speed=2;s.setManualTarget(old.id,p);friend.targetId=enemy.id;friend.stunUntil=1e9;
  assert.ok(s.setManualTarget(friend.id,p));assert.equal(h.manualTargetId,friend.id);assert.equal(h.manualAttackTargetId,null);
  advance(s,.2);assert.ok(h.x>-10);near(h.y,0);assert.equal(h.targetId,null);
  friend.targetId=old.id;advance(s,.2);near(h.y,0);assert.equal(h.targetId,null);
  friend.targetId=null;advance(s,(20-h.range)/2-.4);
  near(h.x,10-h.range);near(h.y,0);assert.equal(h.manualMoveTargetId,null);assert.equal(h.targetId,local.id);
  assert.equal(h.manualTargetId,friend.id);assert.equal(h.manualAttackTargetId,null);
  friend.x=10.5;advance(s,.1);assert.equal(h.manualMoveTargetId,null);assert.equal(h.targetId,local.id);
 }
});

test('嘲讽解除敌方追击锁与友方技能锁，不能保留隐藏手动目标',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,15).h,friend=troop(2,0),taunter=troop(0,2,1);assert.ok(s.setManualTarget(enemy.id,p));assert.ok(s.setManualTarget(friend.id,p));h.tauntId=taunter.id;h.tauntUntil=3;assert.equal(s.choose(h).id,taunter.id);assert.equal(h.manualAttackTargetId,null);assert.equal(h.manualTargetId,null);s.time=4;assert.notEqual(s.choose(h)?.id,enemy.id);
});

test('兽人和精灵按职业能力选择20格友方、自己及塔，不依赖当前加点或冷却',()=>{
 for(const id of [0,5]){const {s,p,h,make,troop}=arena(id),enemy=make(3,0,3).h,ally=troop(0,20),tower=s.towers[0];Object.assign(tower,{side:h.side,x:0,y:20});p.builds[id]=[1,0,0,0];p.cd=[99,99,99,99];h.targetId=enemy.id;ally.targetId=tower.targetId=enemy.id;
  assert.equal(canSelectAllies(h),true);for(const u of [ally,h,tower]){assert.ok(s.setManualTarget(u.id,p),s.notice);assert.equal(manualTarget(s,h).id,u.id);assert.equal(h.targetId,null);assert.equal(h.manualMoveTargetId,u.id);near(h.cd,1e9);}
 }
});
test('战车、领主和火法也能选择友军、自己与友方塔',()=>{
 for(const id of [2,3,4]){const {s,p,h,troop}=arena(id),enemy=troop(0,2,1-h.side),ally=troop(1,1),tower=s.towers[0];Object.assign(tower,{side:h.side,x:1,y:2,targetId:enemy.id});ally.targetId=enemy.id;assert.ok(canSelectAllies(h));for(const u of [ally,h,tower]){assert.ok(s.setManualTarget(u.id,p));assert.equal(h.manualTargetId,u.id);assert.equal(h.targetId,null);}}
});

test('友方超出20格或阵亡后拒选并保留之前的靠近指令',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,2).h,ally=troop(0,4),outside=troop(0,20.001),dead=troop(2,2);dead.hp=0;h.targetId=enemy.id;ally.targetId=enemy.id;assert.ok(s.setManualTarget(ally.id,p));for(const u of [outside,dead]){assert.equal(s.setManualTarget(u.id,p),false);assert.equal(h.manualTargetId,ally.id);assert.equal(h.targetId,null);assert.equal(h.manualMoveTargetId,ally.id);}
});

for(const [id,skills]of [[0,[1,2]],[5,[1,2,3]]])test(`职业${id}手选友军超出对应支援范围时提示太远，不自动改选其他友军`,()=>{
 const {s,p,h,make,troop}=arena(id),enemy=make(3,0,1).h,chosen=troop(0,15);
 enemy.targetId=chosen.id;s.debuff(chosen,enemy,'moveSlow',.3,10,null,true);
 assert.ok(s.setManualTarget(chosen.id,p));
 for(const i of skills){const skill=s.config.heroes[id].skills[i];chosen.y=skill.targetRange+.001;
  assert.equal(s.castPlan(i,p).code,'range');const stamina=p.stamina;assert.equal(s.cast(i,p),false);near(p.stamina,stamina);assert.equal(p.cd[i],0);
  chosen.y=skill.targetRange;assert.ok(s.castPlan(i,p).ok,s.castPlan(i,p).reason);
 }
});
test('手选友军优先脱离近敌，靠近途中不普攻，保留技能手选且不造成友伤',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,1).h,ally=troop(18,0);h.targetId=enemy.id;ally.targetId=enemy.id;ally.stunUntil=1e9;h.speed=2;h.cd=0;const before=ally.hp,enemyBefore=enemy.hp;assert.ok(s.setManualTarget(ally.id,p));assert.equal(s.choose(h),null);advance(s,1);near(h.x,2);near(h.y,0);near(ally.hp,before);near(enemy.hp,enemyBefore);assert.equal(h.manualTargetId,ally.id);assert.equal(h.targetId,null);
});
test('无敌人时先靠近侧方友军，抵达射程后恢复推进；再次点击可重新发起靠近',()=>{
 const {s,p,h,troop}=arena(),ally=troop(8,0);h.x=-8;h.speed=2;assert.ok(s.setManualTarget(ally.id,p));assert.equal(s.choose(h),null);advance(s,(16-h.range)/2);near(h.x,8-h.range);near(h.y,0);assert.equal(h.manualMoveTargetId,null);advance(s,.2);assert.ok(h.y>0);assert.equal(h.targetId,null);assert.equal(h.manualTargetId,ally.id);
 ally.x=h.x+10;ally.y=h.y;assert.ok(s.setManualTarget(ally.id,p));const x=h.x,y=h.y;advance(s,.2);assert.ok(h.x>x);near(h.y,y);
});
test('友方死亡或离开20格清理手选并重新选中警戒内敌人',()=>{
 for(const reason of ['death','range']){const {s,p,h,make,troop}=arena(),enemy=make(3,0,2).h,ally=troop(0,4);h.targetId=enemy.id;ally.targetId=enemy.id;assert.ok(s.setManualTarget(ally.id,p));if(reason==='death')ally.hp=0;else ally.y=20.01;assert.equal(s.choose(h).id,enemy.id);assert.ok(!h.manualTargetId);s.tick(.05);assert.equal(h.targetId,enemy.id);}
});
test('嘲讽优先友方手选，控制期间选友方不会绕过眩晕',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,2).h,ally=troop(0,3);assert.ok(s.setManualTarget(ally.id,p));h.tauntId=enemy.id;h.tauntUntil=2;assert.equal(s.choose(h).id,enemy.id);assert.ok(!h.manualTargetId);assert.equal(s.setManualTarget(ally.id,p),false);h.tauntUntil=0;h.stunUntil=2;assert.ok(s.setManualTarget(ally.id,p));h.cd=0;const hp=enemy.hp;advance(s,.5);near(enemy.hp,hp);near(h.x,0);near(h.y,0);
});

test('靠近追随友军当前位置，改选敌人立即取消靠近',()=>{
 const {s,p,h,troop}=arena(0),ally=troop(8,0),enemy=troop(-8,5,1);h.x=-8;h.speed=2;
 s.setManualTarget(ally.id,p);navigate(s,h,.2);assert.ok(h.x>-8);near(h.y,0);
 ally.y=4;navigate(s,h,.2);assert.ok(h.y>0);assert.equal(h.targetId,null);
 s.setManualTarget(enemy.id,p);assert.equal(h.manualMoveTargetId,null);const x=h.x;navigate(s,h,.2);assert.ok(h.x<x);assert.equal(h.targetId,enemy.id);
});

test('选择自己或恰在普攻距离内的友军立即重新警戒索敌',()=>{
 for(const self of [false,true]){
  const {s,p,h,troop}=arena(0),enemy=troop(0,2,1),ally=self?h:troop(h.range,0);
  s.setManualTarget(ally.id,p);assert.equal(s.choose(h).id,enemy.id);assert.equal(h.manualMoveTargetId,null);near(h.x,0);near(h.y,0);
 }
});

test('靠近期间眩晕、前摇、引导仍禁止移动，减速和防守边界仍生效',()=>{
 for(const field of ['stunUntil','castUntil','channelUntil']){
  const {s,p,h,troop}=arena(0),ally=troop(8,0);h.x=-8;h.speed=2;s.setManualTarget(ally.id,p);h[field]=10;
  navigate(s,h,.2);near(h.x,-8);near(h.y,0);assert.equal(h.manualMoveTargetId,ally.id);
  h[field]=0;h.slowUntil=10;h.slowRatio=.5;navigate(s,h,.2);near(h.x,-7.8);
 }
 const {s,p,h,troop}=arena(3),limit=s.config.world.defenseLimitY;h.y=limit;h.speed=2;
 const ally=troop(0,limit-10);s.setManualTarget(ally.id,p);navigate(s,h,1);near(h.y,limit);assert.equal(h.targetId,null);
});
test('兽人链接敌人、精灵治疗友方并打击其附近敌人，不产生友伤',()=>{
 for(const id of [0,5]){const {s,p,h,make,troop}=arena(id),enemy=make(3,0,2).h,ally=troop(1,2);h.targetId=enemy.id;ally.targetId=enemy.id;assert.ok(s.setManualTarget(ally.id,p));const plan=s.castPlan(0,p);assert.equal(plan.t.id,id===5?ally.id:enemy.id);assert.ok(s.cast(0,p));const before=ally.hp,hp=enemy.hp;advance(s,1.4);assert.ok(enemy.hp<hp);assert.ok(ally.hp>=before);}
});
test('兽人群守优先手选友军但仍以自身为中心，保留自己与原人数上限',()=>{
 const {s,p,h,troop}=arena(0),nearby=Array.from({length:5},(_,i)=>troop(.1*i,1)),chosen=troop(0,6),outside=troop(0,6.01);assert.ok(s.setManualTarget(chosen.id,p));let plan=s.castPlan(1,p);assert.equal(plan.t.id,h.id);assert.equal(plan.targets[0].id,h.id);assert.equal(plan.targets[1].id,chosen.id);assert.equal(plan.targets.length,plan.s.targets+1);assert.ok(s.cast(1,p));advance(s,.4);assert.ok(chosen.guards?.length);assert.equal(nearby.filter(u=>u.guards?.length).length,2);assert.ok(!outside.guards?.length);p.cd[1]=0;assert.ok(s.setManualTarget(outside.id,p));plan=s.castPlan(1,p);assert.equal(plan.code,'range');
});
test('兽人手选救援友军无需被攻击，合法时实际换位',()=>{
 const {s,p,h,make,troop}=arena(0),nearEnemy=make(3,0,2).h,other=troop(1,2),chosen=troop(4,3);nearEnemy.targetId=other.id;assert.ok(s.setManualTarget(chosen.id,p));assert.equal(s.castPlan(2,p).ok,true);nearEnemy.targetId=chosen.id;let plan=s.castPlan(2,p);assert.ok(plan.ok,plan.reason);assert.equal(plan.t.id,chosen.id);assert.ok(s.cast(2,p));advance(s,.4);near(h.x,4);near(h.y,3);near(chosen.x,0);near(chosen.y,0);
});
test('精灵链接手选友军优于最低血量，技能距离仍为12格，禁止链接自己与塔',()=>{
 const {s,p,h,troop}=arena(),low=troop(0,2),chosen=troop(0,12);chosen.targetId=troop(1,2,1-h.side).id;chosen.stunUntil=1e9;low.hp=1;assert.ok(s.setManualTarget(chosen.id,p));assert.equal(s.castPlan(1,p).t.id,chosen.id);assert.ok(s.cast(1,p));advance(s,.4);assert.equal(h.linkId,chosen.id);p.cd[1]=0;chosen.y=12.01;assert.equal(s.castPlan(1,p).code,'range');assert.ok(s.setManualTarget(h.id,p));assert.equal(s.castPlan(1,p).code,'wrong-target');const tower=s.towers[0];Object.assign(tower,{side:h.side,x:0,y:2});assert.ok(s.setManualTarget(tower.id,p));assert.equal(s.castPlan(1,p).code,'wrong-target');
});
test('精灵净化优先手选有负面友军，健康者不占名额且不扩大人数',()=>{
 const {s,p,h,make,troop}=arena(),enemy=make(3,0,3).h,nearby=Array.from({length:4},(_,i)=>troop(i*.2,1)),chosen=troop(0,12);for(const u of [...nearby,chosen])s.debuff(u,enemy,'moveSlow',.3,10,null,true);assert.ok(s.setManualTarget(chosen.id,p));let plan=s.castPlan(2,p);assert.equal(plan.targets[0].id,chosen.id);assert.equal(plan.targets.length,4);assert.ok(s.cast(2,p));advance(s,.4);assert.equal(s.hasNegative(chosen),false);assert.equal(nearby.filter(u=>!s.hasNegative(u)).length,3);p.cd[2]=0;assert.ok(s.setManualTarget(troop(0,.2).id,p));plan=s.castPlan(2,p);assert.equal(plan.code,'wrong-target');assert.match(plan.reason,/没有可净化/);
});
test('精灵群疗优先手选但保持自身加四友军和原12格中心，实际不治疗圈外对象',()=>{
 const {s,p,h,troop}=arena(),nearby=Array.from({length:5},(_,i)=>troop(i*.2,1)),chosen=troop(0,12),outside=troop(0,12.01);for(const [i,u]of nearby.entries())u.hp=100+i;assert.ok(s.setManualTarget(chosen.id,p));const plan=s.castPlan(3,p);assert.equal(plan.t.id,h.id);assert.equal(plan.targets[1].id,chosen.id);assert.equal(plan.targets.length,5);const hp=chosen.hp,outHp=outside.hp;assert.ok(s.cast(3,p));advance(s,.4);assert.ok(chosen.hp>hp);near(outside.hp,outHp);assert.equal(nearby.filter(u=>u.hp>1000).length,3);
});
test('精灵灵息以手选友军为中心，超出12格拒绝治疗',()=>{const {s,p,h,make,troop}=arena(),enemy=make(3,0,12).h,chosen=troop(0,12),outside=troop(0,12.01);chosen.targetId=enemy.id;s.setManualTarget(chosen.id,p);assert.equal(s.castPlan(0,p).t.id,chosen.id);const hp=chosen.hp,out=outside.hp,foe=enemy.hp;assert.ok(s.cast(0,p));advance(s,.4);assert.ok(chosen.hp>hp);near(outside.hp,out);assert.ok(enemy.hp<foe);s.setManualTarget(outside.id,p);assert.equal(s.castPlan(0,p).code,'range');});
test('自身技能不转给手选友军，前摇中的友方技能保持已锁定目标',()=>{
 const orc=arena(0),friend=orc.troop(1,1);assert.ok(orc.s.setManualTarget(friend.id,orc.p));assert.equal(orc.s.castPlan(3,orc.p).t.id,orc.h.id);assert.ok(orc.s.cast(3,orc.p));advance(orc.s,.4);assert.ok(orc.h.damageStore);assert.ok(!friend.damageStore);
 const {s,p,h,troop}=arena(),one=troop(1,1),two=troop(-1,1);one.targetId=two.targetId=troop(0,3,1-h.side).id;assert.ok(s.setManualTarget(one.id,p));assert.ok(s.cast(1,p));assert.ok(s.setManualTarget(two.id,p));advance(s,.4);assert.equal(h.linkId,one.id);p.cd[1]=0;assert.equal(s.castPlan(1,p).t.id,two.id);
});
test('友方塔可手选但不会扩展到链接、净化、治疗和群守原技能目标类型',()=>{
 for(const id of [0,5]){const {s,p,h,make,troop}=arena(id),enemy=make(3,0,3).h,friend=troop(1,1),tower=s.towers[0];Object.assign(tower,{side:h.side,x:0,y:2,hp:100,maxHp:1000});s.debuff(friend,enemy,'moveSlow',.3,10,null,true);s.debuff(tower,enemy,'moveSlow',.3,10,null,true);assert.ok(s.setManualTarget(tower.id,p));for(const i of id===0?[1]:[1,2,3]){const plan=s.castPlan(i,p);assert.equal(plan.code,'wrong-target');assert.match(plan.reason,/建筑/);}}
});
test('HTTP友方锁定仅操作登录英雄，跨端同步，所有职业可选友军且重复指令不绕过距离限制',async()=>{
 const game=createGameServer({dataDir:await mkdtemp(path.join(tmpdir(),'kc5-ally-target-'))});game.room.paused=true;await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+game.server.address().port;
 const call=async(route,body,cookie)=>{const res=await fetch(base+route,{method:body?'POST':'GET',headers:{'X-Magic-Client-Version':CLIENT_VERSION,'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 try{const a=await call('/api/register',{name:'友方锁定精灵',password:'isolated-ally-target',side:0}),b=await call('/api/register',{name:'友方锁定火法',password:'isolated-ally-target',side:0}),s=game.room.sim,p=game.room.player(game.accounts.rows[0]),q=game.room.player(game.accounts.rows[1]);p.classId=5;q.classId=4;p.stamina=q.stamina=100;const one=s.spawn(0,'ranged',0,1,0),two=s.spawn(0,'ranged',0,1,0);assert.ok(s.contract(p,one.id));assert.ok(s.contract(q,two.id));Object.assign(one,{x:0,y:0});Object.assign(two,{x:0,y:2});const enemy=s.spawn(1,'melee',0,1,0);Object.assign(enemy,{x:0,y:1});one.targetId=enemy.id;two.targetId=enemy.id;const body={id:'ally-repeat',type:'target',args:{unitId:two.id,playerId:q.id,sourceId:two.id}};const first=await call('/api/action',body,a.cookie);assert.equal(first.data.ok,true,first.data.message);assert.equal(one.manualTargetId,two.id);assert.equal(one.targetId,null);assert.equal(one.manualMoveTargetId,two.id);assert.ok(!two.manualTargetId);const state=await call('/api/state',null,b.cookie);assert.equal(state.data.units.find(u=>u.id===one.id).manualTargetId,two.id);assert.equal(state.data.units.find(u=>u.id===one.id).manualMoveTargetId,two.id);const rejected=await call('/api/action',{...body,id:'fire-invalid',args:{unitId:one.id}},b.cookie);assert.equal(rejected.data.ok,true);assert.equal(two.manualTargetId,one.id);two.y=100;assert.deepEqual((await call('/api/action',body,a.cookie)).data,first.data);assert.equal((await call('/api/action',{...body,id:'new-outside'},a.cookie)).data.ok,false);assert.equal((await call('/api/action',body)).status,401);
 }finally{for(const c of [...game.room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {enemyTarget,friendlyTarget} from '../shared/manual-target.js';

function arena(){
 const s=new Simulation();s.units=[];s.players[0].retired=true;s.waveAt=s.populationAt=1e9;
 for(const t of s.towers)Object.assign(t,{x:100,cd:1e9});
 const p=s.makePlayer(0,false);p.classId=5;p.level=6;p.builds[5]=[1,1,1,1];p.stamina=100;
 const h=s.spawn(0,'ranged',0,1,0);assert.ok(s.contract(p,h.id));s.localPlayerId=p.id;
 Object.assign(h,{x:0,y:0,hp:1000,maxHp:10000,speed:0,cd:1e9});
 const unit=(side,x=1,y=1,hp=100)=>{const u=s.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp,maxHp:10000,speed:0,cd:1e9});return u;};
 const release=()=>{for(let n=0;n<8;n++)s.tick(.05);};
 return {s,p,h,unit,release};
}

for(const skill of [1,2,3])test(`精灵支援${skill+1}选敌时对其攻击目标释放，旧友方锁不覆盖当前选择`,()=>{
 const {s,p,h,unit,release}=arena(),old=unit(0,-2,0,1),victim=unit(0,2,0,900),enemy=unit(1,0,3);
 s.setManualTarget(old.id,p);s.setManualTarget(enemy.id,p);enemy.targetId=victim.id;
 if(skill===2)for(const u of [old,victim])s.debuff(u,enemy,'moveSlow',.3,10,null,true);
 const plan=s.castPlan(skill,p);assert.ok(plan.ok,plan.reason);
 assert.equal(skill===1?plan.t.id:plan.manualTargetId,victim.id);
 assert.equal(h.friendlyTargetId,old.id);assert.equal(h.manualTargetId,enemy.id);
 assert.ok(s.cast(skill,p));release();
 if(skill===1)assert.equal(h.linkId,victim.id);
 if(skill===2)assert.equal(s.hasNegative(victim),false);
 if(skill===3)assert.ok(victim.hp>900);
 assert.equal(h.manualTargetId,enemy.id);
});

for(const selection of ['enemy-without-target','no-selection','dead-enemy-victim'])for(const skill of [1,2,3])test(`精灵支援${skill+1}在${selection}时提示无效且不回退其他友军`,()=>{
 const {s,p,h,unit}=arena(),low=unit(0,3,0,80),ratioLow=unit(0,2,0,100),outside=unit(0,13,0,1),enemy=unit(1,0,3);
 low.maxHp=100;ratioLow.maxHp=100000;
 if(selection!=='no-selection')s.setManualTarget(enemy.id,p);else enemy.hp=0;
 if(selection==='dead-enemy-victim'){const dead=unit(0,1,0,0);enemy.targetId=dead.id;}
 if(skill===2)for(const u of [low,ratioLow,outside])s.debuff(u,enemy,'moveSlow',.3,10,null,true);
 const before={stamina:p.stamina,cd:[...p.cd],score:p.score};const plan=s.castPlan(skill,p);assert.equal(plan.ok,false);assert.equal(plan.code,'wrong-target');assert.equal(s.cast(skill,p),false);assert.ok(s.notice);assert.deepEqual({stamina:p.stamina,cd:p.cd,score:p.score},before);
});

test('直接选友方优先于其血量和敌人的攻击目标，非法类型和距离仍拒绝且不扣费',()=>{
 const {s,p,h,unit}=arena(),chosen=unit(0,3,0,900),low=unit(0,1,0,1),enemy=unit(1,0,2);enemy.targetId=low.id;
 s.setManualTarget(chosen.id,p);assert.equal(s.castPlan(1,p).t.id,chosen.id);
 s.setManualTarget(enemy.id,p);enemy.targetId=chosen.id;chosen.x=12.01;
 const before={stamina:p.stamina,cd:[...p.cd]};assert.equal(s.castPlan(1,p).code,'range');assert.equal(s.cast(1,p),false);
 assert.deepEqual({stamina:p.stamina,cd:p.cd},before);
 enemy.targetId=h.id;assert.equal(s.castPlan(1,p).code,'wrong-target');
 enemy.targetId=low.id;assert.equal(s.castPlan(2,p).code,'wrong-target');
});

test('精灵当前友方死亡后清除旧警戒外追击，自动选中警戒内敌人并统一用于技能',()=>{
 const {s,p,h,unit}=arena(),oldEnemy=unit(1,0,15),friend=unit(0,2,0),local=unit(1,0,3);
 s.setManualTarget(oldEnemy.id,p);s.setManualTarget(friend.id,p);friend.hp=0;s.tick(.05);
 assert.equal(h.friendlyTargetId,null);assert.equal(h.manualTargetId,null);assert.equal(h.manualAttackTargetId,null);
 assert.equal(h.targetId,local.id);assert.equal(enemyTarget(s,h).id,local.id);assert.equal(s.castPlan(0,p).t.id,local.id);
 const chosen=unit(1,0,16),anotherFriend=unit(0,1,0);s.setManualTarget(anotherFriend.id,p);s.setManualTarget(chosen.id,p);anotherFriend.hp=0;s.tick(.05);
 assert.equal(h.targetId,chosen.id);assert.equal(h.manualTargetId,chosen.id);assert.equal(friendlyTarget(s,h),null);
});

test('无目标自动选中警戒边界内敌人，有效目标保留，越界敌人不自动锁定',()=>{
 const {s,p,h,unit}=arena(),outside=unit(1,h.aggro+.001,0);s.tick(.05);assert.equal(h.targetId,null);
 const boundary=unit(1,h.aggro,0);s.tick(.05);assert.equal(h.targetId,boundary.id);assert.equal(s.castPlan(0,p).t.id,boundary.id);
 unit(1,0,.5);s.tick(.05);assert.equal(h.targetId,boundary.id);assert.equal(h.manualAttackTargetId,null);
 outside.x=h.aggro+1;boundary.hp=0;s.tick(.05);assert.notEqual(h.targetId,outside.id);
});

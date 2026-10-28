import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';

function arena({from={x:0,y:-36},to={x:0,y:-48},targetHp=1e7}={}){
 const s=new Simulation();s.units=[];s.player.retired=true;s.waveAt=s.populationAt=1e9;
 for(const tower of s.towers){tower.x=100;tower.cd=1e9;}
 const p=s.makePlayer(1,false);p.classId=3;p.level=6;p.builds[3]=[1,1,1,1];p.stamina=100;s.localPlayerId=p.id;
 const h=s.spawn(1,'melee',0,1,0);assert.ok(s.contract(p,h.id));Object.assign(h,{...from,speed:2,cd:0,hp:1e7,maxHp:1e7});
 const enemy=s.spawn(0,'melee',0,1,0);Object.assign(enemy,{...to,speed:0,cd:1e9,hp:targetHp,maxHp:targetHp});
 assert.ok(s.setManualTarget(enemy.id,p));assert.ok(s.cast(1,p));return {s,p,h,enemy};
}
function finishDash(s,h){
 for(let n=0;n<100;n++){s.tick(.05);if(s.time>.7&&!h.dash)return {x:h.x,y:h.y,time:s.time};}
 assert.fail('dash did not finish');
}
function stepContinuously(s,h,duration=.5){
 const max=h.speed*.05+1e-7;
 for(let n=0;n<Math.round(duration/.05);n++){const before={x:h.x,y:h.y};s.tick(.05);assert.ok(Math.hypot(h.x-before.x,h.y-before.y)<=max,`unexpected post-dash displacement ${JSON.stringify({from:before,to:{x:h.x,y:h.y},limit:s.config.world.defenseLimitY,time:s.time})}`);}
}

test('领主撞人后在守方推进线外结束冲锋，普通追击不会瞬间弹回边界',()=>{
 const {s,h,enemy}=arena(),end=finishDash(s,h);assert.ok(end.y<s.config.world.defenseLimitY);assert.equal(end.y,-48);assert.equal(enemy.x,5);assert.ok(enemy.hp<enemy.maxHp);
 stepContinuously(s,h,.5);assert.ok(h.y<-47.9);assert.ok(h.x>0);assert.equal(h.targetId,enemy.id);
});
test('斜向冲锋撞击后仍连续移动，侧向击退不会把领主硬拉回推进线',()=>{
 const {s,h,enemy}=arena({from:{x:-2,y:-36},to:{x:2,y:-48}}),end=finishDash(s,h);assert.ok(end.y<-47.9);assert.ok(Math.hypot(enemy.x-2,enemy.y+48)>4.9);stepContinuously(s,h,.5);assert.ok(h.y<-45);
});
test('冲锋击杀终点目标后，无目标返向推进线也按移速移动而不是瞬移',()=>{
 const {s,h,enemy}=arena({targetHp:1}),end=finishDash(s,h);assert.equal(s.get(enemy.id),undefined);assert.ok(end.y<s.config.world.defenseLimitY);stepContinuously(s,h,.5);assert.ok(h.y>end.y);assert.ok(h.y<=end.y+1+1e-7);
});
test('普通推进线内的冲锋沿途伤害和5格侧向击退保持，结束后继续普攻',()=>{
 const {s,h,enemy}=arena({from:{x:0,y:0},to:{x:0,y:-12}});finishDash(s,h);const hp=enemy.hp;stepContinuously(s,h,2);assert.ok(h.lastAttackAt>1.7);assert.ok(enemy.hp<hp);assert.equal(enemy.x,5);
});
test('原普通防守推进仍停在配置边界，不因为修复允许普通走出推进线',()=>{
 const {s,h,enemy}=arena({from:{x:0,y:-37},to:{x:0,y:-48}});s.jobs=[];h.castUntil=0;h.skillAnimation=null;h.manualTargetId=null;h.manualAttackTargetId=null;h.targetId=null;enemy.hp=0;
 for(let n=0;n<100;n++)s.tick(.05);assert.ok(h.y>=s.config.world.defenseLimitY);assert.ok(Math.abs(h.y-s.config.world.defenseLimitY)<1e-6);
});
test('冲锋越过推进线后，普通追击不会继续向边界外深入',()=>{
 const {s,h,enemy}=arena();const end=finishDash(s,h);Object.assign(enemy,{x:0,y:end.y-6});
 stepContinuously(s,h,1);assert.equal(h.y,end.y);assert.equal(h.targetId,enemy.id);
});
test('冲锋越过推进线后，可以连续追击回到合法区域并继续普攻',()=>{
 const {s,h,enemy}=arena();finishDash(s,h);Object.assign(enemy,{x:0,y:-36});
 stepContinuously(s,h,6);assert.ok(h.y>=s.config.world.defenseLimitY);assert.ok(h.lastAttackAt>1.7);assert.equal(h.targetId,enemy.id);
 enemy.hp=0;stepContinuously(s,h,1);assert.equal(h.y,s.config.world.defenseLimitY);
});
test('冲锋与侧推在地图边缘仍保持世界边界，结束后无反向瞬移',()=>{
 const {s,h,enemy}=arena({from:{x:10.5,y:-50},to:{x:10.5,y:-63}});
 for(let n=0;n<80;n++){
  s.tick(.05);
  for(const u of [h,enemy]){assert.ok(Math.abs(u.x)<=s.config.world.spawnHalfWidth);assert.ok(u.y>=s.config.world.mapMinY);assert.ok(u.y<=s.config.world.mapMaxY);}
  if(s.time>.7&&!h.dash)break;
 }
 assert.equal(h.y,-63);stepContinuously(s,h,.5);assert.equal(h.y,-63);
});

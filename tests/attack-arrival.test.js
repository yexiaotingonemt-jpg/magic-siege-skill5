import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {contractType} from '../shared/config.js';

function arena({classId=0,type='melee',side=classId===3?1:0,angle=1.1,mode='manual',hero=true}={}){
 const s=new Simulation();s.units=[];s.waveAt=s.populationAt=1e9;
 for(const tower of s.towers){tower.x=100;tower.cd=1e9;}
 const p=s.player;p.side=side;p.classId=classId;p.auto=false;p.stamina=100;
 const u=s.spawn(side,hero?contractType(classId):type,0,1,0);
 if(hero)assert.ok(s.contract(p,u.id));
 Object.assign(u,{x:0,y:10,cd:0,hp:1e8,maxHp:1e8});
 const radius=u.range+Math.min(2,((u.aggro??u.range)-u.range)/2);
 const target=s.spawn(1-side,'melee',0,1,0);
 Object.assign(target,{x:Math.cos(angle)*radius,y:10+Math.sin(angle)*radius,speed:0,cd:1e9,hp:1e8,maxHp:1e8});
 if(mode==='manual')assert.ok(s.setManualTarget(target.id,p));
 return {s,p,u,target};
}
function advance(s,seconds){const end=s.time+seconds;while(s.time<end-1e-8)s.tick(Math.min(.05,end-s.time));}
function attacked(u,target){assert.ok(u.lastAttackAt>0,`range=${u.range}, distance=${Math.hypot(u.x-target.x,u.y-target.y)}, cooldown=${u.cd}`);assert.ok(target.hp<target.maxHp,'actual basic attack damage must resolve');}

for(const [classId,angle]of [[0,1.1],[2,.53],[3,1.1],[4,1.7],[5,1.7]])for(const mode of ['manual','auto']){
 test(`职业${classId} ${mode}斜向抵达攻击边界后能实际普攻`,()=>{const {s,u,target}=arena({classId,angle,mode});advance(s,8);attacked(u,target);});
}
for(const side of [0,1])for(const [type,angle]of [['melee',1.1],['ranged',1.7],['siege',.53]]){
 test(`阵营${side} ${type}斜向抵达后能实际普攻`,()=>{const {s,u,target}=arena({type,side,angle,hero:false,mode:'auto'});advance(s,8);attacked(u,target);});
}
test('边界到达不提前绕过普攻冷却，冷却结束后能攻击',()=>{
 const {s,u,target}=arena();u.cd=3;advance(s,2.9);assert.equal(u.lastAttackAt,undefined);assert.equal(target.hp,target.maxHp);advance(s,.2);attacked(u,target);
});
test('眩晕、施法与引导结束后恢复追击和普通攻击',()=>{
 for(const status of ['stunUntil','castUntil','channelUntil']){const {s,u,target}=arena();u[status]=.6;advance(s,.5);assert.equal(u.x,0);assert.equal(u.y,10);assert.equal(u.lastAttackAt,undefined);advance(s,5);attacked(u,target);}
});
test('选择友军后追击其敌方目标并实际普攻，不友伤',()=>{
 for(const classId of [0,5]){const {s,p,u,target}=arena({classId,mode:'auto',angle:classId===0?1.1:1.7}),ally=s.spawn(u.side,'melee',0,1,0);Object.assign(ally,{x:-4,y:10,speed:0,cd:1e9,hp:1e8,maxHp:1e8});ally.targetId=target.id;ally.stunUntil=1e9;const hp=ally.hp;assert.ok(s.setManualTarget(ally.id,p));advance(s,8);attacked(u,target);assert.equal(ally.hp,hp);assert.equal(u.manualTargetId,ally.id);assert.equal(u.targetId,target.id);}
});
test('目标真实超出普攻距离时不能因为停距修复提前攻击',()=>{
 const {s,u,target}=arena();u.speed=0;target.x=u.x;target.y=u.y+u.range+.001;advance(s,1);assert.equal(u.lastAttackAt,undefined);assert.equal(target.hp,target.maxHp);
});
test('原地等待冷却期间目标离开射程后继续追击，不在射程外补发普攻',()=>{
 const {s,u,target}=arena();u.speed=0;target.x=u.x;target.y=u.y+u.range-.1;u.cd=.5;advance(s,.4);assert.equal(u.lastAttackAt,undefined);target.y=u.y+u.range+.1;advance(s,.2);assert.equal(u.lastAttackAt,undefined);assert.equal(target.hp,target.maxHp);u.speed=2;advance(s,3);attacked(u,target);
});
test('仅数值误差窗口内的攻击边界会接受，边界与射程数值不被修改',()=>{
 const {s,u,target}=arena();u.speed=0;const range=u.range;target.x=u.x;target.y=u.y+range+5e-8;advance(s,.1);attacked(u,target);assert.equal(u.range,range);
});
test('防守边界内仍可接近到射程攻击，边界外无法接近不误判为进入射程',()=>{
 for(const reachable of [true,false]){const {s,p,u,target}=arena({classId:3}),limit=s.config.world.defenseLimitY;Object.assign(u,{x:0,y:limit+2});Object.assign(target,{x:0,y:limit-(reachable?1:4)});assert.ok(s.setManualTarget(target.id,p));advance(s,8);assert.ok(u.y>=limit);if(reachable)attacked(u,target);else{assert.equal(u.lastAttackAt,undefined);assert.equal(target.hp,target.maxHp);assert.ok(Math.hypot(u.x-target.x,u.y-target.y)>u.range+.001);}}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {createSkillValue} from '../shared/skill-value.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function arena(count=3){
 const s=new Simulation();s.units=[];s.player.retired=true;s.waveAt=s.populationAt=1e9;for(const tower of s.towers){tower.x=100;tower.cd=1e9;}
 const casters=[];
 for(let i=0;i<count;i++){const p=s.makePlayer(0,false);p.classId=2;p.level=6;p.builds[2]=[1,1,1,1];p.stamina=100;const h=s.spawn(0,'siege',0,1,0);assert.ok(s.contract(p,h.id));Object.assign(h,{x:0,y:0,speed:0,cd:1e9,hp:1e7,maxHp:1e7});casters.push({p,h});}
 const target=s.spawn(1,'melee',0,1,0);Object.assign(target,{x:0,y:2,speed:0,cd:3,hp:1e7,maxHp:1e7});
 return {s,casters,target};
}
function advance(s,n){for(let k=0;k<Math.round(n/.05);k++)s.tick(.05);}
function impact(s,h,target,ratio=.4){const skill={...s.config.heroes[2].skills[1],attackSpeedDown:ratio},value=createSkillValue(h,skill,1,s.time);value.skill=1;s.impactSkill({source:h,targetId:target.id,tx:target.x,ty:target.y,payload:{...skill,value,design5:true,skill:1}});return value;}

test('三战车同帧冰霜弹只按最高40%减速调整一次剩余普攻冷却',()=>{
 const {s,casters,target}=arena();for(const {p,h}of casters){p.progress[2].traits.C06=3;assert.ok(s.setManualTarget(target.id,p));assert.ok(s.cast(1,p));}advance(s,.7);
 const hits=s.animations.filter(e=>e.kind==='damage'&&e.targetId===target.id&&e.skill===1);assert.equal(hits.length,3);const first=hits[0].start;near(target.cd,first+(3-first)/.6);near(s.attackRate(target),.6);assert.equal(s.activeDebuffs(target,'attackSpeedDown').length,3);
});
test('同一战车刷新同强度冰霜只延长状态时限，不再次拉长剩余冷却',()=>{
 const {s,casters:[{h}],target}=arena(1);s.time=1;impact(s,h,target);const cooldown=target.cd,oldUntil=s.activeDebuffs(target,'attackSpeedDown')[0].until;s.time=1.5;impact(s,h,target);near(target.cd,cooldown);assert.equal(s.activeDebuffs(target,'attackSpeedDown').length,1);near(s.activeDebuffs(target,'attackSpeedDown')[0].until,oldUntil+.5);
});
test('已有更强减攻速时，新增弱冰霜不延长冷却也不覆盖最高减速',()=>{
 const {s,casters:[a,b],target}=arena(2);s.time=1;s.debuff(target,a.h,'attackSpeedDown',.6,10);target.cd=10;impact(s,b.h,target,.4);near(target.cd,10);near(s.attackRate(target),.4);
});
test('更强减攻速仅按旧最高值到新最高值的差额调整剩余冷却',()=>{
 const {s,casters:[a,b],target}=arena(2);s.time=1;s.debuff(target,a.h,'attackSpeedDown',.2,10);target.cd=10;impact(s,b.h,target,.6);near(target.cd,1+(10-1)*.8/.4);near(s.attackRate(target),.4);
});
test('负面免疫不延长冷却，已经就绪的攻击冷却不被重置',()=>{
 const one=arena(1);one.s.time=1;one.target.immuneUntil=10;impact(one.s,one.casters[0].h,one.target);near(one.target.cd,3);assert.equal(one.s.activeDebuffs(one.target,'attackSpeedDown').length,0);
 const two=arena(1);two.s.time=1;two.target.cd=-2;impact(two.s,two.casters[0].h,two.target);near(two.target.cd,-2);assert.equal(two.s.activeDebuffs(two.target,'attackSpeedDown').length,1);
});
test('修正冷却叠加不改变冰霜伤害、40%减攻速、4秒持续及后续最高减速攻速',()=>{
 const {s,casters:[a,b,c],target}=arena();s.time=1;const hp=target.hp,A=a.h.attack;impact(s,a.h,target);impact(s,b.h,target);impact(s,c.h,target);near(hp-target.hp,A*8*3);for(const debuff of s.activeDebuffs(target,'attackSpeedDown')){near(debuff.ratio,.4);near(debuff.until,5);}near(s.attackRate(target),.6);s.time=5.001;near(s.attackRate(target),1);
});
test('减攻速到期还原当前剩余冷却，并在正确时点实际普通攻击',()=>{
 const {s,casters:[{h}],target}=arena(1);target.y=1;s.debuff(target,h,'attackSpeedDown',.4,4);near(target.cd,5);advance(s,4.55);assert.ok(target.cd>=4.6-1e-7&&target.cd<=4.65+1e-7,'expiry is resolved within one 20Hz simulation step');assert.equal(target.lastAttackAt,undefined);advance(s,.1);assert.ok(target.lastAttackAt>=4.6-1e-7&&target.lastAttackAt<=4.65+1e-7);assert.ok(h.hp<h.maxHp);
});
test('净化立即还原剩余冷却，后续出手不会残留已解除的减攻速',()=>{
 const {s,casters:[{h}],target}=arena(1);target.y=1;s.debuff(target,h,'attackSpeedDown',.4,10);near(target.cd,5);advance(s,1);assert.ok(s.cleanse(target));near(target.cd,3.4);advance(s,2.35);assert.equal(target.lastAttackAt,undefined);advance(s,.1);assert.ok(target.lastAttackAt>=3.4-1e-7&&target.lastAttackAt<=3.45+1e-7);assert.ok(h.hp<h.maxHp);near(s.attackRate(target),1);
});
test('强减速到期保留弱减速，弱减速额度耗尽再还原冷却并实际出手',()=>{
 const {s,casters:[a,b],target}=arena(2);target.y=1;const value={limit:1000,spent:0,parts:{}};s.debuff(target,a.h,'attackSpeedDown',.6,1);s.debuff(target,b.h,'attackSpeedDown',.4,10,value);near(target.cd,7.5);advance(s,1.45);near(target.cd,1+(7.5-1)*.4/.6);near(s.attackRate(target),.6);value.spent=value.limit;advance(s,.05);near(target.cd,3.8);advance(s,2.25);assert.equal(target.lastAttackAt,undefined);advance(s,.1);assert.ok(target.lastAttackAt>=3.8-1e-7&&target.lastAttackAt<=3.85+1e-7);assert.ok(a.h.hp<a.h.maxHp||b.h.hp<b.h.maxHp);near(s.attackRate(target),1);
});

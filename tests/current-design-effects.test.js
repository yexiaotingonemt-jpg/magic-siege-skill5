import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,advance,affix,cast,near} from './current-design-fixture.mjs';
import {currentSkill} from '../shared/current-design.js';
import {refreshCurrentStats,impactCurrentSkill} from '../shared/current-design-mechanics.js';
test('技能默认自动选取敌友目标，无需先手动点选，敌方按英雄、小兵、塔排序',()=>{
 for(const id of [0,4,5,2,3]){
  const {s,p,h,enemy,friend}=arena(id);for(const u of s.units){u.targetId=u.manualTargetId=u.friendlyTargetId=null;}friend.hp=1;
  const i=id===5?0:id===0?2:0,plan=s.castPlan(i,p);assert.ok(plan.ok,`${id}: ${plan.reason}`);assert.equal(plan.t.id,id===5||id===0?friend.id:enemy.id);
 }
});
test('兽人汲血三次实际伤害治疗，额外两人各按20%，打断停止剩余跳数',()=>{
 const {s,p,h,enemy,make}=arena(0);affix(s,p,3);const e2=make(3,1,3).h,e3=make(3,-1,3).h;
 h.hp-=5000;const hp=h.hp,A=s.attackPower(h),old=[enemy.hp,e2.hp,e3.hp];cast(s,p,0,enemy);advance(s,3.1);
 near(old[0]-enemy.hp,A*1.5*3);near(old[1]-e2.hp,A*1.5*3*.2);near(old[2]-e3.hp,A*1.5*3*.2);near(h.hp-hp,A*1.5*3*1.4);
 p.cd[0]=0;cast(s,p,0,enemy);advance(s,1);const last=enemy.hp;s.interrupt(h);advance(s,3);near(enemy.hp,last);
});
test('兽人战吼同时保护自身及两名友军，反弹按实际承伤且不递归',()=>{
 const {s,p,h,enemy,make}=arena(0);const extra=make(0,2,0).h,far=make(0,5,0).h;
 affix(s,p,7,2);cast(s,p,1);assert.ok(h.guards.some(g=>g.kind==='orcWarcry'));assert.ok(extra.guards.some(g=>g.kind==='orcWarcry'));assert.ok(!far.guards?.some(g=>g.kind==='orcWarcry'));
 const hp=h.hp,ep=enemy.hp;s.damage(enemy,h,100);near(hp-h.hp,80);near(ep-enemy.hp,48);
});
test('兽人壁垒累计自身和友军有效承伤，结束成盾并爆发，不死期间保留1生命',()=>{
 const {s,p,h,enemy,friend}=arena(0);affix(s,p,13,2);affix(s,p,14,2);affix(s,p,15);
 cast(s,p,3);const own=s.damage(enemy,h,100),shared=s.damage(enemy,friend,100);const stored=h.damageStore.total;near(stored,own+shared*.6);
 const before=enemy.hp;advance(s,6.1);near(h.shield,stored);near(before-enemy.hp,stored*.8);
 p.cd[3]=0;cast(s,p,3);s.damage(enemy,h,1e9);near(h.hp,1);
});
test('火法弹射严格为主伤35%，技能击杀爆炸只结算一次',()=>{
 const {s,p,h,enemy,make}=arena(4);affix(s,p,18,2);const b=make(3,1,3).h,c=make(3,-1,3).h,A=s.attackPower(h),old=[enemy.hp,b.hp,c.hp];
 cast(s,p,0,enemy);near(old[0]-enemy.hp,A*3.2);near(old[1]-b.hp,A*3.2*.35);near(old[2]-c.hp,A*3.2*.35);
 const f=arena(4);affix(f.s,f.p,19);const next=f.make(3,1,3).h;f.enemy.hp=1;const hp=next.hp;cast(f.s,f.p,0,f.enemy);near(hp-next.hp,f.s.attackPower(f.h)*1.92);
});
test('火法无炙热也可标记，友军普攻触发附伤获热，目标死亡不沿用旧版返三层',()=>{
 const {s,p,h,enemy,friend}=arena(4);h.heat=0;affix(s,p,22);const hp=enemy.hp,A=s.attackPower(h);cast(s,p,1,enemy);near(enemy.hp,hp);near(h.heat,0);
 s.damage(friend,enemy,100,true);near(hp-enemy.hp,100+A);near(h.heat,1);
 enemy.hp=1;s.damage(friend,enemy,100,true);near(h.heat,1);
});
test('火球零层炙热即命中三人，各288%，直接击杀每人返一层',()=>{
 const {s,p,h,enemy,make}=arena(4);const b=make(3,1,3).h,c=make(3,-1,3).h;h.heat=0;const A=s.attackPower(h),old=[enemy.hp,b.hp,c.hp];
 cast(s,p,2,enemy);for(const [i,u]of [enemy,b,c].entries())near(old[i]-u.hp,A*2.88);
 const f=arena(4);f.h.heat=0;f.enemy.hp=1;cast(f.s,f.p,2,f.enemy);near(f.h.heat,1);
});
test('火球分别命中施法者附近敌人，不要求挤在主目标周围三格',()=>{
 const {s,p,h,enemy,make}=arena(4);const b=make(3,-5,4).h,c=make(3,5,4).h,far=make(3,0,15).h;
 const before=[enemy.hp,b.hp,c.hp,far.hp],A=s.attackPower(h);cast(s,p,2,enemy);
 for(const [i,u]of [enemy,b,c].entries())near(before[i]-u.hp,A*2.88);near(far.hp,before[3]);
});
test('沿途火球保留原伤害并追加一次150%攻击伤害，不产生持续伤害',()=>{
 const {s,p,h,enemy}=arena(4);affix(s,p,28);const hp=enemy.hp,A=s.attackPower(h);
 cast(s,p,2,enemy);near(hp-enemy.hp,A*(2.88+1.5));assert.ok(!s.fields.some(f=>f.kind==='currentPierce'));
 const last=enemy.hp;advance(s,5);near(enemy.hp,last);
});
test('天火按层增伤而非加目标，吟唱锁定初始炙热，每击杀返六层',()=>{
 const {s,p,h,enemy,make}=arena(4);h.heat=10;const b=make(3,1,3).h,bhp=b.hp,hp=enemy.hp,A=s.attackPower(h);cast(s,p,3,enemy);
 near(hp-enemy.hp,A*8*1.5);near(b.hp,bhp);near(h.heat,0);
 const f=arena(4);affix(f.s,f.p,31);f.enemy.hp=1;f.h.heat=2;cast(f.s,f.p,3,f.enemy);near(f.h.heat,6);
});
test('天火斩杀判定使用12%严格阈值且不穿不死',()=>{
 const {s,p,h,enemy}=arena(4);affix(s,p,32);enemy.maxHp=1e6;enemy.hp=100000;enemy.immortalUntil=100;cast(s,p,3,enemy);assert.ok(enemy.hp>0);
});
test('精灵灵息有效治疗转伤，额外友军治疗按主治疗60%，派生不循环',()=>{
 const {s,p,h,enemy,friend,make}=arena(5);affix(s,p,36);const extra=make(0,2,0).h;extra.hp=100;h.hp=h.maxHp;const hp=friend.hp,xp=extra.hp,ep=enemy.hp,A=s.attackPower(h);
 cast(s,p,0,friend);near(friend.hp-hp,A*2.4);near(extra.hp-xp,A*2.4*.6);near(ep-enemy.hp,A*2.4*1.6*.5);
});
test('精灵链接共享实际恢复量42%，双向共享不递归，超距断开',()=>{
 const {s,p,h,friend}=arena(5);h.hp-=3000;cast(s,p,1,friend);const hp=h.hp,fp=friend.hp;s.heal(friend,100,h);near(friend.hp-fp,100);near(h.hp-hp,42);
 friend.x=30;advance(s,.1);const before=h.hp;s.heal(friend,100,h);near(h.hp,before);
});
test('净化按实际移除数量治疗，净化增攻与通用增攻相加',()=>{
 const {s,p,h,friend,enemy}=arena(5);affix(s,p,43);affix(s,p,96,2);refreshCurrentStats(s,h);const A=s.attackPower(h),hp=friend.hp;
 s.debuff(friend,enemy,'attackDown',.2,20);s.debuff(friend,enemy,'moveSlow',.2,20);cast(s,p,2,friend);near(friend.hp-hp,A*2.56*2);
 near(s.attackPower(h),s.config.design.heroes[5].attack*(1+.1+.1));
});
test('范围净化无需先选择友军，不受远处选中目标阻挡',()=>{
 const {s,p,h,friend,enemy}=arena(5);s.debuff(friend,enemy,'moveSlow',.2,20);h.targetId=h.manualTargetId=null;
 assert.equal(s.castPlan(2,p).ok,true);cast(s,p,2);assert.equal(s.hasNegative(friend),false);
 p.cd[2]=0;s.debuff(friend,enemy,'moveSlow',.2,20);enemy.x=20;s.setManualTarget(enemy.id,p);assert.equal(s.castPlan(2,p).ok,true);
});
test('精灵群疗立即及每秒三次，过量盾最高15%，停止吟唱取消剩余治疗',()=>{
 const {s,p,h,friend}=arena(5);h.hp=h.maxHp;friend.hp=friend.maxHp;affix(s,p,47,2);const A=s.attackPower(h);cast(s,p,3);const initial=h.shield;assert.ok(initial>0);advance(s,2.1);near(h.shield,Math.min(h.maxHp*.15,3*A*1.68*.8));
 p.cd[3]=0;friend.hp=1;cast(s,p,3);const hp=friend.hp;s.interrupt(h);advance(s,2.1);near(friend.hp,hp);
});
function shell(s,h,i){const skill=currentSkill(s,h,i);skill.value={attack:s.attackPower(h),spent:0,parts:{},skill:i,ranks:skill.ranks,currentSkill:{...skill}};return skill;}
test('战车冰霜额外攻速按人数均分，持续严格5秒，敌方减速保留8秒',()=>{
 const {s,p,h,enemy,make}=arena(2);affix(s,p,55);make(3,1,3);const sk=shell(s,h,1);impactCurrentSkill.call(s,{source:h,payload:sk,tx:enemy.x,ty:enemy.y,targetId:enemy.id});
 near(s.attackRate(h),1.5);near(s.attackSlowRatio(enemy),.15*.9/2);s.time+=5.01;near(s.attackRate(h),1);assert.ok(s.attackSlowRatio(enemy)>0);
});
test('战车落点爆炸仍均分总池，多目标不得复制合计伤害',()=>{
 const {s,p,h,enemy,make}=arena(2);affix(s,p,59);const b=make(3,.5,3).h,A=s.attackPower(h);const sk=shell(s,h,2);impactCurrentSkill.call(s,{source:h,payload:sk,tx:enemy.x,ty:enemy.y,targetId:enemy.id});
 const hp=enemy.hp+b.hp;advance(s,1.1);near(hp-enemy.hp-b.hp,A*.8*.9);
});
test('战车连轰固定落点，炮数升级六次，逐炮伤害按首炮20%递增',()=>{
 const {s,p,h,enemy}=arena(2);affix(s,p,61);affix(s,p,62);const hp=enemy.hp,A=s.attackPower(h);cast(s,p,3,enemy);advance(s,4.3);near(hp-enemy.hp,A*6*(1+1.2+1.4+1.6+1.8+2));
});
test('领主震荡最多三人，返回段按15%并牵引1.5格',()=>{
 const {s,p,h,enemy,make}=arena(3);s.config.design.rules.orcMissingReduction=0;affix(s,p,67);enemy.hp=enemy.maxHp=100000;const b=make(0,1,3).h,c=make(0,-1,3).h,behind=make(0,0,-3).h;
 const hp=enemy.hp,bp=behind.hp,A=s.attackPower(h),y=enemy.y;cast(s,p,0,enemy);near(hp-enemy.hp,A*3.8);near(behind.hp,bp);advance(s,1.1);near(hp-enemy.hp,A*3.8*1.15);near(y-enemy.y,1.5);assert.ok(b.hp<b.maxHp&&c.hp<c.maxHp);
});
test('尖刺取本次来袭时的攻击力反伤，附带降攻只影响后续攻击',()=>{
 const {s,p,h,enemy}=arena(3);affix(s,p,69);const A=s.attackPower(enemy),hp=enemy.hp;cast(s,p,1);s.damage(enemy,h,1,true);near(hp-enemy.hp,A*1.5);near(s.attackPower(enemy),A*.75);
});
test('领主冲锋主目标眩晕1秒，拖拽沿途敌人至终点',()=>{
 const {s,p,h,enemy,make}=arena(3);affix(s,p,73);const middle=make(0,0,1.5).h;cast(s,p,2,enemy);advance(s,.5);assert.ok(enemy.stunUntil>s.time);near(h.y,3);near(middle.y,3);
});
test('君临负面免疫、普攻范围伤害、技能吸血与最多两名护卫归属正确',()=>{
 const {s,p,h,enemy,make}=arena(3);affix(s,p,76);affix(s,p,77);h.hp-=1000;const b=make(0,1,3).h,A=s.attackPower(h);cast(s,p,3);assert.equal(s.debuff(h,enemy,'attackDown',.5,5),false);
 const hp=h.hp,bp=b.hp;s.damage(h,enemy,100,true);near(bp-b.hp,A*4);assert.ok(h.hp>hp);
 for(let i=0;i<3;i++){const u=make(0,0,2).h;u.hp=1;s.damage(h,u,1e5);}const minions=s.units.filter(u=>u.summoned&&u.hp>0);assert.equal(minions.length,2);for(const u of minions){assert.equal(u.ownerId,h.id);near(u.maxHp,2000);near(u.attack,180);near(u.interval,1.5);}
});
test('火法炙热作为一个复合增益驱散，零层时余留增攻仍可驱散',()=>{
 const {s,p,h}=arena(4);affix(s,p,83);s.addHeat(h,3);h.heat=0;assert.ok(s.attackPower(h)>h.attack);assert.equal(s.dispelOne(h),true);near(h.heatBoostStacks,0);near(s.attackPower(h),h.attack);
});

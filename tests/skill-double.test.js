import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {defaults,contractType} from '../shared/config.js';
import {describeAbilities} from '../client/src/ability-descriptions.js';

const ids=[0,2,3,4,5],near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const advance=(s,n)=>{const end=s.time+n;while(s.time<end-1e-8)s.tick(Math.min(.05,end-s.time));};
// Capture the previous panel values independently of the new skill settings.
const panels=[
 [16000,200,1.5,1.5,5,2],
 [8000,362.6666666666667,1.7,6.5,9,2],
 [10000,426.66666666666663,2.8,10.5,12,1.5],
 [36000,266.6666666666667,1.5,1.5,5,2],
 [12000,340,1.7,6.5,9,2],
 [14000,272,1.7,6.5,9,2],
 [11000,232.72727272727272,1.2,1.5,5,2.5]
];
function arena(id,level=6,rank=1){
 const s=new Simulation();s.units=[];s.player.retired=true;s.waveAt=s.populationAt=1e9;for(const t of s.towers)t.x=100;
 const make=(classId,x,y)=>{const p=s.makePlayer(classId===3?1:0,false);p.classId=classId;p.level=level;p.builds[classId]=[rank,rank,rank,Math.min(3,rank)];p.stamina=100;const h=s.spawn(p.side,contractType(classId),0,1,x);assert.ok(s.contract(p,h.id));Object.assign(h,{x,y,speed:0,cd:1e9});return {p,h};};
 const {p,h}=make(id,0,0),enemy=make(id===3?0:3,0,3).h,helper=make(id===3?3:0,2,0).h;s.localPlayerId=p.id;
 enemy.hp=enemy.maxHp=1e7;helper.hp=1000;helper.maxHp=1e6;h.hp=h.maxHp*.5;enemy.targetId=helper.id;
 const target=(x,y,side=enemy.side)=>{const u=s.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp:1e7,maxHp:1e7,speed:0,cd:1e9});return u;};
 if(id===5)s.setManualTarget(helper.id,p);return {s,p,h,enemy,helper,target};
}

test('法师基础攻击提高50%，成长减半，其余基础属性保留',()=>{
 defaults.heroes.forEach((h,id)=>assert.deepEqual([h.hp,h.attack,h.interval,h.range,h.aggro,h.speed],panels[id]));
 assert.deepEqual([defaults.world.heroAttackGrowth,defaults.world.heroHpGrowth],[.015,.02]);
 assert.deepEqual(Object.values(defaults.troops).map(u=>[u.hp,u.attack,u.interval]),[[4000,100,1.5],[4000,80,1.7],[5000,100,2.8]]);
});
for(const id of ids)for(const level of [1,12])test(`职业${id}·英雄${level}级：实际普通攻击采用新基础攻击与成长，间隔保持`,()=>{
 const {s,h,enemy,helper}=arena(id,level);s.units=s.units.filter(u=>u!==helper);Object.assign(h,{hp:h.maxHp,cd:0});enemy.y=1;const hp=enemy.hp;
 const expected=panels[id][1]*(1+.015*(level-1));near(h.attack,expected);advance(s,.3);near(hp-enemy.hp,expected);
 advance(s,panels[id][2]);near(hp-enemy.hp,expected*2);
});

for(const id of ids)for(const rank of [1,4])test(`职业${id}·技能档${rank}：四技能收益预算翻倍，费用与冷却保持`,()=>{
 for(let i=0;i<4;i++){
  const {s,p,h,enemy,helper}=arena(id,12,rank);if(id===5&&i===2)s.debuff(helper,enemy,'attackDown',.2,5);
  const before=p.stamina;assert.ok(s.cast(i,p),s.notice);const v=s.skillValues.at(-1),growth=1+.2*(Math.min(i===3?3:4,rank)-1),cost=i===3?3:1;
  near(v.base,h.attack*16*cost*growth);near(v.limit,h.attack*20*cost*growth);near(p.stamina,before-cost);near(p.cd[i]-s.time,[5,10,15,30][i]);
  advance(s,4);assert.ok(v.spent<=v.limit+1e-6);assert.match(describeAbilities(s).skills[i].valueCap,new RegExp(String(2000*cost*growth)));
 }
});

const damageCases=[
 [0,0,12,.4],[2,1,12,1],[2,2,13.6,3.5],[2,3,36,1],
 [3,0,3.2,.4],[3,1,2.4,1.1],[3,2,.4,1.4],
 [4,0,16,.4],[4,1,16,.4],[4,2,16,.4],[4,3,16,.4],[5,0,6,.4]
];
for(const rank of [1,4])test(`技能档${rank}：各职业直接、引导、持续伤害实际按双倍系数结算`,()=>{
 for(const [id,skill,coefficient,time]of damageCases){const {s,p,h,enemy}=arena(id,12,rank),hp=enemy.hp,growth=1+.2*(Math.min(skill===3?3:4,rank)-1);assert.ok(s.cast(skill,p),s.notice);advance(s,time);near(hp-enemy.hp,h.attack*coefficient*growth);}
});
for(const rank of [1,4])test(`腐蚀弹技能档${rank}：最大生命伤害4%改8%，高生命目标仍受双倍上限约束`,()=>{
 const {s,p,h,enemy}=arena(2,12,rank);enemy.hp=enemy.maxHp=10000;s.cast(0,p);advance(s,1);near(enemy.hp,9200);
 p.cd[0]=0;enemy.hp=enemy.maxHp=1e7;const hp=enemy.hp;s.cast(0,p);const v=s.skillValues.at(-1);advance(s,1);near(hp-enemy.hp,v.limit);near(v.limit,h.attack*20*(1+.2*(rank-1)));
});
for(const rank of [1,4])test(`精灵技能档${rank}：冲击附带治疗及群体治疗均按双倍系数`,()=>{
 {const {s,p,h,helper}=arena(5,12,rank),before=h.hp+helper.hp,growth=1+.2*(rank-1);s.cast(0,p);advance(s,.4);near(h.hp+helper.hp-before,h.attack*10*growth);}
 {const {s,p,h,helper}=arena(5,12,rank),before=[h.hp,helper.hp],growth=1+.2*(Math.min(3,rank)-1);s.cast(3,p);advance(s,.4);near(h.hp-before[0],h.attack*9.6*growth);near(helper.hp-before[1],h.attack*9.6*growth);}
});
test('兽人蓄伤转盾为两倍，创建和吸收都遵守此次技能总上限',()=>{
 const {s,p,h,enemy}=arena(0);h.hp=h.maxHp=1e8;s.cast(3,p);advance(s,.4);s.damage(enemy,h,1000);advance(s,5);near(h.shield,2000);const v=s.skillValues.at(-1);near(v.spent,0);
 s.damage(enemy,h,500);near(h.shield,1500);near(v.parts['护盾吸收'],500);
 p.cd[3]=0;s.cast(3,p);advance(s,.4);s.damage(enemy,h,1e6);advance(s,5);const next=s.skillValues.at(-1);near(h.shield,next.limit);s.damage(enemy,h,next.limit+1);near(next.spent,next.limit);near(h.shield,0);
});
test('精灵链接双倍共享且不递归，额度只消耗有效共享治疗',()=>{
 const {s,p,h}=arena(5);s.cast(1,p);advance(s,.4);const friend=s.get(h.linkId),value=s.skillValues.at(-1),own=h.hp,other=friend.hp;
 s.heal(h,100,h);near(h.hp-own,100);near(friend.hp-other,200);near(value.spent,200);
 const own2=h.hp,other2=friend.hp;s.heal(friend,100,h);near(h.hp-own2,200);near(friend.hp-other2,100);near(value.spent,400);
 value.spent=value.limit;const own3=h.hp;s.heal(friend,100,h);near(h.hp,own3);
});
test('固定减伤与易伤比例不改变，纯减伤技能可承担双倍等效额度',()=>{
 const {s,p,h,enemy}=arena(0);h.hp=h.maxHp=1e8;s.cast(1,p);advance(s,.4);const v=s.skillValues.at(-1),hp=h.hp;
 s.damage(enemy,h,100);near(hp-h.hp,60);s.damage(enemy,h,1e6);near(v.parts['减伤'],h.attack*20);near(v.spent,v.limit);
 s.cast(0,p);advance(s,.4);near(s.activeDebuffs(enemy,'vulnerable')[0].ratio,.25);
});

test('领主1技能10格扇形包含边界、排除更远与侧后方单位',()=>{
 const {s,p,enemy,target}=arena(3);enemy.y=-2;const inside=target(0,-10),outside=target(0,-10.001),side=target(9,0),back=target(0,3),plan=s.castPlan(0,p);
 assert.ok(plan.targets.some(u=>u.id===inside.id));for(const u of [outside,side,back])assert.ok(!plan.targets.some(x=>x.id===u.id));
 const hp=inside.hp;s.cast(0,p);advance(s,.4);assert.ok(inside.hp<hp);assert.equal(outside.hp,outside.maxHp);assert.match(describeAbilities(s).skills[0].effect,/10格/);
});
test('领主冲锋3格接触边界生效、边界外不命中，实际侧向击退5格',()=>{
 const {s,p,h,enemy,target}=arena(3);enemy.y=-17;s.setManualTarget(enemy.id,p);const inside=target(3,-7.8),outside=target(3.01,-7.8),hp=inside.hp;
 assert.ok(s.cast(1,p));advance(s,2.2);assert.ok(!h.dash);near(h.y,-17);near(inside.x,8);near(outside.x,3.01);near(hp-inside.hp,h.attack*2.4);near(outside.hp,outside.maxHp);
});
test('领主火焰盾5格半径包含边界，范围外不会附加灼烧',()=>{
 const {s,p,target}=arena(3),inside=target(5,0),outside=target(5.001,0);s.cast(2,p);advance(s,.4);
 assert.ok(s.fields.some(f=>f.type==='lordScorch'&&f.host===inside.id));assert.ok(!s.fields.some(f=>f.type==='lordScorch'&&f.host===outside.id));
});

test('领主冲锋整段扫掠覆盖20Hz采样点之间的3格切线，无越界与重复命中',()=>{
 const {s,p,h,enemy,target}=arena(3);enemy.y=-17;s.setManualTarget(enemy.id,p);const tangent=target(3,-7),outside=target(3.001,-7),hp=tangent.hp;
 assert.ok(s.cast(1,p));advance(s,2.2);near(tangent.x,8);near(hp-tangent.hp,h.attack*2.4);near(outside.x,3.001);near(outside.hp,outside.maxHp);
 advance(s,.2);near(hp-tangent.hp,h.attack*2.4);
});
test('领主大招15秒免疫，双倍溅射按总量均摊且受6000%总上限约束',()=>{
 const {s,p,h,enemy,target}=arena(3),others=Array.from({length:4},(_,i)=>target((i-1.5)*.5,3));assert.ok(s.cast(3,p));advance(s,.4);
 near(h.immuneUntil,15.35);near(h.lordUlt.until,15.35);const hp=others.map(u=>u.hp),v=s.skillValues.at(-1);
 s.afterBasicAttack(h,enemy);for(let i=0;i<4;i++)near(hp[i]-others[i].hp,h.attack*3);near(v.parts['负面免疫'],h.attack*12);
 for(let i=0;i<3;i++)s.afterBasicAttack(h,enemy);near(v.spent,v.limit);near(v.limit,h.attack*60);const after=others.map(u=>u.hp);s.afterBasicAttack(h,enemy);assert.deepEqual(others.map(u=>u.hp),after);
 advance(s,9.6);assert.equal(s.stun(h,enemy,1),false);advance(s,5.4);assert.equal(s.stun(h,enemy,1),true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,advance,affix,cast,near} from './current-design-fixture.mjs';
import {currentTraits,currentSkill} from '../shared/current-design.js';
import {describeAbilities} from '../client/src/ability-descriptions.js';
import {refreshCurrentStats} from '../shared/current-design-mechanics.js';

function setup(targets=1){
 const f=arena(4);f.enemy.y=6;f.s.config.design.skills[4][2].targets=targets;affix(f.s,f.p,28);
 const minion=(x,y)=>{const u=f.s.spawn(1,'melee',0,1);Object.assign(u,{x,y,hp:1e6,maxHp:1e6,cd:1e9,speed:0});return u;};
 return {...f,minion};
}

test('沿途附伤覆盖原火球弹道，路径外、落点后方及友军不受伤',()=>{
 const {s,p,h,enemy,friend,minion}=setup(),along=minion(0,3),outside=minion(2,3),behind=minion(0,9);
 Object.assign(friend,{x:0,y:3});const A=s.attackPower(h),before=[enemy.hp,along.hp,outside.hp,behind.hp,friend.hp];
 cast(s,p,2,enemy);
 near(before[0]-enemy.hp,A*(2.88+1.5));near(before[1]-along.hp,A*1.5);
 near(outside.hp,before[2]);near(behind.hp,before[3]);near(friend.hp,before[4]);
 const last=along.hp;advance(s,5);near(along.hp,last);assert.ok(!s.fields.some(f=>f.kind==='currentPierce'));
});

test('多条火球路径重叠时每名敌人只追加一次150%攻击伤害',()=>{
 const {s,p,h,enemy,make,minion}=setup(2),second=make(3,1,3).h,shared=minion(0,4);
 const A=s.attackPower(h),before=[enemy.hp,second.hp,shared.hp];cast(s,p,2,enemy);
 near(before[0]-enemy.hp,A*(2.88+1.5));near(before[1]-second.hp,A*(2.88+1.5));near(before[2]-shared.hp,A*1.5);
});

test('目标增加仍增加原火球和对应弹道，击退不偏移路径或重复击退',()=>{
 const {s,p,h,enemy,make,minion}=setup(),second=make(3,3,0).h,along=minion(4,0);
 affix(s,p,26);affix(s,p,27);const A=s.attackPower(h),before=[enemy.hp,second.hp,along.hp];
 cast(s,p,2,enemy);
 near(before[0]-enemy.hp,A*(2.88+1.5));near(before[1]-second.hp,A*(2.88+1.5));near(before[2]-along.hp,A*1.5);
 near(enemy.y,8);near(second.x,5);near(along.x,6);
});

test('火球伤害强化不把固定150%附伤再乘火球系数，孤立按整次命中判断',()=>{
 const f=setup();affix(f.s,f.p,24,5);affix(f.s,f.p,25);const along=f.minion(0,3),A=f.s.attackPower(f.h),hp=f.enemy.hp,ap=along.hp;
 cast(f.s,f.p,2,f.enemy);near(hp-f.enemy.hp,A*(4.8+1.5));near(ap-along.hp,A*1.5);
 const g=setup();affix(g.s,g.p,25);const GA=g.s.attackPower(g.h),ghp=g.enemy.hp;cast(g.s,g.p,2,g.enemy);
 near(ghp-g.enemy.hp,GA*(2.88+1.5)*2.5);
});

test('沿途附伤使用施法攻击快照，直接击杀返热且不重复记击杀',()=>{
 const {s,p,h,enemy,minion}=setup(),along=minion(0,3);along.hp=1;h.heat=0;
 const A=s.attackPower(h),hp=enemy.hp;s.setManualTarget(enemy.id,p);assert.ok(s.cast(2,p));h.attack*=10;advance(s,.3);
 near(hp-enemy.hp,A*(2.88+1.5));near(h.heat,1);assert.equal(h.stats.minionKills,1);
});

test('未选择词条时火球保持原效果，新增参数和玩家说明来自同一配置',()=>{
 const f=arena(4),A=f.s.attackPower(f.h),hp=f.enemy.hp;cast(f.s,f.p,2,f.enemy);near(hp-f.enemy.hp,A*2.88);
 affix(f.s,f.p,28);near(currentSkill(f.s,f.h,2).path_damage,1.5);
 const text=currentTraits(f.s.config,4).find(t=>t.sourceId===28).description;
 assert.equal(text,'火球对沿途敌人额外造成相当于攻击力150%的伤害（上限1档）。');
 assert.ok(describeAbilities(f.s).skills[2].summary.includes('150%'));assert.ok(!describeAbilities(f.s).skills[2].summary.includes('每段'));
 f.s.config.design.affixes.find(t=>t.sourceId===28).values[0][0]=2;
 assert.ok(currentTraits(f.s.config,4).find(t=>t.sourceId===28).description.includes('200%'));
});

test('5／20／40级的实际附伤沿用伤害积分、总积分和21体力KDA口径',()=>{
 for(const level of [5,20,40]){
  const {s,p,h,enemy}=setup();p.level=level;refreshCurrentStats(s,h);const A=s.attackPower(h),before=s.contribution(p),co=s.config.design.scoreCoefficients[4];
  cast(s,p,2,enemy);const after=s.contribution(p),D=A*(2.88+1.5);
  near(h.stats.heroDamage,D);near(after.totalPoints-before.totalPoints,200+D*co.a);near(after.kda-before.kda,D*co.a/21);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {liveConfig,legacyLiveConfig} from '../shared/config.js';
import {currentTraits} from '../shared/current-design.js';
import {refreshCurrentStats} from '../shared/current-design-mechanics.js';
import {describeAbilities} from '../client/src/ability-descriptions.js';
import {arena,near} from './current-design-fixture.mjs';

function setup(config){
 const a=arena(3,config),{s,h,make}=a;h.hp=h.maxHp/2;
 const kill=(kind='minions')=>{
  const victims=kind==='hero'?[make(0,0,20).h]:Array.from({length:3},()=>s.spawn(0,'melee',0,1));
  for(const victim of victims)s.damage(h,victim,1e9);
 };
 return {...a,kill};
}

for(const [name,config] of [['当前规则',liveConfig],['旧版独立被动',legacyLiveConfig]]){
 test(`${name}：三兵及英雄击杀仅驱散普攻射程内，包含圆形边界`,()=>{
  for(const kind of ['minions','hero'])for(const offset of [-.01,0,.000001,50]){
   const {s,h,enemy,kill}=setup(config()),distance=h.range+offset;
   Object.assign(enemy,{x:distance*.6,y:distance*.8});
   s.haste(enemy,'range-check',.2,20);kill(kind);
   assert.equal(Object.hasOwn(enemy.hastes,'range-check'),offset>0,`${kind}/${offset}`);
  }
 });

 test(`${name}：跳过无增益近敌，每次仅驱散范围内一名敌人的一个增益`,()=>{
  const {s,h,enemy,make,kill}=setup(config());
  Object.assign(enemy,{x:0,y:.1});
  const first=make(0,0,h.range*.5).h,second=make(0,0,h.range*.8).h,outside=make(0,0,h.range+.01).h;
  for(const u of [first,second,outside])for(const key of ['one','two'])s.haste(u,key,.2,20);
  kill();
  assert.equal(Object.keys(first.hastes).length,1);
  assert.equal(Object.keys(second.hastes).length,2);
  assert.equal(Object.keys(outside.hastes).length,2);
 });

 test(`${name}：范围内无合法增益仍净化回血，不向范围外回退或储存驱散`,()=>{
  const {s,h,enemy,kill}=setup(config());
  Object.assign(enemy,{x:0,y:h.range+.01});s.haste(enemy,'outside',.2,20);
  s.debuff(h,enemy,'attackDown',.2,20);const hp=h.hp;
  kill();
  near(h.hp-hp,h.maxHp*.02);assert.equal(s.hasNegative(h),false);
  assert.ok(enemy.hastes.outside);
  enemy.y=h.range;
  assert.ok(enemy.hastes.outside);
  kill('hero');assert.equal(Object.keys(enemy.hastes).length,0);
 });

 test(`${name}：驱散按触发时的当前射程重新判断`,()=>{
  const {s,h,enemy,kill}=setup(config());
  enemy.y=h.range+.5;s.haste(enemy,'dynamic',.2,20);kill();assert.ok(enemy.hastes.dynamic);
  h.range+=1;kill();assert.equal(Object.keys(enemy.hastes).length,0);
  h.range-=1;s.haste(enemy,'dynamic',.2,20);kill();assert.ok(enemy.hastes.dynamic);
 });

 test(`${name}：被动说明明确普攻范围与单目标单增益`,()=>{
  const {s}=setup(config());
  assert.match(describeAbilities(s).innatePassive,/普攻范围内.*1个增益/);
 });
}

test('当前规则：普攻距离词条扩大领主驱散范围',()=>{
 const {s,p,h,enemy,kill}=setup(liveConfig()),base=h.range;
 enemy.y=base+.5;s.haste(enemy,'range-affix',.2,20);kill();assert.ok(enemy.hastes['range-affix']);
 const trait=currentTraits(s.config,3).find(t=>t.common&&t.keys.includes('range_bonus'));
 assert.ok(trait);p.progress[3].traits[trait.id]=1;refreshCurrentStats(s,h);
 assert.ok(h.range>=enemy.y);kill();assert.equal(Object.keys(enemy.hastes).length,0);
});

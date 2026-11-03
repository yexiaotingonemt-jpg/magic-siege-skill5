import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,advance,affix,cast,near} from './current-design-fixture.mjs';
import {currentSkill,currentTraits,validateCurrentDesign} from '../shared/current-design.js';
import {describeAbilities} from '../client/src/ability-descriptions.js';
import {unitStatuses} from '../client/src/unit-status.js';

test('裂地震荡命中超过100名合法敌人，范围外和身后目标不受影响，返回波同样无人数截断',()=>{
  const {s,p,h,enemy,make}=arena(3);s.config.design.rules.orcMissingReduction=0;affix(s,p,67);
  const targets=[enemy];
  for(let i=0;i<105;i++) {
    const u=s.spawn(0,'melee',0,1,0);
    Object.assign(u,{x:(i%5-2)*.1,y:2+Math.floor(i/5)*.2,hp:1e7,maxHp:1e7,speed:0,cd:1e9});targets.push(u);
  }
  const behind=make(0,0,-3).h,far=make(0,0,11).h;
  const before=new Map([...targets,behind,far].map(u=>[u.id,u.hp])),A=s.attackPower(h);
  assert.equal(s.castPlan(0,p).targets.length,106);cast(s,p,0,enemy);
  for(const u of targets)near(before.get(u.id)-u.hp,A*3.8);
  near(behind.hp,before.get(behind.id));near(far.hp,before.get(far.id));
  advance(s,1.1);for(const u of targets)near(before.get(u.id)-u.hp,A*3.8*1.15);
});

test('金色目标词条改为持续减疗50%三秒，影响多次治疗、可净化且不叠加较弱减疗',()=>{
  const {s,p,h,enemy,make}=arena(3);const second=make(0,1,3).h,immune=make(0,-1,3).h;
  immune.immuneUntil=100;enemy.hp-=1000;
  near(s.heal(enemy,100,enemy),100);
  const t=affix(s,p,65);assert.equal(t.name,'减少治疗效果');assert.equal(t.rarity,'gold');assert.equal(t.max,1);
  assert.deepEqual(t.keys,['healing_down']);assert.equal(currentSkill(s,h,0).unlimited_targets,true);
  cast(s,p,0,enemy);
  for(const u of [enemy,second]) {
    near(s.heal(u,100,u),50);near(s.heal(u,100,u),50);
    assert.ok(unitStatuses(s,u).some(status=>status.id==='healingDown'&&status.detail.includes('50%')));
  }
  assert.equal(s.activeDebuffs(immune,'healingDown').length,0);
  s.debuff(enemy,immune,'healingDown',.3,10);near(s.heal(enemy,100,enemy),50);
  s.cleanse(second);near(s.heal(second,100,second),100);
  s.time=s.activeDebuffs(enemy,'healingDown').find(d=>d.ratio===.5).until;
  near(s.heal(enemy,100,enemy),70);
});

test('尖刺外壳反弹普通攻击、真实火法技能及持续伤害，反伤不递归',()=>{
  const {s,p,h,enemy,make}=arena(3);s.config.design.rules.orcMissingReduction=0;cast(s,p,1);
  let before=enemy.hp;const A=s.attackPower(enemy);s.damage(enemy,h,100,true);near(before-enemy.hp,A*1.5);
  const mage=make(4,1,3),spellAttack=s.attackPower(mage.h);before=mage.h.hp;
  cast(s,mage.p,0,h);near(before-mage.h.hp,spellAttack*1.5);
  before=enemy.hp;s.damage(enemy,h,100,false,false,{periodic:true});near(before-enemy.hp,A*1.5);
  before=enemy.hp;s.damage(enemy,h,100,false,true);near(enemy.hp,before);
  assert.ok(h.stats.heroDamage>0);assert.equal(h.currentShell.until,5.25);
});

test('君临免疫所有伤害入口，不消耗护盾、不累计承伤与攻击者伤害，到期恢复',()=>{
  const {s,p,h,enemy}=arena(3);cast(s,p,3);s.shield(h,1000,h,20);
  const before=h.hp,taken=h.stats.damageTaken||0,damage=enemy.stats.heroDamage||0;
  const hits=[
    [enemy,100,true,false,{}],
    [enemy,100,false,false,{}],
    [enemy,100,false,false,{periodic:true}],
    [enemy,100,false,true,{}],
    [s.towers[0],100,true,false,{}],
    [null,100,false,false,{}],
    [enemy,1e9,false,false,{execute:true}],
  ];
  for(const [a,n,basic,reflected,meta] of hits) {
    near(s.damage(a,h,n,basic,reflected,meta),0);near(h.hp,before);near(h.shield,1000);
  }
  near(h.stats.damageTaken||0,taken);near(enemy.stats.heroDamage||0,damage);
  assert.equal(s.debuff(h,enemy,'attackDown',.5,5),false);
  assert.ok(unitStatuses(s,h).some(status=>status.id==='lordUlt'&&status.detail.includes('免疫任何伤害')));
  s.time=h.currentUlt.until;near(s.damage(enemy,h,100),100);near(h.shield,900);
});

test('君临免疫先于链接分摊，链接友军受击时君临也能免疫自己的分摊伤害',()=>{
  const {s,p,h,enemy,friend}=arena(3);cast(s,p,3);
  s.fields.push({kind:'link',owner:friend,host:h.id,until:100,breakRange:12,shareDamage:true});
  const hp=h.hp,fp=friend.hp;near(s.damage(enemy,h,100),0);near(friend.hp,fp);
  near(s.damage(enemy,friend,100),50);near(friend.hp,fp-50);near(h.hp,hp);
});

test('君临与尖刺可同时免伤反击，双方均有尖刺与君临时不会递归',()=>{
  const {s,p,h,enemy}=arena(3);cast(s,p,1);cast(s,p,3);
  const hp=h.hp,ep=enemy.hp,A=s.attackPower(enemy);near(s.damage(enemy,h,100,true),0);
  near(h.hp,hp);near(ep-enemy.hp,A*1.5);
  enemy.currentShell=h.currentShell;enemy.currentUlt=h.currentUlt;const before=enemy.hp;
  near(s.damage(enemy,h,100,false),0);near(h.hp,hp);near(enemy.hp,before);
});

test('君临持续强化延长到七秒，驱散君临后立即恢复伤害',()=>{
  const {s,p,h,enemy}=arena(3);affix(s,p,74,2);cast(s,p,3);near(h.currentUlt.until-.25,7);
  s.time=h.currentUlt.until-.01;near(s.damage(enemy,h,100),0);
  assert.equal(s.dispelOne(h),true);const hp=h.hp;near(s.damage(enemy,h,100),100);near(hp-h.hp,100);
});

test('当前配置与技能说明一致，新增比例和开关拒绝非法值',()=>{
  const {s,p,h}=arena(3);affix(s,p,65);const guide=describeAbilities(s);
  assert.match(guide.skills[0].summary,/无数量上限/);assert.match(guide.skills[0].summary,/受到治疗降低50%，3秒/);
  assert.doesNotMatch(guide.skills[0].summary,/最多3/);
  assert.match(guide.skills[1].summary,/尖刺外壳5秒.*普通攻击或技能攻击/);
  assert.match(guide.skills[3].summary,/君临5秒.*免疫任何伤害/);
  assert.ok(!currentTraits(s.config,3).some(t=>t.skill===0&&t.name==='目标增加'));
  assert.doesNotThrow(()=>JSON.stringify(s.config));
  for(const [slot,key,value] of [[0,'healing_down',1.1],[0,'unlimited_targets',1],[3,'damage_immune','true']]) {
    const next=structuredClone(s.config.design);next.skills[3][slot][key]=value;
    assert.throws(()=>validateCurrentDesign(next));
  }
  near(currentSkill(s,h,1).duration,5);near(currentSkill(s,h,3).duration,5);
});

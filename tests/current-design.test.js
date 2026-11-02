import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,clone,contractType,validateConfig} from '../shared/config.js';
import {Simulation} from '../shared/simulation.js';
import {createCurrentDesignConfig,currentSkill,currentTraits,currentValues,inverseQualityWeights} from '../shared/current-design.js';
import {prepareChoice,traitRank} from '../shared/traits.js';
import {describeAbilities} from '../client/src/ability-descriptions.js';
import {contributionRanking} from '../client/src/contribution-ranking.js';
import {Room} from '../server/room.mjs';
import {refreshCurrentStats} from '../shared/current-design-mechanics.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(id=0,config=createCurrentDesignConfig(defaults)) {
  const s=new Simulation(config,123);s.units=[];s.player.retired=true;s.waveAt=1e9;
  for(const t of s.towers){t.x=100;t.cd=1e9;}
  const make=(id,x=0,y=0)=>{const p=s.makePlayer(id===3?1:0,false);p.classId=id;p.stamina=10000;
    const h=s.spawn(p.side,contractType(id),0,1,x);assert.ok(s.contract(p,h.id));Object.assign(h,{x,y,cd:1e9,speed:0});return {p,h};};
  const {p,h}=make(id),enemy=make(id===3?0:3,0,3).h,friend=make(id===3?3:0,1,0).h;
  enemy.hp=enemy.maxHp=1e7;friend.hp=friend.maxHp/2;
  h.targetId=enemy.id;friend.targetId=enemy.id;enemy.targetId=h.id;s.localPlayerId=p.id;
  return {s,p,h,enemy,friend,make};
}
function advance(s,seconds){for(let t=0;t<seconds-1e-7;t+=.05)s.tick(.05);}
function affix(s,p,sourceId,rank=1){const t=currentTraits(s.config,p.classId).find(t=>t.sourceId===sourceId);assert.ok(t);p.progress[p.classId].traits[t.id]=rank;return t;}
test('新版当前稿完整、可序列化；104条效果及五职业40次预算',()=>{
  const config=createCurrentDesignConfig(defaults);validateConfig(config);
  assert.equal(new Set(config.design.affixes.map(t=>t.sourceId)).size,104);
  for(const id of [0,4,5,2,3]) {
    const {s,p,h}=arena(id,config);assert.equal(p.level,0);assert.deepEqual(p.builds[id],[1,1,1,1]);
    for(const t of currentTraits(config,id)) {p.progress[id].traits[t.id]=t.max;if(t.skill!=null){const skill=currentSkill(s,h,t.skill);assert.ok(Number.isFinite(skill.power));}}
    assert.ok(currentTraits(config,id).reduce((n,t)=>n+t.max,0)>=40);
    assert.doesNotThrow(()=>JSON.stringify(s));
  }
});
test('五职业20技能0级可用，实际体力及经验按施法累计',()=>{
  for(const id of [0,4,5,2,3]) for(let i=0;i<4;i++) {
    const {s,p,h,enemy,friend}=arena(id);
    s.setManualTarget(id===5||id===0&&i===2?friend.id:enemy.id,p);
    if(id===5&&i===2)s.debuff(friend,enemy,'attackDown',.2,20);
    const old=p.stamina,skill=currentSkill(s,h,i);
    assert.ok(s.cast(i,p),`${id}:${i} ${s.notice}`);advance(s,skill.castTime+Math.max(1,skill.duration||0)+.2);
    near(old-p.stamina,skill.cost);assert.equal(p.level,Math.floor(skill.cost/3));
    assert.ok(p.progress[id].choices.length===Math.floor(skill.cost/3));
  }
});
test('词条各档相对基础，不逐档复利；修改基础配置后沿用增量',()=>{
  const {s,p,h}=arena(0),t=affix(s,p,0,2),base=s.config.design.skills[0][0].power;
  near(currentSkill(s,h,0).power/100,base+t.values[1][0]-t.baseline[0]);
  s.config.design.skills[0][0].power+=1;
  near(currentSkill(s,h,0).power/100,base+1+t.values[1][0]-t.baseline[0]);
  assert.equal(traitRank(p,t.id),2);
});
test('升级与后选词条不倒灌本次施法攻击快照',()=>{
  const {s,p,h,enemy}=arena(4);s.setManualTarget(enemy.id,p);
  const before=s.attackPower(h);assert.ok(s.cast(3,p));assert.equal(p.level,1);
  near(s.skillValues.at(-1).attack,before);assert.ok(s.attackPower(h)>before);
  affix(s,p,104,2);const hp=enemy.hp;advance(s,1.1);
  near(hp-enemy.hp,before*8*1.05);
});
test('兽人救援按友军缺血给减伤，壁垒不截断有效蓄伤',()=>{
  const {s,p,h,friend}=arena(0);s.setManualTarget(friend.id,p);assert.ok(s.cast(2,p));advance(s,.3);
  near(h.guards.find(g=>g.kind==='orcRescue').ratio,.25);
  p.cd[3]=0;assert.ok(s.cast(3,p));advance(s,.3);
  h.hp=h.maxHp=100000;s.damage(null,h,1000);const total=h.damageStore.total;assert.ok(total>0);
  advance(s,7);near(h.shield,total*s.config.design.skills[0][3].store_gain);
});
test('火法标记施放不扣炙热、不立即伤害；真实普攻命中触发',()=>{
  const {s,p,h,enemy}=arena(4);const heat=h.heat,before=enemy.hp;
  s.setManualTarget(enemy.id,p);assert.ok(s.cast(1,p));advance(s,.3);near(enemy.hp,before);assert.equal(h.heat,heat);
  const A=s.attackPower(h),s2=currentSkill(s,h,1);s.damage(h,enemy,h.attack,true);
  near(before-enemy.hp,A+A*s2.per_hit);
});
test('炙热逐层衰减、攻速增益及受疗惩罚',()=>{
  const {s,h}=arena(4);s.addHeat(h,4);assert.equal(h.heat,5);near(s.attackRate(h),1.25);
  s.time=h.heatUntil+.01;s.updateUnitEffects(h);assert.equal(h.heat,4);
  h.hp-=1000;near(s.heal(h,100,h,null,true),92);
});
test('精灵按有效治疗转伤，派生治疗与伤害不互相递归',()=>{
  const {s,p,h,enemy,friend}=arena(5);s.setManualTarget(friend.id,p);
  const before=enemy.hp;assert.ok(s.cast(0,p));advance(s,.3);
  const value=s.skillValues.at(-1),actual=value.parts['治疗'];near(before-enemy.hp,actual*.5);
  const hp=friend.hp;s.damage(h,enemy,100,true);near(friend.hp-hp,50);
});
test('净化按移除数量治疗；共生组平摊伤害不会递归分摊',()=>{
  const {s,p,h,friend,enemy}=arena(5);s.setManualTarget(friend.id,p);
  s.debuff(friend,enemy,'attackDown',.2,10);s.debuff(friend,enemy,'moveSlow',.2,10);
  const before=friend.hp;assert.ok(s.cast(2,p));advance(s,.3);
  near(friend.hp-before,s.skillValues[0].attack*s.config.design.skills[5][2].heal_per_cleanse*2);
  affix(s,p,40);s.setManualTarget(friend.id,p);assert.ok(s.cast(1,p));advance(s,.3);
  const hp=h.hp,fp=friend.hp;s.damage(enemy,friend,100);
  near(hp-h.hp,50);assert.ok(fp-friend.hp<50); // 兽人被动独立结算
});
test('战车先合计衰减再均分，冰霜无腐蚀前置，减疗只消耗一次',()=>{
  const {s,p,h,enemy,make}=arena(2);const another=make(3,1,3).h;another.hp=another.maxHp=1e7;
  s.setManualTarget(enemy.id,p);const before=enemy.hp,other=another.hp,A=s.attackPower(h);
  assert.ok(s.cast(1,p));advance(s,1);near(before-enemy.hp,A*2*.9/2);near(other-another.hp,A*2*.9/2);
  assert.ok(s.activeDebuffs(enemy,'attackSpeedDown').length);
  affix(s,p,49);p.cd[0]=0;assert.ok(s.cast(0,p));advance(s,1);
  enemy.hp=enemy.maxHp-1000;near(s.heal(enemy,100,enemy),77.5);near(s.heal(enemy,100,enemy),100);
});
test('领主尖刺外壳按攻击者攻击反伤，并保留自身归属',()=>{
  const {s,p,h,enemy}=arena(3);assert.equal(s.configSkillName(3,1),'尖刺外壳');
  assert.ok(s.cast(1,p));advance(s,.3);const before=enemy.hp,A=s.attackPower(enemy);
  s.damage(enemy,h,1,true);near(before-enemy.hp,A*1.5);assert.ok(h.stats.heroDamage>0);
});
test('战车腐蚀炮弹以主目标计算总池，不同生命上限目标仍先衰减再均分',()=>{
  const {s,p,h,enemy,make}=arena(2),another=make(3,1,3).h;
  Object.assign(enemy,{hp:1000,maxHp:1000});Object.assign(another,{hp:4000,maxHp:4000});
  Object.assign(s.config.design.skills[2][0],{hp_ratio:.1,cap:100,extra_chance:0,dot_chance:0});
  s.setManualTarget(enemy.id,p);assert.ok(s.cast(0,p));advance(s,1);
  near(1000-enemy.hp,45);near(4000-another.hp,45);
});
test('战车持续腐蚀以主目标生命快照计算，再按合计衰减均分',()=>{
  const {s,p,h,enemy,make}=arena(2),another=make(3,1,3).h;
  Object.assign(enemy,{hp:1000,maxHp:1000});Object.assign(another,{hp:4000,maxHp:4000});
  Object.assign(s.config.design.skills[2][0],{hp_ratio:.1,cap:100,extra_chance:0,dot_chance:1,dot_hp:.1});
  s.setManualTarget(enemy.id,p);assert.ok(s.cast(0,p));advance(s,1.6);
  near(1000-enemy.hp,90);near(4000-another.hp,90);
});
test('两种射程词条叠加后自动索敌覆盖实际普攻射程',()=>{
  const {s,p,h,enemy}=arena(2);s.config.design.heroes[2].range=10;
  affix(s,p,94);affix(s,p,102);refreshCurrentStats(s,h);
  Object.assign(enemy,{x:0,y:13});h.targetId=null;
  near(h.range,14);assert.ok(h.aggro>=14);assert.equal(s.choose(h)?.id,enemy.id);
});
test('领主固有击杀续航和随机单状态净化，积分奖励不进驱散池',()=>{
  const {s,h,enemy}=arena(3);h.hp=h.maxHp/2;
  s.debuff(h,enemy,'attackDown',.1,20);s.debuff(h,enemy,'moveSlow',.1,20);
  h.eliteBuffs={score:100};const before=h.hp;
  for(let i=0;i<3;i++){const u=s.spawn(0,'melee',0,1);u.hp=u.maxHp=100;s.damage(h,u,1000);}
  near(h.hp-before,h.maxHp*.02);assert.equal(s.negativeCount(h),1);assert.equal(h.eliteBuffs.score,100);
});
test('当前负面可被净化，免疫会阻止标记和持续腐蚀',()=>{
  const {s,p,h,enemy}=arena(4);s.setManualTarget(enemy.id,p);
  assert.ok(s.cast(1,p));advance(s,.3);assert.ok(s.hasNegative(enemy));s.cleanse(enemy);
  assert.equal(s.hasNegative(enemy),false);assert.equal(enemy.soulMarks.length,0);
  enemy.immuneUntil=100;p.cd[1]=0;h.castUntil=0;
  assert.ok(s.cast(1,p));advance(s,.3);assert.equal(enemy.soulMarks.length,0);
});
test('品质先抽统一权重，再选可用词条，满档品质退出可选池',()=>{
  const {s,p}=arena(0),progress=p.progress[0];s.addXp(p,120);
  assert.equal(p.level,40);assert.equal(progress.choices.length,40);
  while(progress.choices.length){const choice=prepareChoice(s,p);assert.ok(choice.options.length);assert.ok(s.chooseTrait(choice.options[0],choice.level,p));}
  assert.equal(Object.values(progress.traits).reduce((a,b)=>a+b,0),40);
  const weights=inverseQualityWeights({blue:1,purple:2,gold:4});near(weights.gold/weights.blue,.25);
});
test('积分与KDA读同版配置，客户端显示服务端KDA及真实技能说明',()=>{
  const {s,p,h}=arena(3);s.stat(h,'heroDamage',1000);s.stat(h,'minionKillHealth',4000);
  const c=s.config.design.scoreCoefficients[3],B=5000*c.a,stats=s.contribution(p);near(stats.kda,B/21);
  near(stats.totalPoints,300+B);assert.ok(contributionRanking([{...p,...stats}],p.id).includes(stats.kda.toFixed(2)));
  const guide=describeAbilities(s);assert.equal(guide.skills[1].name,'尖刺外壳');assert.ok(guide.skills.every(s=>s.learned));
  s.config.design.skills[3][1].thorn=2;assert.ok(describeAbilities(s).skills[1].summary.includes('200%'));
});
test('配置拒绝无效概率、间隔和词条结构；保留钉钉尚未平衡的原值',()=>{
  const c=createCurrentDesignConfig(defaults);assert.equal(c.design.skills[3][1].duration,1.2);assert.equal(c.design.status,'待平衡');
  for(const change of [x=>x.design.qualityWeights.gold=0,x=>x.design.rules.pierceGap=0,x=>x.design.affixes[0].values[0][0]=NaN]) {
    const next=clone(c);change(next);assert.throws(()=>validateConfig(next));
  }
});
test('全部词条职业实例在满档时真实施法，坐标、生命与快照保持有效',()=>{
  const config=createCurrentDesignConfig(defaults);
  for(const t of config.design.affixes){
    const {s,p,h,enemy,friend}=arena(t.classId,config);p.progress[t.classId].traits[t.id]=t.max;
    const slots=t.skill==null?[0,1,2,3]:[t.skill];
    for(const i of slots){
      s.setManualTarget(t.classId===5||t.classId===0&&i===2?friend.id:enemy.id,p);
      if(t.classId===5&&i===2)s.debuff(friend,enemy,'attackDown',.1,20);
      assert.ok(s.cast(i,p),`${t.id}/${i}: ${s.notice}`);advance(s,Math.max(8,currentSkill(s,h,i).duration+1));
      for(const u of s.units)for(const k of ['hp','maxHp','x','y','attack'])assert.ok(Number.isFinite(u[k]),`${t.id}/${k}`);
      const room=new Room(config);room.sim=s;assert.doesNotThrow(()=>JSON.stringify(room.snapshot()));
    }
  }
});

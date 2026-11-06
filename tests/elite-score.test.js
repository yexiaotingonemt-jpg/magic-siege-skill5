import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {defaults,contractType} from '../shared/config.js';
import {createCurrentDesignConfig,currentStatPoints} from '../shared/current-design.js';
import {statPoints} from '../shared/contribution-score.js';
import {grantEliteScore,eliteScoreActive} from '../shared/elite-score.js';
import {unitStatuses} from '../client/src/unit-status.js';
import {Room} from '../server/room.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(config) {
  const s=new Simulation(config);s.units=[];s.waveAt=1e9;s.player.retired=true;
  const hero=side=>{const p=s.makePlayer(side,false);p.classId=side?3:0;
    const h=s.spawn(side,contractType(p.classId),0,1);assert.ok(s.contract(p,h.id));return h;};
  const kill=(h,t)=>s.damage(h,t,1e12);
  const elite=()=>Object.assign(s.spawn(1,'melee',0,1),{elite:true});
  return {s,hero,kill,elite};
}
for(const [mode,config] of [['经典',defaults],['当前稿',createCurrentDesignConfig(defaults)]]) {
  test(`${mode}：特殊怪物授予60秒积分增益，每棒扣15秒，末棒一次性200分`,()=>{
    const {s,hero,kill,elite}=arena(config);let carrier=hero(0);kill(carrier,elite());
    assert.equal(carrier.eliteBuffs.score,60);assert.equal(carrier.eliteScore.generation,0);
    for(let generation=1;generation<=4;generation++) {
      const next=hero(1-carrier.side);
      // Kill immediately before expiry: the next generation still gets its full duration.
      s.time=carrier.eliteBuffs.score-.01;
      const p=s.players[next.playerId],before=p.totalPoints;
      const pointsFor=(key,n)=>config.design?currentStatPoints(config,next.classId,key,n):statPoints(next.classId,key,n,config);
      const ordinaryKillPoints=pointsFor('heroDamage',carrier.hp)+pointsFor('heroKills',1);
      kill(next,carrier);
      if(generation<4){near(next.eliteBuffs.score-s.time,60-15*generation);assert.equal(next.eliteScore.generation,generation);}
      else {
        assert.equal(next.eliteBuffs?.score,undefined);assert.equal(next.stats.eliteScoreBounty,200);
        near(p.totalPoints-before,ordinaryKillPoints+200);
      }
      const points=p.totalPoints;kill(next,carrier);assert.equal(p.totalPoints,points);
      assert.ok(!eliteScoreActive(carrier,s.time));carrier=next;
    }
    const room=new Room(config);room.sim=s;
    const snapshot=JSON.parse(JSON.stringify(room.snapshot()));
    assert.ok(snapshot.battleEvents.some(e=>e.points===200));
    s.settle(carrier,'验证');near(carrier.settledReport.points,s.players[carrier.playerId].totalPoints);
  });
  test(`${mode}：60→45→30→15秒固定递减，每次重新计时且不叠加`,()=>{
    const {s,hero,kill}=arena(config);let carrier=hero(0);grantEliteScore(s,carrier);
    for(const duration of [45,30,15]){const next=hero(1-carrier.side);grantEliteScore(s,next);kill(next,carrier);near(next.eliteBuffs.score-s.time,duration);carrier=next;}
    const next=hero(1-carrier.side);kill(next,carrier);assert.equal(next.stats.eliteScoreBounty,200);assert.equal(next.eliteBuffs?.score,undefined);
  });
  test(`${mode}：仅增幅持有期间新增积分，期满、死亡后不加成`,()=>{
    const {s,hero,kill,elite}=arena(config),h=hero(0);kill(h,elite());const p=s.players[h.playerId];
    for(const key of ['heroDamage','minionDamage','buildingDamage','damageTaken','healing','heroKills','heroAssists','staminaSpent']) {
      const clean=hero(0),other=s.players[clean.playerId],base=other.totalPoints,before=p.totalPoints;
      s.stat(clean,key,100);s.stat(h,key,100);near(p.totalPoints-before,(other.totalPoints-base)*1.5);
    }
    const earned=h.stats.eliteScoreBonus;assert.ok(earned>0);
    s.time=60;assert.equal(unitStatuses(s,h).some(x=>x.id==='elite-score'),false);
    s.stat(h,'heroDamage',100);assert.equal(h.stats.eliteScoreBonus,earned);
    h.hp=0;s.time=1;s.stat(h,'heroDamage',100);assert.equal(h.stats.eliteScoreBonus,earned);
    s.settle(h,'阵亡');near(h.settledReport.points,p.totalPoints);
  });
  test(`${mode}：过期、无记录补刀、友方及死亡杀手不继承，重新击杀怪物刷新首棒`,()=>{
    for(const kind of ['expired','minion','dead','friendly']) {
      const {s,hero,kill}=arena(config),h=hero(0),enemy=hero(1);grantEliteScore(s,h);
      let source=enemy;if(kind==='expired')s.time=60;if(kind==='minion')source=s.spawn(1,'melee',0,1);if(kind==='dead')enemy.hp=0;if(kind==='friendly')enemy.side=0;
      kill(source,h);assert.equal(source.eliteBuffs?.score,undefined);assert.equal(source.stats?.eliteScoreBounty,undefined);
    }
    const {s,hero,kill,elite}=arena(config),h=hero(0);grantEliteScore(s,h,60,2);s.time=1;kill(h,elite());
    assert.equal(h.eliteScore.generation,0);near(h.eliteBuffs.score-s.time,60);
    assert.match(unitStatuses(s,h).find(x=>x.id==='elite-score').detail,/下次传递45秒/);
  });
  test(`${mode}：末棒200分不被已有增益放大，召唤物击杀归属主人`,()=>{
    const {s,hero,kill}=arena(config),victim=hero(0),h=hero(1);
    grantEliteScore(s,victim,60,3);grantEliteScore(s,h);
    const p=s.players[h.playerId],before=p.totalPoints;
    const pointsFor=(key,n)=>config.design?currentStatPoints(config,h.classId,key,n):statPoints(h.classId,key,n,config);
    const ordinary=pointsFor('heroDamage',victim.hp)+pointsFor('heroKills',1);
    const summon=Object.assign(s.spawn(1,'melee',0,1),{summoned:true,ownerId:h.id});
    kill(summon,victim);near(p.totalPoints-before,ordinary*1.5+200);
    assert.equal(h.eliteScore.generation,0);assert.equal(h.eliteBuffs.score,60);
    assert.equal(h.stats.eliteScoreBounty,200);assert.equal(summon.eliteBuffs,undefined);
    const earned=h.stats.eliteScoreBonus;s.resetMap();assert.equal(s.hero(p),undefined);
    assert.ok(s.units.every(u=>!eliteScoreActive(u,s.time)));assert.equal(h.stats.eliteScoreBonus,earned);
  });
  test(`${mode}：任意阵营存活英雄最后一击领取精英奖励，并覆盖攻击记录`,()=>{
    for(const side of [0,1]) {
      const {s,hero,kill,elite}=arena(config),old=hero(0),h=hero(side),target=elite();
      s.damage(old,target,1);kill(h,target);
      assert.equal(target.lastAttackingHeroId,h.id);
      near(h.eliteBuffs.score-s.time,60);assert.equal(old.eliteBuffs,undefined);
    }
  });
  test(`${mode}：普通单位补刀只追溯最后攻击目标的英雄，不受助攻窗口限制`,()=>{
    const {s,hero,kill,elite}=arena(config),first=hero(0),last=hero(0),target=elite();
    s.damage(first,target,1);s.damage(last,target,1);
    assert.equal(target.lastAttackingHeroId,last.id);
    s.time=1000;const minion=s.spawn(0,'melee',0,1);kill(minion,target);
    near(last.eliteBuffs.score-s.time,60);assert.equal(first.eliteBuffs,undefined);
    assert.equal(minion.eliteBuffs,undefined);assert.equal(last.stats.minionKills,undefined);
    assert.doesNotThrow(()=>JSON.stringify(s.units));
  });
  test(`${mode}：最新攻击英雄失效则流失，不回找更早英雄或新契约`,()=>{
    for(const invalid of ['dead','removed','retired','newContract']) {
      const {s,hero,kill,elite}=arena(config),first=hero(0),last=hero(0),target=elite(),p=s.players[last.playerId];
      s.damage(first,target,1);s.damage(last,target,1);
      if(invalid==='dead'||invalid==='newContract')last.hp=0;
      if(invalid==='removed')s.units=s.units.filter(u=>u!==last);
      if(invalid==='retired')p.retired=true;
      if(invalid==='newContract')assert.ok(s.contract(p,s.spawn(0,'melee',0,1).id));
      kill(s.spawn(0,'melee',0,1),target);
      assert.equal(s.battleEvents.length,0);assert.equal(first.eliteBuffs,undefined);
      assert.equal(s.hero(p)?.eliteBuffs,undefined);
    }
  });
  test(`${mode}：普通单位补刀可传递或发末棒奖励，无有效英雄则链终止`,()=>{
    for(const generation of [0,3]) {
      const {s,hero,kill}=arena(config),carrier=hero(0),last=hero(1);
      grantEliteScore(s,carrier,60,generation);s.damage(last,carrier,1);
      s.time=carrier.eliteBuffs.score-.01;kill(s.spawn(1,'melee',0,1),carrier);
      if(generation===0)near(last.eliteBuffs.score-s.time,45);
      else assert.equal(last.stats.eliteScoreBounty,200);
      assert.equal(carrier.eliteBuffs.score,undefined);
    }
    const {s,hero,kill}=arena(config),carrier=hero(0),first=hero(1),last=hero(1);
    grantEliteScore(s,carrier);s.damage(first,carrier,1);s.damage(last,carrier,1);last.hp=0;
    kill(s.spawn(1,'melee',0,1),carrier);
    assert.equal(first.eliteBuffs,undefined);assert.equal(carrier.eliteBuffs.score,undefined);
    assert.equal(s.battleEvents.length,1);
  });
  test(`${mode}：无攻击记录、零伤害、塔补刀或死亡英雄最后一击均不回溯领取`,()=>{
    for(const kind of ['none','zero','tower','dead']) {
      const {s,hero,kill,elite}=arena(config),h=hero(0),target=elite();
      if(kind==='zero')s.damage(h,target,0);
      if(kind==='tower'||kind==='dead')s.damage(h,target,1);
      let killer=s.spawn(0,'melee',0,1);
      if(kind==='tower')killer={...s.towers[0],side:0};
      if(kind==='dead'){h.hp=0;killer=h;}
      kill(killer,target);assert.equal(s.battleEvents.length,0);
    }
  });
  test(`${mode}：精英按开局600秒独立刷新，重建不重置600秒周期`,()=>{
    const {s}=arena(config);for(const p of s.players)p.retired=true;
    s.time=599;s.tick(.5);assert.equal(s.units.filter(u=>u.elite).length,0);
    s.tick(.5);assert.deepEqual(s.units.filter(u=>u.elite).map(u=>u.side).sort(),[0,1]);
    assert.equal(s.eliteAt,1200);s.tick(0);assert.equal(s.units.filter(u=>u.elite).length,2);
    s.time=900;s.resetMap();s.waveAt=1e9;assert.equal(s.eliteAt,1200);
    assert.equal(s.units.filter(u=>u.elite).length,0);
    s.time=1199;s.tick(.5);assert.equal(s.units.filter(u=>u.elite).length,0);
    s.tick(.5);assert.equal(s.units.filter(u=>u.elite).length,2);assert.equal(s.eliteAt,1800);
  });
  test(`${mode}：50%奖励同步计入总积分、KDA及结算，不修改原始统计`,()=>{
    const {s,hero}=arena(config),clean=hero(0),boosted=hero(0);
    const p=s.players[clean.playerId],q=s.players[boosted.playerId];
    const before=p.totalPoints;
    grantEliteScore(s,boosted);
    for(const h of [clean,boosted]) {
      s.spendStamina(s.players[h.playerId],5,h);
      for(const [key,n] of [['heroDamage',1000],['damageTaken',500],['healing',200],['heroKills',1],['heroAssists',1]])s.stat(h,key,n);
    }
    const base=s.contribution(p),enhanced=s.contribution(q),bonus=boosted.stats.eliteScoreBonus;
    near(enhanced.totalPoints-before,(base.totalPoints-before)*1.5);
    near(enhanced.kda-base.kda,bonus/(config.design?Math.max(q.staminaSpent,config.design.rules.standardStamina):q.staminaSpent));
    for(const key of Object.keys(clean.stats))near(boosted.stats[key],clean.stats[key]);
    s.settle(boosted,'验证');near(boosted.settledReport.points,q.totalPoints);
    near(s.ratingParts(boosted).find(part=>part.key==='damageTaken').points,s.ratingParts(clean).find(part=>part.key==='damageTaken').points);
  });
}

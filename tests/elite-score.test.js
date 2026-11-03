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
  test(`${mode}：特殊怪物授予30秒积分增益，每棒扣原时长1/4，末棒一次性200分`,()=>{
    const {s,hero,kill,elite}=arena(config);let carrier=hero(0);kill(carrier,elite());
    assert.equal(carrier.eliteBuffs.score,30);assert.equal(carrier.eliteScore.generation,0);
    for(let generation=1;generation<=4;generation++) {
      const next=hero(1-carrier.side);
      // Kill immediately before expiry: the next generation still gets its full duration.
      s.time=carrier.eliteBuffs.score-.01;
      const p=s.players[next.playerId],before=p.totalPoints;
      const pointsFor=(key,n)=>config.design?currentStatPoints(config,next.classId,key,n):statPoints(next.classId,key,n);
      const ordinaryKillPoints=pointsFor('heroDamage',carrier.hp)+pointsFor('heroKills',1);
      kill(next,carrier);
      if(generation<4){near(next.eliteBuffs.score-s.time,30*(4-generation)/4);assert.equal(next.eliteScore.generation,generation);}
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
  test(`${mode}：10秒设计按10→7.5→5→2.5递减，恰好1/4仍传递`,()=>{
    const {s,hero,kill}=arena(config);let carrier=hero(0);grantEliteScore(s,carrier,10);
    for(const duration of [7.5,5,2.5]){const next=hero(1-carrier.side);kill(next,carrier);near(next.eliteBuffs.score-s.time,duration);carrier=next;}
    const next=hero(1-carrier.side);kill(next,carrier);assert.equal(next.stats.eliteScoreBounty,200);assert.equal(next.eliteBuffs?.score,undefined);
  });
  test(`${mode}：仅增幅持有期间新增积分，期满、死亡后不加成`,()=>{
    const {s,hero,kill,elite}=arena(config),h=hero(0);kill(h,elite());const p=s.players[h.playerId];
    for(const key of ['heroDamage','minionDamage','buildingDamage','damageTaken','healing','heroKills','heroAssists','staminaSpent']) {
      const clean=hero(0),other=s.players[clean.playerId],base=other.totalPoints,before=p.totalPoints;
      s.stat(clean,key,100);s.stat(h,key,100);near(p.totalPoints-before,(other.totalPoints-base)*1.2);
    }
    const earned=h.stats.eliteScoreBonus;assert.ok(earned>0);
    s.time=30;assert.equal(unitStatuses(s,h).some(x=>x.id==='elite-score'),false);
    s.stat(h,'heroDamage',100);assert.equal(h.stats.eliteScoreBonus,earned);
    h.hp=0;s.time=1;s.stat(h,'heroDamage',100);assert.equal(h.stats.eliteScoreBonus,earned);
    s.settle(h,'阵亡');near(h.settledReport.points,p.totalPoints);
  });
  test(`${mode}：过期、非英雄击杀及死亡杀手均不继承，重新击杀怪物刷新首棒`,()=>{
    for(const kind of ['expired','minion','dead','friendly']) {
      const {s,hero,kill}=arena(config),h=hero(0),enemy=hero(1);grantEliteScore(s,h);
      let source=enemy;if(kind==='expired')s.time=30;if(kind==='minion')source=s.spawn(1,'melee',0,1);if(kind==='dead')enemy.hp=0;if(kind==='friendly')enemy.side=0;
      kill(source,h);assert.equal(source.eliteBuffs?.score,undefined);assert.equal(source.stats?.eliteScoreBounty,undefined);
    }
    const {s,hero,kill,elite}=arena(config),h=hero(0);grantEliteScore(s,h,10,2);s.time=1;kill(h,elite());
    assert.equal(h.eliteScore.generation,0);near(h.eliteBuffs.score-s.time,30);
    assert.match(unitStatuses(s,h).find(x=>x.id==='elite-score').detail,/下次传递22.5秒/);
  });
  test(`${mode}：末棒200分不被已有增益放大，召唤物击杀归属主人`,()=>{
    const {s,hero,kill}=arena(config),victim=hero(0),h=hero(1);
    grantEliteScore(s,victim,10,3);grantEliteScore(s,h);
    const p=s.players[h.playerId],before=p.totalPoints;
    const pointsFor=(key,n)=>config.design?currentStatPoints(config,h.classId,key,n):statPoints(h.classId,key,n);
    const ordinary=pointsFor('heroDamage',victim.hp)+pointsFor('heroKills',1);
    const summon=Object.assign(s.spawn(1,'melee',0,1),{summoned:true,ownerId:h.id});
    kill(summon,victim);near(p.totalPoints-before,ordinary*1.2+200);
    assert.equal(h.eliteScore.generation,0);assert.equal(h.eliteBuffs.score,30);
    assert.equal(h.stats.eliteScoreBounty,200);assert.equal(summon.eliteBuffs,undefined);
    const earned=h.stats.eliteScoreBonus;s.resetMap();assert.equal(s.hero(p),undefined);
    assert.ok(s.units.every(u=>!eliteScoreActive(u,s.time)));assert.equal(h.stats.eliteScoreBonus,earned);
  });
}

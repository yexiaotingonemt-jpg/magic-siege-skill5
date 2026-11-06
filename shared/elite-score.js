// Each carrier owns a full generation duration, independent of the previous countdown.
export const ELITE_SCORE = {spawnInterval:600, duration:60, transferLoss:15, bonus:.5, bounty:200};
export const eliteScoreActive = (u,time) => !!(u?.hero && u.hp>0 && u.eliteBuffs?.score>time);
export const eliteScoreDuration = (baseDuration,generation) => baseDuration-generation*ELITE_SCORE.transferLoss;

// Keep only the original hero's unit id, never a player id that could resolve to
// a later contract. A newer invalid hero deliberately replaces the old record.
export function recordEliteScoreHit(target,hero) {
  if(!target.tower && hero?.hero)target.lastAttackingHeroId=hero.id;
}
function validHero(sim,h) {
  const p=sim.players[h?.playerId];
  return !!(h?.hero && h.hp>0 && p && !p.retired && sim.hero(p)===h);
}
export function rewardEliteScoreKill(sim,killer,victim) {
  const active=victim.hero && victim.eliteBuffs?.score>sim.time;
  if(!victim.elite && !active)return;
  let h=killer;
  if(killer && !killer.hero && !killer.tower && !killer.summoned)
    h=sim.get(victim.lastAttackingHeroId);
  if(validHero(sim,h) && (victim.elite || (h.side!==victim.side && killer?.side!==victim.side))) {
    if(victim.elite)grantEliteScore(sim,h);
    else transferEliteScore(sim,h,victim);
  }
  // Death ends a chain even when no valid hero can receive it.
  if(victim.hero && victim.eliteBuffs)delete victim.eliteBuffs.score;
}

function announce(sim,h,text,extra={}) {
  sim.battleEvents.unshift({id:++sim.battleEventId,time:sim.time,text,buff:'score',heroId:h.id,until:sim.time+6,...extra});
  sim.battleEvents.length=Math.min(100,sim.battleEvents.length);
  sim.log(text);
  sim.visual('eliteReward',h,h,{until:sim.time+1.5,buff:'score'});
}
export function grantEliteScore(sim,h,baseDuration=ELITE_SCORE.duration,generation=0) {
  if(!h?.hero || h.hp<=0)return;
  const duration=eliteScoreDuration(baseDuration,generation);
  h.eliteScore={baseDuration,generation,duration};
  h.eliteBuffs??={};
  h.eliteBuffs.score=sim.time+duration;
  announce(sim,h,`${sim.players[h.playerId].name} ${generation?'继承闪光':'击杀特殊怪物'}，获得「积分 +50%」${duration}秒`);
}
export function transferEliteScore(sim,h,victim) {
  // Victim hp is already zero when onKill runs; use its expiry directly.
  if(!victim.hero || !(victim.eliteBuffs?.score>sim.time))return;
  const chain=victim.eliteScore||{baseDuration:ELITE_SCORE.duration,generation:0};
  delete victim.eliteBuffs.score;
  const generation=chain.generation+1;
  if(eliteScoreDuration(chain.baseDuration,generation)>0) {
    grantEliteScore(sim,h,chain.baseDuration,generation);
  } else {
    // Terminal reward is fixed, paid once, and never amplified by another buff.
    const p=sim.players[h.playerId];
    p.totalPoints+=ELITE_SCORE.bounty;p.score+=ELITE_SCORE.bounty;
    h.stats.eliteScoreBounty=(h.stats.eliteScoreBounty||0)+ELITE_SCORE.bounty;
    announce(sim,h,`${p.name} 击杀闪光英雄，传递时长已耗尽，获得一次性 ${ELITE_SCORE.bounty} 积分，传递结束`,{points:ELITE_SCORE.bounty});
  }
}

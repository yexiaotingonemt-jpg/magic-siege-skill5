// Each carrier owns a full generation duration, independent of the previous countdown.
export const ELITE_SCORE = {duration:30, bonus:.2, bounty:200};
export const eliteScoreActive = (u,time) => !!(u?.hero && u.hp>0 && u.eliteBuffs?.score>time);

function announce(sim,h,text,extra={}) {
  sim.battleEvents.unshift({id:++sim.battleEventId,time:sim.time,text,buff:'score',heroId:h.id,until:sim.time+6,...extra});
  sim.battleEvents.length=Math.min(100,sim.battleEvents.length);
  sim.log(text);
  sim.visual('eliteReward',h,h,{until:sim.time+1.5,buff:'score'});
}
export function grantEliteScore(sim,h,baseDuration=ELITE_SCORE.duration,generation=0) {
  if(!h?.hero || h.hp<=0)return;
  const duration=baseDuration*(4-generation)/4;
  h.eliteScore={baseDuration,generation,duration};
  h.eliteBuffs??={};
  h.eliteBuffs.score=sim.time+duration;
  announce(sim,h,`${sim.players[h.playerId].name} ${generation?'继承闪光':'击杀特殊怪物'}，获得「积分 +20%」${duration}秒`);
}
export function transferEliteScore(sim,h,victim) {
  // Victim hp is already zero when onKill runs; use its expiry directly.
  if(!victim.hero || !(victim.eliteBuffs?.score>sim.time))return;
  const chain=victim.eliteScore||{baseDuration:ELITE_SCORE.duration,generation:0};
  delete victim.eliteBuffs.score;
  const generation=chain.generation+1;
  if(generation<4) {
    grantEliteScore(sim,h,chain.baseDuration,generation);
  } else {
    // Terminal reward is fixed, paid once, and never amplified by another buff.
    const p=sim.players[h.playerId];
    p.totalPoints+=ELITE_SCORE.bounty;p.score+=ELITE_SCORE.bounty;
    h.stats.eliteScoreBounty=(h.stats.eliteScoreBounty||0)+ELITE_SCORE.bounty;
    announce(sim,h,`${p.name} 击杀闪光英雄，传递时长不足初始的1/4，获得一次性 ${ELITE_SCORE.bounty} 积分`,{points:ELITE_SCORE.bounty});
  }
}

// 独立职业被动：正式旧技能与新版开发稿分开启用，不切换主动技能、成长或KDA规则。
export const INNATE_DEFAULTS={enabled:0,scoreScales:{"0":{"effect":1.749869,"taken":0.65},"2":{"effect":1.316463,"taken":1.0},"3":{"effect":0.894894,"taken":1.0},"4":{"effect":1.185851,"taken":1.0},"5":{"effect":0.645776,"taken":1.0}},orcMissingReduction:.25,heatHaste:.05,heatHealPenalty:.02,elfDamageHeal:.5,elfHealDamage:.5,elfRadius:4,lordMinionKills:3,lordKillHeal:.02,shareTotals:[0,1,.9,.8,.7,.6,.5]};
export const innateRules=sim=>sim.config.innate?.enabled===1?sim.config.innate:null;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function runeShare(sim,count){const r=innateRules(sim);return r&&count>0?r.shareTotals[Math.min(6,count)]/count:1;}
export function innateAfterDamage(sim,a,t,sum,meta){
 const r=innateRules(sim);if(!r||!a?.hero||a.classId!==5||a.hp<=0||a.side===t.side||meta.innateDerived)return;
 const friend=sim.allies({...t,side:a.side},r.elfRadius).filter(u=>!u.tower).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id)[0];
 if(friend)sim.heal(friend,sum*r.elfDamageHeal,a,null,true);
}
export function innateAfterHeal(sim,h,t,actual){
 const r=innateRules(sim);if(!r||!h?.hero||h.classId!==5||h.hp<=0||actual<=0)return;
 const enemy=sim.enemies({...t,side:h.side},r.elfRadius).sort((a,b)=>distance(t,a)-distance(t,b)||a.id-b.id)[0];
 if(enemy)sim.damage(h,enemy,actual*r.elfHealDamage,false,false,{innateDerived:true,proc:true});
}
function cleanseOne(sim,h){
 const options=[];
 for(const [key,d]of Object.entries(h.debuffs||{}))if(d.until>sim.time)options.push(()=>{delete h.debuffs[key];sim.syncAttackCooldown(h);});
 for(const key of ['tauntUntil','stunUntil','slowUntil','conductUntil'])if(h[key]>sim.time)options.push(()=>{h[key]=0;});
 for(const [key,stamps]of Object.entries(h.scars||{}))if(stamps.some(t=>t>sim.time))options.push(()=>{delete h.scars[key];});
 for(const f of sim.fields)if(f.kind==='dot'&&f.host===h.id&&f.until>sim.time&&!f.s?.uncleansable)options.push(()=>{sim.fields=sim.fields.filter(v=>v!==f);});
 if(options.length)options[Math.floor(sim.random()*options.length)]();
}
function dispelOne(sim,h){
 const options=[];
 for(const [key,v]of Object.entries(h.hastes||{}))if(v.until>sim.time)options.push(()=>{delete h.hastes[key];});
 for(const g of h.guards||[])if(g.until>sim.time)options.push(()=>{h.guards=h.guards.filter(v=>v!==g);});
 if(h.shield>0&&h.shieldUntil>sim.time)options.push(()=>{h.shield=0;h.shieldUntil=0;});
 if(h.heat>0)options.push(()=>{h.heat=0;h.heatUntil=0;h.heatBoostStacks=0;h.heatBoostUntil=0;});
 if(h.haste?.until>sim.time)options.push(()=>{h.haste=null;});
 for(const key of ['boostUntil','healingBoostUntil'])if(h[key]>sim.time)options.push(()=>{h[key]=0;});
 if(h.lordUlt?.until>sim.time||h.immuneUntil>sim.time)options.push(()=>{h.lordUlt=null;h.immuneUntil=0;});
 if(!options.length)return false;options[Math.floor(sim.random()*options.length)]();return true;
}
export function innateOnKill(sim,h,t){
 const r=innateRules(sim);if(!r||!h.hero||h.classId!==3||h.hp<=0||t.tower||t.summoned||h.side===t.side)return;
 h.innateMinionKills=(h.innateMinionKills||0)+(t.hero?0:1);
 if(!t.hero&&h.innateMinionKills<r.lordMinionKills)return;
 if(!t.hero)h.innateMinionKills-=r.lordMinionKills;
 cleanseOne(sim,h);for(const enemy of sim.enemies(h).sort((a,b)=>distance(h,a)-distance(h,b)||a.id-b.id))if(dispelOne(sim,enemy))break;
 sim.heal(h,h.maxHp*r.lordKillHeal,h,null,true);
}
export function describeInnate(sim,h){
 const r=innateRules(sim);if(!r)return {};
 const f=n=>String(Number(Number(n||0).toFixed(2))),id=h.classId;
 const text={
  0:`每损失10%生命，受到伤害降低${f(r.orcMissingReduction*10)}%，连续计算，最高${f(r.orcMissingReduction*100)}%。`,
  4:`每层炙热使攻速提高${f(r.heatHaste*100)}%，受到治疗降低${f(r.heatHealPenalty*100)}%；炙热来源、上限和持续时间沿用当前技能。`,
  5:`有效伤害的${f(r.elfDamageHeal*100)}%转为受击目标附近${r.elfRadius}格内最低生命比例友军的治疗；有效治疗的${f(r.elfHealDamage*100)}%转为受疗目标附近${r.elfRadius}格内最近敌人的伤害。派生效果不递归触发。`,
  2:`技能先计算主目标的效果总量，再按命中人数衰减并均分。1～6人以上合计倍率分别为${r.shareTotals.slice(1).map(n=>f(n*100)+'%').join('、')}；同次命中的伤害、减益强度和位移使用相同分担比例。`,
  3:`每击杀1名英雄或累计${r.lordMinionKills}名非召唤小兵，恢复最大生命${f(r.lordKillHeal*100)}%，随机净化自身1个负面，并驱散最近有增益敌方的1个增益。`,
 };
 const cap=sim.config.heroes[4].skills[0].heatCap+sim.rank(h,'F17'),heat=h.heat||0;
 const status={0:`当前缺失生命${f((1-h.hp/h.maxHp)*100)}%，被动减伤${f((1-h.hp/h.maxHp)*r.orcMissingReduction*100)}%。`,4:`当前炙热${heat}/${cap}层，攻速提高${f(heat*r.heatHaste*100)}%，受疗降低${f(Math.min(1,heat*r.heatHealPenalty)*100)}%。`,3:`小兵击杀进度${h.innateMinionKills||0}/${r.lordMinionKills}；击杀英雄直接触发。`};
 return {innatePassive:text[id],passiveStatus:status[id]};
}

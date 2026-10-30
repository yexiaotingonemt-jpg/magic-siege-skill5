// Server-only causal records. WeakMaps retain original hero attribution without
// adding actor references/cycles to units or serialized battle snapshots.
const damageCredits=new WeakMap(),healers=new WeakMap();
const windowContains=(now,at,window)=>Number.isFinite(at)&&now-at>=0&&now-at<=window+1e-7;
function creditFor(target,source){
 let records=damageCredits.get(target);if(!records)damageCredits.set(target,records=new Map());
 let record=records.get(source.id);if(!record)records.set(source.id,record={source});
 return record;
}
export function recordEffectiveHeal(source,recipient,at){
 if(!source?.hero||source.side!==recipient.side)return;
 let records=healers.get(recipient);if(!records)healers.set(recipient,records=new Map());
 records.set(source.playerId,{source,at});
}
export function recordEffectiveHit(attacker,target,owner,at,window){
 if(!attacker||attacker.side===target.side)return;
 const existing=damageCredits.get(target);
 for(const [id,r] of existing||[])if(at-Math.max(r.directAt??-Infinity,r.hitAt??-Infinity)>window+1e-7)existing.delete(id);
 if(owner?.hero)creditFor(target,owner).directAt=at;
 for(const {source,at:healAt} of healers.get(attacker)?.values()||[]){
  if(source.side!==attacker.side||!windowContains(at,healAt,window))continue;
  const record=creditFor(target,source);
  if(record.healAt==null||healAt>=record.healAt){record.healAt=healAt;record.hitAt=at;}
 }
}
export function eligibleAssists(sim,target,killer){
 const now=sim.time,window=sim.config.world.assistWindow,byPlayer=new Map();
 const add=(source,at)=>{
  if(!source?.hero||source.side===target.side||source.playerId===killer?.playerId)return;
  const old=byPlayer.get(source.playerId);if(!old||at>old.at)byPlayer.set(source.playerId,{source,at});
 };
 const records=damageCredits.get(target);
 for(const r of records?.values()||[]){
  if(windowContains(now,r.directAt,window))add(r.source,r.directAt);
  if(windowContains(now,r.healAt,window)&&windowContains(now,r.hitAt,window))add(r.source,r.hitAt);
 }
 // Existing direct-damage timestamps remain readable for imported fixtures and
 // records from before this module started; do not reinterpret healing as hits.
 for(const [id,at] of Object.entries(target.contributors||{})){
  if(!windowContains(now,at,window)||byPlayer.has(Number(id)))continue;
  const p=sim.players[Number(id)];if(p)add(sim.hero(p),at);
 }
 return [...byPlayer.values()].map(r=>r.source);
}

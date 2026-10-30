const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const epsilon=1e-7;
export const MANUAL_TARGET_RANGE=20;
export const canSelectAllies=h=>!!h?.hero;

export function activeTaunter(sim,u){
 const target=u&&!u.tower&&u.tauntUntil>sim.time?sim.get(u.tauntId):null;
 return target&&target.side!==u.side?target:null;
}

// Shared by authoritative navigation and the read-only client skill preview.
export function manualTarget(sim,h,range=Infinity){
 if(!h||h.hp<=0||h.manualTargetId==null||activeTaunter(sim,h))return null;
 const target=sim.get(h.manualTargetId);
 return target&&(target.side!==h.side||canSelectAllies(h))&&distance(h,target)<=Math.min(MANUAL_TARGET_RANGE,range)+epsilon?target:null;
}

export function friendlyTarget(sim,h){
 const target=h&&sim.get(h.friendlyTargetId);
 return target&&target.side===h.side&&distance(h,target)<=MANUAL_TARGET_RANGE+epsilon?target:null;
}

// The selected enemy is shared by attacks, directed skills and the ground marker.
export function enemyTarget(sim,h){
 if(!h||h.hp<=0)return null;
 const taunter=activeTaunter(sim,h);if(taunter)return taunter;
 const explicit=manualAttackTarget(sim,h);if(explicit)return explicit;
 const current=sim.get(h.targetId);
 if(current&&current.side!==h.side&&(distance(h,current)<=(h.aggro??h.range)+epsilon||h.retaliationTargetId===current.id&&(h.attackerMemory?.[current.id]||0)>sim.time&&distance(h,current)<=sim.config.world.retaliationLeash))return current;
 return sim.enemies(h,h.aggro??h.range).sort((a,b)=>(a.hero?0:a.tower?2:1)-(b.hero?0:b.tower?2:1)||distance(h,a)-distance(h,b)||a.id-b.id)[0]||null;
}

// Resolve one hop only; never follow cycles or reuse an older attack lock.
export function targetForSide(sim,h,side,chosen=manualTarget(sim,h)||enemyTarget(sim,h)){
 if(!chosen||h.manualTargetId!=null&&!manualTarget(sim,h)&&!activeTaunter(sim,h))return null;
 const target=chosen.side===side?chosen:sim.get(chosen.targetId);
 return target?.side===side?target:null;
}

export function manualAttackTarget(sim,h){
 if(!h||h.hp<=0||activeTaunter(sim,h))return null;
 const selected=manualTarget(sim,h);
 const target=h.manualTargetId!=null?(selected?.side!==h.side?selected:null):h.manualAttackTargetId!=null?sim.get(h.manualAttackTargetId):null;
 return target&&target.side!==h.side&&distance(h,target)<=MANUAL_TARGET_RANGE+epsilon?target:null;
}

export function setManualTarget(sim,targetId,p=sim.player){
 const h=sim.hero(p),fail=message=>{sim.notice=message;return false;};
 if(!h)return fail('请先契约一个单位');
 if(activeTaunter(sim,h))return fail('嘲讽期间无法切换攻击目标');
 const target=Number.isInteger(targetId)?sim.get(targetId):null;
 if(!target)return fail('目标已离场');
 if(distance(h,target)>MANUAL_TARGET_RANGE+epsilon)return fail('目标超出手动锁定范围（20格）');
 h.manualTargetId=target.id;
 h.manualMoveTargetId=target.side===h.side?target.id:null;
 if(h.classId===5&&target.side===h.side)h.friendlyTargetId=target.id;
 const attack=manualAttackTarget(sim,h);
 h.manualAttackTargetId=attack?.id??null;h.targetId=attack?.id??null;h.retaliationTargetId=null;h.deploying=false;
 sim.notice='';return true;
}

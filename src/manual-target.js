const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const epsilon=1e-7;
export const MANUAL_TARGET_RANGE=20;
export const canSelectAllies=h=>!!h?.hero&&[0,5].includes(h.classId);

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

// Support targeting is independent from an already chosen attack target.
export function manualAttackTarget(sim,h){
 if(!h||h.hp<=0||activeTaunter(sim,h))return null;
 const target=h.manualAttackTargetId!=null?sim.get(h.manualAttackTargetId):manualTarget(sim,h);
 return target&&target.side!==h.side&&distance(h,target)<=MANUAL_TARGET_RANGE+epsilon?target:null;
}

export function setManualTarget(sim,targetId,p=sim.player){
 const h=sim.hero(p),fail=message=>{sim.notice=message;return false;};
 if(!h)return fail('请先契约一个单位');
 if(activeTaunter(sim,h))return fail('嘲讽期间无法切换攻击目标');
 const target=Number.isInteger(targetId)?sim.get(targetId):null;
 if(!target)return fail('目标已离场');
 if(target.side===h.side&&!canSelectAllies(h))return fail('该职业没有可作用友方的技能');
 if(distance(h,target)>MANUAL_TARGET_RANGE+epsilon)return fail('目标超出手动锁定范围（20格）');
 h.manualTargetId=target.id;
 if(target.side!==h.side){h.manualAttackTargetId=target.id;h.targetId=target.id;h.retaliationTargetId=null;h.deploying=false;}
 sim.notice='';return true;
}

export const TOWER_GUARD={thresholds:[.7,.3],duration:10,targets:3,damageReduction:.5};
export const towerGuardActive=(tower,time)=>!!tower.tower&&tower.hp>0&&tower.towerGuardUntil>time;

// Each threshold belongs to this tower's lifetime. Healing never rearms it.
// Called after health damage: the triggering hit is resolved before the buff.
export function triggerTowerGuard(tower,time){
 if(!tower.tower||tower.hp<=0)return [];
 const crossed=[];
 TOWER_GUARD.thresholds.forEach((threshold,i)=>{
  const bit=1<<i;
  // Scaled tower HP can round just above an exact 70%/30% boundary.
  if(!(tower.towerGuardTriggers&bit)&&tower.hp/tower.maxHp<=threshold+Number.EPSILON*4){tower.towerGuardTriggers=(tower.towerGuardTriggers||0)|bit;crossed.push(threshold);}
 });
 if(crossed.length){tower.towerGuardUntil=time+TOWER_GUARD.duration;tower.towerGuardStartedAt=time;}
 return crossed;
}

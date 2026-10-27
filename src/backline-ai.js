export const isBackline=u=>!!u&&!u.tower&&u.range>2;

// A screen is an enemy melee unit between the caster and the rear target.
// This is used to evaluate a spell's timing, never to bypass its targeting rules.
export function isScreened(sim,caster,target){
 const dx=target.x-caster.x,dy=target.y-caster.y,length2=dx*dx+dy*dy;
 if(length2<1e-8)return false;
 return sim.units.some(u=>{
  if(u.hp<=0||u.side!==target.side||u.id===target.id||u.range>2)return false;
  const projection=((u.x-caster.x)*dx+(u.y-caster.y)*dy)/length2;
  if(projection<=0||projection>=1)return false;
  return Math.hypot(u.x-caster.x-projection*dx,u.y-caster.y-projection*dy)<=2.5;
 });
}

export function backlineSkillScore(sim,h,plan){
 const {id,s,t,skill:i}=plan;
 if(!t)return null;
 const rear=isBackline(t),exposed=rear&&!isScreened(sim,h,t);
 const affected=sim.enemies({...t,side:h.side},s.radius||0).filter(u=>!u.tower);
 const backlineCount=affected.filter(isBackline).length;
 if(id===0&&i===2){
  if(rear)return 8+Number(!!t.hero)+Number(exposed);
  if(t.channelUntil>sim.time)return 8;
 }
 if(id===1&&i===1&&rear)return 7+Number(exposed)+Number(t.hp/t.maxHp>s.threshold);
 if(id===1&&i===3&&backlineCount>0){
  if(affected.length>=3||backlineCount>=2)return 7+Math.min(3,backlineCount)+Number(affected.some(u=>u.hero&&u.classId===5));
  return 1; // Save a three-stamina area spell for a meaningful group.
 }
 if(id===4&&i===2){
  if(rear||backlineCount>0)return 7+Math.min(3,backlineCount)+Number(exposed)+Number(t.channelUntil>sim.time);
  // Keep the long-range cooldown for the rear unless a channel can be
  // interrupted or a full group is already within the locked impact area.
  return t.channelUntil>sim.time?8:affected.length>=s.targets?4:0;
 }
 return null;
}

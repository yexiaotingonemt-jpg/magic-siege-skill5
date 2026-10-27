// Preserve attack progress when the strongest active slow changes.
export function adjustAttackCooldown(unit,time,previous,next){
 if(unit.cd>time&&previous!==next)unit.cd=time+(unit.cd-time)*Math.max(.1,1-previous)/Math.max(.1,1-next);
 unit.cooldownSlowRatio=next;
}

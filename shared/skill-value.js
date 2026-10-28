// All targets, ticks and secondary effects from one cast share one allowance.
export const SKILL_VALUE={perStamina:1600,peakMultiplier:1.25,version:5};
export const available=value=>value?Math.max(0,value.limit-value.spent):Infinity;
export function spend(value,amount,kind){
 const result=Math.max(0,Math.min(Number.isFinite(amount)?amount:0,available(value)));
 if(value&&result){value.spent+=result;value.parts[kind]=(value.parts[kind]||0)+result;}
 return result;
}
export function createSkillValue(h,skill,rank,time){
 const growth=1+skill.levelGrowth*(Math.max(1,rank)-1),base=h.attack*SKILL_VALUE.perStamina/100*skill.cost*growth;
 return {sourceId:h.id,classId:h.classId,time,attack:h.attack,rank,cost:skill.cost,base,limit:base*SKILL_VALUE.peakMultiplier,spent:0,parts:{}};
}

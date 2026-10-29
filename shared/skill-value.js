// A cast ledger records effects; local skill rules govern size, never a shared cap.
export const SKILL_VALUE={perStamina:1000,peakMultiplier:1,version:6};
export const available=value=>value?.limit==null?Infinity:Math.max(0,value.limit-value.spent);
export function spend(value,amount,kind){
 const result=Math.max(0,Math.min(Number.isFinite(amount)?amount:0,available(value)));
 if(value&&result){value.spent+=result;value.parts[kind]=(value.parts[kind]||0)+result;}
 return result;
}
export function createSkillValue(h,skill,rank,time){
 const base=h.attack*10*skill.cost;
 return {sourceId:h.id,classId:h.classId,time,attack:h.attack,rank:1,cost:skill.cost,base,limit:null,spent:0,parts:{}};
}

// 只裁剪发给客户端的副本；权威战斗对象、账本和已排队技能保持原样。
const serverFields=new Set(['settledReport','innateScoreBase','currentScoreBase','contributors','support','attackerMemory','stats','deathDone']);
const coordinateFields=new Set(['x','y','tx','ty']);

export function clientSnapshot(value,time){
 if(Array.isArray(value))return value.map(item=>clientSnapshot(item,time));
 if(!value||typeof value!=='object')return value;
 // 客户端只通过可用额度判断状态/蓄盾显示，不需要整份施法账本和技能说明。
 if(Object.hasOwn(value,'spent')&&Object.hasOwn(value,'parts')&&Object.hasOwn(value,'sourceId'))return {limit:value.limit,spent:value.spent};
 const result={};
 for(const [key,item]of Object.entries(value)){
  if(serverFields.has(key))continue;
  if(key==='config')result[key]=item;
  else if(key==='debuffs'||key==='hastes'){
   result[key]=Object.fromEntries(Object.entries(item||{}).filter(([,effect])=>effect.until>time).map(([id,effect])=>[id,clientSnapshot(effect,time)]));
  }else if(coordinateFields.has(key)&&Number.isFinite(item)){
   // 千分之一格小于一个屏幕像素，避免同步浮点运算产生的十余位尾数。
   result[key]=Math.round(item*1000)/1000;
  }else result[key]=clientSnapshot(item,time);
 }
 return result;
}

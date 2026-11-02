// Full reports stay on the server and are paged separately from battle snapshots.
function histories(sim){
 if(sim.contractHistories)return sim.contractHistories;
 sim.contractHistoryPartial=sim.reports.length>0;
 const result=sim.contractHistories=new Map();
 // Recover the available reports when an existing battle is updated in place.
 for(const [index,report] of [...sim.reports].reverse().entries()){
  const candidates=sim.players.filter(p=>report.playerId!=null?p.id===report.playerId:p.name===report.name);
  if(candidates.length!==1)continue;
  const id=candidates[0].id,rows=result.get(id)||[];
  report.contractId??=`prior-${index}`;rows.push(report);result.set(id,rows);
 }
 return result;
}
export function recordContractReport(sim,hero,report){
 const store=histories(sim),rows=store.get(hero.playerId)||[];
 Object.assign(report,{playerId:hero.playerId,contractId:String(hero.id),contractAt:hero.contractAt,level:sim.players[hero.playerId].progress[hero.classId].level});
 rows.push(report);store.set(hero.playerId,rows);
}
function summary(sim,report,number,current=false){
 const parts=report.parts.map(p=>({...p})),points=parts.reduce((n,p)=>n+p.points,0),stamina=parts.find(p=>p.key==='staminaSpent');
 const spent=stamina?.value||0,battlePoints=points-(stamina?.points||0),modern=!!sim.config.design?.enabled,standard=sim.config.design?.rules.standardStamina||21;
 return {id:report.contractId,number,numberKnown:!sim.contractHistoryPartial,classId:report.classId,level:report.level??null,start:report.contractAt??null,end:current?null:report.time,duration:report.contractAt==null?null:Math.max(0,report.time-report.contractAt),reason:current?'进行中':report.reason,current,points,battlePoints,staminaSpent:spent,kda:modern?battlePoints/Math.max(spent,standard):spent>0?points/spent:null,kdaMode:modern?'battle':'legacy',parts};
}
export function contractHistoryPage(sim,player,{before=null,limit=20}={}){
 const rows=histories(sim).get(player.id)||[],hero=sim.hero(player);
 const current=hero?.hp>0&&!hero.settledReport?{contractId:String(hero.id),classId:hero.classId,level:player.progress[hero.classId].level,contractAt:hero.contractAt,time:sim.time,parts:sim.ratingParts(hero)}:null;
 let end=rows.length;
 if(before!=null){
  if(current?.contractId===before)end=rows.length;
  else {end=rows.findIndex(r=>r.contractId===before);if(end<0)throw Error('契约记录游标已失效，请重新打开');}
 }
 const entries=[];
 if(before==null&&current)entries.push(summary(sim,current,rows.length+1,true));
 for(let i=end-1;i>=0&&entries.length<limit;i--)entries.push(summary(sim,rows[i],i+1));
 const last=entries.at(-1),more=last?rows.findIndex(r=>r.contractId===last.id)>0:false;
 return {entries,total:rows.length+(current?1:0),partial:sim.contractHistoryPartial,nextCursor:more?last.id:null};
}

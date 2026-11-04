import {levelKdaReference,LEVEL_RATING_REVISION} from './contract-rating-reference.js';

export const KDA_RATINGS = Object.freeze([
  {grade:'S',label:'卓越',min:1.5},
  {grade:'A',label:'优秀',min:1.2},
  {grade:'B',label:'良好',min:1},
  {grade:'C',label:'合格',min:.8},
  {grade:'D',label:'待提升',min:0},
]);

export function kdaRating(kda,level) {
  const referenceKda=levelKdaReference(level);
  if (!Number.isFinite(kda)||referenceKda==null) return null;
  const ratio=kda/referenceKda;
  // Absorb floating-point error from the score ledger at exact boundaries.
  const epsilon=Number.EPSILON*Math.max(1,Math.abs(kda),referenceKda)*8;
  const {grade,label}=KDA_RATINGS.find(r=>kda+epsilon>=referenceKda*r.min)||KDA_RATINGS.at(-1);
  return {grade,label,level,referenceKda,ratio,referenceRevision:LEVEL_RATING_REVISION};
}

export function contractEvaluation(config,parts,{level}={}) {
  const points=parts.reduce((sum,p)=>sum+p.points,0),stamina=parts.find(p=>p.key==='staminaSpent');
  const staminaSpent=stamina?.value||0,battlePoints=points-(stamina?.points||0);
  const kda=config.design?.enabled
    ?battlePoints/Math.max(staminaSpent,config.design.rules.standardStamina||21)
    :staminaSpent>0?points/staminaSpent:null;
  return {points,battlePoints,staminaSpent,kda,rating:config.design?.enabled?kdaRating(kda,level):null};
}

export function updateContractEvaluation(sim,report) {
  Object.assign(report,contractEvaluation(sim.config,report.parts,{level:report.level}));
  const p=sim.players[report.playerId];
  if (p?.lastContractResult?.contractId===report.contractId)
    Object.assign(p.lastContractResult,{kda:report.kda,rating:report.rating});
}

// Retained battles may contain an old fixed-score summary. Derive the visible
// result from its original report without changing battle or score state.
export function latestContractResult(sim,p){
  const result=p.lastContractResult;
  if(!result)return result;
  const latest=sim.contractHistories?.get(p.id)?.at(-1);
  const report=latest?.contractId===result.contractId?latest:sim.reports.find(r=>r.playerId===p.id&&r.contractId===result.contractId);
  if(!report)return {...result,rating:null};
  const {kda,rating}=contractEvaluation(sim.config,report.parts,{level:report.level});
  return {...result,kda,rating};
}

export const KDA_RATINGS = Object.freeze([
  {grade:'S',label:'卓越',min:150},
  {grade:'A',label:'优秀',min:100},
  {grade:'B',label:'良好',min:60},
  {grade:'C',label:'合格',min:30},
  {grade:'D',label:'待提升',min:0},
]);

export function kdaRating(kda) {
  if (!Number.isFinite(kda)) return null;
  const {grade,label}=KDA_RATINGS.find(r=>kda>=r.min)||KDA_RATINGS.at(-1);
  return {grade,label};
}

export function contractEvaluation(config,parts) {
  const points=parts.reduce((sum,p)=>sum+p.points,0),stamina=parts.find(p=>p.key==='staminaSpent');
  const staminaSpent=stamina?.value||0,battlePoints=points-(stamina?.points||0);
  const kda=config.design?.enabled
    ?battlePoints/Math.max(staminaSpent,config.design.rules.standardStamina||21)
    :staminaSpent>0?points/staminaSpent:null;
  return {points,battlePoints,staminaSpent,kda,rating:kdaRating(kda)};
}

export function updateContractEvaluation(sim,report) {
  Object.assign(report,contractEvaluation(sim.config,report.parts));
  const p=sim.players[report.playerId];
  if (p?.lastContractResult?.contractId===report.contractId)
    Object.assign(p.lastContractResult,{kda:report.kda,rating:report.rating});
}

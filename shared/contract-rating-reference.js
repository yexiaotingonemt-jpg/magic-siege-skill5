// One shared curve for every class. Equal-weight samples of all five classes,
// current rules, 60 seconds, 18 casting stamina + 3 contract stamina.
// Reproduction and scope: docs/rules/12-ratings-and-scores.md.
export const LEVEL_RATING_REVISION='equal-level-owner-check-20261104';
export const LEVEL_RATING_CONFIG_SHA256='321ce9f48180a01ef6e239dba7ea16295e5eb06086da5f5979f2d4d6ef519d09';
export const LEVEL_KDA_REFERENCE=Object.freeze([
  {level:0,kda:139.20219856503257},
  {level:5,kda:166.10222021700102},
  {level:10,kda:236.19552867400313},
  {level:20,kda:368.46551265926576},
  {level:30,kda:481.0068638776671},
  {level:40,kda:605.3697843253384},
]);

export function levelKdaReference(level){
  if(!Number.isInteger(level)||level<0||level>40)return null;
  const upper=LEVEL_KDA_REFERENCE.findIndex(p=>p.level>=level);
  if(upper===0)return LEVEL_KDA_REFERENCE[0].kda;
  const a=LEVEL_KDA_REFERENCE[upper-1],b=LEVEL_KDA_REFERENCE[upper];
  return a.kda+(b.kda-a.kda)*(level-a.level)/(b.level-a.level);
}

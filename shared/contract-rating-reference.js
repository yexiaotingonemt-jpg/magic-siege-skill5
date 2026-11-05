// One shared curve for every class. Equal-weight samples of all five classes,
// current rules, 60 seconds, 18 casting stamina + 3 contract stamina.
// Reproduction and scope: docs/rules/12-ratings-and-scores.md.
export const LEVEL_RATING_REVISION='equal-level-upgrade-pools-20261105';
export const LEVEL_RATING_CONFIG_SHA256='f979d862594d8aefcf8d1b51d1958c534767e2d3c2df62fa9fec8c2318bfa44c';
export const LEVEL_KDA_REFERENCE=Object.freeze([
  {level:0,kda:139.20219856503257},
  {level:5,kda:171.91837553051764},
  {level:10,kda:192.38797853231785},
  {level:20,kda:261.3666090622214},
  {level:30,kda:362.4506124739608},
  {level:40,kda:503.3219215364002},
]);

export function levelKdaReference(level){
  if(!Number.isInteger(level)||level<0||level>40)return null;
  const upper=LEVEL_KDA_REFERENCE.findIndex(p=>p.level>=level);
  if(upper===0)return LEVEL_KDA_REFERENCE[0].kda;
  const a=LEVEL_KDA_REFERENCE[upper-1],b=LEVEL_KDA_REFERENCE[upper];
  return a.kda+(b.kda-a.kda)*(level-a.level)/(b.level-a.level);
}

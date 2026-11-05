// One shared curve for every class. Equal-weight samples of all five classes,
// current rules, 60 seconds, 18 casting stamina + 3 contract stamina.
// Reproduction and scope: docs/rules/12-ratings-and-scores.md.
export const LEVEL_RATING_REVISION='equal-level-stamina-double-20261105';
export const LEVEL_RATING_CONFIG_SHA256='e2a97db6c16fee074458332e7effd10f4172c0188672cc129601bc99eaed42f9';
export const LEVEL_KDA_REFERENCE=Object.freeze([
  {level:0,kda:139.83976673911258},
  {level:5,kda:172.61401368774213},
  {level:10,kda:193.18016052149082},
  {level:20,kda:262.4479157067604},
  {level:30,kda:366.5033754377846},
  {level:40,kda:507.28016783917815},
]);

export function levelKdaReference(level){
  if(!Number.isInteger(level)||level<0||level>40)return null;
  const upper=LEVEL_KDA_REFERENCE.findIndex(p=>p.level>=level);
  if(upper===0)return LEVEL_KDA_REFERENCE[0].kda;
  const a=LEVEL_KDA_REFERENCE[upper-1],b=LEVEL_KDA_REFERENCE[upper];
  return a.kda+(b.kda-a.kda)*(level-a.level)/(b.level-a.level);
}

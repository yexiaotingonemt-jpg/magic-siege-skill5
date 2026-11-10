// One shared curve for every class. Equal-weight samples of all five classes,
// current rules, 60 seconds, 18 casting stamina + 3 contract stamina.
// Reproduction and scope: docs/rules/12-ratings-and-scores.md.
export const LEVEL_RATING_REVISION='equal-level-elf-target-20261110';
export const LEVEL_RATING_CONFIG_SHA256='0e29c618f4310c82b381d7abe7a9cbb25c0ca63f55ec0950dad74e8e4dcee691';
export const LEVEL_KDA_REFERENCE=Object.freeze([
  {level:0,kda:152.23837682342628},
  {level:5,kda:186.57026247342458},
  {level:10,kda:209.0371296272114},
  {level:20,kda:281.64082628829425},
  {level:30,kda:385.7706542909829},
  {level:40,kda:536.0516488839637},
]);

export function levelKdaReference(level){
  if(!Number.isInteger(level)||level<0||level>40)return null;
  const upper=LEVEL_KDA_REFERENCE.findIndex(p=>p.level>=level);
  if(upper===0)return LEVEL_KDA_REFERENCE[0].kda;
  const a=LEVEL_KDA_REFERENCE[upper-1],b=LEVEL_KDA_REFERENCE[upper];
  return a.kda+(b.kda-a.kda)*(level-a.level)/(b.level-a.level);
}

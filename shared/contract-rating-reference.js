// One shared curve for every class. Equal-weight samples of all five classes,
// current rules, 60 seconds, 18 casting stamina + 3 contract stamina.
// Reproduction and scope: docs/rules/12-ratings-and-scores.md.
export const LEVEL_RATING_REVISION='equal-level-elf-link-20261105';
export const LEVEL_RATING_CONFIG_SHA256='ffc462ee5acbaf018fc0cbc396f546778c0bcd05f7e868f691142cb7d6ca858c';
export const LEVEL_KDA_REFERENCE=Object.freeze([
  {level:0,kda:139.83976673911258},
  {level:5,kda:166.8051391289242},
  {level:10,kda:236.95764714883225},
  {level:20,kda:371.1096230380823},
  {level:30,kda:487.3675523049762},
  {level:40,kda:610.6765719932525},
]);

export function levelKdaReference(level){
  if(!Number.isInteger(level)||level<0||level>40)return null;
  const upper=LEVEL_KDA_REFERENCE.findIndex(p=>p.level>=level);
  if(upper===0)return LEVEL_KDA_REFERENCE[0].kda;
  const a=LEVEL_KDA_REFERENCE[upper-1],b=LEVEL_KDA_REFERENCE[upper];
  return a.kda+(b.kda-a.kda)*(level-a.level)/(b.level-a.level);
}

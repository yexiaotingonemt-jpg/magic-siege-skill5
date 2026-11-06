// One shared curve for every class. Equal-weight samples of all five classes,
// current rules, 60 seconds, 18 casting stamina + 3 contract stamina.
// Reproduction and scope: docs/rules/12-ratings-and-scores.md.
export const LEVEL_RATING_REVISION='equal-level-elf-healing-score-20261106';
export const LEVEL_RATING_CONFIG_SHA256='cd760508e250a98a8c279a532a935882e4724d9717c40b90c955c89955d70f16';
export const LEVEL_KDA_REFERENCE=Object.freeze([
  {level:0,kda:149.86218482342625},
  {level:5,kda:184.17610771101127},
  {level:10,kda:206.80245715797477},
  {level:20,kda:278.6430659454391},
  {level:30,kda:386.9874039275762},
  {level:40,kda:534.860706520072},
]);

export function levelKdaReference(level){
  if(!Number.isInteger(level)||level<0||level>40)return null;
  const upper=LEVEL_KDA_REFERENCE.findIndex(p=>p.level>=level);
  if(upper===0)return LEVEL_KDA_REFERENCE[0].kda;
  const a=LEVEL_KDA_REFERENCE[upper-1],b=LEVEL_KDA_REFERENCE[upper];
  return a.kda+(b.kda-a.kda)*(level-a.level)/(b.level-a.level);
}

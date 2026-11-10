// One shared curve for every class. Equal-weight samples of all five classes,
// current rules, 60 seconds, 18 casting stamina + 3 contract stamina.
// Reproduction and scope: docs/rules/12-ratings-and-scores.md.
export const LEVEL_RATING_REVISION='equal-level-elf-link-affixes-20261110';
export const LEVEL_RATING_CONFIG_SHA256='1f061c8e985d46229a8d9af774ee689b5a7efcdb3173bd8e6031a3625fb6c35e';
export const LEVEL_KDA_REFERENCE=Object.freeze([
  {level:0,kda:149.86218482342625},
  {level:5,kda:184.17610771101127},
  {level:10,kda:204.4418573451189},
  {level:20,kda:278.4822296339847},
  {level:30,kda:388.2719605672249},
  {level:40,kda:534.8317758539173},
]);

export function levelKdaReference(level){
  if(!Number.isInteger(level)||level<0||level>40)return null;
  const upper=LEVEL_KDA_REFERENCE.findIndex(p=>p.level>=level);
  if(upper===0)return LEVEL_KDA_REFERENCE[0].kda;
  const a=LEVEL_KDA_REFERENCE[upper-1],b=LEVEL_KDA_REFERENCE[upper];
  return a.kda+(b.kda-a.kda)*(level-a.level)/(b.level-a.level);
}

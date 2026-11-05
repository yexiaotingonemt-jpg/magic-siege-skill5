// One shared curve for every class. Equal-weight samples of all five classes,
// current rules, 60 seconds, 18 casting stamina + 3 contract stamina.
// Reproduction and scope: docs/rules/12-ratings-and-scores.md.
export const LEVEL_RATING_REVISION='equal-level-elf-link-stacking-20261105';
export const LEVEL_RATING_CONFIG_SHA256='211856b8725544da511c8231a1af7b8f123accbb77c7378cd5d0624c24739e1a';
export const LEVEL_KDA_REFERENCE=Object.freeze([
  {level:0,kda:138.88864044663256},
  {level:5,kda:171.5510486814083},
  {level:10,kda:191.84152413754194},
  {level:20,kda:260.5725322990422},
  {level:30,kda:360.0329717840447},
  {level:40,kda:502.66397287809565},
]);

export function levelKdaReference(level){
  if(!Number.isInteger(level)||level<0||level>40)return null;
  const upper=LEVEL_KDA_REFERENCE.findIndex(p=>p.level>=level);
  if(upper===0)return LEVEL_KDA_REFERENCE[0].kda;
  const a=LEVEL_KDA_REFERENCE[upper-1],b=LEVEL_KDA_REFERENCE[upper];
  return a.kda+(b.kda-a.kda)*(level-a.level)/(b.level-a.level);
}

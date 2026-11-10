// One shared curve for every class. Equal-weight samples of all five classes,
// current rules, 60 seconds, 18 casting stamina + 3 contract stamina.
// Reproduction and scope: docs/rules/12-ratings-and-scores.md.
export const LEVEL_RATING_REVISION='equal-level-elf-link-refresh-20261110';
export const LEVEL_RATING_CONFIG_SHA256='5f9b0d746844d071064e071f7f294e37c1cba03fad64737977dbe2c39c587ea9';
export const LEVEL_KDA_REFERENCE=Object.freeze([
  {level:0,kda:149.86218482342625},
  {level:5,kda:183.89013839398015},
  {level:10,kda:205.67142828834477},
  {level:20,kda:276.80058674150933},
  {level:30,kda:377.0465934432828},
  {level:40,kda:528.3815086013435},
]);

export function levelKdaReference(level){
  if(!Number.isInteger(level)||level<0||level>40)return null;
  const upper=LEVEL_KDA_REFERENCE.findIndex(p=>p.level>=level);
  if(upper===0)return LEVEL_KDA_REFERENCE[0].kda;
  const a=LEVEL_KDA_REFERENCE[upper-1],b=LEVEL_KDA_REFERENCE[upper];
  return a.kda+(b.kda-a.kda)*(level-a.level)/(b.level-a.level);
}

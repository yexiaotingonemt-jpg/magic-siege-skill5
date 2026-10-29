// Calibrated against the 5/20/40-level base-skill reference in
// docs/rules/12-ratings-and-scores.md. No per-contract or per-metric cap.
export const STAMINA_POINTS = 100;
export const MINION_REFERENCE_HP = 4000;
// Joint medium-frequency calibration: the orc retains 35% of its initial
// taken coefficient; other classes retain 28%. See the rules for scope.
export const SCORE_COEFFICIENTS = [
  {a:.06067250,b:.03164385,c:.020000,d:242.6900,e:200,f:100}, // Orc
  {a:.021456,b:.01006880,c:.020000,d:85.824,e:200,f:100},  // Disabled giant: provisional mage coefficients
  {a:.025749,b:.01216292,c:.020000,d:102.996,e:200,f:100}, // Siege
  {a:.02085360,b:.00298844,c:.020000,d:83.4144,e:200,f:100}, // Lord
  {a:.02896560,b:.01006880,c:.020000,d:115.8624,e:200,f:100}, // Fire
  {a:.02563300,b:.00886480,c:.06392070,d:102.5320,e:200,f:100}, // Elf
  {a:.021456,b:.01006880,c:.020000,d:85.824,e:200,f:100},  // Disabled assassin: provisional mage coefficients
];
export function statPoints(classId,key,value){
  const c=SCORE_COEFFICIENTS[classId];
  const coefficient={heroDamage:c.a,minionDamage:c.a,buildingDamage:c.a,
    damageTaken:c.b,healing:c.c,minionKillHealth:c.d/MINION_REFERENCE_HP,
    heroKills:c.e,heroAssists:c.f,staminaSpent:STAMINA_POINTS}[key]??0;
  return value*coefficient;
}
export function contributionParts(h){
  const c=SCORE_COEFFICIENTS[h.classId],s=h.stats||{};
  return [
    {key:'damage',value:(s.heroDamage||0)+(s.minionDamage||0)+(s.buildingDamage||0),coefficient:c.a},
    {key:'damageTaken',value:s.damageTaken||0,coefficient:c.b},
    {key:'healing',value:s.healing||0,coefficient:c.c},
    {key:'minionKillHealth',value:s.minionKillHealth||0,coefficient:c.d/MINION_REFERENCE_HP,count:s.minionKills||0},
    {key:'heroKills',value:s.heroKills||0,coefficient:c.e},
    {key:'heroAssists',value:s.heroAssists||0,coefficient:c.f},
    {key:'staminaSpent',value:s.staminaSpent||0,coefficient:STAMINA_POINTS},
  ].map(p=>({...p,points:p.value*p.coefficient}));
}

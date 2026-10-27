// Raise only aimed spells that previously could not reach the normal attack line.
export const SKILL_RANGE_FIXES=[
 {classId:2,skill:0,key:'targetRange'},
 {classId:2,skill:3,key:'targetRange'},
 {classId:4,skill:0,key:'radius'},
 {classId:5,skill:0,key:'radius'}
];
export function upgradeSkillRanges(config,storage){
 if(storage.getItem('magicSiegeSkillRangesV19')==='1')return config;
 for(const {classId,skill,key} of SKILL_RANGE_FIXES){const hero=config.heroes[classId];hero.skills[skill][key]=Math.max(hero.skills[skill][key],hero.range);}
 if(storage.getItem('magicSiegeConfigV11'))storage.setItem('magicSiegeConfigV11',JSON.stringify(config));
 storage.setItem('magicSiegeSkillRangesV19','1');return config;
}

export const SKILL_PROGRESSION=[{unlock:1,maxRank:1},{unlock:1,maxRank:1},{unlock:1,maxRank:1},{unlock:5,maxRank:1}];
export const skillRankLevels=i=>[SKILL_PROGRESSION[i].unlock];
export const planSkillUpgrade=()=>({ok:false,code:'traits',reason:'升级获得词条选择；基础技能无需加点'});

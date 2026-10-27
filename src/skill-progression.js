// Hero-level gates for each skill rank, shared by player/bot logic and the HUD.
export const SKILL_PROGRESSION=[
 {unlock:1,interval:2,maxRank:4},
 {unlock:2,interval:2,maxRank:4},
 {unlock:4,interval:2,maxRank:4},
 {unlock:6,interval:3,maxRank:3}
];
export const skillRankLevels=i=>Array.from({length:SKILL_PROGRESSION[i].maxRank},(_,rank)=>SKILL_PROGRESSION[i].unlock+rank*SKILL_PROGRESSION[i].interval);

export function planSkillUpgrade(player,i){
 if(!Number.isInteger(i)||!SKILL_PROGRESSION[i])return {ok:false,code:'invalid',reason:'无效技能'};
 const rule=SKILL_PROGRESSION[i],rank=player.builds[player.classId][i],nextRank=rank+1;
 if(rank>=rule.maxRank)return {ok:false,code:'cap',reason:'技能已满级',nextRank:null,requiredLevel:null};
 const requiredLevel=rule.unlock+(nextRank-1)*rule.interval,base={nextRank,requiredLevel};
 if(player.level<requiredLevel)return {...base,ok:false,code:'level',reason:`英雄${requiredLevel}级可升至技能${nextRank}级`};
 if(player.points<1)return {...base,ok:false,code:'points',reason:`技能点不足；升至技能${nextRank}级需要1点`};
 return {...base,ok:true,code:'ready',reason:`消耗1技能点，升至技能${nextRank}级（英雄${requiredLevel}级可加）`};
}

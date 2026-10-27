export const botModes=[
 {id:0,name:'常态',rule:'进攻6人，防守2人'},
 {id:1,name:'进攻方人多',rule:'防守1～3人；进攻为防守的5～8倍'},
 {id:2,name:'防守方人多',rule:'进攻1～5人；防守为进攻的0.5～1.5倍'},
 {id:3,name:'巅峰',rule:'进攻39人，防守13人'},
 {id:4,name:'无单位',rule:'无机器人英雄；保留普通兵线和体验玩家'},
 {id:5,name:'自定义人数',rule:'使用体验参数中手动设置的双方机器人人数'}
];
export function populationFor(mode,random=Math.random){
 const integer=(min,max)=>min+Math.floor(random()*(max-min+1));
 if(mode===0)return {attackBots:6,defenseBots:2};
 if(mode===3)return {attackBots:39,defenseBots:13};
 if(mode===4)return {attackBots:0,defenseBots:0};
 if(mode===1){const defenseBots=integer(1,3);return {defenseBots,attackBots:integer(defenseBots*5,defenseBots*8)};}
 if(mode===2){const attackBots=integer(1,5);return {attackBots,defenseBots:integer(Math.ceil(attackBots*.5),Math.floor(attackBots*1.5))};}
 throw Error('未知机器人人数模式');
}
export function applyBotMode(config,mode,random=Math.random){
 if(!botModes.some(m=>m.id===mode))throw Error('未知机器人人数模式');
 if(mode!==5)Object.assign(config.world,populationFor(mode,random));
 config.world.botMode=mode;return config;
}
export function inferBotMode(world){
 for(const mode of [0,3,4]){const n=populationFor(mode);if(n.attackBots===world.attackBots&&n.defenseBots===world.defenseBots)return mode;}
 return 5;
}

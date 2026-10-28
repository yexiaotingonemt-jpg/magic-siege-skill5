import {defaults,clone,validateConfig} from './config.js';
import {inferBotMode,applyBotMode} from './bot-population.js';
export const CONFIG_KEY='magicSiegeSkill4ConfigV1';
export const LEGACY_CONFIG_KEYS=['magicSiegeSkill3BacklineConfigV4','magicSiegeSkill3BalancedConfigV3','magicSiegeSkill3BalancedConfigV2','magicSiegeSkill3ConfigV1'];
function normalize(value){
 const next=clone(value);next.world.botMode??=next.world.attackBots===12&&next.world.defenseBots===4?0:inferBotMode(next.world);next.world.expCostMultiplier??=defaults.world.expCostMultiplier;
 // A saved normal preset follows its current population; custom modes retain
 // their explicit counts, HP, attack and other tuning values.
 if(next.world.botMode===0)applyBotMode(next,0);
 for(const key of Object.keys(defaults.world))next.world[key]??=defaults.world[key];
 return next;
}
export function migrateSkill4Config(value){
 const next=normalize(value);next.world.skillDesignVersion=4;
 next.heroes.forEach((hero,id)=>{hero.skills=clone(defaults.heroes[id].skills);});
 return validateConfig(next);
}
export function importConfig(value){return value?.world?.skillDesignVersion===4?validateConfig(normalize(value)):migrateSkill4Config(value);}
export function loadConfig(storage){
 const current=storage.getItem(CONFIG_KEY);if(current)return importConfig(JSON.parse(current));
 for(const key of LEGACY_CONFIG_KEYS){const raw=storage.getItem(key);if(raw)return migrateSkill4Config(JSON.parse(raw));}
 return clone(defaults);
}

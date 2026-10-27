import {defaults,contractType} from './config.js';

// One-time upgrade of saved configurations; later player edits remain editable.
export function upgradeFormationRanges(config,storage){
 if(storage.getItem('magicSiegeRangesV16')==='1')return config;
 for(const type of ['melee','ranged','siege'])for(const key of ['range','aggro'])config.troops[type][key]=defaults.troops[type][key];
 config.heroes.forEach((hero,id)=>{const row=defaults.troops[contractType(id)];hero.range=row.range;hero.aggro=row.aggro;});
 config.tower.range=defaults.tower.range;
 if(storage.getItem('magicSiegeConfigV11'))storage.setItem('magicSiegeConfigV11',JSON.stringify(config));
 storage.setItem('magicSiegeRangesV16','1');
 return config;
}

import {available} from '../../shared/skill-value.js';

// Count independent outgoing links, including repeat links to the same ally.
export function elfLinkCount(sim,hero=sim.hero()){
 if(!hero||hero.hp<=0||hero.classId!==5)return 0;
 return sim.fields.filter(f=>{
  if(f.kind!=='link'||f.owner.id!==hero.id||f.until<=sim.time||available(f.value)<=1e-7)return false;
  const target=sim.get(f.host);
  return target&&Math.hypot(hero.x-target.x,hero.y-target.y)<=(f.breakRange??Infinity);
 }).length;
}

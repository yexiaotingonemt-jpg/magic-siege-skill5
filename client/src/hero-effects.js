import {unitStatuses} from './unit-status.js';
import {createStatusReservoirs,statusDetail} from './status-reservoir.js';

// Transient effects float over the battlefield, without reserving HUD space.
export function createHeroEffects(container){
 const chips=new Map(),reservoirs=createStatusReservoirs();
 return {update(sim){
  const hero=sim.hero(),statuses=hero?unitStatuses(sim,hero).filter(status=>Number.isFinite(status.until)):[],active=new Set();reservoirs.begin(sim.matchId);
  for(const status of statuses){
   const key=hero.id+':'+status.id;active.add(key);let chip=chips.get(key);
   if(!chip){chip=document.createElement('span');chip.className='hero-effect';chip.dataset.effect=status.id;chip.setAttribute('role','img');chips.set(key,chip);container.append(chip);}
   chip.dataset.tone=status.tone;
   chip.textContent=status.name;chip.dataset.stacks=status.stacks||'';
   const ratio=reservoirs.sample(key,status.until,sim.time);chip.style.setProperty('--reservoir-fill',(ratio*100)+'%');chip.dataset.fillRatio=ratio;
   chip.title=status.name+' · '+statusDetail(status);chip.setAttribute('aria-label',chip.title);
  }
  for(const [id,chip]of chips)if(!active.has(id)){chip.remove();chips.delete(id);}
  reservoirs.prune(active);
  container.hidden=!statuses.length;
 }};
}

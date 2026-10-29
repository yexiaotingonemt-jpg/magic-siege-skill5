import {activeTaunter,manualTarget,manualAttackTarget,friendlyTarget} from './manual-target.js';
import {inAttackRange} from './attack-range.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const category=u=>u.hero?0:u.tower?2:1;
export const cannotAct=(u,time)=>u.stunUntil>time||u.castUntil>time||u.channelUntil>time;

// 普通索敌只在当前目标丢失、嘲讽结束或没有目标时执行。
export function chooseTarget(sim,u){
 const radius=u.aggro??u.range;
 if(u.friendlyTargetId!=null&&!friendlyTarget(sim,u))u.friendlyTargetId=null;
 const taunter=activeTaunter(sim,u);
 if(taunter){u.manualTargetId=null;u.manualAttackTargetId=null;u.friendlyTargetId=null;u.wasTaunted=true;u.retaliationTargetId=null;return taunter;}
 if(u.wasTaunted){u.wasTaunted=false;u.manualTargetId=null;u.manualAttackTargetId=null;u.targetId=null;u.retaliationTargetId=null;}
 const selected=manualTarget(sim,u);
 const attackSelected=manualAttackTarget(sim,u);
 if(u.manualTargetId!=null&&(!selected||!attackSelected)){
  u.manualTargetId=null;u.manualAttackTargetId=null;u.friendlyTargetId=null;u.targetId=null;u.retaliationTargetId=null;
 }else if(attackSelected){u.manualAttackTargetId=attackSelected.id;return attackSelected;}
 if(u.manualAttackTargetId!=null&&!attackSelected){u.targetId=null;u.manualAttackTargetId=null;}
 const current=sim.get(u.targetId);
 if(current&&current.side!==u.side){
  const retaliation=u.retaliationTargetId===current.id&&(u.attackerMemory?.[current.id]||0)>sim.time&&distance(u,current)<=sim.config.world.retaliationLeash;
  if(distance(u,current)<=radius||retaliation)return current;
 }
 u.targetId=null;u.retaliationTargetId=null;
 const candidates=sim.enemies(u,radius).sort((a,b)=>category(a)-category(b)||distance(u,a)-distance(u,b)||a.id-b.id);
 if(candidates.length)return candidates[0];
 if(!u.tower){
  const attackers=Object.entries(u.attackerMemory||{}).filter(([,until])=>until>sim.time).map(([id,until])=>({unit:sim.get(Number(id)),until})).filter(x=>x.unit&&x.unit.side!==u.side&&distance(u,x.unit)<=sim.config.world.retaliationLeash).sort((a,b)=>b.until-a.until||distance(u,a.unit)-distance(u,b.unit)||a.unit.id-b.unit.id);
  if(attackers.length){u.retaliationTargetId=attackers[0].unit.id;return attackers[0].unit;}
 }
 return null;
}

export function navigate(sim,u,dt){
 if(cannotAct(u,sim.time))return null;
 const target=sim.choose(u);u.targetId=target?.id??null;
 if(target){u.deploying=false;if(inAttackRange(u,target))return target;}
 if(u.tower)return null;
 const dest=target||{x:u.x,y:u.side?sim.config.world.defenseLimitY:sim.config.world.mapMaxY};
 const d=distance(u,dest),stop=target?u.range:0;
 const debuffSlow=Math.max(0,...sim.activeDebuffs(u,'moveSlow').map(x=>x.ratio));
 const ratio=Math.min(u.slowUntil>sim.time?u.slowRatio:1,1-debuffSlow);
 const step=Math.min(Math.max(0,d-stop),u.speed*dt*ratio);
 if(step>0){let y=u.y+(dest.y-u.y)/d*step;if(u.side===1)y=Math.max(Math.min(u.y,sim.config.world.defenseLimitY),y);sim.moveUnit(u,u.x+(dest.x-u.x)/d*step,y);}
 return inAttackRange(u,target)?target:null;
}

import {available} from './skill-value.js';
import {manualTarget} from './manual-target.js';

export const segmentDistance=(p,a,b)=>{
 const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
 const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
};

// Continuous contact, including the swept path of a dash. Reapplication extends
// the burn without postponing its next damage tick or adding another stack.
export function applyFlameShield(sim,field,from=field.previous||field.owner){
 const owner=field.owner,s=field.s;
 if(owner.hp<=0||field.until<=sim.time||available(s.value)<=1e-7)return;
 const selected=manualTarget(sim,owner);
 const targets=sim.enemies(owner).filter(u=>!(u.immuneUntil>sim.time)&&segmentDistance(u,from,owner)<=s.radius+1e-7)
  .sort((a,b)=>Number(b.id===selected?.id)-Number(a.id===selected?.id)||segmentDistance(a,from,owner)-segmentDistance(b,from,owner)||a.id-b.id).slice(0,s.targets);
 for(const target of targets){
  const old=sim.fields.find(f=>f.kind==='dot'&&f.type==='lordScorch'&&f.owner.id===owner.id&&f.host===target.id);
  if(old){old.until=sim.time+s.duration;old.s=s;}
  else sim.fields.push({kind:'dot',type:'lordScorch',owner,host:target.id,x:target.x,y:target.y,side:owner.side,s,start:sim.time,until:sim.time+s.duration,tick:sim.time+1});
 }
 field.x=owner.x;field.y=owner.y;field.previous={x:owner.x,y:owner.y};
}

export function applyMovingFlameShield(sim,owner,from){
 for(const field of sim.fields)if(field.kind==='lordBurn'&&field.owner.id===owner.id)applyFlameShield(sim,field,from);
}

// A burn belongs to its victim. Leaving the aura or losing the caster does not
// remove an already-applied burn; cleanse, expiry and the shared allowance do.
export function tickLordScorch(sim,field){
 const target=sim.get(field.host),s=field.s;
 if(!target||available(s.value)<=1e-7){field.until=sim.time;return;}
 while(field.tick<=sim.time+1e-7&&field.tick<=field.until+1e-7){
  field.tick+=1;
  sim.damage(field.owner,target,s.value.attack*s.power/100,false,false,{value:s.value,attackScaled:true,remote:false});
  sim.visual('impact',field.owner,target,{skill:2,vfxRole:'scorch',targets:[{id:target.id,x:target.x,y:target.y}],until:sim.time+.45});
  if(target.hp<=0||available(s.value)<=1e-7)break;
 }
}

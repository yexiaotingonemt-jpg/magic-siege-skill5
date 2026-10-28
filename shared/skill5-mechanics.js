import {scaleSkill4,impactSkill4 as legacyImpact,chooseRandomTarget,updateSkill4Unit} from './skill4-mechanics.js';
import {available,spend} from './skill-value.js';
import {applyFlameShield,applyMovingFlameShield,tickLordScorch,segmentDistance} from './lord-flame-shield.js';
import {manualTarget,enemyTarget,friendlyTarget} from './manual-target.js';
export {scaleSkill4,chooseRandomTarget};
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(h,es)=>es.sort((a,b)=>d(h,a)-d(h,b)||a.id-b.id);
const priority=(h,es)=>es.sort((a,b)=>(a.hero?0:a.tower?2:1)-(b.hero?0:b.tower?2:1)||d(h,a)-d(h,b)||a.id-b.id);
const alive=(sim,ids)=>ids.map(id=>sim.get(id)).filter(Boolean);
const prefer=(target,targets)=>target?[target,...targets.filter(u=>u.id!==target.id)]:targets;
const directedEnemy=(h,i)=>h.classId===0&&i===0||h.classId===2||h.classId===3&&i<2||h.classId===4||h.classId===5&&i===0;
// Resolve support from the current selection, never from an older friendly lock.
// Automatic fallback only considers recipients valid for this support skill.
const supportTarget=(sim,h,i,s)=>{
 const chosen=manualTarget(sim,h)||enemyTarget(sim,h);
 if(chosen?.side===h.side)return chosen;
 const victim=chosen&&sim.get(chosen.targetId);
 if(victim?.side===h.side)return victim;
 return sim.allies(h,s.targetRange).filter(u=>i!==1||u.id!==h.id).filter(u=>i!==2||sim.hasNegative(u)).sort((a,b)=>a.hp-b.hp||d(h,a)-d(h,b)||a.id-b.id)[0]||null;
};
const skillTarget=(sim,h,i,s)=>h.classId===5&&i>=1?supportTarget(sim,h,i,s):directedEnemy(h,i)?enemyTarget(sim,h):manualTarget(sim,h);
// Keep applicable explicit selections locked even when a nearer target exists.
export function skill5RangeFailure(sim,h,i,s){
 const support=h.classId===5&&i>=1;
 const chosen=skillTarget(sim,h,i,s);
 if(directedEnemy(h,i)&&!chosen)return {ok:false,code:'target',reason:'请选择敌方目标'};
 if(support){
  const bad=reason=>({ok:false,code:'wrong-target',reason});
  if(!chosen)return bad('范围内没有符合条件的己方目标');
  if(chosen.tower)return bad('该技能不能对建筑释放');
  if(i===1&&chosen.id===h.id)return bad('共生链接不能选择自己');
  if(d(h,chosen)>s.targetRange+1e-7)return {ok:false,code:'range',reason:'目标太远'};
  if(i===2&&!sim.hasNegative(chosen))return bad('选中的友方目标没有可净化的负面状态');
 }
 if(!chosen)return null;
 const enemy=chosen.side!==h.side,other=chosen.id!==h.id&&!chosen.tower;
 const applies=enemy?(h.classId===0?(i===0||i===2&&chosen.hero):h.classId===2||h.classId===4||h.classId===3&&i<2||h.classId===5&&i===0)
  :!chosen.tower&&(h.classId===0?(i===1||i===2&&other):h.classId===5&&(i===1?other:i===2||i===3));
 return applies&&d(h,chosen)>s.targetRange+1e-7?{ok:false,code:'range',reason:'目标太远'}:null;
}
export function selectSkill5(h,i,s){
 const es=priority(h,this.enemies(h,s.targetRange)),all=this.allies(h,s.targetRange),current=this.get(h.targetId);
 const chosen=skillTarget(this,h,i,s),inRange=chosen&&d(h,chosen)<=s.targetRange+1e-7?chosen:null;
 const selected=inRange?.side!==h.side?inRange:null,friend=inRange?.side===h.side&&!inRange.tower?inRange:null;
 const currentEnemy=current&&current.side!==h.side&&d(h,current)<=s.targetRange&&(current.id!==h.manualTargetId||selected)?current:null;
 const bad=reason=>({ok:false,code:'target',reason});let t=es[0],targets=[],selectedId=null;
 if(h.classId===0){
  if(i===0){t=selected||near(h,es)[0];if(!t)return bad('范围内没有重击目标');selectedId=selected?.id;}
  if(i===1){t=h;targets=[h,...prefer(friend?.id!==h.id?friend:null,near(h,all.filter(u=>u.id!==h.id))).slice(0,s.targets)];selectedId=friend?.id;}
  if(i===2){
   if(friend&&friend.id!==h.id){if(!es.some(u=>u.hero&&u.targetId===friend.id))return bad('手动友方目标未被范围内的敌方英雄攻击');t=friend;targets=[friend];selectedId=friend.id;}
   else{const enemy=selected?.hero?selected:near(h,es.filter(u=>u.hero))[0],victim=enemy&&this.get(enemy.targetId);if(!victim||victim.tower||victim.side!==h.side||victim.id===h.id)return bad(selected?.hero?'手动目标没有可换位的己方攻击目标':'最近敌方英雄没有可换位的己方攻击目标');t=victim;targets=[victim];selectedId=selected?.hero?selected.id:null;}
  }
  if(i===3)t=h;
 }else if(h.classId===2){t=selected||currentEnemy||t;if(!t)return bad('炮击范围内没有目标');selectedId=selected?.id;}
 else if(h.classId===3){
  if(i===0){t=selected||t;if(!t)return bad('前方没有敌人');const len=d(t,h),dx=len?(t.x-h.x)/len:0,dy=len?(t.y-h.y)/len:(h.side?-1:1);targets=prefer(selected,es.filter(u=>d(h,u)<1e-7||((u.x-h.x)*dx+(u.y-h.y)*dy)/d(h,u)>=.35)).slice(0,s.targets);selectedId=selected?.id;}
  if(i===1){t=selected||es.sort((a,b)=>d(h,b)-d(h,a)||a.id-b.id)[0];if(!t)return bad('冲锋范围内没有目标');selectedId=selected?.id;}
  if(i>=2)t=h;
 }else if(h.classId===4){
  if(i===0||i===2){targets=prefer(selected,near(h,es)).slice(0,1);t=targets[0];}
  if(i===1)t=selected||currentEnemy||t;
  if(i===3){targets=prefer(selected,es.sort((a,b)=>a.hp-b.hp||d(h,a)-d(h,b)||a.id-b.id)).slice(0,s.targets+Math.floor((h.heat||0)/s.heatStep));t=targets[0];}
  selectedId=selected?.id;
  if(!t)return bad('范围内没有可攻击目标');
 }else if(h.classId===5){
  if(i===0){t=selected||currentEnemy||t;if(!t)return bad('范围内没有灵息冲击目标');const ally=friendlyTarget(this,h);selectedId=ally&&!ally.tower&&d(t,ally)<=s.radius+1e-7?ally.id:selected?.id;}
  if(i===1){t=friend&&friend.id!==h.id?friend:all.filter(u=>u.id!==h.id).sort((a,b)=>a.hp-b.hp||d(h,a)-d(h,b)||a.id-b.id)[0];if(!t)return bad('范围内没有其他友军可链接');selectedId=t.id===friend?.id?friend.id:null;}
  if(i===2){const candidates=near(h,all.filter(u=>this.hasNegative(u)));targets=prefer(candidates.find(u=>u.id===friend?.id),candidates).slice(0,s.targets);t=h;if(!targets.length)return bad('没有需要净化的友军');selectedId=targets.find(u=>u.id===friend?.id)?.id;}
  if(i===3){targets=[h,...prefer(friend?.id!==h.id?friend:null,all.filter(u=>u.id!==h.id).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||d(h,a)-d(h,b)||a.id-b.id)).slice(0,s.targets)];t=h;if(!targets.some(u=>u.hp<u.maxHp))return bad('没有需要治疗的友军');selectedId=friend?.id;}
 }else return bad('该职业不在本版职业表中');
 return {ok:true,t,targets,randomChoices:[],manualTargetId:selectedId??null};
}
export function resolveSkill5(h,i,s,locked,ids=[],extra={}){
 const t=locked&&this.get(locked.id),A=s.value.attack,targets=alive(this,ids),at=t||locked||h;
 const event=this.visual('release',h,at,{skill:i,targets:targets.map(u=>({id:u.id,x:u.x,y:u.y})),haloTargets:targets.map(u=>({id:u.id})),until:this.time+1});
 const hit=(u,power=s.power)=>{if(u?.hp>0)this.damage(h,u,A*power/100,false,false,{value:s.value,attackScaled:true,remote:![0,3].includes(h.classId)});};
 const guard=u=>{u.guards??=[];u.guards.push({ownerId:h.id,ratio:s.damageReduction,until:this.time+s.duration,value:s.value});};
 if(h.classId===0){
  if(i===0&&t){hit(t);this.debuff(t,h,'vulnerable',s.vulnerability,s.duration,s.value);event.haloTargets=[{id:t.id}];}
  if(i===1)for(const u of targets)guard(u);
  if(i===2&&t&&!t.tower&&t.side===h.side){spend(s.value,A*s.utilityPower/100,'换位');const old={x:h.x,y:h.y};this.interrupt(t);this.moveUnit(h,t.x,t.y);this.moveUnit(t,old.x,old.y);guard(h);event.swapFrom=old;event.to={x:h.x,y:h.y};}
  if(i===3)h.damageStore={until:this.time+s.duration,total:0,shieldDuration:s.shieldDuration,conversionRatio:s.conversionRatio,value:s.value};
 }
 if(h.classId===2){
  if(i===2){h.channelUntil=this.time+s.duration;this.fields.push({kind:'runeBarrage',owner:h,x:at.x,y:at.y,side:h.side,s,preferredTargetId:extra.manualTargetId,remaining:s.shots,start:this.time,until:h.channelUntil,tick:this.time+s.duration/s.shots});}
  else this.projectiles.push({id:this.nextProjectileId++,source:h,sourceId:h.id,targetId:t?.id,x:h.x,y:h.y,tx:at.x,ty:at.y,power:0,basic:false,skillId:i,payload:{...s,skill:i,design5:true,preferredTargetId:extra.manualTargetId}});
 }
 if(h.classId===3){
  if(i===0)for(const u of targets)hit(u);
  if(i===1&&locked){spend(s.value,A*s.utilityPower/100,'冲锋击退');const end={x:at.x,y:at.y},length=d(h,end),duration=Math.max(.1,length/s.dashSpeed);h.dash={x:h.x,y:h.y,end,start:this.time,until:this.time+duration,s,preferredTargetId:extra.manualTargetId,hit:[]};this.visual('charge',h,end,{skill:1,until:h.dash.until});}
  if(i===2){guard(h);this.fields.push({kind:'lordBurn',owner:h,x:h.x,y:h.y,side:h.side,s,until:this.time+s.duration,tick:this.time+1});}
  if(i===3){spend(s.value,A*s.utilityPower/100,'负面免疫');this.cleanse(h);h.immuneUntil=this.time+s.duration;h.lordUlt={until:this.time+s.duration,s};}
 }
 if(h.classId===4){
  if(i===0){for(const u of targets)hit(u);this.addHeat(h,1);}
  if(i===1&&t){hit(t);if((h.heat||0)>=s.heatThreshold){event.bigFireball=true;const es=near(at,this.enemies({...at,side:h.side},s.radius)).filter(u=>u.id!==t.id).slice(0,s.targets);for(const u of es)hit(u,s.splashPower/Math.max(1,es.length));}}
  if(i===2){for(const u of targets){u.soulMarks??=[];u.soulMarks=u.soulMarks.filter(m=>m.ownerId!==h.id);u.soulMarks.push({ownerId:h.id,until:this.time+s.duration,heat:s.heatOnDeath});hit(u);}}
  if(i===3){h.heat=Math.max(0,(h.heat||0)-(extra.heat||0));for(const u of targets)hit(u);}
 }
 if(h.classId===5){
  if(i===0&&t){hit(t);const candidates=near(at,this.allies({...at,side:h.side},s.radius)),friends=prefer(candidates.find(u=>u.id===extra.manualTargetId),candidates).slice(0,s.targets);for(const u of friends)this.heal(u,A*s.healPower/100/Math.max(1,friends.length),h,s.value);event.haloTargets=[{id:t.id},...friends.map(u=>({id:u.id}))];}
  if(i===1&&t){this.fields=this.fields.filter(f=>!(f.kind==='link'&&f.owner.id===h.id));this.fields.push({kind:'link',owner:h,host:t.id,x:h.x,y:h.y,until:this.time+s.duration,ratio:0,shareRatio:s.shareRatio,value:s.value});h.linkId=t.id;h.linkUntil=this.time+s.duration;}
  if(i===2&&targets.length){h.hp=Math.max(1,h.hp*(1-s.hpCost));spend(s.value,A*s.utilityPower/100,'净化');for(const u of targets)this.cleanse(u);}
  if(i===3)for(const u of targets)this.heal(u,A*s.power/100,h,s.value);
 }
}
export function impactSkill4(b){
 const s=b.payload;if(!s.design5)return legacyImpact.call(this,b);
 const h=b.source,t=this.get(b.targetId),at={x:b.tx,y:b.ty,side:h.side},A=s.value.attack;
 const candidates=s.skill===3?near(at,this.enemies(at,s.radius)):[];
 const es=s.skill===3?prefer(candidates.find(u=>u.id===s.preferredTargetId),candidates).slice(0,s.targets):t?[t]:[];
 this.visual('impact',h,at,{skill:s.skill,targets:es.map(u=>({id:u.id,x:u.x,y:u.y})),haloTargets:es.map(u=>({id:u.id})),until:this.time+.8});
 if(s.skill===3)spend(s.value,A*s.utilityPower/100,'震荡击退');
 for(const u of es){this.damage(h,u,s.skill===0?u.maxHp*s.percentMaxHp:A*s.power/100/Math.max(1,es.length),false,false,{value:s.value,remote:true,attackScaled:s.skill!==0});
  if(u.hp<=0)continue;
  if(s.skill===1)this.debuff(u,h,'attackSpeedDown',s.attackSpeedDown,s.duration,s.value);
  if(s.skill===3&&!u.tower&&!(u.immuneUntil>this.time)){const len=d(h,u)||1;this.interrupt(u);this.moveUnit(u,u.x+(u.x-h.x)/len*s.knockback,u.y+(u.y-h.y)/len*s.knockback);}
 }
}
export function processSkill5Effects(){
 for(const f of this.fields){
  const h=f.owner,s=f.s;
  if(f.kind==='dot'&&f.type==='lordScorch'){tickLordScorch(this,f);continue;}
  if(f.kind==='link'){if(!this.get(f.host)||h.hp<=0||available(f.value)<=0)f.until=this.time;continue;}
  if(f.kind==='lordBurn'){if(h.hp<=0||available(s.value)<=1e-7)f.until=this.time;else applyFlameShield(this,f);continue;}
  if(f.kind!=='runeBarrage')continue;
  if(h.hp<=0){f.until=this.time;continue;}
  if(h.channelUntil<this.time-1e-7&&f.remaining>1){f.until=this.time;continue;}
  while(f.tick<=this.time+1e-7&&f.tick<=f.until+1e-7){
   f.tick+=s.duration/s.shots;
   const candidates=near(f,this.enemies({...f,side:h.side},s.radius));
   const es=prefer(candidates.find(u=>u.id===f.preferredTargetId),candidates).slice(0,s.targets);
   const slowCost=s.value.attack*s.utilityPower/100;
   // Movement control is paid once per shell; later damage cannot revoke it.
   const slowPaid=es.some(u=>!u.tower&&!(u.immuneUntil>this.time))&&spend(s.value,slowCost,'炮击减速')>=slowCost-1e-7;
   for(const u of es){this.damage(h,u,s.value.attack*s.power/100/Math.max(1,es.length),false,false,{value:s.value,attackScaled:true,remote:true});
    if(slowPaid&&u.hp>0&&!u.tower){const old=u.debuffs?.[h.id+':moveSlow'],stacks=Math.min(s.slowCap,old?.until>this.time?(old.stacks||1)+1:1);if(this.debuff(u,h,'moveSlow',s.slowPerStack*stacks,s.slowDuration,s.value,true))u.debuffs[h.id+':moveSlow'].stacks=stacks;}
   }
   this.visual('impact',h,f,{skill:2,targets:es.map(u=>({id:u.id,x:u.x,y:u.y})),haloTargets:es.map(u=>({id:u.id})),until:this.time+.6});
   if(--f.remaining<=0)break;
  }
 }
}
export function updateSkill5Unit(u,dt=0){
 if(u.heatUntil<=this.time)u.heat=0;
 if(u.soulMarks)u.soulMarks=u.soulMarks.filter(m=>m.until>=this.time);
 if(u.guards)u.guards=u.guards.filter(g=>g.until>this.time&&available(g.value)>0);
 if(u.damageStore&&u.damageStore.until<=this.time){const f=u.damageStore;u.damageStore=null;const amount=Math.min(f.total*(f.conversionRatio??1),available(f.value));if(amount>0){this.shield(u,amount,u,f.shieldDuration,f.value);this.visual('release',u,u,{skill:3,until:this.time+1,shieldFormed:true});}}
 if(u.dash){const p=u.dash,k=Math.min(1,(this.time-p.start)/(p.until-p.start)),from={x:u.x,y:u.y};this.moveUnit(u,p.x+(p.end.x-p.x)*k,p.y+(p.end.y-p.y)*k);applyMovingFlameShield(this,u,from);
  const preferred=this.get(p.preferredTargetId),reserve=preferred&&!preferred.tower&&!p.hit.includes(preferred.id);
  const contacts=priority(u,this.enemies(u).filter(e=>segmentDistance(e,from,u)<=p.s.radius+1e-7));
  for(const e of prefer(contacts.find(e=>e.id===p.preferredTargetId),contacts))if(!e.tower&&!p.hit.includes(e.id)&&p.hit.length<p.s.targets){if(reserve&&e.id!==preferred.id&&!p.hit.includes(preferred.id)&&p.hit.length>=p.s.targets-1)continue;p.hit.push(e.id);this.damage(u,e,p.s.value.attack*p.s.power/100,false,false,{value:p.s.value,attackScaled:true,remote:false});if(e.hp>0&&!(e.immuneUntil>this.time)){this.interrupt(e);const dx=p.end.x-p.x,dy=p.end.y-p.y,len=Math.hypot(dx,dy)||1;this.moveUnit(e,e.x-dy/len*p.s.knockback,e.y+dx/len*p.s.knockback);}}
  if(k===1)u.dash=null;return true;
 }
 return updateSkill4Unit.call(this,u,dt);
}
export function chooseSkill5(p){
 const h=this.hero(p);if(!h)return -1;const choices=[];
 for(let i=0;i<4;i++){const plan=this.castPlan(i,p);if(!plan.ok)continue;let score=2+plan.targets.length;
  if(h.classId===0){if(i===1||i===3)score=this.units.some(u=>u.side!==h.side&&u.targetId===h.id)?7:0;if(i===2)score=plan.t.hp/plan.t.maxHp<.5?10:1;}
  if(h.classId===2){score=plan.t?.tower?7:3;if(i===2)score=this.enemies({...plan.t,side:h.side},plan.s.radius).length>=2?8:2;}
  if(h.classId===3){if(i===1)score=plan.t?.range>2?9:5;if(i===2)score=h.hp<h.maxHp*.8?7:2;if(i===3)score=this.enemies(h,6).length>=3?10:1;}
  if(h.classId===4&&i===3)score=(h.heat||0)>=4?10:1;
  if(h.classId===5){if(i===2)score=8;if(i===3)score=plan.targets.reduce((n,u)=>n+1-u.hp/u.maxHp,0)>1?10:0;}
  if(score>0)choices.push({i,score});
 }return choices.sort((a,b)=>b.score-a.score)[0]?.i??-1;
}


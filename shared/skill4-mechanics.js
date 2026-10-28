import {available,spend} from './skill-value.js';
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(h,es)=>es.sort((a,b)=>(a.tower?2:a.hero?0:1)-(b.tower?2:b.hero?0:1)||distance(h,a)-distance(h,b)||a.id-b.id);
const shuffled=(sim,es)=>{const result=[...es];for(let j=result.length-1;j>0;j--){const k=Math.floor(sim.random()*(j+1));[result[j],result[k]]=[result[k],result[j]];}return result;};
const valid=(sim,ids)=>ids.map(id=>sim.get(id)).filter(Boolean);
export function selectSkill4(h,i,s){
 const es=near(h,this.enemies(h,s.targetRange)),all=this.allies(h,s.targetRange,true),id=h.classId;
 let t=es[0],targets=[],randomChoices=[];
 const blocked=(code,reason)=>({ok:false,code,reason});
 const current=this.get(h.targetId),currentEnemy=current&&current.side!==h.side&&distance(h,current)<=s.targetRange?current:null;
 if(id===0){
  if(i===0||i===3)targets=es.slice(0,s.targets);
  if(i===1)t=es.filter(e=>!e.tower).sort((a,b)=>Number(!!b.hero)-Number(!!a.hero)||distance(h,b)-distance(h,a)||a.id-b.id)[0];
  if(i!==2&&!t)return blocked('target','范围内没有可攻击目标');
 }
 if(id===1){
  if(i===0)randomChoices=es;
  if(i===1)t=es.at(-1);
  if(i===2)randomChoices=es.filter(e=>e.hero&&e.conductUntil>this.time);
  if(i===3)randomChoices=es.filter(e=>e.conductUntil>this.time);
  if(i!==1){t=randomChoices[0];if(!t)return blocked(i>=2?'conduct':'target',i===2?'范围内没有导电英雄':i===3?'范围内没有导电目标':'范围内没有可攻击目标');}
  if(!t)return blocked('target','范围内没有可攻击目标');
 }
 if(id===2){t=currentEnemy||es.find(e=>e.tower)||t;if(!t)return blocked('target','射程内没有当前或候选目标');}
 if(id===3){
  if(i===0&&!t)return blocked('target','周围没有敌人');
  if(i===1&&!es.some(e=>!e.tower))return blocked('target','周围没有可嘲讽的小兵或英雄');
 }
 if(id===4){
  if(i===0){t=currentEnemy||t;if(t){const dx=t.x-h.x,dy=t.y-h.y,d=Math.hypot(dx,dy)||1;targets=es.filter(e=>((e.x-h.x)*dx+(e.y-h.y)*dy)/Math.max(.001,distance(h,e)*d)>=.25).slice(0,s.targets);}}
  if(i===1)t=currentEnemy||t;
  if(i===2)targets=es.slice(0,s.targets);
  if(i===3){targets=[...es].sort((a,b)=>Number(!!b.hero)-Number(!!a.hero)||a.hp-b.hp||distance(h,a)-distance(h,b)).slice(0,s.targets+Math.floor((h.heat||0)/s.heatStep));t=targets[0];}
  if(!t)return blocked('target','范围内没有可攻击目标');
 }
 if(id===5){
  if(i===0&&!t)return blocked('target','范围内没有寄生目标');
  if(i===1){t=all.filter(a=>a.id!==h.id).sort((a,b)=>(a.tower?2:a.hero?0:1)-(b.tower?2:b.hero?0:1)||a.hp-b.hp||distance(h,a)-distance(h,b))[0];if(!t)return blocked('target','范围内没有其他友军可链接');}
  if(i===2){targets=near(h,all.filter(a=>this.hasNegative(a))).slice(0,s.targets);if(!targets.length)return blocked('cleanse','没有可净化的负面状态');}
  if(i===3){targets=[h,...all.filter(a=>a.id!==h.id&&a.hp<a.maxHp).sort((a,b)=>(a.tower?2:a.hero?0:1)-(b.tower?2:b.hero?0:1)||a.hp/a.maxHp-b.hp/b.maxHp||distance(h,a)-distance(h,b)).slice(0,s.targets)];if(!targets.some(a=>a.hp<a.maxHp))return blocked('healing','没有需要治疗的友军');t=h;}
 }
 return {ok:true,t,targets,randomChoices};
}
export function chooseRandomTarget(sim,plan){if(plan.randomChoices?.length)plan.t=plan.randomChoices[Math.floor(sim.random()*plan.randomChoices.length)];return plan;}
export function scaleSkill4(s,k,value){const result={...s,value};for(const key of ['power','shieldPower','healPower','tickCapPower','utilityPower','splashPower'])if(key in result)result[key]*=k;return result;}
export function resolveSkill4(h,i,s,locked,ids=[],extra={}){
 const t=locked?this.get(locked.id):null,at=t||locked||h,A=s.value.attack,power=A*s.power/100;
 const event=this.visual('release',h,at,{skill:i,targets:[],haloTargets:[],targetId:t?.id,radius:s.radius,until:this.time+1});
 const mark=u=>{if(u&&!event.haloTargets.some(v=>v.id===u.id)){event.haloTargets.push({id:u.id});event.targets.push({id:u.id,x:u.x,y:u.y});}};
 const hit=(u,n=power,meta={})=>{if(u?.hp>0){mark(u);return this.damage(h,u,n,false,false,{value:s.value,remote:true,attackScaled:true,...meta});}return 0;};
 const shared=(es,total=power,meta={})=>{const n=es.length?total/es.length:0;for(const u of es)hit(u,n,meta);};
 const utility=(es,expected=es.length)=>spend(s.value,A*(s.utilityPower||0)/100*Math.min(1,es.filter(u=>!u.tower&&!(u.immuneUntil>this.time)).length/Math.max(1,expected)),'控制与标记');
 const area=(origin,radius,limit=Infinity)=>near(origin,this.enemies({...origin,side:h.side},radius)).slice(0,limit);
 if(h.classId===0){
  if(i===0){const es=valid(this,ids);utility(es,s.targets);shared(es);for(const u of es)this.addScar(u,h,s.scarDuration,s.scarCap);}
  if(i===1&&t){utility([t]);hit(t);this.addScar(t,h,s.scarDuration,s.scarCap);if(t.hp>0&&!t.tower&&!(t.immuneUntil>this.time)){this.interrupt(t);const d=distance(h,t),k=d?Math.min(s.pullStopDistance,d)/d:0;this.moveUnit(t,h.x+(t.x-h.x)*k,h.y+(t.y-h.y)*k);}}
  if(i===2){mark(h);this.shield(h,A*s.shieldPower/100,h,s.duration,s.value);h.scarGuardRatio=s.damageReduction;}
  if(i===3){const es=valid(this,ids);utility(es,s.targets);for(const u of es){const count=this.scarCount(u);hit(u,power/Math.max(1,es.length)*(1+count*s.scarBonus));if(u.hp>0&&!u.tower&&!(u.immuneUntil>this.time)){const d=distance(h,u)||1,step=s.knockback+count*s.scarKnockback;this.moveUnit(u,u.x+(u.x-h.x)/d*step,u.y+(u.y-h.y)/d*step);this.stun(u,h,s.stun);}}}
 }
 if(h.classId===1){
  if(i===0&&t){const es=[t,...shuffled(this,this.enemies(h,s.targetRange).filter(u=>u.id!==t.id)).slice(0,s.bounces)];for(const u of es){hit(u);this.conduct(u,h,s.conductDuration);}}
  if(i===1){const es=area(at,s.radius,s.targets);shared(es);for(const u of es)this.conduct(u,h,s.conductDuration);}
  if(i===2&&t){const es=area(at,s.radius).filter(u=>u.conductUntil>this.time).slice(0,s.targets);utility(es,s.targets);shared(es);for(const u of es)if(u.id!==t.id&&u.hp>0&&!u.tower&&!(u.immuneUntil>this.time)){const d=distance(u,at),step=Math.min(s.pullDistance,Math.max(0,d-s.pullStopDistance));if(d){this.interrupt(u);this.moveUnit(u,u.x+(at.x-u.x)/d*step,u.y+(at.y-u.y)/d*step);}}}
  if(i===3&&t)this.fields.push({kind:'cloud',owner:h,host:t.id,x:t.x,y:t.y,side:h.side,s,start:this.time,until:this.time+s.duration,tick:this.time+1});
 }
 if(h.classId===2&&locked){
  if(i===3){h.channelUntil=this.time+s.duration;this.fields.push({kind:'barrage',owner:h,x:at.x,y:at.y,side:h.side,s,remaining:s.shots,start:this.time,until:h.channelUntil,tick:this.time+s.duration/s.shots});}
  else{this.projectile(h,{...locked},power,s.radius,false);Object.assign(this.projectiles.at(-1),{skillId:i,payload:{...s,classId:2,skill:i,owner:h}});}
 }
 if(h.classId===3){
  if(i===0){const es=area(h,s.radius);for(const u of es){hit(u);this.debuff(u,h,'attackDown',s.attackDown,s.duration,s.value);}}
  if(i===1){const es=near(h,this.enemies(h,s.radius).filter(u=>!u.tower&&!(u.immuneUntil>this.time))).slice(0,s.targets);utility(es,s.targets);mark(h);h.tauntReductionUntil=this.time+s.duration;h.tauntReduction=s.damageReduction;h.tauntValue=s.value;for(const u of es){mark(u);u.tauntId=h.id;u.tauntUntil=this.time+s.duration;u.targetId=h.id;u.nextRetargetAt=0;}}
  if(i===2){mark(h);h.reflectUntil=this.time+s.duration;h.reflectRatio=s.remoteReflect;h.reflectValue=s.value;}
  if(i===3){mark(h);spend(s.value,A*s.utilityPower/100,'负面免疫');this.cleanse(h);h.whirlUntil=this.time+s.duration;h.whirlMaxUntil=h.whirlUntil+s.extensionLimit;h.immuneUntil=h.whirlUntil;h.whirlTick=this.time+1;h.whirlValue=s.value;h.whirlPowerPercent=s.power;h.whirlTargets=s.targets;h.whirlHits=0;const target=this.get(h.targetId)||this.enemies(h,Infinity).sort((a,b)=>distance(h,a)-distance(h,b))[0];const dx=target?target.x-h.x:0,dy=target?target.y-h.y:(h.side?-1:1),d=Math.hypot(dx,dy)||1;h.whirlPath={x:h.x,y:h.y,dx:dx/d,dy:dy/d,start:this.time,baseDuration:s.duration,outUntil:this.time+s.duration/2,returning:false,speed:h.speed};}
 }
 if(h.classId===4){
  if(i===0){shared(valid(this,ids));this.addHeat(h,1);}
  if(i===1&&t){hit(t);if((h.heat||0)>=s.heatThreshold){event.bigFireball=true;const es=area(at,s.radius,s.targets+1).filter(u=>u.id!==t.id).slice(0,s.targets);shared(es,A*s.splashPower/100);}}
  if(i===2){const es=valid(this,ids);for(const u of es){mark(u);this.dot(h,u,'soulburn',{...s,power:s.power/Math.max(1,es.length)},s.duration);}}
  if(i===3){h.heat=Math.max(0,(h.heat||0)-(extra.heat||0));for(const u of valid(this,ids))hit(u);}
 }
 if(h.classId===5){
  if(i===0&&t){mark(t);this.dot(h,t,'parasite',s,s.duration);}
  if(i===1&&t){mark(h);mark(t);this.fields=this.fields.filter(f=>!(f.kind==='link'&&f.owner.id===h.id));this.fields.push({kind:'link',owner:h,host:t.id,x:h.x,y:h.y,ratio:s.damageReduction,value:s.value,start:this.time,until:this.time+s.duration});}
  if(i===2){const es=valid(this,ids).filter(u=>this.hasNegative(u));utility(es,s.targets);for(const u of es)if(this.cleanse(u)){mark(u);u.healingBoost=s.healingBoost;u.healingBoostUntil=this.time+s.duration;u.healingBoostValue=s.value;}}
  if(i===3)for(const u of valid(this,ids)){mark(u);this.heal(u,power,h,s.value);}
 }
}
export function impactSkill4(b){
 const {payload:s,source:h}=b,t=this.get(b.targetId),at={x:b.tx,y:b.ty,side:h.side},A=s.value.attack;
 const es=near(at,this.enemies(at,s.radius));const event=this.visual('impact',h,at,{skill:s.skill,targets:[],haloTargets:[],until:this.time+1});
 const mark=u=>{event.targets.push({id:u.id,x:u.x,y:u.y});event.haloTargets.push({id:u.id});};
 const hit=(u,n)=>{if(u?.hp>0){mark(u);this.damage(h,u,n,false,false,{remote:true,value:s.value,attackScaled:true});}};
 if(s.skill===0&&t){mark(t);this.dot(h,t,'corrosion',s,s.duration);}
 if(s.skill===1){const moved=es.filter(u=>u.id!==t?.id&&!u.tower&&!(u.immuneUntil>this.time));if(moved.length)spend(s.value,A*s.utilityPower/100,'击散');for(const u of es)hit(u,A*s.power/100/Math.max(1,es.length));for(const u of moved)if(u.hp>0){const d=distance(u,at),angle=(u.id%8)*Math.PI/4,dx=d?(u.x-at.x)/d:Math.cos(angle),dy=d?(u.y-at.y)/d:Math.sin(angle);this.interrupt(u);this.moveUnit(u,u.x+dx*s.knockback,u.y+dy*s.knockback);}}
 if(s.skill===2&&t){hit(t,A*s.power/100);if(t.hp>0&&this.debuff(t,h,'attackSpeedDown',s.attackSpeedDown,s.duration,s.value)){const old=Math.max(0,t.cd-this.time);t.cd=this.time+old/(1-s.attackSpeedDown);}}
}
export function processSkill4Effects(){
 for(const f of [...this.fields]){
  if(['lordBurn','daggers'].includes(f.kind))continue;
  const host=this.get(f.host);
  if(f.kind==='link'){if(!host||f.owner.hp<=0||available(f.value)<=1e-7)f.until=this.time;continue;}
  if(f.until<this.time-1e-7)continue;
  if(available(f.s?.value)<=1e-7){f.until=this.time;continue;}
  if(f.kind==='barrage'&&(f.owner.hp<=0||f.owner.channelUntil<this.time-1e-7)){f.until=this.time;continue;}
  if(f.kind==='dot'&&!host){f.until=this.time;continue;}
  if(host){f.x=host.x;f.y=host.y;}
  while(f.tick<=this.time+1e-7&&f.tick<=f.until+1e-7){
   const s=f.s,h=f.owner,A=s.value.attack;f.tick+=f.kind==='barrage'?s.duration/s.shots:1;
   if(f.kind==='cloud'){
    const es=shuffled(this,this.enemies(f,s.radius)).slice(0,s.targets);
    const event=this.visual('release',h,f,{skill:3,targets:es.map(u=>({id:u.id,x:u.x,y:u.y})),haloTargets:es.map(u=>({id:u.id})),until:this.time+.65});
    for(const u of es){this.damage(h,u,A*s.power/100,false,false,{value:s.value,remote:true,attackScaled:true});this.debuff(u,h,'healingDown',s.healingReduction,s.debuffDuration,s.value);}
   }else if(f.kind==='barrage'){
    const es=near(f,this.enemies(f,s.radius));for(const u of es)this.damage(h,u,A*s.power/100/Math.max(1,es.length),false,false,{value:s.value,remote:true,attackScaled:true,buildingBonus:s.buildingBonus});
    this.visual('impact',h,f,{skill:3,targets:es.map(u=>({id:u.id,x:u.x,y:u.y})),haloTargets:es.map(u=>({id:u.id})),until:this.time+.6});if(--f.remaining<=0)f.until=this.time;
   }else if(host){
    let n=f.type==='corrosion'?Math.min(host.hp*s.percentCurrentHp,A*s.tickCapPower/100):A*s.power/100;
    this.damage(h,host,n,false,false,{value:s.value,remote:true,attackScaled:f.type!=='corrosion'});this.visual('dot',h,host,{skill:f.type==='corrosion'?0:f.type==='soulburn'?2:0,until:this.time+.45});
    if(f.type==='parasite'&&host.hp>0)for(const u of near(host,this.allies({...host,side:h.side},s.radius,true)).slice(0,s.targets))this.heal(u,A*s.healPower/100,h,s.value);
   }
  }
 }
}
export function updateSkill4Unit(u,dt=0){
 for(const [id,until]of Object.entries(u.attackerMemory||{}))if(until<=this.time)delete u.attackerMemory[id];
 for(const [id,entries]of Object.entries(u.scars||{})){u.scars[id]=entries.filter(until=>until>this.time);if(!u.scars[id].length)delete u.scars[id];}
 if(u.shieldUntil<=this.time)u.shield=0;
 if(available(u.reflectValue)<=1e-7)u.reflectUntil=0;
 if(available(u.tauntValue)<=1e-7)u.tauntReductionUntil=0;
 if(u.whirlPath){
  const p=u.whirlPath;
  if(!p.returning&&this.time<=p.outUntil+1e-7){const travel=p.speed*(this.time-p.start);this.moveUnit(u,p.x+p.dx*travel,p.y+p.dy*travel);}
  else{p.returning=true;const ratio=Math.min(1,dt/Math.max(dt,u.whirlUntil-(this.time-dt)));this.moveUnit(u,u.x+(p.x-u.x)*ratio,u.y+(p.y-u.y)*ratio);}
  if(u.whirlTick<=this.time+1e-7){u.whirlTick+=1;const c=this.config.heroes[3].skills[3],es=near(u,this.enemies(u,c.radius)).slice(0,u.whirlTargets);for(const e of es)this.damage(u,e,u.whirlValue.attack*u.whirlPowerPercent/100,false,false,{remote:false,value:u.whirlValue,attackScaled:true});this.visual('release',u,u,{skill:3,targets:es.map(t=>({id:t.id,x:t.x,y:t.y})),haloTargets:es.map(t=>({id:t.id})),until:this.time+.5});}
  if(this.time>=u.whirlUntil-1e-7){this.moveUnit(u,p.x,p.y);u.whirlPath=null;}
  return true;
 }
 return false;
}
export function chooseSkill4(p){
 const h=this.hero(p);if(!h)return -1;const choices=[];
 for(let i=0;i<4;i++){
  const plan=this.castPlan(i,p);if(!plan.ok)continue;const {s,t,targets}=plan,id=h.classId,es=this.enemies(h,s.targetRange),incoming=this.units.filter(u=>u.hp>0&&u.side!==h.side&&u.targetId===h.id);let score=2;
  if(id===0){if(i===0)score=2+targets.length;if(i===1)score=t.range>2?9:t.channelUntil>this.time?8:3;if(i===2)score=incoming.length?5+Number(h.hp<h.maxHp*.4)*5:0;if(i===3)score=targets.length>=2?4+Math.min(4,targets.reduce((n,u)=>n+this.scarCount(u),0)):1;}
  if(id===1){if(i===0)score=2+Math.min(3,es.length);if(i===1)score=3+Math.min(4,this.enemies({...t,side:h.side},s.radius).length);if(i===2)score=this.enemies({...t,side:h.side},s.radius).filter(u=>u.conductUntil>this.time).length>=2?9:1;if(i===3)score=this.enemies({...t,side:h.side},s.radius).length>=3?10:1;}
  if(id===2){if(i===0)score=t.tower?8:3;if(i===1)score=3+Math.min(3,this.enemies({...t,side:h.side},s.radius).length);if(i===2)score=t.hero||t.tower?6:2;if(i===3)score=t.tower?10:this.enemies({...t,side:h.side},s.radius).length>=3?8:1;}
  if(id===3){if(i===0)score=2+Math.min(4,es.length);if(i===1)score=es.length>=2?7:1;if(i===2)score=incoming.some(u=>u.range>2)?8:0;if(i===3)score=this.enemies(h,15).some(u=>u.range>2)?7:es.length>=2?6:1;}
  if(id===4){if(i===0)score=(h.heat||0)<3?6:2+targets.length;if(i===1)score=(h.heat||0)>=s.heatThreshold&&this.enemies({...t,side:h.side},s.radius).length>=2?8:3;if(i===2)score=targets.length>=2?5+Math.min(2,targets.filter(u=>!u.hero).length):1;if(i===3)score=targets.length>=3?10:targets.length>=2&&targets.some(u=>u.hero)?7:0;}
  if(id===5){if(i===0)score=3;if(i===1)score=this.fields.some(f=>f.kind==='link'&&f.owner.id===h.id&&f.until>this.time+2)?0:5;if(i===2)score=7+targets.length;if(i===3)score=targets.filter(u=>u.hp/u.maxHp<.8).length*4;}
  if(score>0)choices.push({i,score});
 }
 return choices.sort((a,b)=>b.score-a.score||a.i-b.i)[0]?.i??-1;
}

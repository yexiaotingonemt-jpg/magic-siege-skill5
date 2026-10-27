import {HeroRules} from './hero-rules.js';
import {defaults,clone,classes,contractType,availableClasses} from './config.js';
import {TOWER_GUARD,towerGuardActive} from './tower-guard.js';
import {planSkillUpgrade} from './skill-progression.js';
import {chooseTarget,navigate} from './navigation.js';
import {setManualTarget} from './manual-target.js';
import {inAttackRange,ATTACK_RANGE_EPSILON} from './attack-range.js';
import {distributeTroops,TROOP_TYPES} from './troop-population.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const archetype=contractType;
const weights=[{damageTaken:35,heroDamage:35,kills:30},{heroDamage:50,minionDamage:20,kills:30},{buildingDamage:65,unitDamage:20,kills:15},{damageTaken:45,minionDamage:30,kills:25},{minionDamage:55,heroDamage:25,kills:20},{healing:50,shielding:30,assists:20}];
export class Simulation extends HeroRules {
 constructor(config=defaults,seed=1234){super();this.config=clone(config);this.seed=seed;this.time=0;this.nextId=1;this.nextProjectileId=1;this.units=[];this.projectiles=[];this.effects=[];this.fields=[];this.jobs=[];this.animations=[];this.visualId=0;this.logs=[];this.reports=[];this.metrics={waves:0,resets:0,casts:0,reselects:0,airHits:0,towerDamage:0,lifetimes:[]};this.players=[];this.waveAt=0;this.layer=0;this.makePlayer(0,false);this.resetMap(false);}
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 log(t){this.logs.unshift(`${this.time.toFixed(1)}s  ${t}`);this.logs.length=Math.min(40,this.logs.length);}
 makePlayer(side,bot=true){const p={id:this.players.length,name:bot?`契约者 ${this.players.length}`:'我',side,bot,classId:side?3:0,heroId:null,stamina:this.config.world.initialStamina,score:0,progress:Array.from({length:classes.length},()=>({level:1,xp:0,points:0})),builds:Array.from({length:classes.length},()=>[1,0,0,0]),cd:[0,0,0,0],auto:bot,lastBot:0};for(const key of ['level','xp','points'])Object.defineProperty(p,key,{enumerable:true,get(){return p.progress[p.classId][key];},set(value){p.progress[p.classId][key]=value;}});this.players.push(p);return p;}

 get player(){return this.players[this.localPlayerId??0];}
 setClass(id,p=this.player){if(this.hero(p)||!availableClasses(p.side,this.config).includes(id))return false;p.classId=id;p.points=Math.max(0,p.level-p.builds[id].reduce((n,x)=>n+x,0));return true;}
 hero(p=this.player){return this.units.find(u=>u.id===p.heroId&&u.hp>0);}
 setManualTarget(targetId,p=this.player){return setManualTarget(this,targetId,p);}
 get(id){return this.units.find(u=>u.id===id&&u.hp>0)||this.towers.find(u=>u.id===id&&u.hp>0);}
 activeTowers(){return this.towers.filter(t=>t.hp>0);}
 resetMap(settle=true){if(settle)for(const p of this.players){const h=this.hero(p);if(h)this.settle(h,'战区攻破');p.heroId=null;}this.units=[];this.projectiles=[];this.effects=[];this.fields=[];this.jobs=[];this.animations=[];this.layer=0;this.towers=[];for(let l=0;l<3;l++)for(let j=0;j<this.config.tower.columns;j++){const c=this.config.tower,m=l===0?1:l===1?c.middleMultiplier:c.rearMultiplier;this.towers.push({id:this.nextId++,tower:true,side:1,x:(j-(c.columns-1)/2)*c.spacing,y:l*c.layerSpacing,hp:c.hp*m,maxHp:c.hp*m,attack:c.attack*m,interval:c.interval,range:c.range,armor:0,layer:l,cd:0,shield:0,towerGuardTriggers:0,towerGuardUntil:0,contributors:{}});}this.waveAt=this.time;this.spawnWave();if(settle){this.metrics.resets++;this.log('全部防御塔全毁：结算存活贡献，战区重置，请重新契约');}}
 spawn(side,type,index,count,spawnX=0,spawnDepth=0){const c=this.config.troops[type],front=this.layer*this.config.tower.layerSpacing,hp=c.hp*c.durability*this.config.world.troopHpMultiplier*(side?this.config.world.defenseHpMultiplier:this.config.world.attackHpMultiplier);const u={...clone(c),id:this.nextId++,type,side,bornAt:this.time,x:spawnX,y:clamp((side?front+this.config.world.defenseSpawnOffset:this.config.world.attackSpawnY)+(side?1:-1)*["melee","ranged","siege"].indexOf(type)*this.config.world.spawnRowSpacing+(side?-1:1)*spawnDepth,this.config.world.mapMinY,this.config.world.mapMaxY),maxHp:hp,cd:this.random()*.2,hp,deploymentY:front+this.config.world.defenseRallyOffset,deploying:side===1,shield:0,targetId:null,contributors:{},support:{},scars:{}};this.units.push(u);return u;}
 // Sample the entire side's wave together, so different troop rows also spread out.
 wavePositions(count){
  const width=this.config.world.spawnHalfWidth*2;
  const gap=count>1?Math.min(this.config.world.spawnMinSpacing,width/(count-1)):0;
  const slack=width-Math.max(0,count-1)*gap;
  const offsets=Array.from({length:count},()=>this.random()*slack).sort((a,b)=>a-b);
  const positions=offsets.map((offset,i)=>-width/2+offset+i*gap);
  for(let i=positions.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];}
  return positions;
 }
 spawnRoster(side,counts){
  const columns=Math.max(1,Math.min(9,Math.floor(this.config.world.spawnHalfWidth*2/Math.max(1.5,this.config.world.spawnMinSpacing))+1));
  counts.forEach((count,type)=>{for(let first=0;first<count;first+=columns){const n=Math.min(columns,count-first),positions=this.wavePositions(n);for(let i=0;i<n;i++)this.spawn(side,TROOP_TYPES[type],first+i,count,positions[i],Math.floor(first/columns)*1.2);}});
 }
 spawnWave(){
  this.syncBots();
  const weights=(prefix)=>[this.config.waves[prefix+'Melee'],this.config.waves[prefix+'Ranged'],prefix==='attack'?this.config.waves.attackSiege:0];
  this.spawnRoster(0,distributeTroops(this.config.world.attackWaveSize,weights('attack')));
  this.spawnRoster(1,distributeTroops(this.config.world.defenseWaveSize,weights('defense')));
  this.metrics.waves++;this.waveAt=this.time+this.config.world.waveInterval;this.log(`第 ${this.metrics.waves} 波系统军团入场`);
 }
 syncBots(){const wanted=[this.config.world.attackBots,this.config.world.defenseBots];for(let s=0;s<2;s++){let ps=this.players.filter(p=>p.bot&&p.side===s&&!p.retired);while(ps.length<wanted[s]){const p=this.makePlayer(s);p.classId=availableClasses(s,this.config)[ps.length%availableClasses(s,this.config).length];ps.push(p);}for(const p of ps.slice(wanted[s])){const h=this.hero(p);if(h){this.settle(h,'机器人离场');h.hp=0;}p.retired=true;}}}
 contract(p=this.player,id){if(!availableClasses(p.side,this.config).includes(p.classId))return this.fail(p,'该阵营不可契约此职业');if(this.hero(p))return this.fail(p,'每人只能有一名存活英雄');if(p.stamina<this.config.world.contractCost)return this.fail(p,'契约体力不足');const candidates=this.units.filter(u=>!u.hero&&u.hp>0&&u.side===p.side&&u.type===archetype(p.classId)&&(!p.bot||u.id!==this.player.reservedUnitId)).sort((a,b)=>p.side?a.y-b.y:b.y-a.y);if(p.bot&&!this.hero(this.player)&&p.side===this.player.side&&!candidates.some(u=>u.id===this.player.reservedUnitId)&&!this.units.some(u=>u.id===this.player.reservedUnitId&&u.type===archetype(p.classId)))candidates.shift();const u=id?this.units.find(u=>u.id===id):candidates[0];if(!u||u.hero||u.hp<=0||u.side!==p.side||u.type!==archetype(p.classId))return this.fail(p,'请选择己方合法兵种：'+({melee:'近战',ranged:'远程',siege:'攻城'}[archetype(p.classId)]));const ratio=u.hp/u.maxHp,c=this.config.heroes[p.classId],baseMaxHp=c.hp*this.config.world.heroHpMultiplier*(p.side?this.config.world.defenseHpMultiplier:this.config.world.attackHpMultiplier),maxHp=baseMaxHp*(1+this.config.world.heroHpGrowth*(p.level-1));Object.assign(u,clone(c),{hp:maxHp*ratio,maxHp,baseMaxHp,baseAttack:c.attack,attack:c.attack*(1+this.config.world.heroAttackGrowth*(p.level-1)),hero:true,classId:p.classId,playerId:p.id,stats:{},start:this.time,combatAt:null,contractAt:this.time,shield:0,rawTaken:0,heat:0,spiritAt:this.time,castUntil:0,contributors:u.contributors||{},support:{}});u.manualTargetId=null;u.manualAttackTargetId=null;p.heroId=u.id;p.points=Math.max(0,p.level-p.builds[p.classId].reduce((n,x)=>n+x,0));p.stamina-=this.config.world.contractCost;if(!p.bot)this.notice='';this.log(p.name+' 契约 '+classes[p.classId]);return true;}
 fail(p,t){if(!p.bot)this.notice=t;return false;}
 expNeeded(p,classId=p.classId){return Math.round(this.config.world.expBase*this.config.world.expGrowth**(p.progress[classId].level-1))*this.config.world.expCostMultiplier;}
 addXp(p,n,classId=p?.classId){
  const progress=p?.progress[classId];if(!progress||!Number.isFinite(n)||n<=0)return;
  const before=progress.level;progress.xp+=n;
  while(progress.xp>=this.expNeeded(p,classId)&&progress.level<this.config.world.maxLevel){progress.xp-=this.expNeeded(p,classId);progress.level++;progress.points++;this.log(p.name+' 的'+classes[classId]+' 升到 Lv.'+progress.level);}
  const h=this.hero(p);if(h?.classId===classId&&progress.level!==before){const ratio=h.hp/h.maxHp;h.maxHp=h.baseMaxHp*(1+this.config.world.heroHpGrowth*(progress.level-1));h.hp=h.maxHp*ratio;h.attack=h.baseAttack*(1+this.config.world.heroAttackGrowth*(progress.level-1));}
 }

 upgradePlan(i,p=this.player){return planSkillUpgrade(p,i);}
 upgrade(i,p=this.player){if(!this.upgradePlan(i,p).ok)return false;p.builds[p.classId][i]++;p.points--;return true;}
 respec(p=this.player){p.points=p.level-1;p.builds[p.classId]=[1,0,0,0];}
 enemies(u,range=Infinity){return [...this.units,...this.activeTowers()].filter(t=>t.hp>0&&t.side!==u.side&&dist(u,t)<=range);}
 allies(u,range=Infinity,towers=false){return [...this.units,...(towers?this.activeTowers():[])].filter(t=>t.hp>0&&t.side===u.side&&dist(u,t)<=range);}
 stat(u,k,n){if(u?.hero){u.stats[k]=(u.stats[k]||0)+n;if(u.settledReport){const r=u.settledReport,old=r.reward;for(const part of r.parts){part.value=u.stats[part.key]||0;part.normalized=Math.min(100,part.value/this.config.rating[u.classId][part.key]*100);}r.rating=r.parts.reduce((n,p)=>n+p.normalized*p.weight/100,0);r.reward=this.config.world.scoreCap*r.rating/100;this.players[u.playerId].score+=r.reward-old;}}}
 die(t,a){if(t.deathDone)return;t.deathDone=true;for(const f of this.fields)if(f.kind==='dot'&&f.type==='soulburn'&&f.host===t.id&&f.until>=this.time&&!f.heatAwarded){f.heatAwarded=true;this.addHeat(f.owner,1);}if(!t.tower&&t.combatAt!=null){this.metrics.lifetimes.push({id:t.id,hero:!!t.hero,classId:t.classId,type:t.type,side:t.side,engagedAt:t.combatAt,diedAt:this.time,seconds:this.time-t.combatAt,lifetimeSeconds:this.time-(t.bornAt??t.start??t.combatAt),heroSeconds:t.hero?this.time-t.contractAt:undefined});if(this.metrics.lifetimes.length>200)this.metrics.lifetimes.splice(0,this.metrics.lifetimes.length-200);}if(a?.hero&&a.id!==t.id){this.stat(a,'kills',1);if(t.hero)this.stat(a,'heroKills',1);this.onKill?.(a,t);}if(t.tower&&a?.hero)this.addXp(this.players[a.playerId],this.config.world.towerBreakXp,a.classId);const ids=new Set();for(const [id,time]of Object.entries(t.contributors||{}))if(this.time-time<=this.config.world.assistWindow&&Number(id)!==a?.playerId)ids.add(Number(id));if(a)for(const[id,time]of Object.entries(a.support||{}))if(this.time-time<=this.config.world.assistWindow&&Number(id)!==a.playerId)ids.add(Number(id));for(const id of ids){const h=this.hero(this.players[id]);if(h){this.stat(h,'kills',1);this.stat(h,'assists',1);}}this.onUnitDeath?.(t,a);if(t.hero){this.settle(t,'阵亡');this.players[t.playerId].heroId=null;this.log(this.players[t.playerId].name+' 的'+classes[t.classId]+'阵亡');}this.fx(t,'#dbbc77',2);}
 settle(h,reason){h.stats.survival=this.time-h.contractAt;const p=this.players[h.playerId],parts=Object.entries(this.config.ratingWeights[h.classId]).map(([k,w])=>({key:k,value:h.stats[k]||0,normalized:Math.min(100,(h.stats[k]||0)/this.config.rating[h.classId][k]*100),weight:w}));const rating=parts.reduce((s,x)=>s+x.normalized*x.weight/100,0),reward=this.config.world.scoreCap*rating/100;p.score+=reward;this.reports.unshift({name:p.name,classId:h.classId,reason,rating,reward,parts,time:this.time});h.settledReport=this.reports[0];this.reports.length=Math.min(100,this.reports.length);}
 visual(kind,source,target=source,extra={}){const event={id:++this.visualId,kind,sourceId:source.id,classId:source.classId,side:source.side,from:{x:source.x,y:source.y},to:{x:target.x,y:target.y},start:this.time,until:this.time+1,...extra};this.animations.push(event);return event;}
 fx(p,color,radius=2){this.effects.push({x:p.x,y:p.y,color,radius,until:this.time+.5,start:this.time});}
 projectile(a,t,power,aoe=0,basic=false){this.projectiles.push({id:this.nextProjectileId++,source:a,sourceId:a.id,targetId:t.id,x:a.x,y:a.y,tx:t.x,ty:t.y,power,aoe,basic,skillId:basic?null:a.skillAnimation?.skill,reselected:false});}
 engagementMap(){const m=new Map();for(const a of [...this.units,...this.activeTowers()])if(a.hp>0&&a.targetId&&this.get(a.targetId)){if(!m.has(a.targetId))m.set(a.targetId,new Set());m.get(a.targetId).add(a.id);}return m;}
 choose(u){return chooseTarget(this,u);}
 tick(dt){this.time+=dt;for(const t of this.towers)if(t.hp<=0&&!t.deathDone)this.die(t);if(this.activeTowers().length===0){this.resetMap();return;}const front=this.layer;while(this.layer<2&&!this.towers.some(t=>t.layer===this.layer&&t.hp>0))this.layer++;if(this.layer!==front)this.log('防线突破：推进至第 '+(this.layer+1)+' 排');
 if(this.time>=this.waveAt)this.spawnWave();
 for(const p of this.players){if(p.retired)continue;const h=this.hero(p);if(p.bot&&!h&&this.time-p.lastBot>1){this.contract(p);p.lastBot=this.time;}if(h){if((p.auto||p.bot)&&this.time-p.lastBot>=this.config.world.botCastInterval){const i=this.chooseAutoSkill(p);if(i>=0)this.cast(i,p);p.lastBot=this.time;}if(p.bot&&p.points){for(let i=3;i>=0;i--)if(this.upgrade(i,p))break;}}}

 const ready=this.jobs.filter(j=>j.at<=this.time);this.jobs=this.jobs.filter(j=>j.at>this.time);for(const j of ready)j.run();
 this.processSkillEffects();
 for(const u of [...this.units,...this.activeTowers()]){if(u.hp<=0)continue;this.syncAttackCooldown(u);const skillMoving=this.updateUnitEffects(u,dt);if(skillMoving)continue;const t=navigate(this,u,dt);
 if(inAttackRange(u,t)){if(u.cd<=this.time){
  const targets=towerGuardActive(u,this.time)?[t,...this.enemies(u,u.range+ATTACK_RANGE_EPSILON).filter(e=>e.id!==t.id).sort((a,b)=>dist(u,a)-dist(u,b))].slice(0,TOWER_GUARD.targets):[t];
  u.combatAt??=this.time;const slow=this.attackSlowRatio(u),haste=this.attackRate(u);u.lastAttackAt=this.time;u.attackTo={x:t.x,y:t.y};u.cd=this.time+u.interval/haste;u.cooldownSlowRatio=slow;
  for(const target of targets){target.combatAt??=this.time;let n=u.attack;if(target.tower&&u.classId!==2)n*=u.buildingBonus||1;if(u.range>2||u.tower)this.projectile(u,target,n,0,true);else{this.damage(u,target,n,true);this.fx(target,u.side?'#f5acaf':'#97c8f9',.5);}this.afterBasicAttack?.(u,target);}
 }}


 }
 for(const b of this.projectiles){let t=this.get(b.targetId);if(!t&&!b.payload&&!b.aoe&&!b.reselected){b.reselected=true;const next=this.enemies(b.source,this.config.world.retargetRadius).sort((a,z)=>dist(b,a)-dist(b,z))[0];if(next){b.targetId=next.id;t=next;this.metrics.reselects++;}}if(t&&(!b.aoe||b.payload)&&!b.fixed){b.tx=t.x;b.ty=t.y;}const d=Math.hypot(b.tx-b.x,b.ty-b.y),step=this.config.world.projectileSpeed*dt;if(d<=step){b.done=true;if(b.source.hero&&!b.basic)this.visual('impact',b.source,{x:b.tx,y:b.ty},{skill:b.skillId,until:this.time+.6});if(b.payload){this.impactSkill(b);}else if(b.aoe){for(const e of this.enemies({x:b.tx,y:b.ty,side:b.source.side},b.aoe))this.damage(b.source,e,b.power,b.basic);this.fx({x:b.tx,y:b.ty},'#efb667',b.aoe);}else if(t){const dealt=this.damage(b.source,t,b.power,b.basic);}else this.metrics.airHits++;}else{b.x+=(b.tx-b.x)/d*step;b.y+=(b.ty-b.y)/d*step;}}
 this.projectiles=this.projectiles.filter(b=>!b.done);this.effects=this.effects.filter(e=>e.until>this.time);this.fields=this.fields.filter(f=>f.until>this.time);this.units=this.units.filter(u=>u.hp>0);this.animations=this.animations.filter(e=>e.until>this.time&&(!['cast','charge'].includes(e.kind)||this.get(e.sourceId)));this.notice=this.notice||'';
 }
}





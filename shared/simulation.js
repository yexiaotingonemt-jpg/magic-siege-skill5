import {isCurrentDesign,currentStatPoints,currentContributionParts,currentValues,drawCurrentQuality} from './current-design.js';
import {eligibleAssists} from './assist-rules.js';
import {recordContractReport} from './contract-history.js';
import {statPoints,contributionParts} from './contribution-score.js';
import {refreshCommonStats} from './common-traits.js';
import {HeroRules} from './hero-rules.js';
import {defaults,clone,classes,contractType,availableClasses} from './config.js';
import {TOWER_GUARD,towerGuardActive} from './tower-guard.js';
import {planSkillUpgrade} from './skill-progression.js';
import {chooseTrait,prepareChoice,rarityAt,skillRanks} from './traits.js';
import {chooseTarget,navigate} from './navigation.js';
import {setManualTarget} from './manual-target.js';
import {inAttackRange,ATTACK_RANGE_EPSILON} from './attack-range.js';
import {distributeTroops,TROOP_TYPES} from './troop-population.js';
import {balanceNpcHeroes,npcBalanceStatus} from './npc-balance.js';
import {ELITE_SCORE,eliteScoreActive} from './elite-score.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const archetype=contractType;
export class Simulation extends HeroRules {
 constructor(config=defaults,seed=1234){super();this.config=clone(config);this.seed=seed;this.time=0;this.nextId=1;this.nextProjectileId=1;this.units=[];this.projectiles=[];this.effects=[];this.fields=[];this.jobs=[];this.animations=[];this.visualId=0;this.logs=[];this.reports=[];this.metrics={waves:0,resets:0,casts:0,reselects:0,airHits:0,towerDamage:0,lifetimes:[]};this.players=[];this.summonOwners=new Map();this.battleEvents=[];this.battleEventId=0;this.waveNumber=0;this.waveAt=0;this.layer=0;this.makePlayer(0,false);this.resetMap(false);}
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 log(t){this.logs.unshift(`${this.time.toFixed(1)}s  ${t}`);this.logs.length=Math.min(40,this.logs.length);}
 makePlayer(side,bot=true){const p={id:this.players.length,name:bot?`契约者 ${this.players.length}`:'我',side,bot,classId:side?3:0,heroId:null,stamina:this.config.world.initialStamina,staminaSpent:0,totalPoints:0,score:0,progress:Array.from({length:classes.length},()=>({level:this.config.world.initialLevel,xp:0,points:0,traits:{},choices:[]})),builds:Array.from({length:classes.length},()=>isCurrentDesign(this.config)?[1,1,1,1]:[1,1,1,0]),cd:[0,0,0,0],auto:bot,lastBot:0};for(const key of ['level','xp','points'])Object.defineProperty(p,key,{enumerable:true,get(){return p.progress[p.classId][key];},set(value){p.progress[p.classId][key]=value;}});this.players.push(p);return p;}

 get player(){return this.players[this.localPlayerId??0];}
 setClass(id,p=this.player){if(this.hero(p)||!availableClasses(p.side,this.config).includes(id))return false;p.classId=id;p.points=0;return true;}
 hero(p=this.player){return this.units.find(u=>u.id===p.heroId&&u.hp>0);}
 setManualTarget(targetId,p=this.player){return setManualTarget(this,targetId,p);}
 get(id){return this.units.find(u=>u.id===id&&u.hp>0)||this.towers.find(u=>u.id===id&&u.hp>0);}
 activeTowers(){return this.towers.filter(t=>t.hp>0);}
 resetMap(settle=true){if(settle)for(const p of this.players){const h=this.hero(p);if(h)this.settle(h,'战区攻破');p.heroId=null;}this.units=[];this.projectiles=[];this.effects=[];this.fields=[];this.jobs=[];this.animations=[];this.layer=0;this.towers=[];for(let l=0;l<3;l++)for(let j=0;j<this.config.tower.columns;j++){const c=this.config.tower,m=l===0?1:l===1?c.middleMultiplier:c.rearMultiplier;this.towers.push({id:this.nextId++,tower:true,side:1,x:(j-(c.columns-1)/2)*c.spacing,y:l*c.layerSpacing,hp:c.hp*m,maxHp:c.hp*m,attack:c.attack*m,interval:c.interval,range:c.range,armor:0,layer:l,cd:0,shield:0,towerGuardTriggers:0,towerGuardUntil:0,contributors:{}});}this.summonOwners.clear();this.waveNumber=0;this.waveAt=this.time;this.spawnWave();if(settle){this.metrics.resets++;this.log('全部防御塔全毁：结算存活贡献，战区重置，请重新契约');}}
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
  if(!this.npcPolicy)this.syncBots();
  const weights=(prefix)=>[this.config.waves[prefix+'Melee'],this.config.waves[prefix+'Ranged'],prefix==='attack'?this.config.waves.attackSiege:0];
  this.spawnRoster(0,distributeTroops(this.config.world.attackWaveSize,weights('attack')));
  this.spawnRoster(1,distributeTroops(this.config.world.defenseWaveSize,weights('defense')));
  this.waveNumber++;if(this.waveNumber%3===0)for(const side of [0,1]){const e=this.spawn(side,'melee',0,1,(this.random()-.5)*6);Object.assign(e,{elite:true,hp:12000,maxHp:12000,attack:150,interval:1.5,range:1.5,aggro:5,speed:2});}
  balanceNpcHeroes(this);
  this.metrics.waves++;this.waveAt=this.time+this.config.world.waveInterval;this.log(`第 ${this.metrics.waves} 波系统军团入场`);
 }
 syncBots(){if(this.npcPolicy)return;const wanted=[this.config.world.attackBots,this.config.world.defenseBots];for(let s=0;s<2;s++){let ps=this.players.filter(p=>p.bot&&p.side===s&&!p.retired);while(ps.length<wanted[s]){const p=this.makePlayer(s);p.classId=availableClasses(s,this.config)[ps.length%availableClasses(s,this.config).length];ps.push(p);}for(const p of ps.slice(wanted[s])){const h=this.hero(p);if(h){this.settle(h,'机器人离场');h.hp=0;}p.retired=true;}}}
 contract(p=this.player,id){const cost=isCurrentDesign(this.config)?this.config.design.rules.contractCost:this.config.world.contractCost;if(!availableClasses(p.side,this.config).includes(p.classId))return this.fail(p,'该阵营不可契约此职业');if(this.hero(p))return this.fail(p,'每人只能有一名存活英雄');if(p.stamina<cost)return this.fail(p,'契约体力不足');const candidates=this.units.filter(u=>!u.hero&&!u.elite&&!u.summoned&&u.hp>0&&u.side===p.side&&u.type===archetype(p.classId)&&(!p.bot||u.id!==this.player.reservedUnitId)).sort((a,b)=>p.side?a.y-b.y:b.y-a.y);if(p.bot&&!this.hero(this.player)&&p.side===this.player.side&&!candidates.some(u=>u.id===this.player.reservedUnitId)&&!this.units.some(u=>u.id===this.player.reservedUnitId&&u.type===archetype(p.classId)))candidates.shift();const u=id?this.units.find(u=>u.id===id):candidates[0];if(!u||u.hero||u.elite||u.summoned||u.hp<=0||u.side!==p.side||u.type!==archetype(p.classId))return this.fail(p,'请选择己方合法兵种：'+({melee:'近战',ranged:'远程',siege:'攻城'}[archetype(p.classId)]));const ratio=u.hp/u.maxHp,c=this.config.heroes[p.classId],baseMaxHp=c.hp*this.config.world.heroHpMultiplier*(p.side?this.config.world.defenseHpMultiplier:this.config.world.attackHpMultiplier),maxHp=baseMaxHp*(1+this.config.world.heroHpGrowth*Math.max(0,p.level-1));Object.assign(u,clone(c),{hp:maxHp*ratio,maxHp,baseMaxHp,baseAttack:c.attack,attack:c.attack*(1+this.config.world.heroAttackGrowth*Math.max(0,p.level-1)),hero:true,classId:p.classId,playerId:p.id,stats:{},start:this.time,combatAt:null,contractAt:this.time,shield:0,rawTaken:0,heat:0,spiritAt:this.time,castUntil:0,contributors:u.contributors||{},support:{}});u.manualTargetId=null;u.manualMoveTargetId=null;u.manualAttackTargetId=null;p.heroId=u.id;p.points=0;p.builds[p.classId]=isCurrentDesign(this.config)?[1,1,1,1]:skillRanks(p.level);refreshCommonStats(this,u);if(isCurrentDesign(this.config)&&u.classId===4){u.heat=this.config.design.rules.initialHeat+(currentValues(this,u).initial_heat||0);u.heatUntil=this.time+this.config.design.rules.heatDuration+(currentValues(this,u).heat_duration_extra||0);}this.spendStamina(p,cost,u);if(!p.bot)this.notice='';this.log(p.name+' 契约 '+classes[p.classId]);return true;}
 fail(p,t){if(!p.bot)this.notice=t;return false;}
 spendStamina(p,cost,h=this.hero(p)){
  if(!Number.isFinite(cost)||cost<=0||p.stamina<cost)return false;
  p.stamina-=cost;p.staminaSpent+=cost;
  this.stat(h,'staminaSpent',cost);
  this.addXp(p,cost*this.config.world.expPerStamina,h?.classId??p.classId);
  return true;
 }
 expNeeded(p,classId=p.classId){const level=p.progress[classId].level;return level>=this.config.world.maxLevel?Infinity:this.config.world.levelUpStamina[level]*this.config.world.expPerStamina;}
 addXp(p,n,classId=p?.classId){
  const progress=p?.progress[classId];if(!progress||!Number.isFinite(n)||n<=0)return;
  if(progress.level>=this.config.world.maxLevel){progress.xp=0;return;}const before=progress.level;progress.xp+=n;
  while(progress.xp>=this.expNeeded(p,classId)&&progress.level<this.config.world.maxLevel){progress.xp-=this.expNeeded(p,classId);progress.level++;progress.points=0;progress.traits??={};progress.choices??=[];progress.choices.push({level:progress.level,rarity:isCurrentDesign(this.config)?drawCurrentQuality(this,progress,classId):rarityAt(progress.level)});p.builds[classId]=isCurrentDesign(this.config)?[1,1,1,1]:skillRanks(progress.level);prepareChoice(this,p,classId);this.log(p.name+' 的'+classes[classId]+' 升到 Lv.'+progress.level);}
  if(progress.level>=this.config.world.maxLevel)progress.xp=0;
  const h=this.hero(p);if(h?.classId===classId&&progress.level!==before){const ratio=h.hp/h.maxHp;h.maxHp=h.baseMaxHp*(1+this.config.world.heroHpGrowth*Math.max(0,progress.level-1));h.hp=h.maxHp*ratio;h.attack=h.baseAttack*(1+this.config.world.heroAttackGrowth*Math.max(0,progress.level-1));refreshCommonStats(this,h);}
 }

 upgradePlan(i,p=this.player){return planSkillUpgrade(p,i);}
 upgrade(i,p=this.player){return this.fail(p,'基础技能自动解锁，升级通过词条强化');}
 respec(p=this.player){return this.fail(p,'词条构筑保留至本场结束，不能重分技能点');}
 chooseTrait(id,level,p=this.player,classId=p.classId){const h=this.hero(p);if(!Number.isInteger(classId)||!availableClasses(p.side,this.config).includes(classId)||h&&h.classId!==classId)return this.fail(p,'只能选择本阵营待契约职业或当前英雄的强化');const ok=chooseTrait(this,p,id,level,classId);if(ok&&h)refreshCommonStats(this,h);return ok;}
 enemies(u,range=Infinity){return [...this.units,...this.activeTowers()].filter(t=>t.hp>0&&t.side!==u.side&&dist(u,t)<=range);}
 allies(u,range=Infinity,towers=false){return [...this.units,...(towers?this.activeTowers():[])].filter(t=>t.hp>0&&t.side===u.side&&dist(u,t)<=range);}
 stat(u,k,n){if(!u?.hero||!Number.isFinite(n)||n<=0)return;u.stats??={};if(!isCurrentDesign(this.config)&&this.config.innate?.enabled===1&&!u.innateScoreBase)u.innateScoreBase=Object.fromEntries(contributionParts(u).map(r=>[r.key,{value:r.value,points:r.points}]));u.stats[k]=(u.stats[k]||0)+n;const base=isCurrentDesign(this.config)?currentStatPoints(this.config,u.classId,k,n):statPoints(u.classId,k,n,this.config),bonus=eliteScoreActive(u,this.time)?base*ELITE_SCORE.bonus:0,delta=base+bonus,p=this.players[u.playerId];if(bonus)u.stats.eliteScoreBonus=(u.stats.eliteScoreBonus||0)+bonus;p.totalPoints+=delta;p.score+=delta;if(u.settledReport){const r=u.settledReport;r.parts=this.ratingParts(u);r.points=r.parts.reduce((sum,part)=>sum+part.points,0);}}
 die(t,a,summonedKill=false){if(a?.summoned)a=this.get(a.ownerId)||this.summonOwners.get(a.ownerId)||a;if(t.deathDone)return;t.deathDone=true;for(const f of this.fields)if(f.kind==='dot'&&f.type==='soulburn'&&f.host===t.id&&f.until>=this.time&&!f.heatAwarded){f.heatAwarded=true;this.addHeat(f.owner,1);}if(!t.tower&&t.combatAt!=null){this.metrics.lifetimes.push({id:t.id,hero:!!t.hero,classId:t.classId,type:t.type,side:t.side,engagedAt:t.combatAt,diedAt:this.time,seconds:this.time-t.combatAt,lifetimeSeconds:this.time-(t.bornAt??t.start??t.combatAt),heroSeconds:t.hero?this.time-t.contractAt:undefined});if(this.metrics.lifetimes.length>200)this.metrics.lifetimes.splice(0,this.metrics.lifetimes.length-200);}if(a?.hero&&a.id!==t.id){this.stat(a,'kills',1);if(t.hero)this.stat(a,'heroKills',1);else if(!t.tower){this.stat(a,'minionKills',1);this.stat(a,'minionKillHealth',t.maxHp);}this.onKill?.(a,t,summonedKill);}if(t.tower&&a?.hero&&!isCurrentDesign(this.config))this.addXp(this.players[a.playerId],this.config.world.towerBreakXp,a.classId);for(const h of eligibleAssists(this,t,a)){this.stat(h,'kills',1);this.stat(h,'assists',1);if(t.hero)this.stat(h,'heroAssists',1);}this.onUnitDeath?.(t,a);if(t.hero){this.settle(t,'阵亡');this.players[t.playerId].heroId=null;this.log(this.players[t.playerId].name+' 的'+classes[t.classId]+'阵亡');}this.fx(t,'#dbbc77',2);}
 ratingParts(h){return isCurrentDesign(this.config)?currentContributionParts(this.config,h):contributionParts(h,this.config);}
 contribution(p){if(isCurrentDesign(this.config)){const B=p.totalPoints-this.config.design.rules.staminaPoints*p.staminaSpent;return {totalPoints:p.totalPoints,battlePoints:B,staminaSpent:p.staminaSpent,kda:B/Math.max(p.staminaSpent,this.config.design.rules.standardStamina),kdaMode:'battle',standardStamina:this.config.design.rules.standardStamina};}return {totalPoints:p.totalPoints,staminaSpent:p.staminaSpent,kda:p.staminaSpent>0?p.totalPoints/p.staminaSpent:null};}
 settle(h,reason){if(h.settledReport)return;h.stats.survival=this.time-h.contractAt;const p=this.players[h.playerId],parts=this.ratingParts(h),points=parts.reduce((sum,x)=>sum+x.points,0),report={name:p.name,classId:h.classId,reason,points,parts,time:this.time};recordContractReport(this,h,report);this.reports.unshift(report);h.settledReport=report;this.reports.length=Math.min(100,this.reports.length);}
 visual(kind,source,target=source,extra={}){const event={id:++this.visualId,kind,sourceId:source.id,classId:source.classId,side:source.side,from:{x:source.x,y:source.y},to:{x:target.x,y:target.y},start:this.time,until:this.time+1,...extra};this.animations.push(event);return event;}
 fx(p,color,radius=2){this.effects.push({x:p.x,y:p.y,color,radius,until:this.time+.5,start:this.time});}
 projectile(a,t,power,aoe=0,basic=false){this.projectiles.push({id:this.nextProjectileId++,source:a,sourceId:a.id,targetId:t.id,x:a.x,y:a.y,tx:t.x,ty:t.y,power,aoe,basic,skillId:basic?null:a.skillAnimation?.skill,reselected:false});}
 engagementMap(){const m=new Map();for(const a of [...this.units,...this.activeTowers()])if(a.hp>0&&a.targetId&&this.get(a.targetId)){if(!m.has(a.targetId))m.set(a.targetId,new Set());m.get(a.targetId).add(a.id);}return m;}
 choose(u){return chooseTarget(this,u);}
 tick(dt){this.time+=dt;for(const t of this.towers)if(t.hp<=0&&!t.deathDone)this.die(t);if(this.activeTowers().length===0){this.resetMap();return;}const front=this.layer;while(this.layer<2&&!this.towers.some(t=>t.layer===this.layer&&t.hp>0))this.layer++;if(this.layer!==front)this.log('防线突破：推进至第 '+(this.layer+1)+' 排');
 if(this.time>=this.waveAt)this.spawnWave();
 const npcStatus=this.npcPolicy?.mode==='ratio'?npcBalanceStatus(this):null;
 for(const p of this.players){
  if(p.retired)continue;
  const h=this.hero(p);
  if(p.bot&&!h&&!this.npcPolicy&&this.time-p.lastBot>1){this.contract(p);p.lastBot=this.time;}
  if(h){
   const ai=p.bot?this.botAiSettings(p,npcStatus):null;
   const castInterval=this.config.world.botCastInterval*(ai?.castIntervalMultiplier??1);
   if((p.auto||p.bot)&&this.time-p.lastBot>=castInterval){
    const i=this.chooseAutoSkill(p,ai);
    if(i>=0)this.cast(i,p);
    p.lastBot=this.time;
   }
   if(p.bot&&p.progress[p.classId].choices?.length){
    const choice=prepareChoice(this,p);
    if(choice?.options?.length)this.chooseTrait(choice.options[0],choice.level,p);
   }
  }
 }

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
 this.projectiles=this.projectiles.filter(b=>!b.done);this.effects=this.effects.filter(e=>e.until>this.time);this.fields=this.fields.filter(f=>f.until>this.time);this.units=this.units.filter(u=>u.hp>0);this.animations=this.animations.filter(e=>e.until>this.time&&(!['cast','charge'].includes(e.kind)||this.get(e.sourceId)));for(const id of this.summonOwners.keys())if(!this.units.some(u=>u.summoned&&u.ownerId===id))this.summonOwners.delete(id);this.notice=this.notice||'';
 }
}





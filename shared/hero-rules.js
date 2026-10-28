// 职业技能设计4：DingTalk st-3dff1c63-55938, rows20–43.
import {triggerTowerGuard,towerGuardActive,TOWER_GUARD} from './tower-guard.js';
import {names} from './config.js';
import {SKILL_PROGRESSION} from './skill-progression.js';
import {adjustAttackCooldown} from './attack-cooldown.js';
import {available,spend,createSkillValue} from './skill-value.js';
import {selectSkill5 as selectSkill4,chooseRandomTarget,scaleSkill4,resolveSkill5 as resolveSkill4,impactSkill4,processSkill5Effects as processSkill4Effects,updateSkill5Unit as updateSkill4Unit,chooseSkill5 as chooseSkill4} from './skill5-mechanics.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),factor=(s,rank)=>1+s.levelGrowth*(Math.max(1,rank)-1);
const nearest=(o,es)=>es.sort((a,b)=>dist(o,a)-dist(o,b)||a.id-b.id);
export class HeroRules{
 activeDebuffs(u,kind=null){return Object.values(u.debuffs||{}).filter(d=>d.until>this.time&&(d.prepaid||available(d.value)>1e-7)&&(!kind||d.kind===kind));}
 attackSlowRatio(u){return Math.max(0,...this.activeDebuffs(u,'attackSpeedDown').map(d=>d.ratio));}
 syncAttackCooldown(u){const next=this.attackSlowRatio(u);if(u.cooldownSlowRatio!=null)adjustAttackCooldown(u,this.time,u.cooldownSlowRatio,next);else u.cooldownSlowRatio=next;return next;}
 attackPower(u){const down=Math.max(0,...this.activeDebuffs(u,'attackDown').filter(d=>available(d.value)>0).map(d=>d.ratio));return Math.max(0,(u.attack||0)*(u.boostUntil>this.time&&available(u.boostValue)>0?1+u.attackBoost:1)*(1-down));}
 attackEffect(u,n){if(!u)return n;let result=n;if(u.boostUntil>this.time)result+=spend(u.boostValue,n*u.attackBoost,'增攻');const down=this.activeDebuffs(u,'attackDown').filter(d=>available(d.value)>0).sort((a,b)=>b.ratio-a.ratio)[0];if(down)result-=spend(down.value,result*down.ratio,'降攻');return result;}
 skillPower(h,i){const s=this.config.heroes[h.classId].skills[i];return this.attackPower(h)*s.power/100*factor(s,this.players[h.playerId].builds[h.classId][i]);}
 scarCount(u){return Math.min(3,Object.values(u?.scars||{}).flat().filter(until=>until>this.time).length);}
 addScar(u,source,duration,cap=3){if(u.hp<=0||u.tower||u.immuneUntil>this.time)return;u.scars??={};for(const [id,entries]of Object.entries(u.scars))u.scars[id]=entries.filter(until=>until>this.time);const all=Object.values(u.scars).flat().sort((a,b)=>a-b);if(all.length>=cap){const first=all[0];for(const entries of Object.values(u.scars)){const index=entries.indexOf(first);if(index>=0){entries.splice(index,1);break;}}}u.scars[source.id]??=[];u.scars[source.id].push(this.time+duration);}
 conduct(u,source,duration){if(u.hp>0&&!u.tower&&!(u.immuneUntil>this.time))u.conductUntil=Math.max(u.conductUntil||0,this.time+duration);}
 addHeat(h,n){if(h?.hp>0&&h.classId===4){const cap=this.config.heroes[4].skills[0].heatCap;h.heat=Math.min(cap,(h.heat||0)+n);h.heatUntil=this.time+this.config.heroes[4].skills[0].heatDuration;this.visual('heat',h,h,{skill:0,until:this.time+.6});}}
 moveUnit(u,x,y){u.x=Math.max(-this.config.world.spawnHalfWidth,Math.min(this.config.world.spawnHalfWidth,x));u.y=Math.max(this.config.world.mapMinY,Math.min(this.config.world.mapMaxY,y));}
 hasNegative(u){return this.scarCount(u)>0||u.conductUntil>this.time||this.activeDebuffs(u).length>0||u.tauntUntil>this.time||u.stunUntil>this.time||u.slowUntil>this.time||this.fields.some(f=>f.kind==='dot'&&f.host===u.id&&f.until>this.time&&available(f.s?.value)>1e-7);}
 cleanse(u){const slow=this.syncAttackCooldown(u),cleaned=this.hasNegative(u);u.debuffs={};u.scars={};u.conductUntil=0;u.tauntUntil=0;u.tauntId=null;u.stunUntil=0;u.slowUntil=0;this.fields=this.fields.filter(f=>!(f.kind==='dot'&&f.host===u.id));adjustAttackCooldown(u,this.time,slow,0);return cleaned;}
 interrupt(u){u.castToken=(u.castToken||0)+1;u.castUntil=this.time;u.channelUntil=0;u.skillAnimation=null;u.dash=null;this.fields=this.fields.filter(f=>!(['barrage','runeBarrage'].includes(f.kind)&&f.owner.id===u.id));}
 debuff(u,source,kind,ratio,duration,value=null,prepaid=false){if(u.hp<=0||u.immuneUntil>this.time)return false;const slow=kind==='attackSpeedDown'?this.syncAttackCooldown(u):0;u.debuffs??={};u.debuffs[source.id+':'+kind]={kind,ratio,until:this.time+duration,value,prepaid};if(kind==='attackSpeedDown')adjustAttackCooldown(u,this.time,slow,this.attackSlowRatio(u));return true;}
 stun(u,source,duration){if(u.tower||u.hp<=0||u.immuneUntil>this.time)return false;this.interrupt(u);u.stunUntil=Math.max(u.stunUntil||0,this.time+duration);return true;}
 shield(u,amount,owner,duration,value=null){if(u.shieldOwner!==owner.id&&amount<=u.shield)return false;Object.assign(u,{shield:amount,shieldOwner:owner.id,shieldSource:owner,shieldUntil:this.time+duration,shieldValue:value});return true;}
 attackRate(u){let haste=1;if(u.haste?.until>this.time&&available(u.haste.value)>0){spend(u.haste.value,u.attack*u.haste.ratio/(1+u.haste.ratio),'攻速提升等效');haste+=u.haste.ratio;}const slow=this.activeDebuffs(u,'attackSpeedDown').sort((a,b)=>b.ratio-a.ratio)[0];if(!slow)return haste;spend(slow.value,u.attack*slow.ratio/(1-slow.ratio),'攻速降低等效');return haste*Math.max(.1,1-slow.ratio);}
 heal(t,n,u,value=null,shared=false){
  if(t.hp<=0)return 0;const missing=t.maxHp-t.hp;let amount=spend(value,Math.max(0,Math.min(n,missing)),'治疗');
  const down=this.activeDebuffs(t,'healingDown').sort((a,b)=>b.ratio-a.ratio)[0];if(down)amount-=spend(down.value,amount*down.ratio,'减疗');
  if(t.healingBoostUntil>this.time)amount+=spend(t.healingBoostValue,Math.min(Math.max(0,missing-amount),amount*t.healingBoost),'治疗增幅');
  const actual=Math.max(0,Math.min(amount,missing));t.hp+=actual;this.stat(u,'healing',actual);
  if(u?.hero&&actual>0){this.visual('healing',u,t,{skill:u.skillAnimation?.skill??0,until:this.time+.55});t.support??={};t.support[u.playerId]=this.time;}
  if(actual>0&&!shared)for(const f of this.fields.filter(f=>f.kind==='link'&&f.until>this.time&&f.owner.hp>0&&this.get(f.host)&&(f.owner.id===t.id||f.host===t.id))){const other=t.id===f.owner.id?this.get(f.host):f.owner;if(other?.hp>0)this.heal(other,actual*(f.shareRatio??1),f.owner,f.value,true);}
  return actual;
 }
 damage(a,t,n,basic=false,reflected=false,meta={}){
  if(!t||t.hp<=0)return 0;
  if(t.shieldUntil<=this.time){t.shield=0;t.shieldExplosion=0;}
  if(basic&&a?.classId===2&&t.tower)n*=a.buildingBonus;
  if(meta.buildingBonus&&t.tower)n*=1+meta.buildingBonus;
  n=spend(meta.value,n,'伤害');if(basic||meta.attackScaled)n=this.attackEffect(a,n);
  const vulnerable=this.activeDebuffs(t,'vulnerable').filter(d=>available(d.value)>0).sort((a,b)=>b.ratio-a.ratio)[0];if(vulnerable)n+=spend(vulnerable.value,n*vulnerable.ratio,'易伤');
  const links=this.fields.filter(f=>f.kind==='link'&&f.until>this.time&&f.owner.hp>0&&this.get(f.host)&&f.host===t.id);
  const link=links.filter(f=>available(f.value)>0).sort((a,b)=>b.ratio-a.ratio)[0],guards=[];
  for(const g of t.guards||[])if(g.until>this.time&&available(g.value)>0)guards.push(g);
  if(link)guards.push({ratio:link.ratio,value:link.value});
  if(t.classId===0&&t.shield>0&&t.shieldUntil>this.time&&this.scarCount(a)>0)guards.push({ratio:t.scarGuardRatio,value:t.shieldValue});
  if(t.tauntReductionUntil>this.time)guards.push({ratio:t.tauntReduction,value:t.tauntValue});
  if(!basic&&!reflected&&t.skillGuardUntil>this.time)guards.push({ratio:t.skillGuardRatio,value:t.skillGuardValue});
  const rawDamage=Math.max(0,n);n=rawDamage*100/(100+(t.armor||0));const before=n;let reduced=0;for(const guard of guards){const prevented=spend(guard.value,Math.min(before*guard.ratio,before*.8-reduced),'减伤');reduced+=prevented;}n-=reduced;if(towerGuardActive(t,this.time))n*=1-TOWER_GUARD.damageReduction;
  const absorbed=spend(t.shieldValue,Math.min(t.shield||0,n),'护盾吸收');t.shield=Math.max(0,(t.shield||0)-absorbed);if(available(t.shieldValue)<=1e-7)t.shield=0;if(absorbed)this.stat(t.shieldSource,'shielding',absorbed);
  const actual=Math.min(t.hp,Math.max(0,n-absorbed)),sum=actual+absorbed;t.hp-=actual;
  if(sum>0){t.lastHitAt=this.time;if(a&&a.side!==t.side){t.combatAt??=this.time;a.combatAt??=this.time;}this.stat(a,t.tower?'buildingDamage':t.hero?'heroDamage':'minionDamage',sum);if(!t.tower)this.stat(a,'unitDamage',sum);this.stat(t,'damageTaken',rawDamage);if(a?.hero){t.contributors??={};t.contributors[a.playerId]=this.time;}}
  // Publish the resolved hit, including shield absorption but excluding overkill.
  // Skill-value identity survives projectiles, burns and basic-triggered spells.
  const skill=meta.value?.skill;
  if(sum>0&&a?.hero&&a.side!==t.side&&!basic&&!reflected&&Number.isInteger(skill)&&skill>=0&&skill<4){
   this.visual('damage',a,t,{skill,targetId:t.id,targetHero:!!t.hero,targetTower:!!t.tower,amount:sum,hpDamage:actual,shieldDamage:absorbed,until:this.time+1.2});
  }
  if(sum>0&&!reflected&&!t.tower&&a?.hp>0&&a.side!==t.side){t.attackerMemory??={};t.attackerMemory[a.id]=this.time+this.config.world.retaliationMemory;if(t.targetId==null)t.nextRetargetAt=0;}
  if(t.tower&&actual>0){this.metrics.towerDamage+=actual;triggerTowerGuard(t,this.time);if(a?.hero)this.addXp(this.players[a.playerId],actual*this.config.world.towerDamageExpRate,a.classId);}
  if(t.damageStore&&t.damageStore.until>this.time)t.damageStore.total+=sum;
  const remote=meta.remote??!!(a&&(a.tower||a.range>2));
  if(!reflected&&remote&&sum>0&&t.reflectUntil>this.time&&a?.hp>0&&a.side!==t.side){this.visual('reflected',t,a,{skill:2,until:this.time+.4});this.damage(t,a,sum*t.reflectRatio,false,true,{remote:false,value:t.reflectValue});}
  if(sum>0&&t.whirlUntil>this.time){t.whirlHits=(t.whirlHits||0)+1;const s=this.config.heroes[3].skills[3],count=Math.floor(t.whirlHits/s.extensionHits);if(count){t.whirlHits%=s.extensionHits;const before=t.whirlUntil;t.whirlUntil=Math.min(t.whirlMaxUntil,t.whirlUntil+count*s.extensionSeconds);if(t.whirlPath&&!t.whirlPath.returning)t.whirlPath.outUntil+=t.whirlUntil-before;t.immuneUntil=t.whirlUntil;}}
  if(t.hp<=0)this.die(t,a);return sum;
 }
 castPlan(i,p=this.player){
  const blocked=(code,reason)=>({ok:false,code,reason});if(!Number.isInteger(i)||i<0||i>3)return blocked('invalid','无效技能');const h=this.hero(p);if(!h)return blocked('no-hero','请先点选己方单位确认契约');
  const id=h.classId,c=this.config.heroes[id],s=c.skills[i],lv=p.builds[id][i];if(!lv||p.level<SKILL_PROGRESSION[i].unlock)return blocked('locked','技能未解锁或尚未加点');
  if(h.stunUntil>this.time)return blocked('stunned','眩晕中，无法施法');if(h.dash)return blocked('channel','冲锋中，无法施法');if(h.classId===6&&i===2&&h.echo?.until>this.time)return {ok:true,code:'ready',reason:'回到残影',h,id:h.classId,c,s,lv,t:h,targets:[],randomChoices:[],recast:true};if(h.channelUntil>this.time)return blocked('channel','正在引导连续炮击');if(h.castUntil>this.time)return blocked('casting','正在施放其他技能');if(p.cd[i]>this.time)return blocked('cooldown','技能冷却中');if(p.stamina<s.cost)return blocked('stamina','体力不足');
  const selection=selectSkill4.call(this,h,i,s);if(!selection.ok)return selection;
  return {code:'ready',reason:'可释放',h,c,s,lv,id,...selection};
 }
 cast(i,p=this.player){
  const plan=this.castPlan(i,p);if(!plan.ok)return this.fail(p,plan.reason);if(plan.recast){const h=plan.h,e=h.echo;this.moveUnit(h,e.x,e.y);const wanted=Math.max(0,h.maxHp*e.ratio-h.hp);this.heal(h,wanted,h);if(h.hp/h.maxHp>e.ratio)h.hp=h.maxHp*e.ratio;h.echo=null;this.visual('echoReturn',h,h,{skill:2,until:this.time+.8});return true;}chooseRandomTarget(this,plan);const {h,s,lv,t}=plan,k=factor(s,lv),token=(h.castToken||0)+1;h.castToken=token;
  p.stamina-=s.cost;p.score+=this.config.world.castScore;this.addXp(p,s.cost*this.config.world.expPerStamina);p.cd[i]=this.time+s.cd;h.castUntil=this.time+s.castTime;this.metrics.casts++;
  const locked=t?{id:t.id,x:t.x,y:t.y}:null;h.skillAnimation={skill:i,start:this.time,release:h.castUntil,end:h.castUntil+.42,from:{x:h.x,y:h.y},to:locked||{x:h.x,y:h.y}};
  this.visual('cast',h,locked||h,{skill:i,until:h.castUntil,release:h.castUntil});
  const value=createSkillValue(h,s,lv,this.time);value.skill=i;this.skillValues??=[];this.skillValues.push(value);if(this.skillValues.length>1000)this.skillValues.shift();
  const extra={heat:h.heat||0,manualTargetId:plan.manualTargetId??null};
  this.jobs.push({at:h.castUntil,run:()=>{if(h.hp>0&&h.castToken===token)this.resolveSkill(h,i,scaleSkill4(s,k,value),locked,plan.targets.map(t=>t.id),extra);}});
  if(!p.bot){this.notice='';this.log(p.name+' 释放「'+this.configSkillName(h.classId,i)+'」');}return true;
 }
 onKill(h,t){if(!t.tower)this.addXp(this.players[h.playerId],t.hero?this.config.world.heroKillXp:this.config.world.minionKillXp,h.classId);if(h.classId===3&&!t.tower){const c=this.config.heroes[3],cap=c.passiveMinionKills;h.energy=(h.energy||0)+(t.hero?cap:1);while(h.energy>=cap){h.energy-=cap;this.heal(h,h.maxHp*c.passiveHealRatio,h);}this.visual('heat',h,h,{skill:0,until:this.time+.6});}}
 onUnitDeath(t){for(const mark of t.soulMarks||[])if(mark.until>=this.time)this.addHeat(this.get(mark.ownerId),mark.heat||1);}
 afterBasicAttack(h,t){if(h.lordUlt?.until>this.time){const s=h.lordUlt.s,es=this.enemies({...t,side:h.side},s.radius).filter(u=>u.id!==t.id).sort((a,b)=>Number(!!b.hero)-Number(!!a.hero)).slice(0,s.targets);for(const e of es)this.damage(h,e,s.value.attack*s.power/100/Math.max(1,es.length),false,false,{value:s.value,remote:false,attackScaled:true});this.visual('release',h,t,{skill:3,targets:es.map(u=>({id:u.id,x:u.x,y:u.y})),until:this.time+.6});}}
 configSkillName(id,i){return names[id][i];}
 resolveSkill(h,i,s,locked,ids=[],extra={}){return resolveSkill4.call(this,h,i,s,locked,ids,extra);}
 dot(owner,t,type,s,duration){if(t.hp<=0||t.immuneUntil>this.time)return;const old=this.fields.find(f=>f.kind==='dot'&&f.owner.id===owner.id&&f.host===t.id&&f.type===type);if(old){old.until=this.time+duration;old.s=s;return;}this.fields.push({kind:'dot',type,owner,host:t.id,x:t.x,y:t.y,side:owner.side,s,start:this.time,until:this.time+duration,tick:this.time+1});}
 impactSkill(b){return impactSkill4.call(this,b);}
 processSkillEffects(){return processSkill4Effects.call(this);}
 updateUnitEffects(u,dt=0){return updateSkill4Unit.call(this,u,dt);}
 chooseAutoSkill(p){return chooseSkill4.call(this,p);}
}


import { currentValues, currentSkill, currentName } from './current-design.js';
import { recordEffectiveHeal } from './assist-rules.js';
import { manualTarget, targetForSide } from './manual-target.js';
import { segmentDistance } from './lord-flame-shield.js';
import { spend } from './skill-value.js';
import { inAttackRange } from './attack-range.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const nearest=(at,units)=>units.sort((a,b)=>distance(at,a)-distance(at,b)||a.id-b.id);
const first=(t,units)=>t?[t,...units.filter(u=>u.id!==t.id)]:units;
const rules=sim=>sim.config.design.rules;
const pass=(sim,h)=>currentValues(sim,h);
const live=(sim,ids)=>ids.map(id=>sim.get(id)).filter(Boolean);
const elfLinkTargets=(sim,h,s)=>sim.allies(h,s.range).filter(u=>u.id!==h.id&&!u.tower)
  .sort((a,b)=>a.hp-b.hp||distance(h,a)-distance(h,b)||a.id-b.id).slice(0,s.targets);
const area=(sim,h,at,radius,limit,t=null)=>first(t,nearest(at,sim.enemies({...at,side:h.side},radius))).slice(0,limit);
const emit=(sim,h,s,at,targets,kind='release')=>sim.visual(kind,h,at,{skill:s.skill,targets:targets.map(u=>({id:u.id,x:u.x,y:u.y})),haloTargets:targets.map(u=>({id:u.id})),until:sim.time+1});
const hurt=(sim,h,s,t,power=s.power/100,scale=1,meta={})=>sim.damage(h,t,s.value.attack*power*scale*(1+(s.bonusDamage||0)),false,false,{value:s.value,area:(s.targets||1)>1,...meta});
const knock=(sim,h,t,n)=>{
  if (!n || t.tower || t.immuneUntil>sim.time || t.hp<=0) return 0;
  const d=distance(h,t)||1, before={x:t.x,y:t.y};sim.interrupt(t);
  sim.moveUnit(t,t.x+(t.x-h.x)/d*n,t.y+(t.y-h.y)/d*n);
  return distance(t,before);
};
function currentTarget(sim,h,i,s){
  if(h.classId===5&&i===1)return elfLinkTargets(sim,h,s)[0]||null;
  const friendly=h.classId===5||h.classId===0&&i===2,side=friendly?h.side:1-h.side;
  // 灵息的自动治疗独立选择缺血友军；只有手选敌人时才转向其攻击对象。
  const chosen=h.classId===5&&i===0&&!manualTarget(sim,h)?null:targetForSide(sim,h,side);
  if(chosen&&(!friendly||!chosen.tower&&!((h.classId===5&&i===1||h.classId===0&&i===2)&&chosen.id===h.id)))return chosen;
  if(friendly)return sim.allies(h,s.range).filter(u=>!u.tower&&!((h.classId===5&&i===1||h.classId===0&&i===2)&&u.id===h.id))
    .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||distance(h,a)-distance(h,b)||a.id-b.id)[0]||null;
  return sim.enemies(h,s.range).sort((a,b)=>(a.hero?0:a.tower?2:1)-(b.hero?0:b.tower?2:1)||distance(h,a)-distance(h,b)||a.id-b.id)[0]||null;
}
export function currentRangeFailure(sim,h,i,s) {
  if (h.classId===3 && (i===1||i===3) || h.classId===0 && (i===1||i===3) || h.classId===5 && (i===2||i===3)) return null;
  const friendly=h.classId===5 || h.classId===0 && i===2;
  const t=currentTarget(sim,h,i,s);
  if (!t) return {ok:false,code:'target',reason:friendly?'范围内没有己方目标':'范围内没有敌方目标'};
  if (friendly && (t.tower || (i===1 && h.classId===5 || i===2 && h.classId===0) && t.id===h.id))
    return {ok:false,code:'wrong-target',reason:'请选择其他己方单位'};
  if (distance(h,t)>s.targetRange+1e-7) return {ok:false,code:'range',reason:'目标太远'};
  return null;
}
export function selectCurrentSkill(h,i,s) {
  const friendly=h.classId===5 || h.classId===0 && i===2;
  let t=currentTarget(this,h,i,s), targets=[];
  const selfSkill=h.classId===3 && (i===1||i===3) || h.classId===0 && (i===1||i===3) || h.classId===5 && i===3;
  if (selfSkill) t=h;
  if(h.classId===5&&i===2&&!t)t=h;
  if (!t) return {ok:false,code:'target',reason:'范围内没有有效目标'};
  if (h.classId===0 && i===0) targets=area(this,h,t,s.radius,s.targets,t);
  else if (h.classId===0 && i===1) targets=[h,...nearest(h,this.allies(h,s.radius).filter(u=>u.id!==h.id)).slice(0,s.targets)];
  else if (h.classId===5 && i===1) targets=elfLinkTargets(this,h,s);
  else if (h.classId===5 && i===2) {
    const candidates=nearest(h,this.allies(h,s.range).filter(u=>this.hasNegative(u)));
    targets=first(candidates.find(u=>u.id===t.id),candidates).slice(0,s.targets);
    if (!targets.length) return {ok:false,code:'target',reason:'没有需要净化的友军'};
  } else if (h.classId===5 && i===3) targets=[h,...this.allies(h,s.range).filter(u=>u.id!==h.id).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||distance(h,a)-distance(h,b)).slice(0,s.targets)];
  else if (h.classId===3 && i===0) targets=first(t,nearest(h,this.enemies(h,s.range).filter(u=>{
    const len=distance(h,t)*distance(h,u);return !len || ((t.x-h.x)*(u.x-h.x)+(t.y-h.y)*(u.y-h.y))/len>=.35;
  }))).slice(0,s.targets);
  else if (h.classId===4 && i===2) targets=first(t,nearest(h,this.enemies(h,s.range))).slice(0,s.targets);
  else if (h.classId===4 && i===3) targets=first(t,nearest(h,this.enemies(h,s.range))).slice(0,s.targets);
  else targets=[t];
  return {ok:true,t,targets,manualTargetId:t?.id};
}
export function resolveCurrentSkill(h,i,s,locked,ids=[],extra={}) {
  const t=locked&&this.get(locked.id), at=t||locked||h, targets=live(this,ids), A=s.value.attack;
  emit(this,h,s,at,targets);
  if (h.classId===0) {
    if (i===0) {
      this.fields=this.fields.filter(f=>!(f.kind==='currentDrain'&&f.owner.id===h.id));
      if (s.channel) h.channelUntil=this.time+s.duration;
      for (const [j,u] of targets.entries()) {
        if(u.immuneUntil>this.time)continue;
        this.fields.push({kind:'currentDrain',owner:h,host:u.id,s,scale:j?s.secondary:1,tick:this.time+1,until:this.time+s.duration});
        this.debuff(u,h,'vulnerable',s.vuln,s.duration,s.value);
      }
    }
    if (i===1) for (const u of targets) {
      this.guard(u,h,'orcWarcry',s.reduction,s.duration,{reflect:s.reflect});
      this.haste(u,'orcWarcry',s.haste,s.duration,h);
    }
    if (i===2 && t) {
      const old={x:h.x,y:h.y}, lost=1-t.hp/t.maxHp;
      this.interrupt(t);this.moveUnit(h,t.x,t.y);this.moveUnit(t,old.x,old.y);
      this.guard(h,h,'orcRescue',Math.min(s.reduction_cap,lost*s.reduction_per_lost),s.duration);
      this.heal(t,A*s.heal,h,s.value);
      if (s.blast) this.explode(h,h,s.radius,99,A*s.blast,s.value);
      if (s.taunt) for (const u of area(this,h,h,s.radius,99)) if (!u.tower && !(u.immuneUntil>this.time)) {
        this.interrupt(u);u.tauntId=h.id;u.tauntUntil=this.time+s.taunt;
      }
    }
    if (i===3) {
      h.damageStore={until:this.time+s.duration,total:0,shieldDuration:s.shield_duration,conversionRatio:s.store_gain,
        storeCap:1e6,value:s.value,friends:this.allies(h,s.radius).filter(u=>u.id!==h.id).map(u=>u.id),share:s.share,burst:s.burst,radius:s.radius};
      if (s.start_shield) this.shield(h,h.maxHp*s.start_shield,h,s.duration,s.value);
      if (s.immortal) h.immortalUntil=this.time+s.duration;
    }
  }
  if (h.classId===4) {
    if (i===0) {
      const es=first(t,area(this,h,at,s.radius,s.bounces+1,t));
      for (const [j,u] of es.entries()) {
        hurt(this,h,s,u,s.power/100,j?s.secondary:1,{currentExplosion:s.explode,explosionRadius:s.radius});
        this.debuff(u,h,'attackDown',s.attack_down,s.duration,s.value);
      }
      this.addHeat(h,1);
    }
    if (i===1 && t && !(t.immuneUntil>this.time)) {
      t.soulMarks??=[];t.soulMarks=t.soulMarks.filter(m=>m.ownerId!==h.id);
      t.soulMarks.push({ownerId:h.id,until:this.time+s.duration,current:true,s});
      this.debuff(t,h,'vulnerable',s.vuln,s.duration,s.value);
    }
    if (i===2) {
      // Lock every original fireball route before knockback moves its endpoint.
      // A shared path victim receives the extra hit once across this entire cast.
      const origin={x:h.x,y:h.y},ends=targets.map(u=>({x:u.x,y:u.y}));
      const pathTargets=s.path_damage>0?this.enemies(h).filter(u=>ends.some(end=>segmentDistance(u,origin,end)<=rules(this).pierceRadius)):[];
      const hitIds=new Set([...targets,...pathTargets].map(u=>u.id)),isolated=hitIds.size===1?1+s.isolated:1;
      const baseIds=new Set(targets.map(u=>u.id));
      for (const u of targets) {
        const before=u.hp;
        hurt(this,h,s,u,s.power/100,isolated);
        knock(this,h,u,s.knock);
        if (before>0&&u.hp<=0) this.addHeat(h,s.kill_heat);
      }
      for (const u of pathTargets) {
        const before=u.hp;
        hurt(this,h,s,u,s.path_damage,isolated);
        if (!baseIds.has(u.id)) knock(this,h,u,s.knock);
        if (before>0&&u.hp<=0) this.addHeat(h,s.kill_heat);
      }
    }
    if (i===3) {
      const consumed=Math.min(h.heat||0,extra.heat||0);h.heat=Math.max(0,(h.heat||0)-consumed);this.heatBoost(h,consumed);
      for (const [j,u] of targets.entries()) {
        hurt(this,h,s,u,s.power/100,(1+consumed*s.heat_damage)*(j?s.secondary:1));
        if (s.execute && u.hp>0&&!u.tower&&u.hp/u.maxHp<s.execute&&!(u.immortalUntil>this.time))
          this.damage(h,u,u.hp,false,false,{value:s.value,execute:true});
        if (u.hp<=0) this.addHeat(h,s.refund);
      }
    }
  }
  if (h.classId===5) {
    if (i===0 && t) {
      this.heal(t,A*s.heal,h,s.value);
      if (s.twin) {
        const second=this.allies({...t,side:h.side},s.radius).filter(u=>u.id!==t.id).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
        if (second) this.heal(second,A*s.heal*s.twin,h,s.value);
      }
    }
    if (i===1 && t) {
      for (const u of targets.filter(u=>u.id!==h.id&&!u.tower&&distance(h,u)<=s.range)) {
        this.fields.push({kind:'link',owner:h,host:u.id,until:this.time+s.duration,duration:s.duration,healExtension:s.heal_extension,breakRange:s.range,shareRatio:s.share,shareDamage:!!s.split,transferChance:s.transfer_chance||0,linkReduction:s.reduction||0,linkHaste:s.haste||0,value:s.value});
        this.guard(u,h,'elfLink',s.reduction,s.duration);this.haste(u,'elfLink',s.haste,s.duration,h);
      }
    }
    if (i===2) for (const u of targets) {
      const n=this.cleanse(u);
      if (!n) continue;
      this.heal(u,A*s.heal_per_cleanse*n,h,s.value);
      h.attackBoost=(h.boostUntil>this.time?h.attackBoost||0:0)+s.attack_per_cleanse*n;h.boostUntil=this.time+s.boost_duration;
      if (s.healing_boost) {u.healingBoost=s.healing_boost;u.healingBoostUntil=this.time+s.bless_duration;u.healingBoostOwner=h.id;}
    }
    if (i===3) {
      h.channelUntil=this.time+s.duration;
      currentGroupHeal(this,h,s,targets);
      if (s.pulses>1) this.fields.push({kind:'currentGroupHeal',owner:h,s,ids,tick:this.time+s.duration/(s.pulses-1),remaining:s.pulses-1,until:h.channelUntil});
    }
  }
  if (h.classId===2) {
    if (i===3) {
      h.channelUntil=this.time+s.shots*s.gap;
      this.fields.push({kind:'currentBarrage',owner:h,s,x:at.x,y:at.y,tick:this.time+s.gap,remaining:s.shots,index:0,until:h.channelUntil});
    } else this.projectiles.push({id:this.nextProjectileId++,source:h,sourceId:h.id,targetId:t?.id,x:h.x,y:h.y,tx:at.x,ty:at.y,power:0,basic:false,skillId:i,payload:{...s,current:true}});
  }
  if (h.classId===3) {
    if (i===0) {
      for (const u of targets) {
        hurt(this,h,s,u);this.debuff(u,h,'attackDown',s.attack_down,s.duration,s.value);this.debuff(u,h,'moveSlow',s.slow,s.slow_duration,s.value);
        this.debuff(u,h,'healingDown',s.healing_down,s.healing_down_duration,s.value);
      }
      const origin={x:h.x,y:h.y};
      if (s.echo) this.jobs.push({at:this.time+rules(this).echoDelay,run:()=>{
        for (const u of live(this,ids)) {
          if (distance(origin,u)>s.range) continue;
          hurt(this,h,s,u,s.power/100,s.echo);knock(this,origin,u,-Math.min(s.pull,distance(origin,u)));
        }
      }});
    }
    if (i===1) h.currentShell={s,until:this.time+s.duration};
    if (i===2 && locked) {
      const end={x:at.x,y:at.y},duration=distance(h,end)/12;
      h.currentDash={s,targetId:t?.id,x:h.x,y:h.y,end,start:this.time,until:this.time+Math.max(.05,duration),hits:[]};
      this.visual('charge',h,end,{skill:i,until:h.currentDash.until});
    }
    if (i===3) {
      this.cleanse(h);h.immuneUntil=this.time+s.duration;h.currentUlt={s,until:this.time+s.duration};
      if (s.shield) this.shield(h,h.maxHp*s.shield,h,s.shield_duration,s.value);
    }
  }
}
function currentGroupHeal(sim,h,s,targets) {
  for (const u of targets) {
    const actual=sim.heal(u,s.value.attack*s.heal,h,s.value);
    if (actual && s.counter) for (const enemy of area(sim,h,u,s.radius,3))
      sim.damage(h,enemy,actual*s.counter,false,false,{value:s.value,derived:true});
  }
}
function runeImpact(sim,h,s,at,multiplier=1,repeat=false,primaryId=null) {
  const targets=area(sim,h,at,s.radius,s.targets), n=targets.length;
  if (!n) return;
  const primary=targets.find(u=>u.id===primaryId)||targets[0];
  const cannonPool=primary.maxHp*s.hp_ratio;
  const relief=currentValues(sim,h,null,s.value?.ranks).share_relief||0;
  const share=(n===1?1:Math.min(1,(rules(sim).shareTotals[Math.min(6,n)]||0)+relief))/n;
  emit(sim,h,s,at,targets,'impact');
  for (const u of targets) {
    if (s.skill===0) {
      sim.damage(h,u,cannonPool*share*multiplier*(1+(s.bonusDamage||0)),false,false,{value:s.value});
      if (s.heal_down && !(u.immuneUntil>sim.time)) u.currentNextHealDown={ratio:s.heal_down*share,until:sim.time+s.debuff_duration,ownerId:h.id};
      if (s.dot_chance && sim.random()<s.dot_chance && !(u.immuneUntil>sim.time)) {
        sim.fields=sim.fields.filter(f=>!(f.kind==='currentCorrosion'&&f.host===u.id&&f.owner.id===h.id));
        sim.fields.push({kind:'currentCorrosion',owner:h,host:u.id,s,share,power:primary.maxHp*s.dot_hp*share,tick:sim.time+1,until:sim.time+s.duration});
      }
    } else {
      hurt(sim,h,s,u,s.power/100,share*multiplier);
      if (s.skill===1) sim.debuff(u,h,'attackSpeedDown',s.attack_slow*share,s.duration,s.value);
      if (s.skill===2) {
        const moved=knock(sim,h,u,s.knock*share);
        if (moved && s.move_damage) hurt(sim,h,s,u,s.move_damage,moved);
        if (moved && s.blast) {const center={x:u.x,y:u.y};sim.jobs.push({at:sim.time+rules(sim).explosionDelay,run:()=>{
          const victims=area(sim,h,center,s.radius,6);
          for(const victim of victims)hurt(sim,h,s,victim,s.blast,share/victims.length,{derived:true});
        }});}
      }
      if (s.skill===3 && u.hp>0) {
        const old=u.debuffs?.[h.id+':moveSlow'],stacks=Math.min(s.slow_cap,old?.until>sim.time?(old.stacks||1)+1:1);
        if (sim.debuff(u,h,'moveSlow',s.slow_per*share*stacks,s.slow_duration,s.value,true)) u.debuffs[h.id+':moveSlow'].stacks=stacks;
      }
    }
  }
  if (s.skill===1&&s.self_haste) sim.haste(h,'runeFrost',s.self_haste/n,s.self_haste_duration??s.duration);
  if (s.skill===0&&!repeat&&s.extra_chance&&sim.random()<s.extra_chance) runeImpact(sim,h,s,at,multiplier,true,primaryId);
}
export function impactCurrentSkill(b) {runeImpact(this,b.source,b.payload,{x:b.tx,y:b.ty},1,false,b.targetId);}
export function processCurrentEffects() {
  for (const f of [...this.fields]) {
    const h=f.owner,s=f.s;
    if (f.kind==='link') {const u=this.get(f.host);if (!u||h.hp<=0||distance(h,u)>f.breakRange) f.until=this.time;continue;}
    if (!f.kind.startsWith('current')) continue;
    if (h.hp<=0 || (f.kind==='currentDrain'&&s.channel || ['currentGroupHeal','currentBarrage'].includes(f.kind)) && h.channelUntil<this.time-1e-7) {f.until=this.time;continue;}
    // Finish pre-update projectiles; new fireball casts never create this field.
    if (f.kind==='currentPierce') {
      const r=rules(this),from={x:f.x,y:f.y},step=Math.min(r.pierceDistance-f.travel,(this.time-f.last)*r.pierceSpeed);
      f.last=this.time;f.x+=f.dx*step;f.y+=f.dy*step;f.travel+=step;
      for (const u of this.enemies({...f,side:h.side}).filter(u=>segmentDistance(u,from,f)<=r.pierceRadius)) {
        if ((f.next[u.id]||0)>this.time) continue;
        const before=u.hp;hurt(this,h,s,u,s.power/100,r.piercePower*(f.primaryCount===1?1+s.isolated:1));
        knock(this,h,u,s.knock);f.next[u.id]=this.time+r.pierceGap;
        if (before>0&&u.hp<=0) this.addHeat(h,s.kill_heat);
      }
      if (f.travel>=r.pierceDistance) f.until=this.time;
      continue;
    }
    while (f.tick<=this.time+1e-7 && f.tick<=f.until+1e-7 && (f.remaining==null || f.remaining>0)) {
      if (f.kind==='currentDrain') {
        const u=this.get(f.host);
        if (!u || distance(h,u)>(s.break_range??s.range) || u.immuneUntil>this.time) {f.until=this.time;break;}
        const n=hurt(this,h,s,u,s.power/100,f.scale,{periodic:true});this.heal(h,n*s.drain,h,s.value);
        f.tick+=1;
      } else if (f.kind==='currentCorrosion') {
        const u=this.get(f.host);if (!u) {f.until=this.time;break;}
        if (!(u.immuneUntil>this.time)) this.damage(h,u,f.power*(1+(s.bonusDamage||0)),false,false,{value:s.value,periodic:true});
        f.tick+=1;
      } else if (f.kind==='currentBarrage') {
        runeImpact(this,h,s,f,1+f.index*s.ramp);f.index++;f.remaining--;f.tick+=s.gap;
      } else if (f.kind==='currentGroupHeal') {
        const ts=[h,...this.allies(h,s.range).filter(u=>u.id!==h.id).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||distance(h,a)-distance(h,b)).slice(0,s.targets)];
        currentGroupHeal(this,h,s,ts);f.remaining--;f.tick+=s.duration/(s.pulses-1);
      } else break;
    }
  }
  this.fields=this.fields.filter(f=>f.until>this.time && (f.remaining==null||f.remaining>0));
}
export function updateCurrentUnit(u) {
  if (u.guards) u.guards=u.guards.filter(g=>g.until>this.time);
  if (u.shieldUntil<=this.time) u.shield=0;
  if (u.soulMarks) u.soulMarks=u.soulMarks.filter(m=>m.until>this.time);
  if (u.summoned && u.expiresAt<=this.time) {u.hp=0;return true;}
  if (u.classId===4 && u.hp>0 && (u.heat||0)>0 && u.heatUntil<=this.time) {
    const d=rules(this).heatDuration+(pass(this,u).heat_duration_extra||0);
    while (u.heat>0 && u.heatUntil<=this.time) {u.heat--;u.heatUntil+=d;}
  }
  if (u.damageStore && u.damageStore.until<=this.time) {
    const f=u.damageStore;u.damageStore=null;
    this.shield(u,f.total*f.conversionRatio,u,f.shieldDuration,f.value);
    if (f.burst) this.explode(u,u,f.radius,99,f.total*f.burst,f.value);
  }
  if (u.currentDash) {
    const p=u.currentDash,k=Math.min(1,(this.time-p.start)/(p.until-p.start)),from={x:u.x,y:u.y};
    this.moveUnit(u,p.x+(p.end.x-p.x)*k,p.y+(p.end.y-p.y)*k);
    const main=this.get(p.targetId),contacts=nearest(u,this.enemies(u).filter(t=>segmentDistance(t,from,u)<=p.s.radius));
    for (const t of first(contacts.find(t=>t.id===p.targetId),contacts)) {
      if (p.hits.includes(t.id)||p.hits.length>=p.s.targets) continue;
      if(main&&t.id!==main.id&&!p.hits.includes(main.id)&&p.hits.length>=p.s.targets-1)continue;
      p.hits.push(t.id);hurt(this,u,p.s,t);if(t.id===p.targetId)this.stun(t,u,p.s.stun);
    }
    if (k>=1) {
      if (p.s.drag) for (const t of live(this,p.hits)) if (!t.tower&&!(t.immuneUntil>this.time)) this.moveUnit(t,p.end.x,p.end.y);
      u.currentDash=null;
    }
    return true;
  }
  return false;
}
export function currentAttackPower(u) {
  const v=pass(this,u),h=this.config.design.heroes[u.classId],r=rules(this),p=this.players[u.playerId];
  if (!h||!u.hero) return u.attack||0;
  const base=h.attack*(1+h.attackGrowth*p.progress[u.classId].level);
  const bonus=(v.attack_bonus||0)+(v.missing_attack||0)*(1-u.hp/u.maxHp)+
    (u.heatBoostUntil>this.time?Math.min(r.heatAttackCap,(u.heatBoostStacks||0)*(v.heat_attack_proc||0)):0);
  const down=Math.max(0,...this.activeDebuffs(u,'attackDown').map(d=>d.ratio));
  return base*(1+bonus+(u.boostUntil>this.time?u.attackBoost||0:0)+(u.eliteBuffs?.assault>this.time?.2:0))*(1-down);
}
export function currentAttackRate(u) {
  const v=pass(this,u),heat=u.classId===4?(u.heat||0)*(rules(this).heatHaste+(v.heat_haste_extra||0)):0;
  return (1+(v.haste||0)+heat+Object.values(u.hastes||{}).filter(f=>f.until>this.time).reduce((sum,f)=>sum+f.ratio,0))*Math.max(.01,1-this.attackSlowRatio(u));
}
export function addCurrentHeat(h,n) {
  if (h?.classId!==4||h.hp<=0||n<=0) return;
  const v=pass(this,h),r=rules(this),before=h.heat||0;
  h.heat=Math.min(r.heatCap+(v.heat_cap_extra||0),before+n);
  h.heatUntil=this.time+r.heatDuration+(v.heat_duration_extra||0);this.heatBoost(h,h.heat-before);
}
export function refreshCurrentStats(sim,h) {
  if (!h.hero||h.hp<=0) return;
  const c=sim.config.design.heroes[h.classId],v=pass(sim,h),level=sim.players[h.playerId].progress[h.classId].level,ratio=h.hp/h.maxHp;
  const multiplier=sim.config.world.heroHpMultiplier*(h.side?sim.config.world.defenseHpMultiplier:sim.config.world.attackHpMultiplier);
  h.maxHp=c.hp*multiplier*(1+c.hpGrowth*level)*(1+(v.hp_bonus||0));h.hp=h.maxHp*ratio;
  h.attack=c.attack*(1+c.attackGrowth*level);h.range=c.range+(v.range_bonus||0);h.speed=c.speed*(1+(v.move_bonus||0));
  h.aggro=Math.max(sim.config.heroes[h.classId].aggro||c.range,h.range);
}
export function currentHeal(t,n,u,value=null,derived=false,linkShared=false) {
  if (!t||t.hp<=0||t.tower||!Number.isFinite(n)||n<=0) return 0;
  const r=rules(this),v=pass(this,t),heat=t.classId===4?Math.max(0,1-(t.heat||0)*r.heatHealPenalty):1;
  let down=Math.max(0,...this.activeDebuffs(t,'healingDown').map(d=>d.ratio));
  if (t.currentNextHealDown?.until>this.time) {down=Math.max(down,t.currentNextHealDown.ratio);t.currentNextHealDown=null;}
  const wanted=n*(1+(v.healing_received||0))*heat*(1-down)*(t.healingBoostUntil>this.time?1+t.healingBoost:1),actual=Math.min(wanted,t.maxHp-t.hp);
  t.hp+=actual;spend(value,actual,'治疗');this.stat(u,'healing',actual);
  if (actual>0) this.healthVisual('heal',u,t,{amount:actual});
  if (actual>0&&u?.hero) {recordEffectiveHeal(u,t,this.time);this.visual('healing',u,t,{skill:value?.skill??0,until:this.time+.55});}
  if (!linkShared) {
    for (const f of [...this.fields]) if (actual>0&&f.kind==='link'&&f.until>this.time&&f.owner.hp>0) {
      const host=this.get(f.host);if (!host||host.hp<=0||distance(f.owner,host)>f.breakRange) continue;
      if (t.id===f.owner.id||t.id===host.id) {
        const skill=this.config.design.skills[5][1];
        f.until=Math.min(f.until+(f.healExtension??skill.heal_extension??0),this.time+(f.duration??skill.duration));
        for (const guard of host.guards||[]) if (guard.kind==='elfLink'&&guard.ownerId===f.owner.id) guard.until=f.until;
        if (host.hastes?.elfLink) host.hastes.elfLink.until=f.until;
        if (!derived) currentHeal.call(this,t.id===host.id?f.owner:host,actual*f.shareRatio,f.owner,f.value,true,true);
      }
    }
  }
  if (!derived) this.afterHeal?.(u,t,actual,Math.max(0,wanted-actual),value);
  return actual;
}
export function reflectCurrentShell(sim,a,t,reflected=false) {
  if (reflected || !a || a.side===t.side || a.hp<=0 || !(t.currentShell?.until>sim.time)) return;
  // Both basic and skill attacks reflect; reflected hits never start another reflection.
  const s=t.currentShell.s,attack=sim.attackPower(a);
  sim.debuff(a,t,'attackDown',s.attack_down,s.debuff_duration,s.value);
  sim.damage(t,a,attack*s.thorn,false,true,{value:s.value,thorn:true,derived:true});
  if (a.hp<=0&&s.death_slow) for (const enemy of area(sim,t,a,s.radius,99)) sim.debuff(enemy,t,'attackSpeedDown',s.death_slow,s.slow_duration,s.value);
}
export const currentTraitEffects={
  heatBoost(h,n) {if (n<=0||!pass(this,h).heat_attack_proc) return;h.heatBoostStacks=(h.heatBoostUntil>this.time?h.heatBoostStacks||0:0)+n;h.heatBoostUntil=this.time+rules(this).heatBoostDuration;},
  afterHeal(h,t,actual,overheal,value) {
    if (h?.classId!==5) return;
    const s=value?.currentSkill,r=rules(this),v=currentValues(this,h,null,value?.ranks);
    if (s?.skill===3&&overheal>0&&s.over_shield) {
      const previous=t.shieldUntil>this.time&&t.shieldOwner===h.id&&t.shieldValue?.currentSkill?.skill===3?t.shield||0:0;
      this.shield(t,Math.min(t.maxHp*s.shield_cap,previous+overheal*s.over_shield),h,s.shield_duration,value);
    }
    if (actual<=0) return;
    const count=(s?.skill===0?s.damage_targets:1)+(v.elf_extra_targets||0);
    for (const enemy of area(this,h,t,r.elfConvertRadius,count)) {
      this.damage(h,enemy,actual*r.elfHealDamage*(1+(v.elf_damage_bonus||0)),false,false,{value,derived:true});
      if (s?.vuln) this.debuff(enemy,h,'vulnerable',s.vuln,4,value);
    }
  },
  afterDamage(a,t,sum,basic,reflected,meta) {
    const r=rules(this);
    for (const h of this.units) if (h.hp>0&&h.id!==t.id&&h.side===t.side&&h.damageStore?.until>this.time&&h.damageStore.friends.includes(t.id)&&distance(h,t)<=h.damageStore.radius)
      h.damageStore.total+=sum*h.damageStore.share;
    if (t.classId===3&&t.hp>0&&pass(this,t).passive_dr) {
      t.guardDamage=(t.guardDamage||0)+sum;
      if (t.guardDamage>=t.maxHp*r.lordPassiveThreshold) {t.guardDamage%=t.maxHp*r.lordPassiveThreshold;this.guard(t,t,'lordEndurance',r.lordPassiveReduction,r.lordPassiveDuration);}
    }
    if (!a||a.side===t.side) return;
    if (!meta.derived && a.classId===5 && a.hp>0) {
      const friend=this.allies({...t,side:a.side},r.elfConvertRadius).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      if (friend) this.heal(friend,sum*r.elfDamageHeal,a,meta.value,true);
    }
    if (basic&&a.classId===0&&a.hp>0) this.heal(a,sum*(pass(this,a).missing_lifesteal||0)*(1-a.hp/a.maxHp),a,null,true);
    reflectCurrentShell(this,a,t,reflected);
    if (!reflected && a.hp>0) {
      const reflect=Math.max(0,...(t.guards||[]).filter(g=>g.until>this.time).map(g=>g.reflect||0));
      if (reflect) this.damage(t,a,sum*reflect,false,true,{derived:true});
    }
    const ult=a.currentUlt;
    if (ult?.until>this.time&&!reflected&&!basic&&!a.summoned&&a.hp>0&&ult.s.lifesteal) this.heal(a,sum*ult.s.lifesteal,a,ult.s.value,true);
    if (basic && !reflected) {
      for (const mark of [...(t.soulMarks||[])]) if (mark.current&&mark.ownerId===a.id&&mark.until>this.time&&t.hp>0) {
        const owner=this.get(mark.ownerId);if (!owner) continue;
        hurt(this,owner,mark.s,t,mark.s.per_hit,1,{derived:true});if (this.random()<mark.s.heat_chance) this.addHeat(owner,1);
      }
      if (ult?.until>this.time) for (const enemy of area(this,a,t,ult.s.radius,ult.s.targets+1).filter(u=>u.id!==t.id).slice(0,ult.s.targets)) hurt(this,a,ult.s,enemy,ult.s.power/100,1,{derived:true});
    }
  },
  afterBasicAttack() {},
  onKill(h,t,summonedKill=false) {
    if (h.hp<=0||t.tower||t.summoned||h.side===t.side) return;
    const r=rules(this);
    if(h.eliteBuffs?.hunt>this.time)this.heal(h,h.maxHp*.02,h,null,true);
    if (h.classId===3) {
      h.minionKills=(h.minionKills||0)+(t.hero?0:1);
      if (t.hero||h.minionKills>=r.lordMinionKills) {
        if (!t.hero) h.minionKills-=r.lordMinionKills;
        this.cleanseOne(h);for(const enemy of nearest(h,this.enemies(h).filter(u=>inAttackRange(h,u))))if(this.dispelOne(enemy))break;
        this.heal(h,h.maxHp*r.lordKillHeal,h,null,true);
      }
      const ult=h.currentUlt;
      if (!summonedKill&&ult?.until>this.time&&ult.s.summon&&this.units.filter(u=>u.summoned&&u.ownerId===h.id&&u.hp>0).length<ult.s.summon) {
        const u=this.spawn(h.side,'melee',0,1,h.x);this.summonOwners.set(h.id,h);
        Object.assign(u,{x:h.x,y:h.y,summoned:true,ownerId:h.id,expiresAt:this.time+ult.s.summon_duration,hp:r.summonHp,maxHp:r.summonHp,attack:r.summonAttack,interval:r.summonInterval,range:1.5,speed:2,deploying:false});
      }
    }
  },
  onUnitDeath(t) {
    for(const f of this.fields) if(f.kind==='link'&&f.host===t.id&&f.until>this.time&&f.owner.hp>0&&f.transferChance>0&&distance(f.owner,t)<=f.breakRange){
      const target=nearest(t,this.allies(t,6).filter(u=>u.id!==f.owner.id&&!u.tower&&distance(f.owner,u)<=f.breakRange))[0];
      if(!target||this.random()>=f.transferChance)continue;
      f.host=target.id;
      const remaining=f.until-this.time,guard=(target.guards||[]).find(g=>g.kind==='elfLink'&&g.ownerId===f.owner.id&&g.until>this.time),haste=target.hastes?.elfLink;
      this.guard(target,f.owner,'elfLink',Math.max(f.linkReduction||0,guard?.ratio||0),Math.max(remaining,(guard?.until||0)-this.time));
      this.haste(target,'elfLink',Math.max(f.linkHaste||0,haste?.until>this.time?haste.ratio:0),Math.max(remaining,(haste?.until||0)-this.time),f.owner);
    }
    const killed=t.lethalSkill;
    if (killed?.currentExplosion) {const h=this.get(killed.ownerId);if (h) this.explode(h,t,killed.explosionRadius,99,killed.attack*killed.currentExplosion,killed.value);}
    for (const mark of t.soulMarks||[]) if (mark.current&&mark.until>=this.time&&mark.s.explode) {
      const h=this.get(mark.ownerId);if (h) this.explode(h,t,mark.s.radius,99,mark.s.value.attack*mark.s.explode,mark.s.value);
    }
  },
};
export function chooseCurrentSkill(p) {
  const h=this.hero(p);if (!h) return -1;
  const choices=[];
  for (let i=0;i<4;i++) {const plan=this.castPlan(i,p);if (!plan.ok) continue;
    const s=plan.s;let score=1;
    if (h.classId===5) score=(i===2?plan.targets.length:plan.targets.reduce((n,u)=>n+1-u.hp/u.maxHp,0))*5;
    else if (h.classId===0) score=i===0?(1-h.hp/h.maxHp)*5+1:i===1?3:i===2?(1-plan.t.hp/plan.t.maxHp)*5:2;
    else score=i===3?3+(h.heat||0)/3:i===1&&h.classId===4?4:2+plan.targets.length;
    choices.push({i,score:score/s.cost});
  }
  return choices.sort((a,b)=>b.score-a.score||a.i-b.i)[0]?.i??-1;
}

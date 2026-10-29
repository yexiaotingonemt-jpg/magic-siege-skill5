import {ELITE_BUFFS} from '../../shared/trait-effects.js';
import {available} from '../../shared/skill-value.js';
import {towerGuardActive,towerAllyProtection} from '../../shared/tower-guard.js';

const usable=v=>available(v)>1e-7;
const percent=n=>Math.round(n*100)+'%';
// Read the same duration/allowance gates as combat; this module never changes state.
export function indexStatusFields(sim){
 const index=new Map();
 for(const f of sim.fields){
  if(f.until<=sim.time||f.owner.hp<=0&&f.kind!=='dot')continue;
  const ids=f.kind==='link'?[f.owner.id,f.host]:f.kind==='dot'?[f.host]:f.kind==='lordBurn'?[f.owner.id]:[];
  if(f.kind==='link'&&(!sim.get(f.host)||!usable(f.value)))continue;
  if(f.kind==='dot'&&!usable(f.s?.value))continue;
  if(f.kind==='lordBurn'&&!usable(f.s?.value))continue;
  for(const id of ids){if(!index.has(id))index.set(id,[]);index.get(id).push(f);}
 }
 return index;
}
export function unitStatuses(sim,u,fields=indexStatusFields(sim)){
 if(u.hp<=0)return [];
 const now=sim.time,out=[],add=(id,name,tone,until,detail,stacks=0,priority=5)=>{if(until>now)out.push({id,name,tone,until,detail,stacks,priority});};
 const debuffNames={moveSlow:['减速','移动速度降低'],attackSpeedDown:['迟缓','攻击速度降低'],vulnerable:['易伤','受到伤害提高'],attackDown:['虚弱','攻击力降低'],healingDown:['减疗','受到治疗降低']};
 for(const [kind,[name,effect]]of Object.entries(debuffNames)){
  const best=sim.activeDebuffs(u,kind).sort((a,b)=>b.ratio-a.ratio||b.until-a.until)[0];
  if(best)add(kind,name,'negative',best.until,effect+percent(best.ratio),best.stacks||0,kind==='moveSlow'?1:3);
 }
 add('stun','眩晕','negative',u.stunUntil,'无法移动、普通攻击和释放技能',0,0);
 if(sim.get(u.tauntId))add('taunt','嘲讽','negative',u.tauntUntil,'被迫攻击嘲讽来源',0,0);
 const scars=Object.values(u.scars||{}).flat().filter(t=>t>now);if(scars.length)add('scar','伤痕','negative',Math.max(...scars),'伤痕标记',sim.scarCount(u),4);
 add('conduct','导电','negative',u.conductUntil,'处于导电状态',0,4);
 if(u.slowUntil>now&&!out.some(x=>x.id==='moveSlow'))add('moveSlow','减速','negative',u.slowUntil,'移动速度降低'+percent(1-u.slowRatio),0,1);
 const guards=(u.guards||[]).filter(g=>g.until>now&&usable(g.value));
 const groupedGuards=new Map();for(const g of guards)groupedGuards.set(g.kind||'guard',Math.max(groupedGuards.get(g.kind||'guard')||0,g.ratio));
 if(guards.length)add('guard','减伤','positive',Math.max(...guards.map(g=>g.until)),'技能合计减伤'+percent(Math.min(.8,1-[...groupedGuards.values()].reduce((n,r)=>n*(1-r),1))),0,1);
 if(u.shield>0&&usable(u.shieldValue))add('shield','护盾','positive',u.shieldUntil,'剩余护盾 '+Math.ceil(Math.min(u.shield,available(u.shieldValue))),0,1);
 if(u.damageStore&&usable(u.damageStore.value))add('damageStore','蓄伤成盾','positive',u.damageStore.until,'已累计 '+Math.floor(u.damageStore.total)+' 伤害，结束按'+percent(u.damageStore.conversionRatio??1)+'转为护盾',0,2);
 add('immune','负面免疫','positive',u.immuneUntil,'免疫新的负面状态',0,0);
 if(u.lordUlt&&usable(u.lordUlt.s.value))add('lordUlt','灭军君临','positive',u.lordUlt.until,'普通攻击附带范围溅射',0,2);
 for(const [key,until]of Object.entries(u.eliteBuffs||{}))add('elite-'+key,ELITE_BUFFS[key].name,'positive',until,ELITE_BUFFS[key].description,0,0);
 add('immortal','不屈','positive',u.immortalUntil,'生命最低保留1',0,0);
 for(const f of Object.values(u.hastes||{}))add('haste','攻速提升','positive',f.until,'普通攻击速度提高'+percent(f.ratio),0,2);
 if(u.heat>0)add('heat','炙热','positive',u.heatUntil,'火焰技能联动资源',u.heat,3);
 for(const f of fields.get(u.id)||[]){
  if(f.kind==='link')add('link','共生链接','positive',f.until,'与链接的友军按'+percent(f.shareRatio??1)+'共享收到的有效治疗',0,2);
  if(f.kind==='lordBurn')add('burnAura','火焰盾','positive',f.until,'向周围目标附加灼烧，移动与突进期间持续生效',0,2);
  if(f.kind==='dot')add('dot',f.type==='lordScorch'?'灼烧':f.type==='corrosion'?'腐蚀':f.type==='parasite'?'寄生':'持续伤害','negative',f.until,f.type==='lordScorch'?`每秒受到${Number(f.s.power.toFixed(1))}%施法攻击力伤害，离开火焰盾范围后继续生效`:'持续承受伤害',0,2);
 }
 const marks=(u.soulMarks||[]).filter(m=>m.until>=now&&sim.get(m.ownerId));
 if(marks.length)add('soulMark','焚魂烙印','mark',Math.max(...marks.map(m=>m.until)),'阵亡时为标记者提供炙热；此击杀记录不受净化影响',0,4);
 if(towerGuardActive(u,now))add('towerGuard','三重守护','positive',u.towerGuardUntil,'攻击3个目标，受到伤害降低50%',0,0);
 if(u.tower){const protection=towerAllyProtection(u,sim.units);if(protection.count)add('towerAllies','友军护塔','positive',Infinity,`${u.range}格内${protection.count}名友军，最终受到伤害降低${percent(protection.reduction)}`,protection.count,1);}
 for(const [id,name,until,value,detail]of [
  ['reflect','远程反伤',u.reflectUntil,u.reflectValue,'反弹远程伤害'],
  ['guard','减伤',u.tauntReductionUntil,u.tauntValue,'受到伤害降低'+percent(u.tauntReduction||0)],
  ['skillGuard','技能减伤',u.skillGuardUntil,u.skillGuardValue,'受到技能伤害降低'+percent(u.skillGuardRatio||0)],
  ['boost','攻击提升',u.boostUntil,u.boostValue,'攻击力提高'+percent(u.attackBoost||0)],
  ['healingBoost','受疗提升',u.healingBoostUntil,u.healingBoostValue,'受到治疗提高'+percent(u.healingBoost||0)],
  ['haste','攻速提升',u.haste?.until,u.haste?.value,'普通攻击速度提高']
 ])if(usable(value))add(id,name,'positive',until,detail);
 // Multiple sources of the same effect occupy one slot, using its latest expiry.
 const merged=new Map();for(const status of out){const old=merged.get(status.id);if(!old||status.until>old.until)merged.set(status.id,status);}
 return [...merged.values()].sort((a,b)=>(a.tone==='negative'?0:a.tone==='positive'?1:2)-(b.tone==='negative'?0:b.tone==='positive'?1:2)||a.priority-b.priority||a.id.localeCompare(b.id));
}

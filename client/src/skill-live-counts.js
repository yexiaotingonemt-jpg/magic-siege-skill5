import {available} from '../../shared/skill-value.js';
import {isCurrentDesign,currentValues,currentSkill} from '../../shared/current-design.js';
import {elfLinkCount} from './elf-link-count.js';

const badge=(label,value,detail,tone='support',display=value)=>({text:`${label} ${display}`,detail,tone,active:value>0});
// Read live effects, never cast history or another hero's counters. No state writes.
export function skillLiveCounts(sim,hero=sim.hero()){
 const result=Array(4).fill(null);
 if(!hero||hero.hp<=0)return result;
 const now=sim.time,current=isCurrentDesign(sim.config);
 const fields=sim.fields.filter(f=>f.owner.id===hero.id&&f.until>now&&available(f.value??f.s?.value)>1e-7);
 if(hero.classId===5){
  const n=elfLinkCount(sim,hero);
  result[1]=badge('链接',n,`当前链接${n}条（同一友军的多条链接分别计数）`);
 }
 if(hero.classId===0){
  const drains=fields.filter(f=>{
   if(f.kind!=='currentDrain'&&!(f.kind==='dot'&&f.type==='orcDrain'))return false;
   const t=sim.get(f.host),s=f.s;
   return t&&!(t.immuneUntil>now)&&(!s.channel||hero.channelUntil>=now)&&
    Math.hypot(hero.x-t.x,hero.y-t.y)<=(s.break_range??s.breakRange??s.range??Infinity);
  });
  const n=new Set(drains.map(f=>f.host)).size;
  result[0]=badge('连接',n,`当前汲血连接${n}名敌人；断开、净化、免疫或阵亡的目标不计入`);
  const store=hero.damageStore;
  if(store?.until>now&&available(store.value)>1e-7){
   const n=Math.floor(Math.min(store.total*(store.conversionRatio??1),available(store.value)));
   result[3]=badge('蓄盾',n,`当前蓄伤${Math.floor(store.total)}，预计转化护盾${n}`,'protection',n>=10000?Math.floor(n/1000)/10+'万':n);
  }
 }
 if(current&&hero.classId===3){
  const n=sim.units.filter(u=>u.summoned&&u.ownerId===hero.id&&u.hp>0&&u.expiresAt>now).length;
  if(n||currentSkill(sim,hero,3).summon)result[3]=badge('护卫',n,`当前存活的自身召唤护卫${n}名`,'protection');
 }
 if(hero.classId===4){
  let heat=hero.heat||0;
  if(hero.heatUntil<=now){
   const duration=current?sim.config.design.rules.heatDuration+(currentValues(sim,hero).heat_duration_extra||0):0;
   heat=duration>0?Math.max(0,heat-Math.floor((now-hero.heatUntil)/duration)-1):0;
  }
  const n=[...sim.units,...sim.towers].filter(u=>u.hp>0&&(u.soulMarks||[]).some(m=>m.ownerId===hero.id&&m.until>now)).length;
  result[0]=badge('炙热',heat,`当前炙热${heat}层`,'heat');
  result[1]=badge('标记',n,`当前仍有自身焚魂标记的目标${n}名`,'heat');
  result[3]=badge('耗热',heat,`天火审判按释放时实际炙热结算；当前可消耗${heat}层`,'heat');
 }
 if(current&&[2,5].includes(hero.classId)){
  const barrage=hero.classId===2,kind=barrage?'currentBarrage':'currentGroupHeal';
  const f=fields.find(f=>f.kind===kind&&f.remaining>0&&hero.channelUntil>=now);
  if(f){
   // Predict elapsed ticks between snapshots, without replaying any combat effect.
   const gap=barrage?f.s.gap:f.s.duration/(f.s.pulses-1);
   const elapsed=gap>0&&f.tick<=now?Math.floor((now-f.tick)/gap)+1:0;
   const n=Math.max(0,f.remaining-elapsed);
   if(n)result[3]=badge(barrage?'余炮':'余疗',n,`本次${barrage?'炮击':'群疗'}剩余${n}次；引导结束或中断后隐藏`,barrage?'support':'healing');
  }
 }
 return result;
}

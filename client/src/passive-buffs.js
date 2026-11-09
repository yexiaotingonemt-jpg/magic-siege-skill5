import {classes} from '../../shared/config.js';
import {isCurrentDesign,currentTraits,currentValues} from '../../shared/current-design.js';
import {describeInnate} from '../../shared/innate-passives.js';
import {TRAITS,traitRank} from '../../shared/traits.js';
import {statusVisible} from './unit-status.js';

const f=n=>String(Number(Number(n||0).toPrecision(3)));
export function describeClassPassive(sim,h){
 if(!isCurrentDesign(sim.config))return describeInnate(sim,h);
 const r=sim.config.design.rules,id=h.classId,v=id===4?currentValues(sim,h):{};
 const text={
  0:`前排承伤与保护；每损失10%生命，受到伤害降低${f(r.orcMissingReduction*10)}%，最高${f(r.orcMissingReduction*100)}%。`,
  4:`炙热提高攻速并降低受疗；每层攻速提高${f((r.heatHaste+(v.heat_haste_extra||0))*100)}%、受疗降低${f(r.heatHealPenalty*100)}%。上限${r.heatCap+(v.heat_cap_extra||0)}层，保持${r.heatDuration+(v.heat_duration_extra||0)}秒后逐层衰减。`,
  5:`有效伤害的${f(r.elfDamageHeal*100)}%转为受击目标附近${f(r.elfConvertRadius)}格内最低血量比例友军的治疗，主动有效治疗的${f(r.elfHealDamage*100)}%转为受疗目标附近${f(r.elfConvertRadius)}格内敌人的伤害；派生效果不递归触发。`,
  2:'技能同时命中的敌人越多，造成的总伤害和总减益效果越弱。',
  3:`防守与续航；每击杀1名英雄或累计${r.lordMinionKills}名小兵，恢复最大生命${f(r.lordKillHeal*100)}%，随机净化自身1个负面，并随机驱散普攻范围内最近一名有可驱散增益敌人的1个增益。`,
 };
 const status={
  0:`当前缺失生命${f((1-h.hp/h.maxHp)*100)}%，被动减伤${f((1-h.hp/h.maxHp)*r.orcMissingReduction*100)}%。`,
  4:`当前炙热${h.heat||0}/${r.heatCap+(v.heat_cap_extra||0)}层，攻速提高${f((h.heat||0)*(r.heatHaste+(v.heat_haste_extra||0))*100)}%，受疗降低${f(Math.min(1,(h.heat||0)*r.heatHealPenalty)*100)}%。`,
  3:`小兵击杀进度${h.minionKills||0}/${r.lordMinionKills}；击杀英雄直接触发。`,
 };
 return {innatePassive:text[id],passiveStatus:status[id]};
}

// Derived from the hero's class/build, never stored in cleansable temporary state.
export function passiveBuffs(sim,h,viewer=sim.player){
 if(!h?.hero||h.hp<=0)return [];
 if(!statusVisible(sim,h,viewer,'positive',h.id,false))return [];
 const p=sim.players[h.playerId];if(!p)return [];
 const innate=describeClassPassive(sim,h),out=[];
 const add=(id,name,detail,stacks=0)=>out.push({id,name,detail:detail+' 常驻生效，无法净化或驱散。',stacks,tone:'positive',until:Infinity,priority:6,permanent:true,dispellable:false,cleansable:false,textureId:'passive'});
 if(innate.innatePassive)add('passive-class',classes[h.classId]+'被动',innate.innatePassive+(innate.passiveStatus?' '+innate.passiveStatus:''));
 const owned=isCurrentDesign(sim.config)&&sim.config.design.affixes.some(t=>t.classId===h.classId&&t.skill==null&&p.progress[h.classId].traits[t.id]>0);
 const traits=isCurrentDesign(sim.config)?owned?currentTraits(sim.config,h.classId):[]:TRAITS.filter(t=>t.classId===h.classId);
 for(const t of traits){const rank=isCurrentDesign(sim.config)?p.progress[h.classId].traits[t.id]||0:traitRank(p,t.id);if(t.skill==null&&rank>0)add('passive-'+t.id,t.name,t.description,rank);}
 return out;
}

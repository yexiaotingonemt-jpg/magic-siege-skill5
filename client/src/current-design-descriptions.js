import { classes } from '../../shared/config.js';
import { currentTraits,currentSkill,currentValues,describeCurrentSkill } from '../../shared/current-design.js';
const f=n=>String(Number(Number(n||0).toPrecision(3)));
export function describeCurrentAbilities(sim) {
  const p=sim.player,id=p.classId,c=sim.config.design.heroes[id],r=sim.config.design.rules;
  const h=sim.hero()||{classId:id,playerId:p.id,hp:c.hp,maxHp:c.hp,attack:c.attack,interval:c.interval,range:c.range,speed:c.speed};
  const catalogue=currentTraits(sim.config,id),rank=t=>p.progress[id].traits[t.id]||0;
  const traits=catalogue.map(t=>({...t,rank:rank(t)})),v=currentValues(sim,h);
  const roles={0:`前排承伤与保护；每损失10%生命，受到伤害降低${f(r.orcMissingReduction*10)}%，最高${f(r.orcMissingReduction*100)}%。`,
    4:`炙热提高攻速并降低受疗；每层攻速提高${f((r.heatHaste+(v.heat_haste_extra||0))*100)}%、受疗降低${f(r.heatHealPenalty*100)}%。上限${r.heatCap+(v.heat_cap_extra||0)}层，保持${r.heatDuration+(v.heat_duration_extra||0)}秒后逐层衰减。`,
    5:`有效伤害的${f(r.elfDamageHeal*100)}%转为受击目标附近${f(r.elfConvertRadius)}格内最低血量比例友军的治疗，主动有效治疗的${f(r.elfHealDamage*100)}%转为受疗目标附近${f(r.elfConvertRadius)}格内敌人的伤害；派生效果不递归触发。`,
    2:`技能同时命中的敌人越多，造成的总伤害和总减益效果越弱。`,
    3:`防守与续航；每击杀1名英雄或累计${r.lordMinionKills}名小兵，恢复最大生命${f(r.lordKillHeal*100)}%，随机净化自身1个负面并驱散敌方1个增益。`};
  const passiveStatus={
    0:`当前缺失生命${f((1-h.hp/h.maxHp)*100)}%，被动减伤${f((1-h.hp/h.maxHp)*r.orcMissingReduction*100)}%。`,
    4:`当前炙热${h.heat||0}/${r.heatCap+(v.heat_cap_extra||0)}层，攻速提高${f((h.heat||0)*(r.heatHaste+(v.heat_haste_extra||0))*100)}%，受疗降低${f(Math.min(1,(h.heat||0)*r.heatHealPenalty)*100)}%。`,
    3:`小兵击杀进度${h.minionKills||0}/${r.lordMinionKills}；击杀英雄直接触发。`,
  };
  return {name:classes[id],passive:roles[id],passiveSummary:roles[id],innatePassive:roles[id],passiveStatus:passiveStatus[id],
    skills:Array.from({length:4},(_,i)=>{const s=currentSkill(sim,h,i),summary=describeCurrentSkill({...s,classId:id},r);return {
      name:s.name,level:1,learned:true,summary,effect:summary,tags:[],upgrades:traits.filter(t=>t.skill===i),
      compactMeta:`冷却${f(s.cd)}秒 · ${s.cost}体力 · 前摇${f(s.castTime)}秒`,
      meta:'0级可用；施法时锁定攻击与词条。',valueCap:'按实际命中与有效结算记录',
    };}),owned:traits.filter(t=>t.rank>0),generalEffects:traits.filter(t=>t.skill==null),
    stats:[['生命值',`${f(h.hp)} / ${f(h.maxHp)}`],['攻击力',f(sim.attackPower(h))],['护甲',f(h.armor)],
      ['普攻间隔',`${f(h.interval/sim.attackRate(h))} 秒`],['普攻距离',`${f(h.range)} 格`],['警戒范围',`${f(h.aggro||c.range)} 格`],['移动速度',`${f(h.speed)} 格/秒`]],
    context:`新版设计 · ${sim.config.design.status}。每${r.expPerLevel}点施法体力升1级，全部词条共享40次升级；契约不计经验。`};
}

import { classes } from '../../shared/config.js';
import { currentTraits,currentSkill,currentValues,describeCurrentSkill } from '../../shared/current-design.js';
import {describeClassPassive} from './passive-buffs.js';
const f=n=>String(Number(Number(n||0).toPrecision(3)));
export function describeCurrentAbilities(sim) {
  const p=sim.player,id=p.classId,c=sim.config.design.heroes[id],r=sim.config.design.rules;
  const h=sim.hero()||{classId:id,playerId:p.id,hp:c.hp,maxHp:c.hp,attack:c.attack,interval:c.interval,range:c.range,speed:c.speed};
  const catalogue=currentTraits(sim.config,id),rank=t=>p.progress[id].traits[t.id]||0;
  const traits=catalogue.map(t=>({...t,rank:rank(t)})),v=currentValues(sim,h);
  const innate=describeClassPassive(sim,h);
  return {name:classes[id],passive:innate.innatePassive,passiveSummary:innate.innatePassive,...innate,
    skills:Array.from({length:4},(_,i)=>{const s=currentSkill(sim,h,i),summary=describeCurrentSkill({...s,classId:id},r);return {
      name:s.name,level:1,learned:true,summary,effect:summary,tags:[],upgrades:traits.filter(t=>t.skill===i),
      compactMeta:`冷却${f(s.cd)}秒 · ${s.cost}体力 · 前摇${f(s.castTime)}秒`,
      meta:'0级可用；施法时锁定攻击与词条。',valueCap:'按实际命中与有效结算记录',
    };}),owned:traits.filter(t=>t.rank>0),generalEffects:traits.filter(t=>t.skill==null),
    stats:[['生命值',`${f(h.hp)} / ${f(h.maxHp)}`],['攻击力',f(sim.attackPower(h))],['护甲',f(h.armor)],
      ['普攻间隔',`${f(h.interval/sim.attackRate(h))} 秒`],['普攻距离',`${f(h.range)} 格`],['警戒范围',`${f(h.aggro||c.range)} 格`],['移动速度',`${f(h.speed)} 格/秒`]],
    context:`新版设计 · ${sim.config.design.status}。每消耗1点体力获得${r.expPerStamina}经验，包含契约；升级每级需要${r.levelUpStamina[0]}～${r.levelUpStamina.at(-1)}点体力，升满40级累计需要${r.levelUpStamina.reduce((sum,n)=>sum+n,0)}点体力，全部词条共享40次升级。`};
}

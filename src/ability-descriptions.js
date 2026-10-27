import {classes,names} from './config.js';
import {skillRankLevels,planSkillUpgrade} from './skill-progression.js';
import {abilityTagsHTML} from './ability-tags.js';
import {SKILL_VALUE} from './skill-value.js';
const f=n=>String(Number(Number(n).toFixed(2))),pct=n=>f(n*100)+'%';
export function describeAbilities(sim){
 const p=sim.player,id=p.classId,c=sim.config.heroes[id],h=sim.hero(),A=h?sim.attackPower(h):c.attack;
 const roles={0:'前排守护：破甲增伤、群体减伤、换位互救，累计承伤后转为护盾。',2:'后排符文战车：低攻速、低移速，以腐蚀、冰霜、定点炮击与震荡威胁防御塔。',3:`黑暗领主：4格能量槽，击杀英雄获得4能量，小兵获得1能量；每满4格恢复${pct(c.passiveHealRatio)}最大生命。`,4:`中排火焰法师：单体叠热、烙印阵亡加热，大火球溅射，天火消耗炙热收割；炙热持续${c.skills[0].heatDuration}秒。`,5:'后排森林精灵：直接伤害与治疗、共享治疗链接、消耗生命净化、群体治疗。'};
 const skills=c.skills.map((b,i)=>{
  const rank=p.builds[id][i],level=Math.max(1,rank),k=1+b.levelGrowth*(level-1),s={...b,power:b.power*k},P=f(s.power),D=f(s.duration),R=f(s.targetRange),cap=SKILL_VALUE.perStamina*SKILL_VALUE.peakMultiplier*b.cost*k;
  let summaries=[],tags=[],details=[];
  if(id===0){
   summaries=[`最近1名目标受${P}%攻击伤害，受到伤害提高${pct(s.vulnerability)}，持续${D}秒。`,`自身与附近最多${s.targets}名友军减伤${pct(s.damageReduction)}，持续${D}秒。`,`与正被敌方英雄攻击的友军换位；自身减伤${pct(s.damageReduction)}、持续${D}秒。`,`累计${D}秒内实际承伤，结束按${pct(s.conversionRatio)}转成护盾，护盾持续${s.shieldDuration}秒。`];
   tags=[['单体','输出','易伤'],['群体','减伤','保护'],['换位','救援','减伤'],['自身','承伤转化','护盾']];
   details=[`优先${R}格内手选敌方目标，否则选距离最近者；易伤供所有队友利用，同类取最高值。`,`以自身为中心，优先保护${R}格内手选友军，其余按距离补足，自身独立占一个名额。`,`可优先指定${R}格内的其他友方非建筑单位，但须其正被范围内敌方英雄攻击。未指定友军时，在${R}格内找手选或最近的敌方英雄，读取其攻击目标；交换双方位置并打断被救单位施法。不能与自身换位。`,`累计生命扣除和护盾吸收的实际伤害；状态结束时生成护盾，最多${f(cap)}%施法攻击。此状态期间可移动、普攻和使用其他技能。`];
  }
  if(id===2){
   summaries=[`腐蚀弹造成目标最大生命${pct(s.percentMaxHp)}伤害。`,`冰霜弹造成${P}%攻击伤害，攻速降低${pct(s.attackSpeedDown)}、持续${D}秒。`,`定点连续${s.shots}次炮击，每炮总计${P}%攻击，由最多${s.targets}人均摊；每层减速${pct(s.slowPerStack)}，最多${s.slowCap}层。`,`震荡弹对${s.radius}格内最多${s.targets}人均摊${P}%攻击伤害，并击退${s.knockback}格。`];
   tags=[['单体','最大生命','输出'],['单体','输出','减攻速'],['定点','连续炮击','叠层减速'],['群体','均摊伤害','击退']];
   details=[`在${R}格内选取当前攻击目标，未锁定目标时自动索敌；炮弹命中后结算一次最大生命比例伤害。`,`目标选择同腐蚀弹；命中后延长尚未完成的普通攻击冷却，减攻速在持续时间和额度内生效。`,`前摇结束时锁定目标位置并引导${D}秒；此后敌人移动不会改变轰击落点。连续${s.shots}炮总计${f(s.power*s.shots)}%攻击伤害，每炮独立均摊，未命中不转移额度到后续炮击。减速持续${s.slowDuration}秒，重复命中刷新持续时间，上限${pct(s.slowPerStack*s.slowCap)}；控制打断会终止后续炮击。`,`炮弹追踪当前目标，落点周围的有效目标共同分担伤害；非建筑、非免疫单位沿远离施法者方向击退，建筑正常承受伤害。`];
  }
  if(id===3){
   summaries=[`前方最多${s.targets}人各受${P}%攻击伤害。`,`预警${s.castTime}秒，冲向${R}格内最远目标；沿途最多${s.targets}人各受${P}%攻击并撞开${s.knockback}格。`,`火焰盾持续${D}秒，自身减伤${pct(s.damageReduction)}；周围${s.radius}格最多${s.targets}名敌人附加${D}秒灼烧，每秒受${P}%攻击伤害。`,`免疫负面${D}秒；普攻附带${s.radius}格溅射，最多${s.targets}名其他敌人均分${P}%攻击。`];
   tags=[['前方','群体','输出'],['预警','突进','击退'],['减伤','持续','灼烧'],['自身','负面免疫','普攻溅射']];
   details=[`根据自动目标确定扇形朝向，筛选前方${R}格内目标。`,`按距离选择最远目标；冲锋速度${s.dashSpeed}格/秒，接触半径${s.radius}格，每个沿途目标仅命中一次。`,`火焰盾随自身移动，普通移动和突进沿途均会附加灼烧。离开范围后仍持续掉血；同一领主重复接触只刷新持续时间，不叠层，也不推迟每秒伤害。灼烧可净化，负面免疫阻止附加。火焰盾结束或领主阵亡后停止附加，已有灼烧持续至到期。`,`释放时清除已有负面，持续${D}秒免疫新负面，维持普通行军和普通攻击。溅射次数受此次收益额度限制，额度耗尽后仍保留负面免疫至持续时间结束。`];
  }
  if(id===4){
   summaries=[`最近1名目标受${P}%攻击伤害；炙热+1，最多${s.heatCap}层。`,`攻击目标受${P}%攻击；炙热≥${s.heatThreshold}时，周围最多${s.targets}人均分${f(b.splashPower*k)}%攻击。`,`最近1名目标受${P}%攻击；${D}秒内阵亡，炙热+${s.heatOnDeath}。`,`消耗全部炙热，攻击${R}格内当前生命最低的目标，各${P}%攻击；每${s.heatStep}层炙热增加1个目标。`];
   tags=[['单体','输出','炙热'],['单体','溅射','炙热联动'],['单体','击杀标记','炙热'],['收割','消耗炙热','低生命']];
   details=[`在${R}格内按距离选取，炙热持续${s.heatDuration}秒，新增层数刷新时间。`,`优先当前攻击目标，大火球溅射半径${s.radius}格。`,`仅造成一次伤害；标记期间由任何人击杀均提供${s.heatOnDeath}层炙热，直接击杀也触发，施法者需存活。焚魂标记仅记录击杀奖励，不属于负面状态，净化与负面免疫不移除该记录。`,`按当前生命绝对值由低到高选择；基础${s.targets}个目标，最多${s.targets+Math.floor(s.heatCap/s.heatStep)}个，消耗施放时记录的炙热。`];
  }
  if(id===5){
   summaries=[`造成${P}%攻击伤害，目标周围最近最多${s.targets}名友军均分${f(b.healPower*k)}%攻击治疗。`,`链接${R}格内其他友军${D}秒，双方按${pct(s.shareRatio)}共享有效治疗；优先手选。`,`消耗当前生命${pct(s.hpCost)}，净化${R}格内最多${s.targets}名有负面状态的友军。`,`为自身及${R}格内最多${s.targets}名友军，各恢复${P}%攻击生命；优先手选及低生命。`];
   tags=[['单体输出','群体治疗'],['链接','共享治疗'],['净化','耗生命'],['群体','治疗']];
   details=[`伤害主目标始终为敌人，优先手选敌人或当前攻击目标。攻击后立即治疗其周围${s.radius}格内的友方单位；手选友军在治疗圈内时优先纳入，其余按距离补足。`,`优先选择${R}格内手选的其他友方非建筑单位，否则选择当前生命最低者，不能链接自身。任意一方实际获得治疗时，按该有效治疗的${pct(s.shareRatio)}分享给另一方；分享本身不再触发分享，累计共享治疗受本次技能额度限制。`,`优先净化范围内有负面状态的手选友军，其余按距离补足；健康目标不占名额。扣除生命后清除其负面状态，生命消耗至少保留1点生命。`,`以自身为中心，自身独立占一个名额，范围内手选友军优先占其他名额，其余按剩余生命比例选取；只计算实际恢复的生命。`];
  }
  const summary=summaries[i]||'该职业未开放',upgrade=planSkillUpgrade(p,i);
  return {name:names[id][i],level,learned:!!rank,summary,tags:(tags[i]||[]).map(text=>({text,tone:/治疗/.test(text)?'healing':/护盾|减伤|保护|免疫/.test(text)?'protection':/输出|溅射|收割/.test(text)?'output':/耗生命/.test(text)?'penalty':/减速|击退|减攻速|易伤/.test(text)?'control':'support'})),effect:summary+(details[i]||'')+` 本次伤害、治疗和增减益共用${f(cap)}%攻击等效收益上限；施法攻击力为${f(A)}。`,valueCap:`收益上限 ${f(cap)}%攻击等效`,compactMeta:`冷却${s.cd}秒 · ${s.cost}体力 · 施法${s.castTime}秒`,meta:`加点等级${skillRankLevels(i).join('／')} · ${upgrade.reason}`};
 });
 return {name:classes[id],passive:roles[id],passiveSummary:roles[id],skills,context:`当前攻击${f(A)}。职业等级、经验和加点分别保留；每级技能提升20%伤害、治疗及收益额度，距离和固定比例保持技能配置。`};
}
export function abilityGuideHTML(g){return `<article class="ability-entry"><h3>职业定位</h3><p>${g.passiveSummary}</p></article>`+g.skills.map((s,i)=>`<article class="ability-entry" data-skill-detail="${i}"><h3>${s.name}<small>${s.learned?'Lv.'+s.level:'1级预览'}</small></h3>${abilityTagsHTML(s.tags)}<p class="ability-brief">${s.summary}</p><small class="ability-meta">${s.compactMeta}</small><details data-ability-detail="${i}"><summary>查看详情</summary><p>${s.effect}</p><small>${s.meta}</small><p>${g.context}</p></details></article>`).join('');}

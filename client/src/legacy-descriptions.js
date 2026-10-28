import {classes,names} from '../../shared/config.js';
import {skillRankLevels,planSkillUpgrade} from '../../shared/skill-progression.js';
import {abilityTagsHTML} from './ability-tags.js';
import {SKILL_VALUE} from '../../shared/skill-value.js';
const f=n=>String(Number(Number(n).toFixed(2))),pct=n=>f(n*100)+'%';
export const roles=['前排肉盾：用横扫和钩袭叠伤痕，再用护盾承伤或击飞破阵。','中排法师：电弧与雷击铺导电，牵引聚怪，雷云持续压制后排。','后排攻城：腐蚀高血目标，震荡击散、冰霜降低攻速，定点连轰推塔。','前排肉盾：嘲讽和反伤承压，往返旋风期间可释放其他技能切后排。','中排脆皮法师：喷火及烙印击杀叠炙热，大火球打群体，天火消耗炙热收割。','后排治疗辅助：寄生治疗，链接共享回血，净化后提高受疗，为队友提供环境。'];
const tags=[
 [['群体','输出','伤痕'],['单体','控制','伤痕'],['自身','护盾','减伤'],['群体','击飞','伤痕联动']],
 [['群体','弹射','导电'],['后排','群体','导电'],['导电英雄','聚怪','控制'],['持续','群体','减疗']],
 [['单体','持续','当前生命'],['群体','输出','击散'],['单体','输出','减攻速'],['定点','均摊伤害','攻城']],
 [['群体','输出','降攻'],['群体','嘲讽','减伤'],['自身','远程反伤'],['位移','持续','负面免疫']],
 [['前方','群体','叠炙热'],['单体','溅射','炙热联动'],['多目标','持续','击杀叠炙热'],['英雄优先','低生命','消耗炙热']],
 [['持续','输出','治疗'],['链接','减伤','共享治疗'],['净化','治疗增幅'],['自身及友方','群体','治疗']]
];
const tone=t=>/治疗|受疗/.test(t)?'healing':/护盾|减伤|免疫/.test(t)?'protection':/净化|共享|链接|炙热联动|叠炙热|伤痕联动/.test(t)?'support':/导电|伤痕|控制|聚怪|击飞|击散|嘲讽|减疗|降攻|减攻速/.test(t)?'control':/伤害|输出|溅射|弹射|反伤|攻城|持续/.test(t)?'output':'scope';
export function describeAbilities(sim){
 const p=sim.player,id=p.classId,c=sim.config.heroes[id],h=sim.hero(),A=h?sim.attackPower(h):c.attack*(1+sim.config.world.heroAttackGrowth*(p.level-1));
 const skills=c.skills.map((base,i)=>{
  const rank=p.builds[id][i],level=Math.max(1,rank),k=1+base.levelGrowth*(level-1),s={...base};for(const key of ['power','shieldPower','healPower','tickCapPower','utilityPower','splashPower'])if(key in s)s[key]*=k;
  const P=f(s.power),R=f(s.targetRange),D=f(s.duration),damage=`${P}%攻击（约${f(A*s.power/100)}）`;
  const short=[
   [`最近${s.targets}人均分${P}%攻击伤害，附加1层伤痕，持续${s.scarDuration}秒。`,`勾取${R}格内最远英雄优先目标，造成${P}%攻击伤害，附加1层伤痕。`,`获得${f(s.shieldPower)}%攻击护盾${D}秒；有伤痕敌人对你伤害降低${pct(s.damageReduction)}。`,`最近${s.targets}人均分${P}%攻击基础伤害；每层伤痕增伤${pct(s.scarBonus)}、多击飞${s.scarKnockback}格。`],
   [`随机电弧最多命中${s.bounces+1}人，各${P}%攻击，附加${s.conductDuration}秒导电。`,`最远目标周围${s.radius}格最多${s.targets}人均分${P}%攻击，附加${s.conductDuration}秒导电。`,`随机导电英雄处，吸附${s.radius}格内最多${s.targets}名导电敌人${s.pullDistance}格，均分${P}%攻击。`,`雷云${D}秒，每秒随机${s.targets}人各受${P}%攻击；命中减疗${pct(s.healingReduction)}、持续${s.debuffDuration}秒。`],
   [`腐蚀${D}秒，每秒当前生命${pct(s.percentCurrentHp)}，每跳最多${f(s.tickCapPower)}%攻击。`,`落点${s.radius}格敌人均分${P}%攻击伤害，其他敌人向外击散${s.knockback}格。`,`单体${P}%攻击伤害，攻击速度降低${pct(s.attackSpeedDown)}，持续${D}秒。`,`固定落点连轰${s.shots}次，每次范围均摊${P}%攻击，建筑额外${pct(s.buildingBonus)}伤害。`],
   [`周围${s.radius}格敌人各受${P}%攻击，降攻${pct(s.attackDown)}、持续${D}秒。`,`嘲讽周围${s.radius}格最近${s.targets}人，自身减伤${pct(s.damageReduction)}、持续${D}秒。`,`反弹${pct(s.remoteReflect)}实际远程承伤，持续${D}秒。`,`旋转往返${D}秒，每秒最多${s.targets}人各${P}%攻击，免疫负面；每受击${s.extensionHits}次延长${s.extensionSeconds}秒。`],
   [`前方最近${s.targets}人均分${P}%攻击伤害，自身炙热+1，最多${s.heatCap}层。`,`当前目标${P}%攻击伤害；炙热≥${s.heatThreshold}层时，周围敌人另均分${f(s.splashPower)}%攻击。`,`最近${s.targets}人持续${D}秒，全部目标每秒共${P}%攻击；每名宿主期间阵亡，炙热+1。`,`英雄优先、当前生命值最低，每人${P}%攻击；基础${s.targets}目标，每${s.heatStep}层炙热多1目标，消耗全部炙热。`],
   [`寄生${D}秒，每秒${P}%攻击伤害，治疗宿主附近最近${s.targets}名友军各${f(s.healPower)}%攻击生命。`,`链接最低当前生命友军${D}秒：目标减伤${pct(s.damageReduction)}，双方共享实际治疗。`,`净化最近${s.targets}名有负面友军；成功净化后受疗提高${pct(s.healingBoost)}、持续${D}秒。`,`治疗自己及生命比例最低的最多${s.targets}名其他友军，每人${P}%攻击生命。`]
  ][id][i];
  const details=[
   [`攻击${R}格内最近${s.targets}个敌人，均分合计${damage}。每名存活、非免疫的小兵或英雄获得1层伤痕，持续${s.scarDuration}秒，最多${s.scarCap}层，满层时刷新最早一层。建筑不叠伤痕。`,`在${R}格内优先最远敌方英雄，无英雄时选择最远小兵；造成${damage}，勾至自身前方${s.pullStopDistance}格并打断，附加1层${s.scarDuration}秒伤痕。建筑不被选择，免疫负面的目标不位移、不叠伤痕。`,`自身获得${f(s.shieldPower)}%施法攻击力的护盾（约${f(A*s.shieldPower/100)}），持续${D}秒；护盾存在时，有伤痕的攻击者对自己造成的伤害降低${pct(s.damageReduction)}。只对这类来源生效，护盾与减伤共用整次额度；没有破盾爆炸。`,`将${R}格内最近${s.targets}个敌人均分合计${damage}；每个目标按自身伤痕层数，每层增伤${pct(s.scarBonus)}，从基础${s.knockback}格额外增加每层${s.scarKnockback}格击飞，并眩晕${s.stun}秒。伤痕不消耗；建筑与免疫目标只受伤害。`],
   [`从${R}格内随机1个敌人开始，随机弹射${s.bounces}次，每次选择范围内本次尚未命中的敌人；最多${s.bounces+1}个不同目标，各受${damage}。存活非免疫单位获得${s.conductDuration}秒导电，盟友雷霆法师也可利用。`,`在${R}格内最远敌人处雷击，对半径${s.radius}格内最近最多${s.targets}人均分合计${damage}，命中单位获得${s.conductDuration}秒导电。`,`随机选择${R}格内1名导电英雄为中心；对其${s.radius}格内最近最多${s.targets}名导电敌人均分合计${damage}。除中心外，非免疫单位向中心移动最多${s.pullDistance}格，停在距中心至少${s.pullStopDistance}格，位移打断施法。没有导电英雄时不可施放且不扣费。`,`随机选择${R}格内1个导电敌人，在其上方生成持续${D}秒的雷云；随目标移动，目标死亡则留在最后位置。每秒在半径${s.radius}格内随机选择最多${s.targets}个不同敌人，各受${damage}；命中后减疗${pct(s.healingReduction)}，持续${s.debuffDuration}秒。没有导电目标时不可施放。`],
   [`向${R}格内当前攻击目标投掷追踪腐蚀弹；无合法当前目标时优先最近建筑，再选最近敌人。命中后持续${D}秒，每秒按目标当时当前生命的${pct(s.percentCurrentHp)}造成伤害，每跳上限${f(s.tickCapPower)}%施法攻击。同来源刷新不叠加。`,`向${R}格内当前攻击目标发射震荡弹，对落点半径${s.radius}格所有敌人均分合计${damage}。除主目标外，其他非建筑、非免疫敌人向四周击散${s.knockback}格并打断；主目标不位移。`,`追踪命中${R}格内当前攻击目标，造成${damage}，攻击速度降低${pct(s.attackSpeedDown)}，持续${D}秒，实际攻击间隔变为原来的${f(1/(1-s.attackSpeedDown))}倍。攻速降低的等效收益计入同次额度，耗尽后减益停止。`,`对${R}格内当前攻击目标在释放时所在位置连续炮击${s.shots}次，持续引导${D}秒；落点固定，不追踪。每次半径${s.radius}格内所有敌人均摊合计${damage}，建筑额外承受${pct(s.buildingBonus)}伤害。眩晕、位移、死亡会打断后续炮击。`],
   [`对自身半径${s.radius}格内所有敌人各造成${damage}，并降低攻击力${pct(s.attackDown)}、持续${D}秒。所有目标伤害与实际降攻收益共用整次额度。`,`强迫自身${s.radius}格内最近最多${s.targets}名敌方小兵或英雄攻击自己，持续${D}秒；自身减伤${pct(s.damageReduction)}。建筑与免疫单位不受嘲讽。结束后重新正常索敌。`,`持续${D}秒，将实际承受的远程伤害（含护盾吸收）的${pct(s.remoteReflect)}反弹给来源。远程普攻、远程技能、远程持续伤害均可触发；近战和反伤不触发，反伤不递归。`,`解除已有负面，免疫新负面；沿释放时朝向旋转前进${f(s.duration/2)}秒，再沿原路返回${f(s.duration/2)}秒。期间可释放其他技能，每秒对半径${s.radius}格内最近最多${s.targets}个敌人各造成${damage}。每承受${s.extensionHits}次有效伤害延长旋转${s.extensionSeconds}秒（前进时延长前进段，返回时延长返回段），最多额外${s.extensionLimit}秒；免疫同步延长，死亡终止。`],
   [`向当前攻击目标方向喷火，对${R}格内前方最近${s.targets}名敌人均分合计${damage}，自身获得1层炙热，最多${s.heatCap}层。炙热不自然衰减，阵亡后清空。`,`对${R}格内当前攻击目标发射火球，造成${damage}。拥有至少${s.heatThreshold}层炙热时变为大火球，另对主目标半径${s.radius}格内最近最多${s.targets}名其他敌人均分合计${f(s.splashPower)}%攻击的溅射伤害；本技能不消耗炙热。`,`对${R}格内最近最多${s.targets}个敌人附加${D}秒焚魂；每秒全部宿主均分合计${damage}，共${D}次。每名宿主在有效持续期间阵亡，不论由谁击杀，都让存活的施法者获得1层炙热；每宿主每次烙印只结算一次，同来源刷新不叠加。`,`消耗释放时拥有的全部炙热，对${R}格内目标降下天火：英雄优先，再按当前生命值从低到高选择。基础${s.targets}目标，每${s.heatStep}层炙热增加1个目标；每目标造成${damage}。炙热上限${s.heatCap}时最多${s.targets+Math.floor(s.heatCap/s.heatStep)}目标；无额外低血增伤。`],
   [`寄生${R}格内最近敌人${D}秒；每秒造成${damage}，同时治疗宿主半径${s.radius}格内最近${s.targets}名友方单位，各恢复${f(s.healPower)}%攻击生命。宿主死亡或净化结束，同来源刷新不叠加。`,`链接${R}格内当前生命值最低的1个其他友军，持续${D}秒；只有被链接目标受到的伤害降低${pct(s.damageReduction)}。任意一方获得实际治疗后，另一方获得同等基础治疗，受自身减疗或治疗增幅影响；共享治疗不再次共享，避免递归。任一方死亡结束，双方离开初选范围不断开。`,`净化${R}格内最近最多${s.targets}个有负面状态的友军，清除伤痕、导电、持续伤害、降攻、减攻速、嘲讽和眩晕等。只有成功净化者受到治疗提高${pct(s.healingBoost)}、持续${D}秒；不增加攻击力。没有可净化目标时不扣费。`,`治疗自己，以及${R}格内生命比例最低的最多${s.targets}名其他受伤友军，每人恢复${P}%自身攻击生命（约${f(A*s.power/100)}）。自己占独立名额，最多共${s.targets+1}人；全部满血时不可释放。友方单位包含可受疗建筑。`]
  ][id][i];
  const cap=SKILL_VALUE.perStamina*s.cost*k*SKILL_VALUE.peakMultiplier,upgrade=planSkillUpgrade(p,i);
  return {name:names[id][i],tags:tags[id][i].map(text=>({text,tone:tone(text)})),level,learned:!!rank,summary:short,effect:details+` 本次全部目标、跳数、共享治疗与增减益共用${f(cap)}%施法攻击等效上限；控制/标记按配置预留估值，额度耗尽后对应数值效果停止。`,valueCap:`总收益上限 ${f(cap)}%基础攻击等效`,compactMeta:`冷却${s.cd}秒 · ${s.cost}体力 · 施法${s.castTime}秒`,meta:`${rank?'技能Lv.'+rank:'1级预览'} · 加点等级${skillRankLevels(i).join('／')} · ${upgrade.reason}`};
 });
 return {name:classes[id],passive:roles[id],passiveSummary:roles[id],skills,context:`职业Lv.${p.level}，攻击力${f(A)}。每体力800%等效基准，理想上限1000%。技能升阶时伤害、治疗、护盾与总额度每阶增加20%；持续时间、距离、目标数与固定比例不随升阶增加。各职业等级、经验和加点独立保存。`};
}
export function abilityGuideHTML(guide){return `<article class="ability-entry"><h3>职业定位</h3><p class="ability-brief">${guide.passiveSummary}</p></article>`+guide.skills.map((s,i)=>`<article class="ability-entry" data-skill-detail="${i}"><h3>${s.name}<small>${s.learned?'Lv.'+s.level:'1级预览'}</small></h3>${abilityTagsHTML(s.tags)}<p class="ability-brief">${s.summary}</p><small class="ability-meta">${s.compactMeta}</small><small class="ability-value">${s.valueCap}</small><details data-ability-detail="${i}"><summary>查看详情</summary><p>${s.effect}</p><small class="ability-meta">${s.meta}</small><p class="ability-context">${guide.context}</p></details></article>`).join('');}

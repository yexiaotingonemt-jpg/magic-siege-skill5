import { CURRENT_DESIGN } from './current-design-data.js';
import { validateExperienceRules } from './experience.js';
import { RARITIES, UPGRADE_POOLS } from './upgrade-quality.js';

export const isCurrentDesign = config => config?.design?.enabled === true;
export const designHeroIds = [0, 4, 5, 2, 3];
const copy = x => JSON.parse(JSON.stringify(x));
export function createCurrentDesignConfig(base, design = CURRENT_DESIGN) {
  const config = copy(base);
  config.design = copy(design);
  config.innate.enabled = 0;
  validateCurrentDesign(config.design);
  for (const id of designHeroIds) {
    const { hp, attack, interval, range, speed } = config.design.heroes[id];
    Object.assign(config.heroes[id], { hp, attack, interval, range, speed });
    // 兼容显示字段也由同一新技能配置派生，避免接口与编辑器继续展示旧倍率。
    config.heroes[id].skills.forEach((skill,i)=>{
      const current=config.design.skills[id][i];
      Object.assign(skill,{power:current.power*100,cd:current.cd,cost:current.cost,targetRange:current.range,
        radius:current.radius,duration:current.duration,castTime:current.cast,levelGrowth:0});
      if('targets' in skill)skill.targets=current.targets;
    });
  }
  Object.assign(config.heroes[4].skills[0],{heatCap:config.design.rules.heatCap,heatDuration:config.design.rules.heatDuration});
  config.world.contractCost = config.design.rules.contractCost;
  config.world.heroKillXp = config.world.minionKillXp = 0;
  config.world.towerDamageExpRate = config.world.towerBreakXp = 0;
  config.world.initialLevel = config.design.rules.initialLevel;
  config.world.maxLevel = config.design.rules.maxLevel;
  config.world.expPerStamina = config.design.rules.expPerStamina;
  config.world.levelUpStamina = [...config.design.rules.levelUpStamina];
  return config;
}
export function validateCurrentDesign(d) {
  if (!d || d.enabled !== true) throw Error('新版设计必须显式启用');
  const finite = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1e7;
  const positive = x => finite(x) && x > 0;
  const validateParameters = values => {
    for(const [key,value] of Object.entries(values)){
      if(typeof value==='number'&&!finite(value))throw Error('新版数值无效：'+key);
      if(['cdr','attack_down','attack_slow','slow','slow_per','reduction','reduction_cap','final_reduction','tower_reduction'].includes(key)&&value>=1)throw Error('比例必须小于100%：'+key);
      if(['heat_chance','dot_chance','extra_chance','heal_down','healing_down','execute','hp_ratio'].includes(key)&&value>1)throw Error('比例不能超过100%：'+key);
      if(['unlimited_targets','damage_immune'].includes(key)&&typeof value!=='boolean')throw Error('开关必须是布尔值：'+key);
      if(['targets','shots','pulses','bounces','damage_targets','slow_cap','summon','initial_heat','heat_cap_extra','elf_extra_targets'].includes(key)&&(!Number.isInteger(value)||value<0))throw Error('数量必须是非负整数：'+key);
    }
  };
  if (!d.rules || !positive(d.rules.standardStamina)) throw Error('新版成长或计分配置无效');
  validateExperienceRules(d.rules);
  for (const value of Object.values(d.rules))
    if (!(Array.isArray(value) ? value.every(finite) : finite(value))) throw Error('新版规则数值无效');
  if (d.rules.shareTotals.length !== 7 || d.rules.shareTotals.some(x => x > 1) ||
      !positive(d.rules.pierceGap) || !positive(d.rules.pierceSpeed) || !positive(d.rules.heatDuration) ||
      !positive(d.rules.lordMinionKills) || !positive(d.rules.lordPassiveThreshold) ||
      d.rules.orcMissingReduction >= 1 || d.rules.lordPassiveReduction >= 1) throw Error('新版触发或分担配置无效');
  for (const id of designHeroIds) {
    const h = d.heroes?.[id], skills = d.skills?.[id];
    if (!h || !['hp','attack','interval','range','speed'].every(k => positive(h[k])) ||
        !finite(h.hpGrowth) || !finite(h.attackGrowth) || skills?.length !== 4) throw Error('新版职业配置不完整');
    for (const [i, s] of skills.entries()) {
      if (!positive(s.cd) || !finite(s.cast) || !finite(s.range) || !Number.isInteger(s.targets) || s.targets < 1 ||
          !Number.isInteger(s.cost) || s.cost < [1,1,2,3][i] || s.cost > [1,2,3,3][i]) throw Error('新版技能费用、目标或时间无效');
      for (const v of Object.values(s)) if (typeof v === 'number' && !finite(v)) throw Error('新版技能数值无效');
      validateParameters(s);
      if (s.channel && s.shots && !positive(s.gap)) throw Error('连发间隔必须大于0');
    }
    const c = d.scoreCoefficients?.[id];
    if (!c || !['a','b','c'].every(k => finite(c[k]))) throw Error('新版计分系数无效');
  }
  const seen = new Set();
  if (!Array.isArray(d.affixes)) throw Error('新版词条配置不完整');
  for (const a of d.affixes) {
    if (seen.has(a.id) || !designHeroIds.includes(a.classId) || !/^N\d{3}_[02345]$/.test(a.id) ||
        Number(a.id.split('_')[1]) !== a.classId || !Object.hasOwn(RARITIES,a.rarity) ||
        !Number.isInteger(a.max) || a.max < 1 || a.max > 40 || a.values?.length !== a.max ||
        !Array.isArray(a.keys) || !a.keys.length || a.baseline?.length !== a.keys.length ||
        a.keys.some(k => ['__proto__','constructor','prototype'].includes(k)) ||
        a.values.some(row => row.length !== a.keys.length || !row.every(finite)) ||
        !(a.skill === null || Number.isInteger(a.skill) && a.skill >= 0 && a.skill < 4)) throw Error('新版词条档位无效');
    seen.add(a.id);
    for(const row of a.values){
      const merged=a.skill==null?{}:{...d.skills[a.classId][a.skill]};
      a.keys.forEach((key,j)=>{merged[key]=a.skill==null?row[j]:Number(merged[key]||0)+row[j]-a.baseline[j];});
      validateParameters(merged);
    }
  }
  for (const id of designHeroIds) if (d.affixes.filter(a => a.classId === id).reduce((n,a) => n+a.max,0) < 40)
    throw Error('新版词条不足40次合法升级');
  if (!Object.keys(RARITIES).every(k => positive(d.qualityWeights?.[k]))) throw Error('品质权重必须大于0');
  for (const id of designHeroIds) for (const [type, qualities] of Object.entries(UPGRADE_POOLS)) {
    const needed = type === 'advanced' ? Math.floor(d.rules.maxLevel/5) : d.rules.maxLevel-Math.floor(d.rules.maxLevel/5);
    if (d.affixes.filter(t => t.classId===id && qualities.includes(t.rarity)).reduce((n,t)=>n+t.max,0)<needed)
      throw Error('升级池词条档位不足：'+id+'/'+type);
  }
  return d;
}
export function inverseQualityWeights(means) {
  if (!['blue','purple','gold'].every(k => Object.hasOwn(means,k)) ||
    !Object.entries(means).every(([k,v])=>Object.hasOwn(RARITIES,k)&&Number.isFinite(v)&&v>0)) throw Error('品质平均收益必须大于0');
  return Object.fromEntries(Object.entries(means).map(([key,value]) => [key,1/value]));
}
export function currentTraits(config, classId) {
  return config.design.affixes.filter(t => classId == null || t.classId === classId).map(t => ({...t, description: describeAffix(t,config.design)}));
}
export function currentValues(sim, h, slot = null, snapshot = null) {
  if(h?.playerId==null || h.classId==null)return {};
  const result = {}, ranks = snapshot || sim.players[h.playerId]?.progress[h.classId]?.traits || {};
  for (const t of sim.config.design.affixes) {
    if (t.classId !== h.classId || t.skill !== slot) continue;
    const rank = Math.min(t.max, Math.max(0, Math.floor(ranks[t.id] || 0)));
    if (!rank) continue;
    t.keys.forEach((key,j) => {
      const value = t.values[rank-1][j];
      // 同属性按等级基础值相加；各档是绝对档值，不能累计前档。
      result[key] = (result[key] || 0) + (slot == null ? value : value-t.baseline[j]);
    });
  }
  return result;
}
export function currentSkill(sim,h,i) {
  const base = sim.config.design.skills[h.classId][i], delta = currentValues(sim,h,i), s = {...base};
  for (const [key,value] of Object.entries(delta)) s[key] = Number(base[key] || 0)+value;
  if (h.classId===3 && i===3) s.shield_duration=s.duration;
  s.cd *= 1-(currentValues(sim,h).cdr || 0);
  return {...s, classId:h.classId, targetRange:s.range, castTime:s.cast, power:s.power*100, healPower:(s.heal || 0)*100,
    skill:i, bonusDamage:h.eliteBuffs?.arcane > sim.time ? 0.1 : 0, ranks:{...(sim.players[h.playerId]?.progress[h.classId]?.traits || {})}};
}
export function currentName(config,id,i) { return config.design.skills[id][i].name; }
export function currentTraitRank(p,id) {
  const classId = Number(id.split('_')[1]);
  return p?.progress?.[classId]?.traits?.[id] || 0;
}
export function currentUpgradeCandidates(sim, progress, classId, upgradeType, level) {
  const all=currentTraits(sim.config,classId).filter(t=>(progress.traits?.[t.id]||0)<t.max);
  const other=upgradeType==='normal'?'advanced':'normal', max=sim.config.world.maxLevel;
  const futureAdvanced=Math.floor(max/5)-Math.floor(level/5);
  const needed=other==='advanced'?futureAdvanced:max-level-futureAdvanced;
  const otherStock=all.filter(t=>UPGRADE_POOLS[other].includes(t.rarity)).reduce((n,t)=>n+t.max-(progress.traits?.[t.id]||0),0);
  // Purple is shared. Do not spend the last ranks required by future upgrades
  // of the other type; gold never enters the normal pool as a fallback.
  return all.filter(t=>UPGRADE_POOLS[upgradeType].includes(t.rarity) &&
    !(t.rarity==='purple' && needed>0 && otherStock<=needed));
}
export function drawCurrentQuality(sim, progress, classId, upgradeType = 'normal', excluded = []) {
  const level=progress.choices?.[0]?.level??progress.level;
  const pool = currentUpgradeCandidates(sim,progress,classId,upgradeType,level).filter(t=>!excluded.includes(t.id));
  const qualities = UPGRADE_POOLS[upgradeType].filter(q => pool.some(t => t.rarity === q));
  const total = qualities.reduce((sum,q) => sum+sim.config.design.qualityWeights[q],0);
  let n = sim.random()*total;
  return qualities.find(q => (n-=sim.config.design.qualityWeights[q]) < 0) || qualities.at(-1);
}
export const currentStatPoints = (config,id,key,n) => {
  const c = config.design.scoreCoefficients[id], r = config.design.rules;
  return n*({heroDamage:c.a,minionDamage:c.a,buildingDamage:c.a,minionKillHealth:c.a,
    damageTaken:c.b,healing:c.c,heroKills:r.heroKillPoints,heroAssists:r.heroAssistPoints,staminaSpent:r.staminaPoints}[key] || 0);
};
export function currentContributionParts(config,h) {
  const c = config.design.scoreCoefficients[h.classId], r=config.design.rules, s=h.stats || {};
  return [
    ['damage',(s.heroDamage||0)+(s.minionDamage||0)+(s.buildingDamage||0),c.a],
    ['damageTaken',s.damageTaken||0,c.b],['healing',s.healing||0,c.c],
    ['minionKillHealth',s.minionKillHealth||0,c.a],['heroKills',s.heroKills||0,r.heroKillPoints],
    ['heroAssists',s.heroAssists||0,r.heroAssistPoints],['staminaSpent',s.staminaSpent||0,r.staminaPoints],
    ['eliteScoreBonus',s.eliteScoreBonus||0,1],['eliteScoreBounty',s.eliteScoreBounty||0,1],
  ].map(([key,value,coefficient]) => ({key,value,coefficient,points:value*coefficient}));
}
const f=n=>String(Number(Number(n).toPrecision(3))), pct=n=>f(n*100)+'%';
const units={power:'伤害／攻击力',path_damage:'沿途伤害／攻击力',heal:'治疗／攻击力',per_hit:'每次攻击附伤／攻击力',duration:'持续秒',targets:'目标数',range:'范围格',shots:'炮数',knock:'击退格',gap:'间隔秒',
  vuln:'受到伤害提高',reduction:'减伤比例',haste:'攻击速度',reflect:'有效承伤反弹',blast:'范围伤害／攻击力',taunt:'嘲讽秒',start_shield:'初始护盾／最大生命',share:'共享比例',burst:'蓄伤爆发比例',
  attack_down:'降低攻击力',bounces:'弹射人数',explode:'爆炸伤害／攻击力',heat_chance:'获得炙热概率',isolated:'单目标伤害提高',refund:'击杀返还炙热',execute:'斩杀生命阈值',
  damage_targets:'转伤目标数',twin:'额外治疗比例',attack_per_cleanse:'每个净化增攻',healing_boost:'受到治疗提高',over_shield:'过量转盾比例',counter:'治疗转伤比例',
  heal_down:'下次治疗降低',extra_chance:'追加攻击概率',dot_chance:'腐蚀概率',dot_hp:'每秒目标生命伤害',hp_ratio:'目标生命伤害比例',cap:'伤害上限／攻击力',attack_slow:'降低攻速',self_haste:'自身攻速增益',move_damage:'每格位移伤害／攻击力',ramp:'逐炮增伤',
  slow:'降低移速',echo:'返回波伤害比例',pull:'牵引格',death_slow:'反伤击杀降低攻速',shield:'护盾／最大生命',lifesteal:'技能吸血',summon:'护卫数量',initial_heat:'初始炙热层',heat_duration_extra:'炙热保留秒',heat_cap_extra:'炙热上限层',heat_haste_extra:'每层炙热额外攻速',heat_attack_proc:'每层获热耗热增攻',elf_damage_bonus:'治疗转伤提高',elf_extra_targets:'转伤目标数',attack_bonus:'攻击力',missing_attack:'缺血增攻',missing_lifesteal:'缺血吸血',share_relief:'减轻分担衰减',building_bonus:'对建筑伤害提高',range_bonus:'普攻距离格',hp_bonus:'最大生命',move_bonus:'移动速度',healing_received:'受到治疗提高',cdr:'冷却缩减',tower_reduction:'对塔减伤',final_reduction:'最终减伤',final_damage:'最终增伤'};
export function describeAffix(t,design=null) {
  if (design && t.sourceId===55) return `自身攻击速度提高${t.values.map(row=>pct(row[0]-t.baseline[0])).join('/')}除以分担目标数，持续${design.skills[2][1].self_haste_duration}秒（上限${t.max}档）。`;
  if (t.sourceId===75) return `开启君临时，获得相当于最大生命${t.values.map(row=>pct(row[0]-t.baseline[0])).join('/')}的护盾，持续至君临结束（上限${t.max}档）。`;
  if (design && t.sourceId===78) return `每累计受到最大生命${pct(design.rules.lordPassiveThreshold)}的伤害，受到的伤害降低${pct(design.rules.lordPassiveReduction)}，持续${design.rules.lordPassiveDuration}秒（上限${t.max}档）。`;
  if(t.description){
    const whole=new Set(['duration','targets','range','bounces','taunt','knock','shots','initial_heat','heat_duration_extra','heat_cap_extra','range_bonus','elf_extra_targets','damage_targets','refund','summon']);
    const boolean=new Set(['immortal','pierce','split','drag','passive_dr']);
    let text=t.description;
    const numbers=[...text.split('（')[0].matchAll(/\d+(?:\.\d+)?(?:%?\/\d+(?:\.\d+)?)*%?(?:个百分点)?/g)].map(m=>m[0]);
    const percents=numbers.filter(n=>n.includes('%')||n.includes('个百分点'));
    const replace=(token,values,ratio)=>{const rendered=values.map(v=>f(ratio?v*100:v));text=text.replace(token,token.endsWith('个百分点')?rendered.join('/')+'个百分点':ratio?rendered.map(v=>v+'%').join('/'):rendered.join('/'));};
    if(boolean.has(t.keys[0]))return text;
    if(t.sourceId===51){replace(percents[0],[t.values[0][0]],true);replace(percents[1],t.values.map(v=>v[1]),true);}
    else if(t.sourceId===67){replace(percents[0],[t.values[0][0]],true);replace(numbers[1],[t.values[0][1]],false);}
    else if(t.sourceId===77)text=text.replace(/最多同时存在\d+名/,`最多同时存在${t.values[0][0]}名`);
    else if(t.sourceId===88||t.sourceId===91){replace(percents[1],[t.values[0][0]/100],true);replace(percents.at(-1),[t.values[0][0]],true);}
    else {const key=t.keys[0],integer=whole.has(key),token=t.sourceId===31?numbers[1]:integer?numbers[0]:percents[0];if(token)replace(token,t.values.map(v=>v[0]-Number(t.baseline[0])),!integer);}
    return text;
  }
  return t.keys.map((key,j) => `${units[key] || t.name}：${t.values.map(row => {
    const delta=row[j]-t.baseline[j];
    if(['immortal','pierce','split','drag','passive_dr'].includes(key))return delta?'获得此能力':'未激活';
    return (delta>=0?'+':'')+(['duration','targets','range','shots','knock','gap','initial_heat','heat_cap_extra','heat_duration_extra','range_bonus','elf_extra_targets','summon','taunt','pull','bounces','refund','damage_targets'].includes(key) ? f(delta) : pct(delta));
  }).join('／')}`).join('；')+`（上限${t.max}档，各档相对基础）。`;
}
export function describeCurrentSkill(s,rules={}) {
  const P=pct(s.power/100), D=f(s.duration), T=s.targets;
  const base={0:[`汲取${D}秒，每秒${P}攻击伤害并恢复实际伤害量生命。最多${T}名目标，额外目标按${pct(s.secondary)}结算；连接距离超过${f(s.break_range??s.range)}格时中断。`,
    `自身及附近${T}名友军减伤${pct(s.reduction)}，持续${D}秒。`,
    `与友军换位，按其缺失生命比例×${pct(s.reduction_per_lost)}获得减伤，最高${pct(s.reduction_cap)}，持续${D}秒。`,
    `记录${D}秒内实际承伤，结束按${f(s.store_gain)}倍转成${s.shield_duration}秒护盾。`],
    4:[`造成${P}攻击伤害，获得1层炙热。`, `标记${D}秒，自身每次普攻命中被标记敌人时附加${pct(s.per_hit)}攻击伤害，有${pct(s.heat_chance)}概率获得炙热。`,
    `最多${T}名敌人各受${P}攻击伤害；每击杀1名获得${s.kill_heat}层炙热。`,
    `消耗全部炙热，造成${P}攻击伤害，每层使本次伤害提高${pct(s.heat_damage)}，最多${T}名目标。`],
    5:[`恢复${pct(s.heal)}攻击力的生命，并按有效治疗触发职业转伤。`, `链接${T}名友军${D}秒，共享${pct(s.share)}有效治疗。`,
    `净化${s.range}格内${T}名友军，每移除1个负面恢复${pct(s.heal_per_cleanse)}攻击力的生命。`,
    `自身和${T}名友军每次恢复${pct(s.heal)}攻击力生命，共${s.pulses}次，持续吟唱${D}秒。`],
    2:[`命中最多${T}人，分担前伤害为主目标最大生命${pct(s.hp_ratio)}。`,
    `命中最多${T}人，分担前${P}攻击伤害、降低${pct(s.attack_slow)}攻速${D}秒。`,
    `命中最多${T}人，分担前${P}攻击伤害、击退${s.knock}格。`,
    `固定落点半径${s.radius}格内炮击${s.shots}次，间隔${s.gap}秒，每炮${P}攻击伤害并使移速降低${pct(s.slow_per)}，最多${s.slow_cap}层。`],
    3:[`震荡命中前方${f(s.range)}格扇形范围内最多${T}名敌人，各受${P}攻击伤害、降攻${pct(s.attack_down)}，持续${D}秒。`,
    `尖刺外壳${D}秒，受到普通攻击或技能攻击时向攻击者反弹其攻击力${pct(s.thorn)}的伤害。`,
    `向目标冲锋，晕眩${s.stun}秒，沿途最多${T}人各受${P}攻击伤害。`,
    `君临${D}秒，${s.damage_immune?'免疫任何伤害及负面效果':'免疫负面'}；普攻对主目标周围最多${T}名敌人造成${P}攻击伤害。`]}[s.classId]?.[s.skill] || '';
  const extra=[],add=(condition,text)=>{if(condition)extra.push(text);};
  if(s.classId===0){
    if(s.skill===0)add(s.vuln,`目标受到伤害提高${pct(s.vuln)}。`);
    if(s.skill===1){add(s.haste,`受保护单位攻速提高${pct(s.haste)}。`);add(s.reflect,`反弹有效承伤的${pct(s.reflect)}。`);}
    if(s.skill===2){add(s.heal,`为友军恢复${pct(s.heal)}攻击力生命。`);add(s.blast,`落点范围造成${pct(s.blast)}攻击伤害。`);add(s.taunt,`嘲讽周围敌人${s.taunt}秒。`);}
    if(s.skill===3){add(s.start_shield,`开启时获得最大生命${pct(s.start_shield)}护盾。`);add(s.share,`计入附近友军有效承伤的${pct(s.share)}。`);add(s.burst,`结束造成累计承伤${pct(s.burst)}范围伤害。`);add(s.immortal,'持续期间生命最低为1。');}
  }
  if(s.classId===4){
    if(s.skill===0){add(s.attack_down,`降低目标攻击${pct(s.attack_down)}，${D}秒。`);add(s.bounces,`额外弹射${s.bounces}人，各受主伤${pct(s.secondary)}。`);add(s.explode,`击杀时爆炸造成${pct(s.explode)}攻击伤害。`);}
    if(s.skill===1){add(s.vuln,`标记目标受到伤害提高${pct(s.vuln)}。`);add(s.explode,`标记目标阵亡时爆炸造成${pct(s.explode)}攻击伤害。`);}
    if(s.skill===2){add(s.isolated,`只命中1人时伤害提高${pct(s.isolated)}。`);add(s.knock,`命中击退${s.knock}格。`);add(s.path_damage,`对沿途敌人额外造成${pct(s.path_damage)}攻击伤害，每名敌人一次。`);}
    if(s.skill===3){add(T>1,`额外目标承受主伤${pct(s.secondary)}。`);add(s.refund,`每击杀1人获得${s.refund}层炙热。`);add(s.execute,`结算后斩杀生命低于${pct(s.execute)}的非建筑敌人。`);}
  }
  if(s.classId===5){
    if(s.skill===0){add(s.twin,`另治疗附近生命比例最低友军，恢复主治疗${pct(s.twin)}。`);add(s.damage_targets>1,`本次治疗转伤基础命中${s.damage_targets}人。`);add(s.vuln,`受伤敌人易伤${pct(s.vuln)}，4秒。`);}
    if(s.skill===1){add(s.reduction,`友军减伤${pct(s.reduction)}。`);add(s.haste,`友军攻速提高${pct(s.haste)}。`);add(s.split,'自身与链接友军平摊伤害。');}
    if(s.skill===2){add(s.attack_per_cleanse,`每移除1个状态，自身增攻${pct(s.attack_per_cleanse)}，${s.boost_duration}秒。`);add(s.healing_boost,`友军受疗提高${pct(s.healing_boost)}，${s.bless_duration}秒。`);}
    if(s.skill===3){add(s.over_shield,`过量治疗${pct(s.over_shield)}转为${s.shield_duration}秒护盾，最高最大生命${pct(s.shield_cap)}。`);add(s.counter,`额外对每名受疗友军附近最多3人造成有效治疗${pct(s.counter)}的伤害。`);}
  }
  if(s.classId===2){
    if(s.skill===0){add(s.heal_down,`未分担时使下次受疗降低${pct(s.heal_down)}。`);add(s.extra_chance,`${pct(s.extra_chance)}概率追加一次。`);add(s.dot_chance,`${pct(s.dot_chance)}概率附加${D}秒腐蚀，每秒未分担伤害为目标生命${pct(s.dot_hp)}。`);}
    if(s.skill===1)add(s.self_haste,`自身攻速提高${pct(s.self_haste)}÷命中人数，${s.self_haste_duration??s.duration}秒。`);
    if(s.skill===2){add(s.move_damage,`每实际击退1格追加${pct(s.move_damage)}攻击伤害。`);add(s.blast,`落点再次爆炸，分担前合计${pct(s.blast)}攻击伤害。`);}
    if(s.skill===3)add(s.ramp,`从第2炮起每炮增加首炮伤害的${pct(s.ramp)}。`);
  }
  if(s.classId===3){
    if(s.skill===0){add(s.healing_down,`受到治疗降低${pct(s.healing_down)}，${s.healing_down_duration}秒。`);add(s.slow,`移速降低${pct(s.slow)}，${s.slow_duration}秒。`);add(s.echo,`返回波造成首段${pct(s.echo)}伤害并牵引${s.pull}格。`);}
    if(s.skill===1){add(s.attack_down,`攻击者降攻${pct(s.attack_down)}，${s.debuff_duration}秒。`);add(s.death_slow,`反伤击杀使周围敌人攻速降低${pct(s.death_slow)}，${s.slow_duration}秒。`);}
    if(s.skill===2)add(s.drag,'沿途命中的敌人拖拽至终点。');
    if(s.skill===3){add(s.shield,`开启时获得最大生命${pct(s.shield)}护盾，持续至君临结束。`);add(s.lifesteal,`技能吸血${pct(s.lifesteal)}。`);add(s.summon,`击杀召唤${s.summon_duration}秒护卫，最多${s.summon}名。`);}
  }
  return base+extra.join('');
}

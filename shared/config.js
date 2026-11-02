import {defaults as base,labels as baseLabels} from './base-config.js';
import {INNATE_DEFAULTS} from './innate-passives.js';
export const clone=x=>JSON.parse(JSON.stringify(x));
export const classes=['兽人战士','雷霆巨人','符文战车','黑暗领主','火焰法师','森林精灵','暗影刺客'];
export const names=[['汲血链接','守护战吼','换位救援','蓄伤壁垒'],['导电电弧','远阵雷击','电弧牵引','禁疗雷云'],['腐蚀炮弹','冰霜炮弹','震荡炮弹','定点连轰'],['裂地震荡','暗影冲锋','焚身壁垒','灭军君临'],['烈焰冲击','焚魂烙印','炙热火球','天火审判'],['灵息冲击','共生链接','献生净化','生命群疗'],['蚀骨飞刃','影袭','残影回溯','环刃风暴']];
export const contractType=id=>['melee','ranged','siege','melee','ranged','ranged','melee'][id];
export const availableClasses=(side,config=defaults)=>side?[3]:[0,4,5,2];
export const contractClasses=(u,config=defaults)=>availableClasses(u.side,config).filter(id=>!u.elite&&!u.summoned&&contractType(id)===u.type);
const skill=(power,cd,targetRange,radius=0,extra={})=>({power,cd,targetRange,radius,duration:0,cost:1,castTime:.35,levelGrowth:.2,...extra});
export const defaults=clone(base);
defaults.innate=clone(INNATE_DEFAULTS);
export const liveConfig=()=>{const config=clone(defaults);config.innate.enabled=1;return config;};
defaults.world.assistWindow=5;
Object.assign(defaults.world,{attackBots:6,defenseBots:2,attackHpMultiplier:1,defenseHpMultiplier:1,troopHpMultiplier:1,heroHpMultiplier:1,heroHpGrowth:.02,heroAttackGrowth:.015,towerDamageExpRate:.0002,towerBreakXp:2});
Object.assign(defaults.world,{retaliationMemory:3,retaliationLeash:14,heroPriorityDistance:1.5});
defaults.world.skillDesignVersion=5;
Object.assign(defaults.troops.melee,{hp:4000});Object.assign(defaults.troops.ranged,{hp:4000});Object.assign(defaults.troops.siege,{hp:5000});
const baseline=defaults.troops.melee.hp*defaults.troops.melee.attack/defaults.troops.melee.interval;
const stats=[{hp:16000,interval:1.5,range:1.5,speed:2,aggro:5},{hp:8000,interval:1.7,range:6.5,speed:2,aggro:9},{hp:10000,interval:2.8,range:10.5,speed:1.5,aggro:12},{hp:36000,interval:1.5,range:1.5,speed:2,aggro:5},{hp:12000,interval:1.7,range:6.5,speed:2,aggro:9},{hp:14000,interval:1.7,range:6.5,speed:2,aggro:9}];
// Keep the previous attack values. Lower rear HP pays for range and safety;
// it must not be converted back into higher damage by the old HP × DPS formula.
const attackCalibrationHp=[16000,10000,14000,36000,16000,20000];
const spells=[
 [skill(700,5,5,0,{targets:3,scarDuration:8,scarCap:3,utilityPower:100}),skill(600,10,12,0,{pullStopDistance:1.5,scarDuration:8,scarCap:3,utilityPower:200}),skill(0,15,0,0,{duration:6,shieldPower:600,damageReduction:.35}),skill(1800,30,5,0,{targets:5,knockback:2,scarKnockback:1,scarBonus:1/9,stun:.6,utilityPower:600,cost:3})],
 [skill(200,5,10,0,{bounces:3,conductDuration:8}),skill(800,10,19,4,{targets:5,conductDuration:8}),skill(600,15,19,6,{targets:5,pullDistance:2,pullStopDistance:1.5,utilityPower:200}),skill(200,30,19,5,{targets:3,healingReduction:.5,duration:4,debuffDuration:5,cost:3})],
 [skill(0,5,12,0,{duration:5,percentCurrentHp:.016,tickCapPower:200}),skill(600,10,12,4,{knockback:2,utilityPower:200}),skill(500,15,12,0,{duration:4,attackSpeedDown:.4}),skill(800,30,12,5,{shots:3,duration:3,buildingBonus:.25,cost:3})],
 [skill(160,5,4,4,{duration:4,attackDown:.4}),skill(0,10,5,5,{targets:4,duration:3,damageReduction:.6,utilityPower:200}),skill(0,15,0,0,{duration:5,remoteReflect:.8}),skill(60,30,0,4,{targets:5,duration:6,extensionHits:3,extensionSeconds:1,extensionLimit:2,utilityPower:600,cost:3})],
 [skill(800,5,9,0,{targets:3,heatCap:5}),skill(800,10,12,3,{targets:4,heatThreshold:3,splashPower:200}),skill(200,15,9,0,{targets:3,duration:4}),skill(800,30,19,0,{targets:1,heatStep:2,heatCap:5,cost:3})],
 [skill(80,5,9,5,{duration:5,targets:2,healPower:40}),skill(0,10,12,0,{duration:6,damageReduction:.5}),skill(0,15,12,0,{targets:3,duration:5,healingBoost:.4,utilityPower:200}),skill(480,30,12,0,{targets:4,cost:3})]
];
// Design4 values directly use the approved 800% / 1000% per-stamina budget.
defaults.heroes=stats.map((h,id)=>({...h,attack:(id<3?8:24)*baseline*h.interval/attackCalibrationHp[id],armor:0,buildingBonus:id===2?2.5:1,strength:id<3?8:24,skills:spells[id]}));
Object.assign(defaults.tower,{columns:6,hp:150000,attack:154*baseline/150000,spacing:3.6,middleMultiplier:1,rearMultiplier:1});

// Design 5: detailed skill rows take precedence over the older overview.
Object.assign(defaults.world,{attackBots:0,defenseBots:0,botMode:4,stageDuration:3600,stageRequiredLayers:1,stageContribution:100});
defaults.heroes[0].skills=[
 skill(600,5,6.5,0,{duration:4,vulnerability:.25}),
 skill(0,10,6,6,{duration:5,targets:3,damageReduction:.4}),
 skill(0,15,14,0,{duration:4,damageReduction:.5,utilityPower:200}),
 skill(1800,30,12,4,{targets:5,stun:1.5,utilityPower:600,cost:3})
];
defaults.heroes[3].skills=[
 skill(160,5,10,0,{targets:5}),
 skill(120,10,18,3,{targets:5,dashSpeed:12,knockback:5,utilityPower:200,castTime:.7}),
 skill(20,15,0,5,{duration:6,targets:5,damageReduction:.35}),
 skill(600,30,0,4,{duration:15,targets:4,utilityPower:600,cost:3})
];
Object.assign(defaults.heroes[3],{passiveHealRatio:.04,passiveMinionKills:4});
// Fire and elf moved from defense (24) to attack (8); retain their HP/range tradeoff.
for(const id of [4,5]){defaults.heroes[id].attack/=3;defaults.heroes[id].strength=8;}
Object.assign(defaults.heroes[4].skills[0],{heatDuration:15});
Object.assign(defaults.heroes[4].skills[2],{power:800,duration:5});
defaults.heroes.push({hp:11000,attack:8*baseline*1.2/11000,interval:1.2,range:1.5,speed:2.5,aggro:5,armor:0,buildingBonus:1,strength:8,skills:[
 skill(600,5,12,0,{duration:4,attackSpeedDown:.4}),
 skill(0,10,12,0,{duration:5,attackSpeedUp:1,utilityPower:100}),
 skill(0,15,0,0,{duration:6,hpCost:.15,utilityPower:100}),
 skill(40,30,0,3,{duration:6,tick:.5,daggers:4,targets:5,cost:3})
]});
// Ratings now count hero kills separately and give the support class no shield requirement.
defaults.rating.push(clone(defaults.rating[0]));
for(const r of defaults.rating)Object.assign(r,{heroKills:3,survival:60,kills:16});
defaults.ratingWeights[0]={damageTaken:35,heroDamage:35,assists:30};
defaults.ratingWeights[3]={survival:40,kills:40,heroDamage:20};
defaults.ratingWeights[5]={healing:70,assists:30};
defaults.ratingWeights.push({heroDamage:40,heroKills:40,assists:20});

// 职业技能设计5，2026-10-24修订：详细技能正文为实现依据。
Object.assign(defaults.world,{heroKillXp:1,minionKillXp:.25});
Object.assign(defaults.waves,{attackMelee:5,attackRanged:3,attackSiege:2});
defaults.heroes[0].skills[3]=skill(0,30,0,0,{duration:5,shieldDuration:8,conversionRatio:2,cost:3});
defaults.heroes[2].skills=[
 skill(0,5,12,0,{percentMaxHp:.04}),
 skill(600,10,12,0,{duration:4,attackSpeedDown:.4}),
 skill(170,15,12,3,{shots:4,duration:3,targets:3,slowPerStack:.15,slowCap:3,slowDuration:4,utilityPower:80}),
 skill(1800,30,12,4,{targets:5,knockback:2,utilityPower:600,cost:3})
];
Object.assign(defaults.heroes[4].skills[0],{targets:1});
Object.assign(defaults.heroes[4].skills[2],{targets:1,heatOnDeath:2});
defaults.heroes[5].skills=[
 skill(300,5,12,5,{targets:3,healPower:500}),
 skill(0,10,12,0,{duration:6,shareRatio:2}),
 skill(0,15,12,0,{targets:3,hpCost:.1,utilityPower:200}),
 skill(480,30,12,0,{targets:4,cost:3})
];

// Double active-skill output and its utility allowance together. Hero attack,
// basic attacks, passives and fixed control/reduction ratios stay unchanged.
for(const hero of defaults.heroes)for(const s of hero.skills){
 for(const key of ['power','shieldPower','healPower','tickCapPower','utilityPower','splashPower','percentMaxHp','percentCurrentHp','flatDamage','directPower','burnPower'])if(typeof s[key]==='number')s[key]*=2;
}

// Ranged contracts need more immediate damage/healing. Raising base attack
// also raises their shared skill allowance, so multi-target effects aren't clipped.
for(const id of [4,5])defaults.heroes[id].attack*=1.5;

// Lord loses his innate sustain; health pays for asymmetric frontline survival.
defaults.heroes[3].hp=72000;
// 0.5: fixed base skills, attribute growth and level-based trait drafts.
Object.assign(defaults.world,{maxLevel:40,expBase:3,expGrowth:1,expCostMultiplier:1,towerDamageExpRate:.00005});
defaults.heroes[0].skills=[skill(800,5,6.5,0,{targets:1,duration:4,vulnerability:0}),skill(0,10,6,6,{targets:3,damageReduction:.25,duration:5}),skill(0,15,14,0,{damageReduction:.35,duration:4}),skill(0,30,0,4,{duration:5,shieldDuration:8,conversionRatio:1,storeCap:.6,cost:3})];
defaults.heroes[3].skills=[skill(320,5,10,0,{targets:5}),skill(240,10,18,2,{targets:5,dashSpeed:12,knockback:0,castTime:.7}),skill(40,15,0,5,{targets:5,duration:6,burnDuration:4,damageReduction:.35}),skill(180,30,0,4,{targets:4,duration:12,cost:3})];
delete defaults.heroes[3].passiveHealRatio;delete defaults.heroes[3].passiveMinionKills;
defaults.heroes[4].skills=[skill(800,5,9,0,{targets:1,heatCap:5,heatDuration:15}),skill(800,10,12,3,{targets:3,heatThreshold:3,hotPower:1200,splashPower:150}),skill(800,15,9,3,{targets:1,duration:5,heatOnDeath:2}),skill(2000,30,19,0,{targets:1,heatStep:2,heatCap:5,cost:3})];
defaults.heroes[5].skills=[skill(400,5,12,5,{targets:3,healPower:200}),skill(0,10,12,0,{targets:1,duration:6,shareRatio:.5}),skill(0,15,12,0,{targets:3,hpCost:.1}),skill(800,30,12,0,{targets:4,cost:3})];
defaults.heroes[2].skills=[skill(0,5,12,0,{targets:1,percentMaxHp:.01,tickCapPower:150,duration:5}),skill(800,10,12,0,{attackSpeedDown:.25,duration:4}),skill(250,15,12,3,{shots:4,targets:1,duration:3,slowPerStack:.15,slowCap:3,slowDuration:4}),skill(1000,30,12,4,{targets:5,knockback:2,cost:3})];
for(const hero of defaults.heroes)for(const s of hero.skills)s.levelGrowth=0;

// 0.6：新版连携技能，所有费用固定为1/1/2/3，旧的成长只提升属性。
defaults.heroes[0].skills=[
 skill(90,6,6.5,3,{targets:1,duration:4,breakRange:9,drainRatio:1}),
 skill(0,10,6,6,{targets:3,damageReduction:.2,duration:5}),
 skill(0,22,14,0,{damageReduction:.45,duration:6,cost:2}),
 skill(0,42,0,4,{duration:6,shieldDuration:10,conversionRatio:1,storeCap:.75,cost:3})
];
defaults.heroes[3].skills=[
 skill(200,6,10,4,{targets:5,burnBonusPower:220}),
 skill(160,10,18,2,{targets:5,dashSpeed:12,knockback:0,castTime:.7}),
 skill(45,22,0,5,{duration:6,burnDuration:4,targets:5,damageReduction:.35,cost:2}),
 skill(140,42,0,4,{duration:12,targets:4,cost:3})
];
defaults.heroes[4].skills=[
 skill(450,6,9,0,{targets:1,heatCap:6,heatDuration:15}),
 skill(300,10,12,3,{targets:1,duration:6,heatOnDeath:3,heatCost:1}),
 skill(1000,22,12,3,{targets:3,heatThreshold:3,cost:2}),
 skill(1800,42,19,0,{targets:1,heatStep:2,cost:3})
];
defaults.heroes[5].skills=[
 skill(200,6,12,4,{targets:3,healPower:200}),
 skill(0,10,12,0,{duration:8,targets:1,shareRatio:.5}),
 skill(0,22,12,0,{targets:4,hpCost:.08,cost:2}),
 skill(1000,42,12,0,{targets:4,cost:3})
];
defaults.heroes[2].skills=[
 skill(0,6,12,0,{targets:1,percentMaxHp:.008,tickCapPower:120,duration:5}),
 skill(500,10,12,0,{attackSpeedDown:.3,duration:5}),
 skill(700,22,12,4,{targets:4,knockback:2,cost:2}),
 skill(600,42,12,3,{shots:5,targets:1,duration:3.75,slowPerStack:.15,slowCap:3,slowDuration:4,cost:3})
];
for(const id of [0,2,3,4,5])for(const s of defaults.heroes[id].skills){s.levelGrowth=0;s.revision=6;}

export const labels={...baseLabels,heroHpGrowth:'每级英雄生命成长比例',heroAttackGrowth:'每级英雄攻击成长比例',towerDamageExpRate:'每点有效塔伤经验',towerBreakXp:'推倒防御塔经验',columns:'每排防御塔数量',strength:'1级基础强度目标',vulnerability:'受到伤害加深比例',shieldBurstPower:'破盾攻击力系数（%）',pullStopDistance:'勾取后距自身格数',bounces:'额外弹射次数',threshold:'生命比例判断阈值',bonusDamage:'条件额外伤害比例',damageReduction:'伤害降低比例',healingReduction:'受到治疗降低比例',buildingBonus:'对建筑额外伤害比例 / 普攻倍率',percentCurrentHp:'每跳当前生命伤害比例',directPower:'首段直接攻击力系数（%）',burnPower:'燃烧每跳攻击力系数（%）',burnDuration:'燃烧持续秒',extensionHits:'旋风每次延时承伤次数',extensionSeconds:'旋风延长秒',attackDown:'攻击力降低比例',remoteReflect:'远程承伤反弹比例',flatDamage:'每跳固定伤害',percentMaxHp:'每跳最大生命伤害比例',stun:'眩晕秒',healPower:'治疗攻击力系数（%）',cleanseBoost:'成功净化后增攻比例',targets:'最多目标数'};
Object.assign(labels,{revision:'技能规则修订',breakRange:'链接断开距离',drainRatio:'实际伤害治疗转化倍率',burnBonusPower:'灼烧连携额外攻击系数（%）',heatCost:'施法消耗炙热层数'});
Object.assign(labels,{conversionRatio:'累计承伤转化护盾倍率',shareRatio:'链接共享有效治疗倍率'});
Object.assign(labels,{utilityPower:'控制与净化等效攻击系数（%）',shieldPower:'护盾攻击力上限（%）',tickCapPower:'每目标每跳攻击力上限（%）',extensionLimit:'旋风最多延长秒'});
Object.assign(labels,{retaliationMemory:'受击来源记忆秒',retaliationLeash:'反击追踪最远距离格',heroPriorityDistance:'英雄优先的距离容差格',strength:'阵营名义强度预算（含射程安全性）'});
Object.assign(labels,{skillDesignVersion:'技能规则版本',scarDuration:'伤痕持续秒',scarCap:'伤痕层数上限',scarKnockback:'每层伤痕增加击飞格数',scarBonus:'每层伤痕伤害增幅',conductDuration:'导电持续秒',attackSpeedDown:'攻击速度降低比例',shots:'定点炮击次数',heatCap:'炙热层数上限',heatThreshold:'大火球炙热门槛',heatStep:'每增加一目标消耗的炙热层数',splashPower:'溅射总攻击力系数（%）',healingBoost:'受到治疗提升比例',debuffDuration:'命中减益持续秒'});
Object.assign(labels,{heroKillXp:'击杀英雄经验',minionKillXp:'击杀小兵经验',attackSiege:'进攻攻城兵占比',damageTaken:'原始承伤',percentMaxHp:'目标最大生命伤害比例',heatOnDeath:'标记目标阵亡增加炙热层数',hpCost:'当前生命消耗比例',shieldDuration:'转化护盾持续秒',slowPerStack:'每层移动减速比例',slowCap:'移动减速叠层上限',slowDuration:'移动减速持续秒'});
export function validateConfig(x){
 if(x.innate?.elfRadius<=0||x.innate?.elfRadius>30||x.innate?.shareTotals?.[1]!==1||![0,1].includes(x.innate?.enabled)||!Number.isInteger(x.innate.lordMinionKills)||x.innate.lordMinionKills<1||x.innate.shareTotals?.length!==7||x.innate.shareTotals.some(n=>!Number.isFinite(n)||n<0||n>1)||['orcMissingReduction','heatHaste','heatHealPenalty','elfDamageHeal','elfHealDamage','lordKillHeal'].some(k=>!Number.isFinite(x.innate[k])||x.innate[k]<0||x.innate[k]>=1))throw Error('职业被动配置无效');
 if(x.world.maxLevel!==40)throw Error('本版英雄等级上限固定40');
 const walk=(a,b,path='')=>{if(typeof b==='number'){if(typeof a!=='number'||!Number.isFinite(a)||Math.abs(a)>1e7)throw Error(path+' 数值无效');if(a<0&&!['attackSpawnY','defenseLimitY','mapMinY','mapMaxY','defenseRallyOffset'].includes(path.split('.').at(-1)))throw Error(path+' 不能为负数');return;}if(!a||typeof a!=='object'||Array.isArray(a)!==Array.isArray(b))throw Error(path+' 配置结构不完整');for(const k of Object.keys(a))if(!Object.hasOwn(b,k)||k==='__proto__')throw Error(path+'.'+k+' 是未知字段');for(const k of Object.keys(b))walk(a[k],b[k],path+'.'+k);};walk(x,defaults);
 for(const k of ['waveInterval','projectileSpeed','expBase','expGrowth','expCostMultiplier','maxLevel','targetRecheckInterval'])if(x.world[k]<=0)throw Error(k+' 必须大于0');
 if(x.world.retaliationMemory<=0||x.world.retaliationMemory>10||x.world.retaliationLeash<=0||x.world.retaliationLeash>30||x.world.heroPriorityDistance>5)throw Error('受击记忆需0～10秒、反击距离0～30格、英雄距离容差0～5格');
 for(const u of [...Object.values(x.troops),...x.heroes,x.tower])if(u.hp<=0||u.interval<=0)throw Error('生命和攻击间隔必须大于0');
 if(x.world.skillDesignVersion!==5)throw Error('本体验使用职业技能设计5');
 for(const h of x.heroes)for(const s of h.skills){if(s.cd<.1)throw Error('冷却至少0.1秒');for(const k of ['damageReduction','healingReduction','percentCurrentHp','percentMaxHp','hpCost','slowPerStack','attackDown','remoteReflect','attackSpeedDown','healingBoost'])if(s[k]>1)throw Error((labels[k]||k)+' 必须在0～1内');if(s.attackSpeedDown>=1)throw Error('减攻速必须小于100%');if(s.slowPerStack*s.slowCap>=1)throw Error('叠层减速必须小于100%');for(const k of ['targets','bounces','extensionHits','shots','heatCap','heatStep','scarCap','slowCap','heatOnDeath'])if(k in s&&(!Number.isInteger(s[k])||s[k]<1))throw Error(k+' 必须是正整数');}
 if(!Number.isInteger(x.tower.columns)||x.tower.columns<1||x.tower.columns>8)throw Error('每排塔数量为1～8整数');if((x.tower.columns-1)*x.tower.spacing>21)throw Error('防御塔横向布局超出战场');
 for(const n of [x.world.attackBots,x.world.defenseBots,x.world.attackWaveSize,x.world.defenseWaveSize,...Object.values(x.waves)])if(!Number.isInteger(n)||n<0)throw Error('人数与兵数必须为非负整数');if(x.world.attackWaveSize>100||x.world.defenseWaveSize>100)throw Error('单波小兵数量不能超过100');if(x.world.waveInterval!==30)throw Error('小兵固定每30秒出兵');if(x.waves.defenseSiege)throw Error('防守方不生成攻城兵');if(x.world.attackWaveSize>0&&x.waves.attackMelee+x.waves.attackRanged+x.waves.attackSiege===0)throw Error('进攻波次至少保留一种兵种权重');if(x.world.defenseWaveSize>0&&x.waves.defenseMelee+x.waves.defenseRanged===0)throw Error('防守波次至少保留一种兵种权重');if(x.world.attackBots+x.world.defenseBots>99)throw Error('机器人总数最多99');if(!Number.isInteger(x.world.botMode)||x.world.botMode>5)throw Error('机器人人数模式无效');if(x.world.spawnHalfWidth<=0||x.world.spawnHalfWidth>10.5)throw Error('出生横向半宽应在0～10.5');if(x.world.mapMaxY-x.world.mapMinY<40)throw Error('地图过短');
 return x;
}


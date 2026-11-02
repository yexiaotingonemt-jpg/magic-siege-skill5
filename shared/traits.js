import { COMMON_TRAITS, commonId, commonRank } from "./common-traits.js";
import { isCurrentDesign, currentTraits, currentTraitRank, currentSkill, drawCurrentQuality } from './current-design.js';
// Authoritative trait catalogue. Counts are selection caps, never lottery weights.
export const RARITIES = {
  blue: { name: "蓝色", color: "#78bdff" },
  purple: { name: "紫色", color: "#c79aff" },
  gold: { name: "金色", color: "#f4ce77" },
};
const groups = {
  3: [
    "L",
    [
      ["震荡增幅", "伤害加成每次+15%。"],
      ["扩展震荡", "目标上限每次+1。"],
      ["迟滞震荡", "命中降低15%移速/次，3秒。"],
      ["回响震荡", "震荡返回，造成首段60%伤害，并牵引2格。"],
      ["冲锋增幅", "伤害加成每次+15%。"],
      ["冲锋横扫", "命中上限每次+1。"],
      [
        "灼焰冲锋",
        "冲锋命中附加4秒灼烧，每秒30%攻击/次；同源灼烧不叠加，取较强者。",
      ],
      ["终点聚拢", "沿途可位移目标被带至冲锋终点。"],
      ["持久壁垒", "火盾及减伤每次延长1秒。"],
      ["蔓延火盾", "每次扫描目标上限+1。"],
      ["衰弱烈焰", "灼烧降低目标攻击10%/次。"],
      ["余烬传播", "灼烧目标死亡向3格内1人传播，派生不再传播。"],
      ["延续君临", "大招持续时间每次+1秒。"],
      ["君临护盾", "开大获得最大生命2.5%护盾/次，8秒。"],
      [
        "鲜血君临",
        "大招期间技能实际伤害吸血6%/次；持续和群体派生伤害按一半转化，普攻、溅射和召唤伤害不吸血。",
      ],
      ["亡灵护卫", "大招击杀召唤10秒护卫，最多6名，不递归召唤。"],
      ["征服恢复", "击杀1英雄或累计4小兵，恢复最大生命0.5%/次。"],
      ["坚忍", "每实际承伤达最大生命20%，获得3%减伤/次，3秒，冷却3秒。"],
    ],
  ],
  0: [
    "O",
    [
      ["汲血增幅", "汲血每跳伤害加成+15%/次，治疗由实际伤害转化。"],
      ["破甲印记", "命中附加5%易伤/次，4秒。"],
      ["持久汲血", "链接持续时间增加1秒/次。"],
      [
        "群体汲血",
        "额外链接主目标周围3格最多2人；额外目标伤害与治疗各为主目标35%。",
      ],
      ["坚定战吼", "减伤每次+3个百分点。"],
      ["集结战吼", "受保护的其他友方每次+1。"],
      ["振奋战吼", "受保护对象攻速+12%/次。"],
      ["荆棘战吼", "实际承伤20%反弹，不递归反伤。"],
      ["坚守救援", "自身减伤时间每次+1秒。"],
      ["援护恢复", "被救者恢复200%攻击生命/次。"],
      ["落地冲击", "落点3格内最多3人受250%攻击伤害/次。"],
      ["守护嘲讽", "落点3格内最多5人被嘲讽2秒。"],
      ["先遣护盾", "蓄伤开始获得最大生命5%护盾/次。"],
      ["同袍蓄伤", "附近4名友方实际承伤10%/次也计入记录，总记录仍限生命75%。"],
      ["蓄伤爆发", "结束对4格内最多5人各造成记录值10%/次伤害，同时结算护盾。"],
      ["不屈", "蓄伤6秒内生命最低为1；挡掉伤害不计入蓄伤。"],
      ["战意净化", "承伤净化阈值依次为生命40/35/30/25/20%，冷却3秒。"],
      ["背水之战", "每缺失10%生命，攻击+2点/次，最多9档，随回血变化。"],
    ],
  ],
  4: [
    "F",
    [
      ["烈焰增幅", "伤害加成每次+15%。"],
      ["虚弱烈焰", "命中使目标攻击降低5%/次，持续4秒。"],
      ["弹射火焰", "额外弹射1人/次，各承受主伤35%。"],
      ["烈焰爆破", "本技能直接击杀时爆炸，3格内最多3人各受200%攻击，不递归。"],
      ["火球增幅", "技能伤害加成每次+15%。"],
      [
        "孤立烈焰",
        "大火球释放时仅有1个落点目标（贯穿看整条路径），伤害加成每次+25%。",
      ],
      ["冲击火球", "火球命中使可位移目标击退0.6格/次。"],
      [
        "贯穿烈日",
        "巨球沿方向慢行；炙热选定的最多3名目标首次100%、其他目标首次25%，每人后续两跳各为首次15%。",
      ],
      ["烙印增幅", "伤害加成每次+15%。"],
      ["焚魂易伤", "标记附加5%易伤/次，6秒。"],
      [
        "连锁烙印",
        "额外标记1人/次，额外目标的伤害及死亡爆炸按主目标45%，死亡仍提供3热量，遵守炙热上限。",
      ],
      [
        "焚魂爆破",
        "主标记死亡爆炸200%攻击，额外标记90%；3格最多3人，不附加新标记。",
      ],
      ["天火增幅", "伤害加成每次+15%。"],
      [
        "分流天火",
        "初始目标上限+1/次；新增目标承受主伤35%，热量目标保持完整伤害。",
      ],
      ["余热回收", "天火每击杀1人返还1层炙热/次。"],
      ["天火斩杀", "结算后斩杀生命不高于12%的非建筑目标，不穿透不死。"],
      ["炙热容器", "热量上限+1、保持时间+2秒/次。"],
      ["炙热之力", "每实际获得或消耗1层热量，攻击+2点/次，5秒，最多10层。"],
    ],
  ],
  5: [
    "E",
    [
      ["灵息增幅", "技能面板治疗与由其派生的伤害提高15%/次。"],
      ["普照灵息", "伤害目标上限+1/次。"],
      ["自然易伤", "伤害目标受到伤害+10%/次，4秒。"],
      [
        "双生灵息",
        "额外治疗主目标周围生命比例最低的1名其他友军，治疗量60%，不派生额外伤害。",
      ],
      ["共生守护", "被链接友军减伤+3%/次。"],
      ["共生枝蔓", "链接对象+1/次，首条共享50%，额外链接各共享25%，不递归。"],
      ["共生疾风", "被链接友军攻速+12%/次。"],
      [
        "共生分担",
        "存活且在12格内的链接组成员平摊原始伤害；各自结算一次减伤，分摊不递归。",
      ],
      ["净化延展", "净化范围+1格/次。"],
      ["群体净化", "净化目标上限+1/次。"],
      ["净化赐福", "每移除一种负面，攻击+2%/次，最多5层，8秒。"],
      ["生命祝福", "成功净化者受疗+20%，8秒。"],
      ["群疗增幅", "治疗量加成+15%/次。"],
      ["广域群疗", "其他伤害目标上限+1/次。"],
      ["盈溢护盾", "过量治疗30%/次转盾，8秒，盾不超过目标生命25%。"],
      [
        "生命反击",
        "有效治疗40%转为周围3格最多3敌人的伤害，同一敌人最多受3圈。",
      ],
      [
        "灵息反击",
        "每累计2000%攻击的直接有效治疗，反击100%攻击/次，每次技能最多3次；仅未满阈值进度跨次保留，超限或无敌人时不缓存完整触发。",
      ],
      ["绝境生机", "每缺失10%生命，攻击+2点/次，最多9档，随回血变化。"],
    ],
  ],
  2: [
    "C",
    [
      ["腐蚀强化", "每跳生命比例+0.2个百分点，攻击上限相对基础+25%/次。"],
      ["持久腐蚀", "持续时间和跳数每次+1。"],
      ["扩散腐蚀", "额外腐蚀1人/次，额外目标每跳为主目标35%。"],
      ["顽固腐蚀", "腐蚀不可净化，负面免疫仍阻止附加和跳伤。"],
      ["冰弹增幅", "伤害加成+15%/次。"],
      ["深寒冰弹", "减攻速每次+5个百分点。"],
      ["装填加速", "命中后自身攻速+15%/次，8秒。"],
      ["碎冰爆裂", "周围3格最多3人各受主伤25%，不附加减攻速。"],
      ["炮击增幅", "伤害加成+15%/次。"],
      ["持续炮击", "炮数+1/次，间隔0.75秒，引导相应延长。"],
      ["递增炮击", "每炮命中后，下一炮倍率增加12%/次，同次引导相加。"],
      ["范围连轰", "每炮最多3人，主目标全额，其他目标各35%。"],
      ["震荡增幅", "伤害加成+15%/次。"],
      ["强力震荡", "击退距离+0.4格/次。"],
      ["位移破坏", "每实际击退1格，追加60%攻击伤害/次。"],
      ["二次爆破", "主目标击退后的落点0.5秒后爆炸1次，最多4人各受400%攻击。"],
      ["攻城专精", "对建筑普攻和技能伤害+10%/次。"],
      [
        "精密瞄具",
        "普攻射程+0.04格/次；叠满通用射程后为10.9格，仍低于标准防御塔射程。",
      ],
    ],
  ],
};
export const TRAITS = Object.entries(groups).flatMap(
  ([classId, [prefix, rows]]) =>
    rows.map(([name, description], i) => ({
      id: prefix + String(i + 1).padStart(2, "0"),
      classId: Number(classId),
      skill:
        i < 16
          ? Number(classId) === 2 && i >= 8
            ? i < 12
              ? 3
              : 2
            : Number(classId) === 4 && i >= 4 && i < 12
              ? i < 8
                ? 2
                : 1
              : Math.floor(i / 4)
          : null,
      rarity: i >= 16 || i % 4 < 2 ? "blue" : i % 4 === 2 ? "purple" : "gold",
      max: i >= 16 ? 5 : [4, 3, 2, 1][i % 4],
      name,
      description,
    })),
);
for (const classId of [0, 2, 3, 4, 5])
  COMMON_TRAITS.forEach(([name, rarity, max, description], index) =>
    TRAITS.push({
      id: commonId(classId, index + 1),
      classId,
      skill: null,
      rarity,
      max,
      name,
      description,
      common: true,
    }),
  );
export const TRAIT_BY_ID = Object.fromEntries(TRAITS.map((t) => [t.id, t]));
export const traitRank = (p, id) =>
  id?.startsWith('N') ? currentTraitRank(p,id) : p?.progress?.[TRAIT_BY_ID[id]?.classId]?.traits?.[id] || 0;
export const rarityAt = (level) =>
  level % 10 === 0 ? "gold" : level % 5 === 0 ? "purple" : "blue";
export const skillRanks = (level) => [1, 1, 1, level >= 5 ? 1 : 0];
export function traitCandidates(progress, classId, rarity, level) {
  return TRAITS.filter(
    (t) =>
      t.classId === classId &&
      t.rarity === rarity &&
      (t.skill !== 3 || level >= 5) &&
      (progress.traits?.[t.id] || 0) < t.max,
  );
}
export function prepareChoice(sim, p, classId = p.classId) {
  const progress = p.progress[classId],
    choice = progress.choices?.[0];
  if (!choice || choice.options) return choice;
  if (isCurrentDesign(sim.config)) {
    const catalogue=currentTraits(sim.config,classId), available=catalogue.filter(t=>(progress.traits[t.id]||0)<t.max);
    if (!available.some(t=>t.rarity===choice.rarity)) choice.rarity=drawCurrentQuality(sim,progress,classId);
    const pool=available.filter(t=>t.rarity===choice.rarity).map(t=>t.id);
    for(let j=pool.length-1;j>0;j--){const k=Math.floor(sim.random()*(j+1));[pool[j],pool[k]]=[pool[k],pool[j]];}
    choice.options=pool.slice(0,3);return choice;
  }
  const pool = traitCandidates(
    progress,
    classId,
    choice.rarity,
    choice.level,
  ).map((t) => t.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(sim.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  choice.options = pool.slice(0, 3);
  return choice;
}
export function chooseTrait(sim, p, id, level, classId = p.classId) {
  const progress = p.progress[classId],
    choice = prepareChoice(sim, p, classId),
    t = isCurrentDesign(sim.config) ? currentTraits(sim.config,classId).find(t=>t.id===id) : TRAIT_BY_ID[id];
  if (
    !choice ||
    choice.level !== level ||
    !choice.options.includes(id) ||
    !t ||
    t.classId !== classId ||
    (progress.traits[id] || 0) >= t.max
  )
    return sim.fail(p, "词条选择已变化，请选择当前候选");
  progress.traits[id] = (progress.traits[id] || 0) + 1;
  progress.choices.shift();
  prepareChoice(sim, p, classId);
  sim.log(p.name + " 获得「" + t.name + "」");
  return true;
}
export function traitSkill(sim, h, i) {
  if(isCurrentDesign(sim.config))return currentSkill(sim,h,i);
  const s = { ...sim.config.heroes[h.classId].skills[i] },
    p = sim.players[h.playerId],
    r = (id) => traitRank(p, id),
    prefix = groups[h.classId]?.[0];
  if (!prefix) return s;
  const rank = (n) => r(prefix + String(n).padStart(2, "0")),
    n =
      (h.classId === 2 && i >= 2
        ? i === 2
          ? 3
          : 2
        : h.classId === 4 && (i === 1 || i === 2)
          ? i === 1
            ? 2
            : 1
          : i) * 4;
  s.ranks = Object.fromEntries(
    TRAITS.filter((t) => t.classId === h.classId).map((t) => [t.id, r(t.id)]),
  );
  s.traits = Array.from({ length: 4 }, (_, j) => rank(n + j + 1));
  s.skill = i;
  s.bonusDamage =
    (s.power ? rank(n + 1) * 0.15 : 0) +
    (h.eliteBuffs?.arcane > sim.time ? 0.1 : 0);
  if (h.classId === 3) {
    if (i >= 2) s.bonusDamage = h.eliteBuffs?.arcane > sim.time ? 0.1 : 0;
    if (i < 2) s.targets += rank(n + 2);

    if (i === 2) {
      s.duration += r("L09");
      s.targets += r("L10");
    }
    if (i === 3) s.duration += r("L13");
  }
  if (h.classId === 0) {
    if (i === 1) {
      s.damageReduction += r("O05") * 0.03;
      s.targets += r("O06");
    }
    if (i === 2) s.duration += r("O09");
    if (i === 0) {
      s.duration += r("O03");
      if (r("O04")) s.targets = 3;
    }
  }
  if (h.classId === 4) {
    if (i === 1) s.targets += r("F11");
    if (i === 3) s.targets += r("F14");
  }
  if (h.classId === 5) {
    if (i === 0) s.targets += r("E02");
    if (i === 1) s.targets = 1 + r("E06");
    if (i === 2) {
      s.targetRange += r("E09");
      s.targets += r("E10");
    }
    if (i === 3) {
      s.targets += r("E14");
      s.power *= 1 + r("E13") * 0.15;
      s.bonusDamage = 0;
    }
    if (i === 0)
      s.bonusDamage =
        r("E01") * 0.15 + (h.eliteBuffs?.arcane > sim.time ? 0.1 : 0);
  }
  if (h.classId === 2) {
    if (i === 0) {
      s.percentMaxHp += r("C01") * 0.002;
      s.tickCapPower *= 1 + r("C01") * 0.25;
      s.duration += r("C02");
      s.targets += r("C03");
    }
    if (i === 1) s.attackSpeedDown += r("C06") * 0.05;
    if (i === 3) {
      s.shots += r("C10");
      s.duration = s.shots * 0.75;
      s.targets = r("C12") ? 3 : 1;
    }
    if (i === 2) s.knockback += r("C14") * 0.4;
  }
  s.cd *= 1 - 0.03 * commonRank(sim, h, 5);
  return s;
}

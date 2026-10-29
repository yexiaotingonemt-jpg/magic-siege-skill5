import { classes, names } from "../../shared/config.js";
import {
  TRAITS,
  RARITIES,
  traitRank,
  traitSkill,
} from "../../shared/traits.js";
import { abilityTagsHTML } from "./ability-tags.js";
const f = (n) => String(Number(Number(n || 0).toFixed(2))),
  pct = (n) => f(n * 100) + "%";
export function describeAbilities(sim) {
  const p = sim.player,
    id = p.classId,
    c = sim.config.heroes[id],
    h = sim.hero() || {
      classId: id,
      playerId: p.id,
      hp: c.hp,
      maxHp: c.hp,
      attack: c.attack,
    },
    A = sim.attackPower(h),
    r = (t) => traitRank(p, t);
  const roles = {
    0: "前排守护：单体重击、群体减伤、换位救援，蓄伤转盾。基础重击不附带易伤。",
    2: "后排攻城：腐蚀持续伤害、冰霜减攻速、定点炮击引导和震荡击退。",
    3: "王庭领主：群体压制、冲锋突进、火盾减伤与君临溅射；无固有能量和击杀恢复天赋。",
    4: "火焰法师：积累炙热强化火球，再以天火收割。",
    5: "森林精灵：治疗、共生与净化。支援优先选中友方；选中敌方时改为该敌人当前攻击的友方，无有效选择时寻找合法的最低绝对血量友方。",
  };
  const skills = c.skills.map((base, i) => {
    const s = traitSkill(sim, h, i),
      P = f(s.power * (1 + (s.bonusDamage || 0))),
      R = f(s.targetRange),
      D = f(s.duration);
    let summaries = [],
      tags = [];
    if (id === 0) {
      summaries = [
        r("O04")
          ? "向目标方向扇形重击，最多5人；主目标" + P + "%攻击，其他目标各30%。"
          : "对选中的单体造成" + P + "%攻击伤害。",
        "自身及" +
          s.targets +
          "名其他友方减伤" +
          pct(s.damageReduction) +
          "，持续" +
          D +
          "秒。",
        "与正被敌方英雄攻击的友方换位，自身减伤" +
          pct(s.damageReduction) +
          "，持续" +
          D +
          "秒。",
        "蓄伤5秒，记录自身实际承伤，最多为最大生命60%；结束全额转为8秒护盾。",
      ];
      tags = [
        ["单体", "输出"],
        ["群体", "减伤"],
        ["换位", "救援"],
        ["蓄伤", "护盾"],
      ];
    }
    if (id === 2) {
      summaries = [
        "腐蚀" +
          D +
          "秒，每秒伤害=min(目标最大生命" +
          pct(s.percentMaxHp) +
          "，" +
          f(s.tickCapPower) +
          "%施法攻击)。" +
          (r("C03") ? "额外" + r("C03") + "人每跳承受35%。" : "") +
          (r("C04") ? "不可净化，免疫期间暂停跳伤。" : "可以净化。"),
        "对选中目标造成" +
          P +
          "%攻击伤害，攻速降低" +
          pct(s.attackSpeedDown) +
          "，持续4秒。",
        "锁定落点引导" +
          D +
          "秒，共" +
          s.shots +
          "炮，每炮主目标" +
          P +
          "%攻击" +
          (r("C12") ? "，其他最多2人各35%" : "，基础仅命中1人") +
          "；减速每层15%，最多3层。",
        "落点4格最多" +
          s.targets +
          "人，各受" +
          P +
          "%攻击伤害，并击退" +
          s.knockback +
          "格。",
      ];
      tags = [
        ["持续伤害", "腐蚀"],
        ["单体", "减攻速"],
        ["引导", "固定落点"],
        ["范围", "击退"],
      ];
    }
    if (id === 3) {
      summaries = [
        "前方10格扇形最多" + s.targets + "人，各受" + P + "%攻击伤害。",
        "预警0.7秒，冲向" +
          R +
          "格内的选中目标；路径半径" +
          s.radius +
          "格，最多" +
          s.targets +
          "人各受" +
          P +
          "%攻击伤害，基础不击退。",
        "火盾持续" +
          D +
          "秒，自身减伤35%；5格内每次最多" +
          s.targets +
          "人获得4秒灼烧，每秒40%攻击。",
        "负面免疫" +
          D +
          "秒；每次普攻对目标周围4格最多4名其他敌人，各附加" +
          P +
          "%攻击伤害。",
      ];
      tags = [
        ["扇形", "群伤"],
        ["预警", "突进"],
        ["减伤", "灼烧"],
        ["负面免疫", "普攻溅射"],
      ];
    }
    if (id === 4) {
      summaries = [
        "对选中目标造成" + P + "%攻击伤害，获得1层炙热。",
        "普通火球" +
          P +
          "%攻击；达到" +
          s.heatThreshold +
          "层热量时主伤" +
          f(s.hotPower * (1 + s.bonusDamage)) +
          "%，周围最多3人各受" +
          f(s.splashPower * (1 + s.bonusDamage)) +
          "%。",
        "主目标" +
          P +
          "%攻击，标记5秒；目标阵亡为存活施法者提供2热量。" +
          (r("F11") ? "额外" + r("F11") + "人承受主伤30%，同样附加标记。" : ""),
        "消耗施放时热量，每2层增加1个全额目标，每人" +
          P +
          "%攻击；" +
          (r("F14")
            ? "另有" + r("F14") + "个分流名额，各承受15%。"
            : "基础1个全额目标。"),
      ];
      tags = [
        ["单体", "炙热"],
        ["爆发", "溅射"],
        ["死亡标记", "炙热"],
        ["收割", "消耗炙热"],
      ];
    }
    if (id === 5) {
      summaries = [
        "对选中敌人造成" +
          P +
          "%攻击伤害，治疗其周围最多" +
          s.targets +
          "名友方，每人200%攻击。",
        "链接最多" +
          s.targets +
          "名友方6秒；首条共享50%，额外链接各25%，共享不再传播。",
        "消耗当前生命10%，净化" +
          R +
          "格内最多" +
          s.targets +
          "名有可净化负面的友方，至少保留1生命。",
        "自身和最多" +
          s.targets +
          "名其他友方，各恢复" +
          P +
          "%攻击生命。" +
          (r("E15")
            ? "允许满血释放，过量" + pct(r("E15") * 0.3) + "转为8秒护盾。"
            : "全员满血时不可释放。"),
      ];
      tags = [
        ["输出", "治疗"],
        ["链接", "共享治疗"],
        ["净化", "耗生命"],
        ["群体", "治疗"],
      ];
    }
    const owned = TRAITS.filter(
      (t) => t.classId === id && t.skill === i && r(t.id),
    );
    const details = owned
      .map((t) => t.name + " " + r(t.id) + "/" + t.max + "：" + t.description)
      .join(" ");
    return {
      name: names[id][i],
      level: 1,
      learned: i < 3 || p.level >= 5,
      summary: summaries[i] || "",
      tags: (tags[i] || []).map((text) => ({
        text,
        tone: /治疗/.test(text)
          ? "healing"
          : /护盾|减伤|免疫/.test(text)
            ? "protection"
            : "support",
      })),
      effect:
        (summaries[i] || "") +
        " " +
        details +
        " 选中目标超出技能范围时拒绝释放，不消耗体力。",
      valueCap: "按目标、跳数及各技能明示规则结算",
      compactMeta:
        "冷却" + s.cd + "秒 · " + s.cost + "体力 · 施法" + s.castTime + "秒",
      meta: "英雄" + (i === 3 ? 5 : 1) + "级自动解锁；施法攻击 " + f(A) + "。",
    };
  });
  return {
    name: classes[id],
    passive: roles[id],
    passiveSummary: roles[id],
    skills,
    owned: TRAITS.filter((t) => t.classId === id && r(t.id)).map((t) => ({
      ...t,
      rank: r(t.id),
    })),
    context:
      "英雄每级获得生命和攻击成长及1次词条选择。5/15/25/35级紫色，10/20/30/40级金色，替代当次蓝色；不存在技能点或统一收益截断。",
  };
}
export function abilityGuideHTML(g) {
  return (
    '<article class="ability-entry"><h3>职业定位</h3><p>' +
    g.passiveSummary +
    "</p></article>" +
    g.skills
      .map(
        (s, i) =>
          '<article class="ability-entry" data-skill-detail="' +
          i +
          '"><h3>' +
          s.name +
          "<small>" +
          (s.learned ? "已解锁" : "5级解锁") +
          "</small></h3>" +
          abilityTagsHTML(s.tags) +
          '<p class="ability-brief">' +
          s.summary +
          '</p><small class="ability-meta">' +
          s.compactMeta +
          '</small><details data-ability-detail="' +
          i +
          '"><summary>查看详情</summary><p>' +
          s.effect +
          "</p><small>" +
          s.meta +
          "</small><p>" +
          g.context +
          "</p></details></article>",
      )
      .join("") +
    '<article class="ability-entry"><h3>已选强化 · ' +
    g.owned.reduce((n, t) => n + t.rank, 0) +
    '次</h3><div class="owned-traits">' +
    (g.owned
      .map(
        (t) =>
          '<p style="--trait-color:' +
          RARITIES[t.rarity].color +
          '">' +
          t.name +
          " " +
          t.rank +
          "/" +
          t.max +
          "<small>" +
          t.description +
          "</small></p>",
      )
      .join("") || "<p>升级后选择强化，逐步建立构筑。</p>") +
    "</div></article>"
  );
}

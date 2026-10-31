import { classes, names } from "../../shared/config.js";
import { isCurrentDesign } from '../../shared/current-design.js';
import { describeCurrentAbilities } from './current-design-descriptions.js';
import {
  TRAITS,
  traitRank,
  traitSkill,
} from "../../shared/traits.js";
import { abilityTagsHTML } from "./ability-tags.js";
const f = (n) => String(Number(Number(n || 0).toFixed(2))),
  pct = (n) => f(n * 100) + "%";
export function describeAbilities(sim) {
  if(isCurrentDesign(sim.config))return describeCurrentAbilities(sim);
  const p = sim.player,
    id = p.classId,
    c = sim.config.heroes[id];
  const h = sim.hero() || {
    classId: id,
    playerId: p.id,
    hp: c.hp,
    maxHp: c.hp,
    attack: c.attack,
  };
  const r = (t) => traitRank(p, t),
    A = sim.attackPower(h);
  const roles = {
    0: "前排守护：汲血维持生命、战吼保护友军、换位接敌，承伤后形成护盾。",
    2: "后排攻城：腐蚀使冰霜弹减攻速，震荡控制站位，再以定点连轰爆发。",
    3: "王庭领主：冲锋进场、火盾灼烧，震荡对灼烧目标追加伤害，君临提供负面免疫与普攻溅射；没有固有天赋。",
    4: "火焰法师：冲击积累炙热，烙印收割回收资源，炙热强化火球，再以天火终结。",
    5: "森林精灵：选择友军治疗并伤害附近敌人，链接共享有效治疗，净化和群疗保护团队。支援优先选中友方，选中敌方时改为该敌人当前攻击的友方；目标无效时提示，不能释放。",
  };
  const skills = c.skills.map((base, i) => {
    const s = traitSkill(sim, h, i),
      P = f(s.power * (1 + (s.bonusDamage || 0))),
      D = f(s.duration),
      R = f(s.targetRange);
    let summaries = [],
      tags = [];
    if (id === 0) {
      summaries = [
        `链接主目标${D}秒，每秒造成${P}%施法攻击伤害，并按实际伤害治疗自己。超过${s.breakRange}格、被净化或施法者阵亡会断开；非引导，可同时使用其他技能。` +
          (r("O04") ? "额外链接最多2人，各为主目标35%。" : ""),
        `自身及${s.targets}名其他友方减伤${pct(s.damageReduction)}，持续${D}秒。`,
        `与选中友方交换位置，自身减伤${pct(s.damageReduction)}，持续${D}秒；不要求友方正被攻击。`,
        `蓄伤${D}秒，累计实际生命与护盾承伤，最多最大生命${pct(s.storeCap)}；结束全额转为${s.shieldDuration}秒护盾，未实际承受的不死伤害不计入。`,
      ];
      tags = [
        ["链接", "吸血"],
        ["群体", "减伤"],
        ["换位", "救援"],
        ["蓄伤", "护盾"],
      ];
    }
    if (id === 2) {
      summaries = [
        `腐蚀${D}秒，每秒伤害=min(目标最大生命${pct(s.percentMaxHp)}，${f(s.tickCapPower)}%施法攻击)。` +
          (r("C03") ? `额外${r("C03")}人承受35%。` : "") +
          (r("C04") ? "不可净化，负面免疫仍阻止附加和跳伤。" : "可以净化。"),
        `对选中目标造成${P}%攻击伤害；命中时目标存在腐蚀，才附加${D}秒${pct(s.attackSpeedDown)}减攻速。`,
        `落点${s.radius}格最多${s.targets}人，各受${P}%攻击伤害，并击退${s.knockback}格。建筑不位移。`,
        `固定落点引导${D}秒，共${s.shots}炮，每炮主目标${P}%攻击` +
          (r("C12") ? "，其他最多2人各35%" : "，基础仅命中1人") +
          `；每炮叠加${pct(s.slowPerStack)}减速，最多${s.slowCap}层。离开落点可躲避。`,
      ];
      tags = [
        ["持续伤害", "腐蚀"],
        ["连携", "减攻速"],
        ["范围", "击退"],
        ["引导", "固定落点"],
      ];
    }
    if (id === 3) {
      summaries = [
        `向选中目标方向释放扇形震荡，对目标及其周围4格内最多${s.targets}人，各受${P}%攻击伤害；命中自身施加的灼烧额外造成${f(s.burnBonusPower * (1 + s.bonusDamage))}%攻击伤害。一次施法每人最多触发一次额外伤害，不清除灼烧，返回波不重复触发。`,
        `预警${s.castTime}秒，冲向${R}格内选中目标；路径半径${s.radius}格，最多${s.targets}人各受${P}%攻击伤害，基础不击退。` +
          (r("L07") ? `命中附加4秒灼烧，每秒${30 * r("L07")}%攻击。` : ""),
        `火盾${D}秒，自身减伤${pct(s.damageReduction)}；${s.radius}格内每次最多${s.targets}人获得${s.burnDuration}秒灼烧，每秒${P}%攻击。刷新不叠层、不推迟跳伤。`,
        `解除负面并免疫新负面${D}秒；普攻对主目标周围${s.radius}格最多${s.targets}名其他敌人各造成${P}%攻击溅射。`,
      ];
      tags = [
        ["扇形", "灼烧连携"],
        ["预警", "突进"],
        ["减伤", "灼烧"],
        ["负面免疫", "普攻溅射"],
      ];
    }
    if (id === 4) {
      summaries = [
        `对选中目标造成${P}%攻击伤害，获得1层炙热；上限${c.skills[0].heatCap + r("F17")}层，保持${c.skills[0].heatDuration + 2 * r("F17")}秒。`,
        `施法消耗1层炙热，对主目标造成${P}%攻击伤害并标记${D}秒；每个标记目标死亡返还3层，不能超过炙热上限。` +
          (r("F11") ? `额外${r("F11")}个目标伤害为45%，同样标记。` : ""),
        `对选中目标造成${P}%攻击伤害；施法时至少${s.heatThreshold}层炙热，额外向附近2个不同目标各释放一颗等额火球，不消耗炙热。` +
          (r("F08")
            ? "改为一颗巨型贯穿火球，炙热选定目标首次全额、其他25%，最多5人各3跳，后两跳各为首次15%。"
            : ""),
        `消耗施法时全部炙热，主目标优先选中目标，其余优先低生命敌人；每${s.heatStep}层增加1个全额目标，各受${P}%攻击伤害。` +
          (r("F14") ? `另有${r("F14")}个蓝色额外名额，各承受35%。` : ""),
      ];
      tags = [
        ["单体", "炙热"],
        ["死亡标记", "消耗炙热"],
        ["群体", "炙热连携"],
        ["收割", "消耗炙热"],
      ];
    }
    if (id === 5) {
      const heal = f(s.healPower * (1 + s.bonusDamage));
      summaries = [
        `为选中友军恢复${heal}%施法攻击生命，对其周围${s.radius}格最近${s.targets}名敌人各造成等量面板伤害；受疗加成和过量不改变伤害。` +
          (r("E04")
            ? "额外治疗附近生命比例最低的1名友军，治疗量60%，不再产生伤害。"
            : ""),
        `链接最多${s.targets}名友军${D}秒，首条共享50%有效治疗，额外各25%，不递归；超过${R}格、任一端阵亡即断开。` +
          (r("E08") ? "链接组平摊原始伤害，各自仅结算一次减伤。" : ""),
        `消耗当前生命${pct(s.hpCost)}，净化${R}格内最多${s.targets}名有可净化负面的友方，至少保留1生命。`,
        `自身和最多${s.targets}名其他友方，各恢复${P}%攻击生命。` +
          (r("E15")
            ? `允许满血释放，过量${pct(r("E15") * 0.3)}转为8秒护盾，最多目标生命25%。`
            : "全员满血时不可释放。"),
      ];
      tags = [
        ["治疗", "范围伤害"],
        ["链接", "共享治疗"],
        ["净化", "耗生命"],
        ["群体", "治疗"],
      ];
    }
    const owned = TRAITS.filter(
      (t) => t.classId === id && t.skill === i && r(t.id),
    );
    const details = owned
      .map((t) => `${t.name} ${r(t.id)}/${t.max}：${t.description}`)
      .join(" ");
    return {
      name: names[id][i],
      level: 1,
      learned: i < 3 || p.level >= 5,
      upgrades: TRAITS.filter(t => t.classId === id && t.skill === i).map(t => ({...t, rank: r(t.id)})),
      summary: summaries[i] || "",
      tags: (tags[i] || []).map((text) => ({
        text,
        tone: /治疗|吸血/.test(text)
          ? "healing"
          : /护盾|减伤|免疫/.test(text)
            ? "protection"
            : "support",
      })),
      effect:
        (summaries[i] || "") +
        " " +
        details +
        " 主目标超出技能范围时拒绝释放，不消耗体力。",
      valueCap: "按目标、跳数及各技能明示规则结算",
      compactMeta: `冷却${f(s.cd)}秒 · ${s.cost}体力 · 施法${s.castTime}秒`,
      meta: `英雄${i === 3 ? 5 : 1}级自动解锁；施法攻击 ${f(A)}。`,
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
    generalEffects: TRAITS.filter(t => t.classId === id && t.skill == null).map(t => ({...t, rank: r(t.id)})),
    stats: [
      ['生命值', `${f(h.hp)} / ${f(h.maxHp)}`],
      ['攻击力', f(A)],
      ['护甲', f(h.armor)],
      ['普攻间隔', `${f((h.interval || c.interval) / sim.attackRate(h))} 秒`],
      ['普攻距离', `${f(h.range ?? c.range)} 格`],
      ['警戒范围', `${f(h.aggro ?? c.aggro ?? h.range ?? c.range)} 格`],
      ['移动速度', `${f((h.speed ?? c.speed) * Math.min(h.slowUntil > sim.time ? h.slowRatio : 1, 1 - Math.max(0, ...sim.activeDebuffs(h, 'moveSlow').map(d => d.ratio))))} 格/秒`],
    ],
    context:
      "英雄升级获得属性和一次强化选择；5/15/25/35级紫色，10/20/30/40级金色，替代当次蓝色。各职业29类强化；不存在技能点或统一收益截断。",
  };
}
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function upgradeEffectsHTML(traits) {
  return '<div class="upgrade-effects">' + traits.map(t =>
    '<div class="upgrade-effect ' + (t.rank ? 'is-active' : 'is-inactive') + '" data-upgrade-id="' + t.id + '" data-active="' + !!t.rank + '">' +
    '<div class="upgrade-effect-heading"><strong>' + escapeHTML(t.name) + '</strong><span>' + (t.rank ? '已获得 ' : '未激活 ') + t.rank + '/' + t.max + '</span></div>' +
    '<p>' + escapeHTML(t.description) + '</p></div>'
  ).join('') + '</div>';
}
export function abilityGuideHTML(g) {
  const skills = g.skills.map((s, i) =>
    '<article class="ability-entry" data-ability-view="skills" data-skill-detail="' + i + '"><h3>' + s.name + '<small>' + (s.learned ? '已解锁' : '5级解锁') + '</small></h3>' +
    abilityTagsHTML(s.tags) + '<p class="ability-brief">' + s.summary + '</p><small class="ability-meta">' + s.compactMeta + '</small>' +
    '<h4>升级效果 <small>白色已获得 · 灰色未激活</small></h4>' + upgradeEffectsHTML(s.upgrades) + '</article>'
  ).join('');
  const stats = '<article class="ability-entry" data-ability-view="stats" hidden><h3>基础属性</h3><small class="ability-meta">当前属性，含等级、强化及生效中的状态</small><dl class="hero-stat-list">' +
    g.stats.map(([name, value]) => '<div><dt>' + name + '</dt><dd>' + value + '</dd></div>').join('') + '</dl></article>';
  const common = '<article class="ability-entry" data-ability-view="common" hidden><h3>通用效果</h3><small class="ability-meta">白色已获得 · 灰色未激活</small><h4>职业通用</h4>' +
    upgradeEffectsHTML(g.generalEffects.filter(t => !t.common)) + '<h4>通用强化</h4>' + upgradeEffectsHTML(g.generalEffects.filter(t => t.common)) + '</article>';
  return skills + stats + common;
}

// 每个职业独立保存通用强化；次数是选择上限，不是抽取权重。
const prefixes = { 0: "O", 2: "C", 3: "L", 4: "F", 5: "E" };
export const commonId = (classId, n) =>
  prefixes[classId] + "G" + String(n).padStart(2, "0");
export const commonRank = (sim, h, n) =>
  h && h.playerId != null
    ? sim.players?.[h.playerId]?.progress?.[h.classId]?.traits?.[
        commonId(h.classId, n)
      ] || 0
    : 0;
export const COMMON_TRAITS = [
  ["强健体魄", "blue", 10, "生命上限增加该职业1级基础生命的2%/次。"],
  ["战斗训练", "blue", 10, "攻击增加该职业1级基础攻击的2%/次。"],
  ["轻盈步伐", "blue", 5, "移动速度增加0.04格/秒/次。"],
  ["生息滋养", "blue", 5, "受到的治疗提高4%/次，不提高护盾或派生伤害。"],
  ["施法熟练", "blue", 5, "新施放技能的冷却缩短3%/次，与精英冷却增益乘算。"],
  [
    "战场恢复",
    "blue",
    5,
    "亲自击杀非召唤敌人，恢复该职业1级基础生命的0.05%/次。",
  ],
  ["攻城防护", "purple", 2, "受到防御塔的伤害降低10%/次。"],
  ["迅捷攻击", "purple", 2, "普通攻击速度提高10%/次。"],
  ["延伸打击", "purple", 2, "普通攻击距离增加0.1格/次，不改变技能范围。"],
  ["坚固壁垒", "gold", 2, "最终受到的伤害降低6%/次，与不同来源减伤乘算。"],
  [
    "战意升华",
    "gold",
    2,
    "自身造成的伤害提高6%/次，不提高治疗、护盾、反伤和召唤物伤害。",
  ],
];
export function refreshCommonStats(sim, h) {
  if (!h?.hero || h.hp <= 0) return;
  const c = sim.config.heroes[h.classId],
    p = sim.players[h.playerId],
    level = p.progress[h.classId].level;
  const ratio = h.hp / h.maxHp;
  h.maxHp =
    h.baseMaxHp * (1 + sim.config.world.heroHpGrowth * (level - 1)) +
    h.baseMaxHp * 0.02 * commonRank(sim, h, 1);
  h.hp = h.maxHp * ratio;
  h.range =
    c.range +
    (h.classId === 2 ? sim.rank(h, "C18") * 0.04 : 0) +
    commonRank(sim, h, 9) * 0.1;
  h.speed = c.speed + commonRank(sim, h, 3) * 0.04;
}

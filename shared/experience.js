// Index 0 is the cost of level 0 → 1. Costs are integer stamina amounts.
export const LEVEL_UP_STAMINA = Object.freeze([
  ...Array(7).fill(10),
  ...Array(7).fill(12),
  ...Array(6).fill(14),
  ...Array(6).fill(16),
  ...Array(7).fill(18),
  ...Array(7).fill(20),
]);

export function validateExperienceRules(rules) {
  const costs = rules.levelUpStamina;
  if (rules.initialLevel !== 0 || rules.maxLevel !== 40 ||
      !Number.isInteger(rules.expPerStamina) || rules.expPerStamina <= 0 ||
      !Array.isArray(costs) || costs.length !== rules.maxLevel ||
      costs.some((cost, i) => !Number.isInteger(cost) || cost <= 0 ||
        cost * rules.expPerStamina > 1e7 || (i > 0 && cost < costs[i - 1]))) {
    throw Error('成长配置需要0级起步、40项递增的正整数体力门槛及正整数经验倍率');
  }
}

// Plan before activation; commit/rollback keep the existing progress objects.
export function planExperienceMigration(players, previousRules, nextRules) {
  const scale = nextRules.expPerStamina / previousRules.expPerStamina;
  if (!Number.isFinite(scale) || scale <= 0) throw Error('旧经验倍率无效，无法保留战局');
  if (scale === 1) return [];
  return players.flatMap(player => player.progress.map(progress => {
    if (!Number.isFinite(progress.xp) || progress.xp < 0) throw Error('旧经验余量无效，无法保留战局');
    const after = progress.level >= nextRules.maxLevel ? 0 : progress.xp * scale;
    if (!Number.isFinite(after)) throw Error('经验换算结果无效，无法保留战局');
    return {progress, before: progress.xp, after};
  }));
}

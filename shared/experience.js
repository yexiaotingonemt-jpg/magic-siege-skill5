// Index 0 is the cost of level 0 → 1. Costs are integer stamina amounts.
export const LEVEL_UP_STAMINA = Object.freeze([
  ...Array(7).fill(5),
  ...Array(7).fill(6),
  ...Array(6).fill(7),
  ...Array(6).fill(8),
  ...Array(7).fill(9),
  ...Array(7).fill(10),
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

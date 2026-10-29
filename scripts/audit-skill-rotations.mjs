import fs from "node:fs";
import { Simulation } from "../shared/simulation.js";
import { defaults, clone, contractType, classes } from "../shared/config.js";
function run(classId, count, policy) {
  const config = clone(defaults);
  Object.assign(config.world, {
    expPerStamina: 0,
    heroKillXp: 0,
    minionKillXp: 0,
  });
  const s = new Simulation(config, 1234);
  s.units = [];
  s.player.retired = true;
  s.waveAt = s.populationAt = 1e6;
  for (const t of s.towers) Object.assign(t, { x: 100, cd: 1e6 });
  const p = s.makePlayer(classId === 3 ? 1 : 0, false);
  p.classId = classId;
  p.level = 10;
  p.stamina = 100;
  const h = s.spawn(p.side, contractType(classId), 0, 1, 0);
  s.contract(p, h.id);
  Object.assign(h, { x: 0, y: 0, speed: 0, cd: 1e6 });
  const A = h.attack;
  const targets = Array.from({ length: count }, (_, i) => {
    const u = s.spawn(1 - p.side, "melee", 0, 1, 0);
    Object.assign(u, {
      x: (i - (count - 1) / 2) * 0.5,
      y: p.side ? -3 : 3,
      hp: classId === 4 && i === 0 ? A * 6 : 1e7,
      maxHp: 1e7,
      speed: 0,
      cd: 1e6,
    });
    return u;
  });
  const sequence =
    policy === "single"
      ? [
          { at: 0, i: 0 },
          { at: 6.1, i: 0 },
          { at: 12.2, i: 0 },
          { at: 18.3, i: 0 },
        ]
      : classId === 3
        ? [
            { at: 0, i: 1 },
            { at: 2, i: 2 },
            { at: 3, i: 0 },
          ]
        : [
            { at: 0, i: 0 },
            { at: 2, i: 1 },
            { at: 3, i: 2 },
          ];
  const before = p.staminaSpent;
  let cursor = 0;
  while (s.time < 26) {
    if (cursor < sequence.length && s.time + 1e-7 >= sequence[cursor].at) {
      for (let j = 0; j < targets.length; j++)
        if (targets[j].hp <= 0) {
          const at = targets[j],
            u = s.spawn(1 - p.side, "melee", 0, 1, 0);
          Object.assign(u, {
            x: at.x,
            y: at.y,
            hp: 1e7,
            maxHp: 1e7,
            speed: 0,
            cd: 1e6,
          });
          targets[j] = u;
        }
      const { i } = sequence[cursor++],
        target = targets.find((t) => t.hp > 0);
      if (!target) throw Error("测试目标不足");
      s.setManualTarget(target.id, p);
      if (!s.cast(i, p)) throw Error(classes[classId] + ": " + s.notice);
    }
    s.tick(0.05);
  }
  return {
    classId,
    hero: classes[classId],
    targets: count,
    policy,
    stamina: p.staminaSpent - before,
    casts: s.metrics.casts,
    damageAttackPercent: Number(
      (((h.stats.unitDamage || 0) / A) * 100).toFixed(3),
    ),
    heat: h.heat || 0,
  };
}
const rows = [];
for (const id of [2, 3, 4])
  for (const count of [1, 5])
    for (const policy of ["single", "combo"]) rows.push(run(id, count, policy));
const report = {
  release: "0.6.0",
  scope: "equal-four-stamina-controlled-rotations",
  limitations:
    "每组同为4体力、26秒、10级无词条，关闭升级和普攻；目标静止且无护甲。火法首目标设为600%施法攻击生命以验证真实死亡标记循环；仅统计实际伤害，不计减伤、控制和剩余炙热价值。不能据此推断单体场景一定应连招，也不是正式玩家胜率。",
  rows,
};
fs.writeFileSync(
  "docs/releases/0.6.0-rotations.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));

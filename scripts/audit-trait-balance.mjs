import { writeFileSync, mkdirSync } from "node:fs";
import { Simulation } from "../shared/simulation.js";
import { defaults, clone, contractType } from "../shared/config.js";
const rows = [];
for (const level of [1, 5, 10, 20, 30, 40])
  for (const seed of [3, 71, 1234])
    for (const count of [2, 3]) {
      const s = new Simulation(clone(defaults), seed);
      s.units = [];
      s.player.retired = true;
      s.waveAt = 1e9;
      for (const t of s.towers) t.x = 100;
      const heroes = [];
      for (const id of [0, 4, 5].slice(0, count).concat(3)) {
        const p = s.makePlayer(id === 3 ? 1 : 0, false);
        p.classId = id;
        for (let i = 1; i < level; i++) s.addXp(p, s.expNeeded(p) - p.xp);
        while (p.progress[id].choices.length) {
          const q = p.progress[id].choices[0];
          s.chooseTrait(q.options[0], q.level, p);
        }
        p.stamina = 1000;
        p.auto = true;
        const h = s.spawn(p.side, contractType(id), 0, 1, 0);
        s.contract(p, h.id);
        Object.assign(h, {
          x: id === 5 ? -2 : 0,
          y: id === 3 ? 0 : -4,
          deploying: false,
        });
        heroes.push(h);
      }
      const lord = heroes.at(-1);
      while (
        s.time < 120 &&
        lord.hp > 0 &&
        heroes.slice(0, -1).some((h) => h.hp > 0)
      )
        s.tick(0.05);
      rows.push({
        level,
        seed,
        attackers: count,
        seconds: Number(s.time.toFixed(2)),
        lordAlive: lord.hp > 0,
        attackersAlive: heroes.slice(0, -1).filter((h) => h.hp > 0).length,
        casts: s.metrics.casts,
      });
    }
const summary = [];
for (const level of [1, 5, 10, 20, 30, 40])
  for (const attackers of [2, 3]) {
    const set = rows.filter(
      (r) => r.level === level && r.attackers === attackers,
    );
    summary.push({
      level,
      attackers,
      min: Math.min(...set.map((r) => r.seconds)),
      max: Math.max(...set.map((r) => r.seconds)),
      lordDeaths: set.filter((r) => !r.lordAlive).length,
      samples: set.length,
    });
  }
const report = {
  scope: "isolated-auto-combat",
  limitations:
    "无小兵、无塔支援；体力1000排除断粮；同级、按实际选择次数形成随机构筑，自动施法。不是多人实战胜率或固定60秒承诺。",
  rows,
  summary,
};
mkdirSync("evidence", { recursive: true });
writeFileSync(
  "evidence/trait-balance.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));

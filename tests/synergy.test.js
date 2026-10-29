import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../shared/simulation.js";
import { defaults, contractType, names } from "../shared/config.js";
import { TRAITS, traitSkill } from "../shared/traits.js";
import { commonId, refreshCommonStats } from "../shared/common-traits.js";
import { describeAbilities } from "../client/src/ability-descriptions.js";

test("炙热消耗产生的新攻击增益只影响后续技能，通用最终增伤保持施法快照", () => {
  const fire = arena(4);
  fire.h.attack = 100;
  fire.h.heat = 1;
  fire.h.heatUntil = 100;
  fire.p.progress[4].traits.F18 = 5;
  fire.s.cast(1, fire.p);
  near(fire.s.skillValues.at(-1).attack, 100);
  near(fire.s.attackPower(fire.h), 110);
  const shot = arena(2);
  shot.s.cast(0, shot.p);
  advance(shot.s, 0.4);
  shot.p.progress[2].traits[commonId(2, 11)] = 2;
  const hp = shot.enemy.hp;
  advance(shot.s, 1.5);
  near(hp - shot.enemy.hp, shot.h.attack * 1.2);
});

test("反复刷新同一汲血目标保留下一跳时间，冷却缩减不会降低跳伤频率", () => {
  const { s, p, h, enemy } = arena(0);
  s.cast(0, p);
  advance(s, 0.4);
  const first = s.fields.find((f) => f.type === "orcDrain").tick;
  p.cd[0] = 0;
  s.cast(0, p);
  advance(s, 0.4);
  near(s.fields.find((f) => f.type === "orcDrain").tick, first);
  const hp = enemy.hp;
  advance(s, 0.6);
  near(hp - enemy.hp, h.attack * 0.9);
});

test("火球紫色击退与金色贯穿同时选择时首次命中仍产生位移", () => {
  const { s, p, h, enemy } = arena(4);
  p.progress[4].traits.F07 = 2;
  p.progress[4].traits.F08 = 1;
  h.heat = 3;
  h.heatUntil = 100;
  s.cast(2, p);
  advance(s, 1.4);
  assert.ok(enemy.y > 3);
});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
const advance = (s, n) => {
  const end = s.time + n;
  while (s.time < end - 1e-8) s.tick(Math.min(0.05, end - s.time));
};
function arena(id = 0) {
  const s = new Simulation();
  s.units = [];
  s.player.retired = true;
  s.waveAt = s.populationAt = 1e6;
  for (const t of s.towers) Object.assign(t, { x: 100, cd: 1e6 });
  const make = (classId, x = 0, y = 0) => {
    const p = s.makePlayer(classId === 3 ? 1 : 0, false);
    p.classId = classId;
    p.level = 10;
    p.stamina = 1000;
    const h = s.spawn(p.side, contractType(classId), 0, 1, x);
    assert.ok(s.contract(p, h.id));
    Object.assign(h, { x, y, speed: 0, cd: 1e6 });
    return { p, h };
  };
  const { p, h } = make(id);
  s.localPlayerId = p.id;
  const unit = (side = 1 - h.side, x = 0, y = id === 3 ? -3 : 3) => {
    const u = s.spawn(side, "melee", 0, 1, x);
    Object.assign(u, { x, y, hp: 1e6, maxHp: 1e6, speed: 0, cd: 1e6 });
    return u;
  };
  const enemy = unit(),
    friend = unit(h.side, 1, 0);
  friend.hp = 5e5;
  friend.targetId = enemy.id;
  enemy.targetId = friend.id;
  s.setManualTarget(id === 5 ? friend.id : enemy.id, p);
  return { s, p, h, enemy, friend, unit, make };
}
test("五职业各29类强化，次数上限不充当权重，蓝紫金库存78/14/8", () => {
  assert.equal(TRAITS.length, 145);
  assert.equal(new Set(TRAITS.map((t) => t.id)).size, 145);
  for (const id of [0, 2, 3, 4, 5])
    for (const [rarity, count, stock] of [
      ["blue", 16, 78],
      ["purple", 7, 14],
      ["gold", 6, 8],
    ]) {
      const ts = TRAITS.filter((t) => t.classId === id && t.rarity === rarity);
      assert.equal(ts.length, count);
      assert.equal(
        ts.reduce((n, t) => n + t.max, 0),
        stock,
      );
    }
});
test("技能位次和既有词条ID按技能语义匹配，费用与冷却遵守新版", () => {
  for (const id of [0, 2, 3, 4, 5]) {
    assert.deepEqual(
      defaults.heroes[id].skills.map((s) => s.cost),
      [1, 1, 2, 3],
    );
    assert.deepEqual(
      defaults.heroes[id].skills.map((s) => s.cd),
      [6, 10, 22, 42],
    );
  }
  for (const [trait, skill] of [
    ["C10", 3],
    ["C14", 2],
    ["F07", 2],
    ["F11", 1],
  ])
    assert.equal(TRAITS.find((t) => t.id === trait).skill, skill);
  assert.equal(names[2][3], "定点连轰");
  assert.equal(names[4][1], "焚魂烙印");
});
test("领主灼烧震荡只识别自己的有效灼烧，返回波不重复连携，也不清除灼烧", () => {
  const { s, p, h, enemy } = arena(3);
  p.progress[3].traits.L04 = 1;
  const A = s.attackPower(h);
  s.dot(
    h,
    enemy,
    "lordScorch",
    {
      ...traitSkill(s, h, 2),
      value: { attack: A, limit: null, spent: 0, parts: {}, skill: 2 },
      power: 0,
    },
    4,
  );
  const hp = enemy.hp;
  s.cast(0, p);
  advance(s, 1);
  near(hp - enemy.hp, A * (2 + 2.2 + 1.2));
  assert.ok(s.fields.some((f) => f.host === enemy.id && f.until > s.time));
  const other = arena(3),
    owner = other.make(3).h;
  other.s.dot(
    owner,
    other.enemy,
    "lordScorch",
    { power: 0, value: { attack: 1 } },
    4,
  );
  const before = other.enemy.hp;
  other.s.cast(0, other.p);
  advance(other.s, 0.4);
  near(before - other.enemy.hp, other.h.attack * 2);
});
test("冲锋紫色两次选择都提升灼烧，火盾刷新不降低较强灼烧", () => {
  for (const rank of [1, 2]) {
    const { s, p, h, enemy } = arena(3);
    p.progress[3].traits.L07 = rank;
    s.cast(1, p);
    advance(s, 1.2);
    const burn = s.fields.find((f) => f.type === "lordScorch");
    assert.ok(burn);
    near(burn.s.power, 30 * rank);
  }
});
test("领主技能吸血不从普攻或君临普攻溅射恢复，技能群伤按半额转化", () => {
  const { s, p, h, enemy, unit } = arena(3);
  p.progress[3].traits.L15 = 2;
  unit(0, 1, -3);
  h.hp = h.maxHp * 0.2;
  s.cast(3, p);
  advance(s, 0.4);
  const hp = h.hp;
  s.damage(h, enemy, 100, true);
  s.afterBasicAttack(h, enemy);
  near(h.hp, hp);
  s.damage(h, enemy, 100, false, false, {
    value: { skill: 0, limit: null, spent: 0, parts: {} },
    area: true,
  });
  near(h.hp - hp, 6);
});
test("火法零炙热烙印失败不扣费，施法扣1层，每个死亡标记返3层且不溢出上限", () => {
  const { s, p, h, enemy } = arena(4);
  const stamina = p.stamina;
  assert.equal(s.castPlan(1, p).code, "heat");
  assert.equal(s.cast(1, p), false);
  near(p.stamina, stamina);
  s.addHeat(h, 1);
  assert.ok(s.cast(1, p));
  assert.equal(h.heat, 0);
  advance(s, 0.4);
  assert.equal(enemy.soulMarks[0].heat, 3);
  s.damage(h, enemy, 1e9);
  assert.equal(h.heat, 3);
  s.addHeat(h, 100);
  assert.equal(h.heat, 6);
});
test("火法至少3层炙热释放三颗等额火球，2层仅一颗，不消耗炙热", () => {
  for (const heat of [2, 3, 4]) {
    const { s, p, h, enemy, unit } = arena(4),
      extras = [unit(1, 1, 3), unit(1, -1, 3)];
    h.heat = heat;
    h.heatUntil = 100;
    const before = [enemy, ...extras].map((u) => u.hp);
    s.cast(2, p);
    advance(s, 0.4);
    near(before[0] - enemy.hp, h.attack * 10);
    extras.forEach((u, i) =>
      near(before[i + 1] - u.hp, heat >= 3 ? h.attack * 10 : 0),
    );
    assert.equal(h.heat, heat);
  }
});
test("精灵1技能以友方为中心，面板伤害不受过量及受疗加成影响，金色只额外治疗", () => {
  const { s, p, h, enemy, friend, unit } = arena(5),
    extra = unit(h.side, 2, 0);
  extra.hp = 1;
  Object.assign(p.progress[5].traits, { E01: 2, E04: 1 });
  friend.hp = friend.maxHp;
  p.progress[5].traits[commonId(5, 4)] = 5;
  const hp = enemy.hp;
  assert.ok(s.cast(0, p));
  advance(s, 0.4);
  near(hp - enemy.hp, h.attack * 2 * 1.3);
  near(extra.hp - 1, h.attack * 2 * 1.3 * 0.6);
  assert.equal(s.animations.filter((e) => e.kind === "damage").length, 1);
});
test("精灵金色链接平摊原始伤害，各成员各结算一次减伤，金额守恒且可断链", () => {
  const { s, p, h, enemy, friend } = arena(5);
  p.progress[5].traits.E08 = 1;
  s.cast(1, p);
  advance(s, 0.4);
  s.guard(friend, h, "test", 0.5, 10);
  const a = h.hp,
    b = friend.hp;
  near(s.damage(enemy, friend, 100), 75);
  near(a - h.hp, 50);
  near(b - friend.hp, 25);
  friend.y = 20;
  advance(s, 0.05);
  const hp = h.hp;
  s.damage(enemy, friend, 100);
  near(h.hp, hp);
});
test("斩杀不沿平摊链接斩杀其他成员，治疗共享不递归", () => {
  const { s, p, h, enemy, friend } = arena(5);
  p.progress[5].traits.E08 = 1;
  s.cast(1, p);
  advance(s, 0.4);
  const hp = h.hp;
  s.damage(enemy, friend, 1, false, false, { execute: true });
  near(h.hp, hp);
  assert.equal(friend.hp, 0);
});
test("兽人汲血非引导，可同时战吼与换位；金色额外链接只有35%收益", () => {
  const { s, p, h, enemy, friend, unit } = arena(0),
    extra = unit(1, 1, 3);
  p.progress[0].traits.O04 = 1;
  h.hp = h.maxHp * 0.3;
  const A = h.attack,
    hp = enemy.hp,
    b = extra.hp;
  assert.ok(s.cast(0, p));
  advance(s, 0.4);
  assert.ok(!(h.channelUntil > s.time));
  s.setManualTarget(friend.id, p);
  assert.ok(s.cast(1, p));
  advance(s, 1);
  near(hp - enemy.hp, A * 0.9);
  near(b - extra.hp, A * 0.9 * 0.35);
  assert.ok(h.hp > h.maxHp * 0.3);
});
test("兽人汲血可净化、超距或施法者阵亡中断，不能叠加刷新获得多重跳伤", () => {
  for (const mode of ["cleanse", "range", "death", "refresh"]) {
    const { s, p, h, enemy } = arena(0);
    s.cast(0, p);
    advance(s, 0.4);
    if (mode === "cleanse") s.cleanse(enemy);
    if (mode === "range") enemy.y = 20;
    if (mode === "death") h.hp = 0;
    if (mode === "refresh") {
      p.cd[0] = 0;
      s.cast(0, p);
      advance(s, 0.4);
    }
    const hp = enemy.hp;
    advance(s, 1);
    near(hp - enemy.hp, mode === "refresh" ? h.attack * 0.9 : 0);
  }
});
test("兽人救援不要求敌人攻击友方，升级效果为45%减伤6秒", () => {
  const { s, p, h, friend } = arena(0);
  s.setManualTarget(friend.id, p);
  assert.ok(s.cast(2, p));
  advance(s, 0.4);
  near(h.x, 1);
  assert.equal(h.guards[0].ratio, 0.45);
  near(h.guards[0].until - s.time, 5.95);
});
test("冰霜弹只有命中腐蚀目标才减攻速，净化腐蚀不会追溯移除已施加减速", () => {
  const { s, p, h, enemy } = arena(2);
  s.cast(1, p);
  advance(s, 1);
  assert.equal(s.activeDebuffs(enemy, "attackSpeedDown").length, 0);
  p.cd[0] = p.cd[1] = 0;
  s.cast(0, p);
  advance(s, 1);
  s.cast(1, p);
  advance(s, 1);
  near(s.attackRate(enemy), 0.7);
  s.fields = s.fields.filter((f) => f.type !== "corrosion");
  near(s.attackRate(enemy), 0.7);
});
test("战车3技能震荡、4技能五炮连轰，固定落点与引导中断正确", () => {
  const { s, p, h, enemy } = arena(2);
  const hp = enemy.hp;
  s.cast(2, p);
  advance(s, 1);
  near(hp - enemy.hp, h.attack * 7);
  assert.ok(enemy.y > 3);
  h.castUntil = 0;
  s.cast(3, p);
  advance(s, 0.4);
  const f = s.fields.find((f) => f.kind === "runeBarrage");
  assert.equal(f.remaining, 5);
  near(f.x, enemy.x);
  s.interrupt(h);
  assert.equal(
    s.fields.some((f) => f.kind === "runeBarrage"),
    false,
  );
});
test("通用生命立即生效且保留生命比例，升级和重新契约不丢失；词条只影响本职业", () => {
  const { s, p, h } = arena(0);
  h.hp = h.maxHp * 0.4;
  p.progress[0].traits[commonId(0, 1)] = 10;
  refreshCommonStats(s, h);
  near(h.maxHp, h.baseMaxHp * 1.38);
  near(h.hp / h.maxHp, 0.4);
  s.addXp(p, s.expNeeded(p) - p.xp);
  near(h.maxHp, h.baseMaxHp * 1.4);
  near(h.hp / h.maxHp, 0.4);
  h.hp = 0;
  const next = s.spawn(0, "melee", 0, 1, 0);
  s.contract(p, next.id);
  near(next.maxHp, next.baseMaxHp * 1.4);
});
test("通用攻击、移速、受疗、冷却、塔减伤、攻速、射程与最终增减伤实际参与结算", () => {
  const { s, p, h, enemy } = arena(2);
  for (let n = 1; n <= 11; n++) p.progress[2].traits[commonId(2, n)] = 1;
  refreshCommonStats(s, h);
  near(s.attackPower(h), h.attack + defaults.heroes[2].attack * 0.02);
  near(h.speed, 1.54);
  near(h.range, 10.6);
  near(s.attackRate(h), 1.1);
  near(traitSkill(s, h, 0).cd, 6 * 0.97);
  const hp = h.hp;
  near(s.damage(enemy, h, 100), 94);
  near(hp - h.hp, 94);
  const targetHp = enemy.hp;
  near(s.damage(h, enemy, 100), 106);
  near(targetHp - enemy.hp, 106);
  near(s.heal(h, 50, h), 52);
  const tower = s.towers[0];
  near(s.damage(tower, h, 100), 100 * 0.94 * 0.9);
});
test("通用射程与战车专属叠满仍在标准塔射程内，技能射程不改变", () => {
  const { s, p, h } = arena(2);
  p.progress[2].traits.C18 = 5;
  p.progress[2].traits[commonId(2, 9)] = 2;
  refreshCommonStats(s, h);
  near(h.range, 10.9);
  assert.ok(h.range < s.config.tower.range);
  near(traitSkill(s, h, 0).targetRange, 12);
});
test("通用最终增伤不抬高反伤、召唤物、治疗或护盾，击杀恢复不由召唤物触发", () => {
  const { s, p, h, enemy, unit } = arena(0);
  p.progress[0].traits[commonId(0, 11)] = 2;
  p.progress[0].traits[commonId(0, 6)] = 5;
  near(s.damage(h, enemy, 100, false, true), 100);
  h.hp = h.maxHp * 0.3;
  const hp = h.hp;
  const victim = unit();
  victim.hp = 1;
  s.damage(h, victim, 100);
  near(h.hp - hp, defaults.heroes[0].hp * 0.0025);
  const minion = unit(h.side);
  minion.summoned = true;
  minion.ownerId = h.id;
  const other = unit();
  other.hp = 1;
  const before = h.hp;
  s.damage(minion, other, 10);
  near(h.hp, before);
});
test("所有词条与技能说明不含旧技能点或未定义数值，技能详情展示新归属", () => {
  for (const id of [0, 2, 3, 4, 5]) {
    const { s } = arena(id);
    for (const skill of describeAbilities(s).skills)
      assert.doesNotMatch(skill.effect, /undefined|NaN|Infinity/);
  }
});

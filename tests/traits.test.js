import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../shared/simulation.js";
import {
  defaults,
  contractType,
  contractClasses,
  clone,
} from "../shared/config.js";
import { TRAITS, traitSkill } from "../shared/traits.js";
import { Room } from "../server/room.mjs";
import { describeAbilities } from "../client/src/ability-descriptions.js";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
const advance = (s, n) => {
  const end = s.time + n;
  while (s.time < end - 1e-8) s.tick(Math.min(0.05, end - s.time));
};
function arena(id = 4, level = 10) {
  const s = new Simulation();
  s.units = [];
  s.player.retired = true;
  s.waveAt = 1e9;
  for (const t of s.towers) {
    t.x = 100;
    t.cd = 1e9;
  }
  const make = (classId, x = 0, y = 0) => {
    const p = s.makePlayer(classId === 3 ? 1 : 0, false);
    p.classId = classId;
    p.level = level;
    p.stamina = 10000;
    const h = s.spawn(p.side, contractType(classId), 0, 1, x);
    assert.ok(s.contract(p, h.id));
    p.xp = 0; // 固定等级机制测试从空经验开始，避免契约经验意外触发升级。
    Object.assign(h, { x, y, speed: 0, cd: 1e9 });
    return { p, h };
  };
  const { p, h } = make(id);
  s.localPlayerId = p.id;
  const troop = (side, x, y, hp = 1e7) => {
    const u = s.spawn(side, "melee", 0, 1, x);
    Object.assign(u, {
      x,
      y,
      hp,
      maxHp: hp,
      speed: 0,
      cd: 1e9,
      deploying: false,
    });
    return u;
  };
  const enemy = make(id === 3 ? 0 : 3, 0, id === 3 ? -3 : 3).h;
  Object.assign(enemy, { hp: 1e7, maxHp: 1e7 });
  const friends = [
    troop(h.side, 1, 0),
    troop(h.side, -1, 0),
    troop(h.side, 2, 0),
    troop(h.side, -2, 0),
  ];
  friends.forEach((u) => {u.hp *= 0.5;u.targetId=enemy.id;});
  enemy.hero = true;
  enemy.targetId = friends[0].id;
  return { s, p, h, enemy, friends, troop, make };
}
test("145类词条覆盖五职业，库存78蓝14紫8金且ID唯一", () => {
  assert.equal(TRAITS.length, 145);
  assert.equal(new Set(TRAITS.map((t) => t.id)).size, 145);
  for (const id of [0, 2, 3, 4, 5])
    for (const [rarity, count] of [
      ["blue", 78],
      ["purple", 14],
      ["gold", 8],
    ])
      assert.equal(
        TRAITS.filter((t) => t.classId === id && t.rarity === rarity).reduce(
          (n, t) => n + t.max,
          0,
        ),
        count,
      );
});
for (const id of [0, 2, 3, 4, 5])
  test("职业" + id + "完整1→40级：31蓝4紫4金、上限及扩展金色池三选一", () => {
    const { s, p } = arena(id, 1);
    s.addXp(p, 30000);
    const counts = { blue: 0, purple: 0, gold: 0 },
      gold = [];
    while (p.progress[id].choices.length) {
      const choice = p.progress[id].choices[0];
      assert.ok(choice.options.length >= 1 && choice.options.length <= 3);
      if (choice.rarity === "gold") gold.push(choice.options.length);
      if (choice.level < 5)
        for (const option of choice.options)
          assert.notEqual(TRAITS.find((t) => t.id === option).skill, 3);
      counts[choice.rarity]++;
      assert.ok(s.chooseTrait(choice.options[0], choice.level, p));
    }
    assert.deepEqual(counts, { blue: 31, purple: 4, gold: 4 });
    assert.deepEqual(gold, [3, 3, 3, 3]);
    assert.equal(p.points, 0);
    assert.deepEqual(p.builds[id], [1, 1, 1, 1]);
    for (const t of TRAITS)
      assert.ok((p.progress[id].traits[t.id] || 0) <= t.max);
  });
test("技能1/2/3初始可用、大招5级解锁；升级保留血量比例", () => {
  const { s, p, h } = arena(4, 1);
  assert.deepEqual(p.builds[4], [1, 1, 1, 0]);
  assert.equal(s.castPlan(3, p).code, "locked");
  h.hp = h.maxHp * 0.4;
  while (p.level < 5) s.addXp(p, s.expNeeded(p) - p.xp);
  assert.ok(s.castPlan(3, p).ok);
  near(h.hp / h.maxHp, 0.4);
  near(h.maxHp, defaults.heroes[4].hp * 1.08);
  near(h.attack, defaults.heroes[4].attack * 1.06);
  assert.equal(p.points, 0);
});
test("候选稳定，拒绝伪造、跨职业和过期选择，不能重抽", () => {
  const { s, p } = arena(4, 1);
  s.addXp(p, s.expNeeded(p) - p.xp);
  const choice = structuredClone(p.progress[4].choices[0]);
  assert.equal(s.chooseTrait("L01", 2, p), false);
  assert.deepEqual(p.progress[4].choices[0], choice);
  const id = choice.options[0];
  assert.ok(s.chooseTrait(id, 2, p));
  assert.equal(s.chooseTrait(id, 2, p), false);
  assert.equal(p.progress[4].traits[id], 1);
});
test("阵亡、重新契约与阶段重建保留职业构筑及待选队列", () => {
  const { s, p, h } = arena(4, 1);
  s.addXp(p, s.expNeeded(p) - p.xp);
  const choice = p.progress[4].choices[0];
  s.chooseTrait(choice.options[0], choice.level, p);
  const saved = structuredClone(p.progress[4]);
  s.damage(null, h, 1e9);
  const u = s.spawn(0, "ranged", 0, 1, 0);
  assert.ok(s.contract(p, u.id));
  saved.xp += s.config.world.contractCost * s.config.world.expPerStamina;
  assert.deepEqual(p.progress[4], saved);
  s.resetMap();
  assert.deepEqual(p.progress[4], saved);
});
test("服务端选择指令幂等，伪造来源无法替他人选择", () => {
  const room = new Room(),
    a = { id: "a", name: "甲", side: 0 },
    b = { id: "b", name: "乙", side: 0 };
  const p = room.player(a),
    q = room.player(b);
  room.sim.addXp(p, room.sim.expNeeded(p) - p.xp);
  const choice = p.progress[0].choices[0],
    cmd = {
      type: "chooseTrait",
      id: "pick",
      args: { traitId: choice.options[0], level: choice.level, playerId: p.id },
    };
  assert.equal(room.command(b, cmd).ok, false);
  assert.deepEqual(q.progress[0].traits, {});
  assert.equal(room.command(a, cmd).ok, true);
  assert.equal(room.command(a, cmd).ok, true);
  assert.equal(p.progress[0].traits[choice.options[0]], 1);
  assert.doesNotThrow(() => JSON.stringify(room.snapshot()));
});
test("每三波双方各加一名精英，重建后重新计波，精英不可契约", () => {
  const s = new Simulation();
  assert.equal(s.units.filter((u) => u.elite).length, 0);
  s.spawnWave();
  assert.equal(s.units.filter((u) => u.elite).length, 0);
  s.spawnWave();
  const elites = s.units.filter((u) => u.elite);
  assert.deepEqual(elites.map((u) => u.side).sort(), [0, 1]);
  for (const u of elites) {
    assert.deepEqual(contractClasses(u), []);
    const p = s.makePlayer(u.side, false);
    assert.equal(s.contract(p, u.id), false);
  }
  s.resetMap();
  assert.equal(s.units.filter((u) => u.elite).length, 0);
  s.spawnWave();
  s.spawnWave();
  assert.equal(s.units.filter((u) => u.elite).length, 2);
});
for (const [i, buff] of ["score"].entries())
  test("精英积分奖励" + buff + "广播及战报可序列化，30秒到期", () => {
    const { s, p, h, enemy } = arena();
    enemy.elite = true;
    enemy.hero = false;
    s.random = () => i / 4 + 0.01;
    s.damage(h, enemy, 1e9);
    assert.equal(h.eliteBuffs[buff], 30);
    assert.match(s.battleEvents[0].text, /特殊怪物/);
    assert.equal(s.battleEvents[0].buff, buff);
    assert.equal(s.battleEvents.length, 1);
    s.die(enemy, h);
    assert.equal(s.battleEvents.length, 1);
    assert.doesNotThrow(() => JSON.stringify(s.battleEvents));
    s.time = 30.1;
    assert.ok(!(h.eliteBuffs[buff] > s.time));
  });
test("小兵击杀、友方击杀、阵亡英雄的延迟击杀不领取精英Buff", () => {
  for (const kind of ["minion", "friendly", "dead"]) {
    const { s, h, enemy, friends } = arena();
    enemy.elite = true;
    enemy.hero = false;
    if (kind === "dead") h.hp = 0;
    if (kind === "friendly") enemy.side = h.side;
    s.damage(kind === "minion" ? friends[0] : h, enemy, 1e9);
    assert.equal(s.battleEvents.length, 0);
  }
});
test("移除统一额度：领主多目标震荡完整超过2000%攻击", () => {
  const { s, p, h, enemy, troop } = arena(3);
  p.progress[3].traits.L01 = 4; p.progress[3].traits.L02=3;
  for (let j = 0; j < 7; j++) troop(0, j - 2, -4);
  const before = enemy.hp;
  s.cast(0, p);
  advance(s, 0.4);
  near(before - enemy.hp, h.attack * 2 * 1.6);
  const v = s.skillValues.at(-1);
  assert.equal(v.limit, null);
  assert.ok(v.spent > v.attack * 20);
});
test("兽人基础汲血无易伤，蓝色词条才提供易伤；金色侧目标35%", () => {
  const { s, p, h, enemy, troop } = arena(0),
    side = troop(1, 1, 3);
  p.progress[0].traits.O04 = 1;
  const hp = enemy.hp,
    other = side.hp;
  s.cast(0, p);
  advance(s, 1.4);
  near(hp - enemy.hp, h.attack * .9);
  near(other - side.hp, h.attack * .9 * .35);
  assert.equal(s.activeDebuffs(enemy, "vulnerable").length, 0);
  p.progress[0].traits.O02 = 3;
  p.cd[0] = 0;
  s.cast(0, p);
  advance(s, 1.4);
  near(s.activeDebuffs(enemy, "vulnerable")[0].ratio, 0.15);
});
test("腐蚀五跳且可净化，不可净化词条不穿透负面免疫", () => {
  for (const gold of [false, true]) {
    const { s, p, enemy } = arena(2);
    enemy.hp = enemy.maxHp = 10000;
    if (gold) p.progress[2].traits.C04 = 1;
    s.cast(0, p);
    advance(s, 2);
    assert.equal(enemy.hp, 9920);
    assert.equal(s.hasNegative(enemy), !gold);
    s.cleanse(enemy);
    advance(s, 1);
    assert.equal(enemy.hp, gold ? 9840 : 9920);
    if (gold) {
      enemy.immuneUntil = 20;
      advance(s, 5);
      assert.equal(enemy.hp, 9840);
      enemy.immuneUntil = 0;
      advance(s, 1);
      assert.equal(enemy.hp, 9840);
    }
  }
});
test("额外腐蚀按主伤35%，火法烙印额外目标按45%", () => {
  for (const id of [2, 4]) {
    const { s, p, h, enemy, troop } = arena(id),
      side = troop(1, 1, 3),
      skill = id === 2 ? 0 : 1;
    p.progress[id].traits[id === 2 ? "C03" : "F11"] = 1;
    if(id===4)s.addHeat(h,1); const hp = enemy.hp,
      other = side.hp;
    s.cast(skill, p);
    advance(s, id === 2 ? 2 : 0.4);
    near((other - side.hp) / (hp - enemy.hp), id === 2 ? 0.35 : 0.45);
    if (id === 4) assert.equal(side.soulMarks.length, 1);
  }
});
test("火法天火新增蓝色名额35%主伤，热量目标保持全额", () => {
  const { s, p, h, enemy, troop } = arena(4),
    side = troop(1, 1, 3);
  p.progress[4].traits.F14 = 1;
  const hp = enemy.hp,
    other = side.hp;
  s.setManualTarget(enemy.id, p);
  s.cast(3, p);
  advance(s, 0.4);
  near(hp - enemy.hp, h.attack * 18);
  near(other - side.hp, h.attack * 18 * 0.35);
});
test("共生多链接采用星形非递归共享，额外链接25%", () => {
  const { s, p, h, friends } = arena(5);
  p.progress[5].traits.E06 = 3;
  s.setManualTarget(friends[0].id, p);
  s.cast(1, p);
  advance(s, 0.4);
  h.hp = h.maxHp * 0.5;
  const before = [h, ...friends].map((u) => u.hp);
  s.heal(h, 100, h);
  near(h.hp - before[0], 100);
  near(friends[0].hp - before[1], 50);
  for (let j = 1; j < 4; j++) near(friends[j].hp - before[j + 1], 25);
  const hp = h.hp;
  s.heal(friends[1], 100, h);
  near(h.hp - hp, 25);
});
test("满血群疗只转盾，不计有效治疗、不产生治疗转伤", () => {
  const { s, p, h, enemy, friends } = arena(5);
  Object.assign(p.progress[5].traits, { E15: 2, E16: 1, E17: 5 });
  for (const u of [h, ...friends]) u.hp = u.maxHp;
  const hp = enemy.hp;
  s.setManualTarget(friends[0].id, p);
  assert.ok(s.cast(3, p));
  advance(s, 0.4);
  near(enemy.hp, hp);
  near(h.shield, h.attack * 10 * 0.6);
  assert.equal(h.stats.healing || 0, 0);
  assert.equal(h.healCounter || 0, 0);
});
test("治疗转伤同一敌人每次最多三圈，分享治疗不额外产圈", () => {
  const { s, p, h, enemy, friends } = arena(5);
  p.progress[5].traits.E16 = 1;
  friends.forEach((u) => (u.y = 1));
  h.hp = h.maxHp * 0.2;
  s.setManualTarget(friends[0].id, p);
  const hp = enemy.hp;
  s.cast(3, p);
  advance(s, 0.4);
  near(hp - enemy.hp, h.attack * 10 * 0.4 * 3);
});
test("兽人不死优先于斩杀，挡掉伤害不进入蓄伤，结束后不补扣", () => {
  const { s, p, h, enemy } = arena(0);
  p.progress[0].traits.O16 = 1;
  s.cast(3, p);
  advance(s, 0.4);
  h.hp = 10;
  s.damage(enemy, h, 1e9);
  assert.equal(h.hp, 1);
  near(h.damageStore.total, 9);
  advance(s, 6);
  assert.equal(h.hp, 1);
  near(h.shield, 9);
  s.damage(enemy, h, 100);
  assert.equal(h.hp, 0);
});
test("不同技能减伤乘算、同名取最高，精英Buff不会造成减伤相加突增", () => {
  const { s, h, enemy } = arena(0);
  s.guard(h, h, "warcry", 0.25, 5);
  s.guard(h, enemy, "warcry", 0.37, 5);
  s.guard(h, h, "rescue", 0.35, 5);
  h.eliteBuffs = { fortitude: 5 };
  near(s.damage(enemy, h, 100), 100 * 0.63 * 0.65 * 0.85);
});
test("贯穿火球主目标首次保留完整大火球伤害，避免金色负提升", () => {
  const { s, p, h, enemy } = arena(4);
  p.progress[4].traits.F08 = 1;
  h.heat = 3;
  h.heatUntil = 30;
  const hp = enemy.hp;
  s.cast(2, p);
  advance(s, 1.5);
  assert.ok(hp - enemy.hp >= h.attack * 10 - 1e-6);
});
test("斩杀对普通目标生效，对不死目标无效", () => {
  for (const immortal of [false, true]) {
    const { s, p, h, enemy } = arena(4);
    h.attack = 100;
    p.progress[4].traits.F16 = 1;
    enemy.hp = 3000;
    enemy.maxHp = 10000;
    if (immortal) enemy.immortalUntil = 10;
    s.cast(3, p);
    advance(s, 0.4);
    near(enemy.hp, immortal ? 1200 : 0);
  }
});
test("领主基础冲锋不位移，金色将沿途目标带至终点", () => {
  for (const gold of [false, true]) {
    const { s, p, h, enemy, troop } = arena(3),
      middle = troop(0, 1, -5);
    enemy.y = -10;
    if (gold) p.progress[3].traits.L08 = 1;
    s.setManualTarget(enemy.id, p);
    s.cast(1, p);
    advance(s, 1.7);
    near(h.y, -10);
    near(middle.y, gold ? -10 : -5);
    near(middle.x, gold ? 0 : 1);
  }
});
test("战车实际位移为零时不附伤，但金色二次爆炸仍只产生一次", () => {
  const { s, p, h, enemy } = arena(2);
  Object.assign(p.progress[2].traits, { C15: 2, C16: 1 });
  enemy.immuneUntil = 20;
  const hp = enemy.hp;
  s.cast(2, p);
  advance(s, 1.5);
  near(hp - enemy.hp, h.attack * 11);
});
test("生命百分比蓄伤记录受局部上限约束，紫色爆发不截断护盾", () => {
  const { s, p, h, enemy } = arena(0);
  p.progress[0].traits.O15 = 2;
  s.cast(3, p);
  advance(s, 0.4);
  h.hp = h.maxHp;
  h.damageStore.total = h.maxHp * 0.75;
  const hp = enemy.hp;
  advance(s, 6);
  near(h.shield, h.maxHp * 0.75);
  near(hp - enemy.hp, h.maxHp * 0.75 * 0.2);
});
test("战车射程蓝色满选仍低于塔射程", () => {
  const { s, p, h } = arena(2);
  p.progress[2].traits.C18 = 5;
  h.hp = 0;
  const u = s.spawn(0, "siege", 0, 1, 0);
  s.contract(p, u.id);
  near(u.range, 10.7);
  assert.ok(u.range < s.config.tower.range);
});
for (const t of TRAITS)
  test(t.id + "单词条满选的真实施法、持续效果与快照有限", () => {
    const { s, p, h, enemy, friends } = arena(t.classId, 40);
    p.progress[t.classId].traits[t.id] = t.max;
    h.hp *= 0.5;
    if (t.classId === 5) {
      s.setManualTarget(friends[0].id, p);
      s.debuff(friends[0], enemy, "attackDown", 0.2, 10);
    }
    const skill = t.skill ?? 0;
    if(t.classId===4&&skill===1)s.addHeat(h,1);
    assert.ok(s.cast(skill, p), s.notice);
    advance(s, 8);
    const room = new Room(s.config);
    room.sim = s;
    assert.doesNotThrow(() => JSON.stringify(room.snapshot()));
    for (const u of s.units)
      for (const key of ["hp", "maxHp", "x", "y", "attack"])
        assert.ok(Number.isFinite(u[key]), t.id + " " + key);
    assert.doesNotMatch(
      describeAbilities(s).skills[skill].effect,
      /undefined|NaN|Infinity/,
    );
  });
test("高等级完整构筑长战斗无递归爆炸、非法坐标或不受控字段增长", () => {
  const c = clone(defaults);
  c.world.attackBots = 4;
  c.world.defenseBots = 1;
  const s = new Simulation(c);
  s.player.retired = true;
  for (const p of s.players.filter((p) => p.bot)) {
    s.addXp(p, 30000);
    while (p.progress[p.classId].choices.length) {
      const choice = p.progress[p.classId].choices[0];
      s.chooseTrait(choice.options[0], choice.level, p);
    }
  }
  for (let i = 0; i < 12000; i++) s.tick(0.05);
  assert.ok(s.metrics.casts > 20);
  assert.ok(s.fields.length < 1000);
  for (const u of s.units) {
    assert.ok(Number.isFinite(u.hp));
    assert.ok(Number.isFinite(u.x));
    assert.ok(Number.isFinite(u.y));
  }
});

test("前摇中主目标死亡，额外烙印仍保持45%而不升格主伤", () => {
  const { s, p, h, enemy, troop } = arena(4),
    side = troop(1, 1, 3);
  p.progress[4].traits.F11 = 1;
  s.setManualTarget(enemy.id, p);
  const hp = side.hp;
  s.addHeat(h,1); s.cast(1, p);
  enemy.hp = 0;
  advance(s, 0.4);
  near(hp - side.hp, h.attack * 3 * 0.45);
});
test("飞行中获得金词条，不回写已经发出的腐蚀弹", () => {
  const { s, p, enemy } = arena(2);
  s.cast(0, p);
  advance(s, 0.4);
  p.progress[2].traits.C04 = 1;
  advance(s, 1);
  assert.ok(s.hasNegative(enemy));
  assert.ok(s.cleanse(enemy));
  assert.equal(s.fields.filter((f) => f.type === "corrosion").length, 0);
});
test("建筑可受易伤和减攻速，仍不能被移动控制", () => {
  const { s, h } = arena(2),
    tower = s.towers[0];
  tower.x = 0;
  tower.y = 3;
  assert.ok(s.debuff(tower, h, "attackSpeedDown", 0.25, 4));
  near(s.attackRate(tower), 0.75);
  assert.ok(s.debuff(tower, h, "vulnerable", 0.1, 4));
  assert.equal(s.debuff(tower, h, "moveSlow", 0.4, 4), false);
  assert.equal(s.stun(tower, h, 1), false);
});
test("净化增攻按负面种类计数，同类多个来源不重复计算", () => {
  const { s, h, enemy, friends } = arena(5);
  s.debuff(friends[0], h, "vulnerable", 0.1, 5);
  s.debuff(friends[0], enemy, "vulnerable", 0.2, 5);
  s.debuff(friends[0], h, "attackDown", 0.1, 5);
  assert.equal(s.negativeCount(friends[0]), 2);
  assert.equal(s.cleanse(friends[0]), 2);
});

test("腐蚀弹保留在途主目标，不因命中时主目标走出12格而取消", () => {
  const { s, p, enemy, troop } = arena(2);
  enemy.y = 10;
  const side = troop(1, 1, 13);
  p.progress[2].traits.C03 = 1;
  s.setManualTarget(enemy.id, p);
  s.cast(0, p);
  advance(s, 0.4);
  enemy.y = 13;
  advance(s, 3);
  assert.ok(enemy.hp < enemy.maxHp);
  assert.equal(
    s.fields.some((f) => f.type === "corrosion" && f.host === side.id),
    false,
  );
});
test("领主返回震荡不追踪已经离开原扇形范围的目标", () => {
  const { s, p, h, enemy } = arena(3);
  p.progress[3].traits.L04 = 1;
  s.cast(0, p);
  advance(s, 0.4);
  const after = enemy.hp;
  enemy.y = -15;
  advance(s, 0.5);
  near(enemy.hp, after);
});

test("贯穿火球按整条路径判断孤立，不能对远端群体套用单体增伤", () => {
  const { s, p, h, enemy, troop } = arena(4);
  h.attack = 100;
  h.heat = 3;
  h.heatUntil = 30;
  p.progress[4].traits.F06 = 3;
  p.progress[4].traits.F08 = 1;
  troop(1, 0, 8);
  const hp = enemy.hp;
  s.cast(2, p);
  advance(s, 1);
  near(hp - enemy.hp, 1000);
});

test("亡灵护卫出生满血且上限为领主5%，护卫击杀不递归召唤", () => {
  const { s, p, h, enemy, troop } = arena(3);
  p.progress[3].traits.L16 = 1;
  s.cast(3, p);
  advance(s, 0.4);
  const victim = troop(0, 1, -2, 1);
  s.damage(h, victim, 100);
  const guard = s.units.find((u) => u.summoned);
  assert.ok(guard);
  near(guard.hp, guard.maxHp);
  near(guard.maxHp, h.maxHp * 0.05);
  enemy.hp = 1;
  s.damage(guard, enemy, 100);
  assert.equal(s.units.filter((u) => u.summoned).length, 1);
  assert.ok(h.stats.heroKills >= 1);
});
test("精灵治疗反击只保留未满阈值进度，不将超过单次三次的触发缓存到下次", () => {
  const { s, p, h, enemy, friends } = arena(5);
  p.progress[5].traits.E17 = 1;
  const value = {
    classId: 5,
    skill: 3,
    attack: 100,
    healProcs: 0,
    limit: null,
    spent: 0,
    parts: {},
    ranks: { E17: 1 },
  };
  const hp = enemy.hp;
  s.heal(friends[0], 15000, h, value);
  near(hp - enemy.hp, 300);
  near(h.healCounter, 1000);
  const next = { ...value, healProcs: 0, parts: {} };
  const after = enemy.hp;
  s.heal(friends[1], 1, h, next);
  near(enemy.hp, after);
  near(h.healCounter, 1001);
});
test("没有合法敌人时不无限储存治疗反击的完整触发", () => {
  const { s, p, h, enemy, friends } = arena(5);
  p.progress[5].traits.E17 = 1;
  enemy.x = 100;
  const value = {
    classId: 5,
    skill: 0,
    attack: 100,
    healProcs: 0,
    limit: null,
    spent: 0,
    parts: {},
    ranks: { E17: 1 },
  };
  s.heal(friends[0], 10000, h, value);
  near(h.healCounter, 0);
  enemy.x = 0;
  const hp = enemy.hp;
  s.heal(friends[1], 100, h, { ...value, healProcs: 0, parts: {} });
  near(enemy.hp, hp);
});

test("无英雄时可处理预览职业的待选，存活时不能替其他职业选择", () => {
  const { s, p, h } = arena(0, 1);
  s.addXp(p, s.expNeeded(p, 5) - p.progress[5].xp, 5);
  const choice = p.progress[5].choices[0],
    id = choice.options[0];
  assert.equal(s.chooseTrait(id, choice.level, p, 5), false);
  s.damage(null, h, 1e9);
  assert.ok(s.chooseTrait(id, choice.level, p, 5));
  assert.equal(p.classId, 0);
  assert.equal(p.progress[5].traits[id], 1);
  assert.deepEqual(p.progress[0].traits, {});
  assert.equal(s.chooseTrait(id, choice.level, p, 3), false);
});
test("额外焚魂标记的死亡爆炸继承45%倍率，即90%攻击", () => {
  const { s, p, h, enemy, troop } = arena(4),
    secondary = troop(1, 0, 5),
    victim = troop(1, 0, 7.5);
  p.progress[4].traits.F11 = 1;
  p.progress[4].traits.F12 = 1;
  s.setManualTarget(enemy.id, p);
  s.addHeat(h,1); s.cast(1, p);
  advance(s, 0.4);
  const hp = victim.hp;
  s.damage(h, secondary, 1e9);
  near(hp - victim.hp, h.attack * 0.9);
});

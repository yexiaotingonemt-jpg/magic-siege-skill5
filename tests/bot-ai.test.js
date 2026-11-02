import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults, contractType} from '../shared/config.js';
import {Simulation} from '../shared/simulation.js';
import {createCurrentDesignConfig} from '../shared/current-design.js';
import {BOT_AI} from '../shared/hero-rules.js';
import {balanceNpcHeroes} from '../shared/npc-balance.js';

function arena(config, bot = true, side = 0) {
  const s = new Simulation(config, 123);
  s.units = [];
  s.player.retired = true;
  s.waveAt = 1e9;
  for (const t of s.towers) Object.assign(t, {x: 100, cd: 1e9});
  const p = s.makePlayer(side, bot);
  p.classId = side ? 3 : 4;
  p.stamina = 10000;
  const h = s.spawn(side, contractType(p.classId), 0, 1, 0);
  assert.ok(s.contract(p, h.id));
  Object.assign(h, {x: 0, y: 0, speed: 0, cd: 1e9, heat: 5});
  const enemy = s.spawn(1 - side, 'melee', 0, 1, 0);
  Object.assign(enemy, {x: 0, y: 3, speed: 0, cd: 1e9, hp: 1e9, maxHp: 1e9});
  h.targetId = enemy.id;
  return {s, p, h};
}

function pressureArena(config, count) {
  const result = arena(config, true, 1), {s} = result;
  s.npcPolicy = {mode: 'ratio', defense: 1, attack: 3};
  for (let i = 0; i < count; i++) {
    const player = s.makePlayer(0, false), unit = s.spawn(0, 'melee', 0, 1, i);
    player.classId = 0;
    assert.ok(s.contract(player, unit.id));
    Object.assign(unit, {x: i, y: -40, speed: 0, cd: 1e9});
  }
  return result;
}

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

for (const [name, config] of [['设计5', defaults], ['当前稿', createCurrentDesignConfig(defaults)]]) {
  test(`${name}：防守1对4、1对5逐步提升施法智能，其他AI和玩家保持原规则`, () => {
    for (const [attack, seconds, hesitation, random] of [[3, 4.5, .2, .5], [4, 4, 2/15, 1/3], [5, 3.5, 1/15, 1/6]]) {
      const {s, p} = pressureArena(config, attack), ai = s.botAiSettings(p);
      near(ai.castIntervalMultiplier * s.config.world.botCastInterval, seconds);
      near(ai.hesitationChance, hesitation);
      near(ai.randomSkillChance, random);
      assert.equal(s.botAiSettings({...p, bot: false}), BOT_AI);
      assert.equal(s.botAiSettings({...p, side: 0}), BOT_AI);
      const decisions = [];
      s.chooseAutoSkill = player => {assert.equal(player, p); decisions.push(s.time); return -1;};
      s.tick(seconds - .1);assert.deepEqual(decisions, []);
      s.tick(.2);assert.equal(decisions.length, 1);
    }
  });

  test(`${name}：人数劣势实际减少犹豫，回到完整比例后恢复普通AI`, () => {
    const {s, p} = pressureArena(config, 5);
    p.bot = false;
    const preferred = s.chooseAutoSkill(p);assert.ok(preferred >= 0);
    p.bot = true;
    const draws = [.1, .9];s.random = () => draws.shift();
    assert.equal(s.chooseAutoSkill(p), preferred);
    s.random = () => .1;
    s.npcPolicy.mode = 'off';
    assert.equal(s.chooseAutoSkill(p), -1);
    s.npcPolicy.mode = 'ratio';
    const extra = s.makePlayer(0, false), troop = s.spawn(0, 'melee', 0, 1, 0);
    extra.classId = 0;assert.ok(s.contract(extra, troop.id));
    const defender = s.spawn(1, 'melee', 0, 1, 0);defender.y = 30;
    balanceNpcHeroes(s);
    assert.deepEqual(s.botAiSettings(p), BOT_AI);
    assert.equal(s.chooseAutoSkill(p), -1);
  });

  test(`${name}：智能补偿按存活英雄数和自定义比例计算，并保留普通施法限制`, () => {
    const {s, p, h} = pressureArena(config, 5);
    const hp = h.hp, attack = h.attack;
    const profile = s.botAiSettings(p);
    s.units.find(u => u.hero && u.side === 0).hp = 0;
    assert.ok(s.botAiSettings(p).hesitationChance > profile.hesitationChance);
    s.npcPolicy = {mode: 'ratio', defense: 1, attack: 4};
    assert.deepEqual(s.botAiSettings(p), BOT_AI);
    s.npcPolicy.attack = 3;
    p.cd.fill(1e9);assert.equal(s.chooseAutoSkill(p), -1);
    p.cd.fill(0);p.stamina = 0;assert.equal(s.chooseAutoSkill(p), -1);
    assert.equal(h.hp, hp);assert.equal(h.attack, attack);
    for (const u of s.units.filter(u => u.hero && u.side === 0)) u.hp = 0;
    assert.deepEqual(s.botAiSettings(p), BOT_AI);
  });

  test(`${name}：NPC犹豫不产生施法消耗，玩家自动施法保持原选招`, () => {
    const {s, p} = arena(config, false);
    const preferred = s.chooseAutoSkill(p);
    assert.ok(preferred >= 0);
    s.random = () => {throw Error('玩家自动施法不应读取NPC随机决策');};
    assert.equal(s.chooseAutoSkill(p), preferred);
    p.bot = true;
    s.random = () => 0.1;
    const before = {stamina: p.stamina, cd: [...p.cd], casts: s.metrics.casts};
    assert.equal(s.chooseAutoSkill(p), -1);
    assert.deepEqual({stamina: p.stamina, cd: p.cd, casts: s.metrics.casts}, before);
    const draws = [0.8, 0.9];
    s.random = () => draws.shift();
    assert.equal(s.chooseAutoSkill(p), preferred);
  });

  test(`${name}：NPC可以使用非最优技能，但不选择冷却中的技能`, () => {
    const {s, p} = arena(config, false);
    const preferred = s.chooseAutoSkill(p);
    const alternative = [0, 1, 2, 3].find(i => i !== preferred && s.castPlan(i, p).ok);
    assert.notEqual(alternative, undefined);
    for (const i of [0, 1, 2, 3]) if (i !== alternative) p.cd[i] = 1e9;
    p.bot = true;
    const draws = [0.8, 0.1, 0.99];
    s.random = () => draws.shift();
    assert.equal(s.chooseAutoSkill(p), alternative);
    assert.ok(s.cast(alternative, p));
    p.cd.fill(1e9);
    s.random = () => {throw Error('没有可用技能不应随机选招');};
    assert.equal(s.chooseAutoSkill(p), -1);
  });

  test(`${name}：NPC每4.5秒决策，跳过仍等待整轮；玩家保持3秒`, () => {
    for (const bot of [true, false]) {
      const {s, p} = arena(config, bot);
      p.auto = true;
      const decisions = [];
      s.chooseAutoSkill = player => {assert.equal(player, p); decisions.push(s.time); return -1;};
      s.tick(3);
      assert.deepEqual(decisions, bot ? [] : [3]);
      s.tick(1.5);
      assert.deepEqual(decisions, bot ? [4.5] : [3]);
      if (bot) {
        s.tick(4);
        assert.deepEqual(decisions, [4.5]);
        s.tick(0.5);
        assert.deepEqual(decisions, [4.5, 9]);
      }
    }
  });

  test(`${name}：同一种子复现NPC选招且包含犹豫和不同技能`, () => {
    const a = arena(config), b = arena(config);
    const decisions = pair => Array.from({length: 100}, () => pair.s.chooseAutoSkill(pair.p));
    const first = decisions(a);
    assert.deepEqual(first, decisions(b));
    assert.ok(first.includes(-1));
    assert.ok(new Set(first.filter(i => i >= 0)).size > 1);
    for (const i of first.filter(i => i >= 0)) assert.ok(a.s.castPlan(i, a.p).ok);
  });
}

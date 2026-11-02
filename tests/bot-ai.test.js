import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults, contractType} from '../shared/config.js';
import {Simulation} from '../shared/simulation.js';
import {createCurrentDesignConfig} from '../shared/current-design.js';

function arena(config, bot = true) {
  const s = new Simulation(config, 123);
  s.units = [];
  s.player.retired = true;
  s.waveAt = 1e9;
  for (const t of s.towers) Object.assign(t, {x: 100, cd: 1e9});
  const p = s.makePlayer(0, bot);
  p.classId = 4;
  p.stamina = 10000;
  const h = s.spawn(0, contractType(4), 0, 1, 0);
  assert.ok(s.contract(p, h.id));
  Object.assign(h, {x: 0, y: 0, speed: 0, cd: 1e9, heat: 5});
  const enemy = s.spawn(1, 'melee', 0, 1, 0);
  Object.assign(enemy, {x: 0, y: 3, speed: 0, cd: 1e9, hp: 1e9, maxHp: 1e9});
  h.targetId = enemy.id;
  return {s, p};
}

for (const [name, config] of [['设计5', defaults], ['当前稿', createCurrentDesignConfig(defaults)]]) {
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

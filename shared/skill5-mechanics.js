import { scaleSkill4, chooseRandomTarget } from "./skill4-mechanics.js";
import { available, spend } from "./skill-value.js";
import {
  applyFlameShield,
  applyMovingFlameShield,
  tickLordScorch,
  segmentDistance,
} from "./lord-flame-shield.js";
import { manualTarget, enemyTarget, friendlyTarget } from "./manual-target.js";
export { scaleSkill4, chooseRandomTarget };
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (h, es) => es.sort((a, b) => d(h, a) - d(h, b) || a.id - b.id);
const priority = (h, es) =>
  es.sort(
    (a, b) =>
      (a.hero ? 0 : a.tower ? 2 : 1) - (b.hero ? 0 : b.tower ? 2 : 1) ||
      d(h, a) - d(h, b) ||
      a.id - b.id,
  );
const alive = (sim, ids) => ids.map((id) => sim.get(id)).filter(Boolean);
const prefer = (target, targets) =>
  target ? [target, ...targets.filter((u) => u.id !== target.id)] : targets;
const directedEnemy = (h, i) =>
  (h.classId === 0 && i === 0) ||
  h.classId === 2 ||
  (h.classId === 3 && i < 2) ||
  h.classId === 4 ||
  (h.classId === 5 && i === 0);
// Resolve support from the current selection, never from an older friendly lock.
// Automatic fallback only considers recipients valid for this support skill.
const supportTarget = (sim, h, i, s) => {
  const chosen = manualTarget(sim, h) || enemyTarget(sim, h);
  if (chosen?.side === h.side) return chosen;
  const victim = chosen && sim.get(chosen.targetId);
  if (victim?.side === h.side) return victim;
  return (
    sim
      .allies(h, s.targetRange)
      .filter((u) => i !== 1 || u.id !== h.id)
      .filter((u) => i !== 2 || sim.hasNegative(u))
      .sort((a, b) => a.hp - b.hp || d(h, a) - d(h, b) || a.id - b.id)[0] ||
    null
  );
};
const skillTarget = (sim, h, i, s) =>
  h.classId === 5 && i >= 1
    ? supportTarget(sim, h, i, s)
    : directedEnemy(h, i)
      ? enemyTarget(sim, h)
      : manualTarget(sim, h);
// Keep applicable explicit selections locked even when a nearer target exists.
export function skill5RangeFailure(sim, h, i, s) {
  const support = h.classId === 5 && i >= 1;
  const chosen = skillTarget(sim, h, i, s);
  if (directedEnemy(h, i) && !chosen)
    return { ok: false, code: "target", reason: "请选择敌方目标" };
  if (support) {
    const bad = (reason) => ({ ok: false, code: "wrong-target", reason });
    if (!chosen) return bad("范围内没有符合条件的己方目标");
    if (chosen.tower) return bad("该技能不能对建筑释放");
    if (i === 1 && chosen.id === h.id) return bad("共生链接不能选择自己");
    if (d(h, chosen) > s.targetRange + 1e-7)
      return { ok: false, code: "range", reason: "目标太远" };
    if (i === 2 && !sim.hasNegative(chosen))
      return bad("选中的友方目标没有可净化的负面状态");
  }
  if (!chosen) return null;
  const enemy = chosen.side !== h.side,
    other = chosen.id !== h.id && !chosen.tower;
  const applies = enemy
    ? h.classId === 0
      ? i === 0 || (i === 2 && chosen.hero)
      : h.classId === 2 ||
        h.classId === 4 ||
        (h.classId === 3 && i < 2) ||
        (h.classId === 5 && i === 0)
    : !chosen.tower &&
      (h.classId === 0
        ? i === 1 || (i === 2 && other)
        : h.classId === 5 && (i === 1 ? other : i === 2 || i === 3));
  return applies && d(h, chosen) > s.targetRange + 1e-7
    ? { ok: false, code: "range", reason: "目标太远" }
    : null;
}
export function selectSkill5(h, i, s) {
  const es = priority(h, this.enemies(h, s.targetRange)),
    all = this.allies(h, s.targetRange),
    current = this.get(h.targetId);
  const chosen = skillTarget(this, h, i, s),
    inRange = chosen && d(h, chosen) <= s.targetRange + 1e-7 ? chosen : null;
  const selected = inRange?.side !== h.side ? inRange : null,
    friend = inRange?.side === h.side && !inRange.tower ? inRange : null;
  const currentEnemy =
    current &&
    current.side !== h.side &&
    d(h, current) <= s.targetRange &&
    (current.id !== h.manualTargetId || selected)
      ? current
      : null;
  const bad = (reason) => ({ ok: false, code: "target", reason });
  let t = es[0],
    targets = [],
    selectedId = null;
  if (h.classId === 0) {
    if (i === 0) {
      t = selected || near(h, es)[0];
      if (!t) return bad("范围内没有重击目标");
      targets =
        s.targets > 1
          ? prefer(
              t,
              near(
                h,
                es.filter((u) => {
                  const a = d(h, u),
                    b = d(h, t);
                  return (
                    a < 1e-7 ||
                    b < 1e-7 ||
                    ((u.x - h.x) * (t.x - h.x) + (u.y - h.y) * (t.y - h.y)) /
                      (a * b) >=
                      Math.SQRT1_2
                  );
                }),
              ),
            ).slice(0, s.targets)
          : [t];
      selectedId = selected?.id;
    }
    if (i === 1) {
      t = h;
      targets = [
        h,
        ...prefer(
          friend?.id !== h.id ? friend : null,
          near(
            h,
            all.filter((u) => u.id !== h.id),
          ),
        ).slice(0, s.targets),
      ];
      selectedId = friend?.id;
    }
    if (i === 2) {
      if (friend && friend.id !== h.id) {
        if (!es.some((u) => u.hero && u.targetId === friend.id))
          return bad("手动友方目标未被范围内的敌方英雄攻击");
        t = friend;
        targets = [friend];
        selectedId = friend.id;
      } else {
        const enemy = selected?.hero
            ? selected
            : near(
                h,
                es.filter((u) => u.hero),
              )[0],
          victim = enemy && this.get(enemy.targetId);
        if (
          !victim ||
          victim.tower ||
          victim.side !== h.side ||
          victim.id === h.id
        )
          return bad(
            selected?.hero
              ? "手动目标没有可换位的己方攻击目标"
              : "最近敌方英雄没有可换位的己方攻击目标",
          );
        t = victim;
        targets = [victim];
        selectedId = selected?.hero ? selected.id : null;
      }
    }
    if (i === 3) t = h;
  } else if (h.classId === 2) {
    t = selected || currentEnemy || t;
    if (!t) return bad("炮击范围内没有目标");
    selectedId = selected?.id;
  } else if (h.classId === 3) {
    if (i === 0) {
      t = selected || t;
      if (!t) return bad("前方没有敌人");
      const len = d(t, h),
        dx = len ? (t.x - h.x) / len : 0,
        dy = len ? (t.y - h.y) / len : h.side ? -1 : 1;
      targets = prefer(
        selected,
        es.filter(
          (u) =>
            d(h, u) < 1e-7 ||
            ((u.x - h.x) * dx + (u.y - h.y) * dy) / d(h, u) >= 0.35,
        ),
      ).slice(0, s.targets);
      selectedId = selected?.id;
    }
    if (i === 1) {
      t = selected || es.sort((a, b) => d(h, b) - d(h, a) || a.id - b.id)[0];
      if (!t) return bad("冲锋范围内没有目标");
      selectedId = selected?.id;
    }
    if (i >= 2) t = h;
  } else if (h.classId === 4) {
    if (i === 0 || i === 2) {
      t = selected || near(h, es)[0];
      targets = t
        ? [
            t,
            ...near(
              t,
              es.filter((u) => u.id !== t.id && d(t, u) <= 3),
            ).slice(0, (s.targets || 1) - 1),
          ]
        : [];
    }
    if (i === 1) t = selected || currentEnemy || t;
    if (i === 3) {
      targets = prefer(
        selected,
        es.sort((a, b) => a.hp - b.hp || d(h, a) - d(h, b) || a.id - b.id),
      ).slice(0, s.targets + Math.floor((h.heat || 0) / s.heatStep));
      t = targets[0];
    }
    selectedId = selected?.id;
    if (!t) return bad("范围内没有可攻击目标");
  } else if (h.classId === 5) {
    if (i === 0) {
      t = selected || currentEnemy || t;
      if (!t) return bad("范围内没有灵息冲击目标");
      const ally = friendlyTarget(this, h);
      selectedId =
        ally && !ally.tower && d(t, ally) <= s.radius + 1e-7
          ? ally.id
          : selected?.id;
    }
    if (i === 1) {
      t =
        friend && friend.id !== h.id
          ? friend
          : all
              .filter((u) => u.id !== h.id)
              .sort(
                (a, b) => a.hp - b.hp || d(h, a) - d(h, b) || a.id - b.id,
              )[0];
      if (!t) return bad("范围内没有其他友军可链接");
      selectedId = t.id === friend?.id ? friend.id : null;
    }
    if (i === 2) {
      const candidates = near(
        h,
        all.filter((u) => this.hasNegative(u)),
      );
      targets = prefer(
        candidates.find((u) => u.id === friend?.id),
        candidates,
      ).slice(0, s.targets);
      t = h;
      if (!targets.length) return bad("没有需要净化的友军");
      selectedId = targets.find((u) => u.id === friend?.id)?.id;
    }
    if (i === 3) {
      targets = [
        h,
        ...prefer(
          friend?.id !== h.id ? friend : null,
          all
            .filter((u) => u.id !== h.id)
            .sort(
              (a, b) =>
                a.hp / a.maxHp - b.hp / b.maxHp ||
                d(h, a) - d(h, b) ||
                a.id - b.id,
            ),
        ).slice(0, s.targets),
      ];
      t = h;
      if (!targets.some((u) => u.hp < u.maxHp) && !this.rank(h, "E15"))
        return bad("没有需要治疗的友军");
      selectedId = friend?.id;
    }
  } else return bad("该职业不在本版职业表中");
  return {
    ok: true,
    t,
    targets,
    randomChoices: [],
    manualTargetId: selectedId ?? null,
  };
}

const piercingTargetCount = (sim, h, at) => {
  const length = d(h, at) || 1,
    end = {
      x: h.x + ((at.x - h.x) / length) * 12,
      y: h.y + ((at.y - h.y) / length) * 12,
    };
  return sim.enemies(h).filter((u) => segmentDistance(u, h, end) <= 2 + 1e-7)
    .length;
};
const targetsAt = (sim, h, at, radius, limit, first = null) =>
  prefer(first, near(at, sim.enemies({ ...at, side: h.side }, radius))).slice(
    0,
    limit,
  );
const hit = (sim, h, s, u, power = s.power, scale = 1, extra = {}) =>
  sim.damage(
    h,
    u,
    ((s.value.attack * power) / 100) * (1 + (s.bonusDamage || 0)) * scale,
    false,
    false,
    {
      value: s.value,
      remote: ![0, 3].includes(h.classId),
      explosive:
        h.classId === 4 &&
        s.skill === 0 &&
        !!(s.ranks?.F04 ?? sim.rank(h, "F04")),
      bonus: s.bonusDamage || 0,
      ...extra,
    },
  );
const applyBurn = (sim, h, s, u, type, power, duration, extra = {}) =>
  sim.dot(h, u, type, { ...s, power, ...extra }, duration);
export function resolveSkill5(h, i, s, locked, ids = [], extra = {}) {
  const t = locked && this.get(locked.id),
    at = t || locked || h,
    A = s.value.attack,
    targets = alive(this, ids),
    r = (id) => s.ranks?.[id] ?? this.rank(h, id);
  const event = this.visual("release", h, at, {
    skill: i,
    targets: targets.map((u) => ({ id: u.id, x: u.x, y: u.y })),
    haloTargets: targets.map((u) => ({ id: u.id })),
    until: this.time + 1,
  });
  const guard = (u, kind, ratio, duration, more = {}) =>
    this.guard(u, h, kind, ratio, duration, more);
  if (h.classId === 0) {
    if (i === 0) {
      let total = 0;
      for (let j = 0; j < targets.length; j++) {
        const u = targets[j];
        total += hit(this, h, s, u, s.power, ids.indexOf(u.id) > 0 ? 0.3 : 1);
        this.debuff(u, h, "vulnerable", r("O02") * 0.05, 4, s.value);
      }
      if (r("O03"))
        this.shield(
          h,
          Math.min(h.maxHp * 0.3, total * 0.2 * r("O03")),
          h,
          6,
          s.value,
        );
    }
    if (i === 1)
      for (const u of targets) {
        guard(u, "orcWarcry", s.damageReduction, s.duration, {
          reflect: r("O08") ? 0.2 : 0,
        });
        if (r("O07")) this.haste(u, "orcWarcry", r("O07") * 0.12, s.duration);
      }
    if (i === 2 && t && !t.tower && t.side === h.side) {
      const old = { x: h.x, y: h.y };
      this.interrupt(t);
      this.moveUnit(h, t.x, t.y);
      this.moveUnit(t, old.x, old.y);
      guard(h, "orcRescue", s.damageReduction, s.duration);
      this.heal(t, A * 1.5 * r("O10"), h, s.value);
      if (r("O11")) this.explode(h, h, 3, 3, A * 2 * r("O11"), s.value);
      if (r("O12"))
        for (const u of targetsAt(this, h, h, 3, 5))
          if (!u.tower && !(u.immuneUntil > this.time)) {
            this.interrupt(u);
            u.tauntId = h.id;
            u.tauntUntil = this.time + 1.5;
          }
      event.swapFrom = old;
      event.to = { x: h.x, y: h.y };
    }
    if (i === 3) {
      h.damageStore = {
        until: this.time + s.duration,
        total: 0,
        shieldDuration: s.shieldDuration,
        conversionRatio: 1,
        value: s.value,
        friends: near(
          h,
          this.allies(h, 5).filter((u) => u.id !== h.id),
        )
          .slice(0, 4)
          .map((u) => u.id),
        burst: r("O15") * 0.1,
        share: r("O14") * 0.1,
      };
      if (r("O13")) this.shield(h, h.maxHp * 0.05 * r("O13"), h, 5, s.value);
      if (r("O16")) h.immortalUntil = this.time + 5;
    }
  }
  if (h.classId === 2) {
    if (i === 2) {
      h.channelUntil = this.time + s.duration;
      this.fields.push({
        kind: "runeBarrage",
        owner: h,
        x: at.x,
        y: at.y,
        side: h.side,
        s,
        preferredTargetId: t?.id,
        remaining: s.shots,
        index: 0,
        start: this.time,
        until: h.channelUntil,
        tick: this.time + 0.75,
      });
    } else
      this.projectiles.push({
        id: this.nextProjectileId++,
        source: h,
        sourceId: h.id,
        targetId: t?.id,
        x: h.x,
        y: h.y,
        tx: at.x,
        ty: at.y,
        power: 0,
        basic: false,
        skillId: i,
        payload: { ...s, skill: i, design5: true, preferredTargetId: t?.id },
      });
  }
  if (h.classId === 3) {
    if (i === 0) {
      for (const u of targets) {
        hit(this, h, s, u);
        this.debuff(u, h, "moveSlow", r("L03") * 0.15, 3, s.value);
      }
      if (r("L04")) {
        const origin = { x: h.x, y: h.y },
          direction = { x: at.x - h.x, y: at.y - h.y };
        this.jobs.push({
          at: this.time + 0.45,
          run: () => {
            for (const u of alive(this, ids)) {
              const distance = d(origin, u),
                len = Math.hypot(direction.x, direction.y) || 1;
              if (
                distance > s.targetRange + 1e-7 ||
                (distance > 1e-7 &&
                  ((u.x - origin.x) * direction.x +
                    (u.y - origin.y) * direction.y) /
                    (distance * len) <
                    0.35)
              )
                continue;
              hit(this, h, s, u, s.power, 0.6);
              if (!u.tower && !(u.immuneUntil > this.time)) {
                const len = d(origin, u) || 1;
                this.interrupt(u);
                this.moveUnit(
                  u,
                  u.x + ((origin.x - u.x) / len) * Math.min(2, len),
                  u.y + ((origin.y - u.y) / len) * Math.min(2, len),
                );
              }
            }
            this.visual("release", h, origin, {
              skill: 0,
              until: this.time + 0.6,
            });
          },
        });
      }
    }
    if (i === 1 && locked) {
      const end = { x: at.x, y: at.y },
        length = d(h, end),
        duration = Math.max(0.1, length / s.dashSpeed);
      h.dash = {
        x: h.x,
        y: h.y,
        end,
        start: this.time,
        until: this.time + duration,
        s,
        preferredTargetId: extra.manualTargetId,
        hit: [],
      };
      this.visual("charge", h, end, { skill: 1, until: h.dash.until });
    }
    if (i === 2) {
      guard(h, "lordFlame", s.damageReduction, s.duration);
      this.fields.push({
        kind: "lordBurn",
        owner: h,
        x: h.x,
        y: h.y,
        side: h.side,
        s,
        until: this.time + s.duration,
      });
      applyFlameShield(this, this.fields.at(-1));
    }
    if (i === 3) {
      this.cleanse(h);
      h.immuneUntil = this.time + s.duration;
      h.lordUlt = { until: this.time + s.duration, s };
      if (r("L14")) this.shield(h, h.maxHp * 0.025 * r("L14"), h, 8, s.value);
    }
  }
  if (h.classId === 4) {
    if (i === 0) {
      for (const u of targets) {
        hit(this, h, s, u);
        if (r("F02")) applyBurn(this, h, s, u, "fireBurn", 40 * r("F02"), 4);
      }
      if (t && r("F03"))
        for (const u of targetsAt(this, h, t, 3, r("F03") + 1, t).filter(
          (u) => u.id !== t.id,
        )) {
          hit(this, h, s, u, s.power, 0.35);
          if (r("F02"))
            applyBurn(this, h, s, u, "fireBurn", 40 * r("F02") * 0.35, 4);
        }
      this.addHeat(h, 1);
    }
    if (i === 1 && t) {
      const hot = (h.heat || 0) >= s.heatThreshold,
        es = hot ? targetsAt(this, h, t, s.radius, s.targets + 1, t) : [t],
        isolated =
          hot &&
          (r("F08") ? piercingTargetCount(this, h, at) === 1 : es.length === 1);
      const fire = {
        ...s,
        power: hot ? s.hotPower : s.power,
        bonusDamage: s.bonusDamage + (isolated ? r("F06") * 0.3 : 0),
      };
      if (hot && r("F08")) {
        const len = d(h, at) || 1;
        this.fields.push({
          kind: "piercingFire",
          owner: h,
          s: fire,
          x: h.x,
          y: h.y,
          dx: (at.x - h.x) / len,
          dy: (at.y - h.y) / len,
          travel: 0,
          primaryId: t.id,
          hits: {},
          until: this.time + 3,
          start: this.time,
          last: this.time,
        });
      } else {
        hit(this, h, fire, t);
        if (hot) {
          event.bigFireball = true;
          for (const u of es.filter((u) => u.id !== t.id))
            hit(this, h, s, u, s.splashPower);
        }
      }
    }
    if (i === 2)
      for (let j = 0; j < targets.length; j++) {
        const u = targets[j],
          scale = ids.indexOf(u.id) > 0 ? 0.3 : 1;
        u.soulMarks ??= [];
        u.soulMarks = u.soulMarks.filter((m) => m.ownerId !== h.id);
        u.soulMarks.push({
          ownerId: h.id,
          until: this.time + s.duration,
          heat: 2,
          attack: A,
          bonus: s.bonusDamage,
          scale,
          explode: !!r("F12"),
          value: s.value,
        });
        this.debuff(u, h, "vulnerable", r("F10") * 0.05, 5, s.value);
        hit(this, h, s, u, s.power, scale);
      }
    if (i === 3) {
      const consumed = Math.min(h.heat || 0, extra.heat || 0);
      h.heat = Math.max(0, (h.heat || 0) - consumed);
      this.heatBoost(h, consumed);
      const full = 1 + Math.floor((extra.heat || 0) / s.heatStep);
      for (let j = 0; j < targets.length; j++) {
        const u = targets[j];
        hit(this, h, s, u, s.power, ids.indexOf(u.id) < full ? 1 : 0.15);
        if (
          u.hp > 0 &&
          !u.tower &&
          r("F16") &&
          u.hp / u.maxHp <= 0.12 &&
          !(u.immortalUntil > this.time)
        )
          this.damage(
            h,
            u,
            u.hp * (1 + Math.max(0, u.armor || 0) / 100) * 5,
            false,
            false,
            { value: s.value, execute: true },
          );
        if (u.hp <= 0 && r("F15")) this.addHeat(h, r("F15"));
      }
    }
  }
  if (h.classId === 5) {
    const pulse = (u, scale) => {
      hit(this, h, s, u, s.power, scale);
      this.debuff(u, h, "vulnerable", r("E03") * 0.1, 4, s.value);
      const cs = near(u, this.allies({ ...u, side: h.side }, s.radius));
      for (const v of prefer(
        cs.find((v) => v.id === extra.manualTargetId),
        cs,
      ).slice(0, s.targets))
        this.heal(v, ((A * s.healPower) / 100) * scale, h, s.value);
    };
    if (i === 0 && t) {
      pulse(t, 1);
      if (r("E04")) {
        const second = targetsAt(this, h, t, 3, 2, t).find(
          (u) => u.id !== t.id,
        );
        if (second) pulse(second, 0.6);
      }
    }
    if (i === 1 && t) {
      this.fields = this.fields.filter(
        (f) => !(f.kind === "link" && f.owner.id === h.id),
      );
      const friends = prefer(
        t,
        near(
          h,
          this.allies(h, s.targetRange).filter((u) => u.id !== h.id),
        ),
      ).slice(0, s.targets);
      friends.forEach((u, j) => {
        this.fields.push({
          kind: "link",
          owner: h,
          host: u.id,
          x: h.x,
          y: h.y,
          until: this.time + s.duration,
          shareRatio: j ? 0.25 : s.shareRatio,
          value: s.value,
        });
        if (r("E05")) guard(u, "elfLink", r("E05") * 0.03, s.duration);
        if (r("E07")) this.haste(u, "elfLink", r("E07") * 0.12, s.duration);
      });
      h.linkId = t.id;
      h.linkUntil = this.time + s.duration;
      if (r("E08"))
        this.fields.push({
          kind: "linkRegen",
          owner: h,
          s,
          until: this.time + s.duration,
          tick: this.time + 1,
        });
    }
    if (i === 2 && targets.length) {
      h.hp = Math.max(1, h.hp * (1 - s.hpCost));
      let count = 0;
      for (const u of targets) {
        const removed = this.cleanse(u);
        count += removed;
        if (removed && r("E12"))
          Object.assign(u, {
            healingBoost: 0.2,
            healingBoostUntil: this.time + 8,
          });
      }
      if (count && r("E11")) {
        h.cleanseBoostStacks = Math.min(
          5,
          (h.boostUntil > this.time ? h.cleanseBoostStacks || 0 : 0) + count,
        );
        Object.assign(h, {
          attackBoost: h.cleanseBoostStacks * 0.02 * r("E11"),
          boostUntil: this.time + 8,
        });
      }
    }
    if (i === 3) {
      const circles = [];
      for (const u of targets) {
        const actual = this.heal(u, (A * s.power) / 100, h, s.value);
        if (actual > 0 && r("E16"))
          circles.push({ at: { x: u.x, y: u.y }, actual });
      }
      const damage = new Map();
      for (const c of circles)
        for (const u of this.enemies({ ...c.at, side: h.side }, 3)
          .sort((a, b) => d(c.at, a) - d(c.at, b))
          .slice(0, 3)) {
          if (!damage.has(u.id)) damage.set(u.id, []);
          damage.get(u.id).push(c.actual * 0.4);
        }
      for (const [id, amounts] of damage)
        this.damage(
          h,
          this.get(id),
          amounts
            .sort((a, b) => b - a)
            .slice(0, 3)
            .reduce((a, b) => a + b, 0),
          false,
          false,
          { value: s.value, proc: true },
        );
    }
  }
}
export function impactSkill4(b) {
  const s = b.payload,
    h = b.source,
    t = this.get(b.targetId),
    at = { x: b.tx, y: b.ty, side: h.side },
    r = (id) => s.ranks?.[id] ?? this.rank(h, id),
    es =
      s.skill === 3
        ? targetsAt(this, h, at, s.radius, s.targets, t)
        : t
          ? [t]
          : [];
  this.visual("impact", h, at, {
    skill: s.skill,
    targets: es.map((u) => ({ id: u.id, x: u.x, y: u.y })),
    haloTargets: es.map((u) => ({ id: u.id })),
    until: this.time + 0.8,
  });
  if (s.skill === 0 && t) {
    const all = targetsAt(this, h, t, 4, s.targets, t).filter(
      (u) => u.id === t.id || d(h, u) <= s.targetRange + 1e-7,
    );
    all.forEach((u, j) =>
      applyBurn(this, h, s, u, "corrosion", 0, s.duration, {
        uncleansable: !!r("C04"),
        scale: j ? 0.35 : 1,
      }),
    );
  }
  if (s.skill === 1 && t) {
    hit(this, h, s, t);
    this.debuff(
      t,
      h,
      "attackSpeedDown",
      s.attackSpeedDown,
      s.duration,
      s.value,
    );
    if (r("C07")) this.haste(h, "runeFrost", r("C07") * 0.15, 8);
    if (r("C08"))
      for (const u of targetsAt(this, h, at, 3, 4, t).filter(
        (u) => u.id !== t.id,
      ))
        hit(this, h, s, u, s.power, 0.25);
  }
  if (s.skill === 3) {
    for (const u of es) {
      hit(this, h, s, u);
      if (u.hp > 0 && !u.tower && !(u.immuneUntil > this.time)) {
        const old = { x: u.x, y: u.y },
          len = d(h, u) || 1;
        this.interrupt(u);
        this.moveUnit(
          u,
          u.x + ((u.x - h.x) / len) * s.knockback,
          u.y + ((u.y - h.y) / len) * s.knockback,
        );
        if (r("C15")) hit(this, h, s, u, d(old, u) * 75 * r("C15"));
      }
    }
    if (r("C16")) {
      const center = { x: t?.x ?? at.x, y: t?.y ?? at.y };
      this.jobs.push({
        at: this.time + 0.5,
        run: () =>
          this.explode(
            h,
            center,
            3,
            5,
            s.value.attack * 6 * (1 + s.bonusDamage),
            s.value,
          ),
      });
    }
  }
}
export function processSkill5Effects() {
  for (const f of [...this.fields]) {
    const h = f.owner,
      s = f.s;
    if (f.kind === "link") {
      if (!this.get(f.host) || h.hp <= 0) f.until = this.time;
      continue;
    }
    if (f.kind === "lordBurn") {
      if (h.hp <= 0) f.until = this.time;
      else applyFlameShield(this, f);
      continue;
    }
    if (f.kind === "linkRegen") {
      if (
        h.hp <= 0 ||
        !this.fields.some(
          (g) =>
            g.kind === "link" &&
            g.owner.id === h.id &&
            g.until > this.time &&
            this.get(g.host),
        )
      ) {
        f.until = this.time;
        continue;
      }
      while (f.tick <= this.time + 1e-7 && f.tick <= f.until + 1e-7) {
        f.tick++;
        this.heal(h, s.value.attack * 0.8, h, s.value);
      }
      continue;
    }
    if (f.kind === "dot") {
      const u = this.get(f.host);
      if (!u) {
        f.until = this.time;
        continue;
      }
      while (f.tick <= this.time + 1e-7 && f.tick <= f.until + 1e-7) {
        f.tick++;
        if (u.immuneUntil > this.time) continue;
        if (f.type === "corrosion")
          this.damage(
            h,
            u,
            Math.min(
              u.maxHp * s.percentMaxHp,
              (s.value.attack * s.tickCapPower) / 100,
            ) *
              (s.scale || 1) *
              (1 + (s.bonusDamage || 0)),
            false,
            false,
            { value: s.value },
          );
        else {
          hit(this, h, s, u);
          if (f.type === "lordScorch")
            this.debuff(
              u,
              h,
              "attackDown",
              (s.ranks?.L11 ?? this.rank(h, "L11")) * 0.1,
              Math.max(0, f.until - this.time),
              s.value,
            );
        }
        if (u.hp <= 0) break;
      }
      continue;
    }
    if (f.kind === "piercingFire") {
      const dt = Math.max(0, this.time - f.last),
        from = { x: f.x, y: f.y };
      f.last = this.time;
      const step = Math.min(12 - f.travel, dt * 4);
      f.x += f.dx * step;
      f.y += f.dy * step;
      f.travel += step;
      for (const u of priority(
        f,
        this.enemies({ ...f, side: h.side }).filter(
          (u) => segmentDistance(u, from, f) <= 2,
        ),
      )) {
        let state = f.hits[u.id];
        if (!state && Object.keys(f.hits).length >= 5) continue;
        if (!state) state = f.hits[u.id] = { count: 0, next: 0 };
        if (state.count >= 3 || state.next > this.time) continue;
        hit(
          this,
          h,
          s,
          u,
          s.power,
          (u.id === f.primaryId ? 1 : 0.25) * (state.count ? 0.15 : 1),
        );
        state.count++;
        state.next = this.time + 0.75;
        this.visual("impact", h, u, {
          skill: 1,
          bigFireball: true,
          until: this.time + 0.5,
        });
      }
      if (f.travel >= 12) f.until = this.time;
      continue;
    }
    if (f.kind !== "runeBarrage") continue;
    if (h.hp <= 0 || (h.channelUntil < this.time - 1e-7 && f.remaining > 1)) {
      f.until = this.time;
      continue;
    }
    while (
      f.tick <= this.time + 1e-7 &&
      f.tick <= f.until + 1e-7 &&
      f.remaining > 0
    ) {
      f.tick += 0.75;
      const candidates = near(
          f,
          this.enemies({ ...f, side: h.side }, s.radius),
        ),
        es = prefer(
          candidates.find((u) => u.id === f.preferredTargetId),
          candidates,
        ).slice(0, s.targets);
      for (let j = 0; j < es.length; j++) {
        const u = es[j];
        hit(
          this,
          h,
          s,
          u,
          s.power,
          (j ? 0.35 : 1) *
            (1 + f.index * 0.18 * (s.ranks?.C11 ?? this.rank(h, "C11"))),
        );
        if (u.hp > 0) {
          const old = u.debuffs?.[h.id + ":moveSlow"],
            stacks = Math.min(
              s.slowCap,
              old?.until > this.time ? (old.stacks || 1) + 1 : 1,
            );
          if (
            this.debuff(
              u,
              h,
              "moveSlow",
              s.slowPerStack * stacks,
              s.slowDuration,
              s.value,
              true,
            )
          )
            u.debuffs[h.id + ":moveSlow"].stacks = stacks;
        }
      }
      if (es.length) f.index++;
      this.visual("impact", h, f, {
        skill: 2,
        targets: es.map((u) => ({ id: u.id, x: u.x, y: u.y })),
        until: this.time + 0.6,
      });
      if (--f.remaining <= 0) break;
    }
  }
  this.fields = this.fields.filter((f) => f.until > this.time);
}
export function updateSkill5Unit(u) {
  if (u.heatUntil <= this.time) u.heat = 0;
  if (u.soulMarks)
    u.soulMarks = u.soulMarks.filter((m) => m.until >= this.time);
  if (u.guards) u.guards = u.guards.filter((g) => g.until > this.time);
  if (u.summoned && u.expiresAt <= this.time) {
    u.hp = 0;
    return true;
  }
  if (u.shieldUntil <= this.time) u.shield = 0;
  if (u.damageStore && u.damageStore.until <= this.time) {
    const f = u.damageStore;
    u.damageStore = null;
    this.shield(u, f.total, u, f.shieldDuration, f.value);
    if (f.burst) this.explode(u, u, 4, 5, f.total * f.burst, f.value);
    this.visual("release", u, u, {
      skill: 3,
      until: this.time + 1,
      shieldFormed: true,
    });
  }
  if (u.dash) {
    const p = u.dash,
      k = Math.min(1, (this.time - p.start) / (p.until - p.start)),
      from = { x: u.x, y: u.y };
    this.moveUnit(u, p.x + (p.end.x - p.x) * k, p.y + (p.end.y - p.y) * k);
    applyMovingFlameShield(this, u, from);
    const preferred = this.get(p.preferredTargetId),
      reserve = preferred && !preferred.tower && !p.hit.includes(preferred.id),
      contacts = priority(
        u,
        this.enemies(u).filter(
          (e) => segmentDistance(e, from, u) <= p.s.radius + 1e-7,
        ),
      );
    for (const e of prefer(
      contacts.find((e) => e.id === p.preferredTargetId),
      contacts,
    ))
      if (!e.tower && !p.hit.includes(e.id) && p.hit.length < p.s.targets) {
        if (
          reserve &&
          e.id !== preferred.id &&
          !p.hit.includes(preferred.id) &&
          p.hit.length >= p.s.targets - 1
        )
          continue;
        p.hit.push(e.id);
        hit(this, u, p.s, e);
      }
    if (k === 1) {
      if (p.s.ranks?.L08 ?? this.rank(u, "L08"))
        for (const id of p.hit) {
          const e = this.get(id);
          if (e && !e.tower && !(e.immuneUntil > this.time)) {
            this.interrupt(e);
            this.moveUnit(e, u.x, u.y);
          }
        }
      u.dash = null;
    }
    return true;
  }
  return false;
}
export function chooseSkill5(p) {
  const h = this.hero(p);
  if (!h) return -1;
  const choices = [];
  for (let i = 0; i < 4; i++) {
    const plan = this.castPlan(i, p);
    if (!plan.ok) continue;
    let score = 2 + plan.targets.length;
    if (h.classId === 0 && (i === 1 || i === 3))
      score = this.enemies(h, 8).length ? 7 : 0;
    if (h.classId === 4 && i === 3) score = (h.heat || 0) >= 4 ? 10 : 1;
    if (h.classId === 5 && i === 3)
      score =
        plan.targets.reduce((n, u) => n + 1 - u.hp / u.maxHp, 0) > 1 ? 10 : 0;
    if (score > 0) choices.push({ i, score });
  }
  return choices.sort((a, b) => b.score - a.score)[0]?.i ?? -1;
}

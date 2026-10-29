const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const ELITE_BUFFS = {
  hunt: { name: "狩猎恢复", description: "击杀非召唤单位恢复2%最大生命" },
  assault: { name: "强袭", description: "攻击力提高20%" },
  arcane: {
    name: "奥术涌动",
    description: "新施法冷却缩短15%，技能伤害提高10%",
  },
  fortitude: { name: "坚韧", description: "受到伤害降低15%" },
};
export const traitEffects = {
  heatBoost(h, n) {
    if (n <= 0 || !this.rank(h, "F18")) return;
    h.heatBoostStacks = Math.min(
      10,
      (h.heatBoostUntil > this.time ? h.heatBoostStacks || 0 : 0) + n,
    );
    h.heatBoostUntil = this.time + 5;
  },
  afterDamage(a, t, sum, basic, reflected, meta) {
    if (
      !reflected &&
      !a?.summoned &&
      a?.hp > 0 &&
      a.lordUlt?.until > this.time &&
      (a.lordUlt.s.ranks?.L15 ?? this.rank(a, "L15"))
    )
      this.heal(
        a,
        sum * 0.08 * (a.lordUlt.s.ranks?.L15 ?? this.rank(a, "L15")),
        a,
      );
    if (!reflected && a?.hp > 0 && a.side !== t.side) {
      const reflect = Math.max(
        0,
        ...(t.guards || [])
          .filter((g) => g.until > this.time)
          .map((g) => g.reflect || 0),
      );
      if (reflect)
        this.damage(t, a, sum * reflect, false, true, { remote: false });
    }
    for (const h of this.units)
      if (
        h.hp > 0 &&
        h.id !== t.id &&
        h.side === t.side &&
        h.damageStore?.until > this.time &&
        near(h, t) <= 5 &&
        h.damageStore.friends.includes(t.id)
      )
        h.damageStore.total = Math.min(
          h.maxHp * 0.6,
          h.damageStore.total +
            sum * (h.damageStore.share ?? this.rank(h, "O14") * 0.1),
        );
    if (t.hp > 0 && t.classId === 0 && this.rank(t, "O17")) {
      t.cleanseDamage = (t.cleanseDamage || 0) + sum;
      if (
        this.time >= (t.cleanseReady || 0) &&
        t.cleanseDamage >= t.maxHp * (0.45 - 0.05 * this.rank(t, "O17"))
      ) {
        t.cleanseDamage = 0;
        t.cleanseReady = this.time + 3;
        this.cleanse(t);
      }
    }
    if (t.hp > 0 && t.classId === 3 && this.rank(t, "L18")) {
      t.guardDamage = (t.guardDamage || 0) + sum;
      if (this.time >= (t.guardReady || 0) && t.guardDamage >= t.maxHp * 0.2) {
        t.guardDamage = 0;
        t.guardReady = this.time + 3;
        this.guard(t, t, "lordEndurance", 0.03 * this.rank(t, "L18"), 3);
      }
    }
  },
  afterHeal(h, t, actual, overheal, value) {
    if (h?.classId !== 5 || !value || value.classId !== 5) return;
    if (
      value.skill === 3 &&
      overheal > 0 &&
      (value.ranks?.E15 ?? this.rank(h, "E15"))
    )
      this.shield(
        t,
        Math.min(
          t.maxHp * 0.25,
          overheal * 0.3 * (value.ranks?.E15 ?? this.rank(h, "E15")),
        ),
        h,
        8,
        value,
      );
    const rank = value.ranks?.E17 ?? this.rank(h, "E17");
    if (!rank || actual <= 0) return;
    h.healCounter = (h.healCounter || 0) + actual;
    const threshold = value.attack * 20;
    while (h.healCounter >= threshold && (value.healProcs || 0) < 3) {
      const enemy = this.enemies(h, 10).sort(
        (a, b) => near(h, a) - near(h, b) || a.id - b.id,
      )[0];
      if (!enemy) break;
      h.healCounter -= threshold;
      value.healProcs = (value.healProcs || 0) + 1;
      this.damage(h, enemy, value.attack * rank, false, false, {
        value,
        proc: true,
      });
    }
    // Keep fractional progress only; capped or unavailable procs cannot be banked.
    if (h.healCounter >= threshold) h.healCounter %= threshold;
  },
  onKill(h, t, summonedKill = false) {
    const p = this.players[h.playerId];
    if (p && !t.tower && !t.summoned)
      this.addXp(
        p,
        t.hero ? this.config.world.heroKillXp : this.config.world.minionKillXp,
        h.classId,
      );
    if (h.hp <= 0 || t.tower || t.summoned || h.side === t.side) return;
    if (h.eliteBuffs?.hunt > this.time) this.heal(h, h.maxHp * 0.02, h);
    if (this.rank(h, "L17")) {
      h.minionKills = (h.minionKills || 0) + (t.hero ? 0 : 1);
      if (t.hero || h.minionKills >= 4) {
        if (!t.hero) h.minionKills -= 4;
        this.heal(h, h.maxHp * 0.005 * this.rank(h, "L17"), h);
      }
    }
    if (
      !summonedKill &&
      h.lordUlt?.until > this.time &&
      (h.lordUlt.s.ranks?.L16 ?? this.rank(h, "L16")) &&
      this.units.filter((u) => u.summoned && u.ownerId === h.id && u.hp > 0)
        .length < 6
    ) {
      this.summonOwners.set(h.id, h);
      const u = this.spawn(h.side, "melee", 0, 1, h.x);
      Object.assign(u, {
        x: h.x,
        y: h.y,
        summoned: true,
        ownerId: h.id,
        expiresAt: this.time + 10,
        hp: h.maxHp * 0.05,
        maxHp: h.maxHp * 0.05,
        attack: this.attackPower(h) * 0.5,
        interval: 1.5,
        range: 1.5,
        speed: 2,
        deploying: false,
      });
    }
    if (t.elite) {
      const keys = Object.keys(ELITE_BUFFS),
        buff = keys[Math.floor(this.random() * keys.length)];
      h.eliteBuffs ??= {};
      h.eliteBuffs[buff] = this.time + 30;
      const text =
        p.name +
        " 击杀精英，获得「" +
        ELITE_BUFFS[buff].name +
        "」30秒：" +
        ELITE_BUFFS[buff].description;
      this.battleEvents ??= [];
      this.battleEvents.unshift({
        id: ++this.battleEventId,
        time: this.time,
        text,
        buff,
        heroId: h.id,
        until: this.time + 6,
      });
      this.battleEvents.length = Math.min(100, this.battleEvents.length);
      this.log(text);
      this.visual("eliteReward", h, h, { until: this.time + 1.5, buff });
    }
  },
  onUnitDeath(t) {
    const killed = t.lethalSkill;
    if (killed?.explosive) {
      const h = this.get(killed.ownerId);
      if (h)
        this.explode(
          h,
          t,
          3,
          3,
          killed.attack * 2 * (1 + killed.bonus),
          killed.value,
        );
    }
    for (const mark of t.soulMarks || [])
      if (mark.until >= this.time) {
        const h = this.get(mark.ownerId);
        if (h) {
          this.addHeat(h, mark.heat || 2);
          if (mark.explode)
            this.explode(
              h,
              t,
              3,
              3,
              mark.attack * 2 * (1 + mark.bonus) * mark.scale,
              mark.value,
            );
        }
      }
    for (const f of [...this.fields])
      if (
        f.kind === "dot" &&
        f.host === t.id &&
        f.type === "lordScorch" &&
        f.until >= this.time &&
        !f.s.spread &&
        (f.s.ranks?.L12 ?? this.rank(f.owner, "L12"))
      ) {
        const target = this.enemies({ ...t, side: f.owner.side }, 3)
          .filter(
            (u) =>
              !this.fields.some(
                (g) =>
                  g.kind === "dot" &&
                  g.type === "lordScorch" &&
                  g.owner.id === f.owner.id &&
                  g.host === u.id &&
                  g.until > this.time,
              ),
          )
          .sort((a, b) => near(t, a) - near(t, b))[0];
        if (target)
          this.dot(f.owner, target, "lordScorch", { ...f.s, spread: true }, 4);
      }
  },
  explode(h, at, radius, limit, amount, value) {
    const es = this.enemies({ ...at, side: h.side }, radius)
      .sort((a, b) => near(at, a) - near(at, b) || a.id - b.id)
      .slice(0, limit);
    for (const u of es)
      this.damage(h, u, amount, false, false, { value, proc: true });
    this.visual("impact", h, at, {
      skill: value?.skill ?? 0,
      targets: es.map((u) => ({ id: u.id, x: u.x, y: u.y })),
      until: this.time + 0.7,
    });
  },
  afterBasicAttack(h, t) {
    if (h.lordUlt?.until > this.time) {
      const s = h.lordUlt.s,
        es = this.enemies({ ...t, side: h.side }, s.radius)
          .filter((u) => u.id !== t.id)
          .sort(
            (a, b) =>
              Number(!!b.hero) - Number(!!a.hero) || near(t, a) - near(t, b),
          )
          .slice(0, s.targets);
      for (const e of es)
        this.damage(
          h,
          e,
          ((s.value.attack * s.power) / 100) * (1 + s.bonusDamage),
          false,
          false,
          { value: s.value, remote: false },
        );
      this.visual("release", h, t, {
        skill: 3,
        targets: es.map((u) => ({ id: u.id, x: u.x, y: u.y })),
        until: this.time + 0.6,
      });
    }
  },
};

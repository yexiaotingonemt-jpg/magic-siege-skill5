import {recordEffectiveHeal,recordEffectiveHit} from './assist-rules.js';
import {
  triggerTowerGuard,
  towerGuardActive,
  towerAllyProtection,
  TOWER_GUARD,
} from "./tower-guard.js";
import { commonId, commonRank } from "./common-traits.js";
import { names } from "./config.js";
import { SKILL_PROGRESSION } from "./skill-progression.js";
import { adjustAttackCooldown } from "./attack-cooldown.js";
import { available, spend, createSkillValue } from "./skill-value.js";
import { traitRank, traitSkill } from "./traits.js";
import { traitEffects } from "./trait-effects.js";
import { isCurrentDesign, currentValues, currentName } from './current-design.js';
import { currentAttackPower, currentAttackRate, addCurrentHeat, currentHeal,
  currentRangeFailure, selectCurrentSkill, resolveCurrentSkill, impactCurrentSkill,
  processCurrentEffects, updateCurrentUnit, chooseCurrentSkill } from './current-design-mechanics.js';
import {
  selectSkill5,
  skill5RangeFailure,
  resolveSkill5,
  impactSkill4,
  processSkill5Effects,
  updateSkill5Unit,
  chooseSkill5,
} from "./skill5-mechanics.js";
export class HeroRules {
  rank(h, id) {
    return traitRank(this.players[h?.playerId], id);
  }
  activeDebuffs(u, kind = null) {
    return Object.values(u.debuffs || {}).filter(
      (d) =>
        d.until > this.time &&
        (d.prepaid || available(d.value) > 1e-7) &&
        (!kind || d.kind === kind),
    );
  }
  attackSlowRatio(u) {
    return Math.max(
      0,
      ...this.activeDebuffs(u, "attackSpeedDown").map((d) => d.ratio),
    );
  }
  syncAttackCooldown(u) {
    const next = this.attackSlowRatio(u);
    if (u.cooldownSlowRatio != null)
      adjustAttackCooldown(u, this.time, u.cooldownSlowRatio, next);
    else u.cooldownSlowRatio = next;
    return next;
  }
  attackPower(u) {
    if(isCurrentDesign(this.config))return currentAttackPower.call(this,u);
    const low =
      u.classId === 0
        ? this.rank(u, "O18")
        : u.classId === 5
          ? this.rank(u, "E18")
          : 0;
    const flat =
      low * 2 * Math.min(9, Math.floor((1 - u.hp / u.maxHp + 1e-9) * 10)) +
      (u.heatBoostUntil > this.time
        ? (u.heatBoostStacks || 0) * this.rank(u, "F18") * 2
        : 0);
    const down = Math.max(
      0,
      ...this.activeDebuffs(u, "attackDown").map((d) => d.ratio),
    );
    return Math.max(
      0,
      ((u.attack || 0) +
        flat +
        (this.config.heroes[u.classId]?.attack || 0) *
          0.02 *
          commonRank(this, u, 2)) *
        (u.boostUntil > this.time ? 1 + (u.attackBoost || 0) : 1) *
        (u.eliteBuffs?.assault > this.time ? 1.2 : 1) *
        (1 - down),
    );
  }
  attackEffect(u, n) {
    return u?.attack ? (n * this.attackPower(u)) / u.attack : n;
  }
  skillPower(h, i) {
    return (this.attackPower(h) * traitSkill(this, h, i).power) / 100;
  }
  scarCount(u) {
    return Math.min(
      3,
      Object.values(u?.scars || {})
        .flat()
        .filter((t) => t > this.time).length,
    );
  }
  addScar(u, source, duration, cap = 3) {
    if (u.hp <= 0 || u.tower || u.immuneUntil > this.time) return;
    u.scars ??= {};
    u.scars[source.id] ??= [];
    u.scars[source.id] = u.scars[source.id]
      .filter((t) => t > this.time)
      .slice(-(cap - 1));
    u.scars[source.id].push(this.time + duration);
  }
  conduct(u, source, duration) {
    if (u.hp > 0 && !u.tower && !(u.immuneUntil > this.time))
      u.conductUntil = this.time + duration;
  }
  addHeat(h, n) {
    if(isCurrentDesign(this.config))return addCurrentHeat.call(this,h,n);
    if (h?.hp > 0 && h.classId === 4) {
      const c = this.config.heroes[4].skills[0],
        before = h.heat || 0;
      h.heat = Math.min(c.heatCap + this.rank(h, "F17"), before + n);
      h.heatUntil = this.time + c.heatDuration + 2 * this.rank(h, "F17");
      this.heatBoost(h, Math.max(0, h.heat - before));
      this.visual("heat", h, h, { skill: 0, until: this.time + 0.6 });
    }
  }
  moveUnit(u, x, y) {
    u.x = Math.max(
      -this.config.world.spawnHalfWidth,
      Math.min(this.config.world.spawnHalfWidth, x),
    );
    u.y = Math.max(
      this.config.world.mapMinY,
      Math.min(this.config.world.mapMaxY, y),
    );
  }
  negativeCount(u) {
    const kinds = this.activeDebuffs(u).map((d) => d.kind);
    for (const [kind, active] of [
      ["scar", this.scarCount(u) > 0],
      ["conduct", u.conductUntil > this.time],
      ["taunt", u.tauntUntil > this.time],
      ["stun", u.stunUntil > this.time],
      ["moveSlow", u.slowUntil > this.time],
    ])
      if (active) kinds.push(kind);
    for (const f of this.fields)
      if (
        (f.kind === "dot" || ['currentDrain','currentCorrosion'].includes(f.kind)) &&
        f.host === u.id &&
        f.until > this.time &&
        !f.s?.uncleansable
      )
        kinds.push(f.type || f.kind);
    if(isCurrentDesign(this.config)){
      if(u.currentNextHealDown?.until>this.time)kinds.push('nextHealDown');
      if(u.soulMarks?.some(m=>m.current&&m.until>this.time))kinds.push('soulMark');
    }
    return new Set(kinds).size;
  }
  hasNegative(u) {
    return this.negativeCount(u) > 0;
  }
  cleanse(u) {
    const slow = this.syncAttackCooldown(u),
      count = this.negativeCount(u);
    u.debuffs = {};
    u.scars = {};
    u.conductUntil = 0;
    u.tauntUntil = 0;
    u.tauntId = null;
    u.stunUntil = 0;
    u.slowUntil = 0;
    if(isCurrentDesign(this.config)){
      u.currentNextHealDown=null;
      if(u.soulMarks)u.soulMarks=u.soulMarks.filter(m=>!m.current);
    }
    this.fields = this.fields.filter(
      (f) => !((f.kind === "dot" || ['currentDrain','currentCorrosion'].includes(f.kind)) && f.host === u.id && !f.s?.uncleansable),
    );
    adjustAttackCooldown(u, this.time, slow, 0);
    return count;
  }
  cleanseOne(u) {
    const debuffs=Object.entries(u.debuffs||{}).filter(([,v])=>v.until>this.time);
    const fields=this.fields.filter(f=>f.host===u.id&&f.until>this.time&&['dot','currentDrain','currentCorrosion'].includes(f.kind)&&!f.s?.uncleansable);
    const states=['tauntUntil','stunUntil','slowUntil'].filter(k=>u[k]>this.time);
    const options=[...debuffs.map(([key])=>()=>{delete u.debuffs[key];this.syncAttackCooldown(u);}),
      ...fields.map(f=>()=>{this.fields=this.fields.filter(g=>g!==f);}),...states.map(key=>()=>{u[key]=0;})];
    if(u.currentNextHealDown?.until>this.time)options.push(()=>{u.currentNextHealDown=null;});
    for(const mark of u.soulMarks||[])if(mark.current&&mark.until>this.time)options.push(()=>{u.soulMarks=u.soulMarks.filter(m=>m!==mark);});
    if(!options.length)return false;options[Math.floor(this.random()*options.length)]();return true;
  }
  dispelOne(u) {
    const options=[];
    for(const [key,v] of Object.entries(u.hastes||{}))if(v.until>this.time)options.push(()=>{delete u.hastes[key];});
    for(const g of u.guards||[])if(g.until>this.time)options.push(()=>{u.guards=u.guards.filter(v=>v!==g);});
    if(u.shieldUntil>this.time&&u.shield>0)options.push(()=>{u.shield=0;u.shieldUntil=0;});
    if(u.heat>0)options.push(()=>{u.heat=0;u.heatUntil=0;u.heatBoostStacks=0;u.heatBoostUntil=0;});
    if(u.currentUlt?.until>this.time)options.push(()=>{u.currentUlt=null;u.immuneUntil=0;});
    if(u.currentShell?.until>this.time)options.push(()=>{u.currentShell=null;});
    if(!options.length)return false;options[Math.floor(this.random()*options.length)]();return true;
  }
  interrupt(u) {
    u.castToken = (u.castToken || 0) + 1;
    u.castUntil = this.time;
    u.channelUntil = 0;
    u.skillAnimation = null;
    u.dash = null;
    u.currentDash = null;
    this.fields = this.fields.filter(
      (f) => !(['runeBarrage','currentBarrage','currentGroupHeal','currentDrain'].includes(f.kind) && f.owner.id === u.id),
    );
  }
  debuff(u, source, kind, ratio, duration, value = null, prepaid = false) {
    if (
      !ratio ||
      u.hp <= 0 ||
      (u.tower && kind === "moveSlow") ||
      u.immuneUntil > this.time
    )
      return false;
    const slow = kind === "attackSpeedDown" ? this.syncAttackCooldown(u) : 0;
    u.debuffs ??= {};
    u.debuffs[source.id + ":" + kind] = {
      kind,
      ratio,
      until: this.time + duration,
      value,
      prepaid,
    };
    if (kind === "attackSpeedDown")
      adjustAttackCooldown(u, this.time, slow, this.attackSlowRatio(u));
    return true;
  }
  stun(u, source, duration) {
    if (u.tower || u.hp <= 0 || u.immuneUntil > this.time) return false;
    this.interrupt(u);
    u.stunUntil = Math.max(u.stunUntil || 0, this.time + duration);
    return true;
  }
  shield(u, amount, owner, duration, value = null) {
    if (u.hp <= 0 || amount <= 0) return false;
    if (u.shieldUntil > this.time && amount < (u.shield || 0)) return false;
    Object.assign(u, {
      shield: amount,
      shieldOwner: owner.id,
      shieldSource: owner,
      shieldUntil: this.time + duration,
      shieldValue: value,
    });
    return true;
  }
  guard(u, owner, kind, ratio, duration, extra = {}) {
    u.guards ??= [];
    u.guards = u.guards.filter(
      (g) => !(g.ownerId === owner.id && g.kind === kind),
    );
    u.guards.push({
      ownerId: owner.id,
      kind,
      ratio,
      until: this.time + duration,
      ...extra,
    });
  }
  haste(u, kind, ratio, duration) {
    u.hastes ??= {};
    u.hastes[kind] = { ratio, until: this.time + duration };
  }
  attackRate(u) {
    if(isCurrentDesign(this.config))return currentAttackRate.call(this,u);
    const values = Object.values(u.hastes || {})
      .filter((f) => f.until > this.time)
      .map((f) => f.ratio);
    if (u.haste?.until > this.time) values.push(u.haste.ratio);
    values.push(0.1 * commonRank(this, u, 8));
    return (
      (1 +
        Math.min(
          0.6,
          values.reduce((a, b) => a + b, 0),
        )) *
      Math.max(0.1, 1 - this.attackSlowRatio(u))
    );
  }
  heal(t, n, u, value = null, shared = false) {
    if(isCurrentDesign(this.config))return currentHeal.call(this,t,n,u,value,shared);
    if (!t || t.hp <= 0 || t.tower) return 0;
    const down = Math.max(
      0,
      ...this.activeDebuffs(t, "healingDown").map((d) => d.ratio),
    );
    const wanted =
        Math.max(0, n) *
        (1 + 0.04 * commonRank(this, t, 4)) *
        (1 - down) *
        (t.healingBoostUntil > this.time ? 1 + t.healingBoost : 1),
      actual = Math.min(wanted, t.maxHp - t.hp);
    t.hp += actual;
    spend(value, actual, "治疗");
    this.stat(u, "healing", actual);
    if (u?.hero && actual > 0) {
      this.visual("healing", u, t, {
        skill: value?.skill ?? 0,
        until: this.time + 0.55,
      });
      t.support ??= {};
      t.support[u.playerId] = this.time;
      recordEffectiveHeal(u,t,this.time);
    }
    if (actual > 0 && !shared) {
      for (const f of [...this.fields])
        if (
          f.kind === "link" &&
          f.until > this.time &&
          f.owner.hp > 0 &&
          this.get(f.host) &&
          Math.hypot(
            f.owner.x - this.get(f.host).x,
            f.owner.y - this.get(f.host).y,
          ) <= (f.breakRange ?? Infinity) &&
          (f.owner.id === t.id || f.host === t.id)
        ) {
          const other = t.id === f.owner.id ? this.get(f.host) : f.owner;
          this.heal(other, actual * f.shareRatio, f.owner, f.value, true);
        }
    }
    if (!shared)
      this.afterHeal?.(u, t, actual, Math.max(0, wanted - actual), value);
    return actual;
  }
  damage(a, t, n, basic = false, reflected = false, meta = {}) {
    if (!t || t.hp <= 0 || !Number.isFinite(n) || n <= 0) return 0;
    const credit = a?.summoned
      ? this.get(a.ownerId) || this.summonOwners?.get(a.ownerId) || a
      : a;
    if (t.shieldUntil <= this.time) t.shield = 0;
    if (meta.value?.limit != null) n = Math.min(n, available(meta.value));
    // 先平摊原始伤害，再由各成员独立结算一次减伤/护盾；同一伤害不再次分摊。
    if (!meta.damageSplit && !meta.execute && !t.tower) {
      const owners = [
        ...new Set(
          this.fields
            .filter(
              (f) =>
                f.kind === "link" &&
                f.shareDamage &&
                f.until > this.time &&
                f.owner.hp > 0 &&
                (f.owner.id === t.id || f.host === t.id),
            )
            .map((f) => f.owner.id),
        ),
      ].sort((a, b) => a - b);
      for (const ownerId of owners) {
        const owner = this.get(ownerId);
        if (!owner) continue;
        const links = this.fields.filter(
          (f) =>
            f.kind === "link" &&
            f.shareDamage &&
            f.owner.id === ownerId &&
            f.until > this.time,
        );
        const members = [
          owner,
          ...links
            .map((f) => this.get(f.host))
            .filter(
              (u) => u && Math.hypot(u.x - owner.x, u.y - owner.y) <= (isCurrentDesign(this.config)?Math.max(...links.filter(f=>f.host===u.id).map(f=>f.breakRange)):12) + 1e-7,
            ),
        ];
        const unique = [...new Map(members.map((u) => [u.id, u])).values()];
        if (unique.length > 1 && unique.some((u) => u.id === t.id))
          return unique.reduce(
            (sum, u) =>
              sum +
              this.damage(a, u, n / unique.length, basic, reflected, {
                ...meta,
                damageSplit: true,
              }),
            0,
          );
      }
    }
    if (basic) n = this.attackEffect(a, n);
    if (basic && a?.classId === 2 && t.tower) n *= a.buildingBonus || 1;
    if(isCurrentDesign(this.config)&&a){
      const av=currentValues(this,a,null,meta.value?.ranks);
      if(!reflected&&!a.summoned)n*=1+(av.final_damage||0);
      if(t.tower&&a.classId===2)n*=1+(av.building_bonus||0);
    }
    if (t.tower && a?.classId === 2) n *= 1 + this.rank(a, "C17") * 0.1;
    const vulnerable = Math.max(
      0,
      ...this.activeDebuffs(t, "vulnerable").map((d) => d.ratio),
    );
    n *= 1 + vulnerable;
    if (!reflected && !a?.summoned)
      n *=
        1 +
        0.06 *
          (meta.value?.ranks?.[commonId(a?.classId, 11)] ??
            commonRank(this, a, 11));
    const raw = Math.max(0, n);
    n = (raw * 100) / (100 + (t.armor || 0));
    // Strongest same-kind guard, multiplicative across distinct skills and buffs.
    const guards = new Map();
    for (const g of t.guards || [])
      if (g.until > this.time)
        guards.set(
          g.kind || "guard",
          Math.max(guards.get(g.kind || "guard") || 0, g.ratio),
        );
    if (t.eliteBuffs?.fortitude > this.time) guards.set("elite", 0.15);
    guards.set("commonFinal", 0.06 * commonRank(this, t, 10));
    if (a?.tower) guards.set("commonTower", 0.1 * commonRank(this, t, 7));
    if(isCurrentDesign(this.config)){
      const v=currentValues(this,t);
      guards.set('currentFinal',v.final_reduction||0);
      if(a?.tower)guards.set('currentTower',v.tower_reduction||0);
      if(t.classId===0)guards.set('orcPassive',(1-t.hp/t.maxHp)*this.config.design.rules.orcMissingReduction);
    }
    let remaining = 1;
    for (const ratio of guards.values()) remaining *= 1 - ratio;
    n *= Math.max(isCurrentDesign(this.config)?0:0.2, remaining);
    if (towerGuardActive(t, this.time)) n *= 1 - TOWER_GUARD.damageReduction;
    if (t.tower) n *= 1 - towerAllyProtection(t, this.units).reduction;
    if (meta.execute) n = t.hp;
    const absorbed = meta.execute ? 0 : Math.min(t.shield || 0, n);
    t.shield = Math.max(0, (t.shield || 0) - absorbed);
    if (absorbed) this.stat(t.shieldSource, "shielding", absorbed);
    const immortal = t.immortalUntil > this.time,
      actual = Math.min(
        Math.max(0, t.hp - (immortal ? 1 : 0)),
        Math.max(0, n - absorbed),
      ),
      sum = actual + absorbed;
    t.hp -= actual;
    spend(meta.value, sum, "伤害");
    if (sum > 0) {
      t.lastHitAt = this.time;
      if (a && a.side !== t.side) {
        t.combatAt ??= this.time;
        a.combatAt ??= this.time;
      }
      this.stat(
        credit,
        t.tower ? "buildingDamage" : t.hero ? "heroDamage" : "minionDamage",
        sum,
      );
      if (!t.tower) this.stat(credit, "unitDamage", sum);
      this.stat(t, "damageTaken", raw);
      recordEffectiveHit(a,t,credit,this.time,this.config.world.assistWindow);
      if (credit?.hero) {
        t.contributors ??= {};
        t.contributors[credit.playerId] = this.time;
      }
    }
    if (
      sum > 0 &&
      a?.hero &&
      a.side !== t.side &&
      !basic &&
      !reflected &&
      Number.isInteger(meta.value?.skill)
    )
      this.visual("damage", a, t, {
        skill: meta.value.skill,
        targetId: t.id,
        targetHero: !!t.hero,
        targetTower: !!t.tower,
        amount: sum,
        hpDamage: actual,
        shieldDamage: absorbed,
        until: this.time + 1.2,
      });
    if (sum > 0 && !reflected && !t.tower && a?.hp > 0 && a.side !== t.side) {
      t.attackerMemory ??= {};
      t.attackerMemory[a.id] = this.time + this.config.world.retaliationMemory;
      if (t.targetId == null) t.nextRetargetAt = 0;
    }
    if (t.tower && actual > 0) {
      this.metrics.towerDamage += actual;
      triggerTowerGuard(t, this.time);
      if (credit?.hero && !isCurrentDesign(this.config))
        this.addXp(
          this.players[credit.playerId],
          actual * this.config.world.towerDamageExpRate,
          credit.classId,
        );
    }
    if (t.damageStore?.until > this.time)
      t.damageStore.total = Math.min(
        t.maxHp * (t.damageStore.storeCap ?? 0.75),
        t.damageStore.total + sum,
      );
    if (sum > 0) this.afterDamage?.(a, t, sum, basic, reflected, meta);
    if (t.hp <= 0) {
      t.lethalSkill = {
        currentExplosion:meta.currentExplosion,
        explosionRadius:meta.explosionRadius,
        ownerId: a?.id,
        explosive: !!meta.explosive,
        attack: meta.value?.attack || 0,
        bonus: meta.bonus || 0,
        value: meta.value,
      };
      this.die(t, a, !!a?.summoned);
    }
    return sum;
  }
  castPlan(i, p = this.player) {
    const bad = (code, reason) => ({ ok: false, code, reason });
    if (!Number.isInteger(i) || i < 0 || i > 3)
      return bad("invalid", "无效技能");
    const h = this.hero(p);
    if (!h) return bad("no-hero", "请先点选己方单位确认契约");
    const id = h.classId,
      c = this.config.heroes[id],
      s = traitSkill(this, h, i),
      lv = p.builds[id][i];
    if (!isCurrentDesign(this.config) && p.level < SKILL_PROGRESSION[i].unlock)
      return bad("locked", "大招在英雄5级解锁");
    const range = isCurrentDesign(this.config)?currentRangeFailure(this,h,i,s):skill5RangeFailure(this, h, i, s);
    if (range) return range;
    if (h.stunUntil > this.time) return bad("stunned", "眩晕中，无法施法");
    if (h.dash || h.currentDash || h.channelUntil > this.time)
      return bad("channel", "正在冲锋或引导");
    if (h.castUntil > this.time) return bad("casting", "正在施法");
    if (p.cd[i] > this.time) return bad("cooldown", "技能冷却中");
    if (p.stamina < s.cost) return bad("stamina", "体力不足");
    if (!isCurrentDesign(this.config) && id === 4 && i === 1 && (h.heat || 0) < s.heatCost)
      return bad("heat", "需要至少1层炙热才能施加烙印");
    const selection = isCurrentDesign(this.config)?selectCurrentSkill.call(this,h,i,s):selectSkill5.call(this, h, i, s);
    return selection.ok
      ? { code: "ready", reason: "可释放", h, c, s, lv: 1, id, ...selection }
      : selection;
  }
  cast(i, p = this.player) {
    const plan = this.castPlan(i, p);
    if (!plan.ok) return this.fail(p, plan.reason);
    const { h, s, t } = plan,
      token = (h.castToken || 0) + 1;
    const currentAttackSnapshot=isCurrentDesign(this.config)?this.attackPower(h):null;
    h.castToken = token;
    const heat = h.heat || 0;
    if (!isCurrentDesign(this.config) && h.classId === 4 && i === 1) {
      h.heat = Math.max(0, heat - s.heatCost);
    }
    p.stamina -= s.cost;
    p.staminaSpent += s.cost;
    this.stat(h, 'staminaSpent', s.cost);
    this.addXp(p, s.cost * (isCurrentDesign(this.config)?1:this.config.world.expPerStamina));
    p.cd[i] = this.time + s.cd * (h.eliteBuffs?.arcane > this.time ? 0.85 : 1);
    h.castUntil = this.time + s.castTime;
    this.metrics.casts++;
    const locked = t ? { id: t.id, x: t.x, y: t.y } : null;
    h.skillAnimation = {
      skill: i,
      start: this.time,
      release: h.castUntil,
      end: h.castUntil + 0.42,
      from: { x: h.x, y: h.y },
      to: locked || { x: h.x, y: h.y },
    };
    this.visual("cast", h, locked || h, {
      skill: i,
      until: h.castUntil,
      release: h.castUntil,
    });
    const value = createSkillValue(h, s, 1, this.time);
    value.attack = currentAttackSnapshot??this.attackPower(h);
    value.skill = i;
    value.ranks = s.ranks;
    if(isCurrentDesign(this.config))value.currentSkill={...s};
    // 本次消耗新获得的炙热增攻只影响后续施法，不能倒灌当前快照。
    if (!isCurrentDesign(this.config) && h.classId === 4 && i === 1) this.heatBoost(h, s.heatCost);
    value.healProcs = 0;
    this.skillValues ??= [];
    this.skillValues.push(value);
    if (this.skillValues.length > 1000) this.skillValues.shift();
    this.jobs.push({
      at: h.castUntil,
      run: () => {
        if (h.hp > 0 && h.castToken === token)
          this.resolveSkill(
            h,
            i,
            { ...s, value },
            locked,
            plan.targets.map((u) => u.id),
            { heat, manualTargetId: plan.manualTargetId ?? null },
          );
      },
    });
    if (!p.bot) {
      this.notice = "";
      this.log(p.name + " 释放「" + this.configSkillName(h.classId,i) + "」");
    }
    return true;
  }
  configSkillName(id, i) {
    return isCurrentDesign(this.config)?currentName(this.config,id,i):names[id][i];
  }
  resolveSkill(h, i, s, locked, ids = [], extra = {}) {
    if(isCurrentDesign(this.config))return resolveCurrentSkill.call(this,h,i,s,locked,ids,extra);
    return resolveSkill5.call(this, h, i, s, locked, ids, extra);
  }
  dot(owner, t, type, s, duration) {
    if (t.hp <= 0 || t.immuneUntil > this.time) return;
    const old = this.fields.find(
      (f) =>
        f.kind === "dot" &&
        f.owner.id === owner.id &&
        f.host === t.id &&
        f.type === type,
    );
    if (old) {
      old.until = this.time + duration;
      old.s = s;
      return;
    }
    this.fields.push({
      kind: "dot",
      type,
      owner,
      host: t.id,
      x: t.x,
      y: t.y,
      side: owner.side,
      s,
      start: this.time,
      until: this.time + duration,
      tick: this.time + 1,
    });
  }
  impactSkill(b) {
    if(b.payload?.current)return impactCurrentSkill.call(this,b);
    return impactSkill4.call(this, b);
  }
  processSkillEffects() {
    if(isCurrentDesign(this.config))return processCurrentEffects.call(this);
    return processSkill5Effects.call(this);
  }
  updateUnitEffects(u, dt = 0) {
    if(isCurrentDesign(this.config))return updateCurrentUnit.call(this,u,dt);
    return updateSkill5Unit.call(this, u, dt);
  }
  chooseAutoSkill(p) {
    if(isCurrentDesign(this.config))return chooseCurrentSkill.call(this,p);
    return chooseSkill5.call(this, p);
  }
}
Object.assign(HeroRules.prototype, traitEffects);

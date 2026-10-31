import { availableClasses, contractClasses } from './config.js';

export const DEFAULT_NPC_POLICY = Object.freeze({ mode: 'ratio', defense: 1, attack: 3 });
export const MAX_NPC_HEROES = 99;
const gcd = (a, b) => b ? gcd(b, a % b) : a;

export function validateNpcPolicy(value) {
  if (!value || !['ratio', 'off'].includes(value.mode)) throw Error('请选择NPC比例或无NPC');
  const { defense, attack } = value;
  if (![defense, attack].every(n => Number.isInteger(n) && n >= 1 && n <= 99))
    throw Error('防守与进攻比例均需为1～99的整数');
  const factor = gcd(defense, attack);
  return { mode: value.mode, defense: defense / factor, attack: attack / factor };
}

export function npcBalanceStatus(sim) {
  const policy = sim.npcPolicy || DEFAULT_NPC_POLICY;
  const heroes = [0, 0], npcs = [0, 0];
  for (const h of sim.units) if (h.hero && h.hp > 0 && !h.summoned) {
    heroes[h.side]++;
    if (sim.players[h.playerId]?.bot) npcs[h.side]++;
  }
  return { ...policy, heroes: { defense: heroes[1], attack: heroes[0] },
    npcs: { defense: npcs[1], attack: npcs[0] }, lastCheck: sim.npcLastCheck || null };
}

function candidates(sim, side) {
  const reserved = new Set(sim.players.filter(p => !p.bot && !p.retired).map(p => p.reservedUnitId));
  const enemies = sim.units.filter(u => u.side !== side && u.hp > 0);
  const isFighting = u => {
    const target = sim.get(u.targetId);
    return !!(target && target.hp > 0 && target.side !== side && Math.hypot(u.x - target.x, u.y - target.y) <= (u.range || 0) + .1) ||
      enemies.some(e => e.targetId === u.id && Math.hypot(e.x - u.x, e.y - u.y) <= (e.range || 0) + .1);
  };
  return sim.units.filter(u => u.side === side && !u.hero && !u.tower && u.hp > 0 &&
    u.hp >= u.maxHp - 1e-6 && !reserved.has(u.id) && contractClasses(u, sim.config).length)
    .map(u => ({ u, fighting: isFighting(u) }))
    .sort((a, b) => Number(b.fighting) - Number(a.fighting) ||
      (side ? a.u.y - b.u.y : b.u.y - a.u.y) || a.u.id - b.u.id);
}

// Called once after each wave. Living heroes are never removed to change a ratio.
export function balanceNpcHeroes(sim) {
  if (!sim.npcPolicy) return;
  const policy = sim.npcPolicy, status = npcBalanceStatus(sim);
  if (policy.mode === 'off') {
    sim.npcLastCheck = { wave: sim.waveNumber, time: sim.time, added: { defense: 0, attack: 0 } };
    return;
  }
  const scale = Math.max(1, Math.ceil(status.heroes.defense / policy.defense),
    Math.ceil(status.heroes.attack / policy.attack));
  const target = [scale * policy.attack, scale * policy.defense];
  const count = [status.heroes.attack, status.heroes.defense], added = [0, 0];
  let budget = MAX_NPC_HEROES - status.npcs.attack - status.npcs.defense;
  for (const side of [1, 0]) {
   const pool = candidates(sim, side);
   while (count[side] < target[side] && budget > 0 && pool.length) {
    const tier = pool.filter(row => row.fighting === pool[0].fighting);
    const roles = availableClasses(side, sim.config).filter(id =>
      tier.some(row => contractClasses(row.u, sim.config).includes(id)));
    const classId = roles[Math.floor(sim.random() * roles.length)];
    const chosen = tier.find(row => contractClasses(row.u, sim.config).includes(classId));
    const unit = chosen.u; pool.splice(pool.indexOf(chosen), 1);
    let player = sim.players.find(p => p.bot && p.side === side && !sim.hero(p));
    if (!player) player = sim.makePlayer(side);
    player.retired = false; player.auto = true; player.classId = classId;
    if (player.stamina < sim.config.world.contractCost) player.stamina = sim.config.world.initialStamina;
    if (sim.contract(player, unit.id)) { count[side]++; added[side]++; budget--; }
   }
  }
  sim.npcLastCheck = { wave: sim.waveNumber, time: sim.time,
    target: { defense: target[1], attack: target[0] },
    added: { defense: added[1], attack: added[0] },
    missing: { defense: target[1] - count[1], attack: target[0] - count[0] } };
}

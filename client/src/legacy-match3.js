import './style.css';

const ROWS = 4;
const COLS = 6;
const FIELD_ROWS = 10;
const STAMINA_COST = 1;

const elements = {
  fire: { name: '火', icon: '✦', color: '#ff6357', beats: 'wood' },
  water: { name: '水', icon: '◈', color: '#5cc7ff', beats: 'fire' },
  wood: { name: '木', icon: '✤', color: '#75d38f', beats: 'water' },
  light: { name: '光', icon: '✹', color: '#ffd369', beats: 'shadow' },
  shadow: { name: '影', icon: '☾', color: '#bd7dff', beats: 'light' },
};
const elementKeys = Object.keys(elements);

const summoners = [
  { name: '炽焰·艾拉', affinity: { fire: 1.55, water: 0.8, wood: 0.9, light: 1.0, shadow: 0.85 } },
  { name: '潮汐·诺娅', affinity: { fire: 0.85, water: 1.55, wood: 1.0, light: 0.9, shadow: 0.9 } },
  { name: '藤语·赛拉', affinity: { fire: 0.9, water: 1.0, wood: 1.55, light: 0.85, shadow: 0.9 } },
  { name: '晨星·伊芙', affinity: { fire: 1.0, water: 0.85, wood: 0.9, light: 1.55, shadow: 0.85 } },
  { name: '夜幕·维恩', affinity: { fire: 0.85, water: 0.9, wood: 0.85, light: 0.8, shadow: 1.6 } },
  { name: '星尘·罗恩', affinity: { fire: 1.15, water: 1.15, wood: 1.15, light: 1.15, shadow: 1.15 } },
];

// 直接采用《联盟攻防战》的可部署兵种数值；107 空降兵刻意不进入这份原型。
const troops = {
  militia: { id: 101, name: '民兵', icon: '⚔', element: 'wood', attack: 18, hp: 90, interval: 800, speed: 1.05, range: 0.5, count: 4 },
  shield: { id: 102, name: '盾卫', icon: '⬟', element: 'water', attack: 24, hp: 1100, interval: 900, speed: 0.7, range: 0.5, count: 1 },
  crossbow: { id: 103, name: '弩手', icon: '➹', element: 'light', attack: 38, hp: 170, interval: 800, speed: 0.9, range: 1.5, count: 2, suppression: { pct: 0.4, duration: 1800 } },
  knight: { id: 104, name: '骑士', icon: '♞', element: 'shadow', attack: 80, hp: 620, interval: 800, speed: 1.8, range: 0.5, count: 1, charge: true },
  firejar: { id: 105, name: '火罐手', icon: '◉', element: 'fire', attack: 48, hp: 180, interval: 1000, speed: 0.75, range: 1, count: 2, splash: 1.5 },
};
const troopForElement = { fire: troops.firejar, water: troops.shield, wood: troops.militia, light: troops.crossbow, shadow: troops.knight };
const troopById = Object.fromEntries(Object.values(troops).map((troop) => [troop.id, troop]));
const formationOffsets = [[0, 0], [-0.22, 0.1], [0.22, 0.1], [-0.12, 0.28]];

const state = {
  stamina: 30,
  score: 0,
  turns: 0,
  board: [],
  selected: null,
  locked: false,
  units: [],
  towers: [],
  logs: ['战场已展开：让符文化为前进的军团。'],
  bonuses: Array.from({ length: COLS }, () => Object.fromEntries(elementKeys.map((e) => [e, 0]))),
  echoes: Array.from({ length: COLS }, () => Object.fromEntries(elementKeys.map((e) => [e, 0]))),
  rituals: Array.from({ length: COLS }, () => Object.fromEntries(elementKeys.map((e) => [e, 0]))),
  cards: [],
  modal: null,
  cardType: 'affinity',
  cardCol: 0,
  cardElement: 'fire',
  nextUnitId: 1,
};

const app = document.querySelector('#app');

function randomElement() {
  return elementKeys[Math.floor(Math.random() * elementKeys.length)];
}

function inBounds(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function makeBoard() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const options = elementKeys.filter((e) => {
          const horizontal = c >= 2 && board[r][c - 1] === e && board[r][c - 2] === e;
          const vertical = r >= 2 && board[r - 1][c] === e && board[r - 2][c] === e;
          return !horizontal && !vertical;
        });
        board[r][c] = options[Math.floor(Math.random() * options.length)];
      }
    }
    if (findValidSwap(board)) return board;
  }
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, randomElement));
}

function findMatches(board) {
  const marked = new Set();
  const key = (r, c) => `${r}:${c}`;
  for (let r = 0; r < ROWS; r += 1) {
    let start = 0;
    for (let c = 1; c <= COLS; c += 1) {
      if (c < COLS && board[r][c] === board[r][start]) continue;
      if (c - start >= 3) for (let i = start; i < c; i += 1) marked.add(key(r, i));
      start = c;
    }
  }
  for (let c = 0; c < COLS; c += 1) {
    let start = 0;
    for (let r = 1; r <= ROWS; r += 1) {
      if (r < ROWS && board[r][c] === board[start][c]) continue;
      if (r - start >= 3) for (let i = start; i < r; i += 1) marked.add(key(i, c));
      start = r;
    }
  }
  const groups = [];
  const visited = new Set();
  for (const entry of marked) {
    if (visited.has(entry)) continue;
    const [sr, sc] = entry.split(':').map(Number);
    const element = board[sr][sc];
    const group = [];
    const queue = [[sr, sc]];
    visited.add(entry);
    while (queue.length) {
      const [r, c] = queue.shift();
      group.push({ r, c, element });
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
        const next = key(nr, nc);
        if (inBounds(nr, nc) && marked.has(next) && !visited.has(next) && board[nr][nc] === element) {
          visited.add(next);
          queue.push([nr, nc]);
        }
      });
    }
    groups.push(group);
  }
  return groups;
}

function findValidSwap(board) {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        if (!inBounds(r + dr, c + dc)) continue;
        const test = cloneBoard(board);
        [test[r][c], test[r + dr][c + dc]] = [test[r + dr][c + dc], test[r][c]];
        if (findMatches(test).length) return true;
      }
    }
  }
  return false;
}

function createTowers() {
  const layout = [
    [0, 1, 'light', 205], [1, 4, 'shadow', 220], [2, 0, 'fire', 190],
    [3, 3, 'wood', 215], [4, 5, 'water', 205], [5, 1, 'fire', 190],
    [6, 4, 'wood', 215], [7, 2, 'water', 205], [8, 5, 'shadow', 220],
    [0, 3, 'core', 480],
  ];
  return layout.map(([row, col, element, hp], id) => ({ id, row, col, element, hp, maxHp: hp, hit: 0, cooldown: 0, slowUntil: 0 }));
}

function getAffinity(col, element) {
  return summoners[col].affinity[element] + state.bonuses[col][element] * 0.2;
}

function addLog(text) {
  state.logs = [text, ...state.logs].slice(0, 5);
}

function deployTroop(col, element, groupSize, isEcho = false) {
  const troop = troopForElement[element];
  const ritual = groupSize >= 4 ? state.rituals[col][element] * 0.2 : 0;
  const multiplier = (1 + (groupSize - 3) * 0.28) * getAffinity(col, element) * (1 + ritual) * (isEcho ? 0.65 : 1);
  for (let index = 0; index < troop.count; index += 1) {
    const [xOffset, yOffset] = formationOffsets[index] ?? [0, 0];
    const maxHp = Math.round(troop.hp * multiplier);
    state.units.push({
      id: state.nextUnitId++, troopId: troop.id, element, col: Math.max(0, Math.min(COLS - 1, col + xOffset)), row: FIELD_ROWS - 0.18 + yOffset,
      attack: Math.round(troop.attack * multiplier), hp: maxHp, maxHp, cooldown: 0, targetId: null,
      chargeActive: Boolean(troop.charge), isEcho,
    });
  }
  return troop;
}

function resolveGroups(groups) {
  let totalRunes = 0;
  let totalSoldiers = 0;
  groups.forEach((group) => {
    const groupSize = group.length;
    group.forEach(({ c, element }) => {
      const troop = deployTroop(c, element, groupSize);
      totalRunes += 1;
      totalSoldiers += troop.count;
      const echoCount = state.echoes[c][element];
      for (let i = 0; i < echoCount; i += 1) totalSoldiers += deployTroop(c, element, 3, true).count;
    });
  });
  state.score += totalRunes * 10;
  return { totalRunes, totalSoldiers };
}

function collapseBoard(board, groups) {
  const removed = new Set(groups.flat().map(({ r, c }) => `${r}:${c}`));
  for (let c = 0; c < COLS; c += 1) {
    const kept = [];
    for (let r = ROWS - 1; r >= 0; r -= 1) if (!removed.has(`${r}:${c}`)) kept.push(board[r][c]);
    while (kept.length < ROWS) kept.push(randomElement());
    for (let r = ROWS - 1, i = 0; r >= 0; r -= 1, i += 1) board[r][c] = kept[i];
  }
}

async function resolveCascades() {
  let cascades = 0;
  let sentRunes = 0;
  let sentSoldiers = 0;
  while (true) {
    const groups = findMatches(state.board);
    if (!groups.length) break;
    cascades += 1;
    const result = resolveGroups(groups);
    sentRunes += result.totalRunes;
    sentSoldiers += result.totalSoldiers;
    collapseBoard(state.board, groups);
    render();
    await wait(220);
  }
  if (sentRunes) addLog(`消除 ${sentRunes} 枚符文，按联盟编队派出 ${sentSoldiers} 名士兵。${cascades > 1 ? ` 连锁 ${cascades} 次。` : ''}`);
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function trySwap(a, b) {
  if (state.locked || state.stamina < STAMINA_COST) return;
  if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return;
  const test = cloneBoard(state.board);
  [test[a.r][a.c], test[b.r][b.c]] = [test[b.r][b.c], test[a.r][a.c]];
  if (!findMatches(test).length) {
    addLog('这次换位不能形成消除，未消耗体力。');
    state.selected = null;
    render();
    return;
  }
  state.locked = true;
  state.board = test;
  state.stamina -= STAMINA_COST;
  state.turns += 1;
  state.selected = null;
  await resolveCascades();
  state.locked = false;
  if (state.turns > 0 && state.turns % 5 === 0) openCardModal();
  render();
}

function pickCell(row, col) {
  if (state.locked || state.modal) return;
  const next = { r: row, c: col };
  if (!state.selected) { state.selected = next; render(); return; }
  if (state.selected.r === row && state.selected.c === col) { state.selected = null; render(); return; }
  const previous = state.selected;
  if (Math.abs(previous.r - row) + Math.abs(previous.c - col) !== 1) { state.selected = next; render(); return; }
  trySwap(previous, next);
}

function distance(a, b) { return Math.hypot(a.row - b.row, a.col - b.col); }

// 沿用联盟攻防战的“先锁最近可推进建筑，持续锁定到死亡/脱离射程”原则；
// 10×6 原型没有围墙阻隔，因此路线退化为向该目标的直线推进。
function closestTower(unit) {
  const alive = state.towers.filter((tower) => tower.hp > 0);
  const core = alive.find((tower) => tower.element === 'core');
  const blockers = alive.filter((tower) => tower.element !== 'core' && tower.row >= (core?.row ?? 0));
  return (blockers.length ? blockers : alive).sort((a, b) => distance(unit, a) - distance(unit, b))[0];
}

function moveToward(unit, target, speed) {
  const dx = target.col - unit.col;
  const dy = target.row - unit.row;
  const length = Math.hypot(dx, dy) || 1;
  const step = Math.min(speed * 0.25, length);
  unit.col += (dx / length) * step;
  unit.row += (dy / length) * step;
}

function damageTower(tower, amount, troop) {
  tower.hp = Math.max(0, tower.hp - amount);
  tower.hit = 1;
  if (troop?.suppression) tower.slowUntil = Date.now() + troop.suppression.duration;
  if (tower.hp === 0) addLog(`${troop?.name ?? '士兵'}摧毁了${tower.element === 'core' ? '秘法核心' : `${elements[tower.element].name}系塔`}！`);
}

function combatTick() {
  if (state.modal) return;
  const now = Date.now();
  const aliveUnits = state.units.filter((unit) => unit.hp > 0);
  aliveUnits.forEach((unit) => {
    const troop = troopById[unit.troopId];
    const target = state.towers.find((tower) => tower.id === unit.targetId && tower.hp > 0) ?? closestTower(unit);
    if (!target || !troop) return;
    unit.targetId = target.id;
    const inRange = distance(unit, target) <= troop.range + 0.26;
    if (!inRange) { moveToward(unit, target, troop.speed); return; }
    if (now < unit.cooldown) return;
    const multiplier = troop.charge && unit.chargeActive ? 2 : 1;
    damageTower(target, Math.round(unit.attack * multiplier), troop);
    if (troop.charge) unit.chargeActive = false;
    if (troop.splash) {
      state.towers.filter((tower) => tower.id !== target.id && tower.hp > 0 && distance(tower, target) <= troop.splash).forEach((tower) => damageTower(tower, Math.round(unit.attack * 0.5), troop));
    }
    unit.cooldown = now + troop.interval;
  });
  state.towers.filter((tower) => tower.hp > 0 && tower.element !== 'core').forEach((tower) => {
    if (now < tower.cooldown) return;
    const nearby = aliveUnits.filter((unit) => unit.hp > 0 && distance(tower, unit) <= 4);
    const shield = nearby.filter((unit) => unit.troopId === troops.shield.id).sort((a, b) => distance(tower, a) - distance(tower, b))[0];
    const target = shield ?? nearby.sort((a, b) => distance(tower, a) - distance(tower, b))[0];
    if (!target) return;
    target.hp -= 10;
    const slowPct = now < tower.slowUntil ? 0.4 : 0;
    tower.cooldown = now + Math.round(650 / (1 - slowPct));
  });
  state.units = state.units.filter((unit) => unit.hp > 0);
  state.towers.forEach((tower) => { if (tower.hit) tower.hit = 0; });
  render();
}

function openCardModal() {
  state.modal = 'card';
  state.cardType = 'affinity';
  state.cardCol = Math.floor(Math.random() * COLS);
  state.cardElement = elementKeys[Math.floor(Math.random() * elementKeys.length)];
}

function applyCard() {
  const labels = { affinity: '亲和增幅', echo: '回响符印', ritual: '高阶仪式' };
  const { cardType, cardCol, cardElement } = state;
  if (cardType === 'affinity') state.bonuses[cardCol][cardElement] += 1;
  if (cardType === 'echo') state.echoes[cardCol][cardElement] += 1;
  if (cardType === 'ritual') state.rituals[cardCol][cardElement] += 1;
  state.cards.push({ cardType, cardCol, cardElement });
  addLog(`${summoners[cardCol].name} 获得「${labels[cardType]}·${elements[cardElement].name}」。`);
  state.modal = null;
  render();
}

function resetGame() {
  Object.assign(state, {
    stamina: 30, score: 0, turns: 0, board: makeBoard(), selected: null, locked: false,
    units: [], towers: createTowers(), logs: ['战场已重置：再次编织你的攻城法术。'], cards: [], modal: null, nextUnitId: 1,
  });
  state.bonuses = Array.from({ length: COLS }, () => Object.fromEntries(elementKeys.map((e) => [e, 0])));
  state.echoes = Array.from({ length: COLS }, () => Object.fromEntries(elementKeys.map((e) => [e, 0])));
  state.rituals = Array.from({ length: COLS }, () => Object.fromEntries(elementKeys.map((e) => [e, 0])));
  render();
}

function unitGroups() {
  const groups = new Map();
  state.units.forEach((unit) => {
    const key = `${Math.max(0, Math.min(FIELD_ROWS - 1, Math.floor(unit.row)))}:${Math.max(0, Math.min(COLS - 1, Math.round(unit.col)))}:${unit.troopId}`;
    if (!groups.has(key)) groups.set(key, { ...unit, row: Math.max(0, Math.min(FIELD_ROWS - 1, Math.floor(unit.row))), col: Math.max(0, Math.min(COLS - 1, Math.round(unit.col))), count: 0, hp: 0, maxHp: 0 });
    const group = groups.get(key);
    group.count += 1; group.hp += unit.hp; group.maxHp += unit.maxHp;
  });
  return [...groups.values()];
}

function renderBattlefield() {
  const towerByCell = new Map(state.towers.filter((t) => t.hp > 0).map((t) => [`${t.row}:${t.col}`, t]));
  const unitsByCell = new Map(unitGroups().map((u) => [`${u.row}:${u.col}:${u.troopId}`, u]));
  let cells = '';
  for (let r = 0; r < FIELD_ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const tower = towerByCell.get(`${r}:${c}`);
      const units = Object.values(troops).map((troop) => unitsByCell.get(`${r}:${c}:${troop.id}`)).filter(Boolean);
      cells += `<div class="field-cell ${tower ? 'has-tower' : ''}">
        ${tower ? `<button class="tower ${tower.element}" title="${tower.element === 'core' ? '秘法核心' : elements[tower.element].name + '系塔'}" style="--hp:${(tower.hp / tower.maxHp) * 100}%"><span>${tower.element === 'core' ? '✺' : elements[tower.element].icon}</span><i></i></button>` : ''}
        ${units.map((unit) => { const troop = troopById[unit.troopId]; return `<div class="unit ${troop.element} troop-${troop.id}" title="${troop.name} ×${unit.count}，攻击 ${unit.attack}"><b>${troop.icon}</b>${unit.count > 1 ? `<em>${unit.count}</em>` : ''}</div>`; }).join('')}
      </div>`;
    }
  }
  return `<section class="battle-section panel">
    <div class="section-heading"><div><span class="eyebrow">联盟战场预留层</span><h2>破塔推进区 <small>10 × 6</small></h2></div><div class="battle-key"><span>单位由底部进入</span><span>▲ 向上推进</span></div></div>
    <div class="battlefield">${cells}</div>
    <div class="battle-foot"><span>存活士兵 <b>${state.units.length}</b></span><span>剩余建筑 <b>${state.towers.filter((t) => t.hp > 0).length}</b></span><span>盾卫优先锁定 · 弩手压制</span></div>
  </section>`;
}

function renderSummoners() {
  return `<section class="summoner-strip panel"><div class="strip-title"><span class="eyebrow">列绑定召唤师</span><span>同列符文 → 同列出兵</span></div><div class="summoners">${summoners.map((summoner, col) => {
    const strongest = [...elementKeys].sort((a, b) => summoner.affinity[b] - summoner.affinity[a])[0];
    const upgrades = elementKeys.reduce((sum, e) => sum + state.bonuses[col][e] + state.echoes[col][e] + state.rituals[col][e], 0);
    return `<div class="summoner-card accent-${strongest}">
      <div class="portrait">${troopForElement[strongest].icon}</div><div class="summoner-copy"><b>${summoner.name}</b><span>${elements[strongest].name}→${troopForElement[strongest].name} ×${getAffinity(col, strongest).toFixed(2)}</span></div>
      ${upgrades ? `<i class="upgrade-dot">${upgrades}</i>` : ''}
    </div>`;
  }).join('')}</div></section>`;
}

function renderBoard() {
  let cells = '';
  for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) {
    const element = state.board[r][c];
    const selected = state.selected?.r === r && state.selected?.c === c;
    cells += `<button class="rune ${element} ${selected ? 'selected' : ''}" data-row="${r}" data-col="${c}" aria-label="${elements[element].name}符文，第${r + 1}行第${c + 1}列"><span>${elements[element].icon}</span></button>`;
  }
  return `<section class="board-section panel"><div class="section-heading"><div><span class="eyebrow">施法棋盘</span><h2>元素编织 <small>4 × 6</small></h2></div><div class="board-tip">点击相邻两枚符文换位<br>成功消除才消耗 1 点体力</div></div><div class="rune-board">${cells}</div></section>`;
}

function cardModal() {
  if (!state.modal) return '';
  const definitions = {
    affinity: ['亲和增幅', '目标元素的小队攻击与生命 +20%。'],
    echo: ['回响符印', '每次消除目标元素，额外召唤 1 支 65% 强度小队。'],
    ritual: ['高阶仪式', '当次消除 ≥4 枚时，目标元素的召唤强度 +20%。'],
  };
  return `<div class="modal-backdrop"><section class="card-modal panel">
    <span class="eyebrow">使用 5 点体力后的构筑选择</span><h2>为一位召唤师写入魔法书</h2>
    <div class="card-choices">${Object.entries(definitions).map(([key, [title, description]]) => `<button class="growth-card ${state.cardType === key ? 'chosen' : ''}" data-card-type="${key}"><b>${title}</b><span>${description}</span></button>`).join('')}</div>
    <div class="target-picker"><div><label>目标召唤师</label><div class="choice-row">${summoners.map((s, col) => `<button data-card-col="${col}" class="${state.cardCol === col ? 'active' : ''}">${col + 1} 列</button>`).join('')}</div></div><div><label>强化元素</label><div class="choice-row">${elementKeys.map((e) => `<button data-card-element="${e}" class="element-choice ${e} ${state.cardElement === e ? 'active' : ''}">${elements[e].icon}${elements[e].name}</button>`).join('')}</div></div></div>
    <div class="modal-actions"><span>当前：${summoners[state.cardCol].name} · ${elements[state.cardElement].name}</span><button id="apply-card" class="primary">写入魔法书</button></div>
  </section></div>`;
}

function render() {
  const cleared = state.towers.filter((t) => t.hp <= 0).length;
  app.innerHTML = `<main class="game-shell">
    <header class="topbar"><div class="brand"><span class="brand-glyph">✧</span><div><span class="eyebrow">SOLO RANKING PROTOTYPE</span><h1>秘法攻城</h1></div></div><div class="hud"><div><span>体力</span><b>${state.stamina}</b></div><div><span>攻城积分</span><b>${state.score}</b></div><div><span>破塔</span><b>${cleared}/${state.towers.length}</b></div><button id="reset" title="重置战局">↻</button></div></header>
    <div class="legend"><span class="fire">火→火罐手</span><span class="water">水→盾卫</span><span class="wood">木→民兵</span><span class="light">光→弩手</span><span class="shadow">影→骑士</span><span class="spacer"></span><b>每 5 次施法获得构筑卡</b></div>
    ${renderBattlefield()}${renderSummoners()}${renderBoard()}
    <section class="activity-log panel"><span class="eyebrow">战况记录</span>${state.logs.map((log) => `<p>${log}</p>`).join('')}</section>
    <footer><span>玩法验证版 · 个人操作状态与战场状态已分离</span><span>未来可将战场状态替换为联盟同步数据</span></footer>
    ${cardModal()}
  </main>`;
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('.rune').forEach((cell) => cell.addEventListener('click', () => pickCell(Number(cell.dataset.row), Number(cell.dataset.col))));
  document.querySelector('#reset')?.addEventListener('click', resetGame);
  document.querySelectorAll('[data-card-type]').forEach((button) => button.addEventListener('click', () => { state.cardType = button.dataset.cardType; render(); }));
  document.querySelectorAll('[data-card-col]').forEach((button) => button.addEventListener('click', () => { state.cardCol = Number(button.dataset.cardCol); render(); }));
  document.querySelectorAll('[data-card-element]').forEach((button) => button.addEventListener('click', () => { state.cardElement = button.dataset.cardElement; render(); }));
  document.querySelector('#apply-card')?.addEventListener('click', applyCard);
}

state.board = makeBoard();
state.towers = createTowers();
render();
setInterval(combatTick, 650);

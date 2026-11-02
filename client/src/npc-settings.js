export const npcSettingsHTML = `<section id="npcControls" class="npc-settings" aria-label="NPC英雄比例设置">
 <h3>NPC补充设置</h3>
 <label>补充模式<select id="npcMode"><option value="ratio">按英雄比例补充</option><option value="off">无NPC · 停止后续补充</option></select></label>
 <div class="npc-ratio-inputs"><label>防守方<input id="npcDefenseRatio" type="number" min="1" max="99" step="1" value="1"></label><span>:</span><label>进攻方<input id="npcAttackRatio" type="number" min="1" max="99" step="1" value="3"></label></div>
 <div class="npc-actions"><button id="applyNpcPolicy" type="button">保存设置</button><button id="npcDefault" type="button">恢复1:3</button></div>
 <p>每次出兵按玩家与NPC英雄总数检查，防守人数按比例向下取整，最少保留一组；进攻不足时按现有防守补齐。人数吃紧时防守NPC提高施法智能。停止补充不会移除现有NPC。</p>
 <p id="npcLiveCounts" role="status"></p><p id="npcPolicyStatus" role="status"></p>
</section>`;

export function createNpcSettings(getSim, send, notice) {
  const el = id => document.getElementById(id);
  let key = '', busy = false;
  const syncDisabled = () => {
    const off = el('npcMode').value === 'off';
    for (const id of ['npcDefenseRatio', 'npcAttackRatio']) el(id).disabled = off || busy;
    for (const id of ['applyNpcPolicy', 'npcDefault', 'npcMode']) el(id).disabled = busy;
  };
  el('npcMode').onchange = syncDisabled;
  const save = async preset => {
    if (busy) return;
    if (preset) { el('npcMode').value = 'ratio'; el('npcDefenseRatio').value = '1'; el('npcAttackRatio').value = '3'; }
    const args = { mode: el('npcMode').value, defense: Number(el('npcDefenseRatio').value), attack: Number(el('npcAttackRatio').value) };
    busy = true; syncDisabled();
    try {
      const ok = await send('npcPolicy', args);
      notice(ok ? (args.mode === 'off' ? '已停止后续NPC补充，现有NPC继续战斗' : '设置已保存，下次出兵检查比例') : getSim().notice);
    } finally { busy = false; syncDisabled(); }
  };
  el('applyNpcPolicy').onclick = () => save(false);
  el('npcDefault').onclick = () => save(true);
  return { update() {
    const sim = getSim(), state = sim?.npcBalance;
    if (!state) return;
    const next = [state.mode, state.defense, state.attack].join(':');
    if (next !== key) { key = next; el('npcMode').value = state.mode; el('npcDefenseRatio').value = state.defense; el('npcAttackRatio').value = state.attack; syncDisabled(); }
    el('npcLiveCounts').textContent = `当前英雄 防守 ${state.heroes.defense} : 进攻 ${state.heroes.attack} · NPC ${state.npcs.defense} : ${state.npcs.attack}`;
    const missing = state.lastCheck?.missing;
    el('npcPolicyStatus').textContent = state.mode === 'off' ? '后续出兵不再补充NPC；现有NPC阵亡后不补回。' :
      `目标 防守:进攻 = ${state.defense}:${state.attack} · 下次出兵 ${Math.max(0, Math.ceil(sim.waveAt - sim.time))}秒` +
      (missing && (missing.defense || missing.attack) ? ` · 尚缺防守${missing.defense}/进攻${missing.attack}，等待满血士兵或NPC名额` : '');
  } };
}

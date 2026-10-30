import {uiIcon} from './ui-icons.js';

export const gameShell=`
<main class="layout">
 <aside class="battle-ranking" aria-label="实时积分与KDA排行">
  <div class="battle-ranking-heading">实时排行 <span>总积分 ↓ · KDA</span></div>
  <div id="battleRanking" class="battle-ranking-scroll" tabindex="0" aria-label="战斗贡献排行榜"></div>
 </aside>
 <div id="gameViewport" class="game-viewport">
  <section class="game awaiting-contract" aria-label="魔法王座游戏 · 640×1136">
   <header>
    <div><small>多人同局 · 实时攻防</small><h1>魔法王座 <span>英雄攻防</span></h1></div>
    <div class="currency">${uiIcon('stamina')}<b id="stamina"></b><small>体力</small></div>
    <div class="currency">${uiIcon('ranking')}<b id="score"></b><small>积分</small></div>
   </header>
   <div class="battle-info"><b id="front"></b><span id="wave"></span><button id="locate" aria-label="定位英雄">${uiIcon('locate')} 定位</button></div>
   <div class="battle-wrap">
    <div id="battle"></div>
    <button id="traitPending" class="trait-pending" type="button" aria-haspopup="dialog" aria-controls="traitDraft" aria-expanded="false" aria-label="技能强化，当前可选择 0 次" hidden><span class="trait-pending-icon" aria-hidden="true">${uiIcon('enhance')}</span><span class="trait-pending-label">技能强化</span><span class="trait-pending-count" data-trait-count aria-hidden="true">0</span></button>
    <div class="map-rail"><span id="mapTop">王城</span><div class="map-track"><i id="mapWindow"></i></div><span id="mapBottom">营地</span></div>
    <div class="map-jumps" aria-label="战场视角"><button id="viewDefense">王城</button><button id="viewFront">交锋</button><button id="viewCamp">营地</button></div>
   </div>
   <section class="hero-hud" aria-label="英雄状态">
    <div class="portrait" id="portrait"></div>
    <div class="hero-copy"><b id="heroName"></b><span id="hpLabel"></span><div class="bar"><i id="hpbar"></i></div><div class="xp"><i id="xpbar"></i></div><small id="xpLabel"></small><small id="attackLabel" class="hero-attack" hidden></small><span id="eliteBuffs" class="elite-buffs"></span></div>
    <div class="contract-guide" aria-hidden="true"><span><i>1</i>点选士兵</span>${uiIcon('chevron')}<span><i>2</i>确认契约</span>${uiIcon('chevron')}<span><i>3</i>释放技能</span></div>
   </section>
   <div id="skills" class="skills" aria-label="英雄技能" hidden></div>
   <div id="notice" role="status"></div><div id="eliteBroadcast" class="elite-broadcast" role="status" aria-live="polite" hidden></div><div id="traitDraft" class="trait-draft" role="dialog" aria-modal="true" aria-labelledby="draftTitle" hidden></div>
   <footer aria-label="游戏导航">${[['battle','战场'],['hero','技能'],['ranking','排行']].map(([name,label])=>`<button type="button" data-nav="${name}" ${name==='battle'?'aria-current="page"':''}>${uiIcon(name)}<span>${label}</span></button>`).join('')}</footer>
   <div id="gameSheet" class="game-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" hidden>
    <section class="sheet-panel"><div class="sheet-heading"><h2 id="sheetTitle">职业技能</h2><button id="sheetClose" aria-label="关闭面板">×</button></div>
     <div id="sheetScroll" class="sheet-scroll"><section data-sheet-section="hero"><div class="hero-sheet-heading"><b id="abilityClassName"></b><span>升级选择强化</span></div><div id="heroAbilityBody"></div></section><section data-sheet-section="ranking" hidden><p class="ranking-rule">总积分：伤害、原始承伤、有效治疗、小兵击杀、英雄击杀及英雄助攻按职业系数累计，另加每点消耗体力100分，无单次契约上限。<br>KDA = 总积分 ÷ 累计消耗体力（契约＋施法）；未消耗时显示 —。</p><div id="ranking"></div></section></div>
    </section>
   </div>
  </section>
 </div>`;

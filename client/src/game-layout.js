// The official game surface always uses KC's 640 × 1136 design coordinates.
export function mountGameLayout(){
 const viewport=document.querySelector('#gameViewport'),game=document.querySelector('.game');
 const resize=()=>{
  const availableWidth=document.documentElement.clientWidth,availableHeight=document.documentElement.clientHeight;
  const desktop=availableWidth>=1040,tablet=availableWidth>=700;
  const padding=desktop?48:tablet?32:0,sideWidth=desktop?712:tablet?288:0;
  const width=Math.max(280,Math.min(640,availableWidth-sideWidth,(availableHeight-padding)*640/1136));
  const scale=width/640;viewport.style.width=width+'px';viewport.style.height=1136*scale+'px';
  game.style.transform=`scale(${scale})`;document.documentElement.style.setProperty('--game-scale',scale);
  document.documentElement.style.setProperty('--game-height',1136*scale+'px');
  window.dispatchEvent(new Event('game-layout-resize'));
 };
 window.addEventListener('resize',resize);resize();
}

export function createGameSheets(){
 const sheet=document.querySelector('#gameSheet'),sections=[...document.querySelectorAll('[data-sheet-section]')];let previous=null;
 const navigation=[...document.querySelectorAll('[data-nav]')];let heroView='skills',skillIndex=null;
 const scrollPositions=new Map();
 function captureScroll(){const panel=document.querySelector('[data-hero-panel]:not([hidden])');if(panel)scrollPositions.set(panel.dataset.heroPanel,panel.scrollTop);}
 function refresh(){
  document.querySelectorAll('[data-hero-panel]').forEach(panel=>panel.hidden=panel.dataset.heroPanel!==heroView);
  document.querySelectorAll('[data-ability-view]').forEach(card=>card.hidden=card.dataset.abilityView!==heroView||(heroView==='skills'&&skillIndex!=null&&Number(card.dataset.skillDetail)!==skillIndex));
  const panel=document.querySelector('[data-hero-panel]:not([hidden])');if(panel)panel.scrollTop=scrollPositions.get(heroView)||0;
  if(!sections.find(section=>section.dataset.sheetSection==='hero')?.hidden){
   document.querySelector('#sheetTitle').textContent=heroView==='passive'?'职业被动':heroView==='stats'?'基础属性':heroView==='common'?'通用效果':skillIndex==null?'职业技能':document.querySelector(`[data-skill-detail="${skillIndex}"] h3`)?.childNodes[0]?.textContent||'技能说明';
  }
 }
 function markActive(name){navigation.forEach(button=>{if(button.dataset.nav===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});}
 function close(){sheet.hidden=true;markActive('battle');if(previous?.isConnected&&previous.getClientRects().length)previous.focus({preventScroll:true});else if(previous?.dataset.rankingPlayer)document.querySelector(`#battleRanking [data-ranking-player="${previous.dataset.rankingPlayer}"]`)?.focus({preventScroll:true});}
 function open(name,index=null){
  scrollPositions.clear();
  heroView=['passive','stats','common'].includes(name)?name:'skills';skillIndex=index;
  if(['passive','stats','common'].includes(name))name='hero';
  if(sheet.hidden)previous=document.activeElement;sheet.hidden=false;markActive(name);sections.forEach(e=>e.hidden=e.dataset.sheetSection!==name);
  sheet.classList.toggle('is-hero-sheet',name==='hero');
  document.querySelector('#gameViewport').scrollIntoView({block:'start'});
  document.querySelector('#sheetTitle').textContent={hero:'职业技能',ranking:'功勋排行',contracts:'契约记录'}[name];
  document.querySelector('#sheetClose').focus({preventScroll:true});
  const body=document.querySelector('#sheetScroll');body.querySelectorAll('details').forEach(d=>d.open=false);body.scrollTop=0;body.querySelectorAll('[data-hero-panel]').forEach(panel=>panel.scrollTop=0);
  refresh();
 }
 document.querySelectorAll('[data-hero-open]').forEach(button=>button.onclick=()=>open(button.dataset.heroOpen));
 document.querySelector('#sheetClose').onclick=close;
 sheet.addEventListener('click',e=>{if(e.target===sheet)close();});
 window.addEventListener('keydown',e=>{if(sheet.hidden)return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const nodes=[...sheet.querySelectorAll('button,summary,select,input,[tabindex="0"]')].filter(n=>n.getClientRects().length&&!n.disabled),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 return {open,close,refresh,captureScroll,get active(){return !sheet.hidden;}};
}

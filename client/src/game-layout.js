// The official game surface always uses KC's 640 × 1136 design coordinates.
export function mountGameLayout(){
 const viewport=document.querySelector('#gameViewport'),game=document.querySelector('.game');
 const resize=()=>{
  const availableWidth=document.documentElement.clientWidth,availableHeight=document.documentElement.clientHeight;
  const desktop=availableWidth>=1040,padding=desktop?48:0;
  const width=Math.max(280,Math.min(640,availableWidth-(desktop?440:0),(availableHeight-padding)*640/1136));
  const scale=width/640;viewport.style.width=width+'px';viewport.style.height=1136*scale+'px';
  game.style.transform=`scale(${scale})`;document.documentElement.style.setProperty('--game-scale',scale);
  window.dispatchEvent(new Event('game-layout-resize'));
 };
 window.addEventListener('resize',resize);resize();
}

export function createGameSheets(){
 const sheet=document.querySelector('#gameSheet'),sections=[...document.querySelectorAll('[data-sheet-section]')];let previous=null;
 const navigation=[...document.querySelectorAll('[data-nav]')];
 function markActive(name){navigation.forEach(button=>{if(button.dataset.nav===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});}
 function close(){sheet.hidden=true;markActive('battle');if(previous?.isConnected)previous.focus({preventScroll:true});}
 function open(name,index=null){
  if(sheet.hidden)previous=document.activeElement;sheet.hidden=false;markActive(name);sections.forEach(e=>e.hidden=e.dataset.sheetSection!==name);
  document.querySelector('#gameViewport').scrollIntoView({block:'start'});
  document.querySelector('#sheetTitle').textContent={hero:'职业技能',ranking:'功勋排行'}[name];
  document.querySelector('#sheetClose').focus({preventScroll:true});
  const body=document.querySelector('#sheetScroll');body.querySelectorAll('details').forEach(d=>d.open=false);body.scrollTop=0;
  if(index!=null)requestAnimationFrame(()=>{const card=document.querySelector(`[data-skill-detail="${index}"]`);if(card){const scale=document.querySelector('.game').getBoundingClientRect().width/640;body.scrollTop+=(card.getBoundingClientRect().top-body.getBoundingClientRect().top)/scale-12;}});
 }
 document.querySelector('#sheetClose').onclick=close;
 sheet.addEventListener('click',e=>{if(e.target===sheet)close();});
 window.addEventListener('keydown',e=>{if(sheet.hidden)return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const nodes=[...sheet.querySelectorAll('button,summary,select,input,[tabindex="0"]')].filter(n=>n.getClientRects().length&&!n.disabled),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 return {open,close,get active(){return !sheet.hidden;}};
}

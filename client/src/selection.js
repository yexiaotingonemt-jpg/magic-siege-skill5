import {classes,contractClasses} from '../../shared/config.js';
import {troopTitle} from './visual-theme.js';
import {VIEW} from './battlefield.js';
import {MANUAL_TARGET_RANGE} from '../../shared/manual-target.js';

export function createSelection({getSim,getRenderer,onChanged}){
 let matchId=null,selectedId=null,inspectedId=null,chosenClass=null,nearby=[],inspectionIds=[],tabsKey='',anchor=null;
 document.querySelector('.battle-wrap').insertAdjacentHTML('beforeend',`<section id="targetInfo" class="target-info" aria-label="目标基础信息" hidden><div id="targetTabs" class="target-tabs" role="tablist" aria-label="选中单位与周围目标"></div><div id="targetDetails" role="tabpanel"><div class="target-heading"><small id="targetRelation"></small><b id="targetName"></b></div><div id="targetHp"></div><div class="target-health"><i id="targetHpBar"></i></div><div id="targetStats"></div></div></section>`);
 document.querySelector('.battle-wrap').insertAdjacentHTML('beforeend',`<section id="contractPopover" class="contract-popover" role="dialog" aria-label="单位契约确认" hidden><button id="cancelSelection" class="popover-close" aria-label="取消选择">×</button><small>单位契约</small><h3 id="selectedName"></h3><p id="selectedDetail"></p><div class="selected-health"><i id="selectedHpBar"></i></div><div id="contractRoles" class="nearby-units" aria-label="选择契约职业"></div><div id="nearbyUnits" class="nearby-units"></div><div class="popover-actions"><button id="dismissSelection">取消</button><button id="confirmContract" class="primary">契约</button></div></section>`);
 const el=id=>document.getElementById(id),popup=el('contractPopover');
 const unit=()=>{const u=getSim().get(selectedId);return u&&!u.hero&&!u.tower&&u.side===getSim().player.side?u:null;};
 function clear(){anchor=null;selectedId=null;inspectedId=null;chosenClass=null;nearby=[];inspectionIds=[];getSim().player.reservedUnitId=null;popup.hidden=true;el('targetInfo').hidden=true;}
 const title=u=>u.tower?'防御塔':u.hero?classes[u.classId]:troopTitle(u);
 const relation=(s,u)=>u.id===s.player.heroId?'自己':u.side===s.player.side?'友方':'敌方';
 function collectTargets(s,u){
  return [u.id,...[...s.units,...s.towers].filter(t=>t.hp>0&&t.id!==u.id&&Math.hypot(t.x-u.x,t.y-u.y)<=4)
   .sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id-b.id).map(t=>t.id)];
 }
 function syncTabs(s){
  inspectionIds=inspectionIds.filter(id=>s.get(id)?.hp>0);
  const tabs=el('targetTabs'),units=inspectionIds.map(id=>s.get(id)),key=JSON.stringify(units.map(u=>[u.id,u.side,title(u)]));
  if(key!==tabsKey){
   tabsKey=key;tabs.replaceChildren(...units.map(u=>{const b=document.createElement('button');b.type='button';b.id='targetTab-'+u.id;b.dataset.inspectUnit=u.id;b.dataset.side=u.side===s.player.side?'ally':'enemy';b.setAttribute('role','tab');b.setAttribute('aria-controls','targetDetails');b.textContent=`${title(u).split('·')[0]} #${u.id}`;b.title=`${relation(s,u)} ${title(u)} #${u.id}`;b.setAttribute('aria-label',b.title);return b;}));
  }
  for(const b of tabs.children){const active=Number(b.dataset.inspectUnit)===inspectedId;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
  el('targetDetails').setAttribute('aria-labelledby','targetTab-'+inspectedId);
 }
 function syncInfo(){
  const s=getSim(),u=s.get(inspectedId),panel=el('targetInfo');panel.hidden=!u||u.hp<=0;if(panel.hidden){inspectedId=null;inspectionIds=[];return;}
  syncTabs(s);
  const owner=u.hero?s.players.find(p=>p.id===u.playerId):null;
  panel.dataset.side=u.side===s.player.side?'ally':'enemy';panel.dataset.unitId=u.id;
  el('targetRelation').textContent=(u.id===s.player.heroId?'自己':u.side===s.player.side?'友方':'敌方')+' · #'+u.id;
  el('targetName').textContent=title(u)+(owner?' · '+owner.name:'');el('targetName').title=el('targetName').textContent;
  el('targetHp').textContent=`生命 ${Math.ceil(u.hp)} / ${Math.ceil(u.maxHp)}`+(u.shield>0?` · 护盾 ${Math.ceil(u.shield)}`:'');
  el('targetHpBar').style.width=Math.max(0,Math.min(100,100*u.hp/u.maxHp))+'%';
  el('targetStats').textContent=`攻击 ${Number(s.attackPower(u).toFixed(2))} · 护甲 ${Number((u.armor||0).toFixed(2))} · 射程 ${u.range}格`;
 }
 function position(){
  if(!selectedId)return;
  const u=unit(),r=getRenderer(),p=u&&r.screenPoint(u);
  if(!p||!document.querySelector('#gameSheet').hidden){popup.hidden=true;return;}
  if(p.y< -25||p.y>VIEW.height+25){popup.hidden=true;anchor=null;return;}
  popup.hidden=false;
  const canvas=r.game.canvas.getBoundingClientRect(),parent=popup.parentElement,wrap=parent.getBoundingClientRect(),nativeScale=wrap.width/parent.offsetWidth,width=popup.offsetWidth,scale=canvas.height/VIEW.height/nativeScale;
  const info=el('targetInfo'),infoRect=info.getBoundingClientRect(),scroll=r.getCamera().scrollY,key=[wrap.width,canvas.width,canvas.height,canvas.left-wrap.left,canvas.top-wrap.top,infoRect.bottom,info.hidden].join(':');
  if(anchor&&Math.abs(anchor.scroll-scroll)<.5&&anchor.key===key&&anchor.height===popup.offsetHeight)return;
  const x=(canvas.left-wrap.left+p.x/VIEW.width*canvas.width)/nativeScale,y=(canvas.top-wrap.top+p.y/VIEW.height*canvas.height)/nativeScale,left=Math.max(8,Math.min(parent.clientWidth-width-8,x-width/2));
  const overlaps=!info.hidden&&left+width>(infoRect.left-wrap.left)/nativeScale&&left<(infoRect.right-wrap.left)/nativeScale,minTop=overlaps?(infoRect.bottom-wrap.top)/nativeScale+10:24;
  popup.style.maxHeight=Math.max(80,parent.clientHeight-minTop-20)+'px';
  const height=popup.offsetHeight;let top=y-height-28*scale;if(top<minTop)top=y+28*scale;
  popup.style.left=left+'px';popup.style.top=Math.max(minTop,Math.min(parent.clientHeight-height-20,top))+'px';anchor={scroll,key,height};
 }
 function sync(){const current=getSim().matchId;if(matchId&&matchId!==current)clear();matchId=current;syncInfo();const s=getSim(),u=unit();if(selectedId&&!u){clear();s.notice='所选单位已离场或被契约，请重新选择';return;}if(!u){popup.hidden=true;return;}el('contractRoles').hidden=contractClasses(u,getSim().config).length<2;el('contractRoles').innerHTML=contractClasses(u,getSim().config).map(id=>`<button data-contract-role="${id}" class="${id===chosenClass?'selected':''}">${classes[id]}</button>`).join('');el('selectedName').textContent=troopTitle(u)+' #'+u.id;el('selectedDetail').textContent=`可契约为 ${classes[chosenClass]} · 生命 ${Math.ceil(u.hp)} / ${Math.ceil(u.maxHp)} · 攻击 ${Number(s.attackPower(u).toFixed(2))}`;el('selectedHpBar').style.width=100*u.hp/u.maxHp+'%';el('confirmContract').textContent=`${s.player.stamina<s.config.world.contractCost?'体力不足':'契约'+classes[chosenClass]} · ϟ ${s.config.world.contractCost}`;el('confirmContract').disabled=s.player.stamina<s.config.world.contractCost;position();}
 async function select(id,ids){
  const s=getSim(),hero=s.hero();
  if(id==null){clear();s.notice='';onChanged();return;}
  const u=s.get(id),group=u?(ids||collectTargets(s,u)):[];inspectedId=u?.id??null;inspectionIds=group;
  if(hero){
   clear();inspectedId=u?.id??null;inspectionIds=group;
   if(!u||u.hp<=0){s.notice='目标已离场';onChanged();return;}
   if(Math.hypot(u.x-hero.x,u.y-hero.y)>MANUAL_TARGET_RANGE+1e-7){s.notice='目标超出手动锁定范围（20格）';onChanged();return;}
   s.notice='';
   await s.setManualTarget(u.id);
   onChanged();return;
  }
  if(!u||u.hp<=0||u.hero||u.tower||u.side!==s.player.side||!contractClasses(u,s.config).length){clear();inspectedId=u?.id??null;inspectionIds=group;s.notice=u?.hero?'这是已契约英雄，请选择己方普通士兵':'请选择己方普通士兵';onChanged();return;}
  anchor=null;selectedId=u.id;chosenClass=contractClasses(u,getSim().config).includes(s.player.classId)?s.player.classId:contractClasses(u,getSim().config)[0];s.player.reservedUnitId=u.id;s.setClass(chosenClass);s.notice='';nearby=[...new Set([u.id,...group])];el('nearbyUnits').innerHTML=nearby.filter(id=>{const t=s.get(id);return t&&t.hp>0&&!t.hero&&!t.tower&&t.side===s.player.side;}).slice(0,5).map(id=>{const t=s.get(id);return `<button data-select-unit="${id}" class="${id===selectedId?'selected':''}">${troopTitle(t)} #${id}</button>`;}).join('');el('nearbyUnits').hidden=el('nearbyUnits').childElementCount<2;sync();onChanged();el('confirmContract').focus({preventScroll:true});
 }
 async function confirm(){const s=getSim(),u=unit();if(!u){sync();onChanged();return;}if(s.player.stamina<s.config.world.contractCost){s.notice='契约体力不足';onChanged();return;}const oldClass=s.player.classId;s.setClass(chosenClass);if(await s.contract(s.player,u.id)){clear();}else s.setClass(oldClass);onChanged();}

 el('contractRoles').onclick=e=>{const b=e.target.closest('[data-contract-role]');if(b){chosenClass=Number(b.dataset.contractRole);getSim().setClass(chosenClass);onChanged();}};
 async function switchTab(id){await select(id,inspectionIds);const b=el('targetTabs').querySelector(`[data-inspect-unit="${id}"]`);if(!b)return;b.focus({preventScroll:true});const tabs=el('targetTabs');if(b.offsetLeft<tabs.scrollLeft)tabs.scrollLeft=b.offsetLeft;else if(b.offsetLeft+b.offsetWidth>tabs.scrollLeft+tabs.clientWidth)tabs.scrollLeft=b.offsetLeft+b.offsetWidth-tabs.clientWidth;}
 el('targetTabs').onclick=e=>{const b=e.target.closest('[data-inspect-unit]');if(b)switchTab(Number(b.dataset.inspectUnit));};
 el('targetTabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=inspectionIds.indexOf(inspectedId),n=inspectionIds.length;if(n)switchTab(inspectionIds[e.key==='Home'?0:e.key==='End'?n-1:(i+(e.key==='ArrowRight'?1:-1)+n)%n]);};
 el('confirmContract').onclick=confirm;for(const id of ['cancelSelection','dismissSelection'])el(id).onclick=()=>{clear();onChanged();};el('nearbyUnits').onclick=e=>{const b=e.target.closest('[data-select-unit]');if(b)select(Number(b.dataset.selectUnit),nearby);};window.addEventListener('keydown',e=>{if(e.key==='Escape'){clear();onChanged();}});
 return {select,clear,sync,position,confirm,get unit(){return unit();},get id(){return selectedId;}};
}

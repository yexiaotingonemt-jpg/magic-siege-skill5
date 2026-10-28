import {classes,contractClasses} from '../../shared/config.js';
import {troopTitle} from './visual-theme.js';
import {VIEW} from './battlefield.js';
import {MANUAL_TARGET_RANGE,canSelectAllies} from '../../shared/manual-target.js';

export function createSelection({getSim,getRenderer,onChanged}){
 let selectedId=null,chosenClass=null,nearby=[],anchor=null;
 document.querySelector('.battle-wrap').insertAdjacentHTML('beforeend',`<section id="contractPopover" class="contract-popover" role="dialog" aria-label="单位契约确认" hidden><button id="cancelSelection" class="popover-close" aria-label="取消选择">×</button><small>单位契约</small><h3 id="selectedName"></h3><p id="selectedDetail"></p><div class="selected-health"><i id="selectedHpBar"></i></div><div id="contractRoles" class="nearby-units" aria-label="选择契约职业"></div><div id="nearbyUnits" class="nearby-units"></div><div class="popover-actions"><button id="dismissSelection">取消</button><button id="confirmContract" class="primary">契约</button></div></section>`);
 const el=id=>document.getElementById(id),popup=el('contractPopover');
 const unit=()=>{const u=getSim().get(selectedId);return u&&!u.hero&&!u.tower&&u.side===getSim().player.side?u:null;};
 function clear(){anchor=null;selectedId=null;chosenClass=null;nearby=[];getSim().player.reservedUnitId=null;popup.hidden=true;}
 function position(){if(!selectedId)return;const u=unit(),r=getRenderer(),p=u&&r.screenPoint(u);if(!p||!document.querySelector('#gameSheet').hidden){popup.hidden=true;return;}if(p.y< -25||p.y>VIEW.height+25){popup.hidden=true;anchor=null;return;}popup.hidden=false;const canvas=r.game.canvas.getBoundingClientRect(),parent=popup.parentElement,wrap=parent.getBoundingClientRect(),nativeScale=wrap.width/parent.offsetWidth,width=popup.offsetWidth,height=popup.offsetHeight,scale=canvas.height/VIEW.height/nativeScale;const scroll=r.getCamera().scrollY,key=[wrap.width,canvas.width,canvas.height,canvas.left-wrap.left,canvas.top-wrap.top].join(':');if(anchor&&Math.abs(anchor.scroll-scroll)<.5&&anchor.key===key&&anchor.height===height)return;anchor={scroll,key,height};const x=(canvas.left-wrap.left+p.x/VIEW.width*canvas.width)/nativeScale,y=(canvas.top-wrap.top+p.y/VIEW.height*canvas.height)/nativeScale;let top=y-height-28*scale;if(top<24)top=y+28*scale;popup.style.left=Math.max(8,Math.min(parent.clientWidth-width-8,x-width/2))+'px';popup.style.top=Math.max(24,Math.min(parent.clientHeight-height-20,top))+'px';}
 function sync(){const s=getSim(),u=unit();if(selectedId&&!u){clear();s.notice='所选单位已离场或被契约，请重新选择';return;}if(!u){popup.hidden=true;return;}el('contractRoles').hidden=contractClasses(u,getSim().config).length<2;el('contractRoles').innerHTML=contractClasses(u,getSim().config).map(id=>`<button data-contract-role="${id}" class="${id===chosenClass?'selected':''}">${classes[id]}</button>`).join('');el('selectedName').textContent=troopTitle(u)+' #'+u.id;el('selectedDetail').textContent=`可契约为 ${classes[chosenClass]} · 生命 ${Math.ceil(u.hp)} / ${Math.ceil(u.maxHp)} · 攻击 ${Number(s.attackPower(u).toFixed(2))}`;el('selectedHpBar').style.width=100*u.hp/u.maxHp+'%';el('confirmContract').textContent=`${s.player.stamina<s.config.world.contractCost?'体力不足':'契约'+classes[chosenClass]} · ϟ ${s.config.world.contractCost}`;el('confirmContract').disabled=s.player.stamina<s.config.world.contractCost;position();}
 async function select(id,ids=[id]){
  const s=getSim(),hero=s.hero();
  if(id==null){clear();s.notice='';onChanged();return;}
  const u=s.get(id);
  if(hero){
   clear();
   if(!u||u.hp<=0){s.notice='目标已离场';onChanged();return;}
   if(u.side===hero.side&&!canSelectAllies(hero)){s.notice='该职业没有可作用友方的技能';onChanged();return;}
   if(Math.hypot(u.x-hero.x,u.y-hero.y)>MANUAL_TARGET_RANGE+1e-7){s.notice='目标超出手动锁定范围（20格）';onChanged();return;}
   s.notice='';
   await s.setManualTarget(u.id);
   onChanged();return;
  }
  if(!u||u.hero||u.tower||u.side!==s.player.side||!contractClasses(u,s.config).length){clear();s.notice=u?.hero?'这是已契约英雄，请选择己方普通士兵':'请选择己方普通士兵';onChanged();return;}
  anchor=null;selectedId=u.id;chosenClass=contractClasses(u,getSim().config).includes(s.player.classId)?s.player.classId:contractClasses(u,getSim().config)[0];s.player.reservedUnitId=u.id;s.setClass(chosenClass);s.notice='';nearby=[...new Set([u.id,...ids])];el('nearbyUnits').innerHTML=nearby.filter(id=>{const t=s.get(id);return t&&!t.hero&&t.side===s.player.side;}).slice(0,5).map(id=>{const t=s.get(id);return `<button data-select-unit="${id}" class="${id===selectedId?'selected':''}">${troopTitle(t)} #${id}</button>`;}).join('');el('nearbyUnits').hidden=nearby.length<2;sync();onChanged();el('confirmContract').focus({preventScroll:true});
 }
 async function confirm(){const s=getSim(),u=unit();if(!u){sync();onChanged();return;}if(s.player.stamina<s.config.world.contractCost){s.notice='契约体力不足';onChanged();return;}const oldClass=s.player.classId;s.setClass(chosenClass);if(await s.contract(s.player,u.id)){clear();}else s.setClass(oldClass);onChanged();}

 el('contractRoles').onclick=e=>{const b=e.target.closest('[data-contract-role]');if(b){chosenClass=Number(b.dataset.contractRole);getSim().setClass(chosenClass);onChanged();}};
 el('confirmContract').onclick=confirm;for(const id of ['cancelSelection','dismissSelection'])el(id).onclick=()=>{clear();onChanged();};el('nearbyUnits').onclick=e=>{const b=e.target.closest('[data-select-unit]');if(b)select(Number(b.dataset.selectUnit),nearby);};window.addEventListener('keydown',e=>{if(e.key==='Escape'){clear();onChanged();}});
 return {select,clear,sync,position,confirm,get unit(){return unit();},get id(){return selectedId;}};
}

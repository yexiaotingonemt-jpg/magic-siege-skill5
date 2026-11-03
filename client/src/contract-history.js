import {KDA_RATINGS} from '../../shared/contract-evaluation.js';
import {classes} from '../../shared/config.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
const time=n=>Number.isFinite(n)?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'未记录';
const labels={damage:'有效伤害',damageTaken:'原始承伤',healing:'有效治疗',minionKillHealth:'击杀小兵生命总量',heroKills:'英雄击杀',heroAssists:'英雄助攻',staminaSpent:'消耗体力'};
export function contractHistoryHTML(entries){
 if(!entries.length)return '<p class="contract-empty">尚无契约记录</p>';
 return entries.map(r=>`<article class="contract-entry${r.current?' contract-current':''}"><div class="contract-entry-heading"><b>${r.numberKnown===false?`记录${r.number}`:`第${r.number}次`} · ${esc(classes[r.classId]||'未知职业')}${r.level!=null?` Lv.${r.level}`:''}</b><span>${esc(r.reason)}</span></div><p class="contract-period">${time(r.start)} — ${r.current?'现在':time(r.end)}${r.duration!=null?` · 持续${number(r.duration)}秒`:''}</p><dl class="contract-values"><div><dt>总积分</dt><dd>${number(r.points)}</dd></div><div><dt>KDA</dt><dd>${number(r.kda,2)}</dd></div><div><dt>评价</dt><dd>${r.current?'结算后评价':r.rating?esc(r.rating.grade+' · '+r.rating.label):'—'}</dd></div><div><dt>消耗体力</dt><dd>${number(r.staminaSpent,0)}</dd></div></dl><details data-contract-detail="${esc(r.id)}"><summary>贡献明细</summary><table><thead><tr><th>项目</th><th>数值</th><th>积分</th></tr></thead><tbody>${r.parts.map(p=>`<tr><th scope="row">${esc(labels[p.key]||p.key)}</th><td>${number(p.value)}</td><td>${number(p.points)}</td></tr>`).join('')}</tbody></table><p class="contract-kda-rule">${r.kdaMode==='battle'?'KDA＝战斗积分 ÷ max（本次体力，21）':'KDA＝本次总积分 ÷ 本次体力'}。本次战斗积分 ${number(r.battlePoints)}。</p><p class="contract-kda-rule">评价按本次KDA：${KDA_RATINGS.map(r=>`${r.grade} ${r.label} ≥ ${r.min}`).join('；')}。死后追加贡献同步更新评价。</p></details></article>`).join('');
}
export function createContractHistory({getSim,request,sheets}){
 const panel=document.querySelector('[data-sheet-section="contracts"]'),body=panel.querySelector('#contractHistoryBody'),status=panel.querySelector('#contractHistoryStatus'),more=panel.querySelector('#contractHistoryMore'),retry=panel.querySelector('#contractHistoryRetry');
 let playerId=null,matchId=null,generation=0,entries=[],cursor=null,loadedOlder=false,loading=false,fetchedAt=0,timer=null;
 function render(){
  const html=contractHistoryHTML(entries);if(body.innerHTML===html)return;
  const open=[...body.querySelectorAll('details[open]')].map(d=>d.dataset.contractDetail),scroll=document.querySelector('#sheetScroll').scrollTop;
  const focused=document.activeElement?.closest('[data-contract-detail]')?.dataset.contractDetail;
  body.innerHTML=html;for(const d of body.querySelectorAll('details'))d.open=open.includes(d.dataset.contractDetail);
  if(focused!=null)[...body.querySelectorAll('details')].find(d=>d.dataset.contractDetail===focused)?.querySelector('summary').focus({preventScroll:true});
  document.querySelector('#sheetScroll').scrollTop=scroll;
 }
 async function load(older=false){
  if(loading||playerId==null)return;loading=true;more.disabled=true;retry.hidden=true;
  const token=generation,match=matchId,id=playerId;fetchedAt=performance.now();
  try{
   const data=await request(`/api/contract-history?playerId=${id}${older&&cursor?`&before=${encodeURIComponent(cursor)}`:''}`);
   if(token!==generation||getSim().matchId!==match||data.matchId!==match)return;
   const merged=new Map(entries.map(r=>[r.id,r]));for(const row of data.entries)merged.set(row.id,row);
   entries=[...merged.values()].sort((a,b)=>b.number-a.number);
   if(older){loadedOlder=true;cursor=data.nextCursor;}else if(!loadedOlder)cursor=data.nextCursor;
   const p=data.player;panel.querySelector('#contractPlayerName').textContent=p.name;
   panel.querySelector('#contractPlayerMeta').textContent=`${p.side?'防守':'进攻'} · ${classes[p.classId]||'未知职业'} · ${p.bot?'机器人':p.online?'在线':'离线'}`;
   status.textContent=`${data.partial?'已记录':'本局共'}${data.total}次契约 · 已显示${entries.length}次`;more.hidden=!cursor;render();
  }catch(error){if(token===generation){status.textContent='契约记录读取失败，请重试';retry.hidden=false;}}
  finally{if(token===generation){loading=false;more.disabled=false;}}
 }
 function open(id,name){
  generation++;playerId=id;matchId=getSim().matchId;entries=[];cursor=null;loadedOlder=false;loading=false;
  panel.querySelector('#contractPlayerName').textContent=name;panel.querySelector('#contractPlayerMeta').textContent='';status.textContent='正在读取契约记录…';body.innerHTML='';more.hidden=true;retry.hidden=true;
  sheets.open('contracts');load();
  clearInterval(timer);timer=setInterval(()=>{if(!sheets.active||panel.hidden){clearInterval(timer);timer=null;return;}update();},1000);
 }
 function update(){
  if(playerId==null||!sheets.active||panel.hidden)return;
  if(getSim().matchId!==matchId){generation++;playerId=null;loading=false;body.innerHTML='';status.textContent='战局已更新，请重新选择玩家';more.hidden=true;retry.hidden=true;return;}
  if(performance.now()-fetchedAt>=3000)load();
 }
 more.onclick=()=>load(true);retry.onclick=()=>load();panel.querySelector('#contractHistoryBack').onclick=()=>sheets.open('ranking');
 return {open,update,dispose(){generation++;playerId=null;clearInterval(timer);timer=null;}};
}

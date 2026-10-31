import {classes} from '../../shared/config.js';
const kda=p=>p.kdaMode==='battle'?p.kda:(p.staminaSpent>0?(p.totalPoints??0)/p.staminaSpent:null);
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Preserve the contribution ranking already deployed in 0.4.6.
export function contributionRanking(players,selfId){
 return `<table class="contribution-ranking"><thead><tr><th scope="col">玩家</th><th scope="col">总积分 ↓</th><th scope="col" title="${players.some(p=>p.kdaMode==='battle')?'有效战斗积分 ÷ max（实际体力，标准21点）':'积分性价比：总积分 ÷ 累计消耗体力'}">KDA</th></tr></thead><tbody>${players.filter(p=>!p.retired).slice().sort((a,b)=>(b.totalPoints??0)-(a.totalPoints??0)).map((p,i)=>`<tr class="${p.id===selfId?'rank-self':''}"><th scope="row"><span>${i+1}. ${escapeHTML(p.name)}${p.id===selfId?' · 我':''}</span><small>${p.side?'防守':'进攻'} · ${escapeHTML(classes[p.classId])}${p.bot?' · 机器人':p.online?'':' · 离线'}</small></th><td>${(p.totalPoints??0).toFixed(1)}</td><td title="累计消耗 ${p.staminaSpent??0} 体力">${kda(p)!=null?kda(p).toFixed(2):'—'}</td></tr>`).join('')}</tbody></table>`;
}

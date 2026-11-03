const kda=p=>p.kdaMode==='battle'?p.kda:(p.staminaSpent>0?(p.totalPoints??0)/p.staminaSpent:null);
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function formatRankingNumber(value){
 if(value==null||!Number.isFinite(value))return '—';
 const units=['','K','M','B','T'];let amount=Math.abs(value),unit=0;
 while(Math.round(amount)>=1000&&unit<units.length-1){amount/=1000;unit++;}
 return (value<0&&Math.round(amount)>0?'-':'')+Math.round(amount)+units[unit];
}
export function contributionRankingRule(config){
 const prefix='总积分：伤害、原始承伤、有效治疗、小兵击杀、英雄击杀及英雄助攻按职业系数累计，另加每点消耗体力100分，无单次契约上限。';
 return prefix+(config.design?.enabled?`<br>KDA = 战斗积分 ÷ max（累计消耗体力，${Number(config.design.rules.standardStamina)}）；战斗积分不含体力积分。`:'<br>KDA = 总积分 ÷ 累计消耗体力（契约＋施法）；未消耗时显示 —。');
}
export function renderContributionRanking(container,html){
 if(container.innerHTML===html)return;
 const focused=container.contains(document.activeElement)?document.activeElement.dataset.rankingPlayer:null;
 container.innerHTML=html;
 if(focused!=null)container.querySelector(`[data-ranking-player="${focused}"]`)?.focus({preventScroll:true});
}

// Secondary player information lives in the contract panel to keep the board compact.
export function contributionRanking(players,selfId){
 return `<table class="contribution-ranking"><thead><tr><th scope="col">玩家</th><th scope="col">总积分 ↓</th><th scope="col" title="${players.some(p=>p.kdaMode==='battle')?'有效战斗积分 ÷ max（实际体力，标准21点）':'积分性价比：总积分 ÷ 累计消耗体力'}">KDA</th></tr></thead><tbody>${players.filter(p=>!p.retired).slice().sort((a,b)=>(b.totalPoints??0)-(a.totalPoints??0)).map((p,i)=>`<tr class="${p.id===selfId?'rank-self':''}"><th scope="row"><span>${i+1}. <button type="button" class="ranking-player" data-ranking-player="${Number(p.id)}" aria-label="查看${escapeHTML(p.name)}的契约记录">${escapeHTML(p.name)}</button>${p.id===selfId?' · 我':''}</span></th><td title="总积分 ${p.totalPoints??0}">${formatRankingNumber(p.totalPoints??0)}</td><td title="KDA ${kda(p)??'—'} · 累计消耗 ${p.staminaSpent??0} 体力">${formatRankingNumber(kda(p))}</td></tr>`).join('')}</tbody></table>`;
}

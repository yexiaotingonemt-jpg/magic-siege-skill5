const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const number=n=>{const rounded=n<1?Number(n.toFixed(2)):Math.round(n);return rounded>0?rounded.toLocaleString('en-US'):'<0.01';};
export const COMBAT_NUMBER_LIMITS={maxActive:48,maxPerTarget:4,lifetime:.9,mergeWindow:.12,maxEventAge:2.4};

// Server event IDs provide deduplication; presentation ages use wall time even
// while the authoritative battle is paused or running at a different speed.
export function createCombatNumberModel(options={}){
 const limits={...COMBAT_NUMBER_LIMITS,...options},stats={received:0,merged:0,dropped:0,spawned:0};
 let entries=[],matchId,highWater=0,sequence=-Infinity,lastTime=-Infinity,nextId=0,initialized=false;
 const merge=(entry,e,priority)=>{entry.eventIds.push(e.id);entry.amount+=e.amount;entry.hpDamage+=e.hpDamage??e.amount;entry.shieldDamage+=e.shieldDamage||0;entry.lastStart=e.start;entry.sourceIds=[...new Set([...entry.sourceIds,e.sourceId])];entry.priority=Math.max(entry.priority,priority);stats.merged++;};
 return {limits,stats,get entries(){return entries;},update(sim,now=performance.now()){
  const currentMatch=sim.matchId??'local',seq=sim.sequence??sequence;
  const reset=!initialized||currentMatch!==matchId||sim.time<lastTime-.5;
  entries=entries.filter(e=>now-e.bornAt<limits.lifetime*1000);
  if(!reset&&seq<sequence)return entries;
  if(reset){entries=[];matchId=currentMatch;highWater=0;sequence=-Infinity;initialized=true;}
  const events=(sim.animations||[]).filter(e=>e.kind==='damage').sort((a,b)=>a.id-b.id);
  for(const e of events){
   if(e.id<=highWater)continue;highWater=e.id;
   if(reset)continue;
   if(!Number.isFinite(e.amount)||e.amount<=0||!Number.isFinite(e.to?.x)||!Number.isFinite(e.to?.y))continue;
   const speed=Math.max(1,sim.speed||1),expiry=Math.min(e.start+limits.maxEventAge,(e.until??e.start+1.2)+.3*speed);
   if(sim.time>expiry+1e-7)continue;
   stats.received++;
   const priority=e.sourceId===sim.player?.heroId?3:e.side!==sim.player?.side?2:1;
   const targetEntries=entries.filter(n=>n.targetId===e.targetId);
   const previous=targetEntries.find(n=>n.side===e.side&&Math.abs(e.start-n.lastStart)<=limits.mergeWindow+1e-7&&now-n.bornAt<limits.mergeWindow*1000);
   if(previous){merge(previous,e,priority);continue;}
   if(targetEntries.length>=limits.maxPerTarget){merge(targetEntries.at(-1),e,priority);continue;}
   if(entries.length>=limits.maxActive){const lowest=[...entries].sort((a,b)=>a.priority-b.priority||a.bornAt-b.bornAt)[0];if(priority<lowest.priority){stats.dropped++;continue;}entries=entries.filter(n=>n!==lowest);stats.dropped++;}
   const used=new Set(targetEntries.map(n=>n.lane));let lane=0;while(used.has(lane))lane++;
   entries.push({id:++nextId,eventIds:[e.id],sourceId:e.sourceId,sourceIds:[e.sourceId],targetId:e.targetId,skill:e.skill,side:e.side,targetHero:!!e.targetHero,targetTower:!!e.targetTower,to:{...e.to},start:e.start,lastStart:e.start,amount:e.amount,hpDamage:e.hpDamage??e.amount,shieldDamage:e.shieldDamage||0,bornAt:now,lane,priority});stats.spawned++;
  }
  sequence=Math.max(sequence,seq);lastTime=sim.time;return entries;
 },clear(){entries=[];initialized=false;highWater=0;sequence=-Infinity;lastTime=-Infinity;}};
}

export function createCombatNumbers(scene){
 const model=createCombatNumberModel(),labels=[];let report=[];
 const overlap=(a,b)=>a.left<b.right+3&&a.right>b.left-3&&a.top<b.bottom+3&&a.bottom>b.top-3;
 return {model,get report(){return report;},draw(sim,map,camera){
  const now=performance.now(),entries=model.update(sim,now),rect=scene.game.canvas.getBoundingClientRect(),sx=rect.width/500,sy=rect.height/500,scale=Math.max(.15,Math.min(sx,sy)),placed=[];
  report=[];let used=0;
  for(const entry of [...entries].sort((a,b)=>b.priority-a.priority||a.bornAt-b.bornAt)){
   const p=map.point(entry.to);if(p.y<camera.scrollY-40||p.y>camera.scrollY+camera.height+100)continue;
   const age=(now-entry.bornAt)/1000,k=clamp(age/model.limits.lifetime,0,1),absorbed=entry.hpDamage<=1e-7&&entry.shieldDamage>0;
   const text=absorbed?'吸收 '+number(entry.amount):'−'+number(entry.amount),color=absorbed?'#a9dce5':entry.side!==sim.player.side?'#efaaa2':'#f5eedc',fontSize=Math.ceil(Math.max(entry.priority===3?19:18,14/scale));
   let label=labels[used];if(!label){label=scene.add.text(0,0,'',{fontFamily:'Arial, Microsoft YaHei, sans-serif',fontSize:'18px',fontStyle:'bold',color:'#f5eedc',stroke:'#141c19',strokeThickness:4,padding:{x:3,y:2}}).setOrigin(.5,1).setDepth(12400);labels.push(label);}
   if(label._combatFont!==fontSize){label.setFontSize(fontSize);label._combatFont=fontSize;}
   if(label._combatColor!==color){label.setColor(color);label._combatColor=color;}
   if(label.text!==text)label.setText(text);
   const statusTop=scene.statusIcons?.top(entry.targetId),bar=p.y-(entry.targetTower?44:entry.targetHero?39:27),own=entry.targetId===sim.player.heroId;
   const nameTop=scene.heroNames?.top(entry.targetId);
   const ceiling=Math.min(bar-10,Number.isFinite(statusTop)?statusTop-(own?38:10):bar-(own?24:10),Number.isFinite(nameTop)?nameTop-5:Infinity);
   let x=p.x,y=ceiling-entry.lane*(fontSize+4)-k*30;
   const width=label.width,height=label.height,candidates=[];
   for(const dy of [0,-height-5,-2*(height+5)])for(const dx of [0,-width-6,width+6]){
    const cx=clamp(x+dx,width/2+3,497-width/2),cy=y+dy;candidates.push({left:cx-width/2,right:cx+width/2,top:cy-height,bottom:cy,x:cx,y:cy});
   }
   const box=candidates.find(b=>b.top>=camera.scrollY+4&&b.bottom<=camera.scrollY+camera.height-4&&b.left>=3&&b.right<=497&&!placed.some(other=>overlap(b,other))&&!(scene.heroNames?.report||[]).some(other=>overlap(b,other)));
   if(!box)continue;used++;x=box.x;y=box.y;placed.push(box);
   const alpha=k<.65?1:clamp((1-k)/.35,0,1);label.setVisible(true).setPosition(x,y).setAlpha(alpha);
   report.push({...entry,eventIds:[...entry.eventIds],to:{...entry.to},text,color,fontSize,cssFontSize:fontSize*scale,cssFontHeight:fontSize*sy,x,y,width,height,left:box.left,right:box.right,top:box.top,bottom:box.bottom,age,alpha,active:true});
  }
  for(let i=used;i<labels.length;i++)labels[i].setVisible(false);return report;
 },destroy(){labels.forEach(label=>label.destroy());model.clear();report=[];}};
}

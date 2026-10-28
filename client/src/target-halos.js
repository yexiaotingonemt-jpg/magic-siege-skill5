import {manualTarget,enemyTarget,friendlyTarget} from '../../shared/manual-target.js';
// Ground markers read the same selected IDs and resolved skill recipients as combat.
export function createTargetHalos(scene){
 const ink=scene.add.graphics().setDepth(85),report=[];
 return {ink,get report(){return report;},draw(s,map){
  ink.clear();report.length=0;
  const hero=s.hero(),locked=hero?(hero.classId===5?enemyTarget(s,hero):manualTarget(s,hero)||enemyTarget(s,hero)):null,friend=hero?.classId===5?friendlyTarget(s,hero):null,selected=hero||s.get(s.player.reservedUnitId);
  const add=(kind,u,until=null)=>{
   if(!u||u.hp<=0)return;
   const p=map.point(u),width=(u.tower?80:u.hero?56:42)+(kind==='skill'?14:0),height=width*.36,y=p.y+(u.tower?45:u.hero?31:24);
   const team=u.side===s.player.side?'ally':'enemy';
   const color=kind==='self'?0x85e2ed:kind==='manual'?(team==='ally'?0x78d6aa:0xf48f86):kind==='basic'?0xf48f86:0xdab5ff;
   const alpha=until==null?.9:Math.min(1,Math.max(0,(until-s.time)/.18));
   ink.fillStyle(color,.07*alpha);ink.fillEllipse(p.x,y,width,height);
   ink.lineStyle(7,color,.1*alpha);ink.strokeEllipse(p.x,y,width,height);
   ink.lineStyle(kind==='skill'?2.5:2,color,.9*alpha);ink.strokeEllipse(p.x,y,width,height);
   ink.lineStyle(1,0xe8f5f2,.55*alpha);ink.strokeEllipse(p.x,y,width-6,height-3);
   if(kind==='manual'){
    ink.lineStyle(2,color,.95*alpha);
    for(const side of [-1,1]){
     ink.lineBetween(p.x+side*(width/2+3),y,p.x+side*(width/2+8),y);
     ink.lineBetween(p.x,y+side*(height/2+2),p.x,y+side*(height/2+6));
    }
   }
   report.push({kind,unitId:u.id,team,x:p.x,y,width,height,color,until});
  };
  if(selected?.id!==locked?.id)add('self',selected);
  if(hero){
   const target=s.get(hero.targetId);if(target&&target.side!==hero.side&&target.id!==locked?.id)add('basic',target);
   add('manual',locked);
   if(friend?.id!==locked?.id)add('manual',friend);
   const marked=new Set();
   for(const e of [...s.animations].reverse()){
    if(e.kind!=='release'||e.sourceId!==hero.id||e.start>s.time||s.time>=e.start+1)continue;
    for(const t of e.haloTargets||[]){if(marked.has(t.id))continue;marked.add(t.id);add('skill',s.get(t.id),e.start+1);}
   }
  }
  return report;
 },destroy(){ink.destroy();}};
}

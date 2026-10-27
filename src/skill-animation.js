import {names} from './config.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const palettes=[0x39d9d1,0x539dff,0x34dbe8,0x8ad8ff,0xff742c,0x78dd73];
export const skillVisualProfiles=[
 ['破甲重击','守护战吼','换位救援','蓄伤成盾'],
 ['天降雷击','多段弹射电链','电弧拖曳','雷云风暴'],
 ['腐蚀晶弹','冰霜爆弹','定点连轰','震荡击退'],
 ['裂地扇波','暗影冲锋','焚身火盾','灭军溅射'],
 ['烈焰单击','炙热火球','焚魂烙印','多目标天火'],
 ['灵息伤疗','共享治疗链接','献生净化','多目标生命洪流']
];
// Actions and effects read simulation time, so pause/replay/speed stay in sync.
export function actionPose(u,time,viewSide=0){
 const direction=viewSide?-1:1;
 const a=u.skillAnimation;
 if(a&&time>=a.start&&time<a.end){
  const wind=time<a.release,k=wind?clamp((time-a.start)/Math.max(.05,a.release-a.start)):clamp((time-a.release)/.42);
  let dx=0,dy=wind?-Math.sin(k*Math.PI)*3:0;
  if(wind&&u.classId===2&&a.skill===3){const t=clamp((k-.78)/.22);dx=(a.to.x-a.from.x)*18*t;dy=-(a.to.y-a.from.y)*18*t*direction;}
  return {frame:wind?1:k<.4?2:3,dx,dy,angle:wind?(u.side?1:-1)*3*Math.sin(k*Math.PI):0,phase:wind?'windup':k<.4?'release':'recover'};
 }
 const age=time-(u.lastWhirlAt??-10);
 if(u.classId===3&&u.whirlUntil>time&&age>=0&&age<.4)return {frame:age<.16?2:3,dx:0,dy:0,angle:Math.sin(age/.4*Math.PI)*9,phase:'whirl'};
 const hitAge=time-(u.lastAttackAt??-10),pulse=hitAge>=0&&hitAge<.45?Math.sin(hitAge/.45*Math.PI):0;
 return {frame:0,dx:0,dy:(u.side?1:-1)*direction*pulse*2,angle:(u.side?1:-1)*direction*pulse*2,phase:pulse?'attack':'idle'};
}
function line(g,points,color,width=2,alpha=1){
 if(points.length<2)return;g.lineStyle(width,color,alpha);g.beginPath();g.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))g.lineTo(p.x,p.y);g.strokePath();
}
function glow(g,p,color,r,alpha){for(let i=3;i>=1;i--){g.fillStyle(color,alpha*(4-i)/10);g.fillEllipse(p.x,p.y,r*i,r*i*.72);}}
function beam(g,a,b,time,color,alpha=1,width=4){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),nx=-dy/d,ny=dx/d,pts=[];
 for(let i=0;i<=10;i++){const t=i/10,wave=Math.sin(i*2.7+time*23)*Math.sin(t*Math.PI)*6;pts.push({x:mix(a.x,b.x,t)+nx*wave,y:mix(a.y,b.y,t)+ny*wave});}
 line(g,pts,color,width+7,alpha*.13);line(g,pts,color,width,alpha);line(g,pts,0xf0fcff,Math.max(1,width*.36),alpha*.94);
}
function spark(g,p,color,k,scale=1){
 for(let i=0;i<6;i++){const a=i*Math.PI/3+.2,r=(8+k*34)*scale;line(g,[{x:p.x+Math.cos(a)*r*.45,y:p.y+Math.sin(a)*r*.45},{x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r}],color,3*(1-k)+1,1-k);}
}
function shield(g,p,r,color,alpha=1,spiked=false){
 const q=[{x:p.x-r*.7,y:p.y-r*.65},{x:p.x,y:p.y-r*.95},{x:p.x+r*.7,y:p.y-r*.65},{x:p.x+r*.6,y:p.y+r*.4},{x:p.x,y:p.y+r*.75},{x:p.x-r*.6,y:p.y+r*.4}];
 g.fillStyle(color,alpha*.11);g.lineStyle(3,color,alpha*.9);g.beginPath();g.moveTo(q[0].x,q[0].y);for(const v of q.slice(1))g.lineTo(v.x,v.y);g.closePath();g.fillPath();g.strokePath();
 line(g,[q[0],{x:p.x,y:p.y+r*.25},q[2]],0xdcf8ff,1,alpha*.6);line(g,[q[1],{x:p.x,y:p.y+r*.25},q[4]],color,2,alpha*.8);
 if(spiked)for(const v of [q[0],q[2],q[4]]){g.fillStyle(0xb4e8ff,alpha);g.fillTriangle(v.x-5,v.y+6,v.x,v.y-12,v.x+5,v.y+6);}
}
function slash(g,p,k,color,heavy=false,intensity=1){
 for(let j=0;j<3;j++){g.lineStyle((heavy?13:8)-j*3,j===2?0xedffff:color,(1-k)*(.55+j*.15)*intensity);g.beginPath();g.arc(p.x,p.y,(heavy?49:35)-j*4,-2.9+k*.8,-.3+k*.8);g.strokePath();}
}
function crack(g,p,r,k,color){
 for(let j=0;j<6;j++){const a=j*Math.PI/3+.3,end={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.55};line(g,[p,{x:mix(p.x,end.x,.35)+5,y:mix(p.y,end.y,.35)-3},{x:mix(p.x,end.x,.72)-4,y:mix(p.y,end.y,.72)+3},end],0x1e333f,5,(1-k)*.65);line(g,[p,end],color,2,(1-k)*.9);}
}
function leaf(g,p,a,color,alpha,size=9){const c=Math.cos(a),s=Math.sin(a);g.fillStyle(color,alpha);g.fillTriangle(p.x-c*size,p.y-s*size,p.x-s*size*.45,p.y+c*size*.45,p.x+c*size,p.y+s*size);g.fillTriangle(p.x-c*size,p.y-s*size,p.x+s*size*.45,p.y-c*size*.45,p.x+c*size,p.y+s*size);}
function stream(g,a,b,time,color,alpha=1){
 const pts=[];for(let j=0;j<=14;j++){const t=j/14;pts.push({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)-Math.sin(t*Math.PI)*24});}
 line(g,pts,color,9,alpha*.12);line(g,pts,color,3,alpha*.8);
 for(let j=0;j<3;j++){const t=(time*.8+j/3)%1,p={x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)-Math.sin(t*Math.PI)*24};leaf(g,p,t*5,color,alpha,6);}
}
export function createSkillAnimation(scene){
 const ground=scene.add.graphics().setDepth(60),ink=scene.add.graphics().setDepth(9000),sprites=[],labels=[];
 const state={events:[],spriteCount:0,persistent:0,projectiles:0,maxSprites:80};let used=0,labelUsed=0;
 function stamp(family,p,k,size,alpha=1,angle=0,wind=false){
  if(used>=state.maxSprites)return;
  let sp=sprites[used];if(!sp){sp=scene.add.image(0,0,'spell-bursts',0).setDepth(8800);sprites.push(sp);}used++;
  const frame=wind?0:Math.min(3,1+Math.floor(clamp(k)*3));
  sp.setDepth(8800).setVisible(true).setFrame(family*4+frame).setOrigin(.5,family===0?.5:.86).setPosition(p.x,p.y+(family===0?0:24)).setDisplaySize(size,size).setAngle(angle).setAlpha(alpha*(k>.75?1-(k-.75)*2.5:1));return sp;
 }
 function caption(p,text){let label=labels[labelUsed];if(!label){label=scene.add.text(0,0,'',{fontFamily:'Microsoft YaHei',fontSize:'12px',fontStyle:'bold',color:'#fff4d4',stroke:'#18232b',strokeThickness:4}).setOrigin(.5).setDepth(11000);labels.push(label);}labelUsed++;label.setVisible(true).setPosition(p.x,p.y-65).setText(text);}
 return {get report(){return state;},draw(s,map,camera){
  ground.clear();ink.clear();used=0;labelUsed=0;state.events=[];state.persistent=0;state.projectiles=0;
  const visible=p=>p.y>camera.scrollY-160&&p.y<camera.scrollY+820;
  const crowded=s.units.filter(u=>u.hero&&u.hp>0&&visible(map.point(u))).length>8||s.fields.length>3;state.crowded=crowded;
  const active=(s.animations||[]).filter(e=>e.until>s.time&&e.start<=s.time&&(!['cast','charge'].includes(e.kind)||s.get(e.sourceId))&&Math.max(map.point(e.from).y,map.point(e.to).y)>camera.scrollY-160&&Math.min(map.point(e.from).y,map.point(e.to).y)<camera.scrollY+820).sort((a,b)=>Number(b.sourceId===s.player.heroId)-Number(a.sourceId===s.player.heroId)||b.start-a.start).slice(0,24);
  for(const e of active){
   const k=clamp((s.time-e.start)/Math.max(.05,e.until-e.start)),source=s.get(e.sourceId),a=map.point(e.from),b=map.point(e.to),color=palettes[e.classId]||0xe6cda8,mine=e.sourceId===s.player.heroId,alpha=mine?1:crowded?.5:.76,size=mine?1:crowded?.82:.9,targets=(e.targets?.length?e.targets.map(p=>map.point(p)):[b]).slice(0,5);
   state.events.push({id:e.id,kind:e.kind,classId:e.classId,skill:e.skill,profile:skillVisualProfiles[e.classId]?.[e.skill],sourceId:e.sourceId,targetId:e.targetId,phase:k,from:a,to:b});
   if(e.kind==='cast'){
    if(!source)continue;const p=map.point(source),hand={x:p.x+15,y:p.y-17};
    glow(ground,{x:p.x,y:p.y+27},color,30,alpha*.28);stamp(e.classId,hand,k,54+20*k,alpha*.72,0,true);
    if(mine)caption(p,names[e.classId][e.skill]);
    if(e.classId===2&&e.skill===3){glow(ink,p,0x54ecff,25+24*k,alpha*.5);beam(ground,p,b,s.time,0x54ddeb,alpha*.35,6);}
    continue;
   }
   if(e.kind==='charge'){const p={x:mix(a.x,b.x,clamp((k-.78)/.22)),y:mix(a.y,b.y,clamp((k-.78)/.22))};beam(ground,a,p,s.time,color,alpha*.7,12);continue;}
   if(e.kind==='healing'){stream(ink,a,b,s.time,0x8df299,alpha*(1-k)*(mine?1:.55));stamp(5,b,k,mine?66:53,alpha*(mine?.8:.45))?.setDepth(mine?8800:70);continue;}
   if(e.kind==='reflected'){beam(ink,a,b,s.time,0xbce8ff,alpha*(1-k),3);stamp(3,b,k,68,alpha*.7);continue;}
   if(e.kind==='explosion'){stamp(e.classId,b,k,(e.skill===3?152:108)*size,alpha*.95);if(e.classId===2)crack(ground,{x:b.x,y:b.y+28},70,k,color);continue;}
   if(e.kind==='impact'){
    stamp(e.classId,b,k,(e.classId===1?112:e.classId===4?110:94)*size,alpha);spark(ink,b,color,k,.8);
    if(e.classId===1)beam(ink,e.originFromField?{x:a.x,y:a.y-91}:{x:b.x-8,y:b.y-115},b,s.time,0x65a9ff,alpha*(1-k),6);
    continue;
   }
   switch(e.classId){
    case 0:
     if(e.skill===2||e.skill===3){shield(ink,a,42+8*Math.sin(k*Math.PI),0x7be8f1,alpha*(1-k*.6));stamp(0,a,k,83,alpha*.6);}
     else {stamp(0,b,k,(e.skill===3?142:99)*size,alpha,e.skill===1?-32:0);slash(ink,b,k,color,e.skill===3);if(e.skill===1)slash(ink,{x:b.x+8,y:b.y+6},clamp(k+.18),0xe7ffff);if(e.skill===3)crack(ground,{x:b.x,y:b.y+25},77,k,color);}
     break;
    case 1:
     if(e.skill===3){glow(ink,{x:b.x,y:b.y-82},0x273c78,55,alpha*.65);stamp(1,b,k,148*size,alpha);}
     else {let previous={x:a.x+10,y:a.y-20};for(const p of targets){const origin=e.skill===0?{x:p.x-10,y:p.y-130}:previous;beam(ink,origin,p,s.time,color,alpha*(1-k*.7),e.skill===0?7:5);stamp(1,p,k,(e.skill===0?125:91)*size,alpha);if(e.skill===2){beam(ground,p,a,s.time,0xd3c3ff,alpha*(1-k),5);stream(ink,p,a,s.time,0xa0d5ff,alpha*(1-k));}previous=p;}}
     break;
    case 2:
     if(e.skill===0)stamp(2,{x:a.x,y:a.y-17},k,77,alpha);
     else if(e.skill===1){beam(ink,a,b,s.time,0x8edfff,alpha*(1-k*.5),5);stamp(2,b,k,98,alpha*.75);}
     else if(e.skill===2){stamp(2,b,k,135*size,alpha);crack(ground,{x:b.x,y:b.y+25},65,k,color);}
     else {stamp(2,b,k,174*size,alpha);crack(ground,{x:b.x,y:b.y+25},89,k,color);}
     break;
    case 3:
     if(e.skill===0){stamp(3,a,k,149*size,alpha);crack(ground,{x:a.x,y:a.y+26},90,k,0x87d9ff);for(const p of targets)spark(ink,p,0xb8f3ff,k,.7);}
     else if(e.skill===1){for(const dx of [-1,0,1]){const p={x:a.x+dx*(25+20*k),y:a.y-38-34*k};beam(ink,{x:a.x+dx*12,y:a.y-15},p,s.time,color,alpha*(1-k),5);}shield(ink,a,43,0xb4ddf0,alpha*(1-k));}
     else if(e.skill===2){shield(ink,a,45,0xb9e8ff,alpha*(1-k*.55),true);stamp(3,a,k,87,alpha*.65);}
     else {stamp(0,a,k,145*size,alpha,-s.time*180);slash(ink,a,k,0xb5ebff,true);crack(ground,{x:a.x,y:a.y+25},70,k,color);}
     break;
    case 4:
     if(e.skill===0)stamp(4,{x:a.x+12,y:a.y-12},k,70,alpha);
     else if(e.skill===1||e.skill===2){for(const dx of [-1,1])stamp(4,{x:a.x+dx*22,y:a.y+4},k,e.skill===2?95:76,alpha*.85);}
     else for(const p of targets){beam(ink,{x:p.x+45,y:p.y-140},p,s.time,0xffb045,alpha*(1-k),9);stamp(4,p,k,135*size,alpha);}
     break;
    case 5:
     if(e.skill===0){stream(ink,{x:a.x+10,y:a.y-20},b,s.time,color,alpha*(1-k*.6));stamp(5,b,k,99*size,alpha);}
     else if(e.skill===1){shield(ink,b,43,color,alpha*(1-k*.6));stamp(5,b,k,94*size,alpha);}
     else if(e.skill===2){stamp(5,a,k,124*size,alpha);for(const dx of [-1,0,1])stream(ink,{x:a.x+dx*35,y:a.y-65},a,s.time,color,alpha*(1-k));}
     else for(const p of targets){stream(ink,{x:a.x,y:a.y-18},p,s.time,0xb6ff9d,alpha);stamp(5,p,k,110*size,alpha);}
     break;
   }
  }
  // Skill projectiles use substantial trails; ordinary attacks stay subordinate.
  for(const projectile of s.projectiles.filter(p=>!p.basic).slice(-12)){
   const p=map.point(projectile);if(!visible(p))continue;state.projectiles++;
   const a=map.point(projectile.source),d=Math.max(1,Math.hypot(p.x-a.x,p.y-a.y)),tail={x:p.x-(p.x-a.x)/d*31,y:p.y-(p.y-a.y)/d*31},color=palettes[projectile.source.classId];
   beam(ink,tail,p,s.time,color,.95,8);glow(ink,p,color,22,.65);ink.fillStyle(0xfff4d8,1);ink.fillCircle(p.x,p.y,6);stamp(projectile.source.classId,p,.3,62,.9);
  }
  const shownFields=[];
  const fields=s.fields.filter(f=>f.until>s.time&&visible(map.point(f))).sort((a,b)=>Number(b.owner?.id===s.player.heroId)-Number(a.owner?.id===s.player.heroId)).slice(0,16);
  for(const f of fields){
   const p=map.point(f),age=s.time-(f.start||0),mine=f.owner?.id===s.player.heroId,alpha=mine?.85:crowded?.4:.6;
   if(shownFields.some(v=>v.kind===f.kind&&Math.hypot(v.x-p.x,v.y-p.y)<(f.kind==='field'?65:30)))continue;shownFields.push({...p,kind:f.kind});state.persistent++;
   if(f.kind==='runeBarrage'){
    ground.lineStyle(2,0x9cceea,alpha);ground.strokeEllipse(p.x,p.y+20,f.s.radius*36,f.s.radius*20);stamp(2,p,(age%1),84,alpha*.55);
   }else if(f.kind==='cloud'){
    const q={x:p.x,y:p.y-91};for(const dx of [-1,0,1]){ink.fillStyle(0x203251,alpha*.7);ink.fillEllipse(q.x+dx*19,q.y+Math.abs(dx)*7,48,25);}
    beam(ink,{x:q.x-25,y:q.y+5},{x:q.x+25,y:q.y+10},s.time,0x8db7ff,alpha*.8,2);
    if(age%s.config.heroes[1].cloudTick<.2)stamp(1,p,(age%s.config.heroes[1].cloudTick)/.2,125,alpha);
   }else if(f.kind==='parasite'){
    for(const dx of [-1,1]){line(ink,[{x:p.x+dx*13,y:p.y+28},{x:p.x+dx*19,y:p.y+4},{x:p.x+dx*7,y:p.y-18}],0x397c3e,5,alpha);leaf(ink,{x:p.x+dx*17,y:p.y+3},dx*.7,0xb5ea85,alpha,9);}if(age%1<.3)stamp(5,p,(age%1)/.3,76,alpha*.7);
   }else if(f.kind==='field'){
    const r=Math.min(93,f.radius*18);shield(ground,{x:p.x,y:p.y+12},r,0x4f9fae,alpha*.6);for(const dx of [-1,1])shield(ground,{x:p.x+dx*r*.65,y:p.y+8},26,0x86d0dd,alpha*.45);
   }
  }
  const buffed=[...s.units,...s.towers].filter(u=>u.hp>0&&(u.hero||u.shield>0)&&visible(map.point(u))).sort((a,b)=>Number(b.id===s.player.heroId||b.shieldSource?.id===s.player.heroId)-Number(a.id===s.player.heroId||a.shieldSource?.id===s.player.heroId)).slice(0,22);
  for(const u of buffed){
   const p=map.point(u),mine=u.id===s.player.heroId,alpha=mine?.8:crowded?.3:.5,t=s.time;
   if(u.damageStore?.until>t){shield(ground,p,39,0x80d4f1,alpha);stream(ink,{x:p.x-28,y:p.y+16},{x:p.x,y:p.y-28},t,0xbbeeff,alpha);state.persistent++;}
   if(u.shield>0){shield(ground,p,u.tower?56:u.hero?37:27,palettes[u.shieldSource?.classId??u.classId]??0x8be095,alpha);state.persistent++;}
   if(u.linkUntil>t){const target=s.get(u.linkId);if(target){const q=map.point(target);beam(ink,p,q,t,0x69e2ad,alpha,3);stream(ink,p,q,t,0xc2ffb2,alpha);state.persistent++;}}
   if(u.tauntReductionUntil>t){for(const e of s.units.filter(e=>e.tauntId===u.id&&e.tauntUntil>t&&visible(map.point(e))).slice(0,5)){const q=map.point(e);line(ground,[q,p],0x95c9ec,2,alpha*.6);ink.lineStyle(3,0xc4edff,alpha);ink.strokeTriangle(q.x-6,q.y-47,q.x+6,q.y-47,q.x,q.y-39);}state.persistent++;}
   if(u.reflectUntil>t){shield(ground,p,35,0xb4e1ff,alpha,true);state.persistent++;}
   if(u.whirlUntil>t){const size=mine?115:91;stamp(0,p,(t%0.65)/.65,size,alpha*.7,-t*300)?.setDepth(70).setPosition(p.x,p.y+27).setDisplaySize(size,size*.5);slash(ground,{x:p.x,y:p.y+27},(t%0.5)*2,0x86cae6,false,.5);state.persistent++;}
   if(u.splashUntil>t){for(const dx of [-1,1]){const q={x:p.x+dx*19,y:p.y-7};glow(ink,q,0xff9836,9,alpha*.65);ink.fillStyle(0xffcc65,alpha);ink.fillCircle(q.x,q.y,3+Math.sin(t*15+dx));}state.persistent++;}
   if(u.empowerUntil>t){stamp(4,p,(t%1.6)/1.6,mine?79:65,alpha*.8)?.setDepth(75).setPosition(p.x,p.y+25);for(const dx of [-1,0,1]){const q={x:p.x+dx*8,y:p.y-47-Math.sin(t*3)*3};ink.fillStyle(0xffaa43,alpha);ink.fillTriangle(q.x-3,q.y+4,q.x,q.y-5,q.x+3,q.y+4);}state.persistent++;}
   if(u.boostUntil>t){for(const dx of [-1,1])stream(ink,{x:p.x+dx*20,y:p.y+25},{x:p.x+dx*13,y:p.y-37},t,0x9eef83,alpha);state.persistent++;}
  }
  for(let i=used;i<sprites.length;i++)sprites[i].setVisible(false);
  for(let i=labelUsed;i<labels.length;i++)labels[i].setVisible(false);
  state.spriteCount=used;return active.length+state.persistent+state.projectiles;
 },destroy(){ground.destroy();ink.destroy();sprites.forEach(s=>s.destroy());labels.forEach(s=>s.destroy());}};
}

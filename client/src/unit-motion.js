import {inAttackRange} from '../../shared/attack-range.js';
import {HERO_WALK_ART} from './walk-animation.js';
const tau=Math.PI*2,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const motionStyle=u=>u.tower?'tower':u.hero?({0:'orc',1:'storm',2:'rune',3:'lord',4:'flame',5:'forest',6:'assassin'}[u.classId]||'orc'):({melee:'golem',ranged:'arbalest',siege:'cannon'}[u.type]||'golem');
const floating=style=>['rune','cannon','forest'].includes(style);

// Pose is a pure projection of the shared simulation clock. No render-frame timer
// advances combat, gait or attack cycles, so paused/replayed snapshots stay still.
export function unitMotionPose(u,time,{moving=false,targetInRange=false,side=0}={}){
 const style=motionStyle(u),phase=time*tau*(style==='lord'?.95:style==='golem'?.9:1.1)+(u.id||0)*.73;
 const c={stride:0,bodyLean:0,bodyLift:0,weaponSwing:0,weaponPull:0,cloth:0,fin:0,core:0};
 const result={style,action:'idle',phase,frame:0,attackPhase:null,dx:0,dy:0,angle:0,channels:c};
 if(u.hp<=0){result.action='dead';return result;}
 if(u.stunUntil>time){result.action='controlled';return result;}
 if(u.dash||u.currentDash){result.action='dash';return result;}
 if(u.channelUntil>time){result.action='channel';return result;}
 if(u.skillAnimation&&time>=u.skillAnimation.start&&time<u.skillAnimation.end){result.action='skill';return result;}
 const age=u.lastAttackAt==null?Infinity:time-u.lastAttackAt,duration=style==='tower'?.48:style==='lord'?.52:style==='golem'?.46:.4;
 const attacking=age>=0&&age<duration,preparing=!attacking&&targetInRange&&u.cd>time&&u.cd-time<=.14;
 if(attacking||preparing){
  const k=attacking?age/duration:1-(u.cd-time)/.14;
  result.action=preparing?'prepare':k<.34?'attack':'recover';result.attackPhase=k;
  result.frame=preparing?1:k<.34?2:3;
  const strike=preparing?-.42*k:Math.cos(k*Math.PI/2)*(1-k),recover=preparing?0:Math.sin(Math.PI*k)*(1-k);
  c.weaponSwing=strike;c.weaponPull=preparing?-.45*k:strike;c.core=preparing?k*.45:(1-k)**2;c.bodyLean=strike;c.fin=recover;c.cloth=recover;
  const tx=u.attackTo?.x??u.x,ty=u.attackTo?.y??u.y,dx=tx-u.x,dy=(ty-u.y)*(side?1:-1),len=Math.hypot(dx,dy)||1;
  const recoil=['rune','cannon','arbalest','tower'].includes(style)?-2.2:2.4;
  result.dx=dx/len*recoil*recover;result.dy=dy/len*recoil*recover;
  result.angle=(style==='golem'||style==='orc'||style==='lord')?strike*(dx<0?-1:1)*3:0;
 }else if(moving&&!u.tower){
  result.action='move';c.stride=Math.sin(phase);c.bodyLean=Math.sin(phase)*.2;c.bodyLift=Math.abs(Math.sin(phase))*.5;c.cloth=Math.sin(phase-.6);c.fin=Math.sin(phase);c.core=.18+.07*Math.sin(phase);
  // Drawn cycles already include weight transfer and secondary motion.
  result.dy=(u.hero&&HERO_WALK_ART[u.classId])||['arbalest','golem'].includes(style)?0:floating(style)?Math.sin(phase*.6)*.7:-Math.abs(Math.sin(phase))*1.1;
 }else if(floating(style)){
  c.cloth=Math.sin(phase*.35)*.12;c.fin=Math.sin(phase*.35)*.12;c.core=.12;
 }
 return result;
}

// A small continuous skinning field: legs move oppositely around the hips,
// weapon arms turn around shoulders, while head and torso remain coherent.
export function deformUnitVertex(x,y,pose){
 const c=pose.channels,style=pose.style,lower=clamp((y-.04)/.35),upper=1-clamp((y+.02)/.42),left=clamp((-x-.02)*5),right=clamp((x-.02)*5),edge=Math.min(1,Math.abs(x)*2.5);
 let dx=0,dy=0;
 if(['golem','orc','lord','assassin'].includes(style)){
  const legSign=Math.tanh(x*16),heavy=style==='lord'?.8:1;
  dx+=c.stride*.035*lower*legSign*heavy;dy+=c.stride*.052*lower*legSign*heavy;
  dx-=c.stride*.012*upper*edge;dy-=Math.abs(c.stride)*.008*upper;
  const arm=left*clamp((y+.35)/.2)*(1-clamp((y-.25)/.2)),angle=c.weaponSwing*(style==='lord'?.32:.43)*arm;
  const px=x+.18,py=y+.1;dx+=(px*Math.cos(angle)-py*Math.sin(angle)-px)*arm;dy+=(px*Math.sin(angle)+py*Math.cos(angle)-py)*arm;
  dx+=c.bodyLean*.012*upper;dy-=c.bodyLift*.012*upper;
 }else if(style==='arbalest'){
  const weapon=clamp(1-Math.abs(y+.015)*4)*clamp((x+.35)*2.7);
  dx+=c.weaponPull*.052*weapon;dy-=c.weaponPull*.025*weapon;
  dx+=c.cloth*.024*lower*edge;dy+=c.stride*.024*lower*Math.tanh(x*12);
 }else if(style==='rune'||style==='cannon'){
  const barrel=clamp(1-Math.abs(y-.025)*3.2)*(style==='rune'?right:left);
  dx-=c.weaponPull*.055*barrel;dy-=c.weaponPull*.018*barrel;
  dx+=c.fin*.023*edge*(y<0?1:-1);dy+=c.fin*.022*edge*Math.tanh(x*9);
 }else if(style==='flame'||style==='storm'){
  dx+=c.cloth*.028*lower*edge;dy+=c.stride*.014*lower*Math.tanh(x*10);
  const arm=clamp((x+.05)*4)*clamp(1-Math.abs(y+.17)*3);dx+=c.weaponPull*.018*arm;dy-=c.weaponPull*.018*arm;
 }else if(style==='forest'){
  dx+=c.cloth*.028*edge*(y+.5);dy+=c.stride*.018*lower*Math.tanh(x*10);
  dx+=c.weaponPull*.02*right*upper;dy-=c.weaponPull*.016*right*upper;
 }else if(style==='tower'){
  const core=clamp(1-Math.abs(y+.14)*4);dx+=x*c.core*.015*core;dy+=c.weaponPull*.017*core;
 }
 return {x:x+dx,y:y+dy};
}

export function createUnitMotionModel(){
 const tracks=new Map();let match,lastTime=-Infinity;const report=[];
 return {report,begin(sim){if(match!==(sim.matchId??sim)||sim.time<lastTime-.5)tracks.clear();match=sim.matchId??sim;lastTime=sim.time;report.length=0;},pose(sim,u,point){
  const stamp=sim._serverTime??sim.time,old=tracks.get(u.id),delta=old?Math.hypot(u.x-old.x,u.y-old.y):0;
  let changedAt=old?.changedAt??-Infinity;
  if(old&&delta>1e-5&&delta<=Math.max(1.5,(u.speed||0)*Math.max(.05,stamp-old.stamp)*2.5))changedAt=stamp;
  if(!old&&Number.isFinite(u._renderFromX)&&Math.hypot(u.x-u._renderFromX,u.y-u._renderFromY)>1e-5)changedAt=stamp;
  const pixelDelta=point&&old?.point?Math.hypot(point.x-old.point.x,point.y-old.point.y):0;
  let renderChangedAt=old?.renderChangedAt??changedAt;
  if(pixelDelta>1e-4&&pixelDelta<27)renderChangedAt=sim.time;
  tracks.set(u.id,{x:u.x,y:u.y,stamp,changedAt,renderChangedAt,point:point?{x:point.x,y:point.y}:null});
  const target=sim.get(u.targetId),targetInRange=inAttackRange(u,target);
  const moving=point&&old?.point?sim.time-renderChangedAt<=.32:sim.time-changedAt<=.32;
  const pose=unitMotionPose(u,sim.time,{moving:!targetInRange&&(u.speed||0)>0&&moving,targetInRange,side:sim.player.side});
  return pose;
 },end(live){for(const id of tracks.keys())if(!live.has(id))tracks.delete(id);},get tracked(){return tracks.size;}};
}

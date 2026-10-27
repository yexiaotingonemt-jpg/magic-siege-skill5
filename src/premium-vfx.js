import {names} from './config.js';
import {available} from './skill-value.js';
import {VFX_PROFILES,vfxProfile,vfxAtlasFrame,easeOut,smooth} from './vfx-profiles.js';
import {clamp,mix,point,line,arc,glow,diamond,leaf,shield,ribbon,pathPoint,burst,sigil,crack} from './vfx-brushes.js';
export const skillVisualProfiles=VFX_PROFILES;
const tau=Math.PI*2,usable=v=>available(v)>1e-7;
export function actionPose(u,time,side=0){
 const a=u.skillAnimation,dir=(u.side?1:-1)*(side?-1:1);
 if(u.dash)return {frame:2,dx:0,dy:0,angle:dir*9};
 if(u.channelUntil>time)return {frame:2,dx:Math.sin(time*20)*.8,dy:1,angle:0};
 if(a&&time>=a.start&&time<a.end){const wind=time<a.release,k=wind?clamp((time-a.start)/Math.max(.05,a.release-a.start)):clamp((time-a.release)/.42),big=a.skill===3;
  return {frame:wind?1:k<.38?2:3,dx:u.classId===2&&!wind?Math.sin(k*Math.PI)*-3:0,dy:wind?-Math.sin(k*Math.PI)*(big?5:2):Math.sin(k*Math.PI)*(u.classId===0?2:0),angle:u.classId===0?(wind?-7:12*(1-k))*dir:u.classId===4&&big?Math.sin(k*Math.PI)*-3:0};
 }
 const k=clamp((time-(u.lastAttackAt??-10))/.4);return {frame:0,dx:0,dy:Math.sin(k*Math.PI)*2*dir,angle:0};
}
export function createSkillAnimation(scene){
 const atlas=scene.textures.get('hero-vfx-v20'),image=atlas.getSourceImage();
 for(let row=0;row<5;row++)for(let col=0;col<4;col++){const r=vfxAtlasFrame(row,col,image.width,image.height);atlas.add(row*4+col,0,r.x,r.y,r.width,r.height);}
 const ground=scene.add.graphics().setDepth(65),ink=scene.add.graphics().setDepth(9000),veil=scene.add.graphics().setDepth(7000).setScrollFactor(0),sprites=[],captions=[],cache=new Map(),shaken=new Set();let used=0,captionUsed=0;
 const title=scene.add.text(250,58,'',{fontFamily:'SimSun',fontSize:'22px',fontStyle:'bold',color:'#f3ecdc',stroke:'#101521',strokeThickness:5}).setOrigin(.5).setScrollFactor(0).setDepth(11500).setVisible(false);
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;let cameraRef,lastMatch,lastTime=-Infinity,artScale=1,artOpacity=1;
 const state={version:'hero-vfx-v20',events:[],areas:[],burns:[],persistent:0,projectiles:0,spriteCount:0,maxSprites:128,cinematics:[],signatures:[],crowded:false};
 function art(id,skill,p,size,alpha=1,rotation=0,depth=8800,height=size){
  const profile=vfxProfile(id,skill);if(!profile||used>=state.maxSprites||alpha<.015)return;
  let sp=sprites[used];if(!sp){sp=scene.add.image(0,0,'hero-vfx-v20',profile.frame);sprites.push(sp);}used++;
  sp.setVisible(true).setTexture('hero-vfx-v20',profile.frame).setOrigin(.5).setPosition(p.x,p.y).setDisplaySize(size*artScale,height*artScale).setRotation(rotation).setAlpha(clamp(alpha*artOpacity)).setDepth(depth).setBlendMode(0);return sp;
 }
 function caption(p,text,id,big=false){if(captionUsed>=7)return;let label=captions[captionUsed];if(!label){label=scene.add.text(0,0,'',{fontFamily:'SimSun',fontStyle:'bold',color:'#e9e4d0',stroke:'#14201e',strokeThickness:4}).setOrigin(.5).setDepth(11400);captions.push(label);}captionUsed++;
  label.setVisible(true).setFontSize(big?16:12).setText(text).setPosition(p.x,Math.min(p.y-65,(scene.statusIcons?.top(id)??p.y-38)-30));
 }
 function contact(p,k,c,r=22,alpha=1){glow(ink,p,c,r*(1-k),alpha*.4);arc(ground,{x:p.x,y:p.y+13},r*(.5+easeOut(k)),0,tau,c,2,alpha*(1-k),.55);burst(ink,p,k,c,state.crowded?4:7,r,alpha);}
 function petals(p,k,color,count=7,r=48,alpha=1){for(let i=0;i<count;i++){const a=i*tau/count+.3,q={x:p.x+Math.cos(a)*r*easeOut(k),y:p.y+Math.sin(a)*r*.45*easeOut(k)-k*20};leaf(ink,q,a+k,7*(1-k)+2,color,alpha*(1-k));}}
 function haloShield(p,k,c,r=35,alpha=1){shield(ink,{x:p.x,y:p.y-3},c,r*(.8+.2*easeOut(k)),alpha*(1-k*.65));for(const dx of [-1,1])arc(ground,{x:p.x,y:p.y+23},r,dx>0?-1.1:2.1,dx>0?1.1:4.2,c,3,alpha*(1-k),.55);}
 function sword(p,angle,length,color,alpha){const end={x:p.x+Math.cos(angle)*length,y:p.y+Math.sin(angle)*length};line(ink,[p,end],color,5,alpha);line(ink,[p,end],0xf1e7ff,1.2,alpha*.9);const dx=Math.cos(angle),dy=Math.sin(angle);line(ink,[{x:p.x-dy*7+dx*8,y:p.y+dx*7+dy*8},{x:p.x+dy*7+dx*8,y:p.y-dx*7+dy*8}],color,3,alpha);}
 function crown(p,k,alpha=1){line(ink,[{x:p.x-27,y:p.y-6},{x:p.x-32,y:p.y-30},{x:p.x-14,y:p.y-20},{x:p.x,y:p.y-43},{x:p.x+14,y:p.y-20},{x:p.x+32,y:p.y-30},{x:p.x+27,y:p.y-6},{x:p.x-27,y:p.y-6}],0xd2b5f2,3,alpha);diamond(ink,{x:p.x,y:p.y-19},7+2*k,0xf3ddff,alpha);}
 function chargeCorridor(a,b,radius,alpha,time){
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length,angle=Math.atan2(dy,dx);
  for(const sign of [-1,1])line(ground,[{x:a.x+nx*sign*radius,y:a.y+ny*sign*radius},{x:b.x+nx*sign*radius,y:b.y+ny*sign*radius}],0xd5a5ed,1.5,alpha);
  arc(ground,a,radius,angle+Math.PI/2,angle+Math.PI*1.5,0xa87dce,1,alpha*.6);arc(ground,b,radius,angle-Math.PI/2,angle+Math.PI/2,0xa87dce,1,alpha*.6);
  for(let j=1;j<=5;j++){const q=point(a,b,j/6),pulse=.65+.15*Math.sin(time*4-j);line(ground,[{x:q.x-nx*8-dx/length*5,y:q.y-ny*8-dy/length*5},q,{x:q.x+nx*8-dx/length*5,y:q.y+ny*8-dy/length*5}],0x9d71c5,2,alpha*pulse);}
 }
 function castEffect(e,profile,a,b,k,alpha,targets,s){
  const h=s.get(e.sourceId);if(!h)return;const c=profile.color,light=profile.light,big=e.skill===3,p=point(a,{x:a.x,y:a.y-14},k);
  if(big){sigil(ground,{x:a.x,y:a.y+27},32+easeOut(k)*18,c,s.time,alpha*.7,8);for(let j=0;j<4;j++){const angle=j*Math.PI/2+s.time*.35,q={x:a.x+Math.cos(angle)*(45-20*k),y:a.y+18+Math.sin(angle)*(20-9*k)};diamond(ink,q,3+k*4,light,alpha*.85,angle);}glow(ground,p,c,17,alpha*k*.35);}
  if(e.classId===0){if(e.skill===0){arc(ink,a,24+k*16,-2.6,-.4,c,3,alpha*k,.7);art(0,0,{x:a.x-15,y:a.y-13},45+k*16,alpha*k*.45,-.8);}if(e.skill===1){for(const sign of [-1,1])line(ink,[{x:a.x+sign*15,y:a.y-10},{x:a.x+sign*(25+12*k),y:a.y-25-8*k}],profile.accent,4,alpha*k);}if(e.skill===2)for(const q of [a,b])sigil(ground,{x:q.x,y:q.y+23},22*k,c,s.time,alpha*k);if(big)shield(ground,{x:a.x,y:a.y+4},c,34,alpha*k*.6);}
  if(e.classId===2){const hand={x:a.x+12,y:a.y-15};for(let j=0;j<3;j++)arc(ink,hand,8+j*5,(-s.time*3+j),(-s.time*3+j)+Math.PI*1.4,e.skill===0?0x97e55c:c,2,alpha*k);if(e.skill===2||big){for(const dx of [-1,1])diamond(ink,{x:a.x+dx*(20+8*k),y:a.y-8},5+k*5,profile.accent,alpha*k);}if(big)art(2,3,{x:a.x,y:a.y-22},65*k,alpha*k*.6);}
  if(e.classId===3){if(e.skill===0){const radius=s.config.heroes[3].skills[0].targetRange*18,angle=Math.atan2(b.y-a.y,b.x-a.x),halfAngle=Math.acos(.35);arc(ground,a,radius,angle-halfAngle,angle+halfAngle,c,2,alpha*k*.65);for(const sign of [-1,1])line(ground,[a,{x:a.x+Math.cos(angle+sign*halfAngle)*radius,y:a.y+Math.sin(angle+sign*halfAngle)*radius}],c,1,alpha*k*.35);state.areas.push({kind:'lordFan',ownerId:e.sourceId,radius,halfAngle});}if(e.skill===1){const radius=s.config.heroes[3].skills[1].radius*18;chargeCorridor(a,b,radius,alpha*.65,s.time);state.areas.push({kind:'lordCharge',ownerId:e.sourceId,radius,from:a,to:b});}if(big){crown({x:a.x,y:a.y-15-k*14},k,alpha*k);sigil(ground,{x:a.x,y:a.y+24},52,c,-s.time,alpha*k,3);}}
  if(e.classId===4){if(e.skill===0){const head=pathPoint({x:a.x+15,y:a.y-17},b,k,15);line(ink,[{x:a.x+15,y:a.y-17},head],c,4,alpha*k);glow(ink,head,light,8,alpha*k*.5);}if(e.skill===1)art(4,1,{x:a.x+14,y:a.y-17},25+30*k,alpha*.85,k*2);if(e.skill===2){const q={x:b.x,y:b.y+20};line(ground,[{x:q.x-17*k,y:q.y},{x:q.x,y:q.y-12*k},{x:q.x+17*k,y:q.y},{x:q.x,y:q.y+12*k},{x:q.x-17*k,y:q.y}],c,2,alpha*k);}if(big){for(const q of targets){sigil(ground,{x:q.x,y:q.y+20},23,c,s.time*2,alpha*k,6);line(ink,[{x:q.x,y:q.y-90*k},{x:q.x,y:q.y-70*k}],light,3,alpha*k);}}}
  if(e.classId===5){if(e.skill===0){for(const sign of [-1,1])leaf(ink,{x:a.x+sign*(22-12*k),y:a.y-17},sign*k,8,c,alpha*k);}if(e.skill===1){for(const q of [a,b])arc(ground,{x:q.x,y:q.y+22},18+k*8,0,tau,c,2,alpha*k,.45);}if(e.skill===2){diamond(ink,{x:a.x,y:a.y-9-k*23},5,0xda887e,alpha*(1-k*.3));for(let j=0;j<3;j++)leaf(ground,{x:a.x+Math.cos(j*tau/3)*25,y:a.y+21+Math.sin(j*tau/3)*12},j*tau/3,7,c,alpha*k);}if(big){line(ground,[{x:a.x-28*k,y:a.y+25},{x:a.x,y:a.y+12},{x:a.x+28*k,y:a.y+25}],light,3,alpha*k);art(5,3,{x:a.x,y:a.y-20*k},75*k,alpha*k*.4,0,900+a.y);}}
 }
 function orcEffect(e,p,a,b,k,alpha,targets,s,role){
  const c=p.color,light=p.light;
  if(e.skill===0){art(0,0,{x:b.x,y:b.y-5},102*(.8+.3*easeOut(k)),alpha*(1-k),-.2+k*.3);line(ink,[{x:b.x-25,y:b.y+14},{x:b.x+17,y:b.y-30}],light,5*(1-k)+1,alpha*(1-k));crack(ground,{x:b.x,y:b.y+21},k,c,42,alpha,-Math.PI/2);burst(ink,b,k,p.accent,7,38,alpha);}
  if(e.skill===1){art(0,1,{x:a.x,y:a.y-4},110,alpha*(1-k),0,8900);for(let j=0;j<3;j++){const z=clamp(k*1.6-j*.16);arc(ground,{x:a.x,y:a.y+24},20+65*easeOut(z),0,tau,c,2,alpha*(1-z)*.6,.45);}for(const q of targets)haloShield(q,k,c,27,alpha*.8);}
  if(e.skill===2){art(0,2,{x:(a.x+b.x)/2,y:(a.y+b.y)/2-9},Math.max(70,Math.min(155,Math.hypot(b.x-a.x,b.y-a.y)*.65)),alpha*(1-k)*.7,k*.25);for(const [j,q]of [a,b].entries()){const color=j?c:p.accent;sigil(ground,{x:q.x,y:q.y+23},24+12*Math.sin(k*Math.PI),color,s.time,alpha*(1-k));arc(ink,{x:q.x,y:q.y-7},20+6*Math.sin(k*Math.PI),0,tau,color,3,alpha*(1-k),1.6);for(const dx of [-1,1])diamond(ink,{x:q.x+dx*22,y:q.y-5},5,light,alpha*(1-k));}ribbon(ink,a,b,s.time,c,4,alpha*(1-k),30);ribbon(ink,b,a,-s.time,p.accent,3,alpha*(1-k),-22);for(const sign of [-1,1]){const q=pathPoint(sign>0?a:b,sign>0?b:a,easeOut(k),sign*28);diamond(ink,q,7,light,alpha*(1-k));}}
  if(e.skill===3){const formed=role==='shield-formed';art(0,3,{x:a.x,y:a.y-14-(formed?10:18)*Math.sin(k*Math.PI)},(formed?172:140)*(.65+.35*easeOut(k)),alpha*(1-smooth((k-.6)/.4))*.85,0,900+a.y);sigil(ground,{x:a.x,y:a.y+25},45+25*easeOut(k),p.accent,s.time,alpha*(1-k)*.7,6);for(let j=0;j<6;j++){const angle=j*tau/6,r=mix(68,24,easeOut(k)),q={x:a.x+Math.cos(angle)*r,y:a.y+Math.sin(angle)*r*.7-5};diamond(ink,q,10*(1-k*.4),j%2?c:p.accent,alpha*(1-k*.65),angle);line(ground,[q,{x:a.x,y:a.y+8}],c,1,alpha*(1-k)*.35);}if(formed){contact(a,k,light,50,alpha*.7);haloShield(a,k,c,48,alpha);}else for(const dx of [-1,1])ribbon(ink,{x:a.x+dx*46,y:a.y+25},{x:a.x,y:a.y-25},s.time,c,3,alpha*(1-k),15);}
 }
 function runeImpact(e,p,b,k,alpha,targets,s){
  const c=p.color;
  if(e.skill===0){art(2,0,b,82*(.5+easeOut(k)),alpha*(1-k),k*.4);for(let j=0;j<5;j++){const angle=j*tau/5,q={x:b.x+Math.cos(angle)*35*k,y:b.y+Math.sin(angle)*19*k};line(ink,[b,{x:q.x,y:q.y-18*Math.sin(k*Math.PI)},q],0xa2d951,3,alpha*(1-k));}contact(b,k,0xb3e66b,24,alpha*.7);}
  if(e.skill===1){art(2,1,b,105*(.5+.5*easeOut(k)),alpha*(1-k));for(let j=0;j<6;j++){const angle=j*tau/6;diamond(ink,{x:b.x+Math.cos(angle)*37*easeOut(k),y:b.y+Math.sin(angle)*27*easeOut(k)},12*(1-k)+3,0xd8f8ff,alpha*(1-k),angle);}arc(ground,{x:b.x,y:b.y+20},31*easeOut(k),0,tau,0x9de6ff,2,alpha*(1-k),.5);}
  if(e.skill===2){art(2,2,{x:b.x,y:b.y+10},104,alpha*(1-k),s.time*.2,76,54);line(ink,[{x:b.x+18*(1-k),y:b.y-100*(1-k)},{x:b.x,y:b.y+8}],0xe5faff,6,alpha*(1-k)**2);contact(b,k,c,39,alpha);crack(ground,{x:b.x,y:b.y+18},k,p.accent,48,alpha,-1.5);}
  if(e.skill===3){const radius=s.config.heroes[2].skills[3].radius*18;art(2,3,{x:b.x,y:b.y-22-18*Math.sin(k*Math.PI)},155*(.4+.6*easeOut(clamp(k*3))),alpha*(1-smooth((k-.5)/.5)),k*.22,8800,180);for(let j=0;j<3;j++){const z=clamp(k*1.7-j*.18);arc(ground,{x:b.x,y:b.y+16},radius*(.25+.9*easeOut(z)),0,tau,j===1?p.accent:c,3-j*.6,alpha*(1-z),.6);}for(let j=0;j<8;j++){const angle=j*tau/8;diamond(ink,{x:b.x+Math.cos(angle)*radius*easeOut(k),y:b.y+Math.sin(angle)*radius*.6*easeOut(k)-Math.sin(k*Math.PI)*35},10*(1-k)+3,j%2?c:p.accent,alpha*(1-k),angle+k);}for(const q of targets)line(ground,[b,q],c,3,alpha*(1-k)*.5);glow(ink,b,p.light,24*(1-k),alpha*.5);}
 }
 function lordEffect(e,p,a,b,k,alpha,targets,s,role){
  const c=p.color;
  if(e.skill===0){const angle=Math.atan2(b.y-a.y,b.x-a.x),radius=s.config.heroes[3].skills[0].targetRange*18,halfAngle=Math.acos(.35);art(3,0,point(a,b,.6),155,alpha*(1-k),angle-Math.PI/2,8800,120);for(let j=0;j<3;j++)crack(ground,a,clamp(k*1.5),j%2?c:0x7346a3,radius*.8,alpha*.55,angle+(j-1)*.4);arc(ground,a,radius*easeOut(k),angle-halfAngle,angle+halfAngle,c,3,alpha*(1-k));state.areas.push({kind:'lordFan',ownerId:e.sourceId,radius,halfAngle});for(const q of targets)contact(q,k,p.light,14,alpha*.5);}
  if(e.skill===1){const angle=Math.atan2(b.y-a.y,b.x-a.x);art(3,1,a,100,alpha*(1-k),angle+Math.PI/4);ribbon(ground,a,b,s.time,c,8,alpha*(1-k)*.4,0);}
  if(e.skill===2){art(3,2,{x:a.x,y:a.y-5},125,alpha*(1-k)*.75,0,900+a.y);for(let j=0;j<6;j++){const angle=j*tau/6,q={x:a.x+Math.cos(angle)*45,y:a.y+Math.sin(angle)*22+18};line(ink,[q,{x:q.x,y:q.y-24*easeOut(k)}],0xd3a2ef,3,alpha*(1-k));}sigil(ground,{x:a.x,y:a.y+23},50,c,s.time,alpha*(1-k),6);}
  if(e.skill===3&&role==='coronation'){art(3,3,{x:a.x,y:a.y-42-13*easeOut(k)},186*(.65+.35*easeOut(k)),alpha*(1-smooth((k-.65)/.35))*.82,0,900+a.y,220);for(let j=0;j<3;j++){const angle=-Math.PI/2+(j-1)*.7,q={x:a.x+Math.cos(angle)*52,y:a.y+Math.sin(angle)*32+12};sword(q,angle,32+12*easeOut(k),p.light,alpha*(1-k));}sigil(ground,{x:a.x,y:a.y+24},65,c,-s.time,alpha*(1-k)*.8,9);for(const dx of [-1,1])line(ink,[{x:a.x+dx*42,y:a.y+20},{x:a.x+dx*42,y:a.y-95*easeOut(k)}],p.light,2,alpha*(1-k)*.55);glow(ground,a,0x60388d,44,alpha*(1-k)*.25);}
  if(e.skill===3&&role==='royal-splash'){for(const q of targets){const angle=Math.atan2(q.y-b.y,q.x-b.x);line(ink,[b,q],c,5,alpha*(1-k));sword({x:q.x-10,y:q.y+16},-Math.PI/3,39,p.light,alpha*(1-k));contact(q,k,c,20,alpha*.7);}arc(ground,{x:b.x,y:b.y+17},45*easeOut(k),0,tau,c,2,alpha*(1-k),.5);}
 }
 function fireEffect(e,p,a,b,k,alpha,targets,s){
  const c=p.color;
  if(e.skill===0){const angle=Math.atan2(b.y-a.y,b.x-a.x);line(ink,[{x:a.x+10,y:a.y-15},b],c,8*(1-k),alpha*(1-k)**2);line(ink,[{x:a.x+10,y:a.y-15},b],p.light,2,alpha*(1-k)**2);art(4,0,{x:b.x,y:b.y-12},90,alpha*(1-k),angle+Math.PI/4);burst(ink,b,k,c,7,30,alpha);}
  if(e.skill===1){const big=!!e.bigFireball,size=big?138:96;art(4,1,b,size*(.65+.35*easeOut(k)),alpha*(1-k),k*.6);for(let j=0;j<(big?3:2);j++)arc(ink,b,(18+j*13)*(1+.35*easeOut(k)),-k*3+j*2,-k*3+j*2+Math.PI*1.2,j%2?c:p.light,4-j,alpha*(1-k));contact(b,k,c,big?51:30,alpha*.8);if(big)burst(ink,b,k,p.accent,10,62,alpha);}
  if(e.skill===2){art(4,2,{x:b.x,y:b.y-7},88,alpha*(1-k),0,8800);for(const sign of [-1,1]){const ps=[];for(let j=0;j<=14;j++){const z=j/14;ps.push({x:b.x+sign*Math.sin(z*Math.PI)*20*(1-k*.5),y:b.y+22-z*63});}line(ink,ps,c,3,alpha*(1-k));}diamond(ground,{x:b.x,y:b.y+20},20,c,alpha*(1-k),Math.PI/2);}
  if(e.skill===3){const lead=targets[0]||b,sky={x:clamp(lead.x,96,404),y:clamp(lead.y-92-18*Math.sin(k*Math.PI),cameraRef.scrollY+95,cameraRef.scrollY+cameraRef.height-95)};art(4,3,sky,180*(.8+.2*easeOut(k)),alpha*(1-smooth((k-.6)/.4))*.75,0,8800,180);for(const [i,q]of targets.entries()){const delay=i*.035,z=clamp((k-delay)/(1-delay)),fade=(1-z)**1.3;sigil(ground,{x:q.x,y:q.y+20},24+7*easeOut(z),c,s.time,alpha*fade,8);line(ink,[{x:q.x-8*(1-z),y:sky.y},{x:q.x,y:q.y+12}],c,18*fade+1,alpha*fade*.5);line(ink,[{x:q.x,y:sky.y-15},{x:q.x,y:q.y+10}],p.light,5*fade+1,alpha*fade*.9);contact(q,z,c,26,alpha);for(const dx of [-1,1])leaf(ink,{x:q.x+dx*(15+28*z),y:q.y-25*z},dx*z,14*(1-z),p.light,alpha*fade);}for(let j=0;j<6;j++){const angle=j*tau/6;line(ground,[{x:lead.x+Math.cos(angle)*32,y:lead.y+Math.sin(angle)*16+20},{x:lead.x+Math.cos(angle)*(45+25*k),y:lead.y+Math.sin(angle)*(22+12*k)+20}],c,2,alpha*(1-k)*.5);}}
 }
 function elfEffect(e,p,a,b,k,alpha,targets,s,map){
  const c=p.color;
  if(e.skill===0){const angle=Math.atan2(b.y-a.y,b.x-a.x);ribbon(ink,{x:a.x,y:a.y-10},b,s.time,c,3,alpha*(1-k)**2,14);art(5,0,b,75,alpha*(1-k),angle+Math.PI/4);const healed=(e.haloTargets||[]).map(t=>s.get(t.id)).filter(u=>u&&u.side===e.side).map(u=>map.point(u));for(const q of healed){ribbon(ink,b,q,s.time,p.light,2,alpha*(1-k)*.7,26);const head=pathPoint(b,q,easeOut(k),26);leaf(ink,head,Math.atan2(q.y-b.y,q.x-b.x),7,c,alpha*(1-k));}petals(b,k,c,5,25,alpha);}
  if(e.skill===1){for(const q of [a,b])art(5,1,{x:q.x,y:q.y+10},75,alpha*(1-k)*.75,0,900+q.y);for(const sign of [-1,1])ribbon(ink,a,b,s.time,c,2,alpha*(1-k),sign*20,sign>0?0:Math.PI);petals(b,k,p.light,6,30,alpha);}
  if(e.skill===2){for(const q of targets){art(5,2,{x:q.x,y:q.y+3},100*(.55+.45*easeOut(k)),alpha*(1-k),0,8800);petals(q,k,p.light,state.crowded?5:9,47,alpha);for(let j=0;j<3;j++){const angle=j*tau/3;diamond(ink,{x:q.x+Math.cos(angle)*35*k,y:q.y+Math.sin(angle)*20*k-20*k},5*(1-k),0x9983ad,alpha*(1-k));}}ribbon(ink,{x:a.x,y:a.y-8},{x:a.x,y:a.y-35},s.time,0xd48d88,2,alpha*(1-k),0);}
  if(e.skill===3){art(5,3,{x:a.x,y:a.y-60-12*easeOut(k)},205*(.55+.45*easeOut(clamp(k*2))),alpha*(1-smooth((k-.65)/.35))*.9,0,900+a.y,240);sigil(ground,{x:a.x,y:a.y+26},56,c,s.time,alpha*(1-k)*.5,7);for(const q of targets){ribbon(ground,{x:a.x,y:a.y+25},{x:q.x,y:q.y+23},s.time,c,5,alpha*(1-k)*.7,14);ribbon(ink,{x:a.x,y:a.y-70},q,s.time,p.light,2,alpha*(1-k)*.7,30);for(const dx of [-1,1])line(ink,[{x:q.x+dx*14,y:q.y+23},{x:q.x+dx*10,y:q.y-55*easeOut(k)}],p.light,3,alpha*(1-k)*.65);petals(q,k,c,5,30,alpha*.8);}for(let j=0;j<(state.crowded?6:12);j++){const z=(j*.193+k*.8)%1,angle=j*2.4,q={x:a.x+Math.cos(angle)*72*z,y:a.y-94+z*110};leaf(ink,q,angle+k*2,5,p.light,alpha*(1-k)*.6);}}
 }
 function persistentEffects(s,map,visible){
  const active=s.fields.filter(f=>f.until>s.time&&(f.owner.hp>0||f.type==='lordScorch'));
  const fields=[...active.filter(f=>f.type!=='lordScorch').slice(-28),...active.filter(f=>f.type==='lordScorch').slice(-32)];
  for(const f of fields){
   const own=f.owner.id===s.player.heroId,alpha=own?.85:state.crowded?.28:.5,p=map.point(s.get(f.host)||f),a=map.point(f.owner);if(!visible(p)&&!visible(a))continue;
   if(f.kind==='runeBarrage'){const radius=f.s.radius*18,c=f.side!==s.player.side?0xe7a58c:0x88dce7,k=clamp(1-(f.tick-s.time)/(f.s.duration/f.s.shots));ground.fillStyle(c,.045);ground.fillCircle(p.x,p.y,radius);arc(ground,p,radius,0,tau,c,1.5,alpha*.85);for(let j=0;j<4;j++){const angle=j*Math.PI/2;arc(ground,p,radius+4,angle-.2,angle+.2,c,4,alpha);diamond(ground,{x:p.x+Math.cos(angle)*radius*.7,y:p.y+Math.sin(angle)*radius*.7},4,c,alpha,angle);}art(2,2,p,radius*1.65,alpha*.45,s.time*.18,72,radius*1.65);const head=pathPoint({x:a.x,y:a.y-18},p,k,95);ribbon(ground,a,p,s.time,0x8ccbd7,1,alpha*.18,95);diamond(ink,head,6,0xeffcff,alpha);line(ink,[{x:head.x+9,y:head.y-18},head],0x8ce1ef,3,alpha);art(2,2,{x:a.x,y:a.y-13},40,alpha*.55,-s.time*.7);state.areas.push({kind:f.kind,ownerId:f.owner.id,x:p.x,y:p.y,radius,remaining:f.remaining});state.persistent++;if(own)caption(a,'连轰 · '+f.remaining+'炮',f.owner.id);}
   if(f.kind==='link'&&s.get(f.host)&&usable(f.value)){for(const sign of [-1,1])ribbon(ground,{x:a.x,y:a.y+8},{x:p.x,y:p.y+8},s.time,sign>0?0x86d9a9:0xd7f5bd,2,alpha*.85,sign*15,sign>0?0:Math.PI);for(const [i,q]of [a,p].entries()){sigil(ground,{x:q.x,y:q.y+24},19,0x8bd5a8,s.time,alpha*.65,4);const head=pathPoint(a,p,(s.time*.55+i*.5)%1,15);leaf(ink,head,s.time+i,5,0xc3f0c7,alpha*.75);}state.persistent++;}
   if(f.kind==='lordBurn'&&usable(f.s.value)){const q=map.point(f.owner),radius=f.s.radius*18;art(3,2,{x:q.x,y:q.y-2},94,alpha*.42,0,900+q.y);for(let j=0;j<8;j++){const angle=j*tau/8+s.time*.15,rise=(s.time*.8+j*.17)%1,p={x:q.x+Math.cos(angle)*radius*.8,y:q.y+Math.sin(angle)*radius*.8};line(ground,[p,{x:p.x+Math.sin(s.time*2+j)*5,y:p.y-12-19*rise}],j%2?0xa78bd3:0xe0bdf4,2,alpha*(1-rise)*.7);}arc(ground,q,radius,0,tau,0x9e77ce,1,alpha*.23);state.areas.push({kind:f.kind,ownerId:f.owner.id,x:q.x,y:q.y,radius});state.persistent++;}
   if(f.kind==='dot'&&f.type==='lordScorch'&&s.get(f.host)&&usable(f.s.value)){
    const victim=s.get(f.host),intensity=victim.id===s.player.heroId?.85:state.crowded?.38:.68;
    for(let j=0;j<(state.crowded?3:4);j++){const rise=(s.time*1.3+j*.23+victim.id*.07)%1,x=p.x+(j-1.5)*8,y=p.y+22-rise*7;
     line(ink,[{x,y},{x:x+Math.sin(s.time*5+j)*4,y:y-10-rise*10},{x:x+2,y:y-19-rise*7}],j%2?0xd29bea:0xf2b87e,2,intensity*(1-rise*.6));}
    glow(ground,{x:p.x,y:p.y+20},0xb77cd6,victim.hero?20:14,intensity*.16);
    state.burns.push({unitId:victim.id,sourceId:f.owner.id,remaining:f.until-s.time,x:p.x,y:p.y});state.persistent++;
   }
  }
  for(const u of [...s.units,...s.towers]){
   if(u.hp<=0)continue;const p=map.point(u);if(!visible(p))continue;const own=u.id===s.player.heroId,alpha=own?.75:state.crowded?.24:.42;
   if(u.damageStore?.until>s.time&&usable(u.damageStore.value)){const ratio=clamp(u.damageStore.total*(u.damageStore.conversionRatio??1)/Math.max(1,available(u.damageStore.value)));for(let j=0;j<6;j++){const angle=s.time*.3+j*tau/6,q={x:p.x+Math.cos(angle)*29,y:p.y+Math.sin(angle)*15+11};diamond(ground,q,4+ratio*4,j<Math.ceil(ratio*6)?0xe2c593:0x5ba89e,alpha,angle);}art(0,3,{x:p.x,y:p.y-8},60+ratio*20,alpha*.32,0,900+p.y);state.persistent++;}
   if(u.shield>0&&u.shieldUntil>s.time&&usable(u.shieldValue)){shield(ground,{x:p.x,y:p.y+2},0x93dcd0,u.hero?33:24,alpha);if(u.classId===0)for(const dx of [-1,1])diamond(ground,{x:p.x+dx*25,y:p.y-5},7,0xd0b17c,alpha);state.persistent++;}
   if(u.guards?.some(g=>g.until>s.time&&usable(g.value))){for(const dx of [-1,1])arc(ground,{x:p.x,y:p.y+20},u.hero?30:23,dx<0?2.4:-.75,dx<0?3.9:.75,u.classId===3?0xba99db:0x8ccab9,2,alpha,.55);state.persistent++;}
   if(u.lordUlt?.until>s.time){crown({x:p.x,y:p.y-8},Math.sin(s.time*2),alpha*.65);for(let j=0;j<3;j++){const angle=-Math.PI/2+(j-1)*.9+s.time*.2,q={x:p.x+Math.cos(angle)*34,y:p.y+Math.sin(angle)*22+10};sword(q,angle,20,0xbaa1e1,alpha*.55);}sigil(ground,{x:p.x,y:p.y+24},37,0x9d7cce,-s.time,alpha*.45,3);state.persistent++;}
   if(u.dash){const f=u.dash,from=map.point({x:f.x,y:f.y}),to=map.point(f.end),angle=Math.atan2(to.y-from.y,to.x-from.x),k=clamp((s.time-f.start)/(f.until-f.start)),radius=f.s.radius*18;chargeCorridor(from,to,radius,alpha*.3,s.time);state.areas.push({kind:'lordCharge',ownerId:u.id,radius,from,to});for(let j=1;j<=3;j++){const q=point(from,to,Math.max(0,k-j*.09));art(3,1,q,82-j*10,alpha*(.45-j*.08),angle+Math.PI/4,900+q.y);}art(3,1,{x:p.x,y:p.y-7},104,alpha*.75,angle+Math.PI/4);for(const id of f.hit){const victim=s.get(id);if(victim&&s.time-(victim.lastHitAt??-10)<.25)contact(map.point(victim),clamp((s.time-victim.lastHitAt)/.25),0xd2b0f2,22,alpha);}state.persistent++;}
   for(const mark of (u.soulMarks||[]).filter(m=>m.until>s.time&&s.get(m.ownerId)).slice(0,1)){art(4,2,{x:p.x,y:p.y+4},43,alpha*.4,0,900+p.y);state.persistent++;}
   if(s.activeDebuffs(u,'attackSpeedDown').length){for(let j=0;j<3;j++){const angle=j*tau/3;diamond(ground,{x:p.x+Math.cos(angle)*19,y:p.y+22+Math.sin(angle)*7},5,0xb9eaff,alpha,angle);}state.persistent++;}
  }
 }
 return {get report(){return state;},draw(s,map,camera){
  cameraRef=camera;const match=s.matchId??s;if(lastMatch!==match||s.time<lastTime-.75){cache.clear();shaken.clear();}lastMatch=match;lastTime=s.time;
  ground.clear();ink.clear();veil.clear();used=0;captionUsed=0;title.setVisible(false);state.events=[];state.areas=[];state.burns=[];state.cinematics=[];state.signatures=[];state.persistent=0;state.projectiles=0;
  const visible=p=>p.y>camera.scrollY-200&&p.y<camera.scrollY+camera.height+180;
  for(const e of s.animations){if(e.kind==='damage'||cache.has(e.id)||!vfxProfile(e.classId,e.skill))continue;const p=vfxProfile(e.classId,e.skill),h=s.get(e.sourceId);let role=e.shieldFormed?'shield-formed':'activation';if(e.classId===3&&e.skill===3&&e.kind==='release'){const start=h?.lordUlt?.until-s.config.heroes[3].skills[3].duration;role=Number.isFinite(start)&&Math.abs(e.start-start)<.06?'coronation':'royal-splash';}cache.set(e.id,{...e,role,expires:e.start+(e.kind==='cast'?Math.max(.05,e.until-e.start):e.kind==='healing'?.5:e.kind==='impact'?p.impact:e.classId===3&&role==='royal-splash'?.7:p.release)});}
  for(const[id,e]of cache)if(e.expires<=s.time||e.start>s.time+.1)cache.delete(id);
  const events=[...cache.values()].filter(e=>e.start<=s.time&&(visible(map.point(e.from))||visible(map.point(e.to)))&&!(e.kind==='impact'&&e.classId===2&&!Object.hasOwn(e,'targets'))&&!(e.kind==='cast'&&(!s.get(e.sourceId)?.skillAnimation||s.get(e.sourceId).castUntil<=s.time))).sort((a,b)=>Number(b.sourceId===s.player.heroId)-Number(a.sourceId===s.player.heroId)||Number(b.skill===3)-Number(a.skill===3)||Number(a.kind==='healing')-Number(b.kind==='healing')||b.start-a.start).slice(0,32);
  state.crowded=s.units.filter(u=>u.hero&&u.hp>0&&visible(map.point(u))).length>8||events.length>14;
  const fullUltimates=new Set();for(const e of events){
   const profile=vfxProfile(e.classId,e.skill),a=map.point(e.from),b=map.point(e.to),k=clamp((s.time-e.start)/Math.max(.05,e.expires-e.start)),own=e.sourceId===s.player.heroId,alpha=own?1:state.crowded?.46:.72,targets=(e.targets?.length?e.targets:[e.to]).map(t=>({...map.point(t),id:t.id}));
   const priority=own||!state.crowded||!profile.ultimate||fullUltimates.has(e.sourceId)||fullUltimates.size<3;artScale=priority?1:.62;artOpacity=priority?1:.6;if(profile.ultimate&&priority&&!own)fullUltimates.add(e.sourceId);
   state.events.push({id:e.id,kind:e.kind,classId:e.classId,skill:e.skill,sourceId:e.sourceId,profile:names[e.classId][e.skill],signature:profile.signature,phase:k,role:e.role,lod:priority?'full':'compact',from:a,to:b});state.signatures.push(profile.signature);
   if(e.kind==='cast'){castEffect(e,profile,a,b,k,alpha,targets,s);if(own&&k<.8)caption(a,names[e.classId][e.skill],e.sourceId,profile.ultimate);continue;}
   if(e.kind==='heat'){glow(ground,a,profile.color,15,alpha*(1-k)*.2);continue;}
   if(e.kind==='healing'){ribbon(ground,a,b,s.time,0x9fdec0,2,alpha*(1-k)*.45,20);for(let j=0;j<2;j++){const q=pathPoint(a,b,clamp(k*1.5-j*.1),20);leaf(ink,q,-1.4,4,profile.light,alpha*(1-k)*.6);}continue;}
   if(e.kind==='impact'&&e.classId===2)runeImpact(e,profile,b,k,alpha,targets,s);
   else if(e.kind==='impact'&&e.classId===3){for(const q of targets)burst(ground,{x:q.x,y:q.y+20},k,0xc0a0e8,4,18,alpha*.45);}
   else if(e.kind==='release'){
    if(e.classId===0)orcEffect(e,profile,a,b,k,alpha,targets,s,e.role);
    if(e.classId===2){art(2,e.skill,{x:a.x,y:a.y-13},e.skill===3?82:48,alpha*(1-k)*.6,0,900+a.y);if(e.skill===3)for(let j=0;j<3;j++)arc(ink,{x:a.x,y:a.y-15},13+j*7,-k*3+j,-k*3+j+Math.PI*1.3,profile.color,2,alpha*(1-k));}
    if(e.classId===3)lordEffect(e,profile,a,b,k,alpha,targets,s,e.role);
    if(e.classId===4)fireEffect(e,profile,a,b,k,alpha,targets,s);
    if(e.classId===5)elfEffect(e,profile,a,b,k,alpha,targets,s,map);
   }
   const cinematic=profile.ultimate&&(e.kind==='release'&&e.role!=='royal-splash'||e.kind==='impact'&&e.classId===2);
   if(cinematic){state.cinematics.push({id:e.id,signature:profile.signature,role:e.role,own});if(own){if(!shaken.has(e.id)){shaken.add(e.id);if(!reduced&&!camera.shakeEffect.isRunning)camera.shake(140,.0018,false);}if(k<.5&&e.kind==='release'){const fade=Math.min(1,k*8)*(1-smooth((k-.25)/.25));title.setVisible(true).setText(e.role==='shield-formed'?'祖灵壁垒 · 成型':names[e.classId][e.skill]).setAlpha(fade).setColor('#f1eadc');line(veil,[{x:130,y:73},{x:370,y:73}],profile.color,1,fade*.65);for(const x of [120,380])diamond(veil,{x,y:73},3,profile.light,fade);}}}
  }
  artScale=1;artOpacity=1;for(const b of s.projectiles.filter(b=>!b.basic&&vfxProfile(b.source.classId,b.skillId)).slice(-20)){
   const p=map.point(b);if(!visible(p))continue;const profile=vfxProfile(b.source.classId,b.skillId),to=map.point({x:b.tx,y:b.ty}),angle=Math.atan2(to.y-p.y,to.x-p.x),alpha=b.sourceId===s.player.heroId?.95:.7,tail={x:p.x-Math.cos(angle)*28,y:p.y-Math.sin(angle)*28};state.projectiles++;
   if(b.skillId===0){line(ink,[tail,p],0x9cda55,8,alpha*.35);line(ink,[tail,p],0xd9f3a2,2,alpha);art(2,0,p,45,alpha,angle-Math.PI/2);glow(ink,p,0xa7e65d,7,alpha*.35);}
   if(b.skillId===1){line(ink,[tail,p],0xa5e8ff,4,alpha*.6);diamond(ink,p,10,0xe0faff,alpha,angle-Math.PI/2);for(const sign of [-1,1])diamond(ink,{x:tail.x+Math.sin(angle)*sign*5,y:tail.y-Math.cos(angle)*sign*5},4,0x8dc7ed,alpha*.6,angle);}
   if(b.skillId===3){art(2,3,p,78,alpha,angle*.15);for(let j=0;j<3;j++)arc(ink,p,15+j*5,s.time*3+j,s.time*3+j+Math.PI*.95,profile.color,1.5,alpha*.8,.65);line(ground,[tail,p],profile.accent,7,alpha*.3);}
  }
  persistentEffects(s,map,visible);
  for(let i=used;i<sprites.length;i++)sprites[i].setVisible(false);for(let i=captionUsed;i<captions.length;i++)captions[i].setVisible(false);state.spriteCount=used;
  if(shaken.size>256){for(const id of shaken)if(!cache.has(id))shaken.delete(id);}return state.events.length+state.persistent+state.projectiles;
 },destroy(){ground.destroy();ink.destroy();veil.destroy();title.destroy();sprites.forEach(s=>s.destroy());captions.forEach(t=>t.destroy());cache.clear();}};
}

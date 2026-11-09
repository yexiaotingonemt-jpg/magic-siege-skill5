import {unitBarOffset} from './art-catalog.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const HERO_NAME_COLORS={ally:'#a4e1c0',enemy:'#f2a39b'};

export function shortHeroName(name,maxUnits=12){
 const full=String(name??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
 let text='',units=0;
 for(const ch of full){const cost=ch.codePointAt(0)>255?2:1;if(units+cost>maxUnits)return {full,text:text+'…',truncated:true};text+=ch;units+=cost;}
 return {full,text,truncated:false};
}

export function heroNameData(sim,u){
 if(!u?.hero||u.hp<=0)return null;
 const player=sim.players.find(p=>p.id===u.playerId);if(!player?.name)return null;
 const self=u.id===sim.player.heroId,team=u.side===sim.player.side?'ally':'enemy',name=shortHeroName(player.name,self?10:12);
 return {unitId:u.id,playerId:player.id,name:name.full,fullName:name.full,text:(self?'我 · ':'')+name.text,truncated:name.truncated,self,team,color:HERO_NAME_COLORS[team]};
}

export function createHeroNames(scene){
 const labels=[],tops=new Map();let report=[],hovered=null,pinnedUntil=0;
 const tip=scene.add.text(0,0,'',{fontFamily:'Microsoft YaHei, sans-serif',fontSize:'14px',fontStyle:'bold',color:'#eee9d9',stroke:'#101b18',strokeThickness:3,backgroundColor:'#14211feb',padding:{x:6,y:3}}).setOrigin(.5,1).setDepth(13010).setVisible(false);
 const pick=p=>report.find(r=>r.truncated&&p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom);
 return {get report(){return report;},top:id=>tops.get(id),hover(point){const hit=pick(point);if(hit){hovered=hit.unitId;pinnedUntil=0;}else if(!pinnedUntil)hovered=null;},tap(point){const hit=pick(point);if(!hit){hovered=null;pinnedUntil=0;return false;}hovered=hit.unitId;pinnedUntil=performance.now()+2500;return true;},draw(sim,map,camera){
  report=[];tops.clear();let used=0;
  const css=scene.game.canvas.getBoundingClientRect(),scale=Math.max(.2,Math.min(css.width/500,css.height/camera.height)),fontSize=Math.ceil(Math.max(14,12/scale));
  const heroes=sim.units.filter(u=>u.hero&&u.hp>0).sort((a,b)=>Number(b.id===sim.player.heroId)-Number(a.id===sim.player.heroId)||map.point(a).y-map.point(b).y||a.id-b.id);
  for(const u of heroes){
   const data=heroNameData(sim,u);if(!data)continue;
   const p=map.point(u),bar=p.y-unitBarOffset(u),statusTop=scene.statusIcons?.top(u.id),ceiling=Math.min(bar-6,Number.isFinite(statusTop)?statusTop-5:bar-6);
   if(ceiling<camera.scrollY+fontSize+4||ceiling>camera.scrollY+camera.height+50)continue;
   let label=labels[used];if(!label){label=scene.add.text(0,0,'',{fontFamily:'Microsoft YaHei, sans-serif',fontSize:'14px',fontStyle:'bold',color:HERO_NAME_COLORS.ally,stroke:'#101b18',strokeThickness:3,padding:{x:2,y:1}}).setOrigin(.5,1).setDepth(12310);labels.push(label);}
   if(label._nameFont!==fontSize){label.setFontSize(fontSize);label._nameFont=fontSize;}
   if(label.text!==data.text)label.setText(data.text);
   if(label._nameColor!==data.color){label.setColor(data.color);label._nameColor=data.color;}
   // 密集重叠时优先看清自己的名字，不通过抬高其他名字来避让。
   label.setDepth(data.self?12320:12310);
   // 名字只跟随自己的血条与状态，避免密集战斗中被其他单位逐行挤高。
   const width=label.width,height=label.height,x=clamp(p.x,width/2+4,496-width/2),y=ceiling;
   const box={left:x-width/2,right:x+width/2,top:y-height,bottom:y,x,y};
   used++;label.setVisible(true).setPosition(box.x,box.y);tops.set(u.id,box.top);
   report.push({...data,...box,bbox:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},fontSize,cssFontSize:fontSize*scale});
  }
  for(let i=used;i<labels.length;i++)labels[i].setVisible(false);
  if(pinnedUntil&&performance.now()>pinnedUntil){hovered=null;pinnedUntil=0;}
  const hit=report.find(r=>r.unitId===hovered);tip.setVisible(!!hit);
  if(hit){tip.setFontSize(Math.max(14,12/scale)).setText(hit.fullName).setColor(hit.color);const x=clamp((hit.left+hit.right)/2,tip.width/2+4,496-tip.width/2),y=Math.max(camera.scrollY+tip.height+3,hit.top-4);tip.setPosition(x,y);}
  return report;
 },destroy(){labels.forEach(t=>t.destroy());tip.destroy();tops.clear();report=[];}};
}

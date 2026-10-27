import {indexStatusFields,unitStatuses} from './unit-status.js';

const types=['stun','taunt','moveSlow','attackSpeedDown','vulnerable','attackDown','healingDown','scar','conduct','dot','guard','shield','damageStore','immune','lordUlt','heat','link','burnAura','soulMark','towerGuard','reflect','skillGuard','boost','healingBoost','haste'];
const tones={positive:0x83bfa6,negative:0xde9795,mark:0xbfa4da};
const line=(g,points)=>{g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);g.strokePath();};
function shield(g){line(g,[[6,6],[12,4],[18,6],[17,14],[12,19],[7,14],[6,6]]);}
function flame(g){line(g,[[12,4],[17,10],[18,14],[15,18],[10,19],[6,15],[7,10],[10,12],[12,4]]);}
function cross(g){line(g,[[12,6],[12,18]]);line(g,[[6,12],[18,12]]);}
function arrow(g,up){const a=up?7:17,b=up?17:7;line(g,[[17,b],[17,a],[14,up?a+3:a-3]]);line(g,[[17,a],[20,up?a+3:a-3]]);}
function glyph(g,id){
 g.lineStyle(1.7,0xf2eee0,1);g.fillStyle(0xf2eee0,1);
 if(['shield','guard','damageStore','immune','vulnerable','skillGuard','reflect'].includes(id)){shield(g);if(id==='guard')line(g,[[9,12],[11,14],[15,9]]);if(id==='shield')cross(g);if(id==='vulnerable')line(g,[[13,6],[10,10],[14,13],[11,17]]);if(id==='damageStore')arrow(g,false);if(id==='immune'){g.fillCircle(12,10,2);line(g,[[9,15],[12,12],[15,15]]);}if(id==='skillGuard')g.strokeCircle(12,11,3);if(id==='reflect')line(g,[[4,10],[4,5],[8,5],[6,3]]);return;}
 if(['heat','burnAura','dot'].includes(id)){flame(g);if(id==='heat')line(g,[[11,16],[13,12],[14,16]]);if(id==='burnAura')g.strokeCircle(12,12,9);if(id==='dot')line(g,[[4,20],[20,20]]);return;}
 if(id==='stun'){const p=Array.from({length:11},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?3.5:8;return [12+Math.cos(a)*r,12+Math.sin(a)*r];});line(g,p);return;}
 if(id==='taunt'){g.strokeCircle(12,12,8);line(g,[[12,7],[12,13]]);g.fillCircle(12,17,1);return;}
 if(['haste','attackSpeedDown'].includes(id)){g.strokeCircle(10,12,6);line(g,[[10,7],[10,12],[13,14]]);arrow(g,id==='haste');return;}
 if(id==='moveSlow'){line(g,[[6,5],[12,5],[12,12],[16,15],[16,18],[6,18],[6,5]]);arrow(g,false);return;}
 if(['attackDown','boost','lordUlt'].includes(id)){line(g,[[7,18],[17,5],[18,8],[10,18],[7,18]]);line(g,[[5,14],[12,19]]);if(id==='lordUlt')line(g,[[6,5],[18,18],[15,19],[5,8],[6,5]]);else arrow(g,id==='boost');return;}
 if(id==='healingDown'||id==='healingBoost'){cross(g);if(id==='healingDown')line(g,[[5,20],[20,5]]);else arrow(g,true);return;}
 if(id==='link'){g.strokeEllipse(9,10,8,11);g.strokeEllipse(15,14,8,11);line(g,[[9,15],[15,9]]);return;}
 if(id==='scar'){for(let i=0;i<3;i++)line(g,[[6+i*5,6],[4+i*5,18]]);return;}
 if(id==='conduct'){line(g,[[14,4],[6,13],[12,13],[10,20],[19,10],[13,10],[14,4]]);return;}
 if(id==='soulMark'){line(g,[[4,12],[8,8],[16,8],[20,12],[16,16],[8,16],[4,12]]);g.strokeCircle(12,12,3);return;}
 if(id==='towerGuard'){line(g,[[5,19],[5,6],[9,6],[9,9],[15,9],[15,6],[19,6],[19,19],[5,19]]);for(const x of [8,12,16])line(g,[[x,12],[x,16]]);}
}
export function createStatusIcons(scene){
 for(const id of types){const key='unit-status-'+id;if(scene.textures.exists(key))continue;const g=scene.add.graphics();const tone=['stun','taunt','moveSlow','attackSpeedDown','vulnerable','attackDown','healingDown','scar','conduct','dot'].includes(id)?'negative':id==='soulMark'?'mark':'positive';
  g.fillStyle(0x142321,.97);g.fillRoundedRect(0,0,24,24,3);g.lineStyle(1.3,tones[tone],1);g.strokeRoundedRect(1,1,22,22,3);glyph(g,id);g.generateTexture(key,24,24);g.destroy();
 }
 const bars=scene.add.graphics().setDepth(12012),sprites=[],counts=[],durations=new Map(),tops=new Map();let records=[],detailKey=null,pinnedUntil=0;
 const tip=scene.add.text(0,0,'',{fontFamily:'Microsoft YaHei',fontSize:'12px',color:'#eee9d9',backgroundColor:'#13211ff2',padding:{x:8,y:6},stroke:'#10201b',strokeThickness:1,wordWrap:{width:260,useAdvancedWrap:true}}).setOrigin(.5,1).setDepth(13000).setVisible(false).setName('unit-status-tooltip');
 const pick=(point,padding=0)=>records.filter(r=>point.x>=r.x-padding&&point.x<=r.x+r.size+padding&&point.y>=r.y-padding&&point.y<=r.y+r.size+padding).sort((a,b)=>Math.hypot(point.x-a.x-a.size/2,point.y-a.y-a.size/2)-Math.hypot(point.x-b.x-b.size/2,point.y-b.y-b.size/2))[0];
 return {get report(){return records;},top(id){return tops.get(id);},hover(point){const hit=pick(point);if(hit){detailKey=hit.key;pinnedUntil=0;}else if(!pinnedUntil)detailKey=null;},tap(point){const hit=pick(point,2);if(!hit){detailKey=null;pinnedUntil=0;return false;}detailKey=hit.key;pinnedUntil=performance.now()+3500;return true;},draw(sim,map,camera){
  const cssScale=scene.game.canvas.getBoundingClientRect().width/500,size=Math.min(28,Math.max(18,16/Math.max(.2,cssScale))),gap=2,fields=indexStatusFields(sim),active=new Set();let used=0;records=[];tops.clear();bars.clear();
  for(const u of [...sim.units,...sim.towers]){
   if(u.hp<=0)continue;const p=map.point(u),barY=p.y-(u.tower?44:u.hero?39:27);if(barY<camera.scrollY-80||barY>camera.scrollY+camera.height+100)continue;
   const statuses=unitStatuses(sim,u,fields);if(!statuses.length)continue;const columns=Math.min(3,statuses.length),rows=Math.ceil(statuses.length/3),left=Math.max(2,Math.min(498-columns*(size+gap)+gap,p.x-(columns*(size+gap)-gap)/2));
   tops.set(u.id,barY-5-rows*(size+gap)+gap);
   statuses.forEach((status,i)=>{
    const row=Math.floor(i/3),rowCount=Math.min(3,statuses.length-row*3),x=left+(columns-rowCount)*(size+gap)/2+(i%3)*(size+gap),y=barY-5-size-row*(size+gap),key=u.id+':'+status.id;active.add(key);
    let sp=sprites[used],count=counts[used];if(!sp){sp=scene.add.image(0,0,'unit-status-'+status.id).setOrigin(0).setDepth(12010);sprites.push(sp);count=scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:'#fff6de',backgroundColor:'#18201ff2',padding:{x:1,y:0},stroke:'#101917',strokeThickness:2}).setOrigin(1,1).setDepth(12020);counts.push(count);}used++;
    sp.setVisible(true).setTexture('unit-status-'+status.id).setPosition(x,y).setDisplaySize(size,size);count.setVisible(status.stacks>1);if(status.stacks>1)count.setFontSize(Math.max(11,9/cssScale)).setText(String(status.stacks)).setPosition(x+size+1,y+size-1);
    const remaining=status.until-sim.time;let duration=durations.get(key)||remaining;if(remaining>duration)duration=remaining;durations.set(key,duration);bars.fillStyle(0x91c99c,.95);bars.fillRect(x+2,y+size-3,(size-4)*Math.max(0,Math.min(1,remaining/duration)),1.5);
    records.push({unitId:u.id,key,...status,remaining,x,y,size});
   });
  }
  for(let i=used;i<sprites.length;i++){sprites[i].setVisible(false);counts[i].setVisible(false);}for(const key of durations.keys())if(!active.has(key))durations.delete(key);
  if(pinnedUntil&&performance.now()>pinnedUntil){detailKey=null;pinnedUntil=0;}const selected=records.find(r=>r.key===detailKey);tip.setVisible(!!selected);
  if(selected){tip.setFontSize(Math.max(12,12/cssScale)).setText(`${selected.name}${selected.stacks>1?' ×'+selected.stacks:''} · ${Math.max(0,selected.remaining).toFixed(1)}秒\n${selected.detail}`);const x=Math.max(tip.width/2+6,Math.min(494-tip.width/2,selected.x+selected.size/2)),y=Math.max(camera.scrollY+tip.height+6,(tops.get(selected.unitId)||selected.y)-5);tip.setPosition(x,y);}
  return records;
 },destroy(){bars.destroy();tip.destroy();sprites.forEach(s=>s.destroy());counts.forEach(t=>t.destroy());}};
}

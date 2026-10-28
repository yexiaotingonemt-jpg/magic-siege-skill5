import {TOWER_GUARD,towerGuardActive} from '../../shared/tower-guard.js';

export function createTowerGuardVisual(scene){
 const ground=scene.add.graphics().setDepth(90),labels=[],report=[];
 return {get report(){return report;},draw(s,map,camera){
  ground.clear();report.length=0;let used=0;
  for(const tower of s.towers){
   if(!towerGuardActive(tower,s.time))continue;
   const p=map.point(tower);if(p.y<camera.scrollY-120||p.y>camera.scrollY+780)continue;
   const remaining=tower.towerGuardUntil-s.time,y=p.y+43,pulse=.8+.1*Math.sin(s.time*4);
   ground.fillStyle(0x7fc5ee,.08);ground.fillEllipse(p.x,y,88,34);
   ground.lineStyle(6,0x9bbdf6,.12*pulse);ground.strokeEllipse(p.x,y,88,34);
   ground.lineStyle(2,0xb9dfff,.9*pulse);ground.strokeEllipse(p.x,y,88,34);
   ground.lineStyle(1,0x78c5ea,.7);ground.strokeEllipse(p.x,y,77,27);
   // Three small crystals convey the three-target attack without obscuring art.
   for(const dx of [-1,0,1]){const x=p.x+dx*29,cy=y+12-Math.abs(dx)*4;ground.fillStyle(0xc9eaff,.95);ground.fillTriangle(x-3,cy,x,cy-6,x+3,cy);ground.fillStyle(0x6e9cd3,.9);ground.fillTriangle(x-3,cy,x,cy+4,x+3,cy);}
   let label=labels[used];if(!label){label=scene.add.text(0,0,'',{fontFamily:'Microsoft YaHei',fontSize:'12px',fontStyle:'bold',color:'#95e7b4',stroke:'#10202b',strokeThickness:4,backgroundColor:'#11212acc',padding:{x:3,y:2}}).setOrigin(0,.5).setName('tower-guard-countdown').setDepth(11000);labels.push(label);}used++;
   label.setVisible(true).setPosition(p.x+32,p.y-40).setText(`${remaining.toFixed(1)}s`);
   report.push({towerId:tower.id,remaining,targets:TOWER_GUARD.targets,damageReduction:TOWER_GUARD.damageReduction,x:p.x,y});
  }
  for(let i=used;i<labels.length;i++)labels[i].setVisible(false);
  return report;
 },destroy(){ground.destroy();labels.forEach(label=>label.destroy());}};
}

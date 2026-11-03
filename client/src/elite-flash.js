import {eliteScoreActive} from '../../shared/elite-score.js';

export function createEliteFlash(scene) {
  const ink=scene.add.graphics().setDepth(6900).setName('elite-flash');
  let records=[];
  return {
    get report(){return records;},
    begin(){ink.clear();records=[];},
    draw(sim,u,p,sprite,camera) {
      if(!u.elite&&!eliteScoreActive(u,sim.time))return;
      if(p.y<camera.scrollY-130||p.y>camera.scrollY+camera.height+130)return;
      const pulse=(1+Math.sin(sim.time*3.6+u.id*.7))/2;
      // Warm light pulses gently; keep the body opaque and retain its silhouette.
      sprite.setTint(pulse>.65?0xfff4c9:0xffd878);
      const radius=u.hero?27:24,alpha=.4+pulse*.45;
      ink.fillStyle(0xffd063,.07+pulse*.08);
      ink.fillEllipse(p.x,p.y+16,radius*2.5,25);
      ink.lineStyle(2,0xffd56e,alpha);
      ink.strokeEllipse(p.x,p.y+16,radius*2+pulse*8,18+pulse*4);
      for(let i=0;i<3;i++) {
        const phase=(sim.time*.45+i/3+u.id*.13)%1;
        const x=p.x+Math.sin(i*2.4+u.id)*radius,y=p.y+8-phase*(u.hero?75:57);
        const size=2+Math.sin(phase*Math.PI)*2;
        ink.lineStyle(1.5,0xfff6d4,alpha*Math.sin(phase*Math.PI));
        ink.lineBetween(x-size,y,x+size,y);ink.lineBetween(x,y-size*1.6,x,y+size*1.6);
      }
      records.push({unitId:u.id,elite:!!u.elite,pulse,until:u.eliteBuffs?.score??null});
    },
    destroy(){ink.destroy();}
  };
}

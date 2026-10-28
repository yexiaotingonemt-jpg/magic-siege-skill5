import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {geometry} from '../client/src/battlefield.js';
import {createUnitFacing} from '../client/src/unit-facing.js';
import {hasDirectionalArt,directionalUnitArt} from '../client/src/unit-art.js';
import {MINION_CELL} from '../client/src/art-catalog.js';

test('截图回归：普通兵向屏幕上方移动时必须选背面，不再按阵营固定正面',()=>{
  for(const viewer of [0,1])for(const side of [0,1])for(const type of ['melee','ranged','siege']){
    const map=geometry({mapMinY:-64,mapMaxY:76},viewer),facing=createUnitFacing();
    const u={id:1,x:0,y:0,side,type},sim={matchId:'case',time:1,player:{side:viewer},get:()=>null};
    facing.begin(sim);facing.pose(sim,u,{action:'idle'},map.point(u));
    u.y=viewer?-1:1;sim.time=1.1;facing.begin(sim);
    const pose=facing.pose(sim,u,{action:'move'},map.point(u)),art=directionalUnitArt(u,{action:'move'},pose.heading);
    assert.ok(hasDirectionalArt(u));assert.equal(pose.name,'N');
    assert.equal(art.walkFrame!=null?Math.floor(art.frame/8):art.frame%8,4);
    const army=side?'defense':'attack',key=type==='ranged'?'arbalest':type==='melee'?'infantry':null;
    assert.equal(art.texture,key?'kc-'+key+'-walk-'+army:'kc-minions-'+army);
  }
});

test('普通兵横向出手及收势使用目标朝向，停下后保留方向',()=>{
  const u={id:1,x:0,y:0,side:0,type:'ranged',lastAttackAt:2,attackTo:{x:5,y:0}};
  const sim={matchId:'case',time:2.1,player:{side:0},get:()=>null},facing=createUnitFacing();
  facing.begin(sim);assert.equal(facing.pose(sim,u,{action:'attack'},{x:0,y:0}).name,'E');
  sim.time=2.3;u.attackTo={x:-5,y:0};facing.begin(sim);
  assert.equal(facing.pose(sim,u,{action:'recover'},{x:0,y:0}).name,'E');
  sim.time=3;facing.begin(sim);assert.equal(facing.pose(sim,u,{action:'idle'},{x:0,y:0}).name,'E');
});

test('两军普通兵方向图集都包含六种造型的实际透明图像',()=>{
  for(const name of ['attack','defense']){
    const png=readFileSync(new URL('../client/public/art/kc-final/minions-'+name+'.png',import.meta.url));
    assert.equal(png.readUInt32BE(16),MINION_CELL.width*8);
    assert.equal(png.readUInt32BE(20),MINION_CELL.height*3);
    assert.equal(png[25],6,'RGBA is required for directional silhouette hit testing');
  }
  assert.equal(hasDirectionalArt({tower:true,side:1,type:'melee'}),false);
  assert.equal(directionalUnitArt({hero:true,classId:6},{action:'move'},4),null);
});

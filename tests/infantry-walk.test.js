import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directionalUnitArt} from '../client/src/unit-art.js';
import {unitMotionPose} from '../client/src/unit-motion.js';

test('重甲近战兵按较慢步频播放独立图集，不再叠加跳动、倾斜或走路网格拉伸',()=>{
  for(const side of [0,1]){
    const u={id:7,type:'melee',side,hp:100},a=unitMotionPose(u,1,{moving:true}),b=unitMotionPose(u,2,{moving:true});
    assert.equal(a.action,'move');assert.equal(a.dy,0);assert.equal(a.angle,0);
    assert.ok(Math.abs((b.phase-a.phase)/(Math.PI*2)-.9)<1e-9);
    const art=directionalUnitArt(u,a,4);
    assert.equal(art.texture,side?'kc-infantry-walk-defense':'kc-infantry-walk-attack');
    assert.ok(art.walkFrame>=0&&art.walkFrame<8);assert.equal(Math.floor(art.frame/8),4);
    assert.ok(art.layout.width>0&&art.layout.height>0);
    for(const action of ['idle','attack','recover','prepare','controlled']){
      const stopped=directionalUnitArt(u,{action,phase:a.phase},4);
      assert.equal(stopped.texture,side?'kc-minions-defense':'kc-minions-attack');assert.equal(stopped.walkFrame,undefined);
    }
  }
});
test('两军近战兵的八方向、八时间帧使用透明图集，契约英雄仍走英雄资源分支',()=>{
  for(const side of ['attack','defense']){
    const png=readFileSync(new URL('../client/public/art/kc-final/infantry-walk-'+side+'.png',import.meta.url));
    assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),1280);assert.equal(png[25],6);
  }
  assert.equal(directionalUnitArt({hero:true,classId:0,type:'melee',side:0},{action:'move',phase:1},4).texture,'kc-orc-walk');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {walkFrameIndex} from '../client/src/walk-animation.js';
import {directionalUnitArt} from '../client/src/unit-art.js';
import {unitMotionPose} from '../client/src/unit-motion.js';

test('弩手步行周期遍历八帧，半周期切换左右支撑脚，冻结相位不换帧',()=>{
  const phases=Array.from({length:8},(_,i)=>(i+.25)*Math.PI*2/8);
  assert.deepEqual(phases.map(walkFrameIndex),[0,1,2,3,4,5,6,7]);
  assert.equal(walkFrameIndex(phases[0]+Math.PI),4);
  assert.equal(walkFrameIndex(phases[0]+Math.PI*2),0);
  assert.equal(walkFrameIndex(phases[3]),walkFrameIndex(phases[3]));
});
test('只有步行中的普通弩手播放走路图集，停步、攻击和控制切回对应方向静帧',()=>{
  for(const side of [0,1]){
    const u={id:1,type:'ranged',side,hp:100};
    for(const action of ['idle','attack','recover','controlled'])assert.equal(directionalUnitArt(u,{action,phase:0},4).texture,side?'kc-minions-defense':'kc-minions-attack');
    for(let heading=0;heading<8;heading++)for(let i=0;i<8;i++){
      const art=directionalUnitArt(u,{action:'move',phase:(i+.25)*Math.PI*2/8},heading);
      assert.equal(art.frame,heading*8+i);assert.equal(art.walkFrame,i);
    }
    const idle=unitMotionPose(u,1),moving=unitMotionPose(u,1,{moving:true});
    assert.equal(idle.channels.cloth,0,'弩手不是悬浮单位');assert.equal(moving.dy,0,'已绘制步态不叠加整身悬浮');
  }
});
test('两军弩手均包含8方向×8时间帧的透明走路图集',()=>{
  for(const side of ['attack','defense']){
    const png=readFileSync(new URL('../client/public/art/kc-final/arbalest-walk-'+side+'.png',import.meta.url));
    assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),1280);assert.equal(png[25],6);
  }
});

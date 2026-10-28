import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {availableClasses,defaults} from '../shared/config.js';
import {HERO_ART,HERO_CELL,heroArtFrame,heroArtPose} from '../client/src/art-catalog.js';
import {HERO_LAYOUT} from '../client/src/art-layout.js';
import {HERO_WALK_ART,WALK_FRAMES} from '../client/src/walk-animation.js';
import {directionalUnitArt} from '../client/src/unit-art.js';
import {unitMotionPose,createUnitMotionModel} from '../client/src/unit-motion.js';

const active=[...availableClasses(0,defaults),...availableClasses(1,defaults)];
test('全部开放契约英雄使用八方向八帧移动图集，同帧跨阵营一致',()=>{
  assert.deepEqual(Object.keys(HERO_WALK_ART).map(Number).sort(),active.toSorted());
  for(const classId of active)for(const side of [0,1])for(let heading=0;heading<8;heading++){
    const frames=new Set();
    for(let i=0;i<WALK_FRAMES;i++){
      const u={hero:true,classId,type:'melee',side},before=structuredClone(u);
      const art=directionalUnitArt(u,{action:'move',phase:(i+.25)*Math.PI*2/WALK_FRAMES},heading);
      assert.equal(art.texture,HERO_WALK_ART[classId].texture);
      assert.equal(art.frame,heading*WALK_FRAMES+i);assert.equal(art.walkFrame,i);
      assert.deepEqual(art.layout,HERO_LAYOUT[classId],'切换行走不改变脚底锚点和体型');
      assert.deepEqual(u,before);frames.add(art.frame);
    }
    assert.equal(frames.size,8);
  }
});

test('停步、攻击、技能、控制与死亡立即离开步行图集，保留朝向与对应动作',()=>{
  for(const classId of active)for(let heading=0;heading<8;heading++)for(const action of ['idle','prepare','attack','recover','skill','channel','dash','controlled','dead']){
    const art=directionalUnitArt({hero:true,classId},{action,phase:2},heading);
    assert.equal(art.texture,'kc-'+HERO_ART[classId].key);
    assert.equal(art.frame,heroArtFrame(classId,heroArtPose({action}),heading));
    assert.equal(art.walkFrame,undefined);
  }
});

test('绘制步态不叠加整体跳动，冻结时间不推进帧，静止和瞬移不播放步态',()=>{
  for(const classId of active){
    const u={id:7,hero:true,classId,x:0,y:0,hp:100,speed:2,side:0};
    const pose=unitMotionPose(u,1,{moving:true});assert.equal(pose.dy,0);assert.equal(pose.angle,0);
    const model=createUnitMotionModel(),s={time:1,player:{side:0},get:()=>null};model.begin(s);
    assert.equal(model.pose(s,u).action,'idle');s.time=1.2;u.y=.3;
    const a=model.pose(s,u);assert.equal(a.action,'move');assert.deepEqual(model.pose(s,u),a);
    s.time=1.6;assert.equal(model.pose(s,u).action,'idle');s.time=1.8;u.x=20;assert.equal(model.pose(s,u).action,'idle');
  }
});

test('每个英雄图集均为实际RGBA、64格，并在资源清单登记',()=>{
  const root=new URL('../client/public/art/kc-final/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root)));
  for(const classId of active){
    const file=HERO_WALK_ART[classId].file,png=readFileSync(new URL(file,root));
    assert.equal(png.readUInt32BE(16),HERO_CELL.width*8);assert.equal(png.readUInt32BE(20),HERO_CELL.height*8);
    assert.equal(png[25],6);assert.ok(manifest.heroWalk.files.includes(file));
  }
});

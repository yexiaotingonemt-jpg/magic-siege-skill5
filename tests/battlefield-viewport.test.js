import test from 'node:test';
import assert from 'node:assert/strict';
import {battlefieldViewport,geometry} from '../client/src/battlefield.js';

test('战场内部尺寸跟随显示比例，宽高使用同一缩放率',()=>{
 for(const [width,height]of [[500,660],[500,545],[390,550],[280,400],[640,500]]){
  const v=battlefieldViewport(width,height);
  assert.ok(Math.abs(width/v.width-height/v.height)<.002);
 }
 assert.deepEqual(battlefieldViewport(0,0),{width:500,height:500});
});

test('契约与窗口改变高度后，相机居中、边界和世界坐标保持正确',()=>{
 const world={mapMinY:-64,mapMaxY:76},view={width:500,height:700};
 for(const side of [0,1]){
  const map=geometry(world,side,view),u={x:2,y:0},point=map.point(u);
  assert.equal(map.maxScroll,map.height-700);assert.deepEqual(map.world(point.x,point.y),u);
  assert.equal(point.y-map.scrollFor(u.y),350);
  view.height=540;assert.equal(map.maxScroll,map.height-540);assert.equal(point.y-map.scrollFor(u.y),270);
  assert.deepEqual(map.point(u),point);assert.equal(map.scrollFor(-1000),side?0:map.maxScroll);assert.equal(map.scrollFor(1000),side?map.maxScroll:0);
  view.height=700;
 }
});

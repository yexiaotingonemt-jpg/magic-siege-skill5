import test from 'node:test';
import assert from 'node:assert/strict';
import {pickRenderedUnits} from '../src/unit-hit.js';

const make=()=>{
 const alpha=new Uint8ClampedArray(4*4*4);for(let y=0;y<4;y++)for(let x=2;x<4;x++)alpha[(y*4+x)*4+3]=255;
 const a={x:0,y:0,u:0,v:0},b={x:10,y:0,u:1,v:0},c={x:20,y:10,u:1,v:1},d={x:10,y:10,u:0,v:1};
 return {id:1,depth:100,left:0,top:0,width:20,height:10,alpha,sourceWidth:4,sourceHeight:4,triangles:[[a,b,c],[a,c,d]]};
};
test('变形后的可见轮廓按三角形UV采样，原矩形位置和透明区域不会误选',()=>{
 const r=make();assert.equal(pickRenderedUnits([r],{x:16,y:9},0)[0]?.id,1);assert.equal(pickRenderedUnits([r],{x:12,y:9},0).length,0);assert.equal(pickRenderedUnits([r],{x:3,y:9},0).length,0);
});
test('镜像三角形与共边仍命中，退化三角形安全忽略',()=>{
 const r=make();r.triangles=r.triangles.map(t=>t.map(v=>({...v,x:20-v.x})));r.triangles.push([{x:3,y:3,u:1,v:1},{x:3,y:3,u:1,v:1},{x:3,y:3,u:1,v:1}]);assert.equal(pickRenderedUnits([r],{x:4,y:9},0)[0]?.id,1);assert.equal(pickRenderedUnits([r],{x:10,y:5},0)[0]?.id,1);assert.equal(pickRenderedUnits([r],{x:8,y:9},0).length,0);
});
test('动画轮廓旁触屏容差与独立血条命中保留，重叠血条优先',()=>{
 const r=make();r.bar={x:6,y:-8,width:8,height:4};assert.equal(pickRenderedUnits([r],{x:10,y:-6},0)[0]?.id,1);assert.equal(pickRenderedUnits([r],{x:21,y:9},4)[0]?.id,1);const other={...r,id:2,depth:200,bar:undefined};assert.equal(pickRenderedUnits([other,r],{x:10,y:-6},0)[0]?.id,1);
});

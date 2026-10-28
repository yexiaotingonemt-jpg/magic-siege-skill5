import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DIRECTIONS,directionForVector,worldDirection,createUnitFacing} from '../client/src/unit-facing.js';

test('eight directions match screen movement, including opposing camera views',()=>{
  const vectors=[[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]];
  assert.deepEqual(vectors.map(([x,y])=>DIRECTIONS[directionForVector(x,y)]),DIRECTIONS);
  assert.equal(worldDirection({x:0,y:0},{x:0,y:1},0),4);
  assert.equal(worldDirection({x:0,y:0},{x:0,y:1},1),0);
  assert.equal(directionForVector(0,0,6),6);
});

test('a target switching during cast does not rotate the accepted cast',()=>{
  const facing=createUnitFacing(),u={id:1,x:0,y:0,side:0,targetId:2,skillAnimation:{start:1,end:2,from:{x:0,y:0},to:{x:1,y:0}}};
  const sim={matchId:'a',time:1.1,player:{side:0},get:()=>({x:-2,y:0})};
  const before=structuredClone(u);facing.begin(sim);
  assert.equal(facing.pose(sim,u,{action:'skill'},{x:0,y:0}).name,'E');
  u.targetId=3;sim.time=1.2;facing.begin(sim);
  assert.equal(facing.pose(sim,u,{action:'skill'},{x:.2,y:.1}).name,'E');
  assert.deepEqual(u.skillAnimation,before.skillAnimation);
});

test('attack direction holds across recovery, then movement may turn',()=>{
  const facing=createUnitFacing(),u={id:1,x:0,y:0,side:0,lastAttackAt:2,attackTo:{x:-1,y:0}};
  const sim={matchId:'a',time:2.1,player:{side:0},get:()=>null};facing.begin(sim);
  assert.equal(facing.pose(sim,u,{action:'attack'},{x:10,y:10}).name,'W');
  sim.time=2.3;u.x=-2;facing.begin(sim);
  assert.equal(facing.pose(sim,u,{action:'recover'},{x:10,y:10}).name,'W');
  sim.time=3;facing.begin(sim);
  assert.equal(facing.pose(sim,u,{action:'move'},{x:20,y:10}).name,'E');
});

test('movement jitter near a direction boundary does not flap between frames',()=>{
  const radians=25*Math.PI/180;
  assert.equal(directionForVector(Math.sin(radians),Math.cos(radians),0,true),0);
  assert.equal(directionForVector(1,0,0,true),2);
});

test('idle keeps facing, camera change resets, and removed units are cleaned up',()=>{
  const facing=createUnitFacing(),u={id:1,x:0,y:0,side:0};
  const sim={matchId:'a',time:0,player:{side:0},get:()=>null};facing.begin(sim);
  assert.equal(facing.pose(sim,u,{action:'idle'},{x:0,y:0}).name,'N');
  sim.player.side=1;facing.begin(sim);
  assert.equal(facing.pose(sim,u,{action:'idle'},{x:0,y:0}).name,'S');
  facing.end(new Set());assert.equal(facing.tracked,0);
});

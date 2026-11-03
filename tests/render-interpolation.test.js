import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRender,renderedPosition,createVisualClock,renderState} from '../client/src/render-interpolation.js';
import {createUnitMotionModel} from '../client/src/unit-motion.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const unit=(x=0)=>({id:1,x,y:0,hp:100,speed:2});
test('快照间隔550毫秒仍连续显示，坐标只外推350毫秒且不改权威值',()=>{
 const a=unit();prepareRender(a,null,0,{time:0});const b=unit(.4);prepareRender(b,a,200,{time:.2,duration:250});
 let old=renderedPosition(b,200),frozen=0;
 for(let at=216;at<750;at+=16){const p=renderedPosition(b,at);if(p.x===old.x)frozen++;assert.ok(p.x>=old.x);old=p;}
 assert.equal(frozen,0);near(b.x,.4);near(renderedPosition(b,800).x,1.1);near(renderedPosition(b,2000).x,1.1);
});
test('新快照接入位置连续，停止、眩晕、暂停及瞬移不继续预测',()=>{
 const a=unit();prepareRender(a,null,0,{time:0});const b=unit(.4);prepareRender(b,a,200,{time:.2});
 const before=renderedPosition(b,600),c=unit(1.2);prepareRender(c,b,600,{time:.6});near(renderedPosition(c,600).x,before.x);
 const stopped=unit(1.2);prepareRender(stopped,c,800,{time:.8});near(renderedPosition(stopped,2000).x,1.2);
 const stunned={...unit(1.3),stunUntil:5};prepareRender(stunned,stopped,1000,{time:1});near(renderedPosition(stunned,2000).x,1.3);
 const paused=unit(2);prepareRender(paused,c,1200,{time:1.2,paused:true});near(renderedPosition(paused,1250).x,2);near(renderedPosition(paused,5000).x,2);
 const teleport=unit(50);prepareRender(teleport,c,1200,{time:1.2});near(renderedPosition(teleport,1200).x,50);near(renderedPosition(teleport,5000).x,50);
});
test('突进后的异常位移不会变成高速外推，施法时停止预测',()=>{
 const a=unit();prepareRender(a,null,0,{time:0});const b=unit(2);prepareRender(b,a,200,{time:.2});
 assert.ok(renderedPosition(b,1000).x<=3.05+1e-8);
 const casting={...unit(2),castUntil:1};prepareRender(casting,a,200,{time:.2});near(renderedPosition(casting,1000).x,2);
});
test('显示时钟跨快照不倒退，650毫秒后等待同步，暂停和换局可重置',()=>{
 const s={matchId:'a',_serverTime:10,_serverTimeAt:0,time:10,speed:1,paused:false},clock=createVisualClock();clock.frame(s,0);let prior=10;
 for(let at=16;at<600;at+=16){if(at===400){s._serverTime=10.2;s._serverTimeAt=at;}const current=clock.frame(s,at);assert.ok(current>=prior);prior=current;}
 assert.ok(prior>10.3);clock.frame(s,1000);near(clock.frame(s,1600),10.85);
 s.paused=true;s._serverTime=10.3;near(clock.frame(s,1700),10.3);near(clock.frame(s,1800),10.3);
 s.matchId='b';s._serverTime=0;s.paused=false;near(clock.frame(s,1900),0);
});
test('渲染视图不修改战斗时钟或服务器状态',()=>{
 const sim={matchId:'a',_serverTime:5,_serverTimeAt:0,time:5,speed:1,paused:false,units:[]};
 const before=structuredClone(sim),a=renderState(sim,0),b=renderState(sim,200);assert.equal(a,b);assert.ok(b.time>5);assert.deepEqual(sim,before);assert.equal(b.units,sim.units);
});
test('仅显示位置继续移动时仍播放步态，暂停保持同一姿势',()=>{
 const u={...unit(),type:'melee',side:0,range:1.5},s={time:1,_serverTime:1,player:{side:0},get:()=>null},model=createUnitMotionModel();
 model.begin(s);model.pose(s,u,{x:0,y:0});s.time=1.1;assert.equal(model.pose(s,u,{x:1,y:0}).action,'move');assert.equal(model.pose(s,u,{x:1,y:0}).action,'move');s.time=1.5;assert.equal(model.pose(s,u,{x:1,y:0}).action,'idle');
});

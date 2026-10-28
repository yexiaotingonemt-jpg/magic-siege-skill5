import test from 'node:test';
import assert from 'node:assert/strict';
import {motionStyle,unitMotionPose,deformUnitVertex,createUnitMotionModel} from '../client/src/unit-motion.js';

const unit=(extra={})=>({id:7,x:0,y:0,hp:100,side:0,type:'melee',range:1.5,speed:2,cd:10,...extra});
const different=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)>1e-5;
test('全部实际兵种、英雄和塔具备独立动作配置',()=>{
 const styles=new Set();for(const side of [0,1])for(const type of ['melee','ranged','siege'])styles.add(motionStyle(unit({side,type})));
 for(const classId of [0,2,3,4,5])styles.add(motionStyle(unit({hero:true,classId})));styles.add(motionStyle(unit({tower:true})));
 assert.equal(styles.size,9);
});
test('近战步行左右下肢相反，上半身保持完整且不是整图同向平移',()=>{
 const p=unitMotionPose(unit(),.15,{moving:true}),left={x:-.2,y:.4},right={x:.2,y:.4},a=deformUnitVertex(left.x,left.y,p),b=deformUnitVertex(right.x,right.y,p),head=deformUnitVertex(0,-.4,p);
 assert.equal(p.action,'move');assert.ok((a.y-left.y)*(b.y-right.y)<0);assert.ok(Math.abs(head.y+.4)<Math.abs(a.y-left.y));
});
test('远程披风和悬浮晶炮侧翼具备局部运动',()=>{
 for(const type of ['ranged','siege']){const p=unitMotionPose(unit({type}),.15,{moving:true}),a=deformUnitVertex(-.4,.3,p),b=deformUnitVertex(.4,.32,p);assert.ok(different(a,{x:-.4,y:.3}));assert.ok(different(b,{x:.4,y:.32}));}
});
for(const extra of [{type:'melee'},{type:'ranged'},{type:'siege'},{hero:true,classId:0},{hero:true,classId:2},{hero:true,classId:3},{hero:true,classId:4},{hero:true,classId:5},{tower:true}])test(`${motionStyle(unit(extra))}普攻已出手立即展示发力，随后收势`,()=>{
 const u=unit({...extra,lastAttackAt:2,attackTo:{x:0,y:1}}),attack=unitMotionPose(u,2),recover=unitMotionPose(u,2.3),idle=unitMotionPose(u,3);
 assert.equal(attack.action,'attack');assert.equal(attack.frame,2);assert.ok(attack.channels.core>0);assert.equal(recover.action,'recover');assert.equal(idle.action,'idle');assert.ok(recover.channels.weaponPull<attack.channels.weaponPull);
});
test('冷却末端仅在攻击范围有目标时预备，提前蓄势不改变冷却或攻击时点',()=>{
 const u=unit({cd:2,lastAttackAt:0}),before=structuredClone(u);assert.equal(unitMotionPose(u,1.9,{targetInRange:true}).action,'prepare');assert.equal(unitMotionPose(u,1.9,{targetInRange:false}).action,'idle');assert.equal(unitMotionPose(u,1.7,{targetInRange:true}).action,'idle');assert.deepEqual(u,before);
});
test('控制、突进、引导和技能高于普通移动和普攻',()=>{
 for(const [extra,action]of [[{stunUntil:5},'controlled'],[{dash:{}},'dash'],[{channelUntil:5},'channel'],[{skillAnimation:{start:0,end:5}},'skill']]){const u=unit({...extra,lastAttackAt:1});const p=unitMotionPose(u,1,{moving:true,targetInRange:true});assert.equal(p.action,action);assert.equal(p.channels.stride,0);assert.equal(p.channels.weaponSwing,0);}
});
test('同一服务器时点重复绘制和双方视角不会推进步态或改变局部动作',()=>{
 const u=unit({hero:true,classId:4}),a=unitMotionPose(u,2,{moving:true,side:0}),b=unitMotionPose(u,2,{moving:true,side:1});assert.deepEqual(a.channels,b.channels);assert.deepEqual(unitMotionPose(u,2,{moving:true,side:0}),a);
});
test('移动检测以真实坐标变化开始，静止后结束，瞬移不伪装步行',()=>{
 const u=unit(),s={time:1,player:{side:0},get:()=>null},model=createUnitMotionModel();model.begin(s);assert.equal(model.pose(s,u).action,'idle');s.time=1.2;u.y=.4;assert.equal(model.pose(s,u).action,'move');s.time=1.6;assert.equal(model.pose(s,u).action,'idle');s.time=1.8;u.y=8;assert.equal(model.pose(s,u).action,'idle');
});
test('冻结服务器时间使动画完全冻结，阵亡清理与换局不会保留运动跟踪',()=>{
 const u=unit(),s={time:1,matchId:'a',player:{side:0},get:()=>null},model=createUnitMotionModel();model.begin(s);model.pose(s,u);s.time=1.2;u.y=.4;const a=model.pose(s,u);assert.deepEqual(model.pose(s,u),a);model.end(new Set());assert.equal(model.tracked,0);model.pose(s,u);s.matchId='b';model.begin(s);assert.equal(model.tracked,0);assert.equal(unitMotionPose({...u,hp:0},s.time).action,'dead');
});
test('局部变形在各动作相位保持有限值和克制的幅度',()=>{
 for(const extra of [{type:'melee'},{type:'ranged'},{type:'siege'},{hero:true,classId:0},{hero:true,classId:2},{hero:true,classId:3},{hero:true,classId:4},{hero:true,classId:5},{tower:true}])for(let t=0;t<=1;t+=.05){const pose=unitMotionPose(unit({...extra,lastAttackAt:.2}),t,{moving:true,targetInRange:true});for(let x=-.5;x<=.5;x+=.1)for(let y=-.5;y<=.5;y+=.1){const q=deformUnitVertex(x,y,pose);assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.y));assert.ok(Math.hypot(q.x-x,q.y-y)<.25);}}
});

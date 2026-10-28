import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {Room} from '../server/room.mjs';
import {rankingHTML} from '../client/src/ranking.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function arena(id=0){const s=new Simulation(),p=id===3?s.makePlayer(1,false):s.player;p.classId=id;const u=s.spawn(p.side,id===2?'siege':id===4||id===5?'ranged':'melee',0,1);assert.ok(s.contract(p,u.id));return {s,p,h:s.hero(p)};}
test('各职业沿用评价权重、单项封顶，实时积分与结算保持一致且不重复累计',()=>{
 for(const id of [0,2,3,4,5]){const {s,p,h}=arena(id);s.time=30;for(const key of Object.keys(s.config.ratingWeights[id]))if(key!=='survival')s.stat(h,key,s.config.rating[id][key]/2);near(s.contribution(p).totalPoints,50);near(s.contribution(p).kda,50/s.config.world.contractCost);s.settle(h,'测试');near(s.contribution(p).totalPoints,50);s.settle(h,'重复');near(p.totalPoints,50);near(p.score,150);}
 const {s,p,h}=arena();for(const key of Object.keys(s.config.ratingWeights[0]))s.stat(h,key,s.config.rating[0][key]*5);near(s.contribution(p).totalPoints,100);
});
test('死亡后延迟贡献只补差，换职业和地图重建保留累计积分与体力',()=>{
 const {s,p,h}=arena();s.stat(h,'heroDamage',2500);s.die(h);near(p.totalPoints,17.5);s.stat(h,'heroDamage',2500);near(p.totalPoints,35);
 p.classId=5;const u=s.spawn(0,'ranged',0,1);s.contract(p,u.id);const next=s.hero(p);s.stat(next,'healing',3000);near(s.contribution(p).totalPoints,70);near(p.staminaSpent,6);s.resetMap();near(s.contribution(p).totalPoints,70);near(p.staminaSpent,6);
});
test('契约和成功施法计入消耗，失败、回充和旧奖励不影响贡献积分',()=>{
 const {s,p,h}=arena();const e=s.spawn(1,'melee',0,1);Object.assign(h,{x:0,y:0});Object.assign(e,{x:0,y:1});h.targetId=e.id;
 assert.equal(s.cast(0,p),true);near(p.staminaSpent,s.config.world.contractCost+s.config.heroes[0].skills[0].cost);const spent=p.staminaSpent;assert.equal(s.cast(0,p),false);assert.equal(s.contract(p,e.id),false);near(p.staminaSpent,spent);p.stamina+=100;p.score+=999;near(s.contribution(p).totalPoints,0);near(s.contribution(p).kda,0);
});
test('权威快照包含实时积分、消耗与KDA，未消耗体力时为null',()=>{
 const room=new Room(),p=room.player({id:'test',name:'测试',side:0});assert.equal(room.snapshot().players[p.id].kda,null);room.sim.contract(p,room.sim.units.find(u=>u.side===0&&u.type==='melee').id);room.sim.stat(room.sim.hero(p),'assists',5);const copy=JSON.parse(JSON.stringify(room.snapshot())).players[p.id];near(copy.totalPoints,15);near(copy.staminaSpent,3);near(copy.kda,5);
});
test('排行按未取整总积分稳定倒序，过滤退役、保留离线并转义玩家名',()=>{
 const players=[{id:1,name:'<script>',classId:0,side:0,totalPoints:10.01,staminaSpent:0},{id:2,name:'同分',classId:5,side:0,totalPoints:10.01,staminaSpent:2},{id:3,name:'第一',classId:3,side:1,totalPoints:10.04,staminaSpent:4},{id:4,name:'退役',retired:true,totalPoints:999}];const html=rankingHTML(players,1);assert.ok(html.indexOf('第一')<html.indexOf('&lt;script&gt;'));assert.ok(html.indexOf('&lt;script&gt;')<html.indexOf('同分'));assert.ok(html.includes('5.00'));assert.ok(html.includes('—'));assert.ok(html.includes('离线'));assert.ok(!html.includes('退役'));assert.deepEqual(players.map(p=>p.id),[1,2,3,4]);
});

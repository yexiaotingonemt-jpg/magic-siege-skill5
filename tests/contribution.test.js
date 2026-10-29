import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {Room} from '../server/room.mjs';
import {contributionRanking} from '../client/src/contribution-ranking.js';

function fixture(){const s=new Simulation(),p=s.player;s.units=[];for(const t of s.towers)t.y=100;s.contract(p,s.spawn(0,'melee',0,1,0).id);const h=s.hero(p);h.x=h.y=0;return {s,p,h};}
test('实际消耗只计成功契约及施法，失败操作与补充体力不增加分母',()=>{
 const {s,p,h}=fixture();assert.equal(p.staminaSpent,3);assert.equal(s.contract(p),false);assert.equal(s.cast(0,p),false);assert.equal(p.staminaSpent,3);
 const e=s.spawn(1,'melee',0,1,0);e.x=0;e.y=1;s.setManualTarget(e.id,p);assert.equal(s.cast(0,p),true);assert.equal(p.staminaSpent,4);assert.equal(s.cast(0,p),false);assert.equal(p.staminaSpent,4);
 p.level=5;s.time=100;assert.equal(s.cast(3,p),true);assert.equal(p.staminaSpent,7);p.stamina+=100;assert.equal(p.staminaSpent,7);
});
test('总积分含实时评价，结算幂等，死后弹道补计评价差值',()=>{
 const {s,p,h}=fixture();s.stat(h,'heroDamage',2500);assert.equal(s.contribution(p).totalPoints,17.5);assert.equal(p.totalPoints,0);
 s.settle(h,'测试');const score=p.score;assert.equal(p.totalPoints,17.5);assert.equal(s.contribution(p).totalPoints,17.5);s.settle(h,'重复');assert.equal(p.totalPoints,17.5);assert.equal(p.score,score);assert.equal(s.reports.length,1);
 h.hp=0;p.heroId=null;s.stat(h,'heroDamage',1000);assert.equal(p.totalPoints,24.5);assert.equal(s.contribution(p).totalPoints,24.5);assert.equal(p.score-score,21);assert.equal(s.contribution(p).kda,24.5/3);
});
test('无消耗效率为空，阶段和施法奖励不混入贡献，重建保留累计值',()=>{
 const s=new Simulation(),p=s.player;assert.equal(s.contribution(p).kda,null);p.score=9999;assert.equal(s.contribution(p).totalPoints,0);
 s.contract(p,s.units.find(u=>u.side===0&&u.type==='melee').id);s.stat(s.hero(p),'heroDamage',2500);s.resetMap();assert.equal(p.totalPoints,17.5);assert.equal(p.staminaSpent,3);s.resetMap();assert.equal(p.totalPoints,17.5);
});
test('SSE快照输出实时贡献和实际体力，不依赖客户端推算',()=>{
 const r=new Room(),p=r.player({id:'ranking-test',name:'贡献',side:0});r.sim.contract(p,r.sim.units.find(u=>u.side===0&&u.type==='melee').id);r.sim.stat(r.sim.hero(p),'heroDamage',2500);const row=r.snapshot().players.find(x=>x.id===p.id);assert.equal(row.totalPoints,17.5);assert.equal(row.staminaSpent,3);assert.equal(row.kda,17.5/3);
});
test('排行榜按贡献稳定排序，过滤退役并转义名字，零消耗显示横线',()=>{
 const html=contributionRanking([{id:1,name:'<甲>',classId:0,side:0,totalPoints:20,score:0,staminaSpent:4},{id:2,name:'乙',classId:4,side:0,totalPoints:10,score:9999,staminaSpent:0},{id:3,name:'退役',retired:true,classId:0,totalPoints:100}],1);
 assert.ok(html.indexOf('&lt;甲&gt;')<html.indexOf('乙'));assert.ok(!html.includes('退役'));assert.ok(html.includes('5.00'));assert.ok(html.includes('—'));assert.ok(html.includes('rank-self'));
});

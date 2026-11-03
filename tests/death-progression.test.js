import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {liveConfig,contractType} from '../shared/config.js';
import {contractHistoryPage} from '../shared/contract-history.js';
import {contractEvaluation,kdaRating} from '../shared/contract-evaluation.js';
import {Room} from '../server/room.mjs';

function recruit(s,p){p.stamina=10000;assert.ok(s.contract(p,s.spawn(p.side,contractType(p.classId),0,1).id));return s.hero(p);}
function level(s,p){s.addXp(p,s.expNeeded(p)-p.xp);}
function pick(s,p){const c=p.progress[p.classId].choices[0];return s.chooseTrait(c.options[0],c.level,p);}

test('契约中升级仍提升基础属性，累计多次强化；阵亡解锁，重连不丢，重新契约锁定余次',()=>{
 const room=new Room(),p=room.player({id:'death-upgrade',name:'阵亡强化',side:0}),s=room.sim,h=recruit(s,p),hp=h.maxHp;
 level(s,p);level(s,p);level(s,p);
 assert.ok(h.maxHp>hp);assert.equal(p.progress[p.classId].choices.length,3);
 const before=structuredClone(p.progress[p.classId]);assert.equal(pick(s,p),false);assert.deepEqual(p.progress[p.classId],before);
 s.damage(null,h,1e9);assert.ok(pick(s,p));
 const snapshot=room.snapshot().players.find(row=>row.id===p.id);assert.equal(snapshot.progress[p.classId].choices.length,2);assert.equal(snapshot.progress[p.classId].choices[0].available,true);
 const next=recruit(s,p);assert.equal(pick(s,p),false);s.damage(null,next,1e9);
 assert.ok(pick(s,p));assert.ok(pick(s,p));assert.equal(p.progress[p.classId].choices.length,0);
});

test('战区重建不是阵亡，不提前解锁本次强化；下次同职业阵亡可解锁',()=>{
 const s=new Simulation(liveConfig()),p=s.player;recruit(s,p);level(s,p);s.resetMap();
 assert.equal(pick(s,p),false);const h=recruit(s,p);s.damage(null,h,1e9);assert.ok(pick(s,p));
});

test('NPC同样在阵亡后、下一次契约前使用强化次数',()=>{
 const s=new Simulation(liveConfig()),p=s.makePlayer(0,true),h=recruit(s,p);level(s,p);assert.equal(pick(s,p),false);
 s.damage(null,h,1e9);recruit(s,p);assert.equal(p.progress[p.classId].choices.length,0);assert.equal(Object.values(p.progress[p.classId].traits).reduce((a,b)=>a+b,0),1);
});

test('KDA评价阈值含边界，按本次贡献而非排行榜累计值，存活时无结算评价',()=>{
 for(const [kda,grade] of [[0,'D'],[29.999,'D'],[30,'C'],[59.999,'C'],[60,'B'],[99.999,'B'],[100,'A'],[149.999,'A'],[150,'S']])assert.equal(kdaRating(kda).grade,grade);
 assert.equal(kdaRating(null),null);assert.equal(kdaRating(NaN),null);
 const s=new Simulation(liveConfig()),p=s.player,h=recruit(s,p);
 s.stat(h,'heroDamage',2100/s.config.design.scoreCoefficients[p.classId].a);
 assert.equal(contractHistoryPage(s,p).entries[0].rating,null);h.hp=0;s.die(h);
 const r=contractHistoryPage(s,p).entries[0];assert.ok(Math.abs(r.kda-100)<1e-7);assert.equal(r.rating.grade,'A');assert.equal(p.lastContractResult.rating.grade,'A');
 const count=s.reports.length;s.die(h);assert.equal(s.reports.length,count);
 recruit(s,p);p.totalPoints=1e9;s.stat(h,'heroDamage',2100/s.config.design.scoreCoefficients[p.classId].a);
 const previous=contractHistoryPage(s,p).entries[1];assert.equal(previous.rating.grade,'S');assert.equal(p.lastContractResult.rating.grade,'S');
 assert.equal(contractHistoryPage(s,p).entries[0].rating,null);
 const legacy=contractEvaluation({},[{key:'staminaSpent',value:3,points:300}]);assert.equal(legacy.kda,100);assert.equal(legacy.rating.grade,'A');
});

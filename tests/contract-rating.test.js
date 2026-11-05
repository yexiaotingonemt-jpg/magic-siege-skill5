import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {liveConfig,contractType} from '../shared/config.js';
import {Simulation} from '../shared/simulation.js';
import {Room} from '../server/room.mjs';
import {contractHistoryPage} from '../shared/contract-history.js';
import {contractEvaluation,kdaRating} from '../shared/contract-evaluation.js';
import {levelKdaReference,LEVEL_RATING_CONFIG_SHA256} from '../shared/contract-rating-reference.js';

test('同等级统一基准与当前配置一致，0到40级连续递增，不按职业设门槛',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(liveConfig())).digest('hex'),LEVEL_RATING_CONFIG_SHA256,'战斗配置改变后须重验同等级参考曲线');
 for(let level=0;level<=40;level++){
  assert.ok(levelKdaReference(level)>0);
  if(level)assert.ok(levelKdaReference(level)>levelKdaReference(level-1));
  for(const classId of [0,4,5,2,3]){
   const parts=[{key:'damage',value:1,points:21*levelKdaReference(level)},{key:'staminaSpent',value:21,points:2100}];
   const r=contractEvaluation(liveConfig(),parts,{level,classId}).rating;
   assert.equal(r.grade,'B');assert.equal(r.level,level);assert.ok(Math.abs(r.ratio-1)<1e-12);
  }
 }
 assert.ok(Math.abs(levelKdaReference(15)-(levelKdaReference(10)+levelKdaReference(20))/2)<1e-10);
});

test('相同KDA在低级和高级评价不同；同等级只按相对达成率判档',()=>{
 assert.equal(kdaRating(200,0).grade,'A');assert.equal(kdaRating(200,40).grade,'D');
 for(const level of [0,5,20,40]){
  const ref=levelKdaReference(level);
  for(const [ratio,grade] of [[0,'D'],[.7999,'D'],[.8,'C'],[.9999,'C'],[1,'B'],[1.1999,'B'],[1.2,'A'],[1.4999,'A'],[1.5,'S']])assert.equal(kdaRating(ref*ratio,level).grade,grade);
 }
 for(const level of [undefined,null,-1,41,NaN,2.5])assert.equal(kdaRating(300,level),null);
 assert.equal(kdaRating(null,20),null);assert.equal(kdaRating(Infinity,20),null);
});

test('已结算等级不会被换职业、后续升级或死后贡献串改；实时战绩与总分口径保持',()=>{
 const s=new Simulation(liveConfig()),p=s.player;p.stamina=10000;
 const recruit=()=>{assert.ok(s.contract(p,s.spawn(p.side,contractType(p.classId),0,1).id));return s.hero(p);};
 const h=recruit();s.addXp(p,s.expNeeded(p)-p.xp);const settledLevel=p.level,ref=levelKdaReference(settledLevel);
 const damage=ref*1.25*21/s.config.design.scoreCoefficients[p.classId].a;s.stat(h,'heroDamage',damage);
 const before=s.contribution(p);h.hp=0;s.die(h);
 let row=contractHistoryPage(s,p).entries[0];assert.equal(row.level,settledLevel);assert.equal(row.rating.level,settledLevel);assert.equal(row.rating.grade,'A');
 assert.deepEqual(s.contribution(p),before);
 p.level=40;p.classId=4;p.level=40;recruit();s.stat(h,'heroDamage',damage);
 row=contractHistoryPage(s,p).entries[1];assert.equal(row.level,settledLevel);assert.equal(row.rating.level,settledLevel);assert.equal(row.rating.grade,'S');assert.equal(p.lastContractResult.rating.level,settledLevel);
 assert.equal(contractHistoryPage(s,p).entries[0].rating,null);
});

test('缺失历史等级或未校准规则时不给固定分数评价',()=>{
 const parts=[{key:'damage',value:100,points:5000},{key:'staminaSpent',value:3,points:300}];
 assert.equal(contractEvaluation(liveConfig(),parts).rating,null);
 assert.equal(contractEvaluation({},parts,{level:20}).rating,null);
});

test('保留战局快照立即按原结算等级更新旧评价，不修改玩家或积分状态',()=>{
 const room=new Room(),p=room.player({id:'retained-rating',name:'旧评价',side:0}),s=room.sim;
 p.level=40;p.stamina=10000;assert.ok(s.contract(p,s.spawn(0,'melee',0,1).id));const h=s.hero(p);
 s.stat(h,'heroDamage',200*21/s.config.design.scoreCoefficients[p.classId].a);h.hp=0;s.die(h);
 p.lastContractResult.rating={grade:'S',label:'卓越'};const saved=structuredClone(p.lastContractResult),points=p.totalPoints;
 const snapshot=room.snapshot().players.find(row=>row.id===p.id).lastContractResult;
 assert.equal(snapshot.rating.grade,'D');assert.equal(snapshot.rating.level,40);assert.equal(snapshot.rating.referenceKda,levelKdaReference(40));
 assert.deepEqual(p.lastContractResult,saved);assert.equal(p.totalPoints,points);
});

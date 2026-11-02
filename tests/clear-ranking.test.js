import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Room} from '../server/room.mjs';
import {defaults,liveConfig} from '../shared/config.js';

for(const [name,config] of [['经典',defaults],['正式被动',liveConfig()]])test(`${name}清除排行榜：超级权限、全部玩家、战局保留、同步和幂等`,()=>{
 const room=new Room(config),admin={id:'admin',name:'超级',side:0,isSuperAdmin:true},host={id:'host',name:'房主',side:0,isHost:true},other={id:'other',name:'离线',side:1};
 const packets=[],res=new EventEmitter();res.destroyed=false;res.write=t=>packets.push(t);room.connect(admin,res);
 const p=room.player(admin);room.player(host);room.player(other);
 const s=room.sim;assert.ok(s.contract(p,s.spawn(0,'melee',0,1).id));const h=s.hero(p);
 s.stat(h,'heroDamage',2500);p.level=9;p.cd[0]=42;p.auto=true;
 for(const row of s.players){row.totalPoints=1234;row.staminaSpent=10;row.score=1234;}
 room.paused=true;room.speed=4;s.time=123;room.stageNumber=3;room.stageWins=[1,1];
 const before={matchId:room.matchId,units:s.units,towers:s.towers,stats:structuredClone(h.stats),progress:structuredClone(p.progress),stamina:p.stamina,heroId:p.heroId,config:structuredClone(s.config)};
 for(const account of [host,other]){
  assert.equal(room.command(account,{type:'clearRanking',args:{isSuperAdmin:true},id:'denied'}).ok,false);
  assert.ok(s.players.every(row=>row.totalPoints===1234&&row.staminaSpent===10));
 }
 const result=room.command(admin,{type:'clearRanking',id:'clear-once'});assert.equal(result.ok,true);
 for(const row of s.players){assert.equal(row.totalPoints,0);assert.equal(row.staminaSpent,0);assert.equal(row.score,0);assert.ok([null,0].includes(s.contribution(row).kda));}
 const snapshot=JSON.parse(packets.at(-1).slice(6));assert.ok(snapshot.players.every(row=>row.totalPoints===0&&row.staminaSpent===0));
 assert.equal(room.matchId,before.matchId);assert.equal(s.units,before.units);assert.equal(s.towers,before.towers);assert.equal(s.hero(p),h);assert.equal(p.heroId,before.heroId);assert.equal(p.stamina,before.stamina);
 assert.deepEqual(h.stats,before.stats);assert.deepEqual(p.progress,before.progress);assert.deepEqual(s.config,before.config);assert.equal(p.cd[0],42);assert.equal(p.auto,true);
 assert.equal(s.time,123);assert.equal(room.stageNumber,3);assert.deepEqual(room.stageWins,[1,1]);assert.equal(room.paused,true);assert.equal(room.speed,4);assert.equal(room.clients.size,1);
 s.stat(h,'heroDamage',1000);const earned=p.totalPoints;assert.ok(earned>0&&earned<1234);
 assert.deepEqual(room.command(admin,{type:'clearRanking',id:'clear-once'}),result);assert.equal(p.totalPoints,earned);
 s.settle(h,'清除后结算');assert.equal(p.totalPoints,earned);s.stat(h,'heroDamage',1000);assert.ok(Math.abs(p.totalPoints-earned*2)<1e-8);
 room.command(admin,{type:'clearRanking',id:'clear-again'});assert.equal(p.totalPoints,0);
 h.hp=0;p.heroId=null;assert.ok(s.contract(p,s.spawn(0,'melee',0,1).id));assert.equal(p.staminaSpent,3);assert.equal(p.totalPoints,300);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {passiveBuffs} from '../client/src/passive-buffs.js';
import {createStatusReservoirs} from '../client/src/status-reservoir.js';
import {currentTraits} from '../shared/current-design.js';
import {arena} from './current-design-fixture.mjs';
import {clientSnapshot} from '../server/client-snapshot.mjs';

for(const id of [0,2,3,4,5])test(`职业${id}的被动和被动强化常驻，净化/驱散与快照均不丢失`,()=>{
 const {s,p,h}=arena(id),traits=currentTraits(s.config,id).filter(t=>t.skill==null).slice(0,3);
 for(const t of traits)p.progress[id].traits[t.id]=1;
 const before=passiveBuffs(s,h),snapshot=clientSnapshot(h,s.time);
 assert.equal(before.length,traits.length+1);assert.ok(before.every(b=>b.permanent&&b.until===Infinity&&!b.dispellable&&!b.cleansable));
 s.debuff(h,s.units.find(u=>u.side!==h.side),'attackDown',.2,10);s.cleanse(h);s.cleanseOne(h);
 s.shield(h,100,h,10);for(let i=0;i<10;i++)s.dispelOne(h);
 assert.deepEqual(passiveBuffs(s,h).map(b=>b.id),before.map(b=>b.id));
 assert.deepEqual(passiveBuffs(s,snapshot).map(b=>b.id),before.map(b=>b.id));
 h.hp=0;assert.deepEqual(passiveBuffs(s,h),[]);
});

test('常驻被动只显示自己的，友军和敌军被动均隐藏，驱散职业也不例外',()=>{
 const {s,p,h,enemy,friend}=arena(0);
 for(const u of [h,enemy,friend]){
  const owner=s.players[u.playerId];
  for(const t of currentTraits(s.config,u.classId).filter(t=>t.skill==null))owner.progress[u.classId].traits[t.id]=1;
 }
 const ownIds=passiveBuffs(s,h).map(b=>b.id);assert.ok(ownIds.length>10);
 assert.deepEqual(passiveBuffs(s,friend),[]);assert.deepEqual(passiveBuffs(s,enemy),[]);
 assert.deepEqual(passiveBuffs(s,clientSnapshot(friend,s.time)),[]);
 p.classId=3;
 assert.deepEqual(passiveBuffs(s,enemy,p),[]);assert.deepEqual(passiveBuffs(s,friend,p),[]);
 assert.deepEqual(passiveBuffs(s,h,p).map(b=>b.id),ownIds);
 s.localPlayerId=enemy.playerId;
 assert.ok(passiveBuffs(s,enemy).length>10);assert.deepEqual(passiveBuffs(s,h),[]);
 s.localPlayerId=s.makePlayer(0,false).id;
 assert.deepEqual(passiveBuffs(s,h),[]);assert.deepEqual(passiveBuffs(s,enemy),[]);
});

test('蓄水池按战斗时钟下降，暂停保持、刷新回满、消失后重获与换局重置，常驻满池',()=>{
 const r=createStatusReservoirs();r.begin('one');
 assert.equal(r.sample('buff',10,0),1);assert.equal(r.sample('buff',10,5),.5);assert.equal(r.sample('buff',10,5),.5);
 assert.equal(r.sample('buff',10,10),0);assert.equal(r.sample('buff',20,10),1);
 r.prune(new Set());assert.equal(r.sample('buff',20,15),1);
 r.begin('two');assert.equal(r.sample('buff',20,18),1);assert.equal(r.sample('permanent',Infinity,18),1);
});

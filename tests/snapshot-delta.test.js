import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createSnapshotDelta,applySnapshotDelta} from '../shared/snapshot-delta.js';
import {clientSnapshot} from '../server/client-snapshot.mjs';
import {Room} from '../server/room.mjs';

const state=(sequence=1)=>({matchId:'match',sequence,time:1,config:{world:{width:20}},units:[{id:1,x:0,y:0,hp:100,buff:{until:3}}],towers:[{id:2,hp:1000}],players:[{id:0,level:1}],projectiles:[],effects:[]});
const wire=value=>JSON.parse(JSON.stringify(value));

test('差量精确还原新增、更新、删除、字段消失与实体顺序，保留首次完整配置',()=>{
 const before=state(),saved=structuredClone(before),after=state(2);delete after.config;delete after.units[0].buff;
 after.time=1.2;after.units[0].x=.4;after.units[0].hp=undefined;after.units.unshift({id:3,x:2,hp:20});after.towers=[];after.players[0].level=2;after.projectiles=[{id:1,x:1,source:{id:3}}];
 const packet=wire(createSnapshotDelta(before,after)),restored=applySnapshotDelta(before,packet);
 assert.deepEqual(restored,wire({...after,config:before.config}));assert.deepEqual(before,saved);assert.equal(restored.units[1].buff,undefined);
 const next={...after,sequence:3,units:after.units.slice().reverse()};
 assert.deepEqual(applySnapshotDelta(restored,wire(createSnapshotDelta(after,next))),wire({...next,config:before.config}));
});

test('没有基准、丢失中间帧及换局差量被拒绝，完整消息重新建立基准',()=>{
 const first=state(),next=state(2),packet=createSnapshotDelta(first,next);
 for(const base of [null,state(0),{...first,matchId:'other'}])assert.throws(()=>applySnapshotDelta(base,packet),/baseline/);
 assert.equal(applySnapshotDelta(null,first),first);
});

test('快照裁剪不改变战斗对象，保留有限额度和有效状态，坐标误差不超过千分之半格',()=>{
 const ledger={sourceId:7,spent:30,limit:100,parts:{damage:30},currentSkill:{description:'重复技能说明'.repeat(500)}};
 const entity={id:1,x:1.123456789,y:-2.987654321,hp:100,debuffs:{expired:{until:1,value:ledger},active:{kind:'attackDown',until:4,ratio:.2,value:ledger}},hastes:{old:{until:0},current:{until:3,ratio:.1}},damageStore:{total:40,value:ledger},contributors:{7:20},stats:{damage:90}};
 const before=structuredClone(entity),copy=clientSnapshot(entity,2);
 assert.deepEqual(entity,before);assert.equal(copy.hp,entity.hp);assert.ok(Math.abs(copy.x-entity.x)<=.0005);assert.ok(Math.abs(copy.y-entity.y)<=.0005);
 assert.equal(copy.stats,undefined);assert.equal(copy.contributors,undefined);assert.equal(copy.debuffs.expired,undefined);assert.equal(copy.hastes.old,undefined);
 assert.deepEqual(copy.debuffs.active.value,{limit:100,spent:30});assert.deepEqual(copy.damageStore.value,{limit:100,spent:30});assert.equal(copy.debuffs.active.ratio,.2);
 assert.ok(JSON.stringify(copy).length<JSON.stringify(entity).length/10);
});

test('慢连接跳帧后按最后发送的基准恢复，暂停、配置更新和换局仍发送正确状态',()=>{
 const room=new Room(),res=new EventEmitter(),packets=[];res.destroyed=false;res.writableNeedDrain=false;res.write=text=>{if(text.startsWith('data: '))packets.push(JSON.parse(text.slice(6)));return true;};
 const client=room.connect({id:'delta',side:0,name:'差量同步'},res,{delta:true});let baseline=packets.at(-1);
 assert.ok(baseline.config);assert.equal(baseline.delta,undefined);
 res.writableNeedDrain=true;for(let i=0;i<10;i++){room.sim.tick(.05);room.sequence++;room.broadcast();}
 assert.equal(packets.length,1);assert.equal(client.pendingSnapshot,true);
 room.paused=true;res.writableNeedDrain=false;res.emit('drain');const packet=packets.at(-1);
 assert.equal(packet.delta,true);assert.equal(packet.baseSequence,baseline.sequence);baseline=applySnapshotDelta(baseline,packet);
 assert.equal(baseline.paused,true);assert.deepEqual(baseline,room.snapshot());
 room.configVersion++;room.broadcast();assert.ok(packets.at(-1).config);assert.equal(packets.at(-1).delta,undefined);
 room.matchId='next-match';room.broadcast();assert.equal(packets.at(-1).matchId,'next-match');assert.equal(packets.at(-1).delta,undefined);
 res.emit('close');
});

test('全量订阅保持兼容，HTTP快照与SSE使用同一显示数据，长战局账本不进入传输',()=>{
 const room=new Room(),res=new EventEmitter(),packets=[];res.write=text=>{if(text.startsWith('data: '))packets.push(JSON.parse(text.slice(6)));return true;};
 room.connect({id:'full',side:0,name:'全量同步'},res);room.sequence++;room.broadcast();assert.equal(packets.at(-1).delta,undefined);
 assert.deepEqual(packets.at(-1),wire(room.snapshot(false)));res.emit('close');
});

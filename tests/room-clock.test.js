import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../server/room.mjs';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
function stepAt(room,now){
 const clock=mock.method(performance,'now',()=>now);
 try{room.step();}finally{clock.mock.restore();}
}
function roomClock(){
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});
 room.clients.add({});room.broadcast=()=>{};room.heartbeat=()=>{};
 room.sim.units=[];room.sim.waveAt=Infinity;
 return room;
}
test('卡顿五秒后保留全部战斗时间，分批追赶且技能冷却如期结束',()=>{
 const room=roomClock(),now=room.last+5000;
 room.sim.player.cd[0]=room.sim.time+5;
 stepAt(room,now);
 assert.ok(room.sim.time<=1+1e-7,'单次追赶不得阻塞超过20个固定步长');
 assert.ok(room.acc>=3.9,'未处理的卡顿时间必须保留');
 for(let i=0;i<6;i++)stepAt(room,now);
 near(room.sim.time,5);near(room.acc,0);
 assert.ok(room.sim.player.cd[0]-room.sim.time<1e-7);
});
for(const speed of [1,2,4])test(`${speed}倍速计入真实间隔，正常更新与卡顿追赶结果一致`,()=>{
 const delayed=roomClock(),regular=roomClock();delayed.speed=regular.speed=speed;
 const end=delayed.last+2500,start=regular.last;
 stepAt(delayed,end);for(let i=0;i<12;i++)stepAt(delayed,end);
 for(let i=1;i<=100;i++)stepAt(regular,start+i*25);
 near(delayed.sim.time,2.5*speed);near(delayed.sim.time,regular.sim.time);
});
test('暂停和没有玩家时的真实间隔不计入冷却，恢复不追赶这些时间',()=>{
 const room=roomClock(),start=room.last;
 room.paused=true;stepAt(room,start+5000);near(room.sim.time,0);near(room.acc,0);
 room.paused=false;room.clients.clear();stepAt(room,start+10000);near(room.sim.time,0);
 room.clients.add({});stepAt(room,start+10200);near(room.sim.time,.2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {Room} from '../server/room.mjs';
function fixture(){
 const s=new Simulation();s.units=[];
 const hero=(side,id)=>{const p=s.makePlayer(side,false);p.classId=id;const u=s.spawn(side,id===5?'ranged':'melee',0,1);assert.equal(s.contract(p,u.id),true);return s.hero(p);};
 return {s,healer:hero(0,5),ally:hero(0,0),killer:hero(0,0),target:hero(1,3)};
}
const kill=({s,killer,target})=>{target.hp=1;s.damage(killer,target,1);};
test('5秒直接助攻含边界，超过5秒不计',()=>{
 for(const gap of [5,5.001]){const f=fixture();f.s.damage(f.ally,f.target,1);f.s.time=gap;kill(f);assert.equal(f.ally.stats.heroAssists||0,gap===5?1:0);}
});
test('治疗任意伤害参与者即可助攻，不要求治疗最终击杀者',()=>{
 const f=fixture();f.ally.hp-=100;f.s.heal(f.ally,100,f.healer);f.s.time=1;f.s.damage(f.ally,f.target,1);f.s.time=4;kill(f);
 assert.equal(f.healer.stats.heroAssists,1);assert.equal(f.ally.stats.heroAssists,1);
});
test('治疗及受疗者命中都须在死亡前5秒内，且治疗必须先于命中',()=>{
 for(const {healAt,hitAt,deathAt,expected} of [
  {healAt:0,hitAt:4,deathAt:5,expected:1},
  {healAt:0,hitAt:4,deathAt:5.001,expected:0},
  {healAt:0,hitAt:5,deathAt:9,expected:0},
  {healAt:4,hitAt:0,deathAt:5,expected:0},
 ]){
  const f=fixture();for(const e of [{at:healAt,type:'heal'},{at:hitAt,type:'hit'}].sort((a,b)=>a.at-b.at)){
   f.s.time=e.at;if(e.type==='heal'){f.ally.hp-=100;f.s.heal(f.ally,100,f.healer);}else f.s.damage(f.ally,f.target,1);
  }
  f.s.time=deathAt;kill(f);assert.equal(f.healer.stats.heroAssists||0,expected);
 }
});
test('纯过量治疗、受疗者未命中、治疗发生在命中后均不凭空获得助攻',()=>{
 for(const kind of ['overheal','no-hit','heal-after-hit']){const f=fixture();
  if(kind==='heal-after-hit')f.s.damage(f.ally,f.target,1);
  if(kind!=='overheal')f.ally.hp-=100;f.s.heal(f.ally,100,f.healer);
  if(kind==='overheal')f.s.damage(f.ally,f.target,1);
  f.s.time=2;kill(f);assert.equal(f.healer.stats.heroAssists||0,0);
 }
});
test('多受疗者、直接伤害及治疗路径同次去重，击杀者不重复拿助攻',()=>{
 const f=fixture();f.s.damage(f.healer,f.target,1);
 for(const u of [f.ally,f.killer]){u.hp-=100;f.s.heal(u,100,f.healer);f.s.damage(u,f.target,1);}
 f.s.time=3;kill(f);assert.equal(f.healer.stats.heroAssists,1);assert.equal(f.killer.stats.heroKills,1);assert.equal(f.killer.stats.heroAssists||0,0);
});
test('5秒内原英雄已阵亡仍可获得原职业归属助攻，不转移到新契约英雄',()=>{
 const f=fixture(),p=f.s.players[f.healer.playerId];f.ally.hp-=100;f.s.heal(f.ally,100,f.healer);f.s.time=1;f.s.damage(f.ally,f.target,1);
 f.healer.hp=0;f.s.settle(f.healer,'测试阵亡');p.heroId=null;p.classId=0;f.s.contract(p,f.s.spawn(0,'melee',0,1).id);const next=f.s.hero(p),before=p.totalPoints;
 f.s.time=3;kill(f);assert.equal(f.healer.stats.heroAssists,1);assert.equal(next.stats.heroAssists,undefined);assert.equal(p.totalPoints-before,100);
});
test('治疗普通士兵后该士兵参战也算，助攻记录不会在快照产生循环引用',()=>{
 const f=fixture(),troop=f.s.spawn(0,'melee',0,1);troop.hp-=100;f.s.heal(troop,100,f.healer);f.s.damage(troop,f.target,1);f.s.time=2;kill(f);assert.equal(f.healer.stats.heroAssists,1);
 const room=new Room();room.sim=f.s;assert.doesNotThrow(()=>JSON.stringify(room.snapshot()));
});

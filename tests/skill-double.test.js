import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {defaults,contractType} from '../shared/config.js';
import {describeAbilities} from '../client/src/ability-descriptions.js';

const ids=[0,2,3,4,5],near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const advance=(s,n)=>{const end=s.time+n;while(s.time<end-1e-8)s.tick(Math.min(.05,end-s.time));};
// Capture the previous panel values independently of the new skill settings.
const panels=[
 [16000,200,1.5,1.5,5,2],
 [8000,362.6666666666667,1.7,6.5,9,2],
 [10000,426.66666666666663,2.8,10.5,12,1.5],
 [72000,266.6666666666667,1.5,1.5,5,2],
 [12000,340,1.7,6.5,9,2],
 [14000,272,1.7,6.5,9,2],
 [11000,232.72727272727272,1.2,1.5,5,2.5]
];
function arena(id,level=6,rank=1){
 const s=new Simulation();s.units=[];s.player.retired=true;s.waveAt=s.populationAt=1e9;for(const t of s.towers)t.x=100;
 const make=(classId,x,y)=>{const p=s.makePlayer(classId===3?1:0,false);p.classId=classId;p.level=level;p.builds[classId]=[rank,rank,rank,Math.min(3,rank)];p.stamina=100;const h=s.spawn(p.side,contractType(classId),0,1,x);assert.ok(s.contract(p,h.id));Object.assign(h,{x,y,speed:0,cd:1e9});return {p,h};};
 const {p,h}=make(id,0,0),enemy=make(id===3?0:3,0,3).h,helper=make(id===3?3:0,2,0).h;s.localPlayerId=p.id;
 enemy.hp=enemy.maxHp=1e7;helper.hp=1000;helper.maxHp=1e6;h.hp=h.maxHp*.5;enemy.targetId=helper.id;
 const target=(x,y,side=enemy.side)=>{const u=s.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp:1e7,maxHp:1e7,speed:0,cd:1e9});return u;};
 if(id===5)s.setManualTarget(helper.id,p);return {s,p,h,enemy,helper,target};
}

test('法师基础攻击提高50%，成长减半，其余基础属性保留',()=>{
 defaults.heroes.forEach((h,id)=>assert.deepEqual([h.hp,h.attack,h.interval,h.range,h.aggro,h.speed],panels[id]));
 assert.deepEqual([defaults.world.heroAttackGrowth,defaults.world.heroHpGrowth],[.015,.02]);
 assert.deepEqual(Object.values(defaults.troops).map(u=>[u.hp,u.attack,u.interval]),[[4000,100,1.5],[4000,80,1.7],[5000,100,2.8]]);
});
for(const id of ids)for(const level of [1,12])test(`职业${id}·英雄${level}级：实际普通攻击采用新基础攻击与成长，间隔保持`,()=>{
 const {s,h,enemy,helper}=arena(id,level);s.units=s.units.filter(u=>u!==helper);Object.assign(h,{hp:h.maxHp,cd:0});enemy.y=1;const hp=enemy.hp;
 const expected=panels[id][1]*(1+.015*(level-1));near(h.attack,expected);advance(s,.3);near(hp-enemy.hp,expected);
 advance(s,panels[id][2]);near(hp-enemy.hp,expected*2);
});

// Legacy rank/budget tests replaced by traits.test.js: skills no longer rank up or share a cap.

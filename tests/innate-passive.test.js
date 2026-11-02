import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {defaults,liveConfig,contractType} from '../shared/config.js';
import {describeAbilities,abilityGuideHTML} from '../client/src/ability-descriptions.js';
import {createGameRuntime,prepareGameRuntime} from '../server/game-runtime.mjs';
import {Room} from '../server/room.mjs';
import {runeShare} from '../shared/innate-passives.js';

function arena(id){
 const s=new Simulation(liveConfig());s.units=[];
 const p=s.player;p.side=id===3?1:0;p.classId=id;
 assert.ok(s.contract(p,s.spawn(p.side,contractType(id),0,1).id));return {s,p,h:s.hero(p)};
}
test('五职业被动说明渲染独立面板，旧规则不冒充新版被动已生效',()=>{
 for(const id of [0,4,5,2,3]){
  const {s}=arena(id),g=describeAbilities(s),html=abilityGuideHTML(g);
  assert.ok(g.innatePassive);assert.ok(html.includes('data-ability-view="passive"'));assert.ok(html.includes(g.innatePassive));assert.ok(html.includes('契约后自动生效'));
 }
 const g=describeAbilities(new Simulation()),html=abilityGuideHTML(g);assert.equal(g.innatePassive,undefined);assert.ok(html.includes('当前战局未启用新版职业被动'));assert.ok(!html.includes('契约后自动生效'));
});
test('兽人被动随缺血连续减伤，显示数值读取同一配置',()=>{
 const {s,h}=arena(0);h.armor=0;h.hp=h.maxHp/2;const before=h.hp;
 assert.ok(describeAbilities(s).passiveStatus.includes('12.5%'));s.damage(null,h,100);assert.ok(Math.abs(before-h.hp-87.5)<1e-8);
 s.config.innate.orcMissingReduction=.4;h.hp=h.maxHp/2;
 assert.ok(describeAbilities(s).passiveStatus.includes('20%'));const hp=h.hp;s.damage(null,h,100);assert.ok(Math.abs(hp-h.hp-80)<1e-8);
});
test('火法被动说明与实时炙热、攻速、受疗一致',()=>{
 const {s,h}=arena(4);s.addHeat(h,4);assert.equal(h.heat,4);
 const g=describeAbilities(s);assert.ok(g.passiveStatus.includes('4/6'));assert.ok(g.passiveStatus.includes('20%'));assert.ok(g.passiveStatus.includes('8%'));assert.equal(s.attackRate(h),1.2);
 h.hp=h.maxHp/2;assert.ok(Math.abs(s.heal(h,100,h,null,true)-92)<1e-8);
});
test('精灵伤害治疗互转不递归，说明使用配置半径与比例',()=>{
 const {s,h}=arena(5);h.x=h.y=0;
 const friend=s.spawn(0,'melee',0,1);Object.assign(friend,{x:0,y:1,hp:100,maxHp:1000});
 const enemy=s.spawn(1,'melee',0,1);Object.assign(enemy,{x:0,y:2,hp:1000,maxHp:1000,armor:0});
 s.damage(h,enemy,100,true);assert.equal(friend.hp,150);assert.equal(enemy.hp,900);
 s.heal(friend,100,h);assert.equal(friend.hp,250);assert.equal(enemy.hp,850);
 s.config.innate.elfRadius=6;assert.ok(describeAbilities(s).innatePassive.includes('6格'));
});
test('领主固有被动累计三兵或击杀英雄恢复，进度实时展示',()=>{
 const {s,h}=arena(3);h.hp=h.maxHp/2;const before=h.hp;
 for(let i=0;i<2;i++){const enemy=s.spawn(0,'melee',0,1);s.damage(h,enemy,1e7);}
 assert.equal(h.hp,before);assert.ok(describeAbilities(s).passiveStatus.includes('2/3'));
 s.damage(h,s.spawn(0,'melee',0,1),1e7);assert.ok(Math.abs(h.hp-before-h.maxHp*.02)<1e-8);assert.ok(describeAbilities(s).passiveStatus.includes('0/3'));
 const p=s.makePlayer(0,false),enemy=s.spawn(0,'melee',0,1);assert.ok(s.contract(p,enemy.id));const hp=h.hp;s.damage(h,enemy,1e7);assert.ok(Math.abs(h.hp-hp-h.maxHp*.02)<1e-8);
});
test('战车多目标真实命中使用总池均分，单目标保留全额',()=>{
 const {s,p,h}=arena(2);s.units=[h];h.x=h.y=0;h.cd=Infinity;h.speed=0;s.waveAt=Infinity;for(const t of s.towers){t.x=1000;t.cd=Infinity;}for(const row of s.players)if(row!==p)row.retired=true;
 const targets=[s.spawn(1,'melee',0,1),s.spawn(1,'melee',0,1)];
 targets.forEach((u,i)=>Object.assign(u,{x:i*.5,y:1,hp:1e6,maxHp:1e6,armor:0,speed:0,cd:Infinity}));
 p.level=5;s.setManualTarget(targets[0].id,p);assert.ok(s.cast(2,p));
 for(let i=0;i<20;i++)s.tick(.05);
 const skill=s.config.heroes[2].skills[2],expected=s.attackPower(h)*skill.power/100*.45;
 for(const u of targets)assert.ok(Math.abs((1e6-u.hp)-expected)<1e-7);
 assert.equal(runeShare(s,1),1);assert.equal(runeShare(s,2),.45);assert.equal(runeShare(s,6),.5/6);
});
test('旧战局可保留热更，英雄、积分和闭包不重置，新增被动立即可用',()=>{
 const room=new Room(defaults),previous=createGameRuntime({room,dataDir:process.env.TEMP+'/innate-migration-qa'}),p=room.player({id:'migration',name:'热更',side:0});
 assert.ok(room.sim.contract(p,room.sim.spawn(0,'melee',0,1).id));const h=room.sim.hero(p);room.sim.stat(h,'heroDamage',2500);
 const earned=p.totalPoints,match=room.matchId,config=structuredClone(room.sim.config);delete config.innate;
 room.sim.config=config;room.config=structuredClone(config);previous.defaults=structuredClone(config);
 const job={at:100,run:()=>p.stamina++};room.sim.jobs.push(job);
 const update=prepareGameRuntime({dataDir:process.env.TEMP+'/innate-migration-qa'},previous);update.commit();
 assert.equal(room.matchId,match);assert.equal(room.sim.hero(p),h);assert.equal(p.totalPoints,earned);assert.equal(room.sim.jobs[0],job);assert.equal(room.sim.config.innate.enabled,1);
 h.hp=h.maxHp/2;h.armor=0;const hp=h.hp;room.sim.damage(null,h,100);assert.ok(Math.abs(hp-h.hp-87.5)<1e-8);
 room.sim.stat(h,'heroDamage',100);room.sim.settle(h,'新旧账本');const points=room.sim.ratingParts(h).reduce((sum,r)=>sum+r.points,0);assert.ok(Math.abs(points-p.totalPoints)<1e-7);
});
test('被动计分在结算后仍按同配置补记，保留战报与累计账本一致',()=>{
 const {s,p,h}=arena(0);s.stat(h,'heroDamage',1000);s.settle(h,'结算');h.hp=0;p.heroId=null;p.classId=4;s.stat(h,'heroDamage',500);
 assert.ok(Math.abs(h.settledReport.points-p.totalPoints)<1e-7);
 assert.ok(Math.abs(h.settledReport.parts.reduce((sum,r)=>sum+r.points,0)-p.totalPoints)<1e-7);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {defaults,contractType} from '../shared/config.js';
import {createCurrentDesignConfig} from '../shared/current-design.js';
import {describeAbilities,abilityGuideHTML} from '../client/src/ability-descriptions.js';

function arena(id){
 const s=new Simulation(createCurrentDesignConfig(defaults));s.units=[];
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
 s.config.design.rules.orcMissingReduction=.4;h.hp=h.maxHp/2;
 assert.ok(describeAbilities(s).passiveStatus.includes('20%'));const hp=h.hp;s.damage(null,h,100);assert.ok(Math.abs(hp-h.hp-80)<1e-8);
});
test('火法被动说明与实时炙热、攻速、受疗一致',()=>{
 const {s,h}=arena(4);s.addHeat(h,3);assert.equal(h.heat,4);
 const g=describeAbilities(s);assert.ok(g.passiveStatus.includes('4/10'));assert.ok(g.passiveStatus.includes('20%'));assert.ok(g.passiveStatus.includes('8%'));assert.equal(s.attackRate(h),1.2);
 h.hp=h.maxHp/2;assert.ok(Math.abs(s.heal(h,100,h,null,true)-92)<1e-8);
});
test('精灵伤害治疗互转不递归，说明使用配置半径与比例',()=>{
 const {s,h}=arena(5);h.x=h.y=0;
 const friend=s.spawn(0,'melee',0,1);Object.assign(friend,{x:0,y:1,hp:100,maxHp:1000});
 const enemy=s.spawn(1,'melee',0,1);Object.assign(enemy,{x:0,y:2,hp:1000,maxHp:1000,armor:0});
 s.damage(h,enemy,100,true);assert.equal(friend.hp,150);assert.equal(enemy.hp,900);
 s.heal(friend,100,h);assert.equal(friend.hp,250);assert.equal(enemy.hp,850);
 s.config.design.rules.elfConvertRadius=6;assert.ok(describeAbilities(s).innatePassive.includes('6格'));
});
test('领主固有被动累计三兵或击杀英雄恢复，进度实时展示',()=>{
 const {s,h}=arena(3);h.hp=h.maxHp/2;const before=h.hp;
 for(let i=0;i<2;i++){const enemy=s.spawn(0,'melee',0,1);s.damage(h,enemy,1e7);}
 assert.equal(h.hp,before);assert.ok(describeAbilities(s).passiveStatus.includes('2/3'));
 s.damage(h,s.spawn(0,'melee',0,1),1e7);assert.ok(Math.abs(h.hp-before-h.maxHp*.02)<1e-8);assert.ok(describeAbilities(s).passiveStatus.includes('0/3'));
 const p=s.makePlayer(0,false),enemy=s.spawn(0,'melee',0,1);assert.ok(s.contract(p,enemy.id));const hp=h.hp;s.damage(h,enemy,1e7);assert.ok(Math.abs(h.hp-hp-h.maxHp*.02)<1e-8);
});

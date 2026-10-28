import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {contractType} from '../shared/config.js';
import {unitStatuses} from '../client/src/unit-status.js';
import {describeAbilities} from '../client/src/ability-descriptions.js';
import {applyMovingFlameShield} from '../shared/lord-flame-shield.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const advance=(s,seconds)=>{const end=s.time+seconds;while(s.time<end-1e-8)s.tick(Math.min(.05,end-s.time));};
function arena(){
 const s=new Simulation();s.units=[];s.player.retired=true;s.waveAt=s.populationAt=1e9;for(const t of s.towers)t.x=100;
 const p=s.makePlayer(1,false);p.classId=3;p.level=6;p.builds[3]=[1,1,1,1];p.stamina=100;s.localPlayerId=p.id;
 const h=s.spawn(1,contractType(3),0,1,0);assert.ok(s.contract(p,h.id));Object.assign(h,{x:0,y:0,cd:1e9,speed:0});
 const make=(x,y,side=0)=>{const u=s.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp:1e7,maxHp:1e7,cd:1e9,speed:0});return u;};
 return {s,p,h,make};
}
const burns=(s,u)=>s.fields.filter(f=>f.type==='lordScorch'&&f.host===u.id);

test('领主冲锋范围18格包含边界，范围外不选取',()=>{
 const {s,p,make}=arena(),enemy=make(0,-18);assert.ok(s.setManualTarget(enemy.id,p));assert.equal(s.castPlan(1,p).t.id,enemy.id);
 enemy.y=-18.001;assert.equal(s.castPlan(1,p).ok,false);enemy.y=-17;assert.equal(s.castPlan(1,p).t.id,enemy.id);
 assert.match(describeAbilities(s).skills[1].summary,/18格/);
});
test('火焰盾减伤35%，离开后独立灼烧6秒，结算6次40%攻击伤害',()=>{
 const {s,p,h,make}=arena(),enemy=make(0,3),hp=enemy.hp;assert.ok(s.cast(2,p));advance(s,.4);
 const selfHp=h.hp;s.damage(enemy,h,100);near(selfHp-h.hp,65);assert.equal(burns(s,enemy).length,1);
 const burn=burns(s,enemy)[0],lastUntil=burn.until;enemy.y=15;near(enemy.hp,hp);
 advance(s,1);near(hp-enemy.hp,h.attack*.4);assert.equal(unitStatuses(s,enemy)[0].name,'灼烧');
 advance(s,5.1);near(hp-enemy.hp,h.attack*2.4);assert.ok(s.time>lastUntil);assert.equal(burns(s,enemy).length,0);
});
test('连续接触只刷新期限、不叠层、不推迟每秒跳伤',()=>{
 const {s,p,h,make}=arena(),enemy=make(0,3),hp=enemy.hp;s.cast(2,p);advance(s,.4);const tick=burns(s,enemy)[0].tick;
 advance(s,.8);near(burns(s,enemy)[0].tick,tick);advance(s,.2);near(hp-enemy.hp,h.attack*.4);assert.equal(burns(s,enemy).length,1);
 advance(s,1);near(hp-enemy.hp,h.attack*.8);assert.ok(burns(s,enemy)[0].until>s.time+5.9);
});
test('先火焰盾再18格突进：沿途与终点挂灼烧，离开后继续跳伤',()=>{
 const {s,p,h,make}=arena(),first=make(0,-4),middle=make(0,-9),far=make(0,-17),hp=first.hp;
 s.cast(2,p);advance(s,.4);assert.ok(s.setManualTarget(far.id,p));assert.ok(s.cast(1,p));advance(s,2.3);near(h.y,-17);assert.equal(h.dash,null);
 for(const u of [first,middle,far])assert.equal(burns(s,u).length,1,`missing route target ${u.id}`);
 assert.ok(Math.hypot(h.x-first.x,h.y-first.y)>5);const before=first.hp;advance(s,1.1);assert.ok(first.hp<before);assert.ok(first.hp<hp);
});
test('高速跨步按突进整段扫描，覆盖中段且不越出半径、不影响友方',()=>{
 const {s,p,h,make}=arena(),inside=make(4.99,5),outside=make(5.01,5),ally=make(0,5,1);
 s.cast(2,p);advance(s,.4);h.y=10;applyMovingFlameShield(s,h,{x:0,y:0});
 assert.equal(burns(s,inside).length,1);assert.equal(burns(s,outside).length,0);assert.equal(burns(s,ally).length,0);
});
test('净化解除离场灼烧，免疫目标不占可附加名额',()=>{
 const {s,p,make}=arena(),immune=make(0,1);immune.immuneUntil=20;
 const targets=Array.from({length:5},(_,i)=>make((i-2)*.3,2));s.cast(2,p);advance(s,.4);
 assert.equal(burns(s,immune).length,0);for(const u of targets)assert.equal(burns(s,u).length,1);
 const target=targets[0];target.y=20;assert.ok(s.hasNegative(target));assert.ok(s.cleanse(target));assert.equal(burns(s,target).length,0);
 const hp=target.hp;advance(s,1.2);near(target.hp,hp);assert.equal(s.hasNegative(target),false);
});
test('领主阵亡停止附加，已挂灼烧与图标仍保留并结算',()=>{
 const {s,p,h,make}=arena(),enemy=make(0,3);s.cast(2,p);advance(s,.4);const hp=enemy.hp;
 h.hp=1;s.damage(null,h,2);const fresh=make(0,2);advance(s,1.1);
 assert.ok(enemy.hp<hp);assert.equal(burns(s,fresh).length,0);assert.equal(unitStatuses(s,enemy)[0].name,'灼烧');
 assert.equal(s.fields.some(f=>f.kind==='lordBurn'),false);
});
test('多目标灼烧和减伤共用单次2000%攻击预算，耗尽后不再伤害或显示图标',()=>{
 const {s,p,h,make}=arena(),targets=Array.from({length:5},(_,i)=>make(i-2,2));s.cast(2,p);advance(s,.4);
 const value=s.skillValues.at(-1);s.damage(targets[0],h,100);advance(s,12);
 near(value.limit,h.attack*20);near(value.spent,value.limit);assert.ok(value.parts['伤害']>0);assert.ok(Object.keys(value.parts).some(k=>k.includes('减伤')));
 const hp=targets.map(u=>u.hp);advance(s,2);assert.deepEqual(targets.map(u=>u.hp),hp);for(const u of targets)assert.equal(unitStatuses(s,u).some(x=>x.id==='dot'),false);
});

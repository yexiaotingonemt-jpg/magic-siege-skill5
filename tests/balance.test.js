import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation} from '../shared/simulation.js';
import {defaults,contractType} from '../shared/config.js';
import {towerAllyProtection} from '../shared/tower-guard.js';
import {unitStatuses} from '../client/src/unit-status.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(count=0){
 const s=new Simulation();s.units=[];
 const t=s.towers[0];Object.assign(t,{x:0,y:0,hp:1e6,maxHp:1e6});
 for(let i=0;i<count;i++){const u=s.spawn(t.side,'melee',0,1,0);Object.assign(u,{x:0,y:0});}
 return {s,t};
}
test('导出默认配置与运行时默认配置一致',()=>{
 assert.deepEqual(JSON.parse(readFileSync(new URL('../shared/default-config.json',import.meta.url))),defaults);
});
for(const count of [0,1,9,10,11,20])test(`护塔${count}名友军：每名5%，最多50%`,()=>{
 const {s,t}=arena(count),ratio=Math.min(.5,count*.05),hp=t.hp;
 near(towerAllyProtection(t,s.units).reduction,ratio);
 near(s.damage(null,t,100),100*(1-ratio));near(hp-t.hp,100*(1-ratio));
 if(count)assert.match(unitStatuses(s,t).find(x=>x.id==='towerAllies').detail,/50%|45%|5%/);
});
test('护塔只统计范围内存活友方小兵与英雄，并在每次受击重新统计',()=>{
 const {s,t}=arena(),ally=s.spawn(t.side,'ranged',0,1,0);
 Object.assign(ally,{x:t.range,y:0,hero:true});
 const outside=s.spawn(t.side,'melee',0,1,0),enemy=s.spawn(1-t.side,'melee',0,1,0),dead=s.spawn(t.side,'melee',0,1,0);
 Object.assign(outside,{x:t.range+.001,y:0});Object.assign(enemy,{x:0,y:0});Object.assign(dead,{x:0,y:0,hp:0});
 assert.equal(towerAllyProtection(t,[...s.units,t,...s.towers]).count,1);
 near(s.damage(null,t,100),95);ally.x+=.001;near(s.damage(null,t,100),100);
 ally.x=0;ally.hp=0;near(s.damage(null,t,100),100);
});
test('护塔在护甲、易伤、常规减伤与阈值守护之后，护盾之前乘算',()=>{
 const {s,t}=arena(20);t.armor=100;t.debuffs={v:{kind:'vulnerable',ratio:.25,until:10}};
 t.guards=[{ratio:.2,until:10}];t.towerGuardUntil=10;
 s.shield(t,10,{id:999},10);const hp=t.hp;
 // 100 × 1.25 / 2 × .8 × .5 × .5 = 12.5, shield absorbs 10.
 near(s.damage(null,t,100),12.5);near(hp-t.hp,2.5);near(t.shield,0);
});
for(const basis of ['hp','maxHp'])test(`护塔对按${basis}百分比产生的伤害仍然生效`,()=>{
 const {s,t}=arena(10);t.hp=t.maxHp*.9;const hp=t.hp,raw=t[basis]*.08;
 near(s.damage(null,t,raw),raw*.5);near(hp-t.hp,raw*.5);
});
test('战车最大生命百分比技能实际命中塔也经过护塔减伤',()=>{
 const {s,t}=arena(10),p=s.makePlayer(0,false);p.classId=2;p.stamina=100;
 const h=s.spawn(0,contractType(2),0,1,0);assert.ok(s.contract(p,h.id));Object.assign(h,{x:0,y:0});
 const value={attack:h.attack,limit:1e8,spent:0,parts:{},skill:0};
 const hp=t.hp;s.resolveSkill(h,0,{...s.config.heroes[2].skills[0],value},{id:t.id,x:t.x,y:t.y},[t.id]);
 // The corrosion projectile applies 8% max HP, then final tower protection.
 s.impactSkill(s.projectiles.shift());
 near(hp-t.hp,t.maxHp*.08*.5);
});
test('英雄等级成长减半，升级保留生命比例，重新契约继承新属性',()=>{
 const {s}=arena(),p=s.makePlayer(0,false);p.classId=0;
 const h=s.spawn(0,'melee',0,1,0);assert.ok(s.contract(p,h.id));h.hp=h.maxHp*.4;
 for(let i=1;i<30;i++)s.addXp(p,s.expNeeded(p)-p.xp);
 near(h.maxHp,16000*1.58);near(h.attack,200*1.435);near(h.hp/h.maxHp,.4);
 h.hp=0;const next=s.spawn(0,'melee',0,1,0);assert.ok(s.contract(p,next.id));
 near(next.maxHp,h.maxHp);near(next.attack,h.attack);
});

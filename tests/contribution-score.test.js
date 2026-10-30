import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {SCORE_COEFFICIENTS as coefficients,contributionParts} from '../shared/contribution-score.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function fixture(){const s=new Simulation(),p=s.player;s.units=[];s.contract(p,s.spawn(0,'melee',0,1,0).id);const h=s.hero(p);h.x=h.y=0;return {s,p,h};}
test('全伤加击杀=纯补刀与全伤无击杀各自战斗分两倍，适用不同血量及各职业',()=>{
 for(const id of [0,2,3,4,5])for(const hp of [4000,5000,12000]){
  const run=(damage,kill)=>{const {s,p,h}=fixture();h.classId=id;const t=s.spawn(1,'melee',0,1,0);t.maxHp=hp;t.hp=kill?Math.max(damage,1):hp+1;s.damage(h,t,damage);return p.totalPoints-300;};
  const a=coefficients[id].a,full=run(hp,true),last=run(1,true),damageOnly=run(hp,false);
  near(full,2*hp*a);near(damageOnly,hp*a);near(last,(hp+1)*a);near(full,2*(last-a));
 }
});
test('英雄击杀和助攻分别统计，助攻去重，击杀小兵与塔不给英雄助攻',()=>{
 const {s,p,h}=fixture(),helper=s.makePlayer(0,false);s.contract(helper,s.spawn(0,'melee',0,1).id);const ally=s.hero(helper);
 const enemy=s.makePlayer(1,false);enemy.classId=3;s.contract(enemy,s.spawn(1,'melee',0,1).id);const t=s.hero(enemy);t.hp=1;t.contributors={[helper.id]:s.time,[p.id]:s.time};h.support={[helper.id]:s.time};
 s.damage(h,t,1);assert.equal(h.stats.heroKills,1);assert.equal(ally.stats.heroAssists,1);assert.equal(h.stats.heroAssists,undefined);assert.equal(h.stats.minionKills,undefined);
 const minion=s.spawn(1,'melee',0,1);minion.hp=1;minion.contributors={[helper.id]:s.time};s.damage(h,minion,1);assert.equal(ally.stats.heroAssists,1);assert.equal(h.stats.minionKills,1);
 const tower=s.towers[0];tower.hp=1;tower.contributors={[helper.id]:s.time};s.damage(h,tower,1);assert.equal(h.stats.minionKills,1);assert.equal(h.stats.heroKills,1);assert.equal(ally.stats.heroAssists,1);
 const enemy2=s.makePlayer(1,false);enemy2.classId=3;s.contract(enemy2,s.spawn(1,'melee',0,1).id);const t2=s.hero(enemy2);t2.hp=1;t2.contributors={[helper.id]:s.time-11};h.support={};s.damage(h,t2,1);assert.equal(ally.stats.heroAssists,1);
});
test('有效伤害、治疗与原始承伤记分；盾吸与单位伤害汇总不重复记分',()=>{
 const {s,p,h}=fixture(),c=coefficients[0],t=s.spawn(1,'melee',0,1);t.hp=100;t.shield=50;t.shieldUntil=100;
 s.damage(h,t,10000);near(p.totalPoints,300+150*c.a+t.maxHp*c.a);
 h.hp-=100;s.heal(h,10000,h);near(h.stats.healing,100);
 const before=p.totalPoints;h.armor=100;s.damage(t,h,200);near(p.totalPoints-before,200*c.b);
 near(contributionParts(h).reduce((sum,x)=>sum+x.points,0),p.totalPoints);
});
test('不封顶；死后按原职业追加且结算幂等，不随当前选择改变',()=>{
 const {s,p,h}=fixture();s.stat(h,'heroDamage',100000);s.settle(h,'阵亡');const old=p.totalPoints;s.settle(h,'重复');near(p.totalPoints,old);
 h.hp=0;p.heroId=null;p.classId=4;s.stat(h,'heroDamage',100000);near(p.totalPoints,300+200000*coefficients[0].a);near(s.reports[0].points,p.totalPoints);assert.equal(s.reports.length,1);
});

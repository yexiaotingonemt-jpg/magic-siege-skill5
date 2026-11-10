import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,affix,cast,advance,near} from './current-design-fixture.mjs';
import {currentSkill,currentTraits} from '../shared/current-design.js';
import {clientSnapshot} from '../server/client-snapshot.mjs';
import {unitStatuses} from '../client/src/unit-status.js';

const links=s=>s.fields.filter(f=>f.kind==='link');
const recast=(a)=>{a.p.cd[1]=a.s.time;cast(a.s,a.p,1);};

test('链接优先手选合法友军，跨次可重复链接',()=>{
 const a=arena(5),{s,p,h,friend,make}=a,low=make(0,4,0).h,far=make(0,30,0).h;
 friend.hp=100;friend.maxHp=10000;low.hp=50;low.maxHp=100;far.hp=1;h.hp=1;
 s.setManualTarget(friend.id,p);assert.equal(s.castPlan(1,p).t.id,friend.id);cast(s,p,1);
 assert.deepEqual(links(s).map(f=>f.host),[friend.id]);recast(a);
 assert.deepEqual(links(s).map(f=>f.host),[friend.id,friend.id]);
});

test('强化只能加1档，每次最多2个不同目标；跨次可重复并保留旧链接',()=>{
 const a=arena(5),{s,p,h,friend,make}=a,b=make(0,2,0).h,c=make(0,3,0).h;
 friend.hp=100;b.hp=200;c.hp=300;affix(s,p,38);
 const trait=currentTraits(s.config,5).find(t=>t.sourceId===38);assert.equal(trait.max,1);assert.equal(trait.values.length,1);assert.equal(currentSkill(s,h,1).targets,2);
 p.progress[5].traits[trait.id]=2;assert.equal(currentSkill(s,h,1).targets,2,'旧2档按新1档效果上限生效');
 cast(s,p,1);assert.deepEqual(links(s).map(f=>f.host),[friend.id,b.id]);
 c.hp=50;recast(a);assert.deepEqual(links(s).map(f=>f.host),[friend.id,b.id,friend.id,b.id]);
});

test('再次施放刷新旧链接并新增链接，仍保留独立计时和状态',()=>{
 const a=arena(5),{s,p,friend}=a;cast(s,p,1);const old=links(s)[0],until=old.until;
 advance(s,3);recast(a);const fresh=links(s)[1];assert.ok(old.until>until+3);near(old.until,fresh.until);
 const snapshot=clientSnapshot({fields:links(s)},s.time);assert.equal(snapshot.fields.length,2);near(snapshot.fields[0].until,snapshot.fields[1].until);
 const status=unitStatuses(s,friend).find(v=>v.id==='link');assert.equal(status.stacks,2);assert.match(status.detail,/各条独立计时/);assert.equal((status.detail.match(/剩余/g)||[]).length,2);
 advance(s,until-s.time+.1);assert.ok(links(s).includes(old));assert.ok(links(s).includes(fresh));assert.equal(fresh.host,friend.id);
});

test('同一对象重复链接分别共享和续时，老链加3秒，新链封顶8秒',()=>{
 const a=arena(5),{s,p,h,friend}=a;h.hp=h.maxHp/2;friend.hp=100;cast(s,p,1);advance(s,4);recast(a);
 const [old,fresh]=links(s),before=old.until,now=s.time,hp=h.hp;s.heal(friend,100,friend);
 near(old.until,Math.min(before+3,now+8));near(fresh.until,now+8);near(h.hp-hp,84);
});

test('真实被动治疗让所有对应重复链独立续时，连续60秒始终不超过8秒',()=>{
 const a=arena(5),{s,p,h,friend,enemy}=a;cast(s,p,1);advance(s,3);recast(a);assert.equal(links(s).length,2);
 for(let i=0;i<1200;i++){
  advance(s,.05);const fields=links(s),before=fields.map(f=>f.until),hp=friend.hp;s.damage(h,enemy,1,true);assert.ok(friend.hp>hp);
  assert.equal(fields.length,2);fields.forEach((f,j)=>{near(f.until,Math.min(before[j]+3,s.time+8));assert.ok(f.until-s.time<=8+1e-9);});
 }
});

test('遵守真实10秒冷却：被动治疗维持旧链后再施法可新增重复链接',()=>{
 const a=arena(5),{s,p,h,enemy}=a;cast(s,p,1);const old=links(s)[0];
 for(let i=0;i<10;i++){advance(s,1);s.damage(h,enemy,1,true);}
 assert.ok(s.time>=p.cd[1]);assert.ok(links(s).includes(old));const until=old.until;
 cast(s,p,1);assert.equal(links(s).length,2);assert.ok(old.until>until);near(links(s)[1].until,old.until);
});

test('刷新链接会延长其减伤攻速，重复链接不叠加同一技能强化',()=>{
 const a=arena(5),{s,p,friend}=a;affix(s,p,37);affix(s,p,39);cast(s,p,1);const old=links(s)[0],original=old.until;advance(s,3);recast(a);
 near(s.attackRate(friend),1.2);advance(s,original-s.time+.1);assert.equal(links(s).length,2);near(s.attackRate(friend),1.2);
 assert.equal(friend.guards.filter(g=>g.kind==='elfLink'&&g.until>s.time).length,1);
});

test('伤害平摊对重复链接对象去重，不重复分摊一人的份额',()=>{
 const a=arena(5),{s,p,h,friend,enemy}=a;affix(s,p,40);cast(s,p,1);recast(a);
 const taken=h.stats.damageTaken||0,ft=friend.stats.damageTaken||0;s.damage(enemy,friend,300);near(h.stats.damageTaken-taken,150);near(friend.stats.damageTaken-ft,150);
});

test('刷新范围内自身有效旧链接，各自按创建时的持续时间刷新，不影响其他精灵',()=>{
 const a=arena(5),{s,p,h,friend,make}=a;affix(s,p,106,2);cast(s,p,1);const old=links(s)[0];
 const other=make(5,2,0),foreign={kind:'link',owner:other.h,host:friend.id,until:s.time+4,duration:8,breakRange:12};s.fields.push(foreign);
 advance(s,2);p.progress[5].traits.N106_5=0;recast(a);near(old.until,s.time+12);near(links(s).at(-1).until,s.time+8);assert.ok(foreign.until<s.time+4);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,cast,advance,near} from './current-design-fixture.mjs';

test('无手选目标时灵息治疗缺血友军，不误跟随自动攻击目标治疗满血自身，链接续3秒',()=>{
 const {s,p,h,friend,enemy}=arena(5);cast(s,p,1);
 const link=s.fields.find(f=>f.kind==='link'),original=link.until;
 advance(s,4);assert.equal(h.manualTargetId,null);assert.equal(enemy.targetId,h.id);assert.equal(h.hp,h.maxHp);
 const plan=s.castPlan(0,p);assert.ok(plan.ok);assert.equal(plan.t.id,friend.id);
 const before=friend.hp;cast(s,p,0);assert.ok(friend.hp>before);near(link.until,original+3);
 advance(s,original+.1-s.time);assert.ok(s.fields.includes(link),'初始8秒到期时续时链接仍有效');
 advance(s,link.until-s.time+.1);assert.ok(!s.fields.includes(link));
});

test('无手选时灵息按生命比例自动治疗，不受敌人当前攻击对象影响',()=>{
 const {s,p,h,friend,enemy,make}=arena(5),other=make(0,2,0).h;
 h.hp=h.maxHp*.8;friend.hp=friend.maxHp*.5;other.hp=other.maxHp*.9;enemy.targetId=other.id;
 assert.equal(s.castPlan(0,p).t.id,friend.id);
});

test('手动选择友军仍优先，治疗无关友军不为旧链接续时',()=>{
 const {s,p,h,friend,make}=arena(5);cast(s,p,1);const link=s.fields.find(f=>f.kind==='link');
 advance(s,4);const other=make(0,2,0).h;other.hp=other.maxHp*.8;
 assert.ok(s.setManualTarget(other.id,p));assert.equal(s.castPlan(0,p).t.id,other.id);
 const deadline=link.until,hp=other.hp;cast(s,p,0);assert.ok(other.hp>hp);near(link.until,deadline);
});

test('手动选择敌人仍治疗其当前攻击的友军，支持对链接对象续时',()=>{
 const {s,p,h,friend,enemy}=arena(5);cast(s,p,1);const link=s.fields.find(f=>f.kind==='link');
 advance(s,4);enemy.targetId=friend.id;assert.ok(s.setManualTarget(enemy.id,p));
 assert.equal(s.castPlan(0,p).t.id,friend.id);const deadline=link.until;cast(s,p,0);near(link.until,deadline+3);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,cast} from './current-design-fixture.mjs';

test('技能1和2优先手选友军，否则选择低血量百分比的已链接友军',()=>{
 const {s,p,h,enemy,friend,make}=arena(5),other=make(0,2,0).h;
 friend.hp=friend.maxHp*.8;other.hp=other.maxHp*.1;
 s.fields.push({kind:'link',owner:h,host:friend.id,until:100,breakRange:12});
 for(const i of [0,1])assert.equal(s.castPlan(i,p).t.id,friend.id);
 assert.ok(s.setManualTarget(other.id,p));for(const i of [0,1])assert.equal(s.castPlan(i,p).t.id,other.id);
 assert.ok(s.setManualTarget(enemy.id,p));for(const i of [0,1])assert.equal(s.castPlan(i,p).t.id,friend.id);
 s.fields=[];for(const i of [0,1])assert.equal(s.castPlan(i,p).t.id,other.id);
});
test('被动治疗优先手选友军，其次选择已链接友军',()=>{
 const {s,p,h,enemy,friend,make}=arena(5),other=make(0,2,0).h;friend.hp=friend.maxHp*.5;other.hp=other.maxHp*.1;
 s.fields.push({kind:'link',owner:h,host:friend.id,until:100,breakRange:12,shareRatio:0});
 let before=friend.hp;s.damage(h,enemy,100,true);assert.ok(friend.hp>before);
 assert.ok(s.setManualTarget(other.id,p));before=other.hp;s.damage(h,enemy,100,true);assert.ok(other.hp>before);
});

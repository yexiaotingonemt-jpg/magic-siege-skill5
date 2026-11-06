import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,cast,affix} from './current-design-fixture.mjs';
import {clientSnapshot} from '../server/client-snapshot.mjs';
import {skillLiveCounts} from '../client/src/skill-live-counts.js';
import {unitStatuses} from '../client/src/unit-status.js';

test('精灵角标继续按独立链接计数，单条链接状态也有数字1',()=>{
 const {s,p,h,friend}=arena(5);cast(s,p,1,friend);
 assert.equal(skillLiveCounts(s)[1].text,'链接 1');
 assert.equal(unitStatuses(s,h,undefined,p).find(x=>x.id==='link').stacks,1);
 p.cd[1]=s.time;cast(s,p,1,friend);
 assert.equal(skillLiveCounts(s)[1].text,'链接 2');
});

test('汲血连接只统计自身仍有效的不同目标，排除超距、免疫、中断及裁剪账本耗尽',()=>{
 const {s,p,h,enemy,make}=arena(0);cast(s,p,0,enemy);
 assert.equal(skillLiveCounts(s)[0].text,'连接 1');
 const f=s.fields.find(f=>f.kind==='currentDrain'),other=make(0).h;
 s.fields.push({...f,owner:other});
 assert.equal(skillLiveCounts(s)[0].text,'连接 1');
 const x=enemy.x;enemy.x=h.x+f.s.break_range+.1;
 assert.equal(skillLiveCounts(s)[0].text,'连接 0');enemy.x=x;
 enemy.immuneUntil=s.time+1;assert.equal(skillLiveCounts(s)[0].text,'连接 0');enemy.immuneUntil=0;
 h.channelUntil=s.time-.1;assert.equal(skillLiveCounts(s)[0].text,'连接 0');h.channelUntil=f.until;
 f.s.value={limit:10,spent:10};assert.equal(skillLiveCounts(s)[0].text,'连接 0');
});

test('蓄盾显示实际转换量，保留精确说明，大额缩写且到期隐藏',()=>{
 const {s,p,h,enemy}=arena(0);cast(s,p,3);s.damage(enemy,h,1234);
 assert.equal(skillLiveCounts(s)[3].text,'蓄盾 1234');
 h.damageStore.total=123456;h.damageStore.conversionRatio=1.5;
 assert.equal(skillLiveCounts(s)[3].text,'蓄盾 18.5万');
 assert.match(skillLiveCounts(s)[3].detail,/185184/);
 h.damageStore.value={limit:999,spent:100};
 assert.equal(skillLiveCounts(s)[3].text,'蓄盾 899');
 s.time=h.damageStore.until;assert.equal(skillLiveCounts(s)[3],null);
});

test('炙热、耗热与标记随自身有效状态变化，读取不修改快照且衰减遵守强化时长',()=>{
 const {s,p,h,enemy,friend}=arena(4);cast(s,p,1,enemy);
 const mark=enemy.soulMarks[0];
 friend.soulMarks=[{...mark,ownerId:friend.id}];
 h.heat=3;h.heatUntil=s.time+1;
 assert.equal(skillLiveCounts(s)[0].text,'炙热 3');assert.equal(skillLiveCounts(s)[3].text,'耗热 3');
 assert.equal(skillLiveCounts(s)[1].text,'标记 1');
 const original=s.fields;s.fields=clientSnapshot(s.fields,s.time);
 const before=JSON.stringify([h,enemy,s.fields]);skillLiveCounts(s);
 assert.equal(JSON.stringify([h,enemy,s.fields]),before);s.fields=original;
 s.time=mark.until;assert.equal(skillLiveCounts(s)[1].text,'标记 0');
 assert.equal(skillLiveCounts(s)[0].text,'炙热 2');
 const t=s.config.design.affixes.find(t=>t.classId===4&&t.keys.includes('heat_duration_extra'));
 affix(s,p,t.sourceId);const duration=s.config.design.rules.heatDuration+t.values[0][t.keys.indexOf('heat_duration_extra')];
 s.time=h.heatUntil+duration;assert.equal(skillLiveCounts(s)[0].text,'炙热 1');
 enemy.hp=0;assert.equal(skillLiveCounts(s)[1].text,'标记 0');
});

for(const [id,kind,label]of [[2,'currentBarrage','余炮'],[5,'currentGroupHeal','余疗']]){
 test(`${label}按当前引导剩余次数显示，快照间推进及中断均消除旧数字`,()=>{
  const {s,p,h}=arena(id);cast(s,p,3);
  const f=s.fields.find(f=>f.kind===kind);assert.ok(f);
  assert.equal(skillLiveCounts(s)[3].text,`${label} ${f.remaining}`);
  const fields=clientSnapshot(s.fields,s.time);s.fields=fields;
  const copy=fields.find(f=>f.kind===kind),before=JSON.stringify(copy);
  s.time=copy.tick+.001;assert.equal(skillLiveCounts(s)[3]?.text,copy.remaining>1?`${label} ${copy.remaining-1}`:undefined);
  assert.equal(JSON.stringify(copy),before);
  h.channelUntil=s.time-.1;assert.equal(skillLiveCounts(s)[3],null);
 });
}

test('领主护卫仅在拥有召唤能力或护卫存活时显示，不计其他来源及到期护卫',()=>{
 const {s,p,h,friend}=arena(3);assert.equal(skillLiveCounts(s)[3],null);
 const t=s.config.design.affixes.find(t=>t.classId===3&&t.keys.includes('summon'));affix(s,p,t.sourceId);
 assert.equal(skillLiveCounts(s)[3].text,'护卫 0');
 const spawn=owner=>Object.assign(s.spawn(h.side,'melee',0,1),{summoned:true,ownerId:owner,expiresAt:s.time+2});
 const own=spawn(h.id);spawn(friend.id);
 assert.equal(skillLiveCounts(s)[3].text,'护卫 1');own.hp=0;assert.equal(skillLiveCounts(s)[3].text,'护卫 0');
 own.hp=1;s.time=own.expiresAt;assert.equal(skillLiveCounts(s)[3].text,'护卫 0');
 h.hp=0;assert.deepEqual(skillLiveCounts(s),[null,null,null,null]);
});

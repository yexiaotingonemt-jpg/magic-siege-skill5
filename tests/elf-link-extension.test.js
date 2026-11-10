import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,affix,cast,advance,near} from './current-design-fixture.mjs';

test('持续时间和治疗续时词条各档组合生效，续时不超过该链接的持续时间',()=>{
 for(const durationRank of [0,1,2]) for(const extensionRank of [0,1,2]){
  const {s,p,h,friend}=arena(5);
  if(durationRank)affix(s,p,106,durationRank);
  if(extensionRank)affix(s,p,107,extensionRank);
  cast(s,p,1,friend);const f=s.fields.find(f=>f.kind==='link'),duration=8+2*durationRank,extension=3+extensionRank,start=f.until-duration;
  s.time=start+duration-1; s.heal(friend,100,h);near(f.until,start+duration+extension);
  for(let i=0;i<5;i++)s.heal(friend,100,h);near(f.until,s.time+duration);
 }
});

test('共生链接从生效时持续8秒，有效治疗加3秒且剩余不超过8秒，共享不重复续时',()=>{
 const {s,p,h,friend}=arena(5);h.hp-=3000;cast(s,p,1,friend);
 const f=s.fields.find(f=>f.kind==='link'),start=f.until-8;near(f.until,start+8);
 s.time=start+5;const hp=h.hp;s.heal(friend,100,h);near(f.until,start+11);near(h.hp-hp,42);
 s.heal(h,100,friend);near(f.until,s.time+8);
 s.heal(friend,100,h);near(f.until,s.time+8);
});

test('满血、禁疗、无关单位、超距、死亡和过期均不为链接续时',()=>{
 for(const mode of ['full','blocked','unrelated','range','dead','deadHost','expired']){
  const {s,p,h,friend,make}=arena(5);cast(s,p,1,friend);const f=s.fields.find(f=>f.kind==='link');s.time=f.until-4;
  let target=friend,derived=false;
  if(mode==='full')friend.hp=friend.maxHp;
  if(mode==='blocked')s.debuff(friend,h,'healingDown',1,10);
  if(mode==='unrelated')target=make(0,2,0).h,target.hp-=100;
  if(mode==='range')friend.x=30;
  if(mode==='dead')h.hp=0;
  if(mode==='deadHost')friend.hp=0;
  if(mode==='expired')s.time=f.until;
  const until=f.until;s.heal(target,100,h,null,derived);near(f.until,until);
 }
});

test('被动有效治疗也续时，但保持既有的不传播规则',()=>{
 const {s,p,h,friend}=arena(5);h.hp-=1000;cast(s,p,1,friend);const f=s.fields.find(f=>f.kind==='link'),until=f.until;
 s.time=until-4;const hp=h.hp;s.heal(friend,100,h,null,true);near(f.until,until+3);near(h.hp,hp);
});

test('多目标链接分别续时，减伤和攻速强化随链接延长且不重复计治疗',()=>{
 const {s,p,h,friend,make}=arena(5);affix(s,p,37);affix(s,p,38);affix(s,p,39);
 const other=make(0,2,0).h;other.hp-=1000;h.hp-=1000;cast(s,p,1,friend);
 const links=s.fields.filter(f=>f.kind==='link');assert.equal(links.length,2);
 const f=links.find(f=>f.host===friend.id),g=links.find(f=>f.host===other.id),until=f.until;
 s.time=until-4;const healing=h.stats.healing||0;s.heal(friend,100,h);
 near(f.until,until+3);near(g.until,until);near(h.stats.healing-healing,142);
 near(friend.guards.find(g=>g.kind==='elfLink').until,f.until);near(friend.hastes.elfLink.until,f.until);
 s.time=until+.1;assert.ok(s.attackRate(friend)>1);
 s.time=f.until;near(s.attackRate(friend),1);
});

test('无治疗自然到期，断链后不能被治疗复活',()=>{
 const {s,p,h,friend}=arena(5);cast(s,p,1,friend);const f=s.fields.find(f=>f.kind==='link');
 advance(s,8.1);assert.ok(!s.fields.includes(f));const hp=h.hp;s.heal(friend,100,h);near(h.hp,hp);
});

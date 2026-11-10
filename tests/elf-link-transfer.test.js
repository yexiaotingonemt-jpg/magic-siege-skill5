import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,affix,cast,near} from './current-design-fixture.mjs';

test('链接目标死亡时按档位独立判定，转移至最近合法友军并保留期限和强化',()=>{
 for(const [rank,roll,transfers] of [[0,0,false],[1,.49,true],[1,.5,false],[2,.99,true]]){
  const {s,p,h,enemy,friend,make}=arena(5);if(rank)affix(s,p,108,rank);affix(s,p,37);affix(s,p,39);
  const next=make(0,2,0).h,far=make(0,5,0).h;next.hp=next.maxHp;far.hp=far.maxHp;
  cast(s,p,1,friend);const f=s.fields.find(f=>f.kind==='link'),until=f.until;s.random=()=>roll;
  s.damage(enemy,friend,friend.hp*10);assert.equal(f.host,transfers?next.id:friend.id);near(f.until,until);
  if(transfers){assert.equal(next.guards.find(g=>g.kind==='elfLink').ratio,.2);assert.equal(next.hastes.elfLink.ratio,.2);near(next.hastes.elfLink.until,until);}
 }
});
test('没有附近合法目标、链接已过期、施法者死亡或超距时不会转移',()=>{
 for(const mode of ['noTarget','expired','deadOwner','outOfRange']){
  const {s,p,h,enemy,friend,make}=arena(5);affix(s,p,108,2);const other=make(0,mode==='noTarget'?20:2,0).h;
  other.hp=other.maxHp;cast(s,p,1,friend);const f=s.fields.find(f=>f.kind==='link');
  if(mode==='expired')s.time=f.until;if(mode==='deadOwner')h.hp=0;if(mode==='outOfRange')h.x=30;
  s.damage(enemy,friend,friend.hp*10);assert.equal(f.host,friend.id);
 }
});

test('同一友军的多条链接各自判定，只转移成功的链接',()=>{
 const {s,p,h,enemy,friend,make}=arena(5);affix(s,p,108);const next=make(0,2,0).h;next.hp=next.maxHp;
 cast(s,p,1,friend);p.cd[1]=0;cast(s,p,1,friend);const links=s.fields.filter(f=>f.kind==='link');assert.equal(links.length,2);
 const rolls=[.49,.5];s.random=()=>rolls.shift()??.9;s.damage(enemy,friend,friend.hp*10);
 assert.deepEqual(links.map(f=>f.host),[next.id,friend.id]);
});

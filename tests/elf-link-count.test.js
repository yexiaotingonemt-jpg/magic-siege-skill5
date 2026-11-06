import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,cast,advance} from './current-design-fixture.mjs';
import {clientSnapshot} from '../server/client-snapshot.mjs';
import {elfLinkCount} from '../client/src/elf-link-count.js';

test('精灵链接计数保留同一目标的独立链接，快照裁剪后与到期时仍准确',()=>{
 const {s,p,h,friend}=arena(5);
 assert.equal(elfLinkCount(s),0);
 cast(s,p,1);assert.equal(elfLinkCount(s),1);
 const first=s.fields.find(f=>f.kind==='link');
 advance(s,3);p.cd[1]=s.time;cast(s,p,1);assert.equal(elfLinkCount(s),2);
 assert.ok(s.fields.filter(f=>f.kind==='link').every(f=>f.host===friend.id));
 const fields=clientSnapshot(s.fields,s.time),original=s.fields;
 s.fields=fields;assert.equal(elfLinkCount(s),2);assert.deepEqual(s.fields,fields);
 s.fields=original;advance(s,first.until-s.time+.1);assert.equal(elfLinkCount(s),1);
 advance(s,8);assert.equal(elfLinkCount(s),0);
});

test('只统计自身有效的向外链接，排除其他精灵、失效目标、超距与阵亡',()=>{
 const {s,p,h,friend,make}=arena(5);cast(s,p,1);
 const f=s.fields.find(f=>f.kind==='link'),other=make(5,2,0).h;
 s.fields.push({...f,owner:other,host:h.id});assert.equal(elfLinkCount(s),1);
 const x=friend.x;friend.x=h.x+f.breakRange+.01;assert.equal(elfLinkCount(s),0);
 friend.x=x;assert.equal(elfLinkCount(s),1);
 const hp=friend.hp;friend.hp=0;assert.equal(elfLinkCount(s),0);friend.hp=hp;
 const host=f.host;f.host=-1;assert.equal(elfLinkCount(s),0);f.host=host;
 const value=f.value;f.value={limit:1,spent:1};assert.equal(elfLinkCount(s),0);f.value=value;
 const deadline=f.until;f.until=s.time;assert.equal(elfLinkCount(s),0);f.until=deadline;
 h.hp=0;assert.equal(elfLinkCount(s),0);assert.equal(elfLinkCount(s,h),0);
 assert.equal(elfLinkCount(s,null),0);
 h.hp=1;h.classId=4;assert.equal(elfLinkCount(s,h),0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {unitStatuses,statusFrame,canDispelEnemyBuffs} from '../client/src/unit-status.js';
import {arena,cast,affix} from './current-design-fixture.mjs';
import {clientSnapshot} from '../server/client-snapshot.mjs';

const shown=(s,u,p=s.player)=>unitStatuses(s,u,undefined,p);
const ids=(s,u,p)=>shown(s,u,p).map(x=>x.id);

test('只显示自己施加的增益、减益，以及敌人施加在自己身上的减益',()=>{
 const {s,p,h,enemy,friend}=arena(0);
 s.shield(h,100,friend,10);s.guard(h,friend,'other',.4,10);s.haste(h,'other',.4,10,friend);
 assert.deepEqual(ids(s,h),[]);
 s.shield(friend,100,h,10);s.guard(friend,h,'own',.2,10);s.haste(friend,'own',.2,10,h);
 assert.deepEqual(new Set(ids(s,friend)),new Set(['shield','guard','haste']));
 s.debuff(enemy,h,'moveSlow',.2,4);s.debuff(enemy,friend,'moveSlow',.8,10);s.debuff(enemy,friend,'attackDown',.5,10);
 const slow=shown(s,enemy).find(x=>x.id==='moveSlow');assert.equal(slow.detail,'移动速度降低20%');assert.equal(slow.until,4);
 assert.deepEqual(ids(s,enemy),['moveSlow']);
 s.debuff(h,enemy,'attackDown',.5,10);s.debuff(friend,enemy,'attackDown',.5,10);
 assert.deepEqual(ids(s,h),['attackDown']);assert.ok(!ids(s,friend).includes('attackDown'));
 s.time=5;assert.deepEqual(ids(s,enemy),[]);
 assert.ok(shown(s,enemy,s.players[friend.playerId]).some(x=>x.detail==='移动速度降低80%'));
 assert.equal(p.heroId,h.id);
});

test('仅拥有敌方增益驱散能力的职业可见敌方增益，四类底框随阵营变化',()=>{
 const {s,p,h,enemy,friend}=arena(0);s.shield(enemy,100,enemy,10);
 assert.deepEqual(ids(s,enemy),[]);assert.equal(canDispelEnemyBuffs(s,p),false);
 p.classId=5;assert.equal(canDispelEnemyBuffs(s,p),false);assert.deepEqual(ids(s,enemy),[]);
 p.classId=3;assert.equal(canDispelEnemyBuffs(s,p),true);assert.deepEqual(ids(s,enemy),['shield']);
 for(const side of [0,1])for(const tone of ['positive','negative','mark']){
  const u={side};assert.equal(statusFrame(u,{tone},{side:0}),((side===0)===(tone==='positive'))?'blue':'red');
 }
 assert.equal(statusFrame(h,{tone:'negative'},p),'red');assert.equal(statusFrame(enemy,{tone:'positive'},p),'red');
 assert.equal(statusFrame(friend,{tone:'positive'},p),'blue');assert.equal(statusFrame(enemy,{tone:'negative'},p),'blue');
 s.config.design.enabled=false;s.config.innate.enabled=0;assert.equal(canDispelEnemyBuffs(s,p),false);
 s.config.innate.enabled=1;assert.equal(canDispelEnemyBuffs(s,p),true);
});

test('实际战吼、链接和净化赐福保留施加者，经过客户端快照后仍按玩家筛选',()=>{
 const {s,p,h,friend,enemy,make}=arena(0);cast(s,p,1);
 assert.ok(ids(s,friend).includes('guard'));assert.ok(ids(s,friend).includes('haste'));
 const {p:elf,h:elfHero}=make(5);affix(s,elf,39);cast(s,elf,1,friend);
 assert.ok(ids(s,friend,elf).includes('link'));assert.ok(!ids(s,friend,p).includes('link'));
 // 客户端快照会裁剪施法账本；来源必须在实际状态上保留。
 const copy=clientSnapshot(friend,s.time);
 assert.equal(copy.hastes.orcWarcry.ownerId,h.id);assert.equal(copy.hastes.elfLink.ownerId,elfHero.id);
 assert.ok(ids(s,copy,p).includes('haste'));assert.ok(ids(s,copy,elf).includes('haste'));
 s.debuff(friend,enemy,'attackDown',.3,10);affix(s,elf,44);cast(s,elf,2,friend);
 assert.equal(friend.healingBoostOwner,elfHero.id);assert.ok(ids(s,friend,elf).includes('healingBoost'));
 assert.ok(!ids(s,friend,p).includes('healingBoost'));
});

test('控制、持续伤害、标记按来源筛选，净化与到期后撤销且读取不修改战斗',()=>{
 const {s,p,h,enemy,friend}=arena(4);
 s.stun(enemy,h,2);s.stun(enemy,friend,8);s.conduct(enemy,h,4);s.addScar(enemy,h,4);s.addScar(enemy,friend,9);
 enemy.soulMarks=[{ownerId:h.id,until:4,current:true},{ownerId:friend.id,until:9,current:true}];
 s.fields.push({kind:'currentCorrosion',owner:friend,host:enemy.id,until:10},{kind:'currentDrain',owner:h,host:enemy.id,until:4});
 const before=JSON.stringify(enemy),statuses=shown(s,enemy);
 assert.equal(statuses.find(x=>x.id==='stun').until,2);assert.equal(statuses.find(x=>x.id==='scar').stacks,1);
 assert.equal(statuses.find(x=>x.id==='soulMark').until,4);assert.equal(statuses.find(x=>x.id==='dot').until,4);
 assert.equal(JSON.stringify(enemy),before);
 s.time=5;assert.deepEqual(ids(s,enemy),[]);s.cleanse(enemy);assert.deepEqual(ids(s,enemy),[]);
 s.stun(enemy,friend,10);assert.ok(!ids(s,enemy).includes('stun'));
 s.stun(h,enemy,3);assert.ok(ids(s,h).includes('stun'));h.hp=0;assert.deepEqual(ids(s,h),[]);
});

test('叠加链接先筛选施加者，再统计自己的链接数量和独立剩余时间',()=>{
 const {s,p,h,friend,make}=arena(5),other=make(5).h;
 s.fields.push(...[4,8].map(until=>({kind:'link',owner:h,host:friend.id,until,shareRatio:.42})),
  {kind:'link',owner:other,host:friend.id,until:20,shareRatio:.8});
 const own=shown(s,friend).find(x=>x.id==='link');assert.equal(own.stacks,2);assert.equal(own.until,8);
 assert.equal((own.detail.match(/剩余/g)||[]).length,2);assert.ok(!own.detail.includes('80%'));
 const foreign=shown(s,friend,s.players[other.playerId]).find(x=>x.id==='link');assert.equal(foreign.until,20);assert.equal(foreign.stacks,0);
 assert.equal(unitStatuses(s,friend).find(x=>x.id==='link').stacks,3);
});

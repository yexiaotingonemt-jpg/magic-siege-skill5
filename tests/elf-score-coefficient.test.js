import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {arena,near} from './current-design-fixture.mjs';
import {planScoreMigration} from '../shared/score-migration.js';
import {createGameRuntime,prepareGameRuntime} from '../server/game-runtime.mjs';
import {clone} from '../shared/config.js';
import {clientSnapshot} from '../server/client-snapshot.mjs';

test('精灵每100点有效治疗记15分，满血和溢出部分不计；其他系数保持',()=>{
 const {s,p,h,friend}=arena(5);assert.deepEqual(s.config.design.scoreCoefficients[5],{a:.085337,b:.001707,c:.15});
 const before=p.totalPoints;s.heal(friend,100,h);near(p.totalPoints-before,15+50*.085337);
 friend.hp=friend.maxHp;const score=p.totalPoints;s.heal(friend,100,h);near(p.totalPoints,score);
 friend.hp-=10;s.heal(friend,100,h);near(p.totalPoints-score,1.5+5*.085337);
});

test('计分迁移准备无副作用；切换后旧分固定、新事件按新系数',()=>{
 const {s,p,h}=arena(5);s.config.design.scoreCoefficients[5].c=.060041;s.stat(h,'healing',100);
 const next=clone(s.config);next.design.scoreCoefficients[5].c=.15;
 const before=p.totalPoints,parts=s.ratingParts(h),plan=planScoreMigration(s,next);
 assert.equal(plan.length,1);assert.equal(Object.hasOwn(h,'currentScoreBase'),false);
 for(const change of plan)change.actor.currentScoreBase=change.after;s.config=next;
 near(s.ratingParts(h).reduce((n,p)=>n+p.points,0),before);near(p.totalPoints,before);
 s.stat(h,'healing',100);near(p.totalPoints-before,15);near(s.ratingParts(h).reduce((n,p)=>n+p.points,0),p.totalPoints);
 near(parts.find(p=>p.key==='healing').points,6.0041);
 assert.equal(clientSnapshot(h,s.time).currentScoreBase,undefined);
});

test('连续改系数时重新分段，已获得的两段积分不回算',()=>{
 const {s,p,h}=arena(5);s.config.design.scoreCoefficients[5].c=.060041;s.stat(h,'healing',100);
 for(const coefficient of [.15,.2]){
  const next=clone(s.config);next.design.scoreCoefficients[5].c=coefficient;const before=p.totalPoints;
  for(const c of planScoreMigration(s,next))c.actor.currentScoreBase=c.after;s.config=next;
  near(s.ratingParts(h).reduce((n,p)=>n+p.points,0),before);s.stat(h,'healing',100);
 }
 near(p.totalPoints,300+6.0041+15+20);near(s.ratingParts(h).reduce((n,p)=>n+p.points,0),p.totalPoints);
});

test('阵亡英雄脱离单位表后，遗留弹道和持续效果仍保留其旧计分基线且只迁移一次',()=>{
 const {s,p,h}=arena(5);s.config.design.scoreCoefficients[5].c=.060041;s.stat(h,'healing',100);s.settle(h,'阵亡');h.hp=0;
 s.units=s.units.filter(u=>u!==h);s.projectiles.push({source:h});s.fields.push({kind:'link',owner:h});
 const next=clone(s.config);next.design.scoreCoefficients[5].c=.15;const before=p.totalPoints,plan=planScoreMigration(s,next);
 assert.equal(plan.length,1);for(const c of plan)c.actor.currentScoreBase=c.after;s.config=next;s.stat(h,'healing',100);
 near(p.totalPoints-before,15);near(h.settledReport.points,p.totalPoints);near(h.settledReport.parts.find(p=>p.key==='healing').points,21.0041);
});

test('运行时保留热更不改累计积分，回滚恢复原基线和原配置',()=>{
 const options={dataDir:mkdtempSync(path.join(tmpdir(),'elf-score-hot-'))},prior=createGameRuntime(options),s=prior.room.sim;
 const old=clone(prior.defaults);old.design.scoreCoefficients[5].c=.060041;prior.defaults=old;s.config=clone(old);prior.room.config=clone(old);
 const p=s.makePlayer(0,false);p.classId=5;p.stamina=100;const unit=s.spawn(0,'ranged',0,1);assert.ok(s.contract(p,unit.id));s.stat(unit,'healing',100);
 const score=p.totalPoints,config=s.config,match=prior.room.matchId,candidate=prepareGameRuntime(options,prior);
 assert.equal(unit.currentScoreBase,undefined);candidate.commit();near(p.totalPoints,score);near(s.ratingParts(unit).reduce((n,p)=>n+p.points,0),score);assert.equal(prior.room.matchId,match);
 assert.ok(unit.currentScoreBase);candidate.rollback();assert.equal(s.config,config);assert.equal(unit.currentScoreBase,undefined);near(p.totalPoints,score);
});

test('系数未变化的其他职业不迁移',()=>{
 const {s,h}=arena(4),next=clone(s.config);next.design.scoreCoefficients[5].c=.2;
 assert.equal(planScoreMigration(s,next).some(c=>c.actor===h),false);
});

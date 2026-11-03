import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createGameRuntime,prepareGameRuntime} from '../server/game-runtime.mjs';
import {clone} from '../shared/config.js';

function priorRuntime() {
  const options={dataDir:mkdtempSync(path.join(tmpdir(),'experience-migration-'))};
  const previous=createGameRuntime(options),p=previous.room.player({id:'preserve-xp',name:'经验迁移',side:0});
  const old=clone(previous.defaults);
  old.world.expPerStamina=1;delete old.world.levelUpStamina;delete old.world.initialLevel;
  old.design.rules.expPerLevel=3;delete old.design.rules.expPerStamina;delete old.design.rules.levelUpStamina;
  previous.defaults=old;previous.room.config=clone(old);previous.room.sim.config=clone(old);
  p.level=8;p.xp=2;p.progress[4].level=3;p.progress[4].xp=1;
  p.progress[5].level=40;p.progress[5].xp=0;
  p.progress[0].traits={N000_0:1};p.progress[0].choices=[{level:8,rarity:'blue',options:['N001_0']}];
  return {options,previous,p};
}

test('0.7.5经验热更保留战局、等级、词条、待选和体力，仅换算余量；回滚恢复原值',()=>{
  const {options,previous,p}=priorRuntime(),room=previous.room,matchId=room.matchId,progress=p.progress;
  const choices=p.progress[0].choices,traits=p.progress[0].traits,stamina=p.stamina;
  const candidate=prepareGameRuntime(options,previous);
  assert.equal(p.xp,2);assert.equal(p.progress[4].xp,1);
  candidate.commit();
  assert.equal(candidate.runtime.room,room);assert.equal(room.matchId,matchId);assert.equal(p.progress,progress);
  assert.equal(p.level,8);assert.equal(p.xp,200);assert.equal(p.progress[4].xp,100);assert.equal(p.progress[5].xp,0);
  assert.equal(p.progress[0].choices,choices);assert.equal(p.progress[0].traits,traits);assert.equal(p.stamina,stamina);
  assert.equal(room.sim.config.world.expPerStamina,100);assert.equal(room.sim.expNeeded(p),600);
  const next=prepareGameRuntime(options,candidate.runtime);next.commit();
  assert.equal(p.xp,200);assert.equal(p.progress[4].xp,100);
  candidate.rollback();
  assert.equal(p.xp,2);assert.equal(p.progress[4].xp,1);assert.equal(room.sim.config.world.expPerStamina,1);
});

test('无效旧经验拒绝保留更新，不改变原战局',()=>{
  const {options,previous,p}=priorRuntime(),config=previous.room.sim.config,matchId=previous.room.matchId;
  p.xp=NaN;
  assert.throws(()=>prepareGameRuntime(options,previous),/旧经验余量无效/);
  assert.equal(previous.room.sim.config,config);assert.equal(previous.room.matchId,matchId);
});

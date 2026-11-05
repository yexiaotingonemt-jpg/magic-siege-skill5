import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createGameRuntime,prepareGameRuntime} from '../server/game-runtime.mjs';
import {clone} from '../shared/config.js';
import {AFFIX_QUALITY_OVERRIDES,UPGRADE_POOLS} from '../shared/upgrade-quality.js';

test('三品质旧战局保留热更：待选即时迁入对应池，原对象与属性保留且可精确回滚',()=>{
 const options={dataDir:mkdtempSync(path.join(tmpdir(),'upgrade-hot-'))};
 const prior=createGameRuntime(options),room=prior.room,s=room.sim,p=room.player({id:'quality-preserve',name:'保留升级',side:0});
 const old=clone(prior.defaults);delete old.design.qualityWeights.white;delete old.design.qualityWeights.green;
 for(const t of old.design.affixes)if(AFFIX_QUALITY_OVERRIDES[t.sourceId])t.rarity='blue';
 prior.defaults=old;room.config=clone(old);s.config=clone(old);
 p.level=10;p.xp=150;p.stamina=45;p.totalPoints=12345;
 const progress=p.progress[0];progress.traits.N000_0=1;
 const gold=old.design.affixes.find(t=>t.classId===0&&t.rarity==='gold');
 progress.choices=[{level:9,available:false,rarity:'gold',options:[gold.id]},{level:10,available:true,rarity:'blue'}];
 p.progress[4].choices=[{level:5,available:true,rarity:'blue',options:['N016_4']}];
 const queue=progress.choices,head=queue[0],originalOptions=head.options,traits=progress.traits,seed=s.seed,match=room.matchId,before=structuredClone(p.progress);
 const candidate=prepareGameRuntime(options,prior);
 assert.deepEqual(p.progress,before);assert.equal(s.seed,seed);
 candidate.commit();
 assert.equal(candidate.runtime.room,room);assert.equal(room.matchId,match);assert.equal(progress.choices,queue);assert.equal(queue[0],head);assert.equal(progress.traits,traits);
 assert.equal(p.xp,150);assert.equal(p.stamina,45);assert.equal(p.totalPoints,12345);assert.equal(head.available,false);
 for(const id of [0,4]){
  const c=p.progress[id].choices[0];assert.equal(c.upgradeType,id===0?'normal':'advanced');
  assert.ok(c.options.length);assert.ok(c.options.every(key=>UPGRADE_POOLS[c.upgradeType].includes(s.config.design.affixes.find(t=>t.id===key).rarity)));
 }
 assert.equal(queue[1].level,10);assert.equal(queue.length,2);
 candidate.rollback();assert.deepEqual(p.progress,before);assert.equal(head.options,originalOptions);assert.equal(s.seed,seed);assert.equal(s.config.design.qualityWeights.white,undefined);
});

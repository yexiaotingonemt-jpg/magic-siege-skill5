import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../shared/simulation.js';
import {liveConfig,validateConfig} from '../shared/config.js';
import {prepareChoice} from '../shared/traits.js';
import {currentTraits,drawCurrentQuality} from '../shared/current-design.js';
import {RARITIES,UPGRADE_POOLS,upgradeTypeAt} from '../shared/upgrade-quality.js';

test('1至40级普通32次、高级8次，每个5级节点为高级',()=>{
  const types=Array.from({length:40},(_,i)=>upgradeTypeAt(i+1));
  assert.equal(types.filter(t=>t==='advanced').length,8);
  for(const level of [0,1,4,6,39])assert.equal(upgradeTypeAt(level),'normal');
  for(const level of [5,10,15,20,25,30,35,40])assert.equal(upgradeTypeAt(level),'advanced');
});

test('五职业所有品质都可抽到，普通排除金，高级排除白绿蓝',()=>{
  const s=new Simulation(liveConfig()),p=s.player;
  for(const id of [0,4,5,2,3])for(const type of ['normal','advanced']){
    const progress=p.progress[id];
    for(const [i,q] of UPGRADE_POOLS[type].entries()){
      s.random=()=> (i+.1)/UPGRADE_POOLS[type].length;
      assert.equal(drawCurrentQuality(s,progress,id,type),q);
    }
    for(let seed=1;seed<=60;seed++){
      const sim=new Simulation(liveConfig(),seed),player=sim.player;player.classId=id;
      player.progress[id].choices=[{level:type==='advanced'?5:4}];
      const choice=prepareChoice(sim,player);
      assert.equal(choice.upgradeType,type);assert.equal(choice.options.length,3);
      assert.equal(new Set(choice.options).size,3);
      const catalogue=currentTraits(sim.config,id);
      assert.ok(choice.options.every(id=>UPGRADE_POOLS[type].includes(catalogue.find(t=>t.id===id).rarity)));
      const before=structuredClone(choice),seedBefore=sim.seed;
      prepareChoice(sim,player);assert.deepEqual(choice,before);assert.equal(sim.seed,seedBefore);
    }
  }
});

test('每卡独立抽品质，可混色；权重按品质而非条目数量',()=>{
  const s=new Simulation(liveConfig()),p=s.player,progress=p.progress[0];
  const rolls=[.01,.1,.3,.1,.55,.1];s.random=()=>rolls.shift();
  progress.choices=[{level:1}];const c=prepareChoice(s,p);
  assert.deepEqual(c.options.map(id=>currentTraits(s.config,0).find(t=>t.id===id).rarity),['white','green','blue']);
  s.config.design.qualityWeights={white:7,green:1,blue:1,purple:1,gold:1};
  s.random=()=>.69;assert.equal(drawCurrentQuality(s,progress,0),'white');
  s.random=()=>.71;assert.equal(drawCurrentQuality(s,progress,0),'green');
});

test('满档移出候选，不足3项不重复补卡，不跨池降级',()=>{
  for(const type of ['normal','advanced']){
    const s=new Simulation(liveConfig()),p=s.player,progress=p.progress[0],all=currentTraits(s.config,0);
    all.forEach(t=>progress.traits[t.id]=t.max);
    const remaining=all.find(t=>t.rarity===(type==='normal'?'green':'gold'));progress.traits[remaining.id]--;
    progress.choices=[{level:type==='normal'?1:5}];
    assert.deepEqual(prepareChoice(s,p).options,[remaining.id]);
    assert.ok(s.chooseTrait(remaining.id,progress.choices[0].level,p));
    progress.choices=[{level:type==='normal'?2:10}];
    assert.deepEqual(prepareChoice(s,p).options,[]);
  }
});

test('旧队列按原升级等级迁入新池，保留可用状态与已选词条',()=>{
  const s=new Simulation(liveConfig()),p=s.player,progress=p.progress[0],all=currentTraits(s.config,0);
  const gold=all.find(t=>t.rarity==='gold');progress.traits[gold.id]=1;
  progress.choices=[{level:9,available:false,rarity:'gold',options:[gold.id]}];
  const c=prepareChoice(s,p);
  assert.equal(c.available,false);assert.equal(c.level,9);assert.equal(c.upgradeType,'normal');
  assert.equal(progress.traits[gold.id],1);assert.ok(!c.options.includes(gold.id));assert.equal(c.rarity,undefined);
  const before=structuredClone(progress);assert.equal(s.chooseTrait(gold.id,9,p),false);assert.deepEqual(progress,before);
});

test('五职业多种选法均可花完40次预算，品质与次数不受积攒等级影响',()=>{
  for(const id of [0,4,5,2,3])for(const seed of [1,2,3,4,42,123,456]){
    const s=new Simulation(liveConfig(),seed),p=s.player;p.classId=id;p.side=id===3?1:0;
    const all=currentTraits(s.config,id),progress=p.progress[id];s.addXp(p,30000);
    assert.equal(progress.choices.length,40);
    while(progress.choices.length){
      const c=prepareChoice(s,p);assert.ok(c.options.length,`${id}/${seed}/${c.level}`);
      assert.equal(c.upgradeType,upgradeTypeAt(c.level));
      const selected=c.options.find(id=>all.find(t=>t.id===id).rarity==='purple')??c.options[0];
      assert.ok(s.chooseTrait(selected,c.level,p));
    }
    assert.equal(Object.values(progress.traits).reduce((a,b)=>a+b,0),40);
  }
});

test('五品质权重、普通及高级库存必须合法',()=>{
  for(const q of Object.keys(RARITIES))for(const value of [0,-1,NaN]){
    const c=liveConfig();c.design.qualityWeights[q]=value;assert.throws(()=>validateConfig(c));
  }
  const c=liveConfig();c.design.affixes=c.design.affixes.filter(t=>t.rarity!=='gold'&&t.rarity!=='purple');
  assert.throws(()=>validateConfig(c));
});

test('39级保留最后紫色供40级高级升级，最后一级仍可选择紫色',()=>{
  const s=new Simulation(liveConfig()),p=s.player,progress=p.progress[0],all=currentTraits(s.config,0);
  all.forEach(t=>progress.traits[t.id]=t.max);
  const purple=all.find(t=>t.rarity==='purple'),green=all.find(t=>t.rarity==='green');
  progress.traits[purple.id]--;progress.traits[green.id]--;
  progress.level=40;progress.choices=[{level:39},{level:40}];
  assert.deepEqual(prepareChoice(s,p).options,[green.id]);
  assert.ok(s.chooseTrait(green.id,39,p));
  assert.deepEqual(prepareChoice(s,p).options,[purple.id]);
  assert.ok(s.chooseTrait(purple.id,40,p));assert.equal(progress.choices.length,0);
});

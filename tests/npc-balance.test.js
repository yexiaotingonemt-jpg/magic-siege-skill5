import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {Simulation} from '../shared/simulation.js';
import {Room} from '../server/room.mjs';
import {Accounts} from '../server/accounts.mjs';
import {clone,defaults,contractType} from '../shared/config.js';
import {DEFAULT_NPC_POLICY,validateNpcPolicy,npcBalanceStatus,balanceNpcHeroes,MAX_NPC_HEROES} from '../shared/npc-balance.js';

function arena(policy=DEFAULT_NPC_POLICY){
 const s=new Simulation();s.units=[];s.player.retired=true;s.waveAt=30;s.npcPolicy={...policy};
 for(const t of s.towers){t.x=100;t.cd=1e9;}
 const troop=(side,type='melee',y=0)=>{const u=s.spawn(side,type,0,1,0);Object.assign(u,{x:0,y,speed:0,cd:1e9,deploying:false});return u;};
 const human=(side=0)=>{const p=s.makePlayer(side,false);p.classId=side?3:0;const u=troop(side);assert.ok(s.contract(p,u.id));return {p,h:u};};
 const stock=()=>{for(const side of [0,1])for(let i=0;i<30;i++)troop(side,['melee','ranged','siege'][i%3],side?30:-30);};
 return {s,troop,human,stock};
}

test('默认至少补成防守1:进攻3，契约费用与积分沿用玩家规则',()=>{
 const r=new Room(),state=r.snapshot().npcBalance;
 assert.deepEqual(state.heroes,{defense:1,attack:3});assert.deepEqual(state.npcs,state.heroes);
 for(const p of r.sim.players.filter(p=>p.bot)){assert.equal(p.stamina,97);assert.equal(p.staminaSpent,3);assert.equal(p.totalPoints,300);assert.ok(r.sim.hero(p));}
});
test('比例计算包含真人与NPC，进攻不足时按现有防守补足',()=>{
 const {s,human,stock}=arena();human(1);human(1);human(0);stock();balanceNpcHeroes(s);
 assert.deepEqual(npcBalanceStatus(s).heroes,{defense:2,attack:6});assert.deepEqual(npcBalanceStatus(s).npcs,{defense:0,attack:5});
 const ids=s.units.filter(u=>u.hero).map(u=>u.id);balanceNpcHeroes(s);assert.deepEqual(s.units.filter(u=>u.hero).map(u=>u.id),ids);
});
test('自定义2:5按比例向下取整防守；设置比例时不删除任何存活英雄',()=>{
 const {s,human,stock}=arena({mode:'ratio',defense:2,attack:5});for(let i=0;i<3;i++)human(1);for(let i=0;i<7;i++)human(0);stock();balanceNpcHeroes(s);
 assert.deepEqual(npcBalanceStatus(s).heroes,{defense:3,attack:8});
 const old=s.units.filter(u=>u.hero);s.npcPolicy={mode:'ratio',defense:1,attack:1};balanceNpcHeroes(s);
 assert.deepEqual(npcBalanceStatus(s).heroes,{defense:8,attack:8});assert.ok(old.every(u=>u.hp>0));
});

for(const [attack,defense] of [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,2],[7,2],[8,2],[9,3]]){
 test(`进攻${attack}名时防守向下取整为${defense}名，重复出兵不连锁扩编`,()=>{
  const {s,human,stock}=arena();for(let i=0;i<attack;i++)human(0);stock();
  const expected={defense,attack:Math.max(3,attack)};
  balanceNpcHeroes(s);assert.deepEqual(npcBalanceStatus(s).heroes,expected);
  assert.deepEqual(s.npcLastCheck.missing,{defense:0,attack:0});
  const ids=s.units.filter(u=>u.hero).map(u=>u.id);
  for(let i=0;i<3;i++)s.spawnWave();
  assert.deepEqual(npcBalanceStatus(s).heroes,expected);
  assert.deepEqual(s.units.filter(u=>u.hero).map(u=>u.id),ids);
 });
}

test('进攻4名维持一名防守，增加到6名才补第二名防守',()=>{
 const {s,human,stock}=arena();for(let i=0;i<4;i++)human(0);stock();
 balanceNpcHeroes(s);assert.deepEqual(npcBalanceStatus(s).heroes,{defense:1,attack:4});
 human(0);s.spawnWave();assert.deepEqual(npcBalanceStatus(s).heroes,{defense:1,attack:5});
 human(0);s.spawnWave();assert.deepEqual(npcBalanceStatus(s).heroes,{defense:2,attack:6});
 const defender=s.units.find(u=>u.hero&&u.side===1);defender.hp=0;
 s.spawnWave();assert.deepEqual(npcBalanceStatus(s).heroes,{defense:2,attack:6});
});

test('进攻4名但已有2名防守时保留防守并补齐6名进攻',()=>{
 const {s,human,stock}=arena();for(let i=0;i<4;i++)human(0);human(1);human(1);stock();
 balanceNpcHeroes(s);assert.deepEqual(npcBalanceStatus(s).heroes,{defense:2,attack:6});
});
test('只在出兵时补充，NPC阵亡不会在波次之间自动契约',()=>{
 const r=new Room(),s=r.sim;for(const t of s.towers)t.x=100;
 const dead=s.units.find(u=>u.hero&&u.side===0);dead.hp=0;const before=npcBalanceStatus(s).heroes;
 for(let i=0;i<20;i++)s.tick(.05);assert.deepEqual(npcBalanceStatus(s).heroes,before);
 s.waveAt=s.time;s.tick(.05);assert.deepEqual(npcBalanceStatus(s).heroes,{defense:1,attack:3});
});
test('无NPC只停止补充：保留当前英雄、体力、积分，阵亡后不补',()=>{
 const r=new Room(),a={id:'admin',name:'任意超级账号',side:0,isSuperAdmin:true};
 const prior=r.sim.players.filter(p=>p.bot).map(p=>({p,h:r.sim.hero(p),stamina:p.stamina,points:p.totalPoints}));
 assert.ok(r.command(a,{type:'npcPolicy',args:{mode:'off',defense:1,attack:3},id:'off'}).ok);
 for(const row of prior){assert.equal(r.sim.hero(row.p),row.h);assert.equal(row.p.retired,false);assert.equal(row.p.stamina,row.stamina);assert.equal(row.p.totalPoints,row.points);}
 prior[0].h.hp=0;r.sim.spawnWave();assert.equal(r.sim.hero(prior[0].p),undefined);assert.equal(r.sim.units.filter(u=>u.hero&&u.hp>0).length,3);
});
test('模式与比例更改要到下一次出兵检查，重新开启后按存活总数补',()=>{
 const r=new Room(),a={id:'admin',name:'管理员',side:0,isSuperAdmin:true};
 assert.ok(r.command(a,{type:'npcPolicy',args:{mode:'ratio',defense:2,attack:3}}).ok);
 assert.deepEqual(r.snapshot().npcBalance.heroes,{defense:1,attack:3});r.sim.spawnWave();assert.deepEqual(r.snapshot().npcBalance.heroes,{defense:2,attack:3});
 r.command(a,{type:'npcPolicy',args:{mode:'off',defense:2,attack:3}});r.sim.units.filter(u=>u.hero).forEach(u=>u.hp=0);r.sim.spawnWave();assert.deepEqual(r.snapshot().npcBalance.heroes,{defense:0,attack:0});
 r.command(a,{type:'npcPolicy',args:{mode:'ratio',defense:1,attack:3}});r.sim.spawnWave();assert.deepEqual(r.snapshot().npcBalance.heroes,{defense:1,attack:3});
});
test('优先前线正在交战的满血兵，跳过受伤前排，保护所有真人预选',()=>{
 const {s,human,troop}=arena({mode:'ratio',defense:1,attack:1});const enemy=human(1).h;enemy.y=6;
 const injured=troop(0,'melee',5.5);injured.hp--;
 const reserved=troop(0,'melee',5.1);reserved.targetId=enemy.id;s.makePlayer(0,false).reservedUnitId=reserved.id;
 const engaged=troop(0,'melee',5);engaged.targetId=enemy.id;
 const frontIdle=troop(0,'ranged',8),back=troop(0,'ranged',-30);balanceNpcHeroes(s);
 assert.equal(engaged.hero,true);for(const u of [injured,reserved,frontIdle,back])assert.ok(!u.hero);
});
test('前线没有满血合法兵才用后方赶路兵，不契约精英、护卫或受伤兵',()=>{
 const {s,human,troop}=arena({mode:'ratio',defense:1,attack:1});human(1);
 const wounded=troop(0,'melee',5);wounded.hp--;
 const elite=troop(0,'melee',6);elite.elite=true;const guard=troop(0,'melee',7);guard.summoned=true;
 const back=troop(0,'ranged',-30);balanceNpcHeroes(s);assert.ok(back.hero);assert.ok([4,5].includes(back.classId));
 for(const u of [wounded,elite,guard])assert.ok(!u.hero);
});
test('兵种资源不足时等待后续波次，不把受伤兵强制变为满血英雄',()=>{
 const {s,troop}=arena();const u=troop(0);u.hp--;balanceNpcHeroes(s);
 assert.deepEqual(npcBalanceStatus(s).heroes,{defense:0,attack:0});assert.deepEqual(s.npcLastCheck.missing,{defense:1,attack:3});
 s.spawnWave();assert.deepEqual(npcBalanceStatus(s).heroes,{defense:1,attack:3});assert.ok(!u.hero);
});
test('可契约职业从当前优先级可用职业中随机，进攻四职业均可出现',()=>{
 const seen=new Set();for(let seed=1;seed<=80;seed++){
  const {s,human,troop}=arena({mode:'ratio',defense:1,attack:1});s.seed=seed*7919;human(1);for(const type of ['melee','ranged','siege'])troop(0,type,-20);
  balanceNpcHeroes(s);seen.add(s.units.find(u=>u.hero&&u.side===0).classId);
 }assert.deepEqual([...seen].sort(),[0,2,4,5]);
});
test('反复阵亡与出兵复用NPC账号，不随波次无限增长',()=>{
 const {s}=arena();for(let i=0;i<200;i++){s.units=[];s.spawnWave();assert.deepEqual(npcBalanceStatus(s).heroes,{defense:1,attack:3});}
 assert.equal(s.players.filter(p=>p.bot).length,4);assert.equal(s.players.length,5);
});
test('NPC上限约束只影响补充，不删除真人或现有NPC',()=>{
 const {s,human,stock}=arena({mode:'ratio',defense:1,attack:99});for(let i=0;i<2;i++)human(1);stock();
 for(let i=0;i<200;i++)s.spawn(0,'melee',0,1,0);balanceNpcHeroes(s);
 const status=npcBalanceStatus(s);assert.ok(status.npcs.attack+status.npcs.defense<=MAX_NPC_HEROES);assert.equal(status.heroes.defense,2);assert.ok(status.lastCheck.missing.attack>0);
});
test('配置随战区重建和超级账号重开保留；计数从新战场重新计算',()=>{
 const r=new Room();r.sim.npcPolicy={mode:'off',defense:2,attack:5};r.sim.resetMap();assert.equal(r.snapshot().npcBalance.mode,'off');assert.equal(r.sim.units.filter(u=>u.hero).length,0);
 r.restartMatch();assert.deepEqual(r.sim.npcPolicy,{mode:'off',defense:2,attack:5});assert.equal(r.snapshot().npcBalance.npcs.attack,0);
});
test('仅超级名单授权，不接受房主、名字、前端参数伪造；未来新增也生效',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'npc-permissions-')),accounts=new Accounts(dir),room=new Room();
 const host=await accounts.register({name:'房主账号',password:'isolated-only',side:0});const added=await accounts.register({name:'未来超级账号',password:'isolated-only',side:1});
 const token=accounts.issue(added),req={headers:{cookie:'kc_session='+token}},cmd={type:'npcPolicy',args:{mode:'off',defense:1,attack:3,isSuperAdmin:true}};
 assert.equal(room.command({...host,isSuperAdmin:false},cmd).ok,false);assert.equal(room.command(accounts.get(req),cmd).ok,false);
 writeFileSync(path.join(dir,'super-accounts.json'),JSON.stringify([added.id]));assert.equal(room.command(accounts.get(req),cmd).ok,true);
 writeFileSync(path.join(dir,'super-accounts.json'),'[]');assert.equal(room.command(accounts.get(req),{...cmd,args:{mode:'ratio',defense:1,attack:3}}).ok,false);
 assert.equal(room.sim.npcPolicy.mode,'off');
});
test('非法比例不落库、不改变状态，合法比例约分，固定机器人人数入口不能绕过',()=>{
 const r=new Room(),a={id:'admin',name:'管理员',side:0,isSuperAdmin:true},before=clone(r.sim.npcPolicy);
 for(const value of [0,-1,1.5,Infinity,NaN,100,'3',null]){assert.equal(r.command(a,{type:'npcPolicy',args:{mode:'ratio',defense:1,attack:value}}).ok,false);assert.deepEqual(r.sim.npcPolicy,before);}
 assert.equal(r.command(a,{type:'bots',args:{attackBots:50,defenseBots:1}}).ok,false);
 assert.deepEqual(validateNpcPolicy({mode:'ratio',defense:2,attack:6}),before);
 const cmd={id:'same',type:'npcPolicy',args:{mode:'ratio',defense:2,attack:6}};assert.ok(r.command(a,cmd).ok);assert.deepEqual(r.command(a,cmd),r.command(a,cmd));
});

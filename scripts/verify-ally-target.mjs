import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from '../server.mjs';
import {contractType} from '../src/config.js';

const dir='evidence/ally-target';fs.mkdirSync(dir,{recursive:true});
const result={at:new Date().toISOString(),checks:[],errors:[],samples:{}},actors=[];
const game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-ally-target-'))}),room=game.room,sim=room.sim;room.paused=true;
await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const advance=n=>{const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.05,end-sim.time));};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function sync(wait=260){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence)));if(wait)await pause(wait);}
async function focus(u){await Promise.all(actors.map(a=>a.page.evaluate(id=>__game.renderer.focusUnit(id),u.id)));await pause(330);}
async function check(name,fn){await fn();result.checks.push(name);console.log('PASS',name);}
const halos=page=>page.evaluate(()=>JSON.parse(JSON.stringify(__game.renderer.game.scene.scenes[0].targetHalos.report)));
async function click(a,u){let q=await a.page.evaluate(id=>{const u=__game.sim.get(id),p=__game.renderer.screenPoint(u),b=__game.renderer.game.canvas.getBoundingClientRect();return {x:b.left+p.x*b.width/500,y:b.top+(p.y-(u.tower?44:u.hero?39:27))*b.height/500,visible:p.y>55&&p.y<490};},u.id);if(!q.visible){await a.page.evaluate(id=>__game.renderer.focusUnit(id),u.id);await pause(330);q=await a.page.evaluate(id=>{const u=__game.sim.get(id),p=__game.renderer.screenPoint(u),b=__game.renderer.game.canvas.getBoundingClientRect();return {x:b.left+p.x*b.width/500,y:b.top+(p.y-(u.tower?44:u.hero?39:27))*b.height/500};},u.id);}await a.page.mouse.click(q.x,q.y);await pause(150);}
async function lock(a,u){await click(a,u);assert.equal(a.h.manualTargetId,u.id,`manual target ${u.id}`);if(u.side!==a.h.side)assert.equal(a.h.targetId,u.id);await Promise.all(actors.map(v=>v.page.waitForFunction(({h,t})=>__game.sim.get(h)?.manualTargetId===t,{h:a.h.id,t:u.id})));}
async function cast(a,i){const plan=sim.castPlan(i,a.p);assert.ok(plan.ok,plan.reason);await a.page.locator(`[data-cast="${i}"]`).click();await a.page.waitForFunction(i=>__game.sim.player.cd[i]>__game.sim.time,i);}
function troop(x,y,side=0,hp=1e6){const u=sim.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp,maxHp:1e6,speed:0,cd:1e9});return u;}
async function reset(attackId=5){
 await pause(950);sim.time+=3;sim.units=[];sim.fields=[];sim.animations=[];sim.jobs=[];sim.projectiles=[];sim.effects=[];sim.waveAt=sim.populationAt=1e9;
 for(const t of sim.towers)Object.assign(t,{x:100,cd:1e9});
 for(const [index,a]of actors.entries()){const id=index===0?attackId:a.id;a.p.heroId=null;a.p.classId=id;a.p.progress[id]={level:6,xp:0,points:2};a.p.builds[id]=[1,1,1,1];a.p.cd=[0,0,0,0];a.p.stamina=100;a.p.auto=false;const h=sim.spawn(a.p.side,contractType(id),0,1,0);assert.ok(sim.contract(a.p,h.id));Object.assign(h,{x:index===1?4:0,y:index===2?3:0,hp:1e6,maxHp:1e6,speed:0,cd:1e9});a.h=h;}
 await sync();await focus(actors[0].h);
}
try{
 const specs=[{id:5,side:0,name:'精灵友方选中验收'},{id:0,side:0,name:'友方守护伙伴'},{id:3,side:1,name:'敌方领主验收'}];
 for(const spec of specs){const context=await browser.newContext({viewport:{width:640,height:1136},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base);await page.locator('#accountName').fill(spec.name);await page.locator('#accountPassword').fill('isolated-ally-target');await page.locator(`[name="side"][value="${spec.side}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>!!window.__game?.renderer.game.scene.scenes[0]?.heroNames);actors.push({...spec,page,context,p:room.player(game.accounts.rows.at(-1))});}
 const [elf,ally,enemy]=actors;
 await check('友方20格等距边界可点击并同步，20格外拒绝；友方绿圈与敌方普攻红圈并存',async()=>{
  await reset();Object.assign(elf.h,{x:-10,y:0,speed:2});Object.assign(enemy.h,{x:-8,y:0});ally.h.y=-6;const chosen=troop(10,0),outside=troop(0,21);await sync();await lock(elf,enemy.h);await lock(elf,chosen);assert.equal(elf.h.targetId,enemy.h.id);assert.equal(await elf.page.locator('#contractPopover').isVisible(),false);const rows=await halos(elf.page);assert.ok(rows.some(r=>r.kind==='manual'&&r.team==='ally'&&r.unitId===chosen.id));assert.ok(rows.some(r=>r.kind==='basic'&&r.team==='enemy'&&r.unitId===enemy.h.id));await click(elf,outside);assert.equal(elf.h.manualTargetId,chosen.id);assert.match(await elf.page.locator('#notice').textContent(),/20格/);const from={x:elf.h.x,y:elf.h.y},hp=chosen.hp;advance(.5);await sync();near(elf.h.x,from.x);near(elf.h.y,from.y);near(chosen.hp,hp);result.samples.range=rows;await focus(elf.h);await elf.page.screenshot({path:`${dir}/ally-20-boundary.png`});
 });
 await check('手选友方英雄强制精灵链接，排除更低血量的默认目标，双方名字归属正常',async()=>{
  await reset();elf.h.targetId=enemy.h.id;ally.h.hp=900000;const weaker=troop(-2,0,0,100);await sync();await lock(elf,ally.h);assert.equal(elf.h.targetId,enemy.h.id);assert.equal(sim.castPlan(1,elf.p).t.id,ally.h.id);await cast(elf,1);advance(.4);await sync();assert.equal(elf.h.linkId,ally.h.id);assert.ok(sim.fields.some(f=>f.kind==='link'&&f.host===ally.h.id));assert.notEqual(elf.h.linkId,weaker.id);for(const viewer of actors){const rows=await viewer.page.evaluate(()=>__game.renderer.game.scene.scenes[0].heroNames.report);assert.equal(rows.find(r=>r.unitId===ally.h.id)?.name,ally.p.name);}await elf.page.screenshot({path:`${dir}/selected-link.png`});const tower=sim.towers[0];Object.assign(tower,{side:0,x:-5,y:0});elf.p.cd[1]=0;await sync();await lock(elf,tower);assert.notEqual(sim.castPlan(1,elf.p).t.id,tower.id);tower.side=1;tower.x=100;
 });
 await check('群疗与净化优先手选友军，人数上限和技能自身范围保持原值',async()=>{
  await reset();ally.h.x=10;ally.h.hp=500000;const crowd=Array.from({length:6},(_,i)=>troop(-3+i,1,0,10000));await sync();await lock(elf,ally.h);let plan=sim.castPlan(3,elf.p);assert.ok(plan.ok);assert.ok(plan.targets.some(u=>u.id===ally.h.id));assert.equal(plan.targets.length,1+plan.s.targets);const hp=ally.h.hp;await cast(elf,3);advance(.4);await sync();assert.ok(ally.h.hp>hp);assert.equal(crowd.filter(u=>u.hp>10000).length,plan.s.targets-1);
  await reset();ally.h.x=10;const statuses=[ally.h,...Array.from({length:5},(_,i)=>troop(-2+i*.5,1))];for(const u of statuses)sim.debuff(u,enemy.h,'moveSlow',.2,10,null,true);await sync();await lock(elf,ally.h);plan=sim.castPlan(2,elf.p);assert.ok(plan.targets.some(u=>u.id===ally.h.id));assert.equal(plan.targets.length,plan.s.targets);await cast(elf,2);advance(.4);await sync();assert.equal(sim.hasNegative(ally.h),false);assert.equal(statuses.filter(u=>!sim.hasNegative(u)).length,plan.s.targets);
  elf.p.cd=[0,0,0,0];ally.h.x=15;await sync();await lock(elf,ally.h);assert.ok(sim.castPlan(1,elf.p).t.id!==ally.h.id);await elf.page.screenshot({path:`${dir}/selected-cleanse.png`});
 });
 await check('兽人群守优先手选友军；自施法仍作用自己；敌方技能与普攻绝不攻击友方',async()=>{
  await reset(0);ally.h.x=5;const crowd=Array.from({length:5},(_,i)=>troop(-2+i*.6,0));elf.h.targetId=enemy.h.id;await sync();await lock(elf,ally.h);const plan=sim.castPlan(1,elf.p);assert.ok(plan.targets.some(u=>u.id===ally.h.id));assert.equal(plan.targets.length,1+plan.s.targets);await cast(elf,1);advance(.4);await sync();assert.ok(ally.h.guards?.length);assert.equal(crowd.filter(u=>u.guards?.length).length,plan.s.targets-1);assert.equal(sim.castPlan(3,elf.p).t.id,elf.h.id);assert.equal(sim.castPlan(0,elf.p).t.side,1);const hp=ally.h.hp;await cast(elf,0);advance(.4);await sync();near(ally.h.hp,hp);Object.assign(enemy.h,{x:0,y:1});elf.h.targetId=enemy.h.id;elf.h.cd=sim.time;elf.h.castUntil=0;const enemyHp=enemy.h.hp;advance(.05);await sync();assert.ok(enemy.h.hp<enemyHp);near(ally.h.hp,hp);assert.equal(elf.h.targetId,enemy.h.id);await elf.page.screenshot({path:`${dir}/ally-guard-enemy-attack.png`});
 });
 await check('救援仅指定被敌英雄攻击的友军，精灵冲击仍伤敌而治疗圈优先手选友军',async()=>{
  await reset(0);ally.h.x=4;ally.h.y=0;enemy.h.x=4;enemy.h.y=3;enemy.h.targetId=ally.h.id;await sync();await lock(elf,ally.h);assert.equal(sim.castPlan(2,elf.p).t.id,ally.h.id);const before={x:elf.h.x,y:elf.h.y},chosen={x:ally.h.x,y:ally.h.y};await cast(elf,2);advance(.4);await sync();near(elf.h.x,chosen.x);near(elf.h.y,chosen.y);near(ally.h.x,before.x);near(ally.h.y,before.y);elf.p.cd[2]=0;enemy.h.targetId=null;await sync();assert.equal(sim.castPlan(2,elf.p).ok,false);
  await reset();ally.h.x=4;ally.h.y=3;ally.h.hp=500000;enemy.h.x=0;enemy.h.y=3;elf.h.targetId=enemy.h.id;const crowd=Array.from({length:4},(_,i)=>troop(.2+i*.4,3,0,10000));await sync();await lock(elf,ally.h);const hp=ally.h.hp,enemyHp=enemy.h.hp;assert.equal(sim.castPlan(0,elf.p).t.id,enemy.h.id);await cast(elf,0);advance(.4);await sync();assert.ok(enemy.h.hp<enemyHp);assert.ok(ally.h.hp>hp);assert.ok(crowd.some(u=>u.hp===10000));await elf.page.screenshot({path:`${dir}/offense-with-ally-heal.png`});
 });
 await check('密集时友方准确命中，自选仅一个手动圈，手机可施法且重连保留友方目标',async()=>{
  await reset();Object.assign(ally.h,{x:2,y:3,hp:900000});Object.assign(enemy.h,{x:3.1,y:3});await sync();await lock(elf,ally.h);assert.equal(elf.h.manualTargetId,ally.h.id);await lock(elf,elf.h);let rows=await halos(elf.page);assert.equal(rows.filter(r=>r.unitId===elf.h.id&&(r.kind==='self'||r.kind==='manual')).length,1);assert.ok(rows.some(r=>r.kind==='manual'&&r.unitId===elf.h.id));assert.ok(sim.castPlan(1,elf.p).t.id!==elf.h.id);await elf.page.setViewportSize({width:390,height:844});await focus(elf.h);await lock(elf,ally.h);await cast(elf,1);advance(.4);await sync();assert.equal(elf.h.linkId,ally.h.id);await elf.page.screenshot({path:`${dir}/mobile-390.png`});await elf.page.reload();await elf.page.waitForFunction(()=>!!window.__game?.sim.hero());await focus(elf.h);await elf.page.waitForFunction(id=>__game.sim.hero().manualTargetId===id,ally.h.id);rows=await halos(elf.page);assert.ok(rows.some(r=>r.kind==='manual'&&r.team==='ally'&&r.unitId===ally.h.id));await elf.page.screenshot({path:`${dir}/reconnect-ally.png`});ally.h.y=21;advance(.05);await sync();assert.ok(!elf.h.manualTargetId);assert.equal(sim.get(elf.h.targetId)?.side,1);
 });
 await check('只有带其他友军技能的职业可选友方，战车火法领主拒选且保留敌方锁定',async()=>{
  for(const id of [2,4]){await reset(id);await lock(elf,enemy.h);const previous=elf.h.manualTargetId;await click(elf,ally.h);assert.equal(elf.h.manualTargetId,previous);assert.equal(elf.h.targetId,previous);assert.match(await elf.page.locator('#notice').textContent(),/友方|职业|敌方/);await click(elf,elf.h);assert.equal(elf.h.manualTargetId,previous);}
  await reset();const friendly=troop(-6,3,1);await sync();await lock(enemy,elf.h);const previous=enemy.h.manualTargetId;await click(enemy,friendly);assert.equal(enemy.h.manualTargetId,previous);assert.equal(enemy.h.targetId,previous);await click(enemy,enemy.h);assert.equal(enemy.h.manualTargetId,previous);await enemy.page.screenshot({path:`${dir}/non-support-rejected.png`});
 });
 assert.deepEqual(result.errors,[]);
}catch(e){result.fatal=e.stack;for(const [i,a]of actors.entries())await a.page.screenshot({path:`${dir}/failure-${i}.png`}).catch(()=>{});process.exitCode=1;}finally{
 fs.writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2));await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));console.log(JSON.stringify({checks:result.checks.length,errors:result.errors,fatal:result.fatal},null,2));
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from '../server.mjs';
import {contractType} from '../src/config.js';

const dir='evidence/damage-numbers';fs.mkdirSync(dir,{recursive:true});
const result={at:new Date().toISOString(),checks:[],errors:[]},actors=[];
const game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-damage-ui-'))}),room=game.room,sim=room.sim;room.paused=true;
await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const advance=n=>{const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.05,end-sim.time));};
const events=()=>sim.animations.filter(e=>e.kind==='damage');
async function sync(wait=60){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence)));if(wait)await new Promise(r=>setTimeout(r,wait));}
const report=page=>page.evaluate(()=>JSON.parse(JSON.stringify(__game.renderer.game.scene.scenes[0].combatNumbers.report)));
async function cast(a,i){assert.ok(sim.castPlan(i,a.p).ok,sim.castPlan(i,a.p).reason);await a.page.locator(`[data-cast="${i}"]`).click();await a.page.waitForFunction(i=>__game.sim.player.cd[i]>__game.sim.time,i);}
async function check(name,fn){await fn();result.checks.push(name);console.log('PASS',name);}
async function focus(id){await Promise.all(actors.map(a=>a.page.evaluate(id=>__game.renderer.focusUnit(id),id)));await new Promise(r=>setTimeout(r,300));}
async function prepare(){
 await new Promise(r=>setTimeout(r,950));sim.time+=3;sim.units=[];sim.fields=[];sim.animations=[];sim.jobs=[];sim.projectiles=[];sim.effects=[];sim.waveAt=sim.populationAt=1e9;for(const t of sim.towers){t.x=100;t.cd=1e9;}
 for(const a of actors){a.p.heroId=null;a.p.classId=a.id;a.p.progress[a.id]={level:6,xp:0,points:2};a.p.builds[a.id]=[1,1,1,1];a.p.cd=[0,0,0,0];a.p.stamina=100;a.p.auto=false;const h=sim.spawn(a.p.side,contractType(a.id),0,1,0);assert.ok(sim.contract(a.p,h.id));Object.assign(h,{x:0,y:a.id===3?3:0,hp:100000,maxHp:100000,speed:0,cd:1e9});a.h=h;}
 await sync();
}
function soldier(x,y,side=0,hp=100000){const u=sim.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp,maxHp:hp,cd:1e9,speed:0});return u;}
function expectedRows(rows,es){for(const e of es){const row=rows.find(r=>r.eventIds.includes(e.id));assert.ok(row,`missing event ${e.id} target ${e.targetId}`);assert.equal(row.targetId,e.targetId);assert.equal(row.sourceId,e.sourceId);near(row.amount,es.filter(v=>row.eventIds.includes(v.id)).reduce((n,v)=>n+v.amount,0));}}
try{
 for(const id of [4,3]){const context=await browser.newContext({viewport:{width:640,height:1136},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base);await page.locator('#accountName').fill('伤害飘字验收'+id);await page.locator('#accountPassword').fill('isolated-damage-numbers');await page.locator(`[name="side"][value="${id===3?1:0}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.game.scene.scenes[0]?.combatNumbers);actors.push({id,page,context,p:room.player(game.accounts.rows.at(-1))});}
 const [fire,lord]=actors;
 await check('真实单体技能双方同额飘字，普通攻击无飘字，命中后状态上方可读',async()=>{
  await prepare();sim.debuff(lord.h,fire.h,'moveSlow',.2,10,null,true);await sync();await focus(lord.h.id);
  sim.damage(fire.h,lord.h,fire.h.attack,true);await sync();for(const a of actors)assert.deepEqual(await report(a.page),[]);
  const hp=lord.h.hp;await cast(fire,0);advance(.4);await sync();const es=events();assert.equal(es.length,1);near(es[0].amount,hp-lord.h.hp);
  for(const a of actors){const rows=await report(a.page);expectedRows(rows,es);assert.ok(rows.every(r=>r.cssFontSize>=14));const statusTop=await a.page.evaluate(id=>__game.renderer.game.scene.scenes[0].statusIcons.top(id),lord.h.id);assert.ok(rows[0].bottom<=statusTop-9);await a.page.screenshot({path:dir+`/single-side-${a.p.side}.png`});}
  result.single={event:es[0],source:await report(fire.page),defender:await report(lord.page)};
 });
 await check('重复快照不重复飘字，暂停战局仍上浮淡出，旧快照不重播',async()=>{
  const ids=events().map(e=>e.id);for(let i=0;i<3;i++)await sync(40);for(const a of actors){const rows=await report(a.page);assert.equal(rows.length,1);assert.deepEqual(rows[0].eventIds,ids);}
  await new Promise(r=>setTimeout(r,1000));await sync();for(const a of actors)assert.deepEqual(await report(a.page),[]);
 });
 await check('群攻每个命中目标各有飘字，来源与目标身份保持一致',async()=>{
  await prepare();lord.h.y=0;fire.h.y=-3;const units=[fire.h,soldier(-2,-3),soldier(2,-3)];await sync();await focus(lord.h.id);await cast(lord,0);advance(.4);await sync();
  const es=events();assert.equal(es.length,3);assert.deepEqual(new Set(es.map(e=>e.targetId)),new Set(units.map(u=>u.id)));for(const a of actors)expectedRows(await report(a.page),es);await lord.page.screenshot({path:dir+'/aoe-targets.png'});
 });
 await check('灼烧每次跳伤有独立数值，重复同步与先前跳伤不会重新播放',async()=>{
  await prepare();lord.h.y=0;fire.h.y=-3;await sync();await focus(lord.h.id);await cast(lord,2);advance(.4);await sync();assert.deepEqual(events(),[]);advance(1);await sync();const first=events()[0];near(first.amount,lord.h.attack*.4);for(const a of actors)expectedRows(await report(a.page),[first]);
  await new Promise(r=>setTimeout(r,1000));advance(1);await sync();const last=events().at(-1);assert.notEqual(last.id,first.id);for(const a of actors){const rows=await report(a.page);expectedRows(rows,[last]);assert.ok(!rows.some(r=>r.eventIds.includes(first.id)));}await lord.page.screenshot({path:dir+'/burn-tick.png'});
 });
 await check('全护盾吸收明确标注吸收，数值等于真实护盾减少',async()=>{
  await prepare();sim.shield(lord.h,10000,lord.h,10);await sync();await focus(lord.h.id);const hp=lord.h.hp,shield=lord.h.shield;await cast(fire,0);advance(.4);await sync();const es=events();near(lord.h.hp,hp);near(es[0].amount,shield-lord.h.shield);
  for(const a of actors){const rows=await report(a.page);expectedRows(rows,es);assert.match(rows[0].text,/吸收/);}await fire.page.screenshot({path:dir+'/shield-absorb.png'});
 });
 await check('击杀已消失目标仍在命中处飘出实际剩余血量',async()=>{
  await prepare();lord.h.x=10;lord.h.y=20;const target=soldier(0,3,1,17);await sync();await focus(target.id);await cast(fire,0);advance(.4);await sync();assert.equal(sim.get(target.id),undefined);const es=events();near(es[0].amount,17);
  for(const a of actors)expectedRows(await report(a.page),es);await fire.page.screenshot({path:dir+'/killing-hit.png'});
 });
 await check('390宽屏幕数值可读，不遮挡目标已有状态，重连不重放命中',async()=>{
  await prepare();await fire.page.setViewportSize({width:390,height:844});await fire.page.waitForTimeout(150);sim.debuff(lord.h,fire.h,'moveSlow',.2,10,null,true);await sync();await focus(lord.h.id);await cast(fire,0);advance(.4);await sync();
  const rows=await report(fire.page);expectedRows(rows,events());assert.ok(rows.every(r=>r.cssFontSize>=14));const statusTop=await fire.page.evaluate(id=>__game.renderer.game.scene.scenes[0].statusIcons.top(id),lord.h.id);assert.ok(rows[0].bottom<=statusTop-9);await fire.page.screenshot({path:dir+'/mobile-390.png'});
  await fire.page.reload();await fire.page.waitForFunction(()=>window.__game?.renderer.game.scene.scenes[0]?.combatNumbers);await fire.page.waitForTimeout(80);assert.deepEqual(await report(fire.page),[]);await fire.page.setViewportSize({width:640,height:1136});
 });
 await check('密集群攻使用显示预算与目标分层，血条图标仍在飘字下方清晰可见',async()=>{
  await prepare();lord.h.y=0;fire.h.y=-3;const targets=[fire.h,...Array.from({length:4},(_,i)=>soldier((i-1.5)*1.2,-3))];sim.debuff(fire.h,lord.h,'moveSlow',.2,10,null,true);
  const casters=[lord];for(let i=0;i<7;i++){const p=sim.makePlayer(1,false);p.classId=3;p.level=6;p.builds[3]=[1,1,1,1];p.stamina=100;const h=sim.spawn(1,'melee',0,1,(i-3)*.4);sim.contract(p,h.id);Object.assign(h,{x:(i-3)*.4,y:0,hp:1e5,maxHp:1e5,speed:0,cd:1e9});casters.push({p,h});}
  await sync();await focus(lord.h.id);await cast(lord,0);for(const a of casters.slice(1))assert.ok(sim.cast(0,a.p));advance(.4);await sync();assert.equal(events().length,40);
  const rows=await report(lord.page);assert.ok(rows.length>0&&rows.length<=48);for(const target of targets)assert.ok(rows.filter(r=>r.targetId===target.id).length<=4);for(const r of rows)assert.ok(r.cssFontSize>=14);
  const camera=await lord.page.evaluate(()=>{const c=__game.renderer.game.scene.scenes[0].cameras.main;return {top:c.scrollY,bottom:c.scrollY+c.height};});
  for(const r of rows){assert.ok(r.top>=camera.top&&r.bottom<=camera.bottom,`clipped float ${r.text}`);assert.ok(r.left>=0&&r.right<=500);}
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j];assert.ok(!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top),`overlapping floats ${a.text}/${b.text}`);}
  result.dense={events:events().length,visible:rows.length,rows};await lord.page.screenshot({path:dir+'/dense-battle.png'});
 });
 assert.deepEqual(result.errors,[]);
}catch(e){result.fatal=e.stack;process.exitCode=1;}finally{
 fs.writeFileSync(dir+'/verification.json',JSON.stringify(result,null,2));await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));console.log(JSON.stringify({checks:result.checks.length,errors:result.errors,fatal:result.fatal},null,2));
}

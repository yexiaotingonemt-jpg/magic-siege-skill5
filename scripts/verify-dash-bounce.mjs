import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from '../server.mjs';

const dir='evidence/dash-bounce/browser';fs.mkdirSync(dir,{recursive:true});
const result={at:new Date().toISOString(),checks:[],errors:[],samples:{}},actors=[];
const game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-dash-bounce-'))}),room=game.room,sim=room.sim;room.paused=true;
await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const pause=ms=>new Promise(r=>setTimeout(r,ms)),near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function advance(n){const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.05,end-sim.time));}
async function sync(wait=40){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence)));if(wait)await pause(wait);}
async function check(name,fn){await fn();result.checks.push(name);console.log('PASS',name);}
async function focus(u){await Promise.all(actors.map(a=>a.page.evaluate(id=>__game.renderer.focusUnit(id),u.id)));await pause(330);}
async function click(a,u){await a.page.evaluate(id=>__game.renderer.focusUnit(id),u.id);await pause(330);const p=await a.page.evaluate(id=>{const u=__game.sim.get(id),p=__game.renderer.screenPoint(u),b=__game.renderer.game.canvas.getBoundingClientRect();return{x:b.left+p.x*b.width/500,y:b.top+(p.y-(u.tower?44:u.hero?39:27))*b.height/500};},u.id);await a.page.mouse.click(p.x,p.y);await pause(100);}
async function lock(u){await click(actors[1],u);assert.equal(sim.hero(actors[1].p).manualTargetId,u.id);}
async function cast(i){assert.ok(sim.castPlan(i,actors[1].p).ok,sim.castPlan(i,actors[1].p).reason);await actors[1].page.locator(`[data-cast="${i}"]`).click();await actors[1].page.waitForFunction(i=>__game.sim.player.cd[i]>__game.sim.time,i);}
function troop(x,y){const u=sim.spawn(0,'melee',0,1,x);Object.assign(u,{x,y,hp:1e8,maxHp:1e8,speed:0,cd:1e9});return u;}
async function reset(y=-36){sim.time+=4;sim.units=[];sim.fields=[];sim.projectiles=[];sim.animations=[];sim.effects=[];sim.jobs=[];sim.waveAt=sim.populationAt=1e9;for(const t of sim.towers)Object.assign(t,{x:100,cd:1e9});for(const a of actors){a.p.heroId=null;a.p.auto=false;a.p.stamina=100;a.p.cd=[0,0,0,0];}const p=actors[1].p;p.classId=3;p.progress[3]={level:6,xp:0,points:2};p.builds[3]=[1,1,1,1];const h=sim.spawn(1,'melee',0,1,0);assert.ok(sim.contract(p,h.id));Object.assign(h,{x:0,y,hp:1e8,maxHp:1e8,cd:0});await sync(220);await focus(h);return h;}
const position=u=>({x:u.x,y:u.y});
async function clientFrame(h){const rows=[];for(const a of actors)rows.push(await a.page.evaluate(id=>{const u=__game.sim.get(id),p=__game.renderer.game.scene.scenes[0].unitMotion.report.find(r=>r.unitId===id);return{side:__game.sim.player.side,x:u.x,y:u.y,renderX:p?.x,renderY:p?.y,lastAttackAt:u.lastAttackAt};},h.id));return rows;}
async function trace(h,duration){const rows=[],hits=new Map();for(let i=0;i<Math.round(duration/.05);i++){const from=position(h);advance(.05);await sync(25);const clients=await clientFrame(h);for(const c of clients){near(c.x,h.x);near(c.y,h.y);}for(const e of sim.animations)if(e.kind==='damage'&&e.sourceId===h.id)hits.set(e.id,{id:e.id,targetId:e.targetId,skill:e.skill,amount:e.amount});rows.push({time:sim.time,x:h.x,y:h.y,step:Math.hypot(h.x-from.x,h.y-from.y),dash:!!h.dash,lastAttackAt:h.lastAttackAt,clients});}return {rows,hits:[...hits.values()]};}
function noBounce(data,max=.60001){assert.ok(Math.max(...data.rows.map(r=>r.step))<=max,`server movement jump ${Math.max(...data.rows.map(r=>r.step))}`);for(let side=0;side<2;side++){let maxDelta=0;for(let i=1;i<data.rows.length;i++){const a=data.rows[i-1].clients[side],b=data.rows[i].clients[side];if(Number.isFinite(a.renderY)&&Number.isFinite(b.renderY))maxDelta=Math.max(maxDelta,Math.hypot(b.renderX-a.renderX,b.renderY-a.renderY)/18);}assert.ok(maxDelta<3,`render jumped ${maxDelta} grids side ${side}`);}}
try{
 for(const side of [0,1]){const context=await browser.newContext({viewport:{width:640,height:1136},hasTouch:true,isMobile:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base);await page.locator('#accountName').fill('冲锋回弹验收'+side);await page.locator('#accountPassword').fill('isolated-dash-bounce');await page.locator(`[name="side"][value="${side}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>!!window.__game?.renderer.game.scene.scenes[0]?.unitMotion);actors.push({page,context,p:room.player(game.accounts.rows.at(-1))});}
 await check('实际点选后冲锋越守方推进线，20Hz及双方画面不回弹，终点侧向追敌并普攻',async()=>{
  const h=await reset(),enemy=troop(0,-48);assert.equal(sim.config.world.defenseLimitY,-38);await sync(220);await lock(enemy);await focus(h);await cast(1);const data=await trace(h,5);noBounce(data);near(enemy.x,5);near(enemy.y,-48);near(h.y,-48);assert.ok(h.x>3);assert.ok(h.lastAttackAt!=null);assert.equal(data.hits.filter(e=>e.skill===1&&e.targetId===enemy.id).length,1);result.samples.outside=data;await focus(h);for(const a of actors)await a.page.screenshot({path:`${dir}/outside-line-side-${a.p.side}.png`});
  enemy.hp=0;const from=position(h),returning=await trace(h,.5);noBounce(returning,.10001);assert.ok(h.y>from.y&&h.y<sim.config.world.defenseLimitY);advance(6);await sync(220);near(h.y,sim.config.world.defenseLimitY);result.samples.returning=returning;
 });
 await check('18格选取、3格接触和5格击退维持，普通界内冲锋及推进边界保持正常',async()=>{
  let h=await reset(-20),enemy=troop(0,-30),inside=troop(2.99,-25),outside=troop(3.01,-25);await sync(220);await lock(enemy);await cast(1);const data=await trace(h,2.1);noBounce(data);assert.equal(data.hits.filter(e=>e.skill===1&&e.targetId===enemy.id).length,1);assert.equal(data.hits.filter(e=>e.skill===1&&e.targetId===inside.id).length,1);assert.equal(data.hits.filter(e=>e.skill===1&&e.targetId===outside.id).length,0);near(enemy.x,5);near(inside.x,7.99);assert.ok(h.y>=-38);result.samples.inside=data;
  h=await reset(-20);enemy=troop(0,-38.01);await sync(220);await lock(enemy);assert.equal(sim.castPlan(1,actors[1].p).ok,false);enemy.y=-38;await sync(220);assert.ok(sim.castPlan(1,actors[1].p).ok);enemy.hp=0;advance(15);await sync(220);near(h.y,-38);assert.ok(h.y>=sim.config.world.defenseLimitY);await actors[1].page.screenshot({path:`${dir}/normal-boundary.png`});
 });
 await check('先火焰盾再越界冲锋沿途仍灼烧，390视角与刷新重连后不会弹回推进线',async()=>{
  const h=await reset(),enemy=troop(0,-48),burn=troop(4,-42),outside=troop(5.01,-42);await actors[1].page.setViewportSize({width:390,height:844});await sync(220);await lock(enemy);await cast(2);advance(.4);await sync(220);await cast(1);const data=await trace(h,3);noBounce(data);assert.ok(sim.fields.some(f=>f.kind==='dot'&&f.type==='lordScorch'&&f.host===burn.id));assert.ok(data.hits.some(e=>e.skill===2&&e.targetId===burn.id));assert.ok(!sim.fields.some(f=>f.kind==='dot'&&f.type==='lordScorch'&&f.host===outside.id));assert.ok(h.y<-38);await focus(h);await actors[1].page.screenshot({path:`${dir}/flame-mobile-390.png`});const before=position(h);await actors[1].page.reload();await actors[1].page.waitForFunction(()=>!!window.__game?.sim.hero());await focus(h);const after=await trace(h,.3);noBounce(after,.10001);assert.ok(Math.abs(h.y-before.y)<.61);assert.ok(h.y<-38);await actors[1].page.screenshot({path:`${dir}/reconnect-no-bounce.png`});result.samples.flame=data;result.samples.reconnect=after;
 });
 assert.deepEqual(result.errors,[]);
}catch(e){result.fatal=e.stack;for(const [i,a]of actors.entries())await a.page.screenshot({path:`${dir}/failure-${i}.png`}).catch(()=>{});process.exitCode=1;}
finally{fs.writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2));await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));console.log(JSON.stringify({checks:result.checks.length,errors:result.errors,fatal:result.fatal},null,2));}

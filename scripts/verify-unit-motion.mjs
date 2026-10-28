import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createBrowserGame as createGameServer} from './browser-game-server.mjs';
import {contractType,classes} from '../shared/config.js';

const dir='evidence/unit-motion';fs.mkdirSync(dir,{recursive:true});
const result={at:new Date().toISOString(),checks:[],errors:[],samples:{}},actors=[];
const game=await createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-unit-motion-ui-'))}),room=game.room,sim=room.sim;
room.paused=false;room.step=()=>{};
await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const advance=n=>{const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.025,end-sim.time));};
async function sync(wait=35){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence)));if(wait)await pause(wait);}
async function check(name,fn){await fn();result.checks.push(name);console.log('PASS',name);}
async function frameShot(page,name){await page.evaluate(()=>__game.renderer.game.loop.sleep());try{await page.screenshot({path:`${dir}/${name}.png`});}finally{await page.evaluate(()=>__game.renderer.game.loop.wake());}}
const report=page=>page.evaluate(()=>JSON.parse(JSON.stringify(__game.renderer.game.scene.scenes[0].unitMotion.report)));
const row=(rows,u)=>{const r=rows.find(r=>r.unitId===u.id);assert.ok(r,`missing motion row ${u.id}`);return r;};
async function focus(id){await Promise.all(actors.map(a=>a.page.evaluate(id=>__game.renderer.focusUnit(id),id)));await pause(300);}
async function clickUnit(a,u){const q=await a.page.evaluate(id=>{const u=__game.sim.get(id),p=__game.renderer.screenPoint(u),b=__game.renderer.game.canvas.getBoundingClientRect();return {x:b.left+p.x*b.width/500,y:b.top+(p.y-(u.tower?44:u.hero?39:27))*b.height/500};},u.id);await a.page.mouse.click(q.x,q.y);await pause(150);}
function reset(){sim.time+=4;sim.units=[];sim.projectiles=[];sim.fields=[];sim.animations=[];sim.jobs=[];sim.effects=[];sim.waveAt=sim.populationAt=1e9;room.paused=false;for(const t of sim.towers)Object.assign(t,{x:100,cd:1e9});for(const a of actors){a.p.heroId=null;a.p.auto=false;a.p.stamina=100;a.p.cd=[0,0,0,0];}}
function hero(id,x,y,player=null){const p=player||sim.makePlayer(id===3?1:0,false);p.classId=id;p.progress[id]={level:6,xp:0,points:2};p.builds[id]=[1,1,1,1];p.stamina=100;const u=sim.spawn(p.side,contractType(id),0,1,x);assert.ok(sim.contract(p,u.id));Object.assign(u,{x,y,hp:1e7,maxHp:1e7,cd:1e9,speed:0});return u;}
function troop(type,side,x,y){const u=sim.spawn(side,type,0,1,x);Object.assign(u,{x,y,hp:1e7,maxHp:1e7,cd:1e9,speed:0});return u;}
function roster(){reset();const heroes=[0,2,3,4,5].map((id,i)=>hero(id,-8+i*4,-6,id===4?actors[0].p:id===3?actors[1].p:null));const troops=[];for(const side of [0,1])for(const [i,type]of ['melee','ranged','siege'].entries())troops.push(troop(type,side,-7+i*7,side?6:0));return {heroes,troops,units:[...heroes,...troops]};}
function nonRigid(a,b){assert.ok(a.vertexSamples?.length>=4&&b.vertexSamples?.length===a.vertexSamples.length,'missing mesh samples');const diffs=b.vertexSamples.map((p,i)=>({x:p.x-a.vertexSamples[i].x,y:p.y-a.vertexSamples[i].y}));return Math.max(...diffs.map(p=>p.x))-Math.min(...diffs.map(p=>p.x))>.05||Math.max(...diffs.map(p=>p.y))-Math.min(...diffs.map(p=>p.y))>.05;}
try{
 for(const side of [0,1]){const context=await browser.newContext({viewport:{width:640,height:1136},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base);await page.locator('#accountName').fill('单位动作验收'+side);await page.locator('#accountPassword').fill('isolated-unit-motion');await page.locator(`[name="side"][value="${side}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>!!window.__game?.renderer.game.scene.scenes[0]?.unitMotion);actors.push({page,context,p:room.player(game.accounts.rows.at(-1))});}
 await check('五英雄与双方三类小兵移动使用局部网格变形，两个视角均有效',async()=>{
  const {heroes,troops,units}=roster();for(const u of units){u.speed=2;u.range=0;u.aggro=0;u.targetId=null;u.deploying=false;}await sync();await focus(heroes[2].id);advance(.12);await sync(55);const before=await Promise.all(actors.map(a=>report(a.page)));await frameShot(actors[0].page,'movement-phase-a');advance(.19);await sync(55);const after=await Promise.all(actors.map(a=>report(a.page)));await frameShot(actors[0].page,'movement-phase-b');
  for(let i=0;i<actors.length;i++)for(const u of units){const a=row(before[i],u),b=row(after[i],u);assert.equal(b.action,'move',`${classes[u.classId]||u.type} action ${b.action}`);assert.equal(b.mesh,true);assert.ok(nonRigid(a,b),`rigid-only movement ${u.id}/${b.style}`);for(const v of b.vertexSamples)assert.ok(Number.isFinite(v.x)&&Number.isFinite(v.y));}
  result.samples.movement=after[0].filter(r=>units.some(u=>u.id===r.unitId));for(const [i,a]of actors.entries())await a.page.screenshot({path:`${dir}/movement-side-${i}.png`});
 });
 await check('所有英雄、双方兵种及防御塔普攻均包含蓄势、出手、回收与差异化通道',async()=>{
  const {heroes,troops,units}=roster(),tower=sim.towers[0];Object.assign(tower,{x:0,y:5,cd:1e9});const sources=[...units,tower];for(const u of sources){u.speed=0;u.cd=1e9;const target=troop('melee',1-u.side,u.x+.7,u.y);u.targetId=target.id;u.attackTo={x:target.x,y:target.y};}await sync();await focus(heroes[2].id);for(const u of sources)u.cd=sim.time+.14;await sync(20);const windup=await report(actors[0].page);for(const u of sources)assert.equal(row(windup,u).action,'prepare',`prepare ${u.id}`);await frameShot(actors[0].page,'attack-prepare');
  advance(.16);await sync(20);const release=await report(actors[0].page);for(const u of sources){assert.ok(u.lastAttackAt!=null);assert.equal(row(release,u).action,'attack',`attack ${u.id}`);assert.ok(nonRigid(row(windup,u),row(release,u)),`no distinct attack pose ${u.id}`);}
  await frameShot(actors[0].page,'attack-release');const recovering=new Set(),recover=[];for(let i=0;i<5;i++){advance(.065);await sync(15);const rows=await report(actors[0].page);recover.push(rows);for(const u of sources)if(row(rows,u).action==='recover')recovering.add(u.id);if(i===2)await frameShot(actors[0].page,'attack-recover');}for(const u of sources)assert.ok(recovering.has(u.id),`recovery ${u.id}`);result.samples.attacks={prepare:windup.filter(r=>sources.some(u=>u.id===r.unitId)),release:release.filter(r=>sources.some(u=>u.id===r.unitId)),recover};
 });
 await check('技能、引导、冲锋优先普通动作，眩晕停止步态，暂停保持同一关节姿态',async()=>{
  reset();const h=hero(4,0,0,actors[0].p),enemy=hero(3,0,3,actors[1].p);await sync();await focus(h.id);h.skillAnimation={skill:0,start:sim.time,release:sim.time+.3,end:sim.time+.72};await sync();assert.equal(row(await report(actors[0].page),h).action,'skill');h.skillAnimation=null;h.channelUntil=sim.time+3;await sync();assert.equal(row(await report(actors[0].page),h).action,'channel');h.channelUntil=0;h.dash={x:h.x,y:h.y,end:{x:0,y:3},start:sim.time,until:sim.time+1,s:{radius:3},hit:[]};await sync();assert.equal(row(await report(actors[0].page),h).action,'dash');h.dash=null;h.stunUntil=sim.time+3;h.lastAttackAt=sim.time;await sync();assert.equal(row(await report(actors[0].page),h).action,'controlled');h.stunUntil=0;h.lastAttackAt=sim.time-1;room.paused=true;await sync(350);const a=row(await report(actors[0].page),h);await pause(350);const b=row(await report(actors[0].page),h);assert.deepEqual(b.vertexSamples,a.vertexSamples);assert.deepEqual(b.channels,a.channels);await actors[0].page.screenshot({path:`${dir}/paused.png`});
 });
 await check('新网格不改变契约点击、手动锁敌和技能目标，390宽显示完整',async()=>{
  reset();room.paused=true;actors[0].p.classId=4;const base=troop('ranged',0,0,0),enemy=hero(3,3,3,actors[1].p);await sync();await focus(base.id);await clickUnit(actors[0],base);assert.equal(await actors[0].page.locator('#contractPopover').isVisible(),true);await actors[0].page.locator('#confirmContract').click();await actors[0].page.waitForFunction(()=>!!__game.sim.hero());const h=sim.hero(actors[0].p);h.cd=1e9;h.speed=0;const chosen=troop('melee',1,-3,3);await sync();await clickUnit(actors[0],chosen);assert.equal(h.manualTargetId,chosen.id);assert.equal(h.targetId,chosen.id);await actors[0].page.locator('[data-cast="0"]').click();await actors[0].page.waitForFunction(()=>__game.sim.player.cd[0]>__game.sim.time);const hp=chosen.hp;advance(.4);await sync();assert.ok(chosen.hp<hp);await actors[0].page.setViewportSize({width:390,height:844});await focus(h.id);await actors[0].page.screenshot({path:`${dir}/mobile-390.png`});await clickUnit(actors[0],enemy);assert.equal(h.manualTargetId,enemy.id);await actors[0].page.setViewportSize({width:640,height:1136});
 });
 await check('网格与附加绘制池复用，死亡单位移除且长时间推进无非法顶点或浏览器异常',async()=>{
  const {units}=roster();for(const u of units){u.speed=2;u.range=0;u.aggro=0;u.deploying=false;}await sync();await focus(units[0].id);const sizes=[];for(let i=0;i<10;i++){advance(.1);await sync(20);sizes.push(await actors[0].page.evaluate(()=>__game.renderer.game.scene.scenes[0].children.list.length));for(const r of await report(actors[0].page))for(const v of r.vertexSamples||[])assert.ok(Number.isFinite(v.x)&&Number.isFinite(v.y));}assert.ok(Math.max(...sizes.slice(3))-Math.min(...sizes.slice(3))<=3,`unbounded display count ${sizes}`);units[0].hp=0;advance(.05);await sync();assert.ok(!(await report(actors[0].page)).some(r=>r.unitId===units[0].id));result.samples.displayCounts=sizes;
 });
 assert.deepEqual(result.errors,[]);
}catch(e){result.fatal=e.stack;for(const [i,a]of actors.entries())await a.page.screenshot({path:`${dir}/failure-${i}.png`}).catch(()=>{});process.exitCode=1;}finally{
 fs.writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2));await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));console.log(JSON.stringify({checks:result.checks.length,errors:result.errors,fatal:result.fatal},null,2));
}

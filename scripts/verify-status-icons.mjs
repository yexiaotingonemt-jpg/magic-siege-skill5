import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from '../server.mjs';
import {contractType} from '../src/config.js';
const dir='evidence/status-icons';fs.mkdirSync(dir,{recursive:true});
const result={checks:[],errors:[]},game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-status-icons-'))}),room=game.room,sim=room.sim,actors=[];room.paused=true;
await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const advance=n=>{const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.05,end-sim.time));};
async function sync(){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence)));await new Promise(r=>setTimeout(r,80));}
async function cast(a,skill){await a.page.locator(`[data-cast="${skill}"]`).click();await a.page.waitForFunction(i=>__game.sim.player.cd[i]>__game.sim.time,skill);advance(.4);await sync();}
async function records(page){return page.evaluate(()=>JSON.parse(JSON.stringify(__game.renderer.game.scene.scenes[0].statusIcons.report)));}
async function check(name,fn){await fn();result.checks.push({name,passed:true});}
try{
 for(const id of [0,3,5,4]){const context=await browser.newContext({viewport:{width:1440,height:1100},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base);await page.locator('#accountName').fill('状态检测'+id);await page.locator('#accountPassword').fill('isolated-status-icons');await page.locator(`[name="side"][value="${id===3?1:0}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());const p=room.player(game.accounts.rows.at(-1));p.classId=id;p.level=6;p.builds[id]=[1,1,1,1];const h=sim.units.find(u=>!u.hero&&u.side===p.side&&u.type===contractType(id));assert.ok(sim.contract(p,h.id));actors.push({id,page,context,p,h});}
 const [orc,lord,elf,fire]=actors;sim.units=actors.map(a=>a.h);sim.waveAt=1e9;for(const tower of sim.towers)tower.x=100;for(const a of actors)Object.assign(a.h,{speed:0,cd:1e9,x:0,y:0});Object.assign(orc.h,{x:-3,y:3,hp:1000});Object.assign(lord.h,{x:0,y:5});fire.h.x=6;fire.h.attack=100;
 await sync();for(const a of actors){await a.page.locator('#locate').click();await a.page.waitForTimeout(300);}
 await cast(orc,1);await cast(orc,3);sim.shield(orc.h,300,orc.h,6);await cast(elf,1);await cast(lord,2);await cast(orc,0);await cast(fire,0);sim.addHeat(fire.h,2);await cast(fire,2);
 const prepaid={limit:100,spent:100};sim.debuff(lord.h,fire.h,'moveSlow',.45,4,prepaid,true);lord.h.debuffs[fire.h.id+':moveSlow'].stacks=3;sim.stun(lord.h,orc.h,1.8);
 const tower=sim.towers[0];Object.assign(tower,{x:-9,y:9,hp:1000,maxHp:1000,cd:1e9});sim.damage(fire.h,tower,301);const soldier=sim.spawn(0,'melee',0,1,8);Object.assign(soldier,{x:8,y:-4,speed:0,cd:1e9});sim.shield(soldier,100,orc.h,4);sim.debuff(soldier,lord.h,'attackSpeedDown',.4,4);await sync();
 await check('真实技能产生护盾/减伤/蓄伤/链接/炙热及敌方负面图标，四账号一致',async()=>{
  const snapshots=await Promise.all(actors.map(a=>records(a.page)));for(const snapshot of snapshots){const ids=id=>snapshot.filter(x=>x.unitId===id).map(x=>x.id);for(const id of ['shield','guard','damageStore','link'])assert.ok(ids(orc.h.id).includes(id),id);for(const id of ['stun','vulnerable','moveSlow','guard','burnAura','soulMark'])assert.ok(ids(lord.h.id).includes(id),id);assert.equal(snapshot.find(x=>x.unitId===fire.h.id&&x.id==='heat').stacks,3);assert.equal(snapshot.find(x=>x.unitId===lord.h.id&&x.id==='moveSlow').stacks,3);assert.ok(ids(elf.h.id).includes('link'));assert.ok(ids(tower.id).includes('towerGuard'));assert.ok(ids(soldier.id).includes('shield'));assert.ok(ids(soldier.id).includes('attackSpeedDown'));}
  for(const a of actors)await a.page.screenshot({path:`${dir}/desktop-${a.id}.png`});result.initial=snapshots[0];
 });
 await check('图标位于血条上方，身份标记避让，同单位图标互不重叠',async()=>{
  for(const r of await records(orc.page)){const u=sim.get(r.unitId),point=await orc.page.evaluate(id=>{const u=__game.sim.get(id),g=__game.renderer,p=g.screenPoint(u);return {y:p.y+g.getCamera().scrollY,focus:__game.renderer.game.scene.scenes[0].focusLabel.y};},r.unitId);assert.ok(r.y+r.size<point.y-(u.tower?44:u.hero?39:27));if(u.id===orc.h.id)assert.ok(point.focus<r.y);}
 });
 await check('桌面悬停显示说明，鼠标离开后隐藏',async()=>{
  const r=(await records(orc.page)).find(r=>r.unitId===orc.h.id&&r.id==='shield');const p=await orc.page.evaluate(r=>{const g=__game.renderer,c=g.game.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.size/2)/500*c.width,y:c.y+(r.y+r.size/2-g.getCamera().scrollY)/500*c.height};},r);await orc.page.mouse.move(p.x,p.y);await orc.page.waitForFunction(()=>__game.renderer.game.scene.scenes[0].children.getByName('unit-status-tooltip').visible);assert.match(await orc.page.evaluate(()=>__game.renderer.game.scene.scenes[0].children.getByName('unit-status-tooltip').text),/护盾/);await orc.page.screenshot({path:`${dir}/hover-shield.png`});await orc.page.mouse.move(10,10);await orc.page.waitForFunction(()=>!__game.renderer.game.scene.scenes[0].children.getByName('unit-status-tooltip').visible);
 });
 for(const width of [390,320])await check(`${width}px触屏点状态图标查看层数和剩余时间，不穿透选兵`,async()=>{
  const page=orc.page;await page.setViewportSize({width,height:width===390?844:568});await page.waitForTimeout(120);await page.locator('#locate').click();await page.waitForTimeout(300);const r=(await records(page)).find(r=>r.unitId===lord.h.id&&r.id==='moveSlow');assert.ok(r);const previous=await page.evaluate(()=>__game.selection.id);const point=await page.evaluate(r=>{const g=__game.renderer,c=g.game.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.size/2)/500*c.width,y:c.y+(r.y+r.size/2-g.getCamera().scrollY)/500*c.height,size:r.size*c.width/500};},r);assert.ok(point.size>=15.9);await page.touchscreen.tap(point.x,point.y);await page.waitForFunction(()=>__game.renderer.game.scene.scenes[0].children.getByName('unit-status-tooltip').visible);assert.match(await page.evaluate(()=>__game.renderer.game.scene.scenes[0].children.getByName('unit-status-tooltip').text),/减速 ×3.*秒/);assert.equal(await page.evaluate(()=>__game.selection.id),previous);await page.screenshot({path:`${dir}/mobile-${width}.png`});
 });
 await check('净化后所有客户端即时移除负面，护盾和其他正面状态保留',async()=>{
  sim.cleanse(lord.h);await sync();for(const a of actors){const report=await records(a.page);assert.ok(!report.some(r=>r.unitId===lord.h.id&&r.tone==='negative'));assert.ok(report.some(r=>r.unitId===orc.h.id&&r.id==='shield'));}
 });
 await check('护盾吸收完、链接额度耗尽、效果到期后图标撤销，死亡单位无图标',async()=>{
  sim.damage(lord.h,orc.h,1000);const link=sim.fields.find(f=>f.kind==='link');link.value.spent=link.value.limit;await sync();for(const a of actors){const report=await records(a.page);assert.ok(!report.some(r=>r.unitId===orc.h.id&&r.id==='shield'));assert.ok(!report.some(r=>r.id==='link'));}
  advance(20);await sync();for(const a of actors)assert.deepEqual(await records(a.page),[]);sim.debuff(lord.h,fire.h,'vulnerable',.25,10);sim.damage(null,lord.h,1e9);await sync();for(const a of actors)assert.ok(!(await records(a.page)).some(r=>r.unitId===lord.h.id));
 });
 assert.deepEqual(result.errors,[]);
}catch(e){result.fatal=e.stack;process.exitCode=1;}finally{fs.writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2));await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));console.log(JSON.stringify({passed:result.checks.length,errors:result.errors,fatal:result.fatal},null,2));}

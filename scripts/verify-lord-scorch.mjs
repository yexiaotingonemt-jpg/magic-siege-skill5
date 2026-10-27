import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from '../server.mjs';
import {contractType} from '../src/config.js';

const dir='evidence/lord-scorch';fs.mkdirSync(dir,{recursive:true});
const result={at:new Date().toISOString(),checks:[],errors:[]},actors=[];
const game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-lord-scorch-'))}),room=game.room,sim=room.sim;room.paused=true;
await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const advance=n=>{const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.05,end-sim.time));};
async function sync(wait=120){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence)));await new Promise(r=>setTimeout(r,wait));}
async function cast(a,i){await a.page.locator(`[data-cast="${i}"]`).click();await a.page.waitForFunction(i=>__game.sim.player.cd[i]>__game.sim.time,i);}
const report=page=>page.evaluate(()=>JSON.parse(JSON.stringify({fx:__game.renderer.game.scene.scenes[0].skillFX.report,icons:__game.renderer.game.scene.scenes[0].statusIcons.report})));
async function check(name,fn){await fn();result.checks.push(name);console.log('PASS',name);}
try{
 for(const id of [3,0]){
  const context=await browser.newContext({viewport:{width:640,height:1136},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
  await page.goto(base);await page.locator('#accountName').fill('火焰盾验收'+id);await page.locator('#accountPassword').fill('isolated-lord-scorch');await page.locator(`[name="side"][value="${id===3?1:0}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  const p=room.player(game.accounts.rows.at(-1));p.classId=id;p.progress[id]={level:6,xp:0,points:2};p.builds[id]=[1,1,1,1];p.stamina=100;
  const h=sim.spawn(p.side,contractType(id),0,1,0);assert.ok(sim.contract(p,h.id));Object.assign(h,{x:0,y:id===3?0:-17,speed:0,cd:1e9,hp:50000,maxHp:50000});actors.push({id,context,page,p,h});
 }
 const [lord,orc]=actors;sim.units=actors.map(a=>a.h);sim.waveAt=sim.populationAt=1e9;for(const t of sim.towers)t.x=100;
 const soldiers=[-4,-9].map(y=>{const u=sim.spawn(0,'melee',0,1,0);Object.assign(u,{x:0,y,speed:0,cd:1e9,hp:50000,maxHp:50000});return u;});
 await sync();for(const a of actors){await a.page.evaluate(id=>__game.renderer.focusUnit(id),lord.h.id);await a.page.waitForTimeout(300);}
 await check('真实点击3技能，火焰盾和沿途第一个敌人的灼烧图标出现',async()=>{
  await cast(lord,2);advance(.4);await sync();const {fx,icons}=await report(lord.page);
  assert.ok(icons.some(i=>i.unitId===lord.h.id&&i.id==='burnAura'&&i.name==='火焰盾'));
  assert.ok(icons.some(i=>i.unitId===soldiers[0].id&&i.id==='dot'&&i.name==='灼烧'));
  assert.ok(fx.burns.some(b=>b.unitId===soldiers[0].id));await lord.page.screenshot({path:dir+'/shield-before-charge.png'});
 });
 await check('真实点击2技能可选择17格目标，突进中段附加灼烧',async()=>{
  assert.equal(sim.castPlan(1,lord.p).t.id,orc.h.id);await cast(lord,1);advance(1.35);await sync();
  assert.ok(lord.h.dash);assert.ok(sim.fields.some(f=>f.type==='lordScorch'&&f.host===soldiers[1].id));await lord.page.screenshot({path:dir+'/charge-midpoint.png'});
 });
 await check('抵达终点后，沿路与终点目标两客户端均显示独立灼烧',async()=>{
  advance(.9);await sync();assert.ok(!lord.h.dash);assert.ok(Math.abs(lord.h.y+17)<1e-6);
  for(const a of actors){await a.page.evaluate(id=>__game.renderer.focusUnit(id),lord.h.id);await a.page.waitForTimeout(320);const {fx,icons}=await report(a.page);
   for(const u of [...soldiers,orc.h]){assert.ok(fx.burns.some(b=>b.unitId===u.id),`missing flames ${u.id}`);assert.ok(icons.some(i=>i.unitId===u.id&&i.id==='dot'),`missing icon ${u.id}`);}
   await a.page.screenshot({path:dir+`/after-charge-side-${a.p.side}.png`});}
  result.afterCharge=await report(lord.page);
 });
 await check('离开火焰盾范围后继续掉血，同局两端血量相同',async()=>{
  const target=soldiers[0],hp=target.hp;assert.ok(Math.hypot(lord.h.x-target.x,lord.h.y-target.y)>4);advance(1.1);await sync();assert.ok(target.hp<hp);
  for(const a of actors)assert.equal(await a.page.evaluate(id=>__game.sim.get(id).hp,target.id),target.hp);result.departedDamage=hp-target.hp;
 });
 await check('390触屏查看灼烧说明与剩余时间，不穿透选兵',async()=>{
  const page=orc.page;await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);await page.evaluate(id=>__game.renderer.focusUnit(id),soldiers[0].id);await page.waitForTimeout(320);
  const icon=(await report(page)).icons.find(i=>i.unitId===soldiers[0].id&&i.id==='dot');assert.ok(icon);
  const previous=await page.evaluate(()=>__game.selection.id),point=await page.evaluate(r=>{const g=__game.renderer,c=g.game.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.size/2)/500*c.width,y:c.y+(r.y+r.size/2-g.getCamera().scrollY)/500*c.height};},icon);
  await page.touchscreen.tap(point.x,point.y);await page.waitForFunction(()=>__game.renderer.game.scene.scenes[0].children.getByName('unit-status-tooltip').visible);
  const text=await page.evaluate(()=>__game.renderer.game.scene.scenes[0].children.getByName('unit-status-tooltip').text);assert.match(text,/灼烧.*秒/);assert.match(text,/20%/);assert.equal(await page.evaluate(()=>__game.selection.id),previous);
  const bounds=await page.evaluate(()=>{const t=__game.renderer.game.scene.scenes[0].children.getByName('unit-status-tooltip');return {left:t.x-t.width/2,right:t.x+t.width/2,width:t.width};});assert.ok(bounds.left>=0&&bounds.right<=500&&bounds.width<=280);result.tooltipBounds=bounds;
  await page.screenshot({path:dir+'/mobile-burn-tooltip.png'});
 });
 await check('净化立即撤销目标灼烧图标和火焰，两端同步',async()=>{
  const target=soldiers[0];assert.ok(sim.cleanse(target));await sync();for(const a of actors){const {fx,icons}=await report(a.page);assert.ok(!fx.burns.some(b=>b.unitId===target.id));assert.ok(!icons.some(i=>i.unitId===target.id&&i.id==='dot'));}
 });
 await check('护盾结束后旧灼烧仍持续，全部到期撤销',async()=>{
  advance(3);await sync();assert.ok(!sim.fields.some(f=>f.kind==='lordBurn'));assert.ok(sim.fields.some(f=>f.type==='lordScorch'&&f.host===orc.h.id));
  advance(7);await sync();assert.ok(!sim.fields.some(f=>f.type==='lordScorch'));for(const a of actors)assert.deepEqual((await report(a.page)).fx.burns,[]);
 });
 assert.deepEqual(result.errors,[]);
}catch(e){result.fatal=e.stack;process.exitCode=1;}finally{
 fs.writeFileSync(dir+'/verification.json',JSON.stringify(result,null,2));await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));console.log(JSON.stringify({checks:result.checks.length,errors:result.errors,fatal:result.fatal},null,2));
}

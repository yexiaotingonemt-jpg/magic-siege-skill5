import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from '../server.mjs';
import {contractType} from '../src/config.js';

const dir='evidence/manual-target';fs.mkdirSync(dir,{recursive:true});
const result={at:new Date().toISOString(),checks:[],errors:[]},actors=[];
const game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-manual-ui-'))}),room=game.room,sim=room.sim;room.paused=true;
await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const advance=n=>{const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.05,end-sim.time));};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function sync(){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence)));await pause(330);}
async function focus(){await Promise.all(actors.map(a=>a.page.evaluate(id=>__game.renderer.focusUnit(id),a.h.id)));await pause(330);}
async function check(name,fn){await fn();result.checks.push(name);console.log('PASS',name);}
async function clickUnit(actor,u){let point=await actor.page.evaluate(id=>{const u=__game.sim.get(id),p=__game.renderer.screenPoint(u),box=__game.renderer.game.canvas.getBoundingClientRect();return {x:box.left+p.x/500*box.width,y:box.top+(p.y-(u.tower?44:u.hero?39:27))/500*box.height,visible:p.y>55&&p.y<490};},u.id);if(!point.visible){await actor.page.evaluate(id=>__game.renderer.focusUnit(id),u.id);await pause(330);point=await actor.page.evaluate(id=>{const u=__game.sim.get(id),p=__game.renderer.screenPoint(u),box=__game.renderer.game.canvas.getBoundingClientRect();return {x:box.left+p.x/500*box.width,y:box.top+(p.y-(u.tower?44:u.hero?39:27))/500*box.height};},u.id);}await actor.page.mouse.click(point.x,point.y);await pause(180);}
async function expectTarget(actor,u){assert.equal(actor.h.manualTargetId,u.id,`server manual ${actor.id}`);assert.equal(actor.h.targetId,u.id);await Promise.all(actors.map(a=>a.page.waitForFunction(({hero,id})=>__game.sim.get(hero)?.manualTargetId===id,{hero:actor.h.id,id:u.id})));}
function soldier(x,y,side=1,hp=100000){const u=sim.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp,maxHp:hp,cd:1e9,speed:0});return u;}
async function prepare(attackId=4,contract=true){
 sim.time+=3;sim.units=[];sim.fields=[];sim.animations=[];sim.jobs=[];sim.projectiles=[];sim.effects=[];sim.waveAt=sim.populationAt=1e9;for(const t of sim.towers){t.x=100;t.cd=1e9;}
 for(const a of actors){a.id=a.p.side===0?attackId:3;a.p.heroId=null;a.p.classId=a.id;a.p.progress[a.id]={level:6,xp:0,points:2};a.p.builds[a.id]=[1,1,1,1];a.p.cd=[0,0,0,0];a.p.stamina=100;a.p.auto=false;const h=sim.spawn(a.p.side,contractType(a.id),0,1,0);Object.assign(h,{x:0,y:a.p.side?3:0,hp:100000,maxHp:100000,speed:0,cd:1e9});a.h=h;if(contract||a.p.side===1){assert.ok(sim.contract(a.p,h.id));Object.assign(h,{x:0,y:a.p.side?3:0,hp:100000,maxHp:100000,speed:0,cd:1e9});}}
 await sync();await focus();
}
async function cast(a,i){await a.page.locator(`[data-cast="${i}"]`).click();await a.page.waitForFunction(i=>__game.sim.player.cd[i]>__game.sim.time,i);}
try{
 for(const side of [0,1]){const context=await browser.newContext({viewport:{width:640,height:1136},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base);await page.locator('#accountName').fill('手动选敌验收'+side);await page.locator('#accountPassword').fill('isolated-manual-target');await page.locator(`[name="side"][value="${side}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.game.scene.scenes[0]?.targetHalos);actors.push({id:side?3:4,page,context,p:room.player(game.accounts.rows.at(-1))});}
 const [attack,defense]=actors;
 await check('未契约仍从场上点兵弹窗确认，点中不立即扣费，确认后才出现技能',async()=>{
  await prepare(4,false);assert.equal(await attack.page.locator('#skills').isVisible(),false);await clickUnit(attack,attack.h);assert.equal(await attack.page.locator('#contractPopover').isVisible(),true);assert.ok(!sim.hero(attack.p));const before=attack.p.stamina;await attack.page.locator('#confirmContract').click();await attack.page.waitForFunction(()=>!!__game.sim.hero());assert.equal(attack.p.stamina,before-sim.config.world.contractCost);assert.equal(await attack.page.locator('#skills').isVisible(),true);assert.equal(await attack.page.locator('#contractPopover').isVisible(),false);
 });
 await check('双方实际点击敌兵切换攻击，手动光圈清楚显示，同局客户端同步',async()=>{
  await prepare();const forAttack=soldier(3,4,1),forDefense=soldier(-3,1,0);await sync();await clickUnit(attack,forAttack);await expectTarget(attack,forAttack);await clickUnit(defense,forDefense);await expectTarget(defense,forDefense);for(const a of actors){const halo=await a.page.evaluate(()=>__game.renderer.game.scene.scenes[0].targetHalos.report);assert.ok(halo.some(r=>r.kind==='manual'&&r.unitId===a.h.manualTargetId));await a.page.screenshot({path:`${dir}/manual-side-${a.p.side}.png`});}result.sync={attackHero:attack.h.id,attackTarget:forAttack.id,defenseHero:defense.h.id,defenseTarget:forDefense.id};
 });
 await check('20格外目标不能选中，火法不能选友军，点击空白不取消既有锁定',async()=>{
  const selected=attack.h.manualTargetId,outside=soldier(0,21,1),ally=soldier(-7,1,0);await sync();await clickUnit(attack,outside);assert.equal(attack.h.manualTargetId,selected);assert.match(await attack.page.locator('#notice').textContent(),/20格/);await clickUnit(attack,ally);assert.equal(attack.h.manualTargetId,selected);assert.equal(attack.h.targetId,selected);assert.match(await attack.page.locator('#notice').textContent(),/友方|职业|敌方/);assert.equal(await attack.page.locator('#contractPopover').isVisible(),false);const canvas=attack.page.locator('canvas'),box=await canvas.boundingBox();await attack.page.mouse.click(box.x+20,box.y+30);await pause(150);assert.equal(attack.h.manualTargetId,selected);
 });
 await check('五职业实际技能按钮遵循手动目标，领主冲锋可主动选择近端目标',async()=>{
  for(const id of [0,2,3,4,5]){await prepare(id===3?4:id);const a=id===3?defense:attack;a.h.x=0;a.h.y=0;actors.find(v=>v!==a).h.x=8;actors.find(v=>v!==a).h.y=8;const near=soldier(0,1,1-a.p.side),chosen=soldier(3,2,1-a.p.side);await sync();await focus();await clickUnit(a,chosen);await expectTarget(a,chosen);const skill=id===3?1:0,before=chosen.hp,other=near.hp;await cast(a,skill);advance(1.5);await sync();assert.ok(chosen.hp<before,`class ${id} failed damage`);if(id!==3)assert.equal(near.hp,other);if(id===3)await a.page.screenshot({path:`${dir}/lord-selected-charge.png`});}
 });
 await check('有效嘲讽拒绝手动切换并显示服务器原因，失效目标解除手动锁定',async()=>{
  await prepare();const chosen=soldier(3,4,1),taunter=soldier(-2,2,1);attack.h.tauntId=taunter.id;attack.h.tauntUntil=sim.time+1;await sync();await clickUnit(attack,chosen);assert.ok(!attack.h.manualTargetId);assert.match(await attack.page.locator('#notice').textContent(),/嘲讽/);advance(1.1);await sync();await clickUnit(attack,chosen);await expectTarget(attack,chosen);chosen.y=20;advance(.05);await sync();assert.ok(!attack.h.manualTargetId);assert.ok(attack.h.targetId!==chosen.id);
 });
 await check('390宽触屏仍可选择和施法，前摇锁定原目标，重新登录不丢失同步目标',async()=>{
  await prepare();await attack.page.setViewportSize({width:390,height:844});await pause(200);const first=soldier(3,4,1),second=soldier(-3,4,1);await sync();await focus();await clickUnit(attack,first);await expectTarget(attack,first);await cast(attack,0);await clickUnit(attack,second);await expectTarget(attack,second);const hp1=first.hp,hp2=second.hp;advance(.4);await sync();assert.ok(first.hp<hp1);assert.equal(second.hp,hp2);await attack.page.screenshot({path:`${dir}/mobile-390.png`});await attack.page.reload();await attack.page.waitForFunction(()=>!!window.__game?.sim.hero());await attack.page.waitForFunction(id=>__game.sim.hero().manualTargetId===id,second.id);assert.equal(await attack.page.locator('#contractPopover').isVisible(),false);
 });
 assert.deepEqual(result.errors,[]);
}catch(e){result.fatal=e.stack;for(const a of actors)await a.page.screenshot({path:`${dir}/failure-${a.p.side}.png`}).catch(()=>{});process.exitCode=1;}finally{
 fs.writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2));await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));console.log(JSON.stringify({checks:result.checks.length,errors:result.errors,fatal:result.fatal},null,2));
}

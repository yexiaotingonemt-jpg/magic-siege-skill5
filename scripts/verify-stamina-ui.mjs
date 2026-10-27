import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from '../server.mjs';
const dir='evidence/stamina-sidebar';fs.mkdirSync(dir,{recursive:true});
const game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-stamina-ui-'))}),actors=[],result={at:new Date().toISOString(),checks:[],errors:[]};game.room.paused=true;
await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 for(const [index,side]of [0,1].entries()){
  const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();page.on('pageerror',error=>result.errors.push(error.message));
  await page.goto(base);await page.locator('#accountName').fill('体力UI测试'+index);await page.locator('#accountPassword').fill('isolated-stamina-ui');await page.locator(`[name="side"][value="${side}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected&&__game.sim.player);actors.push({context,page,p:game.room.player(game.accounts.rows.at(-1))});
 }
 const [host,guest]=actors;assert.equal(guest.p.stamina,100);assert.equal(await guest.page.locator('#hostControls').isVisible(),false);assert.equal(await guest.page.locator('#addStamina').isVisible(),true);
 const placement=await guest.page.locator('#addStamina').evaluate(button=>{const b=button.getBoundingClientRect(),g=document.querySelector('.game').getBoundingClientRect();return {outsideGame:!button.closest('.game'),separated:b.left>=g.right||b.top>=g.bottom,height:b.height};});
 assert.ok(placement.outsideGame&&placement.separated);assert.ok(placement.height>=44);result.checks.push('非房主可见，按钮在正式游戏界面外侧，触控高度至少44像素');
 await guest.page.locator('#addStamina').click();await guest.page.waitForFunction(()=>__game.sim.player.stamina===200);await host.page.waitForFunction(id=>__game.sim.players.find(p=>p.id===id).stamina===200,guest.p.id);
 assert.equal(host.p.stamina,100);assert.equal(guest.p.stamina,200);assert.equal(await guest.page.locator('#toolStamina').textContent(),'200');assert.equal(await guest.page.locator('#stamina').textContent(),'200');
 assert.match(await guest.page.locator('#toolNotice').textContent(),/增加100/);result.checks.push('实际点击增加自身100体力，双方同步一致，另一玩家体力不变，侧栏及HUD数字同步');
 await guest.page.screenshot({path:dir+'/desktop.png',fullPage:true});
 await guest.page.setViewportSize({width:390,height:844});await guest.page.locator('#addStamina').scrollIntoViewIfNeeded();await guest.page.waitForTimeout(200);await guest.page.screenshot({path:dir+'/mobile.png'});
 const mobile=await guest.page.locator('#addStamina').evaluate(button=>{const b=button.getBoundingClientRect(),g=document.querySelector('.game').getBoundingClientRect();return {left:b.left,right:b.right,width:innerWidth,belowGame:b.top>=g.bottom,height:b.height};});
 assert.ok(mobile.belowGame&&mobile.left>=0&&mobile.right<=mobile.width&&mobile.height>=44);result.checks.push('390像素窄屏移至游戏下方工具区，无横向溢出，仍在正式游戏界面外');
 assert.deepEqual(result.errors,[]);
}catch(error){result.fatal=error.stack;process.exitCode=1;}finally{
 fs.writeFileSync(dir+'/verification.json',JSON.stringify(result,null,2));for(const actor of actors)await actor.context.close();await browser.close();for(const client of [...game.room.clients])client.res.end();game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));console.log(JSON.stringify(result,null,2));
}

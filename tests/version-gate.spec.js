import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';
import {GAME_VERSION,PROTOCOL_VERSION,UPDATE_REQUIRED_CODE} from '../shared/protocol.js';
const nextVersion=GAME_VERSION.replace(/\d+$/,value=>String(Number(value)+1));
async function setup(version=GAME_VERSION){
 const dataDir=mkdtempSync(path.join(tmpdir(),'magic-version-browser-'));
 let game=createGameServer({dataDir,gameVersion:version});
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 const port=game.server.address().port,local=createLocalClient({serverUrl:`http://127.0.0.1:${port}`});
 await new Promise(resolve=>local.server.listen(0,'127.0.0.1',resolve));
 const stop=async server=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));};
 return {get game(){return game;},base:`http://127.0.0.1:${local.server.address().port}`,
  async upgrade(){for(const c of game.room.clients)c.res.end();await stop(game.server);game=createGameServer({dataDir,gameVersion:nextVersion});await new Promise(resolve=>game.server.listen(port,'127.0.0.1',resolve));},
  async close(){for(const c of game.room.clients)c.res.end();await stop(local.server);await stop(game.server);},
 };
}
async function login(page,base){
 await page.goto(base);await page.locator('#accountName').fill('版本验收'+Date.now());await page.locator('#accountPassword').fill('version-test-password');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected&&__game.sim.player);
}
test('启动版本不一致：桌面与窄屏展示强制更新页，不提供注册或战场入口',async({browser})=>{
 const service=await setup(nextVersion),contexts=[],errors=[];
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1100}});contexts.push(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(service.base);await expect(page).toHaveTitle(/魔法王座/);await expect(page.locator('#updateRequired')).toBeVisible();
   await expect(page.locator('#updateRequired')).toContainText('请更新客户端');await expect(page.locator('#currentVersion')).toHaveText(GAME_VERSION);await expect(page.locator('#requiredVersion')).toHaveText(nextVersion);
   await expect(page.locator('#authForm')).toHaveCount(0);await expect(page.locator('canvas')).toHaveCount(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`version-required-${mobile?'mobile':'desktop'}.png`),fullPage:true});
  }
  expect(service.game.accounts.rows).toHaveLength(0);expect(service.game.room.clients.size).toBe(0);expect(errors).toEqual([]);
 }finally{for(const c of contexts)await c.close();await service.close();}
});
test('服务器提升战斗兼容版本：客户端重连后转更新页并停止重试与操作',async({browser})=>{
 const service=await setup(),context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await login(page,service.base);await service.upgrade();
  await expect(page.locator('#updateRequired')).toBeVisible({timeout:15000});await expect(page.locator('#requiredVersion')).toHaveText(nextVersion);await expect(page.locator('canvas')).toHaveCount(0);
  const checked=[];service.game.server.on('request',req=>checked.push(req.url));
  await page.waitForTimeout(3500);expect(checked).toEqual([]);expect(service.game.room.clients.size).toBe(0);expect(await page.evaluate(()=>window.__game.network.connected)).toBe(false);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,'version-required-after-upgrade.png'),fullPage:true});expect(errors).toEqual([]);
 }finally{await context.close();await service.close();}
});

test('兼容版本不变：发布与诊断标识变化后可重连并继续操作，不显示更新页',async({browser})=>{
 const service=await setup(),context=await browser.newContext(),page=await context.newPage();
 try{
  let revision='original-build';
  await page.route('**/api/version',route=>route.fulfill({json:{gameVersion:GAME_VERSION,protocolVersion:PROTOCOL_VERSION,revision,buildId:revision}}));
  await login(page,service.base);
  const previous=[...service.game.room.clients];expect(previous).toHaveLength(1);
  revision='ui-art-and-server-maintenance';
  for(const client of previous)client.res.end();
  await expect.poll(()=>[...service.game.room.clients].some(client=>!previous.includes(client)),{timeout:15000}).toBe(true);
  await page.waitForFunction(()=>window.__game?.network.connected);
  await expect(page.locator('#updateRequired')).toHaveCount(0);
  const stamina=service.game.room.sim.players.find(p=>p.accountId).stamina;
  await page.locator('#addStamina').click();
  await expect.poll(()=>service.game.room.sim.players.find(p=>p.accountId).stamina).toBe(stamina+100);
 }finally{await context.close();await service.close();}
});
test('操作收到版本拒绝：显示更新页，不继续操作或出现界面异常',async({browser})=>{
 const service=await setup(),context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await login(page,service.base);
  let calls=0;await page.route('**/api/action',async route=>{if(++calls>1)await new Promise(resolve=>setTimeout(resolve,200));await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:UPDATE_REQUIRED_CODE,error:'请更新客户端',requiredVersion:nextVersion,protocolVersion:PROTOCOL_VERSION})});});
  await page.evaluate(()=>{document.querySelector('#addStamina').click();document.querySelector('#applyBots').click();});await expect(page.locator('#updateRequired')).toBeVisible();await expect(page.locator('#requiredVersion')).toHaveText(nextVersion);
  await page.waitForTimeout(350);
  await expect(page.locator('#addStamina')).toHaveCount(0);expect(service.game.room.sim.players.find(p=>p.accountId)?.stamina).toBe(100);expect(errors).toEqual([]);
 }finally{await context.close();await service.close();}
});

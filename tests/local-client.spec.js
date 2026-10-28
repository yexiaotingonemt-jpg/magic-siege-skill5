import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';

test('两个独立本地客户端：本地美术、远端同局、契约、刷新与断网重连',async({browser})=>{
 const game=createGameServer({dataDir:mkdtempSync(path.join(tmpdir(),'magic-split-browser-'))});
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 const remote=`http://127.0.0.1:${game.server.address().port}`,upstreamPaths=[],contexts=[],locals=[],pages=[],pageErrors=[],requests=[],badResponses=[],sseEncodings=[];
 let offlineTestStarted=false;
 game.server.on('request',req=>upstreamPaths.push(req.url));
 try{
  for(const side of [0,1]){
   const local=createLocalClient({serverUrl:remote});locals.push(local);
   await new Promise(resolve=>local.server.listen(0,'127.0.0.1',resolve));
   const context=await browser.newContext({viewport:side?{width:390,height:844}:{width:1440,height:1100}});contexts.push(context);
   const page=await context.newPage();pages.push(page);
   page.on('pageerror',e=>pageErrors.push(e.message));
   page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('401 (Unauthorized)')&&!(offlineTestStarted&&message.text().includes('ERR_INTERNET_DISCONNECTED')))pageErrors.push(message.text());});
   page.on('request',r=>requests.push(r.url()));
   page.on('response',r=>{if(new URL(r.url()).pathname==='/api/events'&&r.status()===200)sseEncodings.push(r.headers()['content-encoding']);if(r.status()>=400&&!r.url().endsWith('/api/me'))badResponses.push({url:r.url(),status:r.status()});});
   const base=`http://127.0.0.1:${local.server.address().port}`;
   await page.goto(base);await expect(page).toHaveTitle(/魔法王座/);await expect(page.locator('#authForm')).toBeVisible();
   await page.locator('#tabRegister').click();await page.locator('#accountName').fill('独立客户端'+side+Date.now());await page.locator('#accountPassword').fill('local-client-password');
   await page.locator(`[name="side"][value="${side}"]`).check();await page.locator('#authSubmit').click();
   await page.waitForFunction(()=>window.__game?.renderer.getCamera());await expect(page.locator('#connection')).toHaveText('已同步');
   await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`local-client-${side?'mobile':'desktop'}.png`),fullPage:true});
  }
  const [a,b]=pages;
  expect(await a.evaluate(()=>__game.sim.matchId)).toBe(await b.evaluate(()=>__game.sim.matchId));
  await a.locator('#pause').click();await b.waitForFunction(()=>__game.sim.paused);
  for(const page of pages){
   await page.evaluate(()=>{const s=__game.sim,u=s.units.find(u=>u.side===s.player.side&&!u.hero&&u.type==='melee');__game.selection.select(u.id);});
   await expect(page.locator('#contractPopover')).toBeVisible();await page.locator('#confirmContract').click();await page.waitForFunction(()=>!!__game.sim.hero());
  }
  await a.waitForFunction(()=>__game.sim.units.filter(u=>u.hero).length===2);
  const identity=await b.evaluate(()=>({hero:__game.sim.hero().id,player:__game.sim.player.id}));
  await b.reload();await b.waitForFunction(()=>window.__game?.sim.hero());expect(await b.evaluate(()=>({hero:__game.sim.hero().id,player:__game.sim.player.id}))).toEqual(identity);
  offlineTestStarted=true;await contexts[1].setOffline(true);await expect(b.locator('#connection')).toContainText('重连');await contexts[1].setOffline(false);await expect(b.locator('#connection')).toHaveText('已同步',{timeout:15000});
  for(const [side,page]of pages.entries())await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`local-client-contract-${side}.png`),fullPage:true});
  expect(upstreamPaths.every(p=>p.startsWith('/api/'))).toBe(true);
  expect(requests.every(u=>locals.some(c=>new URL(u).origin===`http://127.0.0.1:${c.server.address().port}`))).toBe(true);
  expect(requests.some(u=>u.includes('/art/'))).toBe(true);expect(badResponses).toEqual([]);expect(pageErrors).toEqual([]);
  expect(sseEncodings.length).toBeGreaterThanOrEqual(3);expect(sseEncodings.every(value=>value==='gzip')).toBe(true);
  // Stopping the remote API must not remove the locally installed login screen or art.
  for(const c of game.room.clients)c.res.end();game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));
  // Fetch an actual installed art URL after the remote server stops.
  const art=requests.find(u=>u.includes('/art/')&&u.startsWith(`http://127.0.0.1:${locals[0].server.address().port}`));
  expect((await pages[0].request.get(art)).status()).toBe(200);
 }finally{
  for(const context of contexts)await context.close();
  for(const c of game.room.clients)c.res.end();
  for(const server of [...locals.map(c=>c.server),game.server]){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 }
});

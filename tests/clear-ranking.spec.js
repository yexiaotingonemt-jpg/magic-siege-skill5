import {test,expect} from '@playwright/test';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';

for(const viewport of [{width:1440,height:1100},{width:390,height:844}])test(`清除排行榜：确认取消、双端同步和权限 ${viewport.width}`,async({browser})=>{
 const dataDir=mkdtempSync(path.join(tmpdir(),'clear-ranking-')),game=await createBrowserGame({dataDir}),{room,server}=game;room.paused=true;
 const host=await game.accounts.register({name:'排行房主',password:'ranking-test-password',side:0});
 const admin=await game.accounts.register({name:'排行超级',password:'ranking-test-password',side:0});
 writeFileSync(path.join(dataDir,'super-accounts.json'),JSON.stringify([admin.id]));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const contexts=await Promise.all([browser.newContext({viewport}),browser.newContext({viewport})]);
 const [page,other]=await Promise.all(contexts.map(c=>c.newPage())),errors=[];
 for(const p of [page,other])p.on('pageerror',e=>errors.push(e.message));
 const sync=async()=>{room.sequence++;room.broadcast();for(const p of [page,other])await p.waitForFunction(n=>window.__game?.sim.sequence>=n,room.sequence);};
 const login=async(p,name)=>{await p.goto(`http://127.0.0.1:${server.address().port}`);await p.locator('#accountName').fill(name);await p.locator('#accountPassword').fill('ranking-test-password');await p.locator('#authSubmit').click();await p.waitForFunction(()=>window.__game?.renderer.getCamera());};
 try{
  await login(page,admin.name);await login(other,host.name);
  await expect(page).toHaveTitle(/魔法王座/);await expect(page.locator('#clearRanking')).toBeVisible();await expect(other.locator('#clearRanking')).toBeHidden();
  const player=room.player(admin),s=room.sim;expect(s.contract(player,s.spawn(0,'melee',0,1).id)).toBe(true);const hero=s.hero(player);s.stat(hero,'heroDamage',2500);
  const offline=room.player({id:'offline',name:'离线排行',side:1});offline.totalPoints=900;offline.staminaSpent=9;await sync();
  const prior={points:player.totalPoints,stamina:player.stamina,heroId:player.heroId,matchId:room.matchId};
  expect(await other.evaluate(()=>__game.network.send('clearRanking',{isSuperAdmin:true}))).toBe(false);expect(player.totalPoints).toBe(prior.points);
  page.once('dialog',async dialog=>{expect(dialog.message()).toContain('所有玩家');await dialog.dismiss();});await page.locator('#clearRanking').click();expect(player.totalPoints).toBe(prior.points);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#clearRanking').click();await expect(page.locator('#rankingNotice')).toContainText('从现在重新累计');
  for(const p of [page,other]){
   await expect(p.locator('#score')).toHaveText('0.0');
   await p.waitForFunction(()=>__game.sim.players.every(p=>p.totalPoints===0&&p.staminaSpent===0));
   for(const cell of await p.locator('#battleRanking tbody td:nth-child(2)').all())await expect(cell).toHaveText('0');
   await p.locator('[data-nav="ranking"]').click();await expect(p.locator('#ranking')).toBeVisible();await expect(p.locator('#ranking')).toContainText('离线排行');await p.locator('#sheetClose').click();
  }
  expect(player.stamina).toBe(prior.stamina);expect(player.heroId).toBe(prior.heroId);expect(room.matchId).toBe(prior.matchId);expect(room.paused).toBe(true);
  await page.locator('.battle-ranking').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`clear-ranking-${viewport.width}.png`),fullPage:true});
  s.stat(hero,'heroDamage',1000);await sync();expect(player.totalPoints).toBeGreaterThan(0);expect(player.totalPoints).toBeLessThan(prior.points);
  for(const p of [page,other])expect(await p.evaluate(()=>__game.sim.players.find(p=>p.name==='排行超级').totalPoints)).toBe(player.totalPoints);
  await page.reload();await page.waitForFunction(()=>window.__game?.renderer.getCamera());await expect(page.locator('#clearRanking')).toBeVisible();
  writeFileSync(path.join(dataDir,'super-accounts.json'),'[]');expect(await page.evaluate(()=>__game.network.send('clearRanking'))).toBe(false);expect(player.totalPoints).toBeGreaterThan(0);
  await expect(page.locator('#clearRanking')).toBeHidden({timeout:18000});await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);
 }finally{await Promise.all(contexts.map(c=>c.close()));for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

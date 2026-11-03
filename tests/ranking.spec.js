import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {formatRankingNumber} from '../client/src/contribution-ranking.js';

// Register -> live combat contribution changes -> board order and KDA update -> full ranking.
for(const viewport of [{width:1440,height:1100},{width:1264,height:935},{width:1024,height:900},{width:390,height:844}])test(`实时总积分排行与KDA ${viewport.width}`,async({browser})=>{
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'kc-ranking-'))}),{room,server}=game,s=room.sim;room.paused=true;
 // Isolate the two ranking fixtures from automatic NPC contributions.
 s.npcPolicy={mode:'off',defense:1,attack:3};s.resetMap();for(const p of s.players)if(p.bot)p.retired=true;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error'&&!(msg.location().url.endsWith('/api/me')&&msg.text().includes('401')))errors.push(msg.text());});
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>window.__game?.sim.sequence>=n,room.sequence);};
 try{
  const url='http://127.0.0.1:'+server.address().port;await page.goto(url);await expect(page).toHaveTitle(/魔法王座/);expect(page.url()).toBe(url+'/');await page.locator('#tabRegister').click();await page.locator('#accountName').fill('排行测试'+viewport.width);await page.locator('#accountPassword').fill('ranking-test-password');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  await expect(page.locator('#battleRanking')).toBeVisible();await expect(page.locator('#battleRanking tbody tr')).toHaveCount(1);await expect(page.locator('#battleRanking tbody td').last()).toHaveText('0');
  const p=room.player(game.accounts.rows.at(-1)),other=room.player({id:'rank-other',name:'对手',side:1});other.totalPoints=800;other.staminaSpent=10;
  const u=s.spawn(0,'melee',0,1);expect(s.contract(p,u.id)).toBe(true);s.stat(s.hero(p),'heroDamage',2500);await sync();await expect(page.locator('#battleRanking tbody tr').first()).toContainText('对手');await expect(page.locator('#battleRanking tbody tr').last()).toContainText(formatRankingNumber(s.contribution(p).kda));
  s.stat(s.hero(p),'heroAssists',5);await sync();await expect(page.locator('#battleRanking tbody tr').first()).toContainText('排行测试');await expect(page.locator('#score')).toHaveText(p.totalPoints.toFixed(1));await expect(page.locator('#battleRanking tbody tr').first()).toContainText(formatRankingNumber(s.contribution(p).kda));
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);const board=await page.locator('.battle-ranking').boundingBox(),gameBounds=await page.locator('#gameViewport').boundingBox(),layout=await page.locator('.layout').boundingBox(),clientWidth=await page.evaluate(()=>document.documentElement.clientWidth);
  await expect(page.locator('.game .battle-ranking')).toHaveCount(0);
  expect(Math.abs(layout.x+layout.width/2-clientWidth/2)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(clientWidth);
  if(viewport.width>=700){expect(board.x+board.width).toBeLessThanOrEqual(gameBounds.x);expect(Math.abs(board.y-gameBounds.y)).toBeLessThanOrEqual(1);}
  else expect(board.y).toBeGreaterThanOrEqual(gameBounds.y+gameBounds.height);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`ranking-battle-${viewport.width}.png`)});
  await expect(page.locator('.battle-ranking summary')).toHaveCount(0);await page.locator('.battle-ranking-heading').click();await expect(page.locator('#battleRanking')).toBeVisible();await expect(page.locator('[data-nav]')).toHaveCount(3);await expect(page.locator('[data-nav=reports],#reports,[data-sheet-section=reports]')).toHaveCount(0);
  await page.locator('[data-nav="ranking"]').click();await expect(page.locator('#ranking')).toBeVisible();await expect(page.locator('#ranking tbody tr').first()).toContainText(formatRankingNumber(p.totalPoints));await expect(page.locator('#ranking')).toContainText('KDA');await expect(page.locator('.ranking-rule')).toContainText('max（累计消耗体力，21）');await page.locator('#sheetClose').click();await expect(page.locator('#battleRanking')).toBeVisible();
  s.settle(s.hero(p),'积分校验');await sync();await expect(page.locator('#battleRanking')).toBeVisible();await expect(page.locator('#battleRanking tbody tr').first()).toContainText(formatRankingNumber(p.totalPoints));
  // Large values stay separate and sort by raw score even when labels round alike.
  p.totalPoints=622174.8;p.staminaSpent=100;other.totalPoints=1234567;other.staminaSpent=100;
  const boundary=room.player({id:'rank-boundary',name:'game_admin',side:1});boundary.totalPoints=999999.6;boundary.staminaSpent=100;
  await sync();
  await expect(page.locator('#battleRanking tbody tr').first()).toContainText('1M');
  await expect(page.locator('#battleRanking tbody tr').nth(1)).toContainText('game_admin');
  await expect(page.locator('#battleRanking tbody tr').nth(1).locator('td').first()).toHaveText('1M');
  await expect(page.locator('#battleRanking .rank-self td').first()).toHaveText('622K');
  const cells=await page.locator('#battleRanking td').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,client:n.clientWidth,scroll:n.scrollWidth})));
  expect(cells.every(c=>c.scroll<=c.client&&!c.text.includes('.'))).toBe(true);
  if(viewport.width>=1040)expect(board.width).toBeGreaterThanOrEqual(300);
  else if(viewport.width>=700)expect(board.width).toBeGreaterThanOrEqual(240);
  await page.locator('.battle-ranking').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`ranking-compact-${viewport.width}.png`),fullPage:true});
  await page.locator('.battle-ranking').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`ranking-panel-${viewport.width}.png`)});
  await page.locator('[data-nav="ranking"]').click();
  await expect(page.locator('#ranking .rank-self td').first()).toHaveText('622K');
  await page.locator('#sheetClose').click();
  expect(errors).toEqual([]);
 }finally{await context.close();for(const client of room.clients)client.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

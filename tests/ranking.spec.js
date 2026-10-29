import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';

// Register -> live combat contribution changes -> board order and KDA update -> full ranking.
for(const viewport of [{width:1440,height:1100},{width:390,height:844}])test(`实时总积分排行与KDA ${viewport.width}`,async({browser})=>{
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'kc-ranking-'))}),{room,server}=game,s=room.sim;room.step=()=>{};room.paused=true;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error'&&!(msg.location().url.endsWith('/api/me')&&msg.text().includes('401')))errors.push(msg.text());});
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>window.__game?.sim.sequence>=n,room.sequence);};
 try{
  const url='http://127.0.0.1:'+server.address().port;await page.goto(url);await expect(page).toHaveTitle(/魔法王座/);expect(page.url()).toBe(url+'/');await page.locator('#tabRegister').click();await page.locator('#accountName').fill('排行测试'+viewport.width);await page.locator('#accountPassword').fill('ranking-test-password');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  await expect(page.locator('#battleRanking')).toBeVisible();await expect(page.locator('#battleRanking tbody tr')).toHaveCount(1);await expect(page.locator('#battleRanking tbody td').last()).toHaveText('—');
  const p=room.player(game.accounts.rows.at(-1)),other=room.player({id:'rank-other',name:'对手',side:1});other.totalPoints=500;other.staminaSpent=10;
  const u=s.spawn(0,'melee',0,1);expect(s.contract(p,u.id)).toBe(true);s.stat(s.hero(p),'heroDamage',2500);await sync();await expect(page.locator('#battleRanking tbody tr').first()).toContainText('对手');await expect(page.locator('#battleRanking tbody tr').last()).toContainText('150.56');
  s.stat(s.hero(p),'heroAssists',5);await sync();await expect(page.locator('#battleRanking tbody tr').first()).toContainText('排行测试');await expect(page.locator('#score')).toHaveText('951.7');await expect(page.locator('#battleRanking tbody tr').first()).toContainText('317.23');
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);const board=await page.locator('.battle-ranking').boundingBox(),battle=await page.locator('.battle-wrap').boundingBox();expect(board.x).toBeGreaterThanOrEqual(battle.x);expect(board.x+board.width).toBeLessThanOrEqual(battle.x+battle.width);expect(board.y+board.height).toBeLessThanOrEqual(battle.y+battle.height);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`ranking-battle-${viewport.width}.png`)});
  await expect(page.locator('.battle-ranking summary')).toHaveCount(0);await page.locator('.battle-ranking-heading').click();await expect(page.locator('#battleRanking')).toBeVisible();await expect(page.locator('[data-nav]')).toHaveCount(3);await expect(page.locator('[data-nav=reports],#reports,[data-sheet-section=reports]')).toHaveCount(0);
  await page.locator('[data-nav="ranking"]').click();await expect(page.locator('#ranking')).toBeVisible();await expect(page.locator('#ranking tbody tr').first()).toContainText('951.7');await expect(page.locator('#ranking')).toContainText('KDA');await expect(page.locator('.ranking-rule')).toContainText('契约＋施法');await page.locator('#sheetClose').click();await expect(page.locator('#battleRanking')).toBeVisible();
  s.settle(s.hero(p),'积分校验');await sync();await expect(page.locator('#battleRanking')).toBeVisible();await expect(page.locator('#battleRanking tbody tr').first()).toContainText('951.7');
  expect(errors).toEqual([]);
 }finally{await context.close();for(const client of room.clients)client.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

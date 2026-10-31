import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';

for(const width of [1440,390])test(`保留线上贡献排行 ${width}：左侧常驻排行、总积分与KDA`,async({page})=>{
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'magic-ranking-'))});game.room.paused=true;await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
 try{
  await page.setViewportSize({width,height:1100});await page.goto('http://127.0.0.1:'+game.server.address().port);await page.locator('#tabRegister').click();await page.locator('#accountName').fill('贡献验证'+Date.now());await page.locator('#accountPassword').fill('isolated-contribution');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected);
  const p=game.room.player(game.accounts.rows[0]),s=game.room.sim;await expect(page.locator('#battleRanking')).toContainText('—');s.contract(p,s.units.find(u=>u.side===0&&!u.hero&&u.type==='melee').id);s.stat(s.hero(p),'heroDamage',2500);game.room.sequence++;game.room.broadcast();
  await expect(page.locator('#score')).toHaveText('451.7');await expect(page.locator('#battleRanking')).toContainText('150.56');await expect(page.locator('.battle-ranking summary')).toHaveCount(0);await page.locator('.battle-ranking-heading').click();await expect(page.locator('#battleRanking')).toBeVisible();
  await page.locator('[data-nav="ranking"]').click();await expect(page.locator('#ranking')).toContainText('451.7');await expect(page.locator('#ranking')).toContainText('150.56');await expect(page.locator('.ranking-rule')).toContainText('契约＋施法');
 }finally{await page.close();for(const c of game.room.clients)c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));}
});

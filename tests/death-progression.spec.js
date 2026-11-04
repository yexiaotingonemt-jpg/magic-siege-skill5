import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';
import {contractType} from '../shared/config.js';
import {levelKdaReference} from '../shared/contract-rating-reference.js';

for(const width of [1440,390])test(`阵亡后强化与本次KDA评价 ${width}`,async({page})=>{
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;
 const game=await createBrowserGame({room,dataDir:mkdtempSync(path.join(tmpdir(),'death-progression-'))});
 const account=await game.accounts.register({name:'阵亡强化'+width,password:'death-progression-test',side:0});
 const s=room.sim,p=room.player(account);p.stamina=10000;
 const recruit=()=>{const u=s.spawn(0,contractType(p.classId),0,1);expect(s.contract(p,u.id)).toBe(true);return s.hero(p);};
 const sync=()=>{room.sequence++;room.broadcast();};
 const h=recruit();s.addXp(p,s.expNeeded(p)-p.xp);s.addXp(p,s.expNeeded(p)-p.xp);
 const expectedKda=levelKdaReference(p.level)*1.25;s.stat(h,'heroDamage',expectedKda*21/s.config.design.scoreCoefficients[p.classId].a);
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.setViewportSize({width,height:width===390?844:1100});await page.goto(`http://127.0.0.1:${game.server.address().port}`);
  await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('death-progression-test');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.network.connected);
  await expect(page.locator('#traitPending')).toBeDisabled();await expect(page.locator('#traitPending')).toContainText('阵亡后强化');await expect(page.locator('[data-trait-count]')).toHaveText('2');
  await expect(page.locator('#traitDraft')).toBeHidden();await expect(page.locator('#contractResult')).toBeHidden();
  const c=p.progress[p.classId].choices[0];expect(room.command(account,{type:'chooseTrait',args:{traitId:c.options[0],level:c.level,classId:p.classId}}).ok).toBe(false);
  h.hp=0;s.die(h);sync();
  await expect(page.locator('#traitPending')).toBeEnabled();await expect(page.locator('#contractResult')).toContainText(`KDA ${expectedKda.toFixed(2)} · Lv.${p.level} · A 优秀 · 同级达成 125%`);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`death-result-${width}.png`),fullPage:true});
  await page.locator('#traitPending').click();await expect(page.locator('#traitDraft')).toBeVisible();await page.locator('[data-trait]').first().click();await expect(page.locator('[data-trait-count]')).toHaveText('1');
  await page.locator('[data-defer]').click();await page.reload();await page.waitForFunction(()=>window.__game?.network.connected);await expect(page.locator('#traitPending')).toBeEnabled();await expect(page.locator('#traitDraft')).toBeHidden();
  const next=recruit();sync();await expect(page.locator('#traitPending')).toBeDisabled();await expect(page.locator('#contractResult')).toBeHidden();
  next.hp=0;s.die(next);sync();await page.locator('#traitPending').click();await page.locator('[data-trait]').first().click();await expect(page.locator('#traitPending')).toBeHidden();
  await page.locator('[data-nav="ranking"]').click();await page.locator(`#ranking [data-ranking-player="${p.id}"]`).click();await expect(page.locator('.contract-entry')).toHaveCount(2);
  await expect(page.locator('.contract-entry').last()).toContainText('A · 优秀');await expect(page.locator('.contract-entry').last()).toContainText('同等级基准 KDA');await expect(page.locator('.contract-entry').last()).toContainText('达成 125%');await expect(page.locator('.contract-entry').first()).toContainText('D · 待提升');
  await page.locator('.contract-entry').last().locator('summary').click();await expect(page.locator('#contractHistoryBody')).toContainText('S 卓越 ≥ 150%');
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`death-rating-history-${width}.png`),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(errors).toEqual([]);
 }finally{await page.close();for(const c of room.clients)c.res.end();game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));}
});

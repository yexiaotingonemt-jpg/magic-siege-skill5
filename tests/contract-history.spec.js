import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';
import {contractType} from '../shared/config.js';
for(const width of [1440,390])test(`排行榜折叠与逐次契约详情 ${width}`,async({browser})=>{
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;
 const game=await createBrowserGame({room,dataDir:mkdtempSync(path.join(tmpdir(),'ranking-history-ui-'))}),{server}=game,s=room.sim;
 const account=await game.accounts.register({name:'历史查看者',password:'contract-history-test',side:0});
 const npc=s.makePlayer(0,true);npc.name='契约者9';npc.stamina=10000;
 function recruit(id){npc.classId=id;expect(s.contract(npc,s.spawn(0,contractType(id),0,1).id)).toBe(true);return s.hero(npc);}
 for(let i=0;i<22;i++){const h=recruit(i%2?4:2);s.stat(h,'heroDamage',1000+i);s.time+=5;s.die(h,null);s.units=s.units.filter(u=>u.hp>0);}
 const current=recruit(4);s.stat(current,'heroDamage',2000);for(let i=1;i<=8;i++){const p=s.makePlayer(i===1?1:0,true);p.name='契约者'+i;p.classId=i===1?3:i%2?2:4;p.stamina=100;expect(s.contract(p,s.spawn(p.side,contractType(p.classId),0,1).id)).toBe(true);s.stat(s.hero(p),'heroDamage',500*i);}
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const context=await browser.newContext({viewport:{width,height:width===390?844:1100}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let historyRequests=0;page.on('request',r=>{if(r.url().includes('/api/contract-history'))historyRequests++;});
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);};
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('contract-history-test');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  const link=page.locator(`#battleRanking [data-ranking-player="${npc.id}"]`);await expect(link).toHaveText('契约者9');await expect(page.locator('#battleRanking small')).toHaveCount(0);await expect(link).toHaveCSS('text-decoration-line','underline');expect(historyRequests).toBe(0);
  await page.locator('.battle-ranking').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`ranking-collapsed-${width}.png`),fullPage:true});
  await link.click();await expect(page.locator('#sheetTitle')).toHaveText('契约记录');await expect(page.locator('#contractPlayerMeta')).toContainText('进攻 · 火焰法师 · 机器人');await expect(page.locator('#contractHistoryStatus')).toContainText('本局共23次');await expect(page.locator('.contract-entry')).toHaveCount(20);await expect(page.locator('.contract-entry').first()).toContainText('第23次');await expect(page.locator('.contract-entry').first()).toContainText('进行中');
  const detail=page.locator('.contract-entry').first().locator('details');await detail.locator('summary').click();await expect(detail).toHaveAttribute('open','');await expect(detail).toContainText('有效伤害');
  await page.locator('.sheet-panel').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`ranking-history-${width}.png`)});
  s.stat(current,'heroDamage',1000);await sync();await expect(page.locator('.contract-entry').first().locator('details tbody tr').first()).toContainText('3000.0',{timeout:7000});await expect(page.locator('.contract-entry').first().locator('details')).toHaveAttribute('open','');
  await page.locator('#contractHistoryMore').click();await expect(page.locator('.contract-entry')).toHaveCount(23);await expect(page.locator('.contract-entry').last()).toContainText('第1次');await expect(page.locator('#contractHistoryMore')).toBeHidden();await expect(page.locator('.contract-entry').nth(1)).toContainText('火焰法师');await expect(page.locator('.contract-entry').nth(2)).toContainText('符文战车');
  await page.keyboard.press('Escape');await expect(page.locator('#gameSheet')).toBeHidden();await expect(link).toBeFocused();s.stat(current,'heroDamage',100);await sync();await expect(link).toBeFocused();
  const atClose=historyRequests;await page.waitForTimeout(3200);await sync();expect(historyRequests).toBe(atClose);
  await page.locator('[data-nav="ranking"]').click();await page.locator(`#ranking [data-ranking-player="${room.player(account).id}"]`).click();await expect(page.locator('#contractHistoryBody')).toContainText('尚无契约记录');await expect(page.locator('#contractPlayerName')).toHaveText(account.name);
  await page.locator('#contractHistoryBack').click();await expect(page.locator('#ranking')).toBeVisible();await page.locator(`#ranking [data-ranking-player="${npc.id}"]`).click();await expect(page.locator('#contractPlayerName')).toHaveText('契约者9');
  room.restartMatch();await sync();await expect(page.locator('#contractHistoryStatus')).toHaveText('战局已更新，请重新选择玩家');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(errors).toEqual([]);await expect(page.locator('vite-error-overlay')).toHaveCount(0);
 }finally{await context.close();for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

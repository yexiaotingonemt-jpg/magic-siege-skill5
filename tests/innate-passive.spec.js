import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';
import {defaults,contractType} from '../shared/config.js';
import {createCurrentDesignConfig} from '../shared/current-design.js';

for(const width of [1440,390])for(const id of [0,4,5,2,3])test(`职业自带被动独立入口 ${id} / ${width}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!(m.location().url.endsWith('/api/me')&&m.text().includes('401')))errors.push(m.text());});
 const room=new Room(createCurrentDesignConfig(defaults),{mode:'off',defense:1,attack:3});room.paused=true;
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(process.env.MAGIC_QA_DIR||tmpdir(),'innate-passive-')),room}),{server}=game;
 const account=await game.accounts.register({name:'被动检查'+id,password:'passive-test-password',side:id===3?1:0}),s=room.sim,p=room.player(account);p.classId=id;
 expect(s.contract(p,s.spawn(p.side,contractType(id),0,1).id)).toBe(true);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  await page.setViewportSize({width,height:width===390?844:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);await expect(page).toHaveTitle(/魔法王座/);
  await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('passive-test-password');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  await page.locator('[data-hero-open="passive"]').click();await expect(page.locator('#sheetTitle')).toHaveText('职业被动');
  const panel=page.locator('[data-ability-view="passive"]');await expect(panel).toBeVisible();await expect(panel).toContainText('契约后自动生效');await expect(panel).not.toContainText('未启用');
  await expect(panel).toContainText({0:'每损失10%生命',4:'每层攻速提高5%',5:'派生效果不递归',2:'合计效果再均分',3:'累计3名小兵'}[id]);
  const h=s.hero(p);if(id===0||id===4||id===3){h.hp=h.maxHp/2;if(id===4)s.addHeat(h,3);if(id===3)h.minionKills=2;room.sequence++;room.broadcast();await expect(panel.locator('.passive-status')).toContainText({0:'被动减伤12.5%',4:'当前炙热4/10层',3:'小兵击杀进度2/3'}[id]);}
  await page.locator('.sheet-panel').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`passive-${id}-${width}.png`)});
  await page.keyboard.press('Escape');await expect(page.locator('[data-hero-open="passive"]')).toBeFocused();
  await page.locator('[data-nav="hero"]').click();await expect(page.locator('[data-skill-detail]:visible')).toHaveCount(4);await expect(panel).toBeHidden();
  await expect(page.locator('.hero-detail-tabs,[data-hero-view]')).toHaveCount(0);
  await page.keyboard.press('Escape');await page.locator('[data-hero-open="passive"]').click();await expect(panel).toBeVisible();await expect(page.locator('[data-skill-detail]:visible')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);
 }finally{await page.close();for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

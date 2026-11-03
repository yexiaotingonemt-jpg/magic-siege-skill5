import {test,expect} from '@playwright/test';
import {mkdtempSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';
import {names,legacyLiveConfig} from '../shared/config.js';
import {Room} from '../server/room.mjs';

for(const viewport of [{width:1440,height:1100},{width:390,height:844}])test(`技能单项说明、升级状态、属性和通用效果 ${viewport.width}`,async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&!(message.location().url.endsWith('/api/me')&&message.text().includes('401')))errors.push(message.text());});
 const game=createGameServer({dataDir:mkdtempSync(path.join(process.env.MAGIC_QA_DIR||tmpdir(),'inspection-')),room:new Room(legacyLiveConfig())});
 game.room.paused=true;await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
 const client=createLocalClient({serverUrl:`http://127.0.0.1:${game.server.address().port}`,...(process.env.MAGIC_INSPECTION_DIST?{distDir:process.env.MAGIC_INSPECTION_DIST}:{})});
 await new Promise(r=>client.server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${client.server.address().port}`;
 const sync=()=>{game.room.sequence++;game.room.broadcast();};
 const out=path.join(process.env.MAGIC_QA_DIR||tmpdir(),'hero-inspection');mkdirSync(out,{recursive:true});
 try{
  await page.setViewportSize(viewport);await page.goto(base);
  expect(page.url()).toBe(base+'/');await expect(page).toHaveTitle(/魔法王座/);
  await page.locator('#tabRegister').click();await page.locator('#accountName').fill('详情测试'+viewport.width);await page.locator('#accountPassword').fill('inspection-test');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.network.connected);
  const s=game.room.sim,p=game.room.player(game.accounts.rows[0]);s.setClass(4,p);
  while(p.level<8)s.addXp(p,s.expNeeded(p)-p.xp);
  p.progress[4].traits={F01:2,F09:1,F17:1,FG01:2};
  s.contract(p,s.units.find(u=>u.side===0&&u.type==='ranged'&&!u.hero).id);sync();
  await expect(page.locator('#heroName')).toContainText('火焰法师 Lv.8');
  await page.locator('.hero-hud').screenshot({path:path.join(out,`hud-${viewport.width}.png`)});
  const body=page.locator('#heroAbilityBody');
  for(let i=0;i<4;i++){
   await page.locator(`[data-info="${i}"]`).click();
   await expect(page.locator('#sheetTitle')).toHaveText(names[4][i]);
   await expect(page.locator('.hero-detail-tabs,[data-hero-view]')).toHaveCount(0);
   await expect(body.locator('[data-hero-panel]:visible')).toHaveCount(1);
   await expect(body.locator('[data-skill-detail]:visible')).toHaveCount(1);
   const card=body.locator(`[data-skill-detail="${i}"]`);
   await expect(card).toBeVisible();await expect(card.locator('[data-upgrade-id]')).toHaveCount(4);
   for(const other of names[4].filter((_,index)=>index!==i))expect(await body.innerText()).not.toContain(other);
   expect(await body.innerText()).not.toContain('通用强化');expect(await body.innerText()).not.toContain('炙热容器');
   if(i===0){
    await expect(card.locator('[data-upgrade-id="F01"]')).toContainText('已获得 2/4');
    await expect(card.locator('[data-upgrade-id="F02"]')).toContainText('未激活 0/3');
    await expect(card.locator('[data-upgrade-id="F01"] p')).toHaveCSS('color','rgb(255, 255, 255)');
    await expect(card.locator('[data-upgrade-id="F02"] p')).toHaveCSS('color','rgb(137, 148, 142)');
    await page.locator('.sheet-panel').screenshot({path:path.join(out,`skill-${viewport.width}.png`)});
    p.progress[4].traits.F02=1;sync();await expect(card.locator('[data-upgrade-id="F02"]')).toContainText('已获得 1/3');
    await expect(body.locator('[data-skill-detail]:visible')).toHaveCount(1);
   }
   await page.keyboard.press('Escape');await expect(page.locator(`[data-info="${i}"]`)).toBeFocused();
  }
  await page.locator('[data-hero-open="stats"]').click();
  await expect(page.locator('#sheetTitle')).toHaveText('基础属性');await expect(body.locator('.hero-stat-list>div')).toHaveCount(7);
  const hero=s.hero(p);await expect(body.locator('.hero-stat-list')).toContainText(String(s.attackPower(hero)));
  await page.locator('.sheet-panel').screenshot({path:path.join(out,`stats-${viewport.width}.png`)});
  await page.keyboard.press('Escape');await expect(page.locator('[data-hero-open="stats"]')).toBeFocused();
  await page.locator('[data-hero-open="common"]').click();
  await expect(body.locator('[data-ability-view="common"]')).toBeVisible();
  await expect(body.locator('[data-ability-view="common"] [data-upgrade-id]')).toHaveCount(13);
  await expect(body.locator('[data-upgrade-id="F17"]')).toContainText('已获得 1/5');
  await expect(body.locator('[data-upgrade-id="FG01"] p')).toHaveCSS('color','rgb(255, 255, 255)');
  await expect(body.locator('[data-upgrade-id="FG02"] p')).toHaveCSS('color','rgb(137, 148, 142)');
  await expect(body.locator('[data-skill-detail]:visible')).toHaveCount(0);
  await page.locator('.sheet-panel').screenshot({path:path.join(out,`common-${viewport.width}.png`)});
  await page.keyboard.press('Escape');await expect(page.locator('[data-hero-open="common"]')).toBeFocused();
  await page.locator('[data-nav="hero"]').click();await expect(body.locator('[data-skill-detail]:visible')).toHaveCount(4);
  // 每个入口只显示对应内容，详情滚动不影响外层，实时刷新保留当前位置。
  const skills=body.locator('[data-hero-panel="skills"]');
  await skills.evaluate(panel=>{panel.scrollTop=240;});expect(await skills.evaluate(panel=>panel.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('#sheetScroll').evaluate(el=>el.scrollTop)).toBe(0);
  for(const view of ['passive','stats','common']){
   await page.keyboard.press('Escape');await page.locator(`[data-hero-open="${view}"]`).click();
   await expect(body.locator('[data-hero-panel]:visible')).toHaveCount(1);
   await expect(body.locator(`[data-hero-panel="${view}"]`)).toBeVisible();
   await expect(body.locator('[data-ability-view]:visible')).toHaveCount(1);
   await expect(body.locator('[data-skill-detail]:visible')).toHaveCount(0);
   expect(await body.locator(`[data-hero-panel="${view}"]`).evaluate(panel=>panel.scrollTop)).toBe(0);
  }
  const common=body.locator('[data-hero-panel="common"]');await common.evaluate(panel=>{panel.scrollTop=120;});
  const commonScroll=await common.evaluate(panel=>panel.scrollTop);expect(commonScroll).toBeGreaterThan(0);
  p.progress[4].traits.FG02=1;sync();await expect(common.locator('[data-upgrade-id="FG02"]')).toContainText('已获得 1/10');
  expect(await common.evaluate(panel=>panel.scrollTop)).toBe(commonScroll);
  await page.keyboard.press('Escape');await page.locator('[data-info="1"]').click();
  await expect(body.locator('[data-skill-detail]:visible')).toHaveCount(1);await expect(body.locator('[data-skill-detail="1"]')).toBeVisible();
  expect(await skills.evaluate(panel=>panel.scrollTop)).toBe(0);
  await expect(body.locator('[data-ability-view="common"]')).toBeHidden();
  expect(p.progress[4].traits.F01).toBe(2);expect(s.metrics.casts).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);
 }finally{
  await page.close();for(const c of [...game.room.clients])c.res.end();client.server.closeAllConnections();game.server.closeAllConnections();
  await Promise.all([new Promise(r=>client.server.close(r)),new Promise(r=>game.server.close(r))]);
 }
});

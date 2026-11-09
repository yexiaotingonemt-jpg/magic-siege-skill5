import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {unitBarOffset} from '../client/src/art-catalog.js';

for(const viewport of [{width:1440,height:1100},{width:390,height:844}])test(`周围目标分页、锁定与契约 ${viewport.width}`,async({browser})=>{
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'nearby-targets-'))}),{room,server}=game,s=room.sim;
 room.step=()=>{};room.paused=true;await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!(m.location().url.endsWith('/api/me')&&m.text().includes('401')))errors.push(m.text());});
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>window.__game?.sim.sequence>=n,room.sequence);};
 const clickUnit=async u=>{const point=await page.evaluate(({id,offset})=>{const p=__game.renderer.screenPoint(__game.sim.get(id)),r=__game.renderer.game.canvas.getBoundingClientRect();return {x:r.left+p.x/500*r.width,y:r.top+(p.y-offset+2)/__game.renderer.game.scale.gameSize.height*r.height};},{id:u.id,offset:unitBarOffset(u)});await page.mouse.click(point.x,point.y);};
 const tab=id=>page.locator(`[data-inspect-unit="${id}"]`);
 try{
  const url=`http://127.0.0.1:${server.address().port}`;await page.goto(url);expect(page.url()).toBe(url+'/');await expect(page).toHaveTitle(/魔法王座/);
  await page.locator('#tabRegister').click();await page.locator('#accountName').fill('周围目标'+viewport.width+Date.now());await page.locator('#accountPassword').fill('nearby-test-2026');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  const p=room.player(game.accounts.rows.at(-1));s.units=[];s.time=10;s.waveAt=s.populationAt=1e9;for(const t of s.towers)Object.assign(t,{x:100,cd:1e9});
  p.classId=4;p.stamina=100;const h=s.spawn(0,'ranged',0,1,0);expect(s.contract(p,h.id)).toBe(true);Object.assign(h,{x:-3,y:0});
  const spawn=(side,type,x,y)=>{const u=s.spawn(side,type,0,1,x);Object.assign(u,{x,y,cd:1e9,speed:0});return u;};
  const enemy=spawn(1,'ranged',0,0),ally=spawn(0,'melee',-2,-1),edge=spawn(1,'siege',4,0),far=spawn(1,'melee',4.1,0),dead=spawn(1,'melee',0,1);dead.hp=0;
  const tower=s.towers[0];Object.assign(tower,{x:0,y:3});
  await sync();await page.evaluate(id=>__game.renderer.focusUnit(id),enemy.id);await page.waitForTimeout(350);await clickUnit(enemy);
  await expect(page.locator('#targetInfo')).toHaveAttribute('data-unit-id',String(enemy.id));
  const order=[enemy.id,ally.id,tower.id,h.id,edge.id];await expect(page.locator('#targetTabs [role="tab"]')).toHaveCount(order.length);
  expect(await page.locator('#targetTabs button').evaluateAll(bs=>bs.map(b=>Number(b.dataset.inspectUnit)))).toEqual(order);
  await expect(tab(enemy.id)).toHaveAttribute('aria-selected','true');await expect(tab(far.id)).toHaveCount(0);await expect(tab(dead.id)).toHaveCount(0);
  await tab(ally.id).click();await expect(page.locator('#targetInfo')).toHaveAttribute('data-side','ally');await page.waitForFunction(id=>__game.sim.hero().manualTargetId===id,ally.id);
  expect(await page.locator('#targetTabs button').evaluateAll(bs=>bs.map(b=>Number(b.dataset.inspectUnit)))).toEqual(order);
  await page.keyboard.press('End');await expect(tab(edge.id)).toBeFocused();await expect(page.locator('#targetInfo')).toHaveAttribute('data-unit-id',String(edge.id));
  await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');await expect(tab(tower.id)).toBeFocused();await expect(page.locator('#targetName')).toHaveText('防御塔');
  await page.keyboard.press('Home');await expect(tab(enemy.id)).toBeFocused();enemy.hp=123;await sync();await expect(page.locator('#targetHp')).toContainText('123 /');await expect(tab(enemy.id)).toBeFocused();
  tower.hp=0;await sync();await expect(tab(tower.id)).toHaveCount(0);await expect(page.locator('#targetInfo')).toHaveAttribute('data-unit-id',String(enemy.id));
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);await expect(page.locator('#heroName')).not.toBeEmpty();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`nearby-targets-${viewport.width}.png`)});
  await page.keyboard.press('Escape');await expect(page.locator('#targetInfo')).toBeHidden();
  for(const [x,y] of [[-1,2],[1,2],[2,-2]])spawn(1,'melee',x,y);await sync();await clickUnit(enemy);await expect(page.locator('#targetTabs button')).toHaveCount(7);await expect(tab(far.id)).toHaveCount(0);
  await clickUnit(far);await expect(page.locator('#targetTabs button').first()).toHaveAttribute('data-inspect-unit',String(far.id));
  h.hp=0;p.heroId=null;await sync();await page.keyboard.press('Escape');await clickUnit(enemy);await tab(ally.id).click();
  await expect(page.locator('#contractPopover')).toBeVisible();await expect(tab(ally.id)).toHaveAttribute('aria-selected','true');expect(await page.evaluate(()=>__game.selection.id)).toBe(ally.id);
  const info=await page.locator('#targetInfo').boundingBox(),popover=await page.locator('#contractPopover').boundingBox();expect(popover.y).toBeGreaterThan(info.y+info.height);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`nearby-contract-${viewport.width}.png`)});
  await page.locator('#confirmContract').click();await page.waitForFunction(id=>__game.sim.hero()?.id===id,ally.id);await expect(page.locator('#targetInfo')).toBeHidden();expect(errors).toEqual([]);
 }finally{await context.close();for(const c of [...room.clients])c.res.end();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

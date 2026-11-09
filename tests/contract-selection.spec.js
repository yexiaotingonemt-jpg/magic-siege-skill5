import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {unitBarOffset} from '../client/src/art-catalog.js';

for(const viewport of [{width:1440,height:1100},{width:390,height:844}])test(`契约职业点击跨同步与唯一单位分页 ${viewport.width}`,async({browser})=>{
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'contract-selection-'))}),{room,server}=game,s=room.sim;
 room.step=()=>{};room.paused=true;await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!(m.location().url.endsWith('/api/me')&&m.text().includes('401')))errors.push(m.text());});
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>window.__game?.sim.sequence>=n,room.sequence);};
 try{
  const url=`http://127.0.0.1:${server.address().port}`;await page.goto(url);expect(page.url()).toBe(url+'/');await expect(page).toHaveTitle(/魔法王座/);
  await page.locator('#tabRegister').click();await page.locator('#accountName').fill('契约验收'+viewport.width+Date.now());await page.locator('#accountPassword').fill('contract-ui-test-2026');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  const p=room.player(game.accounts.rows.at(-1));s.units=[];s.time=10;s.waveAt=s.populationAt=1e9;for(const t of s.towers)Object.assign(t,{x:100,cd:1e9});p.classId=4;p.stamina=100;
  const spawn=(type,x)=>{const u=s.spawn(0,type,0,1,x);Object.assign(u,{x,y:0,cd:1e9,speed:0});return u;};
  const ranged=spawn('ranged',0),other=spawn('ranged',2),siege=spawn('siege',-2);
  await sync();await page.evaluate(id=>__game.renderer.focusUnit(id),ranged.id);await page.waitForTimeout(350);
  const point=await page.evaluate(({id,offset})=>{const p=__game.renderer.screenPoint(__game.sim.get(id)),r=__game.renderer.game.canvas.getBoundingClientRect();return {x:r.left+p.x/500*r.width,y:r.top+(p.y-offset+2)/__game.renderer.game.scale.gameSize.height*r.height};},{id:ranged.id,offset:unitBarOffset(ranged)});await page.mouse.click(point.x,point.y);
  await expect(page.locator('#contractPopover')).toBeVisible();
  const elf=page.getByRole('button',{name:'森林精灵',exact:true}),mage=page.getByRole('button',{name:'火焰法师',exact:true});
  // Hold the pointer through real server snapshots, reproducing a normal slower click.
  await elf.focus();const box=await elf.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  for(let i=0;i<3;i++){ranged.hp-=10;await sync();}
  await page.mouse.up();await expect(elf).toHaveClass(/selected/);await expect(elf).toBeFocused();
  await expect(page.locator('#selectedDetail')).toContainText('可契约为 森林精灵');await expect(page.locator('#confirmContract')).toContainText('契约森林精灵');
  expect(p.stamina).toBe(100);expect(s.hero(p)).toBeFalsy();
  await expect(page.locator('#nearbyUnits, [data-select-unit]')).toHaveCount(0);
  await mage.focus();await sync();await page.keyboard.press('Space');await expect(mage).toHaveClass(/selected/);
  await page.locator(`[data-inspect-unit="${siege.id}"]`).click();await expect(page.locator('#contractRoles')).toBeHidden();await expect(page.locator('#selectedName')).toContainText('#'+siege.id);
  await page.locator(`[data-inspect-unit="${other.id}"]`).click();await expect(page.locator('#contractRoles')).toBeVisible();await elf.click();await sync();await expect(elf).toHaveClass(/selected/);
  await expect(elf).toHaveAttribute('aria-pressed','true');await expect(mage).toHaveAttribute('aria-pressed','false');await expect(elf).toHaveCSS('background-color','rgb(48, 76, 55)');
  expect((await elf.boundingBox()).height).toBeGreaterThanOrEqual(43.9);
  await expect(page.locator('#targetInfo')).toHaveAttribute('data-unit-id',String(other.id));await expect(page.locator('#selectedName')).toContainText('#'+other.id);
  const info=await page.locator('#targetInfo').boundingBox(),popover=await page.locator('#contractPopover').boundingBox();expect(popover.y).toBeGreaterThan(info.y+info.height);
  expect(popover.x+popover.width).toBeLessThanOrEqual(viewport.width);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);await expect(page.locator('#heroName')).not.toBeEmpty();
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`contract-selection-${viewport.width}.png`)});
  await page.locator('#confirmContract').click();await page.waitForFunction(id=>__game.sim.hero()?.id===id&&__game.sim.hero()?.classId===5,other.id);
  expect(p.stamina).toBe(97);expect(p.heroId).toBe(other.id);expect(other.classId).toBe(5);expect(ranged.hero).toBeFalsy();await expect(page.locator('#contractPopover')).toBeHidden();expect(errors).toEqual([]);
 }finally{await context.close();for(const c of [...room.clients])c.res.end();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

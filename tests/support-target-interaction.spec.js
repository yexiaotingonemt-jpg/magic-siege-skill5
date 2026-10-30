import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {unitBarOffset} from '../client/src/art-catalog.js';

// Login -> select an enemy or ally -> support HUD and recipient follow that selection.
for(const viewport of [{width:1440,height:1100},{width:390,height:844}])test(`精灵支援目标与描述 ${viewport.width}`,async({browser})=>{
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'kc-support-ui-'))}),{room,server}=game,s=room.sim;
 room.step=()=>{};room.paused=true;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',msg=>{if(msg.type()==='error'&&!(msg.location().url.endsWith('/api/me')&&msg.text().includes('401')))errors.push(msg.text());});
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>window.__game?.sim.sequence>=n,room.sequence);};
 const clickUnit=async u=>{
  const point=await page.evaluate(({id,offset})=>{const p=__game.renderer.screenPoint(__game.sim.get(id)),r=__game.renderer.game.canvas.getBoundingClientRect();return {x:r.left+p.x/500*r.width,y:r.top+(p.y-offset+2)/500*r.height};},{id:u.id,offset:unitBarOffset(u)});
  await page.mouse.click(point.x,point.y);
  await page.waitForFunction(id=>__game.sim.hero().manualTargetId===id,u.id);
 };
 try{
  const url='http://127.0.0.1:'+server.address().port;await page.goto(url);await expect(page).toHaveTitle(/魔法王座/);expect(page.url()).toBe(url+'/');
  await page.locator('#tabRegister').click();await page.locator('#accountName').fill('精灵支援'+viewport.width+Date.now());await page.locator('#accountPassword').fill('isolated-support-ui');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  const p=room.player(game.accounts.rows.at(-1));s.units=[];s.time=10;s.waveAt=s.populationAt=1e9;
  for(const t of s.towers)Object.assign(t,{x:100,cd:1e9});
  p.classId=5;p.level=6;p.builds[5]=[1,1,1,1];p.stamina=100;
  const h=s.spawn(0,'ranged',0,1,0);expect(s.contract(p,h.id)).toBe(true);Object.assign(h,{x:0,y:0,hp:5000,maxHp:10000,speed:0,cd:1e9});
  const unit=(side,x,y,hp)=>{const u=s.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp,maxHp:10000,speed:0,cd:1e9});return u;};
  const enemy=unit(1,0,6,10000),victim=unit(0,4,4,900),low=unit(0,-4,2,100);enemy.targetId=victim.id;
  s.tick(.05);await sync();await page.evaluate(()=>__game.renderer.focusUnit(__game.sim.hero().id));await page.waitForTimeout(350);
  await page.waitForFunction(id=>__game.sim.hero().targetId===id,enemy.id);
  await expect(page.locator('[data-cast="1"]')).toHaveClass(/ready/);
  await clickUnit(low);await clickUnit(enemy);
  await expect(page.locator('[data-cast="1"]')).toHaveClass(/ready/);
  await page.locator('[data-cast="1"]').click();await page.waitForFunction(()=>__game.sim.metrics.casts>0);
  for(let n=0;n<8;n++)s.tick(.05);expect(h.linkId).toBe(victim.id);await sync();
  await page.waitForFunction(id=>__game.sim.hero().linkId===id,victim.id);
  // Invalid target of target is rejected visibly without spending or cooldown.
  p.cd[1]=0;enemy.targetId=null;await sync();
  await expect(page.locator('[data-cast="1"]')).toHaveClass(/out-of-range/);
  const stamina=p.stamina;await page.locator('[data-cast="1"]').click();
  await expect(page.locator('#notice')).toHaveText('范围内没有符合条件的己方目标');
  expect(s.metrics.casts).toBe(1);expect(p.stamina).toBe(stamina);expect(p.cd[1]).toBe(0);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`invalid-support-${viewport.width}.png`)});
  await clickUnit(victim);victim.hp=0;s.tick(.05);await sync();
  await page.waitForFunction(id=>{const h=__game.sim.hero();return h.targetId===id&&h.friendlyTargetId==null&&h.manualTargetId==null;},enemy.id);
  await expect(page.locator('[data-cast="1"]')).toHaveClass(/out-of-range/);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`support-target-${viewport.width}.png`)});
  await page.locator('[data-info="1"]').click();await expect(page.locator('[data-skill-detail="1"]')).toContainText('共享50%有效治疗');
  await expect(page.locator('#heroAbilityBody')).not.toContainText('须选择己方目标');
  await expect(page.locator('[data-skill-detail]:visible')).toHaveCount(1);
  await expect(page.locator('[data-skill-detail="1"] [data-upgrade-id]')).toHaveCount(4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`support-description-${viewport.width}.png`)});
 }finally{await context.close();for(const c of [...room.clients])c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

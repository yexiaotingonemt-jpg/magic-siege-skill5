import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {unitBarOffset} from '../client/src/art-catalog.js';

for(const viewport of [{width:1440,height:1100},{width:390,height:844}])test(`目标交互 ${viewport.width}：点击信息、超距红色、自动接近攻击与恢复施法`,async({browser})=>{
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'kc-target-ui-'))}),{room,server}=game,s=room.sim;
 room.step=()=>{};room.paused=true;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[],rejections=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',msg=>{if(msg.type()!=='error')return;const url=msg.location().url;
  if(url.endsWith('/api/me')&&msg.text().includes('401'))return;
  if(url.endsWith('/api/action')&&msg.text().includes('400')){rejections.push(msg.text());return;}
  errors.push(msg.text());});
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>window.__game?.sim.sequence>=n,room.sequence);};
 async function clickUnit(u){
  const point=await page.evaluate(({id,offset})=>{const p=__game.renderer.screenPoint(__game.sim.get(id)),r=__game.renderer.game.canvas.getBoundingClientRect();return {x:r.left+p.x/500*r.width,y:r.top+(p.y-offset+2)/500*r.height};},{id:u.id,offset:unitBarOffset(u)});
  await page.mouse.click(point.x,point.y);
 }
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await expect(page).toHaveTitle(/魔法王座/);
  await page.locator('#tabRegister').click();await page.locator('#accountName').fill('目标验收'+viewport.width+Date.now());await page.locator('#accountPassword').fill('target-ui-test-2026');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  const p=room.player(game.accounts.rows.at(-1));s.units=[];s.time=10;s.waveAt=s.populationAt=1e9;
  for(const t of s.towers){t.x=100;t.cd=1e9;}
  p.classId=4;p.level=6;p.builds[4]=[1,1,1,1];p.stamina=100;
  const h=s.spawn(0,'ranged',0,1,0);expect(s.contract(p,h.id)).toBe(true);Object.assign(h,{x:0,y:0,cd:0});
  const enemy=s.spawn(1,'melee',0,1,0);Object.assign(enemy,{x:0,y:11,hp:10000,maxHp:10000,speed:0,cd:1e9});
  const closer=s.spawn(1,'melee',0,1,-5);Object.assign(closer,{x:-5,y:1,speed:0,cd:1e9});
  await sync();await page.evaluate(()=>__game.renderer.focusUnit(__game.sim.hero().id));await page.waitForTimeout(350);
  await clickUnit(enemy);
  await expect(page.locator('#targetInfo')).toBeVisible();await expect(page.locator('#targetInfo')).toHaveAttribute('data-unit-id',String(enemy.id));
  await expect(page.locator('#targetHp')).toContainText('10000 / 10000');await expect(page.locator('#targetStats')).toContainText('攻击');
  await page.waitForFunction(id=>__game.sim.hero().manualTargetId===id,enemy.id);
  await expect(page.locator('[data-cast="0"]')).toHaveClass(/out-of-range/);await expect(page.locator('[data-cast="1"]')).not.toHaveClass(/out-of-range/);
  await expect(page.locator('[data-cast="0"]')).toHaveCSS('border-top-color','rgb(255, 133, 133)');
  const before={stamina:p.stamina,cd:p.cd[0]};await page.locator('[data-cast="0"]').click();await expect(page.locator('#notice')).toHaveText('目标太远');
  expect({stamina:p.stamina,cd:p.cd[0]}).toEqual(before);
  // A direct server command has the same range rejection as the clickable HUD.
  expect(await page.evaluate(()=>__game.network.send('cast',{skill:0}))).toBe(false);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`target-range-${viewport.width}.png`)});
  const layout=await page.locator('#targetInfo').boundingBox(),battle=await page.locator('.battle-wrap').boundingBox();
  expect(layout.x).toBeGreaterThanOrEqual(battle.x);expect(layout.x+layout.width).toBeLessThanOrEqual(battle.x+battle.width+1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  // The real simulation advances toward the selected enemy despite a nearer one.
  const startY=h.y;s.tick(.5);expect(h.y).toBeGreaterThan(startY);expect(h.targetId).toBe(enemy.id);
  for(let i=0;i<160;i++)s.tick(.05);
  expect(enemy.hp).toBeLessThan(10000);expect(h.lastAttackAt).toBeGreaterThan(10);
  await sync();await expect(page.locator('[data-cast="0"]')).toHaveClass(/ready/);await expect(page.locator('[data-cast="0"]')).not.toHaveClass(/out-of-range/);
  await expect(page.locator('#targetHp')).toContainText(`${Math.ceil(enemy.hp)} / 10000`);
  await page.locator('[data-cast="0"]').click();await page.waitForFunction(()=>__game.sim.metrics.casts>0);expect(p.stamina).toBe(before.stamina-1);
  // Clicking a distant ally first approaches it, then reacquires enemies within aggro range.
  h.castUntil=0;h.cd=0;closer.hp=0;enemy.y=h.y+10;const ally=s.spawn(0,'melee',0,1,5);Object.assign(ally,{x:5,y:h.y+8,targetId:enemy.id,stunUntil:1e9});await sync();await page.waitForTimeout(300);await clickUnit(ally);
  await expect(page.locator('#targetInfo')).toHaveAttribute('data-side','ally');await page.waitForFunction(id=>__game.sim.hero().manualTargetId===id,ally.id);expect(h.targetId).toBeNull();expect(h.manualMoveTargetId).toBe(ally.id);
  h.castUntil=0;h.cd=0;enemy.y=h.y+10;const allyStart=h.y,enemyHp=enemy.hp,lastAttack=h.lastAttackAt;s.tick(.5);expect(h.y).toBeGreaterThan(allyStart);expect(h.targetId).toBeNull();expect(h.lastAttackAt).toBe(lastAttack);
  for(let n=0;n<160&&h.manualMoveTargetId!=null;n++)s.tick(.05);
  expect(Math.hypot(h.x-ally.x,h.y-ally.y)).toBeCloseTo(1,6);expect(h.manualMoveTargetId).toBeNull();
  for(let n=0;n<160;n++)s.tick(.05);expect(enemy.hp).toBeLessThan(enemyHp);expect(h.manualTargetId).toBe(ally.id);await sync();
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`ally-follow-attack-${viewport.width}.png`)});
  expect(h.manualMoveTargetId).toBeNull();expect(h.targetId).toBe(enemy.id);ally.targetId=null;s.tick(.05);expect(h.manualTargetId).toBe(ally.id);await sync();
  const tower=s.towers[0];Object.assign(tower,{x:h.x-5,y:h.y+3});await sync();await page.evaluate(()=>__game.renderer.focusUnit(__game.sim.hero().id));await page.waitForTimeout(350);await clickUnit(tower);
  await expect(page.locator('#targetName')).toHaveText('防御塔');
  tower.hp=0;await sync();await expect(page.locator('#targetInfo')).toBeHidden();
  await page.evaluate(()=>__game.renderer.focusUnit(__game.sim.hero().id));await page.waitForTimeout(350);await clickUnit(enemy);await expect(page.locator('#targetInfo')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#targetInfo')).toBeHidden();
  expect(rejections).toHaveLength(1);expect(errors).toEqual([]);
 }finally{await context.close();await new Promise(resolve=>server.close(resolve));}
});

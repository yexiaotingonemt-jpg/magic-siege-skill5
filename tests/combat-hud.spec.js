import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';
import {currentTraits} from '../shared/current-design.js';
import {unitBarOffset} from '../client/src/art-catalog.js';

for(const {viewport,side} of [{viewport:{width:1266,height:936},side:0},{viewport:{width:390,height:844},side:0},{viewport:{width:390,height:844},side:1}])test(`紧凑战斗面板与随机契约 ${viewport.width} 阵营${side}`,async({page})=>{
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;room.step=()=>{};
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(process.env.MAGIC_QA_DIR,'combat-hud-')),room}),{server}=game;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const account=await game.accounts.register({name:'战斗界面验收',password:'combat-hud-test',side});
 const classId=side?3:2;
 const s=room.sim,p=room.player(account);s.units=[];s.waveAt=s.time+5;p.stamina=100;p.progress[classId].level=5;const passive=currentTraits(s.config,classId).find(t=>t.skill==null);p.progress[classId].traits[passive.id]=1;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('401'))errors.push(m.text());});
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);};
 const measure=()=>page.evaluate(()=>{const game=document.querySelector('.game').getBoundingClientRect(),hud=document.querySelector('.hero-hud').getBoundingClientRect();return (game.bottom-hud.top)/game.height;});
 const checkAspect=async()=>{await page.waitForFunction(()=>!!window.__game?.renderer.getCamera());await expect.poll(()=>page.evaluate(()=>{const g=__game.renderer.game,b=g.canvas.getBoundingClientRect(),size=g.scale.gameSize;return Math.abs(b.width/size.width-b.height/size.height);})).toBeLessThan(.002);await expect.poll(()=>page.evaluate(()=>__game.renderer.getCamera()?.viewportHeight===__game.renderer.game.scene.scenes[0].cameras.main.height)).toBe(true);};
 try{
  await page.setViewportSize(viewport);const url=`http://127.0.0.1:${server.address().port}/`;await page.goto(url);
  await expect(page).toHaveTitle(/魔法王座/);expect(page.url()).toBe(url);
  await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('combat-hud-test');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected);
  await expect(page.locator('#heroName')).toHaveText('选择一名己方普通士兵契约');await expect(page.locator('#skills')).toBeHidden();
  await checkAspect();const awaitingHeight=await page.evaluate(()=>__game.renderer.getCamera().viewportHeight);
  expect(await measure()).toBeLessThan(.20);
  const button=page.locator('#randomContract');await button.click();await expect(page.locator('#notice')).toContainText('暂无可契约');expect(p.stamina).toBe(100);
  const excluded=[s.spawn(1-side,'melee',0,1),s.spawn(side,'melee',0,1),s.spawn(side,'ranged',0,1)];excluded[1].elite=true;excluded[2].summoned=true;
  for(const u of excluded)u.x=100;
  for(const u of excluded)Object.assign(u,{hp:10000,maxHp:10000});
  await sync();await button.click();await expect(page.locator('#notice')).toContainText('暂无可契约');expect(s.hero(p)).toBeFalsy();
  const unit=s.spawn(side,side?'melee':'siege',0,1);Object.assign(unit,{x:0,y:-8,hp:200,maxHp:250});
  const lowerHp=[s.spawn(side,side?'melee':'ranged',0,1),s.spawn(side,'melee',0,1)];
  Object.assign(lowerHp[0],{x:100,hp:500,maxHp:1000});Object.assign(lowerHp[1],{x:100,hp:1500,maxHp:5000});
  await sync();await page.evaluate(()=>__game.selection.select(null));
  const lower=await page.evaluate(()=>{const s=__game.sim,c=__game.renderer.getCamera(),y=c.scrollY+c.viewportHeight*.86;return {worldY:s.player.side?s.config.world.mapMinY+y/18:s.config.world.mapMaxY-y/18,pixelY:c.viewportHeight*.86};});
  expect(lower.pixelY).toBeGreaterThan(500);unit.y=lower.worldY;await sync();await page.waitForTimeout(350);
  const target=await page.evaluate(id=>{const g=__game.renderer,p=g.screenPoint(__game.sim.get(id)),r=g.game.canvas.getBoundingClientRect();return {x:r.x+p.x/500*r.width,y:r.y+(p.y-8)/g.game.scale.gameSize.height*r.height};},unit.id);
  await page.mouse.click(target.x,target.y);await expect(page.locator('#contractPopover')).toBeVisible();
  const popup=await page.locator('#contractPopover').boundingBox(),battle=await page.locator('.battle-wrap').boundingBox();expect(popup.y).toBeGreaterThanOrEqual(battle.y);expect(popup.y+popup.height).toBeLessThanOrEqual(battle.y+battle.height);await page.locator('#dismissSelection').click();
  await page.locator('#gameViewport').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`combat-before-${viewport.width}-${side}.png`)});
  let release;const blocked=new Promise(r=>release=r);await page.route('**/api/action',async route=>{if(route.request().postDataJSON().type==='contract')await blocked;await route.continue();});
  await button.click();await expect(button).toBeDisabled();await expect(button).toHaveAttribute('aria-busy','true');release();
  await page.waitForFunction(id=>__game.sim.hero()?.id===id,unit.id);
  expect(p.heroId).toBe(unit.id);expect(p.stamina).toBe(97);expect(unit.classId).toBe(classId);expect(excluded.every(u=>!u.hero)).toBe(true);
  expect(lowerHp.every(u=>!u.hero)).toBe(true);expect(unit.hp/unit.maxHp).toBeCloseTo(.8,8);
  await expect(button).toBeHidden();await expect(button).toHaveAttribute('aria-busy','false');await expect(page.locator('#notice')).toHaveText('');await expect(page.locator('#skills')).toBeVisible();await expect(page.locator('#heroName')).toHaveText((side?'黑暗领主':'符文战车')+' Lv.5');
  await checkAspect();expect(await page.evaluate(()=>__game.renderer.getCamera().viewportHeight)).toBeLessThan(awaitingHeight);
  const ratio=await measure();expect(ratio).toBeGreaterThan(.27);expect(ratio).toBeLessThan(.33);
  await expect(page.locator('#xpLabel')).toBeHidden();await expect(page.locator('#attackLabel')).toBeHidden();
  for(const control of await page.locator('[data-cast]').all())expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(43.9);
  await expect(page.locator('[data-hero-open="passive"],[data-hero-open="common"],[data-hero-open="stats"]')).toHaveCount(0);
  await expect(page.locator('#heroEffects')).toBeHidden();
  unit.immuneUntil=s.time+8;unit.currentShell={until:s.time+8};p.cd[0]=s.time+5;await sync();
  await expect(page.locator('#heroEffects')).toContainText('负面免疫');await expect(page.locator('#heroEffects')).toContainText('尖刺外壳');
  const effectsBox=await page.locator('#heroEffects').boundingBox(),heroBox=await page.locator('.hero-hud').boundingBox();expect(effectsBox.y+effectsBox.height).toBeLessThan(heroBox.y);
  for(const skill of await page.locator('[data-cast]').all()){
   const icon=await skill.boundingBox(),cost=await skill.locator('.skill-cost').boundingBox(),timer=await skill.locator('em').boundingBox();
   expect(cost.x).toBeGreaterThan(icon.x);expect(cost.x+cost.width).toBeLessThan(icon.x+icon.width);expect(cost.y).toBeGreaterThan(icon.y);expect(cost.y+cost.height).toBeLessThan(icon.y+icon.height);
   if(timer.height)expect(cost.y+cost.height).toBeLessThan(timer.y);
  }
  await expect.poll(()=>page.evaluate(()=>__game.renderer.game.scene.scenes[0].statusIcons.report.find(r=>r.unitId===__game.sim.hero().id&&r.id==='immune')?.fillRatio)).toBe(1);
  s.time+=4;await sync();await expect(page.locator('[data-effect="immune"]')).toHaveAttribute('data-fill-ratio','0.5');
  expect(await page.locator('#heroEffects').innerText()).not.toMatch(/\d+\s*(s|秒)/);
  await expect.poll(()=>page.evaluate(()=>__game.renderer.game.scene.scenes[0].statusIcons.report.filter(r=>r.unitId===__game.sim.hero().id&&r.permanent).length)).toBe(2);
  await expect.poll(()=>page.evaluate(()=>__game.renderer.game.scene.scenes[0].statusIcons.report.find(r=>r.unitId===__game.sim.hero().id&&r.id==='immune')?.fillRatio)).toBe(.5);
  await page.waitForTimeout(350); // Wait for the 250ms hero camera pan before visual evidence.
  await page.locator('#gameViewport').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`combat-after-${viewport.width}-${side}.png`)});
  await page.locator('[data-info="0"]').click();await expect(page.locator('#sheetTitle')).toHaveText(side?'裂地震荡':'腐蚀炮弹');await page.keyboard.press('Escape');
  await page.locator('#heroInfo').click();await expect(page.locator('#sheetTitle')).toHaveText('角色详情');await expect(page.locator('.hero-stat-list')).toContainText('攻击力');await expect(page.locator('.hero-stat-list')).toContainText('护甲');
  await page.locator('#gameViewport').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`details-stats-${viewport.width}-${side}.png`)});
  await page.locator('[data-detail-view="passive"]').click();await expect(page.locator('[data-ability-view="passive"]')).toContainText('无法净化或驱散');if(side)await expect(page.locator('[data-ability-view="passive"]')).toContainText('普攻范围内最近一名有可驱散增益敌人的1个增益');
  await page.locator('#gameViewport').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`details-passive-${viewport.width}-${side}.png`)});
  await page.locator('[data-detail-view="common"]').click();await expect(page.locator('[data-ability-view="common"]')).toContainText(passive.name);
  await page.locator('[data-detail-view="skills"]').click();await expect(page.locator('[data-skill-detail]:visible')).toHaveCount(4);
  await page.locator('#gameViewport').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`details-upgrades-${viewport.width}-${side}.png`)});
  await page.keyboard.press('Escape');await expect(page.locator('#heroInfo')).toBeFocused();
  await page.locator('#portrait').click();await expect(page.locator('#sheetTitle')).toHaveText('角色详情');await page.keyboard.press('Escape');await expect(page.locator('#portrait')).toBeFocused();
  const point=await page.evaluate(offset=>{const g=__game.renderer,p=g.screenPoint(__game.sim.hero()),r=g.game.canvas.getBoundingClientRect();return {x:r.x+p.x/500*r.width,y:r.y+(p.y-offset+2)/g.game.scale.gameSize.height*r.height};},unitBarOffset(unit));
  await page.mouse.click(point.x,point.y);await expect(page.locator('#sheetTitle')).toHaveText('角色详情');await expect(page.locator('#gameSheet')).toBeVisible();await page.keyboard.press('Escape');
  s.time+=9;await sync();await expect(page.locator('#heroEffects')).toBeHidden();expect(await measure()).toBeCloseTo(ratio,3);
  await page.setViewportSize({width:viewport.width,height:viewport.height-200});await checkAspect();await page.locator('#locate').click();await page.waitForTimeout(350);
  expect(await page.evaluate(()=>{const c=__game.renderer.getCamera();return c.scrollY>=0&&c.scrollY<=c.maxScroll+.01;})).toBe(true);
  await page.setViewportSize(viewport);await checkAspect();
  s.die(unit,null);await sync();await expect(button).toBeVisible();await expect(page.locator('#skills')).toBeHidden();
  await checkAspect();
  await expect(page.locator('#heroExtras')).toBeHidden();
  // Both ends of the random range must select among tied highest-HP-ratio units,
  // while keeping the existing random choice of legal class.
  for(const roll of [0,.999999]){
   const tied=[s.spawn(side,side?'melee':'ranged',0,1),s.spawn(side,side?'melee':'ranged',0,1)];
   Object.assign(tied[0],{x:100,hp:900,maxHp:1000});Object.assign(tied[1],{x:100,hp:450,maxHp:500});
   await sync();const expected=tied[roll===0?0:1],stamina=p.stamina;
   await page.evaluate(async value=>{const random=Math.random;Math.random=()=>value;try{await __game.selection.randomContract();}finally{Math.random=random;}},roll);
   await page.waitForFunction(id=>__game.sim.hero()?.id===id,expected.id);
   expect(p.heroId).toBe(expected.id);expect(expected.classId).toBe(side?3:roll===0?4:5);expect(p.stamina).toBe(stamina-3);
   expect(expected.hp/expected.maxHp).toBeCloseTo(.9,8);
   for(const u of tied){u.hp=0;s.die(u,null);}
   await sync();await expect(button).toBeVisible();
  }
  p.stamina=0;await sync();await expect(button).toBeDisabled();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);expect(errors).toEqual([]);
  console.log(JSON.stringify({viewport,bottomRatio:ratio}));
 }finally{await page.close();for(const client of [...room.clients])client.res.end();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

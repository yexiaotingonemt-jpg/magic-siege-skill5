import {test,expect} from '@playwright/test';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';

for(const viewport of [{width:1440,height:1100},{width:390,height:844}])test(`超级账号NPC设置、未来授权及双账号同步 ${viewport.width}`,async({browser})=>{
 const dataDir=mkdtempSync(path.join(tmpdir(),'npc-ui-')),g=await createBrowserGame({dataDir}),s=g.room.sim;
 g.room.paused=true;await new Promise(r=>g.server.listen(0,'127.0.0.1',r));
 const context=await browser.newContext({viewport}),otherContext=await browser.newContext({viewport}),page=await context.newPage(),other=await otherContext.newPage(),errors=[];
 for(const p of [page,other])p.on('pageerror',e=>errors.push(e.message));
 const register=async(p,name)=>{await p.goto('http://127.0.0.1:'+g.server.address().port);await p.locator('#tabRegister').click();await p.locator('#accountName').fill(name);await p.locator('#accountPassword').fill('isolated-npc-test');await p.locator('#authSubmit').click();await p.waitForFunction(()=>window.__game?.network.connected);return g.accounts.rows.at(-1);};
 const sync=async()=>{g.room.sequence++;g.room.broadcast();for(const p of [page,other])await p.waitForFunction(n=>__game.sim.sequence>=n,g.room.sequence);};
 const out=path.join(process.env.MAGIC_QA_DIR,'npc-settings');mkdirSync(out,{recursive:true});
 try{
  const host=await register(page,'房主无超级'+viewport.width+Date.now()),future=await register(other,'未来超级'+viewport.width+Date.now());
  await expect(page.locator('#npcControls')).toBeHidden();await expect(other.locator('#npcControls')).toBeHidden();
  expect(await page.evaluate(()=>__game.network.send('npcPolicy',{mode:'off',defense:1,attack:3,isSuperAdmin:true}))).toBe(false);
  writeFileSync(path.join(dataDir,'super-accounts.json'),JSON.stringify([future.id]));
  // No logout: permission polling must expose controls to a newly promoted account.
  await expect(other.locator('#npcControls')).toBeVisible({timeout:18000});await expect(other.locator('#npcDefenseRatio')).toHaveValue('1');await expect(other.locator('#npcAttackRatio')).toHaveValue('3');
  await other.locator('#npcDefenseRatio').fill('2');await other.locator('#npcAttackRatio').fill('5');await other.locator('#applyNpcPolicy').click();
  await expect(other.locator('#toolNotice')).toContainText('下次出兵');expect(s.npcPolicy).toEqual({mode:'ratio',defense:2,attack:5});expect(s.units.filter(u=>u.hero&&u.hp>0)).toHaveLength(4);
  s.spawnWave();await sync();for(const p of [page,other])expect(await p.evaluate(()=>__game.sim.npcBalance.heroes)).toEqual({defense:2,attack:5});
  await other.locator('#npcControls').scrollIntoViewIfNeeded();await other.screenshot({path:path.join(out,`custom-${viewport.width}.png`),fullPage:true});
  const living=s.units.filter(u=>u.hero&&u.hp>0).map(u=>u.id);await other.locator('#npcMode').selectOption('off');await other.locator('#applyNpcPolicy').click();await expect(other.locator('#toolNotice')).toContainText('现有NPC继续战斗');
  expect(s.units.filter(u=>u.hero&&u.hp>0).map(u=>u.id)).toEqual(living);s.units.find(u=>u.id===living[0]).hp=0;s.spawnWave();await sync();expect(s.units.filter(u=>u.hero&&u.hp>0)).toHaveLength(living.length-1);
  await other.screenshot({path:path.join(out,`off-${viewport.width}.png`),fullPage:true});
  await other.locator('#npcDefault').click();await expect(other.locator('#npcAttackRatio')).toHaveValue('3');expect(s.npcPolicy).toEqual({mode:'ratio',defense:1,attack:3});
  s.spawnWave();await sync();const state=s.units.filter(u=>u.hero&&u.hp>0);expect(state.filter(u=>u.side===0).length).toBe(state.filter(u=>u.side===1).length*3);
  await other.reload();await other.waitForFunction(()=>window.__game?.network.connected);await expect(other.locator('#npcControls')).toBeVisible();
  writeFileSync(path.join(dataDir,'super-accounts.json'),'[]');expect(await other.evaluate(()=>__game.network.send('npcPolicy',{mode:'off',defense:1,attack:3}))).toBe(false);await expect(other.locator('#npcControls')).toBeHidden({timeout:18000});
  expect(errors).toEqual([]);expect(g.accounts.rows).toHaveLength(2);expect(g.accounts.public(host).isSuperAdmin).toBe(false);
 }finally{await context.close();await otherContext.close();for(const c of [...g.room.clients])c.res.end();g.server.closeAllConnections();await new Promise(r=>g.server.close(r));}
});

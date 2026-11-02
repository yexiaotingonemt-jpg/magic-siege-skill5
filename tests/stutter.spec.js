import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';

test('180单位：550毫秒快照抖动保持显示连续，屏外剔除、暂停及移回视野正确',async({page})=>{
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'stutter-'))}),{room,server}=game,s=room.sim;room.step=()=>{};
 s.npcPolicy={mode:'off',defense:1,attack:3};s.units=[];s.projectiles=[];s.fields=[];s.effects=[];s.animations=[];
 for(const p of s.players)if(p.bot)p.retired=true;
 for(let i=0;i<180;i++){const u=s.spawn(0,['melee','ranged','siege'][i%3],i,180);Object.assign(u,{x:i%9-4,y:i<20?-50+i%3:20+i%30,speed:.9,range:0,cd:1e9});}
 const tracked=s.units[0];tracked.x=-7;const distantId=s.units[30].id;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let timer;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await expect(page).toHaveTitle(/魔法王座/);
  await page.locator('#tabRegister').click();await page.locator('#accountName').fill('卡顿回归');await page.locator('#accountPassword').fill('isolated-stutter');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  const gaps=[200,450,150,550,150,350,200];let index=0,last=performance.now();
  const publish=()=>{const at=performance.now();if(!room.paused){const dt=(at-last)/1000;s.time+=dt;tracked.x+=dt*.9;}last=at;room.sequence++;room.broadcast();timer=setTimeout(publish,gaps[index++%gaps.length]);};publish();
  const trace=await page.evaluate(async id=>{const result=[],start=performance.now();while(performance.now()-start<6500){await new Promise(requestAnimationFrame);if(performance.now()-start>1200){const p=__game.renderer.screenPoint(__game.sim.get(id));result.push({at:performance.now(),x:p.x});}}return result;},tracked.id);
  let frozenMs=0;for(let i=1;i<trace.length;i++)if(Math.abs(trace[i].x-trace[i-1].x)<1e-4)frozenMs+=trace[i].at-trace[i-1].at;
  expect(frozenMs).toBeLessThan(150);
  const counts=await page.evaluate(()=>{const scene=__game.renderer.game.scene.scenes[0];return {total:__game.sim.units.length,visible:scene.unitMotion.report.length,meshes:scene.children.list.filter(o=>o.type==='Mesh'&&o.visible).length};});expect(counts.total).toBe(180);expect(counts.visible).toBeLessThan(60);expect(counts.meshes).toBeLessThan(60);
  await page.locator('#pause').click();await page.waitForFunction(()=>__game.sim.paused);await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  const frozen=await page.evaluate(id=>__game.renderer.screenPoint(__game.sim.get(id)),tracked.id);await page.waitForTimeout(250);expect(await page.evaluate(id=>__game.renderer.screenPoint(__game.sim.get(id)),tracked.id)).toEqual(frozen);
  await page.evaluate(id=>__game.renderer.focusUnit(id),distantId);await page.waitForFunction(id=>__game.renderer.game.scene.scenes[0].unitMotion.report.some(r=>r.unitId===id),distantId);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,'stutter-culling-reentry.png'),fullPage:true});await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);
 }finally{clearTimeout(timer);await page.close();for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

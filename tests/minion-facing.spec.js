import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame as createGameServer} from '../scripts/browser-game-server.mjs';

test('普通兵真实渲染：双方视角均为己方背向前进、敌方正向接近，且契约可点击',async({browser})=>{
  const contexts=[],pages=[],errors=[];
  const {server}=await createGameServer({dataDir:mkdtempSync(path.join(tmpdir(),'kc-facing-'))});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  try{
    for(const side of [0,1]){
      const context=await browser.newContext(),page=await context.newPage();contexts.push(context);pages.push(page);
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(url);await page.locator('#tabRegister').click();await page.locator('#accountName').fill('朝向'+side+Date.now());
      await page.locator('#accountPassword').fill('test-password-5');await page.locator(`[name="side"][value="${side}"]`).check();await page.locator('#authSubmit').click();
      await page.waitForFunction(()=>window.__game?.renderer.game.scene.scenes[0]?.unitMotion?.report.filter(r=>r.action==='move').length>=10);
    }
    await pages[0].locator('#pause').click();await pages[0].waitForFunction(()=>__game.sim.paused);
    for(const [viewer,page] of pages.entries()){
      await page.waitForFunction(()=>__game.sim.paused);
      const units=await page.evaluate(()=>{
        const s=__game.sim,report=__game.renderer.game.scene.scenes[0].unitMotion.report;
        return report.filter(r=>!s.get(r.unitId)?.tower&&!s.get(r.unitId)?.hero).map(r=>({type:s.get(r.unitId).type,side:s.get(r.unitId).side,heading:r.heading,frame:r.artFrame,texture:r.texture,action:r.action,walkFrame:r.walkFrame}));
      });
      for(const side of [0,1])for(const type of side?['melee','ranged']:['melee','ranged','siege']){
        const matches=units.filter(u=>u.side===side&&u.type===type);expect(matches.length).toBeGreaterThan(0);
        for(const u of matches){
          expect(u.heading).toBe(side===viewer?'N':'S');
          expect(u.walkFrame!=null?Math.floor(Number(u.frame)/8):Number(u.frame)%8).toBe(side===viewer?4:0);
          const army=side?'defense':'attack',key=u.type==='melee'?'infantry':'arbalest';
          expect(u.texture).toBe(u.walkFrame!=null?'kc-'+key+'-walk-'+army:'kc-minions-'+army);
        }
      }
      await page.screenshot({path:`${process.env.MAGIC_QA_DIR}/minion-facing-side-${viewer}.png`,fullPage:true});
    }
    const page=pages[0];
    const hit=await page.evaluate(()=>{
      const u=__game.sim.units.find(u=>u.side===0&&!u.hero&&u.type==='melee'),p=__game.renderer.screenPoint(u),canvas=__game.renderer.game.canvas,r=canvas.getBoundingClientRect();
      return {x:r.left+p.x/500*r.width,y:r.top+(p.y-8)/__game.renderer.game.config.height*r.height};
    });
    await page.mouse.click(hit.x,hit.y);await expect(page.locator('#contractPopover')).toBeVisible();
    await page.locator('#confirmContract').click();await page.waitForFunction(()=>__game.sim.hero()?.classId===0);
    expect(errors).toEqual([]);
  }finally{for(const context of contexts)await context.close();await new Promise(resolve=>server.close(resolve));}
});

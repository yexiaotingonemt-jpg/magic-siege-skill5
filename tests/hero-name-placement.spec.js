import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';

for(const width of [1440,390])test(`密集战斗中名字保持自身锚点并响应自身状态 ${width}`,async({page})=>{
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;room.step=()=>{};
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(process.env.MAGIC_QA_DIR,'name-placement-')),room}),{server}=game;
 const account=await game.accounts.register({name:'英雄名字位置验收长名称',password:'hero-name-placement-test',side:0});
 const s=room.sim,p=room.player(account);s.units=[];s.waveAt=1e9;p.classId=4;
 for(const t of s.towers)Object.assign(t,{x:100,cd:1e9});
 const h=s.spawn(0,'ranged',0,1);expect(s.contract(p,h.id)).toBe(true);Object.assign(h,{x:0,y:2,speed:0,cd:1e9});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const report=()=>page.evaluate(id=>__game.renderer.game.scene.scenes[0].heroNames.report.find(r=>r.unitId===id),h.id);
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);};
 try{
  await page.setViewportSize({width,height:width===390?844:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);await expect(page).toHaveTitle(/魔法王座/);
  await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('hero-name-placement-test');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.renderer.getCamera());await page.locator('#locate').click();
  await page.waitForFunction(()=>{const y=__game.renderer.getCamera().scrollY,old=window.__nameCameraY;window.__nameCameraY=y;return old!=null&&Math.abs(y-old)<.02;});
  await expect.poll(report).toBeTruthy();const initial=await report();
  for(let i=0;i<3;i++){
   const other=s.makePlayer(0,false);other.classId=4;other.name='邻近友军'+i;
   const unit=s.spawn(0,'ranged',0,1);expect(s.contract(other,unit.id)).toBe(true);Object.assign(unit,{x:(i-1)*.3,y:2+i*.1,speed:0,cd:1e9});s.shield(unit,100,h,20);
  }
  await sync();await expect.poll(async()=>(await report())?.bottom).toBe(initial.bottom);
  const r=await report();expect(r.truncated).toBe(true);expect(r.cssFontSize).toBeGreaterThanOrEqual(11.9);
  const point=await page.evaluate(r=>{const canvas=__game.renderer.game.canvas.getBoundingClientRect(),camera=__game.renderer.getCamera();return {x:canvas.x+(r.left+r.right)/2/500*canvas.width,y:canvas.y+((r.top+r.bottom)/2-camera.scrollY)/__game.renderer.game.scale.gameSize.height*canvas.height};},r);
  await page.mouse.move(point.x,point.y);await expect.poll(()=>page.evaluate(name=>__game.renderer.game.scene.scenes[0].children.list.some(o=>o.visible&&o.text===name),account.name)).toBe(true);
  await page.locator('#battle').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`hero-name-placement-${width}.png`)});
  s.shield(h,100,h,20);h.eliteBuffs={score:20,hunt:20,fortitude:20,assault:20};await sync();await expect.poll(async()=>(await report())?.bottom).toBeLessThan(initial.bottom);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 }finally{await page.close();for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

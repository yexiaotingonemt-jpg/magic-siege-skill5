import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame as createGameServer} from '../scripts/browser-game-server.mjs';

test('弩手实机走路：八帧循环、两脚交换前后、暂停冻结及轮廓点选',async({browser})=>{
  const {server}=await createGameServer({dataDir:mkdtempSync(path.join(tmpdir(),'kc-walk-'))});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.locator('#tabRegister').click();await page.locator('#accountName').fill('步态'+Date.now());await page.locator('#accountPassword').fill('test-password-5');await page.locator('#authSubmit').click();
    await page.waitForFunction(()=>window.__game?.renderer.game.scene.scenes[0]?.unitMotion?.report.some(r=>r.texture==='kc-arbalest-walk-attack'));
    const frames=await page.evaluate(async()=>{
      const scene=__game.renderer.game.scene.scenes[0],id=__game.sim.units.find(u=>u.side===0&&!u.hero&&u.type==='ranged').id,seen=new Set(),start=performance.now();
      while(performance.now()-start<1200){const r=scene.unitMotion.report.find(r=>r.unitId===id);if(r?.action==='move')seen.add(r.walkFrame);await new Promise(requestAnimationFrame);}
      return [...seen].sort();
    });
    expect(frames).toEqual([0,1,2,3,4,5,6,7]);
    const depths=await page.evaluate(()=>{
      const textures=__game.renderer.game.scene.scenes[0].textures;
      return ['kc-arbalest-walk-attack','kc-arbalest-walk-defense'].map(key=>{
        const texture=textures.get(key),image=texture.getSourceImage();
        return [32,36].map(index=>{
          const f=texture.get(index),canvas=document.createElement('canvas');canvas.width=128;canvas.height=160;
          const c=canvas.getContext('2d');c.drawImage(image,f.cutX,f.cutY,128,160,0,0,128,160);const data=c.getImageData(0,0,128,160).data;
          let ly=0,ln=0,ry=0,rn=0;
          for(let y=110;y<160;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;if(data[i+3]>64&&data[i]>data[i+1]*1.1&&data[i+1]>data[i+2]*1.05&&data[i]>45){if(x<64){ly+=y;ln++;}else{ry+=y;rn++;}}}
          return ly/ln-ry/rn;
        });
      });
    });
    for(const [left,right]of depths){expect(left*right).toBeLessThan(0);expect(Math.abs(left)).toBeGreaterThan(3);expect(Math.abs(right)).toBeGreaterThan(3);}
    await page.locator('#pause').click();await page.waitForFunction(()=>__game.sim.paused);await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
    const frozen=await page.evaluate(()=>__game.renderer.game.scene.scenes[0].unitMotion.report.filter(r=>r.walkFrame!=null).map(r=>[r.unitId,r.artFrame]));
    await page.waitForTimeout(250);
    expect(await page.evaluate(()=>__game.renderer.game.scene.scenes[0].unitMotion.report.filter(r=>r.walkFrame!=null).map(r=>[r.unitId,r.artFrame]))).toEqual(frozen);
    await page.screenshot({path:`${process.env.MAGIC_QA_DIR}/arbalest-walking.png`,fullPage:true});
    const hit=await page.evaluate(()=>{const u=__game.sim.units.find(u=>u.side===0&&!u.hero&&u.type==='ranged'),p=__game.renderer.screenPoint(u),r=__game.renderer.game.canvas.getBoundingClientRect();return {x:r.left+p.x/500*r.width,y:r.top+(p.y-8)/__game.renderer.game.scale.gameSize.height*r.height};});
    await page.mouse.click(hit.x,hit.y);await expect(page.locator('#contractPopover')).toBeVisible();expect(errors).toEqual([]);
  }finally{await context.close();await new Promise(resolve=>server.close(resolve));}
});

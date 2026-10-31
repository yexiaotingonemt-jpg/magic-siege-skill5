import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame as createGameServer} from '../scripts/browser-game-server.mjs';

test('重甲兵实机步态：八帧换脚时网格和体型稳定，暂停与契约正常',async({browser})=>{
  const {server}=await createGameServer({dataDir:mkdtempSync(path.join(tmpdir(),'kc-infantry-'))});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.locator('#tabRegister').click();await page.locator('#accountName').fill('重甲步态'+Date.now());await page.locator('#accountPassword').fill('test-password-5');await page.locator('#authSubmit').click();
    await page.waitForFunction(()=>window.__game?.renderer.game.scene.scenes[0]?.unitMotion?.report.some(r=>r.texture==='kc-infantry-walk-attack'));
    const samples=await page.evaluate(async()=>{
      const scene=__game.renderer.game.scene.scenes[0],s=__game.sim,id=s.units.find(u=>u.side===0&&!u.hero&&u.type==='melee').id;
      const seen=new Map(),start=performance.now();
      while(performance.now()-start<1400){
        const r=scene.unitMotion.report.find(r=>r.unitId===id);
        if(r?.action==='move'&&!seen.has(r.walkFrame))seen.set(r.walkFrame,{frame:r.walkFrame,width:r.width,height:r.height,vertices:r.vertexSamples});
        await new Promise(requestAnimationFrame);
      }
      return [...seen.values()].sort((a,b)=>a.frame-b.frame);
    });
    expect(samples.map(r=>r.frame)).toEqual([0,1,2,3,4,5,6,7]);
    expect(new Set(samples.map(r=>r.width+':'+r.height)).size).toBe(1);
    expect(new Set(samples.map(r=>JSON.stringify(r.vertices))).size).toBe(1);
    const feet=await page.evaluate(()=>{
      const textures=__game.renderer.game.scene.scenes[0].textures;
      return ['kc-infantry-walk-attack','kc-infantry-walk-defense'].flatMap(key=>[0,4].map(direction=>[0,4].map(frame=>{
        const texture=textures.get(key),f=texture.get(direction*8+frame),c=document.createElement('canvas');c.width=128;c.height=160;
        const ctx=c.getContext('2d');ctx.drawImage(texture.getSourceImage(),f.cutX,f.cutY,128,160,0,0,128,160);const p=ctx.getImageData(0,0,128,160).data;
        let ly=0,ln=0,ry=0,rn=0;
        for(let y=120;y<160;y++)for(let x=34;x<=90;x++){
          const i=(y*128+x)*4;if(p[i+3]>64&&!(p[i+1]>p[i]*1.4&&p[i+2]>p[i]*1.4)&&!(p[i]>p[i+1]*1.5&&p[i+2]>p[i+1]*1.5)){
            if(x<64){ly+=y;ln++;}else{ry+=y;rn++;}
          }
        }
        return ly/ln-ry/rn;
      })));
    });
    for(const [a,b] of feet){expect(Number.isFinite(a)&&Number.isFinite(b)).toBe(true);expect(a*b).toBeLessThan(0);}
    await page.locator('#pause').click();await page.waitForFunction(()=>__game.sim.paused);
    const frozen=await page.evaluate(()=>__game.renderer.game.scene.scenes[0].unitMotion.report.filter(r=>r.walkFrame!=null).map(r=>[r.unitId,r.artFrame]));
    await page.waitForTimeout(250);expect(await page.evaluate(()=>__game.renderer.game.scene.scenes[0].unitMotion.report.filter(r=>r.walkFrame!=null).map(r=>[r.unitId,r.artFrame]))).toEqual(frozen);
    await page.screenshot({path:`${process.env.MAGIC_QA_DIR}/infantry-walking.png`,fullPage:true});
    const hit=await page.evaluate(()=>{const u=__game.sim.units.find(u=>u.side===0&&!u.hero&&u.type==='melee'),p=__game.renderer.screenPoint(u),r=__game.renderer.game.canvas.getBoundingClientRect();return {x:r.left+p.x/500*r.width,y:r.top+(p.y-8)/__game.renderer.game.config.height*r.height};});
    await page.mouse.click(hit.x,hit.y);await expect(page.locator('#contractPopover')).toBeVisible();await page.locator('#confirmContract').click();await page.waitForFunction(()=>__game.sim.hero()?.classId===0);
    expect(errors).toEqual([]);
  }finally{await context.close();await new Promise(resolve=>server.close(resolve));}
});

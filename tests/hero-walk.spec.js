import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {contractType} from '../shared/config.js';

test('五种契约英雄：双方视角的八向八帧、冻结、停步和战斗切换均在真实渲染中生效',async({browser})=>{
  test.setTimeout(120000);
  const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'kc-hero-walk-'))});
  const {room,server}=game,s=room.sim,actors=[],errors=[];room.step=()=>{};room.paused=true;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  async function sync(){
    room.sequence++;room.broadcast();
    await Promise.all(actors.map(({page})=>page.waitForFunction(n=>window.__game?.sim.sequence>=n,room.sequence)));
    await Promise.all(actors.map(({page})=>page.evaluate(async()=>{
      for(const u of __game.sim.units)u._renderDuration=1;
      await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    })));
  }
  const reports=()=>Promise.all(actors.map(({page})=>page.evaluate(()=>__game.renderer.game.scene.scenes[0].unitMotion.report.map(r=>({...r})))));
  try{
    for(const side of [0,1]){
      const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',msg=>{if(msg.type()==='error'&&!(msg.location().url.endsWith('/api/me')&&msg.text().includes('401')))errors.push(msg.text());});
      await page.goto(url);await expect(page).toHaveTitle(/魔法王座/);
      await page.locator('#tabRegister').click();
      await page.locator('#tabRegister').click();await page.locator('#accountName').fill('英雄步态'+side+Date.now());await page.locator('#accountPassword').fill('hero-walk-test-2026');
      await page.locator(`[name="side"][value="${side}"]`).check();await page.locator('#authSubmit').click();
      await page.waitForFunction(()=>window.__game?.renderer.game.scene.scenes[0]?.unitMotion);
      actors.push({page,context,p:room.player(game.accounts.rows.at(-1))});
    }
    s.time=10;s.units=[];s.projectiles=[];s.fields=[];s.animations=[];s.effects=[];
    for(const tower of s.towers)tower.x=100;
    const heroes=[0,2,3,4,5].map((classId,i)=>{
      const p=classId===4?actors[0].p:classId===3?actors[1].p:s.makePlayer(0,false);
      p.classId=classId;p.stamina=100;
      const u=s.spawn(p.side,contractType(classId),0,1,-8+i*4);expect(s.contract(p,u.id)).toBe(true);
      Object.assign(u,{x:-8+i*4,y:0,hp:1e7,maxHp:1e7,speed:2,range:0,aggro:0,targetId:null,cd:1e9});return u;
    });
    await sync();
    const contacts=await actors[0].page.evaluate(()=>{
      const textures=__game.renderer.game.scene.scenes[0].textures,quantile=a=>a.sort((x,y)=>x-y)[Math.floor((a.length-1)*.9)];
      return ['orc','lord','mage','elf'].flatMap(key=>[0,4].map(direction=>{
        const texture=textures.get('kc-'+key+'-walk'),boots=[];
        for(let frame=0;frame<8;frame++){
          const f=texture.get(direction*8+frame),canvas=document.createElement('canvas');canvas.width=192;canvas.height=256;
          const ctx=canvas.getContext('2d');ctx.drawImage(texture.getSourceImage(),f.cutX,f.cutY,192,256,0,0,192,256);
          const p=ctx.getImageData(0,0,192,256).data,pixels=[];
          for(let y=221;y<256;y++)for(let x=0;x<192;x++){
            const i=(y*192+x)*4,r=p[i],g=p[i+1],b=p[i+2];
            if(p[i+3]>96&&(key==='lord'?Math.abs(r-g)<20&&Math.abs(g-b)<20:r>g*1.1&&g>b*1.05))pixels.push([x,y]);
          }
          boots.push(pixels);
        }
        const centers=boots.map(p=>p.reduce((n,[x])=>n+x,0)/p.length).sort((a,b)=>a-b),cx=(centers[3]+centers[4])/2;
        return [0,4].map(frame=>quantile(boots[frame].filter(([x])=>x<cx).map(([,y])=>y))-quantile(boots[frame].filter(([x])=>x>=cx).map(([,y])=>y)));
      }));
    });
    for(const [left,right] of contacts){expect(Number.isFinite(left)&&Number.isFinite(right)).toBe(true);expect(left*right).toBeLessThan(0);}
    for(const {page} of actors)await page.evaluate(id=>__game.renderer.focusUnit(id),heroes[2].id);
    await actors[0].page.waitForTimeout(300);
    const vectors=[[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]],seen=new Map();
    for(const [heading,[dx,dy]] of vectors.entries()){
      const samples=[];
      for(let step=0;step<18;step++){
        s.time+=.065;
        for(const u of heroes){u.x+=dx*.075;u.y-=dy*.075;}
        await sync();
        const both=await reports();
        for(const [viewer,rows] of both.entries())for(const u of heroes){
          const r=rows.find(r=>r.unitId===u.id);expect(r.action).toBe('move');expect(r.texture).toMatch(/^kc-(orc|chariot|lord|mage|elf)-walk$/);
          const expected=viewer?[4,3,2,1,0,7,6,5][heading]:heading;
          expect(Math.floor(Number(r.artFrame)/8)).toBe(expected);expect(r.mesh).toBe(true);
          const key=viewer+':'+u.classId+':'+heading,prior=seen.get(key)||{frames:new Set(),vertices:JSON.stringify(r.vertexSamples),width:r.width,height:r.height};
          prior.frames.add(r.walkFrame);expect(JSON.stringify(r.vertexSamples)).toBe(prior.vertices);expect(r.width).toBe(prior.width);expect(r.height).toBe(prior.height);seen.set(key,prior);
        }
        samples.push(both[0].filter(r=>heroes.some(u=>u.id===r.unitId)).map(r=>[r.unitId,r.artFrame]));
      }
    }
    for(const value of seen.values())expect([...value.frames].sort()).toEqual([0,1,2,3,4,5,6,7]);
    for(const [viewer,{page}] of actors.entries())await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`hero-walk-view-${viewer}.png`)});
    const frozen=await reports();await actors[0].page.waitForTimeout(220);
    expect(await reports()).toEqual(frozen);
    s.time+=.5;await sync();
    for(const rows of await reports())for(const u of heroes){const r=rows.find(r=>r.unitId===u.id);expect(r.action).toBe('idle');expect(r.texture.endsWith('-walk')).toBe(false);expect(r.walkFrame).toBeNull();}
    for(const action of ['attack','skill','controlled']){
      s.time+=1;
      for(const u of heroes){
        u.lastAttackAt=action==='attack'?s.time:null;
        u.attackTo={x:u.x+1,y:u.y};u.skillAnimation=action==='skill'?{skill:0,start:s.time,release:s.time+.2,end:s.time+.7,from:{x:u.x,y:u.y},to:{x:u.x+2,y:u.y}}:null;
        u.stunUntil=action==='controlled'?s.time+1:0;
      }
      await sync();for(const rows of await reports())for(const u of heroes){const r=rows.find(r=>r.unitId===u.id);expect(r.action).toBe(action);expect(r.walkFrame).toBeNull();expect(r.texture.endsWith('-walk')).toBe(false);}
    }
    // Exercise the real confirmation flow for each class against the server.
    for(const classId of [0,2,3,4,5]){
      s.time+=2;const a=actors[classId===3?1:0];a.p.heroId=null;a.p.stamina=100;
      for(const u of heroes)u.hp=0;
      const u=s.spawn(a.p.side,contractType(classId),0,1,0);Object.assign(u,{x:0,y:0,speed:0,cd:1e9});
      await sync();await a.page.evaluate(id=>{__game.renderer.focusUnit(id);__game.selection.select(id);},u.id);
      await expect(a.page.locator('#contractPopover')).toBeVisible();
      if([4,5].includes(classId))await a.page.locator(`[data-contract-role="${classId}"]`).click();
      await a.page.locator('#confirmContract').click();await a.page.waitForFunction(id=>__game.sim.hero()?.classId===id,classId);
      expect(s.hero(a.p).classId).toBe(classId);
    }
    await actors[0].page.setViewportSize({width:390,height:844});
    await actors[0].page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,'hero-walk-mobile.png')});
    expect(await actors[0].page.locator('canvas').count()).toBeGreaterThan(0);
    expect(await actors[0].page.locator('vite-error-overlay').count()).toBe(0);expect(errors).toEqual([]);
  }finally{
    for(const {context} of actors)await context.close();
    await new Promise(resolve=>server.close(resolve));
  }
});

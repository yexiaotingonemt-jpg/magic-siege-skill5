import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from '../server.mjs';
import {contractType} from '../src/config.js';

const dir='evidence/fixes-20261026';fs.mkdirSync(dir,{recursive:true});
const result={at:new Date().toISOString(),checks:[],errors:[],viewports:[]};
const game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-fixes-'))}),room=game.room,sim=room.sim,actors=[];
room.paused=true;
await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const advance=n=>{const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.05,end-sim.time));};
async function sync(){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(q=>__game.sim.sequence>=q,room.sequence)));await new Promise(resolve=>setTimeout(resolve,60));}
async function check(name,fn){try{const evidence=await fn();result.checks.push({name,status:'PASS',evidence});}catch(e){result.checks.push({name,status:'FAIL',error:e.stack});console.error(name,e.message);}}
async function clickUnit(actor,u,classId){
 const page=actor.page;await page.evaluate(id=>__game.renderer.focusUnit(id),u.id);await page.waitForTimeout(350);
 const point=await page.evaluate(id=>{const g=__game.renderer,p=g.screenPoint(__game.sim.get(id)),r=g.game.canvas.getBoundingClientRect();return {x:r.left+p.x/Number(g.game.config.width)*r.width,y:r.top+(p.y-27)/Number(g.game.config.height)*r.height};},u.id);
 await page.mouse.click(point.x,point.y);await page.locator('#contractPopover').waitFor({state:'visible'});
 if([4,5].includes(classId))await page.locator(`[data-contract-role="${classId}"]`).click();
 await page.locator('#confirmContract').click();await page.waitForFunction(id=>__game.sim.hero()?.classId===id,classId);
}
try{
 for(const id of [0,3,4,5,2]){
  const context=await browser.newContext({viewport:{width:1440,height:1200},hasTouch:true,isMobile:true}),page=await context.newPage();
  page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base);await page.locator('#accountName').fill('修复验证'+id);await page.locator('#accountPassword').fill('isolated-fix-test');await page.locator(`[name="side"][value="${id===3?1:0}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  const player=room.player(game.accounts.rows.at(-1));player.classId=id;player.level=6;player.builds[id]=[1,1,1,1];const unit=sim.units.find(u=>!u.hero&&u.side===player.side&&u.type===contractType(id));assert.ok(sim.contract(player,unit.id));actors.push({id,page,context,player,unit});
 }
 await sync();for(const t of sim.towers)t.x=100;sim.waveAt=1e9;
 const rune=actors.find(a=>a.id===2),lord=actors.find(a=>a.id===3),h=rune.unit,enemy=lord.unit;
 await check('F02/F03 连轰四炮、末次减速和两阵营持续区域同步',async()=>{
  for(const a of actors)Object.assign(a.unit,{x:8,y:25,cd:1e9,speed:0});Object.assign(h,{x:0,y:0});Object.assign(enemy,{x:0,y:3,hp:1e7,maxHp:1e7});sim.units=actors.map(a=>a.unit);rune.player.cd=[0,0,0,0];await sync();
  for(const a of [rune,lord]){await a.page.locator('#locate').click();await a.page.waitForTimeout(350);}
  const hp=enemy.hp;await rune.page.locator('[data-cast="2"]').click();await rune.page.waitForFunction(()=>__game.sim.player.cd[2]>__game.sim.time);const start=sim.time;
  const evidence=[];
  for(const [elapsed,label]of [[.4,'start'],[1.15,'first'],[1.74,'gap'],[3.4,'final']]){
   advance(start+elapsed-sim.time);await sync();const slow=sim.activeDebuffs(enemy,'moveSlow');const views=[];
   for(const a of [rune,lord]){views.push(await a.page.evaluate(()=>({areas:__game.renderer.game.scene.scenes[0].skillFX.report.areas,slow:__game.sim.activeDebuffs(__game.sim.units.find(u=>u.classId===3),'moveSlow').map(d=>({ratio:d.ratio,until:d.until})),hp:__game.sim.units.find(u=>u.classId===3).hp})));if(label==='gap')assert.equal(views.at(-1).areas.filter(x=>x.kind==='runeBarrage').length,1);await a.page.screenshot({path:`${dir}/barrage-${label}-${a.id}.png`});}
   assert.deepEqual(views[0].slow,views[1].slow);near(views[0].hp,views[1].hp);evidence.push({elapsed,slow:slow.map(d=>({ratio:d.ratio,stacks:d.stacks,until:d.until})),views});
  }
  near(hp-enemy.hp,h.attack*6.8);near(sim.skillValues.at(-1).spent,sim.skillValues.at(-1).limit);assert.equal(sim.activeDebuffs(enemy,'moveSlow')[0].stacks,3);
  advance(3.9);await sync();assert.equal(sim.activeDebuffs(enemy,'moveSlow').length,1);advance(.11);await sync();assert.equal(sim.activeDebuffs(enemy,'moveSlow').length,0);return evidence;
 });
 await check('F03 打断引导后持续轰击区域立即撤销',async()=>{
  rune.player.cd[2]=0;await sync();await rune.page.locator('[data-cast="2"]').click();await rune.page.waitForFunction(()=>__game.sim.player.cd[2]>__game.sim.time);advance(.4);await sync();assert.equal(sim.fields.filter(f=>f.kind==='runeBarrage').length,1);sim.stun(h,enemy,1);await sync();assert.equal(await rune.page.evaluate(()=>__game.renderer.game.scene.scenes[0].skillFX.report.areas.length),0);advance(1.1);return {fieldCount:sim.fields.length};
 });
 await check('F01 五账号同步：在途击杀经验留在战车职业，火焰职业经验为0',async()=>{
  for(const a of actors)Object.assign(a.unit,{x:8,y:25,cd:1e9,speed:0});Object.assign(h,{x:0,y:0,stunUntil:0});Object.assign(enemy,{x:0,y:10,hp:10});rune.player.cd=[0,0,0,0];await sync();
  await rune.page.locator('[data-cast="0"]').click();await rune.page.waitForFunction(()=>__game.sim.player.cd[0]>__game.sim.time);advance(.4);assert.ok(sim.projectiles.some(b=>b.sourceId===h.id));sim.damage(null,h,1e9);const before=structuredClone(rune.player.progress);
  const soldier=sim.spawn(0,'ranged',0,1,0);Object.assign(soldier,{x:0,y:0,speed:0,cd:1e9});await sync();await clickUnit(rune,soldier,4);rune.unit=soldier;advance(1.2);await sync();
  const delta={rune:rune.player.progress[2].xp-before[2].xp,fire:rune.player.progress[4].xp-before[4].xp};near(delta.rune,sim.config.world.heroKillXp);near(delta.fire,0);assert.equal(enemy.hp,0);
  const progresses=await Promise.all(actors.map(a=>a.page.evaluate(id=>__game.sim.players.find(p=>p.id===id).progress,rune.player.id)));for(const progress of progresses)assert.deepEqual(progress,progresses[0]);await rune.page.screenshot({path:`${dir}/xp-correct-source.png`});return delta;
 });
 // Fresh isolated heroes; all five mobile HUDs have actual upgrade buttons.
 sim.resetMap();room.stageResetAt=sim.metrics.resets;for(const a of actors){a.player.classId=a.id;a.player.stamina=100;a.player.progress[a.id]={level:6,xp:0,points:2};a.player.builds[a.id]=[1,1,1,1];a.player.cd=[0,0,0,0];const unit=sim.units.find(u=>!u.hero&&u.side===a.player.side&&u.type===contractType(a.id));assert.ok(sim.contract(a.player,unit.id));a.unit=unit;}await sync();
 for(const a of actors)for(const [width,height]of [[640,1136],[390,844],[360,800],[320,568]])await check(`F04 职业${a.id} ${width}×${height}触屏详情和加点不误触施法`,async()=>{
  const page=a.page;await page.setViewportSize({width,height});a.player.builds[a.id]=[1,1,1,1];a.player.points=2;await sync();
  const layout=await page.evaluate(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
   return {game:rect(document.querySelector('.game')),battle:rect(document.querySelector('canvas')),overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('#skills button:not([hidden])')].map(e=>{const r=rect(e),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {kind:e.dataset.cast!=null?'cast':e.dataset.info!=null?'info':'upgrade',...r,reachable:!!at&&e.contains(at)};}),font:Number.parseFloat(getComputedStyle(document.querySelector('.skill-cost')).fontSize)*Number(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))};
  });
  assert.equal(layout.overflow,false);assert.ok(layout.battle.height>150);assert.ok(layout.font>=11.9);assert.ok(layout.game.bottom<=height+1);
  for(const b of layout.buttons){assert.ok(b.width>=43.9&&b.height>=43.9,JSON.stringify(b));assert.ok(b.reachable,JSON.stringify(b));assert.ok(b.bottom<layout.game.bottom);}
  for(let i=0;i<layout.buttons.length;i++)for(let j=i+1;j<layout.buttons.length;j++){const x=layout.buttons[i],y=layout.buttons[j];assert.ok(Math.min(x.right,y.right)<=Math.max(x.x,y.x)+.1||Math.min(x.bottom,y.bottom)<=Math.max(x.y,y.y)+.1,`overlap: ${JSON.stringify([x,y])}`);}
  const stamina=a.player.stamina,casts=sim.metrics.casts;await page.locator('[data-info="2"]').tap();await page.locator('#gameSheet').waitFor({state:'visible'});const details=page.locator('[data-ability-detail="2"]');await details.locator('summary').tap();assert.equal(await details.getAttribute('open'),'');await page.screenshot({path:`${dir}/details-${a.id}-${width}.png`});await page.locator('#sheetClose').tap();
  const before=a.player.builds[a.id][0];await page.locator('[data-up="0"]').tap();await page.waitForFunction(({id,rank})=>__game.sim.player.builds[id][0]===rank,{id:a.id,rank:before+1});assert.equal(a.player.stamina,stamina);assert.equal(sim.metrics.casts,casts);
  await page.screenshot({path:`${dir}/hud-${a.id}-${width}.png`});result.viewports.push({classId:a.id,width,height,layout});return {buttonCount:layout.buttons.length,minHit:Math.min(...layout.buttons.flatMap(b=>[b.width,b.height])),font:layout.font};
 });
 assert.deepEqual(result.errors,[]);
}catch(e){result.fatal=e.stack;}finally{
 fs.writeFileSync(`${dir}/browser-verification.json`,JSON.stringify(result,null,2));await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));
 const failures=result.checks.filter(x=>x.status==='FAIL');console.log(JSON.stringify({passed:result.checks.length-failures.length,failed:failures.length,failures,errors:result.errors,fatal:result.fatal},null,2));if(failures.length||result.fatal||result.errors.length)process.exitCode=1;
}

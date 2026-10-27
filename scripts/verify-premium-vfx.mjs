import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from '../server.mjs';
import {contractType,classes,names} from '../src/config.js';
import {vfxProfile} from '../src/vfx-profiles.js';
const dir='evidence/premium-vfx';fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(dir+'/video',{recursive:true});
const game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-vfx-v20-'))}),room=game.room,sim=room.sim,actors=[],result={at:new Date().toISOString(),checks:[],skills:[],errors:[]};room.paused=true;
await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const advance=n=>{const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.05,end-sim.time));};
async function sync(wait=40){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence)));if(wait)await new Promise(r=>setTimeout(r,wait));}
async function report(page){return page.evaluate(()=>JSON.parse(JSON.stringify(__game.renderer.game.scene.scenes[0].skillFX.report)));}
function prepare(actor,skill){
 sim.time+=3;sim.units=[];sim.fields=[];sim.animations=[];sim.jobs=[];sim.projectiles=[];sim.effects=[];sim.waveAt=1e9;for(const t of sim.towers)t.x=100;
 for(const a of actors){a.p.heroId=null;a.p.classId=a.id;a.p.progress[a.id]={level:6,xp:0,points:2};a.p.builds[a.id]=[1,1,1,1];a.p.cd=[0,0,0,0];a.p.stamina=100;a.p.auto=false;const h=sim.spawn(a.p.side,contractType(a.id),0,1,0);assert.ok(sim.contract(a.p,h.id));Object.assign(h,{x:0,y:0,cd:1e9,speed:0});a.h=h;}
 const main=actor.h,enemy=actors.find(a=>a.p.side!==actor.p.side).h,allies=actors.filter(a=>a.p.side===actor.p.side&&a!==actor).map(a=>a.h);
 for(const a of actors.filter(a=>a!==actor)){Object.assign(a.h,{x:3*(a.id%3-1),y:a.p.side===actor.p.side?-2:5,hp:50000,maxHp:50000});}
 Object.assign(main,{x:0,y:0,hp:main.maxHp*.65});Object.assign(enemy,{x:0,y:5});main.targetId=enemy.id;enemy.targetId=allies[0]?.id;
 for(const [i,a]of allies.entries()){a.x=(i%2?1:-1)*4;a.y=-1;a.hp=1000+i*200;}
 for(let i=0;i<4;i++){const u=sim.spawn(1-actor.p.side,'melee',0,1,i);Object.assign(u,{x:(i-1.5)*2,y:6,hp:50000,maxHp:50000,cd:1e9,speed:0});}
 if(actor.id===5&&skill===2){for(const a of allies.slice(0,3))sim.debuff(a,enemy,'attackDown',.25,10);}
 if(actor.id===4)sim.addHeat(main,5);
 return {main,enemy,allies};
}
try{
 for(const id of [0,2,3,4,5]){const context=await browser.newContext({viewport:{width:640,height:1136},hasTouch:true,isMobile:true,...(id===0?{recordVideo:{dir:dir+'/video',size:{width:640,height:1136}}}:{})}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base);await page.locator('#accountName').fill('特效验收'+id);await page.locator('#accountPassword').fill('isolated-premium-vfx');await page.locator(`[name="side"][value="${id===3?1:0}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());actors.push({id,page,context,p:room.player(game.accounts.rows.at(-1))});}
 for(const actor of actors)for(let skill=0;skill<4;skill++){
  const {main,enemy}=prepare(actor,skill);await sync();for(const a of [actor,actors[0]]){await a.page.evaluate(id=>__game.renderer.focusUnit(id),main.id);await a.page.waitForTimeout(280);}
  assert.ok(sim.castPlan(skill,actor.p).ok,sim.castPlan(skill,actor.p).reason);await actor.page.locator(`[data-cast="${skill}"]`).click();await actor.page.waitForFunction(i=>__game.sim.player.cd[i]>__game.sim.time,skill);const start=sim.time,evidence={classId:actor.id,skill,name:names[actor.id][skill],signature:vfxProfile(actor.id,skill).signature,frames:[]};
  for(const [elapsed,stage]of [[.15,'windup'],[.5,'release'],[.9,'impact'],[1.6,'afterglow']]){
   advance(start+elapsed-sim.time);await sync(100);const fx=await report(actor.page);assert.equal(fx.version,'hero-vfx-v20');assert.ok(fx.spriteCount<=fx.maxSprites);if(stage!=='afterglow')assert.ok(fx.events.some(e=>e.sourceId===main.id&&e.skill===skill),`${actor.id}/${skill}/${stage}: event missing`);
   const filename=`skill-${actor.id}-${skill}-${stage}.png`;await actor.page.locator('.battle-wrap').screenshot({path:dir+'/'+filename});evidence.frames.push({elapsed,stage,file:filename,fx});if(skill===3&&stage==='impact'){await actor.page.setViewportSize({width:390,height:844});await actor.page.waitForTimeout(100);await actor.page.screenshot({path:dir+`/ultimate-mobile-${actor.id}.png`});await actor.page.setViewportSize({width:640,height:1136});}
  }
  if(actor.id===0&&skill===3){sim.damage(enemy,main,Math.min(1500,main.hp*.1));advance(4.2);await sync(160);const fx=await report(actor.page);assert.ok(fx.events.some(e=>e.role==='shield-formed'));await actor.page.locator('.battle-wrap').screenshot({path:dir+'/orc-shield-formed.png'});evidence.shieldFormed=fx;}
  if(actor.id===2&&skill===2){advance(1.9);await sync(100);const impacts=sim.animations.filter(e=>e.classId===2&&e.skill===2&&e.kind==='impact');assert.ok(!sim.fields.some(f=>f.kind==='runeBarrage'));evidence.fourthShell=await report(actor.page);await actor.page.locator('.battle-wrap').screenshot({path:dir+'/rune-fourth-shell.png'});}if(actor.id===3&&skill===3){advance(1);sim.afterBasicAttack(main,enemy);await sync(80);const fx=await report(actor.page);assert.ok(fx.events.some(e=>e.role==='royal-splash'));assert.ok(!fx.cinematics.some(e=>e.role==='coronation'));evidence.splash=fx;await actor.page.locator('.battle-wrap').screenshot({path:dir+'/lord-royal-splash.png'});}
  if(skill===3){assert.ok(evidence.frames.some(f=>f.fx.cinematics.some(e=>e.signature===evidence.signature)),`ultimate cinematic missing ${actor.id}`);}
  result.skills.push(evidence);console.log('PASS',classes[actor.id],names[actor.id][skill]);
 }
 assert.equal(new Set(result.skills.map(s=>s.signature)).size,20);result.checks.push('20个技能实际按键与4阶段截图，5个大招具有独立演出，兽人成盾第二幕及领主普攻溅射无重复加冕');
 // Deliberate dense fixture: 30 heroes, all skills available, no formal account writes.
 const viewer=actors[0];prepare(viewer,0);sim.units=[];for(const a of actors)a.p.heroId=null;sim.fields=[];sim.animations=[];sim.time+=3;
 for(let i=0;i<30;i++){const side=i>=20?1:0,id=side?3:[0,2,4,5][i%4],p=sim.makePlayer(side,true);p.classId=id;p.level=6;p.builds[id]=[1,1,1,1];p.stamina=100;const h=sim.spawn(side,contractType(id),0,1,0);assert.ok(sim.contract(p,h.id));Object.assign(h,{x:(i%8-3.5)*2.2,y:side?4:-3,hp:1e6,maxHp:1e6});}
 for(const a of actors)a.p.retired=true;await sync();await viewer.page.evaluate(()=>__game.renderer.focusUnit(__game.sim.units[0].id));await viewer.page.waitForTimeout(350);await viewer.page.evaluate(()=>{window.__vfxFrames=[];let last=performance.now();const step=t=>{__vfxFrames.push(t-last);last=t;window.__vfxRaf=requestAnimationFrame(step);};__vfxRaf=requestAnimationFrame(step);});
 let peakSprites=0,peakEvents=0;for(let frame=0;frame<120;frame++){advance(.1);await sync(35);const r=await report(viewer.page);peakSprites=Math.max(peakSprites,r.spriteCount);peakEvents=Math.max(peakEvents,r.events.length);if(frame===5)await viewer.page.screenshot({path:dir+'/dense-peak.png'});assert.ok(r.spriteCount<=128);}
 const frames=await viewer.page.evaluate(()=>{cancelAnimationFrame(__vfxRaf);return __vfxFrames.slice(1).sort((a,b)=>a-b);});result.performance={fixtureHeroes:30,battleSeconds:12,frameSamples:frames.length,p95:frames[Math.floor(frames.length*.95)],peakSprites,peakEvents};await viewer.page.screenshot({path:dir+'/dense-battle.png'});result.checks.push('30英雄同时施法显示预算、帧间隔采样和战场截图');
 assert.deepEqual(result.errors,[]);
 const cards=result.skills.map(s=>`<article><h2>${classes[s.classId]} · ${s.name}</h2><p>${vfxProfile(s.classId,s.skill).read}</p><div>${s.frames.slice(0,3).map(f=>`<figure><img src="${f.file}"><figcaption>${f.stage}</figcaption></figure>`).join('')}</div></article>`).join('');fs.writeFileSync(dir+'/gallery.html',`<!doctype html><meta charset="utf-8"><title>魔法王座20技能特效验收</title><style>body{margin:32px;background:#121c1a;color:#eee4cf;font:16px Microsoft YaHei}h1{color:#e0c79d}article{padding:18px 0;border-top:1px solid #726448}h2{margin:0 0 8px}p{color:#b5c9be}article>div{display:flex;gap:15px}figure{margin:0;width:31%}img{width:100%}figcaption{padding:6px;color:#a8cebd}</style><h1>魔法王座 · 五职业20技能特效</h1><p>真实浏览器关键帧，按前摇、释放、命中排列。伤害与施法时间沿用当前设计5规则。</p>${cards}`);
}catch(e){result.fatal=e.stack;process.exitCode=1;}finally{fs.writeFileSync(dir+'/verification.json',JSON.stringify(result,null,2));for(const a of actors){if(a.id===0)result.video=await a.page.video()?.path();await a.context.close();}await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));console.log(JSON.stringify({skills:result.skills.length,checks:result.checks,performance:result.performance,errors:result.errors,fatal:result.fatal,video:result.video},null,2));}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createBrowserGame as createGameServer} from './browser-game-server.mjs';
import {contractType} from '../shared/config.js';

const dir='evidence/range-names';fs.mkdirSync(dir,{recursive:true});
const result={at:new Date().toISOString(),checks:[],errors:[],samples:{}},actors=[];
const game=await createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-range-names-'))}),room=game.room,sim=room.sim;room.paused=true;
await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const advance=n=>{const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.05,end-sim.time));};
async function sync(wait=250){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence)));if(wait)await pause(wait);}
async function focus(u){await Promise.all(actors.map(a=>a.page.evaluate(id=>__game.renderer.focusUnit(id),u.id)));await pause(330);}
async function check(name,fn){await fn();result.checks.push(name);console.log('PASS',name);}
const names=page=>page.evaluate(()=>JSON.parse(JSON.stringify(__game.renderer.game.scene.scenes[0].heroNames.report)));
const row=(rows,u)=>{const r=rows.find(r=>r.unitId===u.id);assert.ok(r,`missing name ${u.id}`);return r;};
const box=r=>r.bbox||r;
async function click(a,u){let q=await a.page.evaluate(id=>{const u=__game.sim.get(id),p=__game.renderer.screenPoint(u),b=__game.renderer.game.canvas.getBoundingClientRect();return {x:b.left+p.x*b.width/500,y:b.top+(p.y-(u.tower?44:u.hero?39:27))*b.height/500,visible:p.y>55&&p.y<490};},u.id);if(!q.visible){await a.page.evaluate(id=>__game.renderer.focusUnit(id),u.id);await pause(330);q=await a.page.evaluate(id=>{const u=__game.sim.get(id),p=__game.renderer.screenPoint(u),b=__game.renderer.game.canvas.getBoundingClientRect();return {x:b.left+p.x*b.width/500,y:b.top+(p.y-(u.tower?44:u.hero?39:27))*b.height/500};},u.id);}await a.page.mouse.click(q.x,q.y);await pause(150);}
async function target(a,u){await click(a,u);assert.equal(a.h.manualTargetId,u.id);assert.equal(a.h.targetId,u.id);await Promise.all(actors.map(v=>v.page.waitForFunction(({h,t})=>__game.sim.get(h)?.manualTargetId===t,{h:a.h.id,t:u.id})));}
function soldier(x,y,side=1){const u=sim.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp:1e6,maxHp:1e6,speed:0,cd:1e9});return u;}
async function reset(){
 await pause(950);sim.time+=3;sim.units=[];sim.fields=[];sim.animations=[];sim.jobs=[];sim.projectiles=[];sim.effects=[];sim.waveAt=sim.populationAt=1e9;
 for(const t of sim.towers)Object.assign(t,{x:100,cd:1e9});
 for(const [index,a]of actors.entries()){a.p.heroId=null;a.p.classId=a.id;a.p.progress[a.id]={level:6,xp:0,points:2};a.p.builds[a.id]=[1,1,1,1];a.p.cd=[0,0,0,0];a.p.stamina=100;a.p.auto=false;const u=sim.spawn(a.p.side,contractType(a.id),0,1,0);assert.ok(sim.contract(a.p,u.id));Object.assign(u,{x:(index-1)*5,y:index===2?4:0,hp:1e6,maxHp:1e6,speed:0,cd:1e9});a.h=u;}
 await sync();await focus(actors[0].h);
}
try{
 const specs=[{id:4,side:0,name:'玩家名字长文本甲乙丙丁戊己庚辛壬癸'},{id:5,side:0,name:'同阵营伙伴'},{id:3,side:1,name:'敌方王庭领主'}];
 for(const spec of specs){const context=await browser.newContext({viewport:{width:640,height:1136},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base);await page.locator('#accountName').fill(spec.name);await page.locator('#accountPassword').fill('isolated-range-names');await page.locator(`[name="side"][value="${spec.side}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>!!window.__game?.renderer.game.scene.scenes[0]?.heroNames);actors.push({...spec,page,context,p:room.player(game.accounts.rows.at(-1))});}
 const [attack,ally,defense]=actors;
 await check('警戒外20格内及20格边界可实际点击锁定、同步和追击，20格外拒绝保留原锁',async()=>{
  await reset();attack.h.x=-10;attack.h.y=0;ally.h.y=-6;defense.h.y=6;const chosen=soldier(10,0),outside=soldier(0,21);await sync();await target(attack,chosen);assert.ok(Math.hypot(chosen.x-attack.h.x,chosen.y-attack.h.y)>attack.h.aggro);const halo=await attack.page.evaluate(()=>__game.renderer.game.scene.scenes[0].targetHalos.report);assert.ok(halo.some(r=>r.kind==='manual'&&r.unitId===chosen.id));await click(attack,outside);assert.equal(attack.h.manualTargetId,chosen.id);assert.match(await attack.page.locator('#notice').textContent(),/20格/);attack.h.speed=2;advance(.2);await sync();assert.ok(attack.h.x> -10);assert.equal(attack.h.targetId,chosen.id);result.samples.range={distance:20,hero:attack.h.id,manual:chosen.id,outside:outside.id};await focus(attack.h);await attack.page.screenshot({path:`${dir}/manual-20-boundary.png`});
 });
 await check('20格锁定不扩大技能距离，进入原技能范围后实际按钮命中手动目标',async()=>{
  await reset();attack.h.x=-10;attack.h.y=0;ally.h.y=-8;defense.h.y=8;const chosen=soldier(5,0);await sync();await target(attack,chosen);assert.ok(!sim.castPlan(0,attack.p).ok||sim.castPlan(0,attack.p).t.id!==chosen.id);chosen.x=-2;await sync();assert.equal(sim.castPlan(0,attack.p).t.id,chosen.id);const hp=chosen.hp;await attack.page.locator('[data-cast="0"]').click();await attack.page.waitForFunction(()=>__game.sim.player.cd[0]>__game.sim.time);advance(.4);await sync(80);assert.ok(chosen.hp<hp);
 });
 await check('三账号英雄均显示所属玩家名称，友敌颜色随观察阵营反转，普通小兵无名称',async()=>{
  await reset();for(const viewer of actors){const rows=await names(viewer.page);for(const owner of actors){const r=row(rows,owner.h);assert.equal(r.name,owner.p.name);assert.ok(r.text.length>0);const same=owner.p.side===viewer.p.side,reference=row(rows,same?viewer.h:(viewer.p.side===0?defense.h:attack.h));assert.equal(r.color,reference.color);const reverse=row(await names((viewer.p.side===0?defense:attack).page),owner.h);assert.notEqual(r.color,reverse.color);}assert.equal(new Set(rows.map(r=>r.unitId)).size,rows.length);assert.ok(rows.every(r=>sim.get(r.unitId)?.hero));}
  result.samples.names=await Promise.all(actors.map(a=>names(a.page)));for(const a of actors)await a.page.screenshot({path:`${dir}/names-side-${a.p.side}-${a.id}.png`});
 });
 await check('名称避让血条状态及技能伤害飘字，长名与390宽保持可读',async()=>{
  await reset();attack.h.x=-3;ally.h.x=3;defense.h.x=0;defense.h.y=4;sim.debuff(defense.h,attack.h,'moveSlow',.2,10,null,true);await sync();await focus(defense.h);await attack.page.setViewportSize({width:390,height:844});await pause(200);await target(attack,defense.h);await attack.page.locator('[data-cast="0"]').click();await attack.page.waitForFunction(()=>__game.sim.player.cd[0]>__game.sim.time);advance(.4);await sync(40);const rows=await names(attack.page),name=row(rows,defense.h),bounds=box(name);assert.ok(Number.isFinite(bounds.top));const top=await attack.page.evaluate(id=>__game.renderer.game.scene.scenes[0].statusIcons.top(id),defense.h.id);assert.ok(bounds.bottom<=top-1);const numbers=await attack.page.evaluate(()=>JSON.parse(JSON.stringify(__game.renderer.game.scene.scenes[0].combatNumbers.report)));assert.ok(numbers.some(n=>n.targetId===defense.h.id));for(const number of numbers.filter(n=>n.targetId===defense.h.id))assert.ok(number.bottom<bounds.top);result.samples.mobile={names:rows,numbers};await attack.page.screenshot({path:`${dir}/mobile-390-buffs-damage.png`});await attack.page.setViewportSize({width:640,height:1136});
 });
 await check('英雄阵亡移除名称，新契约及刷新重连显示正确归属，没有旧名称残留',async()=>{
  await reset();const old=ally.h.id;ally.h.hp=0;advance(.05);await sync();for(const a of actors)assert.ok(!(await names(a.page)).some(r=>r.unitId===old));ally.p.heroId=null;const u=sim.spawn(0,'ranged',0,1,2);assert.ok(sim.contract(ally.p,u.id));Object.assign(u,{x:2,y:0,hp:1e6,maxHp:1e6,speed:0,cd:1e9});ally.h=u;await sync();for(const a of actors)assert.equal(row(await names(a.page),u).name,ally.p.name);await defense.page.reload();await defense.page.waitForFunction(()=>!!window.__game?.renderer.game.scene.scenes[0]?.heroNames);await pause(250);await focus(u);assert.equal(row(await names(defense.page),u).name,ally.p.name);
 });
 assert.deepEqual(result.errors,[]);
}catch(e){result.fatal=e.stack;for(const a of actors)await a.page.screenshot({path:`${dir}/failure-${a.id}.png`}).catch(()=>{});process.exitCode=1;}finally{
 fs.writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2));await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));console.log(JSON.stringify({checks:result.checks.length,errors:result.errors,fatal:result.fatal},null,2));
}

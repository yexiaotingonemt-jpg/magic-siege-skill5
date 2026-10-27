import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from '../server.mjs';
import {contractType,classes,names,defaults} from '../src/config.js';

const dir='evidence/skill-double';fs.mkdirSync(dir,{recursive:true});
const result={at:new Date().toISOString(),checks:[],skills:[],errors:[]},actors=[];
const game=createGameServer({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'kc5-skill-double-'))}),room=game.room,sim=room.sim;room.paused=true;
await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const advance=n=>{const end=sim.time+n;while(sim.time<end-1e-8)sim.tick(Math.min(.05,end-sim.time));};
async function sync(wait=80){room.sequence++;room.broadcast();await Promise.all(actors.map(a=>a.page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence)));if(wait)await new Promise(r=>setTimeout(r,wait));}
async function cast(a,i){assert.ok(sim.castPlan(i,a.p).ok,sim.castPlan(i,a.p).reason);await a.page.locator(`[data-cast="${i}"]`).click();await a.page.waitForFunction(i=>__game.sim.player.cd[i]>__game.sim.time,i);}
const report=page=>page.evaluate(()=>JSON.parse(JSON.stringify({fx:__game.renderer.game.scene.scenes[0].skillFX.report,icons:__game.renderer.game.scene.scenes[0].statusIcons.report})));
async function check(name,fn){await fn();result.checks.push(name);console.log('PASS',name);}
function prepare(actor,skill){
 sim.time+=3;sim.units=[];sim.fields=[];sim.animations=[];sim.jobs=[];sim.projectiles=[];sim.effects=[];sim.waveAt=sim.populationAt=1e9;for(const t of sim.towers)t.x=100;
 for(const a of actors){a.p.heroId=null;a.p.classId=a.id;a.p.progress[a.id]={level:6,xp:0,points:2};a.p.builds[a.id]=[1,1,1,1];a.p.cd=[0,0,0,0];a.p.stamina=100;a.p.auto=false;const h=sim.spawn(a.p.side,contractType(a.id),0,1,0);assert.ok(sim.contract(a.p,h.id));Object.assign(h,{x:0,y:0,cd:1e9,speed:0});a.h=h;}
 const main=actor.h,enemy=actors.find(a=>a.p.side!==actor.p.side).h,allies=actors.filter(a=>a.p.side===actor.p.side&&a!==actor).map(a=>a.h);
 for(const a of actors.filter(a=>a!==actor))Object.assign(a.h,{x:3*(a.id%3-1),y:a.p.side===actor.p.side?-2:5,hp:50000,maxHp:50000});
 main.hp=main.maxHp*.65;Object.assign(enemy,{x:0,y:5});main.targetId=enemy.id;enemy.targetId=allies[0]?.id;
 for(const [i,a]of allies.entries()){a.x=(i%2?1:-1)*4;a.y=-1;a.hp=1000+i*200;}
 for(let i=0;i<4;i++)soldier((i-1.5)*2,6,1-actor.p.side);
 if(actor.id===5&&skill===2)for(const a of allies.slice(0,3))sim.debuff(a,enemy,'attackDown',.25,10);
 if(actor.id===4)sim.addHeat(main,5);
 return {main,enemy,allies};
}
function soldier(x,y,side=0){const u=sim.spawn(side,'melee',0,1,x);Object.assign(u,{x,y,hp:50000,maxHp:50000,cd:1e9,speed:0});return u;}
const lord=()=>actors.find(a=>a.id===3);
async function focus(page,id){await page.evaluate(id=>__game.renderer.focusUnit(id),id);await page.waitForTimeout(280);}
try{
 for(const id of [0,2,3,4,5]){const context=await browser.newContext({viewport:{width:640,height:1136},hasTouch:true,isMobile:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base);await page.locator('#accountName').fill('技能翻倍验收'+id);await page.locator('#accountPassword').fill('isolated-skill-double');await page.locator(`[name="side"][value="${id===3?1:0}"]`).check();await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());actors.push({id,context,page,p:room.player(game.accounts.rows.at(-1))});}
 await check('五职业20技能实际按键、翻倍收益额度、更新后说明与代表性伤害',async()=>{
  for(const actor of actors)for(let skill=0;skill<4;skill++){
   const {main,enemy}=prepare(actor,skill),before=enemy.hp;await sync();await focus(actor.page,main.id);
   const title=await actor.page.locator(`[data-cast="${skill}"]`).getAttribute('title');assert.ok(title&&!/undefined|NaN/.test(title));
   const stamina=actor.p.stamina;await cast(actor,skill);near(actor.p.stamina,stamina-defaults.heroes[actor.id].skills[skill].cost);
   const value=sim.skillValues.at(-1);near(value.limit,value.attack*20*value.cost);near(value.base,value.attack*16*value.cost);
   advance(.2);await sync();if(actor.id===3&&skill<2){const fx=(await report(actor.page)).fx,area=fx.areas.find(a=>a.ownerId===main.id&&a.kind===(skill===0?'lordFan':'lordCharge'));assert.ok(area);near(area.radius,(skill===0?10:3)*18);await actor.page.screenshot({path:dir+`/lord-${skill+1}-windup.png`});}
   advance(1.4);await sync();const {fx}=await report(actor.page);assert.ok(fx.spriteCount<=fx.maxSprites);near(main.attack,defaults.heroes[actor.id].attack*1.15);
   if(skill===0){const ratio={0:12,2:null,3:3.2,4:16,5:6}[actor.id];near(before-enemy.hp,ratio==null?enemy.maxHp*.08:main.attack*ratio);}
   if(actor.id===0&&skill===3){sim.damage(enemy,main,1000);advance(3.8);await sync();near(main.shield,2000);}
   if(actor.id===5&&skill===1){const target=sim.get(main.linkId),hp=target.hp;sim.heal(main,100,main);near(target.hp-hp,200);await sync();}
   if(actor.id===3&&skill===2){assert.ok(fx.areas.some(a=>a.kind==='lordBurn'&&a.radius===90));await actor.page.screenshot({path:dir+'/lord-flame-radius-5.png'});}
   if(skill===3)await actor.page.screenshot({path:dir+`/ultimate-${actor.id}.png`});
   result.skills.push({classId:actor.id,skill,name:names[actor.id][skill],title,attack:main.attack,enemyDamage:before-enemy.hp,base:value.base,limit:value.limit,spent:value.spent});console.log('CAST',classes[actor.id],names[actor.id][skill]);
  }
  assert.equal(result.skills.length,20);
 });
 await check('领主1技能10格边界生效、10格外不命中，前摇半径180像素',async()=>{
  const actor=lord();prepare(actor,0);sim.units=[actor.h];const edge=soldier(0,-10),outside=soldier(0,-10.01);await sync();await focus(actor.page,actor.h.id);
  await cast(actor,0);advance(.2);await sync();const area=(await report(actor.page)).fx.areas.find(a=>a.kind==='lordFan');near(area.radius,180);await actor.page.screenshot({path:dir+'/lord-fan-range-10.png'});
  advance(.2);await sync();near(edge.maxHp-edge.hp,actor.h.attack*3.2);near(outside.hp,outside.maxHp);
 });
 await check('领主冲锋半径3格覆盖侧翼、击退5格，火焰半径5格且沿途附加40%跳伤',async()=>{
  const actor=lord();prepare(actor,2);sim.units=[actor.h];const target=soldier(0,-17),wing=soldier(3,-7),outside=soldier(-3.01,-7),flameEdge=soldier(5,0),flameOutside=soldier(5.01,0);
  await sync();await focus(actor.page,actor.h.id);await cast(actor,2);advance(.4);await sync();assert.ok(sim.fields.some(f=>f.type==='lordScorch'&&f.host===flameEdge.id));assert.ok(!sim.fields.some(f=>f.type==='lordScorch'&&f.host===flameOutside.id));
  await cast(actor,1);advance(.2);await sync();const area=(await report(actor.page)).fx.areas.find(a=>a.kind==='lordCharge');near(area.radius,54);await actor.page.screenshot({path:dir+'/lord-charge-radius-3.png'});
  advance(2.1);await sync();near(actor.h.y,-17);near(wing.x,8);near(outside.x,-3.01);assert.ok(actor.h.attack*2.4<=wing.maxHp-wing.hp);assert.ok(!sim.animations.some(e=>e.kind==='impact'&&e.skill===1&&e.targets?.some(t=>t.id===outside.id)));
  assert.ok(sim.fields.some(f=>f.type==='lordScorch'&&f.host===target.id));const burn=sim.fields.find(f=>f.type==='lordScorch'&&f.host===wing.id);assert.ok(burn);near(burn.s.power,40);await actor.page.screenshot({path:dir+'/lord-charge-after.png'});
  const hp=wing.hp;advance(1.1);await sync();assert.ok(wing.hp<hp);for(const a of actors)near(await a.page.evaluate(id=>__game.sim.get(id).hp,wing.id),wing.hp);
 });
 await check('大招15秒免疫持续，溅射仍受独立技能额度限制，耗尽后普攻伤害不变',async()=>{
  const actor=lord();prepare(actor,3);sim.units=[actor.h];const target=soldier(0,-1),extras=[soldier(1,-1),soldier(-1,-1),soldier(0,-2),soldier(0,0)];await sync();await focus(actor.page,actor.h.id);await cast(actor,3);advance(.4);await sync();const until=actor.h.immuneUntil;assert.ok(until-sim.time>=14.9&&until-sim.time<=15.000001);
  for(let i=0;i<4;i++)sim.afterBasicAttack(actor.h,target);const value=sim.skillValues.at(-1);near(value.spent,value.limit);const hp=extras.map(u=>u.hp);sim.afterBasicAttack(actor.h,target);assert.deepEqual(extras.map(u=>u.hp),hp);
  const base=target.hp;sim.damage(actor.h,target,actor.h.attack,true);near(base-target.hp,actor.h.attack);
  advance(9);await sync();assert.ok(actor.h.immuneUntil>sim.time);assert.equal(sim.stun(actor.h,target,1),false);for(const a of actors)assert.ok((await report(a.page)).icons.some(i=>i.unitId===actor.h.id&&i.id==='immune'));
  await actor.page.setViewportSize({width:390,height:844});await focus(actor.page,actor.h.id);await actor.page.screenshot({path:dir+'/lord-ultimate-mobile-9s.png'});
  advance(until-sim.time+.05);await sync();assert.equal(sim.stun(actor.h,target,1),true);assert.ok(!(await report(actor.page)).icons.some(i=>i.unitId===actor.h.id&&i.id==='immune'));await actor.page.setViewportSize({width:640,height:1136});
 });
 await check('技能详情展示10格、3格/击退5格、5格、15秒和2000%收益上限',async()=>{
  const actor=lord();prepare(actor,0);await sync();await actor.page.locator('[data-info="0"]').click();
  const text=await actor.page.locator('#sheetScroll').textContent();for(const expected of ['10格','3格','5格','15秒','2000%'])assert.ok(text.includes(expected),expected);assert.doesNotMatch(text,/undefined|NaN/);
  await actor.page.setViewportSize({width:390,height:844});await actor.page.screenshot({path:dir+'/lord-descriptions-mobile.png'});await actor.page.locator('#sheetClose').click();
 });
 assert.deepEqual(result.errors,[]);
}catch(e){result.fatal=e.stack;process.exitCode=1;}finally{fs.writeFileSync(dir+'/verification.json',JSON.stringify(result,null,2));await browser.close();for(const c of [...room.clients])c.res.end();game.server.closeAllConnections();await new Promise(r=>game.server.close(r));console.log(JSON.stringify({checks:result.checks.length,skills:result.skills.length,errors:result.errors,fatal:result.fatal},null,2));}

import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {contractType} from '../shared/config.js';

// Two real clients receive the same battle, then each sees only their own four feedback types.
for(const width of [1440,390])test(`个人伤害与治疗四种颜色，双端过滤 ${width}`,async({browser})=>{
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'personal-numbers-'))}),{room,server}=game,s=room.sim;
 room.paused=true;s.npcPolicy={mode:'off',defense:1,attack:3};s.units=[];s.waveAt=s.populationAt=1e9;
 for(const t of s.towers){t.x=100;t.cd=1e9;}for(const p of s.players)p.retired=true;
 const accounts=await Promise.all(['飘字甲','飘字乙'].map(name=>game.accounts.register({name,password:'isolated-numbers-test',side:0})));
 const actors=accounts.map((a,i)=>{const p=room.player(a);p.classId=2;const h=s.spawn(0,contractType(2),0,1,0);expect(s.contract(p,h.id)).toBe(true);Object.assign(h,{x:i?9:-9,y:0,speed:0,cd:1e9,hp:50000,maxHp:100000});return {p,h};});
 const npc=s.makePlayer(1,true);npc.classId=3;const enemy=s.spawn(1,contractType(3),0,1,0);expect(s.contract(npc,enemy.id)).toBe(true);Object.assign(enemy,{x:0,y:-7,speed:0,cd:1e9,hp:50000,maxHp:100000});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const contexts=await Promise.all(accounts.map(()=>browser.newContext({viewport:{width,height:width===390?844:1100}})));
 const pages=await Promise.all(contexts.map(c=>c.newPage())),errors=[];
 const reports=page=>page.evaluate(()=>__game.renderer.game.scene.getScenes(true)[0].combatNumbers.report.map(({text,color,eventIds,kind})=>({text,color,eventIds,kind})));
 const sync=async()=>{room.sequence++;room.broadcast();await Promise.all(pages.map(p=>p.waitForFunction(n=>window.__game?.sim.sequence>=n,room.sequence)));};
 try{
  await Promise.all(pages.map(async(page,i)=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error'&&!(msg.location().url.endsWith('/api/me')&&msg.text().includes('401')))errors.push(msg.text());});await page.goto(`http://127.0.0.1:${server.address().port}/`);await expect(page).toHaveTitle(/魔法王座/);await page.locator('#accountName').fill(accounts[i].name);await page.locator('#accountPassword').fill('isolated-numbers-test');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.game.scene.getScenes(true)[0]?.combatNumbers);await page.locator('#locate').click();}));
  await new Promise(resolve=>setTimeout(resolve,350));
  const [a,b]=actors;s.time=.1;
  const damageA=s.damage(a.h,enemy,111,true),damageAId=s.animations.filter(e=>e.kind==='damage').at(-1).id;
  s.heal(b.h,42,a.h);const healingAId=s.animations.filter(e=>e.kind==='heal').at(-1).id;
  s.damage(enemy,a.h,73,true);const receivedAId=s.animations.filter(e=>e.kind==='damage').at(-1).id;
  s.heal(a.h,35,b.h);const receivedHealAId=s.animations.filter(e=>e.kind==='heal').at(-1).id;
  const damageB=s.damage(b.h,enemy,90,true),damageBId=s.animations.filter(e=>e.kind==='damage').at(-1).id;
  s.damage(enemy,b.h,61,true);
  await sync();
  await Promise.all(pages.map(page=>page.waitForFunction(()=>new Set(__game.renderer.game.scene.getScenes(true)[0].combatNumbers.report.map(e=>e.color)).size===4,null,{timeout:3000})));
  const evidence=await Promise.all(pages.map(reports));
  expect(evidence[0].find(e=>e.eventIds.includes(damageAId))).toMatchObject({color:'#ffffff',text:'−'+Math.round(damageA)});
  expect(evidence[0].find(e=>e.eventIds.includes(healingAId))).toMatchObject({color:'#5aaeff',text:'+42'});
  expect(evidence[0].find(e=>e.eventIds.includes(receivedAId))).toMatchObject({color:'#ff5c5c',text:'−73'});
  expect(evidence[0].find(e=>e.eventIds.includes(receivedHealAId))).toMatchObject({color:'#66e28a',text:'+35'});
  expect(evidence[0].some(e=>e.eventIds.includes(damageBId))).toBe(false);
  expect(evidence[1].find(e=>e.eventIds.includes(damageBId))).toMatchObject({color:'#ffffff',text:'−'+Math.round(damageB)});
  expect(evidence[1].some(e=>e.eventIds.includes(damageAId))).toBe(false);
  for(const page of pages)expect(await page.evaluate(()=>{const scene=__game.renderer.game.scene.getScenes(true)[0],canvas=scene.game.canvas.getBoundingClientRect(),sx=canvas.width/500,sy=canvas.height/500;const controls=[...document.querySelectorAll('.map-jumps button')].map(n=>n.getBoundingClientRect());return scene.combatNumbers.report.every(n=>{const box={left:canvas.left+n.left*sx,right:canvas.left+n.right*sx,top:canvas.top+(n.top-scene.cameras.main.scrollY)*sy,bottom:canvas.top+(n.bottom-scene.cameras.main.scrollY)*sy};return controls.every(c=>box.right<=c.left||box.left>=c.right||box.bottom<=c.top||box.top>=c.bottom);});})).toBe(true);
  await Promise.all(pages.map((page,i)=>page.locator('#battle').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`personal-numbers-${width}-${i}.png`)})));
  await Promise.all(pages.map(page=>expect(page.locator('vite-error-overlay')).toHaveCount(0)));
  await new Promise(resolve=>setTimeout(resolve,1000));
  s.time=.2;s.heal(a.h,7,a.h);const selfHealId=s.animations.filter(e=>e.kind==='heal').at(-1).id;await sync();
  await pages[0].waitForFunction(id=>__game.renderer.game.scene.getScenes(true)[0].combatNumbers.report.some(e=>e.eventIds.includes(id)),selfHealId);
  const selfHeals=(await reports(pages[0])).filter(e=>e.eventIds.includes(selfHealId));expect(selfHeals).toHaveLength(1);expect(selfHeals[0]).toMatchObject({text:'+7',color:'#66e28a'});
  expect(await reports(pages[1])).toEqual([]);expect(errors).toEqual([]);
 }finally{await Promise.all(contexts.map(c=>c.close()));for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

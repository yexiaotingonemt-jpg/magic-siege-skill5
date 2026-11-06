import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';

for(const width of [1440,390])test(`无手选灵息产生有效治疗并使原链接存活超过8秒 ${width}`,async({page})=>{
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;room.step=()=>{};
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(process.env.MAGIC_QA_DIR,'auto-heal-')),room}),{server}=game;
 const account=await game.accounts.register({name:'自动灵息续链验证',password:'auto-heal-link-test',side:0});
 const s=room.sim,p=room.player(account);s.units=[];s.waveAt=1e9;p.classId=5;p.stamina=1000;
 for(const t of s.towers)Object.assign(t,{x:100,cd:1e9});
 const h=s.spawn(0,'ranged',0,1);expect(s.contract(p,h.id)).toBe(true);
 const friend=s.spawn(0,'melee',0,1),enemy=s.spawn(1,'melee',0,1);
 Object.assign(h,{x:0,y:0,speed:0,cd:1e9});Object.assign(friend,{x:1,y:0,speed:0,cd:1e9,hp:1000,maxHp:10000});
 Object.assign(enemy,{x:0,y:3,speed:0,cd:1e9,targetId:h.id,hp:1e7,maxHp:1e7});h.targetId=enemy.id;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);};
 const advance=seconds=>{for(let t=0;t<seconds-1e-7;t+=.05)s.tick(.05);};
 try{
  await page.setViewportSize({width,height:width===390?844:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await expect(page).toHaveTitle(/魔法王座/);await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('auto-heal-link-test');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  const badge=page.locator('#skills>div').nth(1).locator('.skill-link-count');
  await page.locator('[data-cast="1"]').click();await expect.poll(()=>p.cd[1]).toBeGreaterThan(s.time);advance(.35);await sync();
  const link=s.fields.find(f=>f.kind==='link'),initial=link.until;expect(link.host).toBe(friend.id);expect(h.manualTargetId).toBeNull();
  advance(4);await sync();const hp=friend.hp;
  await page.locator('[data-cast="0"]').click();await expect.poll(()=>p.cd[0]).toBeGreaterThan(s.time);advance(.35);await sync();
  expect(friend.hp).toBeGreaterThan(hp);expect(link.until).toBeCloseTo(initial+3,7);
  advance(initial+.1-s.time);await sync();await expect(badge).toHaveText('链接 1');expect(s.fields).toContain(link);
  // 不重置真实6秒CD，第二次灵息再次续时，排除仅手调治疗方法造成的假通过。
  advance(p.cd[0]+.05-s.time);await sync();await page.locator('[data-cast="0"]').click();
  await expect.poll(()=>p.cd[0]).toBeGreaterThan(s.time);advance(.35);await sync();expect(link.until).toBeCloseTo(initial+6,7);
  await expect(badge).toHaveText('链接 1');await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);
  await page.locator('#skills').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`elf-auto-heal-link-${width}.png`)});
 }finally{await page.close();for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';
import {contractType} from '../shared/config.js';

for(const width of [1440,390])test(`精灵当前链接角标、冷却与失效同步 ${width}`,async({page})=>{
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;room.step=()=>{};
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(process.env.MAGIC_QA_DIR,'elf-links-')),room}),{server}=game;
 const account=await game.accounts.register({name:'精灵链接验证',password:'elf-link-count-test',side:0});
 const s=room.sim,p=room.player(account);s.units=[];s.waveAt=1e9;p.classId=5;p.stamina=1000;
 for(const t of s.towers)Object.assign(t,{x:100,cd:1e9});
 const h=s.spawn(0,contractType(5),0,1);expect(s.contract(p,h.id)).toBe(true);
 const friend=s.spawn(0,'melee',0,1);
 Object.assign(h,{x:0,y:0,cd:1e9,speed:0});Object.assign(friend,{x:1,y:0,cd:1e9,speed:0});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('401'))errors.push(m.text());});
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);};
 const button=page.locator('[data-cast="1"]'),badge=page.locator('#skills>div').nth(1).locator('.skill-link-count');
 const cast=async()=>{
  p.cd[1]=s.time;await sync();await button.click();await expect.poll(()=>p.cd[1]).toBeGreaterThan(s.time);
  for(let n=0;n<7;n++)s.tick(.05);await sync();
 };
 try{
  await page.setViewportSize({width,height:width===390?844:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await expect(page).toHaveTitle(/魔法王座/);await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('elf-link-count-test');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.renderer.getCamera());await expect(badge).toHaveText('链接 0');await expect(badge).toBeVisible();
  await cast();await expect(badge).toHaveText('链接 1');await expect(button.locator('em')).toContainText('s');
  await cast();await expect(badge).toHaveText('链接 2');await expect(button).toHaveAttribute('aria-label',/当前链接2条/);
  const links=s.fields.filter(f=>f.kind==='link');expect(links.map(f=>f.host)).toEqual([friend.id,friend.id]);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`elf-link-count-${width}.png`)});
  for(let n=0;n<10;n++)s.fields.push({...links[1]});await sync();await expect(badge).toHaveText('链接 12');
  const bounds=await badge.boundingBox(),skillBounds=await button.boundingBox(),timerBounds=await button.locator('em').boundingBox();
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);expect(bounds.y+bounds.height).toBeLessThan(timerBounds.y);
  expect(bounds.height).toBeLessThan(skillBounds.height);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`elf-link-count-many-${width}.png`)});
  s.fields=s.fields.filter(f=>f.kind!=='link'||links.includes(f));links[0].until=s.time+.15;room.paused=false;await sync();
  const sequence=room.sequence;await expect(badge).toHaveText('链接 1');expect(await page.evaluate(()=>__game.sim.sequence)).toBe(sequence);
  s.time=links[0].until+.01;room.paused=true;links[1].until=s.time;await sync();await expect(badge).toHaveText('链接 0');
  links[1].until=s.time+8;await sync();await expect(badge).toHaveText('链接 1');
  friend.x=links[1].breakRange+1;await sync();await expect(badge).toHaveText('链接 0');
  friend.x=1;friend.hp=0;await sync();await expect(badge).toHaveText('链接 0');
  friend.hp=friend.maxHp;await sync();await expect(badge).toHaveText('链接 1');
  h.hp=0;await sync();await expect(badge).toBeHidden();
  h.hp=1;h.classId=4;p.classId=4;await sync();await expect(badge).toBeHidden();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);
 }finally{await page.close();for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

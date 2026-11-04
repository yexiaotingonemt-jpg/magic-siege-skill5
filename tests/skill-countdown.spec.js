import {test,expect} from '@playwright/test';
import {mkdtempSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Room} from '../server/room.mjs';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';
import {classes} from '../shared/config.js';

for(const width of [1440,390])test(`技能剩余0.3秒在快照之间持续倒数并结束 / ${width}`,async({page})=>{
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});
 const game=createGameServer({dataDir:mkdtempSync(path.join(tmpdir(),'countdown-')),room});
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 const client=createLocalClient({serverUrl:`http://127.0.0.1:${game.server.address().port}`,artDir:realpathSync(new URL('../client/public/art',import.meta.url))});
 const account=await game.accounts.register({name:'倒计时验证',password:'countdown-test-password',side:0});
 const s=room.sim,p=room.player(account);p.classId=4;p.stamina=1000;s.units=[];s.waveAt=Infinity;
 for(const tower of s.towers)Object.assign(tower,{x:100,cd:Infinity});
 const h=s.spawn(0,'ranged',0,1);expect(s.contract(p,h.id)).toBe(true);
 Object.assign(h,{x:0,y:0,cd:Infinity,speed:0});
 const enemy=s.spawn(1,'melee',0,1);Object.assign(enemy,{x:0,y:2,hp:1e7,maxHp:1e7,speed:0,cd:Infinity});
 await new Promise(resolve=>client.server.listen(0,'127.0.0.1',resolve));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('status of 401'))errors.push(message.text());});
 try{
  await page.setViewportSize({width,height:width===390?844:1100});
  await page.goto(`http://127.0.0.1:${client.server.address().port}`);
  await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('countdown-test-password');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  await expect(page.locator('#heroName')).toContainText(classes[4]);
  const button=page.locator('[data-cast="0"]'),count=button.locator('em');
  await count.evaluate(node=>{
   window.__countdownSamples=[];
   new MutationObserver(()=>window.__countdownSamples.push({text:node.textContent,at:performance.now()})).observe(node,{childList:true,characterData:true,subtree:true});
  });
  // 只发起始快照。模拟时钟继续按真实间隔推进，排除网络包刷新造成的假通过。
  const broadcast=room.broadcast.bind(room);room.broadcast=()=>{};
  p.cd[0]=s.time+.28;room.sequence++;broadcast();
  await expect(count).toHaveText('0.3s');
  const sequence=await page.evaluate(()=>__game.sim.sequence);
  await page.waitForFunction(()=>__countdownSamples.some(sample=>['0.2s','0.1s'].includes(sample.text)),null,{timeout:1000});
  await expect(count).toHaveText('',{timeout:1000});
  const elapsed=await page.evaluate(()=>{
   const first=__countdownSamples.findIndex(sample=>sample.text==='0.3s');
   return __countdownSamples.slice(first).find(sample=>sample.text==='').at-__countdownSamples[first].at;
  });expect(elapsed).toBeGreaterThan(100);expect(elapsed).toBeLessThan(800);
  expect(await page.evaluate(()=>__game.sim.sequence)).toBe(sequence);
  await expect(button).not.toHaveAttribute('data-state','cooldown');
  // 暂停时数字保持，继续后按原倍速倒数；不改写服务器的冷却截止值。
  room.paused=true;p.cd[0]=s.time+.25;const deadline=p.cd[0];room.sequence++;broadcast();
  await expect(count).toHaveText('0.3s');await page.waitForTimeout(450);await expect(count).toHaveText('0.3s');
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`skill-countdown-${width}.png`)});
  room.paused=false;room.speed=2;room.sequence++;broadcast();
  await expect(count).toHaveText('',{timeout:1000});expect(p.cd[0]).toBe(deadline);
  await button.click();await expect.poll(()=>p.cd[0]).toBeGreaterThan(deadline);
  expect(await page.title()).toContain('魔法王座');await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(errors).toEqual([]);
 }finally{
  await page.close();for(const client of room.clients)client.res.end();
  await new Promise(resolve=>client.server.close(resolve));game.server.closeAllConnections();
  await new Promise(resolve=>game.server.close(resolve));
 }
});

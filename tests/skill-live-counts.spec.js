import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';
import {contractType} from '../shared/config.js';
import {affix} from './current-design-fixture.mjs';

for(const width of [1440,390])test(`五职业实时技能数字、单层状态和冷却分离 ${width}`,async({page})=>{
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;room.step=()=>{};
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(process.env.MAGIC_QA_DIR,'live-counts-')),room}),{server}=game;
 const account=await game.accounts.register({name:'实时技能数字验证',password:'skill-live-count-test',side:0});
 const s=room.sim,p=room.player(account);s.units=[];s.waveAt=1e9;p.auto=false;p.stamina=10000;
 for(const t of s.towers)Object.assign(t,{x:100,cd:1e9});
 let h;
 const setClass=id=>{
  if(h)h.hp=0;p.classId=id;p.side=id===3?1:0;
  h=s.spawn(p.side,contractType(id),0,1);expect(s.contract(p,h.id)).toBe(true);
  Object.assign(h,{x:0,y:0,cd:1e9,speed:0});p.stamina=10000;
 };
 setClass(0);
 const enemy=s.spawn(1,'melee',0,1),friend=s.spawn(0,'melee',0,1);
 Object.assign(enemy,{x:0,y:3,cd:1e9,speed:0,hp:1000000,maxHp:1000000});
 Object.assign(friend,{x:1,y:0,cd:1e9,speed:0});friend.hp=friend.maxHp/2;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('401'))errors.push(m.text());});
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);};
 const button=i=>page.locator(`[data-cast="${i}"]`),badge=i=>page.locator('#skills>div').nth(i).locator('.skill-live-count');
 const cast=async i=>{
  p.cd[i]=s.time;await sync();await button(i).click();await expect.poll(()=>p.cd[i]).toBeGreaterThan(s.time);
  for(let n=0;n<7;n++)s.tick(.05);await sync();
 };
 const evidence=async name=>{
  for(const b of await page.locator('.skill-live-count:visible').all()){
   const bounds=await b.boundingBox(),slot=await b.locator('..').boundingBox();
   expect(bounds.x).toBeGreaterThanOrEqual(slot.x-1);expect(bounds.x+bounds.width).toBeLessThanOrEqual(slot.x+slot.width+1);
   const timer=await b.locator('..').locator('em').boundingBox();
   if(timer.height)expect(bounds.y+bounds.height).toBeLessThan(timer.y);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`skill-count-${name}-${width}.png`)});
 };
 try{
  await page.setViewportSize({width,height:width===390?844:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await expect(page).toHaveTitle(/魔法王座/);await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('skill-live-count-test');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.renderer.getCamera());await page.locator('#locate').click();
  await expect(badge(0)).toHaveText('连接 0');await cast(0);await expect(badge(0)).toHaveText('连接 1');
  await expect(button(0).locator('em')).toHaveText('◌');s.interrupt(h);await sync();await expect(badge(0)).toHaveText('连接 0');
  await expect(button(0).locator('em')).toContainText('s');
  await cast(3);s.damage(enemy,h,1234);await sync();await expect(badge(3)).toHaveText('蓄盾 1234');await evidence('orc');
  h.damageStore.total=123456;await sync();await expect(badge(3)).toHaveText('蓄盾 12.3万');await evidence('orc-large');
  setClass(4);h.heat=1;h.heatUntil=s.time+10;await sync();await cast(1);
  await expect(badge(0)).toHaveText('炙热 1');await expect(badge(1)).toHaveText('标记 1');await expect(badge(3)).toHaveText('耗热 1');
  await expect.poll(()=>page.evaluate(()=>{
   const scene=__game.renderer.game.scene.scenes[0],r=scene.statusIcons.report,index=r.findIndex(x=>x.unitId===__game.sim.hero().id&&x.id==='heat');
   const texts=scene.children.list.filter(x=>x.type==='Text'&&x.visible&&x.text==='1');
   return index>=0&&texts.some(x=>Math.abs(x.x-(r[index].x+r[index].size+1))<.01);
  })).toBe(true);
  await evidence('mage');s.cleanse(enemy);h.heat=0;await sync();await expect(badge(1)).toHaveText('标记 0');await expect(badge(3)).toHaveText('耗热 0');
  setClass(2);await sync();await expect(badge(0)).toBeHidden();await cast(3);
  const barrage=s.fields.find(f=>f.kind==='currentBarrage'&&f.owner.id===h.id);
  await expect(badge(3)).toHaveText(`余炮 ${barrage.remaining}`);await evidence('rune');
  for(let n=0;n<Math.ceil(barrage.s.gap/.05);n++)s.tick(.05);await sync();await expect(badge(3)).toHaveText(`余炮 ${barrage.remaining}`);
  s.interrupt(h);await sync();await expect(badge(3)).toBeHidden();
  setClass(5);await sync();await cast(1);await expect(badge(1)).toHaveText('链接 1');await cast(3);
  await expect(badge(3)).toHaveText('余疗 2');await evidence('elf');s.interrupt(h);await sync();await expect(badge(3)).toBeHidden();
  setClass(3);await sync();await expect(badge(3)).toBeHidden();
  const t=s.config.design.affixes.find(t=>t.classId===3&&t.keys.includes('summon'));affix(s,p,t.sourceId);
  const guard=s.spawn(p.side,'melee',0,1);Object.assign(guard,{x:1,y:0,cd:1e9,speed:0,summoned:true,ownerId:h.id,expiresAt:s.time+5});await sync();
  await expect(badge(3)).toHaveText('护卫 1');await evidence('lord');guard.hp=0;await sync();await expect(badge(3)).toHaveText('护卫 0');
  h.hp=0;await sync();await expect(page.locator('#skills')).toBeHidden();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);
 }finally{await page.close();for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

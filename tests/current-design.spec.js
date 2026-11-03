import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';
import {contractType,classes} from '../shared/config.js';
import {advance} from './current-design-fixture.mjs';
for(const width of [1440,390])for(const id of [0,4,5,2,3])test(`当前设计五职业技能与被动 ${id} / ${width}`,async({page})=>{
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;room.step=()=>{};
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'current-design-ui-')),room}),{server}=game;
 const account=await game.accounts.register({name:'新技能核对'+id,password:'current-design-test',side:id===3?1:0}),s=room.sim,p=room.player(account);p.classId=id;p.stamina=1000;
 s.units=[];s.waveAt=1e9;for(const t of s.towers){t.x=100;t.cd=1e9;}
 const h=s.spawn(p.side,contractType(id),0,1);expect(s.contract(p,h.id)).toBe(true);Object.assign(h,{x:0,y:0,cd:1e9,speed:0});
 if(id===4){const t=s.config.design.affixes.find(t=>t.classId===4&&t.sourceId===28);p.progress[id].traits[t.id]=1;}
 if(id===3){const t=s.config.design.affixes.find(t=>t.classId===3&&t.sourceId===65);p.progress[id].traits[t.id]=1;}
 const enemy=s.spawn(1-p.side,'melee',0,1),friend=s.spawn(p.side,'melee',0,1);Object.assign(enemy,{x:0,y:3,hp:1e7,maxHp:1e7,speed:0,cd:1e9});Object.assign(friend,{x:1,y:0,hp:100,maxHp:10000,speed:0,cd:1e9});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.setViewportSize({width,height:width===390?844:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('current-design-test');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.renderer.getCamera());await page.evaluate(()=>__game.renderer.focusUnit(__game.sim.hero().id));await page.waitForTimeout(350);await expect(page.locator('#heroName')).toContainText(classes[id]+' Lv.0');
  for(let i=0;i<4;i++)await expect(page.locator(`[data-info="${i}"]`)).toContainText(s.config.design.skills[id][i].name);
  await expect(page.locator('.skill-lock:visible')).toHaveCount(0);
  await page.locator('[data-hero-open="passive"]').click();const panel=page.locator('[data-ability-view="passive"]');await expect(panel).toBeVisible();await expect(panel).toContainText('契约后自动生效');
  if(id===4)await expect(panel).toContainText('当前炙热1/10层');
  await page.locator('.sheet-panel').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`current-passive-${id}-${width}.png`)});
  await page.locator('#sheetClose').click();await page.locator('[data-nav="hero"]').click();
  await expect(page.locator('.hero-detail-tabs,[data-hero-view]')).toHaveCount(0);
  await expect(page.locator('[data-skill-detail]:visible')).toHaveCount(4);
  if(id===4){await expect(page.locator('.sheet-panel')).toContainText('对沿途敌人额外造成150%攻击伤害');await expect(page.locator('.sheet-panel')).not.toContainText('同一目标每0.6秒');}
  const skillPanel=page.locator('[data-hero-panel="skills"]');
  if(id===3){
   await expect(skillPanel).toContainText('无数量上限');await expect(skillPanel).toContainText('受到治疗降低50%，3秒');
   await expect(skillPanel).toContainText('尖刺外壳5秒，受到普通攻击或技能攻击');
   await expect(skillPanel).toContainText('君临5秒，免疫任何伤害及负面效果');
   await expect(skillPanel).toContainText('减少治疗效果');
  }
  await skillPanel.evaluate(el=>{el.scrollTop=200;});const skillScroll=await skillPanel.evaluate(el=>el.scrollTop);expect(skillScroll).toBeGreaterThan(0);
  h.hp-=1;room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);
  expect(await skillPanel.evaluate(el=>el.scrollTop)).toBe(skillScroll);
  for(const view of ['passive','stats','common']){
   await page.locator('#sheetClose').click();await page.locator(`[data-hero-open="${view}"]`).click();
   await expect(page.locator('[data-hero-panel]:visible')).toHaveCount(1);
   await expect(page.locator(`[data-hero-panel="${view}"]`)).toBeVisible();await expect(page.locator('[data-skill-detail]:visible')).toHaveCount(0);
  }
  const common=page.locator('[data-hero-panel="common"]');await common.evaluate(el=>{el.scrollTop=100;});const commonScroll=await common.evaluate(el=>el.scrollTop);
  h.hp-=1;room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);
  expect(await common.evaluate(el=>el.scrollTop)).toBe(commonScroll);
  await page.locator('#sheetClose').click();await page.locator('[data-nav="hero"]').click();
  expect(await skillPanel.evaluate(el=>el.scrollTop)).toBe(0);
  await page.locator('.sheet-panel').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`current-skills-${id}-${width}.png`)});await page.locator('#sheetClose').click();
  for(let i=0;i<4;i++){
   s.interrupt(h);p.cd=[0,0,0,0];h.stunUntil=0;const target=id===5||id===0&&i===2?friend:enemy;
   if(id===5&&i===2)s.debuff(friend,enemy,'attackDown',.2,30);
   s.setManualTarget(target.id,p);room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);
   await expect(page.locator(`[data-cast="${i}"]`)).toHaveClass(/ready/);const casts=s.metrics.casts;await page.locator(`[data-cast="${i}"]`).click();
   await expect.poll(()=>s.metrics.casts).toBe(casts+1);advance(s,s.config.design.skills[id][i].cast+.1);room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);
  }
  await page.evaluate(()=>__game.renderer.focusUnit(__game.sim.hero().id));await page.waitForTimeout(350);await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`current-battle-${id}-${width}.png`),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(errors).toEqual([]);
 }finally{await page.close();for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

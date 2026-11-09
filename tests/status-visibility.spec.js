import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';
import {contractType} from '../shared/config.js';

for(const width of [1440,390])test(`状态图标按当前玩家筛选、红蓝底框与交互 ${width}`,async({page})=>{
 const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;room.step=()=>{};
 const game=await createBrowserGame({dataDir:mkdtempSync(path.join(process.env.MAGIC_QA_DIR,'status-accounts-')),room}),{server}=game;
 const account=await game.accounts.register({name:'状态显示验证',password:'status-visibility-test',side:0});
 const s=room.sim,p=room.player(account);s.units=[];s.waveAt=1e9;
 for(const t of s.towers){t.x=100;t.cd=1e9;}
 p.classId=0;const h=s.spawn(0,contractType(0),0,1);expect(s.contract(p,h.id)).toBe(true);
 const hero=(side,classId)=>{const owner=s.makePlayer(side,false);owner.classId=classId;const u=s.spawn(side,contractType(classId),0,1);expect(s.contract(owner,u.id)).toBe(true);return u;};
 const friend=hero(0,0),enemy=hero(1,3);
 for(const u of [h,friend,enemy])for(const t of s.config.design.affixes.filter(t=>t.classId===u.classId&&t.skill==null))s.players[u.playerId].progress[u.classId].traits[t.id]=t.max;
 for(const [i,u]of [h,friend,enemy].entries())Object.assign(u,{x:(i-1)*4,y:2,cd:1e9,speed:0});
 s.shield(h,100,h,20);s.shield(friend,100,friend,20);s.shield(enemy,100,enemy,20);
 s.debuff(h,enemy,'attackDown',.2,20);s.debuff(friend,enemy,'attackDown',.2,20);
 s.debuff(enemy,h,'moveSlow',.2,20);s.debuff(enemy,friend,'vulnerable',.5,20);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const errors=[],unauthorized=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()===401)unauthorized.push(new URL(r.url()).pathname);});
 page.on('console',m=>{if(m.type()==='error'&&!(m.text().includes('401')&&new URL(m.location().url).pathname==='/api/me'))errors.push(m.text());});
 const records=()=>page.evaluate(()=>__game.renderer.game.scene.scenes[0].statusIcons.report.filter(r=>!r.permanent));
 const sync=async()=>{room.sequence++;room.broadcast();await page.waitForFunction(n=>__game.sim.sequence>=n,room.sequence);};
 try{
  await page.setViewportSize({width,height:width===390?844:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await expect(page).toHaveTitle(/魔法王座/);await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('status-visibility-test');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>window.__game?.renderer.getCamera());await page.locator('#locate').click();
  const ownPassiveCount=s.config.design.affixes.filter(t=>t.classId===h.classId&&t.skill==null).length+1;
  const passives=()=>page.evaluate(()=>__game.renderer.game.scene.scenes[0].statusIcons.report.filter(r=>r.permanent));
  await expect.poll(async()=>(await passives()).length).toBe(ownPassiveCount);
  expect((await passives()).every(r=>r.unitId===h.id&&r.frame==='blue')).toBe(true);
  const expected=()=>[{unitId:h.id,id:'attackDown',frame:'red'},{unitId:h.id,id:'shield',frame:'blue'},{unitId:enemy.id,id:'moveSlow',frame:'blue'}];
  await expect.poll(async()=>(await records()).map(({unitId,id,frame})=>({unitId,id,frame}))).toEqual(expected());
  const r=(await records()).find(x=>x.id==='shield');
  const point=await page.evaluate(r=>{const g=__game.renderer,c=g.game.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.size/2)/500*c.width,y:c.y+(r.y+r.size/2-g.getCamera().scrollY)/__game.renderer.game.scale.gameSize.height*c.height};},r);
  await page.mouse.click(point.x,point.y);
  await expect.poll(()=>page.evaluate(()=>__game.renderer.game.scene.scenes[0].children.getByName('unit-status-tooltip').text)).toContain('护盾');
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`status-visibility-${width}.png`)});
  // 同一客户端切换职业，纹理必须随权限与阵营关系更新，不能复用旧颜色。
  p.classId=3;await sync();await expect.poll(async()=>(await records()).some(x=>x.unitId===enemy.id&&x.id==='shield'&&x.frame==='red')).toBe(true);
  expect((await passives()).every(r=>r.unitId===h.id)).toBe(true);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,`status-dispel-${width}.png`)});
  h.immortalUntil=20;h.eliteBuffs={score:20,hunt:20,assault:20,arcane:20,fortitude:20};await sync();
  await expect.poll(async()=>(await records()).filter(x=>x.unitId===h.id).length).toBe(8);
  expect(await page.evaluate(()=>{
   const scene=__game.renderer.game.scene.scenes[0];
   return scene.statusIcons.report.every(r=>scene.textures.exists(`unit-status-${r.textureId||r.id}-${r.frame}`));
  })).toBe(true);
  h.immortalUntil=0;h.eliteBuffs={};
  s.cleanse(h);s.cleanse(enemy);h.shield=0;enemy.shield=0;await sync();await expect.poll(records).toEqual([]);
  expect(errors).toEqual([]);expect(unauthorized).toEqual(['/api/me']);expect(await page.locator('vite-error-overlay').count()).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 }finally{await page.close();for(const c of room.clients)c.res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {Room} from '../server/room.mjs';

for(const width of [1440,390])test(`契约和施法共计10点体力升级并获得词条机会 / ${width}`,async({page})=>{
  const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;room.step=()=>{};
  const game=await createBrowserGame({dataDir:mkdtempSync(path.join(tmpdir(),'experience-ui-')),room});
  const account=await game.accounts.register({name:'体力经验'+width,password:'experience-ui-test',side:0});
  const s=room.sim,p=room.player(account);s.units=[];s.waveAt=Infinity;
  for(const t of s.towers){t.x=t.y=1000;t.cd=Infinity;}
  const unit=s.spawn(0,'melee',0,1,0);unit.x=unit.y=0;
  const enemy=s.spawn(1,'melee',0,1,0);Object.assign(enemy,{x:0,y:3,hp:1e7,maxHp:1e7,speed:0,cd:Infinity});
  await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
  const broadcast=()=>{room.sequence++;room.broadcast();};
  try{
    await page.setViewportSize({width,height:width===390?844:1100});
    await page.goto(`http://127.0.0.1:${game.server.address().port}`);
    await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('experience-ui-test');
    await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected);
    expect(room.command(account,{type:'contract',args:{unitId:unit.id,classId:0},id:'xp-contract'}).ok).toBe(true);broadcast();
    await expect(page.locator('#heroName')).toContainText('Lv.0');await expect(page.locator('#xpLabel')).toContainText('EXP 300 / 1000');
    expect(s.setManualTarget(enemy.id,p)).toBe(true);expect(s.cast(0,p)).toBe(true);broadcast();
    await expect(page.locator('#xpLabel')).toContainText('EXP 400 / 1000');
    s.time=10;expect(s.cast(1,p)).toBe(true);broadcast();
    await expect(page.locator('#heroName')).toContainText('Lv.0');await expect(page.locator('#xpLabel')).toContainText('EXP 500 / 1000');
    for(let i=0;i<5;i++){s.time+=10;expect(s.cast(0,p)).toBe(true);}broadcast();
    await expect(page.locator('#heroName')).toContainText('Lv.1');await expect(page.locator('#xpLabel')).toContainText('EXP 0 / 1000');
    await expect(page.locator('[data-trait-count]')).toHaveText('1');await expect(page.locator('#traitDraft')).toBeHidden();
    await expect(page.locator('#traitPending')).toBeDisabled();
    unit.hp=0;s.die(unit);broadcast();
    await expect(page.locator('#traitPending')).toBeEnabled();await page.locator('#traitPending').click();await expect(page.locator('.trait-card')).toHaveCount(3);
    const level=p.level,xp=p.xp;expect(s.cast(0,p)).toBe(false);expect(p.level).toBe(level);expect(p.xp).toBe(xp);
  }finally{
    await page.close();for(const client of [...room.clients])client.res.end();
    game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));
  }
});

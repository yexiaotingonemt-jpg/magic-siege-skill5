import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Room} from '../server/room.mjs';
import {createBrowserGame} from '../scripts/browser-game-server.mjs';
import {prepareChoice} from '../shared/traits.js';
import {RARITIES} from '../shared/upgrade-quality.js';

for(const width of [1440,390])test(`普通混色、高级紫金、详情与重连 ${width}`,async({page})=>{
  const room=new Room(undefined,{mode:'off',defense:1,attack:3});room.paused=true;room.step=()=>{};
  const game=await createBrowserGame({room,dataDir:mkdtempSync(path.join(tmpdir(),'upgrade-quality-'))});
  const account=await game.accounts.register({name:'品质选择'+width,password:'upgrade-quality-test',side:0});
  const s=room.sim,p=room.player(account),progress=p.progress[0];progress.level=5;
  progress.choices=[{level:4,available:true},{level:5,available:true}];
  const random=s.random.bind(s),rolls=[.01,.1,.3,.1,.99,.1,0,.1,.99,.1,0,.1];
  s.random=()=>rolls.length?rolls.shift():random();prepareChoice(s,p);
  await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${game.server.address().port}`,errors=[],expectedAuth=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{
    if(m.type()!=='error'&&m.type()!=='warning')return;
    if(m.location().url===url+'/api/me'&&m.text().includes('401'))expectedAuth.push(m.text());
    else errors.push(m.text());
  });
  try{
    await page.setViewportSize({width,height:width===390?844:1100});await page.goto(url);
    await expect(page).toHaveTitle(/魔法王座/);expect(page.url()).toBe(url+'/');
    await page.locator('#accountName').fill(account.name);await page.locator('#accountPassword').fill('upgrade-quality-test');await page.locator('#authSubmit').click();
    await page.waitForFunction(()=>window.__game?.network.connected);
    await page.locator('#traitPending').click();await expect(page.locator('#draftTitle')).toHaveText('普通升级');
    await expect(page.locator('.draft-pool')).toHaveText('抽取范围：白色 · 绿色 · 蓝色 · 紫色');
    await expect(page.locator('.trait-card')).toHaveCount(3);
    for(const q of ['white','green','purple']){
      const card=page.locator(`.trait-card[data-rarity="${q}"]`);await expect(card).toHaveCount(1);
      await expect(card.locator('.trait-quality')).toHaveText(RARITIES[q].name+'品质');
      const colors=await card.evaluate(el=>[getComputedStyle(el).borderTopColor,getComputedStyle(el.querySelector('strong')).color]);
      expect(colors[0]).toBe(colors[1]);
    }
    await expect(page.locator('.trait-card[data-rarity="gold"]')).toHaveCount(0);
    await page.locator('.draft-panel').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`upgrade-normal-${width}.png`)});
    const candidates=await page.locator('[data-trait]').evaluateAll(nodes=>nodes.map(n=>n.dataset.trait));
    await page.locator('[data-trait-info]').first().click();await expect(page.locator('.draft-skill-view')).toBeVisible();
    await page.locator('[data-detail-back]').click();expect(progress.choices.length).toBe(2);
    await page.locator('[data-defer]').click();await page.reload();await page.waitForFunction(()=>window.__game?.network.connected);
    await expect(page.locator('#traitDraft')).toBeHidden();await page.locator('#traitPending').click();
    expect(await page.locator('[data-trait]').evaluateAll(nodes=>nodes.map(n=>n.dataset.trait))).toEqual(candidates);
    await page.locator('[data-trait]').first().click();await expect(page.locator('#draftTitle')).toHaveText('高级升级');
    await expect(page.locator('.draft-pool')).toHaveText('抽取范围：紫色 · 金色');
    await expect(page.locator('.trait-card[data-rarity="purple"]')).toHaveCount(2);
    await expect(page.locator('.trait-card[data-rarity="gold"]')).toHaveCount(1);
    await expect(page.locator('.trait-card[data-rarity="white"],.trait-card[data-rarity="green"],.trait-card[data-rarity="blue"]')).toHaveCount(0);
    await page.locator('.draft-panel').screenshot({path:path.join(process.env.MAGIC_QA_DIR,`upgrade-advanced-${width}.png`)});
    await page.locator('.trait-card[data-rarity="gold"] [data-trait]').click();await expect(page.locator('#traitDraft')).toBeHidden();
    expect(Object.values(progress.traits).reduce((a,b)=>a+b,0)).toBe(2);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);expect(expectedAuth).toHaveLength(1);
  }finally{
    await page.close();for(const client of room.clients)client.res.end();game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));
  }
});

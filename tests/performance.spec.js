import {test,expect} from '@playwright/test';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';
import path from 'node:path';

let fixture;
test.beforeEach(async({page})=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'performance-permission-'));const game=createGameServer({dataDir});
 const admin=await game.accounts.register({name:'yxt',password:'performance-test-password',side:0});
 const other=await game.accounts.register({name:'czy001',password:'performance-test-password',side:0});
 await game.accounts.register({name:'normal',password:'performance-test-password',side:0});
 await writeFile(path.join(dataDir,'super-accounts.json'),JSON.stringify([admin.id,other.id]));
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));const local=createLocalClient({serverUrl:`http://127.0.0.1:${game.server.address().port}`});await new Promise(resolve=>local.server.listen(0,'127.0.0.1',resolve));
 fixture={game,local,dataDir};await page.goto(`http://127.0.0.1:${local.server.address().port}`);
});
test.afterEach(async()=>{const {game,local}=fixture;local.server.closeAllConnections();await new Promise(resolve=>local.server.close(resolve));for(const c of game.room.clients)c.res.end();game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));});
async function loginAs(page,name){await page.locator('#accountName').fill(name);await page.locator('#accountPassword').fill('performance-test-password');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());}

test('战场自动显示帧率和负载，导出包含帧耗时、快照和 FPS 分组',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await expect(page).toHaveTitle(/魔法王座/);
 await loginAs(page,'yxt');
 await expect(page.locator('#performanceStatus')).toContainText('FPS',{timeout:20000});
 await expect(page.locator('#performanceFactors')).toContainText('光效');
 const sample=await page.evaluate(()=>__game.performance.latest);
 expect(sample.fps).toBeGreaterThan(0);expect(sample.load.units).toBeGreaterThan(0);expect(sample.load.units).toBe(sample.load.attackUnits+sample.load.defenseUnits);expect(sample.load.units).toBeGreaterThanOrEqual(sample.load.visibleUnits);
 expect(sample.stages.sceneUpdate.max).toBeGreaterThan(0);expect(sample.stages.skillVfx.max).toBeGreaterThan(0);
 await page.waitForFunction(()=>__game.performance.latest?.network.snapshots>0);
 await page.evaluate(()=>{const start=performance.now();while(performance.now()-start<160){/* 模拟实际主线程阻塞，验证长帧没有被截断 */}});
 await page.waitForFunction(()=>__game.performance.latest?.over100ms>0);
 await expect(page.locator('#performanceSummary')).toContainText('平均单位');
 const downloadEvent=page.waitForEvent('download');await page.locator('#exportPerformance').click();const download=await downloadEvent;
 const file=path.join(process.env.MAGIC_QA_DIR,'performance-export.json');await download.saveAs(file);const report=JSON.parse(await readFile(file,'utf8'));
 expect(report.summary).toHaveLength(3);expect(report.samples.length).toBeGreaterThan(0);expect(report.environment.clientVersion).toBeTruthy();expect(JSON.stringify(report)).not.toContain('password');
 await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,'performance-desktop.png'),fullPage:true});
 await page.locator('#performanceStatus').locator('..').locator('summary').click();
 await page.locator('#performanceStatus').locator('..').screenshot({path:path.join(process.env.MAGIC_QA_DIR,'performance-panel.png')});
 await page.setViewportSize({width:390,height:844});await page.locator('#performanceStatus').scrollIntoViewIfNeeded();await expect(page.locator('#exportPerformance')).toBeVisible();await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,'performance-mobile.png'),fullPage:true});
 expect(errors).toEqual([]);
});

for(const name of ['normal','czy001','yxt'])test(`无诊断权限：${name} 不创建采样器、不显示入口`,async({page})=>{
 if(name==='yxt')await writeFile(path.join(fixture.dataDir,'super-accounts.json'),'[]');
 await loginAs(page,name);await expect(page.locator('#performanceStatus')).toHaveCount(0);await expect(page.locator('#exportPerformance')).toHaveCount(0);
 await page.waitForTimeout(2300);expect(await page.evaluate(()=>({monitor:__game.performance,load:__game.renderer.performanceLoad}))).toEqual({monitor:null,load:null});
 if(name==='normal')await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,'performance-ordinary.png'),fullPage:true});
});

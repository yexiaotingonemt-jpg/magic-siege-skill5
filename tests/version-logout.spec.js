import {test,expect} from '@playwright/test';
import {GAME_VERSION,PROTOCOL_VERSION,UPDATE_REQUIRED_CODE} from '../shared/protocol.js';
test('退出过程中收到版本拒绝仍展示更新页',async({browser})=>{
 const context=await browser.newContext(),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('/');await page.locator('#accountName').fill('退出版本'+Date.now());await page.locator('#accountPassword').fill('version-test-password');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected);
  await page.route('**/api/logout',route=>route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:UPDATE_REQUIRED_CODE,error:'请更新客户端',requiredVersion:GAME_VERSION+'-next',protocolVersion:PROTOCOL_VERSION})}));
  await page.locator('#logout').click();await expect(page.locator('#updateRequired')).toBeVisible();await expect(page.locator('#requiredVersion')).toHaveText(GAME_VERSION+'-next');expect(errors).toEqual([]);
 }finally{await context.close();}
});

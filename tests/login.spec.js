import {test,expect} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {scryptSync} from 'node:crypto';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';

test('默认账号登录，支持预设的单字符密码，创建账号仍校验六位密码',async({browser})=>{
 const game=createGameServer({dataDir:mkdtempSync(path.join(tmpdir(),'magic-login-'))});
 const fixture=await game.accounts.register({name:'预设登录测试',password:'fixture-password',side:0});
 fixture.hash=scryptSync('1',fixture.salt,64).toString('hex');game.accounts.save();
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 const local=createLocalClient({serverUrl:`http://127.0.0.1:${game.server.address().port}`});
 await new Promise(resolve=>local.server.listen(0,'127.0.0.1',resolve));
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`http://127.0.0.1:${local.server.address().port}`);
  await expect(page.locator('#tabLogin')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#sideChoices')).toBeHidden();
  await expect(page.locator('#accountPassword')).toHaveAttribute('minlength','1');
  await expect(page.locator('#authForm')).toHaveAttribute('aria-labelledby','tabLogin');
  await page.locator('#tabLogin').focus();await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#tabRegister')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#sideChoices')).toBeVisible();
  await expect(page.locator('#accountPassword')).toHaveAttribute('minlength','6');
  await page.locator('#tabLogin').click();await page.locator('#accountName').fill(fixture.name);await page.locator('#accountPassword').fill('1');
  expect(await page.locator('#authForm').evaluate(form=>form.checkValidity())).toBe(true);
  await page.screenshot({path:path.join(process.env.MAGIC_QA_DIR,'default-login-mobile.png'),fullPage:true});
  await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected);
  await expect(page.locator('.account-heading h2')).toHaveText(fixture.name);
  await page.locator('#logout').click();await expect(page.locator('#tabLogin')).toHaveAttribute('aria-selected','true');
  expect(errors).toEqual([]);
 }finally{
  await context.close();for(const client of game.room.clients)client.res.end();
  for(const server of [local.server,game.server]){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 }
});

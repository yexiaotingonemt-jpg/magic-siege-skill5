import {test,expect} from '@playwright/test';
import {_electron as electron} from 'playwright';
import {createRequire} from 'node:module';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createGameServer} from '../server/index.mjs';
import {GAME_VERSION} from '../shared/protocol.js';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url);
async function service(gameVersion=GAME_VERSION){
 const dataDir=await mkdtemp(path.join(tmpdir(),'magic-desktop-server-')),game=createGameServer({dataDir,gameVersion});
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 return {...game,base:`http://127.0.0.1:${game.server.address().port}`,async close(){for(const c of game.room.clients)c.res.end();game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));}};
}
async function launch(serverUrl,profile){
 profile??=await mkdtemp(path.join(tmpdir(),'magic-desktop-profile-'));await mkdir(profile,{recursive:true});
 const env={...process.env,MAGIC_DESKTOP_TEST:'1',MAGIC_DESKTOP_USER_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
 if(serverUrl)env.MAGIC_SERVER_URL=serverUrl;else delete env.MAGIC_SERVER_URL;
 const packaged=process.env.MAGIC_DESKTOP_EXE;
 const app=await electron.launch({executablePath:packaged||require('electron'),args:packaged?[]:[path.join(root,'client/desktop/main.mjs')],env,timeout:30000});
 if(packaged)expect(await app.evaluate(({app})=>app.isPackaged)).toBe(true);
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {app,page,profile,errors};
}
async function capture(app,page,file){
 const window=await app.browserWindow(page);
 const png=await window.evaluate(async win=>(await win.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64'));
 await writeFile(file,Buffer.from(png,'base64'));
}
async function register(page,label='桌面'){
 await expect(page.locator('#authForm')).toBeVisible();await page.locator('#accountName').fill(label+Date.now());await page.locator('#accountPassword').fill('desktop-test-password');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected&&__game.renderer.getCamera());
}
test('桌面EXE独立窗口：本机资源、登录契约、关闭退出、重启保留会话',async()=>{
 const server=await service();let client;const remoteRequests=[];server.server.on('request',r=>remoteRequests.push(r.url));
 try{
  client=await launch(server.base);const {app,page}=client;
  await expect(page).toHaveTitle(/魔法王座/);
  expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].getTitle())).toBe(`魔法王座 v${GAME_VERSION}`);
  const prefs=await app.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {node:p.nodeIntegration,context:p.contextIsolation,sandbox:p.sandbox};});expect(prefs).toEqual({node:false,context:true,sandbox:true});
  expect(await page.evaluate(()=>({node:typeof window.require,process:typeof window.process,settings:typeof window.magicSettings}))).toEqual({node:'undefined',process:'undefined',settings:'undefined'});
  await register(page);await page.locator('#pause').click();await page.waitForFunction(()=>__game.sim.paused);
  await page.evaluate(()=>{const s=__game.sim,u=s.units.find(u=>u.side===0&&u.type==='melee'&&!u.hero);__game.selection.select(u.id);});await page.locator('#confirmContract').click();await page.waitForFunction(()=>!!__game.sim.hero());
  const identity=await page.evaluate(()=>({match:__game.sim.matchId,hero:__game.sim.hero().id}));
  await capture(app,page,path.join(process.env.MAGIC_QA_DIR,'desktop-game.png'));
  expect(client.errors).toEqual([]);expect(remoteRequests.every(p=>p.startsWith('/api/'))).toBe(true);
  const origin=new URL(page.url()).origin,profile=client.profile,closed=app.waitForEvent('close');
  await app.evaluate(({BrowserWindow})=>{setTimeout(()=>BrowserWindow.getAllWindows()[0].close(),25);});await closed;client=null;
  await expect(async()=>{await fetch(origin+'/client-info',{signal:AbortSignal.timeout(500)});}).rejects.toThrow();
  expect((await fetch(server.base+'/api/health')).status).toBe(200);
  client=await launch(server.base,profile);await client.page.waitForFunction(()=>window.__game?.sim.hero());expect(await client.page.evaluate(()=>({match:__game.sim.matchId,hero:__game.sim.hero().id}))).toEqual(identity);expect(client.errors).toEqual([]);
 }finally{await client?.app.close();await server.close();}
});
test('默认直连正式服，无服务器选择入口，忽略旧版保存地址',async()=>{
 const profile=await mkdtemp(path.join(tmpdir(),'magic-default-profile-'));let client;
 try{
  await writeFile(path.join(profile,'client-config.json'),JSON.stringify({serverUrl:'http://127.0.0.1:1'}));
  client=await launch(null,profile);await expect(client.page.locator('#authForm')).toBeVisible();
  const info=await (await client.page.request.get(new URL(client.page.url()).origin+'/client-info')).json();
  expect(info.serverUrl).toBe('http://124.222.216.66:5183');
  expect(await client.app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById('server-settings')===null)).toBe(true);
  await expect(client.page.locator('#serverUrl')).toHaveCount(0);expect(client.errors).toEqual([]);
 }finally{await client?.app.close();}
});

test('桌面版本不符：直接显示强制更新页',async()=>{
 const required=GAME_VERSION.replace(/\d+$/,n=>String(Number(n)+1)),server=await service(required);let client;
 try{client=await launch(server.base);await expect(client.page.locator('#updateRequired')).toBeVisible();await expect(client.page.locator('#requiredVersion')).toHaveText(required);await expect(client.page.locator('#authForm')).toHaveCount(0);await capture(client.app,client.page,path.join(process.env.MAGIC_QA_DIR,'desktop-update-required.png'));expect(client.errors).toEqual([]);}finally{await client?.app.close();await server.close();}
});

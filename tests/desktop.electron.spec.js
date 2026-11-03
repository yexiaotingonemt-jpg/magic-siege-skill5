import {test,expect} from '@playwright/test';
import {_electron as electron} from 'playwright';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createGameServer} from '../server/index.mjs';
import {CLIENT_VERSION,GAME_VERSION} from '../shared/protocol.js';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url);

test('仓库启动器普通启动时必须显示原生游戏窗口',async()=>{
 test.skip(process.platform!=='win32','Windows GUI launcher');
 const folder=await mkdtemp(path.join(tmpdir(),'magic-launcher-visible-')),cache=path.join(folder,'repository-client'),profile=path.join(folder,'profile'),exe=path.join(cache,'魔法王座.exe');
 const env={...process.env,MAGIC_VISIBILITY_EXE:exe};delete env.MAGIC_DESKTOP_TEST;delete env.ELECTRON_RUN_AS_NODE;
 const launcher=path.join(root,'魔法王座.exe');
 const powershell=code=>execFileSync('powershell.exe',['-NoProfile','-Command',code],{env,encoding:'utf8',windowsHide:true});
 try{
  execFileSync(launcher,['--root',root,'--cache',cache,'--profile',profile],{env,windowsHide:true,timeout:30000});
  await expect.poll(()=>{
   const text=powershell("@(Get-Process -Name '魔法王座' -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $env:MAGIC_VISIBILITY_EXE -and $_.MainWindowHandle -ne 0 } | Select-Object -ExpandProperty MainWindowTitle) | ConvertTo-Json -Compress");
   return text.includes(`v${CLIENT_VERSION}`);
  },{timeout:20000}).toBe(true);
 }finally{
  powershell("Get-Process -Name '魔法王座' -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $env:MAGIC_VISIBILITY_EXE } | Stop-Process -ErrorAction SilentlyContinue");
 }
});
async function service(gameVersion=GAME_VERSION,clientVersion=CLIENT_VERSION){
 const dataDir=await mkdtemp(path.join(tmpdir(),'magic-desktop-server-')),game=createGameServer({dataDir,gameVersion,clientVersion});
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
 await expect(page.locator('#authForm')).toBeVisible();await page.locator('#tabRegister').click();await page.locator('#accountName').fill(label+Date.now());await page.locator('#accountPassword').fill('desktop-test-password');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected&&__game.renderer.getCamera());
}

test('桌面窗口：升级仅显示强化次数，详情可返回且不会消耗选卡',async()=>{
 const server=await service();server.room.paused=true;let client;
 try{
  client=await launch(server.base);const {app,page}=client;await register(page,'手动强化');
  const p=server.room.player(server.accounts.rows[0]),s=server.room.sim;
  s.addXp(p,s.expNeeded(p)-p.xp);p.progress[0].choices[0].options=['N000_0','N004_0','N089_0'];
  server.room.sequence++;server.room.broadcast();
  await expect(page.locator('[data-trait-count]')).toHaveText('1');
  await expect(page.locator('#traitDraft')).toBeHidden();
  await page.locator('#traitPending').click();
  await expect(page.locator('#traitDraft')).toBeVisible();
  await page.locator('[data-trait-info="N000_0"]').click();
  await expect(page.locator('[data-skill-detail-body]')).toContainText('技能效果');
  await expect(page.locator('[data-skill-detail-body]')).toContainText('该技能尚未选择强化');
  await capture(app,page,path.join(process.env.MAGIC_QA_DIR,'desktop-trait-details.png'));
  await page.keyboard.press('1');expect(p.progress[0].choices).toHaveLength(1);
  await page.locator('[data-detail-back]').click();
  await page.locator('[data-trait="N000_0"]').click();
  await expect(page.locator('#traitDraft')).toBeHidden();
  await expect(page.locator('#traitPending')).toBeHidden();
  expect(p.progress[0].traits.N000_0).toBe(1);expect(client.errors).toEqual([]);
 }finally{await client?.app.close();await server.close();}
});
test('桌面EXE独立窗口：本机资源、登录契约、关闭退出、重启保留会话',async()=>{
 const server=await service();let client;const remoteRequests=[];server.server.on('request',r=>remoteRequests.push(r.url));
 try{
  client=await launch(server.base);const {app,page}=client;
  await expect(page).toHaveTitle(/魔法王座/);
  expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].getTitle())).toBe(`魔法王座 v${CLIENT_VERSION}`);
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
test('记住上次成功登录的账号密码：退出、失败、重启、过期和切换账号',async()=>{
 const server=await service();let client;
 const first='记住账号'+Date.now(),second='切换账号'+Date.now(),password='remember-credentials-test';
 try{
  client=await launch(server.base);let page=client.page;
  await expect(page.locator('#accountName')).toHaveValue('');await expect(page.locator('#accountPassword')).toHaveValue('');
  await page.locator('#tabRegister').click();await page.locator('#accountName').fill(first);await page.locator('#accountPassword').fill(password);await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected);
  await page.locator('#logout').click();await expect(page.locator('#accountName')).toHaveValue(first);await expect(page.locator('#accountPassword')).toHaveValue(password);
  await page.locator('#tabLogin').focus();await page.keyboard.press('ArrowLeft');await expect(page.locator('#accountName')).toHaveValue('');await expect(page.locator('#accountPassword')).toHaveValue('');
  await page.keyboard.press('ArrowRight');await expect(page.locator('#accountName')).toHaveValue(first);await expect(page.locator('#accountPassword')).toHaveValue(password);
  await page.locator('#accountName').fill('不存在的账号');await page.locator('#accountPassword').fill('incorrect-password');await page.locator('#authSubmit').click();await expect(page.locator('#authError')).toHaveText('账号或密码错误');
  await page.reload();await expect(page.locator('#accountName')).toHaveValue(first);await expect(page.locator('#accountPassword')).toHaveValue(password);
  const profile=client.profile,previousOrigin=new URL(page.url()).origin;
  const files=(await readdir(profile)).filter(name=>name.startsWith('login-credentials-')&&name.endsWith('.bin'));expect(files).toHaveLength(1);
  const encrypted=await readFile(path.join(profile,files[0]));expect(encrypted.includes(Buffer.from(password))).toBe(false);expect(encrypted.includes(Buffer.from(first))).toBe(false);
  expect(client.errors).toEqual([]);await client.app.close();client=await launch(server.base,profile);page=client.page;
  expect(new URL(page.url()).origin).not.toBe(previousOrigin);
  await expect(page.locator('#accountName')).toHaveValue(first);await expect(page.locator('#accountPassword')).toHaveValue(password);
  await expect(page).toHaveTitle(/魔法王座/);await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await capture(client.app,page,path.join(process.env.MAGIC_QA_DIR,'desktop-remember-login.png'));
  await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected);await expect(page.locator('.account-heading h2')).toHaveText(first);
  await page.locator('#logout').click();await page.locator('#tabRegister').click();await page.locator('#accountName').fill(second);await page.locator('#accountPassword').fill(password+'-second');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected);
  server.accounts.sessions.clear();expect(client.errors).toEqual([]);await client.app.close();client=await launch(server.base,profile);page=client.page;
  await expect(page.locator('#accountName')).toHaveValue(second);await expect(page.locator('#accountPassword')).toHaveValue(password+'-second');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.network.connected);await expect(page.locator('.account-heading h2')).toHaveText(second);
  expect(client.errors).toEqual([]);
 }finally{await client?.app.close();await server.close();}
});

test('默认服务配置无选择入口，隔离服务覆盖忽略旧版保存地址',async()=>{
 const server=await service(),profile=await mkdtemp(path.join(tmpdir(),'magic-default-profile-'));let client;
 try{
  await writeFile(path.join(profile,'client-config.json'),JSON.stringify({serverUrl:'http://127.0.0.1:1'}));
  client=await launch(server.base,profile);await expect(client.page.locator('#authForm')).toBeVisible();
  const info=await (await client.page.request.get(new URL(client.page.url()).origin+'/client-info')).json();
  expect(info.serverUrl).toBe(server.base);
  expect(await client.app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById('server-settings')===null)).toBe(true);
  await expect(client.page.locator('#serverUrl')).toHaveCount(0);expect(client.errors).toEqual([]);
 }finally{await client?.app.close();await server.close();}
});

test('桌面版本不符：直接显示强制更新页',async()=>{
 const required=GAME_VERSION.replace(/\d+$/,n=>String(Number(n)+1)),server=await service(required);let client;
 try{client=await launch(server.base);await expect(client.page.locator('#updateRequired')).toBeVisible();await expect(client.page.locator('#requiredVersion')).toHaveText(required);await expect(client.page.locator('#authForm')).toHaveCount(0);await capture(client.app,client.page,path.join(process.env.MAGIC_QA_DIR,'desktop-update-required.png'));expect(client.errors).toEqual([]);}finally{await client?.app.close();await server.close();}
});

test('只有客户端发布版本变化也要求手动拉取，不请求更新包',async()=>{
 const required=CLIENT_VERSION.replace(/\d+$/,n=>String(Number(n)+1)),server=await service(GAME_VERSION,required);let client;const requests=[];server.server.on('request',req=>requests.push(req.url));
 try{
  client=await launch(server.base);
  await expect(client.page.locator('#updateRequired')).toBeVisible();
  await expect(client.page.locator('#requiredVersion')).toHaveText(GAME_VERSION);
  await expect(client.page.locator('#requiredClientVersion')).toHaveText(required);
  await expect(client.page.locator('#authForm')).toHaveCount(0);
  await expect(client.page.locator('#updateStatus')).toContainText('GitHub Desktop');
  await expect(client.page.locator('#retryUpdate')).toHaveCount(0);
  expect(await client.page.evaluate(()=>typeof window.magicDesktop.update)).toBe('undefined');
  await capture(client.app,client.page,path.join(process.env.MAGIC_QA_DIR,'desktop-manual-pull.png'));
  expect(requests.some(url=>url.startsWith('/api/updates/'))).toBe(false);
  expect(client.errors).toEqual([]);
 }finally{await client?.app.close();await server.close();}
});


test('性能诊断：仅yxt超级账号落盘，切换普通账号后不可见且IPC拒绝写入',async()=>{
 const server=await service();let client;
 const admin=await server.accounts.register({name:'yxt',password:'desktop-test-password',side:0});
 await server.accounts.register({name:'ordinary',password:'desktop-test-password',side:0});
 await writeFile(path.join(path.dirname(server.accounts.file),'super-accounts.json'),JSON.stringify([admin.id]));
 try{
  client=await launch(server.base);const {app,page,profile}=client;
  const window=await app.browserWindow(page);await window.evaluate(win=>{win.show();win.focus();});
  await page.locator('#accountName').fill('yxt');await page.locator('#accountPassword').fill('desktop-test-password');await page.locator('#authSubmit').click();
  await expect(page.locator('#performanceStatus')).toContainText('FPS',{timeout:20000});
  await expect(page.locator('#performanceLogStatus')).toContainText('performance.jsonl');
  const file=path.join(profile,'performance-logs','performance.jsonl');
  const rows=(await readFile(file,'utf8')).trim().split('\n').map(JSON.parse);
  expect(rows.at(-1).sample.fps).toBeGreaterThan(0);expect(rows.at(-1).sample.load.units).toBeGreaterThan(0);
  expect(rows.at(-1).environment.clientVersion).toBe(CLIENT_VERSION);
  expect(await page.locator('#performanceLogStatus').textContent()).toContain(file);
  await page.locator('#performanceLogStatus').scrollIntoViewIfNeeded();
  await capture(app,page,path.join(process.env.MAGIC_QA_DIR,'performance-native.png'));
  await page.locator('#logout').click();await expect(page.locator('#authForm')).toBeVisible();
  await page.locator('#accountName').fill('ordinary');await page.locator('#accountPassword').fill('desktop-test-password');await page.locator('#authSubmit').click();await page.waitForFunction(()=>window.__game?.renderer.getCamera());
  const before=await readFile(file,'utf8');await expect(page.locator('#performanceStatus')).toHaveCount(0);
  const denied=await page.evaluate(async()=>{try{await magicDesktop.writePerformanceSample({account:{name:'yxt',isSuperAdmin:true},sample:{fps:60}});return false;}catch(e){return e.message.includes('requires yxt super account');}});
  expect(denied).toBe(true);await page.waitForTimeout(2300);
  expect(await page.evaluate(()=>({monitor:__game.performance,load:__game.renderer.performanceLoad}))).toEqual({monitor:null,load:null});
  expect(await readFile(file,'utf8')).toBe(before);

  expect(client.errors).toEqual([]);
 }finally{await client?.app.close();await server.close();}
});

import {app,BrowserWindow,Menu,dialog,ipcMain,session} from 'electron';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createLocalClient} from '../launcher.mjs';
import {readDesktopSettings,saveDesktopSettings} from './config.mjs';
import {GAME_VERSION} from '../../shared/protocol.js';

const here=path.dirname(fileURLToPath(import.meta.url)),clientRoot=path.resolve(here,'..');
const testMode=process.env.MAGIC_DESKTOP_TEST==='1';
app.setName('Magic Siege');
app.setAppUserModelId('com.onemt.magicsiege');
if(process.env.MAGIC_DESKTOP_USER_DATA)app.setPath('userData',path.resolve(process.env.MAGIC_DESKTOP_USER_DATA));
const userData=app.getPath('userData');
let mainWindow,settingsWindow,local,origin,settings,changing=false;
const title=`魔法王座 v${GAME_VERSION}`;

function focusWindow(){if(mainWindow&&!mainWindow.isDestroyed()){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}}
function lockWindow(window,allowed){
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 window.webContents.on('will-navigate',(event,url)=>{if(!allowed(url))event.preventDefault();});
 window.webContents.on('will-redirect',(event,url)=>{if(!allowed(url))event.preventDefault();});
 window.webContents.on('will-attach-webview',event=>event.preventDefault());
}
async function startLocal(serverUrl){
 const next=createLocalClient({serverUrl,distDir:path.join(clientRoot,'dist')});
 await new Promise((resolve,reject)=>{next.server.once('error',reject);next.server.listen(0,'127.0.0.1',resolve);});
 return next;
}
function stopLocal(service){if(!service)return;service.server.closeAllConnections();service.server.close();}
function buildMenu(){
 Menu.setApplicationMenu(Menu.buildFromTemplate([
  {label:'游戏',submenu:[
   {id:'server-settings',label:'服务器设置…',click:showSettings},
   {label:'重新连接',accelerator:'CmdOrCtrl+R',click:()=>mainWindow?.reload()},
   {label:'全屏',accelerator:'F11',click:()=>mainWindow?.setFullScreen(!mainWindow.isFullScreen())},
   {type:'separator'},{label:'退出',accelerator:'Alt+F4',click:()=>app.quit()},
  ]},
  {label:'帮助',submenu:[{label:'关于魔法王座',click:()=>dialog.showMessageBox(mainWindow,{type:'info',title:'关于魔法王座',message:title,detail:'本机加载游戏资源，连接远端战斗服务器。\n客户端版本必须与服务器一致。'})}]},
 ]));
}
function showSettings(){
 if(settingsWindow&&!settingsWindow.isDestroyed()){settingsWindow.focus();return;}
 settingsWindow=new BrowserWindow({title:'服务器设置',parent:mainWindow,modal:true,width:520,height:320,resizable:false,minimizable:false,maximizable:false,show:!testMode,autoHideMenuBar:true,webPreferences:{preload:path.join(here,'settings-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 settingsWindow.setMenu(null);
 const page=pathToFileURL(path.join(here,'settings.html')).href;
 lockWindow(settingsWindow,url=>url===page);
 settingsWindow.on('closed',()=>{settingsWindow=null;});
 settingsWindow.loadURL(page);
}
function checkSettingsSender(event){if(!settingsWindow||event.sender!==settingsWindow.webContents||event.senderFrame!==settingsWindow.webContents.mainFrame)throw Error('不允许修改服务器设置');}
async function boot(){
 await app.whenReady();
 settings=await readDesktopSettings({clientRoot,portableRoot:app.isPackaged?path.dirname(process.execPath):null,userData,serverOverride:process.env.MAGIC_SERVER_URL});
 local=await startLocal(settings.serverUrl);origin=`http://127.0.0.1:${local.server.address().port}`;
 const gameSession=session.fromPartition('persist:magic-siege');
 gameSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
 gameSession.setPermissionCheckHandler(()=>false);
 gameSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(details,callback)=>callback({cancel:new URL(details.url).origin!==origin}));
 gameSession.webRequest.onHeadersReceived((details,callback)=>{
  const headers={...details.responseHeaders};
  if(new URL(details.url).origin===origin)headers['Content-Security-Policy']=["default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-src 'none'"];
  callback({responseHeaders:headers});
 });
 mainWindow=new BrowserWindow({title,width:1280,height:1000,minWidth:740,minHeight:600,backgroundColor:'#101e18',show:false,autoHideMenuBar:false,webPreferences:{session:gameSession,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,spellcheck:false}});
 lockWindow(mainWindow,url=>{try{return new URL(url).origin===origin;}catch{return false;}});
 mainWindow.webContents.on('page-title-updated',event=>{event.preventDefault();mainWindow.setTitle(title);});
 mainWindow.once('ready-to-show',()=>{if(!testMode)mainWindow.show();});
 buildMenu();
 ipcMain.handle('magic:settings:get',event=>{checkSettingsSender(event);return settings;});
 ipcMain.handle('magic:settings:save',async(event,serverUrl)=>{
  checkSettingsSender(event);if(changing)throw Error('正在切换服务器，请稍候');changing=true;
  let next;
  try{
   // Validate before starting another listener or saving a setting.
   next=await startLocal(serverUrl);
   const saved=await saveDesktopSettings(userData,serverUrl);
   const previous=local;local=next;settings=saved;origin=`http://127.0.0.1:${local.server.address().port}`;
   stopLocal(previous);await mainWindow.loadURL(origin+'/');
   return {ok:true};
  }catch(error){if(next&&next!==local)stopLocal(next);return {ok:false,error:error.message};}finally{changing=false;}
 });
 ipcMain.on('magic:settings:close',event=>{checkSettingsSender(event);settingsWindow.close();});
 await mainWindow.loadURL(origin+'/');
}
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>stopLocal(local));
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',focusWindow);
 boot().catch(error=>{console.error(error);if(!testMode)dialog.showErrorBox('魔法王座启动失败',error.message);app.quit();});
}

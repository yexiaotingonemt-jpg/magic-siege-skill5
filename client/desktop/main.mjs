import {app,BrowserWindow,Menu,dialog,session} from 'electron';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createLocalClient} from '../launcher.mjs';
import {readDesktopSettings} from './config.mjs';
import {GAME_VERSION} from '../../shared/protocol.js';

const here=path.dirname(fileURLToPath(import.meta.url)),clientRoot=path.resolve(here,'..');
const testMode=process.env.MAGIC_DESKTOP_TEST==='1';
app.setName('Magic Siege');
app.setAppUserModelId('com.onemt.magicsiege');
if(process.env.MAGIC_DESKTOP_USER_DATA)app.setPath('userData',path.resolve(process.env.MAGIC_DESKTOP_USER_DATA));
let mainWindow,local,origin,settings;
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
   {label:'重新连接',accelerator:'CmdOrCtrl+R',click:()=>mainWindow?.reload()},
   {label:'全屏',accelerator:'F11',click:()=>mainWindow?.setFullScreen(!mainWindow.isFullScreen())},
   {type:'separator'},{label:'退出',accelerator:'Alt+F4',click:()=>app.quit()},
  ]},
  {label:'帮助',submenu:[{label:'关于魔法王座',click:()=>dialog.showMessageBox(mainWindow,{type:'info',title:'关于魔法王座',message:title,detail:'本机加载游戏资源，连接远端战斗服务器。\n客户端版本必须与服务器一致。'})}]},
 ]));
}
async function boot(){
 await app.whenReady();
 settings=await readDesktopSettings({clientRoot,serverOverride:testMode?process.env.MAGIC_SERVER_URL:undefined});
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
 await mainWindow.loadURL(origin+'/');
}
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>stopLocal(local));
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',focusWindow);
 boot().catch(error=>{console.error(error);if(!testMode)dialog.showErrorBox('魔法王座启动失败',error.message);app.quit();});
}

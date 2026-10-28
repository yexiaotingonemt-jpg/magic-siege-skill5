const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('magicSettings',Object.freeze({
 get:()=>ipcRenderer.invoke('magic:settings:get'),
 save:serverUrl=>ipcRenderer.invoke('magic:settings:save',serverUrl),
 close:()=>ipcRenderer.send('magic:settings:close'),
}));

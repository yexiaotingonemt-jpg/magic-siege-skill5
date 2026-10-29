const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('magicDesktop',Object.freeze({
 getLoginCredentials:()=>ipcRenderer.invoke('magic:login-credentials:read'),
 saveLoginCredentials:value=>ipcRenderer.invoke('magic:login-credentials:save',value),
}));

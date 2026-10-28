const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('magicDesktop',Object.freeze({
 update:()=>ipcRenderer.invoke('magic:update',false),
 retryUpdate:()=>ipcRenderer.invoke('magic:update',true),
 onUpdate:callback=>{const handler=(_event,status)=>callback(status);ipcRenderer.on('magic:update-status',handler);return ()=>ipcRenderer.removeListener('magic:update-status',handler);},
}));

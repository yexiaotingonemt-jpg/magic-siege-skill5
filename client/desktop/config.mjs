import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {parseServerUrl} from '../launcher.mjs';
async function readConfig(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw Error(`无法读取服务器设置：${file}（${error.message}）`);}}
export async function readDesktopSettings({clientRoot,portableRoot,userData,serverOverride}){
 const defaults=await readConfig(path.join(clientRoot,'client-config.json'));
 const portable=portableRoot?await readConfig(path.join(portableRoot,'client-config.json')):{};
 const saved=await readConfig(path.join(userData,'client-config.json'));
 return {serverUrl:parseServerUrl(serverOverride||saved.serverUrl||portable.serverUrl||defaults.serverUrl||'http://127.0.0.1:5183').origin};
}
export async function saveDesktopSettings(userData,serverUrl){
 const settings={serverUrl:parseServerUrl(serverUrl).origin};
 await mkdir(userData,{recursive:true});
 const file=path.join(userData,'client-config.json');
 await writeFile(file+'.tmp',JSON.stringify(settings,null,2)+'\n',{mode:0o600});await rename(file+'.tmp',file);
 return settings;
}

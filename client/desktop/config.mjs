import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseServerUrl} from '../launcher.mjs';
async function readConfig(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw Error(`无法读取服务器设置：${file}（${error.message}）`);}}
export async function readDesktopSettings({clientRoot,serverOverride}){
 const defaults=await readConfig(path.join(clientRoot,'client-config.json'));
 return {serverUrl:parseServerUrl(serverOverride||defaults.serverUrl||'http://124.222.216.66:5183').origin};
}

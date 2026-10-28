import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {readDesktopSettings} from '../client/desktop/config.mjs';
test('桌面自动连接内置服务器，忽略旧个人地址和外部地址文件',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'magic-desktop-config-'));
 const clientRoot=path.join(root,'client'),portableRoot=path.join(root,'portable'),userData=path.join(root,'profile');
 try{
  for(const dir of [clientRoot,portableRoot,userData])await mkdir(dir);
  await writeFile(path.join(clientRoot,'client-config.json'),JSON.stringify({serverUrl:'http://124.222.216.66:5183'}));
  await writeFile(path.join(portableRoot,'client-config.json'),JSON.stringify({serverUrl:'http://127.0.0.1:9999'}));
  await writeFile(path.join(userData,'client-config.json'),'invalid legacy settings');
  const paths={clientRoot,portableRoot,userData};
  assert.equal((await readDesktopSettings(paths)).serverUrl,'http://124.222.216.66:5183');
  assert.equal((await readDesktopSettings({...paths,serverOverride:'http://127.0.0.1:5000'})).serverUrl,'http://127.0.0.1:5000');
 }finally{await rm(root,{recursive:true,force:true});}
});

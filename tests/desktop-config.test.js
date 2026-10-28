import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {readDesktopSettings,saveDesktopSettings} from '../client/desktop/config.mjs';
test('桌面服务器地址：默认、分发包、个人设置与环境覆盖，保存后跨版本保留',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'magic-desktop-config-'));
 const clientRoot=path.join(root,'client'),portableRoot=path.join(root,'portable'),userData=path.join(root,'profile');
 try{
  for(const dir of [clientRoot,portableRoot])await mkdir(dir);
  const paths={clientRoot,portableRoot,userData};
  await writeFile(path.join(clientRoot,'client-config.json'),JSON.stringify({serverUrl:'http://127.0.0.1:5183'}));
  assert.equal((await readDesktopSettings(paths)).serverUrl,'http://127.0.0.1:5183');
  await writeFile(path.join(portableRoot,'client-config.json'),JSON.stringify({serverUrl:'https://game.example.com/'}));
  assert.equal((await readDesktopSettings(paths)).serverUrl,'https://game.example.com');
  await saveDesktopSettings(userData,'http://192.168.1.10:5183');
  assert.equal((await readDesktopSettings(paths)).serverUrl,'http://192.168.1.10:5183');
  assert.equal((await readDesktopSettings({...paths,serverOverride:'https://override.example.com'})).serverUrl,'https://override.example.com');
  const previous=await readFile(path.join(userData,'client-config.json'),'utf8');
  await assert.rejects(saveDesktopSettings(userData,'file:///C:/test'));await assert.rejects(saveDesktopSettings(userData,'https://example.com/api'));
  assert.equal(await readFile(path.join(userData,'client-config.json'),'utf8'),previous);
 }finally{await rm(root,{recursive:true,force:true});}
});

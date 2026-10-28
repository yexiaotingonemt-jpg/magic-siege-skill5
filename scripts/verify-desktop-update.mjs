import {cp,mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash,sign} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {_electron} from 'playwright';
const repo=fileURLToPath(new URL('..',import.meta.url));
if(process.platform!=='win32'||!process.env.MAGIC_UPDATE_SIGNING_KEY)throw Error('Windows test requires MAGIC_UPDATE_SIGNING_KEY and a desktop bundle argument');
const {CLIENT_VERSION,GAME_VERSION}=await import(pathToFileURL(path.join(repo,'shared/protocol.js')));
const nextVersion=CLIENT_VERSION.replace(/\d+$/,n=>String(Number(n)+1));
const {createGameServer}=await import(pathToFileURL(repo+'/server/index.mjs'));
const {canonicalRelease}=await import(pathToFileURL(repo+'/shared/update-protocol.js'));
const asar=await import(pathToFileURL(repo+'/node_modules/@electron/asar/lib/asar.js'));
const base=path.join(process.env.MAGIC_QA_DIR||tmpdir(),'auto-update-'+Date.now());
await mkdir(base,{recursive:true});
const source=path.resolve(process.argv[2]);
const results=[];
const key=await readFile(process.env.MAGIC_UPDATE_SIGNING_KEY);
for(const broken of [false,true]){
 const scenario=path.join(base,broken?'rollback':'success');await mkdir(scenario);
 const target=path.join(scenario,'target');await cp(source,target,{recursive:true});
 const extract=path.join(scenario,'asar');asar.extractAll(path.join(target,'resources/app.asar'),extract);
 for(const rel of ['shared/protocol.js','package.json','client/dist/client-version.json']){
  const file=path.join(extract,rel);await writeFile(file,(await readFile(file,'utf8')).replaceAll(CLIENT_VERSION,nextVersion));
 }
 const {readdir}=await import('node:fs/promises');
 for(const name of await readdir(path.join(extract,'client/dist/assets'))){if(name.endsWith('.js')){const file=path.join(extract,'client/dist/assets',name);await writeFile(file,(await readFile(file,'utf8')).replaceAll(CLIENT_VERSION,nextVersion));}}
 await asar.createPackage(extract,path.join(target,'resources/app.asar'));
 const meta=JSON.parse(await readFile(path.join(target,'VERSION.json'),'utf8'));meta.clientVersion=nextVersion;await writeFile(path.join(target,'VERSION.json'),JSON.stringify(meta));
 if(broken)await writeFile(path.join(target,'魔法王座.exe'),'intentionally invalid PE for rollback test');
 const zip=path.join(scenario,'package.zip');
 execFileSync('powershell.exe',['-NoProfile','-Command','Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:FIXTURE_SOURCE,$env:FIXTURE_ZIP,[IO.Compression.CompressionLevel]::Optimal,$true)'],{env:{...process.env,FIXTURE_SOURCE:target,FIXTURE_ZIP:zip},windowsHide:true});
 const hash=createHash('sha256');for await(const chunk of createReadStream(zip))hash.update(chunk);
 const release={version:nextVersion,gameVersion:GAME_VERSION,protocolVersion:1,platform:'win32',arch:'x64',sha256:hash.digest('hex'),size:(await stat(zip)).size,file:'package.zip',folder:'target'};
 const feed=path.join(scenario,'feed',nextVersion,'win32-x64');await mkdir(feed,{recursive:true});await cp(zip,path.join(feed,'package.zip'));
 await writeFile(path.join(feed,'manifest.json'),JSON.stringify({release,signature:sign(null,Buffer.from(canonicalRelease(release)),key).toString('base64')}));
 const server=createGameServer({dataDir:path.join(scenario,'data'),gameVersion:GAME_VERSION,clientVersion:nextVersion,updateDir:path.join(scenario,'feed')});await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
 const install=path.join(scenario,'install'),profile=path.join(scenario,'profile');await cp(source,install,{recursive:true});await mkdir(profile);await writeFile(path.join(profile,'preserved.txt'),'keep user profile');
 const env={...process.env,MAGIC_DESKTOP_TEST:'1',MAGIC_DESKTOP_USER_DATA:profile,MAGIC_SERVER_URL:`http://127.0.0.1:${server.server.address().port}`};delete env.ELECTRON_RUN_AS_NODE;

 let application;
 try{
  application=await _electron.launch({executablePath:path.join(install,'魔法王座.exe'),args:[],env,timeout:30000});
  const page=await application.firstWindow();
  await page.waitForSelector('#updateRequired');
  let lastStatus='';
  let receipt,transaction;
  for(let i=0;i<900;i++){
   for(const name of await readdir(path.join(profile,'updates')).catch(()=>[]))if(/^[a-f0-9]{32}$/.test(name)){
    transaction=path.join(profile,'updates',name);try{receipt=JSON.parse((await readFile(path.join(transaction,'result.json'),'utf8')).replace(/^\uFEFF/,''));}catch{}
   }
   if(receipt)break;
   if(i%25===0)lastStatus=await page.locator('#updateStatus').textContent({timeout:500}).catch(()=>lastStatus);
   await new Promise(r=>setTimeout(r,200));
  }
  if(!receipt)throw Error('No update result ('+lastStatus+'). Inspect '+scenario);
  if(receipt.ok===broken)throw Error('Unexpected receipt: '+JSON.stringify(receipt));
  const installed=JSON.parse(await readFile(path.join(install,'VERSION.json'),'utf8'));if(installed.clientVersion!==(broken?CLIENT_VERSION:nextVersion))throw Error('Wrong installed version');
  if(await readFile(path.join(profile,'preserved.txt'),'utf8')!=='keep user profile')throw Error('Lost profile');
  if(receipt.ok){const info=await (await fetch(receipt.origin+'/client-info')).json();if(info.clientVersion!==nextVersion)throw Error('New process serves old client');}
  results.push({scenario:broken?'rollback':'success',receipt,installedVersion:installed.clientVersion,profilePreserved:true,transaction});
  console.log(JSON.stringify(results.at(-1)));
 }finally{
  await application?.close().catch(()=>{});
  // Only stop processes whose executable is this isolated QA installation.
  execFileSync('powershell.exe',['-NoProfile','-Command','$target=[IO.Path]::GetFullPath($env:FIXTURE_EXE); Get-Process | Where-Object { $_.Path -eq $target } | Stop-Process'],{env:{...process.env,FIXTURE_EXE:path.join(install,'魔法王座.exe')},windowsHide:true});
  server.server.closeAllConnections();await new Promise(r=>server.server.close(r));
 }
}
await writeFile(path.join(base,'results.json'),JSON.stringify(results,null,2));console.log('REPORT '+base);

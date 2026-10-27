import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,openSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const url=`http://127.0.0.1:${Number(process.env.PORT||5183)}/`;
const open=()=>spawn('powershell.exe',['-NoProfile','-Command',`Start-Process '${url}'`],{windowsHide:true,stdio:'ignore'}).unref();
try{const response=await fetch(url,{signal:AbortSignal.timeout(1000)});if(response.ok){open();process.exit(0);}}catch{}
if(!existsSync(path.join(root,'dist/index.html')))throw Error('Missing dist. Run npm ci and npm run build first.');
mkdirSync(path.join(root,'evidence'),{recursive:true});
const child=spawn(process.execPath,[path.join(root,'server.mjs')],{cwd:root,windowsHide:true,detached:true,stdio:['ignore',openSync(path.join(root,'evidence/server.log'),'a'),openSync(path.join(root,'evidence/server-error.log'),'a')]});
writeFileSync(path.join(root,'evidence/server.pid'),String(child.pid));child.unref();
for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,200));try{const response=await fetch(url);if(response.ok){open();process.exit(0);}}catch{}}
throw Error('Server did not start. See evidence/server-error.log');

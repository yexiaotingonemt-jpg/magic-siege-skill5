import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';

export async function findRepositoryUpdate(required,userData){
 try{
  const saved=JSON.parse(await readFile(path.join(userData,'repository-source.json'),'utf8'));
  if(!path.isAbsolute(saved.root)||saved.launcher!==path.join(saved.root,'魔法王座.exe'))return null;
  const manifest=JSON.parse(await readFile(path.join(saved.root,'desktop-client.json'),'utf8'));
  if(manifest.version!==required.clientVersion||manifest.serverVersion!==required.clientVersion||manifest.gameVersion!==required.gameVersion||manifest.protocolVersion!==required.protocolVersion)return null;
  if(!manifest.files?.['魔法王座.exe']||!Object.keys(manifest.files).length)return null;
  for(const [name,expected]of Object.entries(manifest.files)){
   const file=path.resolve(saved.root,name),relative=path.relative(saved.root,file);
   if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))return null;
   const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
   if(hash.digest('hex')!==expected)return null;
  }
  await stat(saved.launcher);return saved;
 }catch{return null;}
}

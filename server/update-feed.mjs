import {readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {verify} from 'node:crypto';
import {UPDATE_PUBLIC_KEY,canonicalRelease,validateRelease} from '../shared/update-protocol.js';
export async function serveUpdate(req,res,url,{directory,version,gameVersion,protocolVersion}){
 const match=/^\/api\/updates\/win32-(x64|arm64)(?:\/(package\.zip))?$/.exec(url.pathname);
 if(!match)return false;
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 if(!['GET','HEAD'].includes(req.method)){json(405,{error:'不支持的更新请求'});return true;}
 try{
  if(!directory)throw Error('更新尚未发布');
  const root=path.join(directory,version,'win32-'+match[1]);
  const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
  const release=validateRelease(manifest.release,version,match[1]);
  if(release.gameVersion!==gameVersion||release.protocolVersion!==protocolVersion||!verify(null,Buffer.from(canonicalRelease(release)),UPDATE_PUBLIC_KEY,Buffer.from(manifest.signature||'','base64')))throw Error('更新签名无效');
  if(!match[2]){json(200,manifest);return true;}
  const file=path.join(root,release.file),info=await stat(file);if(info.size!==release.size)throw Error('更新包尚未就绪');
  let start=0,end=info.size-1,status=200;
  if(req.headers.range){const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!range){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return true;}start=Number(range[1]);if(range[2])end=Math.min(end,Number(range[2]));if(start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return true;}status=206;}
  res.writeHead(status,{'Content-Type':'application/zip','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'private, no-cache','ETag':'"'+release.sha256+'"',...(status===206?{'Content-Range':`bytes ${start}-${end}/${info.size}`}:{})});
  if(req.method==='HEAD'){res.end();return true;}
  const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 }catch(error){if(!res.headersSent)json(503,{error:'更新暂不可用，请稍后重试'});else res.destroy();}
 return true;
}

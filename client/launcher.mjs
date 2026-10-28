import http from 'node:http';
import https from 'node:https';
import {createReadStream} from 'node:fs';
import {readFile,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';

const clientRoot=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const hopHeaders=['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade'];
export function parseServerUrl(value){
 const url=new URL(value);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('serverUrl 需为完整的 http://主机:端口 或 https://域名，不带路径、账号或参数');
 return url;
}
function cleanHeaders(headers){
 const result={...headers};
 for(const name of String(headers.connection||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean))delete result[name];
 for(const name of hopHeaders)delete result[name];
 return result;
}
export function createLocalClient({serverUrl,distDir=path.join(clientRoot,'dist')}={}){
 const remote=parseServerUrl(serverUrl),root=path.resolve(distDir);
 const json=(res,status,value)=>{if(res.destroyed)return;if(res.headersSent){res.destroy();return;}res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const server=http.createServer(async(req,res)=>{
  try{
   const host=req.headers.host||'',local=new URL('http://'+host);
   if(!['127.0.0.1','localhost'].includes(local.hostname))return json(res,403,{error:'本地客户端仅允许本机访问'});
   if(req.headers.origin&&req.headers.origin!==local.origin)return json(res,403,{error:'请求来源不允许'});
   const url=new URL(req.url,local);
   if(url.pathname==='/client-info')return json(res,200,{app:'magic-siege-local-client',serverUrl:remote.origin,gameVersion:GAME_VERSION,protocolVersion:PROTOCOL_VERSION});
   if(url.pathname.startsWith('/api/')){
    const headers=cleanHeaders(req.headers);
    headers.host=remote.host;headers['x-magic-protocol']??=String(PROTOCOL_VERSION);
    if(headers.origin)headers.origin=remote.origin;
    delete headers.referer;
    const upstream=(remote.protocol==='https:'?https:http).request(new URL(url.pathname+url.search,remote),{method:req.method,headers},incoming=>{
     const responseHeaders=cleanHeaders(incoming.headers);
     if(responseHeaders['set-cookie'])responseHeaders['set-cookie']=responseHeaders['set-cookie'].map(cookie=>cookie.replace(/;\s*Domain=[^;]+/ig,'').replace(/;\s*Secure\b/ig,''));
     res.writeHead(incoming.statusCode,responseHeaders);incoming.pipe(res);
     incoming.on('error',()=>res.destroy());
    });
    // Long-lived SSE streams must not inherit ordinary API response timeouts.
    const connectTimeout=setTimeout(()=>upstream.destroy(Error('连接服务器超时')),10000);
    upstream.on('socket',socket=>{const ready=()=>clearTimeout(connectTimeout);if(socket.connecting)socket.once(remote.protocol==='https:'?'secureConnect':'connect',ready);else ready();});
    upstream.on('close',()=>clearTimeout(connectTimeout));
    if(url.pathname!=='/api/events')upstream.setTimeout(15000,()=>upstream.destroy(Error('服务器响应超时')));
    upstream.on('error',()=>json(res,502,{error:'无法连接战斗服务器，请检查客户端配置中的服务器地址与网络'}));
    req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());
    req.pipe(upstream);return;
   }
   if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'不支持的请求方法'});
   const pathname=decodeURIComponent(url.pathname),target=path.resolve(root,'.'+pathname);
   if(target!==root&&!target.startsWith(root+path.sep))return json(res,403,{error:'路径不允许'});
   let file=target;if((await stat(file)).isDirectory())file=path.join(file,'index.html');
   const canonical=await realpath(file),canonicalRoot=await realpath(root);
   if(!canonical.startsWith(canonicalRoot+path.sep))return json(res,403,{error:'路径不允许'});
   const info=await stat(canonical);
   if(!info.isFile())return json(res,404,{error:'资源不存在'});
   const etag=`W/"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`;
   if(req.headers['if-none-match']===etag){res.writeHead(304,{'ETag':etag,'Cache-Control':'private, no-cache'});return res.end();}
   res.writeHead(200,{'Content-Type':mime[path.extname(canonical)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'private, no-cache','ETag':etag,'X-Content-Type-Options':'nosniff'});
   if(req.method==='HEAD')return res.end();
   const stream=createReadStream(canonical);stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch(error){json(res,error.code==='ENOENT'?404:400,{error:error.code==='ENOENT'?'本地资源不存在，请重新构建或完整解压客户端':error.message});}
 });
 return {server,serverUrl:remote.origin};
}
function openBrowser(url){
 const command=process.platform==='win32'?['powershell.exe',['-NoProfile','-Command',`Start-Process '${url}'`]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
 const child=spawn(command[0],command[1],{stdio:'ignore',windowsHide:true});child.on('error',()=>console.log('请手动打开 '+url));child.unref();
}
export async function startLocalClient({configPath=path.join(clientRoot,'client-config.json'),...overrides}={}){
 const config={...JSON.parse(await readFile(configPath,'utf8')),...overrides};
 const arg=process.argv.indexOf('--server');
 const serverUrl=process.env.MAGIC_SERVER_URL||(arg>=0?process.argv[arg+1]:config.serverUrl);
 const port=Number(process.env.CLIENT_PORT||config.port||5184);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('客户端端口必须是1～65535的整数');
 await stat(path.join(clientRoot,'dist/index.html')).catch(()=>{throw Error('缺少客户端资源，请先执行 npm run build 或完整解压发布包');});
 const local=createLocalClient({serverUrl}),url=`http://127.0.0.1:${port}/`;
 try{await new Promise((resolve,reject)=>{local.server.once('error',reject);local.server.listen(port,'127.0.0.1',resolve);});}
 catch(error){
  if(error.code!=='EADDRINUSE')throw error;
  const response=await fetch(url+'client-info',{signal:AbortSignal.timeout(2000)}).catch(()=>null);
  const info=response?await response.json().catch(()=>null):null;
  if(info?.app!=='magic-siege-local-client'||info.serverUrl!==local.serverUrl||info.gameVersion!==GAME_VERSION||info.protocolVersion!==PROTOCOL_VERSION)throw Error(`本地端口 ${port} 已被占用或仍在运行旧版本，请关闭旧客户端后重新启动；也可修改 client-config.json 中的 port`);
  console.log('客户端已启动：'+url);if(config.openBrowser!==false)openBrowser(url);return local;
 }
 console.log(`本地客户端 v${GAME_VERSION}：${url}\n战斗服务器：${local.serverUrl}\n关闭此窗口将断开游戏连接。`);
 if(config.openBrowser!==false)openBrowser(url);
 return local;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))startLocalClient().catch(error=>{console.error(error.message);process.exitCode=1;});

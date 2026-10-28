import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serveUpdate} from './update-feed.mjs';
import {Accounts} from './accounts.mjs';
import {Room} from './room.mjs';
import {createEventStream} from './event-stream.mjs';
import {SERVER_VERSION,CLIENT_VERSION,GAME_VERSION,PROTOCOL_VERSION,RULESET_REVISION,UPDATE_REQUIRED_CODE} from '../shared/protocol.js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createGameServer({dataDir=process.env.KC_DATA_DIR||path.join(base,'data'),gameVersion=GAME_VERSION,clientVersion=CLIENT_VERSION,updateDir=process.env.MAGIC_UPDATE_DIR||path.join(base,'updates'),sseGzip=process.env.MAGIC_SSE_GZIP!=='0'}={}){
 const accounts=new Accounts(dataDir),room=new Room(),limits=new Map();
 const json=(res,status,value,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value));};
 const body=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>131072)throw Error('请求过大');}return JSON.parse(raw||'{}');};
 const server=http.createServer(async(req,res)=>{
  try{const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/health')return json(res,200,{ok:true,version:5,serverVersion:SERVER_VERSION,gameVersion,clientVersion,protocolVersion:PROTOCOL_VERSION,revision:RULESET_REVISION,matchId:room.matchId,sequence:room.sequence,clients:room.clients.size});
   if(url.pathname==='/api/version')return json(res,200,{serverVersion:SERVER_VERSION,gameVersion,clientVersion,protocolVersion:PROTOCOL_VERSION});
   if(url.pathname.startsWith('/api/updates/')&&await serveUpdate(req,res,url,{directory:updateDir,version:clientVersion,gameVersion,protocolVersion:PROTOCOL_VERSION}))return;
   if(url.pathname.startsWith('/api/')){
    const clientGameVersion=req.headers['x-magic-version'],clientProtocol=req.headers['x-magic-protocol'];
    const versions=[clientGameVersion],protocols=[clientProtocol];
    // EventSource cannot set custom headers; its URL carries the compiled client version.
    if(url.pathname==='/api/events'){
     if(url.searchParams.has('clientVersion'))versions.push(url.searchParams.get('clientVersion'));
     if(url.searchParams.has('protocolVersion'))protocols.push(url.searchParams.get('protocolVersion'));
     if(!clientGameVersion)versions.shift();if(!clientProtocol)protocols.shift();
    }
    if(!versions.length||versions.some(v=>v!==gameVersion)||!protocols.length||protocols.some(v=>v!==String(PROTOCOL_VERSION)))return json(res,409,{code:UPDATE_REQUIRED_CODE,error:'战斗兼容版本与服务器不一致，正在更新客户端。',clientVersion:clientGameVersion||url.searchParams.get('clientVersion')||null,requiredVersion:gameVersion,requiredClientVersion:clientVersion,protocolVersion:PROTOCOL_VERSION});
    if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return json(res,403,{error:'请求来源不允许'});
    if(['/api/register','/api/login'].includes(url.pathname)&&req.method==='POST'){
     const key=req.socket.remoteAddress,now=Date.now(),entry=limits.get(key)||{count:0,until:now+60000};if(now>entry.until){entry.count=0;entry.until=now+60000;}if(++entry.count>30)return json(res,429,{error:'登录尝试过于频繁，请稍后重试'});limits.set(key,entry);
     const input=await body(req),a=await accounts[url.pathname.endsWith('register')?'register':'login'](input),token=accounts.issue(a);room.player(a);return json(res,200,{account:accounts.public(a)},{'Set-Cookie':`kc_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`});
    }
    const a=accounts.get(req);if(!a)return json(res,401,{error:'请先登录账号'});
    if(url.pathname==='/api/me')return json(res,200,{account:accounts.public(a),playerId:room.player(a).id});
    if(url.pathname==='/api/events'){const stream=createEventStream(req,res,{gzip:sseGzip});stream.write(': connected\n\n');room.connect(a,stream);return;}
    if(url.pathname==='/api/state')return json(res,200,{...room.snapshot(),playerId:room.player(a).id});
    if(url.pathname==='/api/action'&&req.method==='POST'){const result=room.command(a,await body(req));return json(res,result.ok?200:400,result);}
    if(url.pathname==='/api/logout'&&req.method==='POST'){accounts.logout(req);for(const c of [...room.clients])if(c.account.id===a.id)c.res.end();return json(res,200,{ok:true},{'Set-Cookie':'kc_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});}
    return json(res,404,{error:'接口不存在'});
   }
   return json(res,404,{error:'此服务器仅提供游戏接口，请使用本地客户端启动游戏'});
  }catch(error){if(req.url?.startsWith('/api/'))json(res,400,{error:error.message});else{res.writeHead(404);res.end('Not found');}}
 });
 const timer=setInterval(()=>room.step(),25);timer.unref();server.on('close',()=>clearInterval(timer));return {server,room,accounts};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {server}=createGameServer();const port=Number(process.env.PORT||5183),host=process.env.HOST||'0.0.0.0';server.listen(port,host,()=>console.log(`Magic Siege design 5 multiplayer: http://127.0.0.1:${port}/ (${host})`));server.on('error',e=>{console.error(e.message);process.exitCode=1;});}

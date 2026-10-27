import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Accounts} from './server/accounts.mjs';
import {Room} from './server/room.mjs';
const base=path.dirname(fileURLToPath(import.meta.url)),root=path.join(base,'dist');
export function createGameServer({dataDir=process.env.KC_DATA_DIR||path.join(base,'data')}={}){
 const accounts=new Accounts(dataDir),room=new Room(),limits=new Map();
 const json=(res,status,value,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value));};
 const body=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>131072)throw Error('请求过大');}return JSON.parse(raw||'{}');};
 const server=http.createServer(async(req,res)=>{
  try{const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/health')return json(res,200,{ok:true,version:5,revision:'skill5-dash-fix-20261027',matchId:room.matchId,sequence:room.sequence,clients:room.clients.size});
   if(url.pathname.startsWith('/api/')){
    if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return json(res,403,{error:'请求来源不允许'});
    if(['/api/register','/api/login'].includes(url.pathname)&&req.method==='POST'){
     const key=req.socket.remoteAddress,now=Date.now(),entry=limits.get(key)||{count:0,until:now+60000};if(now>entry.until){entry.count=0;entry.until=now+60000;}if(++entry.count>30)return json(res,429,{error:'登录尝试过于频繁，请稍后重试'});limits.set(key,entry);
     const input=await body(req),a=await accounts[url.pathname.endsWith('register')?'register':'login'](input),token=accounts.issue(a);room.player(a);return json(res,200,{account:accounts.public(a)},{'Set-Cookie':`kc_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`});
    }
    const a=accounts.get(req);if(!a)return json(res,401,{error:'请先登录账号'});
    if(url.pathname==='/api/me')return json(res,200,{account:accounts.public(a),playerId:room.player(a).id});
    if(url.pathname==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');room.connect(a,res);return;}
    if(url.pathname==='/api/state')return json(res,200,{...room.snapshot(),playerId:room.player(a).id});
    if(url.pathname==='/api/action'&&req.method==='POST'){const result=room.command(a,await body(req));return json(res,result.ok?200:400,result);}
    if(url.pathname==='/api/logout'&&req.method==='POST'){accounts.logout(req);for(const c of [...room.clients])if(c.account.id===a.id)c.res.end();return json(res,200,{ok:true},{'Set-Cookie':'kc_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});}
    return json(res,404,{error:'接口不存在'});
   }
   const pathname=decodeURIComponent(url.pathname),target=path.resolve(root,'.'+pathname);if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);res.end();return;}let file=target;if((await stat(file)).isDirectory())file=path.join(file,'index.html');const content=await readFile(file),mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(content);
  }catch(error){if(req.url?.startsWith('/api/'))json(res,400,{error:error.message});else{res.writeHead(404);res.end('Not found');}}
 });
 const timer=setInterval(()=>room.step(),25);timer.unref();server.on('close',()=>clearInterval(timer));return {server,room,accounts};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {server}=createGameServer();const port=Number(process.env.PORT||5183),host=process.env.HOST||'0.0.0.0';server.listen(port,host,()=>console.log(`Magic Siege design 5 multiplayer: http://127.0.0.1:${port}/ (${host})`));server.on('error',e=>{console.error(e.message);process.exitCode=1;});}

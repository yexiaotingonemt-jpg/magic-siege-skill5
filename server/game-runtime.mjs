import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Accounts} from './accounts.mjs';
import {Room} from './room.mjs';
import {Simulation} from '../shared/simulation.js';
import {DEFAULT_NPC_POLICY} from '../shared/npc-balance.js';
import {liveConfig,clone,validateConfig} from '../shared/config.js';
import {isCurrentDesign} from '../shared/current-design.js';
import {planExperienceMigration} from '../shared/experience.js';
import {contractHistoryPage} from '../shared/contract-history.js';
const defaults=liveConfig();
import {createEventStream} from './event-stream.mjs';
import {SERVER_VERSION,CLIENT_VERSION,GAME_VERSION,PROTOCOL_VERSION,RULESET_REVISION,UPDATE_REQUIRED_CODE} from '../shared/protocol.js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createGameRuntime({dataDir=process.env.KC_DATA_DIR||path.join(base,'data'),gameVersion=GAME_VERSION,clientVersion=CLIENT_VERSION,sseGzip=process.env.MAGIC_SSE_GZIP!=='0',accounts=new Accounts(dataDir),room=new Room(),limits=new Map()}={}){
 const json=(res,status,value,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value));};
 const body=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>131072)throw Error('请求过大');}return JSON.parse(raw||'{}');};
 const handler=async(req,res)=>{
  try{const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/health')return json(res,200,{ok:true,version:5,serverVersion:SERVER_VERSION,gameVersion,clientVersion,protocolVersion:PROTOCOL_VERSION,revision:RULESET_REVISION,matchId:room.matchId,sequence:room.sequence,clients:room.clients.size});
   if(url.pathname==='/api/version')return json(res,200,{serverVersion:SERVER_VERSION,gameVersion,clientVersion,protocolVersion:PROTOCOL_VERSION});
   if(url.pathname.startsWith('/api/updates/'))return json(res,410,{error:'客户端自动更新已取消，请退出游戏并从 GitHub 拉取最新版仓库。'});
   if(url.pathname.startsWith('/api/')){
    const clientGameVersion=req.headers['x-magic-version'],clientProtocol=req.headers['x-magic-protocol'];
    const versions=[clientGameVersion],protocols=[clientProtocol],releases=[req.headers['x-magic-client-version']];
    // EventSource cannot set custom headers; its URL carries the compiled client version.
    if(url.pathname==='/api/events'){
     versions.push(...url.searchParams.getAll('clientVersion'));
     protocols.push(...url.searchParams.getAll('protocolVersion'));
     releases.push(...url.searchParams.getAll('releaseVersion'));
     if(clientGameVersion===undefined)versions.shift();if(clientProtocol===undefined)protocols.shift();
     if(req.headers['x-magic-client-version']===undefined)releases.shift();
    }
    if(!releases.length||releases.some(v=>v!==clientVersion)||!versions.length||versions.some(v=>v!==gameVersion)||!protocols.length||protocols.some(v=>v!==String(PROTOCOL_VERSION)))return json(res,409,{code:UPDATE_REQUIRED_CODE,error:'请更新客户端：退出游戏并从 GitHub 拉取最新版仓库后重新启动。',clientVersion:clientGameVersion||url.searchParams.get('clientVersion')||null,requiredVersion:gameVersion,requiredClientVersion:clientVersion,protocolVersion:PROTOCOL_VERSION});
    if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return json(res,403,{error:'请求来源不允许'});
    if(['/api/register','/api/login'].includes(url.pathname)&&req.method==='POST'){
     const key=req.socket.remoteAddress,now=Date.now(),entry=limits.get(key)||{count:0,until:now+60000};if(now>entry.until){entry.count=0;entry.until=now+60000;}if(++entry.count>30)return json(res,429,{error:'登录尝试过于频繁，请稍后重试'});limits.set(key,entry);
     const input=await body(req),a=await accounts[url.pathname.endsWith('register')?'register':'login'](input),token=accounts.issue(a);room.player(a);return json(res,200,{account:accounts.public(a)},{'Set-Cookie':`kc_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`});
    }
    const a=accounts.get(req);if(!a)return json(res,401,{error:'请先登录账号'});
    if(url.pathname==='/api/me')return json(res,200,{account:accounts.public(a),playerId:room.player(a).id});
    if(url.pathname==='/api/events'){const stream=createEventStream(req,res,{gzip:sseGzip});stream.write(': connected\n\n');room.connect(a,stream);return;}
    if(url.pathname==='/api/state')return json(res,200,{...room.snapshot(),playerId:room.player(a).id});
    if(url.pathname==='/api/contract-history'&&req.method==='GET'){
     const id=url.searchParams.get('playerId');if(!/^\d{1,10}$/.test(id||''))return json(res,400,{error:'请选择有效玩家'});
     const player=room.sim.players.find(p=>p.id===Number(id));if(!player)return json(res,404,{error:'该玩家已不在本局'});
     const before=url.searchParams.get('before');if(before!=null&&!/^(?:\d+|prior-\d+)$/.test(before))return json(res,400,{error:'契约记录游标无效'});
     return json(res,200,{matchId:room.matchId,player:{id:player.id,name:player.name,side:player.side,classId:player.classId,bot:player.bot,online:(room.online.get(player.accountId)||0)>0},...contractHistoryPage(room.sim,player,{before})});
    }
    if(url.pathname==='/api/action'&&req.method==='POST'){const result=room.command(a,await body(req));return json(res,result.ok?200:400,result);}
    if(url.pathname==='/api/logout'&&req.method==='POST'){accounts.logout(req);for(const c of [...room.clients])if(c.account.id===a.id)c.res.end();return json(res,200,{ok:true},{'Set-Cookie':'kc_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});}
    return json(res,404,{error:'接口不存在'});
   }
   return json(res,404,{error:'此服务器仅提供游戏接口，请使用本地客户端启动游戏'});
  }catch(error){if(req.url?.startsWith('/api/'))json(res,400,{error:error.message});else{res.writeHead(404);res.end('Not found');}}
 };
 return {handler,room,accounts,limits,defaults,metadata:{stateSchema:HOT_STATE_SCHEMA,accountSchema:HOT_ACCOUNT_SCHEMA,serverVersion:SERVER_VERSION,clientVersion,gameVersion,protocolVersion:PROTOCOL_VERSION,revision:RULESET_REVISION}};
}

// Increment when object layout or outstanding skill callbacks cannot be retained.
export const HOT_STATE_SCHEMA=3;
export const HOT_ACCOUNT_SCHEMA=1;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function applyOverrides(prior,current,next){
 if(same(prior,current))return structuredClone(next);
 if(Array.isArray(prior)&&Array.isArray(current)&&Array.isArray(next)){
  if(prior.length!==next.length||current.length!==next.length)throw Error('配置数组结构改变，请选择重开战局');
  return next.map((value,index)=>applyOverrides(prior[index],current[index],value));
 }
 if(prior&&current&&next&&typeof prior==='object'&&typeof current==='object'&&typeof next==='object'&&!Array.isArray(current)){
  const result=structuredClone(next);
  for(const key of Object.keys(current)){
   if(!(key in next)){if(!same(prior[key],current[key]))throw Error('新配置不支持现有覆盖项：'+key);continue;}
   result[key]=applyOverrides(prior[key],current[key],next[key]);
  }
  return result;
 }
 return structuredClone(current);
}
export function prepareGameRuntime(options,previous,{restartBattle=false}={}){
 if(SERVER_VERSION!==CLIENT_VERSION)throw Error('客户端与服务器发布版本必须一致');
 // Account/session objects are retained in both modes; changing their schema needs a cold restart.
 if(previous.metadata.accountSchema!==HOT_ACCOUNT_SCHEMA)throw Error('账号结构不兼容，需要常规部署');
 if(!restartBattle&&previous.metadata.stateSchema!==HOT_STATE_SCHEMA)throw Error('战局状态结构不兼容，请明确选择重开战局');
 if(!restartBattle&&(previous.metadata.gameVersion!==GAME_VERSION||previous.metadata.protocolVersion!==PROTOCOL_VERSION))throw Error('战斗或协议不兼容，请明确选择重开战局');
 if(!restartBattle&&isCurrentDesign(previous.room.sim.config)!==isCurrentDesign(defaults))throw Error('技能规则改变，请明确选择重开战局');
 const nextConfig=validateConfig(restartBattle?clone(defaults):applyOverrides(previous.defaults,previous.room.sim.config,defaults));
 const experienceMigration=restartBattle?[]:planExperienceMigration(previous.room.sim.players,previous.room.sim.config.world,nextConfig.world);
 const probe=new Room(nextConfig);probe.sim.tick(.05);JSON.stringify(probe.snapshot());
 const room=restartBattle?new Room(nextConfig):previous.room;
 const runtime=createGameRuntime({...options,gameVersion:GAME_VERSION,clientVersion:CLIENT_VERSION,room,accounts:previous.accounts,limits:previous.limits});
 runtime.metadata.stateSchema=HOT_STATE_SCHEMA;
 const saved={roomPrototype:Object.getPrototypeOf(room),simPrototype:Object.getPrototypeOf(room.sim),accountsPrototype:Object.getPrototypeOf(previous.accounts),config:room.config,simConfig:room.sim.config,configVersion:room.configVersion,last:room.last,npcPolicy:room.sim.npcPolicy};
 return {runtime,commit(){
  Object.setPrototypeOf(previous.accounts,Accounts.prototype);
  Object.setPrototypeOf(room,Room.prototype);Object.setPrototypeOf(room.sim,Simulation.prototype);
  room.config=clone(nextConfig);room.sim.config=clone(nextConfig);room.sim.npcPolicy??={...DEFAULT_NPC_POLICY};room.configVersion++;room.last=performance.now();
  for(const change of experienceMigration)change.progress.xp=change.after;
 },rollback(){
  Object.setPrototypeOf(previous.accounts,saved.accountsPrototype);
  Object.setPrototypeOf(room,saved.roomPrototype);Object.setPrototypeOf(room.sim,saved.simPrototype);
  room.config=saved.config;room.sim.config=saved.simConfig;room.sim.npcPolicy=saved.npcPolicy;room.configVersion=saved.configVersion;room.last=saved.last;
  for(const change of experienceMigration)change.progress.xp=change.before;
 }};
}

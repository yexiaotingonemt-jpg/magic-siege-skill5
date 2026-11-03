import {applySnapshotDelta} from '../../shared/snapshot-delta.js';
import {prepareRender} from './render-interpolation.js';
import {Simulation} from '../../shared/simulation.js';
import {CLIENT_VERSION,GAME_VERSION,PROTOCOL_VERSION,UPDATE_REQUIRED_CODE} from '../../shared/protocol.js';
export const isUpdateRequired=error=>error?.code===UPDATE_REQUIRED_CODE;
export async function request(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:{'X-Magic-Client-Version':CLIENT_VERSION,'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error||data.message||'连接失败'),data,{status:r.status});return data;}
export async function checkServerVersion(){
 const data=await request('/api/version');
 const incompatible=data.gameVersion!==GAME_VERSION||data.protocolVersion!==PROTOCOL_VERSION;
 if(incompatible||data.clientVersion!==CLIENT_VERSION)throw Object.assign(Error('客户端版本与服务器不一致，请退出游戏并拉取最新版仓库。'),{code:UPDATE_REQUIRED_CODE,clientVersion:GAME_VERSION,requiredVersion:data.gameVersion||'未知',currentClientVersion:CLIENT_VERSION,requiredClientVersion:data.clientVersion});
 return data;
}
export function connectRoom({onState,onStatus,onIdentity,onUpdateRequired,onSnapshot}){
 const sim=new Simulation();let identity=null,previewClass=null,reserved=null,connected=false,closed=false,lastStateAt=0,renderDuration=250;
 const stopForUpdate=error=>{if(closed)return;dispose();setTimeout(()=>onUpdateRequired?.(error),0);};
 const send=async(type,args={})=>{if(closed)return false;if(!connected){sim.notice='连接中断，正在重连';onState(sim);return false;}try{const result=await request('/api/action',{id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,type,args});if(closed)return false;if(!result.ok){sim.notice=result.message||'操作未生效';onState(sim);}return result.ok;}catch(e){if(isUpdateRequired(e)){stopForUpdate(e);return false;}if(!closed){sim.notice=e.message;onState(sim);}return false;}};
 const apply=data=>{const changed=sim.matchId&&sim.matchId!==data.matchId;if(!changed&&data.sequence<sim.sequence)return;if(changed){previewClass=null;reserved=null;sim.units=[];sim.projectiles=[];sim.notice='';}const oldClass=sim.player?.classId,notice=sim.notice,now=performance.now(),interval=lastStateAt?Math.max(200,Math.min(300,now-lastStateAt)):250,previousUnits=new Map(sim.units.map(u=>[u.id,u])),previousProjectiles=new Map(sim.projectiles.map(b=>[b.id,b]));renderDuration=changed?250:renderDuration*.9+interval*.1;lastStateAt=now;if(!Object.hasOwn(sim,'serverClockInstalled')){const initialTime=sim.time,initialAt=now;Object.defineProperties(sim,{serverClockInstalled:{value:true},_serverTime:{value:initialTime,writable:true},_serverTimeAt:{value:initialAt,writable:true},time:{enumerable:true,configurable:true,get(){return this._serverTime+(this.paused?0:Math.min(.3,(performance.now()-this._serverTimeAt)/1000)*this.speed);},set(value){this._serverTime=value;this._serverTimeAt=performance.now();}}});}Object.assign(sim,data);const animate=(entity,prior,projectile=false)=>prepareRender(entity,prior,now,{time:data.time,speed:data.speed,paused:data.paused,duration:renderDuration,maxSpeed:projectile?sim.config.world.projectileSpeed:entity.speed});for(const u of sim.units)animate(u,previousUnits.get(u.id));for(const b of sim.projectiles)animate(b,previousProjectiles.get(b.id),true);const unitsById=new Map(sim.units.map(u=>[u.id,u]));for(const b of sim.projectiles)b.source=unitsById.get(b.source?.id)||b.source;for(const f of sim.fields)f.owner=unitsById.get(f.owner?.id)||f.owner;sim.localPlayerId=identity.playerId;const p=sim.player;if(!p)return;if(!sim.hero()&&previewClass!=null)p.classId=previewClass;else previewClass=null;p.reservedUnitId=reserved;sim.notice=notice;
  for(const player of sim.players)for(const key of ['level','xp','points'])Object.defineProperty(player,key,{enumerable:true,configurable:true,get(){return this.progress[this.classId][key];},set(v){this.progress[this.classId][key]=v;}});
  if(oldClass!==p.classId)sim.notice='';onState(sim);
 };
 let events,snapshotBase=null,lastPacket=Date.now(),lastAttempt=0,opening=false;
 const open=async()=>{
  if(closed||opening)return;opening=true;lastAttempt=Date.now();events?.close();connected=false;
  try{
   await checkServerVersion();if(closed)return;
   snapshotBase=null;
   const stream=new EventSource(`/api/events?delta=1&releaseVersion=${encodeURIComponent(CLIENT_VERSION)}&clientVersion=${encodeURIComponent(GAME_VERSION)}&protocolVersion=${PROTOCOL_VERSION}`);events=stream;
   const active=()=>!closed&&events===stream;
   stream.addEventListener('identity',e=>{if(active()){identity=JSON.parse(e.data);onIdentity(identity);}});
   stream.addEventListener('heartbeat',()=>{if(active())lastPacket=Date.now();});
   stream.onopen=()=>{if(active()){connected=true;lastPacket=Date.now();onStatus('已同步');}};
   stream.onmessage=e=>{
    if(!active())return;lastPacket=Date.now();if(!identity)return;
    const started=onSnapshot?performance.now():0;
    try{snapshotBase=applySnapshotDelta(snapshotBase,JSON.parse(e.data));}
    catch(error){connected=false;onStatus('同步状态已过期，正在重新连接…');open();return;}
    // 插值与预选职业只修改显示副本，不能污染下一条差量消息的还原基准。
    const state=structuredClone({...snapshotBase,config:undefined});
    if(snapshotBase.config)state.config=snapshotBase.config;
    apply(state);if(onSnapshot)onSnapshot(started,performance.now()-started);
   };
   stream.onerror=()=>{if(!active())return;connected=false;onStatus('连接中断，正在重连…');checkServerVersion().catch(error=>{if(isUpdateRequired(error))stopForUpdate(error);});};
  }catch(error){if(isUpdateRequired(error))stopForUpdate(error);else if(!closed)onStatus('连接中断，正在重连…');}finally{opening=false;}
 };
 const offline=()=>{connected=false;events?.close();onStatus('连接中断，正在重连…');};
 const online=()=>{if(!closed)open();};window.addEventListener('offline',offline);window.addEventListener('online',online);
 const watchdog=setInterval(()=>{if(closed)return;if(connected&&Date.now()-lastPacket>4000){connected=false;onStatus('连接中断，正在重连…');if(navigator.onLine)open();}else if(!connected&&navigator.onLine&&Date.now()-lastAttempt>=3000)open();},1000);
 let checkingPermissions=false;
 const permissionTimer=setInterval(async()=>{
  if(closed||!connected||checkingPermissions||!identity)return;
  checkingPermissions=true;
  try{const current=await request('/api/me');if(!closed&&current.account.id===identity.account.id&&(current.account.isSuperAdmin!==identity.account.isSuperAdmin||current.account.isHost!==identity.account.isHost)){identity={...identity,...current};onIdentity(identity);}}
  catch(error){if(isUpdateRequired(error))stopForUpdate(error);}
  finally{checkingPermissions=false;}
 },10000);
 const dispose=()=>{closed=true;connected=false;clearInterval(permissionTimer);clearInterval(watchdog);window.removeEventListener('offline',offline);window.removeEventListener('online',online);events?.close();};
 open();
 sim.setClass=id=>{if(sim.hero())return false;previewClass=id;sim.player.classId=id;return true;};
 sim.contract=async(_p,unitId)=>{const ok=await send('contract',{unitId,classId:previewClass??sim.player.classId});if(ok&&!closed){previewClass=null;sim.notice='';try{const data=await request('/api/state');if(!closed)apply(data);}catch(error){if(isUpdateRequired(error))stopForUpdate(error);else throw error;}}return ok;};
 sim.setManualTarget=unitId=>send('target',{unitId});
 sim.cast=skill=>send('cast',{skill});sim.upgrade=skill=>send('upgrade',{skill});sim.respec=()=>send('respec');
 return {sim,send,reserve(id){reserved=id;},get connected(){return connected;},close:dispose,get identity(){return identity;}};
}

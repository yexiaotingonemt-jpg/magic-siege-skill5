import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGameRuntime} from './game-runtime.mjs';
import {createHotUpdater,listenHotControl} from './hot-update.mjs';
import {readFileSync} from 'node:fs';
import {Room} from './room.mjs';
import {defaults,validateConfig} from '../shared/config.js';
import {createCurrentDesignConfig} from '../shared/current-design.js';

const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createGameServer(options={}){
 let runtime=createGameRuntime(options),blocked=false,inflight=0;
 const server=http.createServer(async(req,res)=>{
  if(blocked){res.writeHead(503,{'Retry-After':'1','Content-Type':'application/json'});res.end(JSON.stringify({error:'正在切换服务版本，请稍后重试'}));return;}
  inflight++;try{await runtime.handler(req,res);}finally{inflight--;}
 });
 const timer=setInterval(()=>{if(!blocked)runtime.room.step();},25);timer.unref();
 server.on('close',()=>clearInterval(timer));
 const hotUpdate=createHotUpdater({...options,runtimeRoot:options.runtimeRoot||base,runtimeOptions:options,
  getRuntime:()=>runtime,setRuntime:next=>{runtime=next;},
  async quiesce(){blocked=true;const until=Date.now()+10000;while(inflight){if(Date.now()>until)throw Error('等待正在执行的请求超时');await new Promise(resolve=>setTimeout(resolve,10));}},
  resume(){runtime.room.last=performance.now();blocked=false;}
 });
 return {server,get room(){return runtime.room;},get accounts(){return runtime.accounts;},hotUpdate};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const appRoot=process.env.MAGIC_SIEGE_ROOT||path.resolve(base,'../..');
 const designFile=process.argv.find(arg=>arg.startsWith('--design-config='))?.slice('--design-config='.length);
 let room;
 if(designFile){const data=JSON.parse(readFileSync(designFile,'utf8'));room=new Room(validateConfig(data.world?data:createCurrentDesignConfig(defaults,data)));}
 else if(process.argv.includes('--design=current'))room=new Room(createCurrentDesignConfig(defaults));
 if(room?.config.design){
  process.env.KC_DATA_DIR??='E:/Codex/Support/魔法王座/scratch/current-design-preview/data';
  process.env.PORT??='5185';
 }
 const game=createGameServer({appRoot,...(room?{room}:{})});
 const socket=process.env.MAGIC_HOT_UPDATE_SOCKET;
 try{
  const control=socket?await listenHotControl(socket,game.hotUpdate):null;
  game.server.on('close',()=>control?.close());
  game.server.listen(Number(process.env.PORT||5183),process.env.HOST||'0.0.0.0',()=>console.log('Magic Siege listening; hot updates '+(control?'enabled':'disabled')));
  game.server.on('error',error=>{console.error(error.message);control?.close();process.exitCode=1;});
 }catch(error){console.error(error.message);game.server.close();process.exitCode=1;}
}

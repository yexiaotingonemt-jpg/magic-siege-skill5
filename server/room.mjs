import {Simulation} from '../shared/simulation.js';
import {defaults,clone,availableClasses,contractClasses,validateConfig} from '../shared/config.js';
const snapshotReplacer=(key,value)=>['settledReport','contributors','support','attackerMemory','stats','deathDone'].includes(key)?undefined:value;
const actorSnapshot=u=>u?{id:u.id,side:u.side,classId:u.classId,type:u.type,tower:u.tower,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp}:undefined;
export class Room{
 constructor(config=defaults){this.config=clone(config);this.sim=new Simulation(this.config);this.sim.player.retired=true;this.sim.player.name='战场';this.players=new Map();this.clients=new Set();this.sequence=0;this.configVersion=0;this.matchId=crypto.randomUUID();this.paused=false;this.speed=1;this.stageEnd=this.config.world.stageDuration;this.stageNumber=1;this.stageResetAt=0;this.stageWins=[0,0];this.stageReports=[];this.commandHistory=new Map();this.last=performance.now();this.acc=0;this.broadcastAt=0;this.online=new Map();}
 player(account){let p=this.players.get(account.id);if(!p){p=this.sim.makePlayer(account.side,false);p.name=account.name;p.classId=availableClasses(account.side,this.config)[0];p.accountId=account.id;this.players.set(account.id,p);}p.retired=false;return p;}
 step(){const now=performance.now(),delta=Math.min(1,(now-this.last)/1000);this.last=now;if(this.clients.size&&!this.paused){this.acc+=delta*this.speed;while(this.acc>=.05){this.sim.tick(.05);this.acc-=.05;this.sequence++;this.checkStage();}}if(this.clients.size&&this.paused&&now-this.broadcastAt>=2000){this.heartbeat();this.broadcastAt=now;}else if(!this.paused&&this.clients.size&&now-this.broadcastAt>=200){this.broadcast();this.broadcastAt=now;}}
 checkStage(){const broken=this.sim.metrics.resets>this.stageResetAt||this.sim.layer>=this.config.world.stageRequiredLayers;if(!broken&&this.sim.time<this.stageEnd)return;const winner=broken?0:1;this.stageWins[winner]++;for(const p of this.players.values())if(p.side===winner)p.score+=this.config.world.stageContribution;this.stageReports.unshift({stage:this.stageNumber,winner,time:this.sim.time,reward:this.config.world.stageContribution});this.stageReports.length=Math.min(30,this.stageReports.length);this.stageNumber++;this.stageEnd=this.sim.time+this.config.world.stageDuration;this.sim.resetMap();this.stageResetAt=this.sim.metrics.resets;}
 snapshot(includeConfig=true){const s=this.sim;const metrics={...s.metrics};delete metrics.lifetimes;const snapshot={matchId:this.matchId,sequence:this.sequence,paused:this.paused,speed:this.speed,stage:{number:this.stageNumber,end:this.stageEnd,wins:this.stageWins,reports:this.stageReports},time:s.time,seed:s.seed,nextId:s.nextId,units:s.units.map(u=>u.shieldSource?{...u,shieldSource:actorSnapshot(u.shieldSource)}:u),towers:s.towers.map(u=>u.shieldSource?{...u,shieldSource:actorSnapshot(u.shieldSource)}:u),projectiles:s.projectiles.map(b=>({...b,source:actorSnapshot(b.source)})),fields:s.fields.map(f=>({...f,owner:actorSnapshot(f.owner)})),effects:s.effects,animations:s.animations,visualId:s.visualId,players:s.players.map(p=>({...p,online:(this.online.get(p.accountId)||0)>0})),metrics,logs:s.logs,reports:s.reports.slice(0,15),layer:s.layer,waveAt:s.waveAt,configVersion:this.configVersion};if(includeConfig)snapshot.config=s.config;return snapshot;}
 broadcast(){if(!this.clients.size)return;let fullText,compactText;for(const client of this.clients){if(client.res.destroyed||client.res.writableNeedDrain)continue;const needsConfig=client.configVersion!==this.configVersion;let text;if(needsConfig){fullText??=JSON.stringify(this.snapshot(true),snapshotReplacer);text=fullText;client.configVersion=this.configVersion;}else{compactText??=JSON.stringify(this.snapshot(false),snapshotReplacer);text=compactText;}client.res.write('data: '+text+'\n\n');}}
 heartbeat(){for(const client of this.clients)if(!client.res.destroyed&&!client.res.writableNeedDrain)client.res.write('event: heartbeat\ndata: {}\n\n');}
 connect(account,res){const p=this.player(account),client={account,res,configVersion:-1};this.clients.add(client);this.online.set(account.id,(this.online.get(account.id)||0)+1);res.write('event: identity\ndata: '+JSON.stringify({account:{id:account.id,name:account.name,side:account.side,isHost:account.isHost},playerId:p.id})+'\n\n');this.broadcast();res.on('close',()=>{this.clients.delete(client);const count=Math.max(0,(this.online.get(account.id)||1)-1);this.online.set(account.id,count);if(!count)p.auto=false;});return client;}
 command(account,{type,args={},id}){
  const p=this.player(account),s=this.sim,key=account.id+':'+id;if(id&&this.commandHistory.has(key))return this.commandHistory.get(key);let ok=false,message='';s.localPlayerId=p.id;s.notice='';
  try{
   if(type==='contract'){const u=s.get(args.unitId);if(!u||!contractClasses(u,s.config).includes(args.classId)||u.side!==account.side)throw Error('此单位不可契约为所选职业');if(!s.setClass(args.classId,p))throw Error('已有存活英雄，或职业不属于本阵营');ok=s.contract(p,u.id);}
   else if(type==='cast')ok=s.cast(args.skill,p);
   else if(type==='target')ok=s.setManualTarget(args.unitId,p);
   else if(type==='upgrade')ok=s.upgrade(args.skill,p);
   else if(type==='respec'){s.respec(p);ok=true;}
   else if(type==='auto'){p.auto=!!args.enabled;ok=true;}
   else if(type==='stamina'){p.stamina+=100;ok=true;}
   else if(type==='reserve'){const u=s.get(args.unitId);p.reservedUnitId=u&&!u.hero&&u.side===p.side?u.id:null;ok=true;}
   else if(['bots','pause','speed','refill','level','restart','config'].includes(type)){
    if(!account.isHost)throw Error('仅房主可以调整体验参数');
    if(type==='bots'){for(const key of ['attackBots','defenseBots'])if(!Number.isInteger(args[key])||args[key]<0||args[key]>50)throw Error('双方机器人数量需为0～50的整数');if(args.attackBots+args.defenseBots>99)throw Error('机器人总数最多99');Object.assign(s.config.world,{attackBots:args.attackBots,defenseBots:args.defenseBots,botMode:args.attackBots+args.defenseBots?5:4});this.config=clone(s.config);s.syncBots();this.configVersion++;}
    if(type==='config'){const next=validateConfig(clone(args.config));if(next.world.stageDuration<60||next.world.stageRequiredLayers<1||next.world.stageRequiredLayers>3)throw Error('阶段至少60秒，目标防线为1～3排');s.config=next;this.config=clone(next);s.syncBots();this.configVersion++;}
    if(type==='pause')this.paused=!!args.paused;
    if(type==='speed'){if(![1,2,4].includes(args.speed))throw Error('无效倍速');this.speed=args.speed;}
    if(type==='refill')p.stamina=100;
    if(type==='level')s.addXp(p,s.expNeeded(p)-p.xp);
    if(type==='restart'){s.resetMap();this.stageResetAt=s.metrics.resets;this.stageEnd=s.time+s.config.world.stageDuration;}
    ok=true;
   }else throw Error('未知操作');message=ok?'':s.notice||'当前条件不允许此操作';
  }catch(error){message=error.message;}finally{s.localPlayerId=0;}
  const result={ok,message,sequence:++this.sequence};if(id){this.commandHistory.set(key,result);if(this.commandHistory.size>2000)this.commandHistory.delete(this.commandHistory.keys().next().value);}this.broadcast();return result;
 }
}


import {Simulation} from '../shared/simulation.js';
import {defaults,liveConfig,clone,availableClasses,contractClasses,validateConfig} from '../shared/config.js';
import {DEFAULT_NPC_POLICY,validateNpcPolicy,npcBalanceStatus,balanceNpcHeroes} from '../shared/npc-balance.js';
import {isCurrentDesign,createCurrentDesignConfig} from '../shared/current-design.js';
import {clientSnapshot} from './client-snapshot.mjs';
import {createSnapshotDelta} from '../shared/snapshot-delta.js';
const actorSnapshot=u=>u?{id:u.id,side:u.side,classId:u.classId,type:u.type,tower:u.tower,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp}:undefined;
export class Room{
 constructor(config=liveConfig(),npcPolicy=DEFAULT_NPC_POLICY){this.config=clone(config);this.sim=new Simulation(this.config);this.sim.player.retired=true;this.sim.player.name='战场';this.players=new Map();this.clients=new Set();this.sequence=0;this.configVersion=0;this.matchId=crypto.randomUUID();this.paused=false;this.speed=1;this.stageEnd=this.config.world.stageDuration;this.stageNumber=1;this.stageResetAt=0;this.stageWins=[0,0];this.stageReports=[];this.commandHistory=new Map();this.last=performance.now();this.acc=0;this.broadcastAt=0;this.online=new Map();this.sim.npcPolicy=validateNpcPolicy(npcPolicy);balanceNpcHeroes(this.sim);}
 player(account){let p=this.players.get(account.id);if(!p){p=this.sim.makePlayer(account.side,false);p.name=account.name;p.classId=availableClasses(account.side,this.config)[0];p.accountId=account.id;this.players.set(account.id,p);}p.retired=false;return p;}
 step(){const now=performance.now(),delta=Math.min(1,(now-this.last)/1000);this.last=now;if(this.clients.size&&!this.paused){this.acc+=delta*this.speed;while(this.acc>=.05){this.sim.tick(.05);this.acc-=.05;this.sequence++;this.checkStage();}}if(this.clients.size&&this.paused&&now-this.broadcastAt>=2000){this.heartbeat();this.broadcastAt=now;}else if(!this.paused&&this.clients.size&&now-this.broadcastAt>=200){this.broadcast();this.broadcastAt=now;}}
 checkStage(){const broken=this.sim.metrics.resets>this.stageResetAt||this.sim.layer>=this.config.world.stageRequiredLayers;if(!broken&&this.sim.time<this.stageEnd)return;const winner=broken?0:1;this.stageWins[winner]++;this.stageReports.unshift({stage:this.stageNumber,winner,time:this.sim.time,reward:0});this.stageReports.length=Math.min(30,this.stageReports.length);this.stageNumber++;this.stageEnd=this.sim.time+this.config.world.stageDuration;this.sim.resetMap();this.stageResetAt=this.sim.metrics.resets;}
 snapshot(includeConfig=true){const s=this.sim;const metrics={...s.metrics};delete metrics.lifetimes;const snapshot={matchId:this.matchId,sequence:this.sequence,paused:this.paused,speed:this.speed,stage:{number:this.stageNumber,end:this.stageEnd,wins:this.stageWins,reports:this.stageReports},time:s.time,seed:s.seed,nextId:s.nextId,units:s.units.map(u=>u.shieldSource?{...u,shieldSource:actorSnapshot(u.shieldSource)}:u),towers:s.towers.map(u=>u.shieldSource?{...u,shieldSource:actorSnapshot(u.shieldSource)}:u),projectiles:s.projectiles.map(b=>({...b,source:actorSnapshot(b.source)})),fields:s.fields.map(f=>({...f,owner:actorSnapshot(f.owner)})),effects:s.effects,animations:s.animations,visualId:s.visualId,players:s.players.map(p=>({...p,...s.contribution(p),online:(this.online.get(p.accountId)||0)>0})),metrics,battleEvents:s.battleEvents,logs:s.logs,reports:s.reports.slice(0,15),layer:s.layer,waveAt:s.waveAt,configVersion:this.configVersion,npcBalance:npcBalanceStatus(s)};if(includeConfig)snapshot.config=s.config;return clientSnapshot(snapshot,s.time);}
 broadcast(only=null){
  if(!this.clients.size)return;
  let full,compact,fullText,compactText;
  for(const client of only?[only]:this.clients){
   if(!this.clients.has(client)||client.res.destroyed)continue;
   if(client.res.writableNeedDrain){client.pendingSnapshot=true;continue;}
   client.pendingSnapshot=false;
   const needsConfig=client.configVersion!==this.configVersion;
   compact??=this.snapshot(false);
   let text;
   if(needsConfig){full??=this.snapshot(true);fullText??=JSON.stringify(full);text=fullText;}
   else if(client.delta&&client.lastSnapshot?.matchId===compact.matchId)text=JSON.stringify(createSnapshotDelta(client.lastSnapshot,compact));
   else{compactText??=JSON.stringify(compact);text=compactText;}
   client.res.write('data: '+text+'\n\n');
   client.configVersion=this.configVersion;
   if(client.delta)client.lastSnapshot=compact;
  }
 }
 heartbeat(){for(const client of this.clients)if(!client.res.destroyed&&!client.res.writableNeedDrain)client.res.write('event: heartbeat\ndata: {}\n\n');}
 connect(account,res,{delta=false}={}){const p=this.player(account),client={account,res,configVersion:-1,delta};this.clients.add(client);res.on('drain',()=>{if(client.pendingSnapshot&&!res.destroyed)this.broadcast(client);});this.online.set(account.id,(this.online.get(account.id)||0)+1);res.write('event: identity\ndata: '+JSON.stringify({account:{id:account.id,name:account.name,side:account.side,isHost:account.isHost,isSuperAdmin:account.isSuperAdmin===true},playerId:p.id})+'\n\n');this.broadcast();res.on('close',()=>{this.clients.delete(client);const count=Math.max(0,(this.online.get(account.id)||1)-1);this.online.set(account.id,count);if(!count){const current=this.players.get(account.id);if(current)current.auto=false;}});return client;}
 restartMatch(){
  const fresh=new Room(this.config,this.sim.npcPolicy);
  for(const p of this.players.values())fresh.player({id:p.accountId,name:p.name,side:p.side});
  const retained={clients:this.clients,online:this.online,sequence:this.sequence,commandHistory:this.commandHistory,configVersion:this.configVersion+1};
  Object.assign(this,fresh,retained);
  for(const client of this.clients){const a=client.account;client.configVersion=-1;client.res.write('event: identity\ndata: '+JSON.stringify({account:{id:a.id,name:a.name,side:a.side,isHost:a.isHost,isSuperAdmin:a.isSuperAdmin===true},playerId:this.player(a).id})+'\n\n');}
 }
 command(account,{type,args={},id}){
  const p=this.player(account),s=this.sim,key=account.id+':'+id;if(id&&this.commandHistory.has(key))return this.commandHistory.get(key);let ok=false,message='';s.localPlayerId=p.id;s.notice='';
  try{
   if(type==='restartMatch'){if(account.isSuperAdmin!==true)throw Error('仅超级账号可以重开本局');this.restartMatch();ok=true;message='本局已重开';}
   else if(type==='clearRanking'){
    if(account.isSuperAdmin!==true)throw Error('仅超级账号可以清除排行榜');
    // 贡献按事件增量记账，清零累计值即可从此刻重新统计，无需改动英雄战斗状态。
    for(const player of s.players){player.totalPoints=0;player.staminaSpent=0;player.score=0;}
    ok=true;message='排行榜已清除，积分与KDA从现在重新累计';
   }
   else if(type==='npcPolicy'){if(account.isSuperAdmin!==true)throw Error('仅超级账号可以设置NPC比例');s.npcPolicy=validateNpcPolicy(args);s.npcLastCheck=null;ok=true;message=s.npcPolicy.mode==='off'?'下次出兵停止补充NPC，现有NPC继续战斗':'NPC比例已保存，下次出兵检查补足';}
   else if(type==='contract'){const u=s.get(args.unitId);if(!u||!contractClasses(u,s.config).includes(args.classId)||u.side!==account.side)throw Error('此单位不可契约为所选职业');if(!s.setClass(args.classId,p))throw Error('已有存活英雄，或职业不属于本阵营');ok=s.contract(p,u.id);}
   else if(type==='cast')ok=s.cast(args.skill,p);
   else if(type==='target')ok=s.setManualTarget(args.unitId,p);
   else if(type==='chooseTrait')ok=s.chooseTrait(args.traitId,args.level,p,args.classId??p.classId);
   else if(type==='upgrade')throw Error('技能自动解锁，请通过升级选择词条');
   else if(type==='respec')ok=s.respec(p);
   else if(type==='auto'){p.auto=!!args.enabled;ok=true;}
   else if(type==='stamina'){p.stamina+=100;ok=true;}
   else if(type==='reserve'){const u=s.get(args.unitId);p.reservedUnitId=u&&!u.hero&&u.side===p.side?u.id:null;ok=true;}
   else if(['bots','pause','speed','refill','level','restart','config'].includes(type)){
    if(!account.isHost&&account.isSuperAdmin!==true)throw Error('仅房主或超级账号可以调整体验参数');
    if(type==='bots')throw Error('固定机器人人数已停用，请由超级账号设置NPC比例');
    if(type==='config'){const submitted=clone(args.config);if(isCurrentDesign(submitted)!==isCurrentDesign(s.config))throw Error('切换技能规则需要通过对应启动入口新建战局');const next=validateConfig(isCurrentDesign(submitted)?createCurrentDesignConfig(submitted,submitted.design):submitted);if(next.world.stageDuration<60||next.world.stageRequiredLayers<1||next.world.stageRequiredLayers>3)throw Error('阶段至少60秒，目标防线为1～3排');s.config=next;this.config=clone(next);s.syncBots();this.configVersion++;}
    if(type==='pause')this.paused=!!args.paused;
    if(type==='speed'){if(![1,2,4].includes(args.speed))throw Error('无效倍速');this.speed=args.speed;}
    if(type==='refill')p.stamina=100;
    if(type==='level')s.addXp(p,s.expNeeded(p)-p.xp);
    if(type==='restart'){s.resetMap();this.stageResetAt=s.metrics.resets;this.stageEnd=s.time+s.config.world.stageDuration;}
    ok=true;
   }else throw Error('未知操作');if(!message)message=ok?'':s.notice||'当前条件不允许此操作';
  }catch(error){message=error.message;}finally{s.localPlayerId=0;}
  const result={ok,message,sequence:++this.sequence};if(id){this.commandHistory.set(key,result);if(this.commandHistory.size>2000)this.commandHistory.delete(this.commandHistory.keys().next().value);}this.broadcast();return result;
 }
}


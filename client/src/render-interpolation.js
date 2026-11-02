// 只产生显示坐标与显示时钟；不推进Simulation、不修改服务器坐标或技能判定。
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const MAX_RENDER_PREDICTION_MS=350;
export function renderedPosition(u,at=performance.now()){
 if(!Number.isFinite(u?._renderFromX))return {x:u.x,y:u.y,vx:0,vy:0};
 const duration=Math.max(1,u._renderDuration||200),elapsed=Math.max(0,at-u._renderStarted),t=clamp(elapsed/duration,0,1);
 if(!u._renderSmooth)return {x:u._renderFromX+(u._renderToX-u._renderFromX)*t,y:u._renderFromY+(u._renderToY-u._renderFromY)*t,vx:(u._renderToX-u._renderFromX)/duration,vy:(u._renderToY-u._renderFromY)/duration};
 const sample=axis=>{
  const from=u['_renderFrom'+axis],to=u['_renderTo'+axis],v0=u['_renderFromV'+axis]||0,v1=u['_renderV'+axis]||0;
  if(elapsed>=duration){const extra=Math.min(elapsed-duration,u._renderPredictionMs||0);return [to+v1*extra,extra<(u._renderPredictionMs||0)?v1:0];}
  const t2=t*t,t3=t2*t;
  return [(2*t3-3*t2+1)*from+(t3-2*t2+t)*duration*v0+(-2*t3+3*t2)*to+(t3-t2)*duration*v1,
   (6*t2-6*t)*from/duration+(3*t2-4*t+1)*v0+(-6*t2+6*t)*to/duration+(3*t2-2*t)*v1];
 };
 const [x,vx]=sample('X'),[y,vy]=sample('Y');return {x,y,vx,vy};
}
export function prepareRender(entity,previous,at,{time,speed=1,paused=false,duration=250,maxSpeed=entity.speed||0}={}){
 const delta=time-(previous?._renderStamp??time),distance=previous?Math.hypot(entity.x-previous.x,entity.y-previous.y):0;
 const teleport=previous&&distance>Math.max(3,maxSpeed*Math.max(.05,delta)*2.5);
 const snap=paused||!previous||teleport,prior=snap?{x:entity.x,y:entity.y,vx:0,vy:0}:renderedPosition(previous,at);
 const blocked=paused||entity.stunUntil>time||entity.castUntil>time||entity.channelUntil>time||entity.dash||(entity.lastAttackAt!=null&&time-entity.lastAttackAt<.2);
 let vx=0,vy=0;
 if(!snap&&!blocked&&delta>0&&delta<2){vx=(entity.x-previous.x)/delta*speed/1000;vy=(entity.y-previous.y)/delta*speed/1000;}
 const velocity=Math.hypot(vx,vy),limit=maxSpeed*speed*.0015;
 if(velocity>limit&&velocity>0){vx*=limit/velocity;vy*=limit/velocity;}
 Object.assign(entity,{_renderFromX:prior.x,_renderFromY:prior.y,_renderToX:entity.x,_renderToY:entity.y,_renderFromVX:prior.vx,_renderFromVY:prior.vy,_renderVX:vx,_renderVY:vy,_renderStarted:at,_renderDuration:snap?1:duration,_renderStamp:time,_renderSmooth:!snap,_renderPredictionMs:blocked||snap?0:MAX_RENDER_PREDICTION_MS});
}
export function createVisualClock(){
 let current=null,lastAt=null,match,lastSpeed,lastPaused;
 return {frame(sim,at){
  if(!Number.isFinite(sim._serverTime))return sim.time;
  const server=sim._serverTime,speed=sim.speed||1,reset=current===null||match!==sim.matchId||lastSpeed!==speed||lastPaused!==sim.paused||at-lastAt>1000;
  match=sim.matchId;lastSpeed=speed;lastPaused=sim.paused;
  if(reset||sim.paused){current=server;lastAt=at;return current;}
  const dt=Math.max(0,(at-lastAt)/1000);lastAt=at;
  const target=server+clamp((at-sim._serverTimeAt)/1000,0,.65)*speed,rate=clamp(1+(target-current)/.5,.9,1.2);
  current=Math.max(current,Math.min(server+.65*speed,current+dt*speed*rate));return current;
 }};
}
const views=new WeakMap();
export function renderState(sim,at=performance.now()){
 let entry=views.get(sim);
 if(!entry){const view=Object.create(sim);Object.defineProperty(view,'time',{value:sim.time,writable:true});entry={view,clock:createVisualClock()};views.set(sim,entry);}
 entry.view.time=entry.clock.frame(sim,at);return entry.view;
}

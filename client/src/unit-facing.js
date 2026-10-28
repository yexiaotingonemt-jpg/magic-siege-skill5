// Presentation-only eight-way facing. Never writes to authoritative units.
export const DIRECTIONS=['S','SE','E','NE','N','NW','W','SW'];
const STEP=Math.PI/4,TAU=Math.PI*2;
const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function directionForVector(dx,dy,previous=0,hysteresis=false){
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<1e-5)return previous;
  const angle=(Math.atan2(dx,dy)+TAU)%TAU;
  if(hysteresis&&Math.abs(angleDifference(angle,previous*STEP))<=STEP/2+Math.PI/30)return previous;
  return Math.round(angle/STEP)%8;
}
export function worldDirection(from,to,viewerSide,previous=0){
  return directionForVector(to.x-from.x,(to.y-from.y)*(viewerSide?1:-1),previous);
}
export function createUnitFacing(){
  const tracks=new Map();let match,side,lastTime=-Infinity;
  return {
    begin(sim){
      if(match!==sim.matchId||side!==sim.player.side||sim.time<lastTime-.5)tracks.clear();
      match=sim.matchId;side=sim.player.side;lastTime=sim.time;
    },
    pose(sim,u,motion,point){
      const initial=worldDirection(u,{x:u.x,y:u.y+(u.side?-1:1)},side);
      const old=tracks.get(u.id)||{heading:initial,x:point.x,y:point.y};
      let heading=old.heading,lock=null;
      const animation=u.skillAnimation;
      const casting=animation&&sim.time>=animation.start&&(sim.time<animation.end||u.channelUntil>sim.time||u.dash);
      if(casting){
        lock='cast:'+animation.start;
        heading=lock===old.lock?old.heading:worldDirection(animation.from||u,animation.to||u,side,old.heading);
      }else if(['attack','recover'].includes(motion.action)&&u.attackTo&&u.lastAttackAt!=null){
        lock='attack:'+u.lastAttackAt;
        heading=lock===old.lock?old.heading:worldDirection(u,u.attackTo,side,old.heading);
      }else if(motion.action==='prepare'){
        const target=sim.get(u.targetId);
        if(target)heading=worldDirection(u,target,side,old.heading);
      }else if(motion.action==='move'||motion.action==='dash'){
        const dx=point.x-old.x,dy=point.y-old.y;
        heading=directionForVector(dx,dy,old.heading,true);
        if(Math.hypot(dx,dy)<1e-5&&Number.isFinite(u._renderFromX))
          heading=worldDirection({x:u._renderFromX,y:u._renderFromY},u,side,old.heading);
      }
      tracks.set(u.id,{heading,x:point.x,y:point.y,lock});
      return {heading,name:DIRECTIONS[heading],mirrored:heading>=5};
    },
    end(live){for(const id of tracks.keys())if(!live.has(id))tracks.delete(id);},
    get tracked(){return tracks.size;},
  };
}

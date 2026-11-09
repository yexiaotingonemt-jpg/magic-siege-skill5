export function createStatusReservoirs(){
 const durations=new Map();let matchId;
 return {
  begin(id){if(id!==matchId){durations.clear();matchId=id;}},
  sample(key,until,now){
   if(!Number.isFinite(until))return 1;
   const remaining=Math.max(0,until-now);let record=durations.get(key);
   if(!record||until>record.until+1e-6){record={until,duration:remaining||1};durations.set(key,record);}
   return Math.max(0,Math.min(1,remaining/record.duration));
  },
  prune(active){for(const key of durations.keys())if(!active.has(key))durations.delete(key);},
 };
}

export function drawStatusReservoir(g,x,y,size,ratio,colors){
 const r=size/2-1,cx=x+size/2,cy=y+size/2;
 g.fillStyle(colors.fill,.96);g.fillCircle(cx,cy,r);
 if(ratio<=0)return;
 const angle=Math.asin(1-2*Math.max(0,Math.min(1,ratio))),points=[];
 for(let i=0;i<=32;i++){const a=angle+(Math.PI-2*angle)*i/32;points.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r});}
 g.fillStyle(colors.line,.48);g.fillPoints(points,true);
}

export const statusDetail=status=>status.detail?.replace(/剩余[\d.]+秒[，,]?/g,'')||'';

export const TROOP_TYPES=['melee','ranged','siege'];

export function distributeTroops(count,weights){
 const total=weights.reduce((n,x)=>n+x,0);
 if(!total)return weights.map(()=>0);
 const exact=weights.map(x=>count*x/total),result=exact.map(Math.floor);
 const order=exact.map((x,i)=>({i,fraction:x-result[i]})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
 for(let left=count-result.reduce((n,x)=>n+x,0),i=0;left>0;left--,i++)result[order[i%order.length].i]++;
 return result;
}

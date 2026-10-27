// Test the rendered silhouette, including its health bar, in world pixels.
// All entities participate so a visible hero cannot pass clicks to a minion behind it.
export function pickRenderedUnits(records,point,padding=9){
 const hits=[];
 for(const r of records){
  const {left,top,width,height,alpha,sourceWidth,sourceHeight,bar,triangles}=r;
  const minX=Math.min(left,bar?.x??left),minY=Math.min(top,bar?.y??top),maxX=Math.max(left+width,bar?bar.x+bar.width:left+width),maxY=Math.max(top+height,bar?bar.y+bar.height:top+height);
  if(point.x<minX-padding||point.x>maxX+padding||point.y<minY-padding||point.y>maxY+padding)continue;
  const opaque=(x,y)=>{
   if(bar&&x>=bar.x&&x<=bar.x+bar.width&&y>=bar.y&&y<=bar.y+bar.height)return true;
   if(triangles?.length){
    for(const [a,b,c]of triangles){
     const determinant=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
     if(Math.abs(determinant)<1e-10)continue;
     const wa=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/determinant,wb=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/determinant,wc=1-wa-wb;
     if(wa< -1e-7||wb< -1e-7||wc< -1e-7)continue;
     const u=wa*a.u+wb*b.u+wc*c.u,v=wa*a.v+wb*b.v+wc*c.v;
     if(u< -1e-7||u>1+1e-7||v< -1e-7||v>1+1e-7)continue;
     const sx=Math.max(0,Math.min(sourceWidth-1,Math.floor(u*sourceWidth))),sy=Math.max(0,Math.min(sourceHeight-1,Math.floor(v*sourceHeight)));
     if(alpha[(sy*sourceWidth+sx)*4+3]>64)return true;
    }
    return false;
   }
   const sx=Math.floor((x-left)/width*sourceWidth),sy=Math.floor((y-top)/height*sourceHeight);
   return sx>=0&&sy>=0&&sx<sourceWidth&&sy<sourceHeight&&alpha[(sy*sourceWidth+sx)*4+3]>64;
  };
  let distance=opaque(point.x,point.y)?0:Infinity;
  if(distance)for(let radius=2;radius<=padding;radius+=2){
   for(let i=0;i<24;i++){const a=i*Math.PI/12;if(opaque(point.x+Math.cos(a)*radius,point.y+Math.sin(a)*radius)){distance=radius;break;}}
   if(Number.isFinite(distance))break;
  }
  const onBar=bar&&point.x>=bar.x&&point.x<=bar.x+bar.width&&point.y>=bar.y&&point.y<=bar.y+bar.height;
  if(Number.isFinite(distance))hits.push({...r,distance,hitDepth:r.depth+(onBar?20000:0)});
 }
 return hits.sort((a,b)=>a.distance-b.distance||b.hitDepth-a.hitDepth||b.id-a.id);
}

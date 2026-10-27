export const VIEW={width:500,height:500,pixelsPerGrid:18};
// Transform world positions, never the camera or sprites: art and text stay upright.
export function geometry(world,side=0){
 const height=(world.mapMaxY-world.mapMinY)*VIEW.pixelsPerGrid,maxScroll=Math.max(0,height-VIEW.height);
 const screenY=y=>(side?y-world.mapMinY:world.mapMaxY-y)*VIEW.pixelsPerGrid;
 return {height,maxScroll,side,point(u){let x=u.x,y=u.y;if(Number.isFinite(u._renderFromX)){const t=Math.max(0,Math.min(1,(performance.now()-u._renderStarted)/u._renderDuration));x=u._renderFromX+(u._renderToX-u._renderFromX)*t;y=u._renderFromY+(u._renderToY-u._renderFromY)*t;}return {x:VIEW.width/2+x*VIEW.pixelsPerGrid,y:screenY(y)};},world(x,y){return {x:(x-VIEW.width/2)/VIEW.pixelsPerGrid,y:side?world.mapMinY+y/VIEW.pixelsPerGrid:world.mapMaxY-y/VIEW.pixelsPerGrid};},scrollFor(y){return Math.max(0,Math.min(maxScroll,screenY(y)-VIEW.height/2));}};
}

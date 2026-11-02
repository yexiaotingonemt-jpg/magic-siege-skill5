export const VIEW={width:500,height:500,pixelsPerGrid:18};
import {renderedPosition} from './render-interpolation.js';
// Transform world positions, never the camera or sprites: art and text stay upright.
export function geometry(world,side=0){
 let frameAt;
 const height=(world.mapMaxY-world.mapMinY)*VIEW.pixelsPerGrid,maxScroll=Math.max(0,height-VIEW.height);
 const screenY=y=>(side?y-world.mapMinY:world.mapMaxY-y)*VIEW.pixelsPerGrid;
 return {height,maxScroll,side,frame(at){frameAt=at;},point(u){const {x,y}=renderedPosition(u,frameAt);return {x:VIEW.width/2+x*VIEW.pixelsPerGrid,y:screenY(y)};},world(x,y){return {x:(x-VIEW.width/2)/VIEW.pixelsPerGrid,y:side?world.mapMinY+y/VIEW.pixelsPerGrid:world.mapMaxY-y/VIEW.pixelsPerGrid};},scrollFor(y){return Math.max(0,Math.min(maxScroll,screenY(y)-VIEW.height/2));}};
}

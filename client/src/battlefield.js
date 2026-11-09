export const VIEW={width:500,height:500,pixelsPerGrid:18};
import {renderedPosition} from './render-interpolation.js';
// Transform world positions, never the camera or sprites: art and text stay upright.
export function battlefieldViewport(width,height){
 return {width:VIEW.width,height:width>0&&height>0?Math.max(1,Math.round(VIEW.width*height/width)):VIEW.height};
}
export function geometry(world,side=0,viewport=VIEW){
 let frameAt;
 const height=(world.mapMaxY-world.mapMinY)*VIEW.pixelsPerGrid;
 const screenY=y=>(side?y-world.mapMinY:world.mapMaxY-y)*VIEW.pixelsPerGrid;
 return {height,get maxScroll(){return Math.max(0,height-viewport.height);},side,frame(at){frameAt=at;},point(u){const {x,y}=renderedPosition(u,frameAt);return {x:VIEW.width/2+x*VIEW.pixelsPerGrid,y:screenY(y)};},world(x,y){return {x:(x-VIEW.width/2)/VIEW.pixelsPerGrid,y:side?world.mapMinY+y/VIEW.pixelsPerGrid:world.mapMaxY-y/VIEW.pixelsPerGrid};},scrollFor(y){return Math.max(0,Math.min(height-viewport.height,screenY(y)-viewport.height/2));}};
}

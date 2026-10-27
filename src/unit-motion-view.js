import Phaser from 'phaser';
import {createUnitMotionModel,deformUnitVertex} from './unit-motion.js';

export function createUnitMotionView(scene){
 const model=createUnitMotionModel(),meshes=new Set(),webgl=scene.game.renderer.type===Phaser.WEBGL,ink=scene.add.graphics().setDepth(6500);
 const bind=(mesh)=>{
  for(const vertex of mesh.vertices){vertex.motionU=vertex.x+.5;vertex.motionV=.5-vertex.y;}
  mesh.motionSamples=[[.33,.25],[.66,.25],[.33,.625],[.66,.625],[.33,.875],[.66,.875]].map(([a,b])=>mesh.vertices.reduce((best,v)=>Math.hypot(v.motionU-a,v.motionV-b)<Math.hypot(best.motionU-a,best.motionV-b)?v:best,mesh.vertices[0]));
 };
 return {report:model.report,begin(s){ink.clear();model.begin(s);},pose:(s,u)=>model.pose(s,u),
  make(x,y,texture,frame){
   if(!webgl)return scene.add.image(x,y,texture,frame);
   const mesh=scene.add.mesh(x,y,texture,frame);mesh.setSize(1,1).setOrtho(1,1);mesh.hideCCW=false;mesh.ignoreDirtyCache=true;
   Phaser.Geom.Mesh.GenerateGridVerts({mesh,width:1,height:1,widthSegments:6,heightSegments:8});bind(mesh);meshes.add(mesh);return mesh;
  },
  apply(sp,u,pose){
   if(sp.type==='Mesh'){
    const f=sp.frame,samples=[];
    for(const v of sp.vertices){const q=deformUnitVertex(v.motionU-.5,v.motionV-.5,pose);v.x=q.x;v.y=-q.y;v.setUVs(f.u0+(f.u1-f.u0)*v.motionU,f.v0+(f.v1-f.v0)*v.motionV);}
    sp.preUpdate();
    for(const v of sp.motionSamples)samples.push({u:v.motionU,v:v.motionV,x:v.vx*sp.scaleX,y:v.vy*sp.scaleY});
    sp.motionPose=pose;
    model.report.push({unitId:u.id,style:pose.style,action:pose.action,phase:pose.phase,frame:pose.frame,attackPhase:pose.attackPhase,channels:{...pose.channels},mesh:true,vertexSamples:samples,x:sp.x,y:sp.y,width:sp.displayWidth,height:sp.displayHeight});
   }else model.report.push({unitId:u.id,...pose,mesh:false,vertexSamples:[],x:sp.x,y:sp.y,width:sp.displayWidth,height:sp.displayHeight});
   const k=pose.attackPhase,anchor=sp.unitAnchor||sp;
   if(k!=null&&pose.action!=='prepare'&&k<.75){
    const alpha=(1-k/.75)*.65,color=u.side?0xc7abe5:0x93dce1;
    if(['golem','orc','lord','assassin'].includes(pose.style)){
     const radius=u.hero?26:17,start=-2.7+k*2.3;
     ink.lineStyle(u.hero?3:2,color,alpha);ink.beginPath();ink.arc(anchor.x,anchor.y+5,radius,start,start+1.2,false);ink.strokePath();
    }else{
     const x=anchor.x+(pose.style==='arbalest'?6:pose.style==='tower'?0:12),y=anchor.y+(pose.style==='tower'?-21:1),radius=pose.style==='tower'?8:5;
     ink.fillStyle(color,alpha*.45);ink.fillCircle(x,y,radius*(1+k));ink.lineStyle(1,color,alpha);ink.strokeCircle(x,y,radius*(1+k*1.5));
    }
   }
  },
  hitRecord(sp){
   if(sp.type!=='Mesh')return {};
   const angle=sp.rotation,cos=Math.cos(angle),sin=Math.sin(angle),convert=v=>{const x=v.vx*sp.scaleX,y=v.vy*sp.scaleY;return {x:sp.x+x*cos-y*sin,y:sp.y+x*sin+y*cos,u:v.motionU,v:v.motionV};};
   const triangles=sp.faces.map(f=>[convert(f.vertex1),convert(f.vertex2),convert(f.vertex3)]),points=triangles.flat(),left=Math.min(...points.map(v=>v.x)),top=Math.min(...points.map(v=>v.y)),right=Math.max(...points.map(v=>v.x)),bottom=Math.max(...points.map(v=>v.y));
   return {triangles,left,top,width:right-left,height:bottom-top};
  },
  end:live=>model.end(live),remove(sp){meshes.delete(sp);},get meshCount(){return meshes.size;}
 };
}

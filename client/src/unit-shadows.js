const TEXTURE='unit-ground-shadow';

// Share a soft radial texture across units; no per-frame blur or canvas work.
export function createUnitShadows(scene){
 if(!scene.textures.exists(TEXTURE)){
  const texture=scene.textures.createCanvas(TEXTURE,128,128),ctx=texture.getContext();
  const gradient=ctx.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(13,18,25,0.85)');
  gradient.addColorStop(.3,'rgba(13,18,25,0.68)');
  gradient.addColorStop(.65,'rgba(13,18,25,0.28)');
  gradient.addColorStop(1,'rgba(13,18,25,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);texture.refresh();
 }
 const shadows=new Map();
 return {
  draw(u,p,camera){
   // Feet stay registered to the ground while the body sways and attacks.
   // Fixed world lighting keeps both armies' shadows pointing the same way.
   const size=(u.hero?(u.classId===3?62:44):u.type==='siege'?38:32)*(u.elite?1.22:1);
   const y=p.y+(u.hero?30:26),visible=y>=camera.scrollY-70&&y<=camera.scrollY+camera.height+70;
   let pair=shadows.get(u.id);
   if(!pair){
    if(!visible)return;
    pair={cast:scene.add.image(0,0,TEXTURE).setDepth(70),contact:scene.add.image(0,0,TEXTURE).setDepth(71)};
    shadows.set(u.id,pair);
   }
   pair.cast.setVisible(visible);pair.contact.setVisible(visible);
   if(!visible)return;
   pair.cast.setPosition(p.x+size*.24,y+size*.07).setDisplaySize(size*1.55,size*.5).setAngle(14).setAlpha(.4);
   pair.contact.setPosition(p.x,y).setDisplaySize(size,size*.34).setAlpha(.65);
  },
  end(live){for(const [id,pair] of shadows)if(!live.has(id)){pair.cast.destroy();pair.contact.destroy();shadows.delete(id);}},
  destroy(){for(const pair of shadows.values()){pair.cast.destroy();pair.contact.destroy();}shadows.clear();}
 };
}

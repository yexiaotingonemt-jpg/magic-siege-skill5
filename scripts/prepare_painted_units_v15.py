"""Normalize generated sprites using alpha extraction, crop, scale and anchors only."""
from pathlib import Path
from collections import deque
import json
import shutil
import numpy as np
from PIL import Image, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(r'C:\Users\onemt\.codex\generated_images\01a13d38-4767-70c1-854e-efc7daeac632')
OUT=ROOT/'client/public/art/magic-v15'
RAW=ROOT/'evidence/magic-v15/raw'
OUT.mkdir(parents=True,exist_ok=True);RAW.mkdir(parents=True,exist_ok=True)
files={'minions':'exec-62b86525-96e6-4004-99de-f491ca92db26.png','heroes':'exec-4520f990-bed1-4f26-b8b0-40e548b5f863.png'}
for key,name in files.items():shutil.copy2(SOURCE/name,RAW/(key+'.png'))

def bbox(im,threshold=80):return im.getchannel('A').point(lambda a:255 if a>threshold else 0).getbbox()
def fit(im,w,h,maxw,maxh,bottom):
    box=bbox(im);assert box,'Empty sprite'
    crop=im.crop(box);scale=min(maxw/crop.width,maxh/crop.height)
    crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(w,h));canvas.alpha_composite(crop,((w-crop.width)//2,bottom-crop.height));return canvas

def components(im):
    # Quarter-resolution alpha components separate a halberd from the preceding
    # row's boots without cutting off either. No colors or painted details change.
    small=im.resize((im.width//4,im.height//4),Image.Resampling.BOX)
    mask=np.asarray(small.getchannel('A'))>150
    H,W=mask.shape;seen=np.zeros((H,W),bool);found=[]
    for y,x in zip(*np.nonzero(mask)):
        if seen[y,x]:continue
        queue=deque([(int(x),int(y))]);seen[y,x]=True;pixels=[]
        while queue:
            px,py=queue.popleft();pixels.append((px,py))
            for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                if 0<=nx<W and 0<=ny<H and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;queue.append((nx,ny))
        if len(pixels)>400:found.append(pixels)
    return sorted(found,key=len,reverse=True)

minions=Image.open(RAW/'minions.png').convert('RGBA')
assert minions.getchannel('A').getextrema()[0]==0
parts=components(minions)[:6];assert len(parts)==6
parts=sorted(parts,key=lambda p:(np.mean([y for x,y in p])>=minions.height/8,np.mean([x for x,y in p])))
atlas=Image.new('RGBA',(1536,1024));minion_boxes=[]
for i,pixels in enumerate(parts):
    mask=Image.new('L',(minions.width//4,minions.height//4))
    for x,y in pixels:mask.putpixel((x,y),255)
    mask=mask.resize(minions.size,Image.Resampling.NEAREST).filter(ImageFilter.MaxFilter(9))
    box=mask.getbbox();minion_boxes.append(box)
    cell=minions.crop(box);alpha=np.minimum(np.asarray(cell.getchannel('A')),np.asarray(mask.crop(box)))
    cell.putalpha(Image.fromarray(alpha))
    col=i%3;row=i//3
    atlas.alpha_composite(fit(cell,384,512,332 if col==2 else 304,300 if col==2 else 420,448),(col*384,row*512))
atlas.save(OUT/'minions.png')

raw=Image.open(RAW/'heroes.png').convert('RGBA')
assert raw.getchannel('A').getextrema()[0]==0
occupancy=(np.asarray(raw.getchannel('A'))>100).sum(axis=1)
quiet=np.convolve(occupancy,np.ones(3),mode='same')
row_cuts=[0]
for row in range(1,6):
    middle=round(raw.height*row/6)
    row_cuts.append(middle-42+int(np.argmin(quiet[middle-42:middle+42])))
row_cuts.append(raw.height)
actions=Image.new('RGBA',(1024,1536));heroes=Image.new('RGBA',(1536,1024));layouts=[];frames=[];hero_cells=[4,5,2,6,1,7]
anchors=[];column_cuts=[]
for row in range(6):
    row_image=raw.crop((0,row_cuts[row],1024,row_cuts[row+1]))
    occupancy=(np.asarray(row_image.getchannel('A'))>100).sum(axis=0)
    quiet=np.convolve(occupancy,np.ones(3),mode='same')
    cuts=[0]
    for boundary in range(1,4):
        left=boundary*256-24;right=boundary*256+(52 if boundary==3 else 24)
        cuts.append(left+int(np.argmin(quiet[left:right])))
    cuts.append(1024);column_cuts.append(cuts)
    poses=[]
    for col in range(4):
        crop=row_image.crop((cuts[col],0,cuts[col+1],row_image.height))
        cell=Image.new('RGBA',(352,row_image.height))
        cell.alpha_composite(crop,(48+cuts[col]-col*256,0));poses.append(cell)
    # Recovery ends at the identical idle pose. Reusing it prevents neighboring
    # release flashes from becoming detached fragments in the recovery cutout.
    poses[3]=poses[0].copy()
    bounds=[bbox(pose) for pose in poses]
    # One scale per character across all poses; per-pose baseline alignment avoids
    # generated feet drifting vertically during windup/release.
    left=min(b[0] for b in bounds);right=max(b[2] for b in bounds)
    scale=min(228/(right-left),218/max(b[3]-b[1] for b in bounds))
    normalized=[]
    for col,(pose,box) in enumerate(zip(poses,bounds)):
        crop=pose.crop((left,box[1],right,box[3]))
        crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(256,256));canvas.alpha_composite(crop,((256-crop.width)//2,224-crop.height))
        normalized.append(canvas);actions.alpha_composite(canvas,(col*256,row*256))
        anchors.append({'row':row,'pose':col,'sourceBottom':box[3]+row_cuts[row],'normalizedBottom':224})
        frames.append({'x':col*256,'y':row*256,'width':256,'height':256})
    idle=normalized[0];box=bbox(idle)
    world_scale=min(51/(box[2]-box[0]),69/(box[3]-box[1]))
    layouts.append({'size':round(world_scale*256,4),'yOffset':round(32-(224-128)*world_scale,4)})
    # Same idle frame in the HUD and battlefield, matching the animated pose.
    crop=idle.crop(box);worldw=crop.width*world_scale;worldh=crop.height*world_scale
    crop=crop.resize((round(worldw*384/60),round(worldh*512/82)),Image.Resampling.LANCZOS)
    cell=Image.new('RGBA',(384,512));cell.alpha_composite(crop,((384-crop.width)//2,round(256+32*512/82-crop.height)))
    index=hero_cells[row];heroes.alpha_composite(cell,(index%4*384,index//4*512))
    if row==0:heroes.alpha_composite(cell,(0,0))
heroes.save(OUT/'heroes.png');actions.save(OUT/'hero-actions.png')
(ROOT/'client/src/hero-action-layout.js').write_text('// Generated: shared scale per hero, all pose feet anchored at y=224.\nexport const heroActionLayout='+json.dumps(layouts)+';\nexport const heroActionFrames='+json.dumps(frames)+';\n',encoding='utf-8')
manifest={'sources':files,'method':'Built-in image_gen thick-painted redraw; alpha separation, crop, proportional scale, shared animation anchors only','assetDirectory':str(OUT),'assets':{p.name:list(Image.open(p).size) for p in OUT.glob('*.png')},'rawMinionBoxes':minion_boxes,'rawHeroRowCuts':row_cuts,'rawHeroColumnCuts':column_cuts,'heroLayout':layouts,'heroAnchors':anchors,'heroIdleFrames':hero_cells,'unchanged':['ground v13','towers v13','unit HP/attack/cadence','experience','bot population'],'towerRules':'All surviving tower rows can target, fire, receive damage; reset after all twelve destroyed.','generationPrompts':str(ROOT/'evidence/magic-v15/generation-prompts.json')}
(ROOT/'evidence/magic-v15/assets.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps({'assets':manifest['assets'],'minions':minion_boxes,'rows':row_cuts,'heroLayout':layouts}))

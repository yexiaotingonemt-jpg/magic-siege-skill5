"""Slice and align generated sprites; no painting or stylistic image edits."""
from pathlib import Path
import json
import shutil
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(r'C:\Users\onemt\.codex\generated_images\01a13d38-4767-70c1-854e-efc7daeac632')
OUT=ROOT/'public/art/magic-v12'
OUT.mkdir(parents=True,exist_ok=True)
RAW=ROOT/'evidence/magic-v12/raw'
RAW.mkdir(parents=True,exist_ok=True)
files={'ground':'exec-9a1873bc-e148-413a-a1fa-d55766ddbdda.png','minions':'exec-6b98384b-f5d1-40b6-b717-d9a51e548028.png','heroes':'exec-9b01b9f8-5db6-4279-ae84-fc772c395b98.png','towers':'exec-4c205a2d-6db4-48a8-a0a2-068be22a567b.png'}
for key,name in files.items():shutil.copy2(SOURCE/name,RAW/(key+'.png'))
shutil.copy2(RAW/'ground.png',OUT/'ground.png')

def bbox(im):return im.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
def slot(im,col,row,cols,rows):return im.crop((round(col*im.width/cols),round(row*im.height/rows),round((col+1)*im.width/cols),round((row+1)*im.height/rows)))
def fit(im,w,h,maxw,maxh,bottom):
    b=bbox(im)
    if not b:raise ValueError('Empty sprite')
    crop=im.crop(b);scale=min(maxw/crop.width,maxh/crop.height)
    sprite=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(w,h));canvas.alpha_composite(sprite,((w-sprite.width)//2,round(bottom-sprite.height)))
    return canvas

minions=Image.open(RAW/'minions.png').convert('RGBA')
if minions.getchannel('A').getextrema()[0]!=0:raise ValueError('Minions lack alpha')
atlas=Image.new('RGBA',(1536,1024))
for row in range(2):
 for col in range(4):
    canvas=fit(slot(minions,col,row,4,2),384,512,332 if col==2 else 304,300 if col==2 else 420,448)
    atlas.alpha_composite(canvas,(col*384,row*512))
atlas.save(OUT/'minions.png')

raw=Image.open(RAW/'heroes.png').convert('RGBA')
if raw.getchannel('A').getextrema()[0]!=0:raise ValueError('Heroes lack alpha')
actions=Image.new('RGBA',(1024,1536));heroes=Image.new('RGBA',(1536,1024));layouts=[];frames=[];hero_cells=[4,5,2,6,1,7]
# Generated rows have unequal gutters. Locate the actual quiet bands so that
# giant horns and witch crowns are not sliced by an assumed equal-height grid.
occupancy=(np.asarray(raw.getchannel('A'))>80).sum(axis=1)
quiet=np.convolve(occupancy,np.ones(5),mode='same')
row_cuts=[0]
for index in range(1,6):
    center=round(raw.height*index/6)
    row_cuts.append(center-80+int(np.argmin(quiet[center-80:center+80])))
row_cuts.append(raw.height)
# Release poses use a wider third slot than the neutral fourth pose.
# These gutters exclude the neighboring cannon's rotor from its idle cutout.
column_cuts=[0,240,512,824,1024]
for row in range(6):
    images=[]
    for col in range(4):
        crop=raw.crop((column_cuts[col],row_cuts[row],column_cuts[col+1],row_cuts[row+1]))
        canvas=Image.new('RGBA',(312,crop.height));canvas.alpha_composite(crop,((312-crop.width)//2,0));images.append(canvas)
    bounds=[bbox(im) for im in images]
    union=(min(b[0] for b in bounds),min(b[1] for b in bounds),max(b[2] for b in bounds),max(b[3] for b in bounds))
    scale=min(228/(union[2]-union[0]),218/(union[3]-union[1]))
    normalized=[]
    for col,im in enumerate(images):
        crop=im.crop(union);crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(256,256));canvas.alpha_composite(crop,((256-crop.width)//2,224-crop.height));normalized.append(canvas)
        actions.alpha_composite(canvas,(col*256,row*256));frames.append({'x':col*256,'y':row*256,'width':256,'height':256})
    idle=normalized[0];b=bbox(idle)
    world_scale=min(51/(b[2]-b[0]),69/(b[3]-b[1]))
    layouts.append({'size':round(world_scale*256,4),'yOffset':round(32-(224-128)*world_scale,4)})
    # Idle is the exact first animation pose, resampled into the existing HUD atlas.
    crop=idle.crop(b);worldw=crop.width*world_scale;worldh=crop.height*world_scale
    crop=crop.resize((round(worldw*384/60),round(worldh*512/82)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(384,512));canvas.alpha_composite(crop,((384-crop.width)//2,round(256+32*512/82-crop.height)))
    index=hero_cells[row];heroes.alpha_composite(canvas,(index%4*384,index//4*512))
    if row==0:heroes.alpha_composite(canvas,(0,0))
heroes.save(OUT/'heroes.png');actions.save(OUT/'hero-actions.png')

towers=Image.open(RAW/'towers.png').convert('RGBA');tower_atlas=Image.new('RGBA',(1152,512))
for col in range(3):tower_atlas.alpha_composite(fit(slot(towers,col,0,3,1),384,512,326,466,488),(col*384,0))
tower_atlas.save(OUT/'towers.png')
layout_file=ROOT/'src/hero-action-layout.js'
layout_file.write_text('// Generated from one shared scale and foot anchor per hero row.\nexport const heroActionLayout='+json.dumps(layouts)+';\nexport const heroActionFrames='+json.dumps(frames)+';\n',encoding='utf-8')
manifest={'sources':files,'rawHeroRowCuts':row_cuts,'rawHeroColumnCuts':column_cuts,'heroLayout':layouts,'heroFrames':frames,'heroIdleFrames':hero_cells,'groundViewportCrop':{'x':128,'width':768},'assets':{p.name:list(Image.open(p).size) for p in OUT.glob('*.png')},'method':'Built-in image_gen.imagegen; content-aware crop, shared scale and foot-anchor normalization','generationPrompts':str(ROOT/'evidence/magic-v12/generation-prompts.json'),'assetDirectory':str(OUT),'gameplayConfigMatchesV11':True,'terrainPlacement':'Alternating reflected road segments eliminate hard joins.'}
(ROOT/'evidence/magic-v12/assets.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest['assets']))

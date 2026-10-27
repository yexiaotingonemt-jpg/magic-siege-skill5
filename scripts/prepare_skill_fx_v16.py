"""Slice the generated VFX atlas, preserving a shared scale/anchor per family."""
from pathlib import Path
from PIL import Image
import json, shutil
root=Path(__file__).resolve().parents[1]
source=Path(r'C:\Users\onemt\.codex\generated_images\01a13d38-4767-70c1-854e-efc7daeac632\exec-6ccc1b90-9244-4953-a967-1aa39a9bfe0f.png')
out=root/'public/art/skill-fx-v16';evidence=root/'evidence/skill-fx-v16'
out.mkdir(parents=True,exist_ok=True);evidence.mkdir(parents=True,exist_ok=True)
shutil.copy2(source,evidence/'raw-atlas.png')
raw=Image.open(source).convert('RGBA');assert raw.getchannel('A').getextrema()[0]==0
atlas=Image.new('RGBA',(1024,1536));bounds=[]
for row in range(6):
 cells=[raw.crop((col*256,row*256,(col+1)*256,(row+1)*256)) for col in range(4)]
 boxes=[cell.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox() for cell in cells]
 assert all(boxes)
 union=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
 scale=min(216/(union[2]-union[0]),216/(union[3]-union[1]));bounds.append(union)
 for col,cell in enumerate(cells):
  sprite=cell.crop(union);sprite=sprite.resize((round(sprite.width*scale),round(sprite.height*scale)),Image.Resampling.LANCZOS)
  slot=Image.new('RGBA',(256,256));slot.alpha_composite(sprite,((256-sprite.width)//2,(256-sprite.height)//2 if row==0 else 230-sprite.height))
  atlas.alpha_composite(slot,(col*256,row*256))
atlas.save(out/'spell-bursts.png')
(evidence/'assets.json').write_text(json.dumps({'mode':'built-in image_gen','file':str(out/'spell-bursts.png'),'source':str(source),'families':['axe','lightning','arcane','ice','fire','nature'],'framesPerFamily':4,'frameSize':[256,256],'sourceFamilyBounds':bounds,'method':'alpha-bounds crop, one proportional scale and anchor per four-frame family'},indent=2),encoding='utf-8')
print(str(out/'spell-bursts.png'))

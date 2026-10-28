from PIL import Image
from collections import deque
from array import array
from pathlib import Path
import json
out=Path('client/public/art/skill5');im=Image.open(out/'assassin-source.png').convert('RGBA');w,h=im.size;a=im.getchannel('A').tobytes();lab=array('I',[0])*(w*h);components=[];number=0
for index,value in enumerate(a):
 if value<=32 or lab[index]: continue
 number+=1;q=deque([index]);lab[index]=number;count=0;x0=w;y0=h;x1=y1=0
 while q:
  k=q.popleft();y,x=divmod(k,w);count+=1;x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
  for n in ((k-1 if x else -1),(k+1 if x<w-1 else -1),(k-w if y else -1),(k+w if y<h-1 else -1)):
   if n>=0 and a[n]>32 and not lab[n]:lab[n]=number;q.append(n)
 if count>500:components.append({'label':number,'count':count,'box':(x0,y0,x1+1,y1+1)})
components=sorted(components,key=lambda c:c['count'],reverse=True)[:4];components.sort(key=lambda c:c['box'][0]);canvas=Image.new('RGBA',(4*512,512));meta=[];scale=.6
for i,c in enumerate(components):
 box=c['box'];part=im.crop(box);alpha=part.getchannel('A');mask=bytearray(alpha.tobytes());pw,ph=part.size
 for y in range(ph):
  for x in range(pw):
   if lab[(box[1]+y)*w+box[0]+x]!=c['label']:mask[y*pw+x]=0
 part.putalpha(Image.frombytes('L',part.size,bytes(mask)));part=part.resize((round(pw*scale),round(ph*scale)),Image.Resampling.LANCZOS)
 foot=part.getchannel('A').crop((0,part.height-20,part.width,part.height)).getbbox();cx=(foot[0]+foot[2])/2 if foot else part.width/2
 x=round(256-cx);y=450-part.height;tile=Image.new('RGBA',(512,512));tile.alpha_composite(part,(x,y));canvas.alpha_composite(tile,(i*512,0));meta.append({'frame':i,'box':box,'footAnchor':[256,450],'scale':scale})
canvas.save(out/'assassin-actions.png');canvas.crop((0,0,512,512)).save(out/'assassin-idle.png');(out/'assassin-layout.json').write_text(json.dumps(meta,indent=2))

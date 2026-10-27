"""Measure actual rendered FX against a same-time, same-pose hidden-FX frame."""
from pathlib import Path
import json
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1]/'evidence/skill-fx-v16/visual-check'
cases=[];failed=[]
for hero in range(6):
 for skill in range(4):
  key=f'{hero}-{skill}'
  peak=np.asarray(Image.open(root/(key+'-peak.png')).convert('RGB'),dtype=np.int16)
  without=np.asarray(Image.open(root/(key+'-without-fx.png')).convert('RGB'),dtype=np.int16)
  mask=np.abs(peak-without).max(axis=2)>28
  yy,xx=np.nonzero(mask)
  item={'hero':hero,'skill':skill,'changedPixels':int(mask.sum()),'bounds':[int(xx.min()),int(yy.min()),int(xx.max()),int(yy.max())] if len(xx) else None}
  cases.append(item)
  if item['changedPixels']<160 or item['bounds'][2]-item['bounds'][0]<30 or item['bounds'][3]-item['bounds'][1]<30:failed.append(item)
result={'method':'Difference >28 RGB levels with same-time actors and only effect layers hidden','cases':cases,'failed':failed}
(root/'pixel-visibility.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))

"""Create a labeled contact sheet of actual battle screenshots, no art repaint."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
root=Path(__file__).resolve().parents[1];out=root/'evidence/skill-fx-v16'
names=[['伤痕打击','压制打击','防御护盾','裂阵重击'],['雷击','闪电链','电弧牵引','雷云'],['炮弹轰击','生命链接','偏转力场','毁灭冲锋'],['震撼大地','嘲讽','荆棘外壳','旋风斩'],['火焰冲击','烈焰连射','烈焰迸发','天火审判'],['精灵寄生','精灵护盾','精灵唤醒','精灵群疗']]
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
board=Image.new('RGB',(1000,1850),'#182321');draw=ImageDraw.Draw(board)
draw.text((24,16),'24 技能 · 战场实际画面',font=font,fill='#f3e2bc')
for hero in range(6):
 for skill in range(4):
  image=Image.open(out/'visual-check'/f'{hero}-{skill}-peak.png').convert('RGB')
  crop=image.crop((115,145,395,450));crop.thumbnail((234,255),Image.Resampling.LANCZOS)
  x=skill*250+8;y=hero*295+55
  board.paste(crop,(x,y));draw.text((x+4,y+260),names[hero][skill],font=font,fill='#ebddbf')
board.save(out/'24-skills-review.png')
# Preserve before/after evidence from the independent crowded battle scenario.
for count in [16,50]:
 old=Image.open(out/'independent-qa'/f'dense-combat-{count}-1440.png').convert('RGB').crop((120,220,640,610))
 new=Image.open(out/'followup-qa'/f'dense-combat-{count}-1440.png').convert('RGB').crop((120,220,640,610))
 pair=Image.new('RGB',(1040,440),'#182321');d=ImageDraw.Draw(pair)
 d.text((16,8),'初验画面',font=font,fill='#eedabd');d.text((536,8),'持续特效分层与同屏密度调整后',font=font,fill='#b7e6bf');pair.paste(old,(0,42));pair.paste(new,(520,42));pair.save(out/f'crowd-{count}-comparison.png')
print(str(out/'24-skills-review.png'))

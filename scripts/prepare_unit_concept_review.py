"""Arrange generated concept cutouts for review. Does not modify game assets."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
out = root/'evidence/unit-concepts-v14'
font = lambda n: ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', n)
bold = lambda n: ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc', n)
groups = [
 ('troops', '普通兵 · 双方军团', ['进攻 · 符石傀儡','进攻 · 幽魂弩灵','进攻 · 悬浮晶炮','防守 · 晶盾傀儡','防守 · 王庭弩灵'], ['方盾 / 石甲 / 短刃','面具 / 深青兜帽 / 长弩','悬浮炮身 / 外露晶核','六角晶盾 / 象牙石甲','紫色尖兜帽 / 银白长弩']),
 ('heroes-a', '契约英雄 · 战斧 / 雷霆 / 攻城', ['符咒兽人','雷霆先知','符文战车'], ['獠牙面容 / 巨斧 / 青色符痕','雷冠 / 叉形法杖 / 深蓝长袍','重型晶炮 / 巨型外翼 / 装甲底盘']),
 ('heroes-b', '契约英雄 · 冰霜 / 烈焰 / 古树', ['霜岩野蛮','焰角女巫','古树精灵'], ['冰裂胸膛 / 方锤 / 宽肩轮廓','弯角 / 深红披风 / 橙色焰核','枝角树冠 / 翠绿叶衣 / 长根足'])]
for key, title, names, cues in groups:
    source = Image.open(out/'raw'/(key+'.png')).convert('RGBA')
    n = len(names)
    board = Image.new('RGBA', (1500,1390), '#e0dbcf')
    draw = ImageDraw.Draw(board)
    draw.text((44,26),title,font=bold(35),fill='#282f32')
    draw.text((44,79),'形象确认稿 · 保持成年比例，优先识别轮廓、武器和色块',font=font(22),fill='#5b5b55')
    # Preserve the complete concept lineup: wide weapons may cross nominal columns.
    # Individual production cutouts will be made only after the direction is approved.
    large = source.resize((1500,1000),Image.Resampling.LANCZOS)
    board.alpha_composite(large,(0,115))
    for i, name in enumerate(names):
        slot = 1500/n
        draw.text((slot*(i+.5),1130),name,font=bold(22 if n==5 else 28),fill='#222c32',anchor='mt')
        draw.text((slot*(i+.5),1174),cues[i],font=font(16 if n==5 else 20),fill='#55554d',anchor='mt')
    box = source.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
    lineup = source.crop(box)
    height = 62 if n==5 else 82
    small = lineup.resize((round(lineup.width*height/lineup.height),height),Image.Resampling.LANCZOS)
    board.alpha_composite(small,((1500-small.width)//2,1324-height))
    draw.text((750,1344),'缩小参考 · 请以原图 100% 查看，页面缩放会改变显示尺寸',font=font(17),fill='#55554d',anchor='mt')
    board.convert('RGB').save(out/(key+'-review.png'))
print(json.dumps({'output':str(out),'boards':[key+'-review.png' for key,*_ in groups],'gameAssetsModified':False},ensure_ascii=False))

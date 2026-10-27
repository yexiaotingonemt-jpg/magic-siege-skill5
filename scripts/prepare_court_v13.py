"""Copy the generated court and normalize three tower cutouts, without repainting."""
from pathlib import Path
import json
import shutil
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1]
out = root / 'public/art/magic-v13'
raw = root / 'evidence/magic-v13/raw'
out.mkdir(parents=True, exist_ok=True)
raw.mkdir(parents=True, exist_ok=True)
for name, source in zip(('ground', 'towers'), sys.argv[1:]):
    shutil.copy2(source, raw / (name + '.png'))
shutil.copy2(raw / 'ground.png', out / 'ground.png')
towers = Image.open(raw / 'towers.png').convert('RGBA')
assert towers.getchannel('A').getextrema()[0] == 0, 'Tower background must be transparent'
atlas = Image.new('RGBA', (1152, 512))
bounds = []
for col in range(3):
    cell = towers.crop((round(col*towers.width/3), 0, round((col+1)*towers.width/3), towers.height))
    box = cell.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox()
    assert box, 'Empty tower cell'
    bounds.append(box)
    crop = cell.crop(box)
    scale = min(326/crop.width, 440/crop.height)
    crop = crop.resize((round(crop.width*scale), round(crop.height*scale)), Image.Resampling.LANCZOS)
    atlas.alpha_composite(crop, (col*384+(384-crop.width)//2, 488-crop.height))
atlas.save(out / 'towers.png')
manifest = {'method': 'Built-in image_gen; alpha bounding-box crop and proportional resize only',
    'assetDirectory': str(out),
    'assets': {p.name: list(Image.open(p).size) for p in out.glob('*.png')},
    'rawTowerBounds': bounds, 'groundViewportCrop': {'x':128,'width':768},
    'terrainPlacement': 'Upright repeating segments with a 64-source-pixel alpha overlap; no vertical reflection of walls or lanterns',
    'unchanged': ['minions', 'heroes', 'hero-actions', 'gameplay configuration'],
    'generationPrompts': str(root/'evidence/magic-v13/generation-prompts.json')}
(root/'evidence/magic-v13/assets.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps(manifest))

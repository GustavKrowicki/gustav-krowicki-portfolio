"""Compare procedural sprite renders against the live LEGO HQ sprites: alpha IoU, bbox, and a sheet."""
import sys
import numpy as np
from PIL import Image, ImageDraw
W, R, P = sys.argv[1], sys.argv[2], sys.argv[3]
rows = []
for d in ('south', 'west', 'north', 'east'):
    a = Image.open(f'{R}/lego-hq_{d}.png').convert('RGBA'); b = Image.open(f'{W}/renders/{P}-sprite-{d}.png').convert('RGBA')
    ma, mb = np.asarray(a)[..., 3] > 8, np.asarray(b)[..., 3] > 8
    iou = (ma & mb).sum() / (ma | mb).sum()
    bb = lambda m: (int(np.nonzero(m.any(0))[0][0]), int(np.nonzero(m.any(1))[0][0]), int(np.nonzero(m.any(0))[0][-1]), int(np.nonzero(m.any(1))[0][-1]))
    print(d, 'IoU', round(float(iou), 3), 'bbox live', bb(ma), 'new', bb(mb))
    rows.append((a, b))
G = (126, 140, 98, 255)
sheet = Image.new('RGB', (384 * 4 + 24, 384 * 2 + 8), (240, 238, 232))
for i, (a, b) in enumerate(rows):
    for j, im in enumerate((a, b)):
        bg = Image.new('RGBA', im.size, G); bg.alpha_composite(im); sheet.paste(bg.convert('RGB'), (i * 392, j * 392))
sheet.save(f'{W}/review/{P}_sprites.png'); print(f'review/{P}_sprites.png')

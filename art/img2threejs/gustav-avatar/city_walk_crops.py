"""Crop the city_walk_check.mjs full frames around the player (found by its gold pointer): a contact sheet of
every Nth frame at 3x (nearest) and an animated GIF of all frames. Also reports the gap between the pointer tip
and the top of the player's outline (screen px).
Usage: python3 -I city_walk_crops.py <dir> <out-prefix> [every]
"""
import json
import sys

from PIL import Image, ImageDraw

D, OUT = sys.argv[1:3]
EVERY = int(sys.argv[3]) if len(sys.argv) > 3 else 3
shots = json.load(open(f"{D}/shots.json"))
crops, gaps = [], []
for s in shots:
    im = Image.open(s["path"]).convert("RGB")
    px = im.load()
    pts = [(x, y) for y in range(im.height) for x in range(im.width)
           if px[x, y][0] > 240 and 200 < px[x, y][1] < 225 and px[x, y][2] < 30]
    if not pts:
        continue
    cx = sum(p[0] for p in pts) / len(pts)
    tip = max(p[1] for p in pts)
    # first dark outline pixel (the 3D sheets' warm near-black) straight below the arrow = the top of the head
    head = next((y for y in range(tip + 1, min(im.height, tip + 60))
                 if any(sum(px[int(cx) + dx, y]) < 160 for dx in range(-3, 4))), None)
    if head is not None:
        gaps.append(head - tip - 1)
    box = (int(cx - 50), int(tip - 25), int(cx + 50), int(tip + 75))
    crops.append((s, im.crop(box).resize((300, 300), Image.NEAREST)))
sel = crops[::EVERY]
cols = 8
sheet = Image.new("RGB", (cols * 304, ((len(sel) + cols - 1) // cols) * 318), (255, 255, 255))
d = ImageDraw.Draw(sheet)
for k, (s, c) in enumerate(sel):
    x, y = (k % cols) * 304, (k // cols) * 318
    sheet.paste(c, (x, y + 16))
    d.text((x + 2, y + 2), f"to {s['building']} #{s['i']}", fill=(0, 0, 0))
sheet.save(f"{OUT}.png")
frames = [c for _, c in crops]
frames[0].save(f"{OUT}.gif", save_all=True, append_images=frames[1:], duration=125, loop=0)
gaps.sort()
print(len(crops), "crops; pointer-tip to head gap px (screen) median", gaps[len(gaps) // 2] if gaps else None,
      "range", (gaps[0], gaps[-1]) if gaps else None)

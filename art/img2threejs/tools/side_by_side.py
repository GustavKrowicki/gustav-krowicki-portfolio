"""Side-by-side review image for one pass: reference crops (side.json in the building folder) next to the south sprite at
game size (the 2x render shown at spriteScale 0.5, Overview zoom 1), at Street zoom 2 (1:1) and the 2x close-up of the
render (1024 px south shot, cropped to its content). Usage: side_by_side.py <buildingDir> <pass>  ->  renders/<pass>-side.png
side.json: {"refs": [{"img": "ref/x.png", "box": [x0, y0, x1, y1], "label": "..."}]}"""
import json
import sys
from PIL import Image, ImageDraw

W, P = sys.argv[1], sys.argv[2]
H = 640
cfg = json.load(open(f"{W}/side.json"))


def fit(im, h=H):
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)


def on_white(im):
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im.convert("RGBA")); return bg.convert("RGB")


panels = []
for r in cfg["refs"]:
    panels.append((fit(Image.open(f"{W}/{r['img']}").convert("RGB").crop(tuple(r["box"]))), r["label"]))
spr = Image.open(f"{W}/renders/{P}-sprite-south.png").convert("RGBA")
spr = spr.crop(spr.getbbox())
game1 = on_white(spr.resize((max(1, spr.width // 2), max(1, spr.height // 2)), Image.LANCZOS))
canvas1 = Image.new("RGB", (game1.width + 20, H), "white"); canvas1.paste(game1, (10, H - game1.height - 10))
panels.append((canvas1, "game, zoom 1"))
game2 = on_white(spr)
c2 = Image.new("RGB", (game2.width + 20, max(H, game2.height + 20)), "white"); c2.paste(game2, (10, c2.height - game2.height - 10))
panels.append((fit(c2) if c2.height > H else c2, "game, Street zoom 2 (1:1)"))
big = Image.open(f"{W}/renders/{P}-sprite2x-south.png").convert("RGBA")
big = on_white(big.crop(big.getbbox()))
panels.append((fit(big), "2x close-up"))
pad = 16
w = sum(p.width for p, _ in panels) + pad * (len(panels) + 1)
out = Image.new("RGB", (w, H + 44), (246, 246, 244))
d = ImageDraw.Draw(out)
x = pad
for p, label in panels:
    out.paste(p, (x, 34)); d.text((x, 10), label, fill=(40, 40, 40)); x += p.width + pad
out.save(f"{W}/renders/{P}-side.png")
print(f"{W}/renders/{P}-side.png", out.size)

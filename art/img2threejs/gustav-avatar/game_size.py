"""Real game-size crops: each direction's 30 deg sprite render downscaled so the figure is 48 px tall (0.9 wu at
Street zoom 2), shown 1:1 and enlarged 4x (nearest) beside the old GIF frame at its real 56 px.
Usage: python3 -I game_size.py <out.png> <label> <render1> <gif1> [<render2> <gif2> ...]
"""
import sys

from PIL import Image, ImageDraw

out, label, *pairs = sys.argv[1:]
BG = (196, 214, 190, 255)
cells = []
for render, gif in zip(pairs[0::2], pairs[1::2]):
    r = Image.open(render).convert("RGBA")
    r = r.crop(r.getbbox())
    r48 = r.resize((max(1, round(r.width * 48 / r.height)), 48), Image.LANCZOS)
    g = Image.open(gif).convert("RGBA")
    g = g.crop(g.getbbox())
    cells.append((r48, g))
W = sum((r.width + g.width) * 4 + 40 for r, g in cells) + 20
H = 60 + 48 + 20 + 56 * 4 + 40
canvas = Image.new("RGBA", (W, H), BG)
d = ImageDraw.Draw(canvas)
d.text((10, 6), label, fill=(20, 20, 20, 255))
x = 10
for r, g in cells:
    # row 1: true pixels (new 48 px next to old 56 px)
    canvas.alpha_composite(r, (x, 30 + 56 - 48))
    canvas.alpha_composite(g, (x + r.width + 6, 30))
    # row 2: 4x nearest
    r4 = r.resize((r.width * 4, r.height * 4), Image.NEAREST)
    g4 = g.resize((g.width * 4, g.height * 4), Image.NEAREST)
    y = 30 + 56 + 20
    canvas.alpha_composite(r4, (x, y + g4.height - r4.height))
    canvas.alpha_composite(g4, (x + r4.width + 6, y))
    x += (r.width + g.width) * 4 + 40
canvas.convert("RGB").save(out)
print(out, canvas.size)

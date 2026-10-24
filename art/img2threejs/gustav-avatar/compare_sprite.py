"""Side-by-side of the 30 deg sprite render and the old walk GIF frame.

Panel 1: both scaled (nearest) to the same on-screen height (the GIF's 56 px x 6).
Panel 2: true city scale at Street zoom 2 -- the avatar at 0.9 wu x 26.94 px/wu x 2 = 48 px next to the GIF's 56 px
         (the GIF is drawn 1:1 in the city today), both enlarged 4x for viewing.
Usage: python3 -I compare_sprite.py <render.png (transparent)> <gif-frame.png> <out.png> [label]
"""
import sys

from PIL import Image, ImageDraw

render_path, gif_path, out_path = sys.argv[1:4]
label = sys.argv[4] if len(sys.argv) > 4 else ""
BG = (196, 214, 190, 255)


def crop(im):
    im = im.convert("RGBA")
    return im.crop(im.getbbox())


r, g = crop(Image.open(render_path)), crop(Image.open(gif_path))
H = g.height * 6
r1 = r.resize((max(1, round(r.width * H / r.height)), H), Image.LANCZOS)
g1 = g.resize((g.width * 6, H), Image.NEAREST)
# true scale: avatar 48 px tall at Street zoom (0.9 wu * 26.94 px/wu * 2), GIF as drawn today (56 px)
r2 = r.resize((max(1, round(r.width * 48 / r.height)), 48), Image.LANCZOS)
r2 = r2.resize((r2.width * 4, r2.height * 4), Image.NEAREST)
g2 = g.resize((g.width * 4, g.height * 4), Image.NEAREST)
W = r1.width + g1.width + r2.width + g2.width + 140
canvas = Image.new("RGBA", (W, H + 60), BG)
x = 20
for im, y in ((r1, 40), (g1, 40)):
    canvas.alpha_composite(im, (x, y))
    x += im.width + 20
x += 40
canvas.alpha_composite(r2, (x, 40 + H - r2.height))
x += r2.width + 20
canvas.alpha_composite(g2, (x, 40 + H - g2.height))
d = ImageDraw.Draw(canvas)
d.text((20, 10), f"same height: new 3D avatar (30 deg pitch, converter light) | old GIF frame   {label}", fill=(20, 20, 20, 255))
d.text((r1.width + g1.width + 100, 10), "true scale x4: avatar 48 px (0.9 wu, Street zoom 2) | GIF 56 px", fill=(20, 20, 20, 255))
canvas.convert("RGB").save(out_path)
print(out_path, canvas.size)

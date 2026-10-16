"""Frame a transparent sprite render like the fixed reference (ref/north-00-x12-white.png): crop to the figure,
scale it to the reference figure's height, align bottoms and horizontal centres, composite on white.
Alignment is scale + translation only (the gates' IoU is meaningful only after it).

Usage: python3 -I align_render.py <render.png> <reference.png> <out.png>
"""
import sys

from PIL import Image

render, reference, out = sys.argv[1:4]
ref = Image.open(reference).convert("RGB")
# reference figure box: non-white pixels
mask = ref.point(lambda v: 255 if v < 245 else 0).convert("L")
rb = Image.merge("RGB", [mask, mask, mask]).convert("L").getbbox()
r = Image.open(render).convert("RGBA")
fig = r.crop(r.getbbox())
h = rb[3] - rb[1]
w = max(1, round(fig.width * h / fig.height))
fig = fig.resize((w, h), Image.LANCZOS)
canvas = Image.new("RGBA", ref.size, (255, 255, 255, 255))
cx = (rb[0] + rb[2]) // 2
canvas.alpha_composite(fig, (cx - w // 2, rb[1]))
canvas.convert("RGB").save(out)
print(out, "ref figure box", rb, "render figure", fig.size)

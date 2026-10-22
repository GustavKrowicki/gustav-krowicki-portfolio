"""Side view against the photo at the same scale: the photo's bike and the render's bike are both cropped to their
content and scaled so their lengths match, then laid side by side and as a 50 % overlay.
Usage: side_compare.py <buildingDir> <pass>  ->  renders/<pass>-side-compare.png"""
import sys
from PIL import Image, ImageChops, ImageDraw

W, P = sys.argv[1], sys.argv[2]
ref = Image.open(f"{W}/ref/side-photo.jpg").convert("RGB")
ren = Image.open(f"{W}/renders/{P}-side.png").convert("RGB")


def crop(im):
    bg = Image.new("RGB", im.size, (255, 255, 255))
    diff = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 24 else 0)
    return im.crop(diff.getbbox())


a, b = crop(ref), crop(ren)
H = 620
a = a.resize((round(a.width * H / a.height), H), Image.LANCZOS)
b = b.resize((a.width, round(b.height * a.width / b.width)), Image.LANCZOS)       # match length, not height
hh = max(a.height, b.height)
pad = 20
out = Image.new("RGB", (a.width * 3 + pad * 4, hh + 50), (246, 246, 244))
d = ImageDraw.Draw(out)
for i, (im, label) in enumerate(((a, "photo"), (b, f"model {P}"))):
    out.paste(im, (pad + i * (a.width + pad), 40 + hh - im.height)); d.text((pad + i * (a.width + pad), 12), label, fill=(40, 40, 40))
ov = Image.new("RGB", (a.width, hh), "white")
ov.paste(a, (0, hh - a.height))
ov2 = Image.new("RGB", (a.width, hh), "white"); ov2.paste(b, (0, hh - b.height))
out.paste(Image.blend(ov, ov2, 0.5), (pad + 2 * (a.width + pad), 40))
d.text((pad + 2 * (a.width + pad), 12), "overlay 50 %, ground lines aligned", fill=(40, 40, 40))
out.save(f"{W}/renders/{P}-side-compare.png")
print(f"{W}/renders/{P}-side-compare.png", out.size)

"""Turn review_shots.sh output into phone-sized review images: labelled roof off, roof on views, walk crops.
Usage: python3 review_sheet.py <shots dir> <out dir>"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

D, O = sys.argv[1], sys.argv[2]
LABELS = ["1 Shelf", "2 Test", "3 Team", "4 Systems map", "5 AI lab"]
try:
    FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 30)
    SMALL = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 24)
except OSError:
    FONT = SMALL = ImageFont.load_default()


def white(name):
    im = Image.open(f"{D}/{name}.png").convert("RGBA")
    bg = Image.new("RGBA", im.size, (247, 246, 242, 255)); bg.alpha_composite(im)
    return bg.convert("RGB")


def crop_building(im, pad=30):
    a = np.asarray(im).astype(int)
    m = (np.abs(a - [247, 246, 242]).sum(2) > 6)
    ys, xs = np.nonzero(m)
    return im.crop((max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, im.width), min(ys.max() + pad, im.height))), (xs.min() - pad, ys.min() - pad)


def centre(mask, rgb, tol=3):
    a = np.asarray(Image.open(f"{D}/{mask}.png").convert("RGB")).astype(int)
    ys, xs = np.nonzero((np.abs(a - rgb).sum(2) < tol))
    return (int(xs.mean()), int(ys.min()), int(ys.max())) if len(xs) else None


def tag(dr, x, y, text, font=FONT):
    w = dr.textlength(text, font=font)
    dr.rounded_rectangle((x - w / 2 - 10, y - 22, x + w / 2 + 10, y + 18), 10, fill=(30, 30, 30))
    dr.text((x - w / 2, y - 19), text, font=font, fill=(255, 255, 255))


off = white("off-south")
dr = ImageDraw.Draw(off)
for i, lab in enumerate(LABELS):
    c = centre("off-masks", (255, 8 * (i + 1), 0))
    if c:
        tag(dr, c[0], c[2] + 26, lab)

for w, lab in (("walk-1-lobby", "Lobby"), ("walk-0-door", "Main door")):     # the avatar marks the spot
    c = centre(f"{w}-mask", (0, 0, 255))
    if c:
        tag(dr, c[0], c[2] - 20, lab, SMALL)
im, (ox, oy) = crop_building(off)
im.save(f"{O}/roof-off.jpg", quality=86)
for v in ("south", "west", "north", "east"):
    crop_building(white(f"on-{v}"))[0].save(f"{O}/roof-on-{v}.jpg", quality=86)
walks = ["walk-0-door", "walk-1-lobby", "walk-2-shelf", "walk-3-test", "walk-4-team", "walk-5-map", "walk-6-ailab"]
caps = ["Main door (roof on)", "Lobby", "1 Shelf room", "2 Test room", "3 Team room", "4 Systems map room", "5 AI lab"]
for w, cap in zip(walks, caps):
    im = Image.open(f"{D}/{w}.png").convert("RGBA")
    im.alpha_composite(Image.open(f"{D}/{w}-avatar.png").convert("RGBA"))   # the city draws the avatar on top
    bg = Image.new("RGBA", im.size, (247, 246, 242, 255)); bg.alpha_composite(im); im = bg.convert("RGB")
    c = centre(f"{w}-mask", (0, 0, 255))
    x, y = c[0], (c[1] + c[2]) // 2
    cr = im.crop((x - 330, y - 230, x + 330, y + 210)).resize((990, 660), Image.LANCZOS)
    tag(ImageDraw.Draw(cr), 495, 36, cap, SMALL)
    cr.save(f"{O}/{w}.jpg", quality=86)
print("ok")

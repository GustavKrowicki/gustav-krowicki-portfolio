"""Measure Gustav's walk-sprite GIFs: extract frames into ref/, build the reference sheet, and write
measure/palette.json + measure/proportions.json (median colour per region, band heights as fractions of H).

Usage: python3 -I measure_ref.py <workspace> <repo-root>
"""
import json
import os
import statistics as st
import sys

from PIL import Image, ImageSequence

W, REPO = sys.argv[1], sys.argv[2]
DIRS = ("south", "north", "east", "west")
os.makedirs(f"{W}/ref", exist_ok=True)
os.makedirs(f"{W}/measure", exist_ok=True)

# 1. frames
frames = {}
for d in DIRS:
    gif = Image.open(f"{REPO}/public/game/pogicity/Characters/gustavwalk{d}.gif")
    frames[d] = []
    for i, f in enumerate(ImageSequence.Iterator(gif)):
        fr = f.convert("RGBA")
        fr.save(f"{W}/ref/{d}-{i:02d}.png")
        frames[d].append(fr)

# 2. reference sheet: every other frame, 8x nearest
S = 8
sheet = Image.new("RGBA", (8 * 24 * S, 4 * 62 * S), (170, 200, 170, 255))
for r, d in enumerate(DIRS):
    for c in range(8):
        f = frames[d][c * 2]
        sheet.alpha_composite(f.resize((f.width * S, f.height * S), Image.NEAREST), (c * 24 * S, r * 62 * S))
sheet.save(f"{W}/ref/reference-sheet.png")
for d in DIRS:
    f = frames[d][0]
    f.resize((f.width * 12, f.height * 12), Image.NEAREST).save(f"{W}/ref/{d}-00-x12.png")
    bg = Image.new("RGBA", f.size, (255, 255, 255, 255))
    bg.alpha_composite(f)
    bg.convert("RGB").resize((f.width * 12, f.height * 12), Image.NEAREST).save(f"{W}/ref/{d}-00-x12-white.png")


# 3. palette: band + colour rules, face-on views (east, north) for skin/tee, all views for the rest
def med(px):
    return [int(st.median(c)) for c in zip(*px)] if px else None


reg = {k: [] for k in ("hair", "skin", "jacket", "tee", "jeans", "shoes", "laptop")}
heights = []
for d in DIRS:
    for f in frames[d]:
        bb = f.getbbox()
        top, H = bb[1], bb[3] - bb[1]
        heights.append(H)
        for y in range(f.height):
            for x in range(f.width):
                r, g, b, a = f.getpixel((x, y))
                if a < 128:
                    continue
                t = (y - top) / H
                lum = (r + g + b) / 3
                if t < 0.2 and r >= g >= b - 5 and lum < 110:
                    reg["hair"].append((r, g, b))
                elif d in ("east", "north") and 0.15 < t < 0.34 and r > g + 12 and r > b + 18 and lum > 100:
                    reg["skin"].append((r, g, b))
                elif 0.36 < t < 0.68 and abs(r - g) < 12 and abs(g - b) < 14 and lum > 125:
                    reg["jacket"].append((r, g, b))
                elif d in ("east", "north") and 0.38 < t < 0.6 and 45 < lum < 95 and r >= b:
                    reg["tee"].append((r, g, b))
                elif 0.7 < t < 0.92 and b > r + 10:
                    reg["jeans"].append((r, g, b))
                elif t > 0.92 and lum < 70:
                    reg["shoes"].append((r, g, b))
palette = {k: {"rgb": med(v), "hex": "#%02x%02x%02x" % tuple(med(v)), "samples": len(v)} for k, v in reg.items() if v}
json.dump(palette, open(f"{W}/measure/palette.json", "w"), indent=2)


# 4. proportions from the east frame 0 (face-on three-quarter, legs apart): row classes by dominant colour
def band_rows(f):
    bb = f.getbbox()
    out = []
    for y in range(bb[1], bb[3]):
        cls = {"hair": 0, "skin": 0, "jacket": 0, "jeans": 0, "dark": 0}
        for x in range(f.width):
            r, g, b, a = f.getpixel((x, y))
            if a < 128:
                continue
            lum = (r + g + b) / 3
            if b > r + 15 and lum < 90:
                cls["jeans"] += 1
            elif lum < 45:
                cls["dark"] += 1
            elif r > g + 12 and r > b + 20 and lum > 110:
                cls["skin"] += 1
            elif abs(r - g) < 8 and abs(g - b) < 10 and lum > 120:
                cls["jacket"] += 1
            elif r >= g > b and lum < 110:
                cls["hair"] += 1
        width = sum(1 for x in range(f.width) if f.getpixel((x, y))[3] >= 128)
        out.append((y - bb[1], max(cls, key=cls.get), width))
    return bb[3] - bb[1], out


H, rows = band_rows(frames["east"][0])
first = {}
for i, c, _w in rows:
    first.setdefault(c, i)
props = {
    "spriteHeightPx": {"min": min(heights), "max": max(heights), "median": st.median(heights)},
    "eastFrame0": {"H": H, "firstRowByClass": first, "rows": rows},
    "bands": {
        "_note": "fractions of H measured from the east/north face-on frames; head = hair top to chin",
        "head": 18 / 56,
        "torso_shoulder_to_hem": 20 / 56,
        "legs_hem_to_sole": 17 / 56,
        "shoes": 5 / 56,
        "shoulderWidth_over_H": 13 / 56,
        "headWidth_over_H": 16 / 56,
    },
}
json.dump(props, open(f"{W}/measure/proportions.json", "w"), indent=1)
print(json.dumps(palette))
print("heights", props["spriteHeightPx"])

"""Measure the laptop in the east walk frames: per-frame bounding box of the light-grey block below the jacket front,
size as a fraction of the figure height H, position relative to the figure, and the median colour.
Writes measure/laptop.json and adds a 'laptop' entry to measure/palette.json.
Usage: python3 -I measure_laptop.py <workspace>
"""
import json
import statistics as st
import sys

from PIL import Image

W = sys.argv[1]


def is_laptop(p):
    r, g, b, a = p
    return a > 128 and abs(r - g) < 12 and abs(g - b) < 14 and (r + g + b) / 3 > 125


boxes, px = [], []
for i in range(16):
    f = Image.open(f"{W}/ref/east-{i:02d}.png").convert("RGBA")
    bb = f.getbbox()
    top, H = bb[1], bb[3] - bb[1]
    # the laptop sits in the 0.52-0.78 H band, right of the figure's centre line (the near hip)
    xs, ys = [], []
    cx = (bb[0] + bb[2]) / 2
    for y in range(f.height):
        t = (y - top) / H
        if not 0.52 < t < 0.78:
            continue
        for x in range(f.width):
            p = f.getpixel((x, y))
            if x >= cx - 2 and is_laptop(p):
                xs.append(x)
                ys.append(y)
                px.append(p[:3])
    if xs:
        boxes.append({"frame": i, "H": H, "w": (max(xs) - min(xs) + 1) / H, "h": (max(ys) - min(ys) + 1) / H,
                      "centreY": ((min(ys) + max(ys)) / 2 - top) / H, "centreX": ((min(xs) + max(xs)) / 2 - cx) / H})
med = [int(st.median(c)) for c in zip(*px)]
out = {
    "frames": len(boxes),
    "widthH": round(st.median(b["w"] for b in boxes), 3),
    "heightH": round(st.median(b["h"] for b in boxes), 3),
    "centreFromTopH": round(st.median(b["centreY"] for b in boxes), 3),
    "centreRightOfAxisH": round(st.median(b["centreX"] for b in boxes), 3),
    "colour": "#%02x%02x%02x" % tuple(med),
    "note": "screen-space box of the light-grey block at the near hip in the east frames (3/4 view, so width mixes "
            "the laptop's length and depth); closed laptop held vertically under the near arm",
    "perFrame": boxes,
}
json.dump(out, open(f"{W}/measure/laptop.json", "w"), indent=1)
pal = json.load(open(f"{W}/measure/palette.json"))
pal["laptop"] = {"rgb": med, "hex": out["colour"], "samples": len(px)}
json.dump(pal, open(f"{W}/measure/palette.json", "w"), indent=2)
print({k: v for k, v in out.items() if k != "perFrame"})

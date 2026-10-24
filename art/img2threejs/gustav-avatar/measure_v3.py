"""v3 colour targets from the walk GIFs (all 64 frames):

  jacket        the whole jacket band (0.36-0.68 H) INCLUDING the warm dithered pixels the v1 rule (neutral grey only)
                threw away, then the median of its darker 50 % (the GIF's shaded jacket), so the 48 px sprite reads as
                the GIF's warm grey-beige rather than pale grey. v1 target kept as jacket-v1.
  jacket-shade  the darker 25 % of the same band (sleeves / sides)
  hair-light    the lighter 20 % of the hair band (top of the mop)
Writes into measure/palette.json (calibrate_albedo.py targets it).
Usage: python3 -I measure_v3.py <workspace>
"""
import json
import statistics as st
import sys

from PIL import Image

W = sys.argv[1]
jacket, hair = [], []
for d in ("south", "north", "east", "west"):
    for i in range(16):
        f = Image.open(f"{W}/ref/{d}-{i:02d}.png").convert("RGBA")
        bb = f.getbbox()
        top, H = bb[1], bb[3] - bb[1]
        for y in range(f.height):
            t = (y - top) / H
            for x in range(f.width):
                r, g, b, a = f.getpixel((x, y))
                if a < 128:
                    continue
                lum = (r + g + b) / 3
                if 0.36 < t < 0.68 and 95 < lum < 210 and b <= r + 6 and not (r > g + 14 and r > b + 22):
                    jacket.append((lum, (r, g, b)))  # greys and warm greys; skin-pink and the dark tee excluded
                elif t < 0.2 and r >= g >= b - 5 and lum < 110:
                    hair.append((lum, (r, g, b)))


def med(px):
    return [int(st.median(c)) for c in zip(*px)]


def hexof(rgb):
    return "#%02x%02x%02x" % tuple(rgb)


jacket.sort()
hair.sort()
n, m = len(jacket), len(hair)
targets = {
    "jacket": med([p for _, p in jacket[: n // 2]]),
    "jacket-shade": med([p for _, p in jacket[: n // 4]]),
    "hair-light": med([p for _, p in hair[int(m * 0.8):]]),
}
pal = json.load(open(f"{W}/measure/palette.json"))
if "jacket-v1" not in pal:
    pal["jacket-v1"] = pal["jacket"]
for k, rgb in targets.items():
    pal[k] = {"rgb": rgb, "hex": hexof(rgb), "samples": n if k.startswith("jacket") else m,
              "rule": "measure_v3.py"}
json.dump(pal, open(f"{W}/measure/palette.json", "w"), indent=2)
print({k: hexof(v) for k, v in targets.items()}, "jacket v1", pal["jacket-v1"]["hex"])

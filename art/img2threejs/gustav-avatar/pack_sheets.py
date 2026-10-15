"""Pack the supersampled avatar frames (render_sheets.mjs) into Phaser sprite sheets.

Per clip and direction one horizontal strip PNG (fixed frame size, the same for every sheet), plus avatar3d.json:
frame size, origin (the ground point under the feet, as a fraction of the frame), display scale back to world
pixels, fps and the yaw each direction was rendered at. Variants: plain, and with a 2 px outline (= 1 screen px
at Street zoom 2, since sheets are 4x world pixels and Street shows 2x) in the city-rules warm near-black.
Usage: python3 -I pack_sheets.py <framesDir> <outDir> [walkFps]
"""
import json
import math
import os
import sys

from PIL import Image, ImageFilter

src, out = sys.argv[1:3]
meta = json.load(open(f"{src}/frames.json"))
SUP = meta["supersample"]
ox, oy = meta["origin"]
ox, oy = ox / SUP, oy / SUP
OUTLINE = (42, 36, 32, 255)
PAD = 4

frames = {}
for f in meta["frames"]:
    im = Image.open(f"{src}/{f['name']}.png").convert("RGBA")
    frames[f["name"]] = im.resize((im.width // SUP, im.height // SUP), Image.LANCZOS)

# one frame rectangle for everything: union of alpha bboxes, symmetric about the ground point
left = right = up = down = 0
for im in frames.values():
    bb = im.getbbox()
    left = max(left, ox - bb[0])
    right = max(right, bb[2] - ox)
    up = max(up, oy - bb[1])
    down = max(down, bb[3] - oy)
half = math.ceil(max(left, right)) + PAD
FW = 2 * half
top = math.ceil(up) + PAD
bottom = math.ceil(down) + PAD
FH = top + bottom
FW += FW % 2
FH += FH % 2


def cut(im):
    x0 = round(ox) - half
    y0 = round(oy) - top
    return im.crop((x0, y0, x0 + FW, y0 + FH))


def outline(im, px=2):
    a = im.split()[3].point(lambda v: 255 if v > 96 else 0)
    grown = a.filter(ImageFilter.MaxFilter(2 * px + 1))
    ring = Image.new("RGBA", im.size, OUTLINE)
    ring.putalpha(grown)
    ring.alpha_composite(im)
    return ring


walk_fps = float(sys.argv[3]) if len(sys.argv) > 3 else 17.78  # 0.8 wu/s over a 0.36 wu, 8-frame cycle
os.makedirs(out, exist_ok=True)
manifest = {
    "frameWidth": FW, "frameHeight": FH,
    "origin": [0.5, round(top / FH, 5)],
    "displayScale": 0.25,
    "note": "sheets are 4x world pixels (0.9 wu = 97 px); displayScale 0.25 draws 0.9 wu = 24 px at zoom 1, 48 px at "
            "Street zoom 2. origin = the ground point under the feet. Rendered from lib/city/models/gustavAvatar.ts "
            "(img2threejs, art/img2threejs/gustav-avatar) in the entrance lab's sprite view: ortho, pitch 30, "
            "converter light.",
    "yaw": meta["yaw"],
    "laptopVisible": meta.get("laptop"),
    "originNote": "x = the midpoint between the feet (createGustavAvatar anchor), y = the ground",
    "animations": {},
}
for clip, info in meta["clips"].items():
    key = "walk" if clip == "walk-in-place" else clip
    fps = walk_fps if key == "walk" else info["frames"] / info["duration"]
    for d in meta["yaw"]:
        names = [f"{clip}-{d}-{i}" for i in range(info["frames"])]
        for variant, fn in (("", lambda im: im), ("-outline", outline)):
            sheet = Image.new("RGBA", (FW * len(names), FH), (0, 0, 0, 0))
            for i, n in enumerate(names):
                sheet.alpha_composite(fn(cut(frames[n])), (i * FW, 0))
            sheet.save(f"{out}/{key}-{d}{variant}.png", optimize=True)
        manifest["animations"][f"{key}_{d}"] = {"file": f"{key}-{d}.png", "outlineFile": f"{key}-{d}-outline.png",
                                                 "frames": len(names), "fps": round(fps, 3),
                                                 "repeat": -1, "durationS": info["duration"]}
json.dump(manifest, open(f"{out}/avatar3d.json", "w"), indent=1)
print("frame", FW, "x", FH, "origin", manifest["origin"], "walk fps", walk_fps)

"""Camera/pose fit for the fixed review view (analysis-by-synthesis, camera group only).

Aligns every candidate render (yaw x walk time) to the reference framing (align_render.py logic) and scores
silhouette IoU against the reference figure mask. Prints the ranking; the best (yaw, t) becomes the review view.
Usage: python3 -I fit_view.py <reference.png> <candidates.json> <renderDir>
  candidates.json: [[name, yaw, t], ...]; renders are <renderDir>/fit-<name>.png (transparent sprite views)
"""
import json
import sys

from PIL import Image

reference, cands, rdir = sys.argv[1:4]
ref = Image.open(reference).convert("L")
rmask = ref.point(lambda v: 255 if v < 245 else 0)
rb = rmask.getbbox()


def aligned_mask(path):
    r = Image.open(path).convert("RGBA")
    fig = r.crop(r.getbbox())
    h = rb[3] - rb[1]
    w = max(1, round(fig.width * h / fig.height))
    a = fig.resize((w, h), Image.LANCZOS).split()[3]
    m = Image.new("L", ref.size, 0)
    m.paste(a, ((rb[0] + rb[2]) // 2 - w // 2, rb[1]))
    return m.point(lambda v: 255 if v > 127 else 0)


def iou(a, b):
    inter = union = 0
    for p, q in zip(a.getdata(), b.getdata()):
        x, y = p > 0, q > 0
        inter += x and y
        union += x or y
    return inter / max(1, union)


rows = []
for name, yaw, t in json.load(open(cands)):
    rows.append((round(iou(rmask, aligned_mask(f"{rdir}/fit-{name}.png")), 4), name, yaw, t))
rows.sort(reverse=True)
for r in rows[:8]:
    print(r)
json.dump([{"iou": r[0], "name": r[1], "yaw": r[2], "t": r[3]} for r in rows], open(f"{rdir}/fit-ranking.json", "w"), indent=1)

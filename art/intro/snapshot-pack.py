# Packs the two captures of art/intro/snapshot.mjs (color.png, ids.png in a work folder) into what the intro loads:
#   public/intro/city.webp        the city by day, lossy (q85): small, so the real city shows within the first second
#   public/intro/city-exact.webp  the same pixels lossless; swapped in when it arrives, so the hand-over is exact
#   public/intro/city-ids.png     8-bit: which building drew each pixel (its placement order, 1..n), 0 the ground,
#                                 255 nothing (the city's own ground colour outside the plot)
#   lib/intro/snapshot.json       the crop in canvas pixels, the grid hash, the sizes
#   python3 -I art/intro/snapshot-pack.py <work> <repo root> <grid hash>
import json, os, sys
from PIL import Image

work, root, grid_hash = sys.argv[1], sys.argv[2], sys.argv[3]
BG = (0x73, 0x64, 0x5F)      # gameConfig backgroundColor, what the canvas shows where nothing is drawn
NONE = 255

color = Image.open(os.path.join(work, "color.png")).convert("RGB")
ids = Image.open(os.path.join(work, "ids.png")).convert("RGB")
w, h = ids.size
src = ids.load()

# Decode the id colours: R,G = the building's order (16 bit), B = the tile class x 40. A sprite's soft edge (tree
# foliage, a shadow) blends its colour with what is under it, so a pixel that decodes to no whole class is given
# to whichever clean neighbour its class value is nearest to (an alpha-over-a-half rule).
rank = [[NONE] * w for _ in range(h)]
odd = []
for y in range(h):
    row = rank[y]
    for x in range(w):
        r, g, b = src[x, y]
        if (r, g, b) == BG:
            continue
        if r == 0 and b % 40 == 0 and 1 <= b // 40 <= 5:
            row[x] = g
        else:
            odd.append((x, y, b))
for x, y, b in odd:
    best, best_d = None, 1e9
    for radius in (1, 2, 3):
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                xx, yy = x + dx, y + dy
                if xx < 0 or yy < 0 or xx >= w or yy >= h: continue
                rr, gg, bb = src[xx, yy]
                if (rr, gg, bb) == BG or rr != 0 or bb % 40 != 0: continue
                d = abs(bb - b) + (abs(dx) + abs(dy)) * 0.01
                if d < best_d: best, best_d = gg, d
        if best is not None: break
    rank[y][x] = best if best is not None else 0

mask = Image.new("L", (w, h), 0)
mp = mask.load()
for y in range(h):
    for x in range(w):
        if rank[y][x] != NONE: mp[x, y] = 255
box = mask.getbbox()
pad = 2
box = (max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad))

out_ids = Image.new("P", (box[2] - box[0], box[3] - box[1]), NONE)
out_ids.putpalette([v for i in range(256) for v in (i, i, i)])
op = out_ids.load()
for y in range(box[1], box[3]):
    for x in range(box[0], box[2]):
        op[x - box[0], y - box[1]] = rank[y][x]

pub = os.path.join(root, "public", "intro")
os.makedirs(pub, exist_ok=True)
crop = color.crop(box)
crop.save(os.path.join(pub, "city.webp"), quality=85, method=6)
crop.save(os.path.join(pub, "city-exact.webp"), lossless=True, method=6)
out_ids.save(os.path.join(pub, "city-ids.png"), optimize=True)
for stale in ("city.png",):
    p = os.path.join(pub, stale)
    if os.path.exists(p): os.remove(p)

size = lambda n: os.path.getsize(os.path.join(pub, n))
meta = {
    "x": box[0], "y": box[1], "w": box[2] - box[0], "h": box[3] - box[1], "canvas": [w, h],
    "gridHash": grid_hash,
    "bytes": {"preview": size("city.webp"), "exact": size("city-exact.webp"), "ids": size("city-ids.png")},
    "softEdgePixels": len(odd),
}
with open(os.path.join(root, "lib", "intro", "snapshot.json"), "w") as f:
    json.dump(meta, f)
print(json.dumps(meta))

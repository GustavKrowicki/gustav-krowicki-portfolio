"""G10 skin-integrity sweep measurement (plugin R6: holes and creases as two numbers).

Frames are rendered on a saturated magenta background the model cannot contain (capture.mjs sweep).
  holes   = background pixels INSIDE the silhouette (not connected to the frame border), kept only in blobs thin
            enough to be a split (no pixel survives a radius-2 erosion), so armpits and the gap between the legs,
            which are legitimate openings, are not counted
  creases = thin dark lines inside the figure: pixels darker than 0.6 x their 7x7 median that vanish under a
            radius-1 opening. Reported, never gated (the R2 trade).
Usage: python3 -I sweep_holes.py <sweep-dir> <binding> -> <sweep-dir>/<binding>-g10.json
"""
import json
import sys
from collections import deque

from PIL import Image, ImageChops, ImageFilter

D, B = sys.argv[1:3]
meta = json.load(open(f"{D}/{B}-frames.json"))


def bg_mask(im):
    r, g, b = im.split()
    m = ImageChops.multiply(r.point(lambda v: 255 if v > 200 else 0), b.point(lambda v: 255 if v > 200 else 0))
    return ImageChops.multiply(m, g.point(lambda v: 255 if v < 80 else 0))


def components(mask):
    w, h = mask.size
    px = mask.load()
    seen = set()
    out = []
    for y in range(h):
        for x in range(w):
            if px[x, y] and (x, y) not in seen:
                q = deque([(x, y)])
                seen.add((x, y))
                blob = []
                while q:
                    cx, cy = q.popleft()
                    blob.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            q.append((nx, ny))
                out.append(blob)
    return out


tot_holes = tot_blobs = tot_creases = 0
per = []
for f in meta["frames"]:
    im = Image.open(f"{D}/{f['name']}.png").convert("RGB")
    bg = bg_mask(im)
    w, h = bg.size
    # exterior background = flood from the border
    from PIL import ImageDraw
    filled = bg.convert("L").copy()
    ImageDraw.floodfill(filled, (0, 0), 128)
    inner = filled.point(lambda v: 255 if v == 255 else 0)  # background not reached from the corner
    eroded = inner.filter(ImageFilter.MinFilter(5))
    holes = blobs = 0
    for blob in components(inner):
        if any(eroded.getpixel(p) for p in blob):
            continue  # a wide opening (legs, armpit), not a split
        holes += len(blob)
        blobs += 1
    lum = im.convert("L")
    med = lum.filter(ImageFilter.MedianFilter(7))
    fig = bg.point(lambda v: 0 if v else 255).filter(ImageFilter.MinFilter(5))
    dark = Image.new("L", lum.size, 0)
    dark.putdata([255 if (fv and l < 0.6 * m) else 0 for l, m, fv in zip(lum.getdata(), med.getdata(), fig.getdata())])
    thin = ImageChops.subtract(dark, dark.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)))
    creases = sum(1 for v in thin.getdata() if v)
    per.append({"frame": f["name"], "holesPx": holes, "holeBlobs": blobs, "creasePx": creases})
    tot_holes += holes
    tot_blobs += blobs
    tot_creases += creases
out = {"binding": B, "clips": len(meta["clips"]), "times": meta["times"], "sides": meta["sides"], "azimuths": meta["azimuths"],
       "frames": len(meta["frames"]), "backgroundThroughSplitPx": tot_holes, "backgroundThroughSplitBlobs": tot_blobs,
       "creasePx": tot_creases, "perFrame": per}
json.dump(out, open(f"{D}/{B}-g10.json", "w"), indent=1)
print(B, "frames", out["frames"], "holes", tot_holes, "blobs", tot_blobs, "creases", tot_creases)

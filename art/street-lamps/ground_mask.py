"""Ground mask for a building whose paved plot takes street lamps (lib/city/streetLights.ts, building.groundMask).

Lamp pools sit in the ground layer, under building sprites, so a lamp standing on a plot that is drawn as part of the
building's sprite would light nothing. This cuts the plot's open paving out of the south sprite: pixels inside the
footprint's diamond in a warm paving colour (r a little above b; not the cool grey of the deck, columns and railings,
nor the blue of the water), kept only where they join up with the plot's front edges, so a raised deck in the same
colour is left out. The scene multiplies each lamp's pool by this mask and draws it over the building.

  python3 art/street-lamps/ground_mask.py <south sprite.png> <footprint w> <footprint h> <out.png>
"""
import sys
from collections import deque
from PIL import Image

src, fw, fh, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
im = Image.open(src).convert("RGBA")
W, H = im.size
s = W / 384  # texture pixels per world pixel (768 px sprites are drawn at 0.5)
half_w, half_h = 22 * s, 11 * s
px = im.load()


def paving(x, y):
    r, g, b, a = px[x, y]
    if a < 250 or r < 120 or r - b < 8:
        return False
    # back to ground coordinates on the plot (the sprite's bottom centre is the plot's front corner)
    sx, sy = (x + 0.5 - W / 2) / half_w, (y + 0.5 - H) / half_h
    gx, gy = fw + (sx + sy) / 2, fh + (sy - sx) / 2
    return 0 <= gx <= fw and 0 <= gy <= fh


# Flood from the paving along the bottom of the sprite (the plot's front edges)
seen = set()
queue = deque()
for y in range(H - int(4 * half_h), H):
    for x in range(W):
        if paving(x, y):
            seen.add((x, y))
            queue.append((x, y))
while queue:
    x, y = queue.popleft()
    for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= n[0] < W and 0 <= n[1] < H and n not in seen and paving(*n):
            seen.add(n)
            queue.append(n)

# White where the paving is, clear elsewhere (the scene cuts each pool with the alpha)
mask = Image.new("RGBA", im.size, (255, 255, 255, 0))
mp = mask.load()
for xy in seen:
    mp[xy] = (255, 255, 255, 255)
mask.save(out, optimize=True)

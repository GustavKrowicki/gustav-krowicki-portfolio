"""Ground mask for a building whose paved plot takes street lamps (lib/city/streetLights.ts, building.groundMask).

Lamp pools sit in the ground layer, under building sprites, so a lamp standing on a plot that is drawn as part of the
building's sprite would light nothing. This cuts the plot's open paving out of the south sprite: pixels inside the
footprint's diamond in a warm paving colour (r a little above b; not the cool grey of the deck, columns and railings,
nor the blue of the water), kept only where they join up with the plot's front edges, so a raised deck in the same
colour is left out. The scene multiplies each lamp's pool by this mask and draws it over the building.
With a deck height (wu) and a second file, the warm pixels left over that lie over the plot at that height are the deck
mask (building.deck): the lamps standing up on the deck light only those.

  python3 art/street-lamps/ground_mask.py <south sprite.png> <footprint w> <footprint h> <out.png> [<deck wu> <deck.png>]
"""
import sys
from collections import deque
from PIL import Image

src, fw, fh, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
deck_h, deck_out = (float(sys.argv[5]), sys.argv[6]) if len(sys.argv) > 6 else (None, None)
PX_PER_WU_UP = 44 / 2 ** 0.5 * 3 ** 0.5 / 2  # 26.94 world px per wu of height (lib/city/units.ts)
im = Image.open(src).convert("RGBA")
W, H = im.size
s = W / 384  # texture pixels per world pixel (768 px sprites are drawn at 0.5)
half_w, half_h = 22 * s, 11 * s
px = im.load()


def paving(x, y, z=0.0):
    r, g, b, a = px[x, y]
    if a < 250 or r < 120 or r - b < 8:
        return False
    # back to plot coordinates at height z (the sprite's bottom centre is the plot's front corner)
    sx, sy = (x + 0.5 - W / 2) / half_w, (y + 0.5 - H + z * PX_PER_WU_UP * s) / half_h
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
def save(pixels, path):
    mask = Image.new("RGBA", im.size, (255, 255, 255, 0))
    mp = mask.load()
    for xy in pixels:
        mp[xy] = (255, 255, 255, 255)
    mask.save(path, optimize=True)


save(seen, out)
if deck_out:
    # the deck is the big patches left over; thin slivers (the plot's kerb) are dropped
    left = {(x, y) for y in range(H) for x in range(W) if (x, y) not in seen and paving(x, y, deck_h)}
    deck = []
    while left:
        start = left.pop()
        part, queue = [start], deque([start])
        while queue:
            x, y = queue.popleft()
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if n in left:
                    left.remove(n)
                    part.append(n)
                    queue.append(n)
        if len(part) >= 2000:
            deck += part
    save(deck, deck_out)

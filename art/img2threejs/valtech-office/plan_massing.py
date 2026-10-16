"""Plan massing of the Valtech office from the board numbers (Figma 576-3613, docs/city-rules.md), drawn with the city
projection (wuToScreen: +x -> (22, 11) px, +y -> (-22, 11) px, up -> 26.94 px per wu) as flat-shaded boxes.
It is the layout + proportion reference for Tier 1 (like lego-hq-avatar/massing.py): made from the plan, not from the mesh.
Style stays with ref A. Usage: python3 plan_massing.py <out.png> [bay]   (bay = the 1 wu south-west bay slice)
"""
import sys
from PIL import Image, ImageDraw

OUT, BAY = sys.argv[1], len(sys.argv) > 2 and sys.argv[2] == "bay"
S = 4.0                                   # px scale (x4 of zoom 1)
GS, ST, TS, NL = 1.4, 1.2, 0.2, 3         # ground storey, storey, white band (slab + parapet), louvre storeys
L, D = (1.0, 2.0) if BAY else (3.0, 2.0)  # x length (east), y depth (south)
COL = {"white": (235, 233, 227), "louvre": (58, 62, 64), "glass": (164, 188, 203), "dark": (40, 48, 55),
       "awning": (62, 98, 83), "pave": (185, 178, 168), "roof": (188, 179, 168), "planter": (29, 29, 32)}


def P(x, y, z):
    return (S * 22 * (x - y), S * (11 * (x + y) - 26.94 * z))


boxes = []   # (x0, y0, z0, x1, y1, z1, colour)


def b(x0, y0, z0, x1, y1, z1, c):
    boxes.append((x0, y0, z0, x1, y1, z1, c))


b(0, 0, 0, L, D, 0.04, "pave")
b(0, 0, 0.04, L if BAY else 2.0, D - 0.45, GS, "dark")      # ground storey set back behind the column line
for x in ([0, 0.93] if BAY else [0, 0.93, 1.93]):
    b(x, D - 0.14, 0.04, x + 0.14, D, GS, "white")           # columns
if not BAY:
    b(2.0, 0, 0.04, 3.0, 0.55, GS, "white")                   # lobby block behind the gate
    b(2.05, 0.55, 0.04, 2.88, D, 0.05, "dark")                # gate passage floor
    b(2.0, 0.55, 0.04, 2.05, D, 1.19, "white")                # passage reveals
    b(2.88, 0.55, 0.04, 3.0, D, GS, "white")                  # east end wall
    b(2.0, 0.55, 1.19, 3.0, D, GS, "white")                   # lintel
    b(2.36, 0.53, 0.04, 2.6, 0.55, 1.04, "glass")             # lit door at the end
    b(2.02, D - 0.05, 1.12, 2.9, D + 0.45, 1.3, "awning")     # gate awning
for x0 in ([0.14] if BAY else [0.14, 1.07]):
    b(x0, D - 0.45, 0.98, x0 + 0.79, D - 0.03, 1.22, "awning")  # awnings (as a block)
    b(x0 + 0.1, D - 0.32, 0.04, x0 + 0.6, D - 0.14, 0.24, "planter")
for k in range(NL + 1):
    z = GS + k * ST
    b(0, 0, z, L, D, z + TS, "white")                         # slabs
    if k < NL:
        b(0.04, 0.04, z + TS, L - 0.04, D - 0.04, z + ST, "louvre")   # louvre band (dark windows behind thin warm grey slats)
top = GS + NL * ST + TS
b(0.38 if not BAY else 0.38, 0.3, top, L - (0.26 if not BAY else 0.0), D - 0.3, top + 1.1, "glass")   # recessed top floor
b(0.33, 0.25, top + 1.1, L - (0.21 if not BAY else 0.0), D - 0.25, top + 1.2, "white")                 # its roof

pts = [P(x, y, z) for bx_ in boxes for x in bx_[0:4:3] for y in bx_[1:5:3] for z in bx_[2:6:3]]
minx, maxx = min(p[0] for p in pts), max(p[0] for p in pts)
miny, maxy = min(p[1] for p in pts), max(p[1] for p in pts)
pad = 40
im = Image.new("RGBA", (int(maxx - minx) + 2 * pad, int(maxy - miny) + 2 * pad), (255, 255, 255, 0))   # transparent: exact silhouette
d = ImageDraw.Draw(im)


def q(p):
    return (p[0] - minx + pad, p[1] - miny + pad)


def shade(c, f):
    return tuple(int(v * f) for v in COL[c])


# painter's order: storey by storey from the ground up, far (small x + y) first within a storey
for x0, y0, z0, x1, y1, z1, c in sorted(boxes, key=lambda t: (0 if t[2] < GS - 1e-6 else 1 + int((t[2] - GS + 1e-6) // ST), t[0] + t[1] + t[3] + t[4], t[2])):
    d.polygon([q(P(x0, y0, z1)), q(P(x1, y0, z1)), q(P(x1, y1, z1)), q(P(x0, y1, z1))], fill=shade(c, 1.0))     # top
    d.polygon([q(P(x0, y1, z0)), q(P(x1, y1, z0)), q(P(x1, y1, z1)), q(P(x0, y1, z1))], fill=shade(c, 0.86))    # south
    d.polygon([q(P(x1, y0, z0)), q(P(x1, y1, z0)), q(P(x1, y1, z1)), q(P(x1, y0, z1))], fill=shade(c, 0.72))    # east
im.save(OUT)
print(OUT, im.size)

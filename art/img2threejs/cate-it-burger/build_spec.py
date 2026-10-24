"""ObjectSculptSpec for the burger trailer on the food truck square (Linear POR-38), as a 4 x 2 tile city building.

Gustav, 2026-10-20: size B, the real 4.6 x 2.1 m body scaled x1.35 in plan (3.1 x 1.42 wu), height not scaled (body
bottom 0.32 wu, top 1.5 wu). Three trailers stand in a half circle on a 7 x 7 square around beer tables.
Shape and style: ref/ai-ref-run1.png (its brand, slogans and hand logos are ignored) and two photos (shape only).
Check every round against ref/must-be-true.md.

Frame: 1 unit = 1 wu. +Y up, the ground pad top at y = G, the 4 x 2 footprint centred on the origin: X along the trailer
(4 wu, -2..2), Z across (2 wu, -1..1). The serving side is +Z (south, faces the default camera); the tow bar is at +X.
The body sits back from the serving edge (centre z = BZ) so the lifted awning stays inside the footprint.
"""
import copy
import json
import math
import os
import sys

# One spec, three trailers: TRAILER=burger (polished steel, this folder), pizza or african (art/img2threejs/cate-it-pizza and
# cate-it-african run this file with TRAILER set): the same body, wheels, tow bar and sign; its own colours, awning and kitchen.
TRAILER = os.environ.get("TRAILER", "burger")
PIZZA = TRAILER == "pizza"
AFRICAN = TRAILER == "african"
BODY = {"pizza": "paint", "african": "paint-ochre"}.get(TRAILER, "steel")              # body, closed north plate, door
SKIRT = {"pizza": "paint-red", "african": "paint-terracotta"}.get(TRAILER, "steel-dark")
BAND = {"pizza": "paint-green"}.get(TRAILER, "band-dark")

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
REF = "ai1"
spec["viewEvidence"] = [
    {"id": REF, "view": "primary: AI image of the trailer, serving side (shape, style, colour; text and logos ignored)",
     "image": f"{W}/ref/ai-ref-run1.png", "imageRegion": {"x": 0.02, "y": 0.05, "width": 0.96, "height": 0.8, "units": "normalized"},
     "observations": ["polished steel box with rounded ends", "long hatch with the lid lifted as a flat awning on two struts",
                      "warm-lit inside with a steel back wall and a menu screen", "dark band along the roof edge",
                      "sign on wooden posts on the roof", "two axles close together, short tow bar"],
     "confidence": 0.8},
]

G = 0.02                   # ground pad
HX, HZ = 2.0, 1.0          # footprint half sizes
L, WD = 3.1, 1.42          # body length (x) and width (z)
ZB, ZT = 0.32, 1.5         # body bottom and top
BZ = -0.24                 # body centre z: back 0.05 from the north edge, the awning stays inside the south edge
Z0, Z1 = BZ - WD / 2, BZ + WD / 2
RT, RB = 0.36, 0.1         # top and bottom corner radii of the side profile (rounded ends, rounded roof edge)
HXO = 1.17                 # hatch opening half length (x)
HY0, HY1 = 0.74, 1.3       # hatch opening bottom and top
BACK = Z1 - 0.3            # inside back wall (z): shallow, so the 30 deg camera sees the wall and not only the floor


def r4(v):
    return [round(float(x), 4) for x in v]


def comp(cid, name, level, role, primitive, dims, pos, material, *, rot=None, importance=0.6, conf=0.75, features=None,
         evidence=None, topo="", sockets=None, contact="flush-mount", start=None, end=None, radius=None, parent="root",
         scale=None, descriptor=None):
    c = copy.deepcopy(root_t)
    c.update({"id": cid, "name": name, "level": level, "role": role, "importance": importance, "confidence": conf,
              "primitive": primitive, "topologyClass": "assembled-solid",
              "topologyRationale": topo or f"Hard-surface {role}: a {primitive} at sprite scale.", "parent": parent,
              "material": material, "materialLayers": [material], "localFeatures": features or [],
              "evidenceRefs": evidence or [REF]})
    gd = c["geometryDescriptor"]
    gd["topologyIntent"] = "hard-surface, flat faces, crisp edges"
    gd["edgeTreatment"] = {"type": "none", "bevelRadius": 0.0, "segments": 1}
    if descriptor:
        gd.update(descriptor)
    c["dimensions"] = {"width": round(dims[0], 4), "height": round(dims[1], 4), "depth": round(dims[2], 4),
                       "units": "wu (1 tile edge, ~2 m)", "confidence": conf}
    p = list(pos) if parent is None else [pos[0], pos[1] - G / 2, pos[2]]
    c["transform"] = {"position": r4(p), "rotation": r4(rot or [0, 0, 0]), "scale": r4(scale or dims)}
    ap = c["actionProfile"]
    ap["animationRole"] = "static"
    ap["pivot"] = {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": conf}
    ap["transformChannels"] = {"translate": False, "rotate": False, "scale": False, "bend": False, "twist": False,
                               "detach": False, "visibility": True, "materialState": True}
    ap["collider"] = {"type": "box", "offset": [0, 0, 0], "scale": r4(dims), "isTrigger": False, "notes": "box proxy"}
    ap["constraints"] = []
    ap["sockets"] = sockets or []
    ap["destruction"] = {"breakable": False, "fractureGroup": cid, "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0,
                         "debrisMaterial": material}
    if parent is None:
        c["attachment"] = None
    else:
        s = start or (pos[0], G, pos[2])
        e = end or (pos[0], G + dims[1], pos[2])
        a = {"parentId": parent, "parentSocket": "ground-top", "localStart": r4((s[0], s[1] - G / 2, s[2])),
             "localEnd": r4((e[0], e[1] - G / 2, e[2])), "contactType": contact, "embedDepth": 0.002, "gapTolerance": 0.002}
        if radius:
            a.update(baseRadius=radius, endRadius=radius)
        c["attachment"] = a
    c["fidelityTier"] = "game-prop"
    return c


C = []


def lf(fid, kind, notes):
    return [{"id": fid, "kind": kind, "notes": notes}]


def bx(cid, name, level, role, x0, x1, y0, y1, z0, z1, material, *, contact="resting", rot=None, **kw):
    y0, y1 = G + y0, G + y1
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    C.append(comp(cid, name, level, role, "box", (x1 - x0, y1 - y0, z1 - z0), (cx, (y0 + y1) / 2, cz), material, contact=contact,
                  start=(cx, y0, cz), end=(cx, y1, cz), rot=rot, **kw))


def zcyl(cid, name, level, role, x, y, r, z0, z1, material, **kw):
    """A cylinder lying along Z (wheels, rims): radius r, centre height y, from z0 to z1."""
    C.append(comp(cid, name, level, role, "cylinder", (2 * r, z1 - z0, 2 * r), (x, G + y, (z0 + z1) / 2), material,
                  contact="resting", start=(x, G + y, z0), end=(x, G + y, z1), radius=r, **kw))


def rod(cid, name, level, role, p0, p1, r, material, **kw):
    """A thin box rod from p0 to p1 (x, y, z above the pad): the awning struts and the tow bar arms."""
    (x0, y0, z0), (x1, y1, z1) = p0, p1
    dx, dy, dz = x1 - x0, y1 - y0, z1 - z0
    n = math.sqrt(dx * dx + dy * dy + dz * dz)
    d = (dx / n, dy / n, dz / n)                   # local +Z along the rod
    up = (0.0, 1.0, 0.0) if abs(d[1]) < 0.95 else (1.0, 0.0, 0.0)
    xa = (up[1] * d[2] - up[2] * d[1], up[2] * d[0] - up[0] * d[2], up[0] * d[1] - up[1] * d[0])
    k = math.sqrt(sum(v * v for v in xa)); xa = tuple(v / k for v in xa)
    ya = (d[1] * xa[2] - d[2] * xa[1], d[2] * xa[0] - d[0] * xa[2], d[0] * xa[1] - d[1] * xa[0])
    m = [[xa[0], ya[0], d[0]], [xa[1], ya[1], d[1]], [xa[2], ya[2], d[2]]]   # columns = local axes
    ey = math.asin(max(-1.0, min(1.0, m[0][2])))   # three.js Euler 'XYZ' from the matrix
    ex, ez = math.atan2(-m[1][2], m[2][2]), math.atan2(-m[0][1], m[0][0])
    pitch, yaw = ex, ey
    C.append(comp(cid, name, level, role, "box", (r, r, n), ((x0 + x1) / 2, G + (y0 + y1) / 2, (z0 + z1) / 2), material,
                  rot=[ex, ey, ez], contact="flush-mount", start=(x0, G + y0, z0), end=(x1, G + y1, z1), **kw))


def arc(cx, cy, r, a0, a1, n=6):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
            for i in range(n + 1)]


def side_profile(hx, yb, yt, rt, rb):
    """Side elevation of the body (x, y), counter-clockwise: rounded top corners (the rounded ends and roof edge),
    small rounded bottom corners."""
    pts = arc(hx - rb, yb + rb, rb, -90, 0, 3) + arc(hx - rt, yt - rt, rt, 0, 90, 7) \
        + arc(-hx + rt, yt - rt, rt, 90, 180, 7) + arc(-hx + rb, yb + rb, rb, 180, 270, 3)
    return pts


# ---------------------------------------------------------------------------------------------------------------
C.append(comp("root", "Ground pad", "macro", "base", "box", (2 * HX, G, 2 * HZ), (0, G / 2, 0), "paving", parent=None,
              importance=0.7, conf=0.95, sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "top of the pad"}],
              features=lf("root.pad", "contour", f"{2 * HX:g} x {2 * HZ:g} wu square paving = the footprint"),
              topo="Flat pad: a box exactly the size of the footprint."))

# body: the side profile extruded across the trailer, with the hatch opening cut through (the north side is closed
# again by a plate, so only the serving side is open)
hole = [(-HXO, HY0), (-HXO, HY1), (HXO, HY1), (HXO, HY0)]          # clockwise: against the outer loop
profile = {"points": [r4(p) for p in side_profile(L / 2, ZB, ZT, RT, RB)], "depth": WD, "holes": [[r4(p) for p in hole]]}
C.append(comp("body", "Steel body", "macro", "body", "extrude", (L, ZT - ZB, WD), (0, G, Z0), BODY, scale=[1, 1, 1],
              descriptor={"profile2D": profile}, contact="resting", start=(0, G + ZB, BZ), end=(0, G + ZT, BZ), importance=0.95,
              features=lf("body.rounded", "contour", "long steel box with rounded ends and rounded roof edge"),
              topo="Body: the side elevation (rounded corners) extruded across, the hatch opening as a hole."))
bx("body-north-plate", "Closed north side", "meso", "body", -HXO - 0.02, HXO + 0.02, HY0 - 0.02, HY1 + 0.02, Z0 - 0.004, Z0 + 0.04, BODY,
   contact="flush-mount", importance=0.3)
bx("skirt", "Lower steel band", "meso", "body", -L / 2 + 0.06, L / 2 - 0.06, ZB, ZB + (0.16 if PIZZA else 0.1), Z0 - 0.01, Z1 + 0.01, SKIRT,
   importance=0.4, topo="Darker steel along the bottom of the body: a box.")
for s, z in (("S", Z1), ("N", Z0)):
    zz = (z, z + 0.012) if s == "S" else (z - 0.012, z)
    bx(f"roof-band-{s}", f"Dark roof band {s}", "meso", "body", -L / 2 + RT - 0.06, L / 2 - RT + 0.06, 1.35, 1.46, min(zz), max(zz),
       BAND, contact="flush-mount", importance=0.6,
       features=lf("roof-band-S.blank", "contour", "dark band along the roof edge, no text") if s == "S" else None)

if AFRICAN:
    # a row of small cream diamonds on the dark roof band (south side): a simple geometric pattern, no text
    for k in range(13):
        dx = -L / 2 + RT + (L - 2 * RT) * (k + 0.5) / 13
        bx(f"band-diamond-{k + 1}", f"Band diamond {k + 1}", "micro", "body", dx - 0.035, dx + 0.035, 1.37, 1.44, Z1 + 0.012, Z1 + 0.018,
           "canvas-cream", contact="flush-mount", rot=[0, 0, math.pi / 4], importance=0.3,
           features=lf("band-diamond-1.pattern", "contour", "cream diamonds on the roof band") if k == 0 else None)

# inside: warm-lit back wall of steel, warm end walls and ceiling light, a steel work top, the hood and the menu screen
bx("hatch-back", "Inside back wall", "meso", "inside", -HXO, HXO, HY0, HY1, Z0 + 0.04, BACK, "back-wall", importance=0.8,
   features=lf("hatch-back.lit", "contour", "warm-lit inside with a steel back wall"), topo="Back wall: a box filling the body behind the opening.")
for s, x0, x1 in (("W", -HXO, -HXO + 0.03), ("E", HXO - 0.03, HXO)):
    bx(f"inside-end-{s}", f"Inside end wall {s}", "micro", "inside", x0, x1, HY0, HY1, BACK, Z1 - 0.01, "inside-warm", importance=0.4)
bx("inside-light", "Ceiling light", "micro", "inside", -HXO, HXO, HY1 - 0.03, HY1, BACK, Z1 - 0.01, "light-warm", importance=0.5)
bx("inside-floor", "Inside work top", "micro", "inside", -HXO, HXO, HY0, HY0 + 0.05, BACK, Z1 - 0.06, "back-wall", importance=0.4)
if PIZZA:
    # a stone pizza oven on the work top at the west end of the hatch, its mouth glowing, its flue up through the roof
    bx("oven", "Pizza oven", "meso", "inside", -1.1, -0.42, HY0 + 0.05, HY0 + 0.36, BACK, BACK + 0.24, "brick", importance=0.7,
       features=lf("oven.dome", "contour", "stone pizza oven with a glowing mouth"))
    C.append(comp("oven-dome", "Oven dome", "micro", "inside", "ellipsoid", (0.62, 0.3, 0.26), (-0.76, G + HY0 + 0.36, BACK + 0.12), "brick",
                  contact="resting", importance=0.5))
    bx("oven-mouth", "Oven mouth", "micro", "inside", -0.9, -0.62, HY0 + 0.1, HY0 + 0.26, BACK + 0.24, BACK + 0.25, "fire", contact="flush-mount",
       importance=0.6)
    C.append(comp("flue", "Oven flue", "meso", "roof", "cylinder", (0.1, 0.62, 0.1), (-1.32, G + ZT + 0.26, BZ - 0.36), "steel-dark",
                  contact="resting", start=(-1.32, G + ZT - 0.08, BZ - 0.36), end=(-1.32, G + ZT + 0.57, BZ - 0.36), radius=0.05, importance=0.7,
                  features=lf("flue.pipe", "contour", "steel flue pipe from the oven up through the roof")))
    bx("flue-cap", "Flue cap", "micro", "roof", -1.41, -1.23, ZT + 0.57, ZT + 0.61, BZ - 0.45, BZ - 0.27, "steel-dark", importance=0.4)
elif AFRICAN:
    # a charcoal grill at the west end of the hatch (its coals glowing) and a big cooking pot on the work top
    bx("grill", "Charcoal grill", "meso", "inside", -1.1, -0.5, HY0 + 0.05, HY0 + 0.2, BACK + 0.02, Z1 - 0.08, "steel-dark", importance=0.6,
       features=lf("grill.coals", "contour", "charcoal grill with glowing coals"))
    bx("grill-coals", "Glowing coals", "micro", "inside", -1.06, -0.54, HY0 + 0.2, HY0 + 0.215, BACK + 0.05, Z1 - 0.11, "fire", importance=0.6)
    bx("grill-vents", "Grill air vents", "micro", "inside", -1.04, -0.56, HY0 + 0.09, HY0 + 0.15, Z1 - 0.08, Z1 - 0.07, "fire", contact="flush-mount",
       importance=0.5)
    C.append(comp("pot", "Cooking pot", "meso", "inside", "cylinder", (0.26, 0.2, 0.26), (-0.12, G + HY0 + 0.15, BACK + 0.15), "pot",
                  contact="resting", start=(-0.12, G + HY0 + 0.05, BACK + 0.15), end=(-0.12, G + HY0 + 0.25, BACK + 0.15), radius=0.13,
                  importance=0.6, features=lf("pot.big", "contour", "big cooking pot on the work top")))
    bx("pot-lid", "Pot lid", "micro", "inside", -0.24, 0.0, HY0 + 0.25, HY0 + 0.27, BACK + 0.03, BACK + 0.27, "steel-light", importance=0.3)
else:
    bx("hood", "Extractor hood", "micro", "inside", -0.9, -0.1, HY1 - 0.13, HY1 - 0.03, BACK, BACK + 0.13, "steel-dark", importance=0.5,
       features=lf("hood.box", "contour", "steel extractor hood over the grill"))
bx("menu-screen", "Chalkboard menu" if PIZZA else "Menu screen", "micro", "inside", 0.74, 1.04, HY0 + 0.06, HY1 - 0.1, Z1 - 0.1, Z1 - 0.07,
   {"pizza": "chalk", "african": "wood-board"}.get(TRAILER, "screen"), importance=0.5,
   features=lf("menu-screen.lit", "contour", "lit menu screen standing at one end of the hatch, facing out"))

# serving counter under the opening, full width
bx("counter", "Steel counter shelf", "meso", "hatch", -HXO - 0.04, HXO + 0.04, HY0 - 0.04, HY0, Z1 - 0.02, Z1 + 0.15, "steel-light",
   importance=0.6, features=lf("counter.shelf", "contour", "steel counter shelf under the opening, full width"))

# the hatch lid lifted up and out as a flat awning, held by two thin struts
AW_OUT, AW_T = 0.44, 0.03
aw_tilt = math.radians(5)            # nearly flat: steeper lids are seen edge-on from the city camera
aw_y = HY1 + 0.03 + AW_OUT / 2 * math.sin(aw_tilt)
if PIZZA:
    # a striped canvas awning in place of the steel lid: red and cream stripes across, the same tilt
    n = 8
    for k in range(n):
        x0 = -HXO - 0.04 + k * (2 * HXO + 0.08) / n
        C.append(comp(f"awning-{k + 1}", f"Awning stripe {k + 1}", "meso", "hatch", "box", ((2 * HXO + 0.08) / n, AW_T, AW_OUT),
                      (x0 + (HXO + 0.04) / n, G + aw_y, Z1 + AW_OUT / 2 * math.cos(aw_tilt)), "canvas-red" if k % 2 == 0 else "canvas-cream",
                      rot=[-aw_tilt, 0, 0], contact="flush-mount", start=(x0, G + HY1 + 0.03, Z1), end=(x0, G + aw_y, Z1 + AW_OUT),
                      importance=0.7, features=lf("awning.lid", "contour", "striped canvas awning") if k == 0 else None))
else:
    # burger: the steel lid; african: a terracotta canvas awning, the same shape
    C.append(comp("awning", "Canvas awning" if AFRICAN else "Hatch lid awning", "meso", "hatch", "box", (2 * HXO + 0.08, AW_T, AW_OUT), (0, G + aw_y, Z1 + AW_OUT / 2 * math.cos(aw_tilt)), "canvas-terracotta" if AFRICAN else "steel",
                  rot=[-aw_tilt, 0, 0], contact="flush-mount", start=(0, G + HY1 + 0.03, Z1), end=(0, G + aw_y, Z1 + AW_OUT), importance=0.8,
                  features=lf("awning.lid", "contour", "hatch lid lifted as a flat awning")))
bx("hinge", "Lid hinge strip", "micro", "hatch", -HXO - 0.04, HXO + 0.04, HY1, HY1 + 0.04, Z1, Z1 + 0.03, "steel-dark", contact="flush-mount",
   importance=0.3)
for i, x in enumerate((-HXO + 0.05, HXO - 0.05), 1):
    rod(f"strut-{i}", f"Awning strut {i}", "micro", "hatch", (x, HY0 + 0.12, Z1 + 0.01), (x, HY1 + 0.03 + (AW_OUT - 0.06) * math.sin(aw_tilt), Z1 + (AW_OUT - 0.06) * math.cos(aw_tilt)), 0.025,
        "steel-dark", importance=0.4)

# running gear: two axles close together under the middle, two wheels a side with silver rims
AX = 0.23
WR, WT = 0.16, 0.1
for i, x in enumerate((-AX, AX), 1):
    bx(f"axle-{i}", f"Axle {i}", "micro", "chassis", x - 0.03, x + 0.03, WR - 0.03, WR + 0.03, Z0 + 0.1, Z1 - 0.1, "rubber", importance=0.2)
    for s, z0, z1 in (("S", Z1 - WT, Z1), ("N", Z0, Z0 + WT)):
        zcyl(f"wheel-{s}-{i}", f"Wheel {s}{i}", "meso", "chassis", x, WR, WR, z0, z1, "rubber", importance=0.6)
        rz = (z1, z1 + 0.012) if s == "S" else (z0 - 0.012, z0)
        zcyl(f"rim-{s}-{i}", f"Rim {s}{i}", "micro", "chassis", x, WR, 0.09, rz[0], rz[1], "rim", importance=0.4,
             features=lf("wheel-S-1.rim", "contour", "silver rim") if (s == "S" and i == 1) else None)
bx("fender-S", "Wheel arch S", "micro", "chassis", -AX - WR - 0.06, AX + WR + 0.06, ZB - 0.02, ZB + 0.03, Z1 - 0.2, Z1 + 0.02, "steel-dark",
   importance=0.3)

# short tow bar at +X: an A-frame to the hitch, with a support leg
HIT = (1.93, 0.27, BZ)
for i, z in enumerate((BZ - 0.42, BZ + 0.42), 1):
    rod(f"towbar-{i}", f"Tow bar arm {i}", "micro", "chassis", (L / 2 - 0.05, 0.3, z), HIT, 0.05, "steel-dark", importance=0.4)
bx("hitch", "Hitch", "micro", "chassis", 1.86, 1.97, 0.22, 0.31, BZ - 0.05, BZ + 0.05, "steel-dark", importance=0.3)
bx("jockey", "Jockey leg", "micro", "chassis", 1.87, 1.91, 0.09, 0.27, BZ - 0.02, BZ + 0.02, "steel-dark", importance=0.2)
zcyl("jockey-wheel", "Jockey wheel", "micro", "chassis", 1.89, 0.05, 0.05, BZ - 0.025, BZ + 0.025, "rubber", importance=0.2)

# east end (the tow-bar end): gas bottle box on the A-frame, corner steadies, a vent grille and marker lights
bx("gas-box", "Gas bottle box", "meso", "end", 1.6, 1.82, 0.3, 0.56, BZ - 0.22, BZ + 0.22, "steel-light", importance=0.5,
   features=lf("gas-box.lid", "contour", "steel gas bottle box on the tow bar"))
bx("gas-box-lid", "Gas box lid", "micro", "end", 1.59, 1.83, 0.56, 0.59, BZ - 0.23, BZ + 0.23, "steel-dark", importance=0.3)
for s, z in (("S", Z1 - 0.1), ("N", Z0 + 0.1)):
    bx(f"steady-E-{s}", f"Corner steady E{s}", "micro", "chassis", 1.36, 1.4, 0.0, ZB, z - 0.02, z + 0.02, "steel-dark", importance=0.2)
    bx(f"steady-W-{s}", f"Corner steady W{s}", "micro", "chassis", -1.4, -1.36, 0.0, ZB, z - 0.02, z + 0.02, "steel-dark", importance=0.2)
    bx(f"marker-E-{s}", f"Marker light E{s}", "micro", "end", L / 2 - 0.004, L / 2 + 0.012, 0.47, 0.55, z - 0.05, z + 0.05, "amber",
       contact="flush-mount", importance=0.3)
bx("vent-grille", "Vent grille", "micro", "end", L / 2 - 0.004, L / 2 + 0.012, 0.9, 1.06, BZ - 0.26, BZ + 0.26, "band-dark", contact="flush-mount",
   importance=0.4, features=lf("vent-grille.slots", "contour", "dark vent grille high on the tow-bar end"))

# west end (the far end): the staff door in the end wall, since the kitchen runs along the inside of the back wall
# (Gustav, 2026-10-21). The end wall is flat up to y = ZT - RT; the door frame stands a little proud so its top clears the
# rounded corner.
WX = -L / 2                    # end wall
DZ0, DZ1 = BZ - 0.2, BZ + 0.2  # door, 0.4 wu wide, centred on the end
DY0, DY1 = 0.38, 1.3           # 0.92 wu high: as tall as the flat part of the rounded end allows
bx("door-frame", "Staff door frame", "meso", "west", WX - 0.03, WX + 0.12, DY0 - 0.02, DY1 + 0.04, DZ0 - 0.04, DZ1 + 0.04, "steel-dark",
   contact="flush-mount", importance=0.5)
bx("door", "Staff door", "meso", "west", WX - 0.045, WX - 0.03, DY0, DY1, DZ0, DZ1, BODY, contact="flush-mount", importance=0.6,
   features=lf("door.staff", "contour", "steel staff door in the far end wall with a small window"))
bx("door-window", "Door window", "micro", "west", WX - 0.052, WX - 0.045, 0.98, 1.2, DZ0 + 0.08, DZ1 - 0.08, "glass-dark", contact="flush-mount",
   importance=0.4)
bx("door-handle", "Door handle", "micro", "west", WX - 0.07, WX - 0.045, 0.8, 0.84, DZ1 - 0.1, DZ1 - 0.04, "steel-dark", contact="flush-mount",
   importance=0.2)
bx("door-step", "Door step", "micro", "west", WX - 0.2, WX - 0.03, 0.2, 0.24, DZ0 - 0.02, DZ1 + 0.02, "steel-dark", importance=0.3)
bx("west-marker-S", "Marker light WS", "micro", "west", WX - 0.012, WX + 0.004, 0.47, 0.55, Z1 - 0.15, Z1 - 0.05, "red-light",
   contact="flush-mount", importance=0.3)
bx("west-marker-N", "Marker light WN", "micro", "west", WX - 0.012, WX + 0.004, 0.47, 0.55, Z0 + 0.05, Z0 + 0.15, "red-light",
   contact="flush-mount", importance=0.3)

# north side (the back, closed): a warm sliding window over the kitchen line and a power hookup
bx("side-window-frame", "Sliding window frame", "micro", "north", -0.32, 0.32, 0.92, 1.26, Z0 - 0.012, Z0 + 0.01, "steel-dark",
   contact="flush-mount", importance=0.4)
bx("side-window", "Sliding window", "micro", "north", -0.29, 0.29, 0.95, 1.23, Z0 - 0.02, Z0 - 0.008, "glass-warm", contact="flush-mount",
   importance=0.5, features=lf("side-window.lit", "contour", "small warm-lit sliding window on the back"))
bx("side-window-mid", "Window slide bar", "micro", "north", -0.01, 0.01, 0.95, 1.23, Z0 - 0.026, Z0 - 0.02, "steel-dark", contact="flush-mount",
   importance=0.2)
bx("power-box", "Power hookup", "micro", "north", 1.16, 1.3, 0.44, 0.6, Z0 - 0.03, Z0 + 0.01, "band-dark", contact="flush-mount", importance=0.3)

# roof sign on two wooden posts: a blank dark board (its content is still open)
SY0, SY1 = ZT + 0.3, ZT + 0.68
SW = 1.2                       # board half width: wider than half the trailer
for i, x in enumerate((-0.78, 0.78), 1):
    bx(f"sign-post-{i}", f"Sign post {i}", "micro", "sign", x - 0.04, x + 0.04, ZT - 0.02, SY0 + 0.1, BZ - 0.04, BZ + 0.04, "wood",
       importance=0.5)
    rod(f"sign-brace-{i}", f"Sign brace {i}", "micro", "sign", (x - 0.3 * (1 if x < 0 else -1), ZT, BZ), (x, SY0 - 0.04, BZ), 0.04,
        "wood", importance=0.3)
bx("sign-board", "Sign board", "meso", "sign", -SW, SW, SY0, SY1, BZ + 0.04, BZ + 0.11, "sign-dark", importance=0.7,
   features=lf("sign-board.blank", "contour", "blank dark sign board on the posts"))
bx("sign-frame", "Sign top edge", "micro", "sign", -SW - 0.02, SW + 0.02, SY1, SY1 + 0.03, BZ + 0.03, BZ + 0.12, "steel-dark",
   importance=0.2)


# ---------------------------------------------------------------------------------------------------------------
def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.02, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.02, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    m.update({"emissive": color, "emissiveIntensity": {"base": 0.25}})
    m.update({"textureless": {"declared": True, "evidence": ["ref/ai-ref-run1.png (flat-shaded AI image)", "flat colour at sprite size"]}})
    m.update(extra)
    for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
        m.pop(field, None)
    return m


spec["materials"] = [
    material("paving", "Square paving", "stone", "#ddd6c8", ["#d3ccbe"], 0.9, 0.0, "light paving of the food truck square"),
    material("steel", "Polished steel", "metal", "#c9d0d5", ["#bec5ca"], 0.35, 0.3, "polished steel body, light grey to silver",
             localOverrides=[{"id": "steel.polish", "kind": "linework", "notes": "reflections below sprite size: flat light steel"}],
             emissiveIntensity={"base": 0.3}),
    material("steel-dark", "Dark steel", "metal", "#7f878e", ["#788087"], 0.5, 0.3, "darker steel at the bottom, struts, tow bar"),
    material("steel-light", "Bright steel", "metal", "#dde1e4", ["#d4d8db"], 0.35, 0.2, "counter shelf and work top", emissiveIntensity={"base": 0.4}),
    material("steel-hood", "Hood steel", "metal", "#a9b0b6", ["#a0a7ad"], 0.4, 0.3, "extractor hood"),
    material("band-dark", "Dark band", "stone", "#23282c", ["#1f2427"], 0.6, 0.0, "dark band along the roof edge (no text)"),
    material("back-wall", "Warm-lit steel back wall", "metal", "#eeae74", ["#e6a66c"], 0.4, 0.1, "steel back wall in warm light",
             emissiveIntensity={"base": 0.6}),
    material("inside-warm", "Warm inside", "stone", "#e8894a", ["#df8044"], 0.7, 0.0, "warm orange inside walls", emissiveIntensity={"base": 0.6}),
    material("light-warm", "Warm light", "stone", "#ffe2b0", ["#ffdba3"], 0.5, 0.0, "ceiling light strip", emissiveIntensity={"base": 0.9}),
    material("screen", "Menu screen", "glass", "#cfeaf6", ["#c4e2f0"], 0.2, 0.0, "lit menu screen", emissiveIntensity={"base": 0.9}),
    material("rubber", "Tyres", "stone", "#2e2f33", ["#2a2b2f"], 0.9, 0.0, "tyres and axles"),
    material("rim", "Silver rims", "metal", "#d4d8db", ["#cbd0d3"], 0.3, 0.3, "silver rims", emissiveIntensity={"base": 0.4}),
    material("amber", "Marker lights", "glass", "#f2a33a", ["#ea9b33"], 0.3, 0.0, "amber marker lights", emissiveIntensity={"base": 0.7}),
    material("glass-dark", "Dark glass", "glass", "#2f3a44", ["#29333c"], 0.3, 0.0, "door window"),
    material("glass-warm", "Warm-lit glass", "glass", "#f1b77f", ["#e9af77"], 0.3, 0.0, "back window, lit from inside", emissiveIntensity={"base": 0.55}),
    material("red-light", "Rear marker lights", "glass", "#d8423a", ["#cf3b34"], 0.3, 0.0, "red rear marker lights", emissiveIntensity={"base": 0.6}),
    material("paint", "Cream paint", "stone", "#efe4c8", ["#e7dcc0"], 0.6, 0.0, "cream painted body (pizza trailer)", emissiveIntensity={"base": 0.3},
             localOverrides=[{"id": "paint.flat", "kind": "linework", "notes": "panel seams below sprite size: flat cream"}]),
    material("paint-red", "Red paint", "stone", "#b8392c", ["#ae3328"], 0.6, 0.0, "red lower band (pizza trailer)"),
    material("paint-green", "Green paint", "stone", "#2f5a3c", ["#2a5236"], 0.6, 0.0, "green roof band (pizza trailer)"),
    material("canvas-red", "Red canvas", "fabric", "#c7402f", ["#bd3a2a"], 0.9, 0.0, "awning stripe", emissiveIntensity={"base": 0.3}),
    material("canvas-cream", "Cream canvas", "fabric", "#f3ead4", ["#ebe2cc"], 0.9, 0.0, "awning stripe", emissiveIntensity={"base": 0.3}),
    material("brick", "Oven stone", "stone", "#a8553a", ["#9e4f35"], 0.9, 0.0, "stone pizza oven"),
    material("fire", "Oven fire", "stone", "#ff9a3c", ["#ff9033"], 0.5, 0.0, "glowing oven mouth", emissiveIntensity={"base": 1.0}),
    material("chalk", "Chalkboard", "stone", "#2b3a33", ["#27352e"], 0.8, 0.0, "chalkboard menu"),
    material("paint-ochre", "Ochre paint", "stone", "#d9a23f", ["#cf9a3a"], 0.6, 0.0, "warm ochre painted body (african trailer)",
             emissiveIntensity={"base": 0.3}, localOverrides=[{"id": "paint.flat", "kind": "linework", "notes": "panel seams below sprite size: flat ochre"}]),
    material("paint-terracotta", "Terracotta paint", "stone", "#a8492e", ["#9e442b"], 0.6, 0.0, "terracotta lower band (african trailer)"),
    material("canvas-terracotta", "Terracotta canvas", "fabric", "#b5533a", ["#ab4d35"], 0.9, 0.0, "canvas awning (african trailer)",
             emissiveIntensity={"base": 0.3}),
    material("pot", "Cooking pot", "metal", "#3a3633", ["#34302d"], 0.6, 0.3, "big dark cooking pot"),
    material("wood-board", "Wooden menu board", "wood", "#7a5232", ["#724c2e"], 0.85, 0.0, "wooden menu board"),
    material("wood", "Wooden posts", "wood", "#a87a48", ["#9f7243"], 0.85, 0.0, "wooden sign posts"),
    material("sign-dark", "Sign board", "stone", "#212629", ["#1d2124"], 0.7, 0.0, "blank dark sign board (content open)"),
]


def rgba(h, a=1.0):
    h = h.lstrip("#")
    return f"rgba({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)}, {a})"


used = {c["material"] for c in C}
spec["materials"] = [m for m in spec["materials"] if m["id"] in used]      # each trailer keeps only its own materials
mats = {m["id"]: m for m in spec["materials"]}
for c in C:
    m = mats[c["material"]]
    c["colorMaterialRecipe"] = {"dominantAlbedo": rgba(m["baseColor"]), "secondaryAlbedo": rgba(m["albedo"]["secondary"][0]),
                                "materialClass": m["materialClass"], "materialClassConfidence": 0.75, "evidenceRefs": c["evidenceRefs"]}
spec["componentTree"] = C
ids = [c["id"] for c in C]
spec["repetitionSystems"] = [
    {"id": "wheels", "target": "root", "count": len([i for i in ids if i.startswith("wheel-")]),
     "elementComponentIds": [i for i in ids if i.startswith("wheel-")], "distribution": "two axles close together, a wheel each side", "notes": ""},
]
spec["silhouette"] = {"boundingShape": f"{2 * HX:g} x {2 * HZ:g} wu, body {L} x {WD} wu, top {ZT} wu, sign to {SY1 + 0.03:.2f} wu",
                      "aspectRatios": [f"body length {L} : height {ZT - ZB:.2f}", f"footprint {2 * HX:g} : {2 * HZ:g}"],
                      "symmetry": "none (tow bar at one end, hatch on one side)", "dominantCurves": ["rounded ends and roof edge"],
                      "negativeSpaces": ["the hatch opening", "under the body"], "landmarks": ["lifted awning", "warm hatch", "roof sign"]}
spec["coordinateFrame"] = {"front": "+Z", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m); avatar 0.9"}
spec["featureReviewTargets"] = [
    {"id": "body", "name": "Rounded polished steel trailer body", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["body", "skirt", "roof-band-S"]},
    {"id": "hatch", "name": "Warm-lit hatch with the lid lifted as an awning", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["hatch-back", "awning-1" if PIZZA else "awning", "counter"]},
    {"id": "sign", "name": "Sign board on two wooden posts", "tier": "important",
     "passIds": ["form-refinement", "material-pass"], "minimumScore": 0.6, "mustPass": False,
     "componentRefs": ["sign-board", "sign-post-1"]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = ["macro", "meso", "micro"]          # a small, chunky prop: every pass carries every part (the hatch and sign are its identity)
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["sprite south (serving side)", "sprite west/north/east (turntable)", "beside the avatar"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 3000, "maxDrawCalls": 200, "textureSize": 256, "fpsTarget": 60})
spec["lightingFromPhoto"] = [
    {"id": "sky", "type": "hemisphere", "role": "key", "intensity": 1.0, "skyColor": "#f4f6f8", "groundColor": "#8a8378", "evidence": "AI image"},
    {"id": "key", "type": "directional", "role": "key", "intensity": 1.4, "position": [-3, 6, 4], "direction": [0.4, -0.8, -0.5],
     "castsShadow": True, "evidence": "city rules section 3"},
    {"id": "fill", "type": "directional", "role": "fill", "intensity": 0.4, "position": [5, 4, -3], "evidence": "side faces readable"},
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.3, "evidence": "soft steel reflections"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 1.0, "notes": "game sprites use the converter rig"},
    {"id": "contact", "role": "shadow", "notes": "soft contact shadow under the body"},
]
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]))

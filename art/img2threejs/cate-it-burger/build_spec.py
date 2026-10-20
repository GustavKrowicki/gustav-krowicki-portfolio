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
import sys

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
C.append(comp("body", "Steel body", "macro", "body", "extrude", (L, ZT - ZB, WD), (0, G, Z0), "steel", scale=[1, 1, 1],
              descriptor={"profile2D": profile}, contact="resting", start=(0, G + ZB, BZ), end=(0, G + ZT, BZ), importance=0.95,
              features=lf("body.rounded", "contour", "long steel box with rounded ends and rounded roof edge"),
              topo="Body: the side elevation (rounded corners) extruded across, the hatch opening as a hole."))
bx("body-north-plate", "Closed north side", "meso", "body", -HXO - 0.02, HXO + 0.02, HY0 - 0.02, HY1 + 0.02, Z0 - 0.004, Z0 + 0.04, "steel",
   contact="flush-mount", importance=0.3)
bx("skirt", "Lower steel band", "meso", "body", -L / 2 + 0.06, L / 2 - 0.06, ZB, ZB + 0.1, Z0 - 0.01, Z1 + 0.01, "steel-dark",
   importance=0.4, topo="Darker steel along the bottom of the body: a box.")
for s, z in (("S", Z1), ("N", Z0)):
    zz = (z, z + 0.012) if s == "S" else (z - 0.012, z)
    bx(f"roof-band-{s}", f"Dark roof band {s}", "meso", "body", -L / 2 + RT - 0.06, L / 2 - RT + 0.06, 1.35, 1.46, min(zz), max(zz),
       "band-dark", contact="flush-mount", importance=0.6,
       features=lf("roof-band-S.blank", "contour", "dark band along the roof edge, no text") if s == "S" else None)

# inside: warm-lit back wall of steel, warm end walls and ceiling light, a steel work top, the hood and the menu screen
bx("hatch-back", "Inside back wall", "meso", "inside", -HXO, HXO, HY0, HY1, Z0 + 0.04, BACK, "back-wall", importance=0.8,
   features=lf("hatch-back.lit", "contour", "warm-lit inside with a steel back wall"), topo="Back wall: a box filling the body behind the opening.")
for s, x0, x1 in (("W", -HXO, -HXO + 0.03), ("E", HXO - 0.03, HXO)):
    bx(f"inside-end-{s}", f"Inside end wall {s}", "micro", "inside", x0, x1, HY0, HY1, BACK, Z1 - 0.01, "inside-warm", importance=0.4)
bx("inside-light", "Ceiling light", "micro", "inside", -HXO, HXO, HY1 - 0.03, HY1, BACK, Z1 - 0.01, "light-warm", importance=0.5)
bx("inside-floor", "Inside work top", "micro", "inside", -HXO, HXO, HY0, HY0 + 0.05, BACK, Z1 - 0.06, "back-wall", importance=0.4)
bx("hood", "Extractor hood", "micro", "inside", -0.9, -0.1, HY1 - 0.13, HY1 - 0.03, BACK, BACK + 0.13, "steel-dark", importance=0.5,
   features=lf("hood.box", "contour", "steel extractor hood over the grill"))
bx("menu-screen", "Menu screen", "micro", "inside", 0.74, 1.04, HY0 + 0.06, HY1 - 0.1, Z1 - 0.1, Z1 - 0.07, "screen", importance=0.5,
   features=lf("menu-screen.lit", "contour", "lit menu screen standing at one end of the hatch, facing out"))

# serving counter under the opening, full width
bx("counter", "Steel counter shelf", "meso", "hatch", -HXO - 0.04, HXO + 0.04, HY0 - 0.04, HY0, Z1 - 0.02, Z1 + 0.15, "steel-light",
   importance=0.6, features=lf("counter.shelf", "contour", "steel counter shelf under the opening, full width"))

# the hatch lid lifted up and out as a flat awning, held by two thin struts
AW_OUT, AW_T = 0.44, 0.03
aw_tilt = math.radians(5)            # nearly flat: steeper lids are seen edge-on from the city camera
aw_y = HY1 + 0.03 + AW_OUT / 2 * math.sin(aw_tilt)
C.append(comp("awning", "Hatch lid awning", "meso", "hatch", "box", (2 * HXO + 0.08, AW_T, AW_OUT), (0, G + aw_y, Z1 + AW_OUT / 2 * math.cos(aw_tilt)), "steel",
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
bx("jockey", "Support leg", "micro", "chassis", 1.76, 1.8, 0.0, 0.27, BZ - 0.02, BZ + 0.02, "steel-dark", importance=0.2)

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
    material("wood", "Wooden posts", "wood", "#a87a48", ["#9f7243"], 0.85, 0.0, "wooden sign posts"),
    material("sign-dark", "Sign board", "stone", "#212629", ["#1d2124"], 0.7, 0.0, "blank dark sign board (content open)"),
]


def rgba(h, a=1.0):
    h = h.lstrip("#")
    return f"rgba({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)}, {a})"


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
     "componentRefs": ["hatch-back", "awning", "counter"]},
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

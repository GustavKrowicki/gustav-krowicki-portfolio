"""ObjectSculptSpec for a gents city bike with a wooden front crate, a 1 x 1 tile city prop.

Shape and colour from a clean side photo (ref/, not in git) and four close-ups (crate mount, head tube, grip, chain guard).
Every point is measured in photo pixels and converted with px(): the 28 inch wheels (0.71 m) are 520 px across, and
1 wu = 2 m (docs/city-rules.md), so 1 px = 0.000683 wu and the bike is 0.98 wu long next to the 0.9 wu avatar.
Tubes, tyres and the fenders are about 1.3 x their true thickness so they hold a pixel at Street zoom.

Frame: 1 unit = 1 wu. +Y up, the ground at y = 0, the bike along X (front +X), centred on the origin. The photo shows
the drive side, which is +Z (the rider's right when facing +X, and the side the default south camera sees).
"""
import copy
import json
import math
import sys

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
REF = "side"
spec["viewEvidence"] = [
    {"id": REF, "view": "primary: side photo of the bike, drive side, front to the right (shape, proportions, colour)",
     "image": f"{W}/ref/side-photo.jpg",
     "imageRegion": {"x": 0.05, "y": 0.2, "width": 0.91, "height": 0.59, "units": "normalized"},
     "observations": ["dark olive-grey glossy diamond frame, straight horizontal top tube", "big wheels, chrome rims, thin spokes, dark tyres",
                      "upright chrome bars swept back to dark grips, higher than the saddle", "black sprung saddle on a chrome seatpost",
                      "full fenders and a full chain guard in frame colour", "wooden crate with steel edges on the head tube, above the front fender",
                      "small black rear light on the rear fender"],
     "confidence": 0.85},
]

S = 0.71 / 520 / 2          # wu per photo px
X0, Y0 = 810, 1252          # photo px of the model origin: midway between the axles, on the ground
G = 0.002                   # root: a tiny origin marker on the ground, all parts are placed from it


def px(x, y, z=0.0):
    """Photo pixel (x right, y down) to model wu (x, y up), z in wu."""
    return (round((x - X0) * S, 4), round((Y0 - y) * S, 4), round(z, 4))


def r4(v):
    return [round(float(x), 4) for x in v]


RA, FA = px(365, 995), px(1255, 998)       # rear and front axle
WR = 256 * S                               # tyre outer radius (0.175 wu)
BB = px(740, 1035)                         # bottom bracket
FR, FS = 0.009, 0.0065                     # main tube and stay radii (wu)


def comp(cid, name, level, role, primitive, dims, pos, material, *, rot=None, importance=0.6, conf=0.8, features=None,
         topo="", sockets=None, contact="flush-mount", start=None, end=None, radius=None, parent="root", scale=None,
         descriptor=None):
    c = copy.deepcopy(root_t)
    c.update({"id": cid, "name": name, "level": level, "role": role, "importance": importance, "confidence": conf,
              "primitive": primitive, "topologyClass": "assembled-solid",
              "topologyRationale": topo or f"Hard-surface {role}: a {primitive} at sprite scale.", "parent": parent,
              "material": material, "materialLayers": [material], "localFeatures": features or [], "evidenceRefs": [REF]})
    gd = c["geometryDescriptor"]
    gd["topologyIntent"] = "hard-surface, smooth tubes, crisp edges"
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
        s = start or (pos[0], pos[1] - dims[1] / 2, pos[2])
        e = end or (pos[0], pos[1] + dims[1] / 2, pos[2])
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


def bx(cid, name, level, role, centre, size, material, *, rot=None, **kw):
    """A box by centre (x, y, z) and size (x, y, z) in wu."""
    C.append(comp(cid, name, level, role, "box", size, centre, material, rot=rot, contact="flush-mount", **kw))


def tube(cid, name, level, role, pts, r, material, **kw):
    """A tube through points given in wu (model coordinates): frame tubes, stays, bars, seatpost."""
    seg = kw.pop("segments", 8)
    xs, ys, zs = zip(*pts)
    dims = (max(xs) - min(xs) + 2 * r, max(ys) - min(ys) + 2 * r, max(zs) - min(zs) + 2 * r)
    C.append(comp(cid, name, level, role, "tube", dims, (0, 0, 0), material, scale=[1, 1, 1], start=pts[0], end=pts[-1], radius=r,
                  descriptor={"tubePath": {"points": [r4(p) for p in pts], "radius": round(r, 4), "radialSegments": seg, "closed": False}},
                  **kw))


def ring(cid, name, level, role, centre, radius, tube_r, z, material, **kw):
    """A torus in the bike's side plane (XY): tyres and rims. radius = centre line of the ring."""
    k = radius / 0.45
    C.append(comp(cid, name, level, role, "torus", (2 * (radius + tube_r), 2 * (radius + tube_r), 2 * tube_r), (centre[0], centre[1], z),
                  material, scale=[k, k, k], start=(centre[0] - radius, centre[1], z), end=(centre[0] + radius, centre[1], z),
                  descriptor={"torusTubeRatio": round(tube_r / radius, 4)}, **kw))


def zcyl(cid, name, level, role, centre, r, z0, z1, material, **kw):
    """A cylinder lying along Z (hubs, the chainring cover, the bell)."""
    C.append(comp(cid, name, level, role, "cylinder", (2 * r, z1 - z0, 2 * r), (centre[0], centre[1], (z0 + z1) / 2), material,
                  start=(centre[0], centre[1], z0), end=(centre[0], centre[1], z1), radius=r, **kw))


def arc(cx, cy, r, a0, a1, n):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
            for i in range(n + 1)]


def extrude(cid, name, level, role, pts2d, z0, depth, material, **kw):
    """A flat XY outline (wu) extruded along +Z from z0: fenders and the chain guard."""
    xs, ys = zip(*pts2d)
    C.append(comp(cid, name, level, role, "extrude", (max(xs) - min(xs), max(ys) - min(ys), depth), (0, 0, z0), material,
                  scale=[1, 1, 1], start=(min(xs), min(ys), z0), end=(max(xs), max(ys), z0 + depth),
                  descriptor={"profile2D": {"points": [r4(p) for p in pts2d], "depth": round(depth, 4)}}, **kw))


# ---------------------------------------------------------------------------------------------------------------
C.append(comp("root", "Ground origin", "macro", "base", "box", (0.004, G, 0.004), (0, G / 2, 0), "tyre", parent=None,
              importance=0.2, conf=0.95, sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "ground"}],
              features=lf("root.origin", "contour", "the model origin on the ground between the wheels"),
              topo="Origin: a tiny box on the ground; every part is placed from it in model wu."))

# wheels: tyre, chrome rim, hub and 36 spokes each (as in the photo)
NSP = 36
for w, (cx, cy, _) in (("rear", RA), ("front", FA)):
    ring(f"wheel-{w}", f"{w.title()} tyre", "macro", "wheel", (cx, cy), WR - 0.009, 0.0105, 0.0, "tyre", importance=0.95,
         features=lf(f"wheel-{w}.tyre", "contour", "big dark tyre, 28 inch") if w == "rear" else None,
         topo="Tyre: a torus in the side plane.")
    ring(f"rim-{w}", f"{w.title()} rim", "meso", "wheel", (cx, cy), WR - 0.024, 0.0055, 0.0, "chrome", importance=0.8,
         topo="Rim: a thinner chrome torus inside the tyre.")
    zcyl(f"hub-{w}", f"{w.title()} hub", "micro", "wheel", (cx, cy), 0.012, -0.03, 0.03, "chrome", importance=0.4)
    for k in range(NSP):
        a = math.radians(k * 360 / NSP + (5 if w == "front" else 0))
        z = 0.014 if k % 2 == 0 else -0.014
        rr = WR - 0.03
        tube(f"spoke-{w}-{k + 1}", f"{w.title()} spoke {k + 1}", "micro", "wheel",
             [(cx, cy, z), (cx + rr * math.cos(a), cy + rr * math.sin(a), 0.0)], 0.0012, "spoke", importance=0.2, segments=4)

# frame: diamond, straight horizontal top tube
ST, HT0, HT1 = px(570, 640), px(1032, 600), px(1074, 718)         # seat cluster, head tube top and bottom
tube("top-tube", "Top tube", "macro", "frame", [px(560, 636), px(1040, 636)], FR, "frame", importance=0.9,
     features=lf("top-tube.level", "contour", "straight horizontal top tube"))
tube("head-tube", "Head tube", "meso", "frame", [HT0, HT1], 0.012, "frame", importance=0.7)
tube("seat-tube", "Seat tube", "macro", "frame", [ST, BB], FR, "frame", importance=0.85)
tube("down-tube", "Down tube", "macro", "frame", [px(1066, 692), BB], FR + 0.001, "frame", importance=0.85)
for s, z in (("R", 0.022), ("L", -0.022)):
    tube(f"seat-stay-{s}", f"Seat stay {s}", "meso", "frame", [(ST[0], ST[1], 0.0), (RA[0], RA[1], z)], FS, "frame", importance=0.6)
    tube(f"chain-stay-{s}", f"Chain stay {s}", "meso", "frame", [(BB[0], BB[1], z * 0.6), (RA[0], RA[1], z)], FS, "frame", importance=0.4)
    tube(f"fork-{s}", f"Fork blade {s}", "meso", "frame",
         [(HT1[0], HT1[1], 0.0), px(1095, 790, z * 0.8), px(1122, 880, z), px(1170, 950, z), (FA[0], FA[1], z)], FS + 0.001, "frame",
         importance=0.6)
zcyl("bottom-bracket", "Bottom bracket", "micro", "frame", BB, 0.016, -0.024, 0.024, "frame", importance=0.3)

# seatpost, sprung saddle
tube("seatpost", "Seatpost", "meso", "saddle", [px(570, 642), px(532, 520)], 0.0075, "chrome", importance=0.6)
C.append(comp("saddle", "Sprung saddle", "meso", "saddle", "ellipsoid", (0.135, 0.032, 0.07), (px(537, 488)[0], px(537, 488)[1], 0),
              "saddle", importance=0.85, features=lf("saddle.sprung", "contour", "black sprung saddle, wide at the back")))
bx("saddle-rail", "Saddle frame", "micro", "saddle", (px(525, 512)[0], px(525, 512)[1], 0), (0.085, 0.008, 0.045), "chrome", importance=0.3)
for s, z in (("R", 0.02), ("L", -0.02)):
    tube(f"saddle-spring-{s}", f"Saddle spring {s}", "micro", "saddle", [px(465, 500, z), px(470, 528, z)], 0.006, "chrome", importance=0.4)

# stem and upright bars, swept back to the grips
SB = px(1027, 470)                           # stem top / bar clamp
tube("stem", "Stem", "meso", "bars", [HT0, px(1029, 530), SB], 0.0075, "chrome", importance=0.6)
for s, k in (("R", 1), ("L", -1)):
    tube(f"bar-{s}", f"Handlebar {s}", "meso", "bars",
         [(SB[0], SB[1], 0.0), px(1032, 430, 0.03 * k), px(1022, 396, 0.075 * k), px(985, 392, 0.11 * k), px(950, 404, 0.13 * k)],
         0.0065, "chrome", importance=0.8, features=lf("bars.swept", "contour", "upright chrome bars swept back") if k == 1 else None)
    tube(f"grip-{s}", f"Grip {s}", "meso", "bars", [px(958, 401, 0.128 * k), px(888, 424, 0.14 * k)], 0.011, "grip", importance=0.6)
zcyl("bell", "Bell", "micro", "bars", px(990, 354), 0.016, 0.075, 0.1, "chrome-dark", importance=0.3)

# full fenders in frame colour: annular strips around each wheel, wider than the tyre
FW = 0.034


def fender(cid, name, centre, a0, a1, feature=None):
    r0, r1 = WR + 0.004, WR + 0.013
    outline = arc(centre[0], centre[1], r1, a0, a1, 16) + arc(centre[0], centre[1], r0, a1, a0, 16)
    extrude(cid, name, "meso", "fender", outline, -FW / 2, FW, "frame", importance=0.75, features=feature,
            topo="Fender: an annular strip in the side plane, extruded across the tyre.")


fender("fender-rear", "Rear fender", RA, 62, 182, lf("fender-rear.full", "contour", "full rear fender in frame colour"))
fender("fender-front", "Front fender", FA, 88, 196)
for w, (cx, cy, _), a in (("rear", RA, 172), ("front", FA, 196)):
    for s, z in (("R", 0.02), ("L", -0.02)):
        rr = WR + 0.004
        tube(f"fender-stay-{w}-{s}", f"Fender stay {w} {s}", "micro", "fender",
             [(cx, cy, z), (cx + rr * math.cos(math.radians(a)), cy + rr * math.sin(math.radians(a)), z * 0.7)], 0.0025, "chrome",
             importance=0.2)
RL = (RA[0] + (WR + 0.018) * math.cos(math.radians(152)), RA[1] + (WR + 0.018) * math.sin(math.radians(152)), 0.0)
bx("rear-light", "Rear light", "micro", "fender", RL, (0.012, 0.024, 0.02), "light-black", importance=0.5,
   features=lf("rear-light.black", "contour", "small black rear light on the rear fender"))

# full chain guard on the drive side: round around the chainring, tapering back to the rear hub
gf = arc(BB[0], BB[1], 72 * S, -90, 90, 10)
gr = arc(RA[0] + 52 * S, RA[1], 38 * S, 90, 270, 8)
extrude("chainguard", "Chain guard", "meso", "drive", gf + gr, 0.026, 0.012, "frame", importance=0.8,
        features=lf("chainguard.full", "contour", "full enclosed chain guard in frame colour"),
        topo="Chain guard: its side outline extruded thin, outside the right chain stay.")
zcyl("chainring", "Chainring cover", "micro", "drive", BB, 46 * S, 0.038, 0.042, "chrome", importance=0.5)
for s, k, tip in (("R", 1, px(852, 1032)), ("L", -1, px(628, 1038))):
    tube(f"crank-{s}", f"Crank {s}", "micro", "drive", [(BB[0], BB[1], 0.046 * k), (tip[0], tip[1], 0.046 * k)], 0.006, "chrome",
         importance=0.5)
    bx(f"pedal-{s}", f"Pedal {s}", "micro", "drive", (tip[0], tip[1], 0.07 * k), (0.034, 0.012, 0.042), "chrome-dark", importance=0.4)

# wooden front crate: fixed to the head tube by a steel bracket, above the front fender
CX0, CX1, CY0, CY1 = px(1090, 0)[0], px(1350, 0)[0], px(0, 700)[1], px(0, 605)[1]
CZ, T = 0.095, 0.006                          # crate half depth across the bike, wall thickness
cxm, cym = (CX0 + CX1) / 2, (CY0 + CY1) / 2
bx("crate-floor", "Crate floor", "meso", "crate", (cxm, CY0 + T / 2, 0), (CX1 - CX0, T, 2 * CZ), "wood", importance=0.6)
bx("crate-side-R", "Crate side R", "meso", "crate", (cxm, cym, CZ - T / 2), (CX1 - CX0, CY1 - CY0, T), "wood", importance=0.9,
   features=lf("crate.wood", "contour", "wooden crate with steel edges in front of the head tube"))
bx("crate-side-L", "Crate side L", "meso", "crate", (cxm, cym, -CZ + T / 2), (CX1 - CX0, CY1 - CY0, T), "wood", importance=0.6)
bx("crate-end-front", "Crate front end", "meso", "crate", (CX1 - T / 2, cym, 0), (T, CY1 - CY0, 2 * CZ), "wood", importance=0.6)
bx("crate-end-back", "Crate back end", "meso", "crate", (CX0 + T / 2, cym, 0), (T, CY1 - CY0, 2 * CZ), "wood", importance=0.5)
E = 0.009                                      # steel edge section
for n, (x, z) in enumerate(((CX0, CZ), (CX1, CZ), (CX1, -CZ), (CX0, -CZ)), 1):
    bx(f"crate-post-{n}", f"Crate corner {n}", "micro", "crate", (x, cym, z), (E, CY1 - CY0 + E, E), "crate-steel", importance=0.4)
for y, tag in ((CY1, "top"), (CY0, "bottom")):
    for s, z in (("R", CZ), ("L", -CZ)):
        bx(f"crate-{tag}-rail-{s}", f"Crate {tag} rail {s}", "micro", "crate", (cxm, y, z), (CX1 - CX0 + E, E, E), "crate-steel", importance=0.4)
    for e, x in (("front", CX1), ("back", CX0)):
        bx(f"crate-{tag}-rail-{e}", f"Crate {tag} rail {e}", "micro", "crate", (x, y, 0), (E, E, 2 * CZ + E), "crate-steel", importance=0.3)
bx("crate-bracket", "Crate bracket", "micro", "crate", (px(1082, 0)[0], px(0, 662)[1], 0), (0.016, 0.03, 0.03), "crate-steel",
   importance=0.4)
tube("crate-strut", "Crate strut", "micro", "crate", [(cxm, CY0, 0.0), px(1150, 790, 0.0)], 0.004, "crate-steel", importance=0.3)


# ---------------------------------------------------------------------------------------------------------------
def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.02, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.02, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    m.update({"emissive": color, "emissiveIntensity": {"base": 0.2}})
    m.update({"textureless": {"declared": True, "evidence": ["ref side photo: flat paint and chrome", "flat colour at sprite size"]}})
    m.update(extra)
    for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
        m.pop(field, None)
    return m


spec["materials"] = [
    material("frame", "Olive-grey gloss paint", "metal", "#5a5f56", ["#53584f"], 0.3, 0.1, "glossy dark olive-grey frame, fenders, chain guard",
             localOverrides=[{"id": "frame.gloss", "kind": "linework", "notes": "gloss highlights below sprite size: flat paint"}]),
    material("tyre", "Tyres", "rubber", "#3b3d39", ["#363834"], 0.9, 0.0, "dark grey tyres"),
    material("chrome", "Chrome", "metal", "#d9dcdf", ["#cfd3d6"], 0.25, 0.5, "chrome rims, bars, seatpost, crank",
             emissiveIntensity={"base": 0.35}),
    material("chrome-dark", "Dull metal", "metal", "#9ea3a6", ["#959a9d"], 0.4, 0.4, "pedals and bell"),
    material("spoke", "Spokes", "metal", "#e2e5e8", ["#dadde0"], 0.3, 0.4, "thin steel spokes"),
    material("saddle", "Black saddle", "plastic", "#262626", ["#222222"], 0.6, 0.0, "black saddle"),
    material("grip", "Grips", "rubber", "#32342f", ["#2e302b"], 0.8, 0.0, "dark grips"),
    material("wood", "Crate wood", "wood", "#946043", ["#87573c"], 0.8, 0.0, "warm brown crate boards", emissiveIntensity={"base": 0.2}),
    material("crate-steel", "Crate steel edges", "metal", "#5b6158", ["#535950"], 0.4, 0.3, "grey steel crate edges and bracket"),
    material("light-black", "Rear light", "plastic", "#1d1d1f", ["#19191b"], 0.4, 0.0, "small black rear light"),
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
spokes = [i for i in ids if i.startswith("spoke-")]
spec["repetitionSystems"] = [
    {"id": "spokes", "target": "root", "count": len(spokes), "elementComponentIds": spokes,
     "distribution": "36 per wheel, every 10 deg, alternating hub flanges", "notes": "4-sided thin rods: they read as a light disc at sprite size"},
]
L = FA[0] + WR - (RA[0] - WR - 0.02)
spec["silhouette"] = {"boundingShape": f"about {L:.2f} wu long, bars at {px(0, 392)[1]:.2f} wu, saddle at {px(0, 466)[1]:.2f} wu",
                      "aspectRatios": ["length : bar height = 1.6 : 1", "wheel diameter : length = 0.36"],
                      "symmetry": "near mirror across the bike's centre plane, chain guard on the right only",
                      "dominantCurves": ["two big wheels", "fender arcs", "swept-back bars"],
                      "negativeSpaces": ["the frame triangle", "between the spokes", "under the top tube"],
                      "landmarks": ["front crate", "high upright bars", "sprung saddle"]}
spec["coordinateFrame"] = {"front": "+X", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m); avatar 0.9"}
spec["featureReviewTargets"] = [
    {"id": "wheels-frame", "name": "Two big wheels and a diamond frame with a level top tube", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["wheel-rear", "wheel-front", "top-tube", "down-tube", "seat-tube"]},
    {"id": "crate", "name": "Wooden crate in front of the head tube", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["crate-side-R", "crate-bracket"]},
    {"id": "rider", "name": "Upright bars, sprung saddle, fenders and chain guard", "tier": "important",
     "passIds": ["form-refinement", "material-pass"], "minimumScore": 0.6, "mustPass": False,
     "componentRefs": ["bar-R", "saddle", "fender-rear", "chainguard"]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    bp["componentRefs"] = [cid for l in ("macro", "meso", "micro") for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["side view against the photo", "sprite south/west/north/east", "beside the avatar"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 12000, "maxDrawCalls": 200, "textureSize": 256, "fpsTarget": 60})
spec["lightingFromPhoto"] = [
    {"id": "sky", "type": "hemisphere", "role": "key", "intensity": 1.0, "skyColor": "#f4f6f8", "groundColor": "#8a8378", "evidence": "studio photo"},
    {"id": "key", "type": "directional", "role": "key", "intensity": 1.4, "position": [-3, 6, 4], "direction": [0.4, -0.8, -0.5],
     "castsShadow": True, "evidence": "city rules section 3"},
    {"id": "fill", "type": "directional", "role": "fill", "intensity": 0.4, "position": [5, 4, -3], "evidence": "side faces readable"},
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.3, "evidence": "chrome reflections"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 1.0, "notes": "game sprites use the converter rig"},
    {"id": "contact", "role": "shadow", "notes": "thin contact shadow under the wheels"},
]
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]))

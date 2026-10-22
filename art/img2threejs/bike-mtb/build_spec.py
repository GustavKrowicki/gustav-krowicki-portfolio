"""ObjectSculptSpec for a black cross-country hardtail mountain bike, a 1 x 1 tile city prop.

Shape and colour from a clean side photo (ref/, not in git) and close-ups (3/4 view, bars from the front and from above,
crank, rear derailleur, rear disc, fork). Every point is measured in photo pixels and converted with px(): the 29 inch
tyres (0.745 m) are 1188 px across, and 1 wu = 2 m (docs/city-rules.md), so 1 px = 0.000314 wu and the bike is 0.94 wu
long (wheelbase 0.56 wu) next to the 0.9 wu avatar, the same scale as the city bike (bike-velorbis).
Tubes and tyres are a little thicker than true so they hold a pixel at Street zoom. No letters: the logo is a plain band.

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
     "imageRegion": {"x": 0.0, "y": 0.2, "width": 1.0, "height": 0.76, "units": "normalized"},
     "observations": ["matte black aluminium hardtail frame, sloping top tube, thick down tube with a big white band",
                      "big 29 inch wheels, chunky knobbly dark tyres, black rims, thin black spokes",
                      "suspension fork: black upper legs, darker lowers", "flat wide black bar on a short stem, black grips",
                      "black saddle on a black seatpost", "no fenders, no chain guard: exposed chain, 1x chainring, black crank",
                      "rear cassette and derailleur", "silver disc rotors front and rear"],
     "confidence": 0.85},
]

S = 0.745 / 1188 / 2        # wu per photo px
X0, Y0 = 1498, 2087         # photo px of the model origin: midway between the axles, on the ground
G = 0.002                   # root: a tiny origin marker on the ground, all parts are placed from it


def px(x, y, z=0.0):
    """Photo pixel (x right, y down) to model wu (x, y up), z in wu."""
    return (round((x - X0) * S, 4), round((Y0 - y) * S, 4), round(z, 4))


def r4(v):
    return [round(float(x), 4) for x in v]



RA, FA = px(607, 1493), px(2390, 1493)    # rear and front axle
WR = 594 * S                               # tyre outer radius (0.186 wu)
BB = px(1318, 1478)                        # bottom bracket


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
    """A flat XY outline (wu) extruded along +Z from z0: the logo band and the top tube stripe."""
    xs, ys = zip(*pts2d)
    C.append(comp(cid, name, level, role, "extrude", (max(xs) - min(xs), max(ys) - min(ys), depth), (0, 0, z0), material,
                  scale=[1, 1, 1], start=(min(xs), min(ys), z0), end=(max(xs), max(ys), z0 + depth),
                  descriptor={"profile2D": {"points": [r4(p) for p in pts2d], "depth": round(depth, 4)}}, **kw))



# ---------------------------------------------------------------------------------------------------------------
C.append(comp("root", "Ground origin", "macro", "base", "box", (0.004, G, 0.004), (0, G / 2, 0), "tyre", parent=None,
              importance=0.2, conf=0.95, sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "ground"}],
              features=lf("root.origin", "contour", "the model origin on the ground between the wheels"),
              topo="Origin: a tiny box on the ground; every part is placed from it in model wu."))

# wheels: chunky tyre with knobs, black rim, hub, 32 black spokes each, a silver disc on the left (non-drive) side
TT = 0.0135                                # tyre section radius (a 2.2 inch tyre, a bit fat)
NSP, NKN = 32, 30
for w, (cx, cy, _) in (("rear", RA), ("front", FA)):
    ring(f"wheel-{w}", f"{w.title()} tyre", "macro", "wheel", (cx, cy), WR - TT - 0.002, TT, 0.0, "tyre", importance=0.95,
         features=lf(f"wheel-{w}.tyre", "contour", "chunky knobbly dark 29 inch tyre") if w == "rear" else None,
         topo="Tyre: a fat torus in the side plane.")
    for k in range(NKN):
        a = math.radians(k * 360 / NKN + (6 if w == "front" else 0))
        z = 0.008 if k % 2 == 0 else -0.008
        tube(f"knob-{w}-{k + 1}", f"{w.title()} tyre knob {k + 1}", "micro", "wheel",
             [(cx + (WR - 0.006) * math.cos(a), cy + (WR - 0.006) * math.sin(a), z),
              (cx + (WR - 0.001) * math.cos(a), cy + (WR - 0.001) * math.sin(a), z)], 0.0045, "tyre", importance=0.25, segments=4)
    ring(f"rim-{w}", f"{w.title()} rim", "meso", "wheel", (cx, cy), WR - 2 * TT - 0.006, 0.0055, 0.0, "rim", importance=0.7,
         topo="Rim: a thinner black torus inside the tyre.")
    zcyl(f"hub-{w}", f"{w.title()} hub", "micro", "wheel", (cx, cy), 0.011, -0.032, 0.032, "rim", importance=0.4)
    for k in range(NSP):
        a = math.radians(k * 360 / NSP + (5 if w == "front" else 0))
        z = 0.016 if k % 2 == 0 else -0.016
        rr = WR - 2 * TT - 0.006
        tube(f"spoke-{w}-{k + 1}", f"{w.title()} spoke {k + 1}", "micro", "wheel",
             [(cx, cy, z), (cx + rr * math.cos(a), cy + rr * math.sin(a), 0.0)], 0.0009, "spoke", importance=0.2, segments=4)
    zcyl(f"disc-{w}", f"{w.title()} disc rotor", "micro", "brake", (cx, cy), 0.04, -0.034, -0.031, "disc", importance=0.5,
         features=lf(f"disc-{w}.silver", "contour", "silver disc rotor on the hub") if w == "front" else None)
bx("caliper-front", "Front caliper", "micro", "brake", (px(2300, 1405)[0], px(2300, 1405)[1], -0.04), (0.022, 0.03, 0.012), "drive",
   importance=0.3)
bx("caliper-rear", "Rear caliper", "micro", "brake", (px(720, 1420)[0], px(720, 1420)[1], -0.04), (0.026, 0.018, 0.012), "drive",
   importance=0.3)

# frame: hardtail, sloping top tube, thick down tube with a big light band on both sides
HT0, HT1 = px(1995, 612), px(2045, 748)                           # head tube top and bottom
SC, TJ = px(1055, 612), px(1180, 1025)                            # seat tube top, top tube / seat stay junction
tube("top-tube", "Top tube", "macro", "frame", [px(1978, 652), TJ], 0.0085, "frame", importance=0.9,
     features=lf("top-tube.slope", "contour", "top tube sloping down from the head tube to the seat tube"))
tube("head-tube", "Head tube", "meso", "frame", [HT0, HT1], 0.0145, "frame", importance=0.7)
tube("seat-tube", "Seat tube", "macro", "frame", [SC, BB], 0.0095, "frame", importance=0.85)
DT0, DT1 = px(2022, 722), px(1345, 1458)
tube("down-tube", "Down tube", "macro", "frame", [DT0, DT1], 0.0155, "frame", importance=0.9)


def side_strip(cid, name, p0, p1, half, z0, depth, material, **kw):
    """A flat strip along a tube's side (the logo band, the top tube stripe): a parallelogram in XY extruded along Z."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    n = math.hypot(dx, dy)
    ox, oy = -dy / n * half, dx / n * half
    pts = [(p0[0] + ox, p0[1] + oy), (p1[0] + ox, p1[1] + oy), (p1[0] - ox, p1[1] - oy), (p0[0] - ox, p0[1] - oy)]
    extrude(cid, name, "meso", "frame", pts, z0, depth, material, **kw)


for s, k in (("R", 1), ("L", -1)):
    z0 = 0.011 if k == 1 else -0.011 - 0.0056
    side_strip(f"down-tube-band-{s}", f"Down tube band {s}", px(1990, 768), px(1395, 1418), 0.0105, z0, 0.0056, "band",
               importance=0.85, features=lf("down-tube.band", "contour", "big light band along the down tube, no letters") if k == 1 else None,
               topo="Logo band: a flat light strip on the down tube's side, nearly flush with the tube.")
    z1 = 0.0066 if k == 1 else -0.0066 - 0.0026
    side_strip(f"top-tube-stripe-{s}", f"Top tube stripe {s}", px(1800, 752), px(1235, 1030), 0.0035, z1, 0.0026, "stripe",
               importance=0.4)
for s, z in (("R", 0.022), ("L", -0.022)):
    tube(f"seat-stay-{s}", f"Seat stay {s}", "meso", "frame", [(TJ[0], TJ[1], z * 0.35), (RA[0] + 0.004, RA[1] + 0.004, z)], 0.0058, "frame",
         importance=0.6)
    tube(f"chain-stay-{s}", f"Chain stay {s}", "meso", "frame", [(BB[0], BB[1], z * 0.6), (RA[0] + 0.004, RA[1], z)], 0.0068, "frame",
         importance=0.5)
zcyl("bottom-bracket", "Bottom bracket", "micro", "frame", BB, 0.014, -0.026, 0.026, "frame", importance=0.3)

# suspension fork: crown under the head tube, black upper legs, darker lowers with an arch, to the front axle
CR = px(2052, 772)
bx("fork-crown", "Fork crown", "meso", "fork", (CR[0], CR[1], 0), (0.03, 0.014, 0.068), "stanchion", importance=0.6,
   features=lf("fork.suspension", "contour", "suspension fork: black upper legs, darker lowers"))
fx, fy = FA[0] - CR[0], FA[1] - CR[1]
at = lambda t, z: (CR[0] + fx * t, CR[1] + fy * t, z)
for s, z in (("R", 0.026), ("L", -0.026)):
    tube(f"stanchion-{s}", f"Fork upper leg {s}", "meso", "fork", [at(0.0, z), at(0.45, z)], 0.0085, "stanchion", importance=0.7)
    tube(f"fork-lower-{s}", f"Fork lower {s}", "meso", "fork", [at(0.38, z), at(1.0, z)], 0.0108, "lower", importance=0.7)
ax, ay, _ = at(0.4, 0)
tube("fork-arch", "Fork arch", "micro", "fork", [(ax + 0.004, ay, -0.026), (ax + 0.012, ay + 0.006, 0.0), (ax + 0.004, ay, 0.026)],
     0.006, "lower", importance=0.4)

# black seatpost and saddle
tube("seatpost", "Seatpost", "meso", "saddle", [px(1058, 620), px(1018, 528)], 0.0068, "drive", importance=0.6)
SD = px(1025, 474)
C.append(comp("saddle", "Saddle", "meso", "saddle", "ellipsoid", (0.138, 0.018, 0.066), (SD[0], SD[1], 0), "saddle", importance=0.85,
              features=lf("saddle.black", "contour", "black saddle, wide at the back, long nose")))
bx("saddle-clamp", "Saddle rails", "micro", "saddle", (px(1018, 515)[0], px(1018, 515)[1], 0), (0.07, 0.008, 0.03), "drive", importance=0.3)

# short stem and a flat wide bar (0.34 wu, 0.68 m, from the front close-up), black grips and brake levers
SB = px(2002, 494)                         # bar clamp
tube("stem", "Stem", "meso", "bars", [(HT0[0], HT0[1], 0.0), px(1990, 560), SB], 0.0085, "drive", importance=0.6)
for s, k in (("R", 1), ("L", -1)):
    tube(f"bar-{s}", f"Handlebar {s}", "meso", "bars",
         [(SB[0], SB[1], 0.0), (SB[0] - 0.001, SB[1] + 0.004, 0.06 * k), (SB[0] - 0.008, SB[1] + 0.007, 0.17 * k)],
         0.0055, "drive", importance=0.8, features=lf("bars.flat", "contour", "flat wide black bar") if k == 1 else None)
    tube(f"grip-{s}", f"Grip {s}", "meso", "bars", [(SB[0] - 0.005, SB[1] + 0.0065, 0.128 * k), (SB[0] - 0.009, SB[1] + 0.0072, 0.172 * k)],
         0.0088, "grip", importance=0.6)
    tube(f"lever-{s}", f"Brake lever {s}", "micro", "bars",
         [(SB[0] - 0.002, SB[1] + 0.006, 0.112 * k), (SB[0] + 0.028, SB[1] - 0.004, 0.118 * k)], 0.003, "drive", importance=0.3)

# exposed drivetrain on the drive side: 1x chainring, black cranks and pedals, chain, cassette, derailleur
zcyl("chainring", "Chainring", "micro", "drive", BB, 84 * S, 0.026, 0.03, "drive", importance=0.6,
     features=lf("drive.exposed", "contour", "exposed chain, 1x chainring, black crank, cassette and derailleur"))
zcyl("cassette", "Cassette", "micro", "drive", (RA[0], RA[1]), 108 * S, 0.014, 0.03, "cassette", importance=0.5)
for s, k, tip in (("R", 1, px(1690, 1612)), ("L", -1, px(946, 1344))):
    tube(f"crank-{s}", f"Crank {s}", "micro", "drive", [(BB[0], BB[1], 0.044 * k), (tip[0], tip[1], 0.044 * k)], 0.0065, "drive",
         importance=0.5)
    bx(f"pedal-{s}", f"Pedal {s}", "micro", "drive", (tip[0], tip[1], 0.068 * k), (0.032, 0.008, 0.036), "drive", importance=0.4)
DJ = px(522, 1832)                         # lower jockey wheel
tube("derailleur", "Rear derailleur", "micro", "drive", [(RA[0], RA[1], 0.038), px(575, 1640, 0.042), (DJ[0], DJ[1], 0.04)], 0.0065,
     "drive", importance=0.5)
for n, y in ((1, 1700), (2, 1832)):
    q = px(560 if n == 1 else 522, y)
    zcyl(f"jockey-{n}", f"Jockey wheel {n}", "micro", "drive", q, 0.008, 0.034, 0.046, "drive", importance=0.2)
CZ = 0.028
tube("chain-top", "Chain top run", "micro", "drive", [px(1318, 1393, CZ), px(607, 1385, CZ)], 0.0024, "chain", importance=0.5)
tube("chain-bottom", "Chain bottom run", "micro", "drive", [px(1318, 1563, CZ), (DJ[0], DJ[1] - 0.003, CZ)], 0.0024, "chain", importance=0.4)


# ---------------------------------------------------------------------------------------------------------------
def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.02, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.02, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    m.update({"emissive": color, "emissiveIntensity": {"base": 0.2}})
    m.update({"textureless": {"declared": True, "evidence": ["ref side photo: flat matte paint", "flat colour at sprite size"]}})
    m.update(extra)
    for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
        m.pop(field, None)
    return m



spec["materials"] = [
    material("frame", "Matte black aluminium", "metal", "#29292c", ["#252528"], 0.7, 0.2, "matte black frame",
             localOverrides=[{"id": "frame.matte", "kind": "linework", "notes": "soft matte sheen below sprite size: flat paint"}]),
    material("band", "Light logo band", "plastic", "#e8e8e8", ["#dedede"], 0.6, 0.0, "plain light band on the down tube, no letters",
             emissiveIntensity={"base": 0.35}),
    material("stripe", "Silver top tube stripe", "plastic", "#9fa0a4", ["#96979b"], 0.5, 0.2, "thin silver stripe under the top tube"),
    material("tyre", "Knobbly tyres", "rubber", "#222121", ["#1e1d1d"], 0.95, 0.0, "dark knobbly tyres"),
    material("rim", "Black rims and hubs", "metal", "#28282a", ["#242426"], 0.5, 0.3, "black rims and hubs"),
    material("spoke", "Black spokes", "metal", "#2a2a2c", ["#262628"], 0.5, 0.3, "thin black spokes"),
    material("stanchion", "Fork upper legs", "metal", "#3f3f42", ["#38383b"], 0.35, 0.4, "black fork upper legs with a soft sheen"),
    material("lower", "Fork lowers", "metal", "#222224", ["#1e1e20"], 0.6, 0.2, "darker matte fork lowers"),
    material("saddle", "Black saddle", "plastic", "#2b2b2d", ["#262628"], 0.7, 0.0, "black saddle"),
    material("grip", "Grips", "rubber", "#262626", ["#222222"], 0.9, 0.0, "black grips"),
    material("drive", "Black parts", "metal", "#222224", ["#1e1e20"], 0.5, 0.3, "crank, chainring, stem, bar, seatpost, derailleur"),
    material("cassette", "Cassette", "metal", "#46464a", ["#404044"], 0.4, 0.5, "dark steel cassette"),
    material("chain", "Chain", "metal", "#7d7468", ["#746b5f"], 0.4, 0.6, "bronze-grey chain"),
    material("disc", "Disc rotors", "metal", "#bdbbb7", ["#b2b0ac"], 0.3, 0.6, "silver disc rotors", emissiveIntensity={"base": 0.3}),
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
knobs = [i for i in ids if i.startswith("knob-")]
spec["repetitionSystems"] = [
    {"id": "spokes", "target": "root", "count": len(spokes), "elementComponentIds": spokes,
     "distribution": "32 per wheel, every 11.25 deg, alternating hub flanges", "notes": "4-sided thin black rods"},
    {"id": "knobs", "target": "root", "count": len(knobs), "elementComponentIds": knobs,
     "distribution": "30 per tyre, every 12 deg, alternating sides of the tread", "notes": "short stubs: a bumpy tyre edge at close range"},
]
L = FA[0] + WR - (RA[0] - WR)
spec["silhouette"] = {"boundingShape": f"about {L:.2f} wu long, bars at {px(0, 494)[1]:.2f} wu, saddle at {px(0, 456)[1]:.2f} wu",
                      "aspectRatios": ["length : bar height = 1.9 : 1", "wheel diameter : length = 0.4"],
                      "symmetry": "near mirror across the bike's centre plane, drivetrain on the right, discs on the left",
                      "dominantCurves": ["two big dark wheels", "flat wide bar"],
                      "negativeSpaces": ["the frame triangle", "between the spokes", "under the sloping top tube"],
                      "landmarks": ["light band on the down tube", "suspension fork", "saddle and bars at the same height"]}
spec["coordinateFrame"] = {"front": "+X", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m); avatar 0.9"}
spec["featureReviewTargets"] = [
    {"id": "wheels-frame", "name": "Two big dark wheels and a hardtail frame with a sloping top tube and a light down tube band",
     "tier": "critical", "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7,
     "mustPass": True, "componentRefs": ["wheel-rear", "wheel-front", "top-tube", "down-tube", "down-tube-band-R"]},
    {"id": "fork-bars", "name": "Suspension fork, flat wide bar and black saddle", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["fork-crown", "fork-lower-R", "bar-R", "saddle"]},
    {"id": "drivetrain", "name": "Exposed drivetrain and silver discs", "tier": "important",
     "passIds": ["form-refinement", "material-pass"], "minimumScore": 0.6, "mustPass": False,
     "componentRefs": ["chainring", "chain-top", "cassette", "disc-front"]},
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
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.3, "evidence": "fork and disc sheen"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 1.0, "notes": "game sprites use the converter rig"},
    {"id": "contact", "role": "shadow", "notes": "thin contact shadow under the wheels"},
]
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]))

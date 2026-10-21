"""ObjectSculptSpec for the harbour library (Linear POR-49) as a 7 x 7 tile city building.

Proportions: blockout D on the Figma board 732:3604 (Gustav, 2026-10-21: 7 x 7, low; round 0 was far too tall, it must
read wide and flat). A lopsided 8-sided top box hangs far out over a dark glass library hall that stands on a thinner,
lopsided 8-sided deck; the deck rests on round grey columns over a dark open ground floor with one closed glass block in
the south-east corner. A wide light stone stair goes down from the deck on the south side; the harbour is along the east
edge, behind a stone quay edge with bollards; light stone plaza all round.
Style: ref/style-grey.png (Figma 730:3605, the grey AI result with the quay and bollards): light grey perforated metal
skin with ONE thin blue-green window band, flat grey roof with white skylight boxes and solar panels, fine metal railing.
The AI image is style only: it is too tall and too regular.

Heights (wu): ground floor 0 .. 1.0, deck slab 1.0 .. 1.2 (railing 0.45 high), glass hall 1.2 .. 2.2, top box underside
sloping out from 64 % of its outline at 2.2 to the full outline at 2.45, facade 2.45 .. 3.0 with the band at 2.64 .. 2.84,
roof at 3.0 (skylights to about 3.1).

Frame: 1 unit = 1 wu (one tile edge, ~2 m). +Y up, the 8 x 8 footprint centred on the origin: X east, Z south. Building
plan points are given as (x, y) from blockout D's north-west corner (y south), as on the board, moved by (OX, OY) into the
plot and by -4 to the centre.
The south (+Z) and east (+X) sides face the default camera.
"""
import copy
import json
import math
import os
import sys

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
REF = "grey"
spec["viewEvidence"] = [
    {"id": REF, "view": "primary: AI image of the library from the iso camera (style, colour, identity features)",
     "image": f"{W}/ref/style-grey.png", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["lopsided many-sided top box, flat on top, sharp corners", "light grey perforated metal skin with one thin blue-green band",
                      "dark glass hall set back under the box", "deck with a fine metal railing on round grey columns, dark space under it",
                      "wide light stone stair down from the deck on the front-left", "flat grey roof with white skylight boxes and solar panels",
                      "harbour water on the right behind a quay edge with dark bollards"],
     "confidence": 0.85},
]

G = 0.04                          # water level: the root pad's top
PL = 0.04                         # plaza slab above the water (the quay edge)
H = 4.0                           # half footprint: the 7 x 7 building on an 8 x 8 plot, so the harbour wraps the north-east corner
OX, OY = 0.3, 0.65                 # the building's plan (blockout D) inside the plot: room for the water on the east and north,
                                  # and for the stair flights on the south
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
    """Box in model units (x east, z south); y in wu above the pavement top."""
    y0, y1 = G + y0, G + y1
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    C.append(comp(cid, name, level, role, "box", (x1 - x0, y1 - y0, z1 - z0), (cx, (y0 + y1) / 2, cz), material, contact=contact,
                  start=(cx, y0, cz), end=(cx, y1, cz), rot=rot, **kw))


def slab(cid, name, level, role, outer, holes, y0, y1, material, **kw):
    """A flat plate (a ring when it has holes): rounded-rectangle loops in plan (x, z), extruded from y0 up to y1.
    The shape is drawn in (x, -z) and turned -90 deg about X, so the extrusion runs up +Y."""
    xs = [p[0] for p in outer]
    zs = [p[1] for p in outer]
    profile = {"points": [r4((x, -z)) for x, z in outer], "depth": round(y1 - y0, 4),
               # holes wind against the outer loop, or THREE.ExtrudeGeometry turns their walls inside out (it only
               # re-winds holes when it has to flip the outer loop, and the (x, -z) mirror makes the outer loop clockwise)
               "holes": [[r4((x, -z)) for x, z in reversed(h)] for h in holes]}
    C.append(comp(cid, name, level, role, "extrude", (max(xs) - min(xs), y1 - y0, max(zs) - min(zs)), (0, G + y0, 0), material,
                  rot=[-math.pi / 2, 0, 0], scale=[1, 1, 1], descriptor={"profile2D": profile}, contact="resting",
                  start=(0, G + y0, 0), end=(0, G + y1, 0), **kw))

def frame_euler(xa, ya):
    """Three.js 'XYZ' Euler angles for a box whose local X, Y, Z axes point along xa, ya and xa x ya."""
    def norm(v):
        n = math.sqrt(sum(c * c for c in v)); return [c / n for c in v]
    xa = norm(xa)
    ya = [ya[i] - sum(xa[j] * ya[j] for j in range(3)) * xa[i] for i in range(3)]
    ya = norm(ya)
    za = [xa[1] * ya[2] - xa[2] * ya[1], xa[2] * ya[0] - xa[0] * ya[2], xa[0] * ya[1] - xa[1] * ya[0]]
    m11, m12, m13 = xa[0], ya[0], za[0]
    m22, m23 = ya[1], za[1]
    m32, m33 = ya[2], za[2]
    m21, m31 = xa[1], xa[2]
    y = math.asin(max(-1.0, min(1.0, m13)))
    if abs(m13) < 0.9999999:
        return [math.atan2(-m23, m33), y, math.atan2(-m12, m11)]
    return [math.atan2(m32, m22), y, 0.0]


def plate(cid, name, level, role, c0, c1, c2, c3, thick, material, **kw):
    """A flat box through four corner points (c0, c1 at the bottom, c3, c2 at the top), thick along its normal."""
    mid = [sum(p[i] for p in (c0, c1, c2, c3)) / 4 for i in range(3)]
    xa = [((c1[i] - c0[i]) + (c2[i] - c3[i])) / 2 for i in range(3)]
    ya = [((c3[i] - c0[i]) + (c2[i] - c1[i])) / 2 for i in range(3)]
    w = math.sqrt(sum(v * v for v in xa)); h = math.sqrt(sum(v * v for v in ya))
    rot = frame_euler(xa, ya)
    C.append(comp(cid, name, level, role, "box", (w, h, thick), (mid[0], G + mid[1], mid[2]), material, rot=rot, contact="flush-mount",
                  start=(mid[0], G + min(c0[1], c1[1]), mid[2]), end=(mid[0], G + max(c2[1], c3[1]), mid[2]), **kw))

def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.02, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.02, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    m.update({"emissive": color, "emissiveIntensity": {"base": 0.25}})
    m.update({"textureless": {"declared": True, "evidence": ["ref/style-grey.png (flat-shaded AI sprite)", SPR]}})
    m.update(extra)
    for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
        m.pop(field, None)
    return m

def rgba(h, a=1.0):
    h = h.lstrip("#")
    return f"rgba({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)}, {a})"



C = []


def m(pts, ox=0.0, oy=0.0):
    """Plot points (x, y from the north-west corner) to model (x, z), counter-clockwise in (x, z) like the slab loops."""
    out = [(x + ox - H, y + oy - H) for x, y in pts]
    area = sum(out[i][0] * out[(i + 1) % len(out)][1] - out[(i + 1) % len(out)][0] * out[i][1] for i in range(len(out)))
    return out if area > 0 else out[::-1]


def centroid(poly):
    a = cx = cz = 0.0
    for i in range(len(poly)):
        (x0, z0), (x1, z1) = poly[i], poly[(i + 1) % len(poly)]
        k = x0 * z1 - x1 * z0
        a += k; cx += (x0 + x1) * k; cz += (z0 + z1) * k
    return cx / (3 * a), cz / (3 * a)


def scaled(poly, s):
    cx, cz = centroid(poly)
    return [(cx + (x - cx) * s, cz + (z - cz) * s) for x, z in poly]


def edges(poly):
    """(start, end, unit tangent, outward unit normal, length) per edge; outward = away from the centroid."""
    cx, cz = centroid(poly)
    out = []
    for i in range(len(poly)):
        (x0, z0), (x1, z1) = poly[i], poly[(i + 1) % len(poly)]
        ln = math.hypot(x1 - x0, z1 - z0)
        tx, tz = (x1 - x0) / ln, (z1 - z0) / ln
        nx, nz = tz, -tx
        if nx * ((x0 + x1) / 2 - cx) + nz * ((z0 + z1) / 2 - cz) < 0:
            nx, nz = -nx, -nz
        out.append(((x0, z0), (x1, z1), (tx, tz), (nx, nz), ln))
    return out


def offset(poly, d):
    """Move every edge out by d (in by -d) and intersect neighbours: sharp corners stay sharp."""
    es = edges(poly)
    pts = []
    for i in range(len(es)):
        (a0, _, t0, n0, _), (b0, _, t1, n1, _) = es[i - 1], es[i]
        p = (a0[0] + n0[0] * d, a0[1] + n0[1] * d)
        q = (b0[0] + n1[0] * d, b0[1] + n1[1] * d)
        den = t0[0] * t1[1] - t0[1] * t1[0]
        s = ((q[0] - p[0]) * t1[1] - (q[1] - p[1]) * t1[0]) / den
        pts.append((p[0] + t0[0] * s, p[1] + t0[1] * s))
    return pts


def vplate(cid, name, level, role, p, t, n, w, y0, y1, out, thick, material, **kw):
    """A thin upright plate on a facade: centred on plan point p, w wide along t, standing out along n."""
    c = (p[0] + n[0] * (out + thick / 2), p[1] + n[1] * (out + thick / 2))
    a = (c[0] - t[0] * w / 2, c[1] - t[1] * w / 2)
    b = (c[0] + t[0] * w / 2, c[1] + t[1] * w / 2)
    plate(cid, name, level, role, [a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], thick, material, **kw)


def cyl(cid, name, level, role, x, z, r, y0, y1, material, **kw):
    y0, y1 = G + y0, G + y1
    C.append(comp(cid, name, level, role, "cylinder", (2 * r, y1 - y0, 2 * r), (x, (y0 + y1) / 2, z), material, contact="resting",
                  start=(x, y0, z), end=(x, y1, z), radius=r, **kw))


Y = lambda v: PL + v              # heights above the plaza top

# ---------------------------------------------------------------------------------------------------------------
# Plan (blockout D, Gustav 2026-10-21), in plot coordinates
def bplan(pts):
    """Building plan points (blockout D) to model."""
    return m(pts, OX, OY)


def bp(x, y):
    return x + OX - H, y + OY - H


DECK = bplan([(0.42, 0.83), (4.65, 0.00), (6.55, 0.97), (6.77, 4.07), (5.60, 6.30), (3.48, 6.46), (1.02, 5.58), (0.00, 2.44)])
BOX = bplan([(1.02, 1.08), (2.99, 0.44), (5.98, 1.16), (6.09, 3.77), (5.18, 5.89), (2.38, 5.96), (0.87, 5.51), (0.79, 2.71)])
HALL = (bp(1.93, 0)[0], bp(4.99, 0)[0], bp(0, 1.75)[1], bp(0, 4.81)[1])       # x0, x1, z0, z1
QX, QY = 7.25, 0.45                # quay edges (plot): the harbour lies east of x = QX and north of y = QY (photos: water on two sides)
PLAZA = m([(0.0, QY), (QX, QY), (QX, 8.0), (0.0, 8.0)])
GF, DECK_TOP, HALL_TOP, SOFFIT_TOP, ROOF = 1.0, 1.2, 2.2, 2.45, 3.0
BAND = (2.64, 2.84)
RAIL = 0.45

# Stair frame (round 6, from Gustav's stair photos; analysis on the review page): ONE grand stair at the east end of the
# south facade, its treads parallel to the deck edge from V (plan 3.48, 6.46) to B (plan 5.60, 6.30). It is cut into the
# deck: a notch DN deep back from that edge, so the top step reaches toward the glass hall, and it runs DOUT out onto the
# plaza. Its west end is a long diagonal (each step down reaches further west) carrying a dense bar railing, its east end a
# solid sloping cheek wall at the building corner.
from shapely.geometry import Polygon, box as sbox
from shapely import affinity
SE0 = edges(DECK)
V = min(DECK, key=lambda p: math.hypot(p[0] - bp(3.48, 6.46)[0], p[1] - bp(3.48, 6.46)[1]))
B = min(DECK, key=lambda p: math.hypot(p[0] - bp(5.60, 6.30)[0], p[1] - bp(5.60, 6.30)[1]))
si = next(i for i, e in enumerate(SE0) if {e[0], e[1]} == {V, B})
sl = math.hypot(B[0] - V[0], B[1] - V[1])
st = ((B[0] - V[0]) / sl, (B[1] - V[1]) / sl)             # along the edge, west to east
sn = SE0[si][3]                                           # out from the deck (south)
UT0, U1, UB0 = 0.45, sl - 0.08, -0.4                      # top step west end, east end, bottom step west end (along the edge from V)
DN, DOUT = 1.0, 0.8                                       # notch depth into the deck, run out onto the plaza
NS, SRISE = 11, 0.1                                       # 11 thin steps of 0.1 wu (the deck top is the 12th)
SRUN = (DN + DOUT) / NS


def spt(u, d):
    """Plan point u along the deck edge from V, d out from it (negative: into the deck)."""
    return V[0] + st[0] * u + sn[0] * d, V[1] + st[1] * u + sn[1] * d


def ccw(pts):
    a = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    return pts if a > 0 else pts[::-1]


NOTCH = Polygon([spt(UT0, -DN), spt(U1, -DN), spt(U1, 0.3), spt(UT0, 0.3)])


def cut(poly, pad=0.0):
    """poly minus the stair notch (grown by pad), as a counter-clockwise point list."""
    g = Polygon(poly).difference(NOTCH.buffer(pad, join_style=2))
    return ccw([tuple(map(float, c)) for c in list(g.exterior.coords)[:-1]])


for c_ in (spt(UB0, DOUT), spt(U1 + 0.1, DOUT)):
    assert c_[1] < H - 0.02, ("stair off the plot", c_)
DECK_CUT = cut(DECK)

# Root: the water, exactly the footprint, so the converter bbox starts at the footprint
C.append(comp("root", "Harbour water", "macro", "base", "box", (2 * H, G, 2 * H), (0, G / 2, 0), "water", parent=None,
              importance=0.7, conf=0.95, sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "water level"}],
              features=lf("root.water", "contour", "8 x 8 wu pad = the footprint; the harbour shows on the east and north"),
              topo="Flat pad: a box exactly the size of the footprint."))
slab("plaza", "Stone plaza", "macro", "ground", PLAZA, [], 0.0, PL, "paving", importance=0.7,
     features=lf("plaza.stone", "contour", "wide light stone plaza on the quay"), topo="Plaza: the plot minus the water, extruded.")

# Quay edge: a light coping along the water and dark bollards on it
quay_ids = []
for i, ((x0, z0), (x1, z1), t, n, ln) in enumerate(edges(PLAZA)):
    on_east = abs(x0 - (QX - H)) < 1e-6 and abs(x1 - (QX - H)) < 1e-6
    on_north = abs(z0 - (QY - H)) < 1e-6 and abs(z1 - (QY - H)) < 1e-6
    if not (on_east or on_north):                 # only the two edges along the water
        continue
    vplate(f"quay-edge-{i}", f"Quay edge {i}", "meso", "ground", ((x0 + x1) / 2, (z0 + z1) / 2), t, n, ln, G, G + PL + 0.03, -0.12, 0.12,
           "coping", importance=0.6, features=lf("quay-edge.coping", "contour", "light stone quay edge along the harbour") if not quay_ids else None,
           topo="Quay coping: a low stone strip along the water.")
    quay_ids.append(f"quay-edge-{i}")
    for k in range(max(1, round(ln / 1.1))):
        f = (k + 0.5) / max(1, round(ln / 1.1))
        bxp, bzp = x0 + (x1 - x0) * f - n[0] * 0.07, z0 + (z1 - z0) * f - n[1] * 0.07
        cyl(f"bollard-{i}-{k}", f"Bollard {i}.{k}", "micro", "ground", bxp, bzp, 0.04, Y(0.03), Y(0.13), "bollard", importance=0.4,
            features=lf("bollard.dark", "contour", "dark mooring bollard on the quay edge") if not quay_ids[1:] and k == 0 else None)
        cyl(f"bollard-cap-{i}-{k}", f"Bollard cap {i}.{k}", "micro", "ground", bxp, bzp, 0.055, Y(0.13), Y(0.16), "bollard", importance=0.3)

# ---------------------------------------------------------------------------------------------------------------
# Ground floor: a dark open space behind the column line, one closed glass block in the south-east corner
slab("ground-shadow", "Open ground floor (in shadow)", "macro", "ground-floor", cut(scaled(DECK, 0.8), 0.05), [], Y(0), Y(GF), "underdeck",
     importance=0.6, features=lf("ground-shadow.dark", "contour", "dark open space under the deck"), topo="Shadow core: the deck outline scaled in, extruded.")
GB = (bp(4.2, 0)[0], bp(5.45, 0)[0], bp(0, 3.8)[1], min(bp(0, 5.75)[1], spt(U1, -DN)[1] - 0.08))   # stops short of the stair notch
bx("ground-glass", "Ground floor glass block", "meso", "ground-floor", GB[0], GB[1], Y(0), Y(GF - 0.02), GB[2], GB[3], "glass-ground", importance=0.6,
   features=lf("ground-glass.block", "contour", "closed glass block in the south-east corner of the ground floor"))
for k in range(1, 5):
    x = GB[0] + (GB[1] - GB[0]) * k / 5
    bx(f"ground-mullion-s-{k}", f"Ground glass mullion S{k}", "micro", "ground-floor", x - 0.012, x + 0.012, Y(0), Y(GF - 0.02), GB[3], GB[3] + 0.012, "mullion", importance=0.2)
    z = GB[2] + (GB[3] - GB[2]) * k / 5
    bx(f"ground-mullion-e-{k}", f"Ground glass mullion E{k}", "micro", "ground-floor", GB[1], GB[1] + 0.012, Y(0), Y(GF - 0.02), z - 0.012, z + 0.012, "mullion", importance=0.2)

SE = SE0
yaw = -math.atan2(st[1], st[0])


def step_box(cid, name, level, u0, u1, d0, d1, top, material, **kw):
    cx, cz = spt((u0 + u1) / 2, (d0 + d1) / 2)
    C.append(comp(cid, name, level, "stair", "box", (u1 - u0, Y(top), d1 - d0 + 0.002), (cx, G + Y(top) / 2, cz), material, rot=[0, yaw, 0],
                  contact="resting", start=(cx, G, cz), end=(cx, G + Y(top), cz), **kw))


def sloped_rail(cid, name, pa, ya, pb, yb, mat="rail-top", hh=0.035, th=0.03):
    plate(cid, name, "meso", "stair", [pb[0], yb, pb[1]], [pa[0], ya, pa[1]], [pa[0], ya + hh, pa[1]], [pb[0], yb + hh, pb[1]], th,
          mat, importance=0.4)


def west_end(d):
    """The stair's west end at d out from the deck edge: the notch wall inside, the diagonal outside."""
    return UT0 if d <= 0 else UT0 + (UB0 - UT0) * min(1.0, d / DOUT)


# the grand stair: 11 thin light stone steps, treads parallel to the facade, each from its west end to the east cheek
stair_ids = []
for k in range(NS):
    d0, d1 = -DN + k * SRUN, -DN + (k + 1) * SRUN
    top = DECK_TOP - SRISE * (k + 1)
    u0 = west_end(d1)
    step_box(f"stair-{k + 1}", f"Grand stair step {k + 1}", "macro" if k == 0 else "meso", u0, U1, d0, d1, top, "stair" if k % 2 else "stair-alt",
             importance=0.8 if k == 0 else 0.6,
             features=lf("stair-1.step", "contour", "grand stair, treads parallel to the facade, cut into the deck") if k == 0 else None,
             topo="Stair step: a box from the ground to its tread.")
    ncx, ncz = spt((u0 + U1) / 2, d1 - 0.012)
    C.append(comp(f"stair-nose-{k + 1}", f"Grand stair nosing {k + 1}", "micro", "stair", "box", (U1 - u0, 0.01, 0.024), (ncx, G + Y(top) + 0.005, ncz),
                  "coping", rot=[0, yaw, 0], contact="flush-mount", start=(ncx, G + Y(top), ncz), end=(ncx, G + Y(top) + 0.01, ncz), importance=0.3))
    stair_ids.append(f"stair-{k + 1}")
    # the east cheek: a solid sloping wall in the deck edge's metal, a little above each tread
    step_box(f"stair-cheek-{k + 1}", f"Grand stair east cheek {k + 1}", "meso", U1, U1 + 0.08, d0, d1, top + 0.4, "deck-edge", importance=0.5,
             topo="Cheek wall: a thin box beside the step, 0.4 wu above its tread.")
sloped_rail("stair-cheek-coping", "Grand stair cheek coping", spt(U1 + 0.04, -DN), Y(DECK_TOP + 0.3), spt(U1 + 0.04, DOUT),
            Y(DECK_TOP - SRISE * NS + 0.3), "panel")
stair_ids.append("stair-cheek-coping")
# hand rails: 4 thin steel lines running the full height, evenly across the top width
for j in range(1, 5):
    u = UT0 + (U1 - UT0) * j / 5
    sloped_rail(f"stair-rail-{j}", f"Grand stair hand rail {j}", spt(u, -DN + 0.05), Y(DECK_TOP + 0.3), spt(u, DOUT - 0.05),
                Y(DECK_TOP - SRISE * NS + 0.3), "mullion", 0.02, 0.018)          # thin light steel (photos)
    for q in range(0, NS, 3):
        top = DECK_TOP - SRISE * (q + 1)
        vplate(f"stair-post-{j}-{q}", f"Grand stair rail post {j}.{q}", "micro", "stair", spt(u, -DN + (q + 0.5) * SRUN), sn, st, 0.012, Y(top),
               Y(top + 0.3), -0.006, 0.012, "mullion", importance=0.2)
    stair_ids.append(f"stair-rail-{j}")
# the diagonal west edge: a dense bar railing like the deck's, from the deck edge down to the bottom step's west end, and
# along the notch's west wall at deck level
dl = math.hypot((UB0 - UT0), DOUT)
nb = max(2, round(dl / 0.11))
for q in range(nb + 1):
    f = q / nb
    u, d = UT0 + (UB0 - UT0) * f, DOUT * f
    top = DECK_TOP - SRISE * min(NS, max(0, round((d + DN) / SRUN)))
    vplate(f"flight-bar-{q}", f"Diagonal railing bar {q}", "micro", "stair", spt(u - 0.02, d), st, sn, 0.016, Y(top), Y(top + RAIL), -0.008, 0.016, "rail",
           importance=0.3, features=lf("flight.rail", "linework", "dense bar railing along the stair's diagonal west edge") if q == 0 else None)
    stair_ids.append(f"flight-bar-{q}")
sloped_rail("flight-rail", "Diagonal railing top rail", spt(UT0 - 0.02, 0.0), Y(DECK_TOP + RAIL - 0.035), spt(UB0 - 0.02, DOUT),
            Y(DECK_TOP - SRISE * NS + RAIL - 0.035))
for q in range(round(DN / 0.11) + 1):
    d = -DN + DN * q / round(DN / 0.11)
    vplate(f"notch-bar-{q}", f"Notch railing bar {q}", "micro", "stair", spt(UT0 - 0.03, d), sn, st, 0.016, Y(DECK_TOP), Y(DECK_TOP + RAIL), -0.008, 0.016,
           "rail", importance=0.2)
sloped_rail("notch-rail", "Notch railing top rail", spt(UT0 - 0.03, -DN), Y(DECK_TOP + RAIL - 0.035), spt(UT0 - 0.03, 0.0), Y(DECK_TOP + RAIL - 0.035))
stair_ids += ["flight-rail", "notch-rail"]

# Columns: round grey columns along the deck edge, set in 0.25
col_ids = []
for i, ((x0, z0), (x1, z1), t, n, ln) in enumerate(edges(offset(DECK, -0.25))):
    cnt = max(1, round(ln / 1.15))
    for k in range(cnt):
        x, z = x0 + (x1 - x0) * k / cnt, z0 + (z1 - z0) * k / cnt
        if NOTCH.buffer(0.12).contains(Polygon([(x - 0.01, z - 0.01), (x + 0.01, z - 0.01), (x + 0.01, z + 0.01), (x - 0.01, z + 0.01)])):
            continue                                   # the stair fills the notch here
        cid = f"column-{i}-{k}"
        cyl(cid, f"Column {i}.{k}", "macro" if k == 0 else "meso", "column", x, z, 0.08, Y(0), Y(GF), "column", importance=0.8,
            features=lf("column.round", "contour", "round grey column under the deck edge") if not col_ids else None)
        col_ids.append(cid)

# ---------------------------------------------------------------------------------------------------------------
# Deck: a perforated metal edge band, a light floor, a fine railing (bars + top rail) with a gap at the stair
slab("deck", "Deck slab", "macro", "deck", DECK_CUT, [], Y(GF), Y(DECK_TOP), "deck-edge", importance=0.9,
     features=lf("deck.slab", "contour", "lopsided 8-sided deck, thinner and wider than the box above"), topo="Deck: the outline extruded.")
slab("deck-floor", "Deck floor", "meso", "deck", cut(offset(DECK, -0.04), 0.04), [], Y(DECK_TOP), Y(DECK_TOP + 0.008), "deck-floor", importance=0.6,
     topo="Deck floor: the outline set in, a thin plate on top.")
rail_ids = []
RL = offset(DECK, -0.03)
for i, ((x0, z0), (x1, z1), t, n, ln) in enumerate(edges(RL)):
    spans = [(0.0, 1.0)]
    if i == si:                                        # leave the stair's top open
        spans = [(0.0, (UT0 - 0.02) / ln), ((U1 + 0.08) / ln, 1.0)]   # open over the stair notch
    for j, (fa, fb) in enumerate(spans):
        pa = (x0 + (x1 - x0) * fa, z0 + (z1 - z0) * fa)
        pb = (x0 + (x1 - x0) * fb, z0 + (z1 - z0) * fb)
        span = (fb - fa) * ln
        cnt = max(2, round(span / 0.11))
        for k in range(cnt + 1):
            if k == cnt and fb == 1.0:
                continue                               # the next edge starts with a bar at this corner
            f = k / cnt
            cid = f"rail-bar-{i}-{j}-{k}"
            vplate(cid, f"Railing bar {i}.{j}.{k}", "micro", "deck", (pa[0] + (pb[0] - pa[0]) * f, pa[1] + (pb[1] - pa[1]) * f), t, n, 0.018,
                   Y(DECK_TOP), Y(DECK_TOP + RAIL), -0.01, 0.01, "rail", importance=0.3,
                   features=lf("railing-bar.fine", "linework", "fine metal railing bars") if not rail_ids else None)
            rail_ids.append(cid)
        mid = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
        for part, (ya, yb), th in (("top", (RAIL - 0.035, RAIL), 0.03), ("base", (0.01, 0.04), 0.02)):
            cid = f"rail-{part}-{i}-{j}"
            vplate(cid, f"Railing {part} rail {i}.{j}", "meso" if part == "top" else "micro", "deck", mid, t, n, span + 0.02,
                   Y(DECK_TOP + ya), Y(DECK_TOP + yb), -0.02, th, "rail-top", importance=0.5 if part == "top" else 0.3)
            rail_ids.append(cid)

# Deck edge panel joints (perforated metal panels)
joint_ids = []
for i, ((x0, z0), (x1, z1), t, n, ln) in enumerate(SE):
    cnt = max(1, round(ln / 0.45))
    for k in range(1, cnt):
        f = k / cnt
        if i == si and UT0 - 0.05 < f * ln < U1 + 0.1:
            continue                                   # no deck edge over the stair notch
        cid = f"deck-joint-{i}-{k}"
        vplate(cid, f"Deck panel joint {i}.{k}", "micro", "deck", (x0 + (x1 - x0) * f, z0 + (z1 - z0) * f), t, n, 0.02, Y(GF), Y(DECK_TOP),
               0.0, 0.006, "panel-joint", importance=0.2,
               features=lf("panel-joint.line", "linework", "joint between perforated panels") if not joint_ids else None)
        joint_ids.append(cid)

# ---------------------------------------------------------------------------------------------------------------
# Glass library hall, set back under the box: dark glass with light mullions
bx("hall-glass", "Library hall glass", "macro", "hall", HALL[0], HALL[1], Y(DECK_TOP), Y(HALL_TOP), HALL[2], HALL[3], "glass-dark", importance=0.9,
   features=lf("hall-glass.dark", "contour", "dark glass library hall set back under the top box"))
mull_ids = []
for k in range(1, 6):
    x = HALL[0] + (HALL[1] - HALL[0]) * k / 6
    z = HALL[2] + (HALL[3] - HALL[2]) * k / 6
    for cid, args in ((f"hall-mullion-s-{k}", (x - 0.012, x + 0.012, HALL[3], HALL[3] + 0.012)), (f"hall-mullion-n-{k}", (x - 0.012, x + 0.012, HALL[2] - 0.012, HALL[2])),
                      (f"hall-mullion-e-{k}", (HALL[1], HALL[1] + 0.012, z - 0.012, z + 0.012)), (f"hall-mullion-w-{k}", (HALL[0] - 0.012, HALL[0], z - 0.012, z + 0.012))):
        bx(cid, f"Hall mullion {cid[-3:]}", "micro", "hall", args[0], args[1], Y(DECK_TOP), Y(HALL_TOP), args[2], args[3], "mullion", importance=0.2)
        mull_ids.append(cid)
bx("hall-transom", "Hall transom", "micro", "hall", HALL[0] - 0.012, HALL[1] + 0.012, Y(DECK_TOP + 0.62), Y(DECK_TOP + 0.645), HALL[2] - 0.012, HALL[3] + 0.012,
   "mullion", importance=0.2)

# ---------------------------------------------------------------------------------------------------------------
# Top box: the underside slopes from 64 % of the outline at 2.2 out to the full outline at 2.45 (stepped plates), then the
# perforated facade to 3.0 with one blue-green window band, a parapet lip and the flat grey roof
NSTEP = 5
for k in range(NSTEP):
    s = 0.64 + 0.36 * (k + 1) / NSTEP
    y0 = HALL_TOP + (SOFFIT_TOP - HALL_TOP) * k / NSTEP
    slab(f"soffit-{k + 1}", f"Box underside step {k + 1}", "meso", "box", scaled(BOX, s), [], Y(y0), Y(SOFFIT_TOP), "soffit" if k < NSTEP - 1 else "soffit-edge",
         importance=0.6, features=lf("soffit-1.slope", "contour", "underside of the top box sloping in toward the hall") if k == 0 else None,
         topo="Underside step: the outline scaled about its centre, from this step's height up to the facade.")
slab("box-facade", "Box facade", "macro", "box", BOX, [], Y(SOFFIT_TOP), Y(ROOF), "panel", importance=0.95,
     features=lf("box-facade.skin", "contour", "light grey perforated metal skin on the lopsided top box"), topo="Facade: the outline extruded.")
slab("box-band", "Window band", "meso", "box", offset(BOX, 0.012), [], Y(BAND[0]), Y(BAND[1]), "band", importance=0.9,
     features=lf("box-band.teal", "contour", "one thin blue-green window band all round"), topo="Window band: the outline set out a little.")
slab("roof", "Roof", "macro", "roof", offset(BOX, -0.07), [], Y(ROOF), Y(ROOF + 0.005), "roof", importance=0.8,
     features=lf("roof.flat", "contour", "flat grey roof inside a light parapet lip"), topo="Roof: the outline set in, a thin plate on the facade block.")
slab("parapet", "Parapet lip", "meso", "roof", BOX, [offset(BOX, -0.07)], Y(ROOF), Y(ROOF + 0.05), "panel", importance=0.6,
     topo="Parapet: a thin ring on the roof edge, in the skin colour.")
for i, ((x0, z0), (x1, z1), t, n, ln) in enumerate(edges(BOX)):
    cnt = max(1, round(ln / 0.45))
    for k in range(1, cnt):
        p = (x0 + (x1 - x0) * k / cnt, z0 + (z1 - z0) * k / cnt)
        for part, (ya, yb) in (("lo", (SOFFIT_TOP, BAND[0])), ("hi", (BAND[1], ROOF + 0.05))):
            cid = f"panel-joint-{i}-{k}-{part}"
            vplate(cid, f"Panel joint {i}.{k} {part}", "micro", "box", p, t, n, 0.02, Y(ya), Y(yb), 0.0, 0.006, "panel-joint", importance=0.2)
            joint_ids.append(cid)
        cid = f"band-mullion-{i}-{k}"
        vplate(cid, f"Band mullion {i}.{k}", "micro", "box", p, t, n, 0.015, Y(BAND[0]), Y(BAND[1]), 0.012, 0.006, "band-mullion", importance=0.2)
        joint_ids.append(cid)

# Roof (photos): long low glass ridge roof lights, rows of solar panels between them, small grey vent boxes


def inside(poly, x, z):
    hit = False
    for i in range(len(poly)):
        (x0, z0), (x1, z1) = poly[i], poly[(i + 1) % len(poly)]
        if (z0 > z) != (z1 > z) and x < x0 + (z - z0) * (x1 - x0) / (z1 - z0):
            hit = not hit
    return hit


ROOF_SAFE = offset(BOX, -0.2)
RT = Y(ROOF + 0.005)
sky_ids = []
RL_, RW, RH = 1.3, 0.5, 0.15                     # ridge length (x), width (z), height above its curb
for j, (px, py) in enumerate(((2.6, 1.6), (4.6, 1.6), (1.9, 2.95), (3.9, 2.95), (4.6, 4.3), (2.4, 4.3), (3.6, 5.3))):
    x, z = bp(px, py)
    x0, x1 = x - RL_ / 2, x + RL_ / 2
    for cx_, cz_ in ((x0, z - RW / 2), (x1, z - RW / 2), (x0, z + RW / 2), (x1, z + RW / 2)):
        assert inside(ROOF_SAFE, cx_, cz_), ("ridge off the roof", px, py)
    cid = f"skylight-{j}"
    bx(cid, f"Roof light {j} curb", "meso", "roof", x0, x1, RT, RT + 0.05, z - RW / 2, z + RW / 2, "curb", importance=0.6,
       features=lf("skylight-1.box", "contour", "long low glass ridge roof light") if not sky_ids else None)
    for s in (-1, 1):                                # the two glass slopes, meeting at the ridge
        plate(f"skylight-{j}-glass-{'s' if s > 0 else 'n'}", f"Roof light {j} glass", "meso", "roof",
              [x0, RT + 0.05, z + s * RW / 2], [x1, RT + 0.05, z + s * RW / 2], [x1, RT + 0.05 + RH, z], [x0, RT + 0.05 + RH, z], 0.02,
              "skylight-glass" if s > 0 else "skylight-glass-shade", importance=0.6)
        for q in range(1, 6):                        # glazing bars across each slope
            gx = x0 + RL_ * q / 6
            plate(f"skylight-{j}-bar-{'s' if s > 0 else 'n'}{q}", f"Roof light {j} glazing bar", "micro", "roof",
                  [gx - 0.01, RT + 0.05, z + s * RW / 2], [gx + 0.01, RT + 0.05, z + s * RW / 2], [gx + 0.01, RT + 0.05 + RH, z],
                  [gx - 0.01, RT + 0.05 + RH, z], 0.03, "mullion", importance=0.2)
    bx(f"skylight-{j}-ridge", f"Roof light {j} ridge", "micro", "roof", x0, x1, RT + 0.05 + RH - 0.01, RT + 0.07 + RH, z - 0.015, z + 0.015, "mullion", importance=0.3)
    sky_ids.append(cid)
for j, (px0, px1, py) in enumerate(((1.7, 3.1, 2.3), (3.5, 5.4, 2.3), (1.5, 3.2, 3.65), (3.6, 5.5, 3.65), (1.6, 3.6, 4.9), (4.1, 5.0, 4.9))):
    (x0, z), (x1, _) = bp(px0, py), bp(px1, py)
    for cx_ in (x0, x1):
        assert inside(ROOF_SAFE, cx_, z - 0.13) and inside(ROOF_SAFE, cx_, z + 0.13), ("solar off the roof", px0, py)
    bx(f"solar-{j}", f"Solar row {j}", "micro", "roof", x0, x1, RT, RT + 0.03, z - 0.13, z + 0.13, "solar", importance=0.4)
    for q in range(1, round((x1 - x0) / 0.3)):
        gx = x0 + q * 0.3
        bx(f"solar-joint-{j}-{q}", f"Solar joint {j}.{q}", "micro", "roof", gx - 0.006, gx + 0.006, RT + 0.03, RT + 0.034, z - 0.13, z + 0.13, "solar-joint", importance=0.1)
for j, (px, py) in enumerate(((1.5, 2.0), (5.3, 2.0), (3.6, 1.2), (1.5, 4.7), (5.2, 3.3), (4.7, 5.4))):
    x, z = bp(px, py)
    assert inside(ROOF_SAFE, x, z), ("vent off the roof", px, py)
    bx(f"vent-{j}", f"Roof vent {j}", "micro", "roof", x - 0.13, x + 0.13, RT, RT + 0.1, z - 0.13, z + 0.13, "vent", importance=0.3)

# ---------------------------------------------------------------------------------------------------------------
SPR = "flat colour at sprite size (~62 px per wu at 2x density): no texture"
WHITE = {"emissiveIntensity": {"base": 0.45}}
# Contrast between the bands (Valtech lesson: never one flat white or grey mass): light skin, dark band, mid roof,
# darker underside in shadow, light deck edge over a dark ground floor.
spec["materials"] = [
    material("water", "Harbour water", "unknown", "#2f6c93", ["#2b6489"], 0.9, 0.0, "harbour water on the east and north (photos)"),
    material("paving", "Plaza stone", "stone", "#d8d1c4", ["#cec7ba"], 0.9, 0.0, "wide light stone plaza (grey result)"),
    material("coping", "Quay stone", "stone", "#e6e1d6", ["#dcd7cc"], 0.9, 0.0, "light stone quay edge and stair nosings", **WHITE),
    material("bollard", "Bollard", "metal", "#2b2f33", ["#262a2e"], 0.6, 0.4, "dark mooring bollards"),
    material("underdeck", "Ground floor in shadow", "stone", "#30363b", ["#2c3237"], 0.9, 0.0, "dark open space under the deck"),
    material("glass-ground", "Ground floor glass", "glass", "#3d5560", ["#385059"], 0.3, 0.0, "closed glass block, lighter than the shadow behind it"),
    material("mullion", "Mullion", "metal", "#9aa3a8", ["#929ba0"], 0.6, 0.3, "light mullions on the dark glass"),
    material("stair", "Stair stone", "stone", "#d3cbbd", ["#c9c1b3"], 0.9, 0.0, "wide light stone stair"),
    material("stair-alt", "Stair stone (alternate)", "stone", "#c6beb0", ["#bcb4a6"], 0.9, 0.0, "every other step a touch darker, so the steps count"),
    material("stair-cheek", "Stair cheek", "stone", "#bdb5a7", ["#b3ab9e"], 0.9, 0.0, "low stone side walls of the stair"),
    material("column", "Column grey", "stone", "#a7adb1", ["#9fa5a9"], 0.8, 0.0, "round grey columns"),
    material("deck-edge", "Deck edge (perforated metal)", "metal", "#bcc1c4", ["#b4b9bc"], 0.7, 0.2, "light grey perforated metal deck edge", **WHITE),
    material("deck-floor", "Deck floor", "stone", "#c9c6bf", ["#c1beb7"], 0.9, 0.0, "light grey deck surface (not cream: board note)"),
    material("rail", "Railing bars", "metal", "#7d858a", ["#757d82"], 0.5, 0.5, "fine metal railing bars"),
    material("rail-top", "Railing rail", "metal", "#9ba2a6", ["#939a9e"], 0.5, 0.5, "railing top and base rails"),
    material("panel-joint", "Panel joint", "metal", "#a3a9ad", ["#9ba1a5"], 0.7, 0.2, "joints between perforated panels"),
    material("glass-dark", "Dark glass", "glass", "#23323b", ["#1f2d35"], 0.3, 0.0, "dark glass library hall (grey result)"),
    material("soffit", "Box underside", "metal", "#7b8286", ["#737a7e"], 0.7, 0.2, "underside of the top box, in shadow"),
    material("soffit-edge", "Box underside edge", "metal", "#959ca0", ["#8d9498"], 0.7, 0.2, "outer step of the underside"),
    material("panel", "Perforated metal skin", "metal", "#ccd0d2", ["#c4c8ca"], 0.7, 0.2, "light grey perforated metal panels (grey result)", **WHITE,
             localOverrides=[{"id": "panel.perforation", "kind": "linework", "notes": "perforation below sprite size: flat light grey"}]),
    material("band", "Window band", "glass", "#2a7b80", ["#267177"], 0.3, 0.0, "the one thin blue-green window band"),
    material("band-mullion", "Band mullion", "metal", "#5f9599", ["#588c90"], 0.5, 0.3, "mullions in the window band"),
    material("roof", "Roof grey", "stone", "#8f9497", ["#878c8f"], 0.9, 0.0, "flat grey roof (grey result)"),
    material("curb", "Roof light curb", "metal", "#a2a8ab", ["#9aa0a3"], 0.7, 0.2, "grey curb under each roof light"),
    material("skylight-glass", "Roof light glass (lit side)", "plastic", "#c9dbe4", ["#c1d3dc"], 0.3, 0.1, "long glass ridge roof lights (photos)", **WHITE),
    material("skylight-glass-shade", "Roof light glass (far side)", "plastic", "#8fa9b8", ["#87a1b0"], 0.3, 0.1, "the far slope of each roof light, in shade"),
    material("vent", "Roof vent", "metal", "#b3b8bb", ["#abb0b3"], 0.7, 0.2, "small grey vent boxes on the roof (photos)"),
    material("solar", "Solar panel", "plastic", "#253f68", ["#223a60"], 0.7, 0.1, "solar panels by the skylights"),
    material("solar-joint", "Solar joint", "metal", "#a9b6c8", ["#a1aec0"], 0.5, 0.3, "light line across each solar panel"),
]
mats = {m_["id"]: m_ for m_ in spec["materials"]}
for c in C:
    m_ = mats[c["material"]]
    c["colorMaterialRecipe"] = {"dominantAlbedo": rgba(m_["baseColor"]), "secondaryAlbedo": rgba(m_["albedo"]["secondary"][0]),
                                "materialClass": m_["materialClass"], "materialClassConfidence": 0.75, "evidenceRefs": c["evidenceRefs"]}
spec["componentTree"] = C


def rep(rid, el, dist, target="root"):
    return {"id": rid, "target": target, "count": len(el), "elementComponentIds": el, "distribution": dist, "notes": ""}


spec["repetitionSystems"] = [
    rep("columns", col_ids, f"{len(col_ids)} round columns along the deck edge, about every 1.15 wu"),
    rep("railing", rail_ids, f"{len(rail_ids)} railing bars and rails, bars every ~0.11 wu, open at the stair"),
    rep("panel-joints", joint_ids, f"{len(joint_ids)} panel joints every ~0.45 wu on the deck edge and the box"),
    rep("skylights", sky_ids, f"{len(sky_ids)} long glass ridge roof lights, staggered"),
    rep("stair", stair_ids, f"grand stair: {NS} steps of {SRISE} wu, {U1 - UT0:.2f} wu wide at the top, {U1 - UB0:.2f} wu at the bottom"),
]
spec["silhouette"] = {"boundingShape": "8 x 8 wu plot, the 7 x 7 building in it; lopsided 8-sided top box 5.3 x 5.5 wu at 2.45 .. 3.0 wu over an 8-sided deck at 1.0 .. 1.2 wu",
                      "aspectRatios": ["footprint 8 : 8", "height 3.2 : width 7 (wide and flat)"],
                      "symmetry": "none: lopsided outlines, the wide stair on the south side, the water on the east and north",
                      "dominantCurves": [], "negativeSpaces": ["dark open ground floor under the deck", "the hall set back under the box"],
                      "landmarks": ["hovering grey box with one blue-green band", "deck with railing on round columns", "very wide south stair", "quay with bollards on two sides", "glass ridge roof lights"]}
spec["coordinateFrame"] = {"front": "+Z south", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m); avatar 0.9"}
spec["featureReviewTargets"] = [
    {"id": "top-box", "name": "Lopsided many-sided top box, flat roof, light perforated skin with one blue-green band, hanging far out", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["box-facade", "box-band", "roof", "soffit-1"]},
    {"id": "deck", "name": "Deck on round grey columns with a fine metal railing, dark open space under it", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["deck", "ground-shadow", col_ids[0], rail_ids[0]]},
    {"id": "hall", "name": "Dark glass hall set back under the box", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True, "componentRefs": ["hall-glass"]},
    {"id": "stair", "name": "Grand stair cut into the deck, treads parallel to the facade, diagonal west edge with a bar railing, sloping east cheek", "tier": "important",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.6, "mustPass": False, "componentRefs": ["stair-1", "stair-6", "stair-cheek-coping"]},
    {"id": "quay", "name": "Harbour on the east and north behind a quay edge with bollards, light stone plaza", "tier": "important",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.6, "mustPass": False, "componentRefs": ["root", "plaza", quay_ids[0]]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["iso south (yaw 45, pitch 30) like the grey result", "sprite south/west/north/east (turntable)",
                                              "2x close-up of the south side at the sprite camera"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 8000, "maxDrawCalls": 600, "textureSize": 256, "fpsTarget": 60})
spec["lightingFromPhoto"] = [
    {"id": "sky", "type": "hemisphere", "role": "key", "intensity": 1.0, "skyColor": "#f4f6f8", "groundColor": "#8a8378",
     "evidence": "grey result: even daylight"},
    {"id": "key", "type": "directional", "role": "key", "intensity": 1.4, "position": [-3, 6, 4], "direction": [0.4, -0.8, -0.5],
     "castsShadow": True, "evidence": "city rules section 3: key from screen upper left, 45 deg up"},
    {"id": "fill", "type": "directional", "role": "fill", "intensity": 0.4, "position": [5, 4, -3], "evidence": "keeps side faces readable"},
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.3, "evidence": "soft reflections on the glass"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 1.0, "notes": "game sprites use the converter rig"},
    {"id": "contact", "role": "shadow", "notes": "soft contact shadows under the box and the deck"},
]
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]), "columns", len(col_ids), "railing", len(rail_ids), "joints", len(joint_ids))

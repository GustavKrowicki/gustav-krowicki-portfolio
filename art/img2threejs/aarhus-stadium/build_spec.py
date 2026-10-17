"""ObjectSculptSpec for the new Aarhus stadium (opens 2027; Linear POR-36) as an 8 x 5 tile
city building.

Proportions: shape A on the Figma board 611:3604 (Gustav, 2026-10-16): a low stadium, ground floor + 1 storey (roof edge
at 2.6 wu), rounded-rectangle plan with large corners, a roof ring with a light inner band and an opening about 0.9 wu in
from the edge, 22 white tree columns from the facade line (0.6 wu inside the roof edge) bending out and up to the roof
edge, honey-coloured wood louvres between them over a dark glass band (0 .. 0.8 wu), blue seats and a green pitch seen
through the opening, the pitch's long axis along the 6-tile side.
Style + camera: ref/run4-style.png (Figma run 4, node 629:3613: GPT Image 2.5 Sunburst from the north-west aerial).
Facts: the competition renders and the 1:1000 site plan (~/Downloads/aarhus-stadium-refs/, kept outside the repo).
The red heritage hall (Stadionhallerne) stands beside one end of the stadium (Gustav, 2026-10-16: "side"); it is a
separate model, not part of this one.

Frame: 1 unit = 1 wu (one tile edge, ~2 m). +Y up, the pavement top at y = G, the 6 x 5 footprint centred on the origin:
X east (6 wu, -3..3), Z south (5 wu, -2.5..2.5). The south (+Z) and east (+X) sides face the default camera.
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
REF = "run4"
spec["viewEvidence"] = [
    {"id": REF, "view": "primary: AI image of the stadium from the iso camera (style, colour, identity features)",
     "image": f"{W}/ref/run4-style.png", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["smooth white roof ring with rounded corners and a light inner band", "white columns bending out and up into the roof edge",
                      "warm honey-coloured vertical wood between the columns", "dark glass band at the ground",
                      "blue seats and a green pitch seen through the roof opening", "panel strip along one long side of the roof (solar panels; Gustav 2026-10-17: on the south side)"],
     "confidence": 0.85},
]

G = 0.04                          # pavement pad top
HX, HZ = float(os.environ.get("STADIUM_W", "8")) / 2, 2.5   # half footprint: 8 x 5 (shape A was 6 x 5; Gustav, 2026-10-17: 7 x 5, then 8 x 5)
ROOF_TOP, ROOF_T = 2.6, 0.25      # roof edge at ground floor + 1 storey (1.4 + 1.2)
ROOF_BOT = ROOF_TOP - ROOF_T
RO = (HX - 0.05, HZ - 0.05, 1.9)  # roof outer edge: half x, half z, corner radius
RI = (RO[0] - 0.8, RO[1] - 0.8, 1.1)   # roof opening, 0.8 wu in from the edge (shape A: about 0.9)
BAND = 0.22                       # light inner band of the roof
DOUT = 0.8                        # how far the curved wall leans out, from the glass base to the roof edge
FB = (RO[0] - DOUT, RO[1] - DOUT, RO[2] - DOUT)   # base line: the glass base, set back under the overhang
FA = (FB[0] + 0.11, FB[1] + 0.11, FB[2] + 0.11)   # the wall at the stands' height: their outer boundary
FT = 0.1                          # facade wall thickness
GLASS_H = 0.8                     # dark glass band
COL_GAP = 0.662                   # tree column spacing along the facade line (22 columns on the 6 x 5 shape A)
PITCH = (1.6 + 0.25 * (2 * HX - 6), 1.0)   # half pitch (x, z), incl. the grass margin; a wider stadium gets a longer pitch
LINK_X = float(os.environ.get("LINK_X", "0"))   # the entrance link's centre (x): the 4 x 2 hall sits centred in front (8 x 5; the city draws
                                  # the stadium in slices, so the hall sorts in front of it)
PY = 1.3                          # pitch top (round 4: 1.3, so more of the pitch shows): the bowl sits on a podium over the concourse, so the pitch shows
                                  # through the opening at the 30 deg city camera (at ground level the near roof hides it)


def r4(v):
    return [round(float(x), 4) for x in v]


def rr(hx, hz, r, n=6):
    """Rounded rectangle, counter-clockwise in (x, z), n segments per corner."""
    pts = []
    for cx, cz, a0 in ((hx - r, hz - r, 0), (-(hx - r), hz - r, 90), (-(hx - r), -(hz - r), 180), (hx - r, -(hz - r), 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return pts


def perimeter_points(hx, hz, r, count, phase=0.5):
    """count points evenly spaced along a rounded rectangle, with outward normals; starts mid south side."""
    segs = []
    sx, sz = hx - r, hz - r
    # walk: south side east->west is +x .. -x at z = hz; build as a closed path of lines and arcs
    path = [("L", (sx, hz), (-sx, hz)), ("A", (-sx, sz), 90, 180), ("L", (-hx, sz), (-hx, -sz)), ("A", (-sx, -sz), 180, 270),
            ("L", (-sx, -hz), (sx, -hz)), ("A", (sx, -sz), 270, 360), ("L", (hx, -sz), (hx, sz)), ("A", (sx, sz), 0, 90)]
    for p in path:
        if p[0] == "L":
            (x0, z0), (x1, z1) = p[1], p[2]
            segs.append((math.hypot(x1 - x0, z1 - z0), p))
        else:
            segs.append((r * math.radians(p[3] - p[2]), p))
    total = sum(s[0] for s in segs)
    out = []
    for k in range(count):
        d = (k + phase) * total / count
        for length, p in segs:
            if d <= length + 1e-9:
                if p[0] == "L":
                    (x0, z0), (x1, z1) = p[1], p[2]
                    t = d / length if length else 0
                    x, z = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
                    nx, nz = (0, 1) if z0 == z1 and z0 > 0 else (0, -1) if z0 == z1 else (1, 0) if x0 > 0 else (-1, 0)
                else:
                    (cx, cz), a0, a1 = p[1], p[2], p[3]
                    a = math.radians(a0 + (a1 - a0) * d / length)
                    nx, nz = math.cos(a), math.sin(a)
                    x, z = cx + r * nx, cz + r * nz
                out.append((x, z, nx, nz))
                break
            d -= length
    return out, total


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


# ---------------------------------------------------------------------------------------------------------------
# Pavement pad (root): exactly the footprint, so the converter bbox starts at the footprint
C.append(comp("root", "Plaza", "macro", "base", "box", (2 * HX, G, 2 * HZ), (0, G / 2, 0), "paving", parent=None,
              importance=0.7, conf=0.95, sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "top of the plaza"}],
              features=lf("root.pad", "contour", f"{2 * HX:g} x {2 * HZ:g} wu plaza = the footprint (collision = footprint)"),
              topo="Flat pad: a box exactly the size of the footprint."))

# ---------------------------------------------------------------------------------------------------------------
# Facade (round 10, Gustav's renders 250903_1558_c08 and 07): the whole wall curves. The dark glass base sits on the base
# line FB, set back under the overhang; from there every white rib rises near-vertical and curves smoothly out (a quarter
# ellipse) to near-horizontal at the roof edge, and the honey wood fills every bay between the ribs from just above the
# glass up to the roof, following the same curve. Ribs and wood are built from short flat segments along that arc.
fb_out = rr(*FB, n=8)
fb_in = rr(FB[0] - FT, FB[1] - FT, FB[2] - FT, n=8)
slab("facade-glass", "Glass base", "macro", "facade", fb_out, [fb_in], 0.0, GLASS_H + 0.08, "glass-dark", importance=0.8,
     features=lf("facade-glass.band", "contour", "dark glass base all round, set back under the curved wall"),
     topo="Glass base: a rounded-rectangle ring extruded upward on the base line.")
slat_ids = []

# ---------------------------------------------------------------------------------------------------------------
# Roof ring: white plate, light inner band at the opening, solar panels on the south long side, white fascia
ro = rr(*RO, n=10)
ri = rr(*RI, n=8)
rb = rr(RI[0] + BAND, RI[1] + BAND, RI[2] + BAND, n=8)
# round 2: a rounded lip (run 4) from three stepped rings: the top plate set in 0.06, the lip at the full edge, the soffit
# set in 0.08 underneath
slab("roof", "Roof ring", "macro", "roof", rr(RO[0] - 0.06, RO[1] - 0.06, RO[2] - 0.06, n=10), [rb], ROOF_BOT + 0.04, ROOF_TOP, "roof-white",
     importance=0.95, features=lf("roof.ring", "contour", "smooth white roof ring with large rounded corners and a rounded lip"),
     topo="Roof plate: a rounded-rectangle ring extruded upward.")
slab("roof-lip", "Roof lip", "meso", "roof", ro, [rr(RO[0] - 0.3, RO[1] - 0.3, RO[2] - 0.3, n=10)], ROOF_BOT + 0.02, ROOF_TOP - 0.05,
     "roof-white", importance=0.7, topo="Roof lip: the outer edge ring, a little lower than the plate, for a rounded edge.")
slab("roof-soffit", "Roof soffit", "meso", "roof", rr(RO[0] - 0.08, RO[1] - 0.08, RO[2] - 0.08, n=10),
     [rr(RO[0] - 0.55, RO[1] - 0.55, RO[2] - 0.55, n=10)], ROOF_BOT - 0.06, ROOF_BOT + 0.03, "roof-white", importance=0.6,
     topo="Roof soffit: a ring under the edge, set in, so the lip curves back under.")
slab("roof-band", "Roof inner band", "meso", "roof", rb, [ri], ROOF_BOT + 0.05, ROOF_TOP - 0.02, "roof-light", importance=0.8,
     features=lf("roof-band.light", "contour", "light translucent band at the inner edge of the roof (PTFE)"),
     topo="Inner band: a thinner ring at the opening, set a little lower than the roof plate.")
# solar panels on the south long side of the roof (Gustav, 2026-10-17; run 4 shows the strip on the far side)
SOL = 1.6 + 0.5 * (2 * HX - 6)
bx("solar-panels", "Solar panels", "meso", "roof", -SOL, SOL, ROOF_TOP, ROOF_TOP + 0.015, RO[1] - 0.55, RO[1] - 0.25, "solar",
   contact="flush-mount", importance=0.5, features=lf("solar-panels.strip", "contour", "strip of solar panels along the south long side"),
   topo="Solar panel strip: a thin box on the roof.")
for i in range(1, round(2 * SOL / 0.4)):
    px = -SOL + 0.4 * i
    bx(f"solar-joint-{i}", f"Solar panel joint {i}", "micro", "roof", px - 0.012, px + 0.012, ROOF_TOP + 0.015, ROOF_TOP + 0.02,
       RO[1] - 0.55, RO[1] - 0.25, "white", contact="flush-mount", importance=0.2)

# ---------------------------------------------------------------------------------------------------------------
# Ribs ("tree columns") and the curved wood bays between them. A point on the wall at arc angle a (0 at the ground, 90 deg
# at the roof edge) sits at height H sin(a) and DOUT (1 - cos(a)) out from the base line, along the base line's normal.
H_ARC = ROOF_BOT + 0.03


FACADE = os.environ.get("FACADE", "curved")   # round 11 try: "straight" leans the ribs and wood in a straight line


def arc(a):
    # the wall stops 0.07 inside the roof edge, so the ribs' outer faces meet the lip from below
    if FACADE == "straight":
        return (DOUT - 0.07) * math.sin(a), H_ARC * math.sin(a)
    return (DOUT - 0.07) * (1 - math.cos(a)), H_ARC * math.sin(a)


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


_, cperim = perimeter_points(FB[0], FB[1], FB[2], 1)
perim = cperim
NCOL = round(cperim / COL_GAP)
gap = cperim / NCOL
phase = (((FB[0] - FB[2]) - LINK_X - gap / 2) / gap) % 1.0      # two ribs frame the entrance link at x = LINK_X
cols, _ = perimeter_points(FB[0], FB[1], FB[2], NCOL, phase=phase)
A_RIB = [math.radians(a) for a in (0, 14, 27, 39, 50, 60, 69, 77, 84, 90)]
A_GLASS = math.asin((GLASS_H + 0.04) / H_ARC)
A_WOOD = [A_GLASS] + [a for a in A_RIB if a > A_GLASS + 0.05]
RIB_W, RIB_D = 0.075, 0.06
col_ids = []


def wall_point(x, z, nx, nz, a, out=0.0):
    o, y = arc(a)
    return [x + nx * (o + out), y, z + nz * (o + out)]


for i, (x, z, nx, nz) in enumerate(cols):
    tx, tz = -nz, nx                                  # the base line's tangent here
    for j in range(len(A_RIB) - 1):
        a0, a1 = A_RIB[j], A_RIB[j + 1]
        p0, p1 = wall_point(x, z, nx, nz, a0, RIB_D / 2), wall_point(x, z, nx, nz, a1, RIB_D / 2)
        h = RIB_W / 2
        cid = f"column-{i + 1}-{j + 1}"
        plate(cid, f"Rib {i + 1} segment {j + 1}", "macro" if j == 0 else "meso", "column",
              [p0[0] - tx * h, p0[1], p0[2] - tz * h], [p0[0] + tx * h, p0[1], p0[2] + tz * h],
              [p1[0] + tx * h, p1[1], p1[2] + tz * h], [p1[0] - tx * h, p1[1], p1[2] - tz * h], RIB_D, "column-white",
              importance=0.9 if j == 0 else 0.6,
              features=lf("column-1-1.rib", "contour", "white rib rising near-vertical and curving out to the roof edge") if cid == "column-1-1" else None,
              topo="Rib segment: a flat box along the curved wall.")
        col_ids.append(cid)
    # the wood bay between this rib and the next, one plate per arc segment, a little behind the ribs
    x2, z2, nx2, nz2 = cols[(i + 1) % len(cols)]
    for j in range(len(A_WOOD) - 1):
        a0, a1 = A_WOOD[j], A_WOOD[j + 1]
        c0, c1 = wall_point(x, z, nx, nz, a0), wall_point(x2, z2, nx2, nz2, a0)
        c3, c2 = wall_point(x, z, nx, nz, a1), wall_point(x2, z2, nx2, nz2, a1)
        cid = f"wood-{i + 1}-{j + 1}"
        plate(cid, f"Wood bay {i + 1} segment {j + 1}", "meso", "facade", c0, c1, c2, c3, 0.03, "wood" if (i + j) % 2 == 0 else "wood-alt",
              importance=0.6, features=lf("wood-1-1.curve", "contour", "honey wood filling the bay, curving with the ribs") if cid == "wood-1-1" else None,
              topo="Wood bay segment: a flat box spanning two ribs along the curved wall.")
        slat_ids.append(cid)
        # two slat lines along the curve in each bay
        for q, f in enumerate((1 / 3, 2 / 3), 1):
            s0 = [c0[k] + (c1[k] - c0[k]) * f for k in range(3)]
            s1 = [c3[k] + (c2[k] - c3[k]) * f for k in range(3)]
            dx, dz = c1[0] - c0[0], c1[2] - c0[2]
            dl = math.hypot(dx, dz) or 1.0
            ux, uz = dx / dl * 0.009, dz / dl * 0.009
            nx_, nz_ = (nx + nx2) / 2 * 0.018, (nz + nz2) / 2 * 0.018
            sid = f"slat-{i + 1}-{j + 1}-{q}"
            plate(sid, f"Wood slat line {i + 1}.{j + 1}.{q}", "micro", "facade",
                  [s0[0] - ux + nx_, s0[1], s0[2] - uz + nz_], [s0[0] + ux + nx_, s0[1], s0[2] + uz + nz_],
                  [s1[0] + ux + nx_, s1[1], s1[2] + uz + nz_], [s1[0] - ux + nx_, s1[1], s1[2] - uz + nz_], 0.01, "wood-back",
                  importance=0.2)
            slat_ids.append(sid)

# ---------------------------------------------------------------------------------------------------------------
# Bowl (round 6, Gustav: "we can do better on the stands"): seven seat rows you can count at game size, raked steeply up
# toward the roof in ONE continuous tier (Gustav: the real stadium has one tier), with dark entrances (vomitories) in the
# middle rows; closed rounded corners
# that follow the roof ring; the top rows under the roof edge darker, as in its shadow. Each row is a blue riser body
# with a lighter seat tread on top; grey stair aisles cut the long stands into blocks; ad boards ring the pitch.
inner_wall = rr(FA[0] - FT + 0.005, FA[1] - FT + 0.005, FA[2] - FT, n=8)
NT, WALK_AFTER, WALK = 8, -1, 0.0          # rows; one tier, no walkway
BOARD = 0.09                               # ad boards + gap between the pitch and row 1
ROWX0, ROWZ0 = PITCH[0] + BOARD, PITCH[1] + BOARD
ROW_TOP = 2.26                             # top of the last row, just under the roof (2.35)
STEP = ((FA[1] - FT) - ROWZ0 - WALK - 0.05) / NT
STEPX = ((FA[0] - FT) - ROWX0 - WALK - 0.05) / NT
RISES = [1.0] * NT
RISE = (ROW_TOP - (PY + 0.04)) / sum(RISES)
ROWS = []                                  # per row: half x and z of its inner edge, and its top
top = PY + 0.04
for k in range(NT):
    extra = WALK if k > WALK_AFTER else 0.0
    top += RISE * RISES[k]
    ROWS.append((ROWX0 + STEPX * k + extra, ROWZ0 + STEP * k + extra, top))
tier_ids = []
for k, (hx, hz, top) in enumerate(ROWS):
    hole = rr(hx, hz, 0.3 + STEP * k, n=8)
    shade = "seat-riser-shadow" if k >= NT - 2 else "concrete"
    slab(f"tier-{k + 1}", f"Stand row {k + 1}", "meso", "stand", inner_wall, [hole], PY - 0.1, top - 0.03, shade, importance=0.6,
         topo="Stand row: a ring from its front edge out to the facade, one step higher than the row below.")
    tread = "seat-blue-shadow" if k >= NT - 2 else "seat-blue"
    seat_hole = rr(hx + 0.012, hz + 0.012, 0.3 + STEP * k + 0.012, n=8)
    slab(f"seats-{k + 1}", f"Seats {k + 1}", "meso", "stand", inner_wall, [seat_hole], top - 0.03, top, tread, importance=0.7,
         features=lf("seats-1.blue", "contour", "rows of blue seats, stepped, seen through the roof opening") if k == 0 else None,
         topo="Seat tread: a thin ring on top of the row.")
    tier_ids += [f"tier-{k + 1}", f"seats-{k + 1}"]

# a plain back wall behind the top row, up to the roof (round 11, Gustav: the inside "does not need to curve up under the
# roof"): it hides the curved wood wall's inner face, so the seat rake ends at a flat top row with the roof ring above
if os.environ.get("BACKWALL", "1") == "1":
  slab("stand-backwall", "Stand back wall", "meso", "stand", rr(FA[0] - FT + 0.005, FA[1] - FT + 0.005, FA[2] - FT, n=8),
     [rr(FA[0] - FT - 0.03, FA[1] - FT - 0.03, FA[2] - FT - 0.03, n=8)], ROWS[-1][2] - 0.03, ROOF_BOT + 0.04, "backwall", importance=0.5,
     topo="Back wall: a thin ring behind the top row, from the row up to the roof.")

# vomitories: dark tunnel mouths in a middle row's riser, on the long and the end stands
kv = 3
hxv, hzv, topv = ROWS[kv]
ybot = ROWS[kv - 1][2]
for i, xv in enumerate((-1.75, 1.75), 1):
    for s, side in ((1, "S"), (-1, "N")):
        z = s * hzv
        bx(f"vom-{side}-{i}", f"Vomitory {side}{i}", "micro", "stand", xv - 0.1, xv + 0.1, ybot - 0.002, topv - 0.03,
           min(z, z + s * 0.012), max(z, z + s * 0.012), "vomitory", contact="flush-mount", importance=0.4,
           features=lf("vom-S-1.dark", "contour", "dark tunnel mouth from the concourse into the seats") if (i == 1 and side == "S") else None)
for s, side in ((1, "E"), (-1, "W")):
    x = s * hxv
    bx(f"vom-{side}", f"Vomitory {side}", "micro", "stand", min(x, x + s * 0.012), max(x, x + s * 0.012), ybot - 0.002, topv - 0.03,
       -0.1, 0.1, "vomitory", contact="flush-mount", importance=0.4)


def row_cell(cid, name, k, lo, hi, side, material, **kw):
    """Cover row k's riser and tread between lo..hi along the stand (x on the long sides N/S, z on the ends E/W): stair
    steps for the aisles, seat pixels for the lettering. The cell runs from the row's front face back to the next row."""
    hx, hz, top = ROWS[k]
    ylo = ROWS[k - 1][2] if k > 0 else PY
    if side in ("N", "S"):
        d0 = hz - 0.002
        d1 = ROWS[k + 1][1] if k + 1 < NT else (FA[1] - FT)
        z0, z1 = (-d1, -d0) if side == "N" else (d0, d1)
        bx(cid, name, "micro", "stand", lo, hi, ylo, top + 0.003, z0, z1, material, contact="flush-mount", **kw)
    else:
        d0 = hx - 0.002
        d1 = ROWS[k + 1][0] if k + 1 < NT else (FA[0] - FT)
        x0_, x1_ = (-d1, -d0) if side == "W" else (d0, d1)
        bx(cid, name, "micro", "stand", x0_, x1_, ylo, top + 0.003, lo, hi, material, contact="flush-mount", **kw)


# grey stair aisles: one step cell per row, cutting the long stands into blocks and the ends in two
for k in range(NT):
    for i, xa in enumerate((-2.15, -1.1, 1.1, 2.15), 1):
        for side in ("N", "S"):
            if side == "N" and os.environ.get("LETTERS", "font57midw") not in ("fascia", "west"):
                continue                # the north stand carries the lettering
            cid = f"aisle-{side}{i}-{k + 1}"
            row_cell(cid, f"Stair aisle {side}{i} row {k + 1}", k, xa - 0.035, xa + 0.035, side, "aisle", importance=0.3,
                     features=lf("aisle-N1-1.steps", "contour", "grey stair aisle cutting the stand into blocks") if cid == "aisle-N1-1" else None)
            tier_ids.append(cid)
    for side in ("E", "W"):
        if side == "W" and os.environ.get("LETTERS", "font57midw") == "west":
            continue                    # the west stand carries the lettering
        cid = f"aisle-{side}-{k + 1}"
        row_cell(cid, f"Stair aisle {side} row {k + 1}", k, -0.035, 0.035, side, "aisle", importance=0.3)
        tier_ids.append(cid)

# ad boards round the pitch (light, so the pitch edge reads)
slab("ad-boards", "Ad boards", "micro", "pitch", rr(PITCH[0] + 0.06, PITCH[1] + 0.06, 0.12, n=4),
     [rr(PITCH[0] + 0.035, PITCH[1] + 0.035, 0.1, n=4)], PY, PY + 0.06, "boards", importance=0.4,
     features=lf("ad-boards.ring", "contour", "light advertising boards round the pitch"), topo="Ad boards: a low ring at the pitch edge.")

# Entrance (Gustav, 2026-10-17): the red hall south of the stadium is the way in. A brick link runs from the south
# glass band to the plot's south edge, where the hall's lobby meets it; it sits between two columns either side of LINK_X.
LINK = 0.22
bx("entrance-link", "Entrance link", "meso", "entrance", LINK_X - LINK, LINK_X + LINK, 0.0, 1.15, FB[1] - 0.02, HZ, "brick", importance=0.8,
   features=lf("entrance-link.brick", "contour", "brick link from the red hall's lobby to the stadium: the way in"),
   topo="Entrance link: a brick box from the facade to the plot edge.")
bx("entrance-link-cornice", "Entrance link cornice", "micro", "entrance", LINK_X - LINK - 0.03, LINK_X + LINK + 0.03, 1.1, 1.17, FB[1] - 0.02, HZ,
   "cornice", importance=0.3)

# Corner trees (round 2): one in each corner of the plot, outside the rounded roof (run 4 has trees all round the plaza)
tree_ids = []
for k, (sx, sz) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1)), 1):
    cx = sx * (RO[0] - RO[2] + 2.3 * 0.7071)
    cz = sz * (RO[1] - RO[2] + 2.3 * 0.7071)
    C.append(comp(f"tree-trunk-{k}", f"Tree trunk {k}", "micro", "tree", "cylinder", (0.08, 0.38, 0.08), (cx, G + 0.19, cz), "trunk",
                  importance=0.3, contact="resting", start=(cx, G, cz), end=(cx, G + 0.38, cz), radius=0.04,
                  topo="Tree trunk: a thin cylinder."))
    # round 4: a fuller clump (run 4): one big crown and two smaller lobes in a lighter green
    C.append(comp(f"tree-crown-{k}", f"Tree crown {k}", "meso", "tree", "sphere", (0.56, 0.5, 0.56), (cx, G + 0.62, cz), "crown",
                  importance=0.5, contact="resting", start=(cx, G + 0.37, cz), end=(cx, G + 0.87, cz),
                  features=lf("tree-crown-1.round", "contour", "full round tree crown in the plot corner") if k == 1 else None,
                  topo="Tree crown: a sphere."))
    for j, (ox, oy, oz, rr_) in enumerate(((-0.12, 0.82, 0.06, 0.34), (0.06, 0.74, -0.12, 0.3)), 1):
        C.append(comp(f"tree-lobe-{k}-{j}", f"Tree crown lobe {k}.{j}", "micro", "tree", "sphere", (rr_, rr_ * 0.92, rr_),
                      (cx + ox * sx, G + oy, cz + oz * sz), "crown-light", importance=0.3, contact="resting",
                      start=(cx + ox * sx, G + oy - rr_ / 2, cz + oz * sz), end=(cx + ox * sx, G + oy + rr_ / 2, cz + oz * sz),
                      topo="Crown lobe: a smaller sphere."))
        tree_ids.append(f"tree-lobe-{k}-{j}")
    tree_ids += [f"tree-trunk-{k}", f"tree-crown-{k}"]

# AARHUS (round 8 tries, Gustav: "try a bit more with AARHUS on the seats"). LETTERS picks the version:
#   fascia     white on a blue panel on the roof's inner edge above the north stand (round 7, the fallback)
#   rows8      3 x 5 font stretched over all 8 seat rows of the north stand, white seat cells (riser + tread)
#   rows8dark  as rows8, with a dark navy seat block behind the letters for contrast
#   font57     5 x 7 font in yellow seats over the top 7 rows of the north stand
#   west       as rows8dark, on the west end stand (its rows also face the default camera)
#   font57dark 5 x 7 font in white seats on a dark navy block, top 7 rows of the north stand
#   font57mid  5 x 7 font in yellow, kept to the straight middle of the north stand (narrower)
#   font57midw as font57mid in white seats (AGF's white and blue)
LETTERS = os.environ.get("LETTERS", "font57midw")   # Gustav, 2026-10-17: C4
FONT = {"A": [".#.", "#.#", "###", "#.#", "#.#"], "R": ["##.", "#.#", "##.", "#.#", "#.#"], "H": ["#.#", "#.#", "###", "#.#", "#.#"],
        "U": ["#.#", "#.#", "#.#", "#.#", "###"], "S": [".##", "#..", ".#.", "..#", "##."]}
FONT57 = {"A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
          "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
          "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
          "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
          "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."]}
WORD = "AARHUS"
letter_ids = []
if LETTERS == "fascia":
    ZS = -RI[1]                                # the roof opening's north edge (its face looks south, into the bowl)
    YS0, YS1 = ROOF_BOT + 0.01, ROOF_TOP - 0.01
    PX = (YS1 - YS0 - 0.03) / 5
    x0 = -(len(WORD) * 4 - 1) * PX / 2
    bx("sign-panel", "AARHUS fascia panel", "meso", "roof", x0 - 2 * PX, -x0 + 2 * PX, YS0, YS1, ZS, ZS + 0.01, "seat-blue",
       contact="flush-mount", importance=0.5, features=lf("sign-panel.fascia", "contour", "blue fascia panel on the roof's inner edge"),
       topo="Sign panel: a thin box on the roof's inner face.")
    for li, ch in enumerate(WORD):
        for r, row in enumerate(FONT[ch]):
            for c, on in enumerate(row):
                if on != "#":
                    continue
                xa = x0 + (li * 4 + c) * PX
                ya = YS0 + 0.015 + (4 - r) * PX
                cid = f"seat-letter-{li + 1}-{r}{c}"
                bx(cid, f"Sign letter {ch} {r}{c}", "micro", "roof", xa, xa + PX, ya, ya + PX, ZS + 0.01, ZS + 0.018, "seat-white",
                   contact="flush-mount", importance=0.3,
                   features=lf("seat-letter-1-02.word", "linework", "AARHUS in white on the fascia") if not letter_ids else None)
                letter_ids.append(cid)
else:
    f57 = LETTERS.startswith("font57")
    font = FONT57 if f57 else FONT
    fh, fw = len(font["A"]), len(font["A"][0])
    rows = 7 if f57 else NT                       # seat rows the word spans, counted down from the top row
    side = "W" if LETTERS == "west" else "N"
    span = 2 * ((FA[1] - FT) - 0.35) if side == "W" else (2 * ((FA[0] - FT) - FA[2] + 0.3) if LETTERS in ("font57mid", "font57midw") else 2 * ((FA[0] - FT) - 0.55))
    cols = len(WORD) * (fw + 1) - 1
    PX = span / cols
    colour = "seat-yellow" if LETTERS in ("font57", "font57mid") else "seat-white"
    dark = LETTERS in ("rows8dark", "west", "font57dark")
    for j in range(rows):                      # j = 0 is the top row
        k = NT - 1 - j
        fr = j * fh // rows                    # the font row this seat row shows
        for col in range(cols):
            li, c = divmod(col, fw + 1)
            on = c < fw and font[WORD[li]][fr][c] == "#"
            if not on and not dark:
                continue
            a0 = -span / 2 + col * PX
            lo, hi = (a0, a0 + PX) if side == "N" else (-(a0 + PX), -a0)     # the west stand reads toward -z
            cid = f"seat-letter-{j}-{col}" if on else f"seat-block-{j}-{col}"
            row_cell(cid, f"AARHUS seat {j}.{col}", k, lo, hi, side, colour if on else "seat-dark", importance=0.3,
                     features=lf("seat-letter-0-1.word", "linework", "AARHUS spelt in seats") if (on and not letter_ids) else None)
            letter_ids.append(cid)

# Pitch with white lines
bx("pitch", "Pitch", "macro", "pitch", -PITCH[0] - 0.08, PITCH[0] + 0.08, PY - 0.1, PY, -PITCH[1] - 0.08, PITCH[1] + 0.08, "grass", importance=0.9,
   features=lf("pitch.green", "contour", "green pitch, long axis east-west"), topo="Pitch: a flat box.")
LW, PX, PZ = 0.025, PITCH[0] - 0.12, PITCH[1] - 0.1
for cid, x0, x1, z0, z1 in (("line-n", -PX, PX, -PZ, -PZ + LW), ("line-s", -PX, PX, PZ - LW, PZ), ("line-w", -PX, -PX + LW, -PZ, PZ),
                            ("line-e", PX - LW, PX, -PZ, PZ), ("line-half", -LW / 2, LW / 2, -PZ, PZ),
                            ("box-w-n", -PX, -PX + 0.5, -0.6, -0.6 + LW), ("box-w-s", -PX, -PX + 0.5, 0.6 - LW, 0.6), ("box-w-f", -PX + 0.5 - LW, -PX + 0.5, -0.6, 0.6),
                            ("box-e-n", PX - 0.5, PX, -0.6, -0.6 + LW), ("box-e-s", PX - 0.5, PX, 0.6 - LW, 0.6), ("box-e-f", PX - 0.5, PX - 0.5 + LW, -0.6, 0.6)):
    bx(cid, f"Pitch line {cid}", "micro", "pitch", x0, x1, PY, PY + 0.005, z0, z1, "line-white", contact="flush-mount", importance=0.3)
C.append(comp("centre-circle", "Centre circle", "micro", "pitch", "torus", (0.6, 0.6, 0.02), (0, G + PY + 0.003, 0), "line-white",
              rot=[math.pi / 2, 0, 0], descriptor={"torusTubeRatio": 0.04}, importance=0.3, contact="flush-mount",
              start=(0, G + PY, 0), end=(0, G + PY + 0.006, 0), topo="Centre circle: a flat thin torus."))
for cid, x in (("goal-w", -PX - 0.04), ("goal-e", PX + 0.04)):
    bx(cid, f"Goal {cid[-1]}", "micro", "pitch", x - 0.03, x + 0.03, PY, PY + 0.12, -0.2, 0.2, "line-white", importance=0.3)

# ---------------------------------------------------------------------------------------------------------------
SPR = "flat colour at sprite size (~62 px per wu at 2x density): no texture"


def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.02, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.02, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    m.update({"emissive": color, "emissiveIntensity": {"base": 0.25}})
    m.update({"textureless": {"declared": True, "evidence": ["ref/run4-style.png (flat-shaded AI sprite)", SPR]}})
    m.update(extra)
    for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
        m.pop(field, None)
    return m


WHITE = {"emissiveIntensity": {"base": 0.45}}
spec["materials"] = [
    material("paving", "Plaza paving", "stone", "#d9d1c1", ["#cfc7b7"], 0.9, 0.0, "light plaza around the stadium (run 4)"),
    material("glass-dark", "Dark glass", "glass", "#2c3640", ["#26303a"], 0.3, 0.0, "dark glass band at the ground (run 4)"),
    material("wood-back", "Wood band", "wood", "#8f6227", ["#855a22"], 0.8, 0.0, "shadowed wood behind the louvres"),
    material("wood-alt", "Honey wood (alternate bays)", "wood", "#d9a85a", ["#cf9e50"], 0.8, 0.0, "every other wood segment, a touch darker, so the curve reads"),
    material("wood", "Honey wood louvres", "wood", "#e6b768", ["#dcad5e"], 0.8, 0.0, "warm honey-coloured vertical wood (run 4)"),
    material("white", "White trim", "stone", "#efeee9", ["#e5e4df"], 0.8, 0.0, "head band over the glass", **WHITE),
    material("roof-white", "Roof white", "metal", "#f1f0ec", ["#e7e6e2"], 0.6, 0.1, "smooth white roof ring (run 4; corrugated metal)", **WHITE,
             localOverrides=[{"id": "roof-white.corrugation", "kind": "linework", "notes": "corrugation below sprite size: flat white"}]),
    material("roof-light", "Roof inner band", "glass", "#f6ecd2", ["#efe4c8"], 0.4, 0.0, "light translucent band at the inner roof edge (PTFE)",
             emissiveIntensity={"base": 0.6}),
    material("solar", "Solar panels", "glass", "#4f6d93", ["#48658a"], 0.3, 0.1, "solar panel strip on the south roof (run 4 strip, Gustav: solar panels)"),
    material("brick", "Red brick", "stone", "#b8573f", ["#ad5039"], 0.9, 0.0, "brick entrance link, as the red hall"),
    material("cornice", "Cornice", "stone", "#e9e3d6", ["#dfd9cc"], 0.8, 0.0, "light stone cornice, as the red hall", emissiveIntensity={"base": 0.4}),
    material("column-white", "Column white", "stone", "#f3f2ee", ["#e9e8e4"], 0.8, 0.0, "white precast concrete tree columns", **WHITE),
    material("concrete", "Seat rows", "plastic", "#2b4f8c", ["#284a84"], 0.7, 0.0, "seat rows on the stand risers (blue, darker than the treads)"),
    material("seat-riser-shadow", "Seat rows in shadow", "plastic", "#22416f", ["#203d69"], 0.7, 0.0, "top rows under the roof edge, in its shadow"),
    material("seat-blue-shadow", "Blue seats in shadow", "plastic", "#33599a", ["#2f5490"], 0.6, 0.0, "top seat treads under the roof edge"),
    material("seat-yellow", "Yellow seats", "plastic", "#f2c230", ["#e8b828"], 0.6, 0.0, "AARHUS in yellow seats (try)", emissiveIntensity={"base": 0.4}),
    material("seat-dark", "Dark seats", "plastic", "#16223a", ["#141f35"], 0.7, 0.0, "dark navy seat block behind the letters (try)"),
    material("seat-white", "White seats", "plastic", "#f4f4f0", ["#eaeae6"], 0.7, 0.0, "AARHUS in white seats", emissiveIntensity={"base": 0.45}),
    material("vomitory", "Vomitory", "stone", "#1e242c", ["#1a2027"], 0.9, 0.0, "dark entrances into the concourse"),
    material("backwall", "Stand back wall", "stone", "#3b4454", ["#363f4e"], 0.9, 0.0, "plain back wall behind the top row, in the roof's shadow"),
    material("aisle", "Stair aisles", "stone", "#a9adb3", ["#a0a4aa"], 0.9, 0.0, "grey stair aisles between the seat blocks"),
    material("boards", "Ad boards", "plastic", "#e8edf3", ["#dfe4ea"], 0.6, 0.0, "light advertising boards round the pitch", emissiveIntensity={"base": 0.4}),
    material("seat-blue", "Blue seats", "plastic", "#3f6fbf", ["#3a68b5"], 0.6, 0.0, "blue seats (run 4, the AARHUS seat lettering is below sprite size)"),
    material("trunk", "Tree trunk", "wood", "#6b4a2f", ["#62432a"], 0.9, 0.0, "tree trunks (run 4)"),
    material("crown", "Tree crown", "unknown", "#5f8f34", ["#57852f"], 0.95, 0.0, "round green crowns (run 4)"),
    material("crown-light", "Tree crown light", "unknown", "#7fab45", ["#76a03f"], 0.95, 0.0, "lighter crown lobes (run 4)"),
    material("grass", "Pitch grass", "unknown", "#4f9a3f", ["#478f38"], 0.95, 0.0, "green pitch"),
    material("line-white", "Pitch lines", "plastic", "#f4f4f0", ["#eaeae6"], 0.8, 0.0, "white pitch lines and goals", **WHITE),
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


def rep(rid, el, dist, target="root"):
    return {"id": rid, "target": target, "count": len(el), "elementComponentIds": el, "distribution": dist, "notes": ""}


spec["repetitionSystems"] = [
    rep("tree-columns", col_ids, f"{NCOL} columns evenly along the facade line ({perim:.2f} wu, every {perim / NCOL:.2f} wu)"),
    rep("wood-bays", slat_ids, f"{len(slat_ids)} wood plates and slat lines in the bays between the ribs"),
    rep("stand-tiers", [i for i in tier_ids if i.startswith(("tier-", "seats-"))], f"{NT} rows, {STEP:.3f} wu deep and {RISE:.3f} wu high, each with a seat tread"),
]
spec["silhouette"] = {"boundingShape": f"{2 * HX:g} x {2 * HZ:g} wu plaza, rounded roof ring {2 * RO[0]:.1f} x {2 * RO[1]:.1f} wu at {ROOF_TOP} wu",
                      "aspectRatios": [f"footprint {2 * HX:g} : {2 * HZ:g}", f"height {ROOF_TOP} : length {2 * RO[0]:.1f}"],
                      "symmetry": "mirror about both axes (solar panels and the entrance link on the south side only)",
                      "dominantCurves": ["rounded roof corners (r 1.9 wu)", "columns bending out to the roof edge"],
                      "negativeSpaces": ["roof opening over the pitch", "covered walk between the columns and the facade"],
                      "landmarks": ["white roof ring", "tree columns", "honey wood band", "blue bowl and green pitch"]}
spec["coordinateFrame"] = {"front": "+Z south", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m); avatar 0.9"}
spec["featureReviewTargets"] = [
    {"id": "roof-ring", "name": "Smooth white roof ring with large rounded corners and a light inner band", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["roof", "roof-band"]},
    {"id": "tree-columns", "name": "White tree columns bending out and up into the roof edge", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["column-1-1", "column-6-5", "column-12-9"]},
    {"id": "facade", "name": "Curved honey wood bays between the ribs over a set-back dark glass base", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["facade-glass", "wood-1-1", "wood-1-4"]},
    {"id": "bowl", "name": "Blue seats and a green pitch seen through the roof opening", "tier": "important",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.6, "mustPass": False,
     "componentRefs": ["pitch", "seats-1", "seats-3"]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["iso south (yaw 45, pitch 30) like run 4", "sprite south/west/north/east (turntable)",
                                              "2x close-up of the south side at the sprite camera"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 6000, "maxDrawCalls": 400, "textureSize": 256, "fpsTarget": 60})
spec["lightingFromPhoto"] = [
    {"id": "sky", "type": "hemisphere", "role": "key", "intensity": 1.0, "skyColor": "#f4f6f8", "groundColor": "#8a8378",
     "evidence": "run 4: even daylight"},
    {"id": "key", "type": "directional", "role": "key", "intensity": 1.4, "position": [-3, 6, 4], "direction": [0.4, -0.8, -0.5],
     "castsShadow": True, "evidence": "city rules section 3: key from screen upper left, 45 deg up"},
    {"id": "fill", "type": "directional", "role": "fill", "intensity": 0.4, "position": [5, 4, -3], "evidence": "keeps side faces readable"},
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.3, "evidence": "soft reflections on the glass"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 1.0, "notes": "game sprites use the converter rig"},
    {"id": "contact", "role": "shadow", "notes": "soft contact shadows under the roof ring"},
]
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]), "columns", len(col_ids), "louvres", len(slat_ids),
      "column spacing", round(perim / NCOL, 3))

"""ObjectSculptSpec for LEGO HQ at avatar scale, grey box on the real campus outline (Linear POR-25).

Layout authority: plan.py, the campus outline traced from map data, turned so the walls line up and fitted to the walk
grid (15 x 11 tiles). Rooms and route: Figma board ON368BJhWf2SAwqRvlaHVH, node 651:3604 (door, lobby, 1 shelf room,
2 test room, 3 team room, 4 Systems map room, 5 AI lab). Scale: docs/city-rules.md (avatar 0.9 wu, door 1.0, ground
storey 1.4, upper storey 1.2). Grey box only: shell, rooms, doors, green roofs with courtyards, one labelled grey
block per room where its hero object will go. No detail yet.

Frame: 1 unit = 1 wu (one tile edge, ~2 m). +Y up, the plot top at y = G, the plot centred on the origin.
Plan tiles (gx right, gy down) map to X = gx - PW / 2 (east) and Z = gy - PH / 2 (south). The south (+Z) and east (+X)
sides face the default camera; the main door is on the south front, facing the plaza, under the yellow 2 x 4 plate.

States (one model, see lib/city/models/legoHqAvatarStates.ts):
- ids starting "roof-": the upper storey, roofs, parapets, the plate over the door.
- the ground storey walls are split: "wall-<side>-..." 0 to 0.35 wu (always shown) and "upper-<side>-..." 0.35 to
  1.4 wu; side N/S/E/W for outside walls (the side of the room the wall is on), C for walls round a courtyard and I for
  walls between rooms.
- "lowcap-<side>-..." dark caps on the cut walls, "topcap-<side>-..." caps on walls that stay high.
Roof on: everything except lowcap-/topcap-. Roof off (one sprite view): hide roof-, keep upper-/topcap- only for the
two far sides of that view, show lowcap- for the rest. The avatar walks on the room floors (G).
"""
import copy
import json
import math
import sys

from shapely.geometry import LineString, MultiLineString, Point, Polygon, box
from shapely.ops import linemerge, unary_union

W = sys.argv[1]
sys.path.insert(0, W)
import plan  # noqa: E402

spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
AI, PLAN = "ai-studio-campus", "board-plan"
spec["viewEvidence"] = [
    {"id": AI, "view": "primary: AI Studio game-like image of the LEGO campus (style, colour, identity features)",
     "image": f"{W}/ref/ai-studio-campus.jpg", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["green roofs with dark parapets", "round building with a round courtyard", "many square courtyards",
                      "yellow 2 x 4 plate over the main door"],
     "confidence": 0.85},
    {"id": PLAN, "view": "layout + scale target: the real campus outline fitted to the walk grid (plan.py)",
     "image": f"{W}/ref/board-massing-roof-on.png", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["rooms and doors on whole tiles", "two storeys", "main door at the back of the south forecourt"],
     "confidence": 0.9},
]

G = 0.06             # plot slab top
G1, ST = 1.4, 1.2    # ground storey, upper storey
H2 = G1 + ST
PAR, CUT, WT, CAP = 0.15, 0.35, 0.12, 0.05
XROT = [-math.pi / 2, 0, 0]
PW, PH = float(plan.PW), float(plan.PH)


def X(gx):
    return gx - PW / 2


def Z(gy):
    return gy - PH / 2


def area(poly):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1])) / 2


def r4(v):
    return [round(float(x), 4) for x in v]


def prof(poly):
    return [[round(x, 4), round(-z, 4)] for x, z in poly]


def comp(cid, name, level, role, primitive, dims, pos, material, *, rot=None, profile=None, importance=0.6, conf=0.75,
         features=None, evidence=None, topo="", sockets=None, contact="flush-mount", start=None, end=None, radius=None,
         channels=None, anim_role="static", parent="root"):
    c = copy.deepcopy(root_t)
    c.update({"id": cid, "name": name, "level": level, "role": role, "importance": importance, "confidence": conf,
              "primitive": primitive, "topologyClass": "assembled-solid",
              "topologyRationale": topo or f"Hard-surface {role}: a {primitive} at sprite scale.", "parent": parent,
              "material": material, "materialLayers": [material], "localFeatures": features or [],
              "evidenceRefs": evidence or [AI, PLAN]})
    gd = c["geometryDescriptor"]
    gd["topologyIntent"] = "hard-surface, flat faces, crisp edges"
    gd["edgeTreatment"] = {"type": "none", "bevelRadius": 0.0, "segments": 1}
    if profile:
        def orient(pts, ccw):
            return pts if (area(pts) > 0) == ccw else list(reversed(pts))
        gd["profile2D"] = dict(profile, points=orient(profile["points"], True), holes=[orient(h, False) for h in profile.get("holes", [])])
    c["dimensions"] = {"width": round(dims[0], 4), "height": round(dims[1], 4), "depth": round(dims[2], 4),
                       "units": "wu (1 tile edge, ~2 m)", "confidence": conf}
    p = list(pos) if parent is None else [pos[0], pos[1] - G / 2, pos[2]]
    c["transform"] = {"position": r4(p), "rotation": r4(rot or [0, 0, 0]),
                      "scale": r4(dims if primitive in ("box", "cylinder") else (1, 1, 1))}
    ap = c["actionProfile"]
    ap["animationRole"] = anim_role
    ap["pivot"] = {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": conf}
    ap["transformChannels"] = channels or {"translate": False, "rotate": False, "scale": False, "bend": False, "twist": False,
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


def bx(cid, name, level, role, x0, x1, y0, y1, z0, z1, material, *, contact="resting", plan_units=True, **kw):
    """Box from plan tiles (x0..x1 = gx, z0..z1 = gy) or model units (plan_units=False); y in wu above the plot top."""
    if plan_units:
        x0, x1, z0, z1 = X(x0), X(x1), Z(z0), Z(z1)
    y0, y1 = G + y0, G + y1
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    C.append(comp(cid, name, level, role, "box", (x1 - x0, y1 - y0, z1 - z0), (cx, (y0 + y1) / 2, cz), material, contact=contact,
                  start=(cx, y0, cz), end=(cx, y1, cz), **kw))


def cyl(cid, name, level, role, gx, gy, y0, h, r, material, **kw):
    x, z = X(gx), Z(gy)
    C.append(comp(cid, name, level, role, "cylinder", (2 * r, h, 2 * r), (x, G + y0 + h / 2, z), material, contact="resting",
                  start=(x, G + y0, z), end=(x, G + y0 + h, z), radius=r, **kw))


def ext(cid, name, level, role, poly, holes, y0, h, material, **kw):
    """Extrude a polygon in model units (x, z) from y0 (above the plot top) by h."""
    xs = [p[0] for p in poly]; zs = [p[1] for p in poly]
    cx, cz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    C.append(comp(cid, name, level, role, "extrude", (max(xs) - min(xs), h, max(zs) - min(zs)), (0, G + y0, 0), material, rot=XROT,
                  profile={"points": prof(poly), "depth": round(h, 4), "holes": [prof(hh) for hh in holes]},
                  start=(cx, G + y0, cz), end=(cx, G + y0 + h, cz), **kw))


def parts(geom):
    """Polygons of a shapely geometry, tiny slivers dropped."""
    gs = [geom] if geom.geom_type == "Polygon" else list(getattr(geom, "geoms", []))
    return [g for g in gs if g.geom_type == "Polygon" and g.area > 1e-3]


def model_ring(coords):
    pts = [(X(x), Z(y)) for x, y in list(coords)[:-1]]
    out = []
    for p in pts:      # drop repeats
        if not out or math.dist(out[-1], p) > 1e-4:
            out.append(p)
    return out


def ext_plan(cid, name, level, role, geom, y0, h, material, **kw):
    """Extrude a shapely plan geometry (tiles); one component per polygon part."""
    ps = parts(geom.simplify(0.002))
    for k, p in enumerate(ps, 1):
        ext(cid if len(ps) == 1 else f"{cid}-{k}", name if len(ps) == 1 else f"{name} {k}", level, role, model_ring(p.exterior.coords),
            [model_ring(i.coords) for i in p.interiors if Polygon(i).area > 1e-3], y0, h, material, **kw)


# ---------------------------------------------------------------------------------------------------------------
# Plot, plaza, statue
C.append(comp("root", "Plot (grass)", "macro", "base", "box", (PW, G, PH), (0, G / 2, 0), "grass", parent=None, importance=0.8, conf=0.95,
              sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "top of the plot"}],
              features=[{"id": "root.plot", "kind": "contour", "notes": "15 x 11 wu plot: sets the sprite bbox in both states"}],
              topo="Flat plot: a box. It fixes the converter's bbox, so roof-on and roof-off sprites share one scale."))
bx("plaza", "Plaza along the street", "macro", "ground", 0, PW, 0, 0.012, 10.0, PH, "paving", contact="flush-mount", importance=0.7,
   features=[{"id": "plaza.paving", "kind": "contour", "notes": "light paving along the south edge"}], topo="Plaza: a thin box.")
chk = 0
for i in range(12):        # checkerboard in front of the atrium, under the plate
    for j in range(2):
        if (i + j) % 2:
            continue
        chk += 1
        x0, z0 = 5.5 + 0.5 * i, 10.0 + 0.5 * j
        bx(f"plaza-check-{chk}", f"Plaza dark square {chk}", "micro", "ground", x0, x0 + 0.5, 0.012, 0.016, z0, z0 + 0.5, "check-dark",
           contact="flush-mount", importance=0.25, topo="Dark paving square: a thin box.")
bx("plaza-check-base", "Checkerboard light squares", "meso", "ground", 5.5, 11.5, 0.012, 0.014, 10.0, PH, "check-light", contact="flush-mount",
   importance=0.5, features=[{"id": "plaza.checker", "kind": "contour", "notes": "grey and white checkerboard paving in front of the atrium"}])

# Minifigure statue on the east grass in front of the building (clear of the walk row, in full view)
MX, MZ = 14.0, 9.0
bx("minifig-leg-w", "Minifigure west leg", "meso", "statue", MX - 0.24, MX - 0.02, 0, 0.42, MZ - 0.13, MZ + 0.13, "mf-blue", importance=0.6)
bx("minifig-leg-e", "Minifigure east leg", "meso", "statue", MX + 0.02, MX + 0.24, 0, 0.42, MZ - 0.13, MZ + 0.13, "mf-blue", importance=0.6)
bx("minifig-hips", "Minifigure hips", "meso", "statue", MX - 0.25, MX + 0.25, 0.42, 0.5, MZ - 0.13, MZ + 0.13, "mf-blue", importance=0.5)
bx("minifig-torso", "Minifigure torso", "macro", "statue", MX - 0.28, MX + 0.28, 0.5, 0.92, MZ - 0.14, MZ + 0.14, "mf-red", importance=0.85,
   features=[{"id": "minifig-torso.figure", "kind": "contour", "notes": "giant minifigure: blue legs, red torso, yellow head"}],
   topo="Torso block: a box.")
for sd_, gx_ in (("w", MX - 0.36), ("e", MX + 0.36)):
    bx(f"minifig-arm-{sd_}", f"Minifigure arm {sd_}", "meso", "statue", gx_ - 0.08, gx_ + 0.08, 0.58, 0.88, MZ - 0.08, MZ + 0.08, "mf-red", importance=0.5)
    cyl(f"minifig-hand-{sd_}", f"Minifigure hand {sd_}", "micro", "statue", gx_, MZ, 0.5, 0.1, 0.07, "mf-yellow", importance=0.4)
cyl("minifig-neck", "Minifigure neck", "micro", "statue", MX, MZ, 0.92, 0.04, 0.09, "mf-yellow", importance=0.3)
cyl("minifig-head", "Minifigure head", "meso", "statue", MX, MZ, 0.96, 0.26, 0.15, "mf-yellow", importance=0.7)
cyl("minifig-stud", "Minifigure head stud", "micro", "statue", MX, MZ, 1.22, 0.06, 0.08, "mf-yellow", importance=0.3)
cyl("minifig-plinth", "Statue plinth", "meso", "statue", MX, MZ, 0, 0.04, 0.42, "paving-light", importance=0.4)
for k, (gx_, gy_) in enumerate(((2.7, 9.4), (3.55, 9.4)), 1):     # round planters on the west grass (the city puts trees in them)
    cyl(f"planter-{k}", f"Round planter {k}", "meso", "prop", gx_, gy_, 0, 0.14, 0.33, "planter", importance=0.5)
    cyl(f"planter-{k}-soil", f"Planter {k} soil", "micro", "prop", gx_, gy_, 0.14, 0.01, 0.27, "court", importance=0.2)

# ---------------------------------------------------------------------------------------------------------------
# Rooms: floors from plan.py, courtyard lawns
ROOM_MAT = {"L": "floor-lobby", "S": "floor-shelf", "T": "floor-test", "M": "floor-team", "Y": "floor-map", "A": "floor-ai"}
ROOM_ID = {"L": "lobby", "S": "shelf", "T": "test", "M": "team", "Y": "map", "A": "ailab"}
REGION = {code: plan.room_region(code) for code in plan.ROOMS}
for code, (name, _k, _r) in plan.ROOMS.items():
    ext_plan(f"{ROOM_ID[code]}-floor", f"{name} floor", "macro", "floor", REGION[code], 0, 0.02, ROOM_MAT[code], importance=0.85,
             features=[{"id": f"{ROOM_ID[code]}-floor.tone", "kind": "stain", "notes": f"{name}: one flat floor tone (grey box)"}],
             topo="Room floor: the room's tiles cut to the building, a thin extrude.")
for cname in plan.ROOF_ONLY_COURTS:
    # a pool of daylight on the floor under the glazed light well
    ext_plan(f"{cname}-lightpool", f"Daylight under the {cname} light well", "micro", "floor", plan.COURTS[cname], 0.02, 0.006, "light-pool",
             importance=0.3, topo="Daylight patch on the floor: a very thin extrude.")
    ext_plan(f"roof-{cname}-glass", f"Glazing over the {cname} light well", "micro", "roof", plan.COURTS[cname], G1 - 0.04, 0.04, "glass-light",
             importance=0.4, topo="Glass roof of the light well at ceiling height: a thin extrude (roof on only).")
for cname, cg in plan.GROUND_COURTS.items():
    ext_plan(f"court-{cname}", f"Courtyard lawn ({cname})", "meso", "ground", cg.intersection(plan.SHELL), 0, 0.03, "court", importance=0.5,
             features=[{"id": f"court-{cname}.lawn", "kind": "contour", "notes": f"{cname} courtyard: lawn open to the sky"}],
             topo="Courtyard lawn: a thin extrude.")

# ---------------------------------------------------------------------------------------------------------------
# Ground storey walls: every area edge that is not shared with another area (open plan): outside walls take the side of
# the area they are on, walls round a courtyard are C (thickness inside the area).


def side_of(nx, ny):
    """Side name for an outward normal in plan axes (y down)."""
    if abs(nx) >= abs(ny):
        return "E" if nx > 0 else "W"
    return "S" if ny > 0 else "N"


def ring_segments(poly):
    for k, ring in enumerate([poly.exterior] + list(poly.interiors)):
        cs = list(ring.coords)
        ccw = Polygon(ring).exterior.is_ccw
        hole = k > 0
        for a, b in zip(cs, cs[1:]):
            if math.dist(a, b) < 1e-6:
                continue
            dx, dy = b[0] - a[0], b[1] - a[1]
            # interior on the left of a ccw ring (math axes); y is down here, so flip: outward = right of travel for ccw
            n = (dy, -dx) if ccw != hole else (-dy, dx)
            L = math.hypot(*n)
            yield a, b, (n[0] / L, n[1] / L)


# Outside walls that stand inside the view when the roof is off and hide a room behind them: cut in every view. The AI
# lab's north notch wall (z = 4, x 13..15) hides the lab's long table from the south camera.
CUT_ALWAYS = box(12.95, 3.8, 15.05, 4.2)
segs = {}      # (kind, side, owner) -> list of LineString
for code in plan.ROOMS:
    for poly in parts(REGION[code]):
        for a, b, n in ring_segments(poly.simplify(0.002)):
            mid = ((a[0] + b[0]) / 2 + n[0] * 0.05, (a[1] + b[1]) / 2 + n[1] * 0.05)
            other = next((o for o in plan.ROOMS if o != code and REGION[o].buffer(1e-6).contains(Point(mid))), None)
            if other:
                continue      # open plan: no wall between two areas
            elif any(cg.buffer(1e-6).contains(Point(mid)) for cg in plan.GROUND_COURTS.values()) or CUT_ALWAYS.contains(Point(mid)):
                segs.setdefault(("O", "C", code), []).append(LineString([a, b]))     # round a courtyard, or in CUT_ALWAYS: always cut
            else:
                segs.setdefault(("O", side_of(*n), code), []).append(LineString([a, b]))

# Outside zones (the campus buildings): round building, terrace building (south-west leg), brick leg (south-east), the
# glass atrium over the lobby; everything else is the light facade with narrow windows.
COURT_U = unary_union(list(plan.COURTS.values()))
ROUNDZ = plan.ROUND.intersection(plan.SHELL)
TERR = box(4, 7, 7, 10).intersection(plan.SHELL).difference(plan.ROUND)
BRICK = box(9, 7, 13, 10)
ATR = unary_union([box(6, 4, 10, 7), box(7, 7, 9, 10)]).intersection(plan.SHELL).difference(COURT_U)


def wall_mats(g, sd, owner):
    c = g.centroid
    if plan.ROUND.buffer(0.08).contains(c):
        return "brick", "glass-round"
    if sd == "C":
        return "facade", "facade"
    if TERR.buffer(0.08).contains(c):
        return "frame-dark", "glass-dark"
    if BRICK.buffer(0.08).contains(c):
        return "brick", "brick"
    if owner == "L":
        return "glass-atrium", "glass-atrium"
    return "facade", "facade"


win_ids = []
NORMAL = {"N": (0, -1), "S": (0, 1), "E": (1, 0), "W": (-1, 0)}


def windows_line(prefix, a, b, n, y_lo, y_hi):
    """Narrow windows, two per tile, every fifth a warm wood panel, on an axis-aligned outer face from a to b (plan)."""
    horiz = abs(a[1] - b[1]) < 1e-6
    if not horiz and abs(a[0] - b[0]) > 1e-6:
        return
    p0, p1 = sorted((a[0], b[0]) if horiz else (a[1], b[1]))
    f = a[1] if horiz else a[0]
    o = n[1] if horiz else n[0]
    t, k = math.floor(p0 * 2) / 2, 0
    while t < p1 - 0.05:
        c = t + 0.25
        t += 0.5
        if not (p0 + 0.18 <= c <= p1 - 0.18):
            continue
        k += 1
        wid = f"{prefix}-win-{k}"
        mat = "panel-wood" if (int(c * 2) % 5) == 2 else "window"
        f0, f1 = sorted((f, f + 0.03 * o))
        s0, s1 = sorted((f, f + 0.05 * o))
        if horiz:
            bx(wid, f"Window {prefix}.{k}", "micro", "window", c - 0.15, c + 0.15, y_lo, y_hi, f0, f1, mat, contact="applied", importance=0.3,
               topo="Narrow window on the facade: a thin box.")
            if mat == "window":
                bx(f"{wid}-sill", f"Window sill {prefix}.{k}", "micro", "trim", c - 0.19, c + 0.19, y_lo - 0.05, y_lo, s0, s1, "frame-light",
                   contact="applied", importance=0.25, topo="Window sill: a thin box.")
        else:
            bx(wid, f"Window {prefix}.{k}", "micro", "window", f0, f1, y_lo, y_hi, c - 0.15, c + 0.15, mat, contact="applied", importance=0.3,
               topo="Narrow window on the facade: a thin box.")
            if mat == "window":
                bx(f"{wid}-sill", f"Window sill {prefix}.{k}", "micro", "trim", s0, s1, y_lo - 0.05, y_lo, c - 0.19, c + 0.19, "frame-light",
                   contact="applied", importance=0.25, topo="Window sill: a thin box.")
        win_ids.append(wid)


DOOR_GAPS = []
for k, (x1, y1, x2, y2) in enumerate(plan.DOORS):
    w = 1.0 if k == 0 else 0.8
    if y1 == y2:      # vertical edge at x = max(x1, x2)
        ex, ey = max(x1, x2), y1 + 0.5
        DOOR_GAPS.append(box(ex - 0.2, ey - w / 2, ex + 0.2, ey + w / 2))
    else:
        ex, ey = x1 + 0.5, max(y1, y2)
        DOOR_GAPS.append(box(ex - w / 2, ey - 0.2, ex + w / 2, ey + 0.2))
GAPS = unary_union(DOOR_GAPS)

n_wall = {"N": 0, "S": 0, "E": 0, "W": 0, "I": 0, "C": 0}
wall_ids = []


def wall_stack(tag, geom, lo_mat, up_mat, what, curved=False):
    for cid, nm, y0, h, mat, role, contact in ((f"wall-{tag}", "low part", 0, CUT - CAP, lo_mat, "wall", "flush-mount"),
                                              (f"lowcap-{tag}", "low cap", CUT - CAP, CAP, "wall-cap", "trim", "applied"),
                                              (f"upper-{tag}", "upper part", CUT, G1 - CAP - CUT, up_mat, "wall", "flush-mount"),
                                              (f"topcap-{tag}", "top cap", G1 - CAP, CAP, "wall-cap", "trim", "applied")):
        ext_plan(cid, f"Wall {tag} {nm} ({what})", "meso" if role == "wall" else "micro", role, geom, y0, h, mat, contact=contact,
                 importance=0.6 if role == "wall" else 0.4,
                 topo=f"Ground storey wall, {nm}: the wall's plan shape extruded" + (" (curved)." if curved else "."))
    wall_ids.append(f"wall-{tag}")


for (kind, sd, owner), lines in sorted(segs.items()):
    merged = linemerge(MultiLineString(lines)) if len(lines) > 1 else lines[0]
    for line in (list(merged.geoms) if merged.geom_type == "MultiLineString" else [merged]):
        if kind == "I":
            geom = line.buffer(WT / 2, cap_style=2, join_style=2).difference(GAPS)
            what = "between rooms"
        else:
            geom = line.buffer(WT, cap_style=2, join_style=2).intersection(REGION[owner])
            if owner == "L":
                geom = geom.difference(DOOR_GAPS[0])      # the main door
            what = "courtyard" if sd == "C" else f"{sd} side"
        for g in parts(geom):
            n_wall[sd] += 1
            tag = f"{sd}-{n_wall[sd]}"
            lo, up = wall_mats(g, sd, owner)
            wall_stack(tag, g, lo, up, what, curved=len(g.exterior.coords) > 12)
            if up == "facade" and sd in NORMAL:      # windows on the upper part (hidden with it when the wall is cut)
                cs = list(line.coords)
                for q, (a, b) in enumerate(zip(cs, cs[1:]), 1):
                    if math.dist(a, b) > 0.6 and g.buffer(0.02).contains(Point((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)):
                        windows_line(f"upper-{tag}-{q}", a, b, NORMAL[sd], 0.4, 1.15)

# Main door: glass leaves in the 1.0 wu gap in the lobby's south front wall, facing the plaza; dark posts, header.
DX0, DX1, DZ = X(8.0), X(9.0), Z(10.0) - WT / 2
for s, (a0, a1) in (("left", (DX0, DX0 + 0.5)), ("right", (DX1 - 0.5, DX1))):
    bx(f"door-leaf-{s}", f"Main door leaf {s}", "meso", "door", a0 + 0.01, a1 - 0.01, 0, 1.0, DZ - 0.03, DZ + 0.03, "glass-door", plan_units=False,
       contact="flush-mount", importance=0.7, channels={"translate": True, "rotate": False, "scale": False, "bend": False, "twist": False,
                                                        "detach": False, "visibility": True, "materialState": True},
       anim_role="slide", topo="Sliding glass door leaf: a thin box.")
for s, xx in (("w", DX0), ("e", DX1)):
    bx(f"wall-door-post-{s}", f"Door post {s}", "meso", "trim", xx - 0.04, xx + 0.04, 0, CUT, DZ - WT / 2 - 0.01, DZ + WT / 2 + 0.01, "frame-dark",
       plan_units=False, contact="flush-mount", importance=0.5)
    bx(f"upper-S-door-post-{s}", f"Door post {s} upper", "meso", "trim", xx - 0.04, xx + 0.04, CUT, 1.08, DZ - WT / 2 - 0.01, DZ + WT / 2 + 0.01,
       "frame-dark", plan_units=False, contact="flush-mount", importance=0.5)
bx("upper-S-door-header", "Door header", "meso", "trim", DX0 - 0.04, DX1 + 0.04, 1.0, 1.08, DZ - WT / 2 - 0.01, DZ + WT / 2 + 0.01, "frame-dark",
   plan_units=False, contact="flush-mount", importance=0.5)
bx("upper-S-door-glass", "Glass over the door", "meso", "wall", DX0, DX1, 1.08, G1 - CAP, DZ - WT / 2, DZ + WT / 2, "glass-light", plan_units=False,
   contact="flush-mount", importance=0.4)
bx("topcap-S-door", "Door top cap", "micro", "trim", DX0, DX1, G1 - CAP, G1, DZ - WT / 2, DZ + WT / 2, "wall-cap", plan_units=False, contact="applied")

# Yellow 2 x 4 plate over the main door, sticking out over the plaza; part of the roof (hidden inside)
PX0, PX1, PZ0, PZ1, PY = 7.5, 9.5, 10.02, 10.92, 1.92   # high enough that the doorway shows under it from the city camera
bx("roof-canopy", "Yellow 2 x 4 plate canopy", "macro", "canopy", PX0, PX1, PY, PY + 0.2, PZ0, PZ1, "yellow", importance=0.95, conf=0.85,
   features=[{"id": "canopy.studs", "kind": "contour", "notes": "2 x 4 round studs on top (8 cylinders)"}],
   sockets=[{"id": "top", "localPosition": [0, 0.1, 0], "notes": "stud row"}], topo="Toy plate: a box over the door.")
for i in range(4):
    for j in range(2):
        cyl(f"roof-canopy-stud-{i * 2 + j + 1}", f"Canopy stud {i * 2 + j + 1}", "micro", "trim", PX0 + 0.25 + 0.5 * i, PZ0 + 0.2 + 0.5 * j,
            PY + 0.2, 0.09, 0.15, "yellow", importance=0.6, topo="Plate stud: a short cylinder.")

# ---------------------------------------------------------------------------------------------------------------
# Upper storeys and roofs ("roof-"): the campus buildings by zone, hidden together when the avatar is inside
H3 = G1 + 2 * ST
UPPER = plan.SHELL.difference(COURT_U)


def mass(cid, name, geom, y0, y1, side_mat, roof_mat, par_mat, feats=None, imp=0.85):
    ext_plan(f"roof-{cid}-mass", f"{name} upper storeys", "macro", "building", geom, y0, y1 - y0 - 0.06, side_mat, importance=imp,
             features=feats, topo="Upper storeys: the zone's plan extruded; roof on only.")
    ext_plan(f"roof-{cid}-top", f"{name} roof", "meso", "roof", geom, y1 - 0.06, 0.06, roof_mat, importance=0.7,
             features=[{"id": f"roof-{cid}-top.roof", "kind": "contour", "notes": "flat roof inside a parapet"}], topo="Flat roof: a thin extrude.")
    ext_plan(f"roof-{cid}-parapet", f"{name} parapet", "micro", "trim", geom.difference(geom.buffer(-WT, join_style=2)), y1, PAR, par_mat,
             importance=0.5, topo="Parapet on the roof edge: the zone outline minus its inward offset.")


FAC = UPPER.difference(ROUNDZ).difference(TERR).difference(ATR)
mass("wings", "Wings", FAC, G1, H2, "facade", "roof-green", "parapet",
     feats=[{"id": "roof-wings-mass.courts", "kind": "contour", "notes": "courtyard light wells cut through the green roof"}])
mass("round", "Round building", ROUNDZ.intersection(UPPER), G1, H2, "glass-round", "roof-green", "parapet",
     feats=[{"id": "roof-round-mass.bands", "kind": "linework", "notes": "dark glass bands round the round courtyard"}])
mass("terrace", "Terrace building", TERR.intersection(UPPER), G1, H2, "facade-perf", "roof-terrace", "parapet-light",
     feats=[{"id": "roof-terrace-mass.perf", "kind": "linework", "notes": "white panels with dark round perforations"}])
mass("atrium", "Glass atrium", ATR, G1, H3, "glass-atrium", "roof-green", "frame-light",
     feats=[{"id": "roof-atrium-mass.glass", "kind": "contour", "notes": "glass atrium a storey above the wings, over the lobby"}], imp=0.95)
ext_plan("roof-floorband", "Floor band", "micro", "trim", UPPER.buffer(0.015, join_style=2).difference(UPPER.buffer(-0.01, join_style=2)),
         G1 - 0.04, 0.08, "frame-light", importance=0.4, topo="Light band at the first floor line.")
ext_plan("roof-atrium-band", "Atrium floor band", "micro", "trim", ATR.buffer(0.02, join_style=2).difference(ATR.buffer(-0.01, join_style=2)),
         H2 - 0.04, 0.08, "frame-light", importance=0.4, topo="Light band at the second floor line of the atrium.")
ext_plan("map-plinth", "Brick base round the round building", "meso", "trim", plan.ROUND.buffer(0.12, 64).difference(plan.ROUND).difference(plan.SHELL),
         0, 0.45, "brick", importance=0.5, topo="Brick base: a ring outside the round wall.")

# windows on the wings' upper storey, every axis-aligned outer edge
wk = 0
for a, b, n in ring_segments(plan.SHELL):
    mid = Point((a[0] + b[0]) / 2 - n[0] * 0.1, (a[1] + b[1]) / 2 - n[1] * 0.1)
    if math.dist(a, b) > 0.6 and FAC.contains(mid):
        wk += 1
        windows_line(f"roof-w{wk}", a, b, n, G1 + 0.25, G1 + 1.0)

# atrium: skylight disc with 19 blue domes, yellow bracing behind the glass, red logo square over the door
SKX, SKZ = 8.0, 5.5
ext("roof-skylight", "Skylight disc", "meso", "roof", [[X(SKX) + 1.25 * math.cos(2 * math.pi * i / 48), Z(SKZ) + 1.25 * math.sin(2 * math.pi * i / 48)]
                                                         for i in range(48)], [], H3, 0.04, "skylight", importance=0.9,
    features=[{"id": "roof-skylight.domes", "kind": "contour", "notes": "white disc with 19 blue domes in two rings and a centre"}],
    topo="Skylight base: a disc.")
dome = 0
for r_, n_ in ((0.92, 12), (0.48, 6), (0.0, 1)):
    for i in range(n_):
        dome += 1
        a_ = 2 * math.pi * i / n_
        cyl(f"roof-dome-{dome}", f"Skylight dome {dome}", "micro", "trim", SKX + r_ * math.cos(a_), SKZ + r_ * math.sin(a_), H3 + 0.04, 0.06, 0.12,
            "dome", importance=0.4, topo="Skylight dome: a short cylinder.")
for k in range(3):
    yy = G1 + 0.4 + 0.35 * (k % 2)
    bx(f"roof-brace-s-{k + 1}", f"Atrium brace south {k + 1}", "micro", "trim", 7.1 + 0.6 * k, 7.6 + 0.6 * k, yy, yy + 0.07, 10.0, 10.02, "yellow",
       contact="applied", importance=0.35)
    bx(f"roof-brace-e-{k + 1}", f"Atrium brace east {k + 1}", "micro", "trim", 10.0, 10.02, H2 + 0.25 + 0.3 * (k % 2), H2 + 0.32 + 0.3 * (k % 2),
       4.2 + 0.9 * k, 5.0 + 0.9 * k, "yellow", contact="applied", importance=0.35)
bx("roof-logo-sign", "Logo sign (placeholder)", "meso", "sign", 7.12, 7.78, G1 + 0.3, G1 + 0.96, 10.0, 10.03, "logo-red", contact="applied",
   importance=0.6, topo="Red square sign on the atrium front (placeholder for the real logo).")

# terrace building: perforations on the south and west faces, greenhouse, yellow benches and planters on the roof terrace
perf = 0
for sd_, (a0, a1) in (("S", (4.05, 6.95)), ("W", (7.62, 9.95))):
    for i in range(int((a1 - a0) / 0.35)):
        for j in range(3):
            a_ = a0 + 0.15 + i * 0.35 + (0.17 if j % 2 else 0)
            if a_ > a1 - 0.1:
                continue
            perf += 1
            yy = G1 + 0.22 + j * 0.33
            if sd_ == "S":
                bx(f"roof-perf-{perf}", f"Perforation {perf}", "micro", "trim", a_ - 0.06, a_ + 0.06, yy, yy + 0.12, 10.0, 10.015, "window",
                   contact="applied", importance=0.2)
            else:
                bx(f"roof-perf-{perf}", f"Perforation {perf}", "micro", "trim", 3.985, 4.0, yy, yy + 0.12, a_ - 0.06, a_ + 0.06, "window",
                   contact="applied", importance=0.2)
bx("roof-greenhouse", "Roof greenhouse", "meso", "roof", 4.2, 4.8, H2, H2 + 0.5, 7.2, 7.75, "glass-light", importance=0.6,
   features=[{"id": "roof-greenhouse.glass", "kind": "contour", "notes": "small glass greenhouse on the terrace"}])
bx("roof-greenhouse-ridge", "Greenhouse ridge", "micro", "trim", 4.2, 4.8, H2 + 0.5, H2 + 0.56, 7.45, 7.5, "frame-light", importance=0.3)
for k, (gx_, gy_, w_, d_) in enumerate(((4.3, 9.55, 0.5, 0.12), (6.3, 9.0, 0.12, 0.5), (5.3, 7.25, 0.5, 0.12), (4.25, 9.0, 0.12, 0.4)), 1):
    bx(f"roof-bench-{k}", f"Terrace yellow bench {k}", "micro", "prop", gx_, gx_ + w_, H2, H2 + 0.08, gy_, gy_ + d_, "yellow", importance=0.4)
for k, (gx_, gy_) in enumerate(((6.55, 9.6), (6.55, 7.4)), 1):
    bx(f"roof-planter-{k}", f"Terrace planter {k}", "micro", "prop", gx_ - 0.15, gx_ + 0.15, H2, H2 + 0.12, gy_ - 0.15, gy_ + 0.15, "frame-light")
    bx(f"roof-planter-{k}-shrub", f"Terrace planter {k} shrub", "micro", "prop", gx_ - 0.12, gx_ + 0.12, H2 + 0.12, H2 + 0.2, gy_ - 0.12, gy_ + 0.12,
       "court")

# yellow bar on the north wing, yellow block with a red roof on the brick leg's corner, over the plaza
for cid, name, x0, z0, x1, z1, roof in (("yellow-bar", "Yellow bar", 6.1, 0.6, 7.8, 1.95, "roof-green"),
                                         ("yellow-block", "Yellow block", 9.55, 7.4, 10.85, 10.3, "terracotta")):
    g_ = box(x0, z0, x1, z1)
    mass(cid, name, g_, H2 - 0.1, H3, "yellow", roof, "yellow" if roof == "terracotta" else "parapet", imp=0.9,
         feats=[{"id": f"roof-{cid}.frame", "kind": "contour", "notes": "yellow frame box with a dark glass band"}])
    bx(f"roof-{cid}-band-s", f"{name} glass band south", "meso", "window", x0 + 0.12, x1 - 0.12, H2 + 0.15, H3 - 0.3, z1, z1 + 0.02, "window",
       contact="applied", importance=0.6)
    bx(f"roof-{cid}-band-e", f"{name} glass band east", "meso", "window", x1, x1 + 0.02, H2 + 0.15, H3 - 0.3, z0 + 0.12, z1 - 0.12, "window",
       contact="applied", importance=0.6)
    n_ = int((x1 - x0) / 0.4)
    for i in range(1, n_):
        xx = x0 + i * (x1 - x0) / n_
        bx(f"roof-{cid}-mullion-{i}", f"{name} mullion {i}", "micro", "trim", xx - 0.03, xx + 0.03, H2 + 0.15, H3 - 0.3, z1, z1 + 0.03, "yellow",
           contact="applied", importance=0.3)
bx("roof-yellow-block-soffit", "Yellow block soffit over the plaza", "micro", "trim", 9.55, 10.85, H2 - 0.1, H2, 10.0, 10.3, "yellow", importance=0.5)

# plant units and small skylights on the wings' green roof
units = 0
for gx_, gy_, w_, d_, h_ in ((11.6, 2.3, 0.6, 0.4, 0.35), (12.2, 4.3, 0.5, 0.4, 0.3), (3.3, 2.3, 0.45, 0.35, 0.28), (13.9, 7.2, 0.5, 0.4, 0.3),
                             (12.0, 9.2, 0.5, 0.4, 0.3), (9.3, 0.7, 0.45, 0.35, 0.28)):
    if FAC.buffer(-0.1).contains(box(gx_, gy_, gx_ + w_, gy_ + d_)):
        units += 1
        bx(f"roof-unit-{units}", f"Roof plant unit {units}", "micro", "roof", gx_, gx_ + w_, H2, H2 + h_, gy_, gy_ + d_, "frame-light", importance=0.4,
           topo="Rooftop plant unit: a box.")
        cyl(f"roof-unit-{units}-fan", f"Plant unit {units} fan", "micro", "trim", gx_ + w_ / 2, gy_ + d_ / 2, H2 + h_, 0.02, min(w_, d_) * 0.35,
            "parapet", importance=0.2)
sky = 0
for gx_, gy_ in ((10.5, 5.0), (12.5, 2.6), (14.3, 4.5), (11.4, 6.6), (4.5, 2.5), (9.5, 9.5), (12.6, 9.4)):
    if FAC.buffer(-0.2).contains(Point(gx_, gy_)):
        sky += 1
        cyl(f"roof-skylight-small-{sky}", f"Roof skylight {sky}", "micro", "trim", gx_, gy_, H2, 0.06, 0.13, "dome", importance=0.3,
            topo="Small round roof skylight: a short cylinder.")

# ---------------------------------------------------------------------------------------------------------------
# Hero object places: one grey block per room (sizes only roughly match the object to come)
HERO_BOX = {   # code: (x0, x1, z0, z1, height) in plan tiles inside the hero tile
}
for code, (x0, x1, z0, z1, h) in HERO_BOX.items():
    name = plan.HERO[code][1]
    bx(f"hero-{ROOM_ID[code]}", f"Hero object place: {name}", "meso", "prop", x0, x1, 0.02, h, z0, z1, "hero-grey", importance=0.7,
       features=[{"id": f"hero-{ROOM_ID[code]}.place", "kind": "contour", "notes": f"grey block where the {name} object goes"}],
       topo="Grey placeholder block: a box.")

# 1 Shelf room hero: a store shelf, half full (board 651:3604, "One shelf. Two goals."). Big bright boxes for young
# builders on the low shelves, slim dark sets for grown-up fans on the top shelves, and marked empty slots: the tool had
# to plan for both. It stands against the west wall (x = 4), facing the room (+x), from z 7.8 to 9.9.
SX0, SX1, SZ0, SZ1 = 4.14, 4.52, 7.8, 9.9
LEVELS = (0.1, 0.36, 0.62, 0.86)       # top of each shelf board (a store shelf about 2 m tall next to the 0.9 wu avatar)
SHELF = [   # per level: slot list along z (None = marked empty slot), slot width; low = young builders, high = grown-up
    (["box-yellow", "box-red", None, "box-blue", "box-green", None], 0.35, 0.23),
    (["box-orange", None, "box-blue", "box-red", None, "box-yellow"], 0.35, 0.22),
    (["box-dark", "box-navy", None, None, "box-charcoal", "box-dark", None, "box-navy"], 0.2625, 0.2),
    (["box-charcoal", None, "box-dark", "box-navy", None, None, "box-dark", "box-charcoal"], 0.2625, 0.18),
]
bx("shelf-plinth", "Shelf plinth", "meso", "prop", SX0, SX1, 0.02, LEVELS[0] - 0.02, SZ0, SZ1, "frame-dark", importance=0.6,
   topo="Shelf base: a box.")
bx("shelf-back", "Shelf back panel", "macro", "prop", SX0, SX0 + 0.04, 0.02, 1.08, SZ0, SZ1, "shelf-white", importance=0.85,
   features=[{"id": "shelf-back.store", "kind": "contour", "notes": "store shelf, half full: bright boxes low, dark sets high, empty slots marked"}],
   topo="Back panel of the store shelf: a thin box.")
for k, z in enumerate((SZ0, SZ1 - 0.05), 1):
    bx(f"shelf-upright-{k}", f"Shelf upright {k}", "meso", "prop", SX0, SX1, 0.02, 1.08, z, z + 0.05, "frame-dark", importance=0.5)
bx("shelf-header", "Shelf header sign", "meso", "prop", SX0, SX1 + 0.02, 1.08, 1.24, SZ0, SZ1, "yellow", importance=0.7,
   topo="Yellow header over the shelf: a box.")
bx("shelf-header-stripe", "Header stripe", "micro", "trim", SX1 + 0.02, SX1 + 0.03, 1.12, 1.2, SZ0 + 0.1, SZ1 - 0.1, "box-red", contact="applied",
   importance=0.3)
for lv, top in enumerate(LEVELS, 1):
    if lv > 1:
        bx(f"shelf-board-{lv}", f"Shelf board {lv}", "meso", "prop", SX0 + 0.04, SX1, top - 0.03, top, SZ0 + 0.05, SZ1 - 0.05, "shelf-white",
           importance=0.5)
    bx(f"shelf-edge-{lv}", f"Shelf price strip {lv}", "micro", "trim", SX1, SX1 + 0.012, top - 0.05, top - 0.005, SZ0 + 0.05, SZ1 - 0.05,
       "label-blue", contact="applied", importance=0.3)
for lv, (slots, w, h) in enumerate(SHELF, 1):
    y0 = LEVELS[lv - 1]
    for k, mat in enumerate(slots, 1):
        z0 = SZ0 + 0.05 + (k - 1) * w + 0.02
        z1 = z0 + w - 0.04
        if mat is None:
            # marked empty slot: a pale outline on the back panel and an orange tag on the shelf edge
            bx(f"shelf-empty-{lv}-{k}", f"Empty slot {lv}.{k}", "micro", "trim", SX0 + 0.04, SX0 + 0.05, y0 + 0.03, y0 + h - 0.02, z0, z1,
               "slot-marker", contact="applied", importance=0.35, topo="Marked empty slot: a pale panel on the back.")
            bx(f"shelf-tag-{lv}-{k}", f"Empty slot tag {lv}.{k}", "micro", "trim", SX1 + 0.012, SX1 + 0.02, y0 - 0.05, y0 - 0.005,
               z0 + 0.04, z1 - 0.04, "tag-orange", contact="applied", importance=0.35)
            continue
        d = 0.3 if lv <= 2 else 0.22
        bx(f"shelf-box-{lv}-{k}", f"Set box {lv}.{k}", "micro", "prop", SX1 - d, SX1 - 0.02, y0, y0 + h, z0, z1, mat, importance=0.4,
           topo="Boxed set on the shelf: a box.")
        band = "label-white" if lv <= 2 else "label-gold"
        bx(f"shelf-box-{lv}-{k}-art", f"Box art {lv}.{k}", "micro", "trim", SX1 - 0.02, SX1 - 0.01, y0 + h * 0.35, y0 + h * 0.75,
           z0 + 0.03, z1 - 0.03, band, contact="applied", importance=0.2, topo="Box front art band: a thin box.")

# 2 Test room hero (board 651:3604, "Hands on, not shown."): a tester at a desk with a laptop and a "?" over the head; a
# big screen on a stand next to them. In the city the "?" turns into "!" while the screen plays a short animation when
# the avatar comes near (lib/city/models/legoHqMoments.ts paints the screen and bubble frames; buildings.ts `moments`).
bx("test-desk", "Test desk top", "meso", "prop", 10.95, 11.85, 0.36, 0.4, 6.2, 6.78, "shelf-white", importance=0.7,
   features=[{"id": "test-desk.moment", "kind": "contour", "notes": "tester at a laptop with a ? that turns into ! as the screen explains the model"}])
for k, (lx, lz) in enumerate(((11.0, 6.25), (11.8, 6.25), (11.0, 6.73), (11.8, 6.73)), 1):
    bx(f"test-desk-leg-{k}", f"Test desk leg {k}", "micro", "prop", lx - 0.025, lx + 0.025, 0.02, 0.36, lz - 0.025, lz + 0.025, "frame-dark",
       importance=0.2)
bx("test-laptop-base", "Laptop base", "micro", "prop", 11.2, 11.56, 0.4, 0.415, 6.4, 6.62, "laptop-grey", importance=0.4)
bx("test-laptop-lid", "Laptop lid", "micro", "prop", 11.2, 11.56, 0.415, 0.64, 6.36, 6.39, "laptop-grey", importance=0.4)
# the tester: generic, no name, standing behind the desk and facing the room (+z)
NX, NZ = 11.38, 5.95
bx("npc-test-leg-w", "Tester leg west", "micro", "prop", NX - 0.11, NX - 0.01, 0.02, 0.42, NZ - 0.06, NZ + 0.06, "npc-trousers", importance=0.4)
bx("npc-test-leg-e", "Tester leg east", "micro", "prop", NX + 0.01, NX + 0.11, 0.02, 0.42, NZ - 0.06, NZ + 0.06, "npc-trousers", importance=0.4)
bx("npc-test-torso", "Tester torso", "meso", "prop", NX - 0.14, NX + 0.14, 0.42, 0.72, NZ - 0.08, NZ + 0.08, "npc-shirt", importance=0.6,
   topo="Generic NPC body: boxes (no face detail, no name).")
for sd, ax in (("w", NX - 0.18), ("e", NX + 0.18)):
    bx(f"npc-test-arm-{sd}", f"Tester arm {sd}", "micro", "prop", ax - 0.04, ax + 0.04, 0.45, 0.7, NZ - 0.04, NZ + 0.12, "npc-shirt", importance=0.3)
bx("npc-test-head", "Tester head", "meso", "prop", NX - 0.08, NX + 0.08, 0.74, 0.9, NZ - 0.08, NZ + 0.08, "npc-skin", importance=0.5)
bx("npc-test-hair", "Tester hair", "micro", "prop", NX - 0.085, NX + 0.085, 0.86, 0.93, NZ - 0.085, NZ + 0.06, "npc-hair", importance=0.3)
# the speech bubble over the head, turned to face the default camera (yaw 45 deg); painted "?" or "!"
C.append(comp("test-bubble", "Tester speech bubble", "meso", "prop", "box", (0.4, 0.34, 0.03), (X(NX + 0.12), G + 1.24, Z(NZ + 0.12)), "bubble-white",
              rot=[0, math.pi / 4, 0], importance=0.7, contact="applied",
              features=[{"id": "test-bubble.sign", "kind": "decal", "notes": "speech bubble: ? while confused, ! once the screen explained the model"}],
              topo="Speech bubble: a thin box facing the camera, painted at runtime."))
C.append(comp("test-bubble-tail", "Speech bubble tail", "micro", "prop", "box", (0.07, 0.1, 0.02), (X(NX + 0.06), G + 1.04, Z(NZ + 0.06)),
              "bubble-white", rot=[0, math.pi / 4, 0.6], importance=0.3, contact="applied"))
# the big screen on a stand at the tester's side, facing the room (+z)
bx("test-screen-stand", "Screen stand", "micro", "prop", 12.52, 12.6, 0.02, 0.5, 5.16, 5.24, "frame-dark", importance=0.3)
bx("test-screen-foot", "Screen stand foot", "micro", "prop", 12.32, 12.8, 0.02, 0.05, 5.05, 5.35, "frame-dark", importance=0.2)
bx("test-screen-frame", "Big screen frame", "meso", "prop", 12.04, 13.08, 0.46, 1.12, 5.08, 5.16, "frame-dark", importance=0.6)
bx("test-screen", "Big screen", "meso", "prop", 12.07, 13.05, 0.49, 1.09, 5.16, 5.17, "screen-test", contact="applied", importance=0.8,
   features=[{"id": "test-screen.animation", "kind": "decal", "notes": "plays a short animation of what the model does"}],
   topo="Screen face: a thin box painted at runtime.")

# Test room props (Gustav 2026-10-18: "more stuff"): a hands-on test in progress. An observer with a clipboard, a test
# wall with sticky notes, a camera on a tripod, sellers waiting on a bench, a table with the sets to test, desk clutter.
def _mirror_z(z0, build):
    """Run `build` (which appends boxes to C) and mirror the new components in plan z about z0."""
    n = len(C)
    build()
    for c in C[n:]:
        p = c["transform"]["position"]
        p[2] = round(2 * Z(z0) - p[2], 4)
        a = c.get("attachment")
        if a:
            for key in ("localStart", "localEnd"):
                a[key][2] = round(2 * Z(z0) - a[key][2], 4)


def npc_standing(pre, name, nx, nz, shirt, hair, arm_dx=0.0, arm_dz=0.06):
    bx(f"{pre}-leg-w", f"{name} leg west", "micro", "prop", nx - 0.11, nx - 0.01, 0.02, 0.42, nz - 0.06, nz + 0.06, "npc-trousers", importance=0.3)
    bx(f"{pre}-leg-e", f"{name} leg east", "micro", "prop", nx + 0.01, nx + 0.11, 0.02, 0.42, nz - 0.06, nz + 0.06, "npc-trousers", importance=0.3)
    bx(f"{pre}-torso", f"{name} torso", "meso", "prop", nx - 0.14, nx + 0.14, 0.42, 0.72, nz - 0.08, nz + 0.08, shirt, importance=0.4,
       topo="Generic NPC body: boxes (no face detail, no name).")
    for sd, ax in (("w", nx - 0.18), ("e", nx + 0.18)):
        bx(f"{pre}-arm-{sd}", f"{name} arm {sd}", "micro", "prop", ax - 0.04 + arm_dx, ax + 0.04 + arm_dx, 0.45, 0.7, nz - 0.04 + arm_dz,
           nz + 0.04 + arm_dz, shirt, importance=0.2)
    bx(f"{pre}-head", f"{name} head", "meso", "prop", nx - 0.08, nx + 0.08, 0.74, 0.9, nz - 0.08, nz + 0.08, "npc-skin", importance=0.3)
    bx(f"{pre}-hair", f"{name} hair", "micro", "prop", nx - 0.085, nx + 0.085, 0.86, 0.93, nz - 0.06, nz + 0.085, hair, importance=0.2)


def npc_seated(pre, name, nx, nz, shirt, hair, seat, face="n"):
    """Seated, facing north (-z): back at nz, knees towards nz - 0.3; `seat` = seat top height. face="s": mirrored in z."""
    if face == "s":
        return _mirror_z(nz, lambda: npc_seated(pre, name, nx, nz, shirt, hair, seat))
    for sd, dx in (("w", -0.06), ("e", 0.06)):
        bx(f"{pre}-thigh-{sd}", f"{name} thigh {sd}", "micro", "prop", nx + dx - 0.05, nx + dx + 0.05, seat, seat + 0.1, nz - 0.3, nz,
           "npc-trousers", importance=0.2)
        bx(f"{pre}-shin-{sd}", f"{name} shin {sd}", "micro", "prop", nx + dx - 0.05, nx + dx + 0.05, 0.02, seat + 0.02, nz - 0.32, nz - 0.22,
           "npc-trousers", importance=0.2)
    bx(f"{pre}-torso", f"{name} torso", "meso", "prop", nx - 0.14, nx + 0.14, seat + 0.08, seat + 0.38, nz - 0.08, nz + 0.08, shirt,
       importance=0.4, topo="Generic NPC body: boxes (no face detail, no name).")
    for sd, ax in (("w", nx - 0.18), ("e", nx + 0.18)):
        bx(f"{pre}-arm-{sd}", f"{name} arm {sd}", "micro", "prop", ax - 0.04, ax + 0.04, seat + 0.1, seat + 0.36, nz - 0.12, nz - 0.02, shirt,
           importance=0.2)
    bx(f"{pre}-head", f"{name} head", "meso", "prop", nx - 0.08, nx + 0.08, seat + 0.4, seat + 0.56, nz - 0.08, nz + 0.08, "npc-skin",
       importance=0.3)
    bx(f"{pre}-hair", f"{name} hair", "micro", "prop", nx - 0.085, nx + 0.085, seat + 0.52, seat + 0.59, nz - 0.06, nz + 0.085, hair,
       importance=0.2)


# observer: stands east of the desk, facing the tester (west), clipboard held out in front
npc_standing("npc-observer", "Observer", 12.45, 6.45, "npc-shirt-2", "npc-hair-2", arm_dx=-0.06, arm_dz=0.0)
bx("test-clipboard", "Observer clipboard", "micro", "prop", 12.18, 12.22, 0.5, 0.72, 6.33, 6.57, "prop-board", importance=0.3)
bx("test-clipboard-paper", "Clipboard paper", "micro", "prop", 12.17, 12.18, 0.52, 0.69, 6.35, 6.55, "prop-paper", contact="applied",
   importance=0.2)
# test wall: a whiteboard on legs at the room's north end, with three columns of sticky notes
bx("test-wall-leg-w", "Test wall leg west", "micro", "prop", 10.1, 10.14, 0.02, 0.4, 5.2, 5.24, "frame-dark", importance=0.2)
bx("test-wall-leg-e", "Test wall leg east", "micro", "prop", 10.86, 10.9, 0.02, 0.4, 5.2, 5.24, "frame-dark", importance=0.2)
bx("test-wall-frame", "Test wall frame", "meso", "prop", 10.06, 10.94, 0.38, 1.08, 5.18, 5.24, "frame-dark", importance=0.5,
   features=[{"id": "test-wall.notes", "kind": "decal", "notes": "test findings on sticky notes, three columns"}])
bx("test-wall-board", "Test wall board", "meso", "prop", 10.09, 10.91, 0.41, 1.05, 5.24, 5.25, "prop-paper", contact="applied",
   importance=0.4)
NOTES = ("note-yellow", "note-pink", "note-blue", "note-green")
for col in range(3):
    cx0 = 10.15 + col * 0.26
    bx(f"test-wall-head-{col}", f"Test wall column head {col}", "micro", "prop", cx0, cx0 + 0.2, 0.96, 0.99, 5.25, 5.26, "frame-dark",
       contact="applied", importance=0.1)
    for row in range(3 - (col == 2)):
        y0 = 0.82 - row * 0.15
        bx(f"test-wall-note-{col}-{row}", f"Sticky note {col} {row}", "micro", "prop", cx0 + (row % 2) * 0.03, cx0 + 0.11 + (row % 2) * 0.03,
           y0, y0 + 0.11, 5.25, 5.262, NOTES[(col + row * 2) % 4], contact="applied", importance=0.1)
        bx(f"test-wall-note-{col}-{row}b", f"Sticky note {col} {row} b", "micro", "prop", cx0 + 0.12 - (row % 2) * 0.02,
           cx0 + 0.21 - (row % 2) * 0.02, y0 - 0.03, y0 + 0.07, 5.25, 5.262, NOTES[(col + row + 1) % 4], contact="applied", importance=0.1)
# camera on a tripod in the south-west corner, aimed at the tester
bx("test-tripod-foot", "Tripod foot", "micro", "prop", 9.38, 9.62, 0.02, 0.04, 8.38, 8.62, "frame-dark", importance=0.2)
bx("test-tripod-pole", "Tripod pole", "micro", "prop", 9.48, 9.52, 0.04, 0.62, 8.48, 8.52, "frame-dark", importance=0.2)
CAM = 0.927   # yaw: local +x points from the tripod to the tester
C.append(comp("test-camera", "Test camera", "micro", "prop", "box", (0.2, 0.12, 0.1), (X(9.5 + 0.03), G + 0.68, Z(8.5 - 0.04)),
              "camera-black", rot=[0, CAM, 0], importance=0.4, contact="resting",
              features=[{"id": "test-camera.record", "kind": "contour", "notes": "the test is recorded"}]))
C.append(comp("test-camera-lens", "Camera lens", "micro", "prop", "box", (0.06, 0.08, 0.08), (X(9.5 + 0.11), G + 0.68, Z(8.5 - 0.15)),
              "camera-black", rot=[0, CAM, 0], importance=0.2, contact="applied"))
C.append(comp("test-camera-light", "Recording light", "micro", "prop", "box", (0.03, 0.03, 0.03), (X(9.5 - 0.02), G + 0.76, Z(8.5 + 0.0)),
              "logo-red", rot=[0, CAM, 0], importance=0.2, contact="applied"))
# sellers waiting their turn on a bench along the south front
bx("test-bench-seat", "Waiting bench seat", "meso", "prop", 9.12, 10.88, 0.22, 0.28, 9.5, 9.86, "prop-sofa", importance=0.4)
bx("test-bench-back", "Waiting bench back", "micro", "prop", 9.12, 10.88, 0.28, 0.5, 9.8, 9.88, "prop-sofa", importance=0.3)
for k, lx in enumerate((9.16, 10.8)):
    bx(f"test-bench-leg-{k}", f"Bench leg {k}", "micro", "prop", lx, lx + 0.04, 0.02, 0.22, 9.52, 9.84, "frame-dark", importance=0.1)
npc_seated("npc-wait-1", "Waiting seller 1", 9.55, 9.72, "npc-shirt-3", "npc-hair", 0.28)
npc_seated("npc-wait-2", "Waiting seller 2", 10.4, 9.72, "npc-shirt-4", "npc-hair-2", 0.28)
bx("test-wait-cup", "Coffee cup on the bench", "micro", "prop", 9.94, 10.02, 0.28, 0.36, 9.56, 9.64, "prop-mug", importance=0.1)
# table with the sets to test and coffee
bx("test-table-top", "Test sets table", "meso", "prop", 11.1, 12.85, 0.34, 0.38, 9.4, 9.82, "prop-wood", importance=0.4)
for k, (lx, lz) in enumerate(((11.14, 9.44), (12.78, 9.44), (11.14, 9.74), (12.78, 9.74))):
    bx(f"test-table-leg-{k}", f"Table leg {k}", "micro", "prop", lx - 0.02, lx + 0.02, 0.02, 0.34, lz - 0.02, lz + 0.02, "frame-dark",
       importance=0.1)
for k, (x0, w, h, m) in enumerate(((11.2, 0.28, 0.24, "box-yellow"), (11.52, 0.24, 0.3, "box-red"), (11.8, 0.3, 0.2, "box-blue"),
                                    (12.14, 0.22, 0.26, "box-green"))):
    bx(f"test-set-{k}", f"Set box to test {k}", "micro", "prop", x0, x0 + w, 0.38, 0.38 + h, 9.5, 9.66, m, importance=0.2)
    bx(f"test-set-{k}-art", f"Set box art band {k}", "micro", "prop", x0 + 0.02, x0 + w - 0.02, 0.38 + h * 0.55, 0.38 + h * 0.8, 9.66,
       9.665, "label-white", contact="applied", importance=0.1)
for k, mx in enumerate((12.46, 12.62)):
    bx(f"test-table-mug-{k}", f"Coffee mug {k}", "micro", "prop", mx, mx + 0.08, 0.38, 0.47, 9.56, 9.64, "prop-mug", importance=0.1)
# desk clutter: a mug, a notepad with a sticky note, the set on test
bx("test-desk-mug", "Desk mug", "micro", "prop", 11.0, 11.08, 0.4, 0.49, 6.62, 6.7, "prop-mug", importance=0.1)
bx("test-desk-pad", "Notepad", "micro", "prop", 11.62, 11.8, 0.4, 0.41, 6.5, 6.72, "prop-paper", importance=0.1)
bx("test-desk-note", "Sticky note on the pad", "micro", "prop", 11.66, 11.74, 0.41, 0.415, 6.54, 6.62, "note-yellow", importance=0.1)
bx("test-desk-set", "Set on test", "micro", "prop", 11.62, 11.82, 0.4, 0.62, 6.24, 6.34, "box-orange", importance=0.2)

# 3 Team room hero (board 651:3604, "Bring the users to the data scientists."): a big screen on the north wall plays a
# clip of a user at a laptop (painted at runtime, lib/city/models/legoHqMoments.ts); the team sits on chairs facing it.
# The avatar stands at the screen's west side, where the one who shows the clip stands. Plus: a wall of user cards
# (who the users are) and a developer's desk with two monitors.
bx("team-screen-frame", "Team screen frame", "meso", "prop", 7.04, 8.5, 0.4, 1.3, 0.63, 0.69, "frame-dark", importance=0.7,
   features=[{"id": "team-screen.clip", "kind": "decal", "notes": "a clip from the tests: a user at a laptop"}])
bx("team-screen", "Team screen", "meso", "prop", 7.08, 8.46, 0.44, 1.26, 0.69, 0.7, "screen-test", contact="applied", importance=0.8,
   topo="Screen face: a thin box painted at runtime.")
bx("team-screen-shelf", "Screen sound bar", "micro", "prop", 7.37, 8.17, 0.33, 0.38, 0.63, 0.73, "frame-dark", importance=0.2)


def chair(cid, cx, cz, face="n"):
    """Chair facing north (-z): seat 0.32 wide, top at 0.26; back on the south side. face="s": mirrored in z."""
    if face == "s":
        return _mirror_z(cz, lambda: chair(cid, cx, cz))
    bx(f"{cid}-seat", f"Chair seat {cid}", "micro", "prop", cx - 0.16, cx + 0.16, 0.22, 0.26, cz - 0.16, cz + 0.16, "prop-sofa", importance=0.2)
    bx(f"{cid}-back", f"Chair back {cid}", "micro", "prop", cx - 0.16, cx + 0.16, 0.26, 0.56, cz + 0.12, cz + 0.16, "prop-sofa", importance=0.2)
    for k, (dx, dz) in enumerate(((-0.13, -0.13), (0.13, -0.13), (-0.13, 0.13), (0.13, 0.13))):
        bx(f"{cid}-leg-{k}", f"Chair leg {cid} {k}", "micro", "prop", cx + dx - 0.015, cx + dx + 0.015, 0.02, 0.22, cz + dz - 0.015,
           cz + dz + 0.015, "frame-dark", importance=0.05)


TEAM = [  # (x, z, shirt, hair): data scientists and developers, two rows facing the screen
    (7.25, 1.45, "npc-shirt-3", "npc-hair-2"), (7.68, 1.45, "npc-shirt-5", "npc-hair"),
    (7.25, 2.45, "npc-shirt-4", "npc-hair"), (7.68, 2.45, "npc-shirt-2", "npc-hair-2"),
]
for k, (cx, cz, shirt, hair) in enumerate(TEAM, 1):
    chair(f"team-chair-{k}", cx, cz)
    npc_seated(f"npc-team-{k}", f"Team member {k}", cx, cz + 0.04, shirt, hair, 0.26)
bx("team-laptop-lap", "Laptop on a lap", "micro", "prop", 7.15, 7.35, 0.38, 0.4, 2.12, 2.26, "laptop-grey", importance=0.1)
bx("team-cup", "Cup on the floor", "micro", "prop", 7.9, 7.97, 0.02, 0.1, 2.2, 2.27, "prop-mug", importance=0.1)
# wall of user cards (who the users are), on legs in the west wing
bx("team-cards-leg-w", "Card wall leg west", "micro", "prop", 3.1, 3.14, 0.02, 0.42, 2.2, 2.24, "frame-dark", importance=0.1)
bx("team-cards-leg-e", "Card wall leg east", "micro", "prop", 3.86, 3.9, 0.02, 0.42, 2.2, 2.24, "frame-dark", importance=0.1)
bx("team-cards-board", "Card wall board", "meso", "prop", 3.06, 3.94, 0.4, 1.08, 2.18, 2.24, "prop-board", importance=0.4,
   features=[{"id": "team-cards.users", "kind": "decal", "notes": "cards with users from the tests"}])
CARD_STRIPES = ("note-blue", "note-pink", "note-green", "note-yellow", "note-blue", "note-pink")
for k in range(6):
    c0, r0 = 3.12 + (k % 3) * 0.27, 0.74 - (k // 3) * 0.3
    bx(f"team-card-{k}", f"User card {k}", "micro", "prop", c0, c0 + 0.22, r0, r0 + 0.26, 2.24, 2.25, "prop-paper", contact="applied", importance=0.1)
    bx(f"team-card-{k}-face", f"User card face {k}", "micro", "prop", c0 + 0.07, c0 + 0.15, r0 + 0.13, r0 + 0.22, 2.25, 2.255, "npc-skin",
       contact="applied", importance=0.05)
    bx(f"team-card-{k}-line", f"User card line {k}", "micro", "prop", c0 + 0.03, c0 + 0.19, r0 + 0.04, r0 + 0.08, 2.25, 2.255,
       CARD_STRIPES[k], contact="applied", importance=0.05)
# developer's desk with two monitors, in the north-east corner of the room
bx("team-dev-desk", "Developer desk", "meso", "prop", 9.2, 9.86, 0.36, 0.4, 0.66, 1.04, "shelf-white", importance=0.3)
for k, (lx, lz) in enumerate(((9.24, 0.7), (9.82, 0.7), (9.24, 1.0), (9.82, 1.0))):
    bx(f"team-dev-leg-{k}", f"Developer desk leg {k}", "micro", "prop", lx - 0.02, lx + 0.02, 0.02, 0.36, lz - 0.02, lz + 0.02, "frame-dark",
       importance=0.05)
for k, mx in enumerate((9.2, 9.52)):
    bx(f"team-dev-monitor-{k}", f"Developer monitor {k}", "micro", "prop", mx, mx + 0.32, 0.46, 0.7, 0.7, 0.73, "frame-dark", importance=0.2)
    bx(f"team-dev-monitor-{k}-face", f"Developer monitor face {k}", "micro", "prop", mx + 0.02, mx + 0.3, 0.48, 0.68, 0.73, 0.735,
       "label-blue", contact="applied", importance=0.1)
    bx(f"team-dev-monitor-{k}-foot", f"Monitor foot {k}", "micro", "prop", mx + 0.13, mx + 0.19, 0.4, 0.46, 0.74, 0.8, "frame-dark", importance=0.05)
npc_standing("npc-dev", "Developer", 9.55, 1.3, "npc-shirt-5", "npc-hair-2", arm_dz=-0.08)

# 4 Systems map room hero (board 651:3604, "Many ways, one map."): the far half of the round wall is one long map, in
# MAP_PANELS flat panels round the arc (painted at runtime, one slice each, lib/city/models/legoHqMoments.ts). Many
# coloured lines on the left come together into one line on the right, sticky notes at the crossings. A side table with
# marker pens and note pads stands at the map; a round table in the middle holds printouts.
MAP_PANELS, MAP_T0, MAP_T1, MAP_R = 18, 135.0, 315.0, plan.RO - 0.18
for k in range(MAP_PANELS):
    th = math.radians(MAP_T0 + (k + 0.5) * (MAP_T1 - MAP_T0) / MAP_PANELS)
    w = 2 * MAP_R * math.sin(math.radians((MAP_T1 - MAP_T0) / MAP_PANELS / 2)) + 0.012
    px, pz = plan.RC[0] + MAP_R * math.cos(th), plan.RC[1] + MAP_R * math.sin(th)
    C.append(comp(f"map-panel-{k}", f"Map panel {k}", "meso", "prop", "box", (w, 0.84, 0.02), (X(px), G + 0.78, Z(pz)), "map-paper",
                  rot=[0, -(th + math.pi / 2), 0], importance=0.8 if k == 0 else 0.3, contact="applied",
                  features=[{"id": "map-panel.map", "kind": "decal",
                             "notes": "one long map: many coloured lines on the left become one line on the right"}] if k == 0 else None,
                  topo="Map panel on the round wall: a thin box turned to face the room centre, painted at runtime."))
    for e, y0 in (("top", 1.2), ("bottom", 0.34)):
        C.append(comp(f"map-rail-{e}-{k}", f"Map rail {e} {k}", "micro", "trim", "box", (w, 0.025, 0.035),
                      (X(plan.RC[0] + (MAP_R + 0.005) * math.cos(th)), G + y0 + 0.012, Z(plan.RC[1] + (MAP_R + 0.005) * math.sin(th))),
                      "frame-dark", rot=[0, -(th + math.pi / 2), 0], importance=0.05, contact="applied"))
# side table at the map with marker pens and note pads
bx("map-side-table", "Map side table", "micro", "prop", 1.08, 1.62, 0.36, 0.4, 6.28, 6.72, "prop-wood", importance=0.3)
for k, (lx, lz) in enumerate(((1.12, 6.32), (1.58, 6.32), (1.12, 6.68), (1.58, 6.68))):
    bx(f"map-side-leg-{k}", f"Side table leg {k}", "micro", "prop", lx - 0.02, lx + 0.02, 0.02, 0.36, lz - 0.02, lz + 0.02, "frame-dark",
       importance=0.05)
for k, (nx, nz, m) in enumerate(((1.16, 6.36, "note-yellow"), (1.3, 6.4, "note-pink"), (1.18, 6.52, "note-blue"))):
    bx(f"map-pad-{k}", f"Note pad {k}", "micro", "prop", nx, nx + 0.1, 0.4, 0.43, nz, nz + 0.1, m, importance=0.05)
bx("map-pen-cup", "Marker cup", "micro", "prop", 1.45, 1.53, 0.4, 0.5, 6.5, 6.58, "frame-dark", importance=0.05)
for k, (dx, m) in enumerate(((0.0, "logo-red"), (0.025, "label-blue"), (0.05, "box-green"))):
    bx(f"map-pen-{k}", f"Marker {k}", "micro", "prop", 1.455 + dx, 1.47 + dx, 0.5, 0.56, 6.53, 6.545, m, importance=0.02)
# round table in the middle with printouts of the map
cyl("map-table-top", "Round table top", "micro", "prop", 2.5, 6.5, 0.36, 0.04, 0.34, "prop-wood", importance=0.3)
cyl("map-table-leg", "Round table leg", "micro", "prop", 2.5, 6.5, 0.02, 0.34, 0.04, "frame-dark", importance=0.05)
bx("map-print-0", "Printout", "micro", "prop", 2.32, 2.56, 0.4, 0.405, 6.34, 6.52, "prop-paper", importance=0.05)
bx("map-print-1", "Printout", "micro", "prop", 2.5, 2.72, 0.4, 0.41, 6.5, 6.66, "prop-paper", importance=0.05)
bx("map-print-note", "Note on a printout", "micro", "prop", 2.56, 2.62, 0.41, 0.415, 6.54, 6.6, "note-yellow", importance=0.02)

# 5 AI lab hero (board 651:3604, "Something I started myself."): a long table with laptops in the lab's north part,
# designers trying the template on the north side (facing the room, so their faces show), a screen on a stand at the
# table's west end with the learning template (painted at runtime; its steps tick and the sign-up list fills when the
# avatar comes near), and an "Open door" sign on the north wall. In the south part: a high table where two more designers
# try it standing.
bx("ai-table-top", "AI lab long table", "meso", "prop", 10.95, 12.55, 0.36, 0.4, 2.95, 3.4, "shelf-white", importance=0.7,
   features=[{"id": "ai-table-top.lab", "kind": "contour", "notes": "long table with laptops: an open-door session"}])
for k, (lx, lz) in enumerate(((11.0, 3.0), (12.5, 3.0), (11.0, 3.35), (12.5, 3.35))):
    bx(f"ai-table-leg-{k}", f"AI lab table leg {k}", "micro", "prop", lx - 0.02, lx + 0.02, 0.02, 0.36, lz - 0.02, lz + 0.02, "frame-dark",
       importance=0.05)
AI_TEAM = [(11.35, "npc-shirt-4", "npc-hair"), (11.85, "npc-shirt-3", "npc-hair-2"), (12.3, "npc-shirt-2", "npc-hair")]
for k, (cx, shirt, hair) in enumerate(AI_TEAM, 1):
    chair(f"ai-chair-{k}", cx, 2.62, face="s")
    npc_seated(f"npc-ai-{k}", f"Designer {k}", cx, 2.58, shirt, hair, 0.26, face="s")
    bx(f"ai-laptop-{k}-base", f"Laptop base {k}", "micro", "prop", cx - 0.12, cx + 0.12, 0.4, 0.412, 2.98, 3.14, "laptop-grey", importance=0.1)
    bx(f"ai-laptop-{k}-lid", f"Laptop lid {k}", "micro", "prop", cx - 0.12, cx + 0.12, 0.412, 0.57, 3.14, 3.165, "laptop-grey", importance=0.1)
    bx(f"ai-laptop-{k}-sticker", f"Laptop sticker {k}", "micro", "prop", cx - 0.03, cx + 0.03, 0.47, 0.51, 3.165, 3.17,
       ("note-yellow", "note-pink", "note-blue")[k - 1], contact="applied", importance=0.02)
bx("ai-table-cup", "Cup on the long table", "micro", "prop", 12.38, 12.45, 0.4, 0.48, 3.22, 3.29, "prop-mug", importance=0.02)
bx("ai-table-notes", "Notes on the long table", "micro", "prop", 11.5, 11.68, 0.4, 0.405, 3.2, 3.34, "prop-paper", importance=0.02)
# the template screen on a stand at the west end, facing east along the table
bx("ai-screen-foot", "Template screen foot", "micro", "prop", 10.25, 10.55, 0.02, 0.05, 3.15, 3.65, "frame-dark", importance=0.1)
bx("ai-screen-stand", "Template screen stand", "micro", "prop", 10.36, 10.42, 0.05, 0.5, 3.37, 3.43, "frame-dark", importance=0.1)
C.append(comp("ai-screen-frame", "Template screen frame", "meso", "prop", "box", (0.98, 0.6, 0.05), (X(10.42), G + 0.8, Z(3.4)),
              "frame-dark", rot=[0, math.pi / 2, 0], importance=0.6,
              features=[{"id": "ai-screen.template", "kind": "decal", "notes": "the learning template for AI-assisted coding"}]))
C.append(comp("ai-screen", "Template screen", "meso", "prop", "box", (0.94, 0.56, 0.01), (X(10.45), G + 0.8, Z(3.4)), "screen-test",
              rot=[0, math.pi / 2, 0], importance=0.6, contact="applied", topo="Screen face: a thin box painted at runtime."))
# the "Open door" sign on the north wall over the table (painted at runtime)
bx("ai-sign-frame", "Open door sign frame", "micro", "prop", 10.95, 12.05, 0.95, 1.27, 2.12, 2.15, "frame-dark", importance=0.4)
bx("ai-sign", "Open door sign", "meso", "prop", 10.98, 12.02, 0.98, 1.24, 2.15, 2.16, "bubble-white", contact="applied", importance=0.6,
   features=[{"id": "ai-sign.open", "kind": "decal", "notes": "Open door: anyone can join the sessions"}])
# south part: a high table where two designers try it standing
bx("ai-high-top", "High table", "micro", "prop", 14.2, 14.7, 0.54, 0.58, 5.35, 6.45, "prop-wood", importance=0.3)
for k, lz in enumerate((5.45, 6.35)):
    bx(f"ai-high-leg-{k}", f"High table leg {k}", "micro", "prop", 14.42, 14.48, 0.02, 0.54, lz - 0.03, lz + 0.03, "frame-dark", importance=0.05)
for k, lz in enumerate((5.55, 6.05)):
    bx(f"ai-high-laptop-{k}-base", f"High table laptop {k}", "micro", "prop", 14.28, 14.5, 0.58, 0.592, lz, lz + 0.26, "laptop-grey",
       importance=0.05)
    bx(f"ai-high-laptop-{k}-lid", f"High table laptop lid {k}", "micro", "prop", 14.5, 14.525, 0.592, 0.75, lz, lz + 0.26, "laptop-grey",
       importance=0.05)
npc_standing("npc-ai-4", "Designer 4", 13.92, 5.7, "npc-shirt-5", "npc-hair-2")
npc_standing("npc-ai-5", "Designer 5", 13.92, 6.25, "npc-shirt-4", "npc-hair")

# Walk map (one char per tile; lib/city/buildingInteriors.ts)
walk = plan.walk_map()
json.dump({"map": walk}, open(f"{W}/walkmap.json", "w"), indent=1)
print("\n".join(walk))

spec["componentTree"] = C


# ---------------------------------------------------------------------------------------------------------------
def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.02, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.02, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    m.update({"emissive": color, "emissiveIntensity": {"base": 0.25}})
    m.update(extra)
    if m.get("textureless"):
        for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
            m.pop(field, None)
    return m


SPR = "flat colour at sprite size (~62 px per wu at 2x density): no texture needed"


def flat(*ev):
    return {"textureless": {"declared": True, "evidence": list(ev) + [SPR, "analysis/image-analysis.md L5"]}}


F = flat("grey box: flat neutral colours, detail comes in a later pass")
spec["materials"] = [
    material("grass", "Grass", "unknown", "#6fb34a", ["#67a845"], 0.95, 0.0, "plot", **F),
    material("light-pool", "Daylight pool", "stone", "#fff3c4", ["#f5e9ba"], 0.9, 0.0, "daylight under a glazed light well", **F),
    material("court", "Courtyard lawn", "unknown", "#5aa83a", ["#539c35"], 0.95, 0.0, "courtyards", **F),
    material("paving", "Plaza paving", "stone", "#c9c6bd", ["#c0bdb4"], 0.9, 0.0, "plaza", **F),
    material("paving-light", "Light paving", "stone", "#e4e1d8", ["#dbd8cf"], 0.9, 0.0, "forecourt", **F),
    material("facade", "Facade", "stone", "#e6e3dc", ["#dcd9d2"], 0.85, 0.0, "wing facades", **F),
    material("facade-perf", "Perforated facade", "stone", "#eeeeea", ["#e4e4e0"], 0.85, 0.0, "terrace building upper storey",
             localOverrides=[{"id": "facade-perf.dots", "kind": "linework", "notes": "dark perforation dots as small boxes"}], **F),
    material("brick", "Brick", "stone", "#8a4b3a", ["#7f4535"], 0.9, 0.0, "south-east leg ground storey, round building base",
             localOverrides=[{"id": "brick.coursing", "kind": "stain", "notes": "coursing below sprite size: flat brick red"}], **F),
    material("window", "Window glass", "glass", "#2b3a42", ["#25333a"], 0.3, 0.0, "windows, glass bands", **F),
    material("panel-wood", "Wood facade panel", "wood", "#c4964f", ["#ba8c45"], 0.7, 0.0, "every fifth window bay", **F),
    material("glass-dark", "Dark glazing", "glass", "#3a4c55", ["#34454e"], 0.3, 0.0, "terrace building ground storey", **F),
    material("glass-round", "Round building glass", "glass", "#2f3a40", ["#29343a"], 0.3, 0.0, "round building bands", **F),
    material("glass-atrium", "Atrium glass", "glass", "#a9cbd8", ["#9fc1ce"], 0.2, 0.0, "atrium and lobby front", **F),
    material("parapet-light", "Light parapet", "stone", "#d9d6cf", ["#cfccc5"], 0.85, 0.0, "terrace edge", **F),
    material("roof-terrace", "Roof terrace", "stone", "#f0eee8", ["#e6e4de"], 0.85, 0.0, "terrace building roof", **F),
    material("terracotta", "Red roof", "stone", "#b8613e", ["#ae5737"], 0.9, 0.0, "yellow block roof", **F),
    material("check-light", "Plaza light square", "stone", "#e4e2dc", ["#dad8d2"], 0.9, 0.0, "checkerboard plaza", **F),
    material("check-dark", "Plaza dark square", "stone", "#9a9893", ["#908e89"], 0.9, 0.0, "checkerboard plaza", **F),
    material("planter", "Planter", "stone", "#cfcac0", ["#c5c0b6"], 0.85, 0.0, "round planters", **F),
    material("skylight", "Skylight disc", "stone", "#f2f2ee", ["#e8e8e4"], 0.8, 0.0, "atrium roof disc", **F),
    material("dome", "Skylight dome", "glass", "#4f7fb8", ["#4877ae"], 0.3, 0.0, "skylight domes", **F),
    material("logo-red", "LEGO red", "plastic", "#e3000b", ["#d50009"], 0.45, 0.0, "logo placeholder", **F),
    material("mf-red", "Minifigure red", "plastic", "#d0312d", ["#c62b27"], 0.4, 0.0, "statue torso, arms", **F),
    material("mf-blue", "Minifigure blue", "plastic", "#2b55a8", ["#264d9c"], 0.4, 0.0, "statue legs", **F),
    material("mf-yellow", "Minifigure yellow", "plastic", "#f6cf2a", ["#ecc520"], 0.4, 0.0, "statue head, hands", **F),
    material("wall-light", "Inner wall", "stone", "#e8e6e1", ["#dedcd7"], 0.85, 0.0, "walls between rooms", **F),
    material("wall-cap", "Wall cap", "stone", "#3b3b3b", ["#333333"], 0.9, 0.0, "dark cap on cut walls (cut-away read)", **F),
    material("frame-light", "White trim", "stone", "#f2f2ee", ["#e8e8e4"], 0.8, 0.0, "floor band", **F),
    material("frame-dark", "Dark frame", "metal", "#2e3236", ["#282b2f"], 0.6, 0.2, "door frame", **F),
    material("parapet", "Parapet", "stone", "#3c3f41", ["#36393b"], 0.85, 0.0, "roof edges", **F),
    material("roof-green", "Green roof", "unknown", "#7cc242", ["#74b83d"], 0.95, 0.0, "roofs", **F),
    material("glass-light", "Light glass", "glass", "#cfe6ee", ["#c5dce4"], 0.2, 0.0, "glass over the door", **F),
    material("glass-door", "Door glass", "glass", "#9cc8d8", ["#92bece"], 0.15, 0.0, "main door leaves", opacity={"base": 0.75}, **F),
    material("yellow", "LEGO yellow", "plastic", "#f2c500", ["#e8bb00"], 0.45, 0.0, "2 x 4 plate over the door", **F),
    material("npc-shirt-2", "NPC shirt (observer)", "fabric", "#e0a93a", ["#d69f30"], 0.9, 0.0, "generic NPC", **F),
    material("npc-shirt-3", "NPC shirt (seller)", "fabric", "#4a5f8f", ["#425685"], 0.9, 0.0, "generic NPC", **F),
    material("npc-shirt-4", "NPC shirt (seller 2)", "fabric", "#b5566a", ["#ab4c60"], 0.9, 0.0, "generic NPC", **F),
    material("map-paper", "Map paper", "unknown", "#f7f6f1", ["#edece7"], 0.9, 0.0, "the systems map (painted at runtime)", **F),
    material("npc-shirt-5", "NPC shirt (team)", "fabric", "#5b6e4f", ["#516445"], 0.9, 0.0, "generic NPC", **F),
    material("npc-hair-2", "NPC hair (fair)", "unknown", "#a5773f", ["#9b6d35"], 0.9, 0.0, "generic NPC", **F),
    material("note-yellow", "Sticky note yellow", "unknown", "#ffe066", ["#f5d65c"], 0.9, 0.0, "sticky notes", **F),
    material("note-pink", "Sticky note pink", "unknown", "#ff9cc0", ["#f592b6"], 0.9, 0.0, "sticky notes", **F),
    material("note-blue", "Sticky note blue", "unknown", "#8fd3ff", ["#85c9f5"], 0.9, 0.0, "sticky notes", **F),
    material("note-green", "Sticky note green", "unknown", "#a8e68a", ["#9edc80"], 0.9, 0.0, "sticky notes", **F),
    material("prop-paper", "Paper / whiteboard", "unknown", "#fbfbf8", ["#f1f1ee"], 0.8, 0.0, "whiteboard, notepad", **F),
    material("prop-board", "Clipboard", "wood", "#9a6b3c", ["#906132"], 0.8, 0.0, "clipboard", **F),
    material("prop-sofa", "Bench upholstery", "fabric", "#6e7a86", ["#64707c"], 0.9, 0.0, "waiting bench", **F),
    material("prop-wood", "Table wood", "wood", "#c89a64", ["#be905a"], 0.7, 0.0, "table top", **F),
    material("prop-mug", "Mug", "ceramic", "#f6f4ee", ["#ece9e2"], 0.5, 0.0, "coffee mugs", **F),
    material("camera-black", "Camera", "plastic", "#1d1f22", ["#18191c"], 0.5, 0.1, "test camera", **F),
    material("laptop-grey", "Laptop", "metal", "#b8bcc2", ["#aeb2b8"], 0.4, 0.4, "test laptop", **F),
    material("npc-trousers", "NPC trousers", "fabric", "#2f3a4c", ["#283242"], 0.9, 0.0, "generic NPC", **F),
    material("npc-shirt", "NPC shirt", "fabric", "#3aa0a0", ["#329696"], 0.9, 0.0, "generic NPC (tester)", **F),
    material("npc-skin", "NPC skin", "unknown", "#d9a77f", ["#cf9d75"], 0.8, 0.0, "generic NPC", **F),
    material("npc-hair", "NPC hair", "unknown", "#3b2a20", ["#33231a"], 0.9, 0.0, "generic NPC", **F),
    material("bubble-white", "Speech bubble", "plastic", "#ffffff", ["#f5f5f5"], 0.6, 0.0, "speech bubble (painted ? or !)", **F),
    material("screen-test", "Test screen", "glass", "#1e2a36", ["#18232e"], 0.3, 0.0, "big screen (painted animation)", **F),
    material("shelf-white", "Shelf white", "plastic", "#f4f3ef", ["#eae9e5"], 0.6, 0.0, "store shelf boards and back", **F),
    material("label-blue", "Price strip", "plastic", "#2f6fc0", ["#2a66b4"], 0.5, 0.0, "shelf-edge price strips", **F),
    material("label-white", "Box art (kids)", "plastic", "#fff6d8", ["#f5ecce"], 0.5, 0.0, "light art band on the bright boxes", **F),
    material("label-gold", "Box art (adult)", "plastic", "#c9a24a", ["#bf9840"], 0.4, 0.3, "thin gold band on the dark sets", **F),
    material("slot-marker", "Empty slot marker", "plastic", "#ffe7a3", ["#f5dd99"], 0.7, 0.0, "pale marked empty slot", **F),
    material("tag-orange", "Empty slot tag", "plastic", "#f07c1e", ["#e67214"], 0.5, 0.0, "orange tag under an empty slot", **F),
    material("box-yellow", "Box yellow", "plastic", "#f6c400", ["#ecba00"], 0.5, 0.0, "young builders' box", **F),
    material("box-red", "Box red", "plastic", "#d8282a", ["#ce1e20"], 0.5, 0.0, "young builders' box", **F),
    material("box-blue", "Box blue", "plastic", "#1f73d6", ["#1569cc"], 0.5, 0.0, "young builders' box", **F),
    material("box-green", "Box green", "plastic", "#2fa84f", ["#259e45"], 0.5, 0.0, "young builders' box", **F),
    material("box-orange", "Box orange", "plastic", "#f28a1e", ["#e88014"], 0.5, 0.0, "young builders' box", **F),
    material("box-dark", "Box black", "plastic", "#1d1f22", ["#16181b"], 0.4, 0.0, "grown-up set", **F),
    material("box-navy", "Box navy", "plastic", "#1d2c4a", ["#172540"], 0.4, 0.0, "grown-up set", **F),
    material("box-charcoal", "Box charcoal", "plastic", "#383b40", ["#2f3237"], 0.4, 0.0, "grown-up set", **F),
    material("hero-grey", "Hero placeholder", "plastic", "#8d8f94", ["#85878c"], 0.6, 0.0, "grey blocks where the hero objects go", **F),
    material("floor-lobby", "Lobby floor", "stone", "#f1f0ec", ["#e7e6e2"], 0.85, 0.0, "lobby", **F),
    material("floor-shelf", "Shelf room floor", "stone", "#efe2b8", ["#e5d8ae"], 0.9, 0.0, "1 shelf room (pale tint, route colour)", **F),
    material("floor-test", "Test room floor", "stone", "#c9dbef", ["#bfd1e5"], 0.9, 0.0, "2 test room", **F),
    material("floor-team", "Team room floor", "stone", "#cfe3cc", ["#c5d9c2"], 0.9, 0.0, "3 team room", **F),
    material("floor-map", "Map room floor", "stone", "#efd0c6", ["#e5c6bc"], 0.9, 0.0, "4 Systems map room", **F),
    material("floor-ai", "AI lab floor", "stone", "#dcd3ef", ["#d2c9e5"], 0.9, 0.0, "5 AI lab", **F),
]


def rgba(h, a=1.0):
    h = h.lstrip("#")
    return f"rgba({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)}, {a})"


mats = {m["id"]: m for m in spec["materials"]}
for c in C:
    m = mats[c["material"]]
    c["colorMaterialRecipe"] = {"dominantAlbedo": rgba(m["baseColor"]), "secondaryAlbedo": rgba(m["albedo"]["secondary"][0]),
                                "materialClass": m["materialClass"], "materialClassConfidence": 0.75, "evidenceRefs": c["evidenceRefs"]}
ids = [c["id"] for c in C]


def rep(rid, pred, dist, target="root"):
    el = [i for i in ids if pred(i)]
    return {"id": rid, "target": target, "count": len(el), "elementComponentIds": el, "distribution": dist, "notes": ""}


ROOM_HEROES = ("shelf-back", "test-desk", "team-screen-frame", "map-panel-0", "ai-table-top")   # 1 shelf, 2 test, 3 team, 4 map, 5 AI lab
spec["repetitionSystems"] = [
    rep("ground-walls", lambda i: i.startswith("wall-"), "ground storey walls on room edges, split at doors"),
    rep("upper-walls", lambda i: i.startswith("upper-"), "upper parts of the ground storey walls"),
    rep("canopy-studs", lambda i: i.startswith("roof-canopy-stud-"), "2 x 4 grid on the plate", "roof-canopy"),
    rep("room-heroes", lambda i: i in ROOM_HEROES, "one hero object per room on the route"),
]
spec["silhouette"] = {"boundingShape": "15 x 11 wu plot; real campus outline two storeys (2.6 wu) with courtyards, round building at the west, "
                                       "south forecourt notch; roof off: far walls 1.4 wu, others 0.35 wu",
                      "aspectRatios": ["plot 15 : 11", "height 2.75 : plot 15"], "symmetry": "asymmetric",
                      "dominantCurves": ["round building"], "negativeSpaces": ["courtyards", "forecourt", "room interiors"],
                      "landmarks": ["round building", "courtyards in the green roof", "yellow 2 x 4 plate"]}
spec["coordinateFrame"] = {"front": "+Z south (forecourt, main door, plaza)", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m); avatar 0.9"}
floors = [i for i in ids if i.endswith("-floor") or "-floor-" in i]
spec["featureReviewTargets"] = [
    {"id": "campus-identity", "name": "Real campus outline: courtyards in the green roof, round building, forecourt notch",
     "tier": "critical", "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": [i for i in ids if i.startswith("roof-") and (i.endswith("-mass") or "-mass-" in i)] + ["roof-skylight"]},
    {"id": "avatar-scale", "name": "Storeys 1.2 wu, door 1.0 wu: the avatar (0.9 wu) fits the main door", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["door-leaf-left", "door-leaf-right", "upper-S-door-header", "roof-canopy"]},
    {"id": "entrance", "name": "Yellow 2 x 4 plate over the glass main door on the south front", "tier": "critical",
     "passIds": ["structural-pass", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["roof-canopy", "door-leaf-left", "door-leaf-right"] + [f"roof-canopy-stud-{i}" for i in range(1, 9)]},
    {"id": "cutaway", "name": "Roof off: far walls high, other walls cut with dark caps, every room floor visible", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True, "componentRefs": floors},
    {"id": "room-heroes", "name": "One hero object per room on the route (shelf, test desk, team screen, map wall, AI lab table)",
     "tier": "important", "passIds": ["form-refinement", "material-pass"], "minimumScore": 0.6, "mustPass": False,
     "componentRefs": list(ROOM_HEROES)},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["iso south (yaw 45, pitch 30) roof on", "iso south roof off", "sprite south/west/north/east", "roof off with the avatar in each room"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 30000, "maxDrawCalls": 900, "textureSize": 256, "fpsTarget": 60})
spec["lightingFromPhoto"] = [
    {"id": "sky", "type": "hemisphere", "role": "key", "intensity": 1.0, "skyColor": "#f4f6f8", "groundColor": "#55663f",
     "evidence": "AI image: even daylight"},
    {"id": "key", "type": "directional", "role": "key", "intensity": 1.4, "position": [-3, 6, 4], "direction": [0.4, -0.8, -0.5],
     "castsShadow": True, "evidence": "city rules section 3: key from screen upper left, 45 deg up"},
    {"id": "fill", "type": "directional", "role": "fill", "intensity": 0.4, "position": [5, 4, -3], "evidence": "keeps side faces readable"},
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.3, "evidence": "soft reflections on the glass"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 1.0, "notes": "game sprites use the converter rig"},
    {"id": "contact", "role": "shadow", "notes": "soft contact shadows under the blocks"},
]
spec["entrance"] = {"side": "south", "at": 8.5, "width": 1.0, "approachTile": [8, 10],
                    "cues": ["yellow 2 x 4 plate over the forecourt", "glass sliding doors", "light forecourt paving"]}
spec["states"] = {"roofOn": "hide lowcap-* and topcap-*",
                  "roofOff": "hide roof-*; keep upper-/topcap- only for the two far sides of the view; show lowcap- for the others"}
pa = spec["preSpecAssessment"]
feat_refs = {f["id"] for c in C for f in c.get("localFeatures") or []}
DETAILS = [   # grey box identity details (id, description, feature ref)
    ("green-roof", "Flat green roof with courtyard holes.", "roof-wings-top.roof"),
    ("courts", "Light wells cut through the upper storey.", "roof-wings-mass.courts"),
    ("skylight", "Atrium skylight disc with blue domes.", "roof-skylight.domes"),
    ("statue", "Giant minifigure statue beside the plaza.", "minifig-torso.figure"),
    ("round-glass", "Round building in dark glass bands.", "roof-round-mass.bands"),
    ("round-court", "Round building with a round courtyard.", "court-round.lawn"),
    ("garden-court", "Larger court that wraps the round building.", "court-garden.lawn"),
    ("north-court", "Courtyard in the north wing.", "court-north.lawn"),
    ("south-east-court", "Courtyard in the south-east leg.", "court-south-east.lawn"),
    ("plate", "Yellow 2 x 4 plate with 8 studs over the forecourt.", "canopy.studs"),
    ("plaza", "Checkerboard plaza in front of the atrium.", "plaza.checker"),
    ("ailab", "AI lab: a long table with laptops, designers trying the template, an Open door sign.", "ai-table-top.lab"),
    ("shelf", "Shelf room: a store shelf, half full, bright boxes low, dark sets high, empty slots marked.", "shelf-back.store"),
    ("test", "Test room: a tester at a laptop with a speech bubble, and a big screen.", "test-desk.moment"),
    ("team", "Team room: a big screen with a clip from the tests, the team on chairs facing it.", "team-screen.clip"),
    ("map", "Systems map room: the round wall is one long map, many lines on the left become one line on the right.", "map-panel.map"),
]
tmpl = (pa.get("detailInventory") or {}).get("details", [{}])[0]
pa["detailInventory"]["details"] = [dict(copy.deepcopy(tmpl), id=i, description=d, scale="meso", affects="geometry",
                                         mapsTo={"type": "component.localFeatures", "ref": r},
                                         evidenceRef=f"{W}/ref/ai-studio-campus.jpg") for i, d, r in DETAILS if r in feat_refs]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]), "roof", len([i for i in ids if i.startswith("roof-")]),
      "walls", len(wall_ids), "sides", n_wall)

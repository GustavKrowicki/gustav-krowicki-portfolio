"""ObjectSculptSpec for LEGO HQ at avatar scale, grey box on the real campus outline (Linear POR-25).

Layout authority: plan.py, the campus outline traced from map data, turned so the walls line up and fitted to the walk
grid (15 x 11 tiles). Rooms and route: Figma board ON368BJhWf2SAwqRvlaHVH, node 651:3604 (door, lobby, 1 shelf room,
2 test room, 3 team room, 4 Systems map room, 5 AI lab). Scale: docs/city-rules.md (avatar 0.9 wu, door 1.0, ground
storey 1.4, upper storey 1.2). Grey box only: shell, rooms, doors, green roofs with courtyards, one labelled grey
block per room where its hero object will go. No detail yet.

Frame: 1 unit = 1 wu (one tile edge, ~2 m). +Y up, the plot top at y = G, the plot centred on the origin.
Plan tiles (gx right, gy down) map to X = gx - PW / 2 (east) and Z = gy - PH / 2 (south). The south (+Z) and east (+X)
sides face the default camera; the main door is at the back of the south forecourt under the yellow 2 x 4 plate.

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
# Plot, plaza, forecourt
C.append(comp("root", "Plot (grass)", "macro", "base", "box", (PW, G, PH), (0, G / 2, 0), "grass", parent=None, importance=0.8, conf=0.95,
              sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "top of the plot"}],
              features=[{"id": "root.plot", "kind": "contour", "notes": "15 x 11 wu plot: sets the sprite bbox in both states"}],
              topo="Flat plot: a box. It fixes the converter's bbox, so roof-on and roof-off sprites share one scale."))
bx("plaza", "Plaza along the street", "macro", "ground", 0, PW, 0, 0.012, 10.0, PH, "paving", contact="flush-mount", importance=0.7,
   features=[{"id": "plaza.paving", "kind": "contour", "notes": "light paving along the south edge"}], topo="Plaza: a thin box.")
bx("forecourt", "Forecourt", "macro", "ground", 7.0, 9.0, 0, 0.012, 7.0, 10.0, "paving-light", contact="flush-mount", importance=0.7,
   topo="Forecourt in the south notch: a thin box.")

# ---------------------------------------------------------------------------------------------------------------
# Rooms: floors from plan.py, courtyard lawns
ROOM_MAT = {"L": "floor-lobby", "S": "floor-shelf", "T": "floor-test", "M": "floor-team", "Y": "floor-map", "A": "floor-ai"}
ROOM_ID = {"L": "lobby", "S": "shelf", "T": "test", "M": "team", "Y": "map", "A": "ailab"}
REGION = {code: plan.room_region(code) for code in plan.ROOMS}
for code, (name, _k, _r) in plan.ROOMS.items():
    ext_plan(f"{ROOM_ID[code]}-floor", f"{name} floor", "macro", "floor", REGION[code], 0, 0.02, ROOM_MAT[code], importance=0.85,
             features=[{"id": f"{ROOM_ID[code]}-floor.tone", "kind": "stain", "notes": f"{name}: one flat floor tone (grey box)"}],
             topo="Room floor: the room's tiles cut to the building, a thin extrude.")
for cname, cg in plan.COURTS.items():
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


segs = {}      # (kind, side, owner) -> list of LineString
for code in plan.ROOMS:
    for poly in parts(REGION[code]):
        for a, b, n in ring_segments(poly.simplify(0.002)):
            mid = ((a[0] + b[0]) / 2 + n[0] * 0.05, (a[1] + b[1]) / 2 + n[1] * 0.05)
            other = next((o for o in plan.ROOMS if o != code and REGION[o].buffer(1e-6).contains(Point(mid))), None)
            if other:
                continue      # open plan: no wall between two areas
            elif any(cg.buffer(1e-6).contains(Point(mid)) for cg in plan.COURTS.values()):
                segs.setdefault(("O", "C", code), []).append(LineString([a, b]))     # round a courtyard: always cut
            else:
                segs.setdefault(("O", side_of(*n), code), []).append(LineString([a, b]))

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
            if owner == "L" and sd == "S":
                geom = geom.difference(DOOR_GAPS[0])
            what = "courtyard" if sd == "C" else f"{sd} side"
        for g in parts(geom):
            n_wall[sd] += 1
            tag = f"{sd}-{n_wall[sd]}"
            wall_stack(tag, g, "wall-grey" if kind == "O" else "wall-light", "wall-grey" if kind == "O" else "wall-light", what,
                       curved=len(g.exterior.coords) > 12)

# Main door: glass leaves in the 1.0 wu gap (lobby south wall at the back of the forecourt), dark posts, header
DX0, DX1, DZ = X(8.0), X(9.0), Z(7) - WT / 2
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

# Yellow 2 x 4 plate over the forecourt, wall to wall, in front of the door; part of the roof (hidden inside)
PX0, PX1, PZ0, PZ1, PY = 7.02, 8.98, 7.04, 8.04, 1.55
bx("roof-canopy", "Yellow 2 x 4 plate canopy", "macro", "canopy", PX0, PX1, PY, PY + 0.2, PZ0, PZ1, "yellow", importance=0.95, conf=0.85,
   features=[{"id": "canopy.studs", "kind": "contour", "notes": "2 x 4 round studs on top (8 cylinders)"}],
   sockets=[{"id": "top", "localPosition": [0, 0.1, 0], "notes": "stud row"}], topo="Toy plate: a box over the forecourt.")
for i in range(4):
    for j in range(2):
        cyl(f"roof-canopy-stud-{i * 2 + j + 1}", f"Canopy stud {i * 2 + j + 1}", "micro", "trim", PX0 + 0.245 + 0.49 * i, PZ0 + 0.25 + 0.5 * j,
            PY + 0.2, 0.09, 0.15, "yellow", importance=0.6, topo="Plate stud: a short cylinder.")

# ---------------------------------------------------------------------------------------------------------------
# Upper storey and green roofs ("roof-"): the whole shell minus the courtyards, one storey
UPPER = plan.SHELL.difference(unary_union(list(plan.COURTS.values())))
ext_plan("roof-mass", "Upper storey", "macro", "building", UPPER, G1, ST - 0.06, "facade-grey", importance=0.9,
         features=[{"id": "roof-mass.courts", "kind": "contour", "notes": "courtyard light wells cut through"}],
         topo="Upper storey: the shell minus the courtyards, extruded; roof on only.")
ext_plan("roof-top", "Green roof", "meso", "roof", UPPER, H2 - 0.06, 0.06, "roof-green", importance=0.85,
         features=[{"id": "roof-top.green", "kind": "contour", "notes": "flat green roof with courtyard holes"}], topo="Flat roof: a thin extrude.")
ext_plan("roof-parapet", "Roof edge parapet", "micro", "trim", UPPER.difference(UPPER.buffer(-WT, join_style=2)), H2, PAR, "parapet",
         importance=0.6, topo="Dark parapet on every roof edge: the roof outline minus its inward offset.")
ext_plan("roof-floorband", "Floor band", "micro", "trim", UPPER.buffer(0.015, join_style=2).difference(UPPER.buffer(-0.01, join_style=2)),
         G1 - 0.04, 0.08, "frame-light", importance=0.4, topo="Light band at the first floor line.")
ext_plan("roof-round-mark", "Round building roof ring", "micro", "trim",
         plan.ROUND.difference(plan.ROUND.buffer(-WT)).intersection(plan.SHELL), H2, PAR + 0.02, "parapet", importance=0.6,
         topo="Parapet round the round building, so it reads on the roof.")

# ---------------------------------------------------------------------------------------------------------------
# Hero object places: one grey block per room (sizes only roughly match the object to come)
HERO_BOX = {   # code: (x0, x1, z0, z1, height) in plan tiles inside the hero tile
    "S": (4.06, 4.42, 8.08, 8.92, 1.05),     # shelf against the west wall
    "T": (11.2, 11.8, 6.25, 6.75, 0.45),     # test desk with a laptop
    "M": (7.1, 7.9, 0.56, 0.8, 0.95),        # team screen on the north wall
    "Y": (1.0, 1.32, 6.1, 6.9, 1.05),        # map on the round wall
    "A": (14.15, 14.85, 5.1, 5.9, 0.42),     # AI lab long table
}
for code, (x0, x1, z0, z1, h) in HERO_BOX.items():
    name = plan.HERO[code][1]
    bx(f"hero-{ROOM_ID[code]}", f"Hero object place: {name}", "meso", "prop", x0, x1, 0.02, h, z0, z1, "hero-grey", importance=0.7,
       features=[{"id": f"hero-{ROOM_ID[code]}.place", "kind": "contour", "notes": f"grey block where the {name} object goes"}],
       topo="Grey placeholder block: a box.")

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
    material("court", "Courtyard lawn", "unknown", "#5aa83a", ["#539c35"], 0.95, 0.0, "courtyards", **F),
    material("paving", "Plaza paving", "stone", "#c9c6bd", ["#c0bdb4"], 0.9, 0.0, "plaza", **F),
    material("paving-light", "Light paving", "stone", "#e4e1d8", ["#dbd8cf"], 0.9, 0.0, "forecourt", **F),
    material("wall-grey", "Outside wall (grey box)", "stone", "#c8c8c4", ["#bebeba"], 0.85, 0.0, "walls on the outside and round courtyards",
             localOverrides=[{"id": "wall-grey.contact", "kind": "stain", "notes": "contact darkening at the wall foot (lab contact shadow)"}], **F),
    material("wall-light", "Inner wall", "stone", "#e8e6e1", ["#dedcd7"], 0.85, 0.0, "walls between rooms", **F),
    material("wall-cap", "Wall cap", "stone", "#3b3b3b", ["#333333"], 0.9, 0.0, "dark cap on cut walls (cut-away read)", **F),
    material("facade-grey", "Upper storey (grey box)", "stone", "#d6d5d0", ["#cccbc6"], 0.85, 0.0, "upper storey", **F),
    material("frame-light", "White trim", "stone", "#f2f2ee", ["#e8e8e4"], 0.8, 0.0, "floor band", **F),
    material("frame-dark", "Dark frame", "metal", "#2e3236", ["#282b2f"], 0.6, 0.2, "door frame", **F),
    material("parapet", "Parapet", "stone", "#3c3f41", ["#36393b"], 0.85, 0.0, "roof edges", **F),
    material("roof-green", "Green roof", "unknown", "#7cc242", ["#74b83d"], 0.95, 0.0, "roofs", **F),
    material("glass-light", "Light glass", "glass", "#cfe6ee", ["#c5dce4"], 0.2, 0.0, "glass over the door", **F),
    material("glass-door", "Door glass", "glass", "#9cc8d8", ["#92bece"], 0.15, 0.0, "main door leaves", opacity={"base": 0.75}, **F),
    material("yellow", "LEGO yellow", "plastic", "#f2c500", ["#e8bb00"], 0.45, 0.0, "2 x 4 plate over the door", **F),
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


spec["repetitionSystems"] = [
    rep("ground-walls", lambda i: i.startswith("wall-"), "ground storey walls on room edges, split at doors"),
    rep("upper-walls", lambda i: i.startswith("upper-"), "upper parts of the ground storey walls"),
    rep("canopy-studs", lambda i: i.startswith("roof-canopy-stud-"), "2 x 4 grid on the plate", "roof-canopy"),
    rep("hero-places", lambda i: i.startswith("hero-"), "one grey block per room"),
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
     "componentRefs": [i for i in ids if i.startswith("roof-mass") or i.startswith("roof-top")]},
    {"id": "avatar-scale", "name": "Storeys 1.2 wu, door 1.0 wu: the avatar (0.9 wu) fits the main door", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["door-leaf-left", "door-leaf-right", "upper-S-door-header", "roof-canopy"]},
    {"id": "entrance", "name": "Yellow 2 x 4 plate over the glass main door at the back of the forecourt", "tier": "critical",
     "passIds": ["structural-pass", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["roof-canopy", "door-leaf-left", "door-leaf-right"] + [f"roof-canopy-stud-{i}" for i in range(1, 9)]},
    {"id": "cutaway", "name": "Roof off: far walls high, other walls cut with dark caps, every room floor visible", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True, "componentRefs": floors},
    {"id": "hero-places", "name": "One grey block per room where its hero object goes", "tier": "important",
     "passIds": ["form-refinement", "material-pass"], "minimumScore": 0.6, "mustPass": False,
     "componentRefs": [i for i in ids if i.startswith("hero-")]},
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
spec["entrance"] = {"side": "south", "at": 8.5, "width": 1.0, "approachTile": [8, 7],
                    "cues": ["yellow 2 x 4 plate over the forecourt", "glass sliding doors", "light forecourt paving"]}
spec["states"] = {"roofOn": "hide lowcap-* and topcap-*",
                  "roofOff": "hide roof-*; keep upper-/topcap- only for the two far sides of the view; show lowcap- for the others"}
pa = spec["preSpecAssessment"]
feat_refs = {f["id"] for c in C for f in c.get("localFeatures") or []}
DETAILS = [   # grey box identity details (id, description, feature ref)
    ("green-roof", "Flat green roof with courtyard holes.", "roof-top.green"),
    ("courts", "Light wells cut through the upper storey.", "roof-mass.courts"),
    ("round-court", "Round building with a round courtyard.", "court-round.lawn"),
    ("garden-court", "Larger court that wraps the round building.", "court-garden.lawn"),
    ("north-court", "Courtyard in the north wing.", "court-north.lawn"),
    ("south-west-court", "Courtyard in the south-west leg.", "court-south-west.lawn"),
    ("south-east-court", "Courtyard in the south-east leg.", "court-south-east.lawn"),
    ("plate", "Yellow 2 x 4 plate with 8 studs over the forecourt.", "canopy.studs"),
    ("plaza", "Light plaza along the street.", "plaza.paving"),
    ("hero-places", "One grey block per room for its hero object.", "hero-shelf.place"),
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

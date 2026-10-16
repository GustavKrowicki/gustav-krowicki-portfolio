"""ObjectSculptSpec for LEGO HQ Rooms: the LEGO campus with the roofs removed, one room per building block.

Layout authority: the Figma board's simple block plan (file "Portfolio", page "New", section 02b, card B3,
node 526:3604; made from card B2, node 503:4). Its room table gives each room box in B3 grid tiles (u right, v down)
and its wall height. Block outlines come from ../lego-campus/measure/plan.json, squared to the grid at 7 wu per plan
unit (B3 grid = 7 * plan + 3.5). Style authority: the Figma AI reference ref/ai-roof-off-campus-v3.png.

Frame: 1 unit = 1 wu (one tile edge, ~2 m), docs/city-rules.md. +Y up, ground slab top at y = SLAB, the 7 x 7 wu
plot centred on the origin, +X east, +Z south. Plot x = u - 4.0 (B3 u - 3.5, shifted 0.5 west so the round building
stays inside the plot; the spare west wing is clipped at the plot edge), plot z = v - 3.5, then stretched along z
by 1.45 (see T) so the rooms get space; the round building stays round.

Two states, one model: every component whose id starts with "roof-" is the closed building (block masses and
roofs). Hide them and the rooms show from above (B3 build notes): one coloured floor box per room, 2 back walls
(north and west) with a dark cap, door gaps, 3 to 4 large hero objects. The entrance vestibule under the yellow
2 x 4 brick opens straight into the lobby. Child transforms are parent-relative; everything hangs off the slab.
"""
import copy
import json
import math
import sys

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
AI, PLAN = "ai-roof-off", "block-plan"
spec["viewEvidence"] = [
    {"id": AI, "view": "primary: Figma AI isometric image of the campus with the roofs removed (style, room content, colour)",
     "image": f"{W}/ref/ai-roof-off-campus-v3.png", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["central glass lobby joined to the entrance", "yellow 2 x 4 brick canopy over glass doors",
                      "cut walls with a thick dark top edge", "one pastel floor colour per room",
                      "a few large props per room", "closed block with a green roof on the west"],
     "confidence": 0.8},
    {"id": PLAN, "view": "layout: board card B3 simple block plan (Figma node 526:3604) over the campus block outlines",
     "image": f"{W}/../lego-campus/measure/plan.json", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["room boxes and wall heights from the B3 room table", "atrium = lobby, entrance vestibule on its north face",
                      "north wing + yellow bar = Workshop", "south-west wing = Recommendation studio", "round building = Systems map room",
                      "south-east wing = Launch room", "terrace building = AI lab", "glass link lobby to round building"],
     "confidence": 0.9},
]

SLAB = 0.06          # ground slab; floors sit on it
CAP = 0.05           # dark cap on the back walls
WT = 0.1             # wall thickness
DOOR = 0.5           # room door gap (B3 note 09)
ENTRY = 1.0          # entrance width (B3 note 09)
HALF = 3.5
XROT = [-math.pi / 2, 0, 0]
DX = -4.0            # plot x = B3 u + DX
DZ = -3.5            # plot z = B3 v + DZ

plan = {r["id"]: r for r in json.load(open(f"{W}/../lego-campus/measure/plan.json"))}


def h_wu(rel):
    """Plan height (GLB units) -> wu; fitted to the B3 table (atrium 1.32, wings 1.12, north wing 0.84, terrace 0.67)."""
    return max(0.6, 0.781 + 6.92 * rel)


# Stretch along z so the rooms get space (the campus is wide and shallow): campus z -1.12..3.5 -> -3.35..3.35,
# as the skeleton did. x stays 1:1. Hero objects keep their size; only their centres move.
SV, Z_IN, Z_OUT = 1.45, -1.12, -3.35


def T(z):
    return Z_OUT + (z - Z_IN) * SV


def pz(p):
    return [7 * p[0] + 3.5 + DX, T(7 * p[1] + 3.5 + DZ)]


def area(poly):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1])) / 2


def dp(points, tol):
    """Douglas-Peucker on a closed ring: removes the raster stair steps."""
    def rdp(pts):
        if len(pts) < 3:
            return pts
        (x0, y0), (x1, y1) = pts[0], pts[-1]
        L = math.hypot(x1 - x0, y1 - y0) or 1e-9
        dmax, idx = 0.0, 0
        for i in range(1, len(pts) - 1):
            d = abs((y1 - y0) * pts[i][0] - (x1 - x0) * pts[i][1] + x1 * y0 - y1 * x0) / L
            if d > dmax:
                dmax, idx = d, i
        if dmax > tol:
            return rdp(pts[:idx + 1])[:-1] + rdp(pts[idx:])
        return [pts[0], pts[-1]]
    far = max(range(len(points)), key=lambda i: math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]))
    a, b = points[:far + 1], points[far:] + points[:1]
    ring = rdp(a)[:-1] + rdp(b)[:-1]
    return ring if len(ring) >= 3 else points


def clip_x(poly, lim):
    """Keep x >= lim (the west plot edge)."""
    out = []
    for i, cur in enumerate(poly):
        prev = poly[i - 1]
        cin, pin = cur[0] >= lim, prev[0] >= lim
        if cin != pin:
            t = (lim - prev[0]) / (cur[0] - prev[0])
            out.append([lim, prev[1] + t * (cur[1] - prev[1])])
        if cin:
            out.append(list(cur))
    return out


def ring(poly_uv, tol=0.08):
    r = clip_x(dp([pz(p) for p in poly_uv], tol), -HALF + 0.02)
    return r if len(r) >= 3 and abs(area(r)) > 0.15 else None   # drops tiny rooftop boxes and slivers


def circle(cx, cz, r, n=32):
    return [[cx + r * math.cos(2 * math.pi * i / n), cz + r * math.sin(2 * math.pi * i / n)] for i in range(n)]


def rect(x0, x1, z0, z1):
    return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]


def box_uv(u0, u1, v0, v1):
    return (u0 + DX, u1 + DX, T(v0 + DZ), T(v1 + DZ))


def r4(v):
    return [round(float(x), 4) for x in v]


def prof(poly):
    return [[round(x, 4), round(-z, 4)] for x, z in poly]


def comp(cid, name, level, role, primitive, dims, pos, material, *, rot=None, profile=None, importance=0.6, conf=0.7,
         features=None, evidence=None, topo="", sockets=None, contact="flush-mount", start=None, end=None, radius=None,
         channels=None, anim_role="static", parent="root"):
    c = copy.deepcopy(root_t)
    c.update({"id": cid, "name": name, "level": level, "role": role, "importance": importance, "confidence": conf,
              "primitive": primitive, "topologyClass": "assembled-solid", "topologyRationale": topo, "parent": parent,
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
    # root sits at y = SLAB / 2: children are written in world wu and shifted into its frame
    p = list(pos) if parent is None else [pos[0], pos[1] - SLAB / 2, pos[2]]
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
        s = start or (pos[0], SLAB, pos[2])
        e = end or (pos[0], SLAB + dims[1], pos[2])
        a = {"parentId": parent, "parentSocket": "ground-top", "localStart": r4((s[0], s[1] - SLAB / 2, s[2])),
             "localEnd": r4((e[0], e[1] - SLAB / 2, e[2])), "contactType": contact, "embedDepth": 0.002, "gapTolerance": 0.002}
        if radius:
            a.update(baseRadius=radius, endRadius=radius)
        c["attachment"] = a
    c["fidelityTier"] = "game-prop"
    return c


def bounds(poly):
    xs = [p[0] for p in poly]; zs = [p[1] for p in poly]
    return min(xs), max(xs), min(zs), max(zs)


def extrude(cid, name, level, role, poly, holes, y0, h, material, **kw):
    x0, x1, z0, z1 = bounds(poly)
    return comp(cid, name, level, role, "extrude", (x1 - x0, h, z1 - z0), (0, y0, 0), material, rot=XROT,
                profile={"points": prof(poly), "depth": round(h, 4), "holes": [prof(hh) for hh in holes]},
                start=((x0 + x1) / 2, y0, (z0 + z1) / 2), end=((x0 + x1) / 2, y0 + h, (z0 + z1) / 2), **kw)


def box(cid, name, level, role, x0, x1, y0, y1, z0, z1, material, *, contact="resting", **kw):
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    return comp(cid, name, level, role, "box", (x1 - x0, y1 - y0, z1 - z0), (cx, (y0 + y1) / 2, cz), material, contact=contact,
                start=(cx, y0, cz), end=(cx, y1, cz), **kw)


C = []
C.append(comp("root", "Ground slab (grass plot)", "macro", "base", "box", (2 * HALF, SLAB, 2 * HALF), (0, SLAB / 2, 0), "grass", parent=None,
              importance=0.8, conf=0.9, sockets=[{"id": "ground-top", "localPosition": [0, SLAB / 2, 0], "notes": "top of the plot"}],
              features=[{"id": "root.plot", "kind": "contour", "notes": "square 7 x 7 wu grass plot: carries the sprite bbox in both states"}],
              topo="Flat plot: a box. It sets the converter's bbox, so roof-on and roof-off sprites share one scale."))
G = SLAB             # ground top

# --- Blocks: (key, plan id, look, state). open = the closed mass is a roof part; closed = stays in both states ----
BLOCKS = [
    ("north-wing", "b-main-1", "wing", "open"), ("yellow-bar", "b-high-1", "yellow", "open"),
    ("sw-wing", "b-mid-0", "wing", "open"), ("se-wing", "b-mid-1", "wing", "open"),
    ("terrace", "b-low-0", "terrace", "open"), ("atrium", "b-high-0", "glass", "open"),
    ("west-tower", "b-high-2", "wing", "open"), ("greenhouse", "b-main-4", "glass", "open"), ("pavilion", "b-main-5", "terrace", "open"),
    ("west-wing", "b-main-2", "closed", "closed"), ("west-annex", "b-main-3", "closed", "closed"),
    ("west-box-1", "b-mid-2", "closed", "closed"), ("west-box-2", "b-mid-3", "closed", "closed"),
    ("south-block", "b-top-0", "yellow", "closed"), ("east-pavilion", "b-main-6", "wing", "closed"),
]
ROOF_TOP = {"wing": "roof-green", "yellow": "roof-dark", "terrace": "roof-terrace", "glass": "roof-white", "closed": "roof-green"}
SIDE = {"wing": "facade", "yellow": "yellow", "terrace": "facade-light", "glass": "glass-roofon", "closed": "closed-grey"}
FLOORLESS = {"west-tower", "greenhouse", "pavilion"}   # sit on another block's roof: nothing on the ground
for key, pid, look, state in BLOCKS:
    r = plan[pid]
    poly = ring(r["outline"])
    if poly is None:
        continue
    holes = [h for h in (ring(hh, 0.04) for hh in r["holes"]) if h]
    H = h_wu(r["height"])
    if state == "closed":
        # No room: a low closed block in both states, so it never hides a room; the upper storeys are roof parts
        LOW = min(H, 0.6)
        C.append(extrude(f"{key}-mass", f"Closed block ({key})", "macro", "building", poly, holes, G, LOW, SIDE[look], importance=0.6,
                         topo="Closed block (no room): the plan outline extruded one low storey."))
        C.append(extrude(f"{key}-top", f"Closed block roof ({key})", "meso", "roof", poly, holes, G + LOW, 0.03, ROOF_TOP[look], importance=0.4,
                         topo="Roof on the low closed block: a thin extrude."))
        if H - LOW > 0.05:
            C.append(extrude(f"roof-{key}-upper", f"Closed block upper storeys, roof on ({key})", "macro", "building", poly, holes, G + LOW + 0.03,
                             H - LOW - 0.03, SIDE[look], importance=0.5, topo="Roof-on state: the rest of the block height."))
            C.append(extrude(f"roof-{key}-upper-top", f"Closed block roof, roof on ({key})", "meso", "roof", poly, holes, G + H, 0.03,
                             ROOF_TOP[look], importance=0.4, topo="Roof-on state: roof surface, a thin extrude."))
        continue
    if key not in FLOORLESS:
        C.append(extrude(f"{key}-base", f"Block floor ({key})", "meso", "floor", poly, holes, G, 0.01, "paving", importance=0.5,
                         topo="Grey block footprint with the roof off: the outline, a thin extrude."))
    C.append(extrude(f"roof-{key}-mass", f"Closed block, roof on ({key})", "macro", "building", poly, holes, G + 0.005, H - 0.005, SIDE[look],
                     importance=0.7, topo="Roof-on state: the block outline extruded to its height."))
    C.append(extrude(f"roof-{key}-top", f"Roof, roof on ({key})", "meso", "roof", poly, holes, G + H, 0.03, ROOF_TOP[look],
                     importance=0.6, topo="Roof-on state: roof surface, a thin extrude."))

# Round building (b-main-0): ring r 0.28 to 0.90 (B3 table), centre from the plan
RC = pz((0.429, 0.118))
RO, RI, RH = 0.90, 0.28, h_wu(plan["b-main-0"]["height"])
C.append(extrude("roof-round-mass", "Round building, roof on", "macro", "building", circle(*RC, RO), [circle(*RC, RI, 24)], G + 0.005, RH - 0.005,
                 "facade", importance=0.7, topo="Roof-on state: the ring extruded to its height."))
C.append(extrude("roof-round-top", "Round building roof, roof on", "meso", "roof", circle(*RC, RO), [circle(*RC, RI, 24)], G + RH, 0.03,
                 "roof-green", importance=0.6, topo="Roof-on state: green ring roof."))
# Plaza in front of the entrance (north side of the plot)
C.append(box("entrance-path", "Entrance path", "meso", "ground", -0.725, 0.475, G, G + 0.008, -HALF, -0.35, "paving", contact="flush-mount",
             importance=0.5, topo="Paved path from the plot edge to the entrance: a thin box."))

# --- Rooms (B3 room table) ---------------------------------------------------------------------------------
ROOMS = {   # key: (name, box in B3 u/v, wall height, floor material)
    "lobby": ("Lobby", (2.6, 4.75, 3.6, 5.3), 1.32, "floor-white"),
    "workshop": ("Workshop", (0.8, 2.6, 2.6, 4.1), 0.84, "floor-workshop"),
    "studio": ("Recommendation studio", (1.25, 3.75, 5.3, 6.8), 1.12, "floor-studio"),
    "launch": ("Launch room", (4.75, 6.0, 4.9, 6.0), 1.12, "floor-launch"),
    "lab": ("AI lab", (4.75, 5.6, 2.4, 4.15), 0.67, "floor-lab"),
    "link": ("Glass link", (4.75, 5.65, 4.15, 4.65), 0.5, "floor-white"),
}
BOX = {k: box_uv(*v[1]) for k, v in ROOMS.items()}
FEATS = {
    "lobby": [{"id": "lobby-floor.glassWalls", "kind": "contour", "notes": "glass back walls with a dark cap, open to the entrance vestibule"}],
    "workshop": [{"id": "workshop-floor.cutCaps", "kind": "contour", "notes": "back walls with a thick dark cap: reads as a cut-away"}],
    "studio": [{"id": "studio-floor.tone", "kind": "stain", "notes": "one flat mint floor; the courtyard is filled (B3 note 04)"}],
}


def wall_line(cid, name, a, b, y0, h, material, gaps, cap=True, level="meso"):
    """Straight wall from a to b (axis-aligned), inset by WT/2 toward the room; split around gaps (centre, width)."""
    (x0, z0), (x1, z1) = a, b
    horizontal = abs(z1 - z0) < 1e-6
    L = abs(x1 - x0) if horizontal else abs(z1 - z0)
    s0 = min(x0, x1) if horizontal else min(z0, z1)
    pieces, t = [], s0
    for gc, gw in sorted(gaps):
        pieces.append((t, gc - gw / 2)); t = gc + gw / 2
    pieces.append((t, s0 + L))
    n = 0
    for p0, p1 in pieces:
        if p1 - p0 < 0.08:
            continue
        n += 1
        wid = f"{cid}-{n}"
        if horizontal:
            zc = z0 + WT / 2
            C.append(box(wid, f"{name} {n}", level, "wall", p0, p1, y0, y0 + h, zc - WT / 2, zc + WT / 2, material, contact="flush-mount",
                         topo="Straight back wall piece: a box."))
            if cap:
                C.append(box(f"{wid}-cap", f"{name} {n} cap", "micro", "trim", p0, p1, y0 + h, y0 + h + CAP, zc - WT / 2 - 0.01, zc + WT / 2 + 0.01,
                             "wall-cap", contact="applied", topo="Dark cap on the wall top: a thin box."))
        else:
            xc = x0 + WT / 2
            C.append(box(wid, f"{name} {n}", level, "wall", xc - WT / 2, xc + WT / 2, y0, y0 + h, p0, p1, material, contact="flush-mount",
                         topo="Straight back wall piece: a box."))
            if cap:
                C.append(box(f"{wid}-cap", f"{name} {n} cap", "micro", "trim", xc - WT / 2 - 0.01, xc + WT / 2 + 0.01, y0 + h, y0 + h + CAP, p0, p1,
                             "wall-cap", contact="applied", topo="Dark cap on the wall top: a thin box."))


# Back walls (north + west) and their door gaps toward the lobby / entrance (B3 notes 08-10)
VEST = (-0.725, 0.475, T(-0.35), BOX["lobby"][2])     # entrance vestibule x0, x1, z0, z1 (B3: u 3.45-4.3, v 3.15-3.6)
GAPS = {
    "lobby": {"north": [((VEST[0] + VEST[1]) / 2, VEST[1] - VEST[0])], "west": [(T(0.35), DOOR)]},
    "workshop": {"north": [], "west": []},
    "studio": {"north": [(-0.85, DOOR)], "west": []},
    "launch": {"north": [], "west": [(T(1.6), DOOR)]},
    "lab": {"north": [], "west": [(T(0.375), DOOR)]},
}
for key, (name, _, H, fmat) in ROOMS.items():
    x0, x1, z0, z1 = BOX[key]
    C.append(box(f"{key}-floor", f"{name} floor", "macro", "floor", x0, x1, G + 0.01, G + 0.03, z0, z1, fmat, contact="flush-mount",
                 importance=0.85, features=FEATS.get(key, [{"id": f"{key}-floor.tone", "kind": "stain", "notes": f"{name}: one flat floor colour"}]),
                 topo="Room floor: one flat box (B3 note 03)."))
    if key == "link":
        for side, zz in (("north", z0), ("south", z1 - WT)):
            C.append(box(f"link-glass-{side}", f"Glass link {side} wall", "meso", "wall", x0, x1, G + 0.03, G + 0.03 + H, zz, zz + WT, "glass",
                         contact="flush-mount", importance=0.5, features=[{"id": "glass-link.link", "kind": "contour", "notes": "low glass corridor"}]
                         if side == "north" else None, topo="Low glass corridor wall: a box."))
        continue
    # Roof on: a closed box over the room too, so no room part shows outside the simplified block outline
    look = "glass" if key == "lobby" else "wing"
    C.append(box(f"roof-room-{key}", f"{name} closed, roof on", "macro", "building", x0 + 0.005, x1 - 0.005, G + 0.005, G + H, z0 + 0.005, z1 - 0.005,
                 SIDE[look], contact="flush-mount", importance=0.6, topo="Roof-on state: the room box closed to its wall height."))
    C.append(box(f"roof-room-{key}-top", f"{name} roof, roof on", "meso", "roof", x0 + 0.005, x1 - 0.005, G + H, G + H + 0.03, z0 + 0.005, z1 - 0.005,
                 ROOF_TOP[look], contact="applied", importance=0.5, topo="Roof-on state: roof surface, a thin box."))
    wall_mat = "glass" if key == "lobby" else f"wall-{key}"
    hw = H - CAP - 0.01          # caps stay under the roof-on roof surface
    wall_line(f"{key}-wall-n", f"{name} north wall", (x0, z0), (x1, z0), G + 0.03, hw - 0.03, wall_mat, GAPS[key]["north"])
    wall_line(f"{key}-wall-w", f"{name} west wall", (x0, z0), (x0, z1), G + 0.03, hw - 0.03, wall_mat, GAPS[key]["west"])

# Round Systems map room: floor ring + back arc (north-west half) with a gap toward the glass link
C.append(extrude("map-floor", "Systems map room floor", "macro", "floor", circle(*RC, RO - 0.01), [circle(*RC, RI, 24)], G + 0.01, 0.02, "floor-map",
                 importance=0.85, features=[{"id": "map-floor.tone", "kind": "stain", "notes": "Systems map room: one flat floor colour"}],
                 topo="Room floor: the ring, a thin extrude."))
gap = DOOR / RO
for k, (a0, a1) in enumerate(((0.75 * math.pi, math.pi - gap / 2), (math.pi + gap / 2, 1.75 * math.pi)), 1):
    n = 16
    outer = [[RC[0] + (RO - 0.01) * math.cos(a0 + (a1 - a0) * i / n), RC[1] + (RO - 0.01) * math.sin(a0 + (a1 - a0) * i / n)] for i in range(n + 1)]
    inner = [[RC[0] + (RO - 0.01 - WT) * math.cos(a1 - (a1 - a0) * i / n), RC[1] + (RO - 0.01 - WT) * math.sin(a1 - (a1 - a0) * i / n)] for i in range(n + 1)]
    hw = RH - CAP - 0.01
    C.append(extrude(f"map-wall-{k}", f"Systems map room back arc {k}", "meso", "wall", outer + inner, [], G + 0.03, hw - 0.03, "wall-light",
                     importance=0.7, topo="Round back wall: an extruded annulus sector."))
    C.append(extrude(f"map-wall-{k}-cap", f"Back arc {k} cap", "micro", "trim", outer + inner, [], G + hw, CAP, "wall-cap", importance=0.5,
                     contact="applied", topo="Dark cap on the arc: the same sector, thin."))

# --- Entrance vestibule (glass) + giant yellow 2 x 4 brick; open into the lobby ---------------------------------
vx0, vx1, vz0, vz1 = VEST
C.append(box("vestibule-floor", "Entrance vestibule floor", "meso", "floor", vx0, vx1, G + 0.01, G + 0.03, vz0, vz1, "floor-white",
             contact="flush-mount", importance=0.6, topo="Vestibule floor: a flat box."))
for side, (a0, a1) in (("west", (vx0, vx0 + 0.06)), ("east", (vx1 - 0.06, vx1))):
    C.append(box(f"vestibule-glass-{side}", f"Vestibule {side} glass", "meso", "wall", a0, a1, G + 0.03, G + 1.0, vz0, vz1, "glass",
                 contact="flush-mount", importance=0.5, topo="Glass side wall: a box."))
C.append(box("entrance-doors", "Glass entrance doors", "meso", "door", (vx0 + vx1) / 2 - ENTRY / 2, (vx0 + vx1) / 2 + ENTRY / 2, G + 0.03, G + 1.0,
             vz0, vz0 + 0.06, "glass-door", contact="flush-mount", importance=0.7, topo="Glass double door on the north face: a box."))
BW, BD, BH = 1.6, 0.8, 0.32
bx, bz = (vx0 + vx1) / 2, vz0 + BD / 2 - 0.1
C.append(box("canopy", "Giant yellow 2 x 4 brick canopy", "macro", "canopy", bx - BW / 2, bx + BW / 2, G + 1.0, G + 1.0 + BH, bz - BD / 2, bz + BD / 2,
             "yellow", contact="resting", importance=0.95, conf=0.85,
             features=[{"id": "canopy.studs", "kind": "contour", "notes": "2 x 4 round studs on top (8 cylinders)"}],
             sockets=[{"id": "top", "localPosition": [0, BH / 2, 0], "notes": "stud row"}], topo="Toy brick body: a box over the doors."))
for i in range(4):
    for j in range(2):
        sx, sz = bx - BW / 2 + (i + 0.5) * BW / 4, bz - BD / 2 + (j + 0.5) * BD / 2
        y0 = G + 1.0 + BH
        C.append(comp(f"canopy-stud-{i * 2 + j + 1}", f"Canopy stud {i * 2 + j + 1}", "micro", "trim", "cylinder", (0.26, 0.1, 0.26),
                      (sx, y0 + 0.05, sz), "yellow", importance=0.6, start=(sx, y0, sz), end=(sx, y0 + 0.1, sz), radius=0.13,
                      topo="Brick stud: a short cylinder."))
# LEGO logo placeholder: a red square sign on the closed west wing's north face (no text, B3 note 06)
ww = ring(plan["b-main-2"]["outline"])
wx0, wx1, wz0, _ = bounds(ww)
C.append(box("logo-sign", "Logo sign (red square)", "meso", "sign", (wx0 + wx1) / 2 - 0.25, (wx0 + wx1) / 2 + 0.25, G + 0.35, G + 0.85, wz0 - 0.04, wz0,
             "logo-red", contact="applied", importance=0.6, topo="Red square sign on the facade: a thin box."))


# --- Hero objects (B3 table; positions from the B3 drawing, 0.2 wu minimum, note 12) ----------------------------
def hero(cid, name, x, z, w, h, d, material, *, y0=None, level="meso", importance=0.6, features=None, raw=False):
    """x, z: centre in unstretched plot units (B3 drawing), unless raw (already final)."""
    z = z if raw else T(z)
    y = G + 0.03 if y0 is None else y0
    C.append(box(cid, name, level, "prop", x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2, material, importance=importance,
                 features=features, topo="Large readable hero object: a box."))


# Lobby: floor map, desk
hero("lobby-floor-map", "Lobby floor map", -0.2, 0.85, 1.0, 0.01, 0.7, "map", importance=0.6)
hero("lobby-desk", "Lobby desk", -0.85, 1.35, 0.7, 0.4, 0.3, "desk-white", importance=0.6)
# Workshop: whiteboard on the north wall, table + 4 chairs, column
wb = BOX["workshop"]
hero("workshop-whiteboard", "Workshop whiteboard", -2.2, wb[2] + WT + 0.03, 1.0, 0.45, 0.05, "whiteboard", y0=G + 0.2, importance=0.8, raw=True,
     features=[{"id": "workshop-whiteboard.board", "kind": "contour", "notes": "long white board on the back wall"}])
hero("workshop-table", "Workshop table", -2.15, -0.15, 0.8, 0.32, 0.5, "timber", importance=0.75)
for k, (cx, cz) in enumerate(((-2.4, -0.55), (-1.9, -0.55), (-2.4, 0.25), (-1.9, 0.25)), 1):
    hero(f"workshop-chair-{k}", f"Workshop chair {k}", cx, cz, 0.22, 0.22, 0.22, "chair-blue", level="micro", importance=0.4)
C.append(comp("workshop-column", "Workshop column", "meso", "prop", "cylinder", (0.24, 0.78, 0.24), (-2.95, G + 0.03 + 0.39, T(-0.65)), "wall-light",
              contact="resting", start=(-2.95, G + 0.03, T(-0.65)), end=(-2.95, G + 0.81, T(-0.65)), radius=0.12, importance=0.5,
              topo="Round structural column: a cylinder."))
# Recommendation studio: 2 shelves, big button, sign
hero("studio-shelf-1", "Studio shelf 1", -2.05, 3.05, 0.8, 0.5, 0.22, "timber")
hero("studio-shelf-2", "Studio shelf 2", -1.05, 3.05, 0.8, 0.5, 0.22, "timber")
hero("studio-button-base", "Studio button pedestal", -1.55, 2.4, 0.3, 0.3, 0.3, "desk-white", importance=0.5)
C.append(comp("studio-button", "Big red recommend button", "meso", "prop", "cylinder", (0.26, 0.1, 0.26), (-1.55, G + 0.33 + 0.05, T(2.4)), "logo-red",
              contact="resting", start=(-1.55, G + 0.33, T(2.4)), end=(-1.55, G + 0.43, T(2.4)), radius=0.13, importance=0.7,
              features=[{"id": "studio-button.button", "kind": "contour", "notes": "big round red button on a white pedestal"}],
              topo="Big round button: a short cylinder."))
hero("studio-sign", "Studio sign panel", -0.45, 2.5, 0.05, 0.55, 0.8, "whiteboard", y0=G + 0.2, importance=0.5)
# Systems map room: wall map on the back arc (north), 2 desks
ma = 1.5 * math.pi
mx, mz = RC[0] + (RO - 0.01 - WT - 0.04) * math.cos(ma), RC[1] + (RO - 0.01 - WT - 0.04) * math.sin(ma)
C.append(comp("map-panel", "World map panel", "meso", "prop", "box", (0.7, 0.45, 0.05), (mx, G + 0.25 + 0.225, mz), "map",
              rot=[0, -(ma + math.pi / 2), 0], importance=0.75, contact="applied",
              features=[{"id": "map-panel.map", "kind": "decal", "notes": "abstract world map: blue panel with green land blocks"}],
              topo="Map panel on the back arc: a thin box."))
for k, a in enumerate((1.2 * math.pi, 1.8 * math.pi), 1):
    hero(f"map-desk-{k}", f"Systems map desk {k}", RC[0] + 0.6 * math.cos(a), RC[1] + 0.6 * math.sin(a), 0.36, 0.3, 0.26, "timber", raw=True)
# Launch room: screen, 2 chair rows, lectern
hero("launch-screen", "Launch room screen", 1.92, 1.95, 0.06, 0.45, 0.75, "screen", y0=G + 0.25, importance=0.7,
     features=[{"id": "launch-screen.chairs", "kind": "contour", "notes": "two chair rows face this screen"}])
for k, cx in enumerate((1.0, 1.3), 1):
    hero(f"launch-chairs-{k}", f"Launch room chair row {k}", cx, 1.95, 0.2, 0.25, 0.75, "chair-orange", importance=0.5)
hero("launch-lectern", "Launch room lectern", 1.65, 1.6, 0.22, 0.4, 0.22, "timber", importance=0.45)
# AI lab: desk + laptop, shelf, city model
hero("lab-desk", "AI lab desk", 1.17, -0.85, 0.55, 0.3, 0.3, "desk-white")
hero("lab-laptop", "AI lab laptop", 1.17, -0.85, 0.3, 0.04, 0.22, "screen", y0=G + 0.33, level="micro", importance=0.45)
hero("lab-shelf", "AI lab shelf", 1.48, 0.0, 0.15, 0.5, 0.8, "timber")
hero("lab-city-model", "AI lab city model plinth", 1.1, -0.1, 0.36, 0.2, 0.3, "roof-green", importance=0.55)
hero("lab-city-block", "AI lab city model block", 1.08, -0.12, 0.12, 0.14, 0.12, "yellow", y0=G + 0.23, level="micro", importance=0.35)
spec["componentTree"] = C


def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.02, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.02, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    # a little self-light keeps the flat colours readable under the sprite converter's plain rig (as the skeleton)
    m.update({"emissive": color, "emissiveIntensity": {"base": 0.3}})
    m.update(extra)
    if m.get("textureless"):
        for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
            m.pop(field, None)
    return m


def flat(*evidence):
    return {"textureless": {"declared": True, "evidence": list(evidence) + ["analysis/image-analysis.md L5 (AI image samples by eye)"]}}


SPR = "at ~44 px per wu (384 px sprite for 7 wu) this surface is flat colour in the reference and the city (B3 note 06)"
FL = flat("flat pastel floor in the AI image", SPR)
spec["materials"] = [
    material("grass", "Grass", "unknown", "#5a9a3c", ["#538f37"], 0.95, 0.0, "plot", **flat(SPR)),
    material("paving", "Paving", "stone", "#cfc9bf", ["#c6c0b6"], 0.9, 0.0, "entrance path, block footprints with the roof off", **flat(SPR)),
    material("floor-white", "White floor", "stone", "#f4f4f2", ["#ebebe8"], 0.85, 0.0, "lobby, vestibule, glass link", **FL),
    material("floor-workshop", "Workshop floor", "stone", "#2f6f7a", ["#2a6670"], 0.9, 0.0, "Workshop (B3: deep teal)",
             localOverrides=[{"id": "floor-workshop.tone", "kind": "stain", "notes": "one flat teal"}], **FL),
    material("floor-studio", "Studio floor", "stone", "#b8dccb", ["#aed2c1"], 0.9, 0.0, "Recommendation studio (B3: mint)", **FL),
    material("floor-map", "Map room floor", "stone", "#d9d6d3", ["#cfccc9"], 0.9, 0.0, "Systems map room (B3: light grey)", **FL),
    material("floor-launch", "Launch room floor", "stone", "#f6c9a0", ["#ecbf96"], 0.9, 0.0, "Launch room (B3: peach)", **FL),
    material("floor-lab", "AI lab floor", "stone", "#ffe680", ["#f5dc76"], 0.9, 0.0, "AI lab (B3: yellow)", **FL),
    material("wall-light", "Back wall face", "stone", "#ece8e1", ["#e2ded7"], 0.85, 0.0, "map room back arc, column", **flat(SPR)),
    # back walls tinted toward each room's floor (AI image: inner wall faces carry the room colour)
    material("wall-workshop", "Workshop wall", "stone", "#cfe0e3", ["#c5d6d9"], 0.85, 0.0, "Workshop back walls", **flat(SPR)),
    material("wall-studio", "Studio wall", "stone", "#d3ebde", ["#c9e1d4"], 0.85, 0.0, "Recommendation studio back walls", **flat(SPR)),
    material("wall-launch", "Launch room wall", "stone", "#f4dcc5", ["#ead2bb"], 0.85, 0.0, "Launch room back walls", **flat(SPR)),
    material("wall-lab", "AI lab wall", "stone", "#f6edc2", ["#ece3b8"], 0.85, 0.0, "AI lab back walls", **flat(SPR)),
    material("wall-cap", "Wall cap", "stone", "#33302d", ["#2b2826"], 0.9, 0.0, "dark cap on every back wall (B3 note 08)", **flat(SPR)),
    material("yellow", "LEGO yellow", "plastic", "#f2c81c", ["#e8bd12"], 0.45, 0.0, "yellow frames, south block, canopy brick", **flat(SPR)),
    material("glass", "Glass", "glass", "#cfe6ee", ["#c2dbe4"], 0.15, 0.0, "lobby back walls, vestibule, link", opacity={"base": 0.5},
             **flat("light blue glass, see-through in the AI image", SPR)),
    material("glass-door", "Door glass", "glass", "#a9cfdd", ["#9fc5d3"], 0.15, 0.0, "entrance doors (a little darker so they read)",
             opacity={"base": 0.7}, **flat(SPR)),
    material("glass-roofon", "Atrium glass (roof on)", "glass", "#bcd7e6", ["#b2cddc"], 0.2, 0.0, "closed atrium and greenhouse sides", **flat(SPR)),
    material("closed-grey", "Closed block grey", "stone", "#5a5e63", ["#52565b"], 0.85, 0.0, "west wing (no room)", **flat(SPR)),
    material("facade", "Facade", "stone", "#6f7c86", ["#66737d"], 0.8, 0.0, "roof-on wing facades (campus look)", **flat(SPR)),
    material("facade-light", "Light facade", "stone", "#e2ddd5", ["#d8d3cb"], 0.85, 0.0, "roof-on terrace building", **flat(SPR)),
    material("roof-green", "Green roof", "unknown", "#7fae4e", ["#77a548"], 0.95, 0.0, "roofs (campus look), city model plinth", **flat(SPR)),
    material("roof-dark", "Dark roof", "stone", "#2f2e2c", ["#282725"], 0.9, 0.0, "roof-on yellow blocks", **flat(SPR)),
    material("roof-white", "White roof", "stone", "#f2f2f0", ["#e8e8e6"], 0.8, 0.0, "roof-on atrium", **flat(SPR)),
    material("roof-terrace", "Terrace paving", "stone", "#d8c7a8", ["#cfbe9f"], 0.9, 0.0, "roof-on terrace building", **flat(SPR)),
    material("timber", "Timber", "wood", "#c9925a", ["#bf8852"], 0.6, 0.0, "tables, shelves, desks, lectern", **flat("grain below sprite size", SPR)),
    material("desk-white", "White furniture", "plastic", "#fafaf8", ["#f0f0ee"], 0.5, 0.0, "lobby desk, lab desk, button pedestal", **flat(SPR)),
    material("chair-blue", "Blue chairs", "plastic", "#3c78c8", ["#356fbe"], 0.5, 0.0, "workshop chairs", **flat(SPR)),
    material("chair-orange", "Orange chairs", "plastic", "#e8833a", ["#de7930"], 0.5, 0.0, "launch room chair rows", **flat(SPR)),
    material("whiteboard", "Whiteboard", "plastic", "#f7f7f5", ["#ededeb"], 0.2, 0.0, "Workshop board, studio sign", **flat(SPR)),
    material("map", "Map panel", "plastic", "#4f8fc9", ["#5fae5a"], 0.6, 0.0, "abstract world map: blue with green land", **flat(SPR)),
    material("logo-red", "LEGO red", "plastic", "#d6261c", ["#cc1f16"], 0.45, 0.0, "logo sign, studio button", **flat(SPR)),
    material("screen", "Screen", "glass", "#222326", ["#2c2e33"], 0.25, 0.0, "launch screen, laptop", emissive="#3a4a66",
             emissiveIntensity={"base": 0.25}, **flat("dark screen with a soft glow (city life rule: screens)", SPR)),
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
walls = [i for i in ids if "-wall-" in i and not i.endswith("-cap") and not i.startswith("roof-")]
spec["repetitionSystems"] = [
    {"id": "back-walls", "target": "root", "count": len(walls), "elementComponentIds": walls,
     "distribution": "north and west side of every room box, split at door gaps", "notes": "each with a dark cap"},
    {"id": "roof-parts", "target": "root", "count": len([i for i in ids if i.startswith("roof-")]),
     "elementComponentIds": [i for i in ids if i.startswith("roof-")],
     "distribution": "one closed mass + one roof per block", "notes": "hidden together for the roof-off state"},
    {"id": "workshop-chairs", "target": "root", "count": 4, "elementComponentIds": [f"workshop-chair-{i}" for i in range(1, 5)],
     "distribution": "two each side of the table", "notes": ""},
    {"id": "canopy-studs", "target": "canopy", "count": 8, "elementComponentIds": [f"canopy-stud-{i}" for i in range(1, 9)],
     "distribution": "2 x 4 grid on the brick top", "notes": ""},
]
spec["silhouette"] = {"boundingShape": "7 x 7 wu grass plot, campus in the south 5 wu, entrance path on the north; roof off: back walls 0.6 to 1.3 wu, "
                                       "canopy at 1.4 wu, closed west wing; roof on: blocks 0.7 to 1.6 wu",
                      "aspectRatios": ["plot 1 : 1", "height 1.6 : plot 7"], "symmetry": "asymmetric",
                      "dominantCurves": ["round map room ring"], "negativeSpaces": ["round courtyard", "room interiors"],
                      "landmarks": ["central glass lobby", "yellow brick canopy on the north", "round room on the east"]}
spec["coordinateFrame"] = {"front": "-Z north (entrance, path)", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m)"}
floors = [i for i in ids if i.endswith("-floor")]
spec["featureReviewTargets"] = [
    {"id": "block-layout", "name": "Rooms in the campus blocks around a central glass lobby, entrance opens into the lobby", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True, "componentRefs": floors},
    {"id": "back-walls", "name": "Two back walls per room with dark caps and door gaps toward the lobby", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": [i for i in ids if "-wall-" in i and not i.startswith("roof-")]},
    {"id": "canopy", "name": "Giant yellow 2 x 4 brick over the glass doors", "tier": "critical", "passIds": ["structural-pass", "material-pass"],
     "minimumScore": 0.7, "mustPass": True, "componentRefs": ["canopy", "entrance-doors"] + [f"canopy-stud-{i}" for i in range(1, 9)]},
    {"id": "room-props", "name": "Three or four large hero objects per room", "tier": "important", "passIds": ["form-refinement", "material-pass"],
     "minimumScore": 0.6, "mustPass": False,
     "componentRefs": [c["id"] for c in C if c["role"] == "prop"]},
    {"id": "roof-state", "name": "Roof-on state: every block closed, campus look", "tier": "important", "passIds": ["structural-pass", "material-pass"],
     "minimumScore": 0.6, "mustPass": False, "componentRefs": [i for i in ids if i.startswith("roof-")]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["iso south (yaw 45, pitch 30), roof off", "iso north (yaw 225, pitch 30), roof off", "sprite south/west/north/east, roof off and roof on"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 6000, "maxDrawCalls": 400, "textureSize": 256, "fpsTarget": 60})
spec["lightingFromPhoto"] = [
    {"id": "sky", "type": "hemisphere", "role": "key", "intensity": 1.0, "skyColor": "#f4f6f8", "groundColor": "#55663f",
     "evidence": "AI image: even studio light, no cast shadows"},
    {"id": "key", "type": "directional", "role": "key", "intensity": 1.4, "position": [-3, 6, 4], "direction": [0.4, -0.8, -0.5],
     "castsShadow": True, "evidence": "city rules section 3: key from screen upper left, 45 deg up"},
    {"id": "fill", "type": "directional", "role": "fill", "intensity": 0.4, "position": [5, 4, -3], "evidence": "keeps side faces readable"},
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.3, "evidence": "soft reflections on the glass"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 1.0,
     "notes": "review renders keep the flat pastel colours; game sprites use the converter rig"},
    {"id": "contact", "role": "shadow", "notes": "soft contact shadows of the back walls and props on the floors"},
]
spec["entrance"] = {"side": "north", "at": round(bx, 3), "width": ENTRY,
                    "cues": ["giant yellow 2 x 4 brick over glass doors", "vestibule opens straight into the lobby", "path to the doors"]}
spec["states"] = {"roofOn": "all components visible", "roofOff": "hide every component whose id starts with 'roof-'"}
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]), "roof parts", len([i for i in ids if i.startswith("roof-")]),
      "room parts", len([c for c in C if not c["id"].startswith("roof-") and c["role"] in ("prop", "wall", "trim", "floor")]))

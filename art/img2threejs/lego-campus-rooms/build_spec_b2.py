"""ObjectSculptSpec for LEGO HQ Rooms: the LEGO campus with the roofs removed, one room per building block.

Layout authority: the Figma board's block plan (file "Portfolio", page "New", section 02b, card B2, node 503:4),
drawn from ../lego-campus/measure/plan.json. Style authority: the Figma AI reference ref/ai-roof-off-campus-v3.png.
Frame: 1 unit = 1 wu (one tile edge, ~2 m), docs/city-rules.md. +Y up, ground slab top at y = SLAB, the 7 x 7 wu
plot centred on the origin, +X east, +Z south (entrance side). Plan (u, v) is already square to the grid; it is
fitted into the plot with a stretch along v, and its raster stair steps are simplified.

Two states, one model: every component whose id starts with "roof-" is the closed building (roof masses and roof
tops). Hide them and the rooms show from above: floors, knee-high cut walls with dark caps, a few large props.
Child transforms are parent-relative; every component here hangs off the ground slab ("root").
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
     "observations": ["central glass lobby joined to an entrance hall", "yellow 2 x 4 brick canopy over glass doors",
                      "knee-high cut walls with a thick dark top edge", "one pastel floor colour per room",
                      "one or two large props per room", "closed dark block with a green roof on the west"],
     "confidence": 0.8},
    {"id": PLAN, "view": "layout: block outlines of the existing campus model (board card B2, Figma node 503:4)",
     "image": f"{W}/../lego-campus/measure/plan.json", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["atrium in the centre", "north wing with the yellow bar", "south-west and south-east courtyard wings",
                      "round building on the east", "terrace building with light wells on the north-east", "west wing"],
     "confidence": 0.9},
]

SLAB = 0.06          # ground slab; floors sit on it
GROUND = 1.4         # ground storey (city rules)
STOREY = 1.2
CUT = 0.3            # cut wall height with the roof off (knee high: the floor reads from the iso camera)
CAP = 0.05           # dark cap on top of the cut walls
WT = 0.1             # wall thickness
DOOR = 1.0           # door width (city rules section 6)
HALF = 3.5           # half plot
XROT = [-math.pi / 2, 0, 0]

# --- Layout: plan (u, v) -> plot (x, z) ---------------------------------------------------------------
plan = {r["id"]: r for r in json.load(open(f"{W}/../lego-campus/measure/plan.json"))}
BLOCKS = ["b-main-2", "b-main-1", "b-high-1", "b-mid-0", "b-main-0", "b-mid-1", "b-low-0", "b-high-0", "b-top-0"]
us = [p[0] for b in BLOCKS for p in plan[b]["outline"]]
vs = [p[1] for b in BLOCKS for p in plan[b]["outline"]]
CU, CV = (min(us) + max(us)) / 2, (min(vs) + max(vs)) / 2
SU, SV = 6.72 / (max(us) - min(us)), 6.72 / (max(vs) - min(vs))   # 0.14 wu margin to the plot edge


def xz(u, v):
    return ((u - CU) * SU, (v - CV) * SV)


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


def clip(poly, axis, lim, keep_less):
    out = []
    for i, cur in enumerate(poly):
        prev = poly[i - 1]
        cin = cur[axis] <= lim if keep_less else cur[axis] >= lim
        pin = prev[axis] <= lim if keep_less else prev[axis] >= lim
        if cin != pin:
            t = (lim - prev[axis]) / (cur[axis] - prev[axis])
            out.append([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])])
        if cin:
            out.append(list(cur))
    return out


def ring_xz(poly_uv, tol=0.012):
    return [list(xz(u, v)) for u, v in dp(poly_uv, tol)]


def circle(cx, cz, r, n=32):
    return [[cx + r * math.cos(2 * math.pi * i / n), cz + r * math.sin(2 * math.pi * i / n)] for i in range(n)]


def rect(x0, x1, z0, z1):
    return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]


# Entrance hall: the strip between the atrium (v 0.26) and the yellow entrance block (v 0.32), u 0.06-0.13.
# It is cut out of the south-east wing, so the doors lead straight into the lobby (Gustav, 2026-10-15).
HALL_U0, HALL_U1, HALL_V0, HALL_V1 = 0.065, 0.13, 0.255, 0.325
se = clip(plan["b-mid-1"]["outline"], 0, HALL_U1 + 0.005, False)
ROUND_C = xz(0.429, 0.118)
ROUND_RO, ROUND_RI = 0.128 * math.sqrt(SU * SV), 0.040 * math.sqrt(SU * SV)

# key, room (None = closed both states), outline xz, holes xz, roof-on storeys, look
LAYOUT = [
    ("west", None, ring_xz(plan["b-main-2"]["outline"], 0.02), [], 2, "closed"),
    ("workshop", "workshop", ring_xz(plan["b-main-1"]["outline"]), [], 2, "wing"),
    ("workshop-bar", "workshop", ring_xz(plan["b-high-1"]["outline"]), [], 3, "yellow"),
    ("studio", "studio", ring_xz(plan["b-mid-0"]["outline"]), [ring_xz(h) for h in plan["b-mid-0"]["holes"]], 2, "wing"),
    ("map", "map", circle(*ROUND_C, ROUND_RO), [circle(*ROUND_C, ROUND_RI, 24)], 2, "round"),
    ("launch", "launch", ring_xz(se), [ring_xz(h) for h in plan["b-mid-1"]["holes"]], 2, "wing"),
    ("lab", "lab", ring_xz(plan["b-low-0"]["outline"]), [ring_xz(h) for h in plan["b-low-0"]["holes"][1:]], 1, "terrace"),
    ("lobby", "lobby", [list(xz(u, v)) for u, v in [[-0.12, 0.01], [0.18, 0.01], [0.18, 0.26], [-0.13, 0.26]]], [], 3, "glass"),
    ("hall", "lobby", [list(xz(u, v)) for u, v in [[HALL_U0, HALL_V0], [HALL_U1, HALL_V0], [HALL_U1, HALL_V1], [HALL_U0, HALL_V1]]], [], 1, "glass"),
    ("entrance", "entrance", ring_xz(plan["b-top-0"]["outline"]), [], 2, "yellow"),
]
GREENHOUSE = [list(xz(u, v)) for u, v in [[0.33, -0.11], [0.38, -0.11], [0.38, -0.06], [0.33, -0.06]]]
LOBBY = LAYOUT[7][2]
LOBBY_C = (sum(p[0] for p in LOBBY) / 4, sum(p[1] for p in LOBBY) / 4)


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


C = []
C.append(comp("root", "Ground slab (grass plot)", "macro", "base", "box", (2 * HALF, SLAB, 2 * HALF), (0, SLAB / 2, 0), "grass", parent=None,
              importance=0.8, conf=0.9, sockets=[{"id": "ground-top", "localPosition": [0, SLAB / 2, 0], "notes": "top of the plot"}],
              features=[{"id": "root.plot", "kind": "contour", "notes": "square 7 x 7 wu grass plot: carries the sprite bbox in both states"}],
              topo="Flat plot: a box. It sets the converter's bbox, so roof-on and roof-off sprites share one scale."))


# --- Doors: one gap per room on the outline point nearest the lobby centre ----------------------------
def nearest_on_ring(poly, target):
    best = None
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]
        dx, dz = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dz)
        if L < DOOR + 0.2:
            continue
        t = ((target[0] - a[0]) * dx + (target[1] - a[1]) * dz) / (L * L)
        t = min(max(t, (DOOR / 2 + 0.1) / L), 1 - (DOOR / 2 + 0.1) / L)
        p = (a[0] + t * dx, a[1] + t * dz)
        d = math.hypot(p[0] - target[0], p[1] - target[1])
        if best is None or d < best[0]:
            best = (d, i, p)
    return best


DOORS = {}       # key -> list of (edge index, point)
for key, room, poly, holes, _, look in LAYOUT:
    if room in ("lobby", "entrance") or room is None or look == "round":
        continue
    d = nearest_on_ring(poly, LOBBY_C)
    DOORS.setdefault(key, []).append((d[1], d[2]))
# Round map room: door on the ring point facing the lobby
ang = math.atan2(LOBBY_C[1] - ROUND_C[1], LOBBY_C[0] - ROUND_C[0])
DOORS["map-angle"] = ang
# Lobby glass: a gap facing each room door, plus the whole south side over the hall
lobby_gaps = []
for key, ds in DOORS.items():
    if key == "map-angle":
        continue
    for _, p in ds:
        lobby_gaps.append(nearest_on_ring(LOBBY, p))
lobby_gaps.append(nearest_on_ring(LOBBY, (ROUND_C[0] - ROUND_RO, ROUND_C[1])))
DOORS["lobby"] = [(g[1], g[2]) for g in lobby_gaps]
# Entrance: doors in the south face (under the canopy); the north face opens into the hall
ent = LAYOUT[9][2]
ex0, ex1, ez0, ez1 = bounds(ent)
DOORS["entrance"] = [nearest_on_ring(ent, ((ex0 + ex1) / 2, ez1 + 1))[1:]]
hx0, hx1, hz0, hz1 = bounds(LAYOUT[8][2])


def wall_run(key, room, ring, height, material, cap_material, *, gaps=(), is_hole=False, level="meso", skip_edges=()):
    """Straight wall boxes along a ring, split around door gaps; a dark cap box on top of each piece."""
    n = 0
    for i in range(len(ring)):
        if i in skip_edges:
            continue
        a, b = ring[i], ring[(i + 1) % len(ring)]
        dx, dz = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dz)
        if L < 0.05:
            continue
        cuts = []
        for gi, gp in gaps:
            if gi == i:
                t = math.hypot(gp[0] - a[0], gp[1] - a[1]) / L
                cuts.append((t - DOOR / 2 / L, t + DOOR / 2 / L))
        pieces, t0 = [], 0.0
        for c0, c1 in sorted(cuts):
            pieces.append((t0, c0)); t0 = c1
        pieces.append((t0, 1.0))
        for s0, s1 in pieces:
            seg = (s1 - s0) * L
            if seg < 0.08:
                continue
            mx, mz = a[0] + dx * (s0 + s1) / 2, a[1] + dz * (s0 + s1) / 2
            n += 1
            rot = [0, -math.atan2(dz, dx), 0]
            wid = f"{key}-{'hole' if is_hole else 'wall'}-{n}"
            C.append(comp(wid, f"{key} {'courtyard ' if is_hole else ''}wall {n}", level, "wall", "box", (seg + WT, height, WT),
                          (mx, SLAB + height / 2, mz), material, rot=rot, importance=0.6, conf=0.7,
                          topo="Straight wall piece: a box turned to the plan edge."))
            if cap_material:
                C.append(comp(f"{wid}-cap", f"{key} wall {n} cut cap", "micro", "trim", "box", (seg + WT + 0.01, CAP, WT + 0.02),
                              (mx, SLAB + height + CAP / 2, mz), cap_material, rot=rot, importance=0.5, conf=0.7, contact="applied",
                              topo="Dark section cap on the cut wall top: a thin box."))


FLOOR_MAT = {"workshop": "floor-workshop", "studio": "floor-studio", "map": "floor-map", "launch": "floor-launch",
             "lab": "floor-lab", "lobby": "floor-white", "entrance": "floor-white"}
ROOM_NAME = {"workshop": "Workshop", "studio": "Recommendation studio", "map": "Systems map room", "launch": "Launch room",
             "lab": "AI lab", "lobby": "Lobby", "entrance": "Entrance"}
ROOF_TOP = {"wing": "roof-green", "yellow": "roof-dark", "round": "roof-green", "terrace": "roof-terrace", "glass": "roof-white", "closed": "roof-green"}
ROOF_SIDE = {"wing": "facade", "yellow": "yellow", "round": "facade", "terrace": "facade-light", "glass": "glass", "closed": "closed-grey"}

for key, room, poly, holes, storeys, look in LAYOUT:
    H = GROUND + (storeys - 1) * STOREY
    if room is None:
        # Closed west wing: ground storey in both states, upper storey + roof with the roof on
        C.append(extrude(f"{key}-mass", "West wing (no room yet)", "macro", "building", poly, [], SLAB, GROUND, "closed-grey",
                         importance=0.6, features=[{"id": f"{key}-mass.closed", "kind": "contour", "notes": "stays closed with the roof off"}],
                         topo="Closed block: the plan outline extruded one storey."))
        C.append(extrude(f"{key}-top", "West wing green roof (roof off)", "meso", "roof", poly, [], SLAB + GROUND, 0.02, "roof-green", importance=0.4,
                         topo="Green roof on the ground storey: a thin extrude."))
        C.append(extrude(f"roof-{key}-upper", "West wing upper storey", "meso", "roof", poly, [], SLAB + GROUND, STOREY, "closed-grey",
                         importance=0.5, topo="Upper storey (roof on only): the outline extruded one storey."))
        C.append(extrude(f"roof-{key}-top", "West wing roof", "meso", "roof", poly, [], SLAB + H, 0.02, "roof-green", importance=0.4,
                         topo="Roof (roof on only): a thin extrude."))
        continue
    feats = [{"id": f"{key}-floor.tone", "kind": "stain", "notes": f"{ROOM_NAME[room]}: one flat floor colour"}]
    if key == "workshop":
        feats.append({"id": "workshop-floor.cutCaps", "kind": "contour", "notes": "thick dark caps on every cut wall"})
    if key == "lobby":
        feats.append({"id": "lobby-floor.glassWalls", "kind": "contour", "notes": "glass walls with white posts, open to the hall"})
    if key == "studio":
        feats.append({"id": "studio-floor.courtyard", "kind": "hole", "notes": "square grass courtyard"})
    C.append(extrude(f"{key}-floor", f"{ROOM_NAME[room]} floor ({key})", "macro", "floor", poly, holes, SLAB, 0.02, FLOOR_MAT[room],
                     importance=0.85, features=feats, topo="Room floor: the block outline (courtyards as holes), a thin extrude."))
    if look == "glass":
        # Lobby and hall: glass walls 1.2 wu with white posts; no wall between the lobby and the hall
        if key == "lobby":
            south = max(range(4), key=lambda i: LOBBY[i][1] + LOBBY[(i + 1) % 4][1])
            # the hall opens the middle of the south side; the rest of that side stays glass
            gaps = DOORS["lobby"] + [(south, ((hx0 + hx1) / 2, LOBBY[south][1]))]
            wall_run(key, room, LOBBY, 1.2, "glass", None, gaps=gaps)
        else:
            north = min(range(4), key=lambda i: poly[i][1] + poly[(i + 1) % 4][1])
            south = max(range(4), key=lambda i: poly[i][1] + poly[(i + 1) % 4][1])
            wall_run(key, room, poly, 1.2, "glass", None, skip_edges=(north, south))
        for k, (px, pz) in enumerate(poly, 1):
            C.append(comp(f"{key}-post-{k}", f"{key} corner post {k}", "micro", "trim", "box", (0.08, 1.24, 0.08), (px, SLAB + 0.62, pz),
                          "post-white", importance=0.4, topo="White glass-wall post: a box."))
    elif look == "round":
        # Ring wall as an arc with a door gap facing the lobby: one extrude of an annulus sector
        gap = DOOR / ROUND_RO
        a0, a1 = ang + gap / 2, ang + 2 * math.pi - gap / 2
        n = 40
        outer = [[ROUND_C[0] + (ROUND_RO) * math.cos(a0 + (a1 - a0) * i / n), ROUND_C[1] + ROUND_RO * math.sin(a0 + (a1 - a0) * i / n)] for i in range(n + 1)]
        inner = [[ROUND_C[0] + (ROUND_RO - WT) * math.cos(a1 - (a1 - a0) * i / n), ROUND_C[1] + (ROUND_RO - WT) * math.sin(a1 - (a1 - a0) * i / n)] for i in range(n + 1)]
        C.append(extrude("map-wall", "Systems map room ring wall", "meso", "wall", outer + inner, [], SLAB, CUT, "wall-light", importance=0.7,
                         topo="Round cut wall with a door gap: one extruded annulus sector."))
        C.append(extrude("map-wall-cap", "Ring wall cut cap", "micro", "trim", outer + inner, [], SLAB + CUT, CAP, "wall-cap", importance=0.5,
                         contact="applied", topo="Dark cap on the ring wall: the same sector, thin."))
        ci = circle(*ROUND_C, ROUND_RI + WT, 24)
        C.append(extrude("map-courtyard-wall", "Round courtyard wall", "meso", "wall", ci, [circle(*ROUND_C, ROUND_RI, 24)], SLAB, CUT,
                         "wall-light", importance=0.5, topo="Courtyard ring: an extruded annulus."))
    else:
        wall_mat = "yellow" if look == "yellow" else "wall-light"
        skip = ()
        if key == "entrance":
            north = min(range(len(poly)), key=lambda i: poly[i][1] + poly[(i + 1) % len(poly)][1])
            skip = (north,)     # open into the hall
        if key == "workshop-bar":
            # the bar and the north wing are one room: no wall on the shared east side
            skip = (max(range(len(poly)), key=lambda i: poly[i][0] + poly[(i + 1) % len(poly)][0]),)
        if key == "workshop":
            skip = (min(range(len(poly)), key=lambda i: poly[i][0] + poly[(i + 1) % len(poly)][0]),)
        wall_run(key, room, poly, CUT, wall_mat, "wall-cap", gaps=DOORS.get(key, []), skip_edges=skip)
        for hh in holes:
            wall_run(key, room, hh, CUT, "wall-light", "wall-cap", is_hole=True)
    # Roof on: the closed mass over the room, and its roof top
    C.append(extrude(f"roof-{key}-mass", f"{ROOM_NAME[room]} closed block ({key})", "macro", "building", poly, holes, SLAB + 0.02, H - 0.02,
                     ROOF_SIDE[look], importance=0.7, topo="Roof-on state: the block outline extruded to its storeys."))
    C.append(extrude(f"roof-{key}-top", f"{ROOM_NAME[room]} roof ({key})", "meso", "roof", poly, holes, SLAB + H, 0.03, ROOF_TOP[look],
                     importance=0.6, topo="Roof-on state: roof surface, a thin extrude."))

# --- Entrance: glass doors + the giant yellow 2 x 4 brick over them ------------------------------------
_, (dx_, dz_) = DOORS["entrance"][0]
C.append(comp("entrance-doors", "Glass entrance doors", "meso", "door", "box", (DOOR, 1.0, 0.06), (dx_, SLAB + 0.5, dz_), "glass",
              importance=0.7, topo="Glass double door in the gap: a box."))
BW, BD, BH = 1.6, 0.8, 0.32
C.append(comp("canopy", "Giant yellow 2 x 4 brick canopy", "macro", "canopy", "box", (BW, BH, BD), (dx_, SLAB + 1.0 + BH / 2, dz_ - BD / 2 + 0.12),
              "yellow", importance=0.95, conf=0.85,
              features=[{"id": "canopy.studs", "kind": "contour", "notes": "2 x 4 round studs on top (8 cylinders)"}],
              sockets=[{"id": "top", "localPosition": [0, BH / 2, 0], "notes": "stud row"}],
              topo="Toy brick body: a box over the doors."))
for i in range(4):
    for j in range(2):
        sx, sz = dx_ - BW / 2 + (i + 0.5) * BW / 4, dz_ - BD + 0.12 + (j + 0.5) * BD / 2
        y0 = SLAB + 1.0 + BH
        C.append(comp(f"canopy-stud-{i * 2 + j + 1}", f"Canopy stud {i * 2 + j + 1}", "micro", "trim", "cylinder", (0.26, 0.1, 0.26),
                      (sx, y0 + 0.05, sz), "yellow", importance=0.6, start=(sx, y0, sz), end=(sx, y0 + 0.1, sz), radius=0.13,
                      topo="Brick stud: a short cylinder."))


# --- Room props: one or two large objects per room (placed in plan pixels of card B2, 140 px per plan wu) -
def px(x, y):
    return xz((x / 140 - 4.2) / 7, (y / 140 - 1.4) / 7)


def prop(cid, name, at, dims, material, *, yaw=0.0, y=None, features=None, importance=0.6, level="meso"):
    x, z = px(*at)
    yy = SLAB + 0.02 + dims[1] / 2 if y is None else y
    C.append(comp(cid, name, level, "prop", "box", dims, (x, yy, z), material, rot=[0, yaw, 0], importance=importance,
                  features=features, contact="resting", start=(x, yy - dims[1] / 2, z), end=(x, yy + dims[1] / 2, z),
                  topo="Large readable prop: a box."))


# Workshop: whiteboard on the north wall, one table
wx0, wz0 = px(340, 72); wx1, _ = px(545, 72)
C.append(comp("workshop-whiteboard", "Workshop whiteboard", "meso", "prop", "box", (wx1 - wx0, 0.5, 0.05), ((wx0 + wx1) / 2, SLAB + 0.55, wz0 + 0.12),
              "whiteboard", importance=0.8, features=[{"id": "workshop-whiteboard.board", "kind": "contour", "notes": "long white board, dark frame line"}],
              topo="Whiteboard standing on the north wall: a thin box above the cut wall."))
prop("workshop-table", "Workshop table", (450, 135), (1.1, 0.4, 0.55), "timber", importance=0.75)
# Recommendation studio: two shelf blocks
prop("studio-shelf-1", "Studio shelf 1", (300, 372), (0.7, 0.55, 0.25), "timber")
prop("studio-shelf-2", "Studio shelf 2", (540, 625), (0.7, 0.55, 0.25), "timber")
# Systems map room: one map panel on the inner ring face, facing the courtyard
ma = ang + math.pi * 0.85
mx, mz = ROUND_C[0] + (ROUND_RO - WT - 0.06) * math.cos(ma), ROUND_C[1] + (ROUND_RO - WT - 0.06) * math.sin(ma)
C.append(comp("map-panel", "World map panel", "meso", "prop", "box", (0.9, 0.55, 0.05), (mx, SLAB + 0.6, mz), "map",
              rot=[0, -(ma + math.pi / 2), 0], importance=0.75,
              features=[{"id": "map-panel.map", "kind": "decal", "notes": "abstract world map: blue panel with green land blocks"}],
              topo="Map panel on the ring wall: a thin box."))
# Launch room: screen on the east wall, two rows of three chairs
prop("launch-screen", "Launch room screen", (948, 452), (0.06, 0.45, 0.8), "screen", y=SLAB + 0.55,
     features=[{"id": "launch-screen.chairs", "kind": "contour", "notes": "chair rows face this screen"}], importance=0.7)
for r, cx in enumerate((895, 925)):
    for k, cy in enumerate((410, 452, 494)):
        prop(f"launch-chair-{r * 3 + k + 1}", f"Launch room chair {r * 3 + k + 1}", (cx, cy), (0.22, 0.3, 0.22), "timber", level="micro", importance=0.4)
# AI lab: two desks with a monitor each
for i, at in enumerate(((850, 75), (820, 240)), 1):
    prop(f"lab-desk-{i}", f"AI lab desk {i}", at, (0.8, 0.32, 0.4), "timber")
    x, z = px(*at)
    C.append(comp(f"lab-monitor-{i}", f"AI lab monitor {i}", "micro", "prop", "box", (0.3, 0.2, 0.04), (x, SLAB + 0.02 + 0.32 + 0.1, z - 0.1),
                  "screen", importance=0.4, contact="resting", topo="Monitor on the desk: a thin box."))
# Greenhouse in the lab's light well: glass box + pitched roof (both states)
g = GREENHOUSE
gx0, gx1, gz0, gz1 = bounds(g)
C.append(extrude("greenhouse", "Glass greenhouse", "meso", "building", g, [], SLAB, 0.7, "glass", importance=0.6,
                 features=[{"id": "greenhouse.frame", "kind": "contour", "notes": "glass box with a pitched glass roof"}],
                 topo="Greenhouse body: the light-well outline extruded."))
C.append(comp("greenhouse-roof", "Greenhouse pitched roof", "micro", "roof", "box", (gx1 - gx0, 0.06, (gz1 - gz0) * 0.75),
              ((gx0 + gx1) / 2, SLAB + 0.85, (gz0 + gz1) / 2), "glass", rot=[0.5, 0, 0], importance=0.4, topo="Pitched glass roof: a tilted box."))
spec["componentTree"] = C


def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.02, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.02, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    m.update(extra)
    if m.get("textureless"):
        for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
            m.pop(field, None)
    return m


def flat(*evidence):
    return {"textureless": {"declared": True, "evidence": list(evidence) + ["analysis/image-analysis.md L5 (AI image samples by eye)"]}}


SPR = "at ~44 px per wu (384 px sprite for 7 wu) this surface is flat colour in the reference and the city"
FL = flat("flat pastel floor in the AI image", SPR)
spec["materials"] = [
    material("grass", "Grass", "organic", "#6fb34a", ["#66a844"], 0.95, 0.0, "plot", **flat(SPR)),
    material("floor-white", "White floor", "stone", "#f4f4f2", ["#ebebe8"], 0.85, 0.0, "lobby, hall, entrance", **FL),
    material("floor-workshop", "Workshop floor", "stone", "#8fa4dc", ["#879cd4"], 0.9, 0.0, "Workshop",
             localOverrides=[{"id": "floor-workshop.tone", "kind": "stain", "notes": "one flat blue"}], **FL),
    material("floor-studio", "Studio floor", "stone", "#a8e6c4", ["#9fdcba"], 0.9, 0.0, "Recommendation studio", **FL),
    material("floor-map", "Map room floor", "stone", "#f3a98a", ["#eaa081"], 0.9, 0.0, "Systems map room", **FL),
    material("floor-launch", "Launch room floor", "stone", "#f5e9a0", ["#ece097"], 0.9, 0.0, "Launch room", **FL),
    material("floor-lab", "AI lab floor", "stone", "#b9bcc4", ["#b0b3bb"], 0.9, 0.0, "AI lab", **FL),
    material("wall-light", "Cut wall face", "stone", "#e9e4dc", ["#dfdad2"], 0.85, 0.0, "cut walls", **flat(SPR)),
    material("wall-cap", "Cut cap", "stone", "#3b2b26", ["#33251f"], 0.9, 0.0, "dark section cap on every cut wall", **flat(SPR)),
    material("yellow", "LEGO yellow", "plastic", "#f2c81c", ["#e8bd12"], 0.45, 0.0, "yellow frames, entrance block, canopy brick", **flat(SPR)),
    material("glass", "Glass", "glass", "#cfe6ee", ["#c2dbe4"], 0.15, 0.0, "lobby walls, doors, greenhouse", opacity={"base": 0.45},
             **flat("light blue glass, see-through in the AI image", SPR)),
    material("post-white", "White post", "metal", "#f6f6f4", ["#ececea"], 0.5, 0.1, "glass wall posts", **flat(SPR)),
    material("closed-grey", "Closed block grey", "stone", "#4a4c50", ["#424448"], 0.85, 0.0, "west wing", **flat(SPR)),
    material("facade", "Facade", "stone", "#5f6b75", ["#56616b"], 0.8, 0.0, "roof-on wing facades (campus look)", **flat(SPR)),
    material("facade-light", "Light facade", "stone", "#d9d4cc", ["#cfcac2"], 0.85, 0.0, "roof-on terrace building", **flat(SPR)),
    material("roof-green", "Green roof", "organic", "#7fae4e", ["#77a548"], 0.95, 0.0, "roof-on wings (campus look)", **flat(SPR)),
    material("roof-dark", "Dark roof", "stone", "#2f2e2c", ["#282725"], 0.9, 0.0, "roof-on yellow blocks", **flat(SPR)),
    material("roof-white", "White roof", "stone", "#f2f2f0", ["#e8e8e6"], 0.8, 0.0, "roof-on lobby and hall", **flat(SPR)),
    material("roof-terrace", "Terrace paving", "stone", "#d8c7a8", ["#cfbe9f"], 0.9, 0.0, "roof-on terrace building", **flat(SPR)),
    material("timber", "Timber", "wood", "#c9925a", ["#bf8852"], 0.6, 0.0, "tables, shelves, desks, chairs", **flat("grain below sprite size", SPR)),
    material("whiteboard", "Whiteboard", "plastic", "#f7f7f5", ["#ededeb"], 0.2, 0.0, "Workshop board", **flat(SPR)),
    material("map", "Map panel", "plastic", "#4f8fc9", ["#5fae5a"], 0.6, 0.0, "abstract world map: blue with green land", **flat(SPR)),
    material("screen", "Screen", "glass", "#222326", ["#2c2e33"], 0.25, 0.0, "launch screen, monitors", emissive="#3a4a66",
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
spec["repetitionSystems"] = [
    {"id": "cut-walls", "target": "root", "count": len([i for i in ids if "-wall-" in i and not i.endswith("-cap")]),
     "elementComponentIds": [i for i in ids if "-wall-" in i and not i.endswith("-cap")],
     "distribution": "along every room outline, split at door gaps", "notes": "each with a dark cut cap"},
    {"id": "roof-parts", "target": "root", "count": len([i for i in ids if i.startswith("roof-")]),
     "elementComponentIds": [i for i in ids if i.startswith("roof-")],
     "distribution": "one closed mass + one roof top per block", "notes": "hidden together for the roof-off state"},
    {"id": "launch-chairs", "target": "root", "count": 6, "elementComponentIds": [f"launch-chair-{i}" for i in range(1, 7)],
     "distribution": "two rows of three facing the screen", "notes": ""},
    {"id": "canopy-studs", "target": "canopy", "count": 8, "elementComponentIds": [f"canopy-stud-{i}" for i in range(1, 9)],
     "distribution": "2 x 4 grid on the brick top", "notes": ""},
]
spec["silhouette"] = {"boundingShape": "7 x 7 wu grass plot; roof off: knee-high cut walls, 1.2 wu lobby glass, 1.4 wu closed west block, canopy at 1.3 wu; "
                                       "roof on: 1 to 3 storey blocks",
                      "aspectRatios": ["plot 1 : 1", "roof-off height 1.5 : plot 7", "roof-on height 3.8 : plot 7"], "symmetry": "asymmetric",
                      "dominantCurves": ["round map room ring"], "negativeSpaces": ["courtyards", "room interiors over the cut walls"],
                      "landmarks": ["central glass lobby", "yellow canopy on the south", "round room on the east"]}
spec["coordinateFrame"] = {"front": "+Z south (entrance, canopy)", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m)"}
spec["featureReviewTargets"] = [
    {"id": "block-layout", "name": "Campus blocks as rooms around a central glass lobby, entrance hall joined to the lobby", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": [i for i in ids if i.endswith("-floor")]},
    {"id": "cut-walls", "name": "Knee-high cut walls with thick dark caps and door gaps toward the lobby", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": [i for i in ids if "-wall" in i]},
    {"id": "canopy", "name": "Giant yellow 2 x 4 brick over the glass doors", "tier": "critical", "passIds": ["structural-pass", "material-pass"],
     "minimumScore": 0.7, "mustPass": True, "componentRefs": ["canopy", "entrance-doors"] + [f"canopy-stud-{i}" for i in range(1, 9)]},
    {"id": "room-props", "name": "One or two large props per room", "tier": "important", "passIds": ["form-refinement", "material-pass"],
     "minimumScore": 0.6, "mustPass": False,
     "componentRefs": [i for i in ids if i.startswith(("workshop-whiteboard", "workshop-table", "studio-shelf", "map-panel", "launch-", "lab-"))]},
    {"id": "roof-state", "name": "Roof-on state: every block closed, campus look", "tier": "important", "passIds": ["structural-pass", "material-pass"],
     "minimumScore": 0.6, "mustPass": False, "componentRefs": [i for i in ids if i.startswith("roof-")]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["iso south (yaw 45, pitch 30), roof off", "sprite south/west/north/east, roof off and roof on"]
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
    {"id": "contact", "role": "shadow", "notes": "soft contact shadows of the cut walls and props on the floors"},
]
spec["entrance"] = {"side": "south", "at": round(dx_, 3), "width": DOOR,
                    "cues": ["giant yellow 2 x 4 brick over glass doors", "entrance hall straight into the lobby", "path ending at it (city placement)"]}
spec["states"] = {"roofOn": "all components visible", "roofOff": "hide every component whose id starts with 'roof-'"}
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]), "roof parts", len([i for i in ids if i.startswith("roof-")]))

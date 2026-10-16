"""ObjectSculptSpec for LEGO HQ at avatar scale: the real LEGO campus rebuilt at character scale, roof on and roof off.

Layout authority: option B on the Figma board (file ON368BJhWf2SAwqRvlaHVH, page New, section 534:3604), chosen by
Gustav on 2026-10-16: a 14 x 9 site so the green roofs, courtyards, round building and terrace building read as the real
campus. massing_bigsite.py holds the same layout as a voxel study. Storey rules unchanged (section 529:3604).
Style authority: ref/ai-studio-campus.jpg (AI Studio game-like campus). Scale: docs/city-rules.md (avatar 0.9 wu,
door 1.0, ground storey 1.4, upper storey 1.2, parapet 0.15, window 0.5 x 0.6 on a 1 wu bay).

Frame: 1 unit = 1 wu (one tile edge, ~2 m). +Y up, the plot top at y = G, the 14 x 9 plot centred on the origin.
Plan tiles (gx right 0..14, gy down 0..9) map to X = gx - 7 (east) and Z = gy - 4.5 (south). The south (+Z) and east (+X)
sides face the default camera; the main door is on the atrium's south face under the yellow 2 x 4 plate.

States (one model, see lib/city/models/legoHqAvatarStates.ts):
- ids starting "roof-": upper storeys, roofs, parapets, the yellow blocks, the atrium glass above the ground storey.
- the ground storey walls are split: "wall-<side>-..." 0 to 0.35 wu (always shown) and "upper-<side>-..." 0.35 to
  1.4 wu, side N/S/E/W for outside walls (the side the wall faces) and I for walls between rooms.
- "lowcap-<side>-..." dark caps on the cut walls, "topcap-<side>-..." dark caps on walls that stay high.
Roof on: everything except lowcap-/topcap-. Roof off (one sprite view): hide roof-, keep upper-/topcap- only for the
two far sides of that view, show lowcap- for the rest. The avatar walks on the room floors (G).
"""
import copy
import json
import math
import sys

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
AI, PLAN = "ai-studio-campus", "board-plan"
spec["viewEvidence"] = [
    {"id": AI, "view": "primary: AI Studio game-like image of the LEGO campus (style, colour, identity features)",
     "image": f"{W}/ref/ai-studio-campus.jpg", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["green roofs with dark parapets", "round building with a round courtyard", "atrium skylight circle (19 domes)",
                      "yellow bar and yellow block", "perforated terrace building with greenhouse", "minifigure statue on the plaza"],
     "confidence": 0.85},
    {"id": PLAN, "view": "layout + scale target: the approved board massing render (Figma section 529:3604, made by massing.py)",
     "image": f"{W}/ref/board-massing-roof-on.png", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["rooms and doors on whole tiles", "wings 2 storeys, atrium and yellow blocks 3", "main door on the south side"],
     "confidence": 0.95},
]

G = 0.06             # plot slab top
G1, ST = 1.4, 1.2    # ground storey, upper storey
H2, H3 = G1 + ST, G1 + 2 * ST
PAR, CUT, WT, CAP = 0.15, 0.35, 0.12, 0.05
XROT = [-math.pi / 2, 0, 0]


PW, PH = 14.0, 9.0   # plot in tiles (board option B: the bigger site)


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


def bx(cid, name, level, role, x0, x1, y0, y1, z0, z1, material, *, contact="resting", plan=True, **kw):
    """Box from plan tiles (x0..x1 = gx, z0..z1 = gy) or model units (plan=False); y in wu above the plot top."""
    if plan:
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
    """Extrude a plan polygon (model x, z) from y0 (above the plot top) by h."""
    xs = [p[0] for p in poly]; zs = [p[1] for p in poly]
    cx, cz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    C.append(comp(cid, name, level, role, "extrude", (max(xs) - min(xs), h, max(zs) - min(zs)), (0, G + y0, 0), material, rot=XROT,
                  profile={"points": prof(poly), "depth": round(h, 4), "holes": [prof(hh) for hh in holes]},
                  start=(cx, G + y0, cz), end=(cx, G + y0 + h, cz), **kw))


def circle(cx, cz, r, n=40, a0=0.0, a1=2 * math.pi):
    return [[cx + r * math.cos(a0 + (a1 - a0) * i / n), cz + r * math.sin(a0 + (a1 - a0) * i / n)] for i in range(n + (0 if a1 - a0 >= 2 * math.pi - 1e-9 else 1))]


def sector(cx, cz, r0, r1, a0, a1, n=12):
    outer = [[cx + r1 * math.cos(a0 + (a1 - a0) * i / n), cz + r1 * math.sin(a0 + (a1 - a0) * i / n)] for i in range(n + 1)]
    inner = [[cx + r0 * math.cos(a1 - (a1 - a0) * i / n), cz + r0 * math.sin(a1 - (a1 - a0) * i / n)] for i in range(n + 1)]
    return outer + inner


# ---------------------------------------------------------------------------------------------------------------
# Plot, plaza, landscape
C.append(comp("root", "Plot (grass)", "macro", "base", "box", (PW, G, PH), (0, G / 2, 0), "grass", parent=None, importance=0.8, conf=0.95,
              sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "top of the plot"}],
              features=[{"id": "root.plot", "kind": "contour", "notes": "14 x 9 wu plot: sets the sprite bbox in both states"}],
              topo="Flat plot: a box. It fixes the converter's bbox, so roof-on and roof-off sprites share one scale."))
bx("front-path", "Front path", "meso", "ground", 0, PW, 0, 0.01, 8.25, 8.75, "path", contact="flush-mount", importance=0.5,
   topo="Light path along the front of the plot: a thin box.")
bx("side-path", "West path", "meso", "ground", 0.1, 0.6, 0, 0.01, 4.6, 8.25, "path", contact="flush-mount", importance=0.4)
bx("plaza", "Checkerboard plaza", "macro", "ground", 5.0, 9.0, 0, 0.012, 7.0, 9.0, "check-light", contact="flush-mount", importance=0.8,
   features=[{"id": "plaza.checker", "kind": "contour", "notes": "grey and white checkerboard paving in front of the atrium"}],
   topo="Plaza base: a thin box; the dark squares sit on it.")
chk = 0
for i in range(10):
    for j in range(5):
        if (i + j) % 2:
            continue
        chk += 1
        x0, z0 = 5.0 + 0.4 * i, 7.0 + 0.4 * j
        bx(f"plaza-check-{chk}", f"Plaza dark square {chk}", "micro", "ground", x0, x0 + 0.4, 0.012, 0.016, z0, z0 + 0.4, "check-dark",
           contact="flush-mount", importance=0.25, topo="Dark paving square: a thin box.")

# Minifigure statue on the plaza
MX, MZ = 5.5, 7.55
bx("minifig-leg-w", "Minifigure west leg", "meso", "statue", MX - 0.24, MX - 0.02, 0, 0.42, MZ - 0.13, MZ + 0.13, "mf-blue", importance=0.6)
bx("minifig-leg-e", "Minifigure east leg", "meso", "statue", MX + 0.02, MX + 0.24, 0, 0.42, MZ - 0.13, MZ + 0.13, "mf-blue", importance=0.6)
bx("minifig-hips", "Minifigure hips", "meso", "statue", MX - 0.25, MX + 0.25, 0.42, 0.5, MZ - 0.13, MZ + 0.13, "mf-blue", importance=0.5)
bx("minifig-torso", "Minifigure torso", "macro", "statue", MX - 0.28, MX + 0.28, 0.5, 0.92, MZ - 0.14, MZ + 0.14, "mf-red", importance=0.85,
   features=[{"id": "minifig-torso.figure", "kind": "contour", "notes": "giant minifigure: blue legs, red torso, yellow head"}],
   topo="Torso block: a box (the trapezoid is below sprite size).")
for s, gx in (("w", MX - 0.36), ("e", MX + 0.36)):
    bx(f"minifig-arm-{s}", f"Minifigure arm {s}", "meso", "statue", gx - 0.08, gx + 0.08, 0.58, 0.88, MZ - 0.08, MZ + 0.08, "mf-red", importance=0.5)
    cyl(f"minifig-hand-{s}", f"Minifigure hand {s}", "micro", "statue", gx, MZ, 0.5, 0.1, 0.07, "mf-yellow", importance=0.4)
cyl("minifig-neck", "Minifigure neck", "micro", "statue", MX, MZ, 0.92, 0.04, 0.09, "mf-yellow", importance=0.3)
cyl("minifig-head", "Minifigure head", "meso", "statue", MX, MZ, 0.96, 0.26, 0.15, "mf-yellow", importance=0.7)
cyl("minifig-stud", "Minifigure head stud", "micro", "statue", MX, MZ, 1.22, 0.06, 0.08, "mf-yellow", importance=0.3)
cyl("minifig-plinth", "Statue plinth", "meso", "statue", MX, MZ, 0, 0.04, 0.42, "paving-light", importance=0.4)


def tree(cid, gx, gy, s=1.0, y0=0.0):
    cyl(f"{cid}-trunk", f"Tree trunk ({cid})", "micro", "tree", gx, gy, y0, 0.32 * s, 0.05 * s, "trunk", importance=0.3)
    bx(f"{cid}-crown", f"Tree crown ({cid})", "meso", "tree", gx - 0.27 * s, gx + 0.27 * s, y0 + 0.3 * s, y0 + 0.85 * s, gy - 0.27 * s, gy + 0.27 * s,
       "tree", importance=0.45, topo="Blocky tree crown (AI image style): a box.")


for k, (gx, gy) in enumerate(((8.5, 7.5), (7.5, 8.5)), 1):     # round planters with a tree on the plaza
    cyl(f"planter-{k}", f"Round planter {k}", "meso", "prop", gx, gy, 0, 0.14, 0.33, "planter", importance=0.5)
    cyl(f"planter-{k}-soil", f"Planter {k} soil", "micro", "prop", gx, gy, 0.14, 0.01, 0.27, "court", importance=0.2)
    tree(f"planter-{k}-tree", gx, gy, 0.8, 0.14)
for k, (gx, gy) in enumerate(((0.35, 0.35), (0.4, 4.3), (13.5, 0.5), (13.5, 7.9)), 1):
    tree(f"garden-tree-{k}", gx, gy, 0.75)

# ---------------------------------------------------------------------------------------------------------------
# Rooms (board option B plan, 14 x 9) and the ground storey walls
ROOMS = {   # key: (name, gx0, gy0, gx1, gy1, floor material, low outside wall material, upper outside wall material)
    "workshop": ("Workshop", 4, 0, 8, 3, "floor-workshop", "facade", "facade"),
    "ailab": ("AI lab", 8, 0, 12, 3, "floor-ai", "facade", "facade"),
    "lobby": ("Lobby", 5, 3, 8, 7, "floor-lobby", "glass-atrium", "glass-atrium"),
    "studio": ("Recommendation studio", 1, 5, 5, 8, "floor-studio", "frame-dark", "glass-dark"),
    "launch": ("Launch room", 8, 3, 12, 7, "floor-launch", "brick", "brick"),
}
DOORS = {   # (axis, at, centre): 'h' = wall along x at gy = at; 'v' = wall along z at gx = at. Centres on tile centres (walk map)
    ("h", 7, 6.5): 1.0,   # main door (south, under the plate)
    ("h", 3, 6.5): 0.8,   # lobby - Workshop
    ("v", 5, 5.5): 0.8,   # lobby - studio
    ("v", 8, 4.5): 0.8,   # lobby - launch room
    ("v", 8, 1.5): 0.8,   # Workshop - AI lab
    ("v", 4, 2.5): 0.8,   # Workshop - map room
}
cell = {}
for key, (_, x0, y0, x1, y1, *_r) in ROOMS.items():
    for gx in range(x0, x1):
        for gy in range(y0, y1):
            cell[(gx, gy)] = key
for key, (name, x0, y0, x1, y1, fmat, _lo, _up) in ROOMS.items():
    bx(f"{key}-floor", f"{name} floor", "macro", "floor", x0, x1, 0, 0.02, y0, y1, fmat, contact="flush-mount", importance=0.85,
       features=[{"id": f"{key}-floor.tone", "kind": "stain", "notes": f"{name}: one flat floor colour (board plan)"}],
       topo="Room floor: one flat box the avatar walks on.")

edges = {}
for (gx, gy), key in cell.items():
    for ax, at, a, out, side in (("h", gy, gx, (gx, gy - 1), "N"), ("h", gy + 1, gx, (gx, gy + 1), "S"),
                                 ("v", gx, gy, (gx - 1, gy), "W"), ("v", gx + 1, gy, (gx + 1, gy), "E")):
        other = cell.get(out)
        if other == key:
            continue
        sd = side if other is None else "I"
        rooms_ = (key,) if other is None else tuple(sorted((key, other)))
        edges[(ax, at, a)] = (sd, rooms_, key)
runs = []
for (ax, at, a), (sd, rooms_, key) in sorted(edges.items()):
    if runs and runs[-1][0] == ax and runs[-1][1] == at and runs[-1][3] == a and runs[-1][4] == sd and runs[-1][5] == rooms_:
        runs[-1][3] = a + 1
    else:
        runs.append([ax, at, a, a + 1, sd, rooms_, key])
n_wall = {"N": 0, "S": 0, "E": 0, "W": 0, "I": 0}
win_ids, wall_ids = [], []


def windows_on(prefix, ax, at_model, p0, p1, out, y_lo, y_hi, level_tag):
    """Narrow windows, two per tile (0.3 x storey band), every fifth one a warm wood panel (real facade rhythm)."""
    n = 0
    t = math.floor(p0 * 2) / 2
    while t < p1 - 0.05:
        c = t + 0.25
        t += 0.5
        if not (p0 + 0.18 <= c <= p1 - 0.18):
            continue
        n += 1
        wid = f"{prefix}-win-{n}"
        mat = "panel-wood" if (int(c * 2) % 5) == 2 else "window"
        # surface pass, north wing first: a light sill under each window and a dark reveal around it
        north = (ax == "h" and X(4) - 0.1 <= c <= X(12.7) and at_model <= Z(3.05)) or (ax == "v" and c <= Z(3.05) and X(4) - 0.2 <= at_model <= X(12.7))
        if north and mat == "window":
            o = 0.045 * out
            if ax == "h":
                bx(f"{wid}-sill", f"Window sill {level_tag}.{n}", "micro", "trim", c - 0.19, c + 0.19, y_lo - 0.05, y_lo, min(at_model, at_model + o),
                   max(at_model, at_model + o), "frame-light", plan=False, contact="applied", importance=0.25, topo="Window sill: a thin box.")
                bx(f"{wid}-reveal", f"Window reveal {level_tag}.{n}", "micro", "trim", c - 0.18, c + 0.18, y_lo - 0.02, y_hi + 0.03,
                   min(at_model, at_model + 0.015 * out), max(at_model, at_model + 0.015 * out), "frame-dark", plan=False, contact="applied",
                   importance=0.2, topo="Dark window reveal behind the pane: a thin box.")
            else:
                bx(f"{wid}-sill", f"Window sill {level_tag}.{n}", "micro", "trim", min(at_model, at_model + o), max(at_model, at_model + o),
                   y_lo - 0.05, y_lo, c - 0.19, c + 0.19, "frame-light", plan=False, contact="applied", importance=0.25, topo="Window sill: a thin box.")
                bx(f"{wid}-reveal", f"Window reveal {level_tag}.{n}", "micro", "trim", min(at_model, at_model + 0.015 * out),
                   max(at_model, at_model + 0.015 * out), y_lo - 0.02, y_hi + 0.03, c - 0.18, c + 0.18, "frame-dark", plan=False, contact="applied",
                   importance=0.2, topo="Dark window reveal behind the pane: a thin box.")
        if ax == "h":
            bx(wid, f"Window {level_tag}.{n}", "micro", "window", c - 0.15, c + 0.15, y_lo, y_hi,
               min(at_model, at_model + 0.03 * out), max(at_model, at_model + 0.03 * out), mat, plan=False, contact="applied", importance=0.3,
               topo="Narrow window on the facade: a thin box.")
        else:
            bx(wid, f"Window {level_tag}.{n}", "micro", "window", min(at_model, at_model + 0.03 * out), max(at_model, at_model + 0.03 * out),
               y_lo, y_hi, c - 0.15, c + 0.15, mat, plan=False, contact="applied", importance=0.3, topo="Narrow window on the facade: a thin box.")
        win_ids.append(wid)


for ax, at, a0, a1, sd, rooms_, key in runs:
    gaps = sorted((c - DOORS[(ax, at, c)] / 2, c + DOORS[(ax, at, c)] / 2, c) for (dax, dat, c) in DOORS if dax == ax and dat == at and a0 < c < a1)
    pieces, s = [], a0
    for g0, g1, _c in gaps:
        pieces.append((s, g0)); s = g1
    pieces.append((s, a1))
    lo_mat = "wall-light" if sd == "I" else ROOMS[key][6]
    up_mat = "wall-light" if sd == "I" else ROOMS[key][7]
    for p0, p1 in pieces:
        if p1 - p0 < 0.05:
            continue
        n_wall[sd] += 1
        tag = f"{sd}-{n_wall[sd]}"
        if ax == "h":
            off = 0.0 if sd == "I" else (WT / 2 if sd == "N" else -WT / 2)
            zc = Z(at) + off
            xr, zr = (X(p0), X(p1)), (zc - WT / 2, zc + WT / 2)
        else:
            off = 0.0 if sd == "I" else (WT / 2 if sd == "W" else -WT / 2)
            xc = X(at) + off
            xr, zr = (xc - WT / 2, xc + WT / 2), (Z(p0), Z(p1))
        what = "between rooms" if sd == "I" else f"{sd} outside"
        bx(f"wall-{tag}", f"Wall {tag} low part ({what})", "meso", "wall", xr[0], xr[1], 0, CUT - CAP, zr[0], zr[1], lo_mat, plan=False,
           contact="flush-mount", importance=0.6, topo="Ground storey wall, low part (always shown): a box.")
        bx(f"lowcap-{tag}", f"Wall {tag} low cap", "micro", "trim", xr[0], xr[1], CUT - CAP, CUT, zr[0], zr[1], "wall-cap", plan=False,
           contact="applied", importance=0.5, topo="Dark cap on the cut wall (roof off only): a thin box.")
        bx(f"upper-{tag}", f"Wall {tag} upper part ({what})", "meso", "wall", xr[0], xr[1], CUT, G1 - CAP, zr[0], zr[1], up_mat, plan=False,
           contact="flush-mount", importance=0.6, topo="Ground storey wall, upper part: hidden when cut.")
        bx(f"topcap-{tag}", f"Wall {tag} top cap", "micro", "trim", xr[0], xr[1], G1 - CAP, G1, zr[0], zr[1],
           "wall-cap" if sd != "I" else "wall-light", plan=False, contact="applied", importance=0.4,
           topo="Dark cap on a wall that stays high (roof off only): a thin box.")
        wall_ids.append(f"wall-{tag}")
        if sd != "I" and up_mat == "facade":
            out = {"N": -1, "S": 1, "W": -1, "E": 1}[sd]
            face = (zr[1] if out > 0 else zr[0]) if ax == "h" else (xr[1] if out > 0 else xr[0])
            lo, hi = (X(p0), X(p1)) if ax == "h" else (Z(p0), Z(p1))
            windows_on(f"upper-{tag}", ax, face, lo, hi, out, 0.4, 1.15, tag)

# Main door: glass leaves in the 1.0 wu gap, dark frame posts, header (part of the south upper wall)
DX0, DX1, DZ = X(6.0), X(7.0), Z(7) - WT / 2
for s, (a0, a1) in (("left", (DX0, DX0 + 0.5)), ("right", (DX1 - 0.5, DX1))):
    bx(f"door-leaf-{s}", f"Main door leaf {s}", "meso", "door", a0 + 0.01, a1 - 0.01, 0, 1.0, DZ - 0.03, DZ + 0.03, "glass-door", plan=False,
       contact="flush-mount", importance=0.7, channels={"translate": True, "rotate": False, "scale": False, "bend": False, "twist": False,
                                                        "detach": False, "visibility": True, "materialState": True},
       anim_role="slide", topo="Sliding glass door leaf: a thin box.")
for s, xx in (("w", DX0), ("e", DX1)):
    bx(f"wall-door-post-{s}", f"Door post {s}", "meso", "trim", xx - 0.04, xx + 0.04, 0, CUT, DZ - WT / 2 - 0.01, DZ + WT / 2 + 0.01, "frame-dark",
       plan=False, contact="flush-mount", importance=0.5)
    bx(f"upper-S-door-post-{s}", f"Door post {s} upper", "meso", "trim", xx - 0.04, xx + 0.04, CUT, 1.08, DZ - WT / 2 - 0.01, DZ + WT / 2 + 0.01,
       "frame-dark", plan=False, contact="flush-mount", importance=0.5)
bx("upper-S-door-header", "Door header", "meso", "trim", DX0 - 0.04, DX1 + 0.04, 1.0, 1.08, DZ - WT / 2 - 0.01, DZ + WT / 2 + 0.01, "frame-dark",
   plan=False, contact="flush-mount", importance=0.5)
bx("upper-S-door-glass", "Glass over the door", "meso", "wall", DX0, DX1, 1.08, G1 - CAP, DZ - WT / 2, DZ + WT / 2, "glass-atrium", plan=False,
   contact="flush-mount", importance=0.4)
bx("topcap-S-door", "Door top cap", "micro", "trim", DX0, DX1, G1 - CAP, G1, DZ - WT / 2, DZ + WT / 2, "wall-cap", plan=False, contact="applied")

# Yellow 2 x 4 plate canopy over the main door (always shown: it marks the entrance)
PX0, PX1, PZ0, PZ1, PY = 5.5, 7.5, 6.62, 7.62, 1.22
bx("canopy", "Yellow 2 x 4 plate canopy", "macro", "canopy", PX0, PX1, PY, PY + 0.2, PZ0, PZ1, "yellow", importance=0.95, conf=0.85,
   features=[{"id": "canopy.studs", "kind": "contour", "notes": "2 x 4 round studs on top (8 cylinders)"}],
   sockets=[{"id": "top", "localPosition": [0, 0.1, 0], "notes": "stud row"}], topo="Toy plate: a box over the doors.")
for i in range(4):
    for j in range(2):
        cyl(f"canopy-stud-{i * 2 + j + 1}", f"Canopy stud {i * 2 + j + 1}", "micro", "trim", PX0 + 0.25 + 0.5 * i, PZ0 + 0.25 + 0.5 * j, PY + 0.2, 0.09,
            0.15, "yellow", importance=0.6, topo="Plate stud: a short cylinder.")

# ---------------------------------------------------------------------------------------------------------------
# Round building (Systems map room): centre (2.4, 2.5), ring 0.55..1.72, brick plinth wider than the ring. The avatar walks
# the 8 tiles around the courtyard tile (2, 2).
RCX, RCZ, RO, RI = X(2.4), Z(2.5), 1.72, 0.55
ext("map-floor", "Systems map room floor", "macro", "floor", circle(RCX, RCZ, RO - 0.02, 48), [circle(RCX, RCZ, RI + 0.04, 28)], 0, 0.02, "floor-map",
    importance=0.85, features=[{"id": "map-floor.tone", "kind": "stain", "notes": "Systems map room: one flat peach floor"}],
    topo="Room floor: the ring, a thin extrude.")
ext("map-court", "Round courtyard lawn", "meso", "ground", circle(RCX, RCZ, RI, 28), [], 0, 0.03, "court", importance=0.6,
    topo="Courtyard lawn: a disc.")
ext("map-plinth", "Brick plinth ring", "meso", "trim", circle(RCX, RCZ, RO + 0.12, 48), [circle(RCX, RCZ, RO, 48)], 0, 0.45, "brick", importance=0.6,
    features=[{"id": "map-plinth.brick", "kind": "contour", "notes": "brick ring at the foot of the round building"}],
    topo="Brick plinth: an extruded ring.")


def ang(px, pz):
    return math.atan2(pz - 2.5, px - 2.4) % (2 * math.pi)


DOOR_A = {ang(4.0, 2.5): 0.8 / RO}       # toward the Workshop door
QUAD = {"E": (-math.pi / 4, math.pi / 4), "S": (math.pi / 4, 3 * math.pi / 4), "W": (3 * math.pi / 4, 5 * math.pi / 4), "N": (5 * math.pi / 4, 7 * math.pi / 4)}
for sd, (a0, a1) in QUAD.items():
    spans, s = [], a0
    for ca, w in sorted(DOOR_A.items()):
        for cc in (ca, ca - 2 * math.pi, ca + 2 * math.pi):
            if a0 < cc < a1:
                spans.append((s, cc - w / 2)); s = cc + w / 2
    spans.append((s, a1))
    for k, (s0, s1) in enumerate(spans, 1):
        if s1 - s0 < 0.02:
            continue
        tag = f"{sd}-ring{k}"
        poly = sector(RCX, RCZ, RO - WT, RO, s0, s1, 16)
        ext(f"wall-{tag}", f"Round wall {tag} low", "meso", "wall", poly, [], 0, CUT - CAP, "brick", importance=0.6,
            topo="Round wall, low part: an extruded annulus sector.")
        ext(f"lowcap-{tag}", f"Round wall {tag} low cap", "micro", "trim", poly, [], CUT - CAP, CAP, "wall-cap", contact="applied")
        ext(f"upper-{tag}", f"Round wall {tag} upper", "meso", "wall", poly, [], CUT, G1 - CAP - CUT, "glass-round", importance=0.6,
            features=[{"id": f"upper-{tag}.bands", "kind": "linework", "notes": "dark glass band"}] if k == 1 else None,
            topo="Round wall, upper part: an extruded annulus sector.")
        ext(f"topcap-{tag}", f"Round wall {tag} top cap", "micro", "trim", poly, [], G1 - CAP, CAP, "wall-cap", contact="applied")
        wall_ids.append(f"wall-{tag}")
ext("wall-I-court", "Courtyard glass ring low", "meso", "wall", circle(RCX, RCZ, RI + 0.06, 28), [circle(RCX, RCZ, RI, 28)], 0, CUT - CAP,
    "glass-light", importance=0.5)
ext("lowcap-I-court", "Courtyard ring low cap", "micro", "trim", circle(RCX, RCZ, RI + 0.06, 28), [circle(RCX, RCZ, RI, 28)], CUT - CAP, CAP, "wall-cap")
ext("upper-I-court", "Courtyard glass ring upper", "meso", "wall", circle(RCX, RCZ, RI + 0.06, 28), [circle(RCX, RCZ, RI, 28)], CUT, G1 - CUT,
    "glass-light", importance=0.4)

# East end block (no room): a low base always, the rest is roof-on only
bx("eastend-base", "East end block base", "meso", "building", 12.4, 14.0, 0, CUT, 2.4, 7.4, "facade", importance=0.5,
   topo="No room: a low base so the block never hides the launch room.")

# ---------------------------------------------------------------------------------------------------------------
# Upper storeys and roofs ("roof-"): hidden together when the avatar is inside


def parapet_ring(cid, outline, y, mat="parapet"):
    xs = [p[0] for p in outline]; zs = [p[1] for p in outline]
    inner = [[x + (WT if x == min(xs) else -WT), z + (WT if z == min(zs) else -WT)] for x, z in outline]
    ext(f"{cid}-parapet", f"Parapet {cid}", "micro", "trim", outline, [inner], y, PAR, mat, importance=0.5,
        topo="Dark parapet ring on the roof edge: an extruded rectangle ring.")


def rect(x0, z0, x1, z1):
    return [[X(x0), Z(z0)], [X(x1), Z(z0)], [X(x1), Z(z1)], [X(x0), Z(z1)]]


def block(cid, name, x0, z0, x1, z1, y0, y1, side_mat, roof_mat="roof-green", courts=(), par="parapet", windows=(), feats=None, imp=0.8):
    """Upper storeys: a rectangle extruded from y0 to y1 with courtyard light wells cut through (holes), green roof, parapets."""
    holes = [rect(*c) for c in courts]
    ext(f"roof-{cid}-mass", f"{name} upper storeys", "macro", "building", rect(x0, z0, x1, z1), holes, y0, y1 - y0 - 0.06, side_mat, importance=imp,
        features=feats, topo="Upper storeys: an extruded rectangle with courtyard holes, roof on only.")
    ext(f"roof-{cid}-top", f"{name} roof", "meso", "roof", rect(x0, z0, x1, z1), holes, y1 - 0.06, 0.06, roof_mat, importance=0.7,
        features=[{"id": f"roof-{cid}-top.parapet", "kind": "contour", "notes": "flat roof inside a dark parapet"}], topo="Flat roof: a thin extrude.")
    parapet_ring(f"roof-{cid}", rect(x0, z0, x1, z1), y1, par)
    for k, c in enumerate(courts, 1):
        bx(f"roof-{cid}-court-{k}", f"{name} courtyard {k} floor", "micro", "roof", c[0], c[2], y0, y0 + 0.03, c[1], c[3], "court", importance=0.5,
           features=[{"id": f"roof-{cid}-court-{k}.well", "kind": "contour", "notes": "square courtyard light well in the green roof"}])
        parapet_ring(f"roof-{cid}-court-{k}", rect(c[0] - WT, c[1] - WT, c[2] + WT, c[3] + WT), y1, par)
        if cid == "north":   # surface pass, north wing first: windows on the courtyard walls seen from above (north and west faces)
            windows_on(f"roof-{cid}-court-{k}-n", "h", Z(c[1]), X(c[0]), X(c[2]), 1, y0 + 0.25, y0 + 1.0, f"{cid}-court{k}n")
            windows_on(f"roof-{cid}-court-{k}-w", "v", X(c[0]), Z(c[1]), Z(c[3]), 1, y0 + 0.25, y0 + 1.0, f"{cid}-court{k}w")
    for sd in windows:      # narrow windows per storey on the named outer faces
        for st in range(int(round((y1 - y0) / ST))):
            yb = y0 + st * ST
            if sd in ("N", "S"):
                windows_on(f"roof-{cid}-{sd}{st}", "h", Z(z0) if sd == "N" else Z(z1), X(x0), X(x1), -1 if sd == "N" else 1, yb + 0.25, yb + 1.0,
                           f"{cid}-{sd}{st}")
            else:
                windows_on(f"roof-{cid}-{sd}{st}", "v", X(x0) if sd == "W" else X(x1), Z(z0), Z(z1), -1 if sd == "W" else 1, yb + 0.25, yb + 1.0,
                           f"{cid}-{sd}{st}")


block("north", "North wing (Workshop, AI lab)", 4.0, 0.0, 12.6, 3.0, G1, H2, "facade", courts=((4.8, 0.6, 6.2, 2.2), (9.8, 0.6, 11.2, 2.2)),
      windows=("N", "W"), feats=[{"id": "roof-north-upper.windows", "kind": "contour", "notes": "narrow windows with wood panels"}])
block("east", "East wing (launch room)", 8.0, 3.0, 12.6, 7.0, G1, H2, "facade", courts=((9.4, 3.6, 10.8, 5.0),), windows=())
block("eastend", "East end block", 12.4, 2.4, 14.0, 7.4, CUT, H2, "facade", courts=((12.9, 3.2, 13.6, 4.4),), windows=("E", "S", "N"))
# yellow bar on the north wing; yellow block with a red roof cantilevered over the plaza; brick under it
for cid, name, x0, z0, x1, z1, roof in (("yellow-bar", "Yellow bar", 6.8, 0.2, 9.2, 1.9, "roof-green"),
                                         ("yellow-block", "Yellow block", 8.6, 5.6, 11.2, 8.2, "terracotta")):
    block(cid, name, x0, z0, x1, z1, H2 - 0.1, H3, "yellow", roof_mat=roof, par="yellow" if roof == "terracotta" else "parapet", imp=0.9,
          feats=[{"id": f"roof-{cid}.frame", "kind": "contour", "notes": "yellow frame box with a dark glass band"}])
    bx(f"roof-{cid}-band-s", f"{name} glass band south", "meso", "window", x0 + 0.12, x1 - 0.12, H2 + 0.2, H3 - 0.3, z1, z1 + 0.02, "window",
       contact="applied", importance=0.6)
    bx(f"roof-{cid}-band-e", f"{name} glass band east", "meso", "window", x1, x1 + 0.02, H2 + 0.2, H3 - 0.3, z0 + 0.12, z1 - 0.12, "window",
       contact="applied", importance=0.6)
    n = int((x1 - x0) / 0.4)
    for i in range(1, n):
        xx = x0 + i * (x1 - x0) / n
        bx(f"roof-{cid}-mullion-{i}", f"{name} mullion {i}", "micro", "trim", xx - 0.03, xx + 0.03, H2 + 0.2, H3 - 0.3, z1, z1 + 0.03, "yellow",
           contact="applied", importance=0.3)
for k, (gx, gy, w, d, h) in enumerate(((11.6, 0.35, 0.6, 0.4, 0.35), (9.3, 2.35, 0.5, 0.4, 0.3), (4.25, 2.4, 0.45, 0.35, 0.28)), 1):
    bx(f"roof-north-unit-{k}", f"North roof plant unit {k}", "micro", "roof", gx, gx + w, H2, H2 + h, gy, gy + d, "frame-light", importance=0.4,
       topo="Rooftop plant unit: a box.")
    cyl(f"roof-north-unit-{k}-fan", f"Plant unit {k} fan", "micro", "trim", gx + w / 2, gy + d / 2, H2 + h, 0.02, min(w, d) * 0.35, "parapet",
        importance=0.2)
for k, (gx, gy) in enumerate(((6.5, 2.55), (7.6, 2.55), (11.9, 2.4), (4.45, 0.35), (8.6, 2.55)), 1):
    cyl(f"roof-north-skylight-{k}", f"North roof skylight {k}", "micro", "trim", gx, gy, H2, 0.06, 0.13, "dome", importance=0.3,
        topo="Small round roof skylight: a short cylinder.")
bx("roof-yellow-block-soffit", "Yellow block soffit over the plaza", "micro", "trim", 8.6, 11.2, H2 - 0.1, H2, 7.0, 8.2, "yellow", importance=0.5)
cyl("roof-yellow-bar-skylight", "Yellow bar roof skylight", "micro", "trim", 8.0, 1.05, H3, 0.05, 0.12, "dome", importance=0.3)

# terrace building (studio): ground storey set back (dark glass walls), perforated white upper storey overhanging, roof terrace
ext("roof-terrace-mass", "Terrace building upper storey", "macro", "building", rect(0.5, 4.9, 5.0, 8.1), [rect(2.2, 5.9, 3.4, 7.1)], G1, ST - 0.06,
    "facade-perf", importance=0.85, features=[{"id": "facade-perf.dots", "kind": "linework", "notes": "white panels with dark round perforations"}],
    topo="Upper storey: an extruded rectangle with the courtyard hole, roof on only.")
ext("roof-terrace-top", "Terrace building roof terrace", "meso", "roof", rect(0.5, 4.9, 5.0, 8.1), [rect(2.2, 5.9, 3.4, 7.1)], H2 - 0.06, 0.06,
    "roof-terrace", importance=0.7)
parapet_ring("roof-terrace", rect(0.5, 4.9, 5.0, 8.1), H2, "parapet-light")
bx("roof-terrace-court", "Terrace courtyard floor", "micro", "roof", 2.2, 3.4, G1, G1 + 0.03, 5.9, 7.1, "court", importance=0.5)
parapet_ring("roof-terrace-court", rect(2.08, 5.78, 3.52, 7.22), H2, "roof-green")
bx("roof-greenhouse", "Roof greenhouse", "meso", "roof", 0.8, 1.7, H2, H2 + 0.5, 5.2, 5.9, "glass-light", importance=0.6,
   features=[{"id": "roof-greenhouse.glass", "kind": "contour", "notes": "small glass greenhouse on the terrace"}])
bx("roof-greenhouse-ridge", "Greenhouse ridge", "micro", "trim", 0.8, 1.7, H2 + 0.5, H2 + 0.56, 5.52, 5.58, "frame-light", importance=0.3)
for k, (gx, gy, w, d) in enumerate(((0.9, 7.5, 0.5, 0.12), (1.6, 7.7, 0.12, 0.3), (2.4, 7.55, 0.5, 0.12), (3.7, 7.6, 0.5, 0.12),
                                    (4.3, 6.2, 0.12, 0.5), (3.9, 5.3, 0.5, 0.12), (1.0, 6.5, 0.12, 0.5)), 1):
    bx(f"roof-bench-{k}", f"Terrace yellow bench {k}", "micro", "prop", gx, gx + w, H2, H2 + 0.08, gy, gy + d, "yellow", importance=0.4)
for k, (gx, gy) in enumerate(((4.5, 7.6), (2.0, 5.3)), 1):
    bx(f"roof-planter-{k}", f"Terrace planter {k}", "micro", "prop", gx - 0.15, gx + 0.15, H2, H2 + 0.12, gy - 0.15, gy + 0.15, "frame-light")
    bx(f"roof-planter-{k}-tree", f"Terrace tree {k}", "micro", "tree", gx - 0.17, gx + 0.17, H2 + 0.12, H2 + 0.5, gy - 0.17, gy + 0.17, "tree")
perf = 0
for sd, (a0, a1) in (("S", (0.6, 4.95)), ("W", (5.0, 8.05))):
    for i in range(int((a1 - a0) / 0.35)):
        for j in range(3):
            a = a0 + 0.15 + i * 0.35 + (0.17 if j % 2 else 0)
            if a > a1 - 0.1:
                continue
            perf += 1
            yy = G1 + 0.22 + j * 0.33
            if sd == "S":
                bx(f"roof-perf-{perf}", f"Perforation {perf}", "micro", "trim", a - 0.06, a + 0.06, yy, yy + 0.12, 8.1, 8.115, "window",
                   contact="applied", importance=0.2)
            else:
                bx(f"roof-perf-{perf}", f"Perforation {perf}", "micro", "trim", 0.485, 0.5, yy, yy + 0.12, a - 0.06, a + 0.06, "window",
                   contact="applied", importance=0.2)

# round building upper storey: dark glass ring with a light floor band, green ring roof, parapets
ext("roof-round-mass", "Round building upper storey", "macro", "building", circle(RCX, RCZ, RO, 48), [circle(RCX, RCZ, RI, 28)], G1, ST - 0.06,
    "glass-round", importance=0.85, features=[{"id": "roof-round-mass.bands", "kind": "linework", "notes": "dark glass bands, light floor lines"}],
    topo="Round upper storey: an extruded ring.")
ext("roof-round-band", "Round building floor band", "micro", "trim", circle(RCX, RCZ, RO + 0.015, 48), [circle(RCX, RCZ, RO - 0.01, 48)], G1 - 0.04, 0.08,
    "frame-light", importance=0.4)
ext("roof-round-top", "Round building roof", "meso", "roof", circle(RCX, RCZ, RO, 48), [circle(RCX, RCZ, RI, 28)], H2 - 0.06, 0.06, "roof-green",
    importance=0.7)
ext("roof-round-parapet-out", "Round roof outer parapet", "micro", "trim", circle(RCX, RCZ, RO, 48), [circle(RCX, RCZ, RO - WT, 48)], H2, PAR, "parapet")
ext("roof-round-parapet-in", "Round roof courtyard parapet", "micro", "trim", circle(RCX, RCZ, RI + WT, 28), [circle(RCX, RCZ, RI, 28)], H2, PAR, "parapet")
ext("roof-round-court", "Courtyard glass, upper storey", "meso", "wall", circle(RCX, RCZ, RI + 0.06, 28), [circle(RCX, RCZ, RI, 28)], G1, ST,
    "glass-round")

# atrium: a big box over the glass ground floor (the lobby walls), yellow bracing, white floor bands and fascia, skylight disc
AX0, AZ0, AX1, AZ1 = 4.7, 2.8, 8.4, 7.2
bx("roof-atrium-upper", "Atrium glass storeys", "macro", "building", AX0, AX1, G1, H3 - 0.06, AZ0, AZ1, "glass-atrium", importance=0.9,
   features=[{"id": "roof-atrium-upper.bracing", "kind": "linework", "notes": "yellow diagonal bracing behind the glass"}],
   topo="Glass storeys: one box overhanging the glass ground floor, roof on only.")
bx("roof-atrium-soffit", "Atrium soffit", "micro", "trim", AX0, AX1, G1 - 0.06, G1, AZ0, AZ1, "frame-light", importance=0.5)
for k, yy in enumerate((G1, H2), 1):
    bx(f"roof-atrium-floorband-{k}", f"Atrium floor band {k}", "micro", "trim", AX0 - 0.02, AX1 + 0.02, yy - 0.04, yy + 0.06, AZ0 - 0.02, AZ1 + 0.02,
       "frame-light", importance=0.4)
bx("roof-atrium-top", "Atrium roof", "meso", "roof", AX0 - 0.06, AX1 + 0.06, H3 - 0.06, H3, AZ0 - 0.06, AZ1 + 0.06, "roof-green", importance=0.7)
parapet_ring("roof-atrium", rect(AX0 - 0.06, AZ0 - 0.06, AX1 + 0.06, AZ1 + 0.06), H3, "frame-light")
for k in range(3):
    bx(f"roof-brace-s-{k + 1}", f"Atrium brace south {k + 1}", "micro", "trim", AX0 + 0.2 + 1.2 * k, AX0 + 1.2 + 1.2 * k, G1 + 0.55 + 0.3 * (k % 2),
       G1 + 0.63 + 0.3 * (k % 2), AZ1, AZ1 + 0.02, "yellow", contact="applied", importance=0.35)
    bx(f"roof-brace-e-{k + 1}", f"Atrium brace east {k + 1}", "micro", "trim", AX1, AX1 + 0.02, G1 + 0.55 + 0.3 * (k % 2), G1 + 0.63 + 0.3 * (k % 2),
       AZ0 + 0.3 + 1.3 * k, AZ0 + 1.3 + 1.3 * k, "yellow", contact="applied", importance=0.35)
SKX, SKZ = 6.55, 5.0
ext("roof-skylight", "Skylight disc", "meso", "roof", circle(X(SKX), Z(SKZ), 1.3, 48), [], H3, 0.04, "skylight", importance=0.9,
    features=[{"id": "roof-skylight.domes", "kind": "contour", "notes": "white disc with 19 blue domes in two rings and a centre"}],
    topo="Skylight base: a disc.")
dome = 0
for r, n in ((0.95, 12), (0.5, 6), (0.0, 1)):
    for i in range(n):
        a = 2 * math.pi * i / n
        dome += 1
        cyl(f"roof-dome-{dome}", f"Skylight dome {dome}", "micro", "trim", SKX + r * math.cos(a), SKZ + r * math.sin(a), H3 + 0.04, 0.06, 0.13, "dome",
            importance=0.4, topo="Skylight dome: a short cylinder.")
bx("roof-logo-sign", "Logo sign (placeholder)", "meso", "sign", 5.2, 6.0, G1 + 0.35, G1 + 1.0, AZ1, AZ1 + 0.03, "logo-red", contact="applied",
   importance=0.6, topo="Red square sign on the atrium face (placeholder for the real logo).")

# ---------------------------------------------------------------------------------------------------------------
# Room objects. Workshop = first room in full detail; the rest are one or two large objects


def leg4(cid, x0, x1, z0, z1, h, mat):
    for k, (lx, lz) in enumerate(((x0 + 0.05, z0 + 0.05), (x1 - 0.05, z0 + 0.05), (x0 + 0.05, z1 - 0.05), (x1 - 0.05, z1 - 0.05)), 1):
        bx(f"{cid}-leg-{k}", f"{cid} leg {k}", "micro", "prop", lx - 0.025, lx + 0.025, 0.02, h, lz - 0.025, lz + 0.025, mat, importance=0.2)


# Workshop (x 4-8, y 0-3): long table, 6 chairs, whiteboard, sticky-note wall, brick shelf, plant
bx("workshop-table", "Workshop table top", "meso", "prop", 5.1, 7.0, 0.36, 0.4, 1.15, 1.85, "timber", importance=0.8,
   features=[{"id": "workshop-table.top", "kind": "contour", "notes": "long timber table for a workshop session"}])
leg4("workshop-table", 5.1, 7.0, 1.15, 1.85, 0.36, "frame-dark")
for k, (cx, cz, face) in enumerate(((5.45, 0.95, 1), (6.05, 0.95, 1), (6.65, 0.95, 1), (5.45, 2.05, -1), (6.05, 2.05, -1), (6.65, 2.05, -1)), 1):
    bx(f"workshop-chair-{k}", f"Workshop chair {k}", "micro", "prop", cx - 0.1, cx + 0.1, 0.02, 0.22, cz - 0.1, cz + 0.1, "chair-blue", importance=0.4)
    zb = cz - 0.1 * face
    bx(f"workshop-chair-{k}-back", f"Workshop chair {k} back", "micro", "prop", cx - 0.1, cx + 0.1, 0.22, 0.42, min(zb, zb - 0.03 * face),
       max(zb, zb - 0.03 * face), "chair-blue", importance=0.3)
bx("workshop-whiteboard", "Workshop whiteboard", "meso", "prop", 4.45, 6.2, 0.38, 1.1, 0.125, 0.155, "whiteboard", importance=0.8,
   features=[{"id": "workshop-whiteboard.board", "kind": "contour", "notes": "long whiteboard with marker lines on the back wall"}])
for k, (x0, x1, y, col) in enumerate(((4.6, 5.5, 0.95, "marker-blue"), (4.6, 5.1, 0.85, "marker-red"), (5.6, 6.1, 0.9, "marker-blue"),
                                      (4.7, 5.9, 0.62, "marker-dark"), (5.4, 6.0, 0.52, "marker-red")), 1):
    bx(f"workshop-marker-{k}", f"Whiteboard marker line {k}", "micro", "trim", x0, x1, y, y + 0.03, 0.155, 0.16, col, contact="applied", importance=0.3)
bx("workshop-pinboard", "Workshop sticky-note wall", "meso", "prop", 6.4, 7.85, 0.4, 1.1, 0.125, 0.155, "cork", importance=0.7,
   features=[{"id": "workshop-pinboard.notes", "kind": "contour", "notes": "board full of yellow, pink and blue sticky notes"}])
note = 0
for i in range(5):
    for j in range(3):
        if (i + j) % 4 == 3:
            continue
        note += 1
        nx, ny = 6.5 + i * 0.27, 0.5 + j * 0.2
        bx(f"workshop-note-{note}", f"Sticky note {note}", "micro", "trim", nx, nx + 0.15, ny, ny + 0.15, 0.155, 0.16,
           ("note-yellow", "note-pink", "note-blue")[(i * 2 + j) % 3], contact="applied", importance=0.25)
bx("workshop-shelf", "Workshop brick shelf", "meso", "prop", 4.12, 4.45, 0.02, 0.95, 0.3, 1.8, "timber", importance=0.6)
for k, (y, z0, col) in enumerate(((0.35, 0.45, "brick-red"), (0.35, 0.95, "yellow"), (0.35, 1.4, "brick-blue"), (0.68, 0.5, "brick-green"),
                                  (0.68, 1.0, "brick-red"), (0.68, 1.45, "yellow")), 1):
    bx(f"workshop-brick-{k}", f"Shelf brick {k}", "micro", "prop", 4.4, 4.54, y, y + 0.14, z0, z0 + 0.28, col, importance=0.3)
cyl("ai-plant-pot", "AI lab plant pot", "micro", "prop", 11.72, 2.7, 0.02, 0.2, 0.12, "frame-light", importance=0.3)
bx("ai-plant", "AI lab plant", "micro", "tree", 11.58, 11.86, 0.22, 0.6, 2.56, 2.84, "tree", importance=0.35)
bx("workshop-rug", "Workshop rug under the table", "micro", "floor", 4.8, 7.4, 0.02, 0.025, 0.7, 2.3, "rug", contact="flush-mount", importance=0.3)
# AI lab (x 8-12, y 0-3): two desks with screens, a server cabinet
for k, gx in enumerate((9.5, 10.5), 1):
    bx(f"ai-desk-{k}", f"AI lab desk {k}", "micro", "prop", gx - 0.3, gx + 0.3, 0.32, 0.36, 1.3, 1.7, "desk-white", importance=0.45)
    leg4(f"ai-desk-{k}", gx - 0.3, gx + 0.3, 1.3, 1.7, 0.32, "frame-dark")
    bx(f"ai-screen-{k}", f"AI lab screen {k}", "micro", "prop", gx - 0.15, gx + 0.15, 0.36, 0.58, 1.31, 1.34, "screen", importance=0.35)
bx("ai-cabinet", "AI lab server cabinet", "meso", "prop", 11.5, 11.88, 0.02, 0.9, 0.2, 0.75, "frame-dark", importance=0.45)
# Lobby (x 5-8, y 3-7): yellow reception desk, floor map
bx("lobby-desk", "Lobby reception desk", "meso", "prop", 5.3, 6.2, 0.02, 0.45, 3.35, 3.75, "yellow", importance=0.6)
bx("lobby-floor-map", "Lobby floor map", "micro", "floor", 6.2, 7.6, 0.02, 0.025, 4.4, 5.6, "map", contact="flush-mount", importance=0.4)
# Studio (x 1-5, y 5-8): shelf on the west wall, table, big red button
bx("studio-shelf", "Studio shelf", "meso", "prop", 1.13, 1.45, 0.02, 0.95, 5.3, 6.9, "timber", importance=0.6)
bx("studio-table", "Studio table", "meso", "prop", 2.7, 3.7, 0.34, 0.38, 6.25, 6.95, "desk-white", importance=0.5)
leg4("studio-table", 2.7, 3.7, 6.25, 6.95, 0.34, "frame-dark")
bx("studio-pedestal", "Studio button pedestal", "micro", "prop", 1.6, 1.9, 0.02, 0.4, 7.45, 7.75, "desk-white", importance=0.5)
cyl("studio-button", "Big red recommend button", "micro", "prop", 1.75, 7.6, 0.4, 0.08, 0.12, "logo-red", importance=0.6)
# Map room: map panel on the back (north-west) wall
ma = 1.25 * math.pi
mx, mz = RCX + (RO - WT - 0.03) * math.cos(ma), RCZ + (RO - WT - 0.03) * math.sin(ma)
C.append(comp("map-panel", "World map panel", "meso", "prop", "box", (1.1, 0.6, 0.04), (mx, G + 0.45 + 0.3, mz), "map", rot=[0, -(ma + math.pi / 2), 0],
              importance=0.7, contact="applied", features=[{"id": "map-panel.map", "kind": "decal", "notes": "blue panel with green land blocks"}],
              topo="Map panel on the curved back wall: a thin box."))
# Launch room (x 8-12, y 3-7): screen on a low stand by the north wall, 2 chair rows
bx("launch-screen", "Launch room screen", "meso", "prop", 9.2, 10.8, 0.3, 0.95, 3.2, 3.24, "screen", importance=0.7)
bx("launch-screen-stand", "Launch screen stand", "micro", "prop", 9.95, 10.05, 0.02, 0.3, 3.18, 3.26, "frame-dark", importance=0.3)
bx("launch-screen-foot", "Launch screen foot", "micro", "prop", 9.7, 10.3, 0.02, 0.05, 3.12, 3.32, "frame-dark", importance=0.2)
for r_, gy in enumerate((4.2, 4.8), 1):
    for c_ in range(4):
        gx = 9.0 + 0.6 * c_
        bx(f"launch-chair-{r_}-{c_ + 1}", f"Launch chair {r_}.{c_ + 1}", "micro", "prop", gx - 0.1, gx + 0.1, 0.02, 0.24, gy - 0.1, gy + 0.1,
           "chair-orange", importance=0.3)

# Walk map (one char per tile; lib/city/buildingInteriors.ts): rooms, plaza P, '#' blocked
WALK_BLOCK = {(5, 1), (6, 1), (4, 0), (4, 1), (11, 2), (9, 1), (10, 1), (11, 0), (5, 3), (1, 5), (1, 6), (3, 6), (1, 7),
              (5, 7), (8, 7), (7, 8)}
CODE = {"workshop": "W", "ailab": "A", "lobby": "L", "studio": "S", "launch": "R"}
walk = []
for gy in range(int(PH)):
    row = ""
    for gx in range(int(PW)):
        if (gx, gy) in WALK_BLOCK:
            ch = "#"
        elif (gx, gy) in cell:
            ch = CODE[cell[(gx, gy)]]
        elif 1 <= gx <= 3 and 1 <= gy <= 3 and (gx, gy) != (2, 2):
            ch = "M"
        elif gy >= 8 or (gy == 7 and gx >= 5) or (gx == 0 and gy >= 5):
            ch = "P"
        else:
            ch = "#"
        row += ch
    walk.append(row)
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


F = flat("flat illustration colour in the AI Studio image")
spec["materials"] = [
    material("grass", "Grass", "unknown", "#6fb34a", ["#67a845"], 0.95, 0.0, "plot", **F),
    material("court", "Courtyard lawn", "unknown", "#5aa83a", ["#539c35"], 0.95, 0.0, "round courtyard", **F),
    material("court-dark", "Light well", "unknown", "#3f6e2c", ["#3a6628"], 0.95, 0.0, "terrace light well", **F),
    material("terracotta", "Red roof", "stone", "#b8613e", ["#ae5737"], 0.9, 0.0, "yellow block roof (real campus: red-brown)", **F),
    material("check-light", "Plaza light square", "stone", "#e4e2dc", ["#dad8d2"], 0.9, 0.0, "checkerboard plaza", **F),
    material("check-dark", "Plaza dark square", "stone", "#9a9893", ["#908e89"], 0.9, 0.0, "checkerboard plaza", **F),
    material("path", "Path", "stone", "#d9d4c3", ["#cfcab9"], 0.9, 0.0, "front and side paths", **F),
    material("planter", "Planter", "stone", "#cfcac0", ["#c5c0b6"], 0.85, 0.0, "round planters", **F),
    material("panel-wood", "Wood facade panel", "wood", "#c4964f", ["#ba8c45"], 0.7, 0.0, "every fifth window bay (real facade)", **F),
    material("paving", "Plaza paving", "stone", "#c9c6bd", ["#c0bdb4"], 0.9, 0.0, "plaza", **F),
    material("paving-dark", "Paving band", "stone", "#aaa79f", ["#a29f97"], 0.9, 0.0, "tile bands", **F),
    material("paving-light", "Light paving", "stone", "#e4e1d8", ["#dbd8cf"], 0.9, 0.0, "apron, statue plinth", **F),
    material("facade", "Facade", "stone", "#e6e3dc", ["#dcd9d2"], 0.85, 0.0, "wing facades", **F),
    material("facade-perf", "Perforated facade", "stone", "#eeeeea", ["#e4e4e0"], 0.85, 0.0, "terrace building upper storey",
             localOverrides=[{"id": "facade-perf.dots", "kind": "linework", "notes": "dark perforation dots as small boxes"}], **F),
    material("brick", "Brick", "stone", "#8a4b3a", ["#7f4535"], 0.9, 0.0, "plinths: east wing ground storey, round building",
             localOverrides=[{"id": "brick.coursing", "kind": "stain", "notes": "coursing below sprite size: flat brick red"}], **F),
    material("wall-light", "Inner wall", "stone", "#ebe6de", ["#e1dcd4"], 0.85, 0.0, "walls between rooms", **F),
    material("wall-cap", "Wall cap", "stone", "#3b2b26", ["#33251f"], 0.9, 0.0, "dark cap on cut walls (cut-away read)", **F),
    material("window", "Window glass", "glass", "#2b3a42", ["#25333a"], 0.3, 0.0, "windows, glass bands", **F),
    material("glass-dark", "Dark glazing", "glass", "#3a4c55", ["#34454e"], 0.3, 0.0, "studio ground storey glazing", **F),
    material("glass-round", "Round building glass", "glass", "#2f3a40", ["#29343a"], 0.3, 0.0, "round building bands", **F),
    material("glass-atrium", "Atrium glass", "glass", "#a9cbd8", ["#9fc1ce"], 0.2, 0.0, "atrium and lobby glass", **F),
    material("glass-light", "Light glass", "glass", "#cfe6ee", ["#c5dce4"], 0.2, 0.0, "greenhouse, courtyard ring", **F),
    material("glass-door", "Door glass", "glass", "#9cc8d8", ["#92bece"], 0.15, 0.0, "main door leaves", opacity={"base": 0.75}, **F),
    material("frame-dark", "Dark frame", "metal", "#2e3236", ["#282b2f"], 0.6, 0.2, "door frame, legs, cabinet", **F),
    material("frame-light", "White trim", "stone", "#f2f2ee", ["#e8e8e4"], 0.8, 0.0, "floor bands, fascia, planters", **F),
    material("parapet", "Parapet", "stone", "#3c3f41", ["#36393b"], 0.85, 0.0, "roof edges", **F),
    material("parapet-light", "Light parapet", "stone", "#d9d6cf", ["#cfccc5"], 0.85, 0.0, "terrace edge", **F),
    material("roof-green", "Green roof", "unknown", "#7cc242", ["#74b83d"], 0.95, 0.0, "roofs", **F),
    material("roof-terrace", "Roof terrace", "stone", "#f0eee8", ["#e6e4de"], 0.85, 0.0, "terrace building roof", **F),
    material("yellow", "LEGO yellow", "plastic", "#f2c500", ["#e8bb00"], 0.45, 0.0, "yellow blocks, canopy, benches", **F),
    material("skylight", "Skylight disc", "stone", "#f2f2ee", ["#e8e8e4"], 0.8, 0.0, "atrium roof disc", **F),
    material("dome", "Skylight dome", "glass", "#4f7fb8", ["#4877ae"], 0.3, 0.0, "19 domes", **F),
    material("logo-red", "LEGO red", "plastic", "#e3000b", ["#d50009"], 0.45, 0.0, "logo placeholder, button", **F),
    material("floor-workshop", "Workshop floor", "stone", "#8fa4dc", ["#879cd2"], 0.9, 0.0, "Workshop", **F),
    material("floor-lobby", "Lobby floor", "stone", "#f4f4f2", ["#eaeae8"], 0.85, 0.0, "lobby", **F),
    material("floor-studio", "Studio floor", "stone", "#a8e6c4", ["#a0dcbb"], 0.9, 0.0, "Recommendation studio", **F),
    material("floor-map", "Map room floor", "stone", "#f3a98a", ["#e99f80"], 0.9, 0.0, "Systems map room", **F),
    material("floor-launch", "Launch floor", "stone", "#f5e9a0", ["#ebdf96"], 0.9, 0.0, "Launch room", **F),
    material("floor-ai", "AI lab floor", "stone", "#b9bcc4", ["#afb2ba"], 0.9, 0.0, "AI lab", **F),
    material("timber", "Timber", "wood", "#c9925a", ["#bf8852"], 0.6, 0.0, "tables, shelves", **F),
    material("desk-white", "White furniture", "plastic", "#fafaf8", ["#f0f0ee"], 0.5, 0.0, "desks, pedestal", **F),
    material("chair-blue", "Blue chairs", "plastic", "#3c78c8", ["#356fbe"], 0.5, 0.0, "Workshop chairs", **F),
    material("chair-orange", "Orange chairs", "plastic", "#e8833a", ["#de7930"], 0.5, 0.0, "launch chairs", **F),
    material("whiteboard", "Whiteboard", "plastic", "#fbfbf8", ["#f1f1ee"], 0.2, 0.0, "Workshop whiteboard", **F),
    material("cork", "Cork board", "wood", "#c8a477", ["#be9a6d"], 0.9, 0.0, "sticky-note wall", **F),
    material("note-yellow", "Sticky note yellow", "plastic", "#ffe45c", ["#f5da52"], 0.8, 0.0, "sticky notes", **F),
    material("note-pink", "Sticky note pink", "plastic", "#ff8fb1", ["#f585a7"], 0.8, 0.0, "sticky notes", **F),
    material("note-blue", "Sticky note blue", "plastic", "#7fd0f0", ["#75c6e6"], 0.8, 0.0, "sticky notes", **F),
    material("marker-blue", "Blue marker", "plastic", "#2b5bd7", ["#2552cc"], 0.5, 0.0, "whiteboard lines", **F),
    material("marker-red", "Red marker", "plastic", "#d63a3a", ["#cc3333"], 0.5, 0.0, "whiteboard lines", **F),
    material("marker-dark", "Dark marker", "plastic", "#333333", ["#2c2c2c"], 0.5, 0.0, "whiteboard lines", **F),
    material("brick-red", "Red brick toy", "plastic", "#d0312d", ["#c62b27"], 0.45, 0.0, "shelf bricks", **F),
    material("brick-blue", "Blue brick toy", "plastic", "#2b55a8", ["#264d9c"], 0.45, 0.0, "shelf bricks", **F),
    material("brick-green", "Green brick toy", "plastic", "#2f9e4f", ["#2a9447"], 0.45, 0.0, "shelf bricks", **F),
    material("rug", "Rug", "fabric", "#5f75b8", ["#586dae"], 0.95, 0.0, "Workshop rug", **F),
    material("map", "Map panel", "plastic", "#4f8fc9", ["#5fae5a"], 0.6, 0.0, "map panel, lobby floor map", **F),
    material("screen", "Screen", "glass", "#222326", ["#2c2e33"], 0.25, 0.0, "screens", **F),
    material("mf-red", "Minifigure red", "plastic", "#d0312d", ["#c62b27"], 0.4, 0.0, "statue torso, arms", **F),
    material("mf-blue", "Minifigure blue", "plastic", "#2b55a8", ["#264d9c"], 0.4, 0.0, "statue legs", **F),
    material("mf-yellow", "Minifigure yellow", "plastic", "#f6cf2a", ["#ecc520"], 0.4, 0.0, "statue head, hands", **F),
    material("tree", "Tree crown", "unknown", "#5aa83a", ["#529c34"], 0.95, 0.0, "blocky trees", **F),
    material("trunk", "Trunk", "wood", "#7a5233", ["#70492c"], 0.9, 0.0, "trees", **F),
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
    rep("ground-walls", lambda i: i.startswith("wall-"), "ground storey walls on tile edges, split at doors"),
    rep("upper-walls", lambda i: i.startswith("upper-") and "-win-" not in i, "upper parts of the ground storey walls"),
    rep("windows", lambda i: "-win-" in i, "one window per bay and storey"),
    rep("skylight-domes", lambda i: i.startswith("roof-dome-"), "two rings and a centre on the skylight disc"),
    rep("canopy-studs", lambda i: i.startswith("canopy-stud-"), "2 x 4 grid on the plate", "canopy"),
    rep("perforations", lambda i: i.startswith("roof-perf-"), "staggered rows on the terrace building"),
    rep("workshop-chairs", lambda i: i.startswith("workshop-chair-") and not i.endswith("-back"), "three each side of the table"),
    rep("sticky-notes", lambda i: i.startswith("workshop-note-"), "grid on the pinboard"),
]
spec["silhouette"] = {"boundingShape": "14 x 9 wu plot; wings 2.6 wu with courtyards, atrium and yellow blocks 3.8 wu, ring building at the west; "
                                       "roof off: far walls 1.4 wu, others 0.35 wu",
                      "aspectRatios": ["plot 14 : 9", "height 3.95 : plot 14"], "symmetry": "asymmetric",
                      "dominantCurves": ["round building ring", "skylight disc"], "negativeSpaces": ["round courtyard", "plaza", "room interiors"],
                      "landmarks": ["glass atrium with skylight", "yellow bar", "yellow block", "round building", "minifigure"]}
spec["coordinateFrame"] = {"front": "+Z south (main door, plaza)", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m); avatar 0.9"}
floors = [i for i in ids if i.endswith("-floor")]
spec["featureReviewTargets"] = [
    {"id": "campus-identity", "name": "Green roofs, atrium skylight circle, round building, yellow bar and block read as the LEGO campus",
     "tier": "critical", "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["roof-north-mass", "roof-atrium-upper", "roof-round-mass", "roof-yellow-bar-mass", "roof-yellow-block-mass", "roof-skylight"]},
    {"id": "avatar-scale", "name": "Storeys 1.2 wu, door 1.0 wu: the avatar (0.9 wu) fits the main door", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["door-leaf-left", "door-leaf-right", "upper-S-door-header", "canopy"]},
    {"id": "entrance", "name": "Yellow 2 x 4 plate over the glass main door on the south side", "tier": "critical",
     "passIds": ["structural-pass", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["canopy", "door-leaf-left", "door-leaf-right"] + [f"canopy-stud-{i}" for i in range(1, 9)]},
    {"id": "cutaway", "name": "Roof off: far walls high, other walls cut with dark caps, every room floor visible", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True, "componentRefs": floors},
    {"id": "workshop", "name": "Workshop in full detail: table, chairs, whiteboard, sticky-note wall, brick shelf", "tier": "important",
     "passIds": ["form-refinement", "material-pass"], "minimumScore": 0.6, "mustPass": False,
     "componentRefs": ["workshop-table", "workshop-whiteboard", "workshop-pinboard", "workshop-shelf"]},
    {"id": "plaza", "name": "Plaza with the minifigure statue and trees", "tier": "important", "passIds": ["structural-pass", "material-pass"],
     "minimumScore": 0.6, "mustPass": False, "componentRefs": ["plaza", "minifig-torso", "minifig-head"]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["iso south (yaw 45, pitch 30) roof on", "iso south roof off", "iso north (yaw 225) roof on", "sprite south/west/north/east"]
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
spec["entrance"] = {"side": "south", "at": 6.5, "width": 1.0, "approachTile": [6, 7],
                    "cues": ["yellow 2 x 4 plate over the doors", "glass sliding doors", "light apron on the plaza"]}
spec["states"] = {"roofOn": "hide lowcap-* and topcap-*",
                  "roofOff": "hide roof-*; keep upper-/topcap- only for the two far sides of the view; show lowcap- for the others"}
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]), "roof", len([i for i in ids if i.startswith("roof-")]),
      "walls", len(wall_ids), "windows", len(win_ids), "upper", len([i for i in ids if i.startswith("upper-")]))

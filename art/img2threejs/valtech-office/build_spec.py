"""ObjectSculptSpec for the Valtech office (Linear POR-35): the riverside office block as a 3 x 2 tile city building.

Plan authority: Figma board node 576-3613 (agreed with Gustav): footprint 3 x 2, ground storey 1.4 wu with dark green
awnings, white columns, black planters and the gate (passage) as the entrance on the south side under an awning; three
louvre storeys of 1.2 wu; a recessed glass top floor with a white frame.
Gustav, 2026-10-16: white bands (0.2 wu, standing 0.04 wu proud of the slats) clearly apart from warm grey louvre bands over
dark windows (the all-white real slats read as all grey); one fin per 1 wu bay; no flag mast. Built and reviewed one side at
a time, south first.
Style + camera: ref/ref-A-gemini.png. Facts: ref/photo-6.jpg (straight front), photo-1..3 (from the bridge).
Colours: photo crops (material-crops/) through analyze_texture.py and extract_pbr_evidence.py (material-evidence/),
lifted into the sprite value band and kept flat. Nothing from the photos is projected onto the mesh.

Frame: 1 unit = 1 wu (one tile edge, ~2 m). +Y up, the pavement top at y = G, the 3 x 2 footprint centred on the
origin: X east (3 wu, -1.5..1.5), Z south (2 wu, -1..1). The south (+Z) and east (+X) sides face the default camera.
"""
import copy
import json
import math
import sys

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
REFA, PHOTO = "ref-a", "photo-front"
spec["viewEvidence"] = [
    {"id": REFA, "view": "primary: AI image of the block from the iso camera (style, colour, identity features)",
     "image": f"{W}/ref/ref-A-gemini.png", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["white slabs between louvre bands (ref A: warm grey; the real slats are white concrete)", "recessed glass top floor with a white frame",
                      "dark green awnings over the ground storey", "white columns, black planters", "thin mast on the roof"],
     "confidence": 0.85},
    {"id": PHOTO, "view": "facts: photo of the real front from across the river (storey order, gate, door, colours)",
     "image": f"{W}/ref/photo-6.jpg", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["continuous louvre bands with fins", "glass top floor set back, ducts on its roof",
                      "gate passage at the east end of the front", "glazed door beside the gate", "planters along the front"],
     "confidence": 0.9},
]

G = 0.04                      # pavement pad (root) top
GS, ST, TS = 1.4, 1.2, 0.2    # ground storey, upper storey, white band (slab + parapet; bay-proof look, a bit stronger)
NL = 3                        # louvre storeys
ROOF = GS + NL * ST           # top of the louvre block = 5.0 (the top slab sits on it)
TOP0, TOPH = ROOF + TS, 1.1   # recessed glass top floor
HX, HZ = 1.5, 1.0             # half footprint


def r4(v):
    return [round(float(x), 4) for x in v]


def comp(cid, name, level, role, primitive, dims, pos, material, *, rot=None, importance=0.6, conf=0.75, features=None,
         evidence=None, topo="", sockets=None, contact="flush-mount", start=None, end=None, radius=None, parent="root"):
    c = copy.deepcopy(root_t)
    c.update({"id": cid, "name": name, "level": level, "role": role, "importance": importance, "confidence": conf,
              "primitive": primitive, "topologyClass": "assembled-solid",
              "topologyRationale": topo or f"Hard-surface {role}: a {primitive} at sprite scale.", "parent": parent,
              "material": material, "materialLayers": [material], "localFeatures": features or [],
              "evidenceRefs": evidence or [REFA, PHOTO]})
    gd = c["geometryDescriptor"]
    gd["topologyIntent"] = "hard-surface, flat faces, crisp edges"
    gd["edgeTreatment"] = {"type": "none", "bevelRadius": 0.0, "segments": 1}
    c["dimensions"] = {"width": round(dims[0], 4), "height": round(dims[1], 4), "depth": round(dims[2], 4),
                       "units": "wu (1 tile edge, ~2 m)", "confidence": conf}
    p = list(pos) if parent is None else [pos[0], pos[1] - G / 2, pos[2]]
    c["transform"] = {"position": r4(p), "rotation": r4(rot or [0, 0, 0]), "scale": r4(dims)}
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


def bx(cid, name, level, role, x0, x1, y0, y1, z0, z1, material, *, contact="resting", **kw):
    """Box in model units (x east, z south); y in wu above the pavement top."""
    y0, y1 = G + y0, G + y1
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    C.append(comp(cid, name, level, role, "box", (x1 - x0, y1 - y0, z1 - z0), (cx, (y0 + y1) / 2, cz), material, contact=contact,
                  start=(cx, y0, cz), end=(cx, y1, cz), **kw))


def cyl(cid, name, level, role, x, z, y0, h, r, material, **kw):
    C.append(comp(cid, name, level, role, "cylinder", (2 * r, h, 2 * r), (x, G + y0 + h / 2, z), material, contact="resting",
                  start=(x, G + y0, z), end=(x, G + y0 + h, z), radius=r, **kw))


def tilted(cid, name, level, role, x0, x1, z_back, y_back, z_front, y_front, thick, material, **kw):
    """A thin plate from (z_back, y_back) down to (z_front, y_front), x0..x1 wide: an awning."""
    dz, dy = z_front - z_back, y_front - y_back
    length = math.hypot(dz, dy)
    ang = math.atan2(-dy, dz)          # rotation about +X tips the front edge down
    cx, cy, cz = (x0 + x1) / 2, G + (y_back + y_front) / 2, (z_back + z_front) / 2
    C.append(comp(cid, name, level, role, "box", (x1 - x0, thick, length), (cx, cy, cz), material, rot=[ang, 0, 0],
                  contact="flush-mount", start=(cx, G + y_back, z_back), end=(cx, G + y_front, z_front), **kw))


def lf(fid, kind, notes):
    return [{"id": fid, "kind": kind, "notes": notes}]


# ---------------------------------------------------------------------------------------------------------------
# Pavement pad (root): exactly the 3 x 2 footprint, so the converter bbox starts at the footprint
C.append(comp("root", "Pavement", "macro", "base", "box", (2 * HX, G, 2 * HZ), (0, G / 2, 0), "paving", parent=None,
              importance=0.7, conf=0.95, sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "top of the pavement"}],
              features=lf("root.pad", "contour", "3 x 2 wu pavement = the footprint (collision = footprint)"),
              topo="Flat pad: a box exactly the size of the footprint."))

# ---------------------------------------------------------------------------------------------------------------
# Ground storey (0 .. 1.4): shops behind an arcade on the south side, the gate passage in the east bay
SHOP_Z = 0.55      # shop glazing line (set back 0.45 behind the column line)
COL = 0.14         # column size
GX0, GX1 = 0.55, 1.38   # gate passage between the shop block and the east end wall
DOOR_Z = -0.45     # the passage ends at the entrance door
PASS_H = 1.15      # passage clear height (door 1.0 + transom)
bx("shop-core", "Shop block", "macro", "ground-storey", -HX, 0.5, 0, GS, -HZ, SHOP_Z, "white", importance=0.8,
   features=lf("shop-core.arcade", "contour", "ground storey set back behind the column line on the south side"),
   topo="Shop block behind the arcade: a box.")
bx("gate-back", "Lobby block behind the gate", "meso", "ground-storey", 0.5, HX, 0, GS, -HZ, DOOR_Z, "white", importance=0.6)
bx("gate-east-wall", "Gate east wall", "meso", "ground-storey", GX1, HX, 0, GS, DOOR_Z, HZ, "white", importance=0.6,
   topo="East end wall of the passage, flush with the east facade: a box.")
bx("gate-lintel", "Gate lintel", "meso", "ground-storey", 0.5, GX1, PASS_H, GS, DOOR_Z, HZ, "white", importance=0.5)
bx("gate-void", "Gate passage floor", "meso", "entrance", GX0, GX1, 0, 0.01, DOOR_Z, HZ, "passage", contact="flush-mount", importance=0.85,
   features=lf("gate-void.passage", "contour", "dark passage through the ground storey: the entrance (1.0 wu wide incl. reveals)"),
   topo="Passage floor: a thin box; the walls are the brick reveals and the blocks around it.")
bx("gate-brick-w", "Gate brick lining (west)", "micro", "entrance", 0.5, GX0, 0, PASS_H, DOOR_Z, HZ - 0.05, "brick", importance=0.5,
   topo="Brick lining on the passage's west wall: a thin box.")
bx("gate-brick-e", "Gate brick lining (east)", "micro", "entrance", GX1 - 0.02, GX1, 0, PASS_H, DOOR_Z, HZ - 0.05, "brick", importance=0.5)
bx("gate-soffit", "Gate soffit", "micro", "entrance", 0.5, GX1, PASS_H - 0.02, PASS_H, DOOR_Z, HZ, "passage", importance=0.3)
# entrance door on the passage's west wall (it faces the default camera; a door at the passage end is hidden behind the
# east wall from the south-east view), lit from inside, with the red and blue art panel beside it, as in the photo
DZ0, DZ1, DW = 0.05, 0.55, GX0 + 0.02
bx("gate-door", "Entrance door", "meso", "entrance", GX0, DW, 0.0, 1.0, DZ0, DZ1, "door-lit", importance=0.85,
   features=lf("gate-door.glazed", "contour", "glazed door on the passage wall, lit from inside (readable entrance)"),
   topo="Door glass: a thin box on the passage's west wall.")
bx("gate-door-frame-n", "Door frame (north)", "micro", "entrance", GX0, DW + 0.01, 0.0, 1.04, DZ0 - 0.04, DZ0, "frame-dark", importance=0.3)
bx("gate-door-frame-s", "Door frame (south)", "micro", "entrance", GX0, DW + 0.01, 0.0, 1.04, DZ1, DZ1 + 0.04, "frame-dark", importance=0.3)
bx("gate-door-head", "Door frame (head)", "micro", "entrance", GX0, DW + 0.01, 1.0, 1.04, DZ0 - 0.04, DZ1 + 0.04, "frame-dark", importance=0.3)
bx("gate-art", "Art panel (red)", "micro", "entrance", GX0, DW, 0.1, 1.0, -0.35, -0.1, "art-red", importance=0.4,
   features=lf("gate-art.stripes", "stain", "red and blue art panel beside the door"))
bx("gate-art-blue", "Art panel (blue)", "micro", "entrance", GX0, DW + 0.01, 0.35, 0.7, -0.3, -0.15, "art-blue", importance=0.3)
bx("gate-sign", "House number plate", "micro", "entrance", GX0, DW + 0.01, 0.55, 0.8, 0.62, 0.74, "frame-dark", importance=0.2)
bx("gate-threshold", "Threshold path", "micro", "entrance", GX0, GX1, 0.01, 0.015, 0.85, HZ, "paving-light", contact="flush-mount", importance=0.4,
   topo="Light threshold at the passage mouth: a thin box (path ending at the entrance).")

# columns on the south column line (west corner, two bay lines) and the shop glazing behind them
for i, x in enumerate((-HX + COL / 2, -0.5, 0.5 - COL / 2 + 0.02), 1):
    bx(f"col-S-{i}", f"Column S{i}", "macro", "arcade", x - COL / 2, x + COL / 2, 0, GS, HZ - COL, HZ, "white", importance=0.6,
       features=lf(f"col-S-{i}.pier", "contour", "white square column on the facade line") if i == 1 else None,
       topo="Square white column: a box.")
for i, (x0, x1) in enumerate(((-HX + COL, -0.5 - COL / 2), (-0.5 + COL / 2, 0.5 - COL)), 1):
    bx(f"shop-glass-S-{i}", f"Shop glazing S{i}", "meso", "glazing", x0 + 0.03, x1 - 0.03, 0.05, 1.12, SHOP_Z, SHOP_Z + 0.02,
       "shop-glass", importance=0.6, contact="flush-mount")
    bx(f"shop-light-S-{i}", f"Shop light band S{i}", "micro", "glazing", x0 + 0.08, x1 - 0.08, 0.72, 0.8, SHOP_Z + 0.02, SHOP_Z + 0.025,
       "warm-light", importance=0.35, contact="flush-mount",
       features=lf(f"shop-light-S-{i}.glow", "stain", "warm interior light behind the dark glazing") if i == 1 else None)
# west side: plain white wall, no windows, as on the east and north sides (Gustav, 2026-10-16)
# east side: plain white wall, no windows (Gustav, 2026-10-16)

# awnings: dark green, one per cafe bay, sloping from the glazing to the column line; the gate's awning projects 0.5 wu
for i, (x0, x1) in enumerate(((-HX + COL + 0.02, -0.5 - COL / 2 - 0.02), (-0.5 + COL / 2 + 0.02, 0.5 - COL - 0.02)), 1):
    tilted(f"awning-S-{i}", f"Awning S{i}", "meso", "awning", x0, x1, SHOP_Z + 0.02, 1.22, HZ - 0.03, 0.98, 0.03, "awning", importance=0.8,
           features=lf(f"awning-S-{i}.slope", "contour", "dark green awning sloping out to the column line") if i == 1 else None,
           topo="Sloped canvas plate: a thin box tilted about X.")
    bx(f"awning-S-{i}-valance", f"Awning S{i} valance", "micro", "awning", x0, x1, 0.88, 0.98, HZ - 0.05, HZ - 0.02, "awning", importance=0.4)
tilted("awning-gate", "Gate awning", "meso", "entrance", GX0 - 0.03, GX1 + 0.03, HZ - 0.05, 1.32, HZ + 0.45, 1.14, 0.03, "awning", importance=0.85,
       features=lf("awning-gate.canopy", "contour", "awning over the gate, projecting 0.5 wu over the approach tile"),
       topo="Sloped canvas plate over the gate: a thin box tilted about X.")
bx("awning-gate-valance", "Gate awning valance", "micro", "entrance", GX0 - 0.03, GX1 + 0.03, 1.04, 1.14, HZ + 0.43, HZ + 0.46, "awning-trim",
   importance=0.5, topo="White-edged valance: the accent on the entrance.")

# planters with shrubs in front of the shop glazing (inside the footprint)
for i, x in enumerate((-1.0, 0.0), 1):
    bx(f"planter-{i}", f"Planter {i}", "micro", "planter", x - 0.25, x + 0.25, 0, 0.2, 0.68, 0.86, "planter", importance=0.5,
       features=lf(f"planter-{i}.shrub", "contour", "black box planter with green shrubs") if i == 1 else None)
    for j, dx in enumerate((-0.15, 0.0, 0.15), 1):
        cyl(f"planter-{i}-shrub-{j}", f"Shrub {i}.{j}", "micro", "planter", x + dx, 0.77, 0.2, 0.14 + 0.03 * (j % 2), 0.075, "shrub",
            importance=0.3)

# ---------------------------------------------------------------------------------------------------------------
# Slabs and louvre storeys
for k in range(NL + 1):
    y = GS + k * ST
    bx(f"slab-{k + 1}", f"Slab {k + 1}", "macro", "slab", -HX, HX, y, y + TS, -HZ, HZ, "white", importance=0.85,
       features=lf(f"slab-{k + 1}.edge", "contour", "thick white band (slab + parapet) standing 0.04 proud of the slats") if k == 0 else None,
       topo="Slab and parapet: a box the size of the footprint; its edge is the white band.")

SL0, SLP, SLT, NS = 0.09, 0.2, 0.03, 5       # first slat above the band, pitch, slat height, slats per band (Gustav: more space, thinner)
NOSE, IN = 0.04, 0.09                         # white bands stand 0.04 proud of the slats (shadow line); window plane inset
CP = 0.1                                      # white corner post: slats stop inside it (no slat ends at the corners)
SIDES = {  # side: (axis along the side, half length, outward normal sign, panel width)
    "S": ("x", HX, +1), "N": ("x", HX, -1), "E": ("z", HZ, +1), "W": ("z", HZ, -1)}


def side_box(side, a0, a1, d0, d1, y0, y1):
    """Box on a facade: a0..a1 along the side, d0..d1 = distance inside the slab edge (0 = edge)."""
    axis, half, sgn = SIDES[side]
    edge = HZ if axis == "x" else HX
    n0, n1 = sorted((sgn * (edge - d0), sgn * (edge - d1)))
    return (a0, a1, y0, y1, n0, n1) if axis == "x" else (n0, n1, y0, y1, a0, a1)


slat_ids, fin_ids = [], []
for k in range(NL):
    y0 = GS + k * ST + TS
    y1 = GS + (k + 1) * ST
    for side, (axis, half, sgn) in SIDES.items():
        other = HZ if axis == "x" else HX
        x0, x1, b0, b1, z0, z1 = side_box(side, -(half - IN), half - IN, IN, IN + 0.02, y0, y1)
        bx(f"louvre-{side}-{k + 1}", f"Louvre band {side}{k + 1} (backing)", "macro", "louvre", x0, x1, b0, b1, z0, z1, "louvre-gap",
           importance=0.75, contact="flush-mount",
           features=(lf(f"louvre-{side}-{k + 1}.slats", "linework", f"{NS} horizontal slats, pitch {SLP} wu")
                     + lf(f"louvre-{side}-{k + 1}.fins", "linework", "vertical fins every 1.0 wu (one per bay)")),
           topo="Dark gap behind the slats: a thin box; slats and fins sit in front of it.")
        for j in range(NS):
            ys = y0 + SL0 + j * SLP
            x0, x1, b0, b1, z0, z1 = side_box(side, -(half - CP), half - CP, NOSE, IN, ys, ys + SLT)   # ends hidden in the corner posts
            sid = f"louvre-{side}-{k + 1}-slat-{j + 1}"
            slat_ids.append(sid)
            bx(sid, f"Louvre slat {side}{k + 1}.{j + 1}", "micro", "louvre", x0, x1, b0, b1, z0, z1, "louvre", importance=0.45,
               contact="flush-mount", topo="Louvre slat: a long thin box across the facade.")
        n = int(round(2 * half / 1.0))
        for i in range(1, n):
            a = -half + 1.0 * i
            x0, x1, b0, b1, z0, z1 = side_box(side, a - 0.02, a + 0.02, NOSE, IN, y0, y1)
            fid = f"louvre-{side}-{k + 1}-fin-{i}"
            fin_ids.append(fid)
            bx(fid, f"Louvre fin {side}{k + 1}.{i}", "micro", "louvre", x0, x1, b0, b1, z0, z1, "louvre", importance=0.35,
               contact="flush-mount", topo="Vertical fin: a thin box.")
    # corner posts close the band at the four corners
    for ci, (cx, cz) in enumerate(((HX, HZ), (HX, -HZ), (-HX, -HZ), (-HX, HZ)), 1):
        sx, sz = (1 if cx > 0 else -1), (1 if cz > 0 else -1)
        bx(f"louvre-corner-{k + 1}-{ci}", f"Louvre corner {k + 1}.{ci}", "micro", "louvre", min(cx, cx - sx * CP), max(cx, cx - sx * CP),
           y0, y1, min(cz, cz - sz * CP), max(cz, cz - sz * CP), "white", importance=0.3, contact="flush-mount")

# parapet ring on the louvre block's roof (the top slab)
PY0, PH, PT = ROOF + TS, 0.12, 0.06
bx("parapet-S", "Parapet S", "meso", "roof", -HX, HX, PY0, PY0 + PH, HZ - PT, HZ, "white", importance=0.5)
bx("parapet-N", "Parapet N", "meso", "roof", -HX, HX, PY0, PY0 + PH, -HZ, -HZ + PT, "white", importance=0.5)
bx("parapet-E", "Parapet E", "meso", "roof", HX - PT, HX, PY0, PY0 + PH, -HZ + PT, HZ - PT, "white", importance=0.5)
bx("parapet-W", "Parapet W", "meso", "roof", -HX, -HX + PT, PY0, PY0 + PH, -HZ + PT, HZ - PT, "white", importance=0.5)
bx("roof-deck", "Roof terrace deck", "meso", "roof", -HX + PT, HX - PT, PY0, PY0 + 0.01, -HZ + PT, HZ - PT, "roof-deck", importance=0.5,
   contact="flush-mount")

# ---------------------------------------------------------------------------------------------------------------
# Recessed glass top floor with a white frame and a flat roof (no ducts or roof box: Gustav, 2026-10-16)
TX0, TX1, TZ0, TZ1 = -1.12, 1.24, -0.7, 0.7
T0 = PY0 + 0.01
bx("top-core", "Top floor (glass)", "macro", "top-floor", TX0, TX1, T0, T0 + TOPH, TZ0, TZ1, "glass-top", importance=0.85,
   features=lf("top-core.setback", "contour", "top floor set back ~0.3 wu, wider terrace at the west end"),
   topo="Glazed top floor: a box in glass colour; the white frame sits on it.")
mull_ids = []
for side, (along0, along1, fixed, axis) in {"S": (TX0, TX1, TZ1, "x"), "N": (TX0, TX1, TZ0, "x"),
                                             "E": (TZ0, TZ1, TX1, "z"), "W": (TZ0, TZ1, TX0, "z")}.items():
    out = 0.012 if side in "SE" else -0.012
    lo, hi = sorted((fixed, fixed + out))
    # sill and head bands (the white frame)
    for band, (y0, y1) in (("sill", (0, 0.12)), ("head", (TOPH - 0.1, TOPH))):
        if axis == "x":
            bx(f"top-{band}-{side}", f"Top floor {band} {side}", "micro", "frame", along0, along1, T0 - G + y0, T0 - G + y1, lo, hi, "frame-white",
               importance=0.45, contact="flush-mount")
        else:
            bx(f"top-{band}-{side}", f"Top floor {band} {side}", "micro", "frame", lo, hi, T0 - G + y0, T0 - G + y1, along0, along1, "frame-white",
               importance=0.45, contact="flush-mount")
    n = int(round((along1 - along0) / 0.4))
    for i in range(0, n + 1):
        a = along0 + (along1 - along0) * i / n
        mid = f"top-glass-{side}-mullion-{i}"
        mull_ids.append(mid)
        if axis == "x":
            bx(mid, f"Mullion {side}{i}", "micro", "frame", a - 0.02, a + 0.02, T0 - G, T0 - G + TOPH, lo, hi, "frame-white", importance=0.35,
               contact="flush-mount")
        else:
            bx(mid, f"Mullion {side}{i}", "micro", "frame", lo, hi, T0 - G, T0 - G + TOPH, a - 0.02, a + 0.02, "frame-white", importance=0.35,
               contact="flush-mount")
# the S face glass id the detail inventory maps to: the first mullion row carries the feature
for c in C:
    if c["id"] == "top-glass-S-mullion-0":
        c["localFeatures"] = lf("top-glass-S.mullions", "linework", "white mullions every ~0.4 wu on the glass top floor")
        c["id"] = "top-glass-S"
        mull_ids[mull_ids.index("top-glass-S-mullion-0")] = "top-glass-S"
TR = T0 - G + TOPH
bx("top-roof", "Top floor roof", "macro", "top-floor", TX0 - 0.05, TX1 + 0.05, TR, TR + 0.1, TZ0 - 0.05, TZ1 + 0.05, "frame-white", importance=0.7,
   topo="Flat white roof slab overhanging the glass by 0.05: a box.")
C = [c for c in C if c is not None]

# Bay proof (BAY=1): only the south-west bay as a 1 wu slice of the full stack (x -1.5..-0.5), same scale and camera
import os
if os.environ.get("BAY") == "1":
    BX0, BX1 = -HX, -0.5
    keep = []
    for c in C:
        if c["parent"] is None:                     # the pad stays centred; the bay is moved onto it (children are root-relative)
            c["dimensions"]["width"] = BX1 - BX0
            c["transform"]["scale"][0] = BX1 - BX0
            keep.append(c)
            continue
        if c["id"].startswith("louvre-E-") or (c["id"].startswith("louvre-corner-") and c["id"][-1] in "12"):
            dx = BX1 - HX                              # close the slice: the east louvre side moves to the cut
            c["transform"]["position"][0] = round(c["transform"]["position"][0] + dx, 4)
            for k in ("localStart", "localEnd"):
                c["attachment"][k][0] = round(c["attachment"][k][0] + dx, 4)
        x, w = c["transform"]["position"][0], c["transform"]["scale"][0]
        if c["id"].startswith("roof-duct-"):          # ducts lie along X: their length is the scale's y
            w = c["transform"]["scale"][1]
        x0, x1 = max(x - w / 2, BX0), min(x + w / 2, BX1)
        if x1 - x0 < 1e-3 or (c["primitive"] != "box" and not BX0 <= x <= BX1):
            continue
        if c["primitive"] == "box":
            c["transform"]["position"][0] = round((x0 + x1) / 2, 4)
            c["transform"]["scale"][0] = round(x1 - x0, 4)
            c["dimensions"]["width"] = round(x1 - x0, 4)
            for k in ("localStart", "localEnd"):
                c["attachment"][k][0] = round((x0 + x1) / 2, 4)
        shift = -(BX0 + BX1) / 2
        c["transform"]["position"][0] = round(c["transform"]["position"][0] + shift, 4)
        if c.get("attachment"):
            for k in ("localStart", "localEnd"):
                c["attachment"][k][0] = round(c["attachment"][k][0] + shift, 4)
        keep.append(c)
    C = keep
    kept = {f["id"] for c in C for f in c["localFeatures"]}
    di = spec["preSpecAssessment"]["detailInventory"]
    di["details"] = [d for d in di["details"] if d["mapsTo"]["type"] != "component.localFeatures" or d["mapsTo"]["ref"] in kept]
    di["note"] += " (bay proof: details outside the bay slice are left out)"
    print("bay slice:", len(C), "components")
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


# whites carry a stronger self-light (0.45) so they stay off-white under the converter light like ref A (Gustav: "all grey")
SPR = "flat colour at sprite size (~62 px per wu at 2x density): no texture, nothing projected from the photos"


def ev(crop):
    """Photo-crop evidence: analyze_texture.py + extract_pbr_evidence.py reports in material-evidence/."""
    e = {"textureless": {"declared": True, "evidence": [f"material-crops/{crop}.png", f"material-evidence/{crop}-pbr.json",
                                                        f"material-evidence/{crop}-texture.json", SPR]}}
    try:
        rep = json.load(open(f"{W}/material-evidence/{crop}-pbr.json"))
        e["evidenceSummary"] = {"photoPalette": rep.get("palette", [])[:3], "confidence": rep.get("confidence"),
                                "verdict": rep.get("verdict"), "notes": "overcast photo: hue kept, value lifted into the sprite band"}
    except FileNotFoundError:
        pass
    return e


def flat(why):
    return {"textureless": {"declared": True, "evidence": [why, SPR, "analysis/image-analysis.md L5"]}}


spec["materials"] = [
    material("paving", "Pavement", "stone", "#b9b2a8", ["#b0a99f"], 0.9, 0.0, "pad under the block (ref A ground)", **flat("ref A pad")),
    material("paving-light", "Threshold paving", "stone", "#ddd8cf", ["#d3cec5"], 0.9, 0.0, "path at the gate mouth", **flat("entrance cue")),
    material("white", "White concrete", "stone", "#ebe9e3", ["#e1dfd9"], 0.85, 0.0, "slabs, columns, walls (photo #d8d7d3, lifted)",
             localOverrides=[{"id": "white.boardmarks", "kind": "stain", "notes": "board-marked concrete: below sprite size, flat white"}],
             emissiveIntensity={"base": 0.45}, **ev("slab")),
    material("louvre", "Louvre slats", "metal", "#a39b90", ["#99918a"], 0.7, 0.1, "warm grey slats and fins (ref A; photo #999895 / #807f7c warmed): "
             "kept apart from the white bands (Gustav, 2026-10-16)", **ev("louvre")),
    material("louvre-gap", "Window band", "glass", "#2c3338", ["#262c31"], 0.3, 0.0, "dark window glass behind the slats (photo palette #2e2923..#3c372f)",
             **ev("louvre")),
    material("glass-top", "Top floor glass", "glass", "#a4bccb", ["#9ab2c1"], 0.2, 0.0, "recessed top floor (photo #96adbb, lifted)",
             **ev("glass")),
    material("frame-white", "White frame", "stone", "#f3f2ee", ["#e9e8e4"], 0.8, 0.0, "top floor frame, mullions, roof", emissiveIntensity={"base": 0.45}, **ev("slab")),
    material("awning", "Awning canvas", "fabric", "#3e6253", ["#385a4c"], 0.8, 0.0, "dark green awnings (photo #39544d, lifted)",
             **ev("awning")),
    material("awning-trim", "Gate awning valance", "fabric", "#f3f2ee", ["#e9e8e4"], 0.8, 0.0, "white valance: accent on the entrance",
             emissiveIntensity={"base": 0.45}, **flat("entrance cue (city rules section 6)")),
    material("shop-glass", "Shop glazing", "glass", "#283037", ["#232a30"], 0.3, 0.0, "dark ground-storey glazing",
             localOverrides=[{"id": "shop-glass.warm-light", "kind": "stain", "notes": "warm light band as a separate thin box"}],
             **ev("gate")),
    material("warm-light", "Warm interior light", "glass", "#f0c27a", ["#e8b86e"], 0.4, 0.0, "light behind the shop glazing",
             **flat("photo: warm lights in the cafe")),
    material("planter", "Planter", "wood", "#1d1d20", ["#17171a"], 0.85, 0.0, "black box planters (photo #141416)", **ev("planter")),
    material("shrub", "Shrub", "unknown", "#4f7f3c", ["#477536"], 0.95, 0.0, "shrubs in the planters", **flat("ref A shrubs")),
    material("passage", "Passage shadow", "stone", "#1a1a1d", ["#151518"], 0.95, 0.0, "gate passage floor and soffit (photo #020204, lifted)",
             **ev("gate")),
    material("brick", "Brick lining", "stone", "#7c4636", ["#713f31"], 0.9, 0.0, "brick reveals in the passage (photo zone r2c2)",
             **flat("photo-6 zone r2c2: brick passage walls")),
    material("door-lit", "Lit door glass", "glass", "#f2dca6", ["#e8d29c"], 0.2, 0.0, "entrance door, lit from inside",
             **flat("entrance cue: a glazed, lit door")),
    material("frame-dark", "Dark frame", "metal", "#2e3236", ["#282b2f"], 0.6, 0.2, "door frame, number plate", **flat("photo door frame")),
    material("art-red", "Art panel red", "plastic", "#c63a2f", ["#bc3429"], 0.6, 0.0, "art panel by the door", **flat("photo-6 zone r2c2")),
    material("art-blue", "Art panel blue", "plastic", "#33539e", ["#2d4c94"], 0.6, 0.0, "art panel by the door", **flat("photo-6 zone r2c2")),
    material("roof-deck", "Roof deck", "stone", "#bcb3a8", ["#b2a99e"], 0.9, 0.0, "roof terrace (ref A warm grey)", **flat("ref A roof")),
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


def rep(rid, el, dist, target="root"):
    return {"id": rid, "target": target, "count": len(el), "elementComponentIds": el, "distribution": dist, "notes": ""}


spec["repetitionSystems"] = [
    rep("louvre-slats", slat_ids, f"{NS} slats per band, pitch {SLP} wu, on 4 sides x {NL} storeys"),
    rep("louvre-fins", fin_ids, "vertical fins every 1.0 wu on every band"),
    rep("slabs", [f"slab-{k + 1}" for k in range(NL + 1)], "one slab per storey line, 1.2 wu apart"),
    rep("top-mullions", mull_ids, "white mullions every ~0.4 wu around the top floor"),
    rep("awnings", ["awning-S-1", "awning-S-2"], "one per cafe bay"),
    rep("columns", [i for i in ids if i.startswith("col-S-")], "south column line at the bay lines"),
    rep("planters", [i for i in ids if i.startswith("planter-") and "shrub" not in i], "between the columns"),
]
top = TR + 0.1 + G
spec["silhouette"] = {"boundingShape": f"3 x 2 wu block, louvre block {ROOF + TS + G:.2f} wu, top floor to {top:.2f} wu",
                      "aspectRatios": ["footprint 3 : 2", f"height {top:.2f} : length 3"], "symmetry": "asymmetric (gate at the east end)",
                      "dominantCurves": [], "negativeSpaces": ["gate passage", "arcade", "roof terrace"],
                      "landmarks": ["white band / louvre banding", "glass top floor", "green awnings", "gate with awning"]}
spec["coordinateFrame"] = {"front": "+Z south (cafe arcade, gate)", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m); avatar 0.9"}
spec["featureReviewTargets"] = [
    {"id": "banding", "name": "White bands clearly apart from warm grey louvre bands over dark windows (slats and fins readable)", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["slab-1", "slab-2", "slab-3", "slab-4", "louvre-S-1", "louvre-E-1"]},
    {"id": "top-floor", "name": "Recessed glass top floor with a white frame", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["top-core", "top-roof", "top-glass-S"]},
    # reviewed from the form pass on: the blockout and structural passes were the bay proof (no gate in the slice)
    {"id": "entrance", "name": "Gate passage on the south side under an awning, lit door on its west wall", "tier": "critical",
     "passIds": ["form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["gate-void", "awning-gate", "gate-door", "gate-brick-w"]},
    {"id": "avatar-scale", "name": "Ground storey 1.4, storeys 1.2, door 1.0 wu: the avatar fits the gate", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["gate-door", "gate-lintel", "slab-1"]},
    {"id": "street", "name": "Green awnings, white columns, black planters on the ground storey", "tier": "important",
     "passIds": ["structural-pass", "material-pass"], "minimumScore": 0.6, "mustPass": False,
     "componentRefs": ["awning-S-1", "awning-S-2", "col-S-1", "planter-1"]},
]
if os.environ.get("BAY") == "1":   # bay proof: review only what the slice contains
    for t in spec["featureReviewTargets"]:
        t["componentRefs"] = [i for i in t["componentRefs"] if i in ids]
    spec["featureReviewTargets"] = [t for t in spec["featureReviewTargets"] if t["componentRefs"]]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["iso south (yaw 45, pitch 30) like ref A", "sprite south/west/north/east (turntable)", "2x close-up of the south-west bay at the sprite camera"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 6000, "maxDrawCalls": 400, "textureSize": 256, "fpsTarget": 60})
spec["lightingFromPhoto"] = [
    {"id": "sky", "type": "hemisphere", "role": "key", "intensity": 1.0, "skyColor": "#f4f6f8", "groundColor": "#8a8378",
     "evidence": "ref A: even daylight"},
    {"id": "key", "type": "directional", "role": "key", "intensity": 1.4, "position": [-3, 6, 4], "direction": [0.4, -0.8, -0.5],
     "castsShadow": True, "evidence": "city rules section 3: key from screen upper left, 45 deg up"},
    {"id": "fill", "type": "directional", "role": "fill", "intensity": 0.4, "position": [5, 4, -3], "evidence": "keeps side faces readable"},
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.3, "evidence": "soft reflections on the glass"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 1.0, "notes": "game sprites use the converter rig"},
    {"id": "contact", "role": "shadow", "notes": "soft contact shadows under the slabs and awnings"},
]
spec["entrance"] = {"side": "south", "at": 1.0, "width": 1.0, "approachTile": [2, 2],
                    "cues": ["green awning projecting 0.5 wu with a white valance", "lit glass door on the passage wall, facing the camera",
                             "brick-lined passage", "light threshold path"]}
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]), "slats", len(slat_ids), "fins", len(fin_ids), "mullions", len(mull_ids),
      "top", round(top, 3))

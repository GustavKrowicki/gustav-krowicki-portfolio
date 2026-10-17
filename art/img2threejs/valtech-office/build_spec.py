"""ObjectSculptSpec for the Valtech office (Linear POR-35): the riverside office block as a 6 x 2 tile city building.

Plan authority: Figma board node 576-3613 (agreed with Gustav): footprint 3 x 2 (made 4 x 2 on 2026-10-16 to match the real proportions, then 6 x 2 the same day for the street-level interior), ground storey 1.4 wu with dark green
awnings, white columns, black planters and the gate (passage) as the entrance on the south side under an awning; three
louvre storeys of 1.2 wu; a recessed glass top floor with a white frame.
Gustav, 2026-10-16: white bands (0.2 wu, standing 0.04 wu proud of the slats) clearly apart from warm grey louvre bands over
dark windows (the all-white real slats read as all grey); one fin per 1 wu bay; no flag mast. Built and reviewed one side at
a time, south first.
Style + camera: ref/ref-A-gemini.png. Facts: ref/photo-6.jpg (straight front), photo-1..3 (from the bridge).
Colours: photo crops (material-crops/) through analyze_texture.py and extract_pbr_evidence.py (material-evidence/),
lifted into the sprite value band and kept flat. Nothing from the photos is projected onto the mesh.

Frame: 1 unit = 1 wu (one tile edge, ~2 m). +Y up, the pavement top at y = G, the 6 x 2 footprint centred on the
origin: X east (6 wu, -3..3), Z south (2 wu, -1..1). The south (+Z) and east (+X) sides face the default camera.
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
HX, HZ = 3.0, 1.0             # half footprint: 6 x 2 (Gustav, 2026-10-16: room for the street-level interior; was 4 x 2)


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
# Pavement pad (root): exactly the footprint, so the converter bbox starts at the footprint
C.append(comp("root", "Pavement", "macro", "base", "box", (2 * HX, G, 2 * HZ), (0, G / 2, 0), "paving", parent=None,
              importance=0.7, conf=0.95, sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "top of the pavement"}],
              features=lf("root.pad", "contour", f"{2 * HX:g} x {2 * HZ:g} wu pavement = the footprint (collision = footprint)"),
              topo="Flat pad: a box exactly the size of the footprint."))

# ---------------------------------------------------------------------------------------------------------------
# Ground storey (0 .. 1.4): shops behind an arcade on the south side, the gate passage in the east bay
SHOP_Z = 0.55      # shop glazing line (set back 0.45 behind the column line)
COL = 0.14         # column size
GB = HX - 1.0     # the gate bay is the east bay of the south side (x GB .. HX); the cafe bays fill the rest
GX0, GX1 = GB + 0.05, HX - 0.12   # gate passage between the shop block and the east end wall
DOOR_Z = -0.45     # the passage ends at the entrance door
PASS_H = 1.15      # passage clear height (door 1.0 + transom)
# The ground storey is a hollow shell (street-level interior, Figma 597-3604): the same outer faces as the solid shop
# block and lobby block it replaces, so the roof-on look does not change. "wall-<side>" stay on entry (cut low on the
# camera side), "front-S" and the gate pieces fade with the cafe front.
WT = 0.1           # shell wall thickness
bx("shop-core", "Shop front wall", "macro", "ground-storey", -HX, GB, 0, GS, SHOP_Z - 0.02, SHOP_Z, "white", importance=0.8,
   features=lf("shop-core.arcade", "contour", "ground storey set back behind the column line on the south side"),
   topo="Shop front wall behind the arcade: a thin box (the shop block is a hollow shell).")
bx("wall-N", "North wall", "macro", "ground-storey", -HX, HX, 0, GS, -HZ, -HZ + WT, "white", importance=0.6,
   topo="North wall of the ground-storey shell: a box.")
bx("wall-W", "West wall", "macro", "ground-storey", -HX, -HX + WT, 0, GS, -HZ + WT, SHOP_Z - 0.02, "white", importance=0.6,
   topo="West wall of the ground-storey shell: a box.")
bx("wall-E-back", "East wall behind the gate", "meso", "ground-storey", GX1, HX, 0, GS, -HZ + WT, DOOR_Z, "white", importance=0.6,
   topo="East wall north of the passage end: a box.")
bx("gate-back", "Passage end wall", "meso", "ground-storey", GB, GX1, 0, GS, DOOR_Z - 0.02, DOOR_Z, "white", importance=0.6,
   topo="End wall of the gate passage: a thin box (the lobby block behind it is hollow).")
bx("gate-east-wall", "Gate east wall", "meso", "ground-storey", GX1, HX, 0, GS, DOOR_Z, HZ, "white", importance=0.6,
   topo="East end wall of the passage, flush with the east facade: a box.")
bx("gate-lintel", "Gate lintel", "meso", "ground-storey", GB, GX1, PASS_H, GS, DOOR_Z, HZ, "white", importance=0.5)
bx("gate-void", "Gate passage floor", "meso", "entrance", GX0, GX1, 0, 0.01, DOOR_Z, HZ, "passage", contact="flush-mount", importance=0.85,
   features=lf("gate-void.passage", "contour", "dark passage through the ground storey: the entrance (1.0 wu wide incl. reveals)"),
   topo="Passage floor: a thin box; the walls are the brick reveals and the blocks around it.")
bx("gate-brick-w", "Gate brick lining (west)", "micro", "entrance", GB, GX0, 0, PASS_H, DOOR_Z, HZ - 0.05, "brick", importance=0.5,
   topo="Brick lining on the passage's west wall: a thin box.")
bx("gate-brick-e", "Gate brick lining (east)", "micro", "entrance", GX1 - 0.02, GX1, 0, PASS_H, DOOR_Z, HZ - 0.05, "brick", importance=0.5)
bx("gate-soffit", "Gate soffit", "micro", "entrance", GB, GX1, PASS_H - 0.02, PASS_H, DOOR_Z, HZ, "passage", importance=0.3)
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

# cafe bays: one per wu from the west corner to the gate bay; columns on the bay lines, shop glazing behind them
NCAFE = int(round(GB + HX))
BAYS = [(-HX + i, -HX + i + 1) for i in range(NCAFE)]
COLS = [-HX + COL / 2] + [-HX + i for i in range(1, NCAFE)] + [GB - COL / 2 + 0.02]
for i, x in enumerate(COLS, 1):
    bx(f"col-S-{i}", f"Column S{i}", "macro", "arcade", x - COL / 2, x + COL / 2, 0, GS, HZ - COL, HZ, "white", importance=0.6,
       features=lf(f"col-S-{i}.pier", "contour", "white square column on the facade line") if i == 1 else None,
       topo="Square white column: a box.")
for i, (b0, b1) in enumerate(BAYS, 1):
    x0, x1 = b0 + (COL if i == 1 else COL / 2), b1 - (COL if i == NCAFE else COL / 2)
    bx(f"shop-glass-S-{i}", f"Shop glazing S{i}", "meso", "glazing", x0 + 0.03, x1 - 0.03, 0.05, 1.12, SHOP_Z, SHOP_Z + 0.02,
       "shop-glass", importance=0.6, contact="flush-mount")
    bx(f"shop-light-S-{i}", f"Shop light band S{i}", "micro", "glazing", x0 + 0.08, x1 - 0.08, 0.72, 0.8, SHOP_Z + 0.02, SHOP_Z + 0.025,
       "warm-light", importance=0.35, contact="flush-mount",
       features=lf(f"shop-light-S-{i}.glow", "stain", "warm interior light behind the dark glazing") if i == 1 else None)
# west side: plain white wall, no windows, as on the east and north sides (Gustav, 2026-10-16)
# east side: plain white wall, no windows (Gustav, 2026-10-16)

# awnings: dark green, one per cafe bay, sloping from the glazing to the column line; the gate's awning projects 0.5 wu
for i, (x0, x1) in enumerate([(b0 + (COL if i == 0 else COL / 2) + 0.02, b1 - (COL if i == NCAFE - 1 else COL / 2) - 0.02)
                              for i, (b0, b1) in enumerate(BAYS)], 1):
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
for i, x in enumerate([(b0 + b1) / 2 for b0, b1 in BAYS], 1):
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
TX0, TX1, TZ0, TZ1 = -HX + 0.38, HX - 0.26, -0.7, 0.7
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

# ---------------------------------------------------------------------------------------------------------------
# Street-level interior, GREY BOX (Figma board "Valtech office - interior v1", 597-3604; space budget 601-3604).
# Plan tiles (lx, ly): x 0..4 west -> east, y 0 = north row, 1 = south row; model x = lx - HX, z = ly - HZ.
# 01 meeting room (0,0)+(0,1), look-in only; desks (1,0)+(2,0); lunch (3,0); walkable south row (1,1) (2,1) (3,1);
# main door = the gate mouth (south edge of (3,1)); the lit door on the passage west wall joins (3,1) and (2,1).
# Ids: "int-" interior part group (always shown, hidden inside the shell when the roof is on); "side-<N|W|E>-" wall
# mounted, hidden with their wall when that wall is cut; "open-" and "lowcap-<side>" shown only with the roof off.
def lx(v):
    return v - HX


def lz(v):
    return v - HZ


IN_X0, IN_X1, IN_Z0, IN_Z1 = -HX + WT, GX1, -HZ + WT, SHOP_Z - 0.02     # inside faces of the shell
bx("int-floor", "Interior floor (shop)", "macro", "interior", IN_X0, GB, 0, 0.01, IN_Z0, IN_Z1, "gb-floor", contact="flush-mount",
   importance=0.5, topo="Grey box floor: a thin box.")
bx("open-floor-lunch", "Interior floor (lunch, over the old passage end)", "meso", "interior", GB, IN_X1, 0.01, 0.016, IN_Z0, 0.0, "gb-floor",
   contact="flush-mount", importance=0.4)
# 01 meeting room: glass wall at lx 1, bench under the north wall, 2 poufs, whiteboard (west wall), screen (north wall)
GW = lx(1.0)
bx("int-01-glass", "01 glass wall", "meso", "interior", GW - 0.01, GW + 0.01, 0.01, GS, IN_Z0, IN_Z1, "gb-glass", importance=0.5)
for pid, z0, z1 in (("n", IN_Z0, IN_Z0 + 0.03), ("s", IN_Z1 - 0.03, IN_Z1)):
    bx(f"int-01-post-{pid}", f"01 glass wall post {pid}", "micro", "interior", GW - 0.015, GW + 0.015, 0.01, GS, z0, z1, "gb-dark", importance=0.3)
bx("int-01-head", "01 glass wall head", "micro", "interior", GW - 0.015, GW + 0.015, GS - 0.05, GS, IN_Z0, IN_Z1, "gb-dark", importance=0.3)
bx("int-01-bench", "01 bench", "meso", "interior", IN_X0 + 0.05, GW - 0.1, 0.01, 0.22, IN_Z0, IN_Z0 + 0.18, "gb", importance=0.4)
cyl("int-01-pouf-1", "01 pouf 1", "micro", "interior", lx(0.4), lz(0.7), 0.01, 0.2, 0.09, "gb-mid", importance=0.3)
cyl("int-01-pouf-2", "01 pouf 2", "micro", "interior", lx(0.7), lz(1.05), 0.01, 0.2, 0.09, "gb-mid", importance=0.3)
bx("side-W-01-whiteboard", "01 whiteboard", "meso", "interior", IN_X0, IN_X0 + 0.02, 0.4, 0.95, lz(0.45), lz(1.15), "gb-light", importance=0.4)
bx("side-N-01-screen", "01 screen", "meso", "interior", lx(0.25), lx(0.8), 0.5, 0.8, IN_Z0, IN_Z0 + 0.02, "gb-dark", importance=0.4)
# desk corner: three desks 0.6 x 0.4 at lx 1.05 / 1.70 / 2.35, ly 0.12..0.52, top at 0.375 wu (0.75 m), one chair each
DESK_H, DESK_X = 0.375, (1.05, 1.70, 2.35)
for i, x0 in enumerate(DESK_X, 1):
    a, b, z0, z1 = lx(x0), lx(x0 + 0.6), lz(0.12), lz(0.52)
    bx(f"int-desk-{i}-top", f"Desk {i} top", "meso", "interior", a, b, DESK_H - 0.03, DESK_H, z0, z1, "gb", importance=0.45)
    bx(f"int-desk-{i}-leg-w", f"Desk {i} leg (west)", "micro", "interior", a + 0.02, a + 0.05, 0.01, DESK_H - 0.03, z0 + 0.03, z1 - 0.03, "gb-mid", importance=0.3)
    bx(f"int-desk-{i}-leg-e", f"Desk {i} leg (east)", "micro", "interior", b - 0.05, b - 0.02, 0.01, DESK_H - 0.03, z0 + 0.03, z1 - 0.03, "gb-mid", importance=0.3)
    c = (a + b) / 2
    bx(f"int-chair-{i}-seat", f"Chair {i} seat", "micro", "interior", c - 0.11, c + 0.11, 0.01, 0.23, lz(0.58), lz(0.8), "gb-dark", importance=0.3)
    bx(f"int-chair-{i}-back", f"Chair {i} back", "micro", "interior", c - 0.11, c + 0.11, 0.23, 0.45, lz(0.77), lz(0.8), "gb-dark", importance=0.3)
# lunch: banquette along the north wall, two round tables d 0.38, quiz board above the banquette
bx("int-lunch-banquette", "Lunch banquette seat", "meso", "interior", GB + 0.06, IN_X1 - 0.02, 0.01, 0.22, IN_Z0, IN_Z0 + 0.2, "gb", importance=0.4)
bx("int-lunch-banquette-back", "Lunch banquette back", "micro", "interior", GB + 0.06, IN_X1 - 0.02, 0.22, 0.45, IN_Z0, IN_Z0 + 0.06, "gb", importance=0.3)
for i, x in enumerate((GB + 0.27, GB + 0.67), 1):
    cyl(f"int-lunch-table-{i}", f"Lunch table {i}", "micro", "interior", x, lz(0.55), DESK_H - 0.03, 0.03, 0.19, "gb", importance=0.35)
    cyl(f"int-lunch-table-{i}-foot", f"Lunch table {i} foot", "micro", "interior", x, lz(0.55), 0.016, DESK_H - 0.046, 0.03, "gb-mid", importance=0.2)
# quiz board on the north wall above the banquette (on the east wall it faced away from the camera; Gustav, 2026-10-16)
bx("side-N-lunch-quiz", "Quiz board", "meso", "interior", GB + 0.12, IN_X1 - 0.1, 0.55, 0.95, IN_Z0, IN_Z0 + 0.02, "gb-light", importance=0.35)
# roof off: low stubs on the passage west wall either side of the lit door's opening, and low caps on the cut walls
CUT = 0.35
bx("open-I-door-n", "Passage wall stub (north)", "micro", "interior", GB, GX0, 0.01, CUT, -0.02, DZ0 - 0.04, "gb", importance=0.3)
bx("open-I-door-s", "Passage wall stub (south)", "micro", "interior", GB, GX0, 0.01, CUT, DZ1 + 0.04, HZ - 0.05, "gb", importance=0.3)
bx("lowcap-N", "North wall cut", "micro", "interior", -HX, HX, 0, CUT, -HZ, -HZ + WT, "white", importance=0.3)
bx("lowcap-W", "West wall cut", "micro", "interior", -HX, -HX + WT, 0, CUT, -HZ + WT, SHOP_Z - 0.02, "white", importance=0.3)
bx("lowcap-E", "East wall cut", "micro", "interior", GX1, HX, 0, CUT, -HZ + WT, HZ, "white", importance=0.3)
# stand spots for the later peek cards (plan tiles, data only; lib/city/buildingInteriors.ts carries the same)
STAND_SPOTS = {"desk-1": (1.35, 1.5), "desk-2": (2.0, 1.5), "desk-3": (2.65, 1.5), "lunch": (3.5, 1.5), "room-01": (1.12, 1.5)}

# The beat sheet (2026-10-16) replaces the first furniture: one desk (his), meeting room 01, lunch; built below per variant
C = [c for c in C if not c["id"].startswith(("int-01", "int-desk", "int-chair", "int-lunch", "side-"))]
# ---------------------------------------------------------------------------------------------------------------
# Beats (Gustav's beat sheet, 2026-10-16), in walk order from the gate (east bay, street row): 1 enter at the gate,
# 2 my desk (by the window, two screens, a notebook, the edge of one neighbour desk), 3 meeting room 01 (yellow
# whiteboards with sticky notes, big "01" on the glass), 4 lunch farthest from the gate (round tables, banquette, Friday
# quiz board), 5 leave at the gate. Plan tiles: x west -> east, y north -> south; zones are (x0, x1, y0, y1) in tiles.
# Real sizes (1 wu = 2 m): desk 1.6 x 0.8 m, top 0.75 m; screen 0.56 x 0.36 m; chair 0.5 m, 0.8 m to pull out;
# round table 0.8 m; banquette seat 0.5 m deep, 0.45 m high, back 0.9 m; whiteboard 1.2 x 0.9 m; quiz board 1.0 x 0.7 m.
PW, PH = int(round(2 * HX)), int(round(2 * HZ))
# Zones west -> east in the north row: lunch (2 tiles), meeting room 01 (2 tiles), my desk, a neighbour desk; the street
# row is the walkway with a stand tile in front of each beat, the gate passage at the east end
LAY = {"lunch": (0, 2, 0, 1), "room": (2, 4, 0, 1), "desk": 4, "hint": 5, "stand": {"desk": (4, 1), "room": (3, 1), "lunch": (1, 1)},
       "map": ["######", "#OOOOG"]}


def px(v):
    return v - HX


def pz(v):
    return v - PH / 2


def pbx(cid, name, x0, x1, y0, y1, h0, h1, material, **kw):
    """Box in plan tiles (x0..x1 west -> east, y0..y1 north -> south) from height h0 to h1 (wu)."""
    bx(cid, name, "meso", "interior", px(x0), px(x1), h0, h1, pz(y0), pz(y1), material, importance=0.4, **kw)


WI = 0.1     # inside face of the outer walls, in tiles
# ---------------------------------------------------------------------------------------------------------------
# Kit pieces (detail pass, 2026-10-16): desk, chair and monitor, each built once around its own origin on the floor
# and placed with a yaw, so the later zones reuse them. Local frame: +z is the front (the side a person uses), y up.
# Real sizes (1 wu = 2 m): desk 1.6 x 0.8 m, top 0.75 m; 24 inch screen 0.54 x 0.32 m; task chair seat 0.47 m high.
# Colours: the written desk-corner reference (cloud thread, 2026-10-16): white sit-stand tops on grey steel T-legs, big
# black monitors on arms, a slim black lamp, light grey mesh chairs on five-star bases, polished concrete, pale yellow
# brick, tall windows in black steel frames with white louvres outside, a mustard planter with a big plant.
FLOOR = 0.01    # interior floor top (int-floor)


def yaw_xyz(yaw, tilt=0.0):
    """Euler XYZ angles (three.js default order) of Ry(yaw) * Rx(tilt): tilt about the piece's own x, then the yaw."""
    cy, sy, ct, st = math.cos(yaw), math.sin(yaw), math.cos(tilt), math.sin(tilt)
    m11, m12, m13 = cy, sy * st, sy * ct
    m22, m23 = ct, -st
    m33 = cy * ct
    y = math.asin(max(-1.0, min(1.0, m13)))
    if abs(m13) < 0.9999:
        return [math.atan2(-m23, m33), y, math.atan2(-m12, m11)]
    return [math.atan2(st, ct), y, 0.0]


class Kit:
    """Places parts in a piece's local frame: origin (plan tile x, plan tile y) on the floor, turned by yaw (radians,
    counter-clockwise seen from above; 0 = the front faces south)."""

    def __init__(self, prefix, name, tx, ty, yaw=0.0, base=FLOOR):
        self.p, self.n, self.ox, self.oz, self.yaw, self.base = prefix, name, px(tx), pz(ty), yaw, base

    def at(self, x, z):
        c, s = math.cos(self.yaw), math.sin(self.yaw)
        return self.ox + x * c + z * s, self.oz - x * s + z * c

    def box(self, part, label, x0, x1, y0, y1, z0, z1, material, *, tilt=0.0, spin=0.0, level="micro", importance=0.35):
        """Box from x0..x1, z0..z1 (local) and y0..y1 above the piece's base; tilt about local x, spin = extra yaw."""
        wx, wz = self.at((x0 + x1) / 2, (z0 + z1) / 2)
        a, b = G + self.base + y0, G + self.base + y1
        rot = yaw_xyz(self.yaw + spin, tilt)
        C.append(comp(f"{self.p}-{part}", f"{self.n}: {label}", level, "interior", "box", (x1 - x0, b - a, z1 - z0),
                      (wx, (a + b) / 2, wz), material, rot=rot, contact="resting", start=(wx, a, wz), end=(wx, b, wz),
                      importance=importance))

    def cyl(self, part, label, x, z, y0, h, r, material, *, level="micro", importance=0.3):
        wx, wz = self.at(x, z)
        cyl(f"{self.p}-{part}", f"{self.n}: {label}", level, "interior", wx, wz, self.base + y0, h, r, material, importance=importance)

    def ell(self, part, label, x, y, z, rx, ry, rz, material, *, spin=0.0, tilt=0.0, importance=0.3):
        wx, wz = self.at(x, z)
        cy_ = G + self.base + y
        C.append(comp(f"{self.p}-{part}", f"{self.n}: {label}", "micro", "interior", "ellipsoid", (2 * rx, 2 * ry, 2 * rz),
                      (wx, cy_, wz), material, rot=yaw_xyz(self.yaw + spin, tilt), contact="resting",
                      start=(wx, cy_ - ry, wz), end=(wx, cy_ + ry, wz), importance=importance))


DESK_W, DESK_D, DESK_T = 0.8, 0.4, 0.016


def kit_desk(prefix, name, tx, ty, yaw=0.0, *, top_from=-DESK_W / 2, top_to=DESK_W / 2, legs=(-1, 1)):
    """Sit-stand desk, 1.6 x 0.8 m: white top, grey steel T-legs (telescoping column, foot and top rail along the depth),
    a beam between the columns and a black cable tray under the back edge. top_from / top_to cut the top's ends (the edge of
    a neighbour desk that runs on behind a wall); legs: which T-legs to build (-1 west, 1 east)."""
    k = Kit(prefix, name, tx, ty, yaw)
    hw, hd, H = DESK_W / 2, DESK_D / 2, DESK_H
    k.box("top", "top (white)", top_from, top_to, H - DESK_T, H, -hd, hd, "desk-white", level="meso", importance=0.5)
    for s in legs:
        x = s * (hw - 0.09)
        tag = "w" if s < 0 else "e"
        k.box(f"foot-{tag}", f"foot ({tag})", x - 0.016, x + 0.016, 0, 0.022, -hd + 0.02, hd - 0.02, "steel")
        k.box(f"col-{tag}", f"column, lower ({tag})", x - 0.022, x + 0.022, 0.022, 0.2, -0.03, 0.03, "steel")
        k.box(f"col-up-{tag}", f"column, upper ({tag})", x - 0.017, x + 0.017, 0.2, H - DESK_T - 0.014, -0.024, 0.024, "steel")
        k.box(f"rail-{tag}", f"top rail ({tag})", x - 0.018, x + 0.018, H - DESK_T - 0.014, H - DESK_T, -hd + 0.03, hd - 0.03, "steel")
    if len(legs) == 2:
        k.box("beam", "beam", -hw + 0.09, hw - 0.09, H - DESK_T - 0.03, H - DESK_T - 0.008, -0.012, 0.012, "steel")
        k.box("tray", "cable tray", -hw + 0.14, hw - 0.14, H - DESK_T - 0.05, H - DESK_T - 0.01, -hd + 0.03, -hd + 0.09, "black")
    return k


def kit_chair(prefix, name, tx, ty, yaw=0.0):
    """Task chair facing -z (the person looks at local -z), as in the desk-corner photo: silver five-star base on casters,
    gas column, blue-grey seat, black mesh back in a white frame, white armrests with black pads."""
    k = Kit(prefix, name, tx, ty, yaw)
    for i in range(5):
        a = math.radians(18 + 72 * i)
        ca, sa = math.cos(a), math.sin(a)
        cx, cz = 0.08 * ca, -0.08 * sa
        k.box(f"leg-{i + 1}", f"base leg {i + 1}", cx - 0.08, cx + 0.08, 0.018, 0.034, cz - 0.011, cz + 0.011, "chair-base", spin=a)
        k.cyl(f"caster-{i + 1}", f"caster {i + 1}", 0.155 * ca, -0.155 * sa, 0.0, 0.018, 0.011, "black")
    k.cyl("hub", "base hub", 0, 0, 0.012, 0.03, 0.022, "chair-base")
    k.cyl("gas", "gas column", 0, 0, 0.04, 0.17, 0.013, "steel")
    k.box("mech", "seat mechanism", -0.05, 0.05, 0.19, 0.212, -0.05, 0.05, "black")
    k.box("seat", "seat (blue-grey)", -0.12, 0.12, 0.212, 0.24, -0.115, 0.11, "chair-seat", level="meso", importance=0.45)
    k.box("seat-edge", "seat front edge", -0.12, 0.12, 0.205, 0.235, -0.125, -0.105, "chair-frame")
    k.box("spine", "back spine", -0.022, 0.022, 0.2, 0.32, 0.1, 0.125, "chair-frame")
    k.box("back", "back (black mesh)", -0.105, 0.105, 0.28, 0.51, 0.12, 0.135, "chair-mesh", tilt=0.17, level="meso", importance=0.45)
    k.box("back-frame", "back frame (top)", -0.12, 0.12, 0.505, 0.53, 0.155, 0.18, "chair-frame", tilt=0.17)
    for s_, tag in ((-1, "w"), (1, "e")):     # white side rails of the back frame
        k.box(f"back-rail-{tag}", f"back frame ({tag})", s_ * 0.115 - 0.01, s_ * 0.115 + 0.01, 0.27, 0.52, 0.115, 0.14, "chair-frame", tilt=0.17)
    for s, tag in ((-1, "w"), (1, "e")):
        x = s * 0.115
        k.box(f"arm-post-{tag}", f"armrest post ({tag})", x - 0.007, x + 0.007, 0.235, 0.33, 0.025, 0.045, "chair-frame")
        k.box(f"arm-pad-{tag}", f"armrest pad ({tag})", x - 0.012, x + 0.012, 0.33, 0.342, -0.055, 0.055, "black")
    return k


def kit_monitor(prefix, name, tx, ty, base, yaw=0.0, *, size=(0.27, 0.16)):
    """Black monitor on an arm hub, screen to local +z: body, the display (case image texture in valtechOfficeDetail.ts:
    the "-display" part) and the VESA hub behind. base = height of the screen's lower edge above the floor."""
    k = Kit(prefix, name, tx, ty, yaw, base=FLOOR + base)
    w, h = size
    k.box("body", "body", -w / 2, w / 2, 0, h, -0.014, 0.0, "monitor", importance=0.45)
    k.box("display", "display", -w / 2 + 0.006, w / 2 - 0.006, 0.008, h - 0.006, 0.0, 0.003, "screen", importance=0.5)
    k.box("hub", "VESA hub", -0.03, 0.03, h / 2 - 0.03, h / 2 + 0.03, -0.03, -0.014, "monitor")
    return k


# 2 my desk (Gustav's beat sheet; detail pass 2026-10-16): one desk by the window under the north wall, two screens on
# one arm (two fields at a time), a notebook, keyboard, mug, a slim lamp, the mustard planter at the window end (the hero
# accent of the zone, as in the real desk corner) and the edge of one neighbour desk. Yellow brick piers either side of a
# tall window in a black steel frame, white louvres outside it at the exterior slat pitch (SLP); the outside wall stays
# plain white (approved). Stand tile: (4, 1).
t = LAY["desk"]
DX0, DX1 = t + 0.36, t + 1.16                 # desk top, west -> east (it runs a little into the neighbour tile)
DCX, DZB = (DX0 + DX1) / 2, WI + 0.02         # desk centre x, back edge (0.04 m off the wall)
DCZ = DZB + DESK_D / 2
BR = WI + 0.012                               # brick face (lining on the inside face of the north wall)
WX0, WX1 = t + 0.4, t + 1.12                  # window opening between the brick piers
WY0, WY1 = 0.14, 1.3
pbx("side-N-desk-brick-w", "Yellow brick pier (west of my window)", t, WX0, WI, BR, 0.0, GS, "brick-yellow")
pbx("side-N-desk-brick-e", "Yellow brick wall (east of my window)", WX1, IN_X1 + HX, WI, BR, 0.0, GS, "brick-yellow")
pbx("side-N-desk-brick-sill", "Yellow brick under my window", WX0, WX1, WI, BR, 0.0, WY0, "brick-yellow")
pbx("side-N-desk-brick-head", "Yellow brick over my window", WX0, WX1, WI, BR, WY1, GS, "brick-yellow")
pbx("side-N-desk-win-glass", "Window glass", WX0, WX1, WI, WI + 0.004, WY0, WY1, "window-glass")
for i in range(int((WY1 - WY0 - 0.06) / SLP) + 1):        # white louvres outside, seen through the glass
    y = WY0 + 0.06 + i * SLP
    pbx(f"side-N-desk-win-louvre-{i + 1}", f"Louvre outside my window {i + 1}", WX0, WX1, WI + 0.004, WI + 0.006, y, y + SLT, "frame-white")
F_ = 0.022                                    # black steel frame: sill, head, jambs, one mullion and a transom
pbx("side-N-desk-win-sill", "Window frame (sill)", WX0, WX1, WI, BR + 0.012, WY0, WY0 + F_, "frame-black")
pbx("side-N-desk-win-head", "Window frame (head)", WX0, WX1, WI, BR + 0.006, WY1 - F_, WY1, "frame-black")
pbx("side-N-desk-win-jamb-w", "Window frame (west jamb)", WX0, WX0 + F_, WI, BR + 0.006, WY0, WY1, "frame-black")
pbx("side-N-desk-win-jamb-e", "Window frame (east jamb)", WX1 - F_, WX1, WI, BR + 0.006, WY0, WY1, "frame-black")
pbx("side-N-desk-win-mullion", "Window frame (mullion)", (WX0 + WX1) / 2 - 0.01, (WX0 + WX1) / 2 + 0.01, WI, BR + 0.004, WY0, WY1, "frame-black")
pbx("side-N-desk-win-transom", "Window frame (transom)", WX0, WX1, WI, BR + 0.004, 1.0, 1.0 + 0.016, "frame-black")
kit_desk("int-desk", "My desk", DCX, DCZ)
# two screens on one dual arm from a pole at the back edge, angled in a little towards the chair
pole_x, pole_z = DCX, DZB + 0.03
cyl("int-desk-arm-pole", "Monitor arm pole", "micro", "interior", px(pole_x), pz(pole_z), FLOOR + DESK_H, 0.26, 0.009, "monitor", importance=0.3)
pbx("int-desk-arm-clamp", "Monitor arm clamp", pole_x - 0.02, pole_x + 0.02, pole_z - 0.02, pole_z + 0.02, FLOOR + DESK_H, FLOOR + DESK_H + 0.02, "monitor")
for i, (sx, yw) in enumerate(((-0.145, 0.16), (0.145, -0.16)), 1):
    mx, mz = DCX + sx, DZB + 0.09 + 0.02 * abs(math.sin(yw))
    pbx(f"int-desk-arm-{i}", f"Monitor arm {i}", min(pole_x, mx), max(pole_x, mx), pole_z - 0.008, mz - 0.02,
        FLOOR + DESK_H + 0.174, FLOOR + DESK_H + 0.188, "monitor")
    kit_monitor(f"int-desk-screen-{i}", f"Screen {i}", mx, mz, DESK_H + 0.1, yw)
# on the top: keyboard, mouse, the notebook with a pen, a white mug
pbx("int-desk-keyboard", "Keyboard", DCX - 0.11, DCX + 0.07, DZB + 0.24, DZB + 0.3, FLOOR + DESK_H, FLOOR + DESK_H + 0.007, "black")
pbx("int-desk-mouse", "Mouse", DCX + 0.11, DCX + 0.13, DZB + 0.25, DZB + 0.285, FLOOR + DESK_H, FLOOR + DESK_H + 0.009, "black")
nb = Kit("int-desk-notebook", "Notebook", DCX + 0.25, DZB + 0.27, 0.3, base=FLOOR + DESK_H)
nb.box("pages", "pages", -0.052, 0.052, 0, 0.008, -0.073, 0.073, "paper")
nb.box("cover", "cover (black)", -0.054, 0.054, 0.008, 0.011, -0.075, 0.075, "notebook")
nb.box("band", "elastic band", 0.03, 0.036, 0.0, 0.012, -0.076, 0.076, "black")
nb.box("pen", "pen", 0.065, 0.073, 0, 0.008, -0.06, 0.07, "steel")
cyl("int-desk-mug", "Mug", "micro", "interior", px(DX0 + 0.09), pz(DZB + 0.3), FLOOR + DESK_H, 0.045, 0.02, "paper", importance=0.3)
# slim black desk lamp at the east back corner: a straight stem and a flat round head (desk-corner photo)
lamp = Kit("int-desk-lamp", "Desk lamp", DX1 - 0.07, DZB + 0.06, 0.0, base=FLOOR + DESK_H)
lamp.cyl("base", "base", 0, 0, 0, 0.006, 0.03, "black")
lamp.cyl("stem", "stem", 0, 0, 0.006, 0.27, 0.004, "black")
lamp.cyl("head", "head", 0, 0.012, 0.276, 0.007, 0.038, "black")
# my chair, pulled out and turned a little, as if I just got up
kit_chair("int-desk-chair", "My chair", DCX - 0.04, DZB + 0.62, -0.22)
# bags on the floor by the east leg (desk-corner photo): a black laptop bag lying down, a backpack leaning on the leg
bag = Kit("int-desk-bag", "Laptop bag", DX1 - 0.02, DZB + 0.5, -0.5)
bag.box("body", "body", -0.085, 0.085, 0, 0.045, -0.06, 0.06, "bag")
bag.box("strap", "strap", -0.07, -0.05, 0.045, 0.05, -0.065, 0.065, "bag-dark")
pack = Kit("int-desk-pack", "Backpack", DX1 - 0.09, DZB + 0.3, 0.3)
pack.box("body", "body", -0.06, 0.06, 0, 0.17, -0.03, 0.03, "bag", tilt=-0.18)
pack.box("pocket", "front pocket", -0.045, 0.045, 0.02, 0.09, 0.025, 0.045, "bag-dark", tilt=-0.18)
# the mustard planter at the window end: the hero accent of the zone. Desk-corner photo: a wide low yellow bowl on a
# dark round ledge, long upright blade leaves (an aspidistra) fanning out of it
pl = Kit("int-desk-planter", "Mustard planter", t + 0.17, WI + 0.2, 0.0)
pl.cyl("ledge", "ledge (dark)", 0, 0, 0, 0.07, 0.15, "black")
pl.cyl("pot", "bowl (mustard)", 0, 0, 0.07, 0.1, 0.14, "mustard", importance=0.6)
pl.cyl("rim", "bowl rim", 0, 0, 0.165, 0.008, 0.142, "mustard-dark", importance=0.4)
pl.cyl("soil", "soil", 0, 0, 0.17, 0.004, 0.13, "soil")
for i in range(13):
    a = 2.39996 * i                          # golden-angle spread round the bowl
    tlt = 0.25 + 0.35 * ((i * 7) % 5) / 4    # 0.25 .. 0.6 rad out from upright
    ln = 0.15 + 0.06 * ((i * 3) % 4) / 3     # half length 0.15 .. 0.21 wu (0.6 .. 0.84 m leaves)
    r0 = 0.03 + 0.05 * (i % 3) / 2
    dx, dz = math.sin(a), math.cos(a)
    pl.ell(f"leaf-{i + 1}", f"leaf {i + 1}", dx * (r0 + ln * math.sin(tlt)), 0.17 + ln * math.cos(tlt), dz * (r0 + ln * math.sin(tlt)),
           0.032, ln, 0.008, "plant-dark" if i % 3 else "plant-mid", spin=a, tilt=tlt)
# the edge of one neighbour desk: its west end runs on behind the gate passage wall
h = LAY["hint"]
kit_desk("int-hint-desk", "Neighbour desk (edge)", h + 0.66, DCZ, top_from=-0.4, top_to=IN_X1 + HX - (h + 0.66) - 0.005, legs=(-1,))
# polished concrete floor (warm beige, the reference floor) instead of the grey box floor
for c in C:
    if c["id"] in ("int-floor", "open-floor-lunch"):
        c["material"], c["materialLayers"] = "concrete", ["concrete"]
# 3 meeting room 01 (detail pass, 2026-10-17; matched to Gustav's photo of the room): yellow brick with three tall,
# narrow, glossy mustard boards (the zone's hero; a few sticky notes, as in the beat sheet), a tall window with white
# louvres and a dark grey bench under it, a big screen in a mustard frame hanging from the ceiling just inside the
# glass, poufs (grey, mustard, grey), small black side tables, black high stools by the boards, and nearly frameless
# glass with a huge white "01" (a texture, valtechOfficeDetail.ts).
rx0, rx1, ry0, ry1 = LAY["room"]
gy1 = ry1    # south glass line (the walkway edge)
if rx0 > 0:
    pbx("int-room-glass-w", "01 glass (west)", rx0 - 0.006, rx0 + 0.006, WI, gy1, 0.01, GS, "gb-glass")
if rx1 < PW:
    pbx("int-room-glass-e", "01 glass (east)", rx1 - 0.006, rx1 + 0.006, WI, gy1, 0.01, GS, "gb-glass")
pbx("int-room-glass-s", "01 glass (south)", rx0 + 0.01, rx1 - 0.01, gy1 - 0.012, gy1, 0.01, GS, "gb-glass")
# slim black edges only: base and head rails, the corner posts and the door's long steel handle
pbx("int-room-frame-head", "01 frame (head)", rx0 - 0.008, rx1 + 0.008, gy1 - 0.016, gy1 + 0.004, GS - 0.025, GS, "frame-black")
pbx("int-room-frame-base", "01 frame (base)", rx0 - 0.008, rx1 + 0.008, gy1 - 0.016, gy1 + 0.004, 0.01, 0.03, "frame-black")
for k, x in enumerate((rx0, rx1), 1):
    pbx(f"int-room-frame-post-{k}", f"01 frame corner {k}", x - 0.008, x + 0.008, gy1 - 0.016, gy1 + 0.004, 0.01, GS, "frame-black")
    if 0 < x < PW:
        pbx(f"int-room-frame-side-{k}", f"01 frame (side {k}, head)", x - 0.008, x + 0.008, WI, gy1, GS - 0.025, GS, "frame-black")
pbx("int-room-door-handle", "01 door handle", rx0 + 0.42, rx0 + 0.43, gy1 + 0.004, gy1 + 0.03, 0.3, 0.8, "steel")
cx = (rx0 + rx1) / 2
# the huge white "01": a decal plane just outside the south glass (texture in valtechOfficeDetail.ts)
pbx("int-room-01-number", "01 on the glass (decal)", cx - 0.4, cx + 0.4, gy1 + 0.001, gy1 + 0.003, 0.12, 0.98, "decal")
# yellow brick on the inside of the north wall; three narrow mustard boards on the west part, a window on the east part
pbx("side-N-room-brick", "Yellow brick (meeting room 01)", rx0, rx1, WI, WI + 0.012, 0.0, GS, "brick-yellow")
NOTE_C = ("paper", "note-pink", "note-blue", "note-orange")
for i in range(3):
    b0 = rx0 + 0.08 + i * 0.37
    pbx(f"side-N-room-wb-{i + 1}", f"01 board {i + 1} (mustard glass)", b0, b0 + 0.32, WI + 0.012, WI + 0.026, 0.2, 1.12, "board-mustard")
    pbx(f"side-N-room-wb-{i + 1}-rail", f"01 board {i + 1} rail", b0 + 0.335, b0 + 0.35, WI + 0.012, WI + 0.03, 0.0, 1.3, "steel")
    for j in range(4):        # a few sticky notes per board, as in the beat sheet (the photo shows clean boards)
        nx = b0 + 0.05 + ((j * 0.11 + i * 0.04) % 0.2)
        ny = 0.62 + 0.1 * ((j * 3 + i) % 4)
        pbx(f"side-N-room-wb-{i + 1}-note-{j + 1}", f"Sticky note {i + 1}.{j + 1}", nx, nx + 0.045, WI + 0.026, WI + 0.03, ny, ny + 0.045,
            NOTE_C[(j + i) % len(NOTE_C)])
RW0, RW1 = rx0 + 1.24, rx1 - 0.06              # the window
pbx("side-N-room-win-glass", "01 window glass", RW0, RW1, WI + 0.012, WI + 0.016, 0.42, 1.3, "window-glass")
for k in range(int((1.3 - 0.48) / SLP) + 1):
    y = 0.48 + k * SLP
    pbx(f"side-N-room-win-louvre-{k + 1}", f"01 window louvre {k + 1}", RW0, RW1, WI + 0.016, WI + 0.018, y, y + SLT, "frame-white")
for part, a, b, h0, h1 in (("sill", RW0 - 0.02, RW1 + 0.02, 0.4, 0.43), ("head", RW0, RW1, 1.28, 1.3),
                           ("jamb-w", RW0, RW0 + 0.018, 0.42, 1.3), ("jamb-e", RW1 - 0.018, RW1, 0.42, 1.3)):
    pbx(f"side-N-room-win-{part}", f"01 window frame ({part})", a, b, WI + 0.012, WI + 0.03, h0, h1, "frame-white" if part == "sill" else "frame-black")
# the dark grey bench under the window, a small black side table in front of it
pbx("int-room-bench", "01 bench (dark grey)", RW0 - 0.1, RW1, WI + 0.02, WI + 0.24, 0.01, 0.22, "bench-grey")
pbx("int-room-bench-back", "01 bench back", RW0 - 0.1, RW1, WI + 0.02, WI + 0.07, 0.22, 0.38, "bench-grey")
for k, (x, y) in enumerate(((RW0 + 0.05, WI + 0.42), (RW0 + 0.42, WI + 0.42)), 1):
    tb = Kit(f"int-room-table-{k}", f"Side table {k}", x, y, 0.0)
    tb.cyl("top", "top", 0, 0, 0.26, 0.012, 0.075, "black")
    tb.cyl("stem", "stem", 0, 0, 0.012, 0.25, 0.008, "black")
    tb.cyl("foot", "foot", 0, 0, 0, 0.012, 0.05, "black")
# the big screen in a mustard frame, hanging from the ceiling just inside the south glass, facing out to the walkway
scr = Kit("int-room-screen", "01 screen (hanging)", rx1 - 0.42, gy1 - 0.12, 0.0)
scr.box("frame", "frame (mustard)", -0.3, 0.3, 0.62, 1.0, -0.025, 0.0, "mustard")
scr.box("display", "display", -0.28, 0.28, 0.64, 0.98, 0.0, 0.003, "screen")
for q, x in enumerate((-0.2, 0.2), 1):
    scr.box(f"rod-{q}", f"ceiling rod {q}", x - 0.004, x + 0.004, 1.0, GS, -0.016, -0.008, "steel")
# poufs: grey, mustard, grey, in a loose row; two black high stools by the boards
for k, (x, y, r, m) in enumerate(((rx0 + 0.72, WI + 0.58, 0.09, "pouf-grey"), (rx0 + 0.95, WI + 0.68, 0.09, "pouf-mustard"),
                                   (rx0 + 1.36, WI + 0.62, 0.09, "pouf-grey")), 1):
    cyl(f"int-room-pouf-{k}", f"Pouf {k}", "micro", "interior", px(x), pz(y), FLOOR, 0.19, r, m, importance=0.4)
    cyl(f"int-room-pouf-{k}-top", f"Pouf {k} top seam", "micro", "interior", px(x), pz(y), FLOOR + 0.19, 0.008, r * 0.94, m, importance=0.2)
for k, (x, y) in enumerate(((rx0 + 0.18, WI + 0.42), (rx0 + 0.42, WI + 0.36)), 1):
    st = Kit(f"int-room-stool-{k}", f"High stool {k}", x, y, 0.3 * k)
    st.cyl("seat", "seat", 0, 0, 0.36, 0.022, 0.07, "black")
    for q, (lx_, lz_) in enumerate(((-0.045, -0.045), (0.045, -0.045), (0.045, 0.045), (-0.045, 0.045)), 1):
        st.box(f"leg-{q}", f"leg {q}", lx_ - 0.006, lx_ + 0.006, 0, 0.36, lz_ - 0.006, lz_ + 0.006, "black")
    st.box("ring", "foot ring", -0.05, 0.05, 0.14, 0.148, -0.05, 0.05, "black")
# 4 lunch (detail pass, 2026-10-17; written reference of the real lunch area): yellow brick on the north and west
# walls, two tan banquettes along them with a planter in the corner and a planter trough on the north banquette's back,
# round white tables and a black square table, black chairs with light wood seats, a big screen on the west brick wall,
# and the Friday quiz board (black chalkboard in a mustard frame: the zone's hero; its text is a texture).
lx0, lx1, ly0, ly1 = LAY["lunch"]


def kit_dining_chair(prefix, name, tx, ty, yaw=0.0):
    """Dining chair facing local -z: black steel legs and back posts, a light wood seat and back rail."""
    k = Kit(prefix, name, tx, ty, yaw)
    for q, (x, z) in enumerate(((-0.085, -0.08), (0.085, -0.08), (0.085, 0.08), (-0.085, 0.08)), 1):
        k.box(f"leg-{q}", f"leg {q}", x - 0.007, x + 0.007, 0, 0.225, z - 0.007, z + 0.007, "black")
    k.box("seat", "seat (light wood)", -0.1, 0.1, 0.225, 0.243, -0.095, 0.095, "wood-light", importance=0.4)
    for q, x in enumerate((-0.085, 0.085), 1):
        k.box(f"post-{q}", f"back post {q}", x - 0.007, x + 0.007, 0.243, 0.42, 0.08, 0.094, "black")
    k.box("back", "back rail (light wood)", -0.1, 0.1, 0.34, 0.42, 0.082, 0.1, "wood-light", importance=0.4)
    return k


pbx("side-N-lunch-brick", "Yellow brick (lunch, north)", lx0, lx1, WI, WI + 0.012, 0.0, GS, "brick-yellow")
pbx("side-W-lunch-brick", "Yellow brick (lunch, west)", WI, WI + 0.012, WI + 0.012, IN_Z1 + HZ, 0.0, GS, "brick-yellow")
# the two tan banquettes: along the north wall and along the west wall, meeting at a corner planter
BQ = 0.25
pbx("int-lunch-banquette-n", "Banquette (north, tan)", WI + 0.3, lx1 - 0.06, WI + 0.012, WI + BQ, 0.01, 0.22, "leather-tan")
pbx("int-lunch-banquette-n-back", "Banquette back (north)", WI + 0.3, lx1 - 0.06, WI + 0.012, WI + 0.07, 0.22, 0.44, "leather-tan")
pbx("int-lunch-banquette-w", "Banquette (west, tan)", WI + 0.012, WI + BQ, WI + 0.3, 1.4, 0.01, 0.22, "leather-tan")
pbx("int-lunch-banquette-w-back", "Banquette back (west)", WI + 0.012, WI + 0.07, WI + 0.3, 1.4, 0.22, 0.44, "leather-tan")
for part, (a, b, c, d) in (("n", (WI + 0.3, lx1 - 0.06, WI + 0.012, WI + 0.02)), ("w", (WI + 0.012, WI + 0.02, WI + 0.3, 1.4))):
    pbx(f"int-lunch-banquette-{part}-base", f"Banquette plinth ({part})", a, b, c, d, 0.0, 0.03, "black")
# planters: a black box in the corner, a slim trough on the north banquette's back; low-poly blade leaves
pc = Kit("int-lunch-planter", "Lunch corner planter", WI + 0.15, WI + 0.15, 0.0)
pc.box("box", "box (black)", -0.13, 0.13, 0, 0.44, -0.13, 0.13, "black")
pc.cyl("soil", "soil", 0, 0, 0.44, 0.004, 0.11, "soil")
for q in range(9):
    a = 2.39996 * q
    tlt, ln = 0.3 + 0.3 * ((q * 7) % 5) / 4, 0.12 + 0.04 * ((q * 3) % 4) / 3
    dx, dz = math.sin(a), math.cos(a)
    pc.ell(f"leaf-{q + 1}", f"leaf {q + 1}", dx * (0.03 + ln * math.sin(tlt)), 0.44 + ln * math.cos(tlt), dz * (0.03 + ln * math.sin(tlt)),
           0.028, ln, 0.008, "plant-dark" if q % 3 else "plant-mid", spin=a, tilt=tlt)
pt = Kit("int-lunch-trough", "Planter trough on the banquette back", (WI + 0.3 + lx1 - 0.06) / 2, WI + 0.045, 0.0, base=FLOOR + 0.43)
pt.box("box", "trough (black)", -0.6, 0.6, 0, 0.06, -0.03, 0.03, "black")
for q in range(7):
    x = -0.5 + q * (1.0 / 6)
    pt.ell(f"leaf-{q + 1}", f"trough plant {q + 1}", x, 0.1, 0.0, 0.07, 0.06, 0.035, "plant-mid" if q % 2 else "plant-dark", spin=0.5 * q)
# round white tables in front of the north banquette, a black square table in front of the west one
for q, x in enumerate((lx0 + 0.75, lx0 + 1.42), 1):
    tb = Kit(f"int-lunch-round-{q}", f"Round table {q} (white)", x, WI + 0.52, 0.0)
    tb.cyl("top", "top (white)", 0, 0, DESK_H - 0.015, 0.015, 0.17, "desk-white", importance=0.45)
    tb.cyl("stem", "stem (black)", 0, 0, 0.012, DESK_H - 0.027, 0.014, "black")
    tb.cyl("foot", "foot (black)", 0, 0, 0, 0.012, 0.1, "black")
    kit_dining_chair(f"int-lunch-chair-r{q}", f"Chair at round table {q}", x + 0.04 * (q - 1.5), WI + 0.85, 0.15 * (1.5 - q))
sq = Kit("int-lunch-square", "Square table (black)", WI + 0.47, 1.12, 0.0)
sq.box("top", "top (black)", -0.17, 0.17, DESK_H - 0.016, DESK_H, -0.17, 0.17, "black", importance=0.45)
for q, (x, z) in enumerate(((-0.15, -0.15), (0.15, -0.15), (0.15, 0.15), (-0.15, 0.15)), 1):
    sq.box(f"leg-{q}", f"leg {q}", x - 0.009, x + 0.009, 0, DESK_H - 0.016, z - 0.009, z + 0.009, "black")
kit_dining_chair("int-lunch-chair-s1", "Chair at the square table (east)", WI + 0.8, 1.1, math.pi / 2 + 0.1)
kit_dining_chair("int-lunch-chair-s2", "Chair at the square table (south)", WI + 0.5, 1.45, -0.08)
# the big screen on the west brick wall, above the banquette, facing into the room
pbx("side-W-lunch-tv", "Big screen (west wall)", WI + 0.012, WI + 0.04, 0.5, 1.08, 0.62, 0.95, "monitor")
pbx("side-W-lunch-tv-display", "Big screen display", WI + 0.04, WI + 0.043, 0.52, 1.06, 0.64, 0.93, "screen-dark")
# the Friday quiz board, the hero: a black chalkboard in a mustard frame on the north wall above the banquette
QX0, QX1 = lx0 + 0.72, lx0 + 1.5
pbx("side-N-lunch-quiz-frame", "Friday quiz board frame (mustard)", QX0 - 0.03, QX1 + 0.03, WI + 0.012, WI + 0.03, 0.66, 1.24, "mustard")
pbx("side-N-lunch-quiz-board", "Friday quiz board (chalkboard)", QX0, QX1, WI + 0.03, WI + 0.034, 0.69, 1.21, "chalkboard")
pbx("side-N-lunch-quiz-ledge", "Chalk ledge", QX0, QX1, WI + 0.03, WI + 0.06, 0.66, 0.675, "mustard-dark")
STAND_SPOTS = {k: (v[0] + 0.5, v[1] + 0.5) for k, v in LAY["stand"].items()}
STAND_SPOTS["gate"] = (PW - 0.5, PH - 0.5)
WALKMAP = LAY["map"]

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
    # interior grey box: neutral greys only, no detail (the detail pass comes later)
    material("gb-floor", "Grey box floor", "stone", "#d9d6cf", ["#d1cec7"], 0.9, 0.0, "interior floor", **flat("grey box")),
    material("gb", "Grey box", "stone", "#bdbab4", ["#b5b2ac"], 0.9, 0.0, "furniture blocks", **flat("grey box")),
    material("gb-mid", "Grey box mid", "stone", "#9a9792", ["#928f8a"], 0.9, 0.0, "legs, poufs", **flat("grey box")),
    material("gb-dark", "Grey box dark", "stone", "#6c6a67", ["#64625f"], 0.9, 0.0, "chairs, screen, glass frame", **flat("grey box")),
    material("gb-light", "Grey box light", "stone", "#ecebe7", ["#e4e3df"], 0.9, 0.0, "boards on the walls", **flat("grey box")),
    material("gb-yellow", "Grey box yellow", "plastic", "#e6c84a", ["#dcbe40"], 0.8, 0.0, "01 whiteboards (yellow, as in the office)", **flat("grey box")),
    material("gb-window", "Grey box window", "glass", "#c9d6dc", ["#bfccd2"], 0.3, 0.0, "window panel by my desk (inside face)", **flat("grey box")),
    material("gb-glass", "Grey box glass", "glass", "#b7cdd6", ["#adc3cc"], 0.2, 0.0, "01 glass wall (see-through)", opacity={"base": 0.3},
             **flat("grey box")),
    # detail pass, desk zone (2026-10-16): colours from the written desk-corner reference, lifted into the sprite value band
    # like the exterior; brick, concrete and the screen images are textures added in lib/city/models/valtechOfficeDetail.ts
    material("concrete", "Polished concrete floor", "stone", "#c2b498", ["#b8aa8e"], 0.35, 0.0, "warm beige polished concrete (ref ~#b1a286)",
             **flat("desk-corner reference: polished concrete")),
    material("brick-yellow", "Pale yellow brick", "stone", "#d3b784", ["#c9ad7a"], 0.9, 0.0, "pale sandy yellow brick, lighter mortar (ref ~#c9ab78)",
             **flat("desk-corner reference: yellow brick walls")),
    material("window-glass", "Window glass (north)", "glass", "#7f95a3", ["#778d9b"], 0.2, 0.0, "daylight through the tall north window",
             **flat("desk-corner reference: tall windows")),
    material("frame-black", "Black steel frame", "metal", "#1d1e20", ["#18191b"], 0.5, 0.3, "window and glass-wall frames", **flat("reference: black steel")),
    material("desk-white", "Desk top", "plastic", "#ecebe8", ["#e2e1de"], 0.6, 0.0, "white sit-stand desk top (ref ~#e6e6e3)",
             emissiveIntensity={"base": 0.4}, **flat("desk-corner reference: white tops")),
    material("steel", "Grey steel", "metal", "#767d80", ["#6e7578"], 0.5, 0.4, "T-legs, gas column, pen (ref ~#6b7275)", **flat("reference: grey steel legs")),
    material("black", "Black plastic", "plastic", "#222325", ["#1c1d1f"], 0.6, 0.0, "keyboard, mouse, lamp, tray, casters", **flat("reference: black lamp")),
    material("monitor", "Monitor black", "plastic", "#1e1f22", ["#18191c"], 0.5, 0.0, "monitor bodies and arm (ref ~#191a1c)", **flat("reference: black monitors")),
    material("screen", "Screen", "glass", "#2b3138", ["#252b31"], 0.3, 0.0, "display: a case image (texture) at runtime", **flat("case images in public/images/valtech")),
    material("chair-mesh", "Chair mesh", "fabric", "#2b2f35", ["#25292e"], 0.85, 0.0, "black mesh back (photo ~#23282f)", **flat("desk-corner photo")),
    material("chair-seat", "Chair seat", "fabric", "#6d7b85", ["#64727c"], 0.85, 0.0, "blue-grey seat (photo ~#5c6b75)", **flat("desk-corner photo")),
    material("chair-frame", "Chair frame", "plastic", "#e3e4e2", ["#d9dad8"], 0.6, 0.0, "white back frame and armrests", emissiveIntensity={"base": 0.4},
             **flat("desk-corner photo")),
    material("chair-base", "Chair base", "metal", "#a9aeb2", ["#a0a5a9"], 0.4, 0.5, "silver five-star base", **flat("desk-corner photo")),
    material("mustard", "Mustard", "plastic", "#d6ba3c", ["#ccb034"], 0.6, 0.0, "the zone's hero accent: the bowl (photo ~#c9ab45 in shade)",
             **flat("reference: mustard planter")),
    material("mustard-dark", "Mustard rim", "plastic", "#c2a532", ["#b89c2b"], 0.7, 0.0, "planter rim, a shade darker", **flat("reference: mustard planter")),
    material("soil", "Soil", "unknown", "#3b2f26", ["#342920"], 0.95, 0.0, "planter soil", **flat("planter")),
    material("plant-dark", "Leaves dark", "unknown", "#2f5a2f", ["#2a5229"], 0.9, 0.0, "big plant, shaded leaves", **flat("reference: big green plant")),
    material("plant-mid", "Leaves light", "unknown", "#5b8b3d", ["#538236"], 0.9, 0.0, "big plant, lit leaves", **flat("reference: big green plant")),
    material("plant-stem", "Stem", "wood", "#5a4a36", ["#52432f"], 0.9, 0.0, "plant stem", **flat("plant")),
    material("paper", "Paper white", "stone", "#f2f0ea", ["#e9e7e1"], 0.8, 0.0, "notebook pages, the mug", emissiveIntensity={"base": 0.45}, **flat("desk props")),
    material("notebook", "Notebook cover", "fabric", "#2a2a2d", ["#242427"], 0.8, 0.0, "black notebook", **flat("beat sheet: a notebook")),
    material("bag", "Bag", "fabric", "#26282a", ["#212325"], 0.9, 0.0, "black bags on the floor (photo ~#202222)", **flat("reference: bags on the floor")),
    material("note-pink", "Sticky note pink", "plastic", "#ea9aa9", ["#e090a0"], 0.8, 0.0, "sticky notes", emissiveIntensity={"base": 0.4}, **flat("01 reference")),
    material("note-blue", "Sticky note blue", "plastic", "#9ccbe2", ["#92c1d8"], 0.8, 0.0, "sticky notes", emissiveIntensity={"base": 0.4}, **flat("01 reference")),
    material("note-orange", "Sticky note orange", "plastic", "#f0a85c", ["#e69e52"], 0.8, 0.0, "sticky notes", emissiveIntensity={"base": 0.4}, **flat("01 reference")),
    material("board-mustard", "Whiteboard mustard", "plastic", "#ddca80", ["#d3c076"], 0.5, 0.0, "tall mustard whiteboards (ref ~#d5c680)",
             emissiveIntensity={"base": 0.35}, **flat("01 reference")),
    material("pouf-mustard", "Pouf mustard", "fabric", "#b08d45", ["#a6833c"], 0.95, 0.0, "mustard pouf (ref ~#a1803e)", **flat("01 reference")),
    material("bench-grey", "Bench dark grey", "fabric", "#4a4a4c", ["#424244"], 0.95, 0.0, "upholstered bench under the window", **flat("01 photo")),
    material("leather-tan", "Tan banquette", "fabric", "#b48b5f", ["#aa8156"], 0.8, 0.0, "tan banquettes (lunch reference)", **flat("lunch reference")),
    material("wood-light", "Light wood", "wood", "#d4b88c", ["#caae82"], 0.8, 0.0, "chair seats and back rails", emissiveIntensity={"base": 0.35}, **flat("lunch reference")),
    material("chalkboard", "Chalkboard", "stone", "#2b2f2d", ["#262a28"], 0.9, 0.0, "the Friday quiz board (text is a texture)", **flat("beat sheet")),
    material("screen-dark", "Screen (off)", "glass", "#1f2429", ["#1a1f23"], 0.25, 0.0, "a screen that is off", **flat("lunch reference")),
    material("pouf-grey", "Pouf warm grey", "fabric", "#625e55", ["#59554c"], 0.95, 0.0, "warm grey pouf (ref ~#56534b)", **flat("01 reference")),
    material("decal", "Glass decal", "plastic", "#ffffff", ["#f6f6f6"], 0.6, 0.0, "the white 01 on the glass (texture)", **flat("01 reference")),
    material("bag-dark", "Bag strap", "fabric", "#3a3d40", ["#33363a"], 0.9, 0.0, "bag flap", **flat("reference: bags on the floor")),
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
    rep("awnings", [f"awning-S-{i + 1}" for i in range(NCAFE)], "one per cafe bay"),
    rep("columns", [i for i in ids if i.startswith("col-S-")], "south column line at the bay lines"),
    rep("planters", [i for i in ids if i.startswith("planter-") and "shrub" not in i], "between the columns"),
]
top = TR + 0.1 + G
spec["silhouette"] = {"boundingShape": f"{2 * HX:g} x {2 * HZ:g} wu block, louvre block {ROOF + TS + G:.2f} wu, top floor to {top:.2f} wu",
                      "aspectRatios": [f"footprint {2 * HX:g} : {2 * HZ:g}", f"height {top:.2f} : length {2 * HX:g}"], "symmetry": "asymmetric (gate at the east end)",
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
spec["entrance"] = {"side": "south", "at": int(round(GB + HX)), "width": 1.0, "approachTile": [int(round(GB + HX)), int(2 * HZ)],
                    "cues": ["green awning projecting 0.5 wu with a white valance", "lit glass door on the passage wall, facing the camera",
                             "brick-lined passage", "light threshold path"]}
spec["states"] = {"roofOn": "hide open-* and lowcap-*",
                  "roofOff": "hide the upper storeys (slab-, louvre-, parapet-, roof-deck, top-) and the cafe front (shop-core, col-S-, shop-glass-, "
                             "shop-light-, awning-, gate lintel, soffit, end wall, brick west lining, door, art, sign); walls of the view's two far "
                             "sides stay full height, the others show lowcap-<side>; lib/city/models/valtechOfficeStates.ts"}
spec["interior"] = {"plan": "Figma 597-3604 (section 601-3604) + beat sheet 2026-10-16", "map": WALKMAP,
                    "mainDoor": "south edge of the gate tile", "standSpots": {k: list(v) for k, v in STAND_SPOTS.items()}}
json.dump(spec["interior"], open(f"{W}/walkmap.json", "w"), indent=1)
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]), "slats", len(slat_ids), "fins", len(fin_ids), "mullions", len(mull_ids),
      "top", round(top, 3))

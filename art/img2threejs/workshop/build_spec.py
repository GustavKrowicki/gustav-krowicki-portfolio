"""ObjectSculptSpec for the Workshop: a cut-away meeting room set up for a design workshop.

Frame: 1 unit = 1 wu (one tile edge, ~2 m), docs/city-rules.md. +Y up, ground at y = 0, footprint 2 x 3 wu
centred on the origin (x in [-1, 1], z in [-1.5, 1.5]). The camera-facing sides (+X east, +Z south at yaw 45) are cut away;
the back walls stand on -X (the whiteboard wall) and -Z (the end wall with the radiator). Heights keep
character scale (section 2): walls 1.4 wu (one ground storey), table top 0.37 wu above the floor, seat 0.24 wu.
Plan follows the AI Studio image (ratio ~1 : 1.45), compressed from the real ~3 x 6.5 m room. Child transforms are parent-relative; every position below is
written in world wu and converted with `local()`. Measured / inferred values: analysis/image-analysis.md.
"""
import copy
import json
import sys

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
AI, WIDE, WALL = "ai-studio-room", "photo-wide", "photo-wall"
spec["viewEvidence"] = [
    {"id": AI, "view": "primary: Gustav's AI Studio isometric cut-away of the room (style, layout, colour)", "image": f"{W}/ref/ai-studio-room-fit.png",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["two back walls with thick dark caps and posts", "whiteboard on the long wall: list, three headings, sticky grid",
                      "centred oak table on black sled legs, four teal chairs", "concrete column and white wall unit on the end wall",
                      "teal carpet on a dark plinth"],
     "confidence": 0.85},
    {"id": WIDE, "view": "secondary: eye-height wide photo from the door end, along the room's long axis", "image": f"{W}/ref/photo-wide-1200.png",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["full-height whiteboard wall on one long side", "marker list on its near half, sticky-note grid further along",
                      "oak table with laptops and sticky notes on the opposite side", "teal and white swivel chairs",
                      "round concrete column near the end wall", "teal carpet"],
     "confidence": 0.8},
    {"id": WALL, "view": "close view of the whiteboard wall and the end-wall corner", "image": f"{W}/ref/photo-wall-1200.png",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["three column headings over the sticky grid", "yellow, lime and orange notes", "white radiator under the end wall"],
     "confidence": 0.75},
]

SLAB = 0.06          # floor plinth (the step up into the room is one of the entrance cues)
WALL_H = 1.4         # ground storey
WALL_T = 0.1
TABLE_H = 0.37       # top above the floor
SEAT_H = 0.24
ABS = {}             # world positions, for parent-relative transforms


def r4(v):
    return [round(float(x), 4) for x in v]


def local(parent, pos):
    if parent is None:
        return pos
    p = ABS[parent]
    return (pos[0] - p[0], pos[1] - p[1], pos[2] - p[2])


def comp(cid, name, level, role, primitive, parent, dims, pos, material, *, importance=0.7, conf=0.7, features=None,
         evidence=None, socket="floor-top", start=None, end=None, contact="flush-mount", topo="", sockets=None,
         rotation=None, radius=None, anim_role="static"):
    """Box-like parts: `pos` is the world centre. Cylinders: `start`/`end` are world end points of the axis."""
    c = copy.deepcopy(root_t)
    c.update({"id": cid, "name": name, "level": level, "role": role, "importance": importance, "confidence": conf,
              "primitive": primitive, "topologyClass": "assembled-solid", "topologyRationale": topo, "parent": parent,
              "material": material, "materialLayers": [material], "localFeatures": features or [],
              "evidenceRefs": evidence or [WIDE]})
    gd = c["geometryDescriptor"]
    gd["topologyIntent"] = "hard-surface, flat faces, crisp edges"
    gd["edgeTreatment"] = {"type": "none", "bevelRadius": 0.0, "segments": 1}
    c["dimensions"] = {"width": dims[0], "height": dims[1], "depth": dims[2], "units": "wu (1 tile edge, ~2 m)", "confidence": conf}
    ABS[cid] = pos
    c["transform"] = {"position": r4(local(parent, pos)), "rotation": r4(rotation or [0, 0, 0]), "scale": r4(dims)}
    ap = c["actionProfile"]
    ap["animationRole"] = anim_role
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
        s = local(parent, start or pos)
        e = local(parent, end or (pos[0], pos[1] + dims[1] / 2, pos[2]))
        a = {"parentId": parent, "parentSocket": socket, "localStart": r4(s), "localEnd": r4(e), "contactType": contact,
             "embedDepth": 0.002, "gapTolerance": 0.002}
        if radius:
            a.update(baseRadius=radius, endRadius=radius)
        c["attachment"] = a
    c["fidelityTier"] = "game-prop"
    return c


C = []
HX, HZ = 1.0, 1.5    # half footprint: 2 x 3 wu (the AI Studio room is ~1.45x longer along the whiteboard)
# --- Room shell
C.append(comp("root", "Floor plinth", "macro", "base", "box", None, (2 * HX, SLAB, 2 * HZ), (0, SLAB / 2, 0), "plinth",
              importance=0.8, conf=0.8, evidence=[AI], sockets=[{"id": "floor-top", "localPosition": [0, SLAB / 2, 0], "notes": "floor surface"}],
              features=[{"id": "root.threshold", "kind": "contour", "notes": "dark plinth edge on the open sides; 0.06 wu step (entrance cue)"}],
              topo="Flat slab: a box."))
FY = SLAB
C.append(comp("carpet", "Teal carpet", "macro", "floor", "box", "root", (2 * HX - 0.12, 0.01, 2 * HZ - 0.12), (0.04, FY + 0.005, 0.04), "carpet",
              importance=0.7, conf=0.75, evidence=[AI, WIDE], features=[{"id": "carpet.tone", "kind": "stain", "notes": "one teal tone wall to wall"}],
              topo="Floor finish: a thin box inside the walls and the plinth rim."))
WXC, WZC = -HX + WALL_T / 2, -HZ + WALL_T / 2   # wall centre lines
C.append(comp("wall-whiteboard", "Whiteboard wall", "macro", "wall", "box", "root", (WALL_T, WALL_H, 2 * HZ), (WXC, FY + WALL_H / 2, 0),
              "wall-paint", importance=0.95, conf=0.8, evidence=[AI, WIDE],
              sockets=[{"id": "inner-face", "localPosition": [WALL_T / 2, 0, 0], "notes": "faces +X into the room"}],
              topo="Straight wall: a box. Ceiling and the camera-side walls are cut away."))
C.append(comp("wall-end", "End wall", "macro", "wall", "box", "root", (2 * HX - WALL_T, WALL_H, WALL_T), (WALL_T / 2, FY + WALL_H / 2, WZC),
              "wall-paint", importance=0.8, conf=0.75, evidence=[AI, WALL],
              sockets=[{"id": "inner-face", "localPosition": [0, 0, WALL_T / 2], "notes": "faces +Z into the room"}],
              topo="Straight wall: a box."))
for cid, wall, dims, pos in (("cap-whiteboard", "wall-whiteboard", (WALL_T + 0.004, 0.03, 2 * HZ + 0.004), (WXC, FY + WALL_H + 0.015, 0)),
                             ("cap-end", "wall-end", (2 * HX - WALL_T + 0.004, 0.03, WALL_T + 0.004), (WALL_T / 2, FY + WALL_H + 0.015, WZC))):
    C.append(comp(cid, f"Cut line on top of the {wall.split('-')[1]} wall", "meso", "trim", "box", wall, dims, pos, "cut-dark",
                  importance=0.6, conf=0.7, evidence=[AI], socket="inner-face", contact="applied",
                  features=[{"id": f"{cid}.poche", "kind": "contour", "notes": "dark section fill: reads as a cut-away, not a roofless room"}],
                  topo="Section cap: a thin box on the wall top."))
for cid, wall, dims, pos in (("post-front", "wall-whiteboard", (WALL_T + 0.01, WALL_H + 0.03, WALL_T + 0.01), (WXC, FY + (WALL_H + 0.03) / 2, HZ - WALL_T / 2)),
                             ("post-right", "wall-end", (WALL_T + 0.01, WALL_H + 0.03, WALL_T + 0.01), (HX - WALL_T / 2, FY + (WALL_H + 0.03) / 2, WZC))):
    C.append(comp(cid, f"Dark end post ({cid})", "meso", "trim", "box", wall, dims, pos, "cut-dark", importance=0.55, conf=0.7, evidence=[AI],
                  socket="inner-face", topo="Section post where the wall is cut: a box in the dark poche colour."))
# --- Whiteboard (painted surface on the inner face of the -X wall)
WX = -HX + WALL_T + 0.003
C.append(comp("whiteboard", "Whiteboard paint surface", "macro", "panel", "box", "wall-whiteboard", (0.006, 1.2, 2 * HZ - 0.24),
              (WX, FY + 0.15 + 0.6, 0.02), "whiteboard", importance=0.95, conf=0.8, evidence=[AI, WIDE], socket="inner-face", contact="applied",
              features=[{"id": "whiteboard.gloss", "kind": "gloss", "notes": "satin paint, soft highlights"},
                        {"id": "whiteboard.markerList", "kind": "linework", "notes": "built as list-* strokes"},
                        {"id": "whiteboard.stickyGrid", "kind": "decal", "notes": "built as note-wall-* and heading-* parts"}],
              topo="Thin painted layer on the wall: a box."))
SX = WX + 0.004
# Marker list on the near (+Z) half: heading, underline, 6 lines, slanted up toward -Z like the handwriting.
strokes = [("list-heading", 1.16, 0.80, 0.42, 0.04), ("list-underline", 1.09, 0.78, 0.50, 0.008)]
for i, (y, z, w) in enumerate(((0.99, 0.80, 0.36), (0.90, 0.78, 0.40), (0.81, 0.74, 0.46), (0.72, 0.74, 0.42),
                               (0.60, 0.80, 0.34), (0.52, 0.72, 0.48), (0.44, 0.70, 0.52)), 1):
    strokes.append((f"list-line-{i}", y, z, w, 0.022))
for cid, y, z, w, h in strokes:
    C.append(comp(cid, f"Marker stroke ({cid})", "micro", "decal", "box", "whiteboard", (0.003, h, w), (SX, FY + y, z), "marker",
                  importance=0.6, conf=0.6, evidence=[AI, WIDE], socket="inner-face", contact="applied", rotation=(0.18, 0, 0),
                  topo="Marker linework stylised as a slanted bar (the text is deliberately unreadable)."))
# Column headings, a sketched document, and the sticky-note grid toward the end wall
for i, (z, y) in enumerate(((0.02, 1.08), (-0.50, 1.18), (-0.98, 1.24)), 1):
    C.append(comp(f"heading-{i}", f"Column heading {i}", "micro", "decal", "box", "whiteboard", (0.003, 0.03, 0.16 if i != 2 else 0.24),
                  (SX, FY + y, z), "marker", importance=0.55, conf=0.6, evidence=[AI, WALL], socket="inner-face", contact="applied",
                  rotation=(0.18, 0, 0), topo="Marker heading: a slanted bar."))
C.append(comp("sketch-doc", "Sketched document frame", "micro", "decal", "box", "whiteboard", (0.003, 0.26, 0.16), (SX, FY + 0.72, -0.22),
              "marker-grey", importance=0.4, conf=0.5, evidence=[AI], socket="inner-face", contact="applied",
              topo="Outlined page drawn on the board: a grey rectangle at sprite scale."))
NOTES = [(0.12, 0.92, "note-lime"), (0.06, 0.86, "note-yellow"), (0.12, 0.80, "note-lime"), (0.04, 0.74, "note-yellow"),
         (-0.38, 0.98, "note-yellow"), (-0.46, 0.92, "note-lime"), (-0.54, 0.98, "note-yellow"), (-0.50, 0.84, "note-yellow"),
         (-0.62, 0.86, "note-yellow"), (-0.70, 0.90, "note-yellow"), (-0.46, 0.74, "note-yellow"), (-0.42, 0.64, "note-yellow"),
         (-0.98, 1.10, "note-lime"), (-1.02, 1.00, "note-yellow"), (-0.96, 0.98, "note-lime"), (-1.00, 0.92, "note-lime"),
         (-0.34, 1.04, "note-blue")]
for i, (z, y, m) in enumerate(NOTES, 1):
    C.append(comp(f"note-wall-{i}", f"Sticky note on the wall {i}", "micro", "decal", "box", "whiteboard", (0.004, 0.06, 0.06),
                  (SX + 0.001, FY + y, z), m, importance=0.6, conf=0.65, evidence=[AI, WALL], socket="inner-face", contact="applied",
                  topo="Square paper note: a thin box."))
# --- End wall details and the column
EZ = -HZ + WALL_T
C.append(comp("radiator", "Radiator", "meso", "fixture", "box", "wall-end", (0.32, 0.36, 0.08), (-0.62, FY + 0.40, EZ + 0.04),
              "radiator", importance=0.45, conf=0.6, evidence=[AI, WALL], socket="inner-face",
              features=[{"id": "radiator.panel", "kind": "contour", "notes": "white box unit on the end wall near the corner"}],
              topo="Wall unit: a box."))
C.append(comp("socket", "Wall socket", "micro", "fixture", "box", "wall-end", (0.06, 0.06, 0.01), (-0.86, FY + 0.38, EZ + 0.005),
              "radiator", importance=0.2, conf=0.5, evidence=[AI], socket="inner-face", topo="Socket plate: a small box."))
CX, CZ = -0.12, EZ + 0.16
C.append(comp("column", "Concrete column", "macro", "structure", "cylinder", "root", (0.3, WALL_H, 0.3), (CX, FY + WALL_H / 2, CZ),
              "concrete", importance=0.85, conf=0.75, evidence=[AI, WIDE], start=(CX, FY, CZ), end=(CX, FY + WALL_H, CZ), radius=0.15,
              features=[{"id": "column.boardMarks", "kind": "contour", "notes": "round exposed concrete with faint pour lines, floor to cut line"}],
              topo="Round column: a cylinder between floor and wall top."))
# --- Table, centred, long axis along Z (parallel to the whiteboard)
TX, TZ, TL, TW = 0.08, 0.12, 1.25, 0.62
TY = FY + TABLE_H
C.append(comp("table", "Oak table top", "macro", "furniture", "box", "root", (TW, 0.04, TL), (TX, TY - 0.02, TZ), "oak",
              importance=0.9, conf=0.75, evidence=[AI, WIDE],
              sockets=[{"id": "top-face", "localPosition": [0, 0.02, 0], "notes": "laptops and notes sit here"}],
              features=[{"id": "table.stickyNotes", "kind": "decal", "notes": "built as note-table-* parts"}],
              topo="Slab top: a box."))
for i, dz in enumerate((-TL / 2 + 0.12, TL / 2 - 0.12), 1):
    zc = TZ + dz
    C.append(comp(f"table-leg-{i}", f"Table sled leg {i} (top rail)", "meso", "furniture", "box", "table", (TW - 0.1, 0.03, 0.03),
                  (TX, TY - 0.055, zc), "steel-black", importance=0.5, conf=0.6, evidence=[AI], socket="top-face", contact="butt",
                  topo="Sled leg: a black steel frame (rail, two uprights, foot)."))
    for j, dx in enumerate((-(TW - 0.12) / 2, (TW - 0.12) / 2), 1):
        C.append(comp(f"table-leg-{i}-up-{j}", f"Table leg {i} upright {j}", "micro", "furniture", "box", f"table-leg-{i}", (0.03, TABLE_H - 0.07, 0.03),
                      (TX + dx, FY + (TABLE_H - 0.07) / 2 + 0.015, zc), "steel-black", importance=0.4, conf=0.55, evidence=[AI],
                      socket="top-face", start=(TX + dx, TY - 0.07, zc), end=(TX + dx, FY, zc), contact="butt", topo="Square tube upright."))
    C.append(comp(f"table-leg-{i}-foot", f"Table leg {i} foot", "micro", "furniture", "box", f"table-leg-{i}", (TW - 0.1, 0.03, 0.03),
                  (TX, FY + 0.015, zc), "steel-black", importance=0.35, conf=0.55, evidence=[AI], socket="top-face", contact="butt",
                  topo="Square tube foot rail."))
LAPTOPS = [(-0.12, 0.40, 1), (-0.10, -0.12, 1), (0.14, 0.10, -1), (0.12, -0.36, -1)]   # (dx, dz, facing: +1 user on -X side)
for i, (dx, dz, f) in enumerate(LAPTOPS, 1):
    bx, bz = TX + dx, TZ + dz
    C.append(comp(f"laptop-{i}", f"Laptop {i} base", "meso", "device", "box", "table", (0.16, 0.012, 0.12), (bx, TY + 0.006, bz),
                  "aluminium", importance=0.6, conf=0.65, evidence=[AI, WIDE], socket="top-face", contact="resting",
                  features=[{"id": f"laptop-{i}.screen", "kind": "contour", "notes": "open lid, dark glowing screen facing its user"}],
                  sockets=[{"id": "hinge", "localPosition": [f * 0.08, 0.006, 0], "notes": "lid hinge on the far edge"}],
                  topo="Laptop base: a thin box."))
    C.append(comp(f"laptop-{i}-lid", f"Laptop {i} lid", "micro", "device", "box", f"laptop-{i}", (0.008, 0.11, 0.12),
                  (bx + f * 0.085, TY + 0.012 + 0.053, bz), "screen", importance=0.55, conf=0.6, evidence=[AI], socket="hinge",
                  rotation=(0, 0, f * 0.22), contact="hinged", anim_role="screen",
                  topo="Lid: a thin box tilted back about the hinge; its face is the screen."))
C.append(comp("pen-cup", "Mesh pen cup", "micro", "prop", "cylinder", "table", (0.06, 0.09, 0.06), (TX + 0.02, TY + 0.045, TZ + 0.26),
              "steel-black", importance=0.3, conf=0.5, evidence=[AI], socket="top-face", start=(TX + 0.02, TY, TZ + 0.26),
              end=(TX + 0.02, TY + 0.09, TZ + 0.26), radius=0.03, contact="resting", topo="Pen cup: a cylinder."))
C.append(comp("bottle", "Water bottle", "micro", "prop", "cylinder", "table", (0.05, 0.11, 0.05), (TX + 0.22, TY + 0.055, TZ - 0.12),
              "steel-black", importance=0.3, conf=0.5, evidence=[AI, WIDE], socket="top-face", start=(TX + 0.22, TY, TZ - 0.12),
              end=(TX + 0.22, TY + 0.11, TZ - 0.12), radius=0.025, contact="resting", topo="Bottle: a cylinder."))
C.append(comp("notebook", "Leather notebook", "micro", "prop", "box", "table", (0.1, 0.015, 0.14), (TX - 0.2, TY + 0.0075, TZ + 0.52),
              "leather", importance=0.3, conf=0.5, evidence=[AI, WIDE], socket="top-face", contact="resting", topo="Closed notebook: a box."))
TNOTES = [(-0.02, 0.18, "note-yellow"), (0.06, 0.30, "note-lime"), (-0.06, 0.06, "note-yellow"), (0.02, -0.06, "note-pink"),
          (0.20, 0.30, "note-yellow"), (0.22, -0.02, "note-yellow"), (-0.22, 0.20, "note-yellow"), (0.04, -0.26, "note-yellow"),
          (-0.04, 0.44, "note-lime"), (0.18, 0.46, "note-yellow"), (-0.20, -0.30, "note-yellow"), (0.06, 0.58, "note-yellow")]
for i, (dx, dz, m) in enumerate(TNOTES, 1):
    C.append(comp(f"note-table-{i}", f"Sticky note on the table {i}", "micro", "decal", "box", "table", (0.05, 0.003, 0.05),
                  (TX + dx, TY + 0.0015, TZ + dz), m, importance=0.45, conf=0.6, evidence=[AI], socket="top-face", contact="resting",
                  topo="Square paper note lying flat: a thin box."))
# --- Chairs: teal seat and back, white arms, post and star base; two on each long side, facing the table
CHAIRS = [(TX - TW / 2 - 0.16, TZ + 0.32, 1), (TX - TW / 2 - 0.16, TZ - 0.32, 1), (TX + TW / 2 + 0.16, TZ + 0.32, -1), (TX + TW / 2 + 0.16, TZ - 0.32, -1)]
for i, (x, z, face) in enumerate(CHAIRS, 1):
    cid = f"chair-{i}"
    C.append(comp(cid, f"Chair {i} seat", "macro", "furniture", "box", "root", (0.26, 0.06, 0.26), (x, FY + SEAT_H, z), "upholstery",
                  importance=0.75, conf=0.7, evidence=[AI, WIDE], start=(x, FY, z), end=(x, FY + SEAT_H, z),
                  sockets=[{"id": "seat", "localPosition": [0, 0, 0], "notes": "seat centre"}],
                  features=[{"id": f"{cid}.frame", "kind": "contour", "notes": "white frame: arms, post, star base"}],
                  topo="Upholstered seat pad: a box."))
    C.append(comp(f"{cid}-back", f"Chair {i} back", "meso", "furniture", "box", cid, (0.05, 0.26, 0.26), (x - face * 0.13, FY + SEAT_H + 0.16, z),
                  "upholstery", importance=0.6, conf=0.65, evidence=[AI], socket="seat", start=(x - face * 0.13, FY + SEAT_H, z),
                  end=(x - face * 0.13, FY + SEAT_H + 0.29, z), rotation=(0, 0, face * 0.12), topo="Back pad: a box, raked back."))
    for k, dz in enumerate((-0.14, 0.14), 1):
        C.append(comp(f"{cid}-arm-{k}", f"Chair {i} arm {k}", "micro", "furniture", "box", cid, (0.2, 0.025, 0.025), (x, FY + SEAT_H + 0.1, z + dz),
                      "chair-frame", importance=0.4, conf=0.55, evidence=[AI], socket="seat", topo="White arm loop read as a bar at sprite scale."))
    C.append(comp(f"{cid}-post", f"Chair {i} post", "meso", "furniture", "cylinder", cid, (0.04, SEAT_H - 0.04, 0.04),
                  (x, FY + (SEAT_H - 0.03) / 2 + 0.01, z), "chair-frame", importance=0.4, conf=0.6, evidence=[AI], socket="seat",
                  start=(x, FY + 0.02, z), end=(x, FY + SEAT_H - 0.03, z), radius=0.018, topo="Gas-lift post: a cylinder."))
    for k, rot in enumerate((0.0, 1.2566, 2.5133, 3.7699, 5.0265), 1):
        C.append(comp(f"{cid}-leg-{k}", f"Chair {i} base leg {k}", "micro", "furniture", "box", cid, (0.15, 0.02, 0.03), (x, FY + 0.02, z),
                      "chair-frame", importance=0.3, conf=0.5, evidence=[AI], socket="seat", rotation=(0, rot, 0),
                      topo="One arm of the five-star base: a thin box turned about the post (centred on the post at sprite scale)."))
# --- Entrance: the open south edge, a light threshold strip in front of the approach tile
C.append(comp("threshold", "Threshold strip", "meso", "trim", "box", "root", (1.0, 0.012, 0.08), (0.0, FY + 0.006, HZ - 0.04), "threshold",
              importance=0.5, conf=0.55, evidence=[AI], contact="applied",
              topo="Entrance cue (city rules section 6): a light strip on the step at the open south side."))
spec["componentTree"] = C


def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.03, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.03, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    m.update(extra)
    if m.get("textureless"):
        for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
            m.pop(field, None)
    return m


def flat(*evidence):
    return {"textureless": {"declared": True, "evidence": list(evidence) + ["analysis/image-analysis.md L5/L6 (photo samples, de-lit by eye)"]}}


SPRITE = "at ~62 px per wu (2x sprite density) this surface is a few pixels: flat colour"
NOTE = flat("paper sticky note, one flat colour", SPRITE)
spec["materials"] = [
    material("plinth", "Floor plinth", "stone", "#3a3f44", ["#33373b"], 0.85, 0.0, "stylised base under the carpet", **flat(SPRITE)),
    material("carpet", "Teal carpet", "fabric", "#1f7f86", ["#1b7278"], 0.95, 0.0, "photo floor between table and wall",
             localOverrides=[{"id": "carpet.tone", "kind": "stain", "notes": "single dark teal, slightly darker under the table"}],
             **flat("short-pile carpet: no visible pattern in either photo", SPRITE)),
    material("wall-paint", "Light grey wall paint", "stone", "#c9cdcc", ["#bfc4c3"], 0.8, 0.0, "end wall, matte", **flat(SPRITE)),
    material("whiteboard", "Whiteboard paint", "plastic", "#dde1e1", ["#d2d6d6"], 0.12, 0.0, "whiteboard wall, gloss",
             localOverrides=[{"id": "whiteboard.gloss", "kind": "gloss", "notes": "large soft specular highlights from the downlights"}],
             envMapIntensity=0.6, **flat("painted whiteboard: the photo variation is reflections, not texture", SPRITE)),
    material("cut-dark", "Section fill", "stone", "#2b2a2e", ["#232226"], 0.9, 0.0, "stylised cut-away poche (near-black, city outline tone)", **flat(SPRITE)),
    material("marker", "Black marker", "plastic", "#202224", ["#2c2e30"], 0.6, 0.0, "marker list strokes", **flat(SPRITE)),
    material("marker-grey", "Grey marker", "plastic", "#6b6f72", ["#5c6063"], 0.6, 0.0, "column headings (thinner, greyer)", **flat(SPRITE)),
    material("note-yellow", "Yellow sticky note", "fabric", "#f2e94e", ["#eadf3c"], 0.85, 0.0, "wall and table notes", **NOTE),
    material("note-lime", "Lime sticky note", "fabric", "#b8e04a", ["#a7d23b"], 0.85, 0.0, "wall and table notes", **NOTE),
    material("note-orange", "Orange sticky note", "fabric", "#f5a23c", ["#ec942e"], 0.85, 0.0, "wall notes", **NOTE),
    material("note-blue", "Blue sticky note", "fabric", "#5fb7e8", ["#4fa6d8"], 0.85, 0.0, "wall note", **NOTE),
    material("steel-black", "Black steel", "metal", "#26272a", ["#1e1f22"], 0.5, 0.6, "table sled legs, pen cup, bottle", **flat(SPRITE)),
    material("leather", "Brown leather", "fabric", "#7a4a2e", ["#6b3f26"], 0.7, 0.0, "notebook on the table", **flat(SPRITE)),
    material("note-pink", "Pink sticky note", "fabric", "#f29bb3", ["#e88aa4"], 0.85, 0.0, "table note", **NOTE),
    material("radiator", "Radiator white", "metal", "#e6e8e6", ["#d8dad8"], 0.5, 0.2, "under the end wall", **flat(SPRITE)),
    material("concrete", "Exposed concrete", "stone", "#9a9b97", ["#8c8d89", "#a6a7a3"], 0.9, 0.0, "column",
             localOverrides=[{"id": "column.boardMarks", "kind": "contour", "notes": "faint vertical formwork lines; not visible at sprite scale"}],
             **flat("board-marked concrete reads as one mid grey at sprite scale", SPRITE)),
    material("oak", "Light oak", "wood", "#d9b27c", ["#cfa56c"], 0.55, 0.0, "table top", **flat("grain is below sprite resolution", SPRITE)),
    material("upholstery", "Teal upholstery", "fabric", "#3f7f86", ["#36717a"], 0.9, 0.0, "chair seats and backs", **flat(SPRITE)),
    material("chair-frame", "White chair frame", "plastic", "#eef0ef", ["#dfe2e1"], 0.45, 0.0, "chair frames, table legs", **flat(SPRITE)),
    material("aluminium", "Laptop aluminium", "metal", "#c7c9cc", ["#b9bbbe"], 0.35, 0.8, "laptop bases", **flat(SPRITE)),
    material("screen", "Laptop screen", "glass", "#2a2d33", ["#3a4250"], 0.2, 0.0, "open lids", emissive="#6f8fb8",
             emissiveIntensity={"base": 0.35}, **flat("dark screen with a soft glow (life rule: screens)", SPRITE)),
    material("threshold", "Threshold", "wood", "#e7d3ae", ["#dcc59c"], 0.6, 0.0, "stylised entrance strip", **flat(SPRITE)),
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
    {"id": "chairs", "target": "root", "count": 4, "elementComponentIds": [f"chair-{i}" for i in range(1, 5)],
     "distribution": "two on each long side of the table, facing it", "notes": "seat + back + post + base each"},
    {"id": "laptops", "target": "table", "count": 4, "elementComponentIds": [f"laptop-{i}" for i in range(1, 5)],
     "distribution": "along the table edge facing the chairs", "notes": "base + tilted lid"},
    {"id": "wall-notes", "target": "whiteboard", "count": len(NOTES), "elementComponentIds": [i for i in ids if i.startswith("note-wall-")],
     "distribution": "loose grid under three column headings", "notes": "yellow, lime, orange"},
    {"id": "table-notes", "target": "table", "count": len(TNOTES), "elementComponentIds": [i for i in ids if i.startswith("note-table-")],
     "distribution": "scattered between the laptops", "notes": "yellow, lime, orange, pink"},
]
spec["silhouette"] = {"boundingShape": "2 x 3 wu floor plinth with an L of 1.4 wu back walls (-X, -Z) and a round column; cut away on the camera sides",
                      "aspectRatios": ["footprint 2 : 3", "wall height 1.4 : footprint 2"], "symmetry": "asymmetric",
                      "dominantCurves": ["column cylinder"], "negativeSpaces": ["open room interior seen over the cut walls"],
                      "landmarks": ["whiteboard on the -X wall", "column near the -Z wall", "table centred, parallel to Z"]}
spec["coordinateFrame"] = {"front": "+Z south (open side, entrance)", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m)"}
spec["featureReviewTargets"] = [
    {"id": "whiteboard-wall", "name": "Full-height whiteboard wall with a marker list and a three-column sticky-note grid", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.75, "mustPass": True,
     "componentRefs": ["wall-whiteboard", "whiteboard"] + [i for i in ids if i.startswith(("list-", "heading-", "note-wall-"))]},
    {"id": "workshop-table", "name": "Oak table with open laptops and scattered sticky notes", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["table"] + [i for i in ids if i.startswith(("laptop-", "note-table-"))]},
    {"id": "teal-chairs", "name": "Teal and white swivel chairs", "tier": "important", "passIds": ["structural-pass", "material-pass"],
     "minimumScore": 0.65, "mustPass": False, "componentRefs": [i for i in ids if i.startswith("chair-")]},
    {"id": "column", "name": "Round concrete column near the end wall", "tier": "important", "passIds": ["blockout", "material-pass"],
     "minimumScore": 0.65, "mustPass": False, "componentRefs": ["column"]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["city sprite south (yaw 45, pitch 30)", "sprite east/west/north", "eye-height view from the door end"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 6000, "maxDrawCalls": 120, "textureSize": 512, "fpsTarget": 60})
spec["lightingFromPhoto"] = [
    {"id": "downlights", "type": "hemisphere", "role": "key", "intensity": 1.0, "skyColor": "#f4f6f8", "groundColor": "#3a5556",
     "evidence": "photos: soft even light from round ceiling downlights, highlights on the whiteboard paint"},
    {"id": "key", "type": "directional", "role": "key", "intensity": 1.6, "position": [-3, 6, 4], "direction": [0.4, -0.8, -0.5],
     "castsShadow": True, "evidence": "city rules section 3: key fixed from screen upper left, 45 deg up; the photos' downlights give no hard shadows"},
    {"id": "fill", "type": "directional", "role": "fill", "intensity": 0.4, "position": [5, 4, -3], "evidence": "keeps the shaded wall faces readable"},
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.4, "evidence": "soft reflections in the whiteboard paint"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 1.0,
     "notes": "review renders keep the photo's saturated teal and note colours; game sprites use the converter rig (ambient 0.6, no tone mapping)"},
    {"id": "contact", "role": "shadow", "notes": "contact shadows under the table, chairs and laptops; walls cast a soft ground shadow into the room"},
]
spec["entrance"] = {"side": "south", "at": 0, "width": 1.0,
                    "cues": ["0.06 wu step at the open south edge", "light threshold strip", "path ending at it (city placement)"]}
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]))

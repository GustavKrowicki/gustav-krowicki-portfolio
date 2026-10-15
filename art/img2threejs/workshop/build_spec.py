"""ObjectSculptSpec for the Workshop: a cut-away meeting room set up for a design workshop.

Frame: 1 unit = 1 wu (one tile edge, ~2 m), docs/city-rules.md. +Y up, ground at y = 0, footprint 2 x 2 wu
centred on the origin (x, z in [-1, 1]). The camera-facing sides (+X east, +Z south at yaw 45) are cut away;
the back walls stand on -X (the whiteboard wall) and -Z (the end wall with the radiator). Heights keep
character scale (section 2): walls 1.4 wu (one ground storey), table top 0.37 wu above the floor, seat 0.24 wu.
Plan is compressed from the real ~3 x 6.5 m room. Child transforms are parent-relative; every position below is
written in world wu and converted with `local()`. Measured / inferred values: analysis/image-analysis.md.
"""
import copy
import json
import sys

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
WIDE, WALL = "photo-wide", "photo-wall"
spec["viewEvidence"] = [
    {"id": WIDE, "view": "primary: eye-height wide photo from the door end, along the room's long axis", "image": f"{W}/ref/photo-wide-1200.png",
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
# --- Room shell
C.append(comp("root", "Floor plinth", "macro", "base", "box", None, (2.0, SLAB, 2.0), (0, SLAB / 2, 0), "plinth",
              importance=0.8, conf=0.8, sockets=[{"id": "floor-top", "localPosition": [0, SLAB / 2, 0], "notes": "floor surface"}],
              features=[{"id": "root.threshold", "kind": "contour", "notes": "0.06 wu step up at the open south edge (entrance cue)"}],
              topo="Flat slab: a box."))
FY = SLAB
C.append(comp("carpet", "Teal carpet", "macro", "floor", "box", "root", (1.9, 0.01, 1.9), (0.05, FY + 0.005, 0.05), "carpet",
              importance=0.7, conf=0.75, features=[{"id": "carpet.tone", "kind": "stain", "notes": "one dark teal tone wall to wall"}],
              topo="Floor finish: a thin box inside the walls."))
C.append(comp("wall-whiteboard", "Whiteboard wall", "macro", "wall", "box", "root", (WALL_T, WALL_H, 2.0), (-0.95, FY + WALL_H / 2, 0),
              "wall-paint", importance=0.95, conf=0.8,
              sockets=[{"id": "inner-face", "localPosition": [WALL_T / 2, 0, 0], "notes": "faces +X into the room"}],
              topo="Straight wall: a box. Ceiling and the camera-side walls are cut away."))
C.append(comp("wall-end", "End wall", "macro", "wall", "box", "root", (1.9, WALL_H, WALL_T), (0.05, FY + WALL_H / 2, -0.95),
              "wall-paint", importance=0.8, conf=0.75,
              sockets=[{"id": "inner-face", "localPosition": [0, 0, WALL_T / 2], "notes": "faces +Z into the room"}],
              topo="Straight wall: a box."))
for cid, wall, dims, pos in (("cap-whiteboard", "wall-whiteboard", (WALL_T + 0.004, 0.02, 2.004), (-0.95, FY + WALL_H + 0.01, 0)),
                             ("cap-end", "wall-end", (1.904, 0.02, WALL_T + 0.004), (0.05, FY + WALL_H + 0.01, -0.95))):
    C.append(comp(cid, f"Cut line on top of the {wall.split('-')[1]} wall", "meso", "trim", "box", wall, dims, pos, "cut-dark",
                  importance=0.5, conf=0.6, socket="inner-face", contact="applied",
                  features=[{"id": f"{cid}.poche", "kind": "contour", "notes": "dark section fill: reads as a cut-away, not a roofless room"}],
                  topo="Section cap: a thin box on the wall top."))
# --- Whiteboard (painted surface on the inner face of the -X wall)
WX = -0.95 + WALL_T / 2 + 0.003
C.append(comp("whiteboard", "Whiteboard paint surface", "macro", "panel", "box", "wall-whiteboard", (0.006, 1.16, 1.86),
              (WX, FY + 0.2 + 0.58, 0), "whiteboard", importance=0.95, conf=0.8, socket="inner-face", contact="applied",
              features=[{"id": "whiteboard.gloss", "kind": "gloss", "notes": "high-gloss paint, large soft highlights"},
                        {"id": "whiteboard.markerList", "kind": "linework", "notes": "built as list-* strokes"},
                        {"id": "whiteboard.stickyGrid", "kind": "decal", "notes": "built as note-wall-* and heading-* parts"}],
              topo="Thin painted layer on the wall: a box."))
SX = WX + 0.004
# Marker list on the near (south) half: heading, underline, 5 lines. Stylised strokes, never legible text.
strokes = [("list-heading", 1.22, 0.62, 0.30, 0.03), ("list-underline", 1.17, 0.62, 0.34, 0.006)]
for i, (y, w) in enumerate(((1.08, 0.24), (0.98, 0.30), (0.88, 0.28), (0.78, 0.26), (0.66, 0.20), (0.58, 0.30)), 1):
    strokes.append((f"list-line-{i}", y, 0.60 + (0.30 - w) / 2 * 0.0, w, 0.018))
for cid, y, z, w, h in strokes:
    C.append(comp(cid, f"Marker stroke ({cid})", "micro", "decal", "box", "whiteboard", (0.003, h, w), (SX, FY + y, z), "marker",
                  importance=0.6, conf=0.6, socket="inner-face", contact="applied",
                  topo="Marker linework stylised as a flat bar (the text is deliberately unreadable)."))
# Three column headings and the sticky-note grid further along the wall
COLS = (-0.55, -0.25, 0.05)
for i, z in enumerate(COLS, 1):
    C.append(comp(f"heading-{i}", f"Column heading {i}", "micro", "decal", "box", "whiteboard", (0.003, 0.02, 0.12), (SX, FY + 1.16, z),
                  "marker-grey", importance=0.5, conf=0.6, evidence=[WALL], socket="inner-face", contact="applied",
                  topo="Thin marker heading: a bar."))
NOTES = [(-0.58, 1.04, "note-yellow"), (-0.50, 0.96, "note-lime"), (-0.56, 0.88, "note-yellow"),
         (-0.27, 1.06, "note-orange"), (-0.22, 0.99, "note-yellow"), (-0.29, 0.92, "note-lime"), (-0.24, 0.84, "note-yellow"),
         (0.02, 1.05, "note-lime"), (0.08, 0.97, "note-lime"), (0.03, 0.89, "note-yellow"), (-0.40, 0.90, "note-lime"),
         (0.18, 0.95, "note-orange")]
for i, (z, y, m) in enumerate(NOTES, 1):
    C.append(comp(f"note-wall-{i}", f"Sticky note on the wall {i}", "micro", "decal", "box", "whiteboard", (0.004, 0.05, 0.05),
                  (SX + 0.001, FY + y, z), m, importance=0.6, conf=0.65, evidence=[WIDE, WALL], socket="inner-face", contact="applied",
                  topo="Square paper note: a thin box."))
# --- End wall details and the column
C.append(comp("radiator", "Radiator", "meso", "fixture", "box", "wall-end", (0.5, 0.22, 0.05), (-0.25, FY + 0.06 + 0.11, -0.95 + WALL_T / 2 + 0.025),
              "radiator", importance=0.4, conf=0.55, evidence=[WALL], socket="inner-face",
              features=[{"id": "radiator.panel", "kind": "contour", "notes": "low white panel on short brackets"}],
              topo="Panel radiator: a box."))
C.append(comp("column", "Concrete column", "macro", "structure", "cylinder", "root", (0.24, WALL_H, 0.24), (0.55, FY + WALL_H / 2, -0.62),
              "concrete", importance=0.85, conf=0.75, start=(0.55, FY, -0.62), end=(0.55, FY + WALL_H, -0.62), radius=0.12,
              features=[{"id": "column.boardMarks", "kind": "contour", "notes": "round exposed concrete, floor to cut line"}],
              topo="Round column: a cylinder between floor and wall top."))
# --- Table (along the long axis, on the side opposite the whiteboard)
TX, TZ, TL, TW = 0.48, 0.28, 1.25, 0.5
TY = FY + TABLE_H
C.append(comp("table", "Oak table top", "macro", "furniture", "box", "root", (TW, 0.04, TL), (TX, TY - 0.02, TZ), "oak",
              importance=0.9, conf=0.75,
              sockets=[{"id": "top-face", "localPosition": [0, 0.02, 0], "notes": "laptops and notes sit here"}],
              features=[{"id": "table.stickyNotes", "kind": "decal", "notes": "built as note-table-* parts"}],
              topo="Slab top: a box."))
for i, dz in enumerate((-TL / 2 + 0.08, TL / 2 - 0.08), 1):
    C.append(comp(f"table-leg-{i}", f"Table leg panel {i}", "meso", "furniture", "box", "table", (TW - 0.08, TABLE_H - 0.04, 0.04),
                  (TX, FY + (TABLE_H - 0.04) / 2, TZ + dz), "chair-frame", importance=0.5, conf=0.55, socket="top-face",
                  start=(TX, TY - 0.04, TZ + dz), end=(TX, FY, TZ + dz), contact="butt",
                  topo="Panel leg: a box under each end of the top."))
for i, z in enumerate((-0.12, 0.26, 0.64), 1):
    C.append(comp(f"laptop-{i}", f"Laptop {i} base", "meso", "device", "box", "table", (0.16, 0.012, 0.12), (TX - 0.08, TY + 0.006, TZ + z - 0.28),
                  "aluminium", importance=0.6, conf=0.65, socket="top-face", contact="resting",
                  features=[{"id": f"laptop-{i}.screen", "kind": "contour", "notes": "open lid, dark glowing screen facing the chairs"}],
                  sockets=[{"id": "hinge", "localPosition": [0.08, 0.006, 0], "notes": "lid hinge on the far edge"}],
                  topo="Closed-form laptop base: a thin box."))
    C.append(comp(f"laptop-{i}-lid", f"Laptop {i} lid", "micro", "device", "box", f"laptop-{i}", (0.008, 0.11, 0.12),
                  (TX - 0.08 + 0.085, TY + 0.012 + 0.053, TZ + z - 0.28), "screen", importance=0.55, conf=0.6, socket="hinge",
                  rotation=(0, 0, 0.22), contact="hinged", anim_role="screen",
                  topo="Lid: a thin box tilted back about the hinge; its face is the screen."))
TNOTES = [(-0.05, -0.30, "note-yellow"), (0.10, -0.18, "note-lime"), (0.02, 0.04, "note-yellow"), (-0.12, 0.10, "note-pink"),
          (0.12, 0.40, "note-yellow"), (-0.02, 0.48, "note-orange"), (0.15, 0.08, "note-yellow"), (0.00, -0.42, "note-lime")]
for i, (dx, dz, m) in enumerate(TNOTES, 1):
    C.append(comp(f"note-table-{i}", f"Sticky note on the table {i}", "micro", "decal", "box", "table", (0.05, 0.003, 0.05),
                  (TX + dx, TY + 0.0015, TZ + dz), m, importance=0.45, conf=0.6, socket="top-face", contact="resting",
                  topo="Square paper note lying flat: a thin box."))
# --- Chairs: teal seat and back, white post and base. Facing +X (at the table) or -X (at the whiteboard).
CHAIRS = [(0.10, -0.05, 1), (0.10, 0.45, 1), (-0.45, 0.55, -1), (-0.40, -0.25, -1)]
for i, (x, z, face) in enumerate(CHAIRS, 1):
    cid = f"chair-{i}"
    C.append(comp(cid, f"Chair {i} seat", "macro", "furniture", "box", "root", (0.24, 0.05, 0.24), (x, FY + SEAT_H, z), "upholstery",
                  importance=0.75, conf=0.7, start=(x, FY, z), end=(x, FY + SEAT_H, z),
                  sockets=[{"id": "seat", "localPosition": [0, 0, 0], "notes": "seat centre"}],
                  features=[{"id": f"{cid}.frame", "kind": "contour", "notes": "white frame: post, star base, back frame"}],
                  topo="Upholstered seat pad: a box."))
    C.append(comp(f"{cid}-back", f"Chair {i} back", "meso", "furniture", "box", cid, (0.03, 0.22, 0.22), (x - face * 0.12, FY + SEAT_H + 0.14, z),
                  "upholstery", importance=0.6, conf=0.65, socket="seat", start=(x - face * 0.12, FY + SEAT_H, z),
                  end=(x - face * 0.12, FY + SEAT_H + 0.25, z), topo="Back pad: a box behind the seat."))
    C.append(comp(f"{cid}-post", f"Chair {i} post", "meso", "furniture", "cylinder", cid, (0.04, SEAT_H - 0.04, 0.04),
                  (x, FY + (SEAT_H - 0.03) / 2 + 0.01, z), "chair-frame", importance=0.4, conf=0.6, socket="seat",
                  start=(x, FY + 0.02, z), end=(x, FY + SEAT_H - 0.025, z), radius=0.018, topo="Gas-lift post: a cylinder."))
    C.append(comp(f"{cid}-base", f"Chair {i} star base", "micro", "furniture", "box", cid, (0.22, 0.02, 0.22), (x, FY + 0.012, z),
                  "chair-frame", importance=0.35, conf=0.5, socket="seat", start=(x, FY + 0.02, z), end=(x, FY, z),
                  rotation=(0, 0.785, 0), topo="Five-star base read as a low cross at sprite scale: a thin box turned 45 deg."))
# --- Entrance: the open south edge, a light threshold strip in front of the approach tile
C.append(comp("threshold", "Threshold strip", "meso", "trim", "box", "root", (1.0, 0.012, 0.08), (0.0, FY + 0.006, 0.96), "threshold",
              importance=0.55, conf=0.6, contact="applied",
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
    material("plinth", "Floor plinth", "stone", "#5d6266", ["#4e5357"], 0.85, 0.0, "stylised base under the carpet", **flat(SPRITE)),
    material("carpet", "Teal carpet", "fabric", "#2f5d5f", ["#2a5456"], 0.95, 0.0, "photo floor between table and wall",
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
     "distribution": "two at the table, two in front of the whiteboard", "notes": "seat + back + post + base each"},
    {"id": "laptops", "target": "table", "count": 3, "elementComponentIds": [f"laptop-{i}" for i in range(1, 4)],
     "distribution": "along the table edge facing the chairs", "notes": "base + tilted lid"},
    {"id": "wall-notes", "target": "whiteboard", "count": len(NOTES), "elementComponentIds": [i for i in ids if i.startswith("note-wall-")],
     "distribution": "loose grid under three column headings", "notes": "yellow, lime, orange"},
    {"id": "table-notes", "target": "table", "count": len(TNOTES), "elementComponentIds": [i for i in ids if i.startswith("note-table-")],
     "distribution": "scattered between the laptops", "notes": "yellow, lime, orange, pink"},
]
spec["silhouette"] = {"boundingShape": "2 x 2 wu floor plinth with an L of 1.4 wu back walls (-X, -Z) and a round column; cut away on the camera sides",
                      "aspectRatios": ["footprint 1 : 1", "wall height 1.4 : footprint 2"], "symmetry": "asymmetric",
                      "dominantCurves": ["column cylinder"], "negativeSpaces": ["open room interior seen over the cut walls"],
                      "landmarks": ["whiteboard on the -X wall", "column near the -Z wall", "table parallel to Z on the +X side"]}
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

"""ObjectSculptSpec for the LEGO HQ main entrance: yellow 2x4 plate roofing a glass vestibule.

Frame: +X along the facade, +Y up, +Z out of the facade toward the courtyard. 1 unit = plate width
W (~5.3 m). Facade glass plane at world z = 0, ground at y = 0. Child transforms are parent-relative.
Measured (analysis/image-analysis.md): plate 1.0 x 0.21 x 2.0 centred on the facade, studs d 0.30
h 0.10 pitch 0.5; vestibule 1.0 wide x 1.0 deep x 0.45 tall under the plate, doors flush under the
plate's front edge (4 equal panels, centre pair slides); curtain wall bays 0.5, transoms 0.8/1.2/1.6/2.0.
"""
import copy
import json
import sys

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
AERIAL, GROUND, COURT = "aerial-elevated", "ground-front", "courtyard-context"
spec["viewEvidence"] = [
    {"id": AERIAL, "view": "primary: elevated (~30 deg) frontal aerial crop", "image": f"{W}/ref/brick-aerial.png",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["yellow plate top with 2x2 studs outside the glass, 2x2 more seen through the glass",
                      "dark curtain wall, mullions every 0.5 W incl. the centre line", "door module ~1 W in front of the facade base line"],
     "confidence": 0.8},
    {"id": GROUND, "view": "ground-level front view", "image": f"{W}/ref/brick-ground.png",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["plate thickness 0.21 W (a plate, not a brick)", "2 studs across the short end",
                      "door module 0.45 W tall directly under the plate front face", "frosted band across the door glass",
                      "4 equal panels, meeting stiles at centre"], "confidence": 0.75},
    {"id": COURT, "view": "courtyard context behind the minifigure", "image": f"{W}/ref/brick-courtyard.png",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["dim interior behind the door glass", "frosted band on the doors"], "confidence": 0.6},
]

BAR = 0.035                 # mullion / transom width
FX, FH, FD = 1.0, 2.4, 0.04  # curtain wall half-width, height, depth
PH, PT = 0.45, 0.21          # plate bottom (= vestibule height), plate thickness
VD = 1.0                     # vestibule depth (door plane z)
PW, PHt = 0.245, 0.42        # door panel width, height
FRAME_Z = -FD / 2            # root extrude origin = back face -> frame centred on the glass plane


def r4(v):
    return [round(float(x), 4) for x in v]


def rect(x0, y0, x1, y1, inset=0.0):
    return [[x0 + inset, y0 + inset], [x1 - inset, y0 + inset], [x1 - inset, y1 - inset], [x0 + inset, y1 - inset]]


# Curtain wall frame: outline minus panes minus the vestibule opening -> the leftover bars are mullions/transoms
cols = [(-1.0, -0.5), (-0.5, 0.0), (0.0, 0.5), (0.5, 1.0)]
rows = [(0.0, 0.8), (0.8, 1.2), (1.2, 1.6), (1.6, 2.0), (2.0, FH)]
opening = rect(-0.5, 0.0, 0.5, PH)
holes = [opening]
for (x0, x1) in cols:
    for (y0, y1) in rows:
        if y0 == 0.0 and -0.5 <= x0 and x1 <= 0.5:
            y0 = PH  # above the vestibule opening
        holes.append(rect(x0, y0, x1, y1, BAR / 2))
outline = rect(-FX - BAR / 2, 0.0, FX + BAR / 2, FH + BAR / 2)
frame_profile = {"points": outline, "depth": FD, "holes": [[r4(p) for p in h] for h in holes]}
glass_profile = {"points": outline, "depth": 0.008, "holes": [opening]}
panel_frame = {"points": rect(-PW / 2, -PHt / 2, PW / 2, PHt / 2), "depth": 0.02,
               "holes": [rect(-PW / 2, -PHt / 2, PW / 2, PHt / 2, 0.018)]}


def comp(cid, name, level, role, primitive, parent, dims, pos, material, *, scale=None, profile=None, importance=0.7, conf=0.75,
         anim_role="static", pivot=None, channels=None, constraints=None, sockets=None, features=None, evidence=None,
         attachment=None, topo_reason="", surface=None):
    c = copy.deepcopy(root_t)
    c.update({"id": cid, "name": name, "level": level, "role": role, "importance": importance, "confidence": conf,
              "primitive": primitive, "topologyClass": "assembled-solid", "topologyRationale": topo_reason, "parent": parent,
              "material": material, "materialLayers": [material], "localFeatures": features or [],
              "evidenceRefs": evidence or [AERIAL, GROUND]})
    gd = c["geometryDescriptor"]
    gd["topologyIntent"] = "hard-surface, flat faces, crisp edges"
    gd["edgeTreatment"] = {"type": "none", "bevelRadius": 0.0, "segments": 1}
    if profile:
        gd["profile2D"] = profile
    c["dimensions"] = {"width": dims[0], "height": dims[1], "depth": dims[2], "units": "plate widths (1.0 = ~5.3 m)", "confidence": conf}
    c["transform"] = {"position": r4(pos), "rotation": [0, 0, 0], "scale": r4(scale or [1, 1, 1])}
    ap = c["actionProfile"]
    ap["animationRole"] = anim_role
    ap["pivot"] = pivot or {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": conf}
    ap["transformChannels"] = channels or {"translate": False, "rotate": False, "scale": False, "bend": False, "twist": False,
                                           "detach": False, "visibility": True, "materialState": True}
    ap["collider"] = {"type": "box", "offset": [0, 0, 0], "scale": r4(dims), "isTrigger": False, "notes": "box proxy"}
    ap["constraints"] = constraints or []
    ap["sockets"] = sockets or []
    ap["destruction"] = {"breakable": False, "fractureGroup": cid, "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": material}
    c["attachment"] = attachment
    if surface:
        c["surfaceDetail"] = surface
    c["fidelityTier"] = "game-prop"
    return c


def attach(parent, socket, start, end, contact="flush-mount", **extra):
    a = {"parentId": parent, "parentSocket": socket, "localStart": r4(start), "localEnd": r4(end), "contactType": contact,
         "embedDepth": 0.005, "gapTolerance": 0.002}
    a.update(extra)
    return a


FLAT = {"macroRoughness": 0.5, "microRoughness": 0.03, "bumpAmplitude": 0.0, "normalPattern": "flat powder-coat",
        "displacementPattern": "none", "occlusionPattern": "dark AO at pane corners", "edgeWearPattern": "none", "notes": ""}
C = []
C.append(comp("root", "Curtain-wall frame around the entrance", "macro", "frame", "extrude", None, (2 * FX, FH, FD), (0, 0, FRAME_Z),
              "frame-dark", profile=frame_profile, importance=0.85, conf=0.8,
              sockets=[{"id": "vestibule-opening", "localPosition": [0, 0, -FRAME_Z], "notes": "back of the vestibule, into the lobby"},
                       {"id": "glass-plane", "localPosition": [0, 0, -FRAME_Z], "notes": "plane of the curtain wall"}],
              features=[{"id": "frame.mullionGrid", "kind": "ridge", "notes": "0.5 W bays incl. centre line; transoms 0.8/1.2/1.6/2.0"}],
              topo_reason="Mullion grid = wall outline minus pane and opening holes: one extrude gives every bar.", surface=FLAT))
C.append(comp("glass", "Curtain-wall glass", "macro", "panel", "extrude", "root", (2 * FX, FH, 0.008), (0, 0, 0.016), "glass",
              profile=glass_profile, importance=0.75, conf=0.75,
              features=[{"id": "glass.reflection", "kind": "gloss", "notes": "low roughness; semi-transparent so the inner plate shows"}],
              attachment=attach("root", "glass-plane", (-FX, 0, 0), (FX, 0, 0), "inset"),
              topo_reason="Thin extruded glazing sheet; the vestibule opening is left open."))
C.append(comp("plate", "Giant yellow LEGO 2x4 plate (vestibule roof)", "macro", "canopy", "box", "root", (1.0, PT, 2.0),
              (0, PH + PT / 2, -FRAME_Z), "plate-yellow", scale=(1.0, PT, 2.0), importance=1.0, conf=0.85,
              sockets=[{"id": "stud-top", "localPosition": [0, PT / 2, 0], "notes": "top face for the 8 studs"},
                       {"id": "underside-front", "localPosition": [0, -PT / 2, VD], "notes": "door head sits under the front edge"}],
              features=[{"id": "plate.glossyFace", "kind": "gloss", "notes": "satin-gloss ABS-like yellow"},
                        {"id": "plate.studGrid", "kind": "ridge", "notes": "2 x 4 studs built as stud-1..8"},
                        {"id": "plate.glassSeam", "kind": "seam", "notes": "plate passes through the facade glass at z = 0"}],
              attachment=attach("root", "glass-plane", (0, PH + PT / 2, -1.0), (0, PH + PT / 2, 1.0), "penetrates"),
              topo_reason="A LEGO plate is a box; half outside (roofing the vestibule), half inside the glass.",
              surface={"macroRoughness": 0.3, "microRoughness": 0.02, "bumpAmplitude": 0.0, "normalPattern": "smooth moulded plastic",
                       "displacementPattern": "none", "occlusionPattern": "contact AO under the studs and where the plate meets the glass",
                       "edgeWearPattern": "none", "notes": ""}))
n = 0
for sz in (0.75, 0.25, -0.25, -0.75):
    for sx in (-0.25, 0.25):
        n += 1
        C.append(comp(f"stud-{n}", f"Plate stud {n}", "meso", "stud", "cylinder", "plate", (0.3, 0.1, 0.3), (0, 0, 0), "plate-yellow",
                      importance=0.8, conf=0.8,
                      attachment=attach("plate", "stud-top", (sx, PT / 2, sz), (sx, PT / 2 + 0.1, sz), "moulded", baseRadius=0.15, endRadius=0.15),
                      topo_reason="LEGO stud: short cylinder on the plate top (2 x 4 grid, pitch 0.5 W)."))
# --- Vestibule (children of the plate: it is the roof; plate-local y = -PT/2 is its underside, z = VD its front edge)
UY = -PT / 2
C.append(comp("door-head", "Door head beam", "macro", "trim", "box", "plate", (1.0, 0.03, 0.04), (0, UY - 0.015, VD - 0.02),
              "door-frame", scale=(1.0, 0.03, 0.04), importance=0.6, conf=0.75,
              sockets=[{"id": "slide-track", "localPosition": [0, -0.015, 0], "notes": "track the centre leaves slide along X"}],
              attachment=attach("plate", "underside-front", (-0.5, UY - 0.015, VD - 0.02), (0.5, UY - 0.015, VD - 0.02)),
              topo_reason="Straight beam under the plate's front edge."))
HY = -0.015 - PHt / 2  # door-head local -> panel centre
for side, sx in (("left", -1), ("right", 1)):
    C.append(comp(f"sidelight-{side}", f"Fixed side light ({side})", "macro", "panel", "extrude", "door-head", (PW, PHt, 0.02),
                  (sx * 0.375, HY, -0.01), "door-frame", profile=panel_frame, importance=0.6, conf=0.7,
                  features=[{"id": f"sidelight-{side}.frame", "kind": "contour", "notes": "slim frame around the glass"}],
                  attachment=attach("door-head", "slide-track", (sx * 0.375, -0.015, 0), (sx * 0.375, -0.015 - PHt, 0)),
                  topo_reason="Framed glass panel: frame = rectangle minus inset hole, glass is a child slab."))
    C.append(comp(f"door-leaf-{side}", f"Sliding door leaf ({side})", "macro", "panel", "extrude", "door-head", (PW, PHt, 0.02),
                  (sx * 0.125, HY, -0.045), "door-frame", profile=panel_frame, importance=0.85, conf=0.7, anim_role="slider",
                  pivot={"mode": "edge", "localPosition": [-sx * PW / 2, 0, 0], "axis": [1, 0, 0], "confidence": 0.7},
                  channels={"translate": True, "rotate": False, "scale": False, "bend": False, "twist": False, "detach": False, "visibility": True, "materialState": True},
                  constraints=[{"type": "slide", "axis": [1, 0, 0], "min": min(0, sx * 0.24), "max": max(0, sx * 0.24),
                                "notes": "slides outward behind the fixed side light; open = 0.24"}],
                  features=[{"id": f"door-leaf-{side}.meetingStile", "kind": "contour", "notes": "inner frame edge meets the other leaf at x = 0"}],
                  attachment=attach("door-head", "slide-track", (sx * 0.125, -0.015, -0.045), (sx * 0.125, -0.015 - PHt, -0.045), "sliding"),
                  topo_reason="Framed glass leaf that slides behind its side light."))
for kind in ("sidelight", "door-leaf"):
    for side in ("left", "right"):
        C.append(comp(f"pane-{kind}-{side}", f"Glass ({kind} {side})", "micro", "panel", "box", f"{kind}-{side}", (PW - 0.036, PHt - 0.036, 0.006),
                      (0, 0, 0.01), "door-glass", scale=(PW - 0.036, PHt - 0.036, 0.006), importance=0.5, conf=0.7,
                      features=[{"id": f"pane-{kind}-{side}.frostedBand", "kind": "decal", "notes": "frosted band carried by a child strip"}],
                      attachment=attach(f"{kind}-{side}", "slide-track", (0, -0.19, 0.01), (0, 0.19, 0.01), "inset"),
                      topo_reason="Glass slab inside the panel frame; moves with its panel."))
        C.append(comp(f"band-{kind}-{side}", f"Frosted band ({kind} {side})", "micro", "decal", "box", f"pane-{kind}-{side}", (PW - 0.036, 0.07, 0.004),
                      (0, 0.0, 0.005), "frosted", scale=(PW - 0.036, 0.07, 0.004), importance=0.4, conf=0.6, evidence=[GROUND],
                      attachment=attach(f"pane-{kind}-{side}", "slide-track", (-0.1, 0, 0.005), (0.1, 0, 0.005), "applied"),
                      topo_reason="Thin frosted vinyl strip on the glass."))
for side, sx in (("left", -1), ("right", 1)):
    C.append(comp(f"vestibule-side-{side}", f"Vestibule side glass ({side})", "macro", "panel", "box", "plate", (0.012, PH, VD - 0.02),
                  (sx * 0.49, UY - PH / 2, (VD - 0.02) / 2), "door-glass", scale=(0.012, PH, VD - 0.02), importance=0.5, conf=0.6,
                  attachment=attach("plate", "underside-front", (sx * 0.49, UY, 0), (sx * 0.49, UY, VD - 0.02)),
                  topo_reason="Flat glass side wall of the vestibule."))
    C.append(comp(f"corner-post-{side}", f"Vestibule corner post ({side})", "macro", "trim", "box", "plate", (0.03, PH, 0.03),
                  (sx * 0.485, UY - PH / 2, VD - 0.015), "door-frame", scale=(0.03, PH, 0.03), importance=0.5, conf=0.65,
                  attachment=attach("plate", "underside-front", (sx * 0.485, UY, VD - 0.015), (sx * 0.485, UY - PH, VD - 0.015)),
                  topo_reason="Square corner post where front and side glass meet."))
C.append(comp("vestibule-floor", "Lit vestibule floor", "macro", "base", "box", "root", (0.98, 0.01, VD), (0, 0.005, VD / 2 - FRAME_Z),
              "lobby-light", scale=(0.98, 0.01, VD), importance=0.6, conf=0.5, evidence=[COURT],
              features=[{"id": "vestibule.warmGlow", "kind": "emissive", "notes": "lit floor: the open doors read as a bright way in from the game camera"}],
              attachment=attach("root", "vestibule-opening", (0, 0, 0), (0, 0, VD), "butt"),
              topo_reason="Flat slab: a box."))
# Lobby volume: back wall just behind the plate's inner end, sized so it covers every sight line through
# the glass from the 30 deg reference camera (h - LZ*tan30 at h = FH) yet stays hidden behind the facade top.
LZ, LH = 1.05, 1.8
for cid, name, dims, pos in (
    ("lobby", "Lobby back wall", (2.0, LH, 0.02), (0, LH / 2, -LZ - FRAME_Z)),
    ("lobby-floor", "Lobby floor", (2.0, 0.01, LZ), (0, 0.005, -LZ / 2 - FRAME_Z)),
    ("lobby-ceiling", "Lobby ceiling", (2.0, 0.02, LZ), (0, LH, -LZ / 2 - FRAME_Z)),
    ("lobby-side-left", "Lobby side wall (left)", (0.02, LH, LZ), (-FX, LH / 2, -LZ / 2 - FRAME_Z)),
    ("lobby-side-right", "Lobby side wall (right)", (0.02, LH, LZ), (FX, LH / 2, -LZ / 2 - FRAME_Z)),
):
    C.append(comp(cid, name, "meso", "backdrop", "box", "root", dims, pos, "interior", scale=dims, importance=0.35, conf=0.45,
                  evidence=[COURT], attachment=attach("root", "glass-plane", (pos[0], pos[1], pos[2] + FRAME_Z), (pos[0], pos[1], pos[2] + FRAME_Z - 0.01), "free-standing"),
                  topo_reason="Interior not resolvable: a closed dim volume so the glass never shows the background."))
spec["componentTree"] = C


def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.04, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.04, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    m.update(extra)
    if m.get("textureless"):
        # A flat material cannot also author texture channels (validate_textureless)
        for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
            m.pop(field, None)
    return m


GLASS = dict(clearcoat={"base": 0.3}, clearcoatRoughness={"base": 0.05})
MEANS = "material-crops/means.json (crop mean; de-lighting was unstable on <50 px crops, e.g. paving #969597 -> #2b2b32)"


def flat(*evidence):
    return {"textureless": {"declared": True, "evidence": list(evidence) + [MEANS]}}


spec["materials"] = [
    material("frame-dark", "Dark curtain-wall frame", "metal", "#2a2326", ["#33373a"], 0.5, 0.35, "aerial facade base band",
             **flat("powder-coated aluminium: flat colour at every reference scale (aerial base band, ground mullions)")),
    material("glass", "Curtain-wall glass", "glass", "#56606a", ["#3b4443", "#566062"], 0.06, 0.2, "aerial glazing right of the plate",
             localOverrides=[{"id": "glass.reflection", "kind": "gloss", "notes": "reflects the plate and sky"}],
             opacity={"base": 0.62}, doubleSided=True, envMapIntensity=1.2, **GLASS,
             **flat("float glass: visible variation in the aerial is reflection and interior, not surface texture")),
    material("plate-yellow", "LEGO yellow plastic", "plastic", "#e2b204", ["#ddae06", "#e3ca3b"], 0.42, 0.0,
             "aerial front face #ddae06, aerial top #e3ca3b, ground front face #d6a51f",
             localOverrides=[{"id": "plate.glossyFace", "kind": "gloss", "notes": "satin gloss highlight on the top face"},
                             {"id": "plate.studShadow", "kind": "stain", "notes": "contact shadow crescent beside each stud (lighting/AO)"}],
             envMapIntensity=0.3,
             **flat("moulded/painted plate: uniform yellow in the aerial and ground views; shading only from studs and light")),
    material("door-frame", "Door frame metal", "metal", "#383b37", ["#4c5653"], 0.5, 0.4, "ground view door stile",
             **flat("ground view stiles are 10-15 px wide flat dark grey")),
    material("door-glass", "Door glass", "glass", "#474d50", ["#4a5653"], 0.06, 0.2, "same glass as the curtain wall (aerial glazing)",
             opacity={"base": 0.75}, doubleSided=True, **GLASS,
             **flat("float glass; the dark crop mean #212018 is the interior behind it, modelled separately")),
    material("frosted", "Frosted vinyl band", "plastic", "#b4bcbb", ["#748791"], 0.7, 0.0, "aerial band #9fa8a4 lit; ground #748791 overcast",
             **flat("ground view band is one flat blue-grey strip")),
    material("lobby-light", "Lit vestibule floor", "stone", "#d9d2c3", ["#c4bcab"], 0.8, 0.0, "stylised: interior not resolvable",
             emissive="#efe9dc", emissiveIntensity={"base": 0.3},
             **flat("interior not resolvable in any view; lit flat floor is a readability choice for the game camera")),
    material("interior", "Dim lobby interior", "stone", "#45474a", ["#3b2c1b"], 0.8, 0.0,
             "aerial: interior reads neutral grey through the facade glass (courtyard crop #3b2c1b is lamp-warm)",
             **flat("aerial and courtyard views: interior reads as one dark tone through the glass")),
]


def rgba(h, a=1.0):
    h = h.lstrip("#")
    return f"rgba({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)}, {a})"


mats = {m["id"]: m for m in spec["materials"]}
for c in C:
    m = mats[c["material"]]
    c["colorMaterialRecipe"] = {"dominantAlbedo": rgba(m["baseColor"]), "secondaryAlbedo": rgba(m["albedo"]["secondary"][0]),
                                "materialClass": m["materialClass"], "materialClassConfidence": 0.75, "evidenceRefs": c["evidenceRefs"]}
spec["repetitionSystems"] = [
    {"id": "studs", "target": "plate", "count": 8, "elementComponentIds": [f"stud-{i}" for i in range(1, 9)], "distribution": "2 x 4 grid, pitch 0.5",
     "notes": "built as individual stud components"},
    {"id": "mullion-grid", "target": "root", "count": len(holes), "elementComponentIds": ["root"], "distribution": "0.5 W bays", "notes": "pane holes in the frame extrude"},
    {"id": "door-panels", "target": "door-head", "count": 4, "elementComponentIds": ["sidelight-left", "door-leaf-left", "door-leaf-right", "sidelight-right"],
     "distribution": "4 equal panels across the plate width", "notes": "centre pair slides"},
]
spec["silhouette"] = {"boundingShape": "planar curtain-wall slab 2.0 x 2.4 with a 1.0 x 0.21 x 2.0 plate box at 0.45 roofing a 1.0-deep glass vestibule",
                      "aspectRatios": ["plate 1 : 0.21 : 2", "door module 1 : 0.45"], "symmetry": "bilateral about x = 0",
                      "dominantCurves": ["8 stud circles"], "negativeSpaces": ["vestibule interior seen through the open doors"],
                      "landmarks": ["plate bottom = vestibule height = 0.45", "door plane flush under the plate front edge", "studs on plate top"]}
spec["coordinateFrame"] = {"front": "+Z toward the courtyard", "up": "+Y", "scaleReference": "1.0 = plate width (~5.3 m)"}
spec["featureReviewTargets"] = [
    {"id": "plate-canopy", "name": "Yellow 2x4 plate with studs, half outside (vestibule roof) / half inside the glass", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.8, "mustPass": True,
     "componentRefs": ["plate"] + [f"stud-{i}" for i in range(1, 9)]},
    {"id": "door-module", "name": "Four-panel glass door module flush under the plate front edge; centre leaves slide", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "interaction-pass"], "minimumScore": 0.75, "mustPass": True,
     "componentRefs": ["door-head", "sidelight-left", "sidelight-right", "door-leaf-left", "door-leaf-right"]},
    {"id": "curtain-wall", "name": "Dark curtain wall with 0.5 W bays and a centre mullion", "tier": "important", "passIds": ["structural-pass", "material-pass"],
     "minimumScore": 0.65, "mustPass": False, "componentRefs": ["root", "glass"]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["elevated front 30 deg (aerial-matched)", "iso yaw 45", "iso yaw -45", "doors open"]
# Intended use is a game prop rendered to ~50 px sprites: flat, evidence-backed materials (textureless
# declarations) instead of the photographic reference-fidelity texture bar.
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 20000, "maxDrawCalls": 60, "textureSize": 1024, "fpsTarget": 60})
spec["lightingFromPhoto"] = [
    {"id": "key-sun", "type": "directional", "role": "key", "intensity": 2.4, "position": [-6, 4, 3], "direction": [0.79, -0.53, -0.4],
     "castsShadow": True,
     "evidence": "aerial: stud shadows fall ~0.17 W to the right of 0.1 W studs -> sun from the left at ~30 deg, slightly in front (plate front face lit)"},
    {"id": "sky-fill", "type": "hemisphere", "role": "fill", "intensity": 0.6, "skyColor": "#dfe8ff", "groundColor": "#6b6455",
     "evidence": "soft cool fill; shadowed stud sides stay mid-yellow, not black"},
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.3, "evidence": "sky reflections in the glass"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 0.55,
     "notes": "review renders (lab rig 'photo'): Khronos PBR Neutral keeps the saturated yellow like the photo (ACES pulled it to cream); game sprites use the converter rig"},
    {"id": "contact", "role": "shadow", "notes": "stud cast shadows on the plate top (identity cue in the aerial); contact shadow under the plate onto the door head"},
]
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "pass"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "holes", len(holes), "materials", len(spec["materials"]))

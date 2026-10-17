"""ObjectSculptSpec for Stadionhallerne, the red heritage hall in front of the new Aarhus stadium
(Linear POR-36), as a 4 x 2 tile city building.

Gustav, 2026-10-17: the red hall is the entrance of the stadium and stands on its south side, its long side parallel to
the stadium's south long side; the lobby runs north to the plot edge, where the stadium's brick entrance link meets it.
Style: ref/run4-style.png (run 4, node 629:3613): two long red-brick halls (Søjlehallen 1 and 2) with dark grey pitched
roofs on either side of a taller central lobby, rows of tall windows. Facts: the 1:1000 site plan (two halls either side
of "The Central Lobby"), the north-west aerial render.
Height 2.0 wu at the ridge: walls 1.3 wu, lower than the stadium's 2.6 wu roof edge.

Frame: 1 unit = 1 wu. +Y up, the pavement top at y = G, the 4 x 2 footprint centred on the origin: X along the hall
(4 wu, -2..2), Z across (2 wu, -1..1). The +Z and +X sides face the default camera. In the city the hall is turned a
(The hall is not turned: its +Z side faces south, like the stadium's.)
"""
import copy
import json
import math
import sys

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
REF = "run4"
spec["viewEvidence"] = [
    {"id": REF, "view": "primary: AI image (run 4) with the red hall beside the stadium's end (style, colour, identity features)",
     "image": f"{W}/ref/run4-style.png", "imageRegion": {"x": 0.04, "y": 0.36, "width": 0.38, "height": 0.3, "units": "normalized"},
     "observations": ["two long red-brick halls with dark grey pitched roofs", "a taller central block between them",
                      "rows of tall windows along the long sides", "light roof vents on the roof slopes"],
     "confidence": 0.8},
]

G = 0.04
HX, HZ = 2.0, 1.0
WALL = 1.3                 # eaves height
RIDGE = 2.0                # ridge height
LOB = (-0.42, 0.42)        # central lobby (x)
LOB_H = 1.75
D = 0.9                    # half depth of the halls (0.1 wu margin to the plot edge)


def r4(v):
    return [round(float(x), 4) for x in v]


def comp(cid, name, level, role, primitive, dims, pos, material, *, rot=None, importance=0.6, conf=0.75, features=None,
         evidence=None, topo="", sockets=None, contact="flush-mount", start=None, end=None, radius=None, parent="root",
         scale=None, descriptor=None):
    c = copy.deepcopy(root_t)
    c.update({"id": cid, "name": name, "level": level, "role": role, "importance": importance, "confidence": conf,
              "primitive": primitive, "topologyClass": "assembled-solid",
              "topologyRationale": topo or f"Hard-surface {role}: a {primitive} at sprite scale.", "parent": parent,
              "material": material, "materialLayers": [material], "localFeatures": features or [],
              "evidenceRefs": evidence or [REF]})
    gd = c["geometryDescriptor"]
    gd["topologyIntent"] = "hard-surface, flat faces, crisp edges"
    gd["edgeTreatment"] = {"type": "none", "bevelRadius": 0.0, "segments": 1}
    if descriptor:
        gd.update(descriptor)
    c["dimensions"] = {"width": round(dims[0], 4), "height": round(dims[1], 4), "depth": round(dims[2], 4),
                       "units": "wu (1 tile edge, ~2 m)", "confidence": conf}
    p = list(pos) if parent is None else [pos[0], pos[1] - G / 2, pos[2]]
    c["transform"] = {"position": r4(p), "rotation": r4(rot or [0, 0, 0]), "scale": r4(scale or dims)}
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


def lf(fid, kind, notes):
    return [{"id": fid, "kind": kind, "notes": notes}]


def bx(cid, name, level, role, x0, x1, y0, y1, z0, z1, material, *, contact="resting", rot=None, **kw):
    y0, y1 = G + y0, G + y1
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    C.append(comp(cid, name, level, role, "box", (x1 - x0, y1 - y0, z1 - z0), (cx, (y0 + y1) / 2, cz), material, contact=contact,
                  start=(cx, y0, cz), end=(cx, y1, cz), rot=rot, **kw))


def gable(cid, name, x0, x1, material, **kw):
    """A hall body: the house cross-section (walls to WALL, ridge at RIDGE) extruded along X from x0 to x1.
    The profile is drawn in (-z, y) and turned +90 deg about Y, so the extrusion runs along +X."""
    prof = [(-D, 0), (D, 0), (D, WALL), (0, RIDGE), (-D, WALL)]
    profile = {"points": [r4((-z, y)) for z, y in prof], "depth": round(x1 - x0, 4)}
    C.append(comp(cid, name, "macro", "hall", "extrude", (x1 - x0, RIDGE, 2 * D), (x0, G, 0), material, rot=[0, math.pi / 2, 0],
                  scale=[1, 1, 1], descriptor={"profile2D": profile}, contact="resting", start=(x0, G, 0), end=(x1, G, 0), **kw))


def roof_plane(cid, name, x0, x1, side, material, **kw):
    """One dark roof slope from the ridge down to just past the eaves on the +Z (side 1) or -Z (side -1) side."""
    over, t = 0.08, 0.05
    dz, dy = D + over, -(RIDGE - WALL) * (D + over) / D
    length = math.hypot(dz, dy)
    ang = math.atan2(-dy, dz) * side          # tips the outer edge down
    cz, cy = side * dz / 2, G + RIDGE + dy / 2 + t / 2
    C.append(comp(cid, name, "meso", "roof", "box", (x1 - x0 + 0.1, t, length), ((x0 + x1) / 2, cy, cz), material, rot=[ang, 0, 0],
                  contact="flush-mount", start=((x0 + x1) / 2, G + RIDGE, 0), end=((x0 + x1) / 2, G + WALL, side * D), **kw))


# ---------------------------------------------------------------------------------------------------------------
C.append(comp("root", "Pavement", "macro", "base", "box", (2 * HX, G, 2 * HZ), (0, G / 2, 0), "paving", parent=None,
              importance=0.7, conf=0.95, sockets=[{"id": "ground-top", "localPosition": [0, G / 2, 0], "notes": "top of the pavement"}],
              features=lf("root.pad", "contour", f"{2 * HX:g} x {2 * HZ:g} wu pavement = the footprint"),
              topo="Flat pad: a box exactly the size of the footprint."))

halls = (("hall-west", "Søjlehallen 1", -HX + 0.05, LOB[0]), ("hall-east", "Søjlehallen 2", LOB[1], HX - 0.05))
for cid, name, x0, x1 in halls:
    gable(cid, name, x0, x1, "brick", importance=0.9,
          features=lf("hall-west.gable", "contour", "long red-brick hall with a pitched roof and gable ends") if cid == "hall-west" else None,
          topo="Hall body: a house cross-section extruded along the hall.")
    for side, s in ((1, "S"), (-1, "N")):
        roof_plane(f"{cid}-roof-{s}", f"{name} roof {s}", x0, x1, side, "roof-dark", importance=0.8,
                   features=lf("hall-west-roof-S.slate", "contour", "dark grey roof slope") if (cid == "hall-west" and s == "S") else None,
                   topo="Roof slope: a thin box tilted about X.")
    # tall windows along both long sides, one per 0.4 wu
    n = int((x1 - x0 - 0.2) / 0.4)
    for i in range(n):
        wx = x0 + 0.2 + (x1 - x0 - 0.2 - 0.4 * (n - 1)) / 2 + 0.4 * i - 0.1 + 0.1
        for side, s in ((1, "S"), (-1, "N")):
            z0 = side * D if side > 0 else -D - 0.012
            # round 4: a light frame behind each window so the rows read at game size
            bx(f"{cid}-winframe-{s}-{i + 1}", f"{name} window frame {s}{i + 1}", "micro", "window", wx - 0.12, wx + 0.12, 0.3, 1.06,
               min(z0, z0 + 0.008), max(z0, z0 + 0.008), "cornice", contact="flush-mount", importance=0.3)
            z1 = z0 + 0.006 if side > 0 else z0 - 0.006
            bx(f"{cid}-win-{s}-{i + 1}", f"{name} window {s}{i + 1}", "micro", "window", wx - 0.09, wx + 0.09, 0.35, 1.0,
               min(z1, z1 + 0.012), max(z1, z1 + 0.012), "window", contact="flush-mount", importance=0.4,
               features=lf("hall-west-win-S-1.tall", "contour", "tall window with a white sill") if (cid == "hall-west" and s == "S" and i == 0) else None)
    # light roof vents on the south slope (run 4)
    for i, vx in enumerate((x0 + 0.35, (x0 + x1) / 2, x1 - 0.35), 1):
        # round 4: raised roof lights, bigger, standing off the slope, so they read as boxes and not dashes
        bx(f"{cid}-vent-{i}", f"{name} roof light {i}", "micro", "roof", vx - 0.13, vx + 0.13, 1.55, 1.9, 0.28, 0.5, "vent", importance=0.4)

# central lobby: a taller flat-roofed brick block with a white cornice and the lit main door on the south side
bx("lobby", "Central lobby", "macro", "lobby", LOB[0], LOB[1], 0, LOB_H, -HZ, D + 0.05, "brick", importance=0.85,
   features=lf("lobby.block", "contour", "taller central block between the two halls"), topo="Lobby: a box.")
bx("lobby-cornice", "Lobby cornice", "meso", "lobby", LOB[0] - 0.04, LOB[1] + 0.04, LOB_H - 0.08, LOB_H, -HZ, D + 0.09, "cornice",
   importance=0.5, topo="Cornice: a thin box round the top of the lobby.")
bx("lobby-roof", "Lobby roof", "meso", "lobby", LOB[0] + 0.02, LOB[1] - 0.02, LOB_H, LOB_H + 0.03, -HZ, D + 0.03, "roof-dark",
   importance=0.4)
bx("lobby-door", "Main door", "meso", "entrance", -0.22, 0.22, 0, 0.75, D + 0.05, D + 0.065, "door-lit", contact="flush-mount", importance=0.7,
   features=lf("lobby-door.lit", "contour", "lit arched main door on the south side"))
bx("lobby-door-arch", "Door arch", "micro", "entrance", -0.26, 0.26, 0.75, 0.85, D + 0.05, D + 0.07, "cornice", contact="flush-mount", importance=0.3)
for i, wx in enumerate((-0.27, 0.27), 1):
    bx(f"lobby-win-{i}", f"Lobby window {i}", "micro", "window", wx - 0.06, wx + 0.06, 1.0, 1.45, D + 0.05, D + 0.062, "window",
       contact="flush-mount", importance=0.3)
bx("plinth", "Brick plinth", "meso", "hall", -HX + 0.03, HX - 0.03, 0, 0.12, -D - 0.02, D + 0.02, "brick-dark", importance=0.4,
   topo="Dark plinth along the base: a box.")


# ---------------------------------------------------------------------------------------------------------------
def material(mid, name, cls, color, secondary, rough, metal, notes, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": secondary, "samplingNotes": notes},
              "colorVariation": {"palette": [color] + secondary, "pattern": "mottled", "amplitude": 0.02, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.02, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes})
    m.update({"emissive": color, "emissiveIntensity": {"base": 0.25}})
    m.update({"textureless": {"declared": True, "evidence": ["ref/run4-style.png (flat-shaded AI sprite)", "flat colour at sprite size"]}})
    m.update(extra)
    for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
        m.pop(field, None)
    return m


spec["materials"] = [
    material("paving", "Pavement", "stone", "#d9d1c1", ["#cfc7b7"], 0.9, 0.0, "light paving (as the stadium plaza)"),
    material("brick", "Red brick", "stone", "#b8573f", ["#ad5039"], 0.9, 0.0, "red brick walls (run 4)",
             localOverrides=[{"id": "brick.courses", "kind": "linework", "notes": "brick courses below sprite size: flat red"}]),
    material("brick-dark", "Dark brick plinth", "stone", "#8d3f2e", ["#843b2b"], 0.9, 0.0, "darker brick at the base"),
    material("roof-dark", "Dark roof", "stone", "#5d6166", ["#565a5f"], 0.85, 0.0, "dark grey pitched roofs (run 4)"),
    material("vent", "Roof vents", "metal", "#d7d8d6", ["#cdcecc"], 0.7, 0.1, "light vents on the roof slopes (run 4)"),
    material("window", "Windows", "glass", "#2f3a44", ["#29333c"], 0.3, 0.0, "tall dark windows"),
    material("cornice", "Cornice", "stone", "#e9e3d6", ["#dfd9cc"], 0.8, 0.0, "light stone cornice and door arch", emissiveIntensity={"base": 0.4}),
    material("door-lit", "Lit door", "glass", "#f2dca6", ["#e8d29c"], 0.2, 0.0, "main door, lit from inside", emissiveIntensity={"base": 0.6}),
]


def rgba(h, a=1.0):
    h = h.lstrip("#")
    return f"rgba({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)}, {a})"


mats = {m["id"]: m for m in spec["materials"]}
for c in C:
    m = mats[c["material"]]
    c["colorMaterialRecipe"] = {"dominantAlbedo": rgba(m["baseColor"]), "secondaryAlbedo": rgba(m["albedo"]["secondary"][0]),
                                "materialClass": m["materialClass"], "materialClassConfidence": 0.75, "evidenceRefs": c["evidenceRefs"]}
spec["componentTree"] = C
ids = [c["id"] for c in C]
spec["repetitionSystems"] = [
    {"id": "windows", "target": "root", "count": len([i for i in ids if "-win-" in i]), "elementComponentIds": [i for i in ids if "-win-" in i],
     "distribution": "one tall window per 0.4 wu along both long sides of each hall", "notes": ""},
    {"id": "vents", "target": "root", "count": len([i for i in ids if "-vent-" in i]), "elementComponentIds": [i for i in ids if "-vent-" in i],
     "distribution": "three vents on each hall's south slope", "notes": ""},
]
spec["silhouette"] = {"boundingShape": f"{2 * HX:g} x {2 * HZ:g} wu, ridge {RIDGE} wu, lobby {LOB_H} wu",
                      "aspectRatios": [f"footprint {2 * HX:g} : {2 * HZ:g}", f"height {RIDGE} : length {2 * HX:g}"],
                      "symmetry": "mirror about the lobby", "dominantCurves": [], "negativeSpaces": [],
                      "landmarks": ["two pitched roofs", "central lobby", "red brick"]}
spec["coordinateFrame"] = {"front": "+Z", "up": "+Y", "scaleReference": "1.0 = 1 wu = one tile edge (~2 m); avatar 0.9"}
spec["featureReviewTargets"] = [
    {"id": "halls", "name": "Two long red-brick halls with dark pitched roofs", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["hall-west", "hall-east", "hall-west-roof-S"]},
    {"id": "lobby", "name": "Taller central lobby with the lit main door", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["lobby", "lobby-cornice", "lobby-door"]},
    {"id": "windows", "name": "Rows of tall windows", "tier": "important",
     "passIds": ["form-refinement", "material-pass"], "minimumScore": 0.6, "mustPass": False,
     "componentRefs": ["hall-west-win-S-1"]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["sprite south/west/north/east (turntable)", "beside the stadium's end"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 3000, "maxDrawCalls": 200, "textureSize": 256, "fpsTarget": 60})
spec["lightingFromPhoto"] = [
    {"id": "sky", "type": "hemisphere", "role": "key", "intensity": 1.0, "skyColor": "#f4f6f8", "groundColor": "#8a8378", "evidence": "run 4"},
    {"id": "key", "type": "directional", "role": "key", "intensity": 1.4, "position": [-3, 6, 4], "direction": [0.4, -0.8, -0.5],
     "castsShadow": True, "evidence": "city rules section 3"},
    {"id": "fill", "type": "directional", "role": "fill", "intensity": 0.4, "position": [5, 4, -3], "evidence": "side faces readable"},
    {"id": "env", "type": "environment", "role": "environment", "intensity": 0.3, "evidence": "soft reflections"},
    {"id": "tone", "role": "exposure", "toneMapping": "Neutral", "exposure": 1.0, "notes": "game sprites use the converter rig"},
    {"id": "contact", "role": "shadow", "notes": "soft contact shadows under the eaves"},
]
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "conditional"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "materials", len(spec["materials"]))

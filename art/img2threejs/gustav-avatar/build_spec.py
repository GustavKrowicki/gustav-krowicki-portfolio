"""ObjectSculptSpec for Gustav's city avatar, layered on img2threejs's character-v1.5 humanoid template.

new_sculpt_spec.py (--domain animated-character, anatomy from fill_anatomy.py) authors the humanoid template:
pelvis > abdomen > chest > neck > head, clavicle > upper arm > forearm > hand, thigh > shin > foot, in template
units (head unit hu = 0.28; the built figure is ~1.11 units tall). This script turns it into the sprite's person:

- outfit: light grey open jacket (chest, abdomen, pelvis = jacket hem, clavicles, both arm segments), dark olive
  tee band down the open front, dark indigo jeans, dark shoes; skin only on neck, face and hands
- head: mop hair cap wider than the face plus a fringe to the brow line (both standProud against the skull),
  face features moved to the measured landmarks (eyes at 0.70 of the head box), light glasses rims
- low poly for 24-48 px: digits, eye cavities (SDF), brows and ears removed (hidden under the hair at that size)
- rig re-derived from the edited tree (19 bones), flat textureless materials calibrated to measure/palette.json

The game scales the figure to CHARACTER_HEIGHT_WU = 0.9 (lib/city/units.ts) in lib/city/models/gustavAvatarRig.ts.
Usage: python3 -I build_spec.py <workspace>  (rebuild_spec.sh runs the whole chain)
"""
import copy
import json
import os
import sys

W = sys.argv[1]
FORGE = os.path.expanduser(os.environ.get("IMG2THREEJS", "~/.claude/skills/img2threejs")) + "/forge"
sys.path.insert(0, f"{FORGE}/stage2_spec")
sys.path.insert(0, f"{FORGE}/_shared")
from new_sculpt_spec import derive_character_rig  # noqa: E402

spec = json.load(open(f"{W}/object-sculpt-spec.json"))
palette = json.load(open(f"{W}/measure/palette.json"))
tree = spec["componentTree"]
by = {c["id"]: c for c in tree}
template = copy.deepcopy(by["nose"])
HU = 0.28
REF = "ref/north-00-x12-white.png"
EV = ["north-face-on", "east-face-on", "south-back", "west-back"]

spec["viewEvidence"] = [
    {"id": "east-face-on", "view": "east walk frames, three-quarter front (carries the laptop prop, not built)",
     "image": f"{W}/ref/east-00-x12-white.png", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["mop hair wider than the face, fringe to the brows", "light frames around the eyes",
                      "light grey jacket open over a dark tee", "dark indigo jeans, dark shoes", "laptop under the arm"],
     "confidence": 0.7},
    {"id": "north-face-on", "view": "FIXED REFERENCE: north walk frame 0, three-quarter front, game camera (yaw -45, 30 deg)",
     "image": f"{W}/{REF}", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["same palette mirrored", "tee band visible at the open front", "no laptop on this side"],
     "confidence": 0.65},
    {"id": "south-back", "view": "south walk frames, three-quarter back",
     "image": f"{W}/ref/south-00-x12.png", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["hair covers the back of the head down to the neck", "plain jacket back, hem at the hip"],
     "confidence": 0.65},
    {"id": "west-back", "view": "west walk frames, three-quarter back", "image": f"{W}/ref/west-00-x12.png",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["round hair mass, no visible part line", "arms close to the body"], "confidence": 0.6},
]

# ---- remove what cannot read at 24-48 px ------------------------------------------------------------
DROP_PREFIX = ("thumb-", "index-", "middle-", "ring-", "little-", "eye-cavity-", "brow-", "ear-")
tree[:] = [c for c in tree if not c["id"].startswith(DROP_PREFIX)]
by = {c["id"]: c for c in tree}


def r4(v):
    return [round(float(x), 5) for x in v]


def set_dims(c, size):
    c["transform"]["scale"] = r4(size)
    c["dimensions"].update({"width": size[0], "height": size[1], "depth": size[2], "units": "template units (figure ~1.11)"})


def part(cid, name, primitive, parent, pos, size, material, *, role="detail", level="micro", importance=0.5, features=None,
         rotation=(0, 0, 0), topo=""):
    c = copy.deepcopy(template)
    c.update({"id": cid, "name": name, "primitive": primitive, "parent": parent, "material": material,
              "materialLayers": [material], "role": role, "level": level, "importance": importance,
              "localFeatures": features or [], "evidenceRefs": EV,
              "topologyRationale": topo or f"{name} is a discrete stylized primitive riding its parent bone."})
    c["transform"] = {"position": r4(pos), "rotation": list(rotation), "scale": [1, 1, 1]}
    set_dims(c, size)
    c["actionProfile"]["destruction"]["fractureGroup"] = cid
    c["actionProfile"]["destruction"]["debrisMaterial"] = material
    tree.append(c)
    by[cid] = c
    return c


# ---- materials on the template parts ----------------------------------------------------------------
JACKET = ("pelvis", "abdomen", "chest", "clavicle-l", "clavicle-r", "upper-arm-l", "upper-arm-r", "forearm-l", "forearm-r")
for cid in JACKET:
    by[cid]["material"] = "jacket"
for cid in ("thigh-l", "thigh-r", "shin-l", "shin-r"):
    by[cid]["material"] = "jeans"
for cid in ("neck", "head", "hand-l", "hand-r", "nose"):
    by[cid]["material"] = "skin"
for cid in ("foot-l", "foot-r"):
    by[cid]["material"] = "shoes"
by["mouth"]["material"] = "lips"
for side in ("l", "r"):
    by[f"eye-{side}"]["material"] = "eye"
for c in tree:
    c["materialLayers"] = [c["material"]]

# Jacket hem: the pelvis becomes the jacket skirt (sprite hem at 0.29 H from the floor, 0.05 H below the hip joint)
set_dims(by["pelvis"], (0.215, 0.135, 0.165))
by["pelvis"]["localFeatures"] = [{"id": "jacket-skirt", "kind": "contour",
                                  "notes": "jacket hem flares slightly over the hips and covers the top of the jeans"}]
by["pelvis"]["name"] = "Pelvis / jacket hem"
# Mitten hands: an ellipsoid reads rounder than the template box at 3 px
by["hand-l"]["primitive"] = by["hand-r"]["primitive"] = "ellipsoid"
for side in ("l", "r"):
    set_dims(by[f"hand-{side}"], (0.05, 0.075, 0.042))
    by[f"foot-{side}"]["localFeatures"] = [{"id": "shoe-break", "kind": "seam", "notes": "jeans hem breaks over the shoe top"}]
    set_dims(by[f"foot-{side}"], (0.062, 0.042, 0.11))

# ---- face features to the measured landmarks (anatomy.faceLandmarks; head box = hair top 0.185 .. chin -0.157) --
HEAD_TOP, CHIN = 0.185, -0.157
box = HEAD_TOP - CHIN


def at(fraction):
    return HEAD_TOP - fraction * box


lm = spec["preSpecAssessment"]["anatomy"]["faceLandmarks"]
eye_y = at(lm["eyeLine"])
for side, sign in (("l", 1), ("r", -1)):
    by[f"eye-{side}"]["transform"]["position"] = r4((sign * 0.052, eye_y, 0.12))
    set_dims(by[f"eye-{side}"], (0.026, 0.03, 0.02))
# Head: a wider face than the template so it fills the hair's width from the 30 deg game camera, as in the sprite
set_dims(by["head"], (0.29, 0.31, 0.285))
by["nose"]["transform"]["position"] = r4((0, at(lm["noseBase"]) + 0.018, 0.128))
set_dims(by["nose"], (0.03, 0.045, 0.04))
by["mouth"]["transform"]["position"] = r4((0, at(lm["mouthLine"]) + 0.012, 0.098))
set_dims(by["mouth"], (0.05, 0.008, 0.012))

# ---- hair: mop cap + fringe, both held outside the skull ----------------------------------------------
hair = by["hair"]
hair["transform"]["position"] = r4((0, 0.055, -0.028))
# A short neck: the sprite shows none between the hair and the jacket collar
by["head"]["transform"]["position"][1] = round(by["head"]["transform"]["position"][1] - 0.035, 5)
set_dims(hair, (0.305, 0.245, 0.29))
hair["standProud"] = {"againstComponentId": "head", "clearance": 0.006, "maxPush": 0.03,
                      "notes": "the cap must stay outside the skull everywhere it covers it, or the crown renders bald"}
hair["localFeatures"] = [{"id": "mop-overhang", "kind": "contour", "notes": "cap 0.33 wide vs 0.26 skull: overhangs the sides and back"}]
hair["topologyRationale"] = ("Short mop haircut = one smooth shell mass (default hair tier 'shell'); strand impression is not "
                             "resolvable at 56 px, so no locks.")
hair["localFeatures"].append({"id": "fringe-edge", "kind": "contour",
                              "notes": "the cap's front edge, pushed proud of the forehead, is the fringe: it ends at the "
                                       "hairline landmark (0.58 of the head box)"})

# ---- glasses: light rims at eye height -------------------------------------------------------------
for side, sign in (("l", 1), ("r", -1)):
    # Rims hug the face: smaller, and turned about Y with the face curvature (feature-placement review: flat
    # rims stuck out of the profile at the game yaw)
    part(f"glasses-frame-{side}", f"Glasses rim {side.upper()}", "torus", "head", (sign * 0.05, eye_y, 0.127),
         (0.05, 0.042, 0.01), "glasses-frame", role="rim", level="micro", importance=0.6, rotation=(0, sign * 0.35, 0),
         features=[{"id": f"glasses-rim-{side}", "kind": "linework", "notes": "thin light rim around the eye"}])
part("glasses-bridge", "Glasses bridge", "box", "head", (0, eye_y + 0.006, 0.136), (0.036, 0.007, 0.008), "glasses-frame",
     role="trim", level="micro", importance=0.4)

# ---- tee band down the open jacket front ------------------------------------------------------------
part("tee-front", "Tee band (open jacket front)", "box", "chest", (0, 0.085, 0.078), (0.05, 0.17, 0.03), "tee", role="panel",
     level="meso", importance=0.65, rotation=(-0.145, 0, 0),
     features=[{"id": "jacket-open-front", "kind": "seam", "notes": "dark olive tee visible between the jacket fronts"}],
     topo="A thin panel on the chest front reads as the gap between the two jacket fronts.")
part("tee-front-low", "Tee band, lower", "box", "abdomen", (0, 0.06, 0.086), (0.045, 0.12, 0.03), "tee", role="panel",
     level="meso", importance=0.5, rotation=(0.056, 0, 0))
# A bulkier jacket torso (sprite: torso ~0.24 H wide without the arms)
by["chest"]["attachment"]["baseRadius"], by["chest"]["attachment"]["endRadius"] = 0.104, 0.076
by["abdomen"]["attachment"]["baseRadius"], by["abdomen"]["attachment"]["endRadius"] = 0.094, 0.102
# Jacket collar: a ring around the neck base, so the neck does not read as a bare column
part("jacket-collar", "Jacket collar", "torus", "chest", (0, 0.168, 0.004), (0.16, 0.16, 0.06), "jacket", role="trim",
     level="meso", importance=0.5, rotation=(1.5708, 0, 0),
     features=[{"id": "collar-ring", "kind": "contour", "notes": "jacket collar around the neck base"}])
# Shoulders: rounder, less like pads (clavicle = deltoid mass under the jacket)
for side in ("l", "r"):
    by[f"clavicle-{side}"]["attachment"]["baseRadius"] = 0.03
    by[f"clavicle-{side}"]["attachment"]["endRadius"] = 0.042
    by[f"upper-arm-{side}"]["attachment"]["baseRadius"] = 0.056
    by[f"upper-arm-{side}"]["attachment"]["endRadius"] = 0.048
    by[f"forearm-{side}"]["attachment"]["baseRadius"] = 0.046
    by[f"forearm-{side}"]["attachment"]["endRadius"] = 0.04

HEAD_K3 = float(os.environ.get("AVATAR_HEAD_K", "0.63"))  # v3: hair top to chin = 1:4.20 of H (clips-authored.json headToHeight)
# ==== v2 refinement (Gustav's review of v1): smaller head, tighter jacket, clearer face, laptop ===================
VERSION = int(os.environ.get("AVATAR_V", "3"))
V2 = VERSION >= 2
V3 = VERSION >= 3
if V2:
    # -- tighter jacket: slimmer torso and sleeves; rounder shoulders (clavicle end = sleeve top radius)
    by["chest"]["attachment"]["baseRadius"], by["chest"]["attachment"]["endRadius"] = 0.088, 0.064
    by["abdomen"]["attachment"]["baseRadius"], by["abdomen"]["attachment"]["endRadius"] = 0.08, 0.086
    set_dims(by["pelvis"], (0.18, 0.12, 0.14))
    for side in ("l", "r"):
        by[f"clavicle-{side}"]["attachment"]["baseRadius"] = 0.026
        by[f"clavicle-{side}"]["attachment"]["endRadius"] = 0.04
        by[f"upper-arm-{side}"]["attachment"]["baseRadius"] = 0.04
        by[f"upper-arm-{side}"]["attachment"]["endRadius"] = 0.035
        by[f"forearm-{side}"]["attachment"]["baseRadius"] = 0.034
        by[f"forearm-{side}"]["attachment"]["endRadius"] = 0.03
        # rounded shoes instead of boxes
        by[f"foot-{side}"]["primitive"] = "ellipsoid"
        set_dims(by[f"foot-{side}"], (0.064, 0.05, 0.12))
    for cid, z, tilt in (("tee-front", 0.066, -0.14), ("tee-front-low", 0.072, 0.048)):
        by[cid]["transform"]["position"][2] = z
        by[cid]["transform"]["rotation"] = [tilt, 0, 0]
    set_dims(by["tee-front"], (0.042, 0.17, 0.024))
    set_dims(by["tee-front-low"], (0.038, 0.12, 0.024))
    set_dims(by["jacket-collar"], (0.13, 0.13, 0.05))

    # -- clearer face (authored at the old head size, then the whole head scales by HEAD_K below):
    # flatter, wider face so both eyes read at the game yaw; dark eyes spaced wider; brows; a darker, thicker
    # glasses frame; the hair cap lifted so the fringe ends above the brows
    set_dims(by["head"], (0.29, 0.31, 0.26))
    brow_y = eye_y + 0.036
    for side, sign in (("l", 1), ("r", -1)):
        by[f"eye-{side}"]["transform"]["position"] = r4((sign * 0.058, eye_y, 0.106))
        set_dims(by[f"eye-{side}"], (0.032, 0.038, 0.022))
        by[f"glasses-frame-{side}"]["transform"]["position"] = r4((sign * 0.056, eye_y, 0.111))
        by[f"glasses-frame-{side}"]["transform"]["rotation"] = [0, sign * 0.6, 0]
        set_dims(by[f"glasses-frame-{side}"], (0.058, 0.05, 0.012))
        by[f"glasses-frame-{side}"]["geometryDescriptor"]["torusTubeRatio"] = 0.16
        part(f"brow-{side}", f"Brow {side.upper()}", "ellipsoid", "head", (sign * 0.058, brow_y, 0.113), (0.052, 0.013, 0.016),
             "hair", role="detail", level="micro", importance=0.55, rotation=(0, 0, sign * 0.12),
             features=[{"id": f"brow-{side}-line", "kind": "contour", "notes": "dark brow bar above the glasses"}])
    by["glasses-bridge"]["primitive"] = "ellipsoid"
    by["glasses-bridge"]["transform"]["position"] = r4((0, eye_y + 0.004, 0.124))
    set_dims(by["glasses-bridge"], (0.04, 0.009, 0.01))
    by["nose"]["transform"]["position"] = r4((0, at(lm["noseBase"]) + 0.018, 0.118))
    set_dims(by["nose"], (0.034, 0.048, 0.04))
    by["mouth"]["primitive"] = "ellipsoid"
    by["mouth"]["transform"]["position"] = r4((0, at(lm["mouthLine"]) + 0.014, 0.088))
    set_dims(by["mouth"], (0.054, 0.012, 0.014))
    hair["transform"]["position"] = r4((0, 0.06, -0.03))
    set_dims(hair, (0.315, 0.255, 0.295))

    # -- smaller head: scale the head and everything on it by HEAD_K about the chin, so the neck joint stays put.
    # 0.6 takes head+hair from 0.32 H (sprite, 1:3.1) to ~0.22 H (1:4.6): the requested ~1:5, still 10 px at 48 px.
    HEAD_K = 0.6 if not V3 else HEAD_K3
    head_half = by["head"]["transform"]["scale"][1] / 2
    by["head"]["transform"]["position"][1] = round(by["head"]["transform"]["position"][1] - head_half * (1 - HEAD_K), 5)
    set_dims(by["head"], [v * HEAD_K for v in by["head"]["transform"]["scale"]])
    for c in tree:
        if c.get("parent") == "head":
            c["transform"]["position"] = r4([v * HEAD_K for v in c["transform"]["position"]])
            set_dims(c, [v * HEAD_K for v in c["transform"]["scale"]])
    hair["standProud"].update({"clearance": round(0.006 * HEAD_K, 5), "maxPush": round(0.03 * HEAD_K, 5)})
    # the smaller head sits down on the collar: thinner, shorter visible neck
    by["head"]["transform"]["position"][1] = round(by["head"]["transform"]["position"][1] - 0.03, 5)
    by["neck"]["attachment"]["baseRadius"], by["neck"]["attachment"]["endRadius"] = 0.04, 0.034
    # slimmer jeans to match the slimmer jacket
    for side in ("l", "r"):
        by[f"thigh-{side}"]["attachment"]["baseRadius"], by[f"thigh-{side}"]["attachment"]["endRadius"] = 0.044, 0.037
        by[f"shin-{side}"]["attachment"]["baseRadius"], by[f"shin-{side}"]["attachment"]["endRadius"] = 0.037, 0.03
        # rounded shoulder: a jacket ball over the clavicle/sleeve junction instead of two flat cylinder caps
        part(f"shoulder-{side}", f"Shoulder {side.upper()} (jacket)", "ellipsoid", f"clavicle-{side}",
             by[f"upper-arm-{side}"]["transform"]["position"], (0.084, 0.078, 0.08), "jacket", role="detail",
             level="meso", importance=0.5,
             features=[{"id": f"shoulder-{side}-round", "kind": "contour", "notes": "rounded jacket shoulder"}],
             topo="Ellipsoid cap over the shoulder joint so the jacket shoulder reads round, not as two cylinder ends.")
    spec["preSpecAssessment"]["anatomy"]["styleHeadsBuilt"] = 4.6
    spec["preSpecAssessment"]["anatomy"]["styleNote"] = (
        "v2: head scaled 0.6 on Gustav's request (target ~1:5); the sprite measures 1:3.1, so the built figure "
        "deliberately departs from the reference's head-unit ratio")

    # -- laptop (measure/laptop.json: screen box 0.18 x 0.17 H at 0.61 H from the top, near hip, east frames):
    # a closed laptop held upright in the left hand, long edge forward, pressed to the hip. Parented to the hand
    # bone so it follows the walk; bound rigidly to that bone (a prop does not bend).
    part("laptop", "Laptop (closed, held in the left hand)", "box", "hand-l", (-0.026, 0.04, 0.025), (0.014, 0.115, 0.165),
         "laptop", role="prop", level="meso", importance=0.6,
         features=[{"id": "laptop-closed", "kind": "contour", "notes": "closed laptop, no logo"}],
         topo="A closed laptop is a thin rounded slab; at 24-48 px a box reads correctly.")

# ==== v3 refinement: head 1:4.2, darker jacket with a side tone, tousled hair, <= 8k triangles ===================
if V3:
    import math

    K = HEAD_K
    # -- jacket form tone: sleeves and shoulders take the GIF's shaded jacket (measure_v3.py)
    for cid in ("upper-arm-l", "upper-arm-r", "forearm-l", "forearm-r", "shoulder-l", "shoulder-r"):
        by[cid]["material"] = "jacket-shade"
        by[cid]["materialLayers"] = ["jacket-shade"]
    # -- low tessellation tier (<= 8k triangles); the meshes that would drop under G2's 64 vertices are boxes,
    # so the tee bands become flattened ellipsoids and the laptop a rounded-rectangle extrusion
    def rect_profile(w, h, n=5):
        # rectangle outline with n points per edge (an extrusion needs >= 64 vertices for G2; a box has 24)
        out = []
        for (x0, y0, x1, y1) in ((-w / 2, -h / 2, w / 2, -h / 2), (w / 2, -h / 2, w / 2, h / 2),
                                 (w / 2, h / 2, -w / 2, h / 2), (-w / 2, h / 2, -w / 2, -h / 2)):
            for k in range(n):
                f = k / n
                out.append([round(x0 + (x1 - x0) * f, 5), round(y0 + (y1 - y0) * f, 5)])
        return out

    for cid in ("tee-front", "tee-front-low"):
        c = by[cid]
        w, h, d = c["transform"]["scale"]
        c["primitive"] = "extrude"
        c["geometryDescriptor"]["profile2D"] = {"points": rect_profile(w, h), "depth": d}
        c["geometryDescriptor"]["edgeTreatment"] = {"type": "none", "bevelRadius": 0.0, "segments": 1}
        c["transform"]["position"][2] = round(c["transform"]["position"][2] - d / 2, 5)
        set_dims(c, (1, 1, 1))
    lap = by["laptop"]
    L, Hh, D, R = 0.165, 0.115, 0.014, 0.012
    pts = []
    for cx, cy, a0 in ((L / 2 - R, Hh / 2 - R, 0), (-L / 2 + R, Hh / 2 - R, 90), (-L / 2 + R, -Hh / 2 + R, 180), (L / 2 - R, -Hh / 2 + R, 270)):
        for k in range(4):
            a = math.radians(a0 + k * 30)
            pts.append([round(cx + R * math.cos(a), 5), round(cy + R * math.sin(a), 5)])
    lap["primitive"] = "extrude"
    lap["geometryDescriptor"]["profile2D"] = {"points": pts, "depth": D}
    lap["geometryDescriptor"]["edgeTreatment"] = {"type": "none", "bevelRadius": 0.0, "segments": 1}
    # extrusion runs along local +Z; turn it so the thin side faces the hip (+X) and centre the slab
    lap["transform"]["position"] = r4((-0.026 - D / 2, 0.04, 0.025))
    lap["transform"]["rotation"] = [0, math.pi / 2, 0]
    set_dims(lap, (1, 1, 1))
    lap["topologyRationale"] = "Closed laptop = rounded-rectangle extrusion (rounded corners read at 48 px; >= 64 vertices)."

    # -- tousled hair (grimoire/character/stylized_hair_threejs.md, short-mop subset): the cap stays the scalp mass;
    # tapered-sweep clumps break its outline: crown tufts (lighter, the GIF's top), fringe clumps that break the
    # hairline, and sideburns in front of the ears. Head-local, after the head scaling (K).
    cx0, cy0, cz0 = hair["transform"]["position"]
    rx, ry, rz = [v / 2 for v in hair["transform"]["scale"]]

    def on_cap(d):
        n = math.sqrt(sum(v * v for v in d))
        d = [v / n for v in d]
        return [cx0 + rx * d[0], cy0 + ry * d[1], cz0 + rz * d[2]], d

    def tuft(cid, name, direction, bend, length, root_r, material, family):
        p, d = on_cap(direction)
        stations = []
        for i, f in enumerate((-0.3, 0.0, 0.35, 0.7, 1.0)):
            q = [p[k] + d[k] * f * length + bend[k] * (max(f, 0) ** 2) * length for k in range(3)]
            r = root_r * (1.0, 0.95, 0.75, 0.5, 0.26)[i]  # chunky clumps with blunt tips (tip/root 0.26)
            stations.append({"position": r4(q), "rx": round(r, 5), "rz": round(r * 0.8, 5)})
        c = part(cid, name, "tapered-sweep", "head", (0, 0, 0), (1, 1, 1), material, role="hair", level="micro",
                 importance=0.5, features=[{"id": f"{cid}-clump", "kind": "contour", "notes": f"{family} clump"}],
                 topo=f"Tapered-sweep {family} clump: broad embedded root, curved centreline, near-zero tip.")
        c["geometryDescriptor"]["taperedSweep"] = {"stations": stations, "radialSegments": 12, "capEnds": True,
                                                   "family": family}
        c["standProud"] = {"againstComponentId": "head", "clearance": round(0.004 * K, 5), "maxPush": round(0.02 * K, 5),
                           "notes": "clump roots sit on the cap, never inside the skull"}
        return c

    S = K  # authoring lengths below are in pre-scale head units
    # crown clumps lean out and back (a mop), tips curling down, so they break the side/back outline without
    # raising the hair top (the head-to-height ratio is measured hair top to chin)
    crown = [((0.62, 0.55, 0.35), (0.4, -1.0, 0.2)), ((-0.62, 0.55, 0.3), (-0.4, -1.0, 0.2)),
             ((0.5, 0.5, -0.62), (0.3, -1.0, -0.3)), ((-0.5, 0.5, -0.62), (-0.3, -1.0, -0.3)),
             ((0.0, 0.55, -0.85), (0.0, -1.0, -0.4))]
    for i, (d, bend) in enumerate(crown):
        tuft(f"hair-tuft-{i + 1}", f"Hair tuft {i + 1} (crown)", d, bend, 0.04 * S, 0.06 * S, "hair-light", "crown")
    for i, x in enumerate((-0.42, 0.0, 0.42)):
        tuft(f"fringe-{i + 1}", f"Fringe clump {i + 1}", (x, 0.3, 1.0), (0.1 * x, -1.0, 0.3), 0.04 * S, 0.045 * S,
             "hair", "fringe")
    for side, sign in (("l", 1), ("r", -1)):
        tuft(f"sideburn-{side}", f"Sideburn {side.upper()}", (sign * 1.0, -0.3, 0.35), (0, -1.0, 0.0), 0.035 * S,
             0.03 * S, "hair", "sideburn")

# ---- materials (flat, textureless; calibrated so the converter-rig render lands on the sprite medians) ----
mat_t = copy.deepcopy(spec["materials"][0])


def material(mid, name, cls, color, rough, notes, measured=None, **extra):
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": [measured or color], "samplingNotes": notes},
              "colorVariation": {"palette": [color], "pattern": "flat", "amplitude": 0.0, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.03, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": 0.0, "variation": 0.0}, "localOverrides": [], "notes": notes,
              "textureless": {"declared": True, "evidence": [
                  "56 px pixel-art reference: every region is one flat colour block (measure/palette.json); "
                  "the game sprite is 24-48 px, where texture cannot resolve"]}})
    m.pop("opacity", None)
    m.update(extra)
    for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
        m.pop(field, None)
    return m


CAL = json.load(open(f"{W}/measure/albedo.json")) if os.path.exists(f"{W}/measure/albedo.json") else {}


def col(key, default):
    return CAL.get(key, default)


P = {k: v["hex"] for k, v in palette.items()}
spec["materials"] = [
    material("hidden", "Hidden root", "unknown", "#000000", 1.0, "root carrier, invisible", opacity={"base": 0.0}),
    material("skin", "Skin", "skin", col("skin", "#d2a48c"), 0.7, f"sprite face/hands median {P['skin']}", P["skin"]),
    material("hair", "Hair", "unknown", col("hair", "#4d4635"), 0.85, f"sprite hair median {P['hair']} (dark olive-brown)", P["hair"]),
    material("jacket", "Jacket (cotton)", "fabric", col("jacket", "#b4b0b2"), 0.9, f"sprite jacket median {P['jacket']}", P["jacket"],
             localOverrides=[{"id": "matte-cotton", "kind": "gloss", "notes": "matte, no highlight in any frame"}]),
    material("tee", "Tee", "fabric", col("tee", "#5b5545"), 0.9, f"sprite tee band median {P['tee']}", P["tee"]),
    material("jeans", "Jeans (denim)", "fabric", col("jeans", "#27324a"), 0.85, f"sprite jeans median {P['jeans']}", P["jeans"]),
    material("shoes", "Shoes (leather)", "unknown", col("shoes", "#1e2229"), 0.55, f"sprite shoes median {P['shoes']}", P["shoes"]),
    material("eye", "Eyes", "glass", "#17140f", 0.3, "eyes read as 1-2 dark pixels in the sprite"),
    material("lips", "Mouth", "skin", "#9c6c5c", 0.6, "sub-pixel in the sprite; a slightly darker skin line"),
    material("glasses-frame", "Glasses frame", "plastic", "#4a4846" if V2 else col("glasses-frame", "#c9c6c0"), 0.3,
             "sprite: light pixels around the eyes; v2 darkens the frame so it reads as a line at 48 px"),
]
if V3:
    spec["materials"].append(material("jacket-shade", "Jacket, sleeves and sides (shaded tone)", "fabric", col("jacket-shade", "#a39c97"), 0.9,
                                      f"darker 25 % of the GIF jacket band {P['jacket-shade']} (measure_v3.py)", P["jacket-shade"]))
    spec["materials"].append(material("hair-light", "Hair, lighter top", "unknown", col("hair-light", "#7a7058"), 0.85,
                                      f"lighter 20 % of the GIF hair band {P['hair-light']}", P["hair-light"]))
if V2:
    spec["materials"].append(material("laptop", "Laptop (aluminium, closed)", "metal", col("laptop", "#d9dadf"), 0.4,
                                      f"east frames: light grey block at the near hip, median {P['laptop']}", P["laptop"]))
mats = {m["id"]: m for m in spec["materials"]}


def rgba(h, a=1.0):
    h = h.lstrip("#")
    return f"rgba({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)}, {a})"


for c in tree:
    m = mats[c["material"]]
    # The recipe carries the colour the REFERENCE shows (sprite median); the material's baseColor is the albedo that
    # reproduces it under the converter light (material-pass review 1: recipes held the albedo, deltaE 27).
    seen = P.get(c["material"], m["baseColor"])
    c["colorMaterialRecipe"] = {"dominantAlbedo": rgba(seen), "secondaryAlbedo": rgba(m["baseColor"]),
                                "materialClass": m["materialClass"], "materialClassConfidence": 0.7, "evidenceRefs": EV}
    c["fidelityTier"] = "game-prop"
    c["evidenceRefs"] = EV

# ---- rig: re-derived from the edited tree (digits gone, so hands are leaf bones) ------------------------
spec["rig"] = derive_character_rig(tree)

# ---- review targets, passes, budget ---------------------------------------------------------------
spec["featureReviewTargets"] = [
    {"id": "anatomy-proportion", "name": "Head-unit proportions (3.1 heads: head 0.32 H, hem 0.29 H, hip 0.34 H)",
     "tier": "critical", "passIds": ["blockout", "proportion-lock"], "minimumScore": 0.75, "mustPass": True,
     "componentRefs": ["root", "head", "hair", "chest", "pelvis"], "evidenceRefs": EV},
    {"id": "face-landmark-placement", "name": "Hairline, eyes and glasses at the measured landmarks",
     "tier": "critical", "passIds": ["feature-placement"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["head", "hair", "eye-l", "glasses-frame-l"], "evidenceRefs": EV},
    {"id": "pose-silhouette", "name": "Mop head on a short jacket torso and straight legs; walk silhouette",
     "tier": "critical", "passIds": ["blockout", "proportion-lock"], "minimumScore": 0.7, "mustPass": True,
     "componentRefs": ["root", "hair", "upper-arm-l", "thigh-l"], "evidenceRefs": EV},
    {"id": "outfit-and-palette", "name": "Grey jacket over dark tee, indigo jeans, dark shoes, olive-brown hair",
     "tier": "important", "passIds": ["material-pass"], "minimumScore": 0.7, "mustPass": False,
     "componentRefs": ["chest", "tee-front", "thigh-l", "foot-l", "hair"] + (["laptop"] if V2 else []), "evidenceRefs": EV},
]
# The character template has no structural pass; the strict gate requires one (hierarchy before form)
if not any(bp["id"] == "structural-pass" for bp in spec["buildPasses"]):
    at_index = [bp["id"] for bp in spec["buildPasses"]].index("proportion-lock") + 1
    spec["buildPasses"].insert(at_index, {"id": "structural-pass", "goal": "Lock the hierarchy: 19 bones, outfit layers on their segments.",
                                          "componentRefs": [], "acceptance": ["Every part rides the right bone; no floating parts."]})
levels = {lv: [c["id"] for c in tree if c.get("level") == lv] for lv in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro", "meso"], "proportion-lock": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = ["root"] + [cid for name in lv for cid in levels[name]]
spec["qualityTargets"]["reviewViewpoints"] = ["sprite 30 deg pitch yaw 45 (game camera)", "front", "right 90", "rear 180", "left 270"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 6000 if (V3 or not V2) else 20000, "maxDrawCalls": 40,
                                  "textureSize": 256, "fpsTarget": 60,
                                  "optimizationPolicy": "low tier: one flat material per part, no textures; reads at 24-48 px"})
spec["silhouette"] = {
    "boundingShape": "upright humanoid ~1.11 x 0.36 x 0.25 template units (0.9 x 0.29 x 0.2 wu in game)",
    "aspectRatios": ["height : shoulder width = 3.1 : 1", "head (with hair) 0.32 H"], "symmetry": "bilateral about x = 0",
    "dominantCurves": ["round mop hair cap", "rounded jacket shoulders"],
    "negativeSpaces": ["gap between the legs", "gaps between arms and torso"],
    "landmarks": ["hair top 1.0 H", "eye line 0.80 H", "shoulder 0.66 H", "jacket hem 0.29 H", "sole 0"]}
spec["coordinateFrame"] = {"front": "+Z (character faces +Z)", "up": "+Y", "left": "+X is the character's own left",
                           "scaleReference": "template units; game height 0.9 wu applied by gustavAvatarRig.ts"}
spec["lightingFromPhoto"] = [
    {"id": "converter-ambient", "type": "ambient", "role": "fill", "intensity": 0.6,
     "evidence": "sprite converter rig (app/tools/sprite-converter): the light every city sprite is exported under"},
    {"id": "converter-key", "type": "directional", "role": "key", "intensity": 0.8, "position": [5, 10, 5], "castsShadow": False,
     "evidence": "converter key light; sprite shading shows a soft key from upper front"},
    {"id": "converter-fill", "type": "directional", "role": "rim", "intensity": 0.3, "position": [-5, 5, -5],
     "evidence": "converter back fill"},
    {"id": "tone", "role": "exposure", "toneMapping": "None (NoToneMapping)", "exposure": 1.0,
     "notes": "sprites are exported with the converter rig: no tone mapping, exposure 1, transparent background"},
    {"id": "contact", "role": "shadow", "notes": "contact shadow / ground shadow is drawn by the game under the feet, not baked"},
]
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "pass"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(tree), "bones", len(spec["rig"]["bones"]), "materials", len(spec["materials"]))

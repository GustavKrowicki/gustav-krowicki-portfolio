"""Author the avatar's clips (Stage R4) against the plugin's target bands, then emit them as TypeScript.

Clips (bone ids are the spec's rig bones; every bone's rest rotation is identity, so a track value is the
rotation away from rest in the parent's frame):
  walk           gait primitive with root motion: phase machine, contact 0.58, stance feet held by analytic
                 planar leg IK (thigh/shin/foot pitch about X), hips lowest in double support, arm counter-swing,
                 small chest/head counter-yaw. Band: plugin walk_targets (duration 1.0-1.2 s, 0.30-0.60 H/s).
  walk-in-place  the same tracks with the pelvis' planar travel removed (what the 4-direction sprites need)
  idle           additive breathing / sway, pelvis and legs untouched (feet cannot move)

Every clip is periodic by construction (integer cycles, endpoint keys equal). The loop flag, class and name
are NOT taken from this script: they come from measuring the real rig in the browser (clip-measure step).

Units: template model units (figure ~1.11). Outputs:
  lib/city/models/gustavAvatarClips.ts   keyframe data + stance intervals + rigid-part bone map
  clips-authored.json                    authoring parameters and the IK reach check

Usage: python3 -I author_clips.py <workspace> <repo-root>
"""
import json
import math
import sys

W, REPO = sys.argv[1], sys.argv[2]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
bones = {b["id"]: b for b in spec["rig"]["bones"]}
tree = {c["id"]: c for c in spec["componentTree"]}


def joint(bid):
    return bones[bid]["jointPos"]


def model_pos(cid):
    x = y = z = 0.0
    while cid and cid != "root":
        c = tree[cid]
        p = c["transform"]["position"]
        x, y, z = x + p[0], y + p[1], z + p[2]
        cid = c["parent"]
    return x, y, z


# Figure height from the spec geometry (hair top to shoe sole); the browser measures the real one.
hair_top = model_pos("hair")[1] + tree["hair"]["transform"]["scale"][1] / 2
sole = model_pos("foot-l")[1] - tree["foot-l"]["transform"]["scale"][1] / 2
H = hair_top - sole

# ---------------------------------------------------------------- quaternion helpers (x, y, z, w)
def q_axis(axis, angle):
    s = math.sin(angle / 2)
    return [axis[0] * s, axis[1] * s, axis[2] * s, math.cos(angle / 2)]


def q_mul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return [aw * bx + ax * bw + ay * bz - az * by,
            aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw,
            aw * bw - ax * bx - ay * by - az * bz]


X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
IDENT = [0.0, 0.0, 0.0, 1.0]


def rx(a):
    return q_axis(X, a)


def smoothstep(x):
    return x * x * (3 - 2 * x)


# ---------------------------------------------------------------- leg geometry (planar, x = const)
LEG = {}
for s in ("l", "r"):
    hip, knee, ank = joint(f"thigh-{s}"), joint(f"shin-{s}"), joint(f"foot-{s}")
    v1 = (knee[2] - hip[2], knee[1] - hip[1])           # (dz, dy)
    v2 = (ank[2] - knee[2], ank[1] - knee[1])
    LEG[s] = {
        "hip": hip, "ankle": ank,
        "L1": math.hypot(*v1), "L2": math.hypot(*v2),
        "t1r": math.atan2(v1[0], -v1[1]), "t2r": math.atan2(v2[0], -v2[1]),
    }
LMAX = min(LEG[s]["L1"] + LEG[s]["L2"] for s in LEG)
REACH_MARGIN = 0.003
pelvis_rest = joint("pelvis")


def leg_ik(s, hip_y, hip_z, foot_y, foot_z):
    """Planar 2-bone IK in the (z, y) plane. Returns (thigh, shin) world pitch angles from straight down,
    positive = toward +Z, and the reach D used."""
    g = LEG[s]
    dz, dy = foot_z - hip_z, foot_y - hip_y
    D = math.hypot(dz, dy)
    if D > g["L1"] + g["L2"] - 1e-6:
        raise ValueError(f"foot {s} out of reach: D={D:.5f} > {g['L1'] + g['L2']:.5f}")
    phi = math.atan2(dz, -dy)
    alpha = math.acos(max(-1.0, min(1.0, (g["L1"] ** 2 + D ** 2 - g["L2"] ** 2) / (2 * g["L1"] * D))))
    t1 = phi + alpha                                    # knee bends forward (+Z)
    kz, ky = hip_z + g["L1"] * math.sin(t1), hip_y - g["L1"] * math.cos(t1)
    t2 = math.atan2(foot_z - kz, -(foot_y - ky))
    return t1, t2, D


def leg_rotations(s, t1, t2, foot_pitch):
    g = LEG[s]
    d1, d2 = t1 - g["t1r"], t2 - g["t2r"]
    # a pitch toward +Z is a rotation about X by -angle (see module notes in the repo history)
    return {f"thigh-{s}": rx(-d1), f"shin-{s}": rx(-(d2 - d1)), f"foot-{s}": rx(foot_pitch + d2)}


# ---------------------------------------------------------------- walk parameters (plugin walk band)
DURATION = 1.0                       # s per cycle (band 1.0-1.2)
SPEED_H = 0.40                       # H/s: the band target (band 0.30-0.60); first authoring at 0.36 missed the travel band
CONTACT = 0.58                       # stance fraction per foot (band 0.55-0.65)
RISE_H = 0.02                        # hip rise, fraction of H (band 0.015-0.025)
ARM_SWING = 0.33                     # upper-arm pitch amplitude, rad (0.36 measured handRange 0.254 H > 0.25 band)
ARM_IN = 0.2                        # constant adduction from the A-pose bind, rad
FOOT_LIFT = 0.032                    # swing apex, model units
FPS = 60
TRAVEL = SPEED_H * H * DURATION
EXC = CONTACT * TRAVEL               # hip-relative stance excursion of one foot
STANCE_START = {"l": 0.0, "r": 0.5}
DS_CENTRE = (CONTACT - 0.5) / 2      # double-support centre (phase), where the hips are lowest


def walk_pose(t, in_place=False):
    ph = (t / DURATION) % 1.0
    cyc = t / DURATION
    hip_dz = SPEED_H * H * t
    # hips: lowest in double support, highest mid-stance; the low point is set by the reach check below
    v = V_LOW + RISE_H * H * (1 - math.cos(4 * math.pi * (ph - DS_CENTRE))) / 2
    pel_y = pelvis_rest[1] + (v - V_REST)
    pel_z = pelvis_rest[2] + (0.0 if in_place else hip_dz)
    rot = {}
    feet = {}
    for s in ("l", "r"):
        g = LEG[s]
        u = cyc - STANCE_START[s]
        k = math.floor(u)
        frac = u - k
        # plant k: foot centre touches down EXC/2 ahead of the hip, so the stance excursion is centred on it
        plant_z = g["hip"][2] + EXC / 2 + (STANCE_START[s] + k) * TRAVEL
        if frac <= CONTACT:
            fz, fy, pitch = plant_z, g["ankle"][1], 0.0
        else:
            w = (frac - CONTACT) / (1 - CONTACT)
            fz = plant_z + TRAVEL * smoothstep(w)
            fy = g["ankle"][1] + FOOT_LIFT * math.sin(math.pi * w)
            pitch = -0.28 * math.sin(math.pi * w)
        if in_place:
            fz -= hip_dz
        hip_y = g["hip"][1] + (pel_y - pelvis_rest[1])
        hip_z = g["hip"][2] + (pel_z - pelvis_rest[2])
        t1, t2, D = leg_ik(s, hip_y, hip_z, fy, fz)
        rot.update(leg_rotations(s, t1, t2, pitch))
        feet[s] = (fz, fy, D)
    # arms: counter-swing (left arm back when the left foot strikes), elbows bend more on the forward swing
    c = math.cos(2 * math.pi * ph)
    # arms hang closer to the body than the A-pose bind (sprite: arms at the sides)
    rot["upper-arm-l"] = q_mul(q_axis(Z, -ARM_IN), rx(ARM_SWING * c))
    rot["upper-arm-r"] = q_mul(q_axis(Z, ARM_IN), rx(-ARM_SWING * c))
    rot["forearm-l"] = rx(-0.18 - 0.22 * max(0.0, -c))
    rot["forearm-r"] = rx(-0.18 - 0.22 * max(0.0, c))
    rot["chest"] = q_axis(Y, 0.07 * c)
    rot["head"] = q_axis(Y, -0.05 * c)
    rot["abdomen"] = rx(0.03)        # slight forward lean while walking
    return {"pelvisPos": [pelvis_rest[0], pel_y, pel_z], "rot": rot, "feet": feet}


# hip height: rest V, and the highest V_LOW for which every planted foot stays in reach (+margin)
V_REST = LEG["l"]["hip"][1] - LEG["l"]["ankle"][1]
V_LOW = V_REST
for _ in range(200):
    try:
        ok = True
        for i in range(FPS * 4 + 1):
            p = walk_pose(i * DURATION / (FPS * 4))
            if any(D > LMAX - REACH_MARGIN for (_, _, D) in p["feet"].values()):
                ok = False
                break
    except ValueError:
        ok = False
    if ok:
        break
    V_LOW -= 0.0005


def idle_pose(t):
    T = IDLE_DURATION
    b = math.sin(2 * math.pi * t / T)            # one breath per cycle
    s = math.sin(2 * math.pi * 2 * t / T)       # sway at twice the rate
    return {"pelvisPos": None, "rot": {
        "abdomen": rx(-0.015 * b),
        "chest": q_mul(rx(-0.02 * b), q_axis(Y, 0.02 * s)),
        "head": q_mul(rx(0.03 * b), q_axis(Y, -0.04 * math.sin(2 * math.pi * t / T + 0.6))),
        "upper-arm-l": q_mul(q_axis(Z, -ARM_IN + 0.02 * b), rx(0.03 * s)),
        "upper-arm-r": q_mul(q_axis(Z, ARM_IN - 0.02 * b), rx(-0.03 * s)),
        "forearm-l": rx(-0.12 - 0.03 * b),
        "forearm-r": rx(-0.12 - 0.03 * b),
    }, "feet": {}}


IDLE_DURATION = 3.0


def bake(pose_fn, duration, fps=FPS):
    n = int(round(duration * fps))
    times = [round(i * duration / n, 6) for i in range(n + 1)]
    poses = [pose_fn(t) for t in times]
    tracks = []
    if poses[0]["pelvisPos"] is not None:
        tracks.append({"name": "pelvis.position", "type": "vector", "times": times,
                       "values": [round(v, 6) for p in poses for v in p["pelvisPos"]]})
    for bid in sorted(poses[0]["rot"]):
        vals = []
        prev = None
        for p in poses:
            q = p["rot"][bid]
            if prev is not None and sum(a * b for a, b in zip(q, prev)) < 0:
                q = [-v for v in q]        # keep the hemisphere continuous so slerp takes the short way
            prev = q
            vals.extend(round(v, 6) for v in q)
        tracks.append({"name": f"{bid}.quaternion", "type": "quaternion", "times": times, "values": vals})
    return tracks


def stance(in_place):
    if in_place:
        return None   # the stance foot slides back at exactly the walking speed by design; G8 gates `walk`
    out = {}
    for s in ("l", "r"):
        start = STANCE_START[s] * DURATION
        end = start + CONTACT * DURATION
        out[f"foot.{s}"] = [[start, end]] if end <= DURATION else [[0.0, end - DURATION], [start, DURATION]]
    return out


clips = [
    {"id": "idle", "label": "Idle", "sourceName": "idle", "duration": IDLE_DURATION,
     "stance": {"foot.l": [[0.0, IDLE_DURATION]], "foot.r": [[0.0, IDLE_DURATION]]},
     "tracks": bake(idle_pose, IDLE_DURATION, fps=30)},
    {"id": "walk", "label": "Walk (root motion)", "sourceName": "walk", "duration": DURATION, "stance": stance(False),
     "tracks": bake(lambda t: walk_pose(t, False), DURATION)},
    {"id": "walk-in-place", "label": "Walk in place (sprites)", "sourceName": "walk-in-place", "duration": DURATION,
     "stance": stance(True), "tracks": bake(lambda t: walk_pose(t, True), DURATION)},
]

# Every non-bone part rides a bone. For the blend-off control (G10 baseline) it is weighted 1.0 to the
# nearest bone ancestor in the component tree; the shipped binding transfers the body's own weights.
bone_ids = set(bones)


def owner(cid):
    c = cid
    while c and c != "root":
        if c in bone_ids:
            return c
        c = tree[c]["parent"]
    return "pelvis"


rigid = {cid: owner(cid) for cid in tree if cid not in bone_ids and cid != "root"}

meta = {"figureHeightModel": round(H, 5), "walk": {"duration": DURATION, "speedH": SPEED_H, "travelModel": round(TRAVEL, 5),
        "contact": CONTACT, "riseH": RISE_H, "stepModel": round(TRAVEL / 2, 5), "excursionModel": round(EXC, 5),
        "hipDropAtDoubleSupport": round(V_REST - V_LOW, 5), "legReachMax": round(LMAX, 5), "reachMargin": REACH_MARGIN},
        "idle": {"duration": IDLE_DURATION}, "rigidParts": rigid}
json.dump(meta, open(f"{W}/clips-authored.json", "w"), indent=2)

ts = [
    "// GENERATED by art/img2threejs/gustav-avatar/author_clips.py -- edit the author script, not this file.",
    "// Keyframes for the avatar's procedural skeleton (bone ids = spec rig). Loop flags are measured, not set here",
    "// (see gustavAvatarRuntime.ts, emitted from the clip-measure result).",
    "",
    "export type AvatarTrackData = { name: string; type: 'quaternion' | 'vector'; times: number[]; values: number[] };",
    "export type AvatarClipData = {",
    "  id: string;",
    "  label: string;",
    "  sourceName: string;",
    "  duration: number;",
    "  stance: Record<string, number[][]> | null;",
    "  tracks: AvatarTrackData[];",
    "};",
    "",
    f"export const AVATAR_FIGURE_HEIGHT_MODEL = {round(H, 5)};",
    "",
    "// Non-bone part (component id) -> the bone it rides in the blend-off control binding.",
    f"export const AVATAR_RIGID_PART_BONES: Record<string, string> = {json.dumps(rigid)};",
    "",
    f"export const AVATAR_CLIP_DATA: AvatarClipData[] = {json.dumps(clips, separators=(',', ':'))};",
    "",
]
open(f"{REPO}/lib/city/models/gustavAvatarClips.ts", "w").write("\n".join(ts))
print(json.dumps({k: v for k, v in meta.items() if k != "rigidParts"}))

"""Assemble the plugin's rig inputs from the browser harness (capture.mjs harness / sweep) and run its tools.

Writes, at the workspace root:
  rig-payload.json        structural payload for rig_validate_payload.py (joints, parents, matrix_local, packed skin)
  mesh-manifest.json      rig_mesh_parity freeze of the PREPARED meshes (before any skin attribute was added)
  clip-features.json      anim_clip_features.py over the sampled clips (measure, classify, name, loop)
  rig-gate-payload.json   the twelve-check gate payload, also copied to .img2/artifacts/character/ for the sweep
G12 (rig reference) has no GLB to read: the skeleton is procedural, authored from the spec. It is reported as
whatever the gate says about that; nothing here fabricates a GLB report.
Usage: python3 -I assemble_rig_gate.py <workspace>
"""
import json
import os
import shutil
import subprocess
import sys

W = sys.argv[1]
T = os.path.expanduser("~/.img2/plugins/character/tools")
H = f"{W}/harness"
os.chdir(W)


def run(*args):
    r = subprocess.run(["python3", *args], capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr


harness = json.load(open(f"{H}/harness.json"))
sampled = json.load(open(f"{H}/sampled-clips.json"))
binding = json.load(open(f"{H}/binding.json"))

# --- structural rig payload (R0) ---------------------------------------------------------------
joints = harness["chainAnchors"]["joints"]
index = {j["id"]: i for i, j in enumerate(joints)}
world = {}
for j in joints:
    p = j["localPosition"]
    if j["parent"]:
        q = world[j["parent"]]
        p = [p[k] + q[k] for k in range(3)]
    world[j["id"]] = p
rig_payload = {
    "schemaVersion": 1,
    "coordinateSystem": {"up": "Y", "handedness": "right", "unit": "template model units (x0.849 = wu)", "forward": "+Z"},
    "joints": [world[j["id"]] for j in joints],
    "parents": [index[j["parent"]] if j["parent"] else None for j in joints],
    "names": [j["id"] for j in joints],
    "matrix_local": [[1, 0, 0, j["localPosition"][0], 0, 1, 0, j["localPosition"][1], 0, 0, 1, j["localPosition"][2], 0, 0, 0, 1]
                     for j in joints],
    "skinIndex": [binding["skinIndices"][k:k + 4] for k in range(0, len(binding["skinIndices"]), 4)],
    "skinWeight": [binding["skinWeights"][k:k + 4] for k in range(0, len(binding["skinWeights"]), 4)],
}
json.dump(rig_payload, open("rig-payload.json", "w"))
code, out, err = run(f"{T}/rig_validate_payload.py", "--payload", "rig-payload.json")
open("reviews/rig-payload-validate.json", "w").write(out or err)
print("rig_validate_payload rc", code, (out or err)[:300].replace("\n", " "))

# --- mesh parity (freeze before bind, verify after) ----------------------------------------------
code, out, err = run(f"{T}/rig_mesh_parity.py", "freeze", f"{H}/meshes.json", "--out", "mesh-manifest.json")
print("freeze rc", code, (out or err)[-200:].replace("\n", " "))
code, out, err = run(f"{T}/rig_mesh_parity.py", "verify", "mesh-manifest.json", f"{H}/meshes-after.json")
open("reviews/mesh-parity-verify.txt", "w").write(out + err)
print("verify rc", code, (out or err)[-300:].replace("\n", " "))

# --- clip measurement (R3) ---------------------------------------------------------------------
json.dump(sampled, open("sampled-clips.json", "w"))
code, out, err = run(f"{T}/anim_clip_features.py", "sampled-clips.json", "--out", "clip-features.json")
print("clip features rc", code, (out or err)[-300:].replace("\n", " "))

# --- R4 acceptance of the authored walk (the classifier must agree without being told) ---------------
feats = {c["sourceName"]: c for c in json.load(open("clip-features.json"))["clips"]}
for clip in sampled["clips"]:
    clip["loop"] = feats[clip["sourceName"]]["name"]["loop"]   # measured (poseReturn + hip return), never assumed
json.dump(sampled, open("sampled-clips-measured.json", "w"))
walk_index = [c["sourceName"] for c in sampled["clips"]].index("walk")
code, out, err = run(f"{T}/anim_action_design.py", "sampled-clips-measured.json", "walk", "--clip-index", str(walk_index),
                     "--out", "reviews/walk-acceptance.json")
acc = json.load(open("reviews/walk-acceptance.json"))
print("R4 walk acceptance:", acc.get("verdict"))
for c in acc.get("criteria", []):
    print("   ", c.get("status"), str(c.get("reason"))[:200])

# --- G10 sweep --------------------------------------------------------------------------------
g10 = json.load(open("sweep/transfer-g10.json"))
base = json.load(open("sweep/rigid-g10.json"))
sweep = {k: g10[k] for k in ("clips", "times", "sides", "azimuths", "frames", "backgroundThroughSplitPx",
                             "backgroundThroughSplitBlobs", "creasePx")}
sweep["baseline"] = {"backgroundThroughSplitPx": base["backgroundThroughSplitPx"], "creasePx": base["creasePx"],
                     "backgroundThroughSplitBlobs": base["backgroundThroughSplitBlobs"],
                     "control": "blend off: every body segment and part weighted 1.0 to its own bone (binding=rigid)"}
sweep["method"] = "sweep_holes.py: magenta background, interior background blobs that do not survive a radius-2 erosion"

payload = {
    "figureHeight": sampled["figureHeight"],
    "landmarks": sampled["landmarks"],
    "clips": sampled["clips"],
    "bindingSamples": harness["bindingSamples"],
    "deformation": harness["deformation"],
    "bindRestore": harness["bindRestore"],
    "binding": binding,
    "meshVisibility": harness["meshVisibility"],
    "chainAnchors": {"joints": harness["chainAnchors"]["joints"], "sideLabels": harness["chainAnchors"]["sideLabels"]},
    "skinIntegritySweep": sweep,
    "meshParity": {"manifest": json.load(open("mesh-manifest.json")), "after": json.load(open(f"{H}/meshes-after.json"))},
    "rigReference": {"source": "procedural",
                     "note": "skeleton derived from the img2threejs spec (derive_character_rig); no GLB exists for this "
                             "character, so there is no skeleton of record and no correspondence to supply"},
}
json.dump(payload, open("rig-gate-payload.json", "w"))
os.makedirs(".img2/artifacts/character", exist_ok=True)
shutil.copy("rig-gate-payload.json", ".img2/artifacts/character/rig-gate-payload.json")
code, out, err = run(f"{T}/gate_rigging.py", "--payload", "rig-gate-payload.json")
open("reviews/rig-gates.json", "w").write(out or err)
v = json.loads(out)
print("gate_rigging rc", code, v["status"])
for row in v["evidence"]["gates"]:
    print(f"  {row['id']:>4} {row['status']:<12} {row.get('name')}: {str(row.get('reason'))[:230]}")

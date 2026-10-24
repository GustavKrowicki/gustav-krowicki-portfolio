#!/bin/sh
# Mark the closing checklist steps (part coverage .. rig gates) against the evidence assemble_rig_gate.py wrote.
W="$(cd "$(dirname "$0")" && pwd)"
F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"
PL="$HOME/.img2/plugins/character"
cd "$W"
S="python3 $F/state.py"
ST="--state .img2threejs/state.json"
$S mark part-coverage $ST --evidence reviews/part-coverage.txt --evidence parts.json
$S mark action-ready $ST --evidence harness/harness.json --evidence ../../../lib/city/models/gustavAvatarRig.ts
$S mark emission-target $ST --status skipped --reason "No --target emission was requested; the deliverable is the TypeScript factory in lib/city/models/."
$S mark plugin-gates $ST --evidence reviews/plugin-gates-sweep.json
$S mark rig-contract-read $ST --evidence "$PL/reference/animation-contract.md" --evidence "$PL/reference/character-rigging-animation-1.5.2.md"
$S mark glb-rig-reference $ST --status skipped --reason "There is no GLB: the reference is four pixel-art GIFs and the skeleton is derived procedurally from the spec (derive_character_rig). Consequence: G12 is unevaluated."
$S mark mesh-repair $ST --evidence ../../../lib/city/models/gustavAvatarRig.ts --evidence harness/meshes.json
$S mark mesh-freeze $ST --evidence mesh-manifest.json
$S mark rig-payload-validate $ST --evidence reviews/rig-payload-validate.json
$S mark rig-bind $ST --evidence harness/meshes-after.json --evidence harness/harness.json
$S mark mesh-parity-verify $ST --evidence reviews/mesh-parity-verify.txt
$S mark clip-measure $ST --evidence clip-features.json --evidence reviews/walk-acceptance.json
$S mark rig-gates $ST --evidence reviews/rig-gates.json
python3 $F/next.py $ST object-sculpt-spec.json | head -3

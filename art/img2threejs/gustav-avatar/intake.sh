#!/bin/sh
# Intake chain for the fixed reference (ref/north-00-x12-white.png): admission, landmarks overlay, local spec search +
# pre-spec assessment scaffold, detail-zone crops, then the measured fills. Marks the checklist steps it evidences.
set -e
W="$(cd "$(dirname "$0")" && pwd)"
F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"
REF=ref/north-00-x12-white.png
S="python3 $F/state.py"
cd "$W"
$S mark image-analysis --state .img2threejs/state.json --evidence analysis/image-analysis.md >/dev/null
$S mark reference-suitability --state .img2threejs/state.json --evidence analysis/suitability.md >/dev/null
python3 $F/stage1_intake/check_reference_admission.py "$REF" --out admission.json --probe-out probe.json >/dev/null
$S mark reference-admission --state .img2threejs/state.json --evidence admission.json >/dev/null
$S mark character-contract-read --state .img2threejs/state.json --evidence "$F/../grimoire/character/reconstruction.md" >/dev/null
python3 $F/stage1_intake/extract_landmarks.py "$REF" --out anatomy.json --overlay landmarks.png --style-heads 3.2 --force >/dev/null
python3 -I fill_anatomy.py "$W" >/dev/null
$S mark character-landmarks --state .img2threejs/state.json --evidence anatomy.json --evidence landmarks.png >/dev/null
python3 $F/stage2_spec/new_pre_spec_assessment.py "Gustav Avatar" --image "$REF" --complexity moderate \
  --spec-query "stylized humanoid character low poly game avatar" --spec-query "cotton jacket fabric roughness" \
  --spec-query "denim jeans albedo" --spec-query "hair stylized clumps" --spec-query "walk cycle gait skinning" \
  --out assessment.json --force >/dev/null
$S mark local-spec-search --state .img2threejs/state.json --evidence assessment.json >/dev/null
python3 $F/stage1_intake/build_detail_inventory.py "$REF" --mode component-zones --out-dir detail-zones --out di.json --force >/dev/null
python3 -I fill_assessment.py "$W" >/dev/null
$S mark pre-spec-assessment --state .img2threejs/state.json --evidence assessment.json >/dev/null
$S mark detail-inventory --state .img2threejs/state.json --evidence di.json >/dev/null
python3 $F/next.py --state .img2threejs/state.json | head -2

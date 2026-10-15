#!/bin/sh
# Generate, capture and gate one pass; then look at renders/<pass>-cmp.png and the city sprites, record with review.sh.
set -e
W="$(cd "$(dirname "$0")" && pwd)"; F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"; cd "$W"; P="$1"; st=.img2threejs/state.json
. ./building.env
./pass.sh gen "$P" | tail -1
python3 $F/state.py mark build-current-pass --state $st --evidence src/createObjectModel.ts >/dev/null 2>&1 || true
sleep 4   # let the dev server pick up the new factory
./shoot.sh "$P" | tail -1
python3 $F/state.py mark render-capture --state $st --evidence "renders/$P-iso.png" >/dev/null 2>&1 || true
python3 $F/state.py mark review-contract-read --state $st --evidence "$HOME/.claude/skills/img2threejs/grimoire/review/self_correction.md" >/dev/null 2>&1 || true
./pass.sh gates "$P" >/dev/null 2>&1 || true
python3 $F/stage4_review/diagnose_render.py --reference "$REF" --render "renders/$P-iso.png" --spec object-sculpt-spec.json --pass-id "$P" \
  --map-stripped-render "renders/$P-sprite-south-stripped.png" --in-place --json 2>&1 | grep -E '"passed"|silhouetteIoU' | head -2
python3 $F/stage3_build/orchestrate_passes.py check object-sculpt-spec.json --pass-id "$P" 2>&1 | tail -1

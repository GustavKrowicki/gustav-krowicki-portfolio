#!/bin/sh
# Generate, capture and gate one pass (BAY=1 for the bay proof); then judge renders/<pass>-side.png by eye and record with review.sh.
set -e
W="$(cd "$(dirname "$0")" && pwd)"; F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"; cd "$W"; P="$1"; T="$1"; st=.img2threejs/state.json
. ./building.env
./pass.sh gen "$P" | tail -1
python3 $F/state.py mark build-current-pass --state $st --evidence src/createObjectModel.ts >/dev/null 2>&1 || true
sleep 6   # let the dev server pick up the new factory
./shoot.sh "$T" > "renders/$T-shoot.log" 2>&1; head -1 "renders/$T-shoot.log"
python3 $F/state.py mark render-capture --state $st --evidence "renders/$T-iso.png" >/dev/null 2>&1 || true
python3 $F/state.py mark review-contract-read --state $st --evidence "$HOME/.claude/skills/img2threejs/grimoire/review/self_correction.md" >/dev/null 2>&1 || true
./pass.sh gates "$T" >/dev/null 2>&1 || true
python3 $F/stage4_review/turntable_gate.py --capture "0=renders/$T-south-white.png" --capture "90=renders/$T-east-white.png" \
  --capture "180=renders/$T-north-white.png" --capture "270=renders/$T-west-white.png" --json > "renders/$T-turntable.json" 2>&1 || true
python3 -c "import json,sys; d=json.load(open('renders/$T-turntable.json')); print('turntable', d.get('verdict', d.get('passed')), (d.get('failures') or d.get('issues') or '')[:3] if isinstance(d, dict) else '')" 2>/dev/null || tail -3 "renders/$T-turntable.json"
python3 $F/stage4_review/diagnose_render.py --reference "$REF" --render "renders/$T-iso.png" --spec object-sculpt-spec.json --pass-id "$P" \
  --map-stripped-render "renders/$T-sprite-south-stripped.png" --in-place --json 2>&1 | grep -E '"passed"|silhouetteIoU' | head -2
python3 $F/stage3_build/orchestrate_passes.py check object-sculpt-spec.json --pass-id "$P" 2>&1 | tail -1
python3 ../tools/side_by_side.py "$W" "$T"

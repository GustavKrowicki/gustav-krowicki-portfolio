#!/bin/sh
# Record one AI-vision review for a pass and advance the checklist through pipeline-sync.
# Usage: review.sh <pass> <fidelity> <action> <ai-score> '<layer-scores-json>' '<feature-reviews-json>' "<summary>" "<mismatches>"
set -e
W="$(cd "$(dirname "$0")" && pwd)"
F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"
P="$1"
cd "$W"
printf '%s' "$5" > "reviews/$P-layers.json"
printf '%s' "$6" > "reviews/$P-features.json"
python3 $F/stage4_review/append_review.py object-sculpt-spec.json --pass-id "$P" --fidelity "$2" --action "$3" \
  --ai-vision-score "$4" --layer-scores-json "reviews/$P-layers.json" --feature-reviews-json "reviews/$P-features.json" \
  --summary "$7" --mismatches "$8" \
  --render-screenshot "renders/$P-sprite-aligned.png" --reference-screenshot ref/north-00-x12-white.png \
  --comparison-image "reviews/$P-cmp.png" --map-stripped-render "renders/$P-sprite-stripped-aligned.png" \
  --camera-view "sprite converter camera: ortho, pitch 30, yaw -45, walk-in-place t=0.7; turntable lookdev elev 10" \
  --evidence "reviews/$P-tier1.json;reviews/$P-interior.json;reviews/$P-multi.json;reviews/$P-turntable.json;reviews/$P-scalp.json;reviews/$P-hair.json;reviews/$P-sprite-vs-gif.png" \
  --in-place > "reviews/$P-append.txt" 2>&1
tail -1 "reviews/$P-append.txt" | cut -c1-120
python3 $F/state.py mark ai-review-recorded --state .img2threejs/state.json --evidence "reviews/$P-cmp.png" >/dev/null
python3 $F/stage3_build/orchestrate_passes.py sync object-sculpt-spec.json --in-place > "reviews/$P-sync.txt" 2>&1
tail -1 "reviews/$P-sync.txt" | cut -c1-160
python3 $F/state.py mark pipeline-sync --state .img2threejs/state.json --evidence object-sculpt-spec.json >/dev/null
python3 $F/next.py --state .img2threejs/state.json object-sculpt-spec.json | sed -n 1,2p

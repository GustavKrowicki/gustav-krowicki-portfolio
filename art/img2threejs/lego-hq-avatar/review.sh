#!/bin/sh
# Record one pass review (scores from agent vision on renders/<pass>-cmp.png) and advance the local state gate.
# Usage: review.sh <pass> <action> <score> "<summary>" '<layer scores json>' '<feature reviews json>' "<mismatches>"
set -e
W="$(cd "$(dirname "$0")" && pwd)"; F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"; cd "$W"; . ./building.env
P="$1"; A="$2"; S="$3"; st=.img2threejs/state.json
printf "%s" "$6" > "renders/$P-features.json"
python3 $F/stage4_review/interior_difference.py "$REF" "renders/$P-iso.png" --json > "renders/$P-interior.json"
python3 $F/stage4_review/append_review.py object-sculpt-spec.json --pass-id "$P" --fidelity "$S" --action "$A" --summary "$4" \
  --mismatches "$7" --render-screenshot "renders/$P-iso.png" --reference-screenshot "$REF" --comparison-image "renders/$P-cmp.png" \
  --evidence "renders/$P-iso-raw.png;renders/$P-sprite-south.png;renders/$P-open-south.png;renders/$P-interior.json" \
  --ai-vision-score "$S" --layer-scores-json "$5" --feature-reviews-json "renders/$P-features.json" --map-stripped-render "renders/$P-sprite-south-stripped.png" --in-place >"renders/$P-review.log"
tail -1 "renders/$P-review.log"
python3 $F/stage3_build/orchestrate_passes.py sync object-sculpt-spec.json --in-place | tail -1
for s in tier1-diagnostics multi-angle-review pass-gate-check ai-review-recorded pipeline-sync; do
  case $s in tier1-diagnostics) e="renders/$P-iso.png";; multi-angle-review) e="renders/$P-west-white.png";; pass-gate-check) e=object-sculpt-spec.json;;
    ai-review-recorded) e="renders/$P-cmp.png";; pipeline-sync) e=object-sculpt-spec.json;; esac
  python3 $F/state.py mark $s --state $st --evidence "$e" >/dev/null 2>&1 || echo "mark $s refused"
done
python3 $F/next.py --state $st object-sculpt-spec.json 2>/dev/null | head -2

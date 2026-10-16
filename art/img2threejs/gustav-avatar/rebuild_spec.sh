#!/bin/sh
# Rebuild the authored spec from the sprite measurements and carry over review state.
# Needs ref/ (python3 -I measure_ref.py "$W" <repo> extracts it from the GIFs in public/).
set -e
W="$(cd "$(dirname "$0")" && pwd)"
F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"
cd "$W"
[ -f object-sculpt-spec.json ] && cp object-sculpt-spec.json _prev_spec.json
python3 -I fill_anatomy.py "$W" >/dev/null
python3 -I fill_assessment.py "$W" >/dev/null
# The character plugin publishes no spec-augmentation artifact (it contributes rig steps only), so --augmentation is omitted.
python3 $F/stage2_spec/new_sculpt_spec.py "Gustav Avatar" --image "$W/ref/north-00-x12-white.png" --assessment assessment.json \
  --domain animated-character --out object-sculpt-spec.json --force >/dev/null
python3 build_spec.py "$W"
if [ -f _prev_spec.json ]; then python3 - <<'PY'
import json
old = json.load(open("_prev_spec.json")); new = json.load(open("object-sculpt-spec.json"))
for k in ("reviewHistory", "sculptPipeline", "visualEvidence"):
    if k in old: new[k] = old[k]
json.dump(new, open("object-sculpt-spec.json", "w"), indent=2)
PY
fi
python3 $F/stage2_spec/validate_sculpt_spec.py object-sculpt-spec.json --strict-quality 2>&1 | tee strict-validation.txt | tail -3

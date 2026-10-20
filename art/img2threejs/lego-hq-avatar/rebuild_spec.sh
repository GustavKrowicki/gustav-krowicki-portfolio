#!/bin/sh
# Rebuild the authored spec (starter spec -> build_spec.py -> strict validation), carrying over review state.
# Needs the img2threejs skill (IMG2THREEJS, default ~/.claude/skills/img2threejs), assessment.json and $REF.
set -e
W="$(cd "$(dirname "$0")" && pwd)"
F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"
cd "$W"; . ./building.env
# keep the last spec that carries review state (a failed build leaves a fresh starter spec behind)
[ -f object-sculpt-spec.json ] && grep -q '"reviewHistory"' object-sculpt-spec.json && cp object-sculpt-spec.json _prev_spec.json
python3 $F/stage2_spec/new_sculpt_spec.py "$NAME" --image "$W/$REF" --assessment assessment.json --domain generic --out object-sculpt-spec.json --force >/dev/null
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

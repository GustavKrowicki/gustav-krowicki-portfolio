#!/bin/sh
# Usage: pass.sh gen <pass-id> [--force]  -> strict-validate, generate the pass factory, sync into the portfolio
#        pass.sh gates <pass-id>          -> captures (sprite 30 deg + turntable), aligned tier-1, interior, multi-angle,
#                                           turntable, check, comparison sheet. Needs the dev server (LAB, default :3102).
set -e
W="$(cd "$(dirname "$0")" && pwd)"
F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"
P="$2"
REF=ref/north-00-x12-white.png
cd "$W"
if [ "$1" = "gen" ]; then
  python3 $F/stage2_spec/validate_sculpt_spec.py object-sculpt-spec.json --strict-quality | tail -1
  python3 $F/stage3_build/generate_threejs_factory.py object-sculpt-spec.json --out src/createObjectModel.ts --pass-id "$P" $3 | tail -1 | cut -c1-90
  ./sync_factory.sh; echo "synced $P"; exit 0
fi
mkdir -p renders reviews
sleep 3   # let the dev server pick up the synced factory
SPRITE='"view":"sprite","pitch":30,"yaw":-45,"rig":"converter","size":512,"zoom":1.6,"voff":0.1,"clip":"walk-in-place","t":0.7'
TURN='"view":"reference","elev":10,"rig":"lookdev","bg":"ffffff"'
node capture.mjs shots renders "$P-" "[[\"sprite\",{$SPRITE}],[\"sprite-stripped\",{$SPRITE,\"stripped\":true}],[\"front\",{$TURN,\"spin\":0}],[\"right\",{$TURN,\"spin\":90}],[\"rear\",{$TURN,\"spin\":180}],[\"left\",{$TURN,\"spin\":270}]]"
python3 -I align_render.py "renders/$P-sprite.png" "$REF" "renders/$P-sprite-aligned.png" >/dev/null
python3 -I align_render.py "renders/$P-sprite-stripped.png" "$REF" "renders/$P-sprite-stripped-aligned.png" >/dev/null
echo "== tier1 (aligned 30 deg sprite vs north frame 0)"
python3 $F/stage4_review/diagnose_render.py --reference "$REF" --render "renders/$P-sprite-aligned.png" \
  --map-stripped-render "renders/$P-sprite-stripped-aligned.png" --spec object-sculpt-spec.json --pass-id "$P" --in-place --json \
  > "reviews/$P-tier1.json" 2>&1 || true
python3 -c "
import json,sys; t=open('reviews/$P-tier1.json').read(); d=json.loads(t[t.index('{'):]); c=d.get('checks',{})
print('passed', d.get('passed'), d.get('failures'), {k:c.get(k) for k in ('silhouetteIoU','aspectRatioDelta','scaleDelta')}, 'maxDeltaE', (c.get('colorDelta') or {}).get('maxDeltaE'))"
echo "== interior difference (inside the silhouette, banded)"
python3 $F/stage4_review/interior_difference.py "$REF" "renders/$P-sprite-aligned.png" --json > "reviews/$P-interior.json" 2>&1 || true
python3 -c "
import json; t=open('reviews/$P-interior.json').read(); d=json.loads(t[t.index('{'):]); print({k:v for k,v in d.items() if not isinstance(v,(list,dict))})" 2>/dev/null || head -c 400 "reviews/$P-interior.json"
echo "== multi-angle"
python3 $F/stage4_review/diagnose_render_multi_angle.py --reference "renders/$P-front.png" --orbit "renders/$P-right.png" --orbit "renders/$P-rear.png" --orbit "renders/$P-left.png" --json > "reviews/$P-multi.json"
python3 -c "
import json; d=json.load(open('reviews/$P-multi.json')); print('degenerate', d['degenerate'], [round(a['ratio'],3) for a in d['angles']])"
echo "== turntable"
python3 $F/stage4_review/turntable_gate.py --capture "0=renders/$P-front.png" --capture "90=renders/$P-right.png" --capture "180=renders/$P-rear.png" --capture "270=renders/$P-left.png" --json > "reviews/$P-turntable.json" || true
python3 -c "
import json; d=json.load(open('reviews/$P-turntable.json')); print({k:v for k,v in d.items() if not isinstance(v,(list,dict))})"
echo "== scalp exposure (HARD, hair surface samples vs the skull ellipsoid, v 0.5-1.0 = above the hairline) + hair gate"
mkdir -p harness
node capture.mjs hair harness >/dev/null
python3 -I scalp_inputs.py harness/hair-geometry.json harness | tail -1
python3 $F/stage4_review/scalp_exposure.py --rings harness/skull-rings.json --hair-points harness/hair-points.json --v-low 0.5 --v-high 1.0 --out "reviews/$P-scalp.json" > /dev/null || true
python3 -c "
import json; d=json.load(open('reviews/$P-scalp.json')); print('scalp', d['verdict'], 'exposed', d['exposedFraction'], 'hardMax', d['hardMax'])"
python3 $F/stage4_review/hair_gate.py --reference "game=$REF" --render "game=renders/$P-sprite-aligned.png" --scalp-exposure "reviews/$P-scalp.json" --out "reviews/$P-hair.json" > /dev/null || true
python3 -c "
import json; d=json.load(open('reviews/$P-hair.json')); print('hair gate', d['verdict'], d['views']['game'].get('bands'))"
echo "== comparison sheet"
python3 $F/stage4_review/make_comparison_sheet.py --reference "$REF" --render "renders/$P-sprite-aligned.png" --out "reviews/$P-cmp.png" --panel-width 360 --panel-height 1028 --json | tail -1 | cut -c1-120
python3 -I compare_sprite.py "renders/$P-sprite.png" ref/north-00.png "reviews/$P-sprite-vs-gif.png" "$P" >/dev/null
echo "== check"
python3 $F/stage3_build/orchestrate_passes.py check object-sculpt-spec.json --pass-id "$P" 2>&1 | tail -2

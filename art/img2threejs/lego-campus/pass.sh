#!/bin/sh
# Usage: pass.sh gen <pass-id>   -> strict-validate, generate the pass factory, sync into the portfolio
#        pass.sh gates <pass-id> -> white-bg composites, tier1 vs live sprite, multi-angle, 4-direction IoU, review sheet, check
set -e
W="$(cd "$(dirname "$0")" && pwd)"
F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"
LIVE="${LIVE_SPRITES:-$W/ref/live-sprites}"   # the sprites to compare against (the old Krea set)
P="$2"
cd "$W"
if [ "$1" = "gen" ]; then
  python3 $F/stage2_spec/validate_sculpt_spec.py object-sculpt-spec.json --strict-quality | tail -1
  python3 $F/stage3_build/generate_threejs_factory.py object-sculpt-spec.json --out src/createObjectModel.ts --pass-id "$P" --force | tail -1 | cut -c1-80
  ./sync_factory.sh; echo "synced $P"; exit 0
fi
python3 -I - "$W" "$P" <<'PY'
import sys
from PIL import Image
W, P = sys.argv[1], sys.argv[2]
for d in ('south', 'west', 'north', 'east'):
    for suf in ('', '-stripped'):
        try:
            im = Image.open(f'{W}/renders/{P}-sprite-{d}{suf}.png').convert('RGBA')
        except FileNotFoundError:
            continue
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); bg.convert('RGB').save(f'{W}/renders/{P}-{d}{suf}-white.png')
PY
echo "== tier1 (south vs live sprite)"
python3 $F/stage4_review/diagnose_render.py --reference ref/krea-sprite-south-white.png --render "renders/${P}-south-white.png" \
  --map-stripped-render "renders/${P}-south-stripped-white.png" --spec object-sculpt-spec.json --pass-id "$P" --in-place --json 2>&1 | python3 -c "
import json,sys; t=sys.stdin.read(); d=json.loads(t[t.index('{'):]); c=d.get('checks',{})
print('passed', d.get('passed'), d.get('failures'), {k:c.get(k) for k in ('silhouetteIoU','aspectRatioDelta','scaleDelta')}, 'maxDeltaE', (c.get('colorDelta') or {}).get('maxDeltaE'))"
echo "== multi-angle"
python3 $F/stage4_review/diagnose_render_multi_angle.py --reference "renders/${P}-south-white.png" --orbit "renders/${P}-west-white.png" --orbit "renders/${P}-east-white.png" --json 2>&1 | python3 -c "
import json,sys; d=json.load(sys.stdin); print('degenerate', d['degenerate'], [round(a['ratio'],3) for a in d['angles']])"
echo "== 4-direction silhouette vs live sprites"
python3 -I ../tools/sprite_compare.py "$W" "$LIVE" "$P" | head -4
echo "== check"
python3 $F/stage3_build/orchestrate_passes.py check object-sculpt-spec.json --pass-id "$P" 2>&1 | tail -2

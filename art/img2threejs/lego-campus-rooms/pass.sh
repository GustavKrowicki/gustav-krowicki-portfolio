#!/bin/sh
# Usage: pass.sh gen <pass-id>   -> strict-validate, generate the pass factory, sync into the portfolio
#        pass.sh gates <pass-id> -> white-bg composites, tier1 vs the reference, multi-angle, review sheet, check
# Renders come from the entrance lab: renders/<pass>-sprite-<south|west|north|east>[-stripped].png and
# renders/<pass>-iso.png (the lab's iso view cropped to the model, matching an AI Studio style $REF).
set -e
W="$(cd "$(dirname "$0")" && pwd)"
F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"
P="$2"
cd "$W"; . ./building.env
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
echo "== tier1 (iso view vs $REF)"
python3 $F/stage4_review/diagnose_render.py --reference "$REF" --render "renders/${P}-iso.png" \
  --spec object-sculpt-spec.json --pass-id "$P" --map-stripped-render "renders/${P}-sprite-south-stripped.png" --in-place --json 2>&1 | tail -c 600
echo "== multi-angle"
python3 $F/stage4_review/diagnose_render_multi_angle.py --reference "renders/${P}-south-white.png" --orbit "renders/${P}-west-white.png" --orbit "renders/${P}-east-white.png" --json 2>&1 | tail -c 400
echo "== comparison sheet"
python3 $F/stage4_review/make_comparison_sheet.py --reference "$REF" --render "renders/${P}-iso.png" --out "renders/${P}-cmp.png" --json | tail -c 200
echo "== check"
python3 $F/stage3_build/orchestrate_passes.py check object-sculpt-spec.json --pass-id "$P" 2>&1 | tail -2

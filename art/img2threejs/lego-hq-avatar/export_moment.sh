#!/bin/sh
# Usage: export_moment.sh [name param]  (default: moment moment = the test room; team clip = the team screen)
# Render the moment frames (lab model hqAvatarMoment, <param>=0..7; roof off) with the south sprite settings, crop the
# region that changes, and write the strip public/game/pogicity/Building/landmark/lego-hq-avatar-<name>_south.png.
# Prints the crop (x, y, w, h) for its entry in lib/city/buildings.ts (moments).
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; N="${1:-moment}"; P="${2:-moment}"; T="$W/renders/$N"
export LAB_PORT="${LAB_PORT:-3111}"
S='"view":"sprite","yaw":45,"pitch":30,"zoom":1.0128,"voff":0,"size":1536,"rig":"converter","shadow":true,"aim":[7.5,5.5]'
cd "$R"
for i in 0 1 2 3 4 5 6 7; do
  node art/img2threejs/tools/lab_render.mjs "hqAvatarMoment&$P=$i" "$T" "f$i={$S}" | tail -1
done
python3 - "$T" "$R/public/game/pogicity/Building/landmark" "$N" <<'PY'
import sys
from PIL import Image, ImageChops
T, O, N = sys.argv[1], sys.argv[2], sys.argv[3]
fr = [Image.open(f'{T}/f{i}.png') for i in range(8)]
box = None
for f in fr[1:]:
    b = ImageChops.difference(fr[0].convert('RGB'), f.convert('RGB')).getbbox()
    if b:
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
x0, y0 = (box[0] - 4) // 2 * 2, (box[1] - 4) // 2 * 2
x1, y1 = (box[2] + 5) // 2 * 2, (box[3] + 5) // 2 * 2
sheet = Image.new('RGBA', ((x1 - x0) * 8, y1 - y0), (0, 0, 0, 0))
for i, f in enumerate(fr):
    sheet.paste(f.crop((x0, y0, x1, y1)), (i * (x1 - x0), 0))
sheet.save(f'{O}/lego-hq-avatar-{N}_south.png')
print(N, 'crop x', x0, 'y', y0, 'w', x1 - x0, 'h', y1 - y0)
PY

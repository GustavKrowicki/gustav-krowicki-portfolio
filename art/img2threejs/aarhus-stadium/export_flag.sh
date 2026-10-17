#!/bin/sh
# Render the red hall's flag frames (lab model stadiumHall, flag=0..7/8) with the hall's south sprite settings (as
# export_sprites.sh), crop the region that changes, and write the strip
# public/game/pogicity/Building/landmark/stadionhallerne-flag_south.png. Prints the crop for the `ambient` entry in
# lib/city/buildings.ts. Dev server on $LAB_PORT (default 3110).
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; T="$W/renders/flag"; N=8
export LAB_PORT="${LAB_PORT:-3110}"
cd "$R"
ZOOM=$(node art/img2threejs/tools/converter_settings.mjs 4 2 4 512 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
S="\"view\":\"sprite\",\"yaw\":45,\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"size\":512,\"rig\":\"converter\",\"shadow\":true,\"aim\":[2,1]"
i=0
while [ $i -lt $N ]; do
  f=$(python3 -c "print(round($i / $N, 4))")
  node art/img2threejs/tools/lab_render.mjs "stadiumHall&flag=$f" "$T" "f$i={$S}" | tail -1
  i=$((i + 1))
done
python3 - "$T" "$R/public/game/pogicity/Building/landmark" "$N" <<'PY'
import sys
from PIL import Image, ImageChops
T, O, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
fr = [Image.open(f'{T}/f{i}.png') for i in range(N)]
box = None
for f in fr[1:]:
    b = ImageChops.difference(fr[0], f).getbbox()
    if b:
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
x0, y0 = (box[0] - 4) // 2 * 2, (box[1] - 4) // 2 * 2
x1, y1 = (box[2] + 5) // 2 * 2, (box[3] + 5) // 2 * 2
sheet = Image.new('RGBA', ((x1 - x0) * N, y1 - y0), (0, 0, 0, 0))
for i, f in enumerate(fr):
    sheet.paste(f.crop((x0, y0, x1, y1)), (i * (x1 - x0), 0))
sheet.save(f'{O}/stadionhallerne-flag_south.png')
print('flag crop x', x0, 'y', y0, 'w', x1 - x0, 'h', y1 - y0, 'frames', N)
PY

#!/bin/sh
# Export the city sprites of the food truck square (lab model "cateItSquare", 8 x 7) and its seated frames (lab model
# "cateItSquareSit", south only, one per truck): 2x density, 768 px, converter zoom from lib/city/units.ts
# (converterSettings, measured maxDim), the footprint's front corner at the bottom centre (vOff 0), converter rig with the
# soft shadow light; drawn at spriteScale 0.5. VIEWS: the views to export (default all four). Dev server on $LAB_PORT (3112).
# Writes public/game/pogicity/Building/landmark/cate-it-square_<view>.png and cate-it-square-sit-<truck>_south.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"
export LAB_PORT="${LAB_PORT:-3112}"
cd "$R"
FW=8; FH=7; N=768
MAX=$(LAB_STATS=1 node art/img2threejs/tools/lab_render.mjs cateItSquare "$W/renders" | sed -n 's/^stats //p' | python3 -c "import json,sys; print(max(json.load(sys.stdin)['size']))")
ZOOM=$(node art/img2threejs/tools/converter_settings.mjs "$FW" "$FH" "$MAX" "$N" 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
echo "cateItSquare maxDim $MAX zoom $ZOOM"
S="\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"size\":$N,\"rig\":\"converter\",\"shadow\":true"
for V in ${VIEWS:-south west north east}; do
  case $V in
    south) Y=45; A="[4,3.5]";;
    west) Y=135; A="[4,-3.5]";;
    north) Y=225; A="[-4,-3.5]";;
    east) Y=315; A="[-4,3.5]";;
  esac
  node art/img2threejs/tools/lab_render.mjs cateItSquare "$O" "cate-it-square_$V={\"view\":\"sprite\",\"yaw\":$Y,\"aim\":$A,$S}" | tail -1
done
for T in burger pizza african; do
  node art/img2threejs/tools/lab_render.mjs "cateItSquareSit&seat=$T" "$O" "cate-it-square-sit-${T}_south={\"view\":\"sprite\",\"yaw\":45,\"aim\":[4,3.5],$S}" | tail -1
done
# The guests' ambient loop: $NF frames of the south view (?t=i/NF). The pixels that change are cut out of the still south
# sprite and the strip carries them for every frame (transparent ground stays transparent, so no ghost of the frame-0 pose
# remains). Prints the crop for the `ambient` entry in lib/city/buildings.ts.
NF=12; T="$W/renders/guests"; mkdir -p "$T"
i=0
while [ $i -lt $NF ]; do
  f=$(python3 -c "print(round($i / $NF, 4))")
  node art/img2threejs/tools/lab_render.mjs "cateItSquare&t=$f" "$T" "f$i={\"view\":\"sprite\",\"yaw\":45,\"aim\":[4,3.5],$S}" | tail -1
  i=$((i + 1))
done
python3 - "$T" "$O" "$NF" <<'PY'
import sys
import numpy as np
from PIL import Image
T, O, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
fr = [np.asarray(Image.open(f'{T}/f{i}.png').convert('RGBA')).astype(int) for i in range(N)]
mask = np.zeros(fr[0].shape[:2], bool)
for f in fr[1:]:
    mask |= (np.abs(f - fr[0]).max(axis=2) > 6)
m = mask.copy()                                   # grow by 2 px so antialiased edges move with the guest
for dy in (-2, -1, 0, 1, 2):
    for dx in (-2, -1, 0, 1, 2):
        m |= np.roll(np.roll(mask, dy, 0), dx, 1)
ys, xs = np.nonzero(m)
x0, y0 = int(xs.min()) // 2 * 2, int(ys.min()) // 2 * 2
x1, y1 = (int(xs.max()) + 2) // 2 * 2, (int(ys.max()) + 2) // 2 * 2
w, h = x1 - x0, y1 - y0
sheet = np.zeros((h, w * N, 4), np.uint8)
for i, f in enumerate(fr):
    crop = f[y0:y1, x0:x1].copy()
    crop[~m[y0:y1, x0:x1]] = 0
    sheet[:, i * w:(i + 1) * w] = crop
Image.fromarray(sheet).save(f'{O}/cate-it-square-guests_south.png')
still = np.asarray(Image.open(f'{O}/cate-it-square_south.png').convert('RGBA')).copy()
still[m] = 0
Image.fromarray(still).save(f'{O}/cate-it-square_south.png')
print('guests crop x', x0, 'y', y0, 'w', w, 'h', h, 'frames', N, 'moving px', int(m.sum()))
PY
# Night lights (docs/city-rules.md section 9): the lit parts only (hatches, neon letters, fairy lights, marker lights, the
# banner), everything else depth only; two frames, every third bulb dimmer on the second (a slow twinkle). Prints the crop
# for the `nightLights` entry in lib/city/buildings.ts.
for k in 0 1; do
  node art/img2threejs/tools/lab_render.mjs "cateItSquare&lights=1&twinkle=$k" "$T" "l$k={\"view\":\"sprite\",\"yaw\":45,\"aim\":[4,3.5],$S}" | tail -1
done
python3 - "$T" "$O" <<'PY'
import sys
import numpy as np
from PIL import Image
T, O = sys.argv[1], sys.argv[2]
fr = [np.asarray(Image.open(f'{T}/l{k}.png').convert('RGBA')) for k in (0, 1)]
alpha = (fr[0][:, :, 3] > 0) | (fr[1][:, :, 3] > 0)
ys, xs = np.nonzero(alpha)
x0, y0 = int(xs.min()) // 2 * 2, int(ys.min()) // 2 * 2
x1, y1 = (int(xs.max()) + 2) // 2 * 2, (int(ys.max()) + 2) // 2 * 2
w, h = x1 - x0, y1 - y0
sheet = np.zeros((h, w * 2, 4), np.uint8)
for k, f in enumerate(fr):
    sheet[:, k * w:(k + 1) * w] = f[y0:y1, x0:x1]
Image.fromarray(sheet).save(f'{O}/cate-it-square-lights_south.png')
print('lights crop x', x0, 'y', y0, 'w', w, 'h', h, 'frames 2')
PY

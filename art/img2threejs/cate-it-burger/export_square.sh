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

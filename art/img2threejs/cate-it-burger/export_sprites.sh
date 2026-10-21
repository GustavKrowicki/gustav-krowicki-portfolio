#!/bin/sh
# Export the city sprites of the burger trailer's walk-in plot (lab model "burgerSite", 4 x 4) and its seated frame (lab
# model "burgerSiteSit", south only): 2x density, 512 px, converter zoom from lib/city/units.ts (converterSettings, measured
# maxDim), the footprint's front corner at the bottom centre (vOff 0), converter rig with the soft shadow light; drawn at
# spriteScale 0.5. VIEWS: the views to export (default all four). Dev server on $LAB_PORT (default 3112).
# Writes public/game/pogicity/Building/landmark/cate-it-burger_<view>.png and cate-it-burger-sit-table_south.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"
export LAB_PORT="${LAB_PORT:-3112}"
cd "$R"
FW=4; FH=4; N=512
MAX=$(LAB_STATS=1 node art/img2threejs/tools/lab_render.mjs burgerSite "$W/renders" | sed -n 's/^stats //p' | python3 -c "import json,sys; print(max(json.load(sys.stdin)['size']))")
ZOOM=$(node art/img2threejs/tools/converter_settings.mjs "$FW" "$FH" "$MAX" "$N" 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
echo "burgerSite maxDim $MAX zoom $ZOOM"
S="\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"size\":$N,\"rig\":\"converter\",\"shadow\":true"
for V in ${VIEWS:-south west north east}; do
  case $V in
    south) Y=45; A="[2,2]";;
    west) Y=135; A="[2,-2]";;
    north) Y=225; A="[-2,-2]";;
    east) Y=315; A="[-2,2]";;
  esac
  node art/img2threejs/tools/lab_render.mjs burgerSite "$O" "cate-it-burger_$V={\"view\":\"sprite\",\"yaw\":$Y,\"aim\":$A,$S}" | tail -1
done
node art/img2threejs/tools/lab_render.mjs burgerSiteSit "$O" "cate-it-burger-sit-table_south={\"view\":\"sprite\",\"yaw\":45,\"aim\":[2,2],$S}" | tail -1

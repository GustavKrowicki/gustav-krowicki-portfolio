#!/bin/sh
# Export the 4 city sprites: 2x density, 512 px, converter zoom from lib/city/units.ts (converterSettings, measured maxDim),
# the footprint's front corner at the bottom centre (vOff 0), converter rig with the soft shadow light; drawn at spriteScale 0.5.
# Roof on in 4 views, and roof off (street-level interior) with each view's own wall cut (lib/city/models/valtechOfficeStates.ts).
# Dev server on $LAB_PORT (default 3107). Writes public/game/pogicity/Building/landmark/valtech-office-avatar[-open]_<view>.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"; . "$W/building.env"
export LAB_PORT="${LAB_PORT:-3107}"
cd "$R"
MAX=$(LAB_STATS=1 node art/img2threejs/tools/lab_render.mjs valtech "$W/renders" | sed -n 's/^stats //p' | python3 -c "import json,sys; print(max(json.load(sys.stdin)['size']))")
ZOOM=$(node art/img2threejs/tools/converter_settings.mjs "$FOOTPRINT_W" "$FOOTPRINT_H" "$MAX" 512 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
echo "maxDim $MAX zoom $ZOOM"
HX=$(python3 -c "print($FOOTPRINT_W / 2)")
S="\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"size\":512,\"rig\":\"converter\",\"shadow\":true"
# the front corner of the footprint (model x, z) for each view: south (+X+Z), west (+X-Z), north (-X-Z), east (-X+Z)
node art/img2threejs/tools/lab_render.mjs valtech "$O" \
  "valtech-office-avatar_south={\"view\":\"sprite\",\"yaw\":45,\"aim\":[$HX,1],$S}" "valtech-office-avatar_west={\"view\":\"sprite\",\"yaw\":135,\"aim\":[$HX,-1],$S}" \
  "valtech-office-avatar_north={\"view\":\"sprite\",\"yaw\":225,\"aim\":[-$HX,-1],$S}" "valtech-office-avatar_east={\"view\":\"sprite\",\"yaw\":315,\"aim\":[-$HX,1],$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs valtechOpen "$O" "valtech-office-avatar-open_south={\"view\":\"sprite\",\"yaw\":45,\"aim\":[$HX,1],$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs valtechOpenWest "$O" "valtech-office-avatar-open_west={\"view\":\"sprite\",\"yaw\":135,\"aim\":[$HX,-1],$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs valtechOpenNorth "$O" "valtech-office-avatar-open_north={\"view\":\"sprite\",\"yaw\":225,\"aim\":[-$HX,-1],$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs valtechOpenEast "$O" "valtech-office-avatar-open_east={\"view\":\"sprite\",\"yaw\":315,\"aim\":[-$HX,1],$S}" | tail -1

#!/bin/sh
# Export the city sprites: 2x density, 768 px (the 6 x 2 block), converter zoom from lib/city/units.ts (converterSettings,
# measured maxDim), the footprint's front corner at the bottom centre (vOff 0), converter rig with the soft shadow light;
# drawn at spriteScale 0.5. Roof on and roof off (street-level interior, lib/city/models/valtechOfficeStates.ts).
# VIEWS: the views to export (default "south"; the 6 x 2 rebuild is reviewed one side at a time, Gustav 2026-10-16).
# Dev server on $LAB_PORT (default 3107). Writes public/game/pogicity/Building/landmark/valtech-office-avatar[-open]_<view>.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"; . "$W/building.env"
export LAB_PORT="${LAB_PORT:-3107}"
cd "$R"
MAX=$(LAB_STATS=1 node art/img2threejs/tools/lab_render.mjs valtech "$W/renders" | sed -n 's/^stats //p' | python3 -c "import json,sys; print(max(json.load(sys.stdin)['size']))")
ZOOM=$(node art/img2threejs/tools/converter_settings.mjs "$FOOTPRINT_W" "$FOOTPRINT_H" "$MAX" 768 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
echo "maxDim $MAX zoom $ZOOM"
HX=$(python3 -c "print($FOOTPRINT_W / 2)"); HZ=$(python3 -c "print($FOOTPRINT_H / 2)")
S="\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"size\":768,\"rig\":\"converter\",\"shadow\":true"
# per view: lab yaw, the footprint's front corner (model x, z), the roof-off lab model
for V in ${VIEWS:-south}; do
  case $V in
    south) Y=45; A="[$HX,$HZ]"; M=valtechOpen;;
    west) Y=135; A="[$HX,-$HZ]"; M=valtechOpenWest;;
    north) Y=225; A="[-$HX,-$HZ]"; M=valtechOpenNorth;;
    east) Y=315; A="[-$HX,$HZ]"; M=valtechOpenEast;;
  esac
  node art/img2threejs/tools/lab_render.mjs valtech "$O" "valtech-office-avatar_$V={\"view\":\"sprite\",\"yaw\":$Y,\"aim\":$A,$S}" | tail -1
  node art/img2threejs/tools/lab_render.mjs "$M" "$O" "valtech-office-avatar-open_$V={\"view\":\"sprite\",\"yaw\":$Y,\"aim\":$A,$S}" | tail -1
done

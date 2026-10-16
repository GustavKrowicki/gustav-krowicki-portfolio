#!/bin/sh
# Export the 4 city sprites: 2x density, 512 px, converter zoom from lib/city/units.ts (converterSettings, measured maxDim),
# the footprint's front corner at the bottom centre (vOff 0), converter rig with the soft shadow light; drawn at spriteScale 0.5.
# Dev server on $LAB_PORT (default 3107). Writes public/game/pogicity/Building/landmark/valtech-office-avatar_<view>.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"; . "$W/building.env"
export LAB_PORT="${LAB_PORT:-3107}"
cd "$R"
MAX=$(LAB_STATS=1 node art/img2threejs/tools/lab_render.mjs valtech "$W/renders" | sed -n 's/^stats //p' | python3 -c "import json,sys; print(max(json.load(sys.stdin)['size']))")
ZOOM=$(node art/img2threejs/tools/converter_settings.mjs "$FOOTPRINT_W" "$FOOTPRINT_H" "$MAX" 512 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
echo "maxDim $MAX zoom $ZOOM"
S="\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"size\":512,\"rig\":\"converter\",\"shadow\":true"
# the front corner of the 3 x 2 footprint (model x, z) for each view: south (+X+Z), west (+X-Z), north (-X-Z), east (-X+Z)
node art/img2threejs/tools/lab_render.mjs valtech "$O" \
  "valtech-office-avatar_south={\"view\":\"sprite\",\"yaw\":45,\"aim\":[1.5,1],$S}" "valtech-office-avatar_west={\"view\":\"sprite\",\"yaw\":135,\"aim\":[1.5,-1],$S}" \
  "valtech-office-avatar_north={\"view\":\"sprite\",\"yaw\":225,\"aim\":[-1.5,-1],$S}" "valtech-office-avatar_east={\"view\":\"sprite\",\"yaw\":315,\"aim\":[-1.5,1],$S}" | tail -1

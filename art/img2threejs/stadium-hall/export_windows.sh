#!/bin/sh
# Export the lit windows for the city at night (POR-39, `nightWindows` in lib/city/buildings.ts): the south sprite again
# with the glass drawn flat warm and every other part only hiding what is behind it (entrance lab `glow`), at the
# converter settings of shoot.sh (512 px). a: the windows of the two halls; front: the lobby windows and its door.
# Dev server on $LAB_PORT (default 3110). Writes public/game/pogicity/Building/landmark/stadionhallerne-win-<a|f>_south.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"; . "$W/building.env"
export LAB_PORT="${LAB_PORT:-3110}"
cd "$R"
MAX=$(LAB_STATS=1 node art/img2threejs/tools/lab_render.mjs stadiumHall "$W/renders" | sed -n 's/^stats //p' | python3 -c "import json,sys; print(max(json.load(sys.stdin)['size']))")
ZOOM=$(node art/img2threejs/tools/converter_settings.mjs "$FOOTPRINT_W" "$FOOTPRINT_H" "$MAX" 512 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
HX=$(python3 -c "print($FOOTPRINT_W / 2)"); HZ=$(python3 -c "print($FOOTPRINT_H / 2)")
V="\"view\":\"sprite\",\"yaw\":45,\"aim\":[$HX,$HZ],\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"size\":512,\"rig\":\"converter\""
node art/img2threejs/tools/lab_render.mjs stadiumHall "$O" \
  "stadionhallerne-win-a_south={$V,\"glow\":\"^hall-(west|east)-win-[NS]-\\\\d+\$\"}" \
  "stadionhallerne-win-f_south={$V,\"glow\":\"^(lobby-win-\\\\d+|lobby-door)\$\"}" | grep -v '^console'

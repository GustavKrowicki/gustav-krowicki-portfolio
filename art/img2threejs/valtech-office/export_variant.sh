#!/bin/sh
# Export one interior grey-box variant's south sprites (roof on and roof off) for the city flag ?valtech=<variant>.
# Usage: VARIANT=4x3|5x2|6x2 ./export_variant.sh. Same density as the approved sprites (2x, converter zoom from the
# footprint), 768 px so the wider blocks fit; front corner at the bottom centre; drawn at spriteScale 0.5.
# Writes public/game/pogicity/Building/landmark/valtech-office-v<variant>[-open]_south.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"; . "$W/building.env"
export LAB_PORT="${LAB_PORT:-3107}"
cd "$R"
MAX=$(LAB_STATS=1 node art/img2threejs/tools/lab_render.mjs "valtech-$VARIANT" "$W/renders" | sed -n 's/^stats //p' | python3 -c "import json,sys; print(max(json.load(sys.stdin)['size']))")
ZOOM=$(node art/img2threejs/tools/converter_settings.mjs "$FOOTPRINT_W" "$FOOTPRINT_H" "$MAX" 768 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
HX=$(python3 -c "print($FOOTPRINT_W / 2)"); HZ=$(python3 -c "print($FOOTPRINT_H / 2)")
S="\"view\":\"sprite\",\"yaw\":45,\"aim\":[$HX,$HZ],\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"size\":768,\"rig\":\"converter\",\"shadow\":true"
echo "$VARIANT maxDim $MAX zoom $ZOOM"
node art/img2threejs/tools/lab_render.mjs "valtech-$VARIANT" "$O" "valtech-office-v${VARIANT}_south={$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs "valtech-$VARIANT-open" "$O" "valtech-office-v${VARIANT}-open_south={$S}" | tail -1

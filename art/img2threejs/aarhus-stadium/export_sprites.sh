#!/bin/sh
# Export the city sprites of the stadium (lab model "stadium", 8 x 5) and the red hall (lab model "stadiumHall", 4 x 2):
# 2x density, 768 px (stadium, its 8 x 5 diamond is 572 px wide) / 512 px (hall), converter zoom from lib/city/units.ts (converterSettings, measured maxDim), the footprint's front
# corner at the bottom centre (vOff 0), converter rig with the soft shadow light; drawn at spriteScale 0.5.
# VIEWS: the views to export (default all four). Dev server on $LAB_PORT (default 3110).
# Writes public/game/pogicity/Building/landmark/aarhus-stadium_<view>.png and stadionhallerne_<view>.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"
export LAB_PORT="${LAB_PORT:-3110}"
cd "$R"
for B in "stadium aarhus-stadium 8 5 768" "stadiumHall stadionhallerne 4 2 512"; do
  set -- $B; M=$1; F=$2; FW=$3; FH=$4; N=$5
  MAX=$(LAB_STATS=1 node art/img2threejs/tools/lab_render.mjs "$M" "$W/renders" | sed -n 's/^stats //p' | python3 -c "import json,sys; print(max(json.load(sys.stdin)['size']))")
  ZOOM=$(node art/img2threejs/tools/converter_settings.mjs "$FW" "$FH" "$MAX" "$N" 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
  echo "$M maxDim $MAX zoom $ZOOM"
  HX=$(python3 -c "print($FW / 2)"); HZ=$(python3 -c "print($FH / 2)")
  S="\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"size\":$N,\"rig\":\"converter\",\"shadow\":true"
  for V in ${VIEWS:-south west north east}; do
    case $V in
      south) Y=45; A="[$HX,$HZ]";;
      west) Y=135; A="[$HX,-$HZ]";;
      north) Y=225; A="[-$HX,-$HZ]";;
      east) Y=315; A="[-$HX,$HZ]";;
    esac
    node art/img2threejs/tools/lab_render.mjs "$M" "$O" "${F}_$V={\"view\":\"sprite\",\"yaw\":$Y,\"aim\":$A,$S}" | tail -1
  done
done

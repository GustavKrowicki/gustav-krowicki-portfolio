#!/bin/sh
# Capture one pass through the entrance lab (dev server on $LAB_PORT, default 3112): the 4 city sprite views at the
# converter settings from lib/city/units.ts (2x density, 512 px, front corner at the bottom centre, converter rig with the
# soft shadow light), the south view stripped, the south view at 1024 px (2x close-up), and the review iso aligned to $REF.
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; P="$1"; . "$W/building.env"
export LAB_PORT="${LAB_PORT:-3112}"
cd "$R"
SIZE=$(LAB_STATS=1 node art/img2threejs/tools/lab_render.mjs cateItAfrican "$W/renders" | sed -n 's/^stats //p')
MAX=$(echo "$SIZE" | python3 -c "import json,sys; s=json.load(sys.stdin)['size']; print(max(s))")
ZOOM=$(node art/img2threejs/tools/converter_settings.mjs "$FOOTPRINT_W" "$FOOTPRINT_H" "$MAX" 512 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
echo "maxDim $MAX zoom $ZOOM  stats $SIZE"
HX=$(python3 -c "print($FOOTPRINT_W / 2)")
XE=$HX; XW=-$HX; HZ=$(python3 -c "print($FOOTPRINT_H / 2)")
S="\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"rig\":\"converter\",\"shadow\":true"
# the front corner of the footprint (model x, z) for each view: south (+X+Z), west (+X-Z), north (-X-Z), east (-X+Z)
AS="\"aim\":[$XE,$HZ]"; AW="\"aim\":[$XE,-$HZ]"; AN="\"aim\":[$XW,-$HZ]"; AE="\"aim\":[$XW,$HZ]"
node art/img2threejs/tools/lab_render.mjs cateItAfrican "$W/renders" \
  "$P-sprite-south={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"size\":512}" "$P-sprite-south-stripped={\"view\":\"sprite\",\"yaw\":45,\"stripped\":true,$AS,$S,\"size\":512}" \
  "$P-sprite-west={\"view\":\"sprite\",\"yaw\":135,$AW,$S,\"size\":512}" "$P-sprite-north={\"view\":\"sprite\",\"yaw\":225,$AN,$S,\"size\":512}" \
  "$P-sprite-east={\"view\":\"sprite\",\"yaw\":315,$AE,$S,\"size\":512}" "$P-sprite2x-south={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"size\":1024}" "$P-sprite2x-west={\"view\":\"sprite\",\"yaw\":135,$AW,$S,\"size\":1024}" "$P-sprite2x-north={\"view\":\"sprite\",\"yaw\":225,$AN,$S,\"size\":1024}" "$P-sprite2x-east={\"view\":\"sprite\",\"yaw\":315,$AE,$S,\"size\":1024}" \
  "$P-iso-raw={\"view\":\"iso\",\"fit\":true,\"pitch\":30,\"yaw\":45,\"rig\":\"converter\",\"shadow\":true}" | tail -1
python3 art/img2threejs/tools/align_to_ref.py "$W/$REF" "$W/renders/$P-iso-raw.png" "$W/renders/$P-iso.png"

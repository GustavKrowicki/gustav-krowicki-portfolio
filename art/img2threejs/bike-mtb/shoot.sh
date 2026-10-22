#!/bin/sh
# Capture one pass through the entrance lab (dev server on $LAB_PORT, default 3115): the side view (orthographic, level,
# white background) to compare with the photo, the 4 city sprite views at the converter settings from lib/city/units.ts
# (2x density, 384 px, front corner at the bottom centre, converter rig), the south view stripped and at 1024 px, the
# bike beside the avatar, and the review iso aligned to $REF.
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; P="$1"; . "$W/building.env"
export LAB_PORT="${LAB_PORT:-3115}"
cd "$R"
SIZE=$(LAB_STATS=1 node art/img2threejs/tools/lab_render.mjs mountainBike "$W/renders" | sed -n 's/^stats //p')
MAX=$(echo "$SIZE" | python3 -c "import json,sys; s=json.load(sys.stdin)['size']; print(max(s))")
ZOOM=$(node art/img2threejs/tools/converter_settings.mjs "$FOOTPRINT_W" "$FOOTPRINT_H" "$MAX" 384 2 2>/dev/null | python3 -c "import json,sys; print(round(json.load(sys.stdin)['zoom'], 4))")
echo "maxDim $MAX zoom $ZOOM  stats $SIZE"
S="\"pitch\":30,\"zoom\":$ZOOM,\"voff\":0,\"rig\":\"converter\",\"shadow\":true"
AS="\"aim\":[0.5,0.5]"; AW="\"aim\":[0.5,-0.5]"; AN="\"aim\":[-0.5,-0.5]"; AE="\"aim\":[-0.5,0.5]"
node art/img2threejs/tools/lab_render.mjs mountainBike "$W/renders" \
  "$P-side={\"view\":\"reference\",\"elev\":0,\"rig\":\"lookdev\",\"bg\":\"ffffff\",\"tone\":\"neutral\"}" \
  "$P-sprite-south={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"size\":384}" "$P-sprite-south-stripped={\"view\":\"sprite\",\"yaw\":45,\"stripped\":true,$AS,$S,\"size\":384}" \
  "$P-sprite-west={\"view\":\"sprite\",\"yaw\":135,$AW,$S,\"size\":384}" "$P-sprite-north={\"view\":\"sprite\",\"yaw\":225,$AN,$S,\"size\":384}" \
  "$P-sprite-east={\"view\":\"sprite\",\"yaw\":315,$AE,$S,\"size\":384}" "$P-sprite2x-south={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"size\":768}" \
  "$P-iso-raw={\"view\":\"iso\",\"fit\":true,\"pitch\":30,\"yaw\":45,\"rig\":\"converter\",\"shadow\":true}" | tail -1
# the bike beside the avatar, framed by the bike alone at the same converter zoom (the avatar's 0.9 wu shows the scale)
node art/img2threejs/tools/lab_render.mjs avatar-mountain-bike "$W/renders" \
  "$P-avatar-side={\"view\":\"reference\",\"elev\":0,\"rig\":\"lookdev\",\"bg\":\"ffffff\",\"tone\":\"neutral\"}" \
  "$P-avatar-south={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"size\":384}" | tail -1
# the reference is a side photo, so the tier-1 render ($P-iso.png) is the side view aligned to it
python3 art/img2threejs/tools/align_to_ref.py "$W/$REF" "$W/renders/$P-side.png" "$W/renders/$P-iso.png"
python3 "$W/side_compare.py" "$W" "$P"

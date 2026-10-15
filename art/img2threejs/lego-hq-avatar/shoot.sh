#!/bin/sh
# Capture one pass through the entrance lab (dev server on $LAB_PORT, default 3104): 4 roof-on sprite views (+ stripped),
# the south roof-off sprite, and the review iso at the board massing camera (pitch 30, yaw 45) aligned to $REF.
# Converter settings for 8 x 8 at 2x density, 768 px: zoom 1.0803, vOff 0.2250 (lib/city/units.ts converterSettings).
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; P="$1"; . "$W/building.env"
export LAB_PORT="${LAB_PORT:-3104}"
S='"pitch":30,"zoom":1.0803,"voff":0.2250,"size":768,"rig":"converter"'
cd "$R"
node art/img2threejs/tools/lab_render.mjs hqAvatar "$W/renders" \
  "$P-sprite-south={\"view\":\"sprite\",\"yaw\":45,$S}" "$P-sprite-south-stripped={\"view\":\"sprite\",\"yaw\":45,\"stripped\":true,$S}" \
  "$P-sprite-west={\"view\":\"sprite\",\"yaw\":135,$S}" "$P-sprite-north={\"view\":\"sprite\",\"yaw\":225,$S}" \
  "$P-sprite-east={\"view\":\"sprite\",\"yaw\":315,$S}" \
  "$P-iso-raw={\"view\":\"iso\",\"fit\":true,\"pitch\":30,\"yaw\":45,\"rig\":\"lookdev\",\"bg\":\"ffffff\",\"tone\":\"neutral\"}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpen "$W/renders" "$P-open-south={\"view\":\"sprite\",\"yaw\":45,$S}" | tail -1
python3 art/img2threejs/tools/align_to_ref.py "$W/$REF" "$W/renders/$P-iso-raw.png" "$W/renders/$P-iso.png"

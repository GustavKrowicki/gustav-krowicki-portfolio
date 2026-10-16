#!/bin/sh
# Capture one pass through the entrance lab (dev server on $LAB_PORT, default 3104): 4 roof-on sprite views (+ stripped),
# the south roof-off sprite, and the review iso at the board massing camera (pitch 30, yaw 45) aligned to $REF.
# 14 x 9 at 2x density (62.2 px per wu): 1280 px square, zoom 1.1342, the front corner aimed at the bottom centre (vOff 0).
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; P="$1"; . "$W/building.env"
export LAB_PORT="${LAB_PORT:-3103}"
S='"pitch":30,"zoom":1.1342,"voff":0,"size":1280,"rig":"converter"'
# the front corner of the 14 x 9 plot (model x, z) for each view: south (+X+Z), west (+X-Z), north (-X-Z), east (-X+Z)
AS='"aim":[7,4.5]'; AW='"aim":[7,-4.5]'; AN='"aim":[-7,-4.5]'; AE='"aim":[-7,4.5]'
cd "$R"
node art/img2threejs/tools/lab_render.mjs hqAvatar "$W/renders" \
  "$P-sprite-south={\"view\":\"sprite\",\"yaw\":45,$AS,$S}" "$P-sprite-south-stripped={\"view\":\"sprite\",\"yaw\":45,\"stripped\":true,$AS,$S}" \
  "$P-sprite-west={\"view\":\"sprite\",\"yaw\":135,$AW,$S}" "$P-sprite-north={\"view\":\"sprite\",\"yaw\":225,$AN,$S}" \
  "$P-sprite-east={\"view\":\"sprite\",\"yaw\":315,$AE,$S}" \
  "$P-iso-raw={\"view\":\"iso\",\"fit\":true,\"pitch\":30,\"yaw\":45,\"rig\":\"lookdev\",\"bg\":\"ffffff\",\"tone\":\"neutral\"}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpen "$W/renders" "$P-open-south={\"view\":\"sprite\",\"yaw\":45,$AS,$S}" | tail -1
python3 art/img2threejs/tools/align_to_ref.py "$W/$REF" "$W/renders/$P-iso-raw.png" "$W/renders/$P-iso.png"

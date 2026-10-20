#!/bin/sh
# Export the city sprites (2x density, 1536 px, front corner at the bottom centre, drawn at spriteScale 0.5): roof on in 4 views, and roof off with each
# view's own wall cut. Dev server on $LAB_PORT (default 3104). Writes public/game/pogicity/Building/landmark/lego-hq-avatar*.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"
export LAB_PORT="${LAB_PORT:-3111}"
S='"pitch":30,"zoom":1.0128,"voff":0,"size":1536,"rig":"converter","shadow":true'
# the front corner of the 15 x 11 plot (model x, z) for each view: south (+X+Z), west (+X-Z), north (-X-Z), east (-X+Z)
AS='"aim":[7.5,5.5]'; AW='"aim":[7.5,-5.5]'; AN='"aim":[-7.5,-5.5]'; AE='"aim":[-7.5,5.5]'
cd "$R"
node art/img2threejs/tools/lab_render.mjs hqAvatar "$O" \
  "lego-hq-avatar_south={\"view\":\"sprite\",\"yaw\":45,$AS,$S}" "lego-hq-avatar_west={\"view\":\"sprite\",\"yaw\":135,$AW,$S}" \
  "lego-hq-avatar_north={\"view\":\"sprite\",\"yaw\":225,$AN,$S}" "lego-hq-avatar_east={\"view\":\"sprite\",\"yaw\":315,$AE,$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpen "$O" "lego-hq-avatar-open_south={\"view\":\"sprite\",\"yaw\":45,$AS,$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpenWest "$O" "lego-hq-avatar-open_west={\"view\":\"sprite\",\"yaw\":135,$AW,$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpenNorth "$O" "lego-hq-avatar-open_north={\"view\":\"sprite\",\"yaw\":225,$AN,$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpenEast "$O" "lego-hq-avatar-open_east={\"view\":\"sprite\",\"yaw\":315,$AE,$S}" | tail -1

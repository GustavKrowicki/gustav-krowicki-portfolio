#!/bin/sh
# Export the city sprites (2x density, 768 px, drawn at spriteScale 0.5): roof on in 4 views, and roof off with each
# view's own wall cut. Dev server on $LAB_PORT (default 3104). Writes public/game/pogicity/Building/landmark/lego-hq-avatar*.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"
export LAB_PORT="${LAB_PORT:-3104}"
S='"pitch":30,"zoom":1.0803,"voff":0.2250,"size":768,"rig":"converter"'
cd "$R"
node art/img2threejs/tools/lab_render.mjs hqAvatar "$O" \
  "lego-hq-avatar_south={\"view\":\"sprite\",\"yaw\":45,$S}" "lego-hq-avatar_west={\"view\":\"sprite\",\"yaw\":135,$S}" \
  "lego-hq-avatar_north={\"view\":\"sprite\",\"yaw\":225,$S}" "lego-hq-avatar_east={\"view\":\"sprite\",\"yaw\":315,$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpen "$O" "lego-hq-avatar-open_south={\"view\":\"sprite\",\"yaw\":45,$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpenWest "$O" "lego-hq-avatar-open_west={\"view\":\"sprite\",\"yaw\":135,$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpenNorth "$O" "lego-hq-avatar-open_north={\"view\":\"sprite\",\"yaw\":225,$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpenEast "$O" "lego-hq-avatar-open_east={\"view\":\"sprite\",\"yaw\":315,$S}" | tail -1

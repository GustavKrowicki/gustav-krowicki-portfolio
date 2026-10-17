#!/bin/sh
# Review shots for the grey box (dev server on $LAB_PORT): roof on in 4 views, roof off (south), the avatar at the door and
# in each room (also drawn alone: the city always draws the avatar above a walk-in building), and flat-colour masks. Usage: review_shots.sh <out dir>; then review_sheet.py <out dir>.
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$1"
export LAB_PORT="${LAB_PORT:-3111}"
S='"pitch":30,"zoom":1.0128,"voff":0,"size":1536,"rig":"converter","shadow":true'
AS='"aim":[7.5,5.5]'; AW='"aim":[7.5,-5.5]'; AN='"aim":[-7.5,-5.5]'; AE='"aim":[-7.5,5.5]'
M='"masks":["hero-shelf","hero-test","hero-team","hero-map","hero-ailab"]'
cd "$R"
node art/img2threejs/tools/lab_render.mjs hqAvatar "$O" \
  "on-south={\"view\":\"sprite\",\"yaw\":45,$AS,$S}" "on-west={\"view\":\"sprite\",\"yaw\":135,$AW,$S}" \
  "on-north={\"view\":\"sprite\",\"yaw\":225,$AN,$S}" "on-east={\"view\":\"sprite\",\"yaw\":315,$AE,$S}" | tail -1
node art/img2threejs/tools/lab_render.mjs hqAvatarOpen "$O" "off-south={\"view\":\"sprite\",\"yaw\":45,$AS,$S}" \
  "off-masks={\"view\":\"sprite\",\"yaw\":45,$AS,$S,$M}" | tail -1
node art/img2threejs/tools/lab_render.mjs avatar-hq "$O" "walk-0-door={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"avatarAt\":[8.5,8.9]}" \
  "walk-0-door-mask={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"avatarAt\":[8.5,8.9],\"masks\":[\"none\"],\"only\":[\"avatar\"]}" \
  "walk-0-door-avatar={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"avatarAt\":[8.5,8.9],\"only\":[\"avatar\"]}" | tail -1
set -- lobby:8.5:5.5 shelf:5.5:7.5 test:10.5:6.5 team:6.5:1.5 map:2.5:5.5 ailab:13.5:4.5
i=1
for r in "$@"; do
  n=${r%%:*}; xy=${r#*:}; x=${xy%%:*}; y=${xy#*:}
  node art/img2threejs/tools/lab_render.mjs avatar-hq-open "$O" "walk-$i-$n={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"avatarAt\":[$x,$y]}" \
    "walk-$i-$n-mask={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"avatarAt\":[$x,$y],\"masks\":[\"none\"],\"only\":[\"avatar\"]}" \
    "walk-$i-$n-avatar={\"view\":\"sprite\",\"yaw\":45,$AS,$S,\"avatarAt\":[$x,$y],\"only\":[\"avatar\"]}" | tail -1
  i=$((i + 1))
done

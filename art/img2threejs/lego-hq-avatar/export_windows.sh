#!/bin/sh
# Export the lit windows for the city at night (POR-39, `nightWindows` in lib/city/buildings.ts): the south sprite again
# with the glass drawn flat warm and every other part only hiding what is behind it (entrance lab `glow`). Same settings
# as export_sprites.sh. a: the punched windows of the office wings, the roof pavilions and the door glass; b: the glass
# painted on the round building, the atrium and the yellow blocks, cut to their glass pixels with tools/glass_mask.py.
# Dev server on $LAB_PORT (default 3111). Writes public/game/pogicity/Building/landmark/lego-hq-avatar-win-<a|b>_south.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"
export LAB_PORT="${LAB_PORT:-3111}"
V='"view":"sprite","yaw":45,"aim":[7.5,5.5],"pitch":30,"zoom":1.0128,"voff":0,"size":1536,"rig":"converter"'
cd "$R"
node art/img2threejs/tools/lab_render.mjs hqAvatar "$O" \
  "lego-hq-avatar-win-a_south={$V,\"glow\":\"^(upper-[NSEW]-\\\\d+-\\\\d+-win-\\\\d+|roof-w\\\\d+-win-\\\\d+|upper-S-door-glass|roof-hq-sign-face)\$\"}" \
  "lego-hq-avatar-win-b_south={$V,\"glow\":\"^(roof-(yellow-bar|yellow-block|round|atrium)-mass|wall-C-\\\\d+|upper-C-\\\\d+)\$\"}" | grep -v '^console'
python3 -I art/img2threejs/tools/glass_mask.py "$O/lego-hq-avatar-win-b_south.png" "$O/lego-hq-avatar_south.png" "$O/lego-hq-avatar-win-b_south.png"

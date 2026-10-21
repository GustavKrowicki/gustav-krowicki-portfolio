#!/bin/sh
# Export the lit windows for the city at night (POR-39, `nightWindows` in lib/city/buildings.ts): the south sprite again,
# with the window glass drawn flat warm and every other part only hiding what is behind it (entrance lab `glow`), so the
# light shows between the louvre slats and behind the cafe's planters and chairs. Same converter settings as
# export_sprites.sh (zoom 0.8656, front corner at the bottom centre). Three layers: a (louvre storeys 1 and 3 and the
# glass top floor), b (the middle louvre storey), f (the cafe glass on the ground floor).
# Dev server on $LAB_PORT (default 3107). Writes public/game/pogicity/Building/landmark/valtech-office-avatar-win-<a|b|f>_south.png
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; O="$R/public/game/pogicity/Building/landmark"; . "$W/building.env"
export LAB_PORT="${LAB_PORT:-3107}"
cd "$R"
HX=$(python3 -c "print($FOOTPRINT_W / 2)"); HZ=$(python3 -c "print($FOOTPRINT_H / 2)")
V="\"view\":\"sprite\",\"yaw\":45,\"aim\":[$HX,$HZ],\"pitch\":30,\"zoom\":${ZOOM:-0.8656},\"voff\":0,\"size\":768,\"rig\":\"converter\""
node art/img2threejs/tools/lab_render.mjs valtech "$O" \
  "valtech-office-avatar-win-a_south={$V,\"glow\":\"^(louvre-[NSEW]-[02]|top-core)\$\"}" \
  "valtech-office-avatar-win-b_south={$V,\"glow\":\"^louvre-[NSEW]-1\$\"}" \
  "valtech-office-avatar-win-f_south={$V,\"glow\":\"^shop-glass-S-\\\\d+\$\"}" | grep -v '^console'

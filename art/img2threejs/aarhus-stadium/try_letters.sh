#!/bin/sh
# Round 8: build each AARHUS version (LETTERS=...), render the bowl close-up and the city sprite (south, 512 px), then
# rebuild the default (C4, font57midw). Usage: try_letters.sh [versions...]   Dev server on $LAB_PORT (default 3110).
set -e
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."
export LAB_PORT="${LAB_PORT:-3110}"
for V in ${*:-rows8 rows8dark font57 font57dark font57mid font57midw west fascia}; do
  (cd "$W" && LETTERS=$V ./rebuild_spec.sh >/dev/null && ./pass.sh gen form-refinement >/dev/null)
  sleep 7
  (cd "$R" && node art/img2threejs/tools/lab_render.mjs stadium "$W/renders/letters" \
    "$V-bowl={\"view\":\"iso\",\"fit\":true,\"pitch\":30,\"yaw\":45,\"rig\":\"converter\",\"shadow\":true}" \
    "$V-sprite={\"view\":\"sprite\",\"yaw\":45,\"aim\":[3.5,2.5],\"pitch\":30,\"zoom\":1.4179,\"voff\":0,\"rig\":\"converter\",\"shadow\":true,\"size\":512}" | tail -1)
done
(cd "$W" && ./rebuild_spec.sh >/dev/null && ./pass.sh gen form-refinement >/dev/null)

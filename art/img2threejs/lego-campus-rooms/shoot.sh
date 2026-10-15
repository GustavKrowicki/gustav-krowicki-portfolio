#!/bin/sh
# Capture a pass of the roof-off model through the entrance lab (dev server on 3100, tools/sheet_receiver.py on 8765):
# 4 sprite directions, then the review iso at the AI reference's pitch (39 deg, entrance side) aligned to the reference.
set -e
export CHROMIUM_PATH="${CHROMIUM_PATH:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"
W="$(cd "$(dirname "$0")" && pwd)"; R="$W/../../.."; P="$1"
. "$W/building.env"
cd "$R"
node art/img2threejs/tools/lab_shoot.mjs hqRoomsOpen "$P" 0.9452 0.1966 | tail -1
node art/img2threejs/tools/lab_iso.mjs hqRoomsOpen "$P-iso-raw" 39 225
python3 art/img2threejs/tools/align_to_ref.py "$W/$REF" "$W/renders/$P-iso-raw.png" "$W/renders/$P-iso.png"

#!/bin/sh
# Usage: tools/new_building.sh <folder-slug> "<Name>" <factoryFile> <footprintW> <footprintH>
# Copies _template/ into art/img2threejs/<folder-slug>/. Then: put the reference in ref/, write assessment.json
# with the skill's new_pre_spec_assessment.py, author build_spec.py, run rebuild_spec.sh and pass.sh.
set -e
A="$(cd "$(dirname "$0")/.." && pwd)"; D="$A/$1"
[ -e "$D" ] && { echo "$D exists"; exit 1; }
cp -R "$A/_template" "$D"; mkdir -p "$D/ref" "$D/renders"
sed -i.bak -e "s/__NAME__/$2/" -e "s/__FACTORY__/$3/" -e "s/__W__/$4/" -e "s/__H__/$5/" "$D/building.env" && rm "$D/building.env.bak"
chmod +x "$D"/*.sh; echo "created $D"

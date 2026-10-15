#!/bin/sh
# Generate, capture and gate one pass; then score renders/<pass>-cmp.png and record it with review.sh.
set -e
W="$(cd "$(dirname "$0")" && pwd)"; F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"; cd "$W"; P="$1"; st=.img2threejs/state.json
./pass.sh gen "$P" | tail -1
python3 $F/state.py mark build-current-pass --state $st --evidence src/createObjectModel.ts >/dev/null 2>&1 || true
./shoot.sh "$P" | tail -1
python3 $F/state.py mark render-capture --state $st --evidence "renders/$P-iso.png" >/dev/null 2>&1 || true
python3 $F/state.py mark review-contract-read --state $st --evidence "$HOME/.claude/skills/img2threejs/grimoire/review/self_correction.md" >/dev/null 2>&1 || true
./pass.sh gates "$P" 2>&1 | tail -2
python3 $F/next.py --state $st object-sculpt-spec.json 2>/dev/null | head -1

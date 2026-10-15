#!/bin/sh
# Mark the per-pass gate steps from the evidence pass.sh gates wrote (used when gates ran before the marks existed).
W="$(cd "$(dirname "$0")" && pwd)"
F="${IMG2THREEJS:-$HOME/.claude/skills/img2threejs}/forge"
P="$1"
cd "$W"
S="python3 $F/state.py"
python3 $F/stage3_build/orchestrate_passes.py check object-sculpt-spec.json --pass-id "$P" > "reviews/$P-check.txt" 2>&1
$S mark render-capture --state .img2threejs/state.json --evidence "renders/$P-sprite.png" --evidence "renders/$P-front.png" >/dev/null
$S mark review-contract-read --state .img2threejs/state.json --evidence "$F/../grimoire/review/gates_reference.md" >/dev/null
$S mark tier1-diagnostics --state .img2threejs/state.json --evidence "reviews/$P-tier1.json" --evidence "reviews/$P-interior.json" >/dev/null
$S mark multi-angle-review --state .img2threejs/state.json --evidence "reviews/$P-multi.json" --evidence "reviews/$P-turntable.json" >/dev/null
grep -q PASS "reviews/$P-check.txt" && $S mark pass-gate-check --state .img2threejs/state.json --evidence "reviews/$P-check.txt" >/dev/null
python3 $F/next.py --state .img2threejs/state.json object-sculpt-spec.json | sed -n 1,2p

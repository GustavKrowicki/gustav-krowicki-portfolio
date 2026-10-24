#!/usr/bin/env python3
"""Bake the pogicity people's walking GIFs into sprite sheets.

The city used to decode these GIFs in the browser (gifuct-js, one frame at a time through three canvases) right after
it stood, which blocked the page for about half a second on a Mac and longer on a phone, in the middle of the load
intro's hand-over. Each GIF becomes one horizontal sprite sheet PNG, and lib/city/npcSheets.json says how to cut it,
so Phaser loads them with the rest of the art (MainScene.preload) and nothing is decoded at run time.

Run from the repo root: python3 art/npc/gif-sheets.py
"""
import json
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/game/pogicity/Characters"
OUT = SRC / "sheets"
MANIFEST = ROOT / "lib/city/npcSheets.json"
CHARS = ["banana", "apple"]
DIRS = ["north", "south", "east", "west"]

OUT.mkdir(exist_ok=True)
manifest = {}
for char in CHARS:
    for d in DIRS:
        name = f"{char}walk{d}"
        im = Image.open(SRC / f"{name}.gif")
        frames = [f.convert("RGBA") for f in ImageSequence.Iterator(im)]
        w, h = frames[0].size
        sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
        delays = []
        for i, f in enumerate(frames):
            sheet.paste(f, (i * w, 0))
            delays.append(f.info.get("duration") or 100)   # as the browser decoder did: a missing delay counts 100 ms
        sheet.save(OUT / f"{name}.png", optimize=True)
        manifest[f"{char}_{d}"] = {
            "file": f"/game/pogicity/Characters/sheets/{name}.png",
            "frameWidth": w,
            "frameHeight": h,
            "frames": len(frames),
            "frameRate": round(1000 / (sum(delays) / len(delays))),
        }
        print(f"{name}: {len(frames)} frames of {w}x{h}, {manifest[f'{char}_{d}']['frameRate']} fps")

MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
print(f"wrote {MANIFEST.relative_to(ROOT)} and {len(manifest)} sheets in {OUT.relative_to(ROOT)}")

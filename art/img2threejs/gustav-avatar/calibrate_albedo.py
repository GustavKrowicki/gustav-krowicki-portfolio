"""Calibrate material albedos so the sprite-converter render lands on the measured sprite palette.

Inputs: a converter-rig render of the 30 deg sprite view and the same view with flat base colours (stripped),
both from the lab. Each pixel of the stripped render is assigned to the material whose albedo it matches; the
lit render's median per material is compared with measure/palette.json and the albedo is scaled in linear light
by target / measured (clamped). Writes measure/albedo.json (read by build_spec.py) and a report.

Usage: python3 -I calibrate_albedo.py <workspace> <lit.png> <stripped.png>
"""
import json
import statistics as st
import sys

from PIL import Image

W, LIT, FLAT = sys.argv[1:4]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
palette = json.load(open(f"{W}/measure/palette.json"))
mats = {m["id"]: m["baseColor"] for m in spec["materials"] if m["id"] in palette or m["id"] == "glasses-frame"}
TARGET = {k: palette[k]["rgb"] for k in palette}


def hex2rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def to_lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def to_srgb(c):
    c = max(0.0, min(1.0, c))
    return 255 * (12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055)


lit = Image.open(LIT).convert("RGBA")
flat = Image.open(FLAT).convert("RGBA")
alb = {k: hex2rgb(v) for k, v in mats.items()}
samples = {k: [] for k in alb}
for y in range(lit.height):
    for x in range(lit.width):
        fr, fg, fb, fa = flat.getpixel((x, y))
        lr, lg, lb, la = lit.getpixel((x, y))
        if fa < 250 or la < 250:
            continue
        best, bd = None, 1e9
        for k, c in alb.items():
            d = abs(fr - c[0]) + abs(fg - c[1]) + abs(fb - c[2])
            if d < bd:
                best, bd = k, d
        if bd <= 6:
            samples[best].append((lr, lg, lb))

report = {}
out = {}
for k, px in samples.items():
    if not px or k not in TARGET:
        continue
    measured = [st.median(c) for c in zip(*px)]
    target = TARGET[k]
    new = []
    for ch in range(3):
        ratio = to_lin(target[ch]) / max(1e-4, to_lin(measured[ch]))
        ratio = max(0.4, min(2.5, ratio))
        new.append(round(to_srgb(to_lin(alb[k][ch]) * ratio)))
    out[k] = "#%02x%02x%02x" % tuple(new)
    report[k] = {"pixels": len(px), "albedo": mats[k], "litMedian": measured, "target": target, "newAlbedo": out[k],
                 "deltaRGB": [round(measured[i] - target[i], 1) for i in range(3)]}
prev = {}
try:
    prev = json.load(open(f"{W}/measure/albedo.json"))
except FileNotFoundError:
    pass
prev.update(out)
json.dump(prev, open(f"{W}/measure/albedo.json", "w"), indent=2)
json.dump(report, open(f"{W}/measure/albedo-calibration.json", "w"), indent=2)
for k, r in report.items():
    print(k, r["pixels"], "lit", r["litMedian"], "target", r["target"], "delta", r["deltaRGB"], "->", r["newAlbedo"])

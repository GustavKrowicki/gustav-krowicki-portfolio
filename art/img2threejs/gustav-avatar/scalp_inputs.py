"""Turn the browser's hair/skull export into scalp_exposure.py inputs.

The skull is the head ellipsoid (centre c, semi-axes a, b, d): each ring is [y, rx, rz, zc] with
rx = a * sqrt(1 - ((y - cy) / b)^2), rz likewise, zc = cz. Hair points pass through unchanged (model frame).
Usage: python3 -I scalp_inputs.py <hair-geometry.json> <out-dir>
"""
import json
import math
import sys

src, out = sys.argv[1:3]
g = json.load(open(src))
cx, cy, cz = g["skull"]["centre"]
a, b, d = g["skull"]["radii"]
rings = []
N = 24
for i in range(1, N):
    y = cy - b + 2 * b * i / N
    f = max(0.0, 1 - ((y - cy) / b) ** 2)
    rings.append([round(y, 6), round(a * math.sqrt(f), 6), round(d * math.sqrt(f), 6), round(cz, 6)])
json.dump(rings, open(f"{out}/skull-rings.json", "w"))
# The gate runs on points. A low-poly shell's vertices are ~0.06 apart, three times the gate's lateral sampling
# radius, so the hair SURFACE is sampled (barycentric grid per triangle) rather than handing it bare vertices.
pts = g["hairPoints"]
idx = g.get("hairIndex") or list(range(len(pts)))
samples = []
S = 6
for t in range(0, len(idx) - 2, 3):
    A, B, C = (pts[idx[t]], pts[idx[t + 1]], pts[idx[t + 2]])
    for i in range(S + 1):
        for j in range(S + 1 - i):
            u, v = i / S, j / S
            w = 1 - u - v
            samples.append([round(A[k] * w + B[k] * u + C[k] * v, 6) for k in range(3)])
json.dump(samples, open(f"{out}/hair-points.json", "w"))
print("standProud", g.get("standProud"), "surface samples", len(samples))
print(len(rings), "rings,", len(g["hairPoints"]), "hair points; skull centre", g["skull"]["centre"], "radii", g["skull"]["radii"])

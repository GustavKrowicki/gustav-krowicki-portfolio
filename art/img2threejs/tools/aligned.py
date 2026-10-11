"""Resample the filled height map into the building-aligned frame (u, v), rotated 32 deg, with a labelled grid."""
import sys
import numpy as np
from PIL import Image, ImageDraw
S = sys.argv[1]
Hf = np.load(f'{S}/krea_top_height_filled.npy'); N = Hf.shape[0]
X0, X1, Z0, Z1 = -0.49837, 0.49610, -0.50078, 0.50084
A = np.radians(32.0); c, s = np.cos(A), np.sin(A)
PPU = 900; U0, U1, V0, V1 = -0.72, 0.72, -0.62, 0.62
W, Hh = int((U1 - U0) * PPU), int((V1 - V0) * PPU)
uu, vv = np.meshgrid(np.linspace(U0, U1, W), np.linspace(V0, V1, Hh))
x = uu * c - vv * s; z = uu * s + vv * c          # inverse of u = x c + z s, v = -x s + z c
col = np.round((x - X0) / (X1 - X0) * (N - 1)).astype(int); row = np.round((z - Z0) / (Z1 - Z0) * (N - 1)).astype(int)
inside = (col >= 0) & (col < N) & (row >= 0) & (row < N)
Hu = np.full(uu.shape, -0.2); Hu[inside] = Hf[row[inside], col[inside]]
np.save(f'{S}/aligned_height.npy', Hu)
bands = [(-9, -0.105, (35, 35, 35)), (-0.105, -0.06, (60, 110, 60)), (-0.06, -0.03, (90, 160, 90)), (-0.03, -0.01, (70, 130, 200)),
         (-0.01, 0.025, (225, 225, 225)), (0.025, 0.06, (240, 170, 60)), (0.06, 0.1, (220, 80, 80)), (0.1, 9, (250, 240, 40))]
img = np.zeros(Hu.shape + (3,), np.uint8)
for lo, hi, cc in bands: img[(Hu >= lo) & (Hu < hi)] = cc
img[~inside] = (0, 0, 0)
im = Image.fromarray(img); d = ImageDraw.Draw(im)
for g in np.arange(-0.7, 0.71, 0.05):
    xg = int((g - U0) * PPU); col_ = (90, 90, 90) if abs(round(g * 10) - g * 10) > 1e-6 else (150, 150, 150)
    d.line([(xg, 0), (xg, Hh)], fill=col_)
    if abs(round(g * 10) - g * 10) < 1e-6: d.text((xg + 2, 2), f'{g:+.1f}', fill=(255, 255, 255))
for g in np.arange(-0.6, 0.61, 0.05):
    yg = int((g - V0) * PPU); col_ = (90, 90, 90) if abs(round(g * 10) - g * 10) > 1e-6 else (150, 150, 150)
    d.line([(0, yg), (W, yg)], fill=col_)
    if abs(round(g * 10) - g * 10) < 1e-6: d.text((2, yg + 2), f'{g:+.1f}', fill=(255, 255, 255))
im.save(f'{S}/aligned_bands.png'); print(im.size)

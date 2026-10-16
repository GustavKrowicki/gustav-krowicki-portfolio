"""Massing preview of the LEGO HQ campus at the avatar's scale (1 wu = 1 tile, avatar 0.9 wu).
Voxel scene + orthographic ray march with the city's exact projection (wuToScreen: 22/11 px per wu, 26.94 px up).
Usage: python3 massing.py <out_dir> [scale]
"""
import sys, math
import numpy as np
from PIL import Image

OUT = "."
SCALE = 2.0
V = 0.04                      # voxel size, wu
PX, PY, PZ = 14.0, 10.0, 5.4    # plot (8 x 8 tiles) and height
NX, NY, NZ = int(PX / V), int(PY / V), int((PZ + 0.2) / V)
Z0 = -0.2                     # grid z origin

G1, ST = 1.4, 1.2             # ground storey, upper storey
H2, H3 = G1 + ST, G1 + 2 * ST # 2 and 3 storeys
PAR = 0.15

HEX = {
  'grass': '#7cc242', 'paving': '#c9c6bd', 'facade': '#e6e3dc', 'roof': '#7cc242', 'parapet': '#3c3f41',
  'atrium': '#a9cbd8', 'yellow': '#f2c500', 'skylight': '#f2f2ee', 'dome': '#4f7fb8', 'round': '#2f3a40',
  'brick': '#8a4b3a', 'perf': '#eeeeea', 'f_work': '#8fa4dc', 'f_lobby': '#f4f4f2', 'f_studio': '#a8e6c4',
  'f_map': '#f3a98a', 'f_launch': '#f5e9a0', 'f_ai': '#b9bcc4', 'cap': '#3b2b26', 'iwall': '#ebe6de',
  'timber': '#c9925a', 'screen': '#222222', 'mf_red': '#d0312d', 'mf_blue': '#2b55a8', 'mf_yel': '#f6cf2a',
  'tree': '#5aa83a', 'trunk': '#7a5233', 'jacket': '#8c7d6b', 'jeans': '#3d4f6e', 'skin': '#e9b996', 'hair': '#4a3426',
  'terrace': '#f0eee8', 'board': '#fbfbf8', 'logo': '#e3000b', 'glass_in': '#cfe6ee', 'court': '#6fb34a',
  'terracotta': '#b8613e', 'check': '#e2e0da', 'path': '#d9d4c3', 'fascia': '#f1f1ec', 'courtwall': '#cfcac0',
}
NAMES = list(HEX)
MID = {n: i + 1 for i, n in enumerate(NAMES)}
RGB = np.zeros((len(NAMES) + 1, 3), np.float32)
for n, h in HEX.items():
    RGB[MID[n]] = [int(h[i:i + 2], 16) for i in (1, 3, 5)]

def vi(a, lo, n):  # wu -> voxel index range
    return max(0, int(round((a - lo) / V)))

def box(g, x0, y0, z0, x1, y1, z1, m):
    g[vi(x0, 0, NX):vi(x1, 0, NX), vi(y0, 0, NY):vi(y1, 0, NY), vi(z0, Z0, NZ):vi(z1, Z0, NZ)] = MID[m]

XC = (np.arange(NX) + 0.5) * V
YC = (np.arange(NY) + 0.5) * V
XX, YY = np.meshgrid(XC, YC, indexing='ij')

def disc_mask(cx, cy, r0, r1):
    d = np.hypot(XX - cx, YY - cy)
    return (d >= r0) & (d < r1)

def ring(g, cx, cy, r0, r1, z0, z1, m, keep=None):
    mk = disc_mask(cx, cy, r0, r1)
    if keep is not None:
        mk &= keep
    g[:, :, vi(z0, Z0, NZ):vi(z1, Z0, NZ)][mk] = MID[m]

# ---- layout (tiles; x = grid x, y = grid y; the camera-facing sides are +x and +y) ----
ROOMS = {  # name: (x0, y0, x1, y1, floor)
  'workshop': (3, 0, 8, 3, 'f_work'),
  'lobby':    (3, 3, 6, 7, 'f_lobby'),
  'studio':   (0, 3, 3, 7, 'f_studio'),
  'launch':   (6, 3, 8, 5, 'f_launch'),
  'ailab':    (6, 5, 8, 7, 'f_ai'),
}
MAP_C, MAP_R, COURT_R = (1.5, 1.5), 1.45, 0.5
DOORS = [  # (axis, at, centre, width): wall on x = at (axis 'x') or y = at (axis 'y')
  ('y', 7, 4.5, 1.0),   # main entrance, south side, under the yellow 2x4 plate
  ('y', 3, 4.5, 0.8),   # lobby - workshop
  ('x', 3, 5.0, 0.8),   # lobby - studio
  ('x', 6, 4.0, 0.8),   # lobby - launch room
  ('x', 6, 6.0, 0.8),   # lobby - AI lab
  ('x', 3, 1.5, 0.8),   # map room - workshop
  ('y', 3, 1.5, 0.8),   # map room - studio
]
T = 0.12  # wall thickness

def ground(g):
    box(g, 0, 0, -0.2, 8, 8, 0, 'grass')
    box(g, 0, 7, -0.2, 8, 8, 0.01, 'paving')
    box(g, 3.6, 6.9, -0.2, 5.4, 7.0, 0.01, 'paving')
    # minifigure statue and plaza trees
    box(g, 1.25, 7.35, 0, 1.75, 7.65, 0.45, 'mf_blue'); box(g, 1.2, 7.3, 0.45, 1.8, 7.7, 0.95, 'mf_red')
    box(g, 1.33, 7.38, 0.95, 1.67, 7.62, 1.25, 'mf_yel')
    for tx in (6.4, 7.4):
        box(g, tx - 0.05, 7.45, 0, tx + 0.05, 7.55, 0.35, 'trunk'); box(g, tx - 0.28, 7.22, 0.35, tx + 0.28, 7.78, 0.9, 'tree')
    for tx, ty in ((0.2, 0.2), (2.75, 0.25), (0.25, 2.75)):
        box(g, tx - 0.04, ty - 0.04, 0, tx + 0.04, ty + 0.04, 0.3, 'trunk'); box(g, tx - 0.2, ty - 0.2, 0.3, tx + 0.2, ty + 0.2, 0.7, 'tree')

def avatar(g, x, y):
    box(g, x - 0.1, y - 0.08, 0, x + 0.1, y + 0.08, 0.42, 'jeans')
    box(g, x - 0.15, y - 0.1, 0.42, x + 0.15, y + 0.1, 0.72, 'jacket')
    box(g, x - 0.09, y - 0.09, 0.72, x + 0.09, y + 0.09, 0.88, 'skin')
    box(g, x - 0.1, y - 0.1, 0.84, x + 0.1, y + 0.1, 0.92, 'hair')

def solid_block(g, x0, y0, x1, y1, h, mat='facade', roof='roof', base=0.0):
    box(g, x0, y0, base, x1, y1, h, mat)
    box(g, x0, y0, h - 0.08, x1, y1, h, roof)
    for (a, b, c, d) in ((x0, y0, x1, y0 + T), (x0, y1 - T, x1, y1), (x0, y0, x0 + T, y1), (x1 - T, y0, x1, y1)):
        box(g, a, b, h, c, d, h + PAR, 'parapet')

def render(g, path, scale=SCALE, crop=None):
    sx_lo, sx_hi = -(PY + 0.4) * 22, (PX + 0.4) * 22
    sy_lo, sy_hi = -6.0 * 26.94 - 6, (PX + PY + 0.4) * 11
    W, H = int((sx_hi - sx_lo) * scale), int((sy_hi - sy_lo) * scale)
    jj, ii = np.meshgrid(np.arange(W), np.arange(H))
    sx = sx_lo + (jj + 0.5) / scale
    sy = sy_lo + (ii + 0.5) / scale
    ztop = PZ + 0.2
    s = (sy + ztop * 26.94) / 11.0            # x + y on the plane z = ztop
    d = sx / 22.0                              # x - y
    x = (s + d) / 2; y = (s - d) / 2; z = np.full_like(x, ztop)
    # advance to the plot's far bound so the march stays short
    t_in = np.maximum(0, np.minimum(x - PX, y - PY))
    x -= t_in; y -= t_in; z -= t_in * 0.8166
    step = 0.018
    color = np.full((H, W), 0, np.int32); face = np.zeros((H, W), np.int8)
    hx = np.zeros((H, W), np.float32); hy = np.zeros((H, W), np.float32); hz = np.zeros((H, W), np.float32)
    alive = np.ones((H, W), bool)
    pix, piy, piz = None, None, None
    for k in range(int((ztop - Z0) / (0.8166 * step)) + 2):
        ix = np.floor(x / V).astype(np.int32); iy = np.floor(y / V).astype(np.int32); iz = np.floor((z - Z0) / V).astype(np.int32)
        inside = (ix >= 0) & (ix < NX) & (iy >= 0) & (iy < NY) & (iz >= 0) & (iz < NZ)
        m = np.zeros((H, W), np.uint8)
        sel = inside & alive
        m[sel] = g[ix[sel], iy[sel], iz[sel]]
        hit = sel & (m > 0)
        if hit.any():
            color[hit] = m[hit]
            hix, hiy, hiz = ix[hit], iy[hit], iz[hit]
            def empty(a, b, c):
                ok = (a < NX) & (b < NY) & (c < NZ)
                out = np.ones(a.shape, bool)
                out[ok] = g[a[ok], b[ok], c[ok]] == 0
                return out
            ex, ey, ez = empty(hix + 1, hiy, hiz), empty(hix, hiy + 1, hiz), empty(hix, hiy, hiz + 1)
            dx = np.where(ex, (hix + 1) * V - x[hit], 9); dy = np.where(ey, (hiy + 1) * V - y[hit], 9)
            dz = np.where(ez, ((hiz + 1) * V + Z0 - z[hit]) / 0.8166, 9)
            face[hit] = np.where((dz <= dx) & (dz <= dy), 3, np.where(dx <= dy, 1, 2))
            hx[hit] = x[hit]; hy[hit] = y[hit]; hz[hit] = z[hit]
            alive &= ~hit
        if not alive.any():
            break
        pix, piy, piz = ix, iy, iz
        x -= step; y -= step; z -= step * 0.8166
    rgb = RGB[color].copy()
    # facade patterns on the camera-facing faces
    side = (face == 1) | (face == 2)
    along = np.where(face == 1, hy, hx)
    fr = along - np.floor(along)
    stz = np.where(hz < G1, hz, (hz - G1) % ST)
    win = side & (fr > 0.25) & (fr < 0.75) & (stz > np.where(hz < G1, 0.45, 0.3)) & (stz < np.where(hz < G1, 1.1, 0.95))
    fac = color == MID['facade']
    f2 = (along * 2) % 1
    st2 = np.where(hz < G1, hz, (hz - G1) % ST)
    win2 = side & (f2 > 0.18) & (f2 < 0.82) & (st2 > np.where(hz < G1, 0.35, 0.22)) & (st2 < np.where(hz < G1, 1.15, 1.0))
    panel = side & (f2 > 0.18) & (f2 < 0.82) & (((along * 2).astype(int) % 5) == 2)
    rgb[fac & win2] = [43, 58, 66]
    rgb[fac & win2 & panel] = [196, 150, 82]
    rgb[fac & side & (np.abs(st2 - np.where(hz < G1, 1.3, 1.12)) < 0.05)] = [120, 118, 112]
    chk = (color == MID['check']) & (face == 3)
    rgb[chk & (((np.floor(hx * 2.5) + np.floor(hy * 2.5)) % 2) == 0)] = [150, 150, 146]
    yel = (color == MID['yellow']) & side & (hz > H2 + 0.6)
    rgb[yel & (np.abs(((along * 2) % 1) - 0.5) > 0.1)] = [52, 70, 78]
    rnd = color == MID['round']
    rgb[rnd & (np.abs(((hz - G1) % ST) - 0.05) < 0.06)] = [200, 200, 195]
    rgb[rnd & (hz < G1) & (np.abs(hz - 0.36) < 0.03)] = [200, 200, 195]
    per = (color == MID['perf']) & side
    dots = (np.hypot(((along * 5) % 1) - 0.5, ((hz * 5) % 1) - 0.5) < 0.28) & (hz > 0.5)
    rgb[per & dots] = [70, 72, 74]
    atr = (color == MID['atrium']) & side
    rgb[atr & (np.abs(((along + hz) * 1.0 % 1.0) - 0.5) < 0.04)] = [242, 197, 0]
    rgb[atr & (np.abs(((hz - G1) % ST)) < 0.05)] = [235, 235, 230]
    shade = np.where(face == 3, 1.0, np.where(face == 1, 0.82, 0.66))
    rgb *= shade[..., None]
    # outlines where the material or face changes, or depth jumps
    key = color * 4 + face
    depth = hx + hy + hz * 1.0
    edge = np.zeros((H, W), bool)
    for a in (0, 1):
        dk = np.diff(key, axis=a) != 0
        dd = np.abs(np.diff(depth, axis=a)) > 0.6
        e = dk | dd
        if a == 0:
            edge[1:, :] |= e
        else:
            edge[:, 1:] |= e
    edge &= color > 0
    rgb[edge] = rgb[edge] * 0.35 + np.array([40, 30, 28]) * 0.65
    alpha = (color > 0).astype(np.uint8) * 255
    img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha]), 'RGBA')
    bb = img.getbbox(); img = img.crop(bb)
    img.save(path)
    def to_px(x, y, z=0.0):
        return ((x - y) * 22 - sx_lo) * scale - bb[0], ((x + y) * 11 - z * 26.94 - sy_lo) * scale - bb[1]
    return img, to_px


def solid(g, x0, y0, x1, y1, z0, h, mat='facade', roof='roof', par='parapet', holes=()):
    box(g, x0, y0, z0, x1, y1, h, mat)
    box(g, x0, y0, h - 0.08, x1, y1, h, roof)
    for (a, b, c, d) in ((x0, y0, x1, y0 + 0.12), (x0, y1 - 0.12, x1, y1), (x0, y0, x0 + 0.12, y1), (x1 - 0.12, y0, x1, y1)):
        box(g, a, b, h, c, d, h + PAR, par)
    for (hx0, hy0, hx1, hy1) in holes:      # courtyard light wells cut through the upper storeys
        box(g, hx0, hy0, G1, hx1, hy1, h + PAR, None) if False else None
        g[vi(hx0, 0, NX):vi(hx1, 0, NX), vi(hy0, 0, NY):vi(hy1, 0, NY), vi(G1, Z0, NZ):vi(h + PAR, Z0, NZ)] = 0
        box(g, hx0, hy0, G1 - 0.02, hx1, hy1, G1, 'court')
        for (a, b, c, d) in ((hx0 - 0.1, hy0 - 0.1, hx1 + 0.1, hy0), (hx0 - 0.1, hy1, hx1 + 0.1, hy1 + 0.1),
                             (hx0 - 0.1, hy0, hx0, hy1), (hx1, hy0, hx1 + 0.1, hy1)):
            box(g, a, b, h, c, d, h + PAR, par)


def v3(wing=H2, tall=H3):
    g = np.zeros((NX, NY, NZ), np.uint8)
    box(g, 0, 0, -0.2, PX, PY, 0, 'grass')
    box(g, 4.4, 7.0, -0.2, 8.8, 10, 0.01, 'check')
    box(g, 0, 9.0, -0.2, 4.4, 9.5, 0.01, 'path'); box(g, 8.8, 9.0, -0.2, 14, 9.5, 0.01, 'path')
    mx, my = 5.4, 8.6
    box(g, mx - .2, my - .12, 0, mx + .2, my + .12, 0.42, 'mf_blue'); box(g, mx - .26, my - .14, 0.42, mx + .26, my + .14, 0.86, 'mf_red')
    box(g, mx - .14, my - .11, 0.86, mx + .14, my + .11, 1.12, 'mf_yel')
    for (tx, ty) in ((7.6, 8.0), (7.9, 9.2), (4.9, 7.6), (6.4, 9.4)):
        ring(g, tx, ty, 0, 0.32, 0, 0.12, 'courtwall'); ring(g, tx, ty, 0, 0.26, 0.12, 0.14, 'court')
        box(g, tx - .04, ty - .04, 0.12, tx + .04, ty + .04, 0.4, 'trunk'); box(g, tx - .22, ty - .22, 0.4, tx + .22, ty + .22, 0.8, 'tree')
    for (tx, ty) in ((0.5, 9.4), (13.4, 9.6), (0.4, 0.5), (12.0, 9.5), (2.8, 9.6)):
        box(g, tx - .04, ty - .04, 0, tx + .04, ty + .04, 0.3, 'trunk'); box(g, tx - .2, ty - .2, 0.3, tx + .2, ty + .2, 0.7, 'tree')
    C = (2.0, 3.0); R = 2.0
    ring(g, *C, 0.75, R + 0.15, 0, 0.45, 'brick')
    ring(g, *C, 0.75, R, 0.45, wing, 'round')
    ring(g, *C, 0.75, R, wing - 0.08, wing, 'roof')
    ring(g, *C, R - 0.12, R, wing, wing + PAR, 'parapet'); ring(g, *C, 0.75, 0.87, wing, wing + PAR, 'parapet')
    ring(g, *C, 0, 0.75, 0, 0.02, 'court')
    solid(g, 4.0, 0.0, 12.6, 3.0, 0, wing, holes=((4.8, 0.6, 6.2, 2.2), (9.8, 0.6, 11.2, 2.2)))
    solid(g, 6.8, 0.2, 9.2, 1.9, wing - 0.1, tall, 'yellow')
    ring(g, 8.0, 1.05, 0, 0.12, tall, tall + 0.05, 'dome')
    solid(g, 8.8, 3.0, 12.6, 8.0, 0, wing, holes=((10.0, 3.7, 11.4, 5.1),))
    solid(g, 12.4, 2.4, 14.0, 7.4, 0, wing, holes=((12.9, 3.2, 13.6, 4.4),))
    box(g, 8.8, 7.2, 0, 12.6, 8.0, G1, 'brick')
    solid(g, 9.0, 6.0, 11.6, 8.6, wing - 0.1, tall, 'yellow', roof='terracotta', par='yellow')
    box(g, 0.7, 5.6, 0, 4.2, 8.4, G1, 'round')
    solid(g, 0.5, 5.4, 4.4, 8.6, G1, wing, 'perf', roof='terrace', par='fascia', holes=((1.9, 6.4, 3.1, 7.6),))
    box(g, 0.8, 5.7, wing, 1.6, 6.3, wing + 0.45, 'glass_in')
    for (bx0, by0) in ((0.8, 7.9), (1.5, 8.1), (2.4, 7.9), (3.2, 8.1), (3.4, 6.2), (0.9, 6.9), (3.5, 7.2)):
        box(g, bx0, by0, wing, bx0 + 0.5, by0 + 0.12, wing + 0.07, 'yellow')
    box(g, 5.1, 3.3, 0, 8.5, 6.6, G1, 'atrium')
    solid(g, 4.6, 3.0, 8.8, 7.0, G1, tall, 'atrium', par='fascia')
    ring(g, 6.7, 5.0, 0, 1.25, tall - 0.08, tall + 0.03, 'skylight')
    for k in range(19):
        a = k * 2 * math.pi / 12 if k < 12 else (k - 12) * 2 * math.pi / 6
        r = 0.92 if k < 12 else (0.48 if k < 18 else 0.0)
        ring(g, 6.7 + r * math.cos(a), 5.0 + r * math.sin(a), 0, 0.12, tall, tall + 0.06, 'dome')
    box(g, 6.2, 6.55, 0, 7.2, 6.65, 1.0, 'glass_in')
    box(g, 6.2, 7.1, 0, 7.2, 7.6, 0.35, 'yellow')
    for i in range(4):
        for j in range(2):
            ring(g, 6.32 + 0.25 * i, 7.22 + 0.25 * j, 0, 0.08, 0.35, 0.42, 'yellow')
    return g

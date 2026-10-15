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
PX, PY, PZ = 8.0, 8.0, 4.4    # plot (8 x 8 tiles) and height
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

def roof_on():
    g = np.zeros((NX, NY, NZ), np.uint8)
    ground(g)
    # round building (Systems map room): dark glass bands, brick plinth, round courtyard
    ring(g, *MAP_C, 0, MAP_R + 0.08, 0, 0.35, 'brick')
    ring(g, *MAP_C, COURT_R, MAP_R, 0, H2, 'round')
    ring(g, *MAP_C, COURT_R, MAP_R, H2 - 0.08, H2, 'roof')
    ring(g, *MAP_C, MAP_R - T, MAP_R, H2, H2 + PAR, 'parapet'); ring(g, *MAP_C, COURT_R, COURT_R + T, H2, H2 + PAR, 'parapet')
    ring(g, *MAP_C, 0, COURT_R, 0, 0.02, 'court')
    # wings, 2 storeys
    solid_block(g, 3, 0, 8, 3, H2)                       # north wing (Workshop)
    solid_block(g, 0, 3, 3, 7, H2, 'perf')               # terrace building (studio), perforated facade
    box(g, 0.15, 3.15, H2 - 0.08, 2.85, 6.85, H2, 'terrace')
    box(g, 1.0, 4.4, H2 - 0.3, 2.0, 5.4, H2, 'court')   # roof courtyard (light well)
    box(g, 0.3, 3.3, H2, 1.1, 4.1, H2 + 0.45, 'glass_in')  # greenhouse
    for k in range(4):
        box(g, 0.4 + 0.5 * k, 6.2, H2, 0.7 + 0.5 * k, 6.35, H2 + 0.08, 'yellow')   # yellow benches on the terrace
    solid_block(g, 6, 3, 8, 7, H2)                       # east wing (launch room, AI lab)
    box(g, 6, 3, 0, 8, 7, 0.35, 'brick')                 # brick plinth under the yellow block side
    # yellow bar on the north wing and yellow cantilever block over the AI lab
    solid_block(g, 4.2, 0.3, 6.9, 1.6, H3, 'yellow', base=H2)
    solid_block(g, 6.0, 4.9, 8.0, 7.4, H3, 'yellow', base=H2 - 0.1)
    # atrium (lobby): glass from the ground storey up, skylight disc with domes
    solid_block(g, 3, 3, 6, 7, H3, 'atrium')
    ring(g, 4.5, 5.0, 0, 1.1, H3 - 0.08, H3 + 0.02, 'skylight')
    for k in range(19):
        a = k * 2 * math.pi / 12 if k < 12 else (k - 12) * 2 * math.pi / 6
        r = 0.8 if k < 12 else (0.42 if k < 18 else 0.0)
        cx, cy = 4.5 + r * math.cos(a), 5.0 + r * math.sin(a)
        ring(g, cx, cy, 0, 0.11, H3, H3 + 0.06, 'dome')
    box(g, 4.0, 6.88, 2.0, 5.0, 7.0, 2.6, 'logo')        # logo (placeholder for the real one)
    # entrance: door gap with the yellow 2x4 plate canopy
    box(g, 4.0, 6.9, 0, 5.0, 7.0, 1.0, 'glass_in')
    plate(g)
    return g

def plate(g):
    box(g, 3.5, 6.6, 1.25, 5.5, 7.6, 1.45, 'yellow')
    for i in range(4):
        for j in range(2):
            ring_c = (3.75 + 0.5 * i, 6.85 + 0.5 * j)
            ring(g, *ring_c, 0, 0.15, 1.45, 1.55, 'yellow')

def wall(g, x0, y0, x1, y1, h, m='iwall'):
    box(g, x0, y0, 0, x1, y1, h, m)
    box(g, x0, y0, h - 0.05, x1, y1, h, 'cap')

def walls_for(axis, at, a0, a1, h_of):
    """Wall pieces along a line, split by door gaps. h_of(axis, at) gives the height."""
    gaps = sorted((c - w / 2, c + w / 2) for (ax, p, c, w) in DOORS if ax == axis and abs(p - at) < 1e-6 and a0 < c < a1)
    pieces, s = [], a0
    for (g0, g1) in gaps:
        pieces.append((s, g0)); s = g1
    pieces.append((s, a1))
    return [(p0, p1) for p0, p1 in pieces if p1 - p0 > 1e-3]

CUT = 0.35
def roof_off():
    g = np.zeros((NX, NY, NZ), np.uint8)
    ground(g)
    # far exterior walls (x = 0 side and y = 0 side) stay at full ground-storey height; all others are cut
    def h_of(axis, at, outside_far):
        return G1 if outside_far else CUT
    for name, (x0, y0, x1, y1, fl) in ROOMS.items():
        box(g, x0, y0, 0, x1, y1, 0.02, fl)
        for axis, at, a0, a1 in (('y', y0, x0, x1), ('y', y1, x0, x1), ('x', x0, y0, y1), ('x', x1, y0, y1)):
            far = (at == 0)
            h = G1 if far else CUT
            for p0, p1 in walls_for(axis, at, a0, a1, h_of):
                if axis == 'y':
                    wall(g, p0, at - T / 2, p1, at + T / 2, h)
                else:
                    wall(g, at - T / 2, p0, at + T / 2, p1, h)
    # round map room: floor, outer ring (back half full height), glass courtyard ring cut
    ring(g, *MAP_C, COURT_R, MAP_R, 0, 0.02, 'f_map')
    ring(g, *MAP_C, 0, COURT_R, 0, 0.02, 'court')
    back = (XX - MAP_C[0]) + (YY - MAP_C[1]) < -0.3
    doorx = ~((np.abs(YY - 1.5) < 0.4) & (XX > 2.5)) & ~((np.abs(XX - 1.5) < 0.4) & (YY > 2.5))
    ring(g, *MAP_C, MAP_R - T, MAP_R, 0, G1, 'iwall', back & doorx); ring(g, *MAP_C, MAP_R - T, MAP_R, G1 - 0.05, G1, 'cap', back & doorx)
    ring(g, *MAP_C, MAP_R - T, MAP_R, 0, CUT, 'iwall', ~back & doorx); ring(g, *MAP_C, MAP_R - T, MAP_R, CUT - 0.05, CUT, 'cap', ~back & doorx)
    ring(g, *MAP_C, COURT_R, COURT_R + 0.06, 0, CUT, 'glass_in')
    # one or two large objects per room
    box(g, 4.4, 1.0, 0, 6.6, 1.9, 0.38, 'timber')             # workshop table
    box(g, 3.4, 0.08, 0.3, 5.6, 0.14, 1.15, 'board')          # workshop whiteboard (back wall)
    box(g, 6.2, 0.08, 0.3, 7.7, 0.14, 1.0, 'mf_yel')          # workshop sticky wall
    box(g, 0.08, 3.4, 0, 0.4, 4.9, 1.0, 'timber')             # studio shelf (back wall)
    box(g, 1.2, 5.2, 0, 2.4, 6.0, 0.38, 'timber')             # studio table
    box(g, 0.3, 0.9, 0.35, 0.36, 2.1, 1.1, 'f_launch')        # map on the curved back wall (approx.)
    box(g, 6.2, 3.1, 0.3, 7.8, 3.16, 1.0, 'screen')           # launch screen (back wall)
    for k in range(3):
        box(g, 6.3 + 0.5 * k, 4.2, 0, 6.6 + 0.5 * k, 4.5, 0.3, 'mf_red')   # launch room chairs
    box(g, 6.2, 5.3, 0, 7.0, 5.9, 0.38, 'f_ai'); box(g, 6.2, 5.3, 0.38, 7.0, 5.9, 0.4, 'screen')  # AI lab desks
    box(g, 7.1, 6.0, 0, 7.8, 6.6, 0.38, 'f_ai')
    box(g, 3.6, 3.4, 0, 4.4, 3.8, 0.5, 'yellow')              # lobby reception desk
    plate(g)
    return g

def render(g, path, scale=SCALE, crop=None):
    sx_lo, sx_hi = -8.4 * 22, 8.4 * 22
    sy_lo, sy_hi = -5.0 * 26.94 - 6, 16.4 * 11
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
    rgb[fac & win] = [43, 58, 66]
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


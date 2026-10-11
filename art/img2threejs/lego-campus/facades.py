"""Facade geometry helpers for the campus spec: per-edge facade panels built as extrude profiles in the facade
plane (s along the edge, y up), rasterised unions traced back to polygons, and edge/normal bookkeeping.
Facade systems read off the AI Studio image (facade/ai-*.png): box windows with accent panels, brick base,
curtain wall with diagonal bracing, vertical fins, perforated panels."""
import math
from collections import defaultdict

import numpy as np

RES = 0.0005  # raster cell for unions (Krea units); ~0.1 px at the 384 px sprite


def rect_poly(s0, y0, s1, y1):
    return [[s0, y0], [s1, y0], [s1, y1], [s0, y1]]


def raster_union(width, height, rects=(), bars=()):
    """Union of axis rects (s0, y0, s1, y1) and thick segments ((sa, ya), (sb, yb), w) on a RES grid.
    Returns a bool grid (rows = y)."""
    W = max(1, int(math.ceil(width / RES))); H = max(1, int(math.ceil(height / RES)))
    g = np.zeros((H, W), bool)
    for s0, y0, s1, y1 in rects:
        a, b = max(0, int(round(s0 / RES))), min(W, int(round(s1 / RES)))
        c, d = max(0, int(round(y0 / RES))), min(H, int(round(y1 / RES)))
        if b > a and d > c:
            g[c:d, a:b] = True
    if bars:
        ys, xs = np.mgrid[0:H, 0:W]
        px, py = (xs + 0.5) * RES, (ys + 0.5) * RES
        for (sa, ya), (sb, yb), w in bars:
            dx, dy = sb - sa, yb - ya; L2 = dx * dx + dy * dy or 1e-12
            t = np.clip(((px - sa) * dx + (py - ya) * dy) / L2, 0, 1)
            g |= np.hypot(px - (sa + t * dx), py - (ya + t * dy)) <= w / 2
    return g


def trace(grid):
    """Boundary loops of a bool grid in grid-corner coords; returns [(points, signed_area)]."""
    H, W = grid.shape
    E = defaultdict(list)
    pad = np.pad(grid, 1)
    c = pad[1:-1, 1:-1]
    up = c & ~pad[:-2, 1:-1]; right = c & ~pad[1:-1, 2:]; down = c & ~pad[2:, 1:-1]; left = c & ~pad[1:-1, :-2]
    for y, x in zip(*np.nonzero(up)): E[(x, y)].append((x + 1, y))
    for y, x in zip(*np.nonzero(right)): E[(x + 1, y)].append((x + 1, y + 1))
    for y, x in zip(*np.nonzero(down)): E[(x + 1, y + 1)].append((x, y + 1))
    for y, x in zip(*np.nonzero(left)): E[(x, y + 1)].append((x, y))
    loops = []
    while E:
        start = next(iter(E)); loop = [start]; cur = start
        while True:
            nxt = E[cur].pop()
            if not E[cur]: del E[cur]
            if nxt == start: break
            loop.append(nxt); cur = nxt
        loops.append(loop)
    out = []
    for lp in loops:
        simp = [p for i, p in enumerate(lp)
                if not ((lp[i - 1][0] == p[0] == lp[(i + 1) % len(lp)][0]) or (lp[i - 1][1] == p[1] == lp[(i + 1) % len(lp)][1]))]
        a = sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(simp, simp[1:] + simp[:1])) / 2
        out.append((simp, a))
    return out


def dp_closed(pts, tol):
    """Douglas-Peucker on a closed loop (straightens rasterised diagonals, keeps real corners)."""
    if len(pts) < 5:
        return pts
    def rec(seg):
        a, b = np.array(seg[0], float), np.array(seg[-1], float); ab = b - a; L = math.hypot(*ab) or 1e-12
        d = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / L for p in seg[1:-1]]
        if not d or max(d) <= tol:
            return [seg[0], seg[-1]]
        i = int(np.argmax(d)) + 1
        return rec(seg[:i + 1])[:-1] + rec(seg[i:])
    j = max(range(len(pts)), key=lambda k: math.hypot(pts[k][0] - pts[0][0], pts[k][1] - pts[0][1]))
    return rec(pts[:j + 1])[:-1] + rec(pts[j:] + [pts[0]])[:-1]


def grid_to_profile(grid, simplify=0.0):
    """Largest loop -> outline, the rest -> holes (or separate islands, returned as extra profiles)."""
    loops = trace(grid)
    if not loops:
        return []
    conv = lambda lp: [[round(x * RES, 5), round(y * RES, 5)] for x, y in (dp_closed(lp, simplify / RES) if simplify else lp)]
    outers = [(lp, a) for lp, a in loops if a > 0]
    holes = [(lp, a) for lp, a in loops if a < 0]
    profiles = []
    for lp, a in sorted(outers, key=lambda t: -t[1]):
        poly = conv(lp)
        mine = []
        for hl, ha in holes:
            hx, hy = hl[0]
            if point_in(hx + 0.01, hy + 0.01, lp):
                mine.append(conv(hl))
        profiles.append({"points": poly, "holes": mine})
    return profiles


def point_in(x, y, poly):
    c = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1:
            c = not c
    return c


def facade_edges(outline_xz, holes_xz, min_len):
    """Edges of a footprint in world x/z with outward normals (away from the mass); holes give courtyard faces.
    Returns [(p0, p1, length)] oriented so that rotating local +x onto p0->p1 puts local +z on the outward normal."""
    def solid(x, z):
        return point_in(x, z, outline_xz) and not any(point_in(x, z, h) for h in holes_xz)
    out = []
    for loop in [outline_xz] + list(holes_xz):
        for a, b in zip(loop, loop[1:] + loop[:1]):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            if L < min_len:
                continue
            dx, dz = (b[0] - a[0]) / L, (b[1] - a[1]) / L
            nx, nz = -dz, dx                              # local +z for a Y-rotation mapping +x -> (dx, dz)
            mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            if solid(mx + nx * 0.002, mz + nz * 0.002):  # that side is inside the mass: flip the edge
                a, b = b, a
            out.append((a, b, L))
    return out


def yaw_for(p0, p1):
    """Y rotation that maps local +x onto p0->p1 (three.js: x -> (cos t, 0, -sin t))."""
    dx, dz = p1[0] - p0[0], p1[1] - p0[1]
    return math.atan2(-dz, dx)


def gear_ring(cx, cz, r_core, r_fin, n, fin_w):
    """Outline of a ring with n radial fins (as one polygon); inner hole = core radius minus a hair."""
    pts = []
    half = fin_w / 2
    for k in range(n):
        a = 2 * math.pi * k / n
        da_fin = half / r_fin
        da_core = half / r_core
        for ang, r in ((a - da_core, r_core), (a - da_fin, r_fin), (a + da_fin, r_fin), (a + da_core, r_core)):
            pts.append([cx + r * math.cos(ang), cz + r * math.sin(ang)])
    return pts

"""Ground regions (sand, road, plaza) and trees from the Krea top-down maps, in GLB world (x, z)."""
import json, sys
from collections import deque, defaultdict
import numpy as np
from PIL import Image, ImageDraw
S = sys.argv[1]
N = 512; X0, X1, Z0, Z1 = -0.49837, 0.49610, -0.50078, 0.50084
C = np.asarray(Image.open(f'{S}/krea_top_color_filled.png').resize((N, N), Image.NEAREST)).astype(float)
Hf = np.load(f'{S}/krea_top_height_filled.npy')
cent = np.load(f'{S}/ground_centroids.npy')
lab = ((C[:, :, None, :] - cent[None, None]) ** 2).sum(3).argmin(2)
CLASS = {1: 'road', 4: 'sand', 2: 'plaza'}            # 0/5 grass = slab colour, 3 = empty
ground = Hf < -0.100

def wx(col): return X0 + col / (N - 1) * (X1 - X0)
def wz(row): return Z0 + row / (N - 1) * (Z1 - Z0)

def comps(mask):
    seen = np.zeros(mask.shape, bool); res = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]: continue
        q = deque([(y0, x0)]); seen[y0, x0] = True; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < mask.shape[0] and 0 <= xx < mask.shape[1] and mask[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True; q.append((yy, xx))
        res.append(np.array(pts))
    return res

def morph(mask, op, r=1):
    out = mask.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            sh = np.roll(np.roll(mask, dy, 0), dx, 1); out = (out & sh) if op == 'erode' else (out | sh)
    return out

def loops(mask):
    E = defaultdict(list); H_, W_ = mask.shape
    for y in range(H_):
        for x in range(W_):
            if not mask[y, x]: continue
            if y == 0 or not mask[y - 1, x]: E[(x, y)].append((x + 1, y))
            if x == W_ - 1 or not mask[y, x + 1]: E[(x + 1, y)].append((x + 1, y + 1))
            if y == H_ - 1 or not mask[y + 1, x]: E[(x + 1, y + 1)].append((x, y + 1))
            if x == 0 or not mask[y, x - 1]: E[(x, y + 1)].append((x, y))
    out = []
    while E:
        start = next(iter(E)); loop = [start]; cur = start
        while True:
            nxt = E[cur].pop()
            if not E[cur]: del E[cur]
            if nxt == start: break
            loop.append(nxt); cur = nxt
        area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(loop, loop[1:] + loop[:1])) / 2
        out.append((loop, area))
    return out

def dp(points, tol):
    if len(points) < 4: return points
    def rec(pts):
        a, b = np.array(pts[0], float), np.array(pts[-1], float); ab = b - a; L = np.hypot(*ab) or 1e-9
        d = [abs(np.cross(ab, np.array(p, float) - a)) / L for p in pts[1:-1]]
        if not d or max(d) <= tol: return [pts[0], pts[-1]]
        i = int(np.argmax(d)) + 1
        return rec(pts[:i + 1])[:-1] + rec(pts[i:])
    # split closed loop at farthest pair
    i = 0; j = max(range(len(points)), key=lambda k: np.hypot(points[k][0] - points[0][0], points[k][1] - points[0][1]))
    return rec(points[i:j + 1])[:-1] + rec(points[j:] + [points[0]])[:-1]

G = 5  # px per grid cell (~0.01 unit)
gh = N // G
regions = []
for k, name in CLASS.items():
    m = (lab == k) & ground
    cell = m[:gh * G, :gh * G].reshape(gh, G, gh, G).mean((1, 3)) > 0.5
    cell = morph(morph(cell, 'dilate'), 'erode'); cell = morph(morph(cell, 'erode'), 'dilate')
    for pts in sorted(comps(cell), key=len, reverse=True):
        if len(pts) < 12: continue
        cm = np.zeros(cell.shape, bool); cm[pts[:, 0], pts[:, 1]] = True
        ls = loops(cm); outer = max(ls, key=lambda t: abs(t[1]))
        conv = lambda p: [round(wx(p[0] * G), 4), round(wz(p[1] * G), 4)]
        poly = [conv(p) for p in dp(outer[0], 1.2)]
        holes = [[conv(p) for p in dp(l[0], 1.2)] for l in ls if l is not outer and abs(l[1]) >= 6]
        regions.append({'class': name, 'cells': int(len(pts)), 'outline': poly, 'holes': holes})
# trees: small raised blobs at ground level
treemask = (Hf > -0.100) & (Hf < -0.035)
trees = []
for pts in comps(treemask):
    if len(pts) < 12 or len(pts) > 900: continue
    r0, c0 = pts.mean(0); h = Hf[pts[:, 0], pts[:, 1]]
    span = max(np.ptp(pts[:, 0]), np.ptp(pts[:, 1])) + 1
    fill = len(pts) / (span * span)
    trees.append({'x': round(wx(c0), 4), 'z': round(wz(r0), 4), 'size': round(span / (N - 1), 4), 'top': round(float(np.percentile(h, 90)), 4),
                  'round': bool(fill > 0.68)})
json.dump({'regions': regions, 'trees': trees}, open(f'{S}/ground.json', 'w'), indent=1)
im = Image.open(f'{S}/krea_top_color_filled.png').resize((N, N)); d = ImageDraw.Draw(im)
P = lambda p: ((p[0] - X0) / (X1 - X0) * (N - 1), (p[1] - Z0) / (Z1 - Z0) * (N - 1))
pal = {'road': (255, 0, 255), 'sand': (255, 128, 0), 'plaza': (0, 255, 255)}
for r in regions: d.polygon([P(p) for p in r['outline']], outline=pal[r['class']])
for t in trees:
    x, y = P((t['x'], t['z'])); rr = t['size'] / 2 * (N - 1); d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=(255, 255, 255))
im.resize((768, 768)).save(f'{S}/ground_preview.png')
print('regions', [(r['class'], r['cells'], len(r['outline'])) for r in regions]); print('trees', len(trees))

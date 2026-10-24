"""Vectorise height bands of the building-aligned plan into rectilinear polygons (with holes) on a
0.01-unit grid. Output: plan.json with per-region outline/holes in (u, v) and median height."""
import json, sys
from collections import deque, defaultdict
import numpy as np
from PIL import Image, ImageDraw

S = sys.argv[1]
Hu = np.load(f'{S}/aligned_height.npy')
PPU = 900; U0, V0 = -0.72, -0.62
G = 0.01; step = int(PPU * G)          # 9 px per grid cell
gh, gw = Hu.shape[0] // step, Hu.shape[1] // step
cells = Hu[:gh * step, :gw * step].reshape(gh, step, gw, step).transpose(0, 2, 1, 3).reshape(gh, gw, -1)
Hc = np.median(cells, axis=2)
BANDS = [('b-low', -0.035, -0.01), ('b-main', -0.01, 0.025), ('b-mid', 0.025, 0.06), ('b-high', 0.06, 0.1), ('b-top', 0.1, 1)]

def morph(mask, op, r=1):
    out = mask.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            sh = np.roll(np.roll(mask, dy, 0), dx, 1)
            out = (out & sh) if op == 'erode' else (out | sh)
    return out

def comps(mask):
    lab = np.zeros(mask.shape, int); res = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]: continue
        q = deque([(y0, x0)]); lab[y0, x0] = len(res) + 1; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < mask.shape[0] and 0 <= xx < mask.shape[1] and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = len(res) + 1; q.append((yy, xx))
        res.append(np.array(pts))
    return res

def loops(mask):
    """Boundary loops of a binary grid as vertex lists (grid corner coords), collinear points removed."""
    edges = {}
    H_, W_ = mask.shape
    for y in range(H_):
        for x in range(W_):
            if not mask[y, x]: continue
            if y == 0 or not mask[y - 1, x]: edges[(x, y)] = (x + 1, y)
            if x == W_ - 1 or not mask[y, x + 1]: edges[(x + 1, y)] = (x + 1, y + 1) if (x + 1, y) not in edges else edges[(x + 1, y)]
    # robust edge collection with multimap
    E = defaultdict(list)
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
        simp = [p for i, p in enumerate(loop)
                if not ((loop[i - 1][0] == p[0] == loop[(i + 1) % len(loop)][0]) or (loop[i - 1][1] == p[1] == loop[(i + 1) % len(loop)][1]))]
        area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(simp, simp[1:] + simp[:1])) / 2
        out.append((simp, area))
    return out

regions = []
for name, lo, hi in BANDS:
    m = (Hc >= lo) & (Hc < hi)
    m = morph(morph(m, 'dilate'), 'erode')       # close 1-cell gaps
    m = morph(morph(m, 'erode'), 'dilate')       # open 1-cell spurs
    for k, pts in enumerate(sorted(comps(m), key=len, reverse=True)):
        if len(pts) < 6: continue
        cm = np.zeros(m.shape, bool); cm[pts[:, 0], pts[:, 1]] = True
        ls = loops(cm)
        outer = max(ls, key=lambda t: abs(t[1]))
        holes = [l for l in ls if l is not outer and abs(l[1]) >= 4]
        conv = lambda p: [round(U0 + p[0] * G, 3), round(V0 + p[1] * G, 3)]
        hs = Hc[pts[:, 0], pts[:, 1]]
        regions.append({'id': f'{name}-{k}', 'band': name, 'cells': int(len(pts)), 'height': round(float(np.median(hs)), 4),
                        'outline': [conv(p) for p in outer[0]], 'holes': [[conv(p) for p in h[0]] for h in holes]})
json.dump(regions, open(f'{S}/plan.json', 'w'), indent=1)
# preview
im = Image.fromarray(((np.clip(Hu, -0.12, 0.12) + 0.12) / 0.24 * 200).astype(np.uint8)).convert('RGB'); d = ImageDraw.Draw(im)
pal = {'b-low': (70, 130, 255), 'b-main': (255, 255, 255), 'b-mid': (255, 160, 40), 'b-high': (255, 60, 60), 'b-top': (255, 255, 0)}
P = lambda p: ((p[0] - U0) * PPU, (p[1] - V0) * PPU)
for r in regions:
    d.polygon([P(p) for p in r['outline']], outline=pal[r['band']])
    for h in r['holes']: d.polygon([P(p) for p in h], outline=(0, 255, 0))
    x, y = P(r['outline'][0]); d.text((x + 3, y + 3), r['id'], fill=pal[r['band']])
im.save(f'{S}/plan_preview.png')
for r in regions: print(r['id'], r['cells'], 'h', r['height'], 'pts', len(r['outline']), 'holes', len(r['holes']))

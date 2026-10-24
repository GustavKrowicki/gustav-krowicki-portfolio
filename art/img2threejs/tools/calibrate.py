"""Per-material colour calibration against the live sprite. The stripped render (MeshBasicMaterial = albedo)
labels each pixel with its material; at those pixels the lit render gives our rendered colour and the live
sprite gives the target. Same converter lighting on both, so albedo_new = albedo * live / ours (linear)."""
import json, sys
import numpy as np
from PIL import Image
W, R, P = sys.argv[1], sys.argv[2], sys.argv[3]
spec = json.load(open(f'{W}/object-sculpt-spec.json'))
mats = {m['id']: m['baseColor'] for m in spec['materials']}
hexrgb = lambda h: np.array([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)])
lin = lambda c: np.where(c / 255 <= 0.04045, c / 255 / 12.92, ((c / 255 + 0.055) / 1.055) ** 2.4)
srgb = lambda l: np.clip(np.where(l <= 0.0031308, l * 12.92, 1.055 * np.power(np.clip(l, 0, None), 1 / 2.4) - 0.055) * 255, 0, 255)
acc = {k: [[], []] for k in mats}
for d in ('south', 'west', 'north', 'east'):
    st = np.asarray(Image.open(f'{W}/renders/{P}-sprite-{d}-stripped.png').convert('RGBA')).astype(int)
    lit = np.asarray(Image.open(f'{W}/renders/{P}-sprite-{d}.png').convert('RGBA')).astype(float)
    live = np.asarray(Image.open(f'{R}/lego-hq_{d}.png').convert('RGBA')).astype(float)
    ok = (st[..., 3] > 250) & (lit[..., 3] > 250) & (live[..., 3] > 250)
    for k, h in mats.items():
        m = ok & (np.abs(st[..., :3] - hexrgb(h)).max(-1) <= 2)
        if m.sum():
            acc[k][0].append(lit[..., :3][m]); acc[k][1].append(live[..., :3][m])
out = {}
for k, (ours, live) in acc.items():
    if not ours: continue
    ours, live = np.concatenate(ours), np.concatenate(live)
    if len(ours) < 150: continue
    gain = lin(live).mean(0) / np.maximum(lin(ours).mean(0), 1e-4)
    new = srgb(lin(hexrgb(mats[k]).astype(float)) * np.clip(gain, 0.25, 4))
    out[k] = {'n': int(len(ours)), 'old': mats[k], 'new': '#%02x%02x%02x' % tuple(new.round().astype(int)),
              'ours_rendered': '#%02x%02x%02x' % tuple(ours.mean(0).round().astype(int)), 'live_rendered': '#%02x%02x%02x' % tuple(live.mean(0).round().astype(int))}
    print(f"{k:16s} n={out[k]['n']:6d} {out[k]['old']} -> {out[k]['new']}   rendered ours {out[k]['ours_rendered']} live {out[k]['live_rendered']}")
json.dump(out, open(f'{W}/measure/calibration.json', 'w'), indent=1)

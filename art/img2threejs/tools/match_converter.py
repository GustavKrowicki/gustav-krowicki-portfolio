"""Recover the sprite converter's zoom / vertical offset for an existing sprite set by projecting the GLB
with the converter's exact maths (app/tools/sprite-converter/page.tsx), including its normalisation:
position = -center (unscaled) then scale = 3 / maxDim applied to the model."""
import json, struct, sys
import numpy as np
from PIL import Image

glb, sprite_dir, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
data = open(glb, 'rb').read()
clen = struct.unpack('<I', data[12:16])[0]
gltf = json.loads(data[20:20 + clen])
bin_off = 20 + clen + 8
acc = gltf['accessors'][gltf['meshes'][0]['primitives'][0]['attributes']['POSITION']]
bv = gltf['bufferViews'][acc['bufferView']]
start = bin_off + bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
stride = bv.get('byteStride', 12)
raw = np.frombuffer(data, dtype=np.uint8, count=acc['count'] * stride, offset=start).reshape(acc['count'], stride)
P = raw[:, :12].copy().view('<f4').reshape(-1, 3).astype(np.float64)
for n in gltf['nodes']:
    assert not any(k in n for k in ('matrix', 'translation', 'rotation', 'scale')), n  # identity transforms only
mn, mx = P.min(0), P.max(0)
center = (mn + mx) / 2
scale = 3 / (mx - mn).max()
# Object3D: world = position + scale * local  (position is NOT scaled in the converter)
W = np.array([-center[0], -mn[1], -center[2]]) + scale * P
print('bbox raw', mn.round(3), mx.round(3), 'scale', round(scale, 4))
iso = np.arctan(1 / np.sqrt(2))
results = {}
for name, yaw in (('south', 45), ('west', 135), ('north', 225), ('east', 315)):
    r = np.radians(yaw)
    cam = np.array([np.cos(iso) * np.sin(r), np.sin(iso), np.cos(iso) * np.cos(r)])
    fwd = -cam / np.linalg.norm(cam)
    right = np.cross(fwd, [0, 1, 0]); right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    x, y = W @ right, W @ up
    a = Image.open(f'{sprite_dir}/{prefix}_{name}.png').getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    x0, y0, x1, y1 = a; x1 += 1; y1 += 1
    # x_px = (x/F + 0.5) * N ; y_px = ((1 - v) - y/F) * N
    N = 384
    Fx = (x.max() - x.min()) * N / (x1 - x0)
    Fy = (y.max() - y.min()) * N / (y1 - y0)
    F = (Fx + Fy) / 2
    v_top = 1 - y0 / N - y.max() / F
    v_bot = 1 - y1 / N - y.min() / F
    xoff = (x.min() / F + 0.5) * N - x0
    results[name] = dict(zoom=5 / F, Fx=Fx, Fy=Fy, v=(v_top + v_bot) / 2, v_spread=abs(v_top - v_bot), x_err_px=xoff)
    print(name, {k: round(float(v), 4) for k, v in results[name].items()}, 'alpha bbox', a)

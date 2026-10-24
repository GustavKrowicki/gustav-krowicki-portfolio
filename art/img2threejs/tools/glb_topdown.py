"""Top-down height + colour maps of a single-mesh GLB (Krea export) by splatting triangle samples.
Used only as a measuring stick (footprints, heights), never as geometry for the procedural build."""
import io, json, struct, sys
import numpy as np
from PIL import Image

glb, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 512
data = open(glb, 'rb').read()
clen = struct.unpack('<I', data[12:16])[0]
g = json.loads(data[20:20 + clen]); B = 20 + clen + 8
def view(i):
    bv = g['bufferViews'][i]; return B + bv.get('byteOffset', 0), bv['byteLength'], bv.get('byteStride')
def acc(i, comps):
    a = g['accessors'][i]; off, ln, st = view(a['bufferView']); off += a.get('byteOffset', 0)
    dt = {5126: '<f4', 5125: '<u4', 5123: '<u2'}[a['componentType']]
    return np.frombuffer(data, dtype=dt, count=a['count'] * comps, offset=off).reshape(a['count'], comps) if comps > 1 else np.frombuffer(data, dtype=dt, count=a['count'], offset=off)
prim = g['meshes'][0]['primitives'][0]
P = acc(prim['attributes']['POSITION'], 3).astype(np.float64)
UV = acc(prim['attributes']['TEXCOORD_0'], 2).astype(np.float64)
I = acc(prim['indices'], 1).reshape(-1, 3)
off, ln, _ = view(g['images'][0]['bufferView'])
tex = np.asarray(Image.open(io.BytesIO(data[off:off + ln])).convert('RGB'))
th, tw = tex.shape[:2]
# sample each triangle at barycentric points to cover big flat triangles
bary = np.array([[1/3, 1/3, 1/3], [0.6, 0.2, 0.2], [0.2, 0.6, 0.2], [0.2, 0.2, 0.6], [0.8, 0.1, 0.1], [0.1, 0.8, 0.1], [0.1, 0.1, 0.8]])
H = np.full((N, N), -1.0); C = np.zeros((N, N, 3), np.uint8)
mn, mx = P.min(0), P.max(0)
for b in bary:
    pts = (P[I] * b[None, :, None]).sum(1)
    uv = (UV[I] * b[None, :, None]).sum(1)
    gx = np.clip(((pts[:, 0] - mn[0]) / (mx[0] - mn[0]) * (N - 1)).round().astype(int), 0, N - 1)
    gz = np.clip(((pts[:, 2] - mn[2]) / (mx[2] - mn[2]) * (N - 1)).round().astype(int), 0, N - 1)
    order = np.argsort(pts[:, 1])  # later (higher) writes win
    gx, gz, y = gx[order], gz[order], pts[order, 1]
    uvo = uv[order]
    col = tex[np.clip((uvo[:, 1] * (th - 1)).astype(int), 0, th - 1), np.clip((uvo[:, 0] * (tw - 1)).astype(int), 0, tw - 1)]
    upd = y > H[gz, gx] - 1e-9
    H[gz[upd], gx[upd]] = y[upd]; C[gz[upd], gx[upd]] = col[upd]
np.save(f'{out}_height.npy', H)
h = (H - mn[1]) / (mx[1] - mn[1]); h[H < -0.5] = 0
Image.fromarray((h * 255).astype(np.uint8)).save(f'{out}_height.png')
Image.fromarray(C).save(f'{out}_color.png')
print('grid', N, 'x range', mn[0], mx[0], 'y', mn[1], mx[1], 'z', mn[2], mx[2], 'empty cells', int((H < -0.5).sum()))

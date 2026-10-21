#!/usr/bin/env python3
# Usage: python3 -I glass_mask.py <glow render> <day sprite> <out>  (numpy, Pillow). For parts whose glass is painted in their
# texture (a mass with glass sides): the entrance lab `glow` render says where the part shows, the day sprite says which of
# those pixels are glass.
# Keep only the glass-coloured pixels of a glow render: where the model says "this part shows here" and the day sprite
# there is glass (dark or pale blue-grey, cooler than it is red)
import sys, numpy as np
from PIL import Image
glow, sprite, out = sys.argv[1:4]
g = np.array(Image.open(glow).convert('RGBA')).astype(float)
s = np.array(Image.open(sprite).convert('RGBA')).astype(float) / 255
r, gg, b = s[..., 0], s[..., 1], s[..., 2]
mx, mn = s[..., :3].max(-1), s[..., :3].min(-1)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
glass = (b >= r + 0.03) & (mx < 0.92) & ((mx < 0.45) | (sat > 0.08))
keep = (g[..., 3] > 0) & glass
o = g.copy(); o[..., 3] = np.where(keep, g[..., 3], 0)
Image.fromarray(o.astype('uint8')).save(out)
print('kept', keep.sum(), 'of', (g[..., 3] > 0).sum())

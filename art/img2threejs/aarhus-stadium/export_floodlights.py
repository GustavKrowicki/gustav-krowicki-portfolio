#!/usr/bin/env python3
# Make the stadium's night floodlights strip from its south sprite (no new render): the lit bowl (stands and pitch in
# their day colours), 40 lamps on the roof's inner edge with a slow wave of light round the ring, and a soft haze over
# the roof. The city draws it untinted over the night-tinted sprite (`nightLights` in lib/city/buildings.ts), so the
# bowl reads as lit while the rest of the city is dark. Frames in a 4 x 3 grid. Prints the crop for the entry.
# Usage: python3 export_floodlights.py  (needs numpy and Pillow)
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
D = os.path.join(R, "public/game/pogicity/Building/landmark")
SEED = (300, 520)          # a pitch pixel in the 768 px south sprite
LAMPS, FRAMES, COLS = 40, 12, 4
WARM = np.array([1.0, 0.97, 0.86])

spr = np.array(Image.open(f"{D}/aarhus-stadium_south.png").convert("RGBA")).astype(float) / 255
H, W = spr.shape[:2]
rgb, a = spr[..., :3], spr[..., 3]


def to_img(m):
    return Image.fromarray((m * 255).astype("uint8"), "L").copy()


def blur(m, s):
    return np.array(to_img(np.clip(m, 0, 1)).filter(ImageFilter.GaussianBlur(s))).astype(float) / 255


# The bowl: everything inside the roof ring (the roof is light grey, white or cream), holes closed (letters, lines)
mx, mn = rgb.max(-1), rgb.min(-1)
roof = (a > 0) & (mn > 200 / 255) & (mx - mn < 40 / 255)
free = to_img(((a > 0) & ~roof).astype(float))
ImageDraw.floodfill(free, SEED, 128)
bowl = np.array(free) == 128
closed = to_img(bowl.astype(float)).filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.MinFilter(13))
outside = Image.fromarray(np.where(np.array(closed) > 0, 255, 0).astype("uint8")).copy()
ImageDraw.floodfill(outside, (0, 0), 128)
bowl = np.array(outside) != 128
pitch = bowl & (rgb[..., 1] > rgb[..., 0] + 0.12) & (rgb[..., 1] > rgb[..., 2] + 0.12)

# Lamps on the bowl's edge (the roof's inner edge), evenly round the ring by angle
edge = bowl & ~(np.array(to_img(bowl.astype(float)).filter(ImageFilter.MinFilter(5))) > 0)
ys, xs = np.nonzero(edge)
cx, cy = xs.mean(), ys.mean()
ang = np.arctan2((ys - cy) * 2, xs - cx)
lamps = []
for k in range(LAMPS):
    t = -np.pi + (k + 0.5) * 2 * np.pi / LAMPS
    i = np.argmin(np.abs(np.angle(np.exp(1j * (ang - t)))))
    lamps.append((xs[i], ys[i], t))

yy, xx = np.mgrid[0:H, 0:W]
pitch_glow = blur(pitch.astype(float), 10)
pitch_glow /= pitch_glow.max()
haze = blur(bowl.astype(float), 14) * ~bowl            # light rising over the roof ring

frames = []
for f in range(FRAMES):
    t = 2 * np.pi * f / FRAMES
    lamp = np.zeros((H, W))
    for x, y, la in lamps:
        v = 0.75 + 0.25 * np.cos(la - t)                 # the wave round the ring
        d2 = (xx - x) ** 2 + (yy - y) ** 2
        lamp += v * (np.exp(-d2 / (2 * 1.6 ** 2)) + 0.3 * np.exp(-d2 / (2 * 6 ** 2)))
    lamp = np.clip(lamp, 0, 1)
    col = np.where(bowl[..., None], np.clip(rgb * 1.04 + WARM * 0.10 * pitch_glow[..., None], 0, 1), WARM)
    alpha = np.where(bowl, 1.0, np.clip(0.45 * haze, 0, 1))
    col = col * (1 - lamp[..., None]) + WARM * lamp[..., None]     # lamps over both
    alpha = np.maximum(alpha, lamp)
    frames.append(np.dstack([col, alpha]))

# Crop to the lit area, even coordinates (the sprite is drawn at 0.5)
lit = np.any([fr[..., 3] > 2 / 255 for fr in frames], axis=0)
ys, xs = np.nonzero(lit)
x0, y0 = xs.min() // 2 * 2, ys.min() // 2 * 2
x1, y1 = (xs.max() + 2) // 2 * 2, (ys.max() + 2) // 2 * 2
fw, fh = x1 - x0, y1 - y0
rows = (FRAMES + COLS - 1) // COLS
sheet = Image.new("RGBA", (fw * COLS, fh * rows), (0, 0, 0, 0))
for i, fr in enumerate(frames):
    im = Image.fromarray((np.clip(fr[y0:y1, x0:x1], 0, 1) * 255).astype("uint8"), "RGBA")
    sheet.paste(im, ((i % COLS) * fw, (i // COLS) * fh))
sheet.save(f"{D}/aarhus-stadium-lights_south.png", optimize=True)
print("lights crop x", x0, "y", y0, "w", fw, "h", fh, "frames", FRAMES)

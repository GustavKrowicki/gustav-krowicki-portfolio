"""Trim a sprite to its visible pixels without moving its anchor: the game draws it with origin (0.5, 1), so only the
top rows and equal amounts from the left and right edges are cut (the bottom-centre point stays the bottom centre).
With a second path, cut to that sprite's size instead (a variant that must line up with it pixel for pixel)."""
import sys
from PIL import Image

path = sys.argv[1]
im = Image.open(path)
if len(sys.argv) > 2:
    w, h = Image.open(sys.argv[2]).size
    left, top = (im.width - w) // 2, im.height - h
else:
    x0, y0, x1, _ = im.getchannel("A").point(lambda a: 255 if a > 2 else 0).getbbox()
    cx = im.width / 2
    half = int(max(cx - x0, x1 - cx)) + 2
    left, top = max(0, int(cx - half)), max(0, y0 - 2)
im.crop((left, top, im.width - left, im.height)).save(path, optimize=True)
print("trimmed", path.rsplit("/", 1)[-1], im.size, "->", (im.width - 2 * left, im.height - top))

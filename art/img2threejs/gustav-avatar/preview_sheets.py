"""Contact sheet + animated GIF preview of the avatar3d sprite sheets.

  <out>-sheets.png : per direction, walk (8) and idle (4) strips, plain and outlined, at sheet resolution
  <out>-48px.png   : the walk frames at Street-zoom size (sheet / 2 = 48 px figure), plain vs outline, x3 nearest
  <out>.gif        : 4-direction walk loop at Street-zoom size x3, at the chosen walk fps
Usage: python3 -I preview_sheets.py <sheetDir> <outPrefix>
"""
import json
import sys

from PIL import Image, ImageDraw

D, OUT = sys.argv[1:3]
m = json.load(open(f"{D}/avatar3d.json"))
FW, FH = m["frameWidth"], m["frameHeight"]
BG = (196, 214, 190, 255)
dirs = list(m["yaw"])


def strip(name):
    return Image.open(f"{D}/{name}").convert("RGBA")


rows = []
for d in dirs:
    for clip in ("walk", "idle"):
        a = m["animations"][f"{clip}_{d}"]
        rows.append((f"{clip} {d}", strip(a["file"]), strip(a["outlineFile"])))
W = max(r[1].width for r in rows) * 2 + 60
H = len(rows) * (FH + 18) + 30
c = Image.new("RGBA", (W, H), BG)
dr = ImageDraw.Draw(c)
dr.text((10, 6), f"avatar3d sheets ({FW}x{FH} frames, 4x world px). left: plain, right: 2 px outline", fill=(0, 0, 0, 255))
y = 26
for label, plain, out in rows:
    dr.text((10, y), label, fill=(0, 0, 0, 255))
    c.alpha_composite(plain, (10, y + 12))
    c.alpha_composite(out, (plain.width + 40, y + 12))
    y += FH + 18
c.convert("RGB").save(f"{OUT}-sheets.png")

# Street zoom = sheet / 2
cells = []
for d in dirs:
    a = m["animations"][f"walk_{d}"]
    for f in (a["file"], a["outlineFile"]):
        s = strip(f)
        s = s.resize((s.width // 2, s.height // 2), Image.LANCZOS)
        cells.append(s.resize((s.width * 3, s.height * 3), Image.NEAREST))
W = max(x.width for x in cells) + 20
c2 = Image.new("RGBA", (W, sum(x.height + 8 for x in cells) + 30), BG)
ImageDraw.Draw(c2).text((10, 6), "walk at Street zoom (48 px figure) x3 nearest: per direction plain then outline", fill=(0, 0, 0, 255))
y = 26
for x in cells:
    c2.alpha_composite(x, (10, y))
    y += x.height + 8
c2.convert("RGB").save(f"{OUT}-48px.png")

# GIF: 4 directions side by side, Street-zoom size x3, outlined variant
fps = m["animations"]["walk_east"]["fps"]
n = m["animations"]["walk_east"]["frames"]
gif_frames = []
for i in range(n):
    canvas = Image.new("RGB", ((FW // 2) * 3 * 4 + 50, (FH // 2) * 3 + 20), BG[:3])
    for k, d in enumerate(dirs):
        s = strip(m["animations"][f"walk_{d}"]["outlineFile"]).crop((i * FW, 0, (i + 1) * FW, FH))
        s = s.resize((FW // 2, FH // 2), Image.LANCZOS).resize(((FW // 2) * 3, (FH // 2) * 3), Image.NEAREST)
        canvas.paste(s, (10 + k * ((FW // 2) * 3 + 10), 10), s)
    gif_frames.append(canvas)
# real game speed (17.8 fps = 56 ms per frame; GIF delays are in 10 ms steps, so 60 ms)
gif_frames[0].save(f"{OUT}.gif", save_all=True, append_images=gif_frames[1:], duration=round(1000 / fps, -1), loop=0)
print("ok", fps)

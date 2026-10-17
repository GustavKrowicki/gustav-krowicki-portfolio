"""Review sheets for one pass: (1) the south view at Street zoom 2 next to the stadium sprite in the city today and the
avatar, (2) the 4-view turntable at Street zoom 2. Usage: review_sheets.py <buildingDir> <pass> <repoRoot>
Inputs: renders/<pass>-avatar-south.png (lab model avatar-stadium, 512 px sprite), renders/<pass>-sprite-<view>.png,
public/game/pogicity/Building/landmark/aarhus-stadium_south.png (today's sprite, drawn at scale 1).
Writes renders/<pass>-street.png and renders/<pass>-turntable.png."""
import sys
from PIL import Image, ImageDraw, ImageFont

W, P, R = sys.argv[1], sys.argv[2], sys.argv[3]
BG = (243, 241, 236)
try:
    FONT = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
except OSError:
    FONT = ImageFont.load_default()


def crop(im):
    return im.crop(im.getbbox())


def sheet(panels, out, pad=28, label_h=40):
    h = max(p.height for p, _ in panels)
    widths = [max(p.width, int(FONT.getlength(label)) + 8) for p, label in panels]
    w = sum(widths) + pad * (len(panels) + 1)
    s = Image.new("RGB", (w, h + label_h + 2 * pad), BG)
    d = ImageDraw.Draw(s)
    x = pad
    for (im, label), pw in zip(panels, widths):
        s.paste(im, (x, pad + h - im.height), im if im.mode == "RGBA" else None)   # shared ground line
        d.text((x, pad + h + 10), label, fill=(60, 56, 52), font=FONT)
        x += pw + pad
    s.save(out)
    print(out, s.size)


# 1. Street zoom 2: the new sprite is 2x density shown at 0.5, so zoom 2 is 1:1; today's sprite is drawn at 1, so x2
old = crop(Image.open(f"{R}/public/game/pogicity/Building/landmark/aarhus-stadium_south.png").convert("RGBA"))
old = old.resize((old.width * 2, old.height * 2), Image.NEAREST)
new = crop(Image.open(f"{W}/renders/{P}-avatar-south.png").convert("RGBA"))
sheet([(old, "In the city today (4 x 4), Street zoom 2"), (new, "New, south side (6 x 5) with the avatar, Street zoom 2")],
      f"{W}/renders/{P}-street.png")

# 2. Turntable at Street zoom 2 (1:1)
views = []
for v in ("south", "west", "north", "east"):
    im = crop(Image.open(f"{W}/renders/{P}-sprite-{v}.png").convert("RGBA"))
    views.append((im, v))
sheet(views, f"{W}/renders/{P}-turntable.png", pad=24)

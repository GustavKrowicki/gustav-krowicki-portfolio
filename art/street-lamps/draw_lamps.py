"""Street lamps for the city at night (POR-39): three lamp types as pixel art at 1 world px = 1 sprite px.

Each lamp has a day sprite (tinted with the city at night) and a lit sprite (drawn untinted on top, only the parts
that glow). Run: python3 art/street-lamps/draw_lamps.py  -> public/game/pogicity/Props/night/
- post:    slim grey pole about 3.5 m with a wide open cone on three arms; light goes down
- wire:    rust-brown dome, gold inside, hung from a short rod on wires across a street
- lantern: the old Pogicity lantern post without its wreath and snow, with a smoother cap and bigger glass
- bollard: a knee-high dark grey post, about 0.9 m, with a lit band under its cap; for decks and terraces
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "game", "pogicity", "Props", "night")
os.makedirs(OUT, exist_ok=True)

def hexc(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

OUTLINE = hexc("2b2a30")

def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))

def hline(im, y, x0, x1, c):
    for x in range(x0, x1 + 1):
        im.putpixel((x, y), c)

def save(im, name):
    im.save(os.path.join(OUT, name))

# ---------- post lamp: 18 x 58, foot at bottom centre ----------
def post():
    day, lit = canvas(18, 58), canvas(18, 58)
    rim_l, rim_d = hexc("d6dbe0"), hexc("9aa1a9")
    # open cone seen from above: an ellipse rim (rows 1-4) around the reflector
    hline(day, 0, 4, 13, OUTLINE)
    hline(day, 1, 2, 15, rim_l); day.putpixel((1, 1), OUTLINE); day.putpixel((16, 1), OUTLINE)
    hline(day, 2, 1, 16, rim_l); day.putpixel((0, 2), OUTLINE); day.putpixel((17, 2), OUTLINE)
    hline(day, 3, 1, 16, rim_d); day.putpixel((0, 3), OUTLINE); day.putpixel((17, 3), OUTLINE)
    hline(day, 4, 3, 14, OUTLINE)
    hline(day, 2, 4, 13, hexc("8e959d")); hline(day, 3, 3, 14, rim_d)
    # cone sides (clear shell) narrowing to the neck
    for i, (a, b) in enumerate([(3, 14), (4, 13), (5, 12), (6, 11)]):
        y = 5 + i
        hline(day, y, a, b, hexc("c3c9cf") if i < 2 else hexc("a8afb6"))
        day.putpixel((a - 1, y), OUTLINE); day.putpixel((b + 1, y), OUTLINE)
    # three arms under the cone
    for y, xs in [(7, (2, 15)), (8, (3, 14)), (9, (4, 13))]:
        for x in xs: day.putpixel((x, y), hexc("7c838b"))
    # neck
    for y in range(9, 14):
        hline(day, y, 7, 10, hexc("9aa1a9")); day.putpixel((10, y), hexc("737a82"))
        day.putpixel((6, y), OUTLINE); day.putpixel((11, y), OUTLINE)
    # pole, 2 px with outline
    for y in range(14, 55):
        day.putpixel((8, y), hexc("a3aab2")); day.putpixel((9, y), hexc("737a82"))
        day.putpixel((7, y), OUTLINE); day.putpixel((10, y), OUTLINE)
    # base plate
    hline(day, 55, 6, 11, hexc("5d636a")); hline(day, 56, 5, 12, OUTLINE); hline(day, 57, 6, 11, OUTLINE)
    # lit: the reflector inside the rim and the glowing shell
    hline(lit, 2, 4, 13, hexc("fff6e0")); hline(lit, 3, 3, 14, hexc("ffe9bf"))
    hline(lit, 5, 3, 14, hexc("ffe2a8")); hline(lit, 6, 4, 13, hexc("ffd88f"))
    hline(lit, 7, 5, 12, hexc("f7c879")); hline(lit, 8, 6, 11, hexc("eab866"))
    save(day, "post_day.png"); save(lit, "post_lit.png")

# ---------- wire lamp: 17 x 18, hangs from its top centre ----------
def wire():
    day, lit = canvas(17, 18), canvas(17, 18)
    rod = hexc("3a3638")
    for y in range(0, 8): day.putpixel((8, y), rod)
    for y in (2, 5):  # insulators
        hline(day, y, 7, 9, hexc("cfcac2"))
    light, mid, dark = hexc("a8754e"), hexc("7d5034"), hexc("553522")
    rows = [(8, 6, 10), (9, 4, 12), (10, 3, 13), (11, 2, 14), (12, 2, 14), (13, 1, 15), (14, 1, 15)]
    for y, a, b in rows:
        for x in range(a, b + 1):
            t = (x - a) / max(1, b - a)
            day.putpixel((x, y), light if t < 0.3 else mid if t < 0.75 else dark)
        day.putpixel((a - 1, y), OUTLINE); day.putpixel((b + 1, y), OUTLINE)
    hline(day, 7, 6, 10, OUTLINE)
    hline(day, 15, 1, 15, OUTLINE)  # rim
    hline(day, 16, 3, 13, hexc("3b2a20")); hline(day, 17, 5, 11, OUTLINE)  # dark mouth seen from the side
    # lit: the gold inside shows as a bright mouth and a warm rim
    hline(lit, 15, 2, 14, hexc("e9b25c"))
    hline(lit, 16, 3, 13, hexc("ffe6a0")); hline(lit, 17, 5, 11, hexc("ffd27a"))
    save(day, "wire_day.png"); save(lit, "wire_lit.png")

# ---------- lantern: the old post with a new head, 18 x 54 ----------
def lantern():
    base = Image.open(os.path.join(HERE, "lantern-post-base.png")).convert("RGBA")
    day, lit = canvas(18, 54), canvas(18, 54)
    for y in range(21, 54):
        for x in range(18):
            day.putpixel((x, y), base.getpixel((x, y)))
    iron, hi = hexc("26252d"), hexc("4a4a58")
    day.putpixel((8, 0), iron); day.putpixel((9, 0), iron); day.putpixel((8, 1), hi); day.putpixel((9, 1), iron)
    for y, a, b in [(2, 7, 10), (3, 5, 12), (4, 4, 13), (5, 3, 14), (6, 2, 15)]:
        hline(day, y, a, b, iron)
        day.putpixel((a, y), hi); day.putpixel((a + 1, y), hi)
    hline(day, 7, 3, 14, OUTLINE)
    glass_l, glass_d = hexc("cfc4ae"), hexc("a0947f")
    for y in range(8, 16):
        hline(day, y, 4, 13, iron)
        for x in (5, 6, 7): day.putpixel((x, y), glass_l if x < 7 else glass_d)
        for x in (10, 11, 12): day.putpixel((x, y), glass_d if x > 10 else glass_l)
        for x in (5, 6, 7, 10, 11, 12):
            lit.putpixel((x, y), hexc("ffeeb8") if y < 13 else hexc("ffcf73"))
    for y, a, b in [(16, 3, 14), (17, 5, 12), (18, 6, 11), (19, 7, 10), (20, 7, 10)]:
        hline(day, y, a, b, iron)
    save(day, "lantern_day.png"); save(lit, "lantern_lit.png")

# ---------- bollard: 6 x 12 (0.45 wu), foot at bottom centre ----------
def bollard():
    day, lit = canvas(6, 12), canvas(6, 12)
    # flat cap seen from above (rows 0-1), the light band (2-3), the body to the foot
    hline(day, 0, 1, 4, OUTLINE)
    hline(day, 1, 1, 4, hexc("6d737b")); day.putpixel((0, 1), OUTLINE); day.putpixel((5, 1), OUTLINE)
    for y in range(2, 11):
        day.putpixel((0, y), OUTLINE); day.putpixel((5, y), OUTLINE)
        for x in range(1, 5):
            if y <= 3:
                day.putpixel((x, y), hexc("b9b2a2") if x < 3 else hexc("8f897c"))
            else:
                day.putpixel((x, y), hexc("5a6068") if x < 3 else hexc("3c4148"))
    hline(day, 11, 1, 4, OUTLINE)
    hline(lit, 2, 1, 4, hexc("fff1c8")); hline(lit, 3, 1, 4, hexc("f3c77c"))
    save(day, "bollard_day.png"); save(lit, "bollard_lit.png")

post(); wire(); lantern(); bollard()
print("ok")

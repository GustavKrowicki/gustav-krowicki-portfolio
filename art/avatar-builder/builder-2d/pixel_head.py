"""The 13 px head for the city sprite, drawn by hand pixel by pixel from the sheet (round 16).
One character per pixel; light from the upper left, the edge a darker shade of the local colour."""
import sys
from PIL import Image
PAL = {
    '.': None,
    'o': (107, 60, 37),    # hair edge
    'H': (191, 120, 82),   # hair lit
    'h': (155, 92, 60),    # hair shade
    'S': (230, 184, 154),  # skin lit
    's': (201, 147, 122),  # skin shade
    'E': (154, 101, 81),   # skin edge
    'e': (74, 48, 39),     # eye
    'm': (192, 137, 96),   # moustache
    'n': (178, 122, 98),   # nose shade
    'w': (246, 242, 234),  # teeth
    'l': (120, 60, 52),    # mouth
}
NEUTRAL = [
    "...ooooooo...",
    "..oHHHHHHho..",
    "..oHHHHHHhho.",
    "..oSHHHHHhso.",
    "..ESSSSSSSsE.",
    ".EESeSSSeSsEE",
    ".ESSSSnSSssSE",
    ".EESSSnnSssEE",
    "..ESSmmmSssE.",
    "..ESSSSSSssE.",
    "...ESSSSssE..",
    "...EESSSsEE..",
    ".....EEEE....",
]
SMILE = list(NEUTRAL)
SMILE[5] = ".EESESSSESsEE"
SMILE[9] = "..ESlwwwlssE."
def render(rows, scale, path):
    w, h = len(rows[0]), len(rows)
    assert all(len(r) == w for r in rows), [len(r) for r in rows]
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if PAL[c]: im.putpixel((x, y), PAL[c] + (255,))
    im.save(path)
    return im
if __name__ == '__main__':
    out = sys.argv[1]
    render(NEUTRAL, 1, f'{out}/pixel-head-neutral.png'); render(SMILE, 1, f'{out}/pixel-head-smile.png')

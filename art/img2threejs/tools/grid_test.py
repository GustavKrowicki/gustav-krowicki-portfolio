"""Place campus sprite variants on the city's 2:1 grid exactly like MainScene.renderBuilding does:
origin (0.5, 1) at the footprint's bottom vertex (front tile top vertex + TILE_HEIGHT). Adds road tiles along the
footprint's front edges and the player sprite for scale."""
import sys
from PIL import Image, ImageDraw
W, R, d = sys.argv[1], sys.argv[2], sys.argv[3]
TW, TH = 44, 22
VARIANTS = [('A', 'live settings: 35.26 deg, zoom 1.0', 3), ('B', 'same at 30 deg pitch', 3),
            ('C', '30 deg, grid-locked to the 3x3 footprint', 3), ('D', '30 deg, current size on an honest 7x7 footprint', 7)]
# the city avatar's base outfit, first idle frame at zoom 1 (72x132 sheet frame x 0.25); feet at 0.879 of the frame
player = Image.open(f'{R}/Characters/avatar-builder/2d-tee-none-denim/idle-{"south" if d == "south" else "west"}.png').convert('RGBA').crop((0, 0, 72, 116)).resize((18, 29), Image.NEAREST)
panels = []
for key, label, fp in VARIANTS:
    PW, PH = 700, 560
    img = Image.new('RGBA', (PW, PH), (150, 170, 110, 255)); dr = ImageDraw.Draw(img)
    ox, oy = PW // 2, 70                      # screen position of grid (0, 0) top vertex
    G = 14
    gx0 = G // 2 - fp // 2 - 0; gy0 = gx0     # footprint origin tile
    def top(gx, gy): return (ox + (gx - gy) * TW / 2 - (gx0 - gy0) * TW / 2, oy + (gx + gy) * TH / 2 - (gx0 + gy0) * TH / 2 + 140)
    def diamond(gx, gy):
        x, y = top(gx, gy); return [(x, y), (x + TW / 2, y + TH / 2), (x, y + TH), (x - TW / 2, y + TH / 2)]
    for gx in range(gx0 - 6, gx0 + fp + 6):
        for gy in range(gy0 - 6, gy0 + fp + 6):
            road = (gx == gx0 + fp and gy0 - 1 <= gy <= gy0 + fp) or (gy == gy0 + fp and gx0 - 1 <= gx <= gx0 + fp)
            dr.polygon(diamond(gx, gy), fill=(120, 120, 112, 255) if road else (150, 170, 110, 255), outline=(128, 148, 94, 255))
    # footprint outline
    a, b, c, e = diamond(gx0, gy0)[0], diamond(gx0 + fp - 1, gy0)[1], diamond(gx0 + fp - 1, gy0 + fp - 1)[2], diamond(gx0, gy0 + fp - 1)[3]
    sprite = Image.open(f'{W}/renders/pitch-{key}-{d}.png').convert('RGBA')
    fx, fy = top(gx0 + fp - 1, gy0 + fp - 1)
    img.alpha_composite(sprite, (int(round(fx - sprite.width / 2)), int(round(fy + TH - sprite.height))))
    dr = ImageDraw.Draw(img)
    dr.line([a, b, c, e, a], fill=(255, 40, 160, 255), width=2)
    # player standing on the road tile just in front of the footprint's front corner
    px, py = top(gx0 + fp, gy0 + fp); img.alpha_composite(player, (int(px - player.width / 2), int(py + TH / 2 - player.height + 2)))
    dr.rectangle([0, 0, PW, 26], fill=(245, 243, 238, 255)); dr.text((8, 7), f'{key}: {label}', fill=(20, 20, 20, 255))
    panels.append(img)
sheet = Image.new('RGB', (2 * 700 + 8, 2 * 560 + 8), (245, 243, 238))
for i, p in enumerate(panels): sheet.paste(p.convert('RGB'), ((i % 2) * 708, (i // 2) * 568))
sheet.save(f'{W}/review/pitch_test_{d}.png'); print(f'review/pitch_test_{d}.png')

"""City sprite: the base outfit as a pixel paper doll, 8-frame walk in the four city facings.
Limbs are the sheet's vector parts in two segments (thigh/shin, upper arm/forearm, the shoe pivoting at the toe),
turned per frame, rasterised at 8x and reduced to clean pixel clusters in the sheet palette (lit, mid, shade,
edge per part), with an upper-left rim and a 1 px edge in a darker shade of each colour (the city's look).
The faces are hand-drawn 13 px heads pasted on top: a reduced vector face blurs.
Facings: down-left and up-right are drawn (up-right from the mirrored 3/4 geometry with back details);
down-right and up-left are their mirrors with the shade redrawn for the upper-left light.
  python3 doll.py <out_dir>  ->  walk-<facing>.png (8 frames of 36 x 66 each)"""
import os, subprocess, sys
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
SHEET = open(here + '/sheet.py').read()
exec(SHEET[:SHEET.index("\nif __name__ ==")])
sys.path.insert(0, here)
from warp import warp, W
from pixel_head import PAL
from pieces2d import PIECE_C, hoodie_34, sweater_34, club_34, cargo_34, ski_34, skipants_34, BEANIE34, BEANIE_PAL, PIX, HELMET34, HELMET_BACK34
C.update(PIECE_C)
OUTFIT = {'top': 'tee', 'head': 'none', 'legs': 'denim'}

FW, FH, GROUND = 36, 66, 58              # frame, ground row (as the bake view: 8 px of room under the feet)
TOP_U, FOOT_U, CX_U = 24, 996, 180       # figure top and ground in sheet units, the body centre
CX_U_BACK = 220                          # mirrored about x = 200, the centre moves to 220
S = 54 / (FOOT_U - TOP_U)                # px per unit: a 54 px figure
SS = 8                                   # supersample

# --- the 3/4 parts, per limb segment (paths from the round 17 sheet) ---------------------------------------
SOFTF = '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>'
def soft(el):
    return el.replace('/>', ' filter="url(#soft)"/>')
PARTS = {
  'near': dict(
    thigh=[shape('M110 424 L186 424 L188 540 L184 684 L100 684 L104 540 Z', 'jean'),
           soft(shade('M158 430 L186 424 L188 540 L184 684 L164 684 C166 600 164 500 158 430 Z', 'jean'))],
    shin=[shape('M100 676 L184 676 L180 906 L96 906 Z', 'jean'),
          soft(shade('M160 680 L184 676 L180 906 L164 906 C166 820 164 740 160 680 Z', 'jean')),
          shape('M95 902 L177 902 L178 932 L94 932 Z', 'cuff')],
    shoe=[shape('M94 930 L182 930 L186 976 L58 976 C54 962 64 944 94 930 Z', 'shoe'),
          '<rect x="52" y="976" width="140" height="20" rx="6" fill="#141111"/>',
          line('M54 978 L188 978', C['welt'][0], 10)],
    hip=(147, 440), knee=(142, 680), toe=(60, 992),
    upper=[shape('M64 404 L112 397 C114 440 115 470 114 504 L70 506 C68 470 66 440 64 404 Z', 'skin')],
    fore=[shape('M70 498 L114 496 C116 530 115 560 113 590 L78 594 C74 560 72 530 70 498 Z', 'skin')] + hand(lambda x: 434 - x, -1),
    shoulder=(88, 404), elbow=(92, 502)),
  'far': dict(
    thigh=[shape('M180 424 L282 424 L280 540 L264 560 L264 684 L187 684 L186 540 Z', 'jean', shade=True)],
    shin=[shape('M187 676 L264 676 L264 906 L188 906 Z', 'jean', shade=True),
          shape('M174 902 L262 902 L263 930 L176 930 Z', 'cuff', shade=True)],
    shoe=[shape('M180 930 L264 930 L268 976 L156 976 C152 962 162 944 180 930 Z', 'shoe', shade=True),
          '<rect x="150" y="976" width="124" height="20" rx="6" fill="#141111"/>',
          line('M152 978 L270 978', C['welt'][0], 10)],
    hip=(232, 440), knee=(226, 680), toe=(158, 992),
    upper=[shape('M262 404 L298 400 C300 440 301 470 300 504 L268 506 C267 470 265 440 262 404 Z', 'skin', shade=True)],
    fore=[shape('M268 498 L300 496 C302 530 301 560 298 590 L272 594 C270 560 269 530 268 498 Z', 'skin', shade=True)] +
         [x.replace(C['skin'][0], C['skin'][1], 1) for x in hand(lambda x: x - 48, 1)],
    shoulder=(280, 404), elbow=(284, 502)),
}
TOPS34 = {name: fn(shape, shade, line, soft) for name, fn in (('hoodie', hoodie_34), ('sweater', sweater_34), ('clubShirt', club_34), ('skiShell', ski_34))}
SLEEVES = {name: sl for name, (_, sl) in TOPS34.items()}
LEGS34 = {'cargo': cargo_34(shape, shade, line, soft), 'skiPants': skipants_34(shape, shade, line, soft)}
def torso():
    neck = [shape('M160 226 L206 224 L210 266 Q186 278 158 266 Z', 'skin'),
            soft(shade('M160 230 Q184 248 206 230 L206 250 Q184 262 160 250 Z', 'skin'))]
    if OUTFIT['top'] == 'hoodie':
        t = TOPS34['hoodie'][0]
        return t[:1] + neck + t[1:]       # the hood sits behind the neck
    if OUTFIT['top'] in TOPS34:
        return neck + TOPS34[OUTFIT['top']][0]
    return tee_torso()
def tee_torso():
    return [shape('M138 270 L254 266 C276 272 292 292 296 318 L304 400 L262 408 L262 470 Q190 478 112 470 L110 362 L106 410 L66 402 L74 318 C80 292 104 274 138 270 Z', 'tee'),
            soft(shade('M206 284 C246 290 262 330 262 362 L262 470 Q236 474 204 476 C214 420 214 340 206 284 Z', 'tee')),
            shade('M262 300 C280 300 292 318 296 318 L304 400 L276 405 C274 370 272 330 262 300 Z', 'tee'),
            shape('M160 226 L206 224 L210 266 Q186 278 158 266 Z', 'skin'),
            soft(shade('M160 230 Q184 248 206 230 L206 250 Q184 262 160 250 Z', 'skin'))]
POCKETS = ('<path d="M120 452 L176 452 L174 500 L148 508 L122 500 Z" fill="none" stroke="#5a5660" stroke-width="7"/>'
           '<path d="M196 452 L252 452 L250 500 L224 508 L198 500 Z" fill="none" stroke="#5a5660" stroke-width="7"/>')

# 8-frame walk. Per frame: hip swing of the near leg (+ = foot forward, to the left for the drawn facing); the far
# leg mirrors it. Knee bend on the leg passing forward, heel lift on the leg behind, a 1 px bob.
LEG = [9, 5, 0, -5, -9, -5, 0, 5]
KNEE = {'near': [0, 0, 0, 0, 6, 22, 30, 16], 'far': [6, 22, 30, 16, 0, 0, 0, 0]}   # degrees, shin swings back
HEEL = {'near': [0, 0, 0, 10, 18, 4, 0, 0], 'far': [18, 4, 0, 0, 0, 0, 0, 10]}     # heel lifts about the toe
LIFT = {'near': [0, 0, 0, 0, 0, 8, 16, 6], 'far': [0, 8, 16, 6, 0, 0, 0, 0]}       # units: the swing foot clears the ground
BOB = [0, 1, 0, -1, 0, 1, 0, -1]
IDLE_BOB = [0, 0, 1, 0]              # a slow breath: the body sinks 1 px on the third frame
IDLE_BLINK = 3                       # eyes shut on the last idle frame
POSE = None                          # set to 'idle' to draw the standing pose

def leg_g(side, i):
    p = PARTS[side]; a = LEG[i] if side == 'near' else -LEG[i]
    k = -KNEE[side][i]; h = -HEEL[side][i]
    if POSE == 'idle':
        var = LEGS34.get(OUTFIT['legs'], {}).get(side, {})
        return (f'<g transform="rotate({1.5 if side == "near" else -1.5} {p["hip"][0]} {p["hip"][1]})">'
                + ''.join(var.get('thigh', p['thigh'])) + ''.join(var.get('shin', p['shin'])) + ''.join(p['shoe']) + '</g>')
    var = LEGS34.get(OUTFIT['legs'], {}).get(side, {})
    thigh, shin_parts = var.get('thigh', p['thigh']), var.get('shin', p['shin'])
    shoe = f'<g transform="rotate({h} {p["toe"][0]} {p["toe"][1]})">' + ''.join(p['shoe']) + '</g>'
    shin = f'<g transform="rotate({k} {p["knee"][0]} {p["knee"][1]})">' + ''.join(shin_parts) + shoe + '</g>'
    return (f'<g transform="translate(0 {-LIFT[side][i] - (KNEE[side][i] * 0.9)}) rotate({a} {p["hip"][0]} {p["hip"][1]})">'
            + ''.join(thigh) + shin + '</g>')
def arm_g(side, i):
    p = PARTS[side]; a = LEG[i] if side == 'near' else -LEG[i]
    swing = -0.9 * a if POSE != 'idle' else 0.0   # arms against the legs
    bend = 12 + max(0.0, swing) * 0.5      # elbow always a little bent, more on the forward swing
    cover = SLEEVES.get(OUTFIT['top'], {}).get(side, {})
    fore = f'<g transform="rotate({bend} {p["elbow"][0]} {p["elbow"][1]})">' + ''.join(p['fore'] + cover.get('fore', [])) + '</g>'
    return (f'<g transform="rotate({swing} {p["shoulder"][0]} {p["shoulder"][1]})">' + ''.join(p['upper'] + cover.get('upper', []))
            + fore + '</g>')

def frame_svg(i, back=False):
    body = [arm_g('far', i), leg_g('far', i), leg_g('near', i), ''.join(torso()) + (POCKETS if back else ''), arm_g('near', i)]
    if back:   # seen from behind: the same 3/4 geometry mirrored, so the near side is on the right
        body = ['<g transform="translate(400 0) scale(-1 1)">' + ''.join(body) + '</g>']
    bob = (IDLE_BOB[i] if POSE == 'idle' else BOB[i]) / S
    vx = (CX_U_BACK if back else CX_U) - (FW / 2) / S; vy = FOOT_U - GROUND / S
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{FW*SS}" height="{FH*SS}" viewBox="{vx} {vy} {FW / S} {FH / S}">'
            f'<defs>{SOFTF}</defs><g transform="translate(0 {bob})">' + warp(''.join(body)) + '</g></svg>')

# --- palette and pixel passes -------------------------------------------------------------------------------
hx = lambda h: tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
def tone_colour(part, name):
    lit, sh, edge_ = (hx(c) for c in C[part])
    if name == 'mid': return tuple((a + b) // 2 for a, b in zip(lit, sh))
    if name == 'rim': return (min(255, int(lit[0] * 1.12 + 10)), min(255, int(lit[1] * 1.12 + 10)), min(255, int(lit[2] * 1.1 + 10)))
    return {'lit': lit, 'shade': sh, 'edge': edge_}[name]
PALETTE = {}            # palette colour -> its edge colour
TONES = {}              # colour -> (part, tone)
for k in C:
    for name in ('lit', 'mid', 'shade', 'edge', 'rim'):
        col = tone_colour(k, name)
        TONES[col] = (k, name)
        if name != 'rim': PALETTE[col] = tone_colour(k, 'edge')
PALETTE[(20, 17, 17)] = (7, 6, 6)
for code, col in PAL.items():   # the hand-drawn head colours
    if col is None: continue
    part = 'hair' if code in 'oHh' else 'skin' if code in 'SsEn' else None
    if part: TONES.setdefault(col, (part, {'H': 'lit', 'h': 'shade', 'o': 'edge', 'S': 'lit', 's': 'shade', 'E': 'edge', 'n': 'mid'}[code]))

def nearest(c):
    return min(PALETTE, key=lambda p: sum((a - b) ** 2 for a, b in zip(p, c)))
def reduce(big):
    """8x8 blocks -> one pixel: covered if > 45 % opaque, colour = the most common palette colour in the block."""
    small = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    px = big.load()
    for y in range(FH):
        for x in range(FW):
            counts, cov = {}, 0
            for yy in range(y * SS, y * SS + SS):
                for xx in range(x * SS, x * SS + SS):
                    r, g_, b, al = px[xx, yy]
                    if al > 128:
                        cov += 1; q = nearest((r, g_, b)); counts[q] = counts.get(q, 0) + 1
            if cov > SS * SS * 0.45:
                small.putpixel((x, y), max(counts, key=counts.get) + (255,))
    return small
def rim(im):
    """Light from the upper left: pixels two steps in from an upper-left edge get a lighter tone of their colour."""
    out = im.copy(); p = im.load()
    def clear(x, y):
        return not (0 <= x < FW and 0 <= y < FH) or p[x, y][3] == 0
    for y in range(FH):
        for x in range(FW):
            if p[x, y][3] == 0: continue
            if not (clear(x - 1, y) or clear(x, y - 1)) and (clear(x - 2, y) or clear(x, y - 2)):
                r, g_, b, _ = p[x, y]
                out.putpixel((x, y), (min(255, int(r * 1.12 + 10)), min(255, int(g_ * 1.12 + 10)), min(255, int(b * 1.1 + 10)), 255))
    return out
def edge(im):
    """Outer edge pixels take the darker shade of their own colour (no black outline)."""
    out = im.copy(); p = im.load()
    for y in range(FH):
        for x in range(FW):
            if p[x, y][3] == 0: continue
            if any(not (0 <= x + dx < FW and 0 <= y + dy < FH) or p[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.putpixel((x, y), PALETTE.get(p[x, y][:3], p[x, y][:3]) + (255,))
    return out
def relight(im):
    """Redraw the shade for the upper-left light (after a mirror or for the back view): along each row, every run
    of one part is rim on its left, lit, mid towards the right and shaded on the right; marks are untouched."""
    out = im.copy(); p = im.load()
    for y in range(FH):
        x = 0
        while x < FW:
            c = p[x, y]
            info = TONES.get(c[:3]) if c[3] else None
            if not info or info[1] == 'edge':
                x += 1; continue
            part = info[0]; x1 = x
            while x1 + 1 < FW and p[x1 + 1, y][3] and TONES.get(p[x1 + 1, y][:3], ('', ''))[0] == part \
                    and TONES[p[x1 + 1, y][:3]][1] != 'edge':
                x1 += 1
            n = x1 - x + 1
            for k in range(n):
                t = k / max(1, n - 1)
                name = 'lit' if n < 3 else ('rim' if t < 0.18 else 'lit' if t < 0.6 else 'mid' if t < 0.8 else 'shade')
                out.putpixel((x + k, y), tone_colour(part, name) + (255,))
            x = x1 + 1
    return out
def mirror(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)

# --- hand-drawn heads -----------------------------------------------------------------------------------
HEAD34 = [   # 3/4 down-left: nose and face to the left, ear on the right
    "....ooooooo..",
    "..ooHHHHHHho.",
    ".oHHHHHHHHhho",
    ".oSSHHHHHHhho",
    ".ESSSSSSSShhE",
    ".ESSSSSSSSsEE",
    "ESeSSSeSSSsEs",
    "nSSSSSSSSssEs",
    "ESSSSSSSSssEE",
    ".ESmmmSSSssE.",
    ".ESSSSSSssE..",
    "..ESSSSSsE...",
    "...EEEEEE....",
]
BACK34 = [   # 3/4 up-right: hair over the crown, the ear on the right, the nape
    "....ooooooo..",
    "..ooHHHHHHHo.",
    ".oHHHHHHHHHho",
    ".oHHHHHHHHhho",
    ".oHHHHHHHHhhE",
    ".oHHHHHHHHhEs",
    ".oHHHHHHHhhEs",
    ".oHHHHHHHhhEE",
    "..oHHHHHhhoE.",
    "..ESSSSSSsE..",
    "...ESSSSsE...",
    "...ESSSSsE...",
    "....EEEEE....",
]
def paste_grid(im, grid, x0, bob):
    y0 = GROUND - 54 + bob
    for y, row in enumerate(grid):
        for x, c in enumerate(row):
            if PAL[c]: im.putpixel((x0 + x, y0 + y), PAL[c] + (255,))
    if OUTFIT['head'] == 'helmet':
        hg = HELMET_BACK34 if grid is BACK34 else HELMET34
        for y, row in enumerate(hg):
            for x, c in enumerate(row):
                if c in PIX: im.putpixel((x0 + x, y0 - 2 + y), PIX[c] + (255,))
    if OUTFIT['head'] == 'beanie':
        for y, row in enumerate(BEANIE34):
            for x, c in enumerate(row):
                if c in BEANIE_PAL: im.putpixel((x0 + x, y0 - 3 + y), BEANIE_PAL[c] + (255,))

def render_frames(out, back, n=8):
    frames = []
    for i in range(n):
        tag = ('b' if back else 'f') + ('i' if POSE == 'idle' else '')
        svgp = f'{out}/frames/{tag}{i}.svg'; open(svgp, 'w').write(frame_svg(i, back))
        subprocess.run(['node', f'{here}/render-alpha.cjs', svgp, f'{out}/frames/{tag}{i}-8x.png', str(FW * SS), str(FH * SS)], check=True)
        sm = reduce(Image.open(f'{out}/frames/{tag}{i}-8x.png').convert('RGBA'))
        bob = IDLE_BOB[i] if POSE == 'idle' else BOB[i]
        if back:
            sm = relight(sm)
            paste_grid(sm, BACK34, FW - 11 - 13, bob)
        else:
            sm = rim(sm)
            head = HEAD34 if not (POSE == 'idle' and i == IDLE_BLINK) else [r.replace('e', 'E') for r in HEAD34]
            paste_grid(sm, head, 11, bob)
        frames.append(edge(sm))
    return frames


# --- bake: the city sheet format (lib/city/avatar3dSprites.ts), 2 sheet px per street px ---------------------
COMPASS = {'down-left': 'east', 'down-right': 'north', 'up-left': 'south', 'up-right': 'west'}
def facings(down_left, up_right):
    return {'down-left': down_left, 'down-right': [edge(relight(mirror(f))) for f in down_left],
            'up-right': up_right, 'up-left': [edge(relight(mirror(f))) for f in up_right]}
def stride_wu():
    """One walk cycle covers two steps; a step is the swing of both feet at the widest hip angle."""
    import math
    leg_u = FOOT_U - W(PARTS['near']['hip'][1])          # the hip after the proportion pass (warp.py)
    step_u = 2 * leg_u * math.sin(math.radians(max(LEG)))
    return 2 * step_u * S / 60          # street px -> wu: 60 px per wu (0.9 wu = 54 px)
def bake(look_dir, walk, idle):
    import json
    os.makedirs(look_dir, exist_ok=True)
    walk_fps = round(1.6 / stride_wu() * 8, 2)   # the city walks at 1.6 wu/s: feet must not slide
    anims = {}
    for clip, sets, fps, dur in (('walk', walk, walk_fps, 8 / walk_fps), ('idle', idle, 4 / 3, 3)):
        for facing, frames in sets.items():
            strip = Image.new('RGBA', (FW * 2 * len(frames), FH * 2), (0, 0, 0, 0))
            for i, f in enumerate(frames): strip.alpha_composite(f.resize((FW * 2, FH * 2), Image.NEAREST), (i * FW * 2, 0))
            name = f'{clip}-{COMPASS[facing]}.png'; strip.save(f'{look_dir}/{name}')
            anims[f'{clip}_{COMPASS[facing]}'] = {'file': name, 'outlineFile': name, 'frames': len(frames), 'fps': fps,
                                                  'repeat': -1, 'durationS': round(dur, 3)}
    manifest = {'frameWidth': FW * 2, 'frameHeight': FH * 2, 'origin': [0.5, round(GROUND / FH, 5)], 'displayScale': 0.25,
                'note': '2D paper doll (art/avatar-builder/builder-2d/doll.py): hand-drawn heads, limb layers turned per frame, '
                        '2 sheet px per street px. origin = the ground point under the feet.',
                'yaw': {'east': 45, 'north': -45, 'south': 135, 'west': -135}, 'animations': anims}
    json.dump(manifest, open(f'{look_dir}/avatar3d.json', 'w'), indent=1)
    return walk_fps

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(f'{out}/frames', exist_ok=True)
    looks = sys.argv[3].split(',') if len(sys.argv) > 3 else ['tee-none-denim']
    for look in looks:
        top, head, legs = look.split('-')
        OUTFIT.update(top=top, head=head, legs=legs)
        POSE = None
        walk = facings(render_frames(out, back=False), render_frames(out, back=True))
        POSE = 'idle'
        idle = facings(render_frames(out, back=False, n=4), render_frames(out, back=True, n=4))
        POSE = None
        for name, frames in walk.items():
            strip = Image.new('RGBA', (FW * 8, FH), (0, 0, 0, 0))
            for i, f in enumerate(frames): strip.alpha_composite(f, (i * FW, 0))
            strip.save(f'{out}/walk-{look}-{name}.png')
        if len(sys.argv) > 2:
            print(look, 'walk fps', bake(f'{sys.argv[2]}/2d-{look}', walk, idle))
    print('ok')

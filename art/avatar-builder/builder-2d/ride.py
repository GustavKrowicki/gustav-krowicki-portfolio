"""Ride: the paper doll on the city bike. The bike comes from the 3D model (bike_bake: city camera, cranks turned per
frame) as a pixel layer; the doll sits on the saddle with each foot on its pedal and hands on the grips (2-bone IK in
the drawn plane). Layers: far arm and leg, bike, body and near leg and arm, head.
Bike frames first: bike/run.mjs (the 3D city bike, art/img2threejs/bike-velorbis) writes bike-<yaw>-<i>.png and points.json.
  python3 ride.py <bike_dir> <work_dir> [<city_dir> [looks]]  ->  ride-<look>-<facing>.png strips; with a city_dir, adds
  ride-<compass>.png and the ride clips to each look's avatar3d.json (the walk, idle and run stay as doll.py baked them)"""
import json, math, os, subprocess, sys
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
import doll as D
from warp import W, WH

RFW, RFH, RGROUND = 72, 88, 72
FACE = {'down-left': (135, 'L', False), 'up-right': (315, 'R', True)}   # bike yaw, near pedal, back view
MIRROR = {'down-right': ('down-left', 45), 'up-left': ('up-right', 225)}
N = 8
RIDE_FPS = 16.67       # pedal strokes at the pace Gustav picked (60 ms a frame), 2 crank turns a second
RIDE_SPEED = 10.0      # wu/s, as the city rides (lib/city/units.ts); the legs slow down with the bike as it eases
LEAN = 10        # degrees, the upper body leans forward to the bars
HIP_W = (147, W(440))
SINK = float(os.environ.get('SINK', 36))   # units: the front views sit lower, the thigh runs towards the camera

def rot(p, c, deg):
    a = math.radians(deg); x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))

def leg_fk(side, a, k, h):
    p = D.PARTS[side]
    H = (p['hip'][0], W(p['hip'][1])); K = (p['knee'][0], W(p['knee'][1])); T = (p['toe'][0], W(p['toe'][1]))
    ball = (T[0] + 40, W(984))           # the ball of the foot, on the sole a little behind the toe
    ball = rot(ball, T, h); ball = rot(ball, K, k); ball = rot(ball, H, a)
    return ball
def leg_ik(side, target):
    best = None
    for a in range(-30, 111, 2):
        for k in range(-150, 1, 2):
            h = -0.6 * (a + k)
            b = leg_fk(side, a, k, h); d = (b[0] - target[0]) ** 2 + (b[1] - target[1]) ** 2
            if best is None or d < best[0]: best = (d, a, k, h)
    return best
def arm_fk(side, s, b):
    p = D.PARTS[side]
    Sh = (p['shoulder'][0], W(p['shoulder'][1])); E = (p['elbow'][0], W(p['elbow'][1]))
    hand = (p['elbow'][0] + 4, WH(625))
    return rot(rot(hand, E, b), Sh, s)
def arm_ik(side, target):
    best = None
    for s in range(-20, 121, 2):
        for b in range(0, 151, 2):
            h = arm_fk(side, s, b); d = (h[0] - target[0]) ** 2 + (h[1] - target[1]) ** 2
            if best is None or d < best[0]: best = (d, s, b)
    return best

def leg_svg(side, a, k, h):
    p = D.PARTS[side]
    var = D.LEGS34.get(D.OUTFIT['legs'], {}).get(side, {})
    thigh, shin_parts = var.get('thigh', p['thigh']), var.get('shin', p['shin'])
    shoe = f'<g transform="rotate({h} {p["toe"][0]} {p["toe"][1]})">' + ''.join(p['shoe']) + '</g>'
    shin = f'<g transform="rotate({k} {p["knee"][0]} {p["knee"][1]})">' + ''.join(shin_parts) + shoe + '</g>'
    return f'<g transform="rotate({a} {p["hip"][0]} {p["hip"][1]})">' + ''.join(thigh) + shin + '</g>'
def arm_svg(side, s, b):
    p = D.PARTS[side]
    cover = D.SLEEVES.get(D.OUTFIT['top'], {}).get(side, {})
    fore = f'<g transform="rotate({b} {p["elbow"][0]} {p["elbow"][1]})">' + ''.join(p['fore'] + cover.get('fore', [])) + '</g>'
    return f'<g transform="rotate({s} {p["shoulder"][0]} {p["shoulder"][1]})">' + ''.join(p['upper'] + cover.get('upper', [])) + fore + '</g>'

def to_units(pt, back):
    """frame px -> doll units (the drawn, unmirrored geometry)"""
    cx = D.CX_U_BACK if back else D.CX_U
    vx = cx - (RFW / 2) / D.S; vy = D.FOOT_U - RGROUND / D.S
    x, y = vx + pt[0] / D.S, vy + pt[1] / D.S
    return (400 - x if back else x, y)

def svg_layer(parts, back, t):
    body = f'<g transform="translate({t[0]} {t[1]})">' + ''.join(parts) + '</g>'
    if back: body = '<g transform="translate(400 0) scale(-1 1)">' + body + '</g>'
    cx = D.CX_U_BACK if back else D.CX_U
    vx = cx - (RFW / 2) / D.S; vy = D.FOOT_U - RGROUND / D.S
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{RFW*D.SS}" height="{RFH*D.SS}" viewBox="{vx} {vy} {RFW / D.S} {RFH / D.S}">'
            f'<defs>{D.SOFTF}</defs>' + D.warp(body) + '</svg>')

def raster_all(jobs, work):
    """[(svg, path)] -> 8x images, one browser for the lot"""
    for svg, path in jobs: open(path + '.svg', 'w').write(svg)
    json.dump([[path + '.svg', path + '-8x.png', RFW * D.SS, RFH * D.SS] for _, path in jobs], open(f'{work}/jobs.json', 'w'))
    subprocess.run(['node', f'{here}/render-many.cjs', f'{work}/jobs.json'], check=True)
    return [Image.open(path + '-8x.png').convert('RGBA') for _, path in jobs]

BIKE_CACHE = {}
def bike_layer(png):
    """8x bike render -> frame pixels: covered blocks (> 40 %) take the mean colour; outer pixels get a darker edge.
    The same for every look, so made once per frame."""
    if png not in BIKE_CACHE: BIKE_CACHE[png] = bike_pixels(png)
    return BIKE_CACHE[png]
def bike_pixels(png):
    big = Image.open(png).convert('RGBA'); px = big.load(); ss = D.SS
    out = Image.new('RGBA', (RFW, RFH), (0, 0, 0, 0))
    for y in range(RFH):
        for x in range(RFW):
            cs = [px[xx, yy] for yy in range(y * ss, y * ss + ss) for xx in range(x * ss, x * ss + ss) if px[xx, yy][3] > 128]
            if len(cs) > ss * ss * 0.4:
                out.putpixel((x, y), tuple(sum(c[i] for c in cs) // len(cs) for i in range(3)) + (255,))
    q = out.convert('RGB').quantize(colors=14, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    res = Image.new('RGBA', out.size, (0, 0, 0, 0)); a = out.load(); qq = q.load()
    for y in range(RFH):
        for x in range(RFW):
            if a[x, y][3]:
                edge = any(not (0 <= x + dx < RFW and 0 <= y + dy < RFH) or a[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                c = qq[x, y]
                res.putpixel((x, y), (tuple(int(v * 0.72) for v in c) if edge else c) + (255,))
    return res

def with_frame(fn):
    """run a doll pixel pass at the ride frame size"""
    old = D.FW, D.FH, D.GROUND
    D.FW, D.FH, D.GROUND = RFW, RFH, RGROUND
    try: return fn()
    finally: D.FW, D.FH, D.GROUND = old

def ride_frames(bike_dir, work, facing):
    yaw, near_pedal, back = FACE[facing]
    pts = json.load(open(f'{bike_dir}/points.json'))[str(yaw)]
    far_pedal = 'R' if near_pedal == 'L' else 'L'
    frames, log, poses = [], [], []
    for i in range(N):
        f = pts[i]
        seat = to_units(f['saddle'], back)
        hip = (D.PARTS['near']['hip'][0], W(D.PARTS['near']['hip'][1]))
        t = (seat[0] - hip[0] + 6, seat[1] - hip[1] - 14 + (0 if back else SINK))          # sit: the hip joint just above and behind the saddle top
        local = lambda pt: (to_units(pt, back)[0] - t[0], to_units(pt, back)[1] - t[1])
        ln = leg_ik('near', local(f['pedal' + near_pedal])); lf = leg_ik('far', local(f['pedal' + far_pedal]))
        unlean = lambda pt: rot(local(pt), HIP_W, LEAN)   # arm targets in the upright torso's frame
        an = arm_ik('near', unlean(f['grip' + near_pedal])); af = arm_ik('far', unlean(f['grip' + far_pedal]))
        log.append([round(math.sqrt(x[0]) * D.S, 1) for x in (ln, lf, an, af)])
        lean = lambda x: f'<g transform="rotate({-LEAN} 147 440)">' + x + '</g>'
        back_parts = [lean(arm_svg('far', *af[1:])), leg_svg('far', *lf[1:])]
        front_parts = [leg_svg('near', *ln[1:]), lean(''.join(D.torso()) + (D.POCKETS if back else '') + arm_svg('near', *an[1:]))]
        tag = f'{work}/{facing}-{i}'
        poses.append((t, [(svg_layer(back_parts, back, t), tag + '-b'), (svg_layer(front_parts, back, t), tag + '-f')]))
    images = raster_all([job for _, jobs in poses for job in jobs], work)
    for i, (t, _) in enumerate(poses):
        bl, fl = images[2 * i], images[2 * i + 1]
        def px_layers():
            b_ = D.reduce(bl); f_ = D.reduce(fl)
            b_ = D.relight(b_) if back else D.rim(b_)
            f_ = D.relight(f_) if back else D.rim(f_)
            hx = -math.sin(math.radians(LEAN)) * (HIP_W[1] - 130) * D.S
            dx = round((t[0] * D.S + hx) * (-1 if back else 1)); dy = round(t[1] * D.S)
            if back: D.paste_grid(f_, D.BACK34, RFW // 2 + 18 - 11 - 13 + dx, dy)
            else: D.paste_grid(f_, D.HEAD34, RFW // 2 - 18 + 11 + dx, dy)
            return D.edge(b_), D.edge(f_)
        b_, f_ = with_frame(px_layers)
        frames.append((b_, f_))
    return frames, log

def compose(rider, bike_png):
    b_, f_ = rider
    im = Image.new('RGBA', (RFW, RFH), (0, 0, 0, 0))
    im.alpha_composite(b_); im.alpha_composite(bike_layer(bike_png)); im.alpha_composite(f_)
    return im

def mirror_offset(bike_dir, src_yaw, dst_yaw):
    pts = json.load(open(f'{bike_dir}/points.json'))
    best = None
    for off in range(N):
        err = 0
        for i in range(N):
            a = pts[str(src_yaw)][i]; b = pts[str(dst_yaw)][(i + off) % N]
            for na, nb in (('pedalL', 'pedalR'), ('pedalR', 'pedalL')):
                err += (RFW - a[na][0] - b[nb][0]) ** 2 + (a[na][1] - b[nb][1]) ** 2
        if best is None or err < best[0]: best = (err, off)
    return best[1]

def bake_look(bike_dir, work, look):
    top, head, legs = look.split('-'); D.OUTFIT.update(top=top, head=head, legs=legs)
    os.makedirs(work, exist_ok=True)
    out, logs = {}, {}
    for facing in FACE:
        rider, logs[facing] = ride_frames(bike_dir, work, facing)
        out[facing] = [compose(r, f'{bike_dir}/bike-{FACE[facing][0]}-{i}.png') for i, r in enumerate(rider)]
        src = facing; dst, = [k for k, v in MIRROR.items() if v[0] == src]
        yaw = MIRROR[dst][1]; off = mirror_offset(bike_dir, FACE[src][0], yaw)
        out[dst] = []
        for i in range(N):
            j = (i - off) % N   # bike frame i at the mirrored yaw matches source frame j
            b_, f_ = rider[j]
            mb = with_frame(lambda: D.edge(D.relight(D.mirror(b_)))); mf = with_frame(lambda: D.edge(D.relight(D.mirror(f_))))
            out[dst].append(compose((mb, mf), f'{bike_dir}/bike-{yaw}-{i}.png'))
    return out, logs

def bake_city(look_dir, out):
    """2 sheet px per street px, like the doll; the ride frame is bigger than the walk's, so the clip names its own size"""
    m = json.load(open(f'{look_dir}/avatar3d.json'))
    for facing, frames in out.items():
        compass = D.COMPASS[facing]
        strip = Image.new('RGBA', (RFW * 2 * N, RFH * 2), (0, 0, 0, 0))
        for i, f in enumerate(frames): strip.alpha_composite(f.resize((RFW * 2, RFH * 2), Image.NEAREST), (i * RFW * 2, 0))
        name = f'ride-{compass}.png'; strip.save(f'{look_dir}/{name}')
        m['animations'][f'ride_{compass}'] = {'file': name, 'outlineFile': name, 'frames': N, 'fps': RIDE_FPS, 'repeat': -1,
                                              'durationS': round(N / RIDE_FPS, 3), 'speedWuPerS': RIDE_SPEED,
                                              'frameWidth': RFW * 2, 'frameHeight': RFH * 2, 'origin': [0.5, round(RGROUND / RFH, 5)]}
    json.dump(m, open(f'{look_dir}/avatar3d.json', 'w'), indent=1)

if __name__ == '__main__':
    bike_dir, work = sys.argv[1], sys.argv[2]
    city = sys.argv[3] if len(sys.argv) > 3 else None
    looks = sys.argv[4].split(',') if len(sys.argv) > 4 else ['tee-none-denim']
    for look in looks:
        out, logs = bake_look(bike_dir, f'{work}/{look}', look)
        print(look, json.dumps(logs))
        for facing, frames in out.items():
            strip = Image.new('RGBA', (RFW * N, RFH), (0, 0, 0, 0))
            for i, f in enumerate(frames): strip.alpha_composite(f, (i * RFW, 0))
            strip.save(f'{work}/ride-{look}-{facing}.png')
        if city: bake_city(f'{city}/2d-{look}', out)

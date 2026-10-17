"""Avatar builder base body (round 2): low-poly, UV-mapped mannequin plus the base outfit.

Run headless:
  blender --background --factory-startup --python art/avatar-builder/base/build_base.py

Writes base.blend and base.glb next to this script (the GLB is copied to public/ by the caller).
Units: Blender metres = world units. 0.9 wu tall, origin on the ground between the feet,
front faces -Y (glTF turns that into +Z, same as the shipped city avatar).
Spec (round 1): 54 px figure, head 1:4.2, shoulders ~17/33 of the 33 px frame, straight legs with a gap.
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
H = 0.9                      # total height (wu)
PX = H / 54.0                # one sprite pixel at street zoom (54 px figure)
HEAD = H / 4.2               # head height incl. hair
SEG = 12                     # ring segments for limbs and torso

COLORS = {                   # flat base colours (linear conversion happens in Blender)
    'skin': '#f0c3a0',
    'hair': '#c4602a',
    'moustache': '#d48a5c',
    'eye': '#2a1d18',
    'tee': '#f5f2ea',
    'denim': '#223680',
    'cuff': '#5274bd',
    'shoe': '#1e1a1a',
    'welt': '#e6c13a',
    'sole': '#141212',
    'hoodie': '#6e6e73',
    'hoodie-pocket': '#5f5f64',
    'string': '#e9e7e1',
    'beanie': '#dca528',
    'beanie-cuff': '#c8941f',
    'sweater': '#3c5a46',
    'sweater-rib': '#253a2c',
    'club-white': '#fafafa',
    'club-blue': '#0046a0',
    'cargo': '#968769',
    'cargo-dark': '#6c5f47',
}


def srgb(hexstr):
    h = hexstr.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def material(name):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = srgb(COLORS[name])
    bsdf.inputs['Roughness'].default_value = 1.0
    mat.diffuse_color = srgb(COLORS[name])
    return mat


def new_object(name, bm, mats):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    for m in mats:
        obj.data.materials.append(material(m))
    bpy.context.collection.objects.link(obj)
    return obj


def loft(bm, uv, rings, mat_index=0, cap_start=True, cap_end=True, seg=SEG, mats_by_ring=None):
    """rings: list of (center, u_axis, v_axis, ru, rv). Ellipse ring i spans center + ru*cos*u + rv*sin*v.
    Angle 0 sits on +v so the UV seam runs down the back for vertical parts (v = +Y = back)."""
    cols = []
    for (c, u, v, ru, rv) in rings:
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            p = Vector(c) + Vector(u) * (ru * math.sin(a)) + Vector(v) * (rv * math.cos(a))
            ring.append(bm.verts.new(p))
        cols.append(ring)
    n = len(rings)
    for i in range(n - 1):
        for k in range(seg):
            k2 = (k + 1) % seg
            f = bm.faces.new((cols[i][k], cols[i][k2], cols[i + 1][k2], cols[i + 1][k]))
            f.material_index = mats_by_ring[i] if mats_by_ring else mat_index
            for loop in f.loops:
                vi = cols[i].index(loop.vert) if loop.vert in cols[i] else None
                row = i if vi is not None else i + 1
                col = vi if vi is not None else cols[i + 1].index(loop.vert)
                if col == 0 and loop.vert in (cols[i][k2], cols[i + 1][k2]) and k2 == 0:
                    col = seg
                loop[uv].uv = (col / seg, row / (n - 1))
    for idx, flag in ((0, cap_start), (n - 1, cap_end)):
        if not flag:
            continue
        ring = cols[idx] if idx == n - 1 else list(reversed(cols[idx]))
        f = bm.faces.new(ring)
        f.material_index = (mats_by_ring[min(idx, n - 2)] if mats_by_ring else mat_index)
        c, u, v, ru, rv = rings[idx]
        for loop in f.loops:
            d = loop.vert.co - Vector(c)
            loop[uv].uv = (0.5 + d.dot(Vector(u)) / (2.2 * max(ru, 1e-4)),
                           0.5 + d.dot(Vector(v)) / (2.2 * max(rv, 1e-4)))
    return cols


X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)


def vring(z, rx, ry, cx=0.0, cy=0.0):
    return ((cx, cy, z), X, Y, rx, ry)


def ellipsoid(bm, uv, center, radii, mat_index, segs=16, rings=10, shape=None, keep=None):
    """UV sphere scaled to radii. shape(p) may move a unit-sphere point; keep(p) drops faces."""
    grid = []
    for r in range(rings + 1):
        th = math.pi * r / rings
        row = []
        for s in range(segs + 1):
            ph = 2 * math.pi * s / segs
            p = Vector((math.sin(th) * math.sin(ph), -math.sin(th) * math.cos(ph), math.cos(th)))
            if shape:
                p = shape(p)
            row.append(p)
        grid.append(row)
    verts = {}

    def vert(r, s):
        key = (r, s % segs) if 0 < r < rings else (r, 0)
        if key not in verts:
            p = grid[r][s]
            verts[key] = bm.verts.new(Vector(center) + Vector((p.x * radii[0], p.y * radii[1], p.z * radii[2])))
        return verts[key]

    for r in range(rings):
        for s in range(segs):
            mid = (grid[r][s] + grid[r + 1][s + 1]) / 2
            if keep and not keep(mid):
                continue
            quad = [vert(r, s), vert(r, s + 1), vert(r + 1, s + 1), vert(r + 1, s)]
            uvs = [(s / segs, 1 - r / rings), ((s + 1) / segs, 1 - r / rings),
                   ((s + 1) / segs, 1 - (r + 1) / rings), (s / segs, 1 - (r + 1) / rings)]
            uniq, uq = [], []
            for v_, t in zip(quad, uvs):
                if v_ not in uniq:
                    uniq.append(v_)
                    uq.append(t)
            if len(uniq) < 3:
                continue
            f = bm.faces.new(uniq)
            f.material_index = mat_index
            for loop, t in zip(f.loops, uq):
                loop[uv].uv = t


# ---- proportions (wu) -------------------------------------------------------------------------
HEAD_TOP = H
HEAD_C = (0.0, 0.004, H - HEAD * 0.47 - 0.016)  # skull centre; hair shell tops out at H
SKULL = (0.084, 0.088, HEAD * 0.47)          # skull radii; hair adds the rest on top
SHOULDER_Z = 0.632
SHOULDER_X = 0.098
ARM_ANGLE = math.radians(15)                 # A-pose, out from vertical
LEG_X = 0.052                                # leg centre; inner gap = 2 * (LEG_X - leg radius)
HEM_Z = 0.40
CUFF_TOP, CUFF_BOT = 0.106, 0.072            # 2 px rolled cuff

TORSO = [  # (z, rx, ry) of the skin torso
    (0.35, 0.084, 0.052), (0.42, 0.080, 0.050), (0.48, 0.078, 0.050), (0.56, 0.088, 0.054),
    (0.62, 0.092, 0.052), (0.655, 0.075, 0.044), (0.675, 0.032, 0.028)]
TEE_PAD = 0.008


def arm_frame(side):
    d = Vector((side * math.sin(ARM_ANGLE), 0, -math.cos(ARM_ANGLE)))
    u = Vector((math.cos(ARM_ANGLE) * side, 0, math.sin(ARM_ANGLE) * side))
    return Vector((side * SHOULDER_X, 0.0, SHOULDER_Z)), d, u


def arm_rings(side, stations):
    o, d, u = arm_frame(side)
    return [(tuple(o + d * t), tuple(u), Y, ru, rv) for (t, ru, rv) in stations]


def build_body():
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    # head (skin) with a slightly narrower jaw
    def jaw(p):
        if p.z < 0:
            k = 1 - 0.18 * (-p.z)
            return Vector((p.x * k, p.y * (1 - 0.08 * (-p.z)), p.z))
        return p
    ellipsoid(bm, uv, HEAD_C, SKULL, 0, segs=16, rings=10, shape=jaw)
    # neck
    loft(bm, uv, [vring(0.64, 0.03, 0.028, cy=0.006), vring(HEAD_C[2] - SKULL[2] * 0.6, 0.03, 0.028, cy=0.006)], 0, seg=8)
    # torso
    loft(bm, uv, [vring(z, rx, ry) for z, rx, ry in TORSO], 0)
    # legs and feet
    for side in (-1, 1):
        cx = side * LEG_X
        loft(bm, uv, [vring(0.03, 0.026, 0.026, cx), vring(0.20, 0.028, 0.030, cx),
                      vring(0.36, 0.034, 0.038, cx)], 0, seg=10)
        # arms: upper arm, elbow, forearm, wrist, hand
        loft(bm, uv, arm_rings(side, [(-0.01, 0.032, 0.034), (0.07, 0.030, 0.031), (0.14, 0.026, 0.027),
                                      (0.20, 0.024, 0.024), (0.255, 0.020, 0.019), (0.27, 0.025, 0.017),
                                      (0.30, 0.024, 0.016), (0.312, 0.012, 0.010)]), 0, seg=10)
    obj = new_object('body', bm, ['skin'])
    return obj


def build_face():
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    front_y = HEAD_C[1] - SKULL[1]
    ez = HEAD_C[2] + 0.014
    for side in (-1, 1):  # eyes: one dark quad each, sits on the face
        loft(bm, uv, [((side * 0.031, front_y + 0.012, ez), X, Z, 0.012, 0.017),
                      ((side * 0.031, front_y - 0.002, ez), X, Z, 0.012, 0.017)], 0, seg=6)
    # light moustache: a flat bar under the nose
    mz = HEAD_C[2] - SKULL[2] * 0.30
    loft(bm, uv, [((0, front_y + 0.018, mz), X, Z, 0.030, 0.0075),
                  ((0, front_y + 0.004, mz), X, Z, 0.030, 0.0075)], 1, seg=8)
    return new_object('face', bm, ['eye', 'moustache'])


def build_hair():
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    radii = (SKULL[0] + 0.010, SKULL[1] + 0.010, SKULL[2] + 0.012)
    # short crop: covers the crown, cut high at the forehead and low at the nape
    keep = lambda p: p.z > 0.30 + 0.32 * (-p.y) - 0.1 * abs(p.x)
    ellipsoid(bm, uv, (HEAD_C[0], HEAD_C[1] + 0.002, HEAD_C[2] + 0.004), radii, 0, segs=16, rings=10, keep=keep)
    return new_object('hair', bm, ['hair'])


def build_tee():
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    rings = [vring(HEM_Z, 0.090, 0.060)] + [vring(z, rx + TEE_PAD, ry + TEE_PAD) for z, rx, ry in TORSO if z > HEM_Z]
    rings[-1] = vring(0.678, 0.038, 0.034)  # crew collar, a touch wider than the neck
    loft(bm, uv, rings, 0)
    for side in (-1, 1):  # short sleeves to mid upper arm
        loft(bm, uv, arm_rings(side, [(-0.02, 0.040, 0.042), (0.03, 0.042, 0.042), (0.085, 0.038, 0.038)]), 0, seg=10)
    return new_object('tee', bm, ['tee'])


def build_jeans():
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    loft(bm, uv, [vring(0.33, 0.070, 0.050), vring(0.37, 0.088, 0.058), vring(0.415, 0.080, 0.051)], 0)
    for side in (-1, 1):
        cx = side * LEG_X
        # straight leg: one width top to bottom, then the rolled cuff (lighter inside of the denim)
        loft(bm, uv, [vring(CUFF_TOP, 0.034, 0.036, cx), vring(0.22, 0.035, 0.038, cx),
                      vring(0.38, 0.040, 0.044, cx)], 0, seg=10)
        loft(bm, uv, [vring(CUFF_BOT, 0.037, 0.039, cx), vring(CUFF_TOP + 0.002, 0.038, 0.040, cx)], 1, seg=10)
    return new_object('jeans', bm, ['denim', 'cuff'])


def build_shoes():
    """3-eye derby: chunky black sole, yellow welt line, round toe box. Rings run heel -> toe along -Y."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    SOLE_T, WELT_T = 0.017, 0.016
    heel, toe = 0.048, -0.118
    for side in (-1, 1):
        cx = side * LEG_X
        def box_rings(z0, z1, pad, steps):
            out = []
            for i, (y, w) in enumerate(steps):
                out.append(((cx, y, (z0 + z1) / 2), X, Z, w + pad, (z1 - z0) / 2))
            return out
        outline = [(heel + 0.002, 0.026), (heel - 0.012, 0.036), (0.0, 0.040), (-0.06, 0.042),
                   (toe + 0.020, 0.040), (toe + 0.004, 0.030), (toe - 0.002, 0.016)]
        # rings perpendicular to Y: swap axes so the loft runs along -Y
        def ring_y(y, w, zc, h):
            return ((cx, y, zc), X, Z, w, h)
        sole = [ring_y(y, w + 0.002, SOLE_T / 2, SOLE_T / 2) for y, w in outline]
        welt = [ring_y(y, w + 0.004, SOLE_T + WELT_T / 2, WELT_T / 2) for y, w in outline]
        loft(bm, uv, sole, 2, seg=8)
        loft(bm, uv, welt, 1, seg=8)
        # upper: tall at the heel and ankle, low round toe box
        top = [(heel, 0.085), (heel - 0.012, 0.090), (0.0, 0.088), (-0.05, 0.066),
               (toe + 0.020, 0.056), (toe + 0.006, 0.048), (toe, 0.040)]
        base = SOLE_T + WELT_T - 0.004
        upper = []
        for (y, w), (_, t) in zip(outline, top):
            upper.append(ring_y(y, w - 0.002, (base + t) / 2, (t - base) / 2))
        loft(bm, uv, upper, 0, seg=10)
    return new_object('shoes', bm, ['shoe', 'welt', 'sole'])


def patch(bm, uv, rows, mat_index, cols=6, cx=0.0, a0=0.0):
    """Strip on an elliptic shell centred on x = cx. rows: (z, rx, ry, half_angle); angle 0 = front (-Y),
    a0 turns the strip's centre towards +X."""
    grid = []
    for (z, rx, ry, ha) in rows:
        grid.append([bm.verts.new((cx + rx * math.sin(a), -ry * math.cos(a), z))
                     for a in (a0 - ha + 2 * ha * c / cols for c in range(cols + 1))])
    for r in range(len(rows) - 1):
        for c in range(cols):
            f = bm.faces.new((grid[r][c], grid[r + 1][c], grid[r + 1][c + 1], grid[r][c + 1]))
            f.material_index = mat_index
            for loop, t in zip(f.loops, ((c, r), (c, r + 1), (c + 1, r + 1), (c + 1, r))):
                loop[uv].uv = (t[0] / cols, t[1] / (len(rows) - 1))


HOODIE_HEM = HEM_Z - 2 * PX  # 2 px below the tee hem at street zoom


def build_hoodie():
    """Grey pullover hoodie: longer and wider than the tee, long sleeves, hood bunched behind the neck,
    kangaroo pocket and two drawstrings. Worn over the tee (the tee is hidden while it is on)."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    pad = 0.018
    body = [vring(HOODIE_HEM, 0.098, 0.068), vring(HOODIE_HEM + 0.014, 0.102, 0.070)]
    body += [vring(z, rx + pad, ry + pad) for z, rx, ry in TORSO if HOODIE_HEM + 0.02 < z < 0.67]
    body.append(vring(0.68, 0.050, 0.045))
    loft(bm, uv, body, 0)
    for side in (-1, 1):  # long sleeves with a rib cuff at the wrist; the hand stays out
        loft(bm, uv, arm_rings(side, [(-0.02, 0.050, 0.052), (0.05, 0.046, 0.047), (0.14, 0.040, 0.041),
                                      (0.21, 0.036, 0.036), (0.235, 0.033, 0.033), (0.25, 0.030, 0.030),
                                      (0.258, 0.029, 0.028)]), 0, seg=10)
    # hood, bunched behind and beside the neck (front stays inside the neck so the throat shows)
    loft(bm, uv, [vring(0.63, 0.080, 0.060, cy=0.028), vring(0.665, 0.086, 0.062, cy=0.045),
                  vring(0.70, 0.070, 0.056, cy=0.054), vring(0.73, 0.040, 0.034, cy=0.060)], 0)
    # kangaroo pocket: trapezoid patch on the belly, narrower at the top
    patch(bm, uv, [(0.385, 0.104, 0.074, 0.78), (0.425, 0.102, 0.073, 0.68), (0.465, 0.100, 0.073, 0.56)], 1)
    # drawstrings, following the chest down from the neckline
    for side in (-1, 1):
        x = side * 0.022
        loft(bm, uv, [vring(0.570, 0.006, 0.006, x, -0.075), vring(0.578, 0.0045, 0.0045, x, -0.076),
                      vring(0.620, 0.0045, 0.0045, x, -0.074), vring(0.660, 0.0045, 0.0045, x, -0.064)], 2, seg=6)
    return new_object('hoodie', bm, ['hoodie', 'hoodie-pocket', 'string'])


def build_beanie():
    """Mustard cuffed beanie over the short crop: folded cuff ~1 px wider than the head, dome, small crown bump.
    The cuff sits level with the brow line at the front and lower at the nape."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    ch = Vector((HEAD_C[0], HEAD_C[1] + 0.002, HEAD_C[2] + 0.004))     # hair shell centre
    front_z, back_z = ch.z + 0.040, ch.z + 0.016
    slope = (back_z - front_z) / (2 * 0.098)                            # dz per +Y (towards the back)
    v_axis = Vector((0, 1, slope)).normalized()
    def cuff_ring(dz, rx, ry):
        c = Vector((0, ch.y, (front_z + back_z) / 2 + dz))
        return (tuple(c), X, tuple(v_axis), rx, ry)
    # the cuff hugs the head (about 1 px wider than the hair at street zoom), only a touch proud of the dome
    loft(bm, uv, [cuff_ring(0.0, 0.100, 0.104), cuff_ring(0.018, 0.103, 0.107), cuff_ring(0.036, 0.100, 0.104)],
         1, cap_start=False, cap_end=False, seg=16)
    radii = (0.100, 0.104, 0.120)
    tilt = slope * radii[1] / radii[2]
    def knit(p):  # fuller dome: the sides stay upright, then round over the top (no brim step at the cuff)
        h = math.sqrt(max(1e-6, 1 - p.z * p.z))
        k = h ** -0.65 if p.z > 0 else 1.0
        return Vector((p.x * k, p.y * k, p.z))
    keep = lambda p: p.z > 0.30 + tilt * p.y
    ellipsoid(bm, uv, tuple(ch), radii, 0, segs=16, rings=12, shape=knit, keep=keep)
    ellipsoid(bm, uv, (ch.x, ch.y + 0.008, ch.z + radii[2] - 0.006), (0.032, 0.032, 0.018), 0, segs=8, rings=5)
    return new_object('beanie', bm, ['beanie', 'beanie-cuff'])


def build_sweater():
    """Dark green crew-neck sweater: tee width, hem 1 px below the tee hem, long sleeves, darker rib at the
    neck, hem and cuffs. Worn over the tee (hidden while it is on); shares the top slot with the hoodie."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    pad = TEE_PAD + 0.001
    hem = HEM_Z - PX
    rings = [vring(hem, 0.087, 0.057), vring(HEM_Z + 0.008, 0.089, 0.059)]
    rings += [vring(z, rx + pad, ry + pad) for z, rx, ry in TORSO if HEM_Z + 0.01 < z < 0.66]
    # crew neck: a raised rib band standing just proud of the shoulders
    rings += [vring(0.664, 0.058, 0.046), vring(0.672, 0.052, 0.044), vring(0.684, 0.041, 0.038), vring(0.690, 0.036, 0.034)]
    mats = [1] + [0] * (len(rings) - 5) + [1, 1, 1]
    loft(bm, uv, rings, 0, mats_by_ring=mats)
    for side in (-1, 1):
        loft(bm, uv, arm_rings(side, [(-0.02, 0.041, 0.043), (0.05, 0.038, 0.039), (0.14, 0.033, 0.034),
                                      (0.21, 0.030, 0.030), (0.232, 0.029, 0.029), (0.258, 0.027, 0.026)]),
             0, seg=10, mats_by_ring=[0, 0, 0, 0, 1])
    return new_object('sweater', bm, ['sweater', 'sweater-rib'])


def build_club_shirt():
    """The football club shirt: tee cut, white body, blue short sleeves, a blue collar line and one blue
    chest band 2 px tall at street zoom. Hides the tee; shares the top slot with the hoodie and sweater."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    pad = TEE_PAD + 0.001
    band_lo, band_hi = 0.535, 0.535 + 2 * PX
    def torso_at(z):  # skin torso radii, interpolated between the TORSO stations
        for (z0, ax, ay), (z1, bx, by) in zip(TORSO, TORSO[1:]):
            if z0 <= z <= z1:
                t = (z - z0) / (z1 - z0)
                return ax + (bx - ax) * t, ay + (by - ay) * t
        raise ValueError(z)
    zs = [0.42, 0.48, band_lo, band_hi, 0.62, 0.655]
    rings = [vring(HEM_Z, 0.091, 0.061)] + [vring(z, torso_at(z)[0] + pad, torso_at(z)[1] + pad) for z in zs]
    rings += [vring(0.667, 0.056, 0.044), vring(0.679, 0.039, 0.035)]  # collar: last band is the blue line
    mats = [0, 0, 0, 1, 0, 0, 0, 1]
    loft(bm, uv, rings, 0, mats_by_ring=mats)
    for side in (-1, 1):
        loft(bm, uv, arm_rings(side, [(-0.02, 0.041, 0.043), (0.03, 0.043, 0.043), (0.085, 0.039, 0.039)]), 1, seg=10)
    return new_object('clubShirt', bm, ['club-white', 'club-blue'])


def build_cargo():
    """Sand-wash cargo trousers: baggier than the denim (about 1 px wider per leg at street zoom), a darker
    thigh pocket on the outer side of each leg, darker elastic hem at the ankle, no rolled cuff.
    Replaces the jeans (legs slot)."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    loft(bm, uv, [vring(0.33, 0.074, 0.052), vring(0.37, 0.094, 0.062), vring(0.415, 0.082, 0.053)], 0)
    for side in (-1, 1):
        cx = side * 0.056
        # elastic hem cinched just above the shoe top, then the leg balloons out a little above it;
        # the leg narrows again at the top so the gap between the legs survives at street zoom
        loft(bm, uv, [vring(0.082, 0.037, 0.039, cx), vring(0.110, 0.038, 0.040, cx),
                      vring(0.124, 0.043, 0.045, cx), vring(0.17, 0.045, 0.047, cx),
                      vring(0.28, 0.044, 0.047, cx), vring(0.385, 0.042, 0.048, cx)], 0, seg=10,
             mats_by_ring=[1, 0, 0, 0, 0])
        # thigh pocket: on the outer side, turned towards the front so it shows in the front view
        patch(bm, uv, [(0.200, 0.049, 0.052, 0.40), (0.245, 0.049, 0.052, 0.40), (0.290, 0.048, 0.051, 0.40)],
              1, cols=4, cx=cx, a0=side * 0.85)
    return new_object('cargo', bm, ['cargo', 'cargo-dark'])


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    base = [build_body(), build_face(), build_hair(), build_tee(), build_jeans(), build_shoes()]
    parts = base + [build_hoodie(), build_beanie(), build_sweater(), build_club_shirt(), build_cargo()]
    tris = 0
    for obj in parts:
        bpy.context.view_layer.objects.active = obj
        for o in bpy.context.selected_objects:
            o.select_set(False)
        obj.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.mesh.faces_shade_smooth()
        bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.pack_islands(margin=0.01)
        bpy.ops.object.mode_set(mode='OBJECT')
        obj.select_set(False)
        t = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        tris += t
        print(f'[base] {obj.name}: {t} tris')
    print(f'[base] TOTAL {tris} tris (all pieces loaded at once)')
    zs = [(o.matrix_world @ v.co).z for o in base for v in o.data.vertices]
    print(f'[base] base outfit height {min(zs):.4f} .. {max(zs):.4f}')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'base.blend'))
    for o in parts:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'base.glb'), export_format='GLB',
                              use_selection=True, export_apply=True, export_yup=True)


main()

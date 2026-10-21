"""Proportion pass (round 30): a longer torso and shorter legs, same head and same total height.
The sheet kept real body lengths under the bigger 1:4.2 head, so the legs read about twice the torso. Every 2D
part (builder layers and the city doll) is drawn in sheet units and then remapped in y by one piecewise-linear
map: the head and shoulders stay put, the torso stretches, the legs shorten, the shoe uppers get lower
(round 30c) and the soles stay put.
Hands (and gloves) are marked data-w="hand" and move rigidly with the wrist instead of being squashed.
One head = 240 units (1010 / 4.2).  Before: shoulders to crotch 1.1 heads, crotch to floor 1.96 heads.
After: shoulders to crotch 1.5 heads, crotch to floor 1.5 heads."""
import re

# (sheet y, new y) knots; linear between, identity outside
KNOTS = [(300, 300), (530, 630), (925, 945), (976, 976)]
WRIST = 590          # hands below this follow the wrist rigidly


def W(y):
    if y <= KNOTS[0][0] or y >= KNOTS[-1][0]:
        return y
    for (a, fa), (b, fb) in zip(KNOTS, KNOTS[1:]):
        if a <= y <= b:
            return fa + (y - a) * (fb - fa) / (b - a)
    return y


def WH(y):
    return W(y) if y <= WRIST else y + (W(WRIST) - WRIST)


def hand(el):
    """Mark an element as part of a hand or glove."""
    return re.sub(r'^<(\w+)', r'<\1 data-w="hand"', el, count=1)


_NUM = r'-?\d+(?:\.\d+)?'


def _path(d, f):
    out, cmd, idx = [], None, 0
    for tok in re.findall(r'[A-Za-z]|' + _NUM, d):
        if tok.isalpha():
            cmd, idx = tok, 0
            out.append(tok)
            continue
        v = float(tok)
        if cmd in 'MLCQTS' and idx % 2 == 1:      # absolute: every second number is a y
            v = f(v)
        elif cmd == 'V':
            v = f(v)
        idx += 1
        out.append(f'{v:.1f}' if v != int(v) else str(int(v)))
    return ' '.join(out).replace(' Z', ' Z')


def _attr(tag, name, f):
    return re.sub(rf'(\s{name}=")({_NUM})(")', lambda m: m.group(1) + f'{f(float(m.group(2))):.1f}' + m.group(3), tag)


def _tag(tag):
    f = WH if 'data-w="hand"' in tag else W
    tag = re.sub(r'(\sd=")([^"]*)(")', lambda m: m.group(1) + _path(m.group(2), f) + m.group(3), tag)
    if tag.startswith('<rect'):
        y = re.search(rf'\sy="({_NUM})"', tag); h = re.search(rf'\sheight="({_NUM})"', tag)
        if y and h:
            y0, y1 = float(y.group(1)), float(y.group(1)) + float(h.group(1))
            tag = _attr(tag, 'height', lambda _: f(y1) - f(y0))
        tag = _attr(tag, 'y', f)
    if tag.startswith('<ellipse'):
        cy = re.search(rf'\scy="({_NUM})"', tag)
        if cy:
            c = float(cy.group(1))
            tag = _attr(tag, 'ry', lambda r: (f(c + r) - f(c - r)) / 2)
    if tag.startswith('<circle') or tag.startswith('<ellipse'):
        tag = _attr(tag, 'cy', f)
    for n in ('y1', 'y2'):
        tag = _attr(tag, n, f)
    tag = re.sub(rf'rotate\(({_NUM})\s+({_NUM})\s+({_NUM})\)',
                 lambda m: f'rotate({m.group(1)} {m.group(2)} {W(float(m.group(3))):.1f})', tag)
    return tag


def warp(svg):
    """Remap every y in an SVG fragment (paths, circles, ellipses, rects, lines, rotate pivots)."""
    return re.sub(r'<(?:path|circle|ellipse|rect|line|g)\b[^>]*>', lambda m: _tag(m.group(0)), svg)

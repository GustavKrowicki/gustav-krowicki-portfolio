"""2D builder head, layered SVG (round 16). Built from the approved round 14 sheet (sheet.py).
Layers, back to front: ears, face, face-shade, features, hair, hat. Each is a <g id="layer-..."> so the builder
can swap one without touching the others. Shading: the city's soft two-step look (lit, shade with a softened
terminator), light from the upper left, edges in a darker shade of the local colour; a dark line only where
two parts meet (hair on skin, hat on hair)."""
import sys, re
sys.path.insert(0, __file__.rsplit('/', 1)[0])
src = open(__file__.rsplit('/', 1)[0] + '/sheet.py').read().split("if __name__ == '__main__':")[0]
exec(src)

SOFT = '<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>'
MEET = '#3a2418'   # the one dark line, only where parts meet

def layers(expr):
    parts = head_front(expr)
    # split head_front's output into layers by what each element draws
    ears, face, shade_, feat, hair = [], [], [], [], []
    for el in parts:
        if 'C{X(294)}' in el: pass
    # head_front order: 2 ears (+inner lines), face, face shade, chin line, stubble, eyes..., nose, moustache,
    # mouth, hair cap, hair shade, hair texture
    i = 0
    ears = parts[0:4]; i = 4
    face = [parts[i]]; i += 1
    shade_ = [parts[i].replace('/>', ' filter="url(#soft)"/>')]; i += 1
    hair_start = next(k for k, el in enumerate(parts) if C['hair'][0] in el and el.startswith('<path') and 'stroke=' in el)
    feat = parts[i:hair_start]
    hair = parts[hair_start:]
    # the meeting line: hair cap edge over the forehead in the dark line colour
    hair[0] = re.sub(r'stroke="[^"]+"', f'stroke="{MEET}"', hair[0])
    return {'ears': ears, 'face': face, 'face-shade': shade_, 'features': feat, 'hair': hair}

def beanie():
    lit, sh, edge = '#dca528', '#b98617', '#8a6210'
    g = [f'<path d="M124 96 C118 44 150 6 200 4 C250 6 282 44 276 96 Z" fill="{lit}" stroke="{edge}" stroke-width="3"/>',
         f'<path d="M234 10 C262 22 280 50 276 96 L250 96 C254 60 248 30 234 10 Z" fill="{sh}" filter="url(#soft)"/>',
         f'<ellipse cx="200" cy="8" rx="11" ry="6" fill="{lit}" stroke="{edge}" stroke-width="2.5"/>']
    for x in range(140, 262, 12):
        g.append(f'<path d="M{x} 30 Q{x + 2} 60 {x + 1} 90" fill="none" stroke="{sh}" stroke-width="2"/>')
    # folded cuff: a band just above the brows, about 1 px wider than the head at street zoom
    g.append(f'<path d="M118 78 Q200 66 282 78 L284 108 L278 120 Q200 100 122 120 L116 108 Z" fill="{lit}" stroke="{MEET}" stroke-width="3"/>')
    g.append(f'<path d="M244 72 Q266 74 282 78 L284 108 Q266 104 246 102 Z" fill="{sh}" filter="url(#soft)"/>')
    for x in range(124, 280, 8):
        g.append(f'<path d="M{x} {80 - abs(x - 200) * -0.0} L{x} 104" stroke="{sh}" stroke-width="2"/>')
    return g

def head_svg(expr, hat=False, view='90 -10 220 290', w=440, h=580):
    L = layers(expr)
    order = ['ears', 'face', 'face-shade', 'features', 'hair']
    body = [f'<defs>{SOFT}</defs>']
    neck = [shape('M178 226 L222 226 L224 266 Q200 280 176 266 Z', 'skin'),
            shade('M178 230 Q200 250 222 230 L222 246 Q200 262 178 246 Z', 'skin').replace('/>', ' filter="url(#soft)"/>')]
    body.append('<g id="layer-neck">' + ''.join(neck) + '</g>')
    for k in order:
        body.append(f'<g id="layer-{k}">' + ''.join(L[k]) + '</g>')
    body.append('<g id="layer-hat">' + (''.join(beanie()) if hat else '') + '</g>')
    return svg('\n'.join(body), w, h, view=view)

if __name__ == '__main__':
    out = sys.argv[1]
    for expr in ('neutral', 'smile'):
        for hat in (False, True):
            open(f'{out}/head-{expr}{"-beanie" if hat else ""}.svg', 'w').write(head_svg(expr, hat))

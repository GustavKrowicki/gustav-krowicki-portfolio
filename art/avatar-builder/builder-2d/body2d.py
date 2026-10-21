"""2D builder body, layered SVG (round 17): the approved sheet's front view split into swappable layers,
with the soft two-step shading (shade layers softened) and the dark line only where parts meet.
Layer order, back to front: legs, shoes, arms, top, neck, head (and the head's own sub-layers)."""
import sys, re
here = __file__.rsplit('/', 1)[0]
exec(open(here + '/sheet.py').read().split("if __name__ == '__main__':")[0])
SOFT = '<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4"/></filter>'
SHADES = {v[1] for v in C.values()}
def soften(el):
    # only the shade shapes (filled in a part's shade colour, no stroke) get the soft terminator
    m = re.search(r'fill="(#[0-9a-f]{6})"', el)
    return (el.replace('/>', ' filter="url(#soft)"/>')
            if el.startswith('<path') and 'stroke=' not in el and m and m.group(1) in SHADES else el)
def front_layers(expr='neutral', fn=None):
    out, cur = {}, None
    for el in (fn() if fn else front(expr=expr)).split('\n'):
        m = re.match(r'<!--layer:([\w-]+)-->', el)
        if m: cur = m.group(1); out[cur] = []; continue
        if cur: out[cur].append(soften(el))
    return out
def body_svg(expr='neutral', hidden=()):
    L = front_layers(expr)
    body = [f'<defs>{SOFT}</defs>']
    for k in ('legs', 'shoes', 'arms', 'top', 'neck', 'head'):
        body.append(f'<g id="layer-{k}"{" display=\"none\"" if k in hidden else ""}>' + '\n'.join(L[k]) + '</g>')
    return svg('\n'.join(body), 400, 1010)
ORDER_34 = ('legs', 'shoes', 'arm-far', 'top', 'arm-near', 'neck', 'head')
def three_quarter_svg(hidden=()):
    L = front_layers(fn=three_quarter)
    body = [f'<defs>{SOFT}</defs>']
    for k in ORDER_34:
        body.append(f'<g id="layer-{k}"{" display=\"none\"" if k in hidden else ""}>' + '\n'.join(L[k]) + '</g>')
    return svg('\n'.join(body), 400, 1010)

if __name__ == '__main__':
    out = sys.argv[1]
    open(f'{out}/body-neutral.svg', 'w').write(body_svg('neutral'))
    open(f'{out}/body-smile.svg', 'w').write(body_svg('smile'))
    open(f'{out}/body-34.svg', 'w').write(three_quarter_svg())
    for k in ORDER_34:
        open(f'{out}/layer34-{k}.svg', 'w').write(three_quarter_svg(tuple(x for x in ORDER_34 if x != k)))
    # layer proof: each layer on its own
    for k in ('legs', 'shoes', 'arms', 'top', 'neck', 'head'):
        hide = tuple(x for x in ('legs', 'shoes', 'arms', 'top', 'neck', 'head') if x != k)
        open(f'{out}/layer-{k}.svg', 'w').write(body_svg('neutral', hide))

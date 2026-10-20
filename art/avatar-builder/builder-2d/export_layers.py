"""Export the 2D builder layers (front view) as separate SVG files that share one viewBox, for the builder's
layer view (components/shell/sections/AvatarLayerView.tsx).  python3 export_layers.py <public dir>"""
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from warp import warp
B = open(here + '/body2d.py').read(); exec(B[:B.index("\nif __name__ ==")])
H = open(here + '/head2d.py').read()
MEET = '#3a2418'
exec(H[H.index('def beanie():'):H.index('def head_svg(')])
VIEW = '0 0 400 1010'
def layer_svg(parts):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VIEW}"><defs>{SOFT}</defs>' + warp('\n'.join(parts)) + '</svg>')
if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    n = front_layers('neutral'); sm = front_layers('smile')
    files = {'legs-denim': n['legs'], 'shoes-base': n['shoes'], 'arms': n['arms'], 'top-tee': n['top'],
             'neck': n['neck'], 'head-neutral': n['head'], 'head-smile': sm['head'], 'hat-beanie': [x for x in beanie()]}
    from pieces2d import PIECE_C, hoodie_front, sweater_front, club_front, cargo_front, ski_front, skipants_front, helmet_front
    C.update(PIECE_C)
    # the tee's crew rib belongs to the tee, not to the neck (other tops have their own collar)
    rib = [x for x in files['neck'] if C['tee'][2] in x or '#ffffff' in x]
    files['neck'] = [x for x in files['neck'] if x not in rib]
    files['top-tee'] = files['top-tee'] + rib
    hoodie = [soften(x) for x in hoodie_front(shape, shade, line)]
    files['top-hoodie-back'] = hoodie[:1]          # the hood, behind the neck
    files['top-hoodie'] = hoodie[1:]
    files['top-sweater'] = [soften(x) for x in sweater_front(shape, shade, line)]
    files['top-club'] = [soften(x) for x in club_front(shape, shade, line)]
    files['legs-cargo'] = [soften(x) for x in cargo_front(shape, shade, line)]
    files['top-ski'] = [soften(x) for x in ski_front(shape, shade, line)]
    files['legs-ski'] = [soften(x) for x in skipants_front(shape, shade, line)]
    files['hat-helmet'] = [soften(x) for x in helmet_front(shape, shade, line)]
    for name, parts in files.items():
        open(f'{out}/{name}.svg', 'w').write(layer_svg(parts))
    print(sorted(files))

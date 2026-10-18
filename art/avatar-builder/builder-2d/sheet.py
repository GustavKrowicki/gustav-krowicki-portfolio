# Model sheet turnaround, drawn as vector art from the photos. 1:4.2 head, real body lengths
# (shoulders 1.55 heads, legs 48 %, tee hem 57 % up). Light from the upper left: shade on the right of forms,
# edge = darker shade of the local colour, 1 dark line only where parts meet.
import sys
C = {
  'skin': ('#e6b89a', '#c9937a', '#9a6551'),
  'hair': ('#bf7852', '#9b5c3c', '#6b3c25'),
  'tee':  ('#f6f5f2', '#c9ccd9', '#9a9fb4'),
  'jean': ('#2b2829', '#1b1919', '#0c0b0b'),
  'cuff': ('#6b7385', '#525a6b', '#353b47'),
  'shoe': ('#211c1c', '#141111', '#070606'),
  'welt': ('#e6c13a', '#c49f22', '#8a6d10'),
  'eye':  ('#f3efe8', '#d9d2c6', '#8f857a'),
}
LINE = '#14100e'
HAIR_FRONT = ('M130 114 C126 84 128 52 150 32 C170 16 196 12 214 14 C244 16 268 32 274 62 C277 82 275 100 271 114 '
              'L266 112 C264 102 259 95 252 90 C246 74 234 66 222 72 C212 60 196 60 188 74 C176 66 160 72 150 88 '
              'C142 96 137 104 134 114 Z')
def shape(d, part, sw=3, shade=False, extra=''):
    lit, sh, edge = C[part]
    return f'<path d="{d}" fill="{sh if shade else lit}" stroke="{edge}" stroke-width="{sw}" stroke-linejoin="round" {extra}/>'
def shade(d, part, op=1.0):
    return f'<path d="{d}" fill="{C[part][1]}" opacity="{op}"/>'
def line(d, color, w=2.5, extra=''):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'

def arm(X, shade_side=False):
    """Upper arm out of the sleeve, elbow, forearm to the wrist. Normal build, not a stick."""
    g = [shape(f'M{X(302)} 402 L{X(352)} 395 C{X(358)} 450 {X(360)} 520 {X(356)} 590 L{X(320)} 594 C{X(313)} 522 {X(308)} 452 {X(302)} 402 Z', 'skin')]
    if shade_side:
        g.append(shade(f'M{X(336)} 400 L{X(352)} 395 C{X(358)} 450 {X(360)} 520 {X(356)} 590 L{X(340)} 592 C{X(342)} 520 {X(340)} 450 {X(336)} 400 Z', 'skin'))
    for fx, fy in ((332, 470), (342, 500), (326, 530), (346, 548), (334, 566), (322, 500)):
        g.append(f'<circle cx="{X(fx)}" cy="{fy}" r="2.1" fill="#c98e70" opacity=".8"/>')
    return g

def hand(X, s):
    """Relaxed hand at the side, palm towards the thigh: back of the hand, four fingers with knuckle
    breaks, the thumb in front on the body side."""
    g = [shape(f'M{X(320)} 588 L{X(356)} 586 C{X(362)} 604 {X(364)} 620 {X(362)} 636 '
               f'C{X(362)} 652 {X(358)} 668 {X(350)} 680 C{X(344)} 688 {X(334)} 688 {X(330)} 680 '
               f'C{X(324)} 666 {X(320)} 648 {X(320)} 630 Z', 'skin')]
    for x0, y0, x1, y1 in ((334, 640, 333, 680), (343, 638, 344, 682), (352, 634, 354, 672)):
        g.append(line(f'M{X(x0)} {y0} L{X(x1)} {y1}', C['skin'][2], 1.8))
    g.append(line(f'M{X(330)} 632 Q{X(342)} 628 {X(358)} 630', C['skin'][2], 1.6))
    g.append(shape(f'M{X(322)} 600 C{X(312)} 612 {X(308)} 628 {X(310)} 644 C{X(312)} 652 {X(320)} 652 {X(322)} 644 '
                   f'C{X(324)} 632 {X(326)} 620 {X(328)} 610 Z', 'skin'))
    return g

def head_front(expr='neutral'):
    """Long face, squarer jaw with a defined chin, ears that stand out, high hairline with cut-in temples,
    small deep-set eyes under a straight pale brow, faint moustache strokes, stubble speckle."""
    g = []
    for s in (-1, 1):
        X = lambda x: 200 + s * (x - 200)
        g.append(shape(f'M{X(272)} 120 C{X(290)} 110 {X(298)} 126 {X(296)} 142 C{X(294)} 160 {X(285)} 170 {X(271)} 167 Z', 'skin'))
        g.append(line(f'M{X(278)} 128 C{X(288)} 130 {X(290)} 147 {X(280)} 157', C['skin'][2], 2))
    g.append(shape('M200 38 C246 38 274 68 274 118 L272 168 C270 196 256 222 230 234 Q200 244 170 234 C144 222 130 196 128 168 L126 118 C126 68 154 38 200 38 Z', 'skin'))
    g.append(shade('M252 68 C268 84 274 100 274 118 L272 168 C270 196 256 222 232 233 C250 214 258 192 260 166 C262 128 262 96 252 68 Z', 'skin'))
    g.append(line('M186 228 Q200 233 214 228', C['skin'][2], 1.8))                 # defined chin
    smile = expr == 'smile'
    # stubble: light speckle over chin and jaw
    import random
    rnd = random.Random(7)
    for _ in range(70):
        a = rnd.uniform(0, 1); x = 150 + a * 100; y = 200 + rnd.uniform(0, 1) * 34 - abs(x - 200) * 0.28 + abs(x - 200) * 0.0
        if 186 < x < 214 and y < 212: continue
        g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.1" fill="#b98466" opacity=".55"/>')
    for s in (-1, 1):
        X = lambda x: 200 + s * (x - 200)
        cx = X(177)
        g.append(f'<ellipse cx="{cx}" cy="130" rx="15" ry="8" fill="{C["skin"][1]}" opacity=".7"/>')   # deep socket
        if smile:
            g.append(line(f'M{X(170)} 132 Q{X(177)} 127 {X(184)} 132', '#4a3027', 2.6))           # narrowed eye
            g.append(line(f'M{X(168)} 138 Q{X(177)} 141 {X(186)} 137', C['skin'][2], 1.6))
            g.append(f'<ellipse cx="{X(160)}" cy="160" rx="14" ry="9" fill="#e7a58f" opacity=".35"/>')  # raised cheek
        else:
            g.append(f'<ellipse cx="{cx}" cy="132" rx="5.6" ry="3.2" fill="{C["eye"][0]}"/>')
            g.append(f'<circle cx="{cx}" cy="132" r="2.9" fill="#4f6f8f"/><circle cx="{cx}" cy="132" r="1.3" fill="#1a1716"/>')
            g.append(line(f'M{X(170)} 130 Q{X(177)} 127 {X(184)} 130', '#5a3b2f', 2.2))
        g.append(line(f'M{X(162)} 121 L{X(189)} 120', '#d3a27e', 3.2))                       # straight pale brow
    g.append(line('M197 126 C196 146 194 160 191 170', C['skin'][2], 2.4))
    g.append(line('M189 171 C195 177 205 177 211 171', C['skin'][2], 2.4))
    g.append(f'<ellipse cx="194" cy="173" rx="2.8" ry="1.6" fill="#8a5a48"/><ellipse cx="206" cy="173" rx="2.8" ry="1.6" fill="#8a5a48"/>')
    for x0 in range(184, 218, 4):                                                      # faint moustache strokes
        g.append(line(f'M{x0} {183 + abs(x0-200)*0.08} L{x0 + (1 if x0 > 200 else -1)} {189 + abs(x0-200)*0.1}', '#c08960', 1.6))
    if smile:
        g.append('<path d="M174 193 Q200 199 226 193 Q220 213 200 215 Q180 213 174 193 Z" fill="#6b2f2a" stroke="#8f4b44" stroke-width="2"/>')
        g.append('<path d="M178 195 Q200 201 222 195 L219 203 Q200 208 181 203 Z" fill="#f6f2ea"/>')
        g.append(line('M168 188 Q170 196 175 195 M232 188 Q230 196 225 195', C['skin'][2], 1.8))
    else:
        g.append(line('M186 199 Q200 201 214 199', '#a2655a', 2.6))
        g.append(line('M192 206 Q200 208 208 206', '#c48b7a', 1.8))
    # very short ginger crop: a tight cap starting high, temples cut in, a little sideburn above the ear
    g.append(shape('M131 116 C128 88 130 58 148 42 C166 28 186 26 200 26 C214 26 234 28 252 42 C270 58 272 88 269 116 '
                   'L265 116 C264 100 261 86 255 74 C248 66 240 66 233 72 C222 63 210 61 200 61 C190 61 178 63 167 72 '
                   'C160 66 152 66 145 74 C139 86 136 100 135 116 Z', 'hair', sw=2))
    g.append(shade('M236 32 C256 42 270 58 270 86 C270 100 270 110 269 116 L265 116 C264 100 261 86 255 74 C252 58 246 44 236 32 Z', 'hair'))
    rnd = random.Random(3)
    for _ in range(46):                                                                 # short-crop texture
        x = rnd.uniform(146, 254); y = rnd.uniform(34, 62)
        g.append(line(f'M{x:.1f} {y:.1f} l{rnd.uniform(-2, 2):.1f} {rnd.uniform(3, 5):.1f}', '#d79a6e', 1.4))
    return g

def front(face=True, expr='neutral'):
    g = []
    g.append('<!--layer:legs-->')
    # legs: wide, straight, near-black denim, inner gap, folds stacking at the hem
    g.append(shape('M102 424 L298 424 L301 520 L299 906 L207 906 L205 532 Q200 520 195 532 L193 906 L101 906 L99 520 Z', 'jean'))
    g.append(shade('M250 430 L298 430 L299 906 L262 906 C266 760 262 600 250 430 Z', 'jean'))
    g.append(shade('M152 540 L193 540 L193 906 L170 906 C176 760 170 640 152 540 Z', 'jean', .7))
    for d in ['M118 600 Q140 612 160 604', 'M222 640 Q246 652 270 642', 'M112 840 Q140 852 176 844', 'M218 836 Q250 850 286 838',
              'M114 872 Q146 880 186 874', 'M216 870 Q252 882 292 870', 'M200 432 L200 520']:
        g.append(line(d, '#46434a', 2))
    # rolled cuffs, reverse side of the denim with the selvedge line
    for x0, x1 in ((99, 195), (205, 301)):
        g.append(shape(f'M{x0} 902 L{x1} 902 L{x1+1} 932 L{x0-1} 932 Z', 'cuff'))
        g.append(line(f'M{x0+2} 911 L{x1-2} 911', '#d8dbe2', 2))
    g.append('<!--layer:shoes-->')
    # black 3-eye shoes: round toe box, chunky sole, yellow welt
    for x0, x1, s in ((98, 196, -1), (204, 302, 1)):
        m = (x0 + x1) / 2
        g.append(shape(f'M{x0+6} 930 L{x1-6} 930 C{x1+2} 944 {x1+4} 962 {x1+2} 976 L{x0-2} 976 C{x0-4} 962 {x0-2} 944 {x0+6} 930 Z', 'shoe'))
        g.append(shade(f'M{m+8} 932 L{x1-6} 932 C{x1+2} 946 {x1+3} 962 {x1+1} 975 L{m+14} 975 Z', 'shoe'))
        g.append(f'<rect x="{x0-4}" y="976" width="{x1-x0+8}" height="20" rx="6" fill="#141111" stroke="#070606" stroke-width="3"/>')
        g.append(line(f'M{x0-2} 979 L{x1+2} 979', C['welt'][0], 3.5))
        g.append(line(f'M{m-10} 944 L{m+10} 944 M{m-11} 954 L{m+11} 954', '#4a4444', 2))
    g.append('<!--layer:arms-->')
    # arms hang a little away from the body: normal-build arms, freckles, real hands
    for sgn in (-1, 1):
        X = (lambda sg: (lambda x: 200 + sg * (x - 200)))(sgn)
        g += arm(X, shade_side=sgn > 0)
        g += hand(X, sgn)
    g.append('<!--layer:top-->')
    # boxy tee, dropped shoulders, sleeves to just above the elbow, crew neck
    g.append(shape('M176 262 Q200 278 224 262 L286 268 C318 274 336 292 340 318 L352 400 L304 410 L300 362 L300 470 Q200 478 100 470 L100 362 L96 410 L48 400 L60 318 C64 292 82 274 114 268 Z', 'tee'))
    g.append(shade('M262 300 C286 300 300 320 300 362 L300 470 Q276 474 254 475 C262 420 262 350 262 300 Z', 'tee'))
    g.append(shade('M304 300 C326 300 336 318 340 318 L352 400 L322 405 C320 370 316 330 304 300 Z', 'tee'))
    g.append(line('M110 300 C108 330 106 350 104 362', C['tee'][2], 2))
    g.append(line('M290 300 C292 330 294 350 296 362', C['tee'][2], 2))
    for d in ['M140 330 Q160 352 150 380', 'M236 350 Q256 372 246 400', 'M122 448 Q150 456 170 450']:
        g.append(line(d, '#d9dbe4', 2.5))
    g.append('<!--layer:neck-->')
    # neck with the shade under the jaw, crew-neck rib
    g.append(shape('M178 226 L222 226 L224 266 Q200 280 176 266 Z', 'skin'))
    g.append(shade('M178 230 Q200 250 222 230 L222 246 Q200 262 178 246 Z', 'skin'))
    g.append(line('M172 263 Q200 288 228 263', C['tee'][2], 5))
    g.append(line('M175 262 Q200 283 225 262', '#ffffff', 2))
    g.append('<!--layer:head-->')
    g += head_front(expr)
    return '\n'.join(g)


def side():
    """Profile, facing right. Body axis x=200; the far arm and leg sit behind."""
    g = []
    # far leg (behind), then near leg: wide straight denim
    g.append(shape('M160 520 L250 520 L254 906 L164 906 Z', 'jean', shade=True))
    g.append(shape('M146 424 L262 424 L264 520 L258 906 L150 906 L144 520 Z', 'jean'))
    g.append(shade('M146 424 L176 424 C170 600 168 760 150 906 L150 906 L144 520 Z', 'jean'))
    for d in ['M156 840 Q200 852 252 840', 'M154 872 Q200 884 256 872', 'M232 600 Q248 640 240 680']:
        g.append(line(d, '#46434a', 2))
    g.append(shape('M148 902 L258 902 L259 932 L147 932 Z', 'cuff'))
    g.append(line('M150 911 L256 911', '#d8dbe2', 2))
    # shoe in profile: heel, round toe box forward, chunky sole with the welt, eyelets
    g.append(shape('M150 930 L238 930 C262 934 290 946 300 966 L302 978 L148 978 L148 950 Z', 'shoe'))
    g.append(shade('M150 952 L300 966 L302 978 L148 978 Z', 'shoe'))
    g.append('<rect x="144" y="976" width="164" height="20" rx="6" fill="#141111" stroke="#070606" stroke-width="3"/>')
    g.append(line('M146 979 L306 979', C['welt'][0], 3.5))
    for x in (214, 226, 238):
        g.append(f'<circle cx="{x}" cy="{940 + (x-214)*0.3}" r="2.4" fill="#4a4444"/>')
    # boxy tee from the side, sleeve over the shoulder
    g.append(shape('M168 262 L234 262 C254 270 264 292 266 330 L266 470 Q206 478 140 470 L138 330 C138 292 150 270 168 262 Z', 'tee'))
    g.append(shade('M138 330 C138 292 150 270 168 262 L180 262 C166 300 160 400 162 472 Q150 472 140 470 Z', 'tee'))
    # arm: sleeve, then the bare forearm and hand hanging just in front of the hip
    g.append(shape('M206 664 C196 664 192 650 194 630 L198 590 L226 588 L228 630 C230 652 222 664 206 664 Z', 'skin'))
    for x in (204, 212, 220):
        g.append(line(f'M{x} 632 L{x+1} 660', C['skin'][2], 1.6))
    g.append(shape('M224 600 C236 610 240 626 238 640 C236 648 228 648 226 640 C224 628 222 616 220 606 Z', 'skin'))
    g.append(shape('M196 404 L234 402 C236 470 232 530 228 592 L198 594 C196 530 194 470 196 404 Z', 'skin'))
    for fy in (470, 500, 534, 562):
        g.append(f'<circle cx="{214 + (fy % 7) - 3}" cy="{fy}" r="2.2" fill="#c98e70" opacity=".8"/>')
    g.append(shape('M178 270 C214 258 248 284 244 330 L240 406 L190 408 L184 330 C182 300 178 286 178 270 Z', 'tee'))
    g.append(shade('M184 330 C182 300 180 286 178 272 C190 280 196 300 198 330 L200 407 L190 408 Z', 'tee'))
    # neck leans a little forward, head in profile: high forehead, long straight nose, ear in the middle
    g.append(shape('M184 226 L226 220 L232 266 L182 268 Z', 'skin'))
    g.append(shade('M184 228 L200 226 L198 268 L182 268 Z', 'skin'))
    g.append(shape('M196 22 C238 18 266 44 268 82 L270 112 C276 124 282 146 290 164 L276 170 C276 180 278 186 274 192 C276 200 272 208 268 214 C262 234 242 240 224 238 L214 236 C196 232 168 224 150 204 C122 186 106 156 106 116 C106 60 142 24 196 22 Z', 'skin'))
    g.append(shade('M106 116 C106 60 142 24 196 22 C170 40 150 70 148 110 C146 150 162 190 196 224 C176 220 160 212 150 204 C122 186 106 156 106 116 Z', 'skin'))
    g.append(shape('M190 120 C178 112 168 122 168 138 C168 156 176 168 192 166 Z', 'skin'))
    g.append(line('M184 128 C176 132 176 150 186 156', C['skin'][2], 2))
    g.append(f'<ellipse cx="200" cy="222" rx="24" ry="10" fill="#c49376" opacity=".4"/>')
    g.append(line('M248 118 Q258 112 266 116', '#c08a64', 5))
    g.append('<path d="M252 131 Q258 128 264 132 Q258 136 252 131 Z" fill="#f3efe8"/><circle cx="259" cy="132" r="2.6" fill="#5f84a8"/>')
    g.append(line('M250 129 Q257 124 265 129', '#6a4636', 2.4))
    g.append(line('M276 170 C270 172 266 170 262 166', C['skin'][2], 2))
    g.append('<path d="M262 184 Q272 181 278 186 Q272 191 262 189 Z" fill="#c4946c" opacity=".85"/>')
    g.append(line('M264 198 Q270 199 274 196', '#a2655a', 3))
    # hair: short, close at the back and sides, fuller on top, swept up at the front
    g.append(shape('M108 120 C104 70 144 28 198 26 C228 24 252 34 262 54 C258 58 252 60 244 60 C230 60 216 66 206 76 C196 84 188 96 186 112 L178 116 C170 124 164 140 162 158 C142 164 120 150 108 120 Z', 'hair'))
    g.append(shade('M108 120 C104 70 144 28 198 26 C168 40 150 64 148 100 C146 124 152 144 162 158 C142 164 120 150 108 120 Z', 'hair'))
    for d in ['M184 36 Q210 26 238 36', 'M196 54 Q222 46 246 58']:
        g.append(line(d, '#dba77a', 3))
    return '\n'.join(g)

def back():
    """From behind: the light still comes from the viewer's upper left."""
    g = []
    g.append(shape('M102 424 L298 424 L301 520 L299 906 L207 906 L205 532 Q200 520 195 532 L193 906 L101 906 L99 520 Z', 'jean'))
    g.append(shade('M250 430 L298 430 L299 906 L262 906 C266 760 262 600 250 430 Z', 'jean'))
    for x0 in (118, 214):  # back pockets with stitching, yoke seam
        g.append(f'<path d="M{x0} 486 L{x0+70} 486 L{x0+66} 546 L{x0+35} 558 L{x0+4} 546 Z" fill="none" stroke="#4a474e" stroke-width="2.5"/>')
    g.append(line('M102 470 Q150 480 200 494 Q250 480 298 470', '#4a474e', 2.5))
    for d in ['M112 840 Q140 852 176 844', 'M218 836 Q250 850 286 838', 'M114 872 Q146 880 186 874', 'M216 870 Q252 882 292 870']:
        g.append(line(d, '#46434a', 2))
    for x0, x1 in ((99, 195), (205, 301)):
        g.append(shape(f'M{x0} 902 L{x1} 902 L{x1+1} 932 L{x0-1} 932 Z', 'cuff'))
        g.append(line(f'M{x0+2} 911 L{x1-2} 911', '#d8dbe2', 2))
    for x0, x1 in ((98, 196), (204, 302)):  # heels and the pull loop
        m = (x0 + x1) / 2
        g.append(shape(f'M{x0+4} 930 L{x1-4} 930 L{x1} 976 L{x0} 976 Z', 'shoe'))
        g.append(f'<rect x="{x0-4}" y="976" width="{x1-x0+8}" height="20" rx="6" fill="#141111" stroke="#070606" stroke-width="3"/>')
        g.append(line(f'M{x0-2} 979 L{x1+2} 979', C['welt'][0], 3.5))
        g.append(f'<rect x="{m-6}" y="922" width="12" height="16" rx="3" fill="#e6c13a" stroke="#8a6d10" stroke-width="2"/>')
    for sgn in (-1, 1):
        X = (lambda sg: (lambda x: 200 + sg * (x - 200)))(sgn)
        g += arm(X, shade_side=sgn > 0)
        g += hand(X, sgn)
    g.append(shape('M176 258 Q200 266 224 258 L286 268 C318 274 336 292 340 318 L352 400 L304 410 L300 362 L300 470 Q200 478 100 470 L100 362 L96 410 L48 400 L60 318 C64 292 82 274 114 268 Z', 'tee'))
    g.append(shade('M262 300 C286 300 300 320 300 362 L300 470 Q276 474 254 475 C262 420 262 350 262 300 Z', 'tee'))
    g.append(shade('M304 300 C326 300 336 318 340 318 L352 400 L322 405 C320 370 316 330 304 300 Z', 'tee'))
    g.append(line('M150 300 Q200 316 250 300', '#d9dbe4', 2.5))
    g.append(shape('M178 220 L222 220 L224 262 Q200 270 176 262 Z', 'skin'))
    g.append(line('M174 258 Q200 268 226 258', C['tee'][2], 5))
    for s in (-1, 1):
        X = lambda x: 200 + s * (x - 200)
        g.append(shape(f'M{X(272)} 120 C{X(290)} 112 {X(299)} 126 {X(297)} 142 C{X(295)} 158 {X(286)} 170 {X(270)} 168 Z', 'skin'))
    g.append(shape('M200 40 C246 40 274 70 274 120 L272 160 C270 196 250 222 222 228 L178 228 C150 222 130 196 128 160 L126 120 C126 70 154 40 200 40 Z', 'skin'))
    # back of the head: hair all the way down to a short, tapered nape
    g.append(shape('M129 126 C126 80 144 30 200 26 C256 30 274 80 271 126 C270 152 266 172 258 186 Q230 192 200 191 Q170 192 142 186 C134 172 130 152 129 126 Z', 'hair'))
    g.append(shade('M232 30 C260 42 274 80 271 126 C270 152 266 172 258 186 Q248 188 238 189 C248 160 252 132 250 104 C248 72 244 46 232 30 Z', 'hair'))
    for d in ['M170 50 Q200 40 230 50', 'M160 90 Q200 80 240 90', 'M160 182 Q200 190 240 182']:
        g.append(line(d, '#dba77a', 3))
    return '\n'.join(g)

def three_quarter():
    """Turned 45 degrees to his right (towards the viewer's left)."""
    g = []
    g.append('<!--layer:legs-->')
    # far leg and hip behind, near leg from the waist down in front (only the inseam shows between them)
    g.append(shape('M180 424 L282 424 L280 540 L264 560 L264 906 L188 906 L186 540 Z', 'jean'))
    g.append(shade('M236 424 L282 424 L280 540 L264 560 L264 906 L232 906 C236 760 240 600 236 424 Z', 'jean'))
    g.append(shape('M110 424 L186 424 L188 540 L180 906 L96 906 L104 540 Z', 'jean'))
    g.append(shade('M160 430 L186 424 L188 540 L180 906 L164 906 C168 760 166 600 160 430 Z', 'jean', .5))
    for d in ['M104 840 Q130 852 170 844', 'M100 872 Q132 882 174 874', 'M200 846 Q228 856 256 846']:
        g.append(line(d, '#46434a', 2))
    g.append(shape('M95 902 L177 902 L178 932 L94 932 Z', 'cuff'))
    g.append(shape('M174 902 L262 902 L263 930 L176 930 Z', 'cuff', shade=True))
    g.append(line('M97 911 L175 911', '#d8dbe2', 2))
    g.append('<!--layer:shoes-->')
    for x0, x1, toe in ((174, 266, -18), (88, 184, -30)):    # far shoe, then near shoe, toes pointing left-forward
        g.append(shape(f'M{x0+6} 930 L{x1-2} 930 L{x1+2} 976 L{x0+toe} 976 C{x0+toe-4} 962 {x0+toe+6} 944 {x0+6} 930 Z', 'shoe'))
        g.append(f'<rect x="{x0+toe-6}" y="976" width="{x1-x0-toe+12}" height="20" rx="6" fill="#141111" stroke="#070606" stroke-width="3"/>')
        g.append(line(f'M{x0+toe-4} 979 L{x1+4} 979', C['welt'][0], 3.5))
    g.append('<!--layer:arm-far-->')
    # far arm (his left) mostly hidden behind the body; near arm in front on the left
    g.append(shape('M262 404 L298 400 C302 460 302 530 298 590 L272 594 C270 530 266 460 262 404 Z', 'skin', shade=True))
    g += [x.replace(C['skin'][0], C['skin'][1], 1) for x in hand(lambda x: x - 48, 1)]
    g.append('<!--layer:top-->')
    g.append(shape('M138 270 L254 266 C276 272 292 292 296 318 L304 400 L262 408 L262 470 Q190 478 112 470 L110 362 L106 410 L66 402 L74 318 C80 292 104 274 138 270 Z', 'tee'))
    g.append(shade('M232 290 C254 296 262 330 262 362 L262 470 Q244 474 226 475 C234 420 234 350 232 290 Z', 'tee'))
    g.append(shade('M262 300 C280 300 292 318 296 318 L304 400 L276 405 C274 370 272 330 262 300 Z', 'tee'))
    g.append('<!--layer:arm-near-->')
    g.append(shape('M64 404 L112 397 C117 452 117 520 113 590 L78 594 C71 522 68 452 64 404 Z', 'skin'))
    g += hand(lambda x: 434 - x, -1)
    for fx, fy in ((90, 470), (96, 500), (86, 530), (100, 552)):
        g.append(f'<circle cx="{fx}" cy="{fy}" r="2.2" fill="#c98e70" opacity=".8"/>')
    g.append('<!--layer:neck-->')
    # neck and head turned: face shifted to the viewer's left, the far cheek and the nose break the outline
    g.append(shape('M160 226 L206 224 L210 266 Q186 278 158 266 Z', 'skin'))
    g.append(shade('M160 230 Q184 248 206 230 L206 246 Q184 262 160 246 Z', 'skin'))
    g.append(line('M152 262 Q182 286 214 262', C['tee'][2], 5))
    g.append('<!--layer:head-->')
    g.append(shape('M246 122 C262 115 270 127 268 142 C266 158 259 167 246 166 Z', 'skin'))   # near (his left) ear
    g.append(line('M252 128 C262 132 264 148 256 156', C['skin'][2], 2))
    g.append(shape('M184 38 C230 36 256 68 256 118 L254 166 C252 196 238 222 214 234 Q190 244 166 236 C144 226 130 204 124 174 C120 152 118 136 120 118 C118 68 146 40 184 38 Z', 'skin'))
    g.append(line('M158 228 Q172 234 186 230', C['skin'][2], 1.8))
    g.append(shade('M226 56 C246 72 256 96 256 120 L254 162 C252 200 230 232 196 238 C220 222 236 196 240 160 C244 126 240 86 226 56 Z', 'skin'))
    import random
    rnd = random.Random(11)
    for _ in range(60):
        x = rnd.uniform(128, 232); y = 198 + rnd.uniform(0, 1) * 34 - abs(x - 176) * 0.26
        if 156 < x < 192 and y < 212: continue
        g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.1" fill="#b98466" opacity=".55"/>')
    for cx, rx in ((150, 4.6), (196, 5.6)):
        g.append(f'<ellipse cx="{cx}" cy="130" rx="{rx + 9}" ry="8" fill="{C["skin"][1]}" opacity=".7"/>')
        g.append(f'<ellipse cx="{cx}" cy="132" rx="{rx}" ry="3.1" fill="{C["eye"][0]}"/>')
        g.append(f'<circle cx="{cx - 1.5}" cy="132" r="2.8" fill="#4f6f8f"/><circle cx="{cx - 1.5}" cy="132" r="1.3" fill="#1a1716"/>')
        g.append(line(f'M{cx - rx - 2} 130 Q{cx} 127 {cx + rx + 2} 130', '#5a3b2f', 2.2))
    g.append(line('M138 121 L160 120', '#d3a27e', 3))
    g.append(line('M184 120 L210 119', '#d3a27e', 3.2))
    g.append(line('M170 126 C164 146 158 160 152 170 C158 178 170 178 176 172', C['skin'][2], 2.4))
    g.append(f'<ellipse cx="162" cy="173" rx="2.6" ry="1.6" fill="#8a5a48"/>')
    for x0 in range(152, 188, 4):
        g.append(line(f'M{x0} {183 + abs(x0-168)*0.08} L{x0 + (1 if x0 > 168 else -1)} {189 + abs(x0-168)*0.1}', '#c08960', 1.6))
    g.append(line('M156 199 Q170 201 184 198', '#a2655a', 2.6))
    g.append(shape('M121 114 C118 86 122 56 142 40 C160 26 180 24 194 24 C214 24 236 28 250 44 C262 60 262 92 258 116 '
                   'L253 116 C252 100 250 88 245 76 C238 66 230 66 224 72 C212 62 196 60 186 62 C176 62 164 66 156 74 '
                   'C150 68 142 70 136 78 C130 90 127 102 126 114 Z', 'hair', sw=2))
    g.append(shade('M226 30 C246 40 260 56 260 86 C260 100 259 110 258 116 L253 116 C252 100 250 88 245 76 C242 58 236 42 226 30 Z', 'hair'))
    rnd = random.Random(5)
    for _ in range(42):
        x = rnd.uniform(136, 246); y = rnd.uniform(32, 62)
        g.append(line(f'M{x:.1f} {y:.1f} l{rnd.uniform(-2, 2):.1f} {rnd.uniform(3, 5):.1f}', '#d79a6e', 1.4))
    return '\n'.join(g)

def svg(body, w=400, h=1010, tx=0, scale=1.0, view='0 0 400 1010'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{view}">{body}</svg>'

if __name__ == '__main__':
    out = sys.argv[1]
    for name, fn in (('front', front), ('three-quarter', three_quarter), ('side', side), ('back', back)):
        open(f'{out}/{name}.svg', 'w').write(svg(fn(), 400, 1010))

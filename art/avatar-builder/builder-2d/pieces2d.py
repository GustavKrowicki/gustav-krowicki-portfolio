"""2D outfit pieces beyond the base outfit: the front builder layer and the 3/4 parts the city doll animates.
Each piece: front(): SVG elements on the sheet's front view; torso34(): the body part of the 3/4 view (drawn
over the base torso position); sleeves34: covers that ride on the arm segments, so sleeves swing with the arms."""
PIECE_C = {
    'hood':   ('#6e6e73', '#55555a', '#3a3a3f'),
    'hoodp':  ('#626267', '#4c4c51', '#3a3a3f'),
    'string': ('#ecebe6', '#cfcdc6', '#9c9a94'),
}

def hoodie_front(shape, shade, line, soft=lambda e: e):
    g = []
    # hood bunched behind the neck (the head covers its middle), long sleeves over the arms, the body, rib hem
    g.append(shape('M136 250 C138 234 166 226 200 226 C234 226 262 234 264 250 L270 284 L130 284 Z', 'hood', shade=True))
    for s in (-1, 1):
        X = lambda x: 200 + s * (x - 200)
        g.append(shape(f'M{X(300)} 316 C{X(322)} 300 {X(350)} 306 {X(358)} 340 L{X(366)} 586 L{X(304)} 590 L{X(298)} 420 Z', 'hood', shade=s > 0))
        g.append(shape(f'M{X(304)} 570 L{X(366)} 568 L{X(367)} 590 L{X(305)} 592 Z', 'hood', shade=True))
    g.append(shape('M148 262 Q200 282 252 262 L292 270 C318 278 332 296 336 320 L322 500 Q200 512 78 500 L64 320 C68 296 82 278 108 270 Z', 'hood'))
    g.append(soft(shade('M262 286 C296 296 330 316 336 330 L322 500 Q290 506 256 508 C270 440 272 350 262 286 Z', 'hood')))
    g.append(shape('M78 488 Q200 500 322 488 L322 502 Q200 514 78 502 Z', 'hood', shade=True))
    g.append(shape('M126 404 L274 404 L288 476 L112 476 Z', 'hoodp'))
    g.append(line('M128 410 L116 470 M272 410 L284 470', PIECE_C['hood'][2], 3))
    g.append(shape('M140 262 Q200 300 260 262 L266 280 Q200 318 134 280 Z', 'hood', shade=True))   # hood collar in front
    for x0, x1 in ((186, 184), (214, 216)):
        g.append(line(f'M{x0} 286 L{x1} 362', PIECE_C['string'][0], 6))
        g.append(f'<circle cx="{x1}" cy="366" r="5" fill="{PIECE_C["string"][1]}"/>')
    return g

def hoodie_34(shape, shade, line, soft=lambda e: e):
    torso = [shape('M150 236 C148 214 168 204 190 208 L214 212 C232 216 242 230 240 250 L236 276 L150 278 Z', 'hood', shade=True),
             shape('M132 268 L258 264 C280 272 292 294 294 320 L290 500 Q192 512 102 500 L98 330 C100 296 112 276 132 268 Z', 'hood'),
             soft(shade('M226 286 C262 296 290 320 292 350 L290 500 Q252 506 222 508 C236 440 236 350 226 286 Z', 'hood')),
             shape('M102 488 Q192 500 290 488 L290 502 Q192 514 102 502 Z', 'hood', shade=True),
             shape('M128 404 L234 400 L246 468 L118 472 Z', 'hoodp'),
             shape('M144 262 Q182 288 222 262 L230 278 Q182 304 136 278 Z', 'hood', shade=True),
             line('M172 284 L170 342', PIECE_C['string'][0], 7), line('M198 284 L200 340', PIECE_C['string'][0], 7)]
    sleeves = {
        'near': {'upper': [shape('M56 396 L120 388 C123 440 124 470 122 508 L62 510 C60 470 58 440 56 396 Z', 'hood')],
                 'fore': [shape('M62 496 L122 492 C124 530 123 560 120 580 L70 584 C66 560 64 530 62 496 Z', 'hood'),
                          shape('M70 572 L120 568 L121 588 L71 592 Z', 'hood', shade=True)]},
        'far': {'upper': [shape('M256 400 L304 396 C307 440 308 470 306 508 L262 510 C261 470 259 440 256 400 Z', 'hood', shade=True)],
                'fore': [shape('M262 496 L306 492 C308 530 307 560 304 582 L266 586 C264 560 263 530 262 496 Z', 'hood', shade=True)]},
    }
    return torso, sleeves

# hand-drawn pixel beanie, laid over the 13 px heads: rows start 2 px above the head top
# city pixels only: a deeper ochre than the builder beanie, so it separates from the ginger hair and the skin at 13 px
BEANIE_PAL = {'Y': (184, 128, 30), 'y': (148, 98, 20), 'c': (112, 74, 12), 'r': (150, 102, 24), 'k': (78, 52, 8)}
BEANIE34 = [   # starts 3 px above the head top: a small crown bump, the knit dome, a darker folded cuff
    ".....kkk.....",
    "....kYYYk....",
    "..kkYYYYyykk.",
    ".kYYYYYYYYyyk",
    "kYYYYYYYYYyyk",
    "kYYYYYYYYYyyk",
    "kcrcrcrcrcrck",
    "kcccccccccccc",
]

PIECE_C.update({
    'sweat':  ('#3c5a46', '#2c4434', '#1d2e23'),
    'sweatr': ('#2e4637', '#223429', '#16231b'),
})

def sweater_front(shape, shade, line, soft=lambda e: e):
    g = []
    for s in (-1, 1):   # long slim sleeves with a rib cuff
        X = lambda x: 200 + s * (x - 200)
        g.append(shape(f'M{X(298)} 316 C{X(318)} 302 {X(344)} 306 {X(352)} 340 L{X(358)} 584 L{X(306)} 588 L{X(300)} 420 Z', 'sweat', shade=s > 0))
        g.append(shape(f'M{X(306)} 566 L{X(358)} 564 L{X(359)} 590 L{X(307)} 592 Z', 'sweatr'))
        for k in range(4):
            x = X(314 + k * 12)
            g.append(line(f'M{x} 570 L{x} 588', PIECE_C['sweatr'][2], 2))
    g.append(shape('M150 262 Q200 280 250 262 L290 270 C316 278 330 296 334 320 L318 488 Q200 498 82 488 L66 320 C70 296 84 278 110 270 Z', 'sweat'))
    g.append(soft(shade('M258 286 C292 296 326 316 334 330 L318 488 Q288 494 254 496 C268 430 268 350 258 286 Z', 'sweat')))
    g.append(shape('M82 474 Q200 486 318 474 L318 492 Q200 504 82 492 Z', 'sweatr'))
    for x in range(92, 316, 14):
        g.append(line(f'M{x} {478 + (abs(x - 200) / 118) ** 2 * -4} L{x} {490 + (abs(x - 200) / 118) ** 2 * -4}', PIECE_C['sweatr'][2], 2))
    g.append(shape('M156 256 Q200 282 244 256 L250 278 Q200 306 150 278 Z', 'sweatr'))   # thick rolled neck
    return g

def sweater_34(shape, shade, line, soft=lambda e: e):
    torso = [shape('M132 268 L258 264 C280 272 292 294 294 320 L288 486 Q192 496 104 486 L100 330 C102 296 112 276 132 268 Z', 'sweat'),
             soft(shade('M226 286 C262 296 290 320 292 350 L288 486 Q252 492 222 494 C236 430 236 350 226 286 Z', 'sweat')),
             shape('M104 472 Q192 484 288 472 L288 490 Q192 502 104 490 Z', 'sweatr'),
             shape('M146 256 Q184 282 222 256 L228 274 Q184 300 140 274 Z', 'sweatr')]
    sleeves = {
        'near': {'upper': [shape('M60 398 L116 390 C119 440 120 470 118 508 L66 510 C64 470 62 440 60 398 Z', 'sweat')],
                 'fore': [shape('M66 498 L118 494 C120 530 119 560 116 578 L74 582 C70 560 68 530 66 498 Z', 'sweat'),
                          shape('M74 566 L116 562 L117 588 L75 592 Z', 'sweatr')]},
        'far': {'upper': [shape('M258 400 L302 396 C305 440 306 470 304 508 L264 510 C263 470 261 440 258 400 Z', 'sweat', shade=True)],
                'fore': [shape('M264 496 L304 492 C306 530 305 560 302 580 L268 584 C266 560 265 530 264 496 Z', 'sweat', shade=True)]},
    }
    return torso, sleeves

# The football club shirt (piece id clubShirt): the tee's cut, white body, blue short sleeves with a white cuff
# stripe, a blue standing collar and one blue chest band (2 px tall at street zoom = 36 sheet units).
PIECE_C.update({
    'club':  ('#fafafa', '#ccd0dc', '#9aa0b4'),
    'clubb': ('#0046a0', '#00357a', '#00244f'),
})

def club_front(shape, shade, line, soft=lambda e: e):
    g = [shape('M176 262 Q200 278 224 262 L286 268 C318 274 336 292 340 318 L352 400 L304 410 L300 362 L300 470 Q200 478 100 470 L100 362 L96 410 L48 400 L60 318 C64 292 82 274 114 268 Z', 'club'),
         soft(shade('M262 300 C286 300 300 320 300 362 L300 470 Q276 474 254 475 C262 420 262 350 262 300 Z', 'club'))]
    g.append(shape('M103 330 L297 330 L298 366 L102 366 Z', 'clubb'))
    for s in (-1, 1):
        X = lambda x: 200 + s * (x - 200)
        g.append(shape(f'M{X(286)} 268 C{X(318)} 274 {X(336)} 292 {X(340)} 318 L{X(352)} 400 L{X(304)} 410 L{X(300)} 362 L{X(296)} 300 Z', 'clubb', shade=s > 0))
        g.append(line(f'M{X(302)} 400 L{X(350)} 392', PIECE_C['club'][0], 8))
    g.append(shape('M172 258 Q200 284 228 258 L232 272 Q200 300 168 272 Z', 'clubb'))
    return g

def club_34(shape, shade, line, soft=lambda e: e):
    torso = [shape('M138 270 L254 266 C276 272 292 292 296 318 L304 400 L262 408 L262 470 Q190 478 112 470 L110 362 L106 410 L66 402 L74 318 C80 292 104 274 138 270 Z', 'club'),
             soft(shade('M206 284 C246 290 262 330 262 362 L262 470 Q236 474 204 476 C214 420 214 340 206 284 Z', 'club')),
             shape('M112 330 L262 328 L262 364 L111 366 Z', 'clubb'),
             shape('M138 270 C104 274 80 292 74 318 L66 402 L106 410 L110 362 L114 300 Z', 'clubb'),
             shape('M254 266 C276 272 292 292 296 318 L304 400 L262 408 L262 362 L258 300 Z', 'clubb', shade=True),
             line('M68 396 L106 404', PIECE_C['club'][0], 9),
             shape('M152 258 Q184 282 216 258 L222 272 Q184 298 146 272 Z', 'clubb')]
    return torso, {}

# Sand-wash cargo trousers: baggier than the denim, thigh pockets on the outer legs, a gathered dark elastic hem
# above the shoe, no rolled cuff. Legs slot: replaces the denim legs.
PIECE_C.update({
    'cargo':  ('#968769', '#7a6d53', '#55493a'),
    'cargod': ('#6e624b', '#5a4f3c', '#3d3428'),
})

def cargo_front(shape, shade, line, soft=lambda e: e):
    g = [shape('M96 424 L304 424 L308 520 L300 896 L208 896 L205 532 Q200 520 195 532 L192 896 L100 896 L92 520 Z', 'cargo'),
         soft(shade('M250 430 L304 430 L306 896 L262 896 C268 760 262 600 250 430 Z', 'cargo')),
         soft(shade('M150 540 L193 540 L192 896 L168 896 C176 760 170 640 150 540 Z', 'cargo')),
         shape('M92 600 L130 600 L132 692 L96 692 Z', 'cargod'),
         line('M92 616 L130 616', PIECE_C['cargod'][2], 3),
         shape('M270 600 L308 600 L304 692 L268 692 Z', 'cargod', shade=True),
         line('M270 616 L308 616', PIECE_C['cargod'][2], 3)]
    for d in ['M114 560 Q140 572 164 564', 'M228 560 Q256 572 282 562', 'M110 820 Q140 834 180 826', 'M218 820 Q252 834 290 824',
              'M112 856 Q146 866 186 858', 'M216 856 Q254 868 292 856', 'M200 432 L200 520']:
        g.append(line(d, PIECE_C['cargo'][2], 2.5))
    g.append(shape('M100 876 L192 876 L190 916 L104 916 Z', 'cargod'))       # gathered elastic hems
    g.append(shape('M208 876 L300 876 L296 916 L210 916 Z', 'cargod', shade=True))
    for x in range(110, 190, 10):
        g.append(line(f'M{x} 880 L{x + 2} 912', PIECE_C['cargod'][2], 2))
    for x in range(216, 296, 10):
        g.append(line(f'M{x} 880 L{x + 2} 912', PIECE_C['cargod'][2], 2))
    return g

def cargo_34(shape, shade, line, soft=lambda e: e):
    return {
        'near': {'thigh': [shape('M104 424 L190 424 L194 540 L190 684 L94 684 L98 540 Z', 'cargo'),
                           soft(shade('M160 430 L190 424 L194 540 L190 684 L166 684 C168 600 166 500 160 430 Z', 'cargo')),
                           shape('M94 560 L122 556 L124 642 L96 646 Z', 'cargod')],
                 'shin': [shape('M94 676 L190 676 L184 896 L98 896 Z', 'cargo'),
                          soft(shade('M162 680 L190 676 L184 896 L166 896 C168 820 166 740 162 680 Z', 'cargo')),
                          shape('M100 880 L184 878 L182 920 L102 922 Z', 'cargod')]},
        'far': {'thigh': [shape('M176 424 L286 424 L284 540 L268 560 L268 684 L184 684 L182 540 Z', 'cargo', shade=True)],
                'shin': [shape('M184 676 L268 676 L266 898 L188 898 Z', 'cargo', shade=True),
                         shape('M188 882 L266 880 L264 918 L190 920 Z', 'cargod', shade=True)]},
    }

# Ski set: an orange-red shell jacket (high collar, black front zip, two chest zips, black gloves), grey ski
# pants with dark gaiters over the shoe tops, and a black helmet with pink mirrored goggles.
GLOVE = lambda el: el.replace('<path', '<path data-w="hand"', 1)   # gloves move with the wrist (warp.py)
PIECE_C.update({
    'ski':   ('#e5452b', '#b8341f', '#7d2212'),
    'skik':  ('#1b1a1d', '#111013', '#050506'),
    'skip':  ('#80838b', '#62656d', '#44464d'),
    'skipd': ('#5f626a', '#4a4c53', '#33353a'),
    'helm':  ('#2a2a30', '#1c1c20', '#0c0c0e'),
    'lens':  ('#f25aa6', '#c23f84', '#7e2253'),
})

def ski_front(shape, shade, line, soft=lambda e: e):
    g = []
    for s in (-1, 1):   # puffy sleeves to the wrist, black gloves over the hands
        X = lambda x: 200 + s * (x - 200)
        g.append(shape(f'M{X(296)} 312 C{X(320)} 296 {X(350)} 302 {X(358)} 338 L{X(368)} 584 L{X(304)} 588 L{X(296)} 420 Z', 'ski', shade=s > 0))
        g.append(line(f'M{X(318)} 440 Q{X(334)} 446 {X(352)} 440', PIECE_C['ski'][2], 3))
        g.append(GLOVE(shape(f'M{X(302)} 580 L{X(362)} 580 C{X(368)} 610 {X(368)} 640 {X(362)} 664 C{X(356)} 684 {X(324)} 690 {X(310)} 676 C{X(298)} 660 {X(296)} 620 {X(302)} 580 Z', 'skik')))
    g.append(shape('M146 260 Q200 276 254 260 L296 268 C324 276 340 296 344 322 L330 512 Q200 526 70 512 L56 322 C60 296 76 276 104 268 Z', 'ski'))
    g.append(soft(shade('M262 284 C300 294 336 316 344 330 L330 512 Q296 518 256 520 C272 440 272 350 262 284 Z', 'ski')))
    g.append(shape('M70 500 Q200 514 330 500 L330 516 Q200 530 70 516 Z', 'ski', shade=True))
    g.append(line('M200 262 L200 512', PIECE_C['skik'][0], 5))
    g.append(line('M120 334 L172 326 M228 326 L280 334', PIECE_C['skik'][0], 5))
    g.append(line('M110 400 Q150 410 186 404 M214 404 Q252 410 290 400', PIECE_C['ski'][2], 3))
    g.append(shape('M160 224 L240 224 L248 286 Q200 302 152 286 Z', 'ski'))          # high collar
    g.append(line('M200 230 L200 296', PIECE_C['skik'][0], 5))
    return g

def ski_34(shape, shade, line, soft=lambda e: e):
    torso = [shape('M130 266 L260 262 C284 270 296 294 298 322 L292 512 Q192 524 98 512 L94 330 C96 296 108 274 130 266 Z', 'ski'),
             soft(shade('M226 284 C264 294 294 320 296 350 L292 512 Q254 518 222 520 C238 440 238 350 226 284 Z', 'ski')),
             shape('M98 500 Q192 512 292 500 L292 516 Q192 528 98 516 Z', 'ski', shade=True),
             line('M188 268 L186 512', PIECE_C['skik'][0], 6),
             line('M118 332 L152 326 M206 324 L240 330', PIECE_C['skik'][0], 6),
             shape('M150 220 L222 218 L228 282 Q186 298 146 282 Z', 'ski'),
             line('M186 226 L186 294', PIECE_C['skik'][0], 6)]
    sleeves = {
        'near': {'upper': [shape('M54 394 L122 386 C125 440 126 470 124 508 L60 510 C58 470 56 440 54 394 Z', 'ski')],
                 'fore': [shape('M60 496 L124 492 C126 530 125 560 122 586 L68 590 C64 560 62 530 60 496 Z', 'ski'),
                          GLOVE(shape('M66 582 L126 580 C132 610 132 642 126 664 C120 684 88 690 74 676 C62 660 60 620 66 582 Z', 'skik'))]},
        'far': {'upper': [shape('M254 400 L306 396 C309 440 310 470 308 508 L260 510 C259 470 257 440 254 400 Z', 'ski', shade=True)],
                'fore': [shape('M260 496 L308 492 C310 530 309 560 306 586 L264 590 C262 560 261 530 260 496 Z', 'ski', shade=True),
                         GLOVE(shape('M262 582 L312 580 C318 610 318 640 312 662 C306 680 280 686 270 672 C260 656 258 620 262 582 Z', 'skik', shade=True))]},
    }
    return torso, sleeves

def skipants_front(shape, shade, line, soft=lambda e: e):
    g = [shape('M94 424 L306 424 L310 520 L304 936 L208 936 L205 532 Q200 520 195 532 L192 936 L96 936 L90 520 Z', 'skip'),
         soft(shade('M250 430 L306 430 L306 936 L262 936 C268 760 262 600 250 430 Z', 'skip')),
         soft(shade('M150 540 L193 540 L192 936 L168 936 C176 760 170 640 150 540 Z', 'skip'))]
    for d in ['M104 700 Q144 712 186 702', 'M214 702 Q256 712 298 700', 'M200 432 L200 520']:
        g.append(line(d, PIECE_C['skip'][2], 3))
    g.append(shape('M94 904 L192 904 L192 946 L92 946 Z', 'skipd'))          # gaiters over the shoe tops
    g.append(shape('M208 904 L306 904 L308 946 L208 946 Z', 'skipd', shade=True))
    return g

def skipants_34(shape, shade, line, soft=lambda e: e):
    return {
        'near': {'thigh': [shape('M102 424 L192 424 L196 540 L192 684 L92 684 L96 540 Z', 'skip'),
                           soft(shade('M162 430 L192 424 L196 540 L192 684 L168 684 C170 600 168 500 162 430 Z', 'skip'))],
                 'shin': [shape('M92 676 L192 676 L188 936 L94 936 Z', 'skip'),
                          soft(shade('M164 680 L192 676 L188 936 L170 936 C172 820 170 740 164 680 Z', 'skip')),
                          shape('M94 906 L188 904 L190 944 L92 946 Z', 'skipd')]},
        'far': {'thigh': [shape('M176 424 L288 424 L286 540 L270 560 L270 684 L184 684 L182 540 Z', 'skip', shade=True)],
                'shin': [shape('M184 676 L270 676 L268 936 L188 936 Z', 'skip', shade=True),
                         shape('M188 906 L268 904 L270 942 L186 944 Z', 'skipd', shade=True)]},
    }

def helmet_front(shape, shade, line, soft=lambda e: e):
    g = [shape('M120 124 C112 60 146 8 200 6 C254 8 288 60 280 124 L268 126 C266 106 262 96 252 90 L148 90 C138 96 134 106 132 126 Z', 'helm'),
         soft(shade('M236 14 C266 26 284 60 280 124 L268 126 C266 106 262 96 254 90 C258 60 252 32 236 14 Z', 'helm')),
         shape('M128 108 L272 108 Q288 108 288 124 L288 140 Q288 156 272 156 L128 156 Q112 156 112 140 L112 124 Q112 108 128 108 Z', 'skik'),
         shape('M134 112 Q200 102 266 112 L264 152 Q200 162 136 152 Z', 'lens'),
         soft(shade('M222 108 Q248 110 266 112 L264 152 Q246 156 224 158 Z', 'lens')),
         line('M146 120 Q176 114 204 116', '#ffd1ea', 4)]
    return g

PIX = {'K': (42, 42, 48), 'q': (28, 28, 32), 'k': (12, 12, 14), 'P': (242, 90, 166), 'p': (194, 63, 132),
       'w': (255, 209, 234), 'b': (24, 23, 26)}
HELMET34 = [   # starts 2 px above the head top; the pink lens across the eyes, the face to the left
    ".....kkk.....",
    "...kKKKKqk...",
    "..kKKKKKKqqk.",
    ".kKKKKKKKKqqk",
    ".kKKKKKKKKqqk",
    "kKKKKKKKKKqqk",
    "kKKKKKKKKKqqk",
    "bwPPPPPpbbbbb",
    "bPPPPPppbbbbb",
]
HELMET_BACK34 = [
    ".....kkk.....",
    "...kKKKKqk...",
    "..kKKKKKKqqk.",
    ".kKKKKKKKKqqk",
    ".kKKKKKKKKqqk",
    "kKKKKKKKKKqqk",
    "kKKKKKKKKKqqk",
    "kKKKKKKKKKqqk",
    "bbbbbbbbbbbbb",
]

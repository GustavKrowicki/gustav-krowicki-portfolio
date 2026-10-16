import sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from massing import *
from PIL import Image
AV = 'public/game/pogicity/Characters/avatar3d/'
def frame(name, i=0):
    sh = Image.open(AV + name).convert('RGBA'); f = sh.crop((66 * i, 0, 66 * i + 66, 124))
    return f.resize((33, 62), Image.LANCZOS)
def paste_avatar(img, to_px, x, y, name='idle-south.png'):
    f = frame(name); px, py = to_px(x, y)
    img.alpha_composite(f, (int(px - 16.5), int(py - 0.879 * 62)))
on, tp = render(roof_on(), 'massing-roof-on.png', 2)
paste_avatar(on, tp, 4.5, 7.55); on.save('massing-roof-on.png')
off, tp2 = render(roof_off(), 'massing-roof-off.png', 2)
paste_avatar(off, tp2, 5.2, 2.2, 'idle-west.png'); off.save('massing-roof-off.png')
# today: the live campus sprite at the same scale (2x = Street zoom), avatar at its front edge
old = Image.open('public/game/pogicity/Building/landmark/lego-hq_south.png').convert('RGBA')
old = old.crop(old.getbbox()); old = old.resize((old.width * 2, old.height * 2), Image.NEAREST)
canvas = Image.new('RGBA', (old.width + 40, old.height + 30), (0, 0, 0, 0)); canvas.alpha_composite(old, (0, 0))
f = frame('idle-south.png'); canvas.alpha_composite(f, (int(old.width * 0.47), old.height - 55))
canvas.crop(canvas.getbbox()).save('today-campus.png')
print(on.size, off.size, canvas.size)

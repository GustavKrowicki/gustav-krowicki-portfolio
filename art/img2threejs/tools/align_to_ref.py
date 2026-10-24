"""Scale + translation alignment of a render to a reference (the img2threejs
self-correction guide: trust IoU only after alignment). Crops both to their foreground bbox and writes the render
resized onto a canvas the size of the reference, with the reference's bbox; a transparent render stays transparent. Usage: align_to_ref.py <ref> <render> <out>"""
import sys
from PIL import Image, ImageChops


def bbox(im):
    rgb = im.convert('RGB')
    bg = rgb.getpixel((0, 0))   # the background colour (white for lookdev renders and AI references)
    diff = ImageChops.difference(rgb, Image.new('RGB', rgb.size, bg)).convert('L').point(lambda v: 255 if v > 24 else 0)
    return diff.getbbox()


ref, raw = Image.open(sys.argv[1]), Image.open(sys.argv[2])
transparent = raw.mode == 'RGBA' and raw.getextrema()[3][0] < 255
rb = (ref.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox() if ref.mode == 'RGBA' else bbox(ref))
if transparent:
    # transparent render (converter rig): bbox from alpha, kept transparent so the gates read the exact silhouette
    nb = raw.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    crop = raw.crop(nb).resize((rb[2] - rb[0], rb[3] - rb[1]), Image.LANCZOS)
    out = Image.new('RGBA', ref.size, (255, 255, 255, 0))
    out.alpha_composite(crop, rb[:2])
else:
    ren = raw.convert('RGB'); nb = bbox(ren)
    crop = ren.crop(nb).resize((rb[2] - rb[0], rb[3] - rb[1]), Image.LANCZOS)
    out = Image.new('RGB', ref.size, ref.convert('RGB').getpixel((0, 0)))
    out.paste(crop, rb[:2])
out.save(sys.argv[3])
print('ref bbox', rb, 'render bbox', nb)

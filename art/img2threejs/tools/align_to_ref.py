"""Scale + translation alignment of a white-background render to a white-background reference (the img2threejs
self-correction guide: trust IoU only after alignment). Crops both to their foreground bbox and writes the render
resized onto a canvas the size of the reference, with the reference's bbox. Usage: align_to_ref.py <ref> <render> <out>"""
import sys
from PIL import Image, ImageChops


def bbox(im):
    rgb = im.convert('RGB')
    diff = ImageChops.difference(rgb, Image.new('RGB', rgb.size, (255, 255, 255))).convert('L').point(lambda v: 255 if v > 24 else 0)
    return diff.getbbox()


ref, ren = Image.open(sys.argv[1]).convert('RGB'), Image.open(sys.argv[2]).convert('RGB')
rb, nb = bbox(ref), bbox(ren)
crop = ren.crop(nb).resize((rb[2] - rb[0], rb[3] - rb[1]), Image.LANCZOS)
out = Image.new('RGB', ref.size, (255, 255, 255))
out.paste(crop, rb[:2])
out.save(sys.argv[3])
print('ref bbox', rb, 'render bbox', nb)

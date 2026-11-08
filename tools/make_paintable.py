"""Make "paintable" versions of objects: light, almost colourless drawings that the game can tint with any colour.

    python3 -I tools/make_paintable.py ball bed lamp rug teddy_bear robot

Reads assets/processed/obj_<name>.webp -> writes public/img/paint_<name>.webp
Tinting multiplies the colour by the grey drawing, so shading and dark outlines stay and only the "paint" changes.
"""
import os
import sys

from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'processed')
OUT = os.path.join(ROOT, 'public', 'img')

for name in sys.argv[1:]:
    img = Image.open(os.path.join(SRC, f'obj_{name}.webp')).convert('RGBA')
    alpha = img.getchannel('A')
    grey = ImageOps.grayscale(img.convert('RGB'))
    # lift the lights so the tint is bright, keep real dark lines (outlines) dark
    lut = []
    for v in range(256):
        if v >= 110:
            lut.append(round(215 + (v - 110) * (255 - 215) / 145))      # light areas -> 215..255 (paint colour)
        else:
            lut.append(round(v * 1.1))                                    # outlines/dark details stay dark
    grey = grey.point(lut)
    out = Image.merge('RGBA', (grey, grey, grey, alpha))
    path = os.path.join(OUT, f'paint_{name}.webp')
    out.save(path, quality=90, method=6)
    print(os.path.basename(path), out.size)

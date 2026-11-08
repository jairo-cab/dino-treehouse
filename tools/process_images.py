"""Turn raw Gemini images (white background) into game-ready transparent WebP files.

    .venv/bin/python tools/process_images.py            # all images in assets/raw
    .venv/bin/python tools/process_images.py pip_happy  # only some

Characters / objects: background removed with rembg (AI cut-out, handles soft floor shadows and
cream/white parts of the drawing), cropped to the subject and resized. If rembg is not installed
it falls back to a simple flood-fill of the white (works only for flat, shadow-free images).
Backgrounds (names starting with `bg_`): only resized and compressed.
Output goes to assets/processed/<name>.webp
"""
import glob
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RAW = os.path.join(ROOT, 'assets', 'raw')
OUT = os.path.join(ROOT, 'assets', 'processed')

MAX_SIZE = {'pip': 640, 'egg': 512, 'obj': 512}  # longest side in px, by name prefix
BG_SIZE = (720, 1290)
TOLERANCE = 38  # how far from white still counts as background (JPEG noise)


_session = None


def cut_out_ai(img: Image.Image) -> Image.Image:
    global _session
    from rembg import new_session, remove
    if _session is None:
        _session = new_session('u2net')
    out = remove(img.convert('RGB'), session=_session, post_process_mask=True)
    alpha = out.getchannel('A')
    bbox = alpha.point(lambda v: 255 if v > 10 else 0).getbbox()
    if bbox:
        pad = 6
        w, h = out.size
        out = out.crop((max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, w), min(bbox[3] + pad, h)))
    return out


def cut_out(img: Image.Image) -> Image.Image:
    try:
        return cut_out_ai(img)
    except ImportError:
        return cut_out_flood(img)


def cut_out_flood(img: Image.Image) -> Image.Image:
    rgb = img.convert('RGB')
    w, h = rgb.size
    marker = (255, 0, 255)
    work = rgb.copy()
    # Flood from every border point that is near-white, so islands touching any edge are cleared.
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if work.getpixel((x, y)) != marker and min(work.getpixel((x, y))) > 255 - TOLERANCE:
                ImageDraw.floodfill(work, (x, y), marker, thresh=TOLERANCE)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if work.getpixel((x, y)) != marker and min(work.getpixel((x, y))) > 255 - TOLERANCE:
                ImageDraw.floodfill(work, (x, y), marker, thresh=TOLERANCE)

    # alpha: 0 where we painted the marker, 255 elsewhere
    r, g, b = work.split()
    is_marker = ImageChops.multiply(
        ImageChops.multiply(r.point(lambda v: 255 if v == 255 else 0),
                            g.point(lambda v: 255 if v == 0 else 0)),
        b.point(lambda v: 255 if v == 255 else 0))
    alpha = ImageChops.invert(is_marker)
    # shrink 1px to drop the white fringe, then soften the edge
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))

    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 10 else 0).getbbox()
    if bbox:
        pad = 6
        bbox = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, w), min(bbox[3] + pad, h))
        out = out.crop(bbox)
    return out


def process(path: str) -> str:
    name = os.path.splitext(os.path.basename(path))[0]
    img = Image.open(path)
    if name.startswith('bg_'):
        out = img.convert('RGB').resize(BG_SIZE, Image.LANCZOS)
        out.save(os.path.join(OUT, name + '.webp'), quality=82, method=6)
    else:
        out = cut_out(img)
        limit = MAX_SIZE.get(name.split('_')[0], 512)
        out.thumbnail((limit, limit), Image.LANCZOS)
        out.save(os.path.join(OUT, name + '.webp'), quality=88, method=6)
    size = os.path.getsize(os.path.join(OUT, name + '.webp')) // 1024
    return f'{name}.webp  {out.size[0]}x{out.size[1]}  {size} KB'


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    wanted = set(sys.argv[1:])
    files = sorted(glob.glob(os.path.join(RAW, '*.jpg')) + glob.glob(os.path.join(RAW, '*.png')))
    for f in files:
        if wanted and os.path.splitext(os.path.basename(f))[0] not in wanted:
            continue
        print(process(f))

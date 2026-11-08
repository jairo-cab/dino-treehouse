"""Cut a "5 faces in a row" sheet into 5 game-ready transparent WebP files.

    .venv/bin/python tools/slice_sheet.py art/dinos/trice_sheet.jpg trice
    .venv/bin/python tools/slice_sheet.py art/dinos/stego_sheet.jpg stego --grid=6 --drop=3   # 3x2 grid, ignore the 4th piece

Writes assets/processed/<prefix>_{neutral,happy,sad,surprised,talk}.webp
All five pieces share the SAME canvas size and baseline, so swapping faces in the game never makes
the character jump or change size.
"""
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter
from rembg import new_session, remove

FACES = ['neutral', 'happy', 'sad', 'surprised', 'talk']
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'processed')
MAX_H = 640


def fill_holes(cut: Image.Image, original: Image.Image) -> Image.Image:
    """The cut-out AI sometimes treats cream/white parts INSIDE a character as background (holes).
    Anything transparent that is not connected to the outside is part of the character: restore it."""
    alpha = cut.getchannel('A')
    empty = alpha.point(lambda v: 255 if v <= 12 else 0)           # 255 = transparent
    outside = empty.copy()
    ImageDraw.floodfill(outside, (0, 0), 128)                      # paint the real background
    holes = outside.point(lambda v: 255 if v == 255 else 0)        # transparent but not reached = hole
    holes = holes.filter(ImageFilter.MaxFilter(3))                 # a hair of margin
    restored = Image.composite(original.convert('RGBA'), cut, holes)
    restored.putalpha(ImageChops.lighter(alpha, holes))
    return restored


def split_columns(alpha: Image.Image, n: int) -> list[tuple[int, int]]:
    """Find n horizontal spans: split at the emptiest columns near the expected boundaries."""
    w, h = alpha.size
    px = alpha.point(lambda v: 255 if v > 40 else 0).load()
    occ = [sum(1 for y in range(0, h, 2) if px[x, y]) for x in range(w)]
    cuts = [0]
    for i in range(1, n):
        expected = int(w * i / n)
        lo, hi = max(expected - w // (n * 3), cuts[-1] + 10), min(expected + w // (n * 3), w - 10)
        cuts.append(min(range(lo, hi), key=lambda x: (occ[x], abs(x - expected))))
    cuts.append(w)
    return list(zip(cuts[:-1], cuts[1:]))


def split_components(alpha: Image.Image, n: int, grid: bool = False):
    """Label the separate shapes in the sheet (one per character) so neighbours never leak into each other.
    Returns n (mask, bbox) pairs sorted left to right, or None if the characters touch each other."""
    f = 4
    small = alpha.resize((alpha.width // f, alpha.height // f), Image.BILINEAR).point(lambda v: 255 if v > 40 else 0)
    sw, sh = small.size
    px = small.load()
    seen = [[False] * sw for _ in range(sh)]
    comps = []
    for y0 in range(sh):
        for x0 in range(sw):
            if px[x0, y0] and not seen[y0][x0]:
                stack, pts = [(x0, y0)], []
                seen[y0][x0] = True
                while stack:
                    x, y = stack.pop()
                    pts.append((x, y))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = x + dx, y + dy
                            if 0 <= nx < sw and 0 <= ny < sh and px[nx, ny] and not seen[ny][nx]:
                                seen[ny][nx] = True
                                stack.append((nx, ny))
                comps.append(pts)
    comps.sort(key=len, reverse=True)
    big = comps[:n]
    if len(big) < n or len(big[-1]) < len(big[0]) * 0.25:
        return None
    result = []
    if grid:   # row-major order: top row left->right, then bottom row left->right
        mid_y = sh / 2
        order = sorted(big, key=lambda c: (sum(y for _, y in c) / len(c) > mid_y, sum(x for x, _ in c) / len(c)))
    else:
        order = sorted(big, key=lambda c: sum(x for x, _ in c) / len(c))
    for pts in order:
        m = Image.new('L', (sw, sh), 0)
        mp = m.load()
        for x, y in pts:
            mp[x, y] = 255
        mask = m.resize(alpha.size, Image.NEAREST).filter(ImageFilter.MaxFilter(15))   # a little margin for soft edges
        piece_alpha = ImageChops.multiply(alpha, mask)
        result.append((mask, piece_alpha.point(lambda v: 255 if v > 10 else 0).getbbox()))
    return result


def flood_cut(sheet: Image.Image) -> Image.Image:
    """For WHITE characters on a white sheet (rembg eats them): background = near-white pixels connected to the sheet edge."""
    rgb = sheet.convert('RGB')
    near_white = rgb.point(lambda v: 255 if v >= 243 else 0).convert('L')
    near_white = ImageChops.darker(ImageChops.darker(rgb.getchannel('R').point(lambda v: 255 if v >= 243 else 0),
                                                    rgb.getchannel('G').point(lambda v: 255 if v >= 243 else 0)),
                                   rgb.getchannel('B').point(lambda v: 255 if v >= 243 else 0))
    bg = near_white.copy()
    for pt in [(0, 0), (bg.width - 1, 0), (0, bg.height - 1), (bg.width - 1, bg.height - 1)]:
        if bg.getpixel(pt) == 255: ImageDraw.floodfill(bg, pt, 128)
    # flood from every border pixel too (the sheet's white margin can be split by characters)
    for x in range(0, bg.width, 8):
        for y in (0, bg.height - 1):
            if bg.getpixel((x, y)) == 255: ImageDraw.floodfill(bg, (x, y), 128)
    alpha = bg.point(lambda v: 0 if v == 128 else 255).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = rgb.convert('RGBA'); out.putalpha(alpha)
    return out


def main(sheet_path: str, prefix: str, names: list[str] | None = None, grid: int = 0, drop: int = -1, flood: bool = False) -> None:
    """grid=6 -> the sheet is a 3x2 grid of 6 characters (row-major); drop = index of the one to ignore (a duplicate face)."""
    global FACES
    if names: FACES = names
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(sheet_path).convert('RGB')
    if flood:
        cut = flood_cut(sheet)
    else:
        cut = remove(sheet, session=new_session('u2net'), post_process_mask=True)   # RGBA for the whole sheet
        cut = fill_holes(cut, sheet)
    alpha = cut.getchannel('A')
    comps = split_components(alpha, grid or len(FACES), grid=bool(grid))
    if comps and drop >= 0: comps = [c for i, c in enumerate(comps) if i != drop]
    pieces = []
    if comps:
        for mask, bbox in comps:
            piece = cut.copy()
            piece.putalpha(ImageChops.multiply(alpha, mask))      # keep only this character
            pieces.append((piece, bbox))
    else:                                                          # characters touch: fall back to straight cuts
        print('note: characters touch, using straight cuts')
        for x0, x1 in split_columns(alpha, len(FACES)):
            piece = cut.crop((x0, 0, x1, cut.height))
            pieces.append((piece, piece.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()))
        pieces = [(Image.new('RGBA', cut.size, (0, 0, 0, 0)), None)] * 0 + pieces

    if grid:   # pieces come from different rows: align them by their feet on one common canvas first
        mw = max(b[2] - b[0] for _, b in pieces); mh = max(b[3] - b[1] for _, b in pieces)
        aligned = []
        for piece, b in pieces:
            c = Image.new('RGBA', (mw, mh), (0, 0, 0, 0))
            crop = piece.crop(b)
            c.paste(crop, ((mw - crop.width) // 2, mh - crop.height), crop)
            aligned.append((c, (0, 0, mw, mh)))
        pieces = aligned

    # one shared canvas: same height for all, centred horizontally
    top = min(b[1] for _, b in pieces)
    bottom = max(b[3] for _, b in pieces)
    width = max(b[2] - b[0] for _, b in pieces)
    pad = 8
    for face, (piece, b) in zip(FACES, pieces):
        canvas = Image.new('RGBA', (width + 2 * pad, bottom - top + 2 * pad), (0, 0, 0, 0))
        crop = piece.crop((b[0], top, b[2], bottom))
        canvas.paste(crop, (pad + (width - (b[2] - b[0])) // 2, pad), crop)
        scale = MAX_H / canvas.height
        canvas = canvas.resize((round(canvas.width * scale), MAX_H), Image.LANCZOS)
        path = os.path.join(OUT, f'{prefix}_{face}.webp')
        canvas.save(path, quality=88, method=6)
        print(f'{prefix}_{face}.webp  {canvas.size[0]}x{canvas.size[1]}  {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict((a[2:].split('=') + [''])[:2] for a in sys.argv[1:] if a.startswith('--'))
    main(args[0], args[1], args[2:] or None, int(opts.get('grid', 0)), int(opts.get('drop', -1)), 'flood' in opts)

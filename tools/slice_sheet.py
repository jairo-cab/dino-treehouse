"""Cut a "5 faces in a row" sheet into 5 game-ready transparent WebP files.

    .venv/bin/python tools/slice_sheet.py art/dinos/trice_sheet.jpg trice

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


def split_components(alpha: Image.Image, n: int):
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
    for pts in sorted(big, key=lambda c: sum(x for x, _ in c) / len(c)):
        m = Image.new('L', (sw, sh), 0)
        mp = m.load()
        for x, y in pts:
            mp[x, y] = 255
        mask = m.resize(alpha.size, Image.NEAREST).filter(ImageFilter.MaxFilter(15))   # a little margin for soft edges
        piece_alpha = ImageChops.multiply(alpha, mask)
        result.append((mask, piece_alpha.point(lambda v: 255 if v > 10 else 0).getbbox()))
    return result


def main(sheet_path: str, prefix: str, names: list[str] | None = None) -> None:
    global FACES
    if names: FACES = names
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(sheet_path).convert('RGB')
    cut = remove(sheet, session=new_session('u2net'), post_process_mask=True)   # RGBA for the whole sheet
    cut = fill_holes(cut, sheet)
    alpha = cut.getchannel('A')
    comps = split_components(alpha, len(FACES))
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
    main(sys.argv[1], sys.argv[2], sys.argv[3:] or None)

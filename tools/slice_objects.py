"""Cut a sheet of separate objects (cols x rows grid, white background) into one transparent WebP per object.

    .venv/bin/python tools/slice_objects.py art/objects/school_sheet.jpg 3 3 schoolbag book_closed book_open pencil crayon rubber pen pencil_case ruler

Each grid cell is cut out on its own (objects can sit very close to each other). Writes assets/processed/obj_<name>.webp
in row-major order; every object keeps its own size (max 512 px on the long side).
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from rembg import new_session, remove
from slice_sheet import OUT, fill_holes

args = [a for a in sys.argv[1:] if not a.startswith('--')]
sheet_path, cols, rows, names = args[0], int(args[1]), int(args[2]), args[3:]
assert len(names) == cols * rows, 'one name per cell'
os.makedirs(OUT, exist_ok=True)
sheet = Image.open(sheet_path).convert('RGB')
session = new_session('u2net')


def bands(profile: list[int], n: int) -> list[tuple[int, int]] | None:
    """Runs of non-empty lines separated by empty (white) lines; None unless exactly n runs are found."""
    runs, start = [], None
    for i, v in enumerate(profile + [0]):
        if v > 0 and start is None: start = i
        if v == 0 and start is not None:
            if i - start > 12: runs.append((start, i))
            start = None
    return runs if len(runs) == n else None


ink = sheet.convert('L').point(lambda v: 255 if v < 235 else 0)       # 255 = not white
w, h = ink.size
px = ink.load()
row_prof = [sum(1 for x in range(0, w, 2) if px[x, y]) for y in range(h)]
row_bands = bands(row_prof, rows)
cells = []
for r in range(rows):
    y0, y1 = row_bands[r] if row_bands else (round(r * h / rows), round((r + 1) * h / rows))
    col_prof = [sum(1 for y in range(y0, y1, 2) if px[x, y]) for x in range(w)]
    col_bands = bands(col_prof, cols) or [(round(c * w / cols), round((c + 1) * w / cols)) for c in range(cols)]
    cells += [(x0, y0, x1, y1) for x0, x1 in col_bands]
print('bands found' if row_bands else 'WARNING: equal cells used')
for i, name in enumerate(names):
    x0, y0, x1, y1 = cells[i]
    cell = sheet.crop((max(0, x0 - 8), max(0, y0 - 8), min(w, x1 + 8), min(h, y1 + 8)))
    cut = fill_holes(remove(cell, session=session, post_process_mask=True), cell)
    if '--largest' in sys.argv:        # drop stray bits (e.g. captions the AI added under a character): keep the biggest shape only
        import numpy as np
        from scipy import ndimage
        a = np.array(cut.getchannel('A')) > 10
        lab, n = ndimage.label(a, structure=np.ones((3, 3)))
        if n > 1:
            sizes = ndimage.sum(a, lab, range(1, n + 1))
            keep = lab == (int(np.argmax(sizes)) + 1)
            keep = ndimage.binary_dilation(keep, iterations=4)
            cut.putalpha(Image.fromarray(((np.array(cut.getchannel('A')) * keep)).astype('uint8')))
    bbox = cut.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    piece = cut.crop(bbox)
    scale = 512 / max(piece.size)
    if scale < 1: piece = piece.resize((round(piece.width * scale), round(piece.height * scale)), Image.LANCZOS)
    path = os.path.join(OUT, f'obj_{name}.webp'); piece.save(path, quality=90, method=6)
    print(f'obj_{name}.webp {piece.size[0]}x{piece.size[1]}')

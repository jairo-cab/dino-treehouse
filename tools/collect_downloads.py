"""Move Gemini downloads from ~/Downloads into assets/raw, naming them in download order.

Usage: python3 -I tools/collect_downloads.py name1 name2 ...
The names are applied oldest-download-first, so pass them in the order you clicked download.
"""
import glob, os, shutil, sys

downloads = os.path.expanduser('~/Downloads')
raw = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'raw')
names = sys.argv[1:]
files = sorted(glob.glob(os.path.join(downloads, 'Gemini_Generated_Image_*')), key=os.path.getmtime)
if len(files) != len(names):
    sys.exit(f'Expected {len(names)} files but found {len(files)}. Nothing moved.')
for src, name in zip(files, names):
    ext = os.path.splitext(src)[1].lower().replace('jpeg', 'jpg')
    dst = os.path.join(raw, name + ext)
    shutil.move(src, dst)
    print(name + ext)

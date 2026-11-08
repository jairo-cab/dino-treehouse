"""Voice lines for the randomised games: every toy x place (Toys), every object x colour (Paint) and the extra Write words.
Then run:  .venv/bin/python tools/make_voices.py      (texts must match src/content/bedroom.ts and paint.ts)"""
import json, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LINES = os.path.join(ROOT, 'src', 'content', 'voice_lines.json')
def slug(s):
    s = re.sub(r"[^a-z' ]", '', s.lower()).replace("'", '').strip()
    return re.sub(r'\s+', '-', s)
toys = ['teddy bear', 'ball', 'robot', 'train']
zones = ['on the bed', 'on the rug', 'in front of the bookcase']
objs = ['ball', 'bed', 'lamp', 'rug', 'teddy bear', 'robot']
colours = ['black', 'blue', 'brown', 'green', 'orange', 'red', 'white', 'yellow']
texts = [f'Put the {t} {z}.' for t in toys for z in zones]
texts += [f'Colour the {o} {c}.' for o in objs for c in colours]
texts += ['door', 'window']                      # extra dictation words
lines = json.load(open(LINES, encoding='utf-8'))
have = {l['key'] for l in lines}
added = 0
for t in texts:
    k = slug(t)
    if k in have: continue
    lines.append({'key': k, 'voice': 'bf_emma', 'text': t}); have.add(k); added += 1
json.dump(lines, open(LINES, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('added', added)

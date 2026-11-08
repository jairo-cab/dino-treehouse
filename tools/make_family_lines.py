"""Narrator lines of the Family game (src/content/family.json) -> voice_lines.json, then run tools/make_voices.py"""
import json, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LINES = os.path.join(ROOT, 'src', 'content', 'voice_lines.json')
fam = json.load(open(os.path.join(ROOT, 'src', 'content', 'family.json'), encoding='utf-8'))
def slug(s):
    s = re.sub(r"[^a-z' ]", '', s.lower()).replace("'", '').strip()
    return re.sub(r'\s+', '-', s)
texts = []
for m in fam['members'].values(): texts += [m['word'], m['line'], m['where']]
texts += [c['text'] for c in fam['clues']]
lines = json.load(open(LINES, encoding='utf-8'))
have = {l['key'] for l in lines}
added = 0
for t in texts:
    k = slug(t)
    if k in have: continue
    lines.append({'key': k, 'voice': 'bf_emma', 'text': t}); have.add(k); added += 1
json.dump(lines, open(LINES, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('added', added)

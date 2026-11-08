"""Adds the narrator lines of the Read / Graduation games (src/content/read.json) to voice_lines.json.
Complete rounds: only the CORRECT filled sentence is recorded (the game never reads a wrong grammar sentence).
Then run:  .venv/bin/python tools/make_voices.py"""
import json, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LINES = os.path.join(ROOT, 'src', 'content', 'voice_lines.json')
bank = json.load(open(os.path.join(ROOT, 'src', 'content', 'read.json'), encoding='utf-8'))
def slug(s):
    s = re.sub(r"[^a-z' ]", '', s.lower()).replace("'", '').strip()
    return re.sub(r'\s+', '-', s)
texts = [c['text'].replace('___', c['answer']) for c in bank['complete']] + [c['text'] for c in bank['circle']]
lines = json.load(open(LINES, encoding='utf-8'))
have = {l['key'] for l in lines}
added = 0
for t in texts:
    k = slug(t)
    if k in have: continue
    lines.append({'key': k, 'voice': 'bf_emma', 'text': t}); have.add(k); added += 1
json.dump(lines, open(LINES, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('added', added)

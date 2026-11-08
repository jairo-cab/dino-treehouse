"""Adds the narrator lines of the School game to src/content/voice_lines.json (only the missing ones).
Then run:  .venv/bin/python tools/make_voices.py
Texts must match src/content/school.ts exactly."""
import json, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LINES = os.path.join(ROOT, 'src', 'content', 'voice_lines.json')
school = json.load(open(os.path.join(ROOT, 'src', 'content', 'school.json'), encoding='utf-8'))

def slug(s):  # same as slug() in src/content/bedroom.ts
    s = re.sub(r"[^a-z' ]", '', s.lower()).replace("'", '').strip()
    return re.sub(r'\s+', '-', s)

texts = ['Stand up!', 'Sit down!']
for p in ('.', ', please.'):
    texts += [f'Open your book{p}', f'Close your book{p}']
    for name in school['items'].values():
        texts += [f'Take out your {name}{p}', f'Put away your {name}{p}']
texts += school['names']

lines = json.load(open(LINES, encoding='utf-8'))
have = {l['key'] for l in lines}
added = 0
for t in texts:
    k = slug(t)
    if k in have: continue
    lines.append({'key': k, 'voice': 'bf_emma', 'text': t}); have.add(k); added += 1
json.dump(lines, open(LINES, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('added', added)

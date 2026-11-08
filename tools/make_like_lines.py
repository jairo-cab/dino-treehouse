"""Adds the voice lines of the Like game to src/content/voice_lines.json (only the missing ones).
Then run:  .venv/bin/python tools/make_voices.py
Texts must match src/content/likes.ts exactly."""
import json, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LINES = os.path.join(ROOT, 'src', 'content', 'voice_lines.json')
likes = json.load(open(os.path.join(ROOT, 'src', 'content', 'likes.json'), encoding='utf-8'))
plural = likes['toys']

def slug(s):  # same as slug() in src/content/bedroom.ts
    s = re.sub(r"[^a-z' ]", '', s.lower()).replace("'", '').strip()
    return re.sub(r'\s+', '-', s)

ASK = 'A toy for me, please!'
like = lambda t: f"I like {plural[t]}. {ASK}"
dislike = lambda t: f"I don't like {plural[t]}."
want = []   # (key, voice, text, pitch)
for d, v in likes['dinos'].items():
    texts = [like(t) for t in v['likes']] + [dislike(t) for t in v['dislikes']]
    texts.append(' '.join(dislike(t) for t in v['dislikes']) + ' ' + ASK)
    texts.append('Thank you!')
    for t in texts:
        want.append((f'{d}-{slug(t)}', v['voice'], t, v['pitch']))
# hatch introductions of the dinos that have an "intro" entry (key = slug of the sentence, like the first four dinos)
for d, v in likes['dinos'].items():
    if 'intro' in v:
        i = v['intro']
        for t in (f"Hi! My name's {i['name']}.", f"I'm {i['age']} {'year' if i['age'] == 'one' else 'years'} old.", f"I like {i['likes']}."):
            want.append((slug(t), v['voice'], t, v['pitch']))
for pron in ('he', 'she'):
    for t in plural:
        q = f'Does {pron} like {plural[t]}?'
        want.append((slug(q), 'bf_emma', q, None))
    for yes in (True, False):
        a = f"{'Yes' if yes else 'No'}, {pron} {'does' if yes else chr(100) + 'oesn' + chr(39) + 't'}."
        want.append((slug(a), 'bf_emma', a, None))

lines = json.load(open(LINES, encoding='utf-8'))
have = {l['key'] for l in lines}
added = 0
for key, voice, text, pitch in want:
    if key in have: continue
    e = {'key': key, 'voice': voice, 'text': text}
    if pitch: e['pitch'] = pitch
    lines.append(e); have.add(key); added += 1
json.dump(lines, open(LINES, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('added', added)

"""Generate the game's English voices with Kokoro (British voices) and export small MP3s.

    .venv/bin/python tools/make_voices.py            # only lines that don't have an mp3 yet
    .venv/bin/python tools/make_voices.py --all      # regenerate everything

Reads src/content/voice_lines.json -> writes public/audio/<key>.mp3
"""
import json, os, subprocess, sys, tempfile

import numpy as np
import soundfile as sf
from kokoro import KPipeline

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LINES = os.path.join(ROOT, 'src', 'content', 'voice_lines.json')
OUT = os.path.join(ROOT, 'public', 'audio')
SPEED = 0.9  # a little slower than normal: clear for 7-year-olds
os.makedirs(OUT, exist_ok=True)

lines = json.load(open(LINES, encoding='utf-8'))
force = '--all' in sys.argv
pipeline = KPipeline(lang_code='b')  # 'b' = British English

for line in lines:
    mp3 = os.path.join(OUT, line['key'] + '.mp3')
    if os.path.exists(mp3) and not force:
        continue
    chunks = [np.asarray(audio) for _, _, audio in pipeline(line['text'], voice=line['voice'], speed=SPEED)]
    audio = np.concatenate(chunks)
    # short silence at the end so clips don't feel cut off
    audio = np.concatenate([audio, np.zeros(int(24000 * 0.15), dtype=audio.dtype)])
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        sf.write(tmp.name, audio, 24000)
    # optional per-line "pitch" ratio (e.g. 1.38) -> child-like voice via rubberband, formants shifted too
    af = []
    if line.get('pitch'):
        af = ['-af', f"rubberband=pitch={line['pitch']}:formant=shifted"]
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, *af, '-ac', '1', '-b:a', '64k', mp3], check=True)
    os.unlink(tmp.name)
    print(line['key'], f'{len(audio) / 24000:.1f}s')

import subprocess
import sys
import json
from pathlib import Path

import imageio_ffmpeg

from voiceover import generate_voiceover

out = Path(sys.argv[1]).resolve()
data_file = Path(sys.argv[2]).resolve()
project = Path(__file__).resolve().parent
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
cues = [
    ('boot.wav', 0, 0.78),
    ('typing.wav', 1920, 0.62), ('unlock.wav', 2750, 0.72),
    ('typing.wav', 6970, 0.62), ('unlock.wav', 7800, 0.72),
    ('typing.wav', 12020, 0.62), ('unlock.wav', 12850, 0.72),
    ('beep.wav', 16300, 0.72), ('beep.wav', 16800, 0.78), ('beep.wav', 17300, 0.88),
    ('shot.wav', 17750, 0.72), ('swish.wav', 17900, 0.86),
    ('impact.wav', 18000, 0.90), ('victory.wav', 18100, 0.82),
]
narration = []
try:
    data = json.loads(data_file.read_text(encoding='utf-8'))
    narration = generate_voiceover(data, out)
except Exception as error:
    print(f'Voiceover unavailable; continuing with sound effects only: {error}', file=sys.stderr)

cmd = [ffmpeg, '-y', '-framerate', '15', '-i', str(out / 'frames' / 'frame-%04d.png')]
for filename, _, _ in cues:
    cmd += ['-i', str(project / 'assets' / filename)]
for filename, _, _ in narration:
    cmd += ['-i', str(filename)]
filters = []
mixes = []
for index, (filename, delay, volume) in enumerate(cues, start=1):
    label = f's{index}'
    repeat = 'aloop=loop=-1:size=3360,atrim=duration=0.78,' if filename == 'typing.wav' else ''
    filters.append(f'[{index}:a]{repeat}adelay={delay}|{delay},volume={volume}[{label}]')
    mixes.append(f'[{label}]')
offset = len(cues) + 1
for index, (_, delay, volume) in enumerate(narration, start=offset):
    label = f'v{index}'
    filters.append(f'[{index}:a]adelay={delay}|{delay},volume={volume}[{label}]')
    mixes.append(f'[{label}]')
filters.append(''.join(mixes) + f'amix=inputs={len(mixes)}:duration=longest:normalize=0,alimiter=limit=0.92[aout]')
cmd += [
    '-filter_complex', ';'.join(filters), '-map', '0:v', '-map', '[aout]',
    '-vf', 'fps=30,format=yuv420p', '-t', '23', '-c:v', 'libx264', '-crf', '18',
    '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    str(out / 'mystery-player.mp4'),
]
subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

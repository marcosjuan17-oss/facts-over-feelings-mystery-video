import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

out = Path(sys.argv[1]).resolve()
project = Path(__file__).resolve().parent
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
cues = [
    ('boot.wav', 0, 0.78),
    ('typing.wav', 1200, 0.55), ('unlock.wav', 2650, 0.72),
    ('typing.wav', 6250, 0.55), ('unlock.wav', 7700, 0.72),
    ('typing.wav', 11300, 0.55), ('unlock.wav', 12750, 0.72),
    ('beep.wav', 16300, 0.72), ('beep.wav', 16800, 0.78), ('beep.wav', 17300, 0.88),
    ('shot.wav', 17750, 0.72), ('swish.wav', 17900, 0.86),
    ('impact.wav', 18000, 0.90), ('victory.wav', 18100, 0.82),
]
cmd = [ffmpeg, '-y', '-framerate', '15', '-i', str(out / 'frames' / 'frame-%04d.png')]
for filename, _, _ in cues:
    cmd += ['-i', str(project / 'assets' / filename)]
filters = []
mixes = []
for index, (_, delay, volume) in enumerate(cues, start=1):
    label = f's{index}'
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

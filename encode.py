"""Mixes sound effects, voiceover and the music bed, normalizes loudness to about
-14 LUFS, and writes two MP4s: mystery-player.mp4 (with music) and
mystery-player-no-music.mp4 (voice + sound effects only, for adding a trending
sound inside TikTok).  Usage: python encode.py <render-dir>"""
import json
import re
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

from voiceover import generate_voiceover

out = Path(sys.argv[1]).resolve()
project = Path(__file__).resolve().parent
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
meta = json.loads((out / 'speech.json').read_text(encoding='utf-8'))
T, FPS, DURATION = meta['timeline'], meta['fps'], meta['duration']
TARGET_LUFS, TARGET_TP = -14.0, -1.5


def run(cmd):
    return subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def duration(file: Path) -> float:
    info = subprocess.run([ffmpeg, '-i', str(file)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True).stderr
    match = re.search(r'Duration: (\d+):(\d+):([\d.]+)', info)
    return int(match[1]) * 3600 + int(match[2]) * 60 + float(match[3]) if match else 0.0


def ms(seconds):
    return int(round(seconds * 1000))


cues = [('boot.wav', 0.0, 0.7)]
bounds = list(T['clueStarts']) + [T['thinkStart']]
for index, start in enumerate(T['clueStarts']):
    end = bounds[index + 1]
    cues += [('impact.wav', start, 0.9), ('typing.wav', start + 0.22, 0.5), ('unlock.wav', start + 0.16, 0.7)]
    tick = start + 1.0
    while tick < end - 0.15:
        left = end - tick
        cues.append(('beep.wav', round(tick, 3), 0.62 if left < 2 else 0.3))
        tick += 0.5 if left < 2 else 1.0
think, name, cta = T['thinkStart'], T['nameStart'], T['ctaStart']
cues += [('beep.wav', think, 0.78), ('beep.wav', think + 0.53, 0.86), ('beep.wav', think + 1.06, 0.96),
         ('shot.wav', name - 0.08, 0.8), ('impact.wav', name, 1.0), ('victory.wav', name + 0.06, 0.85),
         ('swish.wav', cta, 0.62)]

def trimmed(file: Path) -> Path:
    """Strip the silence Edge TTS pads around each line so lines can sit closer together."""
    dest = file.with_suffix('.wav')
    trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02'
    run([ffmpeg, '-y', '-i', str(file), '-af', f'{trim},areverse,{trim},areverse,apad=pad_dur=0.05', str(dest)])
    return dest


narration = []
try:
    lines = [(trimmed(file), start, gain, required) for file, start, gain, required in generate_voiceover(meta, T, out)]
    required_starts = [start for _, start, _, required in lines if required]
    cursor = 0.0
    for file, planned, gain, required in lines:
        start = max(planned, cursor + 0.08)
        end = start + duration(file)
        if not required:
            next_required = min([s for s in required_starts if s > planned], default=DURATION)
            if end > next_required - 0.05:
                continue  # skip a filler line rather than push the next clue late
        narration.append((file, start, gain))
        cursor = end
    if cursor > DURATION - 0.1:
        print(f'Warning: narration runs to {cursor:.1f}s, past the {DURATION}s video', file=sys.stderr)
    print('Narration: ' + ', '.join(f'{f.stem}@{s:.2f}s' for f, s, _ in narration), file=sys.stderr)
except Exception as error:
    print(f'Voiceover unavailable; continuing with sound effects only: {error}', file=sys.stderr)

# 1. Video once, natively 30 fps.
silent = out / 'video-only.mp4'
run([ffmpeg, '-y', '-framerate', str(FPS), '-i', str(out / 'frames' / 'frame-%04d.png'), '-c:v', 'libx264', '-crf', '18',
     '-preset', 'medium', '-pix_fmt', 'yuv420p', '-t', str(DURATION), str(silent)])


def mix(with_music: bool) -> Path:
    inputs, filters, sfx, voice = [], [], [], []

    def add_input(path, prefix=()):
        inputs.extend(prefix)
        inputs.extend(['-i', str(path)])
        return sum(arg == '-i' for arg in inputs) - 1

    for filename, start, gain in cues:
        i = add_input(project / 'assets' / filename)
        repeat = 'aloop=loop=-1:size=3360,atrim=duration=1.1,' if filename == 'typing.wav' else ''
        filters.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo,{repeat}adelay={ms(start)}|{ms(start)},volume={gain}[s{i}]')
        sfx.append(f'[s{i}]')
    for file, start, gain in narration:
        i = add_input(file)
        filters.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay={ms(start)}|{ms(start)},volume={gain}[v{i}]')
        voice.append(f'[v{i}]')
    if voice:
        filters.append(''.join(voice) + f'amix=inputs={len(voice)}:normalize=0:duration=longest,apad=whole_dur={DURATION}[vo]')
    else:
        filters.append(f'anullsrc=r=44100:cl=stereo,atrim=duration={DURATION}[vo]')
    filters.append(''.join(sfx) + f'amix=inputs={len(sfx)}:normalize=0:duration=longest,apad=whole_dur={DURATION}[fx]')
    if with_music:
        # The bed is 20s and written to loop; repeat it so a longer video stays covered.
        i = add_input(project / 'assets' / 'music' / 'arcade-bed.wav', ('-stream_loop', '-1'))
        filters.append('[vo]asplit=2[vo1][vokey]')
        filters.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=duration={DURATION},volume=0.32[bed]')
        filters.append('[bed][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=250[duck]')
        filters.append('[vo1][fx][duck]amix=inputs=3:normalize=0:duration=longest[mix]')
    else:
        filters.append('[vo][fx]amix=inputs=2:normalize=0:duration=longest[mix]')
    filters.append(f'[mix]atrim=duration={DURATION}[out]')
    raw = out / ('mix-music.wav' if with_music else 'mix-plain.wav')
    run([ffmpeg, '-y', *inputs, '-filter_complex', ';'.join(filters), '-map', '[out]', '-ar', '48000', str(raw)])
    return raw


def normalize_and_mux(raw: Path, dest: Path):
    probe = run([ffmpeg, '-hide_banner', '-i', str(raw), '-af',
                 f'loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=11:print_format=json', '-f', 'null', '-']).stderr
    m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
    norm = (f"loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
            f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    run([ffmpeg, '-y', '-i', str(silent), '-i', str(raw), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
         '-af', f'{norm},aresample=48000', '-c:a', 'aac', '-b:a', '192k', '-t', str(DURATION), '-movflags', '+faststart', str(dest)])


normalize_and_mux(mix(True), out / 'mystery-player.mp4')
normalize_and_mux(mix(False), out / 'mystery-player-no-music.mp4')
for temp in ['video-only.mp4', 'mix-music.wav', 'mix-plain.wav']:
    (out / temp).unlink(missing_ok=True)

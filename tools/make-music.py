"""Generate the original arcade music bed used under the daily video.

The track is synthesized from scratch by this script (no samples, no third-party
audio), so it is an original work of this project dedicated to the public domain
under CC0 1.0. See licenses/music-CC0.txt.

Usage: python tools/make-music.py  ->  assets/music/arcade-bed.wav
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
BARS = 10                      # 10 bars at 120 BPM = exactly 20 s, so the bed loops cleanly
LENGTH = int(SR * BEAT * 4 * BARS)
rng = np.random.default_rng(17)


def note(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def square(freq, dur, duty=0.5, vol=0.2):
    t = np.arange(int(SR * dur)) / SR
    wave_ = np.where((t * freq) % 1 < duty, 1.0, -1.0)
    env = np.minimum(1, t / 0.005) * np.exp(-t * 3.5)
    return wave_ * env * vol


def triangle(freq, dur, vol=0.35):
    t = np.arange(int(SR * dur)) / SR
    wave_ = 2 * np.abs(2 * ((t * freq) % 1) - 1) - 1
    env = np.minimum(1, t / 0.004) * np.clip(1 - t / dur, 0, 1)
    return wave_ * env * vol


def kick(vol=0.9):
    t = np.arange(int(SR * 0.18)) / SR
    freq = 120 * np.exp(-t * 28) + 42
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 18) * vol


def hat(vol=0.12):
    t = np.arange(int(SR * 0.05)) / SR
    noise = rng.uniform(-1, 1, len(t))
    noise = np.diff(noise, prepend=0)  # crude high-pass
    return noise * np.exp(-t * 90) * vol


def snare(vol=0.28):
    t = np.arange(int(SR * 0.16)) / SR
    return (rng.uniform(-1, 1, len(t)) * 0.8 + np.sin(2 * np.pi * 190 * t) * 0.4) * np.exp(-t * 24) * vol


out = np.zeros(LENGTH + SR)


def put(sig, at):
    i = int(at * SR)
    out[i:i + len(sig)] += sig[: max(0, len(out) - i)]


# A minor-ish arcade progression: Am - F - C - G (one chord per bar)
prog = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [64, 67, 72]), (55, [67, 71, 74])]
for bar in range(BARS):
    root, arp = prog[bar % 4]
    t0 = bar * 4 * BEAT
    for b in range(4):
        put(kick(), t0 + b * BEAT)
        put(hat(), t0 + b * BEAT + BEAT / 2)
        if b in (1, 3):
            put(snare(), t0 + b * BEAT)
    for step in range(8):  # driving eighth-note bass
        put(triangle(note(root - 12 + (12 if step % 4 == 3 else 0)), BEAT / 2 * 0.9), t0 + step * BEAT / 2)
    for step in range(16):  # sixteenth-note arpeggio
        put(square(note(arp[step % 3]), BEAT / 4 * 0.95, duty=0.25, vol=0.07), t0 + step * BEAT / 4)

out = out[:LENGTH]
fade = int(SR * 0.01)
out[:fade] *= np.linspace(0, 1, fade)
out[-fade:] *= np.linspace(1, 0, fade)
out = out / np.max(np.abs(out)) * 0.8
pcm = (out * 32767).astype('<i2')
dest = Path(__file__).resolve().parent.parent / 'assets' / 'music' / 'arcade-bed.wav'
with wave.open(str(dest), 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(dest)

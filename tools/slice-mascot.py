# Slice The Scout into six square frames.
# Frames sit in a row but not on an even grid. A cluster much wider than
# the others (flames, or a pointing arm that crosses the next pose) is
# split on the thin overlap instead of a hard cut through either sprite.
# Usage: python tools/slice-mascot.py [source.png]
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'assets' / 'mascot-source.png')
NAMES = ['idle', 'thinking', 'surprised', 'pointing', 'celebrate', 'disappointed']
ALPHA = 16


def opaque_runs(image):
    px = image.load()
    width, height = image.size
    runs = []
    start = None
    for x in range(width):
        hit = any(px[x, y][3] > ALPHA for y in range(height))
        if hit and start is None:
            start = x
        elif not hit and start is not None:
            if x - start >= 8:
                runs.append([start, x - 1])
            start = None
    if start is not None and width - start >= 8:
        runs.append([start, width - 1])
    return runs


def column_stats(px, x, height):
    ys = [y for y in range(height) if px[x, y][3] > ALPHA]
    if not ys:
        return None
    return ys[0], ys[-1], len(ys)


def arm_span(image, x0, x1):
    """Y band and last column of the thin pointing arm inside a wide cluster."""
    px = image.load()
    height = image.size[1]
    runs = []
    current = None
    for x in range(x0, x1 + 1):
        stats = column_stats(px, x, height)
        thin = stats and stats[2] < 70 and stats[1] - stats[0] < 60
        if thin:
            if current is None:
                current = [x, x, stats[0], stats[1]]
            else:
                current[1] = x
                current[2] = min(current[2], stats[0])
                current[3] = max(current[3], stats[1])
        elif current:
            runs.append(current)
            current = None
    if current:
        runs.append(current)
    # Ignore a tapering edge. The arm is the thin run with a body on both sides.
    interior = [run for run in runs if run[0] > x0 + 40 and run[1] < x1 - 40]
    if not interior:
        return None
    arm_run = max(interior, key=lambda run: run[1] - run[0])
    arm = [(arm_run[0], arm_run[2], arm_run[3]), (arm_run[1], arm_run[2], arm_run[3])]
    top = min(item[1] for item in arm) - 6
    bottom = max(item[2] for item in arm) + 6
    tip = arm[-1][0]
    for x in range(tip + 1, x1 + 1):
        if not any(px[x, y][3] > ALPHA for y in range(top, bottom + 1)):
            break
        tip = x
    return arm[0][0], tip, top, bottom


def take(image, x0, x1, keep):
    """Copy columns x0..x1. keep(x, y, pixel) decides which pixels survive."""
    cropped = image.crop((x0, 0, x1 + 1, image.height)).copy()
    px = cropped.load()
    for x in range(cropped.width):
        for y in range(cropped.height):
            if not keep(x0 + x, y, px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return cropped


def frames_from(image):
    runs = opaque_runs(image)
    if len(runs) > 6:
        raise SystemExit(f'expected at most 6 sprite clusters, found {len(runs)}')
    pieces = []
    for x0, x1 in runs:
        width = x1 - x0
        others = [b - a for a, b in runs if [a, b] != [x0, x1]]
        median = sorted(others)[len(others) // 2] if others else width
        if width > median * 1.5:
            span = arm_span(image, x0, x1)
            if span is None:
                raise SystemExit('a wide cluster has no arm to split on')
            arm_x0, tip, top, bottom = span
            left = take(image, x0, tip, lambda x, y, p: x < arm_x0 or top <= y <= bottom)
            right = take(image, arm_x0, x1, lambda x, y, p: x > tip or not (top <= y <= bottom))
            pieces.append(left)
            pieces.append(right)
        else:
            pieces.append(image.crop((x0, 0, x1 + 1, image.height)))
    if len(pieces) != 6:
        raise SystemExit(f'could not find 6 frames (got {len(pieces)})')
    return pieces


def trim(frame):
    px = frame.load()
    xs, ys = [], []
    for x in range(frame.width):
        for y in range(frame.height):
            if px[x, y][3] > ALPHA:
                xs.append(x)
                ys.append(y)
    return frame.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1))


def pad_square(frame, side):
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(frame, ((side - frame.width) // 2, (side - frame.height) // 2))
    return canvas


def main():
    image = Image.open(SOURCE).convert('RGBA')
    frames = [trim(piece) for piece in frames_from(image)]
    side = max(max(frame.width, frame.height) for frame in frames)
    frames = [pad_square(frame, side) for frame in frames]
    out_dir = ROOT / 'assets' / 'mascot'
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob('*.png'):
        old.unlink()
    sheet = Image.new('RGBA', (side * 6, side), (0, 0, 0, 0))
    for index, (name, frame) in enumerate(zip(NAMES, frames)):
        frame.save(out_dir / f'{name}.png')
        sheet.paste(frame, (index * side, 0))
    sheet.save(ROOT / 'assets' / 'mascot.png')
    print(f'{len(frames)} frames, {side}px square, sheet {sheet.size[0]}x{sheet.size[1]}')
    for name, frame in zip(NAMES, frames):
        bbox = frame.getbbox()
        print(f'  {name:10} content {bbox}')


if __name__ == '__main__':
    main()

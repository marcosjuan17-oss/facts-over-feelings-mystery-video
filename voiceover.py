import asyncio
import os
from pathlib import Path

import edge_tts


VOICE = os.environ.get('EDGE_TTS_VOICE', 'en-US-GuyNeural')
RATE = os.environ.get('EDGE_TTS_RATE', '+22%')


async def _save_with_retries(text: str, destination: Path) -> None:
    last_error = None
    for attempt in range(3):
        try:
            speech = edge_tts.Communicate(text, VOICE, rate=RATE, volume='+0%')
            await speech.save(str(destination))
            return
        except Exception as error:
            last_error = error
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
    raise RuntimeError(f'Edge TTS failed after three attempts: {last_error}')


async def _generate(data: dict, output: Path):
    lines = [
        ('You know ball? Prove it.', 80, 1.08),
        (data['clues'][0], 2820, 1.12),
        ('Got him yet?', 5350, 1.08),
        (data['clues'][1], 7870, 1.12),
        ('Last chance.', 10950, 1.08),
        (data['clues'][2], 12920, 1.12),
        (f"It's {data['player']}!", 18250, 1.16),
    ]
    voice_dir = output / 'voiceover'
    voice_dir.mkdir(parents=True, exist_ok=True)
    result = []
    for index, (text, delay, volume) in enumerate(lines, start=1):
        destination = voice_dir / f'line-{index}.mp3'
        await _save_with_retries(text, destination)
        result.append((destination, delay, volume))
    return result


def generate_voiceover(data: dict, output: Path):
    if not data.get('player') or len(data.get('clues', [])) != 3:
        raise ValueError('Voiceover requires one player and exactly three clues')
    return asyncio.run(_generate(data, output))

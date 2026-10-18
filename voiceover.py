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


def script(speech: dict, timeline: dict):
    """(text, planned start in seconds, gain, required). The name is spoken at the
    reveal, then the call to action. Optional lines are dropped by encode.py
    when they would crowd a required line."""
    starts = timeline['clueStarts']
    name = speech.get('answer') or 'the mystery player'
    return [
        (speech['hook'], 0.0, 1.08, True),
        (speech['clues'][0], starts[0] + 0.35, 1.12, True),
        ('Got him yet?', starts[1] - 1.3, 1.08, False),
        (speech['clues'][1], starts[1] + 0.35, 1.12, True),
        ('Last chance.', starts[2] - 1.3, 1.08, False),
        (speech['clues'][2], starts[2] + 0.35, 1.12, True),
        ('Lock it in!', timeline['thinkStart'] + 0.05, 1.12, False),
        (f"It's {name}!", timeline['nameStart'] + 0.08, 1.16, True),
        ("Play today's mystery at Play Facts Over Feelings dot com!", timeline['ctaStart'] + 0.06, 1.12, True),
    ]


async def _generate(speech: dict, timeline: dict, output: Path):
    voice_dir = output / 'voiceover'
    voice_dir.mkdir(parents=True, exist_ok=True)
    result = []
    for index, (text, start, volume, required) in enumerate(script(speech, timeline), start=1):
        destination = voice_dir / f'line-{index}.mp3'
        await _save_with_retries(text, destination)
        result.append((destination, start, volume, required))
    return result


def generate_voiceover(speech: dict, timeline: dict, output: Path):
    if len(speech.get('clues', [])) != 3:
        raise ValueError('Voiceover requires exactly three clues')
    return asyncio.run(_generate(speech, timeline, output))

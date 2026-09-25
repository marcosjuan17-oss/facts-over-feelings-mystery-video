# Facts Over Feelings: daily mystery video

This project makes the animated 23-second, 1080 × 1920 Mystery Player video. GitHub runs it at approximately 4:07 p.m. Eastern every day, including when your computer is off. The finished video and ready-to-copy title and hashtags appear on the [latest release](../../releases/latest) page.

## Official production template

V14 is the approved production baseline for every daily video moving forward. It includes the centered `GUESS THE NBA PLAYER?` opening, exactly three clues, left-aligned decoding dots, synchronized typing ticks, enlarged animated mascot reactions, orange final-two-second shot-clock warnings, the lock-in sequence, player reveal, and PlayFactsOverFeelings.com call to action. Free Edge TTS narration reads each clue after it finishes typing and announces the answer on the reveal. The scheduled workflow calls this template directly from `render.mjs`.

## How the daily run works

1. `select.mjs` picks a player from `players.json` who has not appeared yet. After everyone has appeared, it starts with the least recently used player.
2. `render.mjs` creates the complete arcade-game sequence: fast NBA hook, exactly three accumulated clues, decoding dots, typed reveals, animated mascot reactions, shot clocks, lock-in countdown and player reveal. `encode.py` adds timed arcade/basketball sound effects without a looping background pulse.
3. GitHub publishes one clearly labeled MP4 as a release.
4. The selected player and date go into `history.json` so the next run avoids repeats. Running the workflow twice on the same day does not create a second video.

The player pool contains hand-written, source-linked NBA legends. The renderer makes no paid AI calls and does not depend on PixelLab or another external service. The approved mascot animation frames, fonts and sound effects are packaged in the repository. Add more entries to `players.json` over time to expand the pool. Each record needs `player`, `slug`, exactly three clues of at most 56 characters, and source URLs. Keep the player name out of the clues.

### Voiceover

`voiceover.py` generates short challenge-style narration through the free `edge-tts` package: an opening challenge, one read for each clue, quick pressure lines between clues, and a punchy answer reveal. The default is the energetic `en-US-GuyNeural` voice at `+22%` speed. Set `EDGE_TTS_VOICE` or `EDGE_TTS_RATE` in the workflow environment to change those choices later. Generation retries three times; if the online service is temporarily unavailable, the daily video still completes with its normal arcade sound effects.

## Download on a phone

Open the repository's **Releases → Latest** page, tap **Download video**, and save it. The release is public, so no GitHub login is required.

## Run manually

Open **Actions → Daily mystery video → Run workflow**. This is useful for a first test. The scheduled run may start a little late because GitHub does not guarantee an exact minute.

## Run locally

Install Node.js 22+ and Python 3.12+, then run:

```text
npm ci
npx playwright install chromium
python -m pip install -r requirements.txt
node render.mjs player.json
```

For a daily selection, run `node select.mjs` and then `node render.mjs selected.json`. The images, MP4, caption, and source URLs are written to `renders/`.

The included Press Start 2P and Silkscreen font files are distributed under their respective licenses in `licenses/`. The background, original mascot frames and sound design were created for this project.

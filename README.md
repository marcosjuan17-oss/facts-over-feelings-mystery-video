# Facts Over Feelings: daily mystery video

This project makes the animated 23-second, 1080 × 1920 Mystery Player video. GitHub runs it at approximately 4:07 p.m. Eastern every day, including when your computer is off. The finished video and ready-to-copy title and hashtags appear on the [latest release](../../releases/latest) page.

## How the daily run works

1. `select.mjs` picks a player from `players.json` who has not appeared yet. After everyone has appeared, it starts with the least recently used player.
2. `render.mjs` creates the complete arcade-game sequence: fast NBA hook, exactly three accumulated clues, decoding dots, typed reveals, animated mascot reactions, shot clocks, lock-in countdown and player reveal. `encode.py` adds timed arcade/basketball sound effects without a looping background pulse.
3. GitHub publishes the MP4 and `post.txt` as a release.
4. The selected player and date go into `history.json` so the next run avoids repeats. Running the workflow twice on the same day does not create a second video.

The player pool contains hand-written, source-linked NBA legends. The renderer makes no paid AI calls and does not depend on PixelLab or another external service. The approved mascot animation frames, fonts and sound effects are packaged in the repository. Add more entries to `players.json` over time to expand the pool. Each record needs `player`, `slug`, exactly three clues of at most 56 characters, and source URLs. Keep the player name out of the clues.

## Download on a phone

Open the repository's **Releases → Latest** page, tap `mystery-player.mp4`, and save it. Open `post.txt` for the title, caption, and hashtags. The release is public, so no GitHub login is required.

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

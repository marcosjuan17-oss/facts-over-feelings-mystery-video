# Facts Over Feelings: daily mystery video

This project makes the five-slide, silent 1080 × 1920 mystery-player video. GitHub runs it at approximately 4:07 p.m. Eastern every day, including when your computer is off. The video and ready-to-copy title and hashtags appear on the [latest release](../../releases/latest) page. Add music and post manually.

## How the daily run works

1. `select.mjs` picks a player from `players.json` who has not appeared yet. After everyone has appeared, it starts with the least recently used player.
2. `render.mjs` fills the original arena design using the arcade fonts, then `encode.py` creates a silent 23-second MP4. The opening frame lasts 3 seconds; the other four last 5 seconds each.
3. GitHub publishes the MP4 and `post.txt` as a release.
4. The selected player and date go into `history.json` so the next run avoids repeats. Running the workflow twice on the same day does not create a second video.

The first clue pool contains 20 hand-written, source-linked NBA legends. It does not use website stat rows or make paid AI calls. Add more entries to `players.json` over time to expand the pool. Each record needs `player`, `slug`, three clues of at most 56 characters, and a source URL. Keep the player name out of the clues.

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

The included Press Start 2P and Silkscreen font files are distributed under their respective licenses in `licenses/`. The background image was created for this project.

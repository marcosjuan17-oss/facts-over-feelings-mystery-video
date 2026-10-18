# Facts Over Feelings: daily mystery video

This project makes the daily 27-second, 1080 × 1920, 30 fps **Guess the Mystery Player** video for TikTok (@uknowball17) and YouTube Shorts (UknowBall). GitHub runs it every morning, even when your computer is off. The finished videos and a ready-to-paste title and caption appear on the [latest release](../../releases/latest) page.

## What each daily release contains

| File | Use it for |
| --- | --- |
| `mystery-player.mp4` (**with music**) | Post as-is on YouTube Shorts or TikTok. |
| `mystery-player-no-music.mp4` (**no music**) | TikTok, when you want to add a trending sound in the app. |
| `post.txt` | Title + caption + hashtags to copy and paste. The same text is in the release notes. The caption includes the answer. |
| `depixelate-carousel.zip` | The 7-slide Depixelate carousel plus `carousel-caption.txt`. |
| `carousel-01-hook.png` … `carousel-07-cta.png` | The same slides one at a time. |
| `carousel-caption.txt` | Carousel caption and hashtags. It does not include the answer. |

Titles rotate daily so the channel doesn't post the same title every day. The player's name is revealed at the end of the video, spoken in the voiceover, and written in `post.txt` and the release notes.

## The video format

1. **Hook (0–3 s):** a full-frame question mark, plus a challenge line that changes daily (for example "ONLY REAL HOOPERS GET HIM IN 1 CLUE"). The camera eases in the whole time.
2. **Three clues, hard → medium → easy (3–20.4 s):** each clue stays up for about 5.8 seconds, long enough to read the finished line for about 4 seconds. Locked clues are "?" blocks that flip into stat cards. A shot clock ticks on the same column.
3. **Think beat (20.4–22 s):** a 3-2-1 lock-in.
4. **Name (22–24 s):** the name slams in on the jersey nameplate. The voice says the name.
5. **Call to action (24–26.6 s):** "PLAY TODAY'S MYSTERY AT PLAYFACTSOVERFEELINGS.COM".
6. **Loop (26.6–27 s):** a hard cut back to the exact opening frame, so a replay starts clean.

Text stays inside the TikTok/Shorts safe area: below the top 12%, above the bottom 20%, and left of the right 15% where the app buttons sit. Type is big and close to the camera. The picture keeps moving: a slow zoom, a shake and a white flash on each clue, pulsing glows, and floating pixel sparks. The audio is normalized to about −14 LUFS.

The mascot is The Scout, a full-body pixel character. `assets/mascot.png` is a sheet of six square frames in order — idle, thinking, surprised, pointing, celebrate, disappointed — and `assets/mascot/idle.png` (and the other five names) are the same frames on their own. The video draws whichever frame the moment needs, scaled with nearest-neighbor only: idle on the hook, thinking through the clues, surprised when a clue flips, surprised on the countdown, celebrate on the name, and pointing on the call to action. The disappointed frame stays in the sheet. `tools/slice-mascot.py` rebuilds that sheet from the source art.

## Depixelate carousel

The same daily run also makes a 7-slide TikTok photo carousel, 1080 × 1920, in the same pixel-arcade style. It uses the selected player's clues and jersey only. The name and any real photo stay off every slide. The jersey starts as a heavy mosaic and gets clearer: hardest clue, next clue, then the jersey number, then the team color, then a crisp jersey on the easiest clue. The last slide is The Scout pointing at "comment your guess" and PlayFactsOverFeelings.com. The release gets `depixelate-carousel.zip`, the seven PNGs, and `carousel-caption.txt` (hashtags, no answer).

## How today's player is chosen

1. **Same player as the website.** `select.mjs` asks PlayFactsOverFeelings.com which player is today's Daily Mystery Player, using the site's public read-only player-catalog API, so the video and the website's game match. After the guess window the video reveals the name, then points viewers to play daily on the site. The website itself is not changed.
2. **Fallback pool.** If the site can't be reached, or its date isn't today's Eastern date, the video uses this repo's own `players.json` pool instead. That pool follows the weekday theme rotation (Sun legends, Mon 90s, Tue guards, Wed big men, Thu today's stars, Fri 2000s, Sat wings) and avoids players who have already appeared.

Running the workflow twice on the same day never makes a second video.

## The player pool

`players.json` has 118 players, legends and current stars. It is built with `node tools/build-players.mjs` from the website's player catalog, plus hand-written story clues in `data/stories.json`.

- **Story clues:** 20 players have source-linked NBA stories, written as "I…" statements.
- **Data clues:** everyone else gets clues generated from the same stats the website's game uses (era and position, All-Star and All-NBA counts, rings and MVPs).
- **To add or improve a story,** edit `data/stories.json`, then run `node tools/build-players.mjs`.

`node validate-players.mjs` runs on every pull request and before each daily video. It rejects a player when:

- a clue contains his name or one of his nicknames (for example "Hack-a-Shaq");
- the clues aren't labelled hard, medium, easy, in that order;
- a clue is longer than 56 characters, or sources are missing;
- the pool drops below 100 players.

## Voiceover and sound

`voiceover.py` uses the free `edge-tts` package to read the hook, each clue, short pressure lines, then the player's name and "Play today's mystery at Play Facts Over Feelings dot com". If the free voice service is down, the video still completes with sound effects and music.

The music bed, `assets/music/arcade-bed.wav`, is original. It was synthesized by `tools/make-music.py` and dedicated to the public domain (CC0), so it can't trigger copyright claims; see `licenses/music-CC0.txt`. The sound effects and background were created for this project. The fonts are OFL-licensed (see `licenses/`).

## Optional: automatic YouTube Shorts upload (off by default)

The workflow uploads to YouTube only when all three secrets below exist. Without them, the step is skipped and nothing else changes. TikTok is always posted by hand.

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable **YouTube Data API v3**.
2. Under **APIs & Services → OAuth consent screen**, set it up as *External* and add your Google account as a test user. Then, under **Credentials**, create an **OAuth client ID** of type *Desktop app*.
3. Get a refresh token for your YouTube channel with the `https://www.googleapis.com/auth/youtube.upload` scope. The easiest way is [Google's OAuth Playground](https://developers.google.com/oauthplayground): click the gear, tick *Use your own OAuth credentials*, paste the client ID and secret, authorize that scope, then click *Exchange authorization code for tokens*.
4. In this repo, open **Settings → Secrets and variables → Actions** and add the secrets `YT_CLIENT_ID`, `YT_CLIENT_SECRET` and `YT_REFRESH_TOKEN`.
5. Optional: add a **variable** called `YOUTUBE_PRIVACY` set to `private` or `unlisted` to review each upload before it goes public. The default is `public`.

Google keeps uploads from unverified API projects **private** until the project passes Google's API audit. Until then, open YouTube Studio and switch each video to Public yourself. A refresh token issued while the consent screen is in *Testing* expires after 7 days; publish the consent screen to keep it working.

## Download on a phone

Open the repository's **Releases → Latest** page, tap the video you want, and save it. The release is public, so no GitHub login is needed.

## Run manually

Open **Actions → Daily mystery video → Run workflow**. Scheduled runs can start a few hours late because GitHub doesn't guarantee the exact minute.

## Run locally

Install Node.js 22+ and Python 3.12+, then run:

```text
npm ci
npx playwright install chromium
python -m pip install -r requirements.txt
node select.mjs
node render.mjs selected.json
```

To render one specific player without choosing a daily one, run `node render.mjs player.json`. Output goes to `renders/`.

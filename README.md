# Facts Over Feelings: daily mystery video

This project makes the daily 20-second, 1080 × 1920, 30 fps **Guess the Mystery Player** video for TikTok (@uknowball17) and YouTube Shorts (UknowBall). GitHub runs it every morning, even when your computer is off. The finished videos and a ready-to-paste title and caption appear on the [latest release](../../releases/latest) page.

## What each daily release contains

| File | Use it for |
| --- | --- |
| `mystery-player.mp4` (**with music**) | Post as-is on YouTube Shorts or TikTok. |
| `mystery-player-no-music.mp4` (**no music**) | TikTok, when you want to add a trending sound in the app. |
| `post.txt` | Title + caption + hashtags to copy and paste. The same text is in the release notes. |

Titles rotate daily so the channel doesn't post the same title every day. The answer is never shown or spoken in the video, and never written in the release notes.

## The video format

1. **Hook (0–1.6 s):** the mystery player's jersey number in his team color, plus a challenge line that changes daily (for example "ONLY REAL HOOPERS GET HIM IN 1 CLUE").
2. **Three clues, hard → medium → easy (1.6–14.5 s):** decoding dots, typed text, mascot reactions and a shot clock.
3. **Lock-in countdown (14.5–16 s).**
4. **Call to action (16–19.4 s):** "ANSWER + TODAY'S GAME: PLAYFACTSOVERFEELINGS.COM — LINK IN BIO" and "1, 2 OR 3 CLUES? COMMENT".
5. **Loop (19.4–20 s):** the ending fades back into the opening hook, so the video replays seamlessly.

Everything important stays inside the TikTok/Shorts safe area: below the top tabs, above the caption area, and left of the like/comment/share buttons. The audio is normalized to about −14 LUFS, which matches TikTok and YouTube playback loudness.

## How today's player is chosen

1. **Same player as the website.** `select.mjs` asks PlayFactsOverFeelings.com which player is today's Daily Mystery Player, using the site's public read-only player-catalog API, so the video and the website's game match. The video doesn't reveal the name, which pushes viewers to the site for the answer. The website itself is not changed.
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

`voiceover.py` uses the free `edge-tts` package to read the hook, each clue, short pressure lines and the call to action. It never says the answer. If the free voice service is down, the video still completes with sound effects and music.

The music bed, `assets/music/arcade-bed.wav`, is original. It was synthesized by `tools/make-music.py` and dedicated to the public domain (CC0), so it can't trigger copyright claims; see `licenses/music-CC0.txt`. The sound effects, mascot frames and background were created for this project. The fonts are OFL-licensed (see `licenses/`).

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

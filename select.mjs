// Chooses today's mystery player and writes selected.json.
//
// 1. Tie-in: ask the Facts Over Feelings website which player is today's daily
//    mystery (public, read-only GET). The video reveals that name after the
//    guess window, then sends viewers to play the daily game on the site.
// 2. Fallback: if the site is unreachable or its date differs from today's
//    Eastern date, pick from this repo's own pool, preferring today's weekday
//    theme and players that have not appeared yet.
// This script does not print the player's name, so Action logs stay quiet.
import fs from 'node:fs/promises';
import {randomInt} from 'node:crypto';
import {dataClues, themeTags} from './lib/clues.mjs';
import {HOOK_LINES, TITLES, WEEKDAY_THEMES, pick, postText, themeFor, weekday} from './lib/daily.mjs';

const SITE_API = 'https://playfactsoverfeelings.com/api/comparison-data';
const players = JSON.parse(await fs.readFile('players.json', 'utf8'));
const history = JSON.parse(await fs.readFile('history.json', 'utf8'));
const date = process.env.VIDEO_DATE || new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const output = async (text) => { if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, text); };

if (history.some(entry => entry.date === date)) {
  console.log(`A video was already made for ${date}.`);
  await output('skip=true\n');
  process.exit(0);
}

const bySlug = new Map();
for (const player of players) for (const key of [player.slug, ...(player.aliases ?? [])]) bySlug.set(key, player);

async function sitePlayer() {
  if (process.env.SITE_TIE_IN === 'off') return null;
  try {
    const response = await fetch(`${SITE_API}?v=daily-rotation-2`, {signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const body = await response.json();
    const key = body.dailyMysteryKey;
    if (!key) throw Error('no dailyMysteryKey in response');
    if (body.date !== date) throw Error(`site date ${body.date} is not today's Eastern date ${date}`);
    const known = bySlug.get(key);
    if (known) return known;
    const site = body.players?.[key];
    if (!site) throw Error('site player has no catalog record');
    return {slug: key, player: site.name, aliases: [], nicknames: [], position: site.position, jersey: String(site.jerseyNumber ?? ''),
      color: site.color ?? '#FF6428', era: site.era, themes: themeTags(site), clue_style: 'data', clues: dataClues(site), sources: [`${SITE_API}#${key}`]};
  } catch (error) {
    console.warn(`Facts Over Feelings tie-in unavailable (${error.message}); using this repo's own pool.`);
    return null;
  }
}

function poolPlayer() {
  const theme = WEEKDAY_THEMES[weekday(date)];
  const lastUsed = new Map(history.map((entry, index) => [entry.slug, index]));
  const themed = players.filter(player => player.themes?.includes(theme.tag));
  const pool = themed.length >= 7 ? themed : players;
  const keys = (player) => [player.slug, ...(player.aliases ?? [])];
  const unused = pool.filter(player => !keys(player).some(key => lastUsed.has(key)));
  const age = (player) => Math.max(-1, ...keys(player).map(key => lastUsed.get(key) ?? -1));
  const oldest = Math.min(...pool.map(age));
  const candidates = unused.length ? unused : pool.filter(player => age(player) === oldest);
  return candidates[randomInt(candidates.length)];
}

const fromSite = await sitePlayer();
const chosen = fromSite ?? poolPlayer();
const theme = themeFor(chosen, date);
const hook = pick(HOOK_LINES, date, 'hook');
const title = pick(TITLES, date, 'title')(chosen, theme);
const post = postText({player: chosen, date, theme, title});
const selected = {...chosen, date, source: fromSite ? 'facts-over-feelings' : 'pool', theme, hook, title, post};
await fs.writeFile('selected.json', JSON.stringify(selected, null, 2));
console.log(`Selected today's player for ${date} from ${selected.source} (${theme.label}).`);
await output(`skip=false\ndate=${date}\nslug=${chosen.slug}\n`);

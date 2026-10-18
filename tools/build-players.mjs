// Rebuilds players.json from the Facts Over Feelings player catalog plus the
// hand-written story clues in data/stories.json.
//
// Usage: node tools/build-players.mjs [catalog.json]
// Without an argument it downloads the live catalog from
// https://playfactsoverfeelings.com/api/comparison-data (read-only).
import fs from 'node:fs/promises';
import {dataClues, themeTags} from '../lib/clues.mjs';

const CATALOG_URL = 'https://playfactsoverfeelings.com/api/comparison-data';
const catalog = process.argv[2]
  ? JSON.parse(await fs.readFile(process.argv[2], 'utf8'))
  : await (await fetch(CATALOG_URL)).json();
const stories = JSON.parse(await fs.readFile(new URL('../data/stories.json', import.meta.url), 'utf8'));
const storyBySlug = new Map(stories.map((story) => [story.slug, story]));

const entry = (slug, site, story) => {
  const profile = site ?? story.profile;
  return {
    slug,
    player: profile.name ?? profile.player,
    aliases: story?.aliases ?? [],
    nicknames: story?.nicknames ?? [],
    position: profile.position,
    jersey: String(profile.jerseyNumber ?? ''),
    color: profile.color ?? '#FF6428',
    era: profile.era,
    themes: themeTags(profile),
    clue_style: story ? 'story' : 'data',
    clues: story ? story.clues : dataClues(site),
    sources: story ? story.sources : [`${CATALOG_URL}#${slug}`],
  };
};

const players = Object.entries(catalog.players).map(([slug, site]) => entry(slug, site, storyBySlug.get(slug)));
for (const story of stories) if (!catalog.players[story.slug]) players.push(entry(story.slug, null, story));
players.sort((a, b) => a.slug.localeCompare(b.slug));
await fs.writeFile(new URL('../players.json', import.meta.url), `${JSON.stringify(players, null, 2)}\n`);
console.log(`Wrote ${players.length} players (${players.filter((p) => p.clue_style === 'story').length} with story clues).`);

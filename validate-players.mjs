// Fails (exit code 1) when any clue set would give away the answer or breaks the format.
import fs from 'node:fs/promises';
import {checkEntry} from './lib/clues.mjs';

const file = process.argv[2] ?? 'players.json';
const players = JSON.parse(await fs.readFile(file, 'utf8'));
const errors = [];
const seen = new Set();
for (const entry of players) {
  for (const key of [entry.slug, ...(entry.aliases ?? [])]) {
    if (seen.has(key)) errors.push(`${entry.slug}: duplicate slug or alias "${key}"`);
    seen.add(key);
  }
  for (const problem of checkEntry(entry)) errors.push(`${entry.slug}: ${problem}`);
}
if (players.length < 100) errors.push(`pool has ${players.length} players; keep at least 100`);
if (errors.length) {
  console.error(`players.json failed validation:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`players.json OK: ${players.length} players, every clue set ordered hard → medium → easy with no name or nickname giveaways.`);

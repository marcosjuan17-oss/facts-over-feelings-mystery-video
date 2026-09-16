import fs from 'node:fs/promises';
import { randomInt } from 'node:crypto';

const players = JSON.parse(await fs.readFile('players.json', 'utf8'));
const history = JSON.parse(await fs.readFile('history.json', 'utf8'));
const date = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

if (history.some(entry => entry.date === date)) {
  console.log(`A video was already made for ${date}.`);
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, 'skip=true\n');
  process.exit(0);
}

const lastUsed = new Map(history.map((entry, index) => [entry.slug, index]));
const unused = players.filter(player => !lastUsed.has(player.slug));
const oldest = Math.min(...players.map(player => lastUsed.get(player.slug) ?? -1));
const candidates = unused.length ? unused : players.filter(player => lastUsed.get(player.slug) === oldest);
const chosen = candidates[randomInt(candidates.length)];
await fs.writeFile('selected.json', JSON.stringify({ ...chosen, date }, null, 2));
console.log(`Selected ${chosen.player} for ${date}.`);
if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `skip=false\ndate=${date}\nslug=${chosen.slug}\n`);

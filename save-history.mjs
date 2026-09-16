import fs from 'node:fs/promises';
const history = JSON.parse(await fs.readFile('history.json', 'utf8'));
const { date, slug } = JSON.parse(await fs.readFile('selected.json', 'utf8'));
if (!history.some(entry => entry.date === date)) {
  history.push({ date, slug });
  await fs.writeFile('history.json', `${JSON.stringify(history, null, 2)}\n`);
}

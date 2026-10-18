// Shared helpers for building and checking mystery-player clue sets.

export const DIFFICULTY_ORDER = ['hard', 'medium', 'easy'];
export const MAX_CLUE = 56;

const POSITIONS = {PG: 'point guard', SG: 'shooting guard', SF: 'small forward', PF: 'power forward', C: 'center'};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function startYear(era = '') {
  return Number.parseInt(String(era).slice(0, 4), 10) || null;
}

// Theme tags are used for the weekday theme rotation and the on-screen edition label.
export function themeTags({position, era, accolades = {}}) {
  const tags = [];
  const year = startYear(era);
  if (year) tags.push(year < 1990 ? '80s' : year < 2000 ? '90s' : year < 2010 ? '2000s' : year < 2020 ? '2010s' : '2020s');
  if (['C', 'PF'].includes(position)) tags.push('big-man');
  if (['PG', 'SG'].includes(position)) tags.push('guard');
  if (position === 'SF') tags.push('wing');
  if (/present/i.test(era)) tags.push('active');
  else if ((accolades.allstar ?? 0) >= 8 || (accolades.mvp ?? 0) > 0) tags.push('legend');
  return tags;
}

// Builds a hard -> easy clue set from the Facts Over Feelings catalog record
// (the same data the website's daily game uses). Used when no story clues exist.
export function dataClues(site) {
  const pos = POSITIONS[site.position] ?? 'player';
  const a = site.accolades ?? {};
  const active = /present/i.test(site.era);
  const hard = active
    ? `A ${pos} in the NBA since ${startYear(site.era)}`
    : `A ${pos} who played ${site.era.replace('–', '-')}`;
  let medium;
  if (a.allstar > 0) medium = `${a.allstar}x All-Star, ${a.allnba > 0 ? `${a.allnba}x All-NBA` : 'never All-NBA'}`;
  else if (a.alldef > 0) medium = `Never an All-Star, but ${a.alldef}x All-Defense`;
  else medium = `Never an All-Star across ${plural(site.seasons, 'season')}`;
  let easy;
  if (a.rings > 0 || a.mvp > 0) {
    const parts = [plural(a.rings, 'ring'), plural(a.mvp, 'MVP')];
    if (a.fmvp > 0) parts.push(plural(a.fmvp, 'Finals MVP'));
    easy = parts.join(', ');
  } else {
    easy = `Best season: ${site.peak.season.replace('–', '-')}, still no ring`;
  }
  return [
    {text: hard, difficulty: 'hard'},
    {text: medium, difficulty: 'medium'},
    {text: easy, difficulty: 'easy'},
  ];
}

const STOPWORDS = new Set(['the', 'and', 'jr', 'sr', 'iii']);

export function nameTokens(entry) {
  const nicknames = entry.nicknames ?? [];
  const split = (value) => normalize(value).split(' ').filter((word) => word.length >= 3 && !STOPWORDS.has(word));
  const words = [...split(entry.player), ...nicknames.filter((nick) => split(nick).length === 1).flatMap(split)];
  const phrases = [entry.player, ...nicknames].map((value) => normalize(value).replace(/^the /, '')).filter(Boolean);
  return {words: [...new Set(words)], phrases: [...new Set(phrases)]};
}

export const normalize = (value) => String(value).toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Returns a list of problems; an empty list means the entry is valid.
export function checkEntry(entry) {
  const problems = [];
  if (!entry.slug || !/^[a-z0-9-]+$/.test(entry.slug)) problems.push('slug must be lowercase letters, numbers and dashes');
  if (!entry.player || entry.player.length > 24) problems.push('player name is required (max 24 characters)');
  if (!Array.isArray(entry.clues) || entry.clues.length !== 3) {
    problems.push('needs exactly three clues');
    return problems;
  }
  const order = entry.clues.map((clue) => clue.difficulty);
  if (order.join() !== DIFFICULTY_ORDER.join()) problems.push(`clue difficulty must be ordered hard, medium, easy (got ${order.join(', ')})`);
  const {words, phrases} = nameTokens(entry);
  entry.clues.forEach((clue, index) => {
    if (typeof clue.text !== 'string' || !clue.text.trim()) problems.push(`clue ${index + 1} is empty`);
    else {
      if (clue.text.length > MAX_CLUE) problems.push(`clue ${index + 1} is longer than ${MAX_CLUE} characters`);
      const text = ` ${normalize(clue.text)} `;
      const leakedWord = words.find((word) => text.includes(` ${word} `));
      const leakedPhrase = phrases.find((phrase) => phrase && text.includes(` ${phrase} `));
      if (leakedWord || leakedPhrase) problems.push(`clue ${index + 1} gives away the answer ("${leakedPhrase || leakedWord}")`);
    }
  });
  if (!Array.isArray(entry.sources) || entry.sources.length === 0) problems.push('needs at least one source URL');
  if (!['story', 'data'].includes(entry.clue_style)) problems.push('clue_style must be "story" or "data"');
  return problems;
}

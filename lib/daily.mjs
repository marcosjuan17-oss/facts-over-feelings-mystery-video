// Daily choices that rotate deterministically by date: theme, hook line and post title.
import {createHash} from 'node:crypto';

export const pick = (list, date, salt) => {
  const hash = createHash('sha256').update(`${date}:${salt}`).digest();
  return list[hash.readUInt32BE(0) % list.length];
};

// Weekday theme rotation (0 = Sunday). Used to filter the pool when the video
// is not tied to the website's player, and as the on-screen edition label.
export const WEEKDAY_THEMES = [
  {tag: 'legend', label: 'LEGENDS EDITION'},
  {tag: '90s', label: "90s EDITION"},
  {tag: 'guard', label: 'GUARD EDITION'},
  {tag: 'big-man', label: 'BIG MAN EDITION'},
  {tag: 'active', label: "TODAY'S STARS EDITION"},
  {tag: '2000s', label: '2000s EDITION'},
  {tag: 'wing', label: 'WING EDITION'},
];

const TAG_LABELS = Object.fromEntries(WEEKDAY_THEMES.map(({tag, label}) => [tag, label]));
Object.assign(TAG_LABELS, {'80s': '80s EDITION', '2010s': '2010s EDITION', '2020s': 'NEW SCHOOL EDITION'});

export function weekday(date) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

// Theme label for a known player: prefer today's weekday theme when it fits.
export function themeFor(player, date) {
  const today = WEEKDAY_THEMES[weekday(date)];
  if (player.themes?.includes(today.tag)) return today;
  const tag = player.themes?.find((value) => TAG_LABELS[value]) ?? 'legend';
  return {tag, label: TAG_LABELS[tag] ?? 'MYSTERY EDITION'};
}

export const HOOK_LINES = [
  'ONLY REAL HOOPERS GET HIM IN 1 CLUE',
  '90% OF FANS NEED ALL 3 CLUES',
  'NAME HIM BEFORE THE SHOT CLOCK HITS 0',
  'YOU KNOW BALL? PROVE IT.',
  "BET YOU CAN'T GET HIM IN 1 CLUE",
  'WHO WORE THIS JERSEY?',
  'GET HIM IN 1 AND YOU KNOW BALL',
];

export const TITLES = [
  (p) => `Can You Name This NBA Player in 3 Clues?`,
  (p) => `Who Wore #${p.jersey}? Guess the Mystery NBA Player`,
  (p) => `Only True Hoopers Get This One in 1 Clue`,
  (p) => `Guess the NBA Player Before the Shot Clock Hits 0`,
  (p, theme) => `${titleCase(theme.label)}: Name the Mystery NBA Player`,
  (p) => `3 Clues, 1 Player. How Fast Can You Get Him?`,
  (p) => `NBA Mystery Player: Most Fans Need All 3 Clues`,
];

const titleCase = (value) => value.toLowerCase().replace(/(^|[\s'])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/'S\b/g, "'s").replace(/(\d)S\b/g, '$1s');

export const HASHTAGS = ['#NBA', '#NBATrivia', '#GuessThePlayer', '#BasketballTrivia', '#NBAHistory', '#UknowBall', '#FactsOverFeelings', '#Shorts'];

export function postText({player, date, theme, title}) {
  const caption = [
    `Answer: ${player.player}`,
    `1, 2 or 3 clues? Comment how many you needed 👇`,
    `Play daily at PlayFactsOverFeelings.com (link in bio)`,
    '',
    HASHTAGS.join(' '),
  ].join('\n');
  return {
    title,
    caption,
    text: `TITLE\n${title}\n\nCAPTION\n${caption}\n\nTHEME\n${theme.label}\n\nDATE\n${date}\n`,
  };
}

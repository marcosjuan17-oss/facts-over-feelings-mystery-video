// Copy and reveal steps for the Depixelate the Player carousel.
// Seven 1080×1920 slides. The player's name is never part of a slide or the caption.
import {HASHTAGS} from './daily.mjs';
import {nameTokens} from './clues.mjs';

export const SLIDE_COUNT = 7;

// Stable per calendar date, and deliberately not the jersey number.
export function mysteryNumber(date) {
  const [year, month, day] = String(date).split('-').map(Number);
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.round((current - start) / 86400000) + 1;
}

export function carouselSlides(player, date) {
  const clues = player.clues.map((clue) => clue.text.toUpperCase());
  const [hardest, next, easiest] = clues;
  const number = mysteryNumber(date);
  const jersey = String(player.jersey || '');
  const color = player.color || '#FF6A1A';
  return [
    {
      id: '01-hook',
      headline: ['GUESS THE', 'MYSTERY PLAYER'],
      kicker: `#${number}`,
      sub: 'ONLY 1% GET IT',
      clue: null,
      pixel: 0,
      showNumber: false,
      color: null,
      jersey,
      scout: null,
    },
    slide('02-impossible', ['1%', 'IMPOSSIBLE'], hardest, 48, false, null, jersey),
    slide('03-hard', ['25%', 'HARD'], next, 28, false, null, jersey),
    slide('04-medium', ['50%', 'MEDIUM'], next, 16, true, null, jersey),
    slide('05-easy', ['75%', 'EASY'], easiest, 8, true, color, jersey),
    slide('06-obvious', ['99%', 'TOO EASY NOW'], easiest, 1, true, color, jersey),
    {
      id: '07-cta',
      headline: ['COMMENT', 'YOUR GUESS'],
      kicker: null,
      sub: "ANSWER + PLAY TODAY'S AT PLAYFACTSOVERFEELINGS.COM",
      clue: null,
      pixel: 0,
      showNumber: false,
      color: null,
      jersey: null,
      scout: 'pointing',
    },
  ];
}

function slide(id, headline, clue, pixel, showNumber, color, jersey) {
  return {id, headline, kicker: null, sub: null, clue, pixel, showNumber, color, jersey, scout: null};
}

export function carouselCaption(date) {
  const number = mysteryNumber(date);
  return [
    `Guess the mystery player #${number}. Only 1% get it.`,
    'Comment your guess.',
    "Play today's mystery at PlayFactsOverFeelings.com",
    '',
    HASHTAGS.join(' '),
  ].join('\n');
}

function leaksIn(text, player) {
  const copy = ` ${String(text).toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, ' ')} `;
  const {words, phrases} = nameTokens(player);
  return [...words, ...phrases].filter((token) => token && copy.includes(` ${token} `));
}

// Clues are the only viewer text that comes from the player. Headlines are fixed,
// and the call to action is allowed to say "answer" (Allen's nickname) as the
// instruction to guess, not as his name.
export function nameLeaks(player, date) {
  const clues = carouselSlides(player, date).map((slide) => slide.clue).filter(Boolean).join('\n');
  return leaksIn(clues, player);
}

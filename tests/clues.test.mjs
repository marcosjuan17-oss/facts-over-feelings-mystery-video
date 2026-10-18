import test from 'node:test';
import assert from 'node:assert/strict';
import {checkEntry, dataClues} from '../lib/clues.mjs';
import {postText} from '../lib/daily.mjs';
import {DURATION, TIMELINE} from '../lib/timeline.mjs';

const base = {slug: 'shaquille-o-neal', player: "Shaquille O'Neal", nicknames: ['Shaq', 'Diesel'], clue_style: 'story', sources: ['https://www.nba.com']};
const clues = (a, b, c) => [{text: a, difficulty: 'hard'}, {text: b, difficulty: 'medium'}, {text: c, difficulty: 'easy'}];

test('rejects a clue that contains a nickname', () => {
  const problems = checkEntry({...base, clues: clues('I brought down two hoops as a rookie', 'Teams fouled me on purpose', 'They called that tactic Hack-a-Shaq')});
  assert.ok(problems.some((p) => p.includes('gives away')));
});

test('rejects a clue that contains the last name', () => {
  const problems = checkEntry({...base, clues: clues('One', "O'Neal won titles", 'Three')});
  assert.ok(problems.some((p) => p.includes('gives away')));
});

test('rejects clues that are not ordered hard, medium, easy', () => {
  const entry = {...base, clues: clues('A', 'B', 'C')};
  entry.clues[0].difficulty = 'easy';
  assert.ok(checkEntry(entry).some((p) => p.includes('ordered')));
});

test('accepts the fixed Shaq clues', () => {
  assert.deepEqual(checkEntry({...base, clues: clues('I brought down two hoops as a rookie', 'Teams fouled me on purpose at the foul line', 'I won three straight Finals MVPs in L.A.')}), []);
});

test('caption names the player and sends viewers to the daily game', () => {
  const post = postText({
    player: {player: 'Allen Iverson', jersey: '3'},
    date: '2026-10-17',
    theme: {label: '90s EDITION'},
    title: 'Can You Name This NBA Player in 3 Clues?',
  });
  assert.match(post.caption, /Answer: Allen Iverson/);
  assert.match(post.caption, /PlayFactsOverFeelings\.com/);
  assert.match(post.text, /Allen Iverson/);
});

test('one end card holds the name and the CTA inside 22–25 seconds', () => {
  assert.ok(DURATION >= 22 && DURATION <= 25);
  assert.ok(TIMELINE.lockStart < TIMELINE.endStart);
  assert.ok(TIMELINE.endStart < TIMELINE.loopStart);
  assert.ok(TIMELINE.loopStart < DURATION);
  assert.equal(TIMELINE.revealStart, undefined);
  assert.equal(TIMELINE.ctaStart, undefined);
  assert.equal(TIMELINE.clueStarts[0], TIMELINE.hookEnd);
});

test('data clues never include the player name', () => {
  const site = {name: 'Chris Webber', position: 'PF', era: '1993–2008', seasons: 15, peak: {season: '1999–00'}, accolades: {rings: 0, mvp: 0, fmvp: 0, allstar: 5, allnba: 5, alldef: 0}};
  const entry = {slug: 'chris-webber', player: site.name, clue_style: 'data', sources: ['x'], clues: dataClues(site)};
  assert.deepEqual(checkEntry(entry), []);
});

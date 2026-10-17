import test from 'node:test';
import assert from 'node:assert/strict';
import {checkEntry, dataClues} from '../lib/clues.mjs';

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

test('data clues never include the player name', () => {
  const site = {name: 'Chris Webber', position: 'PF', era: '1993–2008', seasons: 15, peak: {season: '1999–00'}, accolades: {rings: 0, mvp: 0, fmvp: 0, allstar: 5, allnba: 5, alldef: 0}};
  const entry = {slug: 'chris-webber', player: site.name, clue_style: 'data', sources: ['x'], clues: dataClues(site)};
  assert.deepEqual(checkEntry(entry), []);
});

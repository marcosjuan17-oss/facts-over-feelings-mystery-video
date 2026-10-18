import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {carouselCaption, carouselSlides, mysteryNumber, nameLeaks} from '../lib/carousel.mjs';

const player = {
  player: 'Allen Iverson',
  nicknames: ['The Answer', 'AI', 'Bubba Chuck'],
  jersey: '3',
  color: '#3B82F6',
  clues: [
    {text: 'I stepped over Tyronn Lue in a Finals win', difficulty: 'hard'},
    {text: 'I crossed over Michael Jordan as a rookie', difficulty: 'medium'},
    {text: "I made 'practice' a famous press conference", difficulty: 'easy'},
  ],
};

test('mystery number follows the calendar date and is not the jersey', () => {
  assert.equal(mysteryNumber('2026-10-18'), 291);
  assert.equal(mysteryNumber('2026-01-01'), 1);
  assert.notEqual(String(mysteryNumber('2026-10-18')), player.jersey);
});

test('seven slides depixelate the jersey without ever naming the player', () => {
  const slides = carouselSlides(player, '2026-10-18');
  assert.equal(slides.length, 7);
  assert.deepEqual(slides.map((slide) => slide.pixel), [0, 48, 28, 16, 8, 1, 0]);
  assert.deepEqual(slides.map((slide) => slide.showNumber), [false, false, false, true, true, true, false]);
  assert.equal(slides[0].kicker, '#291');
  assert.equal(slides[1].clue, player.clues[0].text.toUpperCase());
  assert.equal(slides[2].clue, player.clues[1].text.toUpperCase());
  assert.equal(slides[3].clue, player.clues[1].text.toUpperCase());
  assert.equal(slides[4].clue, player.clues[2].text.toUpperCase());
  assert.equal(slides[5].clue, player.clues[2].text.toUpperCase());
  assert.equal(slides[1].color, null);
  assert.equal(slides[3].color, null);
  assert.equal(slides[4].color, '#3B82F6');
  assert.equal(slides[5].jersey, '3');
  assert.equal(slides[6].scout, 'pointing');
  assert.match(slides[6].sub, /PLAYFACTSOVERFEELINGS\.COM/);
  assert.deepEqual(nameLeaks(player, '2026-10-18'), []);
});

test('carousel caption has hashtags and no answer', () => {
  const caption = carouselCaption('2026-10-18');
  assert.match(caption, /#NBA/);
  assert.match(caption, /#GuessThePlayer/);
  assert.match(caption, /PlayFactsOverFeelings\.com/);
  assert.doesNotMatch(caption, /Allen Iverson/);
  assert.doesNotMatch(caption, /Answer:/);
  assert.deepEqual(nameLeaks(player, '2026-10-18'), []);
});

test('the daily workflow publishes the carousel beside the video', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/daily-video.yml', import.meta.url), 'utf8');
  assert.match(workflow, /node carousel\.mjs/);
  assert.match(workflow, /depixelate-carousel\.zip/);
  assert.match(workflow, /carousel-caption\.txt/);
  assert.match(workflow, /carousel-01-hook\.png/);
  assert.match(workflow, /carousel-07-cta\.png/);
});

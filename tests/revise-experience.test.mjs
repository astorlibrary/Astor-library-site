import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

import { buildRound, GAME_BUILDERS } from '../assets/astor/questions.mjs';
import { seededRandom } from '../assets/astor/util.mjs';
import {
  quoted, initials, hasActivity, ACTIVITIES, availableQuizzes, sessionPlan, quotationKey
} from '../assets/astor/revise-kit.mjs';

const require = createRequire(import.meta.url);
const { loadBooks } = require('../scripts/book-data.js');
const books = loadBooks();
const shelf = JSON.parse(fs.readFileSync('assets/revise-index.json', 'utf8'));

const belongs = (book, question) => {
  if (question.book && question.book.slug !== book.slug) return false;
  const key = quotationKey(question);
  return !key || key.slug === book.slug;
};

test('every question in every one-book activity comes from the book that was chosen', () => {
  for (const book of books) {
    for (const [id, builder] of Object.entries(GAME_BUILDERS)) {
      if (builder.scope !== 'book') continue;
      for (const question of buildRound(id, book, { length: 50, seed: 7 })) {
        assert.ok(belongs(book, question), id + ' on ' + book.slug + ' asked ' + question.id);
      }
    }
    const plan = sessionPlan(book, { cards: {}, day: '2026-10-19', random: seededRandom(3) });
    for (const question of plan.questions) assert.ok(belongs(book, question), 'Ten questions on ' + book.slug + ' asked ' + question.id);
  }
});

test('the study bar offers exactly the activities each book can run', () => {
  const bySlug = new Map(books.map(book => [book.slug, book]));
  for (const meta of shelf.books) {
    const book = bySlug.get(meta.slug);
    assert.ok(book, meta.slug + ' is on the shelf without a record');
    const quizzes = new Set(availableQuizzes(book).map(quiz => quiz.id));
    for (const activity of ACTIVITIES) {
      if (['mixed-round', 'flashcards', 'essay-forge', 'defend-the-reading'].includes(activity.id)) continue;
      assert.equal(hasActivity(meta, activity.id), quizzes.has(activity.id), meta.slug + ' ' + activity.id);
    }
    assert.equal(hasActivity(meta, 'flashcards'), book.quotations.length >= 5, meta.slug + ' flashcards');
    assert.equal(hasActivity(meta, 'essay-forge'), book.essayQuestions.length > 0, meta.slug + ' essay planner');
  }
});

test('every book on the Revise shelf has a cover, a colour and a period for the picker', () => {
  for (const meta of shelf.books) {
    assert.ok(meta.cover, meta.slug + ' has no cover');
    assert.match(meta.accent, /^#[0-9a-f]{6}$/i, meta.slug + ' has no colour');
    assert.ok(meta.period, meta.slug + ' has no period');
  }
});

test('lines are quoted once, however the record punctuates them', () => {
  assert.equal(quoted('Fair is foul'), '“Fair is foul”');
  assert.equal(quoted('“I am no bird.”'), '“I am no bird.”');
  assert.equal(quoted('"Reader, I married him."'), '“Reader, I married him.”');
  assert.equal(quoted("'Tis now the very witching time"), "“'Tis now the very witching time”");
});

test('speaker monograms skip articles and joining words', () => {
  assert.equal(initials('Lady Macbeth'), 'LM');
  assert.equal(initials('The Ghost of Christmas Past'), 'GP');
  assert.equal(initials('Scrooge'), 'S');
  assert.equal(initials(''), '?');
});

test('every Revise activity page opens on the study bar, a heading and one sentence', () => {
  for (const activity of ACTIVITIES) {
    const html = fs.readFileSync('play/' + activity.id + '/index.html', 'utf8');
    assert.match(html, /class="rx-bar-mount" id="rv-head-book"/, activity.id + ' has no study bar');
    assert.match(html, /<h1>/, activity.id + ' has no heading');
    const deck = (html.match(/<p class="rx-head-deck">([^<]*)<\/p>/) || [])[1] || '';
    assert.ok(deck, activity.id + ' has no introduction');
    assert.ok((deck.match(/[.!?](\s|$)/g) || []).length <= 1 && deck.length <= 90, activity.id + ' introduction is longer than a sentence: ' + deck);
    assert.doesNotMatch(html, /rx-how|rx-why|Why this helps/, activity.id + ' still carries instructions around the game');
  }
  for (const id of ['which-book', 'context-sprint', 'opening-lines']) {
    const html = fs.readFileSync('play/' + id + '/index.html', 'utf8');
    assert.doesNotMatch(html, /rx-bar-mount/, id + ' ranges across the library and should not name one book');
  }
});

test('stars mean the same everywhere: finish, 70 per cent, perfect', async () => {
  const { starsFor, starTarget } = await import('../assets/astor/quiz-round.mjs');
  assert.equal(starsFor(0, 10), 1, 'finishing earns one star');
  assert.equal(starsFor(6, 10), 1);
  assert.equal(starsFor(7, 10), 2, '7 out of 10 earns two');
  assert.equal(starsFor(9, 10), 2);
  assert.equal(starsFor(10, 10), 3, 'a perfect round earns three');
  assert.equal(starTarget(10), 7);
  assert.equal(starTarget(5), 4, 'Today’s five: 4 for the second star');
  assert.equal(starsFor(4, 5), 2);
  assert.equal(starsFor(0, 0), 0, 'nothing played, nothing earned');
});

const { contrast } = require('../scripts/editions.js');
const LAYOUTS = ['centred', 'page', 'framed'];
const VOICES = ['italic', 'roman', 'caps'];
const TEXTURES = ['plain', 'laid', 'ruled', 'grain', 'glow'];

test('every book wears an edition the stylesheet knows how to draw', () => {
  for (const book of shelf.books) {
    const edition = book.edition;
    assert.ok(edition, book.slug + ' has no edition');
    assert.ok(['light', 'dark'].includes(edition.mode), book.slug + ' mode');
    assert.ok(LAYOUTS.includes(edition.layout), book.slug + ' layout ' + edition.layout);
    assert.ok(VOICES.includes(edition.voice), book.slug + ' voice ' + edition.voice);
    assert.ok(TEXTURES.includes(edition.texture), book.slug + ' texture ' + edition.texture);
  }
});

test('both palettes of every edition keep their text readable', () => {
  const pairs = [
    ['ink', 'ground', 7], ['ink', 'surface', 7], ['soft', 'surface', 4.5], ['soft', 'ground', 4.5],
    ['accentText', 'surface', 4.5], ['accentText', 'sunk', 4.5], ['buttonInk', 'button', 4.5],
    ['heroInk', 'hero', 4.5], ['right', 'surface', 4.5], ['wrong', 'surface', 4.5]
  ];
  for (const book of shelf.books) {
    for (const mode of ['light', 'dark']) {
      const palette = book.edition[mode];
      for (const [text, ground, ratio] of pairs) {
        const value = contrast(palette[text], palette[ground]);
        assert.ok(value >= ratio, `${book.slug} ${mode}: ${text} on ${ground} is ${value.toFixed(2)}`);
      }
    }
  }
});

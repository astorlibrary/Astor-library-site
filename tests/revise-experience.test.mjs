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

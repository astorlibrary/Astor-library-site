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

test('every book carries its cover drawings and can letter its band legibly', () => {
  for (const book of shelf.books) {
    const edition = book.edition;
    assert.ok(edition.motifs >= 2, book.slug + ' has ' + edition.motifs + ' emblems');
    assert.ok(fs.existsSync('assets/editions/' + book.slug + '-field.png'), book.slug + ' field');
    assert.ok(fs.existsSync('assets/editions/' + book.slug + '-motifs.png'), book.slug + ' emblems');
    for (const mode of ['light', 'dark']) {
      const palette = edition[mode];
      assert.ok(contrast(palette.bandInk, palette.band) >= 7, `${book.slug} ${mode}: band lettering`);
      assert.ok(contrast(palette.bandSoft, palette.band) >= 4.5, `${book.slug} ${mode}: band small print`);
    }
  }
});

test('the completion screen says something true about the round', async () => {
  const { resultWords } = await import('../assets/astor/quiz-round.mjs');
  assert.equal(resultWords({ score: 10, total: 10 }).title, 'Flawless.');
  assert.equal(resultWords({ score: 9, total: 10 }).title, 'One away from perfect.');
  assert.equal(resultWords({ score: 1, total: 10 }).title, 'A tough round.');
  assert.equal(resultWords({ score: 0, total: 10 }).title, 'None this time.');
  assert.match(resultWords({ score: 2, total: 10 }).sub, /lines to learn next/);
  const better = resultWords({ score: 7, total: 10, before: { best: 5, total: 10, last: 5, lastTotal: 10 } });
  assert.ok(better.best, 'beating the best is a new best');
  assert.match(better.sub, /new best, up from 5/);
  const upOnLast = resultWords({ score: 6, total: 10, before: { best: 8, total: 10, last: 3, lastTotal: 10 } });
  assert.ok(!upOnLast.best);
  assert.match(upOnLast.sub, /Up from 3 last time/);
  assert.equal(resultWords({ score: 3, total: 3, practice: true }).title, 'All three put right.');
  assert.equal(resultWords({ score: 2, total: 5, practice: true }).title, '2 of 5 put right.');
});

test('no Who said it? question offers two names for one person', async () => {
  const { whoSaidIt, castMember, sameName, inSentence } = await import('../assets/astor/questions.mjs');
  for (const book of books) {
    for (const question of whoSaidIt(book, seededRandom(3))) {
      const people = question.options.map(option => castMember(book, option));
      const answer = people[question.answer];
      question.options.forEach((option, index) => {
        if (index === question.answer) return;
        if (answer && people[index]) assert.notEqual(people[index], answer, `${book.slug}: "${option}" is the answer "${question.options[question.answer]}" by another name`);
      });
      const known = people.filter(Boolean);
      assert.equal(new Set(known).size, known.length, `${book.slug}: one person offered twice in ${JSON.stringify(question.options)}`);
    }
  }
  assert.ok(sameName('Father', 'Father'), 'a name is always the same as itself');
  assert.equal(inSentence('The Witches'), 'the Witches');
  assert.equal(inSentence('Macbeth'), 'Macbeth');
  assert.equal(inSentence('Third Apparition'), 'the Third Apparition');
  assert.equal(inSentence('Nurse'), 'the Nurse');
  assert.equal(inSentence('King Henry'), 'King Henry');
});

// Safari checks a `let` or `const` as soon as an assignment to it begins, so a
// module that starts its page before declaring a variable the start-up assigns
// (`shelf = await loadShelf()`) throws there, though Chrome waits until the
// await is over. Every study module therefore starts last.
test('study modules start their page only after every top-level declaration', () => {
  const declaration = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|var|class)\b/;
  const inert = /^(?:import\b|export\s*\{|export\s+\*|\/\/|\/\*|\*|\}|\)|\]|$)/;
  for (const name of fs.readdirSync('assets/astor').filter(entry => entry.endsWith('.mjs'))) {
    let firstCall = null;
    fs.readFileSync('assets/astor/' + name, 'utf8').split('\n').forEach((line, index) => {
      if (!line || /^\s/.test(line) || inert.test(line)) return;
      if (!declaration.test(line)) { firstCall = firstCall || index + 1; return; }
      if (firstCall && /^(?:export\s+)?(?:const|let|var|class)\b/.test(line)) {
        assert.fail(name + ':' + (index + 1) + ' is declared after the top-level call on line ' + firstCall);
      }
    });
  }
});

test('no study module uses a RegExp lookbehind, which Safari lacks before 16.4', () => {
  for (const name of fs.readdirSync('assets/astor').filter(entry => entry.endsWith('.mjs'))) {
    const source = fs.readFileSync('assets/astor/' + name, 'utf8');
    assert.ok(!/\(\?<[=!]/.test(source), name + ' uses a lookbehind');
  }
});

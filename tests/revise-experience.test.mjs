import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

import { buildRound, GAME_BUILDERS } from '../assets/astor/questions.mjs';
import { seededRandom } from '../assets/astor/util.mjs';
import {
  quoted, hasActivity, ACTIVITIES, availableQuizzes, sessionPlan, quotationKey
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

test('a Revise page shows the question, not the cover: no emblems, monograms, stars or bursts', () => {
  const css = fs.readFileSync('assets/study.css', 'utf8');
  for (const name of ['quiz-round.mjs', 'flashcard-deck.mjs', 'revise-hub.mjs', 'revise-kit.mjs', 'today.mjs']) {
    const source = fs.readFileSync('assets/astor/' + name, 'utf8');
    assert.doesNotMatch(source, /\b(motif|burst|monogram|coverBand|celebrate|starsFor)\(/, name + ' still draws decoration around the activity');
  }
  assert.doesNotMatch(css, /rx-(motif|burst|band|monogram|stars?\b)/, 'study.css still styles the old decoration');
});

// A book's colour is the colour of its links on the page, of the one strong
// button (with cream lettering) and, lifted towards cream by theme.css, of
// its links in dark mode. Each of those has to read.
test('every book colour reads as a link and as a button, in both themes', () => {
  const rgb = value => { const h = value.replace('#', ''); const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h; return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)); };
  const luminance = colour => { const [r, g, b] = colour.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const mix = (a, b, share) => a.map((v, i) => Math.round(v * share + b[i] * (1 - share)));
  const paper = rgb('#f7efe7');
  const cream = rgb('#fffaf4');
  const night = rgb('#1b1714');
  for (const book of shelf.books) {
    const accent = rgb(book.accent);
    assert.ok(contrast(accent, paper) >= 4.5, book.slug + ': its colour as a link on paper');
    assert.ok(contrast(accent, cream) >= 4.5, book.slug + ': cream lettering on its button');
    assert.ok(contrast(mix(accent, cream, 0.45), night) >= 4.5, book.slug + ': its colour as a link in dark mode');
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

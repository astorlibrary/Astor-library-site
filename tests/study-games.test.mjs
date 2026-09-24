import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import {
  GAME_BUILDERS, buildRound, dailyRound, resultGrid,
  whoSaidIt, fillTheLine, orderThePlot, themeMatch, techniqueSpotter,
  characterIdentification, whichBook, contextSprint, openingLines,
  clozeWords, maskName, sameName
} from '../assets/astor/questions.mjs';
import { seededRandom } from '../assets/astor/util.mjs';

const require = createRequire(import.meta.url);
const { loadBooks } = require('../scripts/book-data.js');

const books = loadBooks();
const fixed = () => seededRandom(20260919);

function assertWellFormedChoice(question, label) {
  assert.equal(question.kind, 'choice', label + ' is not a choice question');
  assert.ok(question.stem, label + ' has no stem');
  assert.equal(question.options.length, 4, label + ' does not offer four options');
  assert.equal(new Set(question.options).size, 4, label + ' repeats an option');
  assert.ok(question.answer >= 0 && question.answer < 4, label + ' has no answer');
  assert.ok(question.options[question.answer], label + ' points at an empty answer');
}

test('every book-scoped builder produces well-formed questions', () => {
  for (const book of books) {
    for (const [id, builder] of Object.entries(GAME_BUILDERS)) {
      if (builder.scope !== 'book') continue;
      const questions = builder.build(book, fixed());
      for (const question of questions) {
        const label = id + ' ' + book.slug + ' ' + question.id;
        if (question.kind === 'choice') assertWellFormedChoice(question, label);
        else if (question.kind === 'cloze') {
          assert.ok(question.segments.length === question.answer.length + 1, label + ' has mismatched blanks');
          assert.ok(question.answer.length >= 1, label + ' hides nothing');
          for (const word of question.answer) {
            assert.ok(question.bank.includes(word), label + ' leaves an answer out of the word bank');
          }
          assert.equal(new Set(question.bank).size, question.bank.length, label + ' repeats a word in the bank');
        } else if (question.kind === 'order') {
          assert.ok(question.items.length >= 4, label + ' has too few items to order');
          assert.deepEqual(
            question.items.map(item => item.id).sort(),
            question.answer.slice().sort(),
            label + ' orders items it was not given'
          );
        } else {
          assert.fail(label + ' has an unknown kind: ' + question.kind);
        }
        assert.ok(question.source, label + ' does not say where it comes from');
      }
    }
  }
});

test('the cloze segments rebuild the original line', () => {
  for (const book of books) {
    for (const question of fillTheLine(book, fixed())) {
      let rebuilt = '';
      question.segments.forEach((segment, index) => {
        rebuilt += segment + (index < question.answer.length ? question.answer[index] : '');
      });
      const original = book.quotations.find(quotation => question.id.endsWith(':' + quotation.id));
      assert.equal(rebuilt, original.text, question.id + ' does not rebuild its line');
    }
  }
});

test('who-said-it never offers the right speaker twice', () => {
  for (const book of books) {
    for (const question of whoSaidIt(book, fixed())) {
      const correct = question.options[question.answer];
      assert.equal(question.options.filter(option => option === correct).length, 1, question.id);
    }
  }
});

test('theme and technique questions have exactly one right answer', () => {
  for (const book of books) {
    const themeName = new Map(book.themes.map(theme => [theme.id, theme.name]));
    const techniqueName = new Map(book.techniques.map(technique => [technique.id, technique.name]));
    for (const question of themeMatch(book, fixed())) {
      const quotation = book.quotations.find(entry => question.id.endsWith(':' + entry.id));
      const carried = quotation.themes.map(id => themeName.get(id));
      const right = question.options.filter(option => carried.includes(option));
      assert.equal(right.length, 1, question.id + ' offers ' + right.length + ' themes the line carries');
      assert.equal(right[0], question.options[question.answer], question.id + ' marks the wrong option');
    }
    for (const question of techniqueSpotter(book, fixed())) {
      const quotation = book.quotations.find(entry => question.id.endsWith(':' + entry.id));
      const used = quotation.techniques.map(id => techniqueName.get(id));
      const right = question.options.filter(option => used.includes(option));
      assert.equal(right.length, 1, question.id + ' offers ' + right.length + ' techniques the line uses');
      assert.equal(right[0], question.options[question.answer], question.id + ' marks the wrong option');
    }
  }
});

test('order-the-plot answers are the real order', () => {
  for (const book of books) {
    const rounds = orderThePlot(book, fixed());
    const structure = rounds.find(round => round.id.endsWith(':structure'));
    if (!structure) continue;
    assert.deepEqual(structure.answer, book.structure.map(stage => stage.id), book.slug);
  }
});

test('character clues never give the name away', () => {
  for (const book of books) {
    for (const question of characterIdentification(book, fixed())) {
      const correct = question.options[question.answer];
      const surname = correct.split(/\s+/).pop();
      assert.ok(
        !question.quote.toLowerCase().includes(surname.toLowerCase()),
        book.slug + ': the clue for ' + correct + ' contains their own name'
      );
    }
  }
});

test('library-scoped builders work across the whole catalogue', () => {
  for (const build of [whichBook, contextSprint, openingLines]) {
    const questions = build(books, fixed());
    for (const question of questions) assertWellFormedChoice(question, question.id);
  }
});

test('which-book never puts the same title in twice', () => {
  for (const question of whichBook(books, fixed())) {
    assert.equal(new Set(question.options).size, 4, question.id);
  }
});

test('buildRound respects the requested length and is repeatable with a seed', () => {
  const book = books[0];
  const first = buildRound('who-said-it', book, { length: 5, seed: 7 });
  const second = buildRound('who-said-it', book, { length: 5, seed: 7 });
  assert.equal(first.length, 5);
  assert.deepEqual(first.map(question => question.id), second.map(question => question.id));
  const different = buildRound('who-said-it', book, { length: 5, seed: 8 });
  assert.notDeepEqual(first.map(question => question.id), different.map(question => question.id));
});

test('buildRound refuses a game it does not have', () => {
  assert.throws(() => buildRound('not-a-game', books[0], {}), /Unknown game/);
});

test('the daily round is the same round all day and a different one tomorrow', () => {
  const index = { books };
  const monday = dailyRound(index, '2026-09-19');
  const mondayAgain = dailyRound(index, '2026-09-19');
  const tuesday = dailyRound(index, '2026-09-20');
  assert.deepEqual(monday.map(question => question.id), mondayAgain.map(question => question.id));
  assert.notDeepEqual(monday.map(question => question.id), tuesday.map(question => question.id));
});

test('the daily round is five questions and never repeats one', () => {
  const index = { books };
  for (const day of ['2026-01-01', '2026-06-15', '2026-09-19', '2026-12-25']) {
    const round = dailyRound(index, day);
    assert.equal(round.length, 5, day);
    assert.equal(new Set(round.map(question => question.id)).size, 5, day + ' repeats a question');
  }
});

test('a year of daily rounds stays well formed', () => {
  const index = { books };
  for (let day = 1; day <= 28; day += 1) {
    const date = '2026-02-' + String(day).padStart(2, '0');
    for (const question of dailyRound(index, date)) {
      assert.ok(question.stem, date);
      if (question.kind === 'choice') assertWellFormedChoice(question, date + ' ' + question.id);
    }
  }
});

test('the shareable grid gives nothing away but the score', () => {
  assert.equal(resultGrid([true, false, true, true, false]), '▣▢▣▣▢');
  assert.equal(resultGrid([]), '');
});

test('clozeWords prefers the words a reader has to know', () => {
  const words = clozeWords('To be, or not to be: that is the question', [], seededRandom(3));
  assert.ok(words.length >= 1);
  for (const word of words) {
    assert.ok(!['to', 'be', 'or', 'not', 'that', 'is', 'the'].includes(word.toLowerCase()), 'hid a stop word: ' + word);
  }
});

test('clozeWords honours a declared list', () => {
  assert.deepEqual(clozeWords('Fair is foul, and foul is fair', ['foul', 'fair']), ['foul', 'fair']);
});

test('maskName removes every part of a name', () => {
  const masked = maskName('Lady Macbeth reads Macbeth’s letter and judges Macbeth accurately.', 'Lady Macbeth');
  assert.ok(!/macbeth/i.test(masked), masked);
});

test('who said it never offers two names for one person', () => {
  assert.ok(sameName('Scrooge', 'Ebenezer Scrooge'));
  assert.ok(sameName('King Richard III', 'Richard, Duke of Gloucester'));
  assert.ok(sameName('The Witches', 'Third Witch'));
  assert.ok(!sameName('Elizabeth Bennet', 'Jane Bennet'));
  assert.ok(!sameName('Lady Macbeth', 'Lady Macduff'));
  for (const book of books) {
    const byId = new Map(book.characters.map(character => [character.id, character.name]));
    const cast = new Set(book.characters.map(character => character.name));
    const random = fixed();
    for (let round = 0; round < 5; round += 1) {
      for (const question of whoSaidIt(book, random)) {
        const right = question.options[question.answer];
        const quotation = book.quotations.find(entry => 'who:' + book.slug + ':' + entry.id === question.id);
        const involved = (quotation.characters || []).map(id => byId.get(id));
        question.options.forEach((option, index) => {
          if (index === question.answer) return;
          assert.ok((cast.has(option) && cast.has(right)) || !sameName(option, right), book.slug + ' offers "' + option + '" against the speaker "' + right + '"');
          assert.ok(!involved.includes(option), book.slug + ' offers "' + option + '", who is in the line, as a wrong speaker');
        });
      }
    }
  }
});

test('fill the line only ever blanks whole words', () => {
  for (const book of books) {
    for (const question of fillTheLine(book, seededRandom(1))) {
      question.answer.forEach((word, position) => {
        const before = question.segments[position];
        const after = question.segments[position + 1] || '';
        assert.ok(!/\p{L}$/u.test(before) && !/^\p{L}/u.test(after),
          book.slug + ': "' + word + '" is blanked inside a longer word in ' + question.id);
      });
    }
  }
});

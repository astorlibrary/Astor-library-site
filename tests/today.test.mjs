import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { questionsFor, roundFor, cycleLength, dayNumber, shareGrid, PER_DAY } from '../assets/astor/today-pick.mjs';

const data = JSON.parse(fs.readFileSync('assets/today-questions.json', 'utf8'));
const bank = data.questions;

test('every Today question has four different options, a hint and an explanation', () => {
  const ids = new Set();
  for (const question of bank) {
    assert.ok(!ids.has(question.id), 'repeated id ' + question.id);
    ids.add(question.id);
    assert.equal(question.options.length, 4, question.id);
    assert.equal(new Set(question.options).size, 4, question.id + ' repeats an option');
    assert.equal(question.answer, 0, question.id + ' must list the right answer first in the bank');
    assert.match(question.question, /\?[”’]?$/, question.id + ' is not a question');
    assert.ok(question.hint && question.explanation, question.id + ' needs a hint and an explanation');
    assert.ok(!question.hint.toLowerCase().includes(question.options[0].replace(/\*/g, '').toLowerCase()), question.id + ' gives the answer away in its hint');
  }
});

// A right answer far longer and more detailed than every wrong one can be
// picked without knowing the book. A title is what it is, so the few
// questions whose answer is a real title are let through by name.
test('the right answer does not stand out by its length', () => {
  const titles = new Set(['romeo-brooke', 'tess-subtitle', 'willows-piper']);
  const length = text => text.replace(/\*/g, '').length;
  for (const question of bank) {
    if (titles.has(question.id)) continue;
    const right = length(question.options[0]);
    const longestWrong = Math.max(...question.options.slice(1).map(length));
    assert.ok(right < 1.6 * longestWrong || right - longestWrong < 12, question.id + ' gives itself away by length: ' + question.options.join(' | '));
  }
});

test('titles in Today questions are marked in pairs', () => {
  for (const question of bank) {
    for (const text of [question.question, question.hint, question.explanation, ...question.options]) {
      assert.equal((text.match(/\*/g) || []).length % 2, 0, question.id + ' has an unclosed title: ' + text);
    }
  }
});

test('every Today link points at a page on the site', () => {
  for (const question of bank.filter(item => item.link)) {
    // A link may point at one line of a guide: /guides/macbeth/quotations/#astor-quote-out-damned-spot.
    const [address, fragment] = question.link.href.split('#');
    const file = path.join(address.replace(/^\//, ''), 'index.html');
    assert.ok(fs.existsSync(file), question.id + ' links to a missing page ' + question.link.href);
    if (fragment) assert.ok(fs.readFileSync(file, 'utf8').includes('id="' + fragment + '"'), question.id + ' links to a line that is not on the page: ' + question.link.href);
  }
});

test('the same five questions all day, different ones tomorrow, none repeated within a cycle', () => {
  const today = questionsFor(bank, '2026-10-23');
  assert.equal(today.length, PER_DAY);
  assert.deepEqual(today.map(q => q.id), questionsFor(bank, '2026-10-23').map(q => q.id));
  assert.notDeepEqual(today.map(q => q.id), questionsFor(bank, '2026-10-24').map(q => q.id));
  // Dated questions are asked on their own days and kept out of the deal.
  const cycle = cycleLength(bank);
  assert.equal(cycle, Math.floor(bank.filter(question => !question.on).length / PER_DAY));
  const seen = new Set();
  for (let day = 0; day < cycle; day += 1) {
    const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
    for (const question of questionsFor(bank, date)) {
      assert.ok(!seen.has(question.id), question.id + ' comes back before the bank is used up');
      seen.add(question.id);
    }
  }
});

test('shuffled options keep the right answer right', () => {
  for (const date of ['2026-01-01', '2026-10-23', '2027-03-14']) {
    for (const question of questionsFor(bank, date)) {
      const original = bank.find(item => item.id === question.id);
      assert.equal(question.options[question.answer], original.options[original.answer], question.id + ' on ' + date);
    }
  }
});

test('the day count and the shareable marks', () => {
  assert.equal(dayNumber('2026-01-01'), 0);
  assert.equal(dayNumber('2026-01-02'), 1);
  assert.equal(shareGrid([true, false, true]), '■□■');
});

test('every Today question says what it is about, and a dated one says why today', () => {
  for (const question of bank) {
    assert.ok(['text', 'book', 'world'].includes(question.kind), question.id + ' has no kind');
    if (question.book) {
      const work = data.books[question.book];
      assert.ok(work && work.title, question.id + ' names a book the bank does not list: ' + question.book);
      assert.ok(fs.existsSync(path.join(work.href.replace(/^\//, ''), 'index.html')), question.book + ' points at a missing page ' + work.href);
      assert.equal(work.revise, fs.existsSync(path.join('data', 'books', question.book + '.json')), question.book + ' is wrong about having revision questions');
    }
    if (question.on !== undefined) {
      assert.match(question.on, /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, question.id + ' has a malformed date');
      assert.ok(question.occasion && question.occasion.length > 10, question.id + ' is dated but does not say why');
      // The line that introduces the question must not answer it.
      assert.ok(!question.occasion.toLowerCase().includes(question.options[0].replace(/\*/g, '').toLowerCase()), question.id + ' gives the answer away in its occasion');
    }
  }
  const dates = bank.filter(question => question.on).map(question => question.on);
  assert.equal(new Set(dates).size, dates.length, 'two questions claim the same day');
});

// No question asks for a number or a year for its own sake.
test('no Today question asks the reader to pick a figure out of four', () => {
  const figure = text => /^(?:c\. )?\d{3,4}$|^(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty-four)(?: (?:years?|nights?|books?|days?))?$/i.test(text.replace(/\*/g, '').trim());
  for (const question of bank) {
    assert.ok(!question.options.every(figure), question.id + ' offers four bare figures: ' + question.options.join(' | '));
  }
});

test('a day opens and closes on one book, with three other books between', () => {
  for (let offset = 0; offset < cycleLength(bank); offset += 1) {
    const date = new Date(Date.UTC(2026, 1, 1 + offset)).toISOString().slice(0, 10);
    const round = roundFor(bank, date);
    assert.equal(round.questions.length, PER_DAY, date);
    if (round.occasion) continue;
    assert.ok(round.book, date + ' has no book of the day');
    assert.equal(round.questions[0].book, round.book, date);
    assert.equal(round.questions[PER_DAY - 1].book, round.book, date);
    const middle = round.questions.slice(1, -1).map(question => question.book || question.id);
    assert.equal(new Set(middle).size, middle.length, date + ' asks about one book twice in the middle');
    assert.ok(!middle.includes(round.book), date + ' asks about the day’s book in the middle');
  }
});

test('a dated question is asked first on its day and introduced', () => {
  const globe = roundFor(bank, '2027-06-29');
  assert.equal(globe.questions[0].id, 'globe-fire');
  assert.match(globe.occasion, /burned down on this day in 1613/);
  assert.equal(globe.questions.length, PER_DAY);
  assert.equal(roundFor(bank, '2027-06-30').occasion, '');
});

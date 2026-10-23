import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { questionsFor, dayNumber, shareGrid, PER_DAY } from '../assets/astor/today-pick.mjs';

const bank = JSON.parse(fs.readFileSync('assets/today-questions.json', 'utf8')).questions;

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

test('titles in Today questions are marked in pairs', () => {
  for (const question of bank) {
    for (const text of [question.question, question.hint, question.explanation, ...question.options]) {
      assert.equal((text.match(/\*/g) || []).length % 2, 0, question.id + ' has an unclosed title: ' + text);
    }
  }
});

test('every Today link points at a page on the site', () => {
  for (const question of bank.filter(item => item.link)) {
    const file = path.join(question.link.href.replace(/^\//, ''), 'index.html');
    assert.ok(fs.existsSync(file), question.id + ' links to a missing page ' + question.link.href);
  }
});

test('the same five questions all day, different ones tomorrow, none repeated within a cycle', () => {
  const today = questionsFor(bank, '2026-10-23');
  assert.equal(today.length, PER_DAY);
  assert.deepEqual(today.map(q => q.id), questionsFor(bank, '2026-10-23').map(q => q.id));
  assert.notDeepEqual(today.map(q => q.id), questionsFor(bank, '2026-10-24').map(q => q.id));
  const cycle = Math.floor(bank.length / PER_DAY);
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

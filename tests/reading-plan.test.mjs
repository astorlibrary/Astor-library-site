// A reading plan shares a book's acts or sections out across the days a
// reader has free. These tests pin the arithmetic: every part appears exactly
// once, the sittings fall inside the window in date order, and the calendar
// file is one every calendar application can import.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { buildPlan, availableDays, toIcs, nextSitting, planSummary, addDays } from '../assets/astor/plan.mjs';

const require = createRequire(import.meta.url);
const { loadBooks } = require('../scripts/book-data.js');

const books = loadBooks();
const macbeth = books.find(book => book.slug === 'macbeth');

test('free days respect the window and the chosen weekdays', () => {
  assert.deepEqual(availableDays('2026-09-21', '2026-09-27', [1, 3]), ['2026-09-21', '2026-09-23']);
  assert.equal(availableDays('2026-09-21', '2026-09-27', []).length, 7);
  assert.deepEqual(availableDays('2026-09-27', '2026-09-21', []), []);
  assert.deepEqual(availableDays('not a date', '2026-09-21', []), []);
});

test('a fortnight of free evenings gives one sitting per act, first to last', () => {
  const plan = buildPlan(macbeth, { start: '2026-09-21', finish: '2026-10-04', weekdays: [] });
  assert.equal(plan.sittings.length, macbeth.structure.length);
  assert.equal(plan.sittings[0].date, '2026-09-21');
  assert.equal(plan.sittings[plan.sittings.length - 1].date, '2026-10-04');
  const dates = plan.sittings.map(sitting => sitting.date);
  assert.deepEqual(dates, dates.slice().sort());
  const stages = plan.sittings.flatMap(sitting => sitting.stages);
  assert.deepEqual(stages, macbeth.structure.map(stage => stage.id));
  const minutes = plan.sittings.reduce((total, sitting) => total + sitting.minutes, 0);
  assert.ok(Math.abs(minutes - macbeth.readingTime) <= 5 * plan.sittings.length, 'sitting times add up to the reading time');
});

test('fewer free days than parts means whole parts grouped, never split', () => {
  const plan = buildPlan(macbeth, { start: '2026-09-21', finish: '2026-09-27', weekdays: [2, 6] });
  assert.equal(plan.sittings.length, 2);
  assert.deepEqual(plan.sittings.map(sitting => sitting.date), ['2026-09-22', '2026-09-26']);
  const stages = plan.sittings.flatMap(sitting => sitting.stages);
  assert.deepEqual(stages, macbeth.structure.map(stage => stage.id));
  assert.match(plan.sittings[0].label, / to /);
});

test('every record can be planned over a week or a term', () => {
  for (const book of books) {
    for (const finish of ['2026-09-27', '2026-12-18']) {
      const plan = buildPlan(book, { start: '2026-09-21', finish, weekdays: [1, 2, 3, 4, 5] });
      assert.ok(plan, book.slug + ' could not be planned to ' + finish);
      const stages = plan.sittings.flatMap(sitting => sitting.stages);
      assert.deepEqual(stages, book.structure.map(stage => stage.id), book.slug + ' loses or repeats a part');
      assert.ok(plan.sittings.every(sitting => sitting.minutes >= 5), book.slug + ' has a sitting with no time');
    }
  }
});

test('a window with no free days makes no plan', () => {
  assert.equal(buildPlan(macbeth, { start: '2026-09-21', finish: '2026-09-22', weekdays: [5] }), null);
});

test('the next sitting is the first undone one on or after today', () => {
  const plan = buildPlan(macbeth, { start: '2026-09-21', finish: '2026-10-04', weekdays: [] });
  assert.equal(nextSitting(plan, '2026-09-21').date, '2026-09-21');
  plan.sittings[0].done = true;
  assert.equal(nextSitting(plan, '2026-09-21').stages[0], 'act-2');
  const summary = planSummary(plan, '2026-10-10');
  assert.equal(summary.done, 1);
  assert.equal(summary.overdue, plan.sittings.length - 1);
  for (const sitting of plan.sittings) sitting.done = true;
  assert.equal(nextSitting(plan), null);
  assert.equal(planSummary(plan).finished, true);
});

test('the calendar file is valid iCalendar with one all-day event per sitting', () => {
  const plan = buildPlan(macbeth, { start: '2026-09-21', finish: '2026-10-04', weekdays: [] });
  const ics = toIcs(plan, { stamp: new Date('2026-09-19T00:00:00Z') });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, plan.sittings.length);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260921'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:' + addDays('2026-09-21', 1).replace(/-/g, '')));
  assert.ok(!/[^\r]\n/.test(ics), 'every line ends in CRLF');
  for (const line of ics.split('\r\n')) {
    assert.ok(new TextEncoder().encode(line).length <= 75, 'a line is longer than 75 octets: ' + line);
  }
  assert.ok(ics.includes('SUMMARY:Read Macbeth: Act I'));
  assert.ok(ics.includes('https://astorlibrary.com/books/macbeth/'));
});

test('a plan with a comma in the title is escaped for the calendar', () => {
  const plan = buildPlan({ ...macbeth, title: 'Macbeth, or the Scottish play' }, { start: '2026-09-21', finish: '2026-09-22', weekdays: [] });
  const ics = toIcs(plan);
  assert.ok(ics.includes('Macbeth\\, or the Scottish play'));
});

test('re-planning keeps what is done and spreads the rest from today', async () => {
  const { replan } = await import('../assets/astor/plan.mjs');
  const plan = buildPlan(macbeth, { start: '2026-09-21', finish: '2026-10-04', weekdays: [] });
  plan.sittings[0].done = true;
  const later = replan(plan, macbeth, { today: '2026-10-01' });
  assert.equal(later.sittings[0].done, true);
  const pending = later.sittings.filter(sitting => !sitting.done);
  assert.ok(pending.every(sitting => sitting.date >= '2026-10-01'), 'a sitting is left in the past');
  assert.ok(pending.every(sitting => sitting.date <= '2026-10-04'), 'the finishing date moved although it was still ahead');
  const stages = later.sittings.flatMap(sitting => sitting.stages);
  assert.deepEqual(stages, macbeth.structure.map(stage => stage.id));
  const overrun = replan(plan, macbeth, { today: '2026-11-01' });
  assert.equal(overrun.finish, '2026-11-14');
  assert.equal(planSummary(overrun, '2026-11-01').overdue, 0);
  for (const sitting of plan.sittings) sitting.done = true;
  assert.equal(replan(plan, macbeth, { today: '2026-12-01' }), plan);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';

// Solstices and equinoxes fall on the reader's own date, so pin the clock.
process.env.TZ = 'Europe/London';

const require = createRequire(import.meta.url);
const { astorHomeCalendar } = require('../scripts/home-calendar-rules.js');
const calendar = JSON.parse(fs.readFileSync(new URL('../scripts/home-calendar.json', import.meta.url), 'utf8'));
const on = (iso) => { const [y, m, d] = iso.split('-').map(Number); return astorHomeCalendar(new Date(y, m - 1, d), calendar); };

test('the homepage follows the annual calendar', () => {
  const expected = {
    '2027-01-01': 'new-year', '2027-01-06': 'new-year', '2027-01-07': 'winter', '2027-01-31': 'winter',
    '2027-02-01': 'valentines-day', '2027-02-14': 'valentines-day', '2027-02-15': 'winter', '2027-02-28': 'winter', '2028-02-29': 'winter',
    '2027-03-01': 'world-book-day', '2027-03-07': 'world-book-day', '2027-03-08': 'spring', '2027-03-20': 'spring',
    '2027-03-21': 'world-poetry-day', '2027-03-22': 'easter', '2027-03-29': 'easter', '2027-03-30': 'spring',
    '2027-04-17': 'spring', '2027-04-18': 'shakespeare', '2027-04-25': 'shakespeare', '2027-04-26': 'spring', '2027-05-31': 'spring',
    '2027-06-01': 'summer', '2027-06-30': 'summer', '2027-07-01': 'fourth-of-july', '2027-07-05': 'fourth-of-july', '2027-07-06': 'summer', '2027-08-31': 'summer',
    '2027-09-01': 'autumn', '2027-09-30': 'autumn', '2027-10-01': 'halloween', '2027-10-31': 'halloween',
    '2027-11-01': 'bonfire-night', '2027-11-06': 'bonfire-night', '2027-11-07': 'remembrance', '2027-11-14': 'remembrance',
    '2027-11-15': 'autumn', '2027-11-21': 'autumn', '2027-11-22': 'thanksgiving', '2027-11-28': 'thanksgiving',
    '2027-11-29': 'christmas', '2027-12-26': 'christmas', '2027-12-27': 'new-year', '2027-12-31': 'new-year'
  };
  for (const [date, theme] of Object.entries(expected)) assert.equal(on(date).theme, theme, date);
});

test('Easter moves with the year and runs from Palm Sunday to Easter Monday', () => {
  // Easter Sunday: 2026-04-05, 2027-03-28, 2028-04-16, 2029-04-01, 2030-04-21.
  for (const [palm, monday, before, after] of [
    ['2026-03-29', '2026-04-06', '2026-03-28', '2026-04-07'],
    ['2028-04-09', '2028-04-17', '2028-04-08', '2028-04-18'],
    ['2029-03-25', '2029-04-02', '2029-03-24', '2029-04-03']
  ]) {
    assert.equal(on(palm).theme, 'easter', palm);
    assert.equal(on(monday).theme, 'easter', monday);
    assert.equal(on(before).theme, 'spring', before);
    assert.notEqual(on(after).theme, 'easter', after);
  }
  // A late Easter takes the days it shares with Shakespeare's week.
  assert.equal(on('2030-04-19').theme, 'easter');
  assert.equal(on('2030-04-22').theme, 'easter');
  assert.equal(on('2030-04-23').theme, 'shakespeare');
});

test('notes appear on their days, the dated ones first', () => {
  const texts = (date) => on(date).notes.map(note => note.text);
  assert.match(texts('2027-01-01')[0], /died in 1956 .* published in 1931/);
  assert.match(texts('2026-01-01')[0], /died in 1955 .* published in 1930/);
  assert.deepEqual(texts('2027-03-04'), ['Today is World Book Day in the UK and Ireland.']);
  assert.deepEqual(texts('2026-03-05'), ['Today is World Book Day in the UK and Ireland.']);
  assert.deepEqual(texts('2027-03-05'), []);
  assert.equal(texts('2026-11-26')[0], 'Today is Thanksgiving in the United States.');
  assert.equal(texts('2027-11-25')[0], 'Today is Thanksgiving in the United States.');
  assert.equal(texts('2026-11-08')[0], 'Today is Remembrance Sunday.');
  assert.equal(texts('2027-11-14')[0], 'Today is Remembrance Sunday.');
  assert.match(texts('2026-06-21')[0], /summer solstice/);
  assert.match(texts('2028-06-20')[0], /summer solstice/);
  assert.match(texts('2026-12-21')[0], /winter solstice/);
  assert.match(texts('2027-12-22')[0], /winter solstice/);
  assert.match(texts('2026-09-23')[0], /autumn equinox/);
  const shakespeare = texts('2027-04-23');
  assert.equal(shakespeare.length, 2);
  assert.match(shakespeare[0], /Shakespeare’s birthday/);
  assert.match(shakespeare[1], /National Poetry Month/);
  assert.equal(texts('2027-02-03').length, 2);
  assert.deepEqual(texts('2027-08-12'), []);
});

test('every calendar entry is well formed', () => {
  const slugs = new Set();
  for (const theme of calendar.themes) {
    assert.ok(!slugs.has(theme.slug), 'repeated theme ' + theme.slug);
    slugs.add(theme.slug);
    assert.ok(Boolean(theme.season) !== Boolean(theme.feature), theme.slug + ' needs a season or a feature, not both');
    assert.ok(theme.when.length > 0, theme.slug + ' has no dates');
  }
  for (const note of calendar.notes) {
    assert.ok(note.when.length > 0 && note.text, 'a note needs dates and text');
    if (note.text.includes('{link}')) assert.ok(note.href && note.link, 'a note with {link} needs its link');
    if (note.href) assert.ok(note.link, 'a note with an address needs link text');
  }
  // Every day of a leap year has a theme.
  for (let day = new Date(2028, 0, 1); day.getFullYear() === 2028; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
    assert.ok(astorHomeCalendar(day, calendar).theme, day.toDateString());
  }
});

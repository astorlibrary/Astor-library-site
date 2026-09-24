// The personalisation store keeps everything a reader accumulates in their own
// browser. These tests stand a small fake localStorage in front of it, so the
// behaviour readers depend on — saving, progress, streaks, the Leitner
// schedule, and above all failing quietly when storage is unavailable — is
// checked without a browser.

import test from 'node:test';
import assert from 'node:assert/strict';

function fakeStorage({ throwOnWrite = false, throwOnRead = false } = {}) {
  const map = new Map();
  return {
    getItem(key) {
      if (throwOnRead) throw new Error('storage is blocked');
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      if (throwOnWrite) throw new Error('storage is full');
      map.set(key, String(value));
    },
    removeItem(key) { map.delete(key); },
    get size() { return map.size; }
  };
}

async function freshStore(options) {
  globalThis.window = { localStorage: fakeStorage(options) };
  // A query string makes each import a separate module instance, so the
  // availability probe and the in-memory listener set start clean.
  return import('../assets/astor/store.mjs?' + Math.random());
}

test('a reader who saves a book can find it again', async () => {
  const store = await freshStore();
  assert.equal(store.isSaved('/books/macbeth/'), false);
  assert.equal(store.toggleSaved({ href: '/books/macbeth/', title: 'Macbeth' }), true);
  assert.equal(store.isSaved('/books/macbeth/'), true);
  assert.equal(store.savedBooks()[0].title, 'Macbeth');
  assert.equal(store.toggleSaved({ href: '/books/macbeth/', title: 'Macbeth' }), false);
  assert.deepEqual(store.savedBooks(), []);
});

test('recently viewed keeps the newest first and never repeats a page', async () => {
  const store = await freshStore();
  store.recordVisit({ href: '/books/hamlet/', title: 'Hamlet' });
  store.recordVisit({ href: '/books/macbeth/', title: 'Macbeth' });
  store.recordVisit({ href: '/books/hamlet/', title: 'Hamlet' });
  const recent = store.recentlyViewed();
  assert.deepEqual(recent.map(entry => entry.title), ['Hamlet', 'Macbeth']);
});

test('recently viewed does not grow without limit', async () => {
  const store = await freshStore();
  for (let index = 0; index < 60; index += 1) {
    store.recordVisit({ href: '/books/book-' + index + '/', title: 'Book ' + index });
  }
  assert.equal(store.recentlyViewed(100).length, 40);
  assert.equal(store.recentlyViewed(100)[0].title, 'Book 59');
});

test('progress is what the reader ticked, and nothing else', async () => {
  const store = await freshStore();
  assert.deepEqual(store.bookProgress('macbeth').stages, []);
  store.markStage('macbeth', 'act-1', true);
  store.markStage('macbeth', 'act-2', true);
  store.markStage('macbeth', 'act-1', true);
  assert.deepEqual(store.bookProgress('macbeth').stages, ['act-1', 'act-2']);
  store.markStage('macbeth', 'act-1', false);
  assert.deepEqual(store.bookProgress('macbeth').stages, ['act-2']);
});

test('a best score only improves on a better proportion', async () => {
  const store = await freshStore();
  store.recordScore('who-said-it', { score: 7, total: 10, bookSlug: 'macbeth' });
  assert.equal(store.scores()['who-said-it'].best, 7);
  store.recordScore('who-said-it', { score: 4, total: 10, bookSlug: 'macbeth' });
  assert.equal(store.scores()['who-said-it'].best, 7, 'a worse round overwrote the best');
  store.recordScore('who-said-it', { score: 5, total: 5, bookSlug: 'macbeth' });
  assert.equal(store.scores()['who-said-it'].best, 5);
  assert.equal(store.scores()['who-said-it'].bestTotal, 5);
  assert.equal(store.scores()['who-said-it'].played, 3);
});

test('a streak counts consecutive days and resets after a gap', async () => {
  const store = await freshStore();
  store.recordDaily({ score: 3, total: 5 }, '2026-09-17');
  assert.equal(store.streak().current, 1);
  store.recordDaily({ score: 4, total: 5 }, '2026-09-18');
  assert.equal(store.streak().current, 2);
  store.recordDaily({ score: 5, total: 5 }, '2026-09-18');
  assert.equal(store.streak().current, 2, 'playing twice in one day counted twice');
  store.recordDaily({ score: 2, total: 5 }, '2026-09-21');
  assert.equal(store.streak().current, 1, 'a three-day gap did not reset the streak');
  assert.equal(store.streak().longest, 2);
});

test('the daily result is kept for the day it was played', async () => {
  const store = await freshStore();
  assert.equal(store.dailyResult('2026-09-19'), null);
  store.recordDaily({ score: 4, total: 5, marks: [true, true, false, true, true] }, '2026-09-19');
  assert.equal(store.dailyResult('2026-09-19').score, 4);
  assert.equal(store.dailyResult('2026-09-20'), null);
});

test('the commonplace book keeps quotations and the notes on them', async () => {
  const store = await freshStore();
  const entry = { id: 'macbeth:tomorrow', text: 'To-morrow, and to-morrow', reference: 'Macbeth 5.5.21' };
  assert.equal(store.toggleCommonplace(entry), true);
  assert.equal(store.inCommonplace('macbeth:tomorrow'), true);
  store.annotate('macbeth:tomorrow', 'He answers grief with a theory of time.');
  assert.equal(store.commonplace()[0].note, 'He answers grief with a theory of time.');
  assert.equal(store.toggleCommonplace(entry), false);
  assert.equal(store.inCommonplace('macbeth:tomorrow'), false);
});

// Moves a card's due date into the past, as if its interval had run out.
function makeDue(id) {
  const key = 'astor-library-v1';
  const state = JSON.parse(globalThis.window.localStorage.getItem(key));
  state.cards[id].due = '2000-01-01';
  globalThis.window.localStorage.setItem(key, JSON.stringify(state));
}

test('the flashcard schedule moves a known card up and a missed card back to tomorrow', async () => {
  const store = await freshStore();
  const id = 'macbeth:tomorrow';
  assert.deepEqual(store.dueCards([id]), [id], 'a new card should be due');

  store.reviewCard(id, true);
  assert.equal(store.cardState(id).box, 1);
  assert.deepEqual(store.dueCards([id]), [], 'a card just answered should not be due again today');

  makeDue(id);
  store.reviewCard(id, true);
  makeDue(id);
  store.reviewCard(id, true);
  assert.equal(store.cardState(id).box, 3);

  store.reviewCard(id, false);
  assert.equal(store.cardState(id).box, 0, 'a missed card did not go back to the first box');
  assert.equal(store.cardState(id).lapses, 1);
});

test('the schedule never climbs past the last box', async () => {
  const store = await freshStore();
  const id = 'macbeth:dagger';
  for (let index = 0; index < 12; index += 1) {
    store.reviewCard(id, true);
    makeDue(id);
  }
  assert.equal(store.cardState(id).box, 4);
});

test('answering a line right again before it is due does not move it up', async () => {
  const store = await freshStore();
  const id = 'macbeth:spot';
  store.reviewCard(id, true);
  const due = store.cardState(id).due;
  store.reviewCard(id, true);
  store.reviewCard(id, true);
  assert.equal(store.cardState(id).box, 1, 'three right answers in one sitting made a line known');
  assert.equal(store.cardState(id).due, due);
  store.reviewCard(id, false);
  assert.equal(store.cardState(id).box, 0, 'a wrong answer before the line was due did not send it back');
});

test('a deck summary counts what is learned and what is due', async () => {
  const store = await freshStore();
  const ids = ['a', 'b', 'c'];
  const summary = store.deckSummary(ids);
  assert.deepEqual(summary, { total: 3, learned: 0, due: 3 });
  for (let index = 0; index < 4; index += 1) {
    store.reviewCard('a', true);
    if (index < 3) makeDue('a');
  }
  const after = store.deckSummary(ids);
  assert.equal(after.learned, 1);
  assert.equal(after.due, 2);
});

test('forgetting one section leaves the others alone', async () => {
  const store = await freshStore();
  store.toggleSaved({ href: '/books/macbeth/', title: 'Macbeth' });
  store.recordVisit({ href: '/books/hamlet/', title: 'Hamlet' });
  store.forget('recent');
  assert.deepEqual(store.recentlyViewed(), []);
  assert.equal(store.savedBooks().length, 1);
  store.forget();
  assert.deepEqual(store.savedBooks(), []);
});

test('everything can be exported as readable JSON', async () => {
  const store = await freshStore();
  store.toggleSaved({ href: '/books/macbeth/', title: 'Macbeth' });
  const exported = JSON.parse(store.exportAll());
  assert.equal(exported.saved[0].title, 'Macbeth');
  assert.ok('cards' in exported && 'streak' in exported && 'commonplace' in exported);
});

test('a browser with storage switched off still answers every question', async () => {
  const store = await freshStore({ throwOnWrite: true });
  assert.equal(store.isRemembering(), false);
  assert.deepEqual(store.savedBooks(), []);
  assert.deepEqual(store.recentlyViewed(), []);
  assert.deepEqual(store.bookProgress('macbeth').stages, []);
  assert.deepEqual(store.commonplace(), []);
  assert.deepEqual(store.scores(), {});
  assert.equal(store.streak().current, 0);
  assert.equal(store.dailyResult('2026-09-19'), null);
  // None of these may throw.
  store.toggleSaved({ href: '/books/macbeth/', title: 'Macbeth' });
  store.recordVisit({ href: '/books/hamlet/', title: 'Hamlet' });
  store.markStage('macbeth', 'act-1', true);
  store.recordScore('who-said-it', { score: 3, total: 5 });
  store.reviewCard('macbeth:tomorrow', true);
  assert.deepEqual(store.savedBooks(), []);
});

test('a corrupted record is treated as an empty one rather than crashing', async () => {
  globalThis.window = { localStorage: fakeStorage() };
  globalThis.window.localStorage.setItem('astor-library-v1', 'not json at all');
  const store = await import('../assets/astor/store.mjs?' + Math.random());
  assert.deepEqual(store.savedBooks(), []);
  store.toggleSaved({ href: '/books/macbeth/', title: 'Macbeth' });
  assert.equal(store.savedBooks().length, 1);
});

test('subscribers hear about a change and can stop listening', async () => {
  const store = await freshStore();
  let calls = 0;
  const stop = store.subscribe(() => { calls += 1; });
  store.toggleSaved({ href: '/books/macbeth/', title: 'Macbeth' });
  assert.equal(calls, 1);
  stop();
  store.toggleSaved({ href: '/books/hamlet/', title: 'Hamlet' });
  assert.equal(calls, 1);
});

test('today() formats a date the way the daily puzzle keys on it', async () => {
  const store = await freshStore();
  assert.equal(store.today(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(store.today(new Date(2026, 11, 31)), '2026-12-31');
});

test('a reading plan is kept, ticked off and forgotten with the rest', async () => {
  const store = await freshStore();
  assert.equal(store.readingPlan('macbeth'), null);
  store.savePlan({ slug: 'macbeth', title: 'Macbeth', href: '/books/macbeth/', sittings: [{ date: '2026-09-21', stages: ['act-1'], done: false }] });
  assert.equal(store.readingPlan('macbeth').title, 'Macbeth');
  store.markSitting('macbeth', 0, true);
  assert.equal(store.readingPlan('macbeth').sittings[0].done, true);
  assert.equal(store.allPlans().length, 1);
  assert.ok(JSON.parse(store.exportAll()).plans.macbeth);
  store.removePlan('macbeth');
  assert.equal(store.allPlans().length, 0);
  store.savePlan({ slug: 'hamlet', title: 'Hamlet', href: '/books/hamlet/', sittings: [] });
  store.forget('plans');
  assert.equal(store.allPlans().length, 0);
});

test('a reading plan is discarded quietly when storage is unavailable', async () => {
  const store = await freshStore({ throwOnWrite: true });
  store.savePlan({ slug: 'macbeth', title: 'Macbeth', href: '/books/macbeth/', sittings: [] });
  assert.equal(store.readingPlan('macbeth'), null);
  assert.equal(store.isRemembering(), false);
});

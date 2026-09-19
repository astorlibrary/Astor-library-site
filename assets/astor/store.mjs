// Personalisation for readers who have not signed in to anything.
//
// Everything a reader accumulates on the site — saved books, what they last
// read, how far through a title they are, game scores, their revision streak,
// their commonplace book and their flashcard schedule — lives in this one
// localStorage record on their own device. Nothing is sent anywhere. If
// storage is unavailable, blocked or full, every read returns an empty value
// and every write is discarded, so the pages that use it still work; they
// simply stop remembering.

const KEY = 'astor-library-v1';
const LIMIT_RECENT = 40;
const LIMIT_COMMONPLACE = 400;

const EMPTY = {
  saved: [],
  recent: [],
  progress: {},
  scores: {},
  streak: { current: 0, longest: 0, lastDay: '' },
  commonplace: [],
  cards: {},
  daily: {},
  plans: {},
  settings: {}
};

let available = null;
const listeners = new Set();

function canStore() {
  if (available !== null) return available;
  try {
    const probe = KEY + ':probe';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function read() {
  if (!canStore()) return clone(EMPTY);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return clone(EMPTY);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return clone(EMPTY);
    return Object.assign(clone(EMPTY), parsed);
  } catch {
    return clone(EMPTY);
  }
}

function write(state) {
  if (!canStore()) return state;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // A full or locked store is not an error the reader needs to see.
    available = false;
  }
  for (const listener of listeners) {
    try { listener(state); } catch { /* a broken listener must not stop the others */ }
  }
  return state;
}

function update(change) {
  const state = read();
  const next = change(state) || state;
  return write(next);
}

export function isRemembering() {
  return canStore();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function snapshot() {
  return read();
}

// --- dates -----------------------------------------------------------------

export function today(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(from, to) {
  const start = Date.parse(from + 'T00:00:00');
  const end = Date.parse(to + 'T00:00:00');
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 86400000);
}

// --- saved books -----------------------------------------------------------

export function savedBooks() {
  return read().saved;
}

export function isSaved(href) {
  return read().saved.some(entry => entry.href === href);
}

export function toggleSaved(entry) {
  let nowSaved = false;
  update(state => {
    const index = state.saved.findIndex(saved => saved.href === entry.href);
    if (index >= 0) state.saved.splice(index, 1);
    else { state.saved.unshift({ ...entry, at: Date.now() }); nowSaved = true; }
    return state;
  });
  return nowSaved;
}

// --- recently viewed -------------------------------------------------------

export function recordVisit(entry) {
  if (!entry || !entry.href) return;
  update(state => {
    state.recent = state.recent.filter(item => item.href !== entry.href);
    state.recent.unshift({ ...entry, at: Date.now() });
    state.recent = state.recent.slice(0, LIMIT_RECENT);
    return state;
  });
}

export function recentlyViewed(limit = 12) {
  return read().recent.slice(0, limit);
}

// --- per-book progress -----------------------------------------------------
//
// Progress is deliberately reader-declared rather than inferred from scrolling.
// A reader ticks off an act or a chapter when they have actually read it.

export function bookProgress(slug) {
  const stored = read().progress[slug];
  return { stages: [], quotations: [], startedAt: 0, ...(stored || {}) };
}

export function markStage(slug, stageId, done) {
  update(state => {
    const entry = state.progress[slug] || { stages: [], quotations: [], startedAt: Date.now() };
    const stages = new Set(entry.stages);
    if (done) stages.add(stageId); else stages.delete(stageId);
    entry.stages = [...stages];
    state.progress[slug] = entry;
    return state;
  });
  return bookProgress(slug);
}

export function markQuotation(slug, quotationId, done) {
  update(state => {
    const entry = state.progress[slug] || { stages: [], quotations: [], startedAt: Date.now() };
    const learned = new Set(entry.quotations);
    if (done) learned.add(quotationId); else learned.delete(quotationId);
    entry.quotations = [...learned];
    state.progress[slug] = entry;
    return state;
  });
  return bookProgress(slug);
}

export function allProgress() {
  return read().progress;
}

// --- scores and streak -----------------------------------------------------

export function recordScore(gameId, { score, total, bookSlug }) {
  const day = today();
  update(state => {
    const entry = state.scores[gameId] || { best: 0, bestTotal: 0, played: 0, lastAt: 0, byBook: {} };
    entry.played += 1;
    entry.lastAt = Date.now();
    const ratio = total ? score / total : 0;
    const bestRatio = entry.bestTotal ? entry.best / entry.bestTotal : 0;
    if (ratio > bestRatio || (ratio === bestRatio && score > entry.best)) {
      entry.best = score;
      entry.bestTotal = total;
    }
    if (bookSlug) {
      const book = entry.byBook[bookSlug] || { best: 0, total: 0, played: 0 };
      book.played += 1;
      if (total && score / total >= (book.total ? book.best / book.total : 0)) { book.best = score; book.total = total; }
      entry.byBook[bookSlug] = book;
    }
    state.scores[gameId] = entry;

    const gap = state.streak.lastDay ? daysBetween(state.streak.lastDay, day) : null;
    if (gap === 0) { /* already counted today */ }
    else if (gap === 1) state.streak.current += 1;
    else state.streak.current = 1;
    state.streak.lastDay = day;
    state.streak.longest = Math.max(state.streak.longest, state.streak.current);
    return state;
  });
}

export function scores() {
  return read().scores;
}

export function streak() {
  const state = read();
  if (!state.streak.lastDay) return { ...state.streak, live: false };
  const gap = daysBetween(state.streak.lastDay, today());
  // A streak survives one missed day only in the sense that it is still shown;
  // it is not silently extended.
  return { ...state.streak, live: gap === 0 || gap === 1 };
}

// --- commonplace book ------------------------------------------------------

export function commonplace() {
  return read().commonplace;
}

export function inCommonplace(id) {
  return read().commonplace.some(entry => entry.id === id);
}

export function toggleCommonplace(entry) {
  let added = false;
  update(state => {
    const index = state.commonplace.findIndex(item => item.id === entry.id);
    if (index >= 0) state.commonplace.splice(index, 1);
    else {
      state.commonplace.unshift({ ...entry, at: Date.now(), note: entry.note || '' });
      state.commonplace = state.commonplace.slice(0, LIMIT_COMMONPLACE);
      added = true;
    }
    return state;
  });
  return added;
}

export function annotate(id, note) {
  update(state => {
    const entry = state.commonplace.find(item => item.id === id);
    if (entry) entry.note = note;
    return state;
  });
}

// --- spaced repetition -----------------------------------------------------
//
// A five-box Leitner schedule. A card answered correctly moves up a box and
// comes back later; a card answered wrongly goes back to box one and returns
// tomorrow. The intervals are the familiar 1, 2, 4, 8, 16 days.

const INTERVALS = [1, 2, 4, 8, 16];

export function reviewCard(cardId, correct) {
  update(state => {
    const card = state.cards[cardId] || { box: 0, due: today(), lapses: 0, reviews: 0 };
    card.reviews += 1;
    if (correct) card.box = Math.min(card.box + 1, INTERVALS.length - 1);
    else { card.box = 0; card.lapses += 1; }
    const due = new Date();
    due.setDate(due.getDate() + INTERVALS[card.box]);
    card.due = today(due);
    card.lastAt = Date.now();
    state.cards[cardId] = card;
    return state;
  });
}

export function dueCards(cardIds) {
  const state = read();
  const day = today();
  return cardIds.filter(id => {
    const card = state.cards[id];
    if (!card) return true;
    return card.due <= day;
  });
}

export function cardState(cardId) {
  return read().cards[cardId] || null;
}

export function deckSummary(cardIds) {
  const state = read();
  const day = today();
  let learned = 0;
  let due = 0;
  for (const id of cardIds) {
    const card = state.cards[id];
    if (!card) { due += 1; continue; }
    if (card.box >= 3) learned += 1;
    if (card.due <= day) due += 1;
  }
  return { total: cardIds.length, learned, due };
}

// --- daily puzzle ----------------------------------------------------------

export function dailyResult(day = today()) {
  return read().daily[day] || null;
}

export function recordDaily(result, day = today()) {
  update(state => {
    state.daily[day] = { ...result, at: Date.now() };
    const days = Object.keys(state.daily).sort();
    // Keep a season of results, not a lifetime.
    while (days.length > 120) delete state.daily[days.shift()];

    const gap = state.streak.lastDay ? daysBetween(state.streak.lastDay, day) : null;
    if (gap === 0) { /* already counted */ }
    else if (gap === 1) state.streak.current += 1;
    else state.streak.current = 1;
    state.streak.lastDay = day;
    state.streak.longest = Math.max(state.streak.longest, state.streak.current);
    return state;
  });
}

export function dailyHistory() {
  return read().daily;
}

// --- reading plans ---------------------------------------------------------

export function readingPlan(slug) {
  return read().plans[slug] || null;
}

export function allPlans() {
  return Object.values(read().plans);
}

export function savePlan(plan) {
  if (!plan || !plan.slug) return null;
  update(state => { state.plans[plan.slug] = plan; return state; });
  return plan;
}

export function removePlan(slug) {
  update(state => { delete state.plans[slug]; return state; });
}

export function markSitting(slug, index, done) {
  update(state => {
    const plan = state.plans[slug];
    if (!plan || !plan.sittings[index]) return state;
    plan.sittings[index].done = Boolean(done);
    return state;
  });
}

// --- housekeeping ----------------------------------------------------------

export function exportAll() {
  return JSON.stringify(read(), null, 2);
}

export function forget(section) {
  update(state => {
    if (!section) return clone(EMPTY);
    if (section in EMPTY) state[section] = clone(EMPTY[section]);
    return state;
  });
}

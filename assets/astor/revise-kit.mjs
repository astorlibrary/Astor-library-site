// Shared pieces for the Revise pages: each book's colour, drawing and cover,
// the state of its key lines, the ten-question session and the one next step
// a page suggests.
//
// The Revise pages open on one book at a time, so they read the small
// /assets/revise-index.json for the chooser and then fetch only the chosen
// book's record. The whole-library study index is left to the explorers.

import { el, clear, shuffle, seededRandom } from './util.mjs';
import { loadBook, cardId } from './data.mjs';
import { snapshot, today, recentlyViewed } from './store.mjs';
import { GAME_BUILDERS } from './questions.mjs';

// --- the quizzes -------------------------------------------------------------

export const QUIZZES = [
  { id: 'who-said-it', name: 'Who said it?', note: 'Read a line and name who says it.', group: 'words' },
  { id: 'fill-the-line', name: 'Fill the line', note: 'Put the missing words back.', group: 'words' },
  { id: 'theme-match', name: 'Theme match', note: 'Match a line to the theme it carries.', group: 'ideas' },
  { id: 'technique-spotter', name: 'Technique spotter', note: 'Name the technique doing the work.', group: 'ideas' },
  { id: 'character-identification', name: 'Who is this?', note: 'Name a character from a description.', group: 'people' },
  { id: 'order-the-plot', name: 'Order the plot', note: 'Put the story back in order.', group: 'people' }
];

export const LIBRARY_QUIZZES = [
  { id: 'which-book', name: 'Which book?', note: 'Name the book a line comes from.' },
  { id: 'context-sprint', name: 'Which year?', note: 'Place an event in its year.' },
  { id: 'opening-lines', name: 'Opening lines', note: 'Name the book from its first sentence.' }
];

export const GROUPS = [
  { id: 'words', label: 'The words' },
  { id: 'ideas', label: 'The ideas' },
  { id: 'people', label: 'The people and the plot' }
];

export function quizName(id) {
  if (id === 'mixed-round') return 'Ten questions';
  return [...QUIZZES, ...LIBRARY_QUIZZES].find(quiz => quiz.id === id)?.name || id;
}

// --- the shelf ---------------------------------------------------------------

let shelfRequest = null;

export function loadShelf() {
  if (!shelfRequest) {
    shelfRequest = fetch('/assets/revise-index.json', { credentials: 'omit' })
      .then(response => {
        if (!response.ok) throw new Error('Could not load the books');
        return response.json();
      })
      .then(data => ({ icons: data.icons || {}, books: data.books.slice().sort((a, b) => a.title.localeCompare(b.title)) }))
      .catch(error => { shelfRequest = null; throw error; });
  }
  return shelfRequest;
}

export { loadBook };

// A drawing as markup. `paths` is the inner SVG from book-motifs.js or
// revise-icons.js; both are drawn in the same 24x24 box.
export function drawing(paths, size = 24, className = '') {
  return el('span', {
    class: 'rv-drawing' + (className ? ' ' + className : ''),
    'aria-hidden': 'true',
    html: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" focusable="false">' + (paths || '') + '</svg>'
  });
}

export function setAccent(node, meta) {
  if (node && meta?.accent) node.style.setProperty('--book-accent', meta.accent);
}

// --- dates -------------------------------------------------------------------

const DAY = 86400000;

export function whenLabel(time) {
  if (!time) return '';
  const then = new Date(time);
  const now = new Date();
  const start = date => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((start(now) - start(then)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return then.toLocaleDateString('en-GB', { weekday: 'long' });
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

// --- questions and quotations ------------------------------------------------

const QUOTATION_KINDS = new Set(['who', 'cloze', 'theme', 'technique', 'book']);

// Every question built from a quotation carries it in its id:
// "who:macbeth:all-hail" is the line "all-hail" in Macbeth.
export function quotationKey(question) {
  const parts = String(question?.id || '').split(':');
  if (parts.length < 3 || !QUOTATION_KINDS.has(parts[0])) return null;
  return { slug: parts[1], id: parts.slice(2).join(':') };
}

export function quotationFor(book, question) {
  const key = quotationKey(question);
  if (!key || !book || key.slug !== book.slug) return null;
  return book.quotations.find(quotation => quotation.id === key.id) || null;
}

// "Frankenstein; or, The Modern Prometheus" reads as "Frankenstein" in a sentence.
export function shortTitle(book) {
  return String(book?.title || '').split(';')[0].trim();
}

export function firstSentence(text) {
  const match = String(text || '').match(/^.+?[.!?](?=\s|$)/);
  return (match ? match[0] : String(text || '')).trim();
}

export function clip(text, length = 80) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= length) return value;
  return value.slice(0, value.lastIndexOf(' ', length - 1) > 20 ? value.lastIndexOf(' ', length - 1) : length).replace(/[,;:.]$/, '') + '…';
}

// --- the state of a book's lines ---------------------------------------------

// Five Leitner boxes (store.mjs): a line starts in box one and moves up each
// time it is remembered. Four words cover that honestly.
export function lineState(card) {
  if (!card) return 'new';
  if (card.box >= 3) return 'known';
  if (card.box >= 1) return 'growing';
  return 'shaky';
}

export const STATE_WORDS = {
  new: 'not met yet',
  shaky: 'shaky',
  growing: 'getting there',
  known: 'known'
};

export function bookLines(book, cards = snapshot().cards || {}, day = today()) {
  return book.quotations.map(quotation => {
    const card = cards[cardId(book.slug, quotation.id)];
    return {
      quotation,
      card: card || null,
      state: lineState(card),
      due: Boolean(card && card.due <= day)
    };
  });
}

export function lineSummary(lines) {
  const counts = { new: 0, shaky: 0, growing: 0, known: 0, due: 0 };
  for (const line of lines) {
    counts[line.state] += 1;
    if (line.due) counts.due += 1;
  }
  return counts;
}

// When the reader last worked on this book. Results saved before dates were
// kept still count as "revised", just without a day to name.
export function lastRevised(book, state = snapshot()) {
  let latest = 0;
  let before = false;
  for (const entry of Object.values(state.scores || {})) {
    const result = entry.byBook?.[book.slug];
    if (!result) continue;
    if (result.lastAt) latest = Math.max(latest, result.lastAt);
    else before = true;
  }
  for (const quotation of book.quotations) {
    const card = state.cards?.[cardId(book.slug, quotation.id)];
    if (!card) continue;
    if (card.lastAt) latest = Math.max(latest, card.lastAt);
    else if (card.reviews) before = true;
  }
  return { time: latest, before: before || Boolean(latest) };
}

// --- the ten-question session ------------------------------------------------

const LINE_KINDS = ['who-said-it', 'fill-the-line', 'theme-match', 'technique-spotter'];

// Ten questions on one book, in the order a good teacher would set them:
// lines that are due come first, then lines not met yet, then a few known
// ones so they stay known. Each line is asked in whichever way has been used
// least so far, and one question on the people and one on the plot are mixed
// in when the book has them.
export function sessionPlan(book, { cards = snapshot().cards || {}, day = today(), random = Math.random, length = 10 } = {}) {
  const byLine = new Map();
  for (const kind of LINE_KINDS) {
    for (const question of GAME_BUILDERS[kind].build(book, random)) {
      const key = quotationKey(question);
      if (!key) continue;
      if (!byLine.has(key.id)) byLine.set(key.id, {});
      byLine.get(key.id)[kind] = question;
    }
  }

  const due = [];
  const fresh = [];
  const known = [];
  for (const lineId of byLine.keys()) {
    const card = cards[cardId(book.slug, lineId)];
    if (!card) fresh.push({ lineId, card });
    else if (card.due <= day) due.push({ lineId, card });
    else known.push({ lineId, card });
  }
  due.sort((a, b) => a.card.box - b.card.box || String(a.card.due).localeCompare(String(b.card.due)));
  known.sort((a, b) => a.card.box - b.card.box);

  const extras = [];
  const people = shuffle(GAME_BUILDERS['character-identification'].build(book, random), random)[0];
  const plot = shuffle(GAME_BUILDERS['order-the-plot'].build(book, random), random)[0];
  if (people) extras.push(people);
  if (plot) extras.push(plot);

  const wanted = Math.max(0, Math.min(length - extras.length, byLine.size));
  const chosen = [...due, ...shuffle(fresh, random), ...known].slice(0, wanted);
  const used = Object.fromEntries(LINE_KINDS.map(kind => [kind, 0]));
  const lineQuestions = chosen.map(({ lineId }) => {
    const ways = byLine.get(lineId);
    const kinds = Object.keys(ways).sort((a, b) => used[a] - used[b] || random() - 0.5);
    used[kinds[0]] += 1;
    return ways[kinds[0]];
  });

  // Keep the due lines early, but put the people and plot questions a third
  // and two thirds of the way through rather than at the end.
  const questions = lineQuestions.slice();
  extras.slice(0, length - questions.length).forEach((question, position) => {
    const at = Math.min(questions.length, Math.round(((position + 1) * (questions.length + 1)) / (extras.length + 1)));
    questions.splice(at, 0, question);
  });

  const counts = { due: 0, fresh: 0, known: 0, people: Boolean(people), plot: Boolean(plot) };
  for (const { lineId } of chosen) {
    if (due.some(entry => entry.lineId === lineId)) counts.due += 1;
    else if (fresh.some(entry => entry.lineId === lineId)) counts.fresh += 1;
    else counts.known += 1;
  }
  return { questions: questions.slice(0, length), counts };
}

export function sessionLine(counts) {
  const parts = [];
  if (counts.due) parts.push(counts.due + (counts.due === 1 ? ' line due for another look' : ' lines due for another look'));
  if (counts.fresh) parts.push(counts.fresh + (counts.fresh === 1 ? ' line you haven’t met yet' : ' lines you haven’t met yet'));
  if (counts.known) parts.push(counts.known + (counts.known === 1 ? ' line you’ve met before' : ' lines you’ve met before'));
  if (counts.people && counts.plot) parts.push('a question each on the people and the plot');
  else if (counts.people) parts.push('a question on the people');
  else if (counts.plot) parts.push('a question on the plot');
  if (!parts.length) return 'A mix of every kind of question.';
  const sentence = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

// --- what to do next ---------------------------------------------------------

export function availableQuizzes(book) {
  return QUIZZES.filter(quiz => {
    try { return GAME_BUILDERS[quiz.id].build(book, seededRandom(1)).length >= 4; } catch { return false; }
  });
}

// One suggestion, chosen by a fixed rule: a kind of quiz not yet tried on this
// book, otherwise the weakest one, otherwise an essay plan.
export function nextStep(book, { exclude = '', state = snapshot() } = {}) {
  const quizzes = availableQuizzes(book).filter(quiz => quiz.id !== exclude);
  const results = quizzes.map(quiz => ({ quiz, result: state.scores?.[quiz.id]?.byBook?.[book.slug] || null }));
  const untried = results.find(entry => !entry.result);
  if (untried) {
    return {
      href: '/play/' + untried.quiz.id + '/?book=' + encodeURIComponent(book.slug),
      label: untried.quiz.name,
      sentence: 'Not tried yet on ' + shortTitle(book) + ': ' + untried.quiz.note.charAt(0).toLowerCase() + untried.quiz.note.slice(1)
    };
  }
  const weakest = results
    .filter(entry => entry.result.total)
    .sort((a, b) => a.result.best / a.result.total - b.result.best / b.result.total)[0];
  if (weakest && weakest.result.best / weakest.result.total < 0.9) {
    return {
      href: '/play/' + weakest.quiz.id + '/?book=' + encodeURIComponent(book.slug),
      label: weakest.quiz.name,
      sentence: 'Your weakest quiz on ' + shortTitle(book) + ' so far (best score ' + weakest.result.best + ' out of ' + weakest.result.total + '):'
    };
  }
  if ((book.essayQuestions || []).length) {
    return {
      href: '/play/essay-forge/?book=' + encodeURIComponent(book.slug),
      label: 'Plan an essay',
      sentence: 'Your best in every other quiz on ' + shortTitle(book) + ' is 9 in 10 or better.'
    };
  }
  return null;
}

// --- the book chooser --------------------------------------------------------

const REMEMBERED = 'astor-last-book';

export function rememberBook(slug) {
  try { window.localStorage.setItem(REMEMBERED, slug); } catch { /* optional */ }
}

export function preferredSlug() {
  const asked = new URLSearchParams(window.location.search).get('book');
  if (asked) return asked;
  try { return window.localStorage.getItem(REMEMBERED) || ''; } catch { return ''; }
}

// "Change book" as a disclosure: the reader's recent books as buttons, then the
// full list in a native select, so keyboard and screen-reader use is unchanged.
export function bookSwitcher(books, current, recentSlugs, onChoose) {
  const details = el('details', { class: 'rv-switch' });
  // After the page redraws for the new book, focus goes back to "Change book".
  const choose = book => Promise.resolve(onChoose(book)).then(() => {
    document.querySelector('.rv-switch summary')?.focus({ preventScroll: true });
  });
  details.append(el('summary', { text: 'Change book' }));
  const panel = el('div', { class: 'rv-switch-panel' });
  const recent = recentSlugs
    .map(slug => books.find(book => book.slug === slug))
    .filter(book => book && book.slug !== current.slug)
    .slice(0, 4);
  if (recent.length) {
    const row = el('div', { class: 'rv-switch-recent', role: 'group', 'aria-label': 'Recent books' });
    for (const book of recent) {
      row.append(el('button', {
        type: 'button', class: 'rv-switch-book', style: '--book-accent:' + book.accent,
        onclick: () => { details.open = false; choose(book); }
      }, [drawing(book.motif, 18), el('span', { text: book.title })]));
    }
    panel.append(row);
  }
  const id = 'rv-switch-' + Math.random().toString(36).slice(2, 8);
  const select = el('select', { id });
  for (const book of books) {
    select.append(el('option', { value: book.slug, text: book.title + ' — ' + book.author, selected: book.slug === current.slug }));
  }
  // Arrow keys on a closed select fire "change" in some browsers, so while the
  // reader is browsing with the keyboard the choice waits for Enter or blur.
  let browsing = false;
  const commit = () => {
    browsing = false;
    const book = books.find(item => item.slug === select.value);
    if (!book || book.slug === current.slug) return;
    details.open = false;
    choose(book);
  };
  select.addEventListener('keydown', event => {
    if (/^(Arrow|Page|Home|End)/.test(event.key)) browsing = true;
    if (event.key === 'Enter') { event.preventDefault(); commit(); }
  });
  select.addEventListener('change', () => { if (!browsing) commit(); });
  select.addEventListener('blur', () => { if (browsing) commit(); });
  panel.append(el('label', { for: id, text: 'Every book' }), select);
  details.append(panel);
  return details;
}

export function keepAddress(slug) {
  rememberBook(slug);
  const url = new URL(window.location.href);
  url.searchParams.set('book', slug);
  window.history.replaceState(null, '', url);
}

// The running head on a Revise tool page: the book's drawing, title and
// author, and "Change book".
export function bookHead(head, books, meta, onChoose) {
  if (!head) return;
  clear(head);
  head.append(
    drawing(meta.motif, 22, 'rv-head-motif'),
    el('a', { class: 'rv-head-title', href: '/play/?book=' + encodeURIComponent(meta.slug), text: meta.title }),
    el('span', { class: 'rv-head-author', text: meta.author }),
    bookSwitcher(books, meta, recentlyViewed(20).map(entry => entry.slug), onChoose)
  );
}

// Everything a one-book tool needs: the shelf, the reader's book, the head,
// and that book's record, fetched on its own. A slow book never overwrites a
// quicker, later choice.
export async function openBookPage({ head, mount, filter, render }) {
  let shelf;
  try { shelf = await loadShelf(); } catch {
    clear(mount);
    mount.append(el('p', { class: 'rv-empty', text: 'The books didn’t load. Try reloading the page.' }));
    return;
  }
  const books = filter ? shelf.books.filter(filter) : shelf.books;
  if (!books.length) {
    clear(mount);
    mount.append(el('p', { class: 'rv-empty', text: 'No books have this yet.' }));
    return;
  }
  const wanted = preferredSlug();
  const recent = recentlyViewed(20).map(entry => entry.slug);
  const first = books.find(book => book.slug === wanted)
    || books.find(book => recent.includes(book.slug))
    || books.find(book => book.slug === 'macbeth')
    || books[0];
  let generation = 0;
  const open = async meta => {
    const ticket = ++generation;
    keepAddress(meta.slug);
    setAccent(document.querySelector('main'), meta);
    bookHead(head, books, meta, open);
    let book;
    try { book = await loadBook(meta.slug); } catch {
      if (ticket !== generation) return;
      clear(mount);
      mount.append(el('p', { class: 'rv-empty', text: 'That book didn’t load. Try another, or reload the page.' }));
      return;
    }
    if (ticket !== generation) return;
    render(book, meta);
  };
  await open(first);
}

export { clear, el, cardId };

// Shared pieces for the Revise pages: each book's colour and cover, the state
// of its key lines, the ten-question session and the one next step a page
// suggests.
//
// The Revise pages open on one book at a time, so they read the small
// /assets/revise-index.json for the chooser and then fetch only the chosen
// book's record. The whole-library study index is left to the explorers.

import { el, clear, shuffle, seededRandom, fetchJson, describeError, guideHref } from './util.mjs';
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
    shelfRequest = fetchJson('/assets/revise-index.json')
      .then(data => ({ icons: data.icons || {}, books: data.books.slice().sort((a, b) => a.title.localeCompare(b.title)) }))
      .catch(error => { shelfRequest = null; throw error; });
  }
  return shelfRequest;
}

export { loadBook };

// The book's colour, for its links, its one button and the thin rules that
// mark progress. Revise follows the site's own light or dark theme; a book
// changes only this colour, never the page around the question.
let currentMeta = null;

export function setAccent(node, meta) {
  currentMeta = meta || null;
  if (node && meta?.accent) node.style.setProperty('--book-accent', meta.accent);
}

export function currentBook() {
  return currentMeta;
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

// A line in curly quotation marks, without doubling marks the line already has.
export function quoted(text) {
  // Only double marks: a leading apostrophe is usually an elision ('Tis).
  const inner = String(text || '').trim().replace(/^[“"]+/, '').replace(/[”"]+$/, '');
  return '“' + inner + '”';
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
    for (const question of buildSafely(kind, book, random)) {
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
  const people = shuffle(buildSafely('character-identification', book, random), random)[0];
  const plot = shuffle(buildSafely('order-the-plot', book, random), random)[0];
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

// Builders that threw, so a page can say an activity could not be prepared
// rather than leave it silently missing.
export const buildFailures = [];

// One activity's questions, or none if its builder throws (an older browser
// missing a feature, a record in an unexpected shape): one activity failing
// must never take the others, or the page, down with it.
export function buildSafely(kind, book, random) {
  try { return GAME_BUILDERS[kind].build(book, random); } catch (error) {
    if (!buildFailures.some(item => item.quiz === kind && item.book === book.slug)) {
      const quiz = QUIZZES.find(entry => entry.id === kind);
      buildFailures.push({ quiz: kind, name: quiz ? quiz.name : kind, book: book.slug, error });
      console.error('Astor Library: could not prepare ' + kind + ' for ' + book.slug + '.', error);
    }
    return [];
  }
}

export function availableQuizzes(book) {
  return QUIZZES.filter(quiz => buildSafely(quiz.id, book, seededRandom(1)).length >= 4);
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

// --- every activity a book can have ------------------------------------------

// The order a student meets them in the study bar: the quick session, the
// six quizzes on one kind of thing, then the longer work.
export const ACTIVITIES = [
  { id: 'mixed-round', name: 'Ten questions', short: 'Ten questions' },
  { id: 'who-said-it', name: 'Who said it?', short: 'Who said it' },
  { id: 'fill-the-line', name: 'Fill the line', short: 'Fill the line' },
  { id: 'theme-match', name: 'Theme match', short: 'Themes' },
  { id: 'technique-spotter', name: 'Technique spotter', short: 'Techniques' },
  { id: 'character-identification', name: 'Who is this?', short: 'Characters' },
  { id: 'order-the-plot', name: 'Order the plot', short: 'Plot order' },
  { id: 'flashcards', name: 'Flashcards', short: 'Flashcards' },
  { id: 'essay-forge', name: 'Essay planner', short: 'Essay plan' },
  { id: 'defend-the-reading', name: 'Defend the reading', short: 'Debate' }
];

// Whether a shelf entry (assets/revise-index.json) supports an activity,
// without fetching the book's record.
export function hasActivity(meta, id) {
  if (!meta) return false;
  if (id === 'mixed-round') return true;
  if (id === 'flashcards') return meta.quotations >= 5;
  if (id === 'essay-forge') return meta.essays > 0;
  if (id === 'defend-the-reading') return meta.views >= 2 && meta.quotations >= 6;
  return (meta.quizzes || []).includes(id);
}

export function activityHref(id, slug) {
  return '/play/' + id + '/?book=' + encodeURIComponent(slug);
}

export function coverImage(meta, { width = 120, className = '', eager = false } = {}) {
  if (!meta?.cover) {
    return el('span', { class: 'rx-cover-blank ' + className, style: '--book-accent:' + (meta?.accent || '#6E1F2B'), 'aria-hidden': 'true' }, [
      el('span', { text: shortTitle(meta) })
    ]);
  }
  return el('img', {
    class: className, src: meta.cover, alt: '', width: String(width), height: String(Math.round(width * 1.5)),
    decoding: 'async', loading: eager ? 'eager' : 'lazy'
  });
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

// "Choose a book" as a dialog of covers: a search box, the reader's recent
// books, and every book this tool supports, filterable by period. A native
// <dialog> keeps focus inside while it is open and Escape closes it.
export function openShelf({ books, current, recentSlugs = [], onChoose, heading = 'Choose a book' }) {
  const dialog = el('dialog', { class: 'rx-shelf', 'aria-labelledby': 'rx-shelf-title' });
  // Safari before 15.4 has no <dialog>: there the shelf is an ordinary fixed
  // panel, closed by hand.
  const native = typeof dialog.showModal === 'function';
  const close = () => {
    if (native) { dialog.close(); return; }
    if (!dialog.isConnected) return;
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));
  };
  const choose = book => {
    close();
    if (!current || book.slug !== current.slug) onChoose(book);
  };

  const search = el('input', {
    type: 'search', class: 'rx-shelf-search', placeholder: 'Search by title or author',
    'aria-label': 'Search by title or author', autocomplete: 'off'
  });
  const periods = [...new Set(books.map(book => book.period).filter(Boolean))].sort();
  let period = '';
  const chips = el('div', { class: 'rx-shelf-chips', role: 'group', 'aria-label': 'Filter by period' });
  const chip = (value, label) => el('button', {
    type: 'button', class: 'rx-chip', 'aria-pressed': String(period === value), text: label,
    onclick: () => { period = value; draw(); }
  });
  if (periods.length > 1) {
    chips.append(chip('', 'All'));
    for (const value of periods) chips.append(chip(value, value));
    chips.addEventListener('click', event => {
      const pressed = event.target.closest('.rx-chip');
      if (!pressed) return;
      for (const node of chips.children) node.setAttribute('aria-pressed', String(node === pressed));
    });
  }

  const tile = book => el('li', {}, [el('button', {
    type: 'button', class: 'rx-shelf-book' + (current && book.slug === current.slug ? ' is-current' : ''),
    style: '--book-accent:' + (book.accent || '#6E1F2B'),
    'aria-current': current && book.slug === current.slug ? 'true' : null,
    onclick: () => choose(book)
  }, [
    el('span', { class: 'rx-shelf-cover' }, [coverImage(book, { width: 120 })]),
    el('span', { class: 'rx-shelf-title', text: book.title }),
    el('span', { class: 'rx-shelf-author', text: book.author })
  ])]);

  const recent = recentSlugs.map(slug => books.find(book => book.slug === slug)).filter(Boolean).slice(0, 6);
  const recentBlock = recent.length ? el('section', { class: 'rx-shelf-section' }, [
    el('h3', { text: 'Recently opened' }),
    el('ul', { class: 'rx-shelf-grid is-row' }, recent.map(tile))
  ]) : null;

  const grid = el('ul', { class: 'rx-shelf-grid' });
  const count = el('p', { class: 'rx-shelf-count', 'aria-live': 'polite' });
  const draw = () => {
    const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const shown = books.filter(book => (!period || book.period === period)
      && words.every(word => (book.title + ' ' + book.author).toLowerCase().includes(word)));
    clear(grid);
    for (const book of shown) grid.append(tile(book));
    count.textContent = shown.length === books.length ? books.length + ' books' : shown.length + ' of ' + books.length + ' books';
    if (recentBlock) recentBlock.hidden = Boolean(words.length || period);
    if (!shown.length) grid.append(el('li', { class: 'rx-shelf-none', text: 'No book matches that. Try part of the title or the author’s surname.' }));
  };
  search.addEventListener('input', draw);

  dialog.append(
    el('div', { class: 'rx-shelf-head' }, [
      el('h2', { id: 'rx-shelf-title', text: heading }),
      el('button', { type: 'button', class: 'rx-shelf-close', 'aria-label': 'Close', html: '&times;', onclick: close })
    ]),
    el('div', { class: 'rx-shelf-tools' }, [search, chips.childNodes.length ? chips : null]),
    el('div', { class: 'rx-shelf-body' }, [recentBlock, el('section', { class: 'rx-shelf-section' }, [
      el('div', { class: 'rx-shelf-section-head' }, [el('h3', { text: 'All books' }), count]),
      grid
    ])])
  );
  // A click on the backdrop (the dialog element itself, outside its box) closes it.
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) close();
  });
  const opener = document.activeElement;
  dialog.addEventListener('close', () => {
    dialog.remove();
    document.documentElement.classList.remove('rx-locked');
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  });
  draw();
  document.body.append(dialog);
  document.documentElement.classList.add('rx-locked');
  if (native) dialog.showModal();
  else {
    dialog.setAttribute('open', '');
    dialog.classList.add('is-fallback');
    const onEscape = event => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onEscape);
    dialog.addEventListener('close', () => document.removeEventListener('keydown', onEscape));
  }
  // On a phone the keyboard would cover the covers, so focus waits for a tap.
  if (window.matchMedia?.('(min-width: 720px)').matches) search.focus();
  return dialog;
}

export function changeBookButton({ books, current, onChoose, label = 'Change book', className = 'rx-change' }) {
  return el('button', {
    type: 'button', class: className,
    onclick: () => openShelf({ books, current, recentSlugs: recentlyViewed(20).map(entry => entry.slug), onChoose })
  }, [el('span', { text: label })]);
}

export function keepAddress(slug) {
  rememberBook(slug);
  const url = new URL(window.location.href);
  url.searchParams.set('book', slug);
  window.history.replaceState(null, '', url);
}

// The line at the head of every one-book activity: the book (a small cover and
// its title, both leading to its Revise home) and a way to change it. The
// activity's own name is the page's heading, and beside it one menu leads to
// the book's other activities.
export function studyBar(head, { books, meta, active, onChoose }) {
  if (!head) return;
  clear(head);
  head.classList.add('rx-bar-mount');
  const home = '/play/?book=' + encodeURIComponent(meta.slug);
  head.append(el('div', { class: 'rx-bar' }, [
    el('a', { class: 'rx-bar-book', href: home, 'aria-label': 'Revise ' + meta.title + ': all activities' }, [
      coverImage(meta, { width: 40, eager: true }),
      el('span', { class: 'rx-bar-id' }, [
        el('span', { class: 'rx-bar-title', text: shortTitle(meta) }),
        el('span', { class: 'rx-bar-author', text: meta.author })
      ])
    ]),
    changeBookButton({ books, current: meta, onChoose })
  ]));
  const title = head.parentElement?.querySelector('.rx-head');
  title?.querySelector('.rx-acts-menu')?.remove();
  (title || head).append(activityMenu({ meta, active }));
}

// The book's activities, folded behind one quiet control beside the heading,
// in the Revise home's three groups, with the way to the study guide underneath.
export const ACTIVITY_GROUPS = [
  { title: 'Practise', ids: ['mixed-round', 'who-said-it', 'fill-the-line', 'theme-match', 'technique-spotter', 'character-identification', 'order-the-plot'] },
  { title: 'Learn', ids: ['flashcards'] },
  { title: 'Write', ids: ['essay-forge', 'defend-the-reading'] }
];

function activityMenu({ meta, active }) {
  const menu = el('details', { class: 'rx-acts-menu' });
  menu.append(el('summary', {}, [el('span', { text: 'Other activities' })]));
  const panel = el('nav', { class: 'rx-acts-panel', 'aria-label': 'Activities for ' + meta.title });
  for (const group of ACTIVITY_GROUPS) {
    const ids = group.ids.filter(id => hasActivity(meta, id));
    if (!ids.length) continue;
    panel.append(el('p', { class: 'rx-acts-group', text: group.title }), el('ul', { class: 'rx-acts-grid' }, ids.map(id => {
      const activity = ACTIVITIES.find(entry => entry.id === id);
      const here = id === active;
      return el('li', {}, [el('a', {
        class: 'rx-acts-tile' + (here ? ' is-here' : ''), href: activityHref(id, meta.slug), 'aria-current': here ? 'page' : null, text: activity.name
      })]);
    })));
  }
  // The book's other two places: its edition and its study guide.
  panel.append(el('p', { class: 'rx-acts-foot' }, [
    el('a', { href: guideHref(meta.slug), text: 'Study guide' }),
    el('a', { href: meta.href, text: 'The edition' })
  ]));
  menu.append(panel);
  // Close when the reader taps elsewhere or presses Escape.
  const close = event => {
    if (!menu.open) return;
    if (event.type === 'keydown' ? event.key === 'Escape' : !menu.contains(event.target)) {
      menu.open = false;
      if (event.type === 'keydown') menu.querySelector('summary').focus();
    }
  };
  if (menuCloser) { document.removeEventListener('click', menuCloser); document.removeEventListener('keydown', menuCloser); }
  menuCloser = close;
  document.addEventListener('click', close);
  document.addEventListener('keydown', close);
  return menu;
}
let menuCloser = null;

export function headerOffset() {
  const header = document.querySelector('.site-header');
  if (!header) return 0;
  const position = getComputedStyle(header).position;
  return position === 'sticky' || position === 'fixed' ? Math.round(header.getBoundingClientRect().height) : 0;
}
function syncHeaderOffset() {
  document.documentElement.style.setProperty('--rx-header', headerOffset() + 'px');
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncHeaderOffset);
  else syncHeaderOffset();
  window.addEventListener('resize', syncHeaderOffset);
}

// Kept for the older call sites: the running head is now the study bar.
export function bookHead(head, books, meta, onChoose, options = {}) {
  studyBar(head, { books, meta, onChoose, active: options.active });
}

// When the books cannot be fetched: say so, say why in a line the reader can
// pass on, and offer to try again.
export function loadFailed(mount, message = 'The books didn’t load.', error = null, hint = 'Check your connection, then try again.') {
  clear(mount);
  const why = describeError(error);
  mount.append(el('div', { class: 'rv-empty rx-load-failed' }, [
    el('p', { text: message + ' ' + hint }),
    why ? el('p', { class: 'rx-load-why', text: 'Reason: ' + why }) : null,
    el('button', { type: 'button', class: 'rx-button is-primary', text: 'Try again', onclick: () => window.location.reload() })
  ]));
}

// Everything a one-book tool needs: the shelf, the reader's book, the study
// bar, and that book's record, fetched on its own. A slow book never
// overwrites a quicker, later choice.
export async function openBookPage({ head, mount, filter, render, active }) {
  let shelf;
  try { shelf = await loadShelf(); } catch (error) {
    loadFailed(mount, undefined, error);
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
    studyBar(head, { books, meta, active, onChoose: open });
    clear(mount);
    mount.append(el('p', { class: 'rv-loading', text: 'Opening ' + meta.title + '…' }));
    let book;
    try { book = await loadBook(meta.slug); } catch (error) {
      if (ticket !== generation) return;
      loadFailed(mount, 'That book didn’t load.', error);
      return;
    }
    if (ticket !== generation) return;
    // A record must belong to the book that was asked for.
    if (book.slug !== meta.slug) return;
    try { render(book, meta, shelf); } catch (error) {
      console.error('Astor Library: could not open ' + meta.slug + '.', error);
      loadFailed(mount, 'This didn’t open for ' + meta.title + '.', error, 'Try again, or choose another book.');
    }
  };
  await open(first);
}

export { clear, el, cardId };

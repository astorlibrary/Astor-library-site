// Shared pieces for the Revise pages: each book's colour, drawing and cover,
// the state of its key lines, the ten-question session and the one next step
// a page suggests.
//
// The Revise pages open on one book at a time, so they read the small
// /assets/revise-index.json for the chooser and then fetch only the chosen
// book's record. The whole-library study index is left to the explorers.

import { el, clear, shuffle, seededRandom, prefersReducedMotion, fetchJson } from './util.mjs';
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
    shelfRequest = fetchJson('/assets/revise-index.json', data => Array.isArray(data?.books) && data.books.every(book => book?.slug && book.title))
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
  applyEdition(meta);
}

// --- the book's edition ------------------------------------------------------
//
// Every book carries an edition (scripts/editions.js): a light and a dark
// palette drawn from its cover, the mode it wears by default, and a register
// (layout, voice, texture). Applying one writes the palette as custom
// properties and the register as data attributes on <html>; the "rx:
// editions" block of astor-study.css does the rest. Nothing about how a game
// is played changes from book to book.

const MODE_KEY = 'astor-revise-mode';
const TOKENS = {
  ground: '--ed-ground', surface: '--ed-surface', sunk: '--ed-sunk', ink: '--ed-ink', soft: '--ed-soft',
  accent: '--ed-accent', accentText: '--ed-accent-text', button: '--ed-button', buttonInk: '--ed-button-ink',
  hero: '--ed-hero', heroInk: '--ed-hero-ink', line: '--ed-line', lineStrong: '--ed-line-strong',
  right: '--ed-right', wrong: '--ed-wrong', star: '--ed-star', onFill: '--ed-on-fill',
  band: '--ed-band', bandInk: '--ed-band-text', bandSoft: '--ed-band-soft', bandArt: '--ed-band-art'
};
const ART = ['--ed-field', '--ed-motifs', '--ed-motif-n'];

export function modeOverride() {
  try {
    const value = window.localStorage.getItem(MODE_KEY);
    return value === 'light' || value === 'dark' ? value : '';
  } catch { return ''; }
}

// The reader's own choice wins; then a site-wide dark theme they chose; then
// the edition's own mode.
export function editionMode(edition) {
  const chosen = modeOverride();
  if (chosen) return chosen;
  let site = '';
  try { site = window.localStorage.getItem('astor-theme') || ''; } catch { /* optional */ }
  if (site === 'dark') return 'dark';
  return edition?.mode === 'dark' ? 'dark' : 'light';
}

let currentMeta = null;

export function applyEdition(meta) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const edition = meta?.edition;
  currentMeta = meta || null;
  if (!edition) {
    for (const token of [...Object.values(TOKENS), ...ART]) html.style.removeProperty(token);
    for (const key of ['edition', 'edMode', 'edLayout', 'edVoice', 'edTexture', 'edArt']) delete html.dataset[key];
    return;
  }
  // The cover's drawings, lifted by scripts/build-edition-art.mjs.
  const motifs = edition.motifs || 0;
  html.style.setProperty('--ed-field', 'url("/assets/editions/' + meta.slug + '-field.png")');
  if (motifs) html.style.setProperty('--ed-motifs', 'url("/assets/editions/' + meta.slug + '-motifs.png")');
  else html.style.removeProperty('--ed-motifs');
  html.style.setProperty('--ed-motif-n', String(Math.max(2, motifs)));
  if (motifs) html.dataset.edArt = String(motifs); else delete html.dataset.edArt;
  const mode = editionMode(edition);
  const palette = edition[mode] || edition.light;
  for (const [key, token] of Object.entries(TOKENS)) if (palette[key]) html.style.setProperty(token, palette[key]);
  html.dataset.edition = meta.slug;
  html.dataset.edMode = mode;
  html.dataset.edLayout = edition.layout || 'centred';
  html.dataset.edVoice = edition.voice || 'italic';
  html.dataset.edTexture = edition.texture || 'plain';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', palette.ground);
  for (const button of document.querySelectorAll('.rx-mode-toggle')) paintModeToggle(button, mode);
}

// One of the book's own drawings, as a mask the stylesheet tints. `index`
// wraps round however many the cover gave; with none, it draws nothing.
export function motif(index = 0, className = '') {
  const count = currentMeta?.edition?.motifs || 0;
  const node = el('i', { class: 'rx-motif' + (className ? ' ' + className : ''), 'aria-hidden': 'true' });
  node.style.setProperty('--i', String(count ? ((index % count) + count) % count : 0));
  return node;
}

export function hasMotifs() {
  return Boolean(currentMeta?.edition?.motifs);
}
export function currentBook() {
  return currentMeta;
}


// The cover band: the head of the page set in the cover's ground with its
// drawings, running down behind the study bar until it meets the first page
// of the activity, which sits on it like a book on its jacket.
const BAND_ENDS = '.rx-card, .rx-results, .rx-flip, .rv-tool-panel, .rx-hub-start, [data-band-end]';
let bandNode = null;
let bandWatch = null;

export function coverBand(main = document.querySelector('main')) {
  if (typeof document === 'undefined' || !main) return;
  if (!bandNode || !bandNode.isConnected) {
    bandNode = el('div', { class: 'rx-band', 'aria-hidden': 'true' }, [el('div', { class: 'rx-band-art' })]);
    main.prepend(bandNode);
    main.classList.add('has-band');
  }
  const place = () => {
    const end = main.querySelector(BAND_ENDS);
    const top = main.getBoundingClientRect().top + window.scrollY;
    let bottom = 0;
    if (end) bottom = end.getBoundingClientRect().top + window.scrollY - top + Math.min(96, end.offsetHeight * 0.35);
    else {
      const bar = main.querySelector('.rx-bar-mount');
      bottom = bar ? bar.getBoundingClientRect().bottom + window.scrollY - top + 40 : 260;
    }
    main.style.setProperty('--rx-band-h', Math.round(Math.max(180, bottom)) + 'px');
  };
  place();
  if (!bandWatch && 'ResizeObserver' in window) {
    let queued = false;
    const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; place(); }); };
    bandWatch = new ResizeObserver(later);
    bandWatch.observe(main);
    new MutationObserver(later).observe(main, { childList: true, subtree: true });
  }
}

// One button: it switches to the other palette. Switching back to the
// edition's own mode clears the choice, so each book wears its own again.
export function modeToggle(className = 'rx-mode-toggle') {
  const button = el('button', { type: 'button', class: className, onclick: () => {
    const edition = currentMeta?.edition;
    if (!edition) return;
    const next = editionMode(edition) === 'dark' ? 'light' : 'dark';
    try {
      if (next === edition.mode) window.localStorage.removeItem(MODE_KEY);
      else window.localStorage.setItem(MODE_KEY, next);
    } catch { /* storage is optional */ }
    applyEdition(currentMeta);
  } });
  paintModeToggle(button, currentMeta?.edition ? editionMode(currentMeta.edition) : 'light');
  return button;
}

function paintModeToggle(button, mode) {
  const toDark = mode !== 'dark';
  button.setAttribute('aria-label', toDark ? 'Use dark colours for this book' : 'Use light colours for this book');
  button.setAttribute('aria-pressed', String(mode === 'dark'));
  button.title = toDark ? 'Dark colours' : 'Light colours';
  button.innerHTML = toDark
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>';
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
// book, otherwise the weakest one.
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
  return null;
}

// --- every activity a book can have ------------------------------------------

// The order a student meets them in the study bar: the quick session, the
// six quizzes on one kind of thing, then the flashcards.
export const ACTIVITIES = [
  { id: 'mixed-round', name: 'Ten questions', short: 'Ten questions' },
  { id: 'who-said-it', name: 'Who said it?', short: 'Who said it' },
  { id: 'fill-the-line', name: 'Fill the line', short: 'Fill the line' },
  { id: 'theme-match', name: 'Theme match', short: 'Themes' },
  { id: 'technique-spotter', name: 'Technique spotter', short: 'Techniques' },
  { id: 'character-identification', name: 'Who is this?', short: 'Characters' },
  { id: 'order-the-plot', name: 'Order the plot', short: 'Plot order' },
  { id: 'flashcards', name: 'Flashcards', short: 'Flashcards' }
];

// Whether a shelf entry (assets/revise-index.json) supports an activity,
// without fetching the book's record.
export function hasActivity(meta, id) {
  if (!meta) return false;
  if (id === 'mixed-round') return true;
  if (id === 'flashcards') return meta.quotations >= 5;
  return (meta.quizzes || []).includes(id);
}

export function activityHref(id, slug) {
  return '/play/' + id + '/?book=' + encodeURIComponent(slug);
}

// An activity's drawing, from scripts/revise-icons.js via the shelf.
export function activityIcon(icons, id, size = 20) {
  return drawing((icons || {})[id] || '', size, 'rx-icon');
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

// Two letters for a name, set in a roundel. Titles and articles are skipped so
// "The Ghost of Christmas Past" reads GC and "Lady Macbeth" reads LM.
const MONOGRAM_SKIP = new Set(['the', 'of', 'a', 'an', 'and', 'de', 'la', 'le', 'van', 'von']);
export function initials(name) {
  const words = String(name || '').replace(/[^\p{L}\s'’-]/gu, ' ').split(/\s+/)
    .filter(word => word && !MONOGRAM_SKIP.has(word.toLowerCase()));
  if (!words.length) return '?';
  const letters = words.length === 1 ? [words[0][0]] : [words[0][0], words[words.length - 1][0]];
  return letters.join('').toUpperCase();
}

const MONOGRAM_HUES = ['#6e1f2b', '#2f5d3f', '#294a6b', '#7a5a1e', '#5b3a6b', '#2d5f62', '#7c3a22', '#3e4a2a'];
export function monogram(name) {
  let hash = 0;
  for (const character of String(name)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return el('span', { class: 'rx-monogram', style: '--mono:' + MONOGRAM_HUES[hash % MONOGRAM_HUES.length], 'aria-hidden': 'true', text: initials(name) });
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
  const close = () => dialog.close();
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
  if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
  // On a phone the keyboard would cover the covers, so focus waits for a tap.
  if (window.matchMedia?.('(min-width: 720px)').matches) search.focus();
  return dialog;
}

export function changeBookButton({ books, current, onChoose, label = 'Change book', className = 'rx-change' }) {
  return el('button', {
    type: 'button', class: className,
    onclick: () => openShelf({ books, current, recentSlugs: recentlyViewed(20).map(entry => entry.slug), onChoose })
  }, [
    el('span', { class: 'rx-change-icon', 'aria-hidden': 'true', html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h6v13H4z"/><path d="M10 6.5h5v12h-5z"/><path d="m16 7.6 3.6-1 3 11.4-3.6 1z"/></svg>' }),
    el('span', { text: label })
  ]);
}

export function keepAddress(slug) {
  rememberBook(slug);
  const url = new URL(window.location.href);
  url.searchParams.set('book', slug);
  window.history.replaceState(null, '', url);
}

// The study bar at the top of every one-book Revise tool: the cover, the title
// and author, "Change book", and every activity this book supports, so moving
// from a quiz to the flashcards for the same book is one tap.
export function studyBar(head, { books, meta, icons, active, onChoose, allBooks }) {
  if (!head) return;
  clear(head);
  head.classList.add('rx-bar-mount');
  const cover = el('a', { class: 'rx-bar-cover', href: '/play/?book=' + encodeURIComponent(meta.slug), 'aria-label': 'Revision home for ' + meta.title }, [
    coverImage(meta, { width: 56, eager: true })
  ]);
  const identity = el('div', { class: 'rx-bar-id' }, [
    el('span', { class: 'rx-bar-kicker', text: 'Revising' }),
    el('a', { class: 'rx-bar-title', href: '/play/?book=' + encodeURIComponent(meta.slug), title: meta.title, text: shortTitle(meta) }),
    el('span', { class: 'rx-bar-author', text: meta.author })
  ]);
  const bar = el('div', { class: 'rx-bar' }, [cover, identity, el('div', { class: 'rx-bar-tools' }, [modeToggle(), changeBookButton({ books, current: meta, onChoose })])]);

  const acts = el('nav', { class: 'rx-acts', 'aria-label': 'Activities for ' + meta.title });
  const list = el('ul', {});
  for (const activity of ACTIVITIES) {
    if (!hasActivity(meta, activity.id)) continue;
    const here = activity.id === active;
    list.append(el('li', {}, [el('a', {
      class: 'rx-act' + (here ? ' is-here' : ''), href: activityHref(activity.id, meta.slug),
      'aria-current': here ? 'page' : null
    }, [activityIcon(icons, activity.id, 18), el('span', { text: activity.short })])]));
  }
  acts.append(list);
  // When the row is wider than the screen, arrows at either end say there is
  // more to see and scroll it; the row can still be swiped.
  const nudge = direction => acts.scrollBy({ left: direction * acts.clientWidth * 0.7, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  const back = el('button', { type: 'button', class: 'rx-acts-arrow is-back', 'aria-label': 'Earlier activities', tabindex: '-1', html: '&lsaquo;', onclick: () => nudge(-1) });
  const more = el('button', { type: 'button', class: 'rx-acts-arrow is-more', 'aria-label': 'More activities', tabindex: '-1', html: '&rsaquo;', onclick: () => nudge(1) });
  const row = el('div', { class: 'rx-acts-row' }, [back, acts, more]);
  const edges = () => {
    const overflow = acts.scrollWidth > acts.clientWidth + 2;
    row.classList.toggle('has-back', overflow && acts.scrollLeft > 4);
    row.classList.toggle('has-more', overflow && acts.scrollLeft + acts.clientWidth < acts.scrollWidth - 4);
  };
  acts.addEventListener('scroll', edges, { passive: true });
  if (head.rxEdges) window.removeEventListener('resize', head.rxEdges);
  head.rxEdges = edges;
  window.addEventListener('resize', edges);
  head.append(bar, row);
  if (meta.edition) coverBand(head.closest('main') || undefined);
  // Keep the current activity in view on a narrow screen, without moving the page.
  requestAnimationFrame(() => {
    const here = acts.querySelector('.is-here');
    if (here) acts.scrollLeft = Math.max(0, here.offsetLeft - (acts.clientWidth - here.offsetWidth) / 2);
    edges();
  });
}

// The site header stays at the top of the screen as the page scrolls, so
// anything the Revise pages scroll to is kept clear of it (scroll-margin-top
// in astor-study.css reads --rx-header).
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
  studyBar(head, { books, meta, onChoose, icons: options.icons, active: options.active });
}

// When the books cannot be fetched: say so, offer to try again, and give the
// reason in small print, so a reader who reports it can say what it was.
export function loadFailed(mount, message = 'The books didn’t load.', error = null) {
  clear(mount);
  mount.append(el('div', { class: 'rv-empty rx-load-failed' }, [
    el('p', { text: message + ' Check your connection, then try again.' }),
    el('button', { type: 'button', class: 'rx-button is-primary', text: 'Try again', onclick: () => window.location.reload() }),
    error ? el('p', { class: 'rx-load-reason', text: 'Reason: ' + (error.message || String(error)) }) : null
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
    studyBar(head, { books, meta, icons: shelf.icons, active, onChoose: open });
    clear(mount);
    mount.append(el('p', { class: 'rv-loading', text: 'Opening ' + meta.title + '…' }));
    let book;
    try { book = await loadBook(meta.slug); } catch {
      if (ticket !== generation) return;
      clear(mount);
      mount.append(el('p', { class: 'rv-empty', text: 'That book didn’t load. Try another, or reload the page.' }));
      return;
    }
    if (ticket !== generation) return;
    // A record must belong to the book that was asked for.
    if (book.slug !== meta.slug) return;
    render(book, meta, shelf);
  };
  await open(first);
}

export { clear, el, cardId };

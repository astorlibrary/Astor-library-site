// The quotation explorer: every checked quotation in the library, searchable
// by word or speaker and narrowed by book, character, theme, technique,
// period and form.
//
// Themes and techniques are shared identifiers across books, so choosing
// "ambition" or "dramatic irony" reaches every title that uses the term, which
// is what a comparative essay needs and no single book page can give.
//
// Each filter is one drop-down whose options count what is left under the
// other filters, so a choice never leads to an empty page. The first version
// listed all 557 options as checkboxes in five small scrolling boxes.

import { el, clear } from './util.mjs';
import { loadIndex, allQuotations } from './data.mjs';
import { toggleCommonplace, inCommonplace, isRemembering } from './store.mjs';

const filterForm = document.querySelector('#astor-quote-filters');
const results = document.querySelector('#astor-quote-results');
const countNode = document.querySelector('#astor-quote-count');

const KEYS = ['book', 'character', 'theme', 'technique', 'period', 'form'];
const LABELS = { book: 'Book', character: 'Character', theme: 'Theme', technique: 'Technique', period: 'Period', form: 'Form' };
const ANY = { book: 'Any book', character: 'Anyone', theme: 'Any theme', technique: 'Any technique', period: 'Any period', form: 'Any form' };

// Cards arrive a page at a time: two thousand at once is a very long scroll
// on a phone, and most of them are not what anybody came for.
const PAGE = 24;

const state = { query: '', book: '', character: '', theme: '', technique: '', period: '', form: '', shown: PAGE };
let quotations = [];
let books = new Map();
let themeNames = new Map();
let techniqueNames = new Map();
let periodOrder = new Map();
const selects = {};
let searchInput = null;

if (filterForm && results) start();

// The explorer's own slice of the study index is a fifth of the size of the
// whole thing. If it is missing (a page from an older deploy), the full
// index still works.
async function loadQuotationIndex() {
  try {
    const response = await fetch('/assets/quotation-index.json', { credentials: 'omit' });
    if (response.ok) return await response.json();
  } catch { /* fall through */ }
  return loadIndex();
}

async function start() {
  let index;
  try {
    index = await loadQuotationIndex();
  } catch {
    countNode.textContent = '';
    results.append(el('p', { class: 'astor-empty', text: 'The quotations did not load. Reload the page to try again.' }));
    return;
  }

  quotations = allQuotations(index);
  for (const book of index.books) {
    books.set(book.slug, book);
    for (const theme of book.themes) themeNames.set(theme.id, theme.canonicalName || theme.name);
    for (const technique of book.techniques) techniqueNames.set(technique.id, technique.canonicalName || technique.name);
    // Periods sort by the earliest book in them, not alphabetically.
    const year = Number(book.firstPublished);
    if (Number.isFinite(year)) periodOrder.set(book.period, Math.min(periodOrder.get(book.period) ?? Infinity, year));
  }
  for (const quotation of quotations) {
    const characters = new Map((books.get(quotation.bookSlug)?.characters || []).map(character => [character.id, character.name]));
    quotation.characterNames = (quotation.characters || []).map(id => characters.get(id)).filter(Boolean);
    quotation.haystack = [quotation.text, quotation.speaker, quotation.bookTitle, quotation.author,
      quotation.context, quotation.analysis, ...quotation.characterNames].join(' ').toLowerCase();
  }

  // A link from a book page, a theme page or the search palette can arrive
  // with a filter already chosen. Older links could name several values for
  // one filter; the first is kept.
  const params = new URLSearchParams(window.location.search);
  for (const key of KEYS) state[key] = params.get(key) || '';
  state.query = params.get('q') || '';
  if (!state.book) state.character = '';

  buildControls();
  update();
}

function nameOf(key, value) {
  if (key === 'book') return books.get(value)?.title || value;
  if (key === 'theme') return themeNames.get(value) || value;
  if (key === 'technique') return techniqueNames.get(value) || value;
  if (key === 'character') {
    const character = (books.get(state.book)?.characters || []).find(entry => entry.id === value);
    return character?.name || value;
  }
  if (key === 'form') return value.replace(/^./, first => first.toUpperCase());
  return value;
}

function valuesOf(key, quotation) {
  if (key === 'book') return [quotation.bookSlug];
  if (key === 'theme') return quotation.themes || [];
  if (key === 'technique') return quotation.techniques || [];
  if (key === 'character') return quotation.characters || [];
  return [quotation[key]];
}

function passes(quotation, skip) {
  for (const key of KEYS) {
    if (key === skip || !state[key]) continue;
    if (!valuesOf(key, quotation).includes(state[key])) return false;
  }
  const query = state.query.trim().toLowerCase();
  if (query && !query.split(/\s+/).every(word => quotation.haystack.includes(word))) return false;
  return true;
}

function buildControls() {
  clear(filterForm);
  filterForm.classList.add('astor-qx-controls');
  filterForm.addEventListener('submit', event => event.preventDefault());

  searchInput = el('input', {
    type: 'search', id: 'astor-quote-search', placeholder: 'A word, a phrase or a name',
    value: state.query, autocomplete: 'off', spellcheck: 'false'
  });
  let timer = 0;
  searchInput.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { state.query = searchInput.value; changed(); }, 140);
  });
  filterForm.append(el('div', { class: 'astor-qx-search' }, [
    el('label', { for: 'astor-quote-search', text: 'Search the quotations' }),
    searchInput
  ]));

  const row = el('div', { class: 'astor-qx-selects' });
  for (const key of KEYS) {
    const select = el('select', { id: 'astor-qx-' + key });
    select.addEventListener('change', () => {
      state[key] = select.value;
      if (key === 'book') state.character = '';
      changed();
    });
    selects[key] = select;
    row.append(el('div', { class: 'astor-qx-field', 'data-key': key }, [
      el('label', { for: select.id, text: LABELS[key] }),
      select
    ]));
  }
  filterForm.append(row);
}

// Each drop-down lists only what is still there under the other filters,
// with a count, so every choice leads somewhere.
function fillSelects() {
  for (const key of KEYS) {
    const select = selects[key];
    const field = select.parentElement;
    if (key === 'character') {
      const hasCharacters = state.book && (books.get(state.book)?.characters || []).length;
      field.hidden = !hasCharacters;
      if (!hasCharacters) { clear(select); continue; }
    }
    const counts = new Map();
    for (const quotation of quotations) {
      if (!passes(quotation, key)) continue;
      for (const value of valuesOf(key, quotation)) if (value) counts.set(value, (counts.get(value) || 0) + 1);
    }
    if (state[key] && !counts.has(state[key])) counts.set(state[key], 0);
    const entries = [...counts.entries()];
    if (key === 'book' || key === 'character') entries.sort((a, b) => nameOf(key, a[0]).localeCompare(nameOf(key, b[0])));
    else if (key === 'period') entries.sort((a, b) => (periodOrder.get(a[0]) ?? 9999) - (periodOrder.get(b[0]) ?? 9999));
    else entries.sort((a, b) => b[1] - a[1] || nameOf(key, a[0]).localeCompare(nameOf(key, b[0])));

    clear(select);
    select.append(el('option', { value: '', text: ANY[key] }));
    for (const [value, count] of entries) {
      select.append(el('option', { value, text: nameOf(key, value) + ' (' + count + ')' }));
    }
    select.value = state[key];
    field.classList.toggle('is-set', Boolean(state[key]));
  }
}

function changed() {
  state.shown = PAGE;
  syncAddress();
  update();
}

function update() {
  fillSelects();
  render();
}

function syncAddress() {
  const url = new URL(window.location.href);
  url.search = '';
  for (const key of KEYS) if (state[key]) url.searchParams.set(key, state[key]);
  if (state.query.trim()) url.searchParams.set('q', state.query.trim());
  window.history.replaceState(null, '', url);
}

function clearAll() {
  for (const key of KEYS) state[key] = '';
  state.query = '';
  if (searchInput) searchInput.value = '';
  changed();
}

function render() {
  const shown = quotations.filter(quotation => passes(quotation));
  const titles = new Set(shown.map(quotation => quotation.bookSlug));
  clear(countNode);
  countNode.append(shown.length
    ? shown.length + (shown.length === 1 ? ' quotation' : ' quotations') + ' from ' + titles.size + (titles.size === 1 ? ' book' : ' books')
    : 'No quotations match');

  clear(results);
  const chips = activeChips();
  if (chips) results.append(chips);

  if (!shown.length) {
    results.append(el('p', { class: 'astor-empty', text: 'Remove a filter, or search for a single word.' }));
    return;
  }

  const list = el('div', { class: 'astor-qx-list' });
  for (const quotation of shown.slice(0, state.shown)) list.append(card(quotation));
  results.append(list);

  if (shown.length > state.shown) {
    const remaining = shown.length - state.shown;
    results.append(el('p', { class: 'astor-more' }, [
      el('button', {
        class: 'button secondary', type: 'button',
        text: 'Show ' + Math.min(PAGE, remaining) + ' more (' + remaining + ' left)',
        onclick: () => {
          const before = state.shown;
          state.shown += PAGE;
          render();
          results.querySelectorAll('.astor-qx-card')[before]?.querySelector('a')?.focus();
        }
      })
    ]));
  }
}

// The filters in force, each removable, and one button to clear the lot.
function activeChips() {
  const chips = [];
  for (const key of KEYS) {
    if (!state[key]) continue;
    chips.push(el('button', {
      class: 'astor-chip', type: 'button', 'aria-label': 'Remove the filter ' + nameOf(key, state[key]),
      text: nameOf(key, state[key]) + ' ×',
      onclick: () => {
        state[key] = '';
        if (key === 'book') state.character = '';
        changed();
      }
    }));
  }
  if (state.query.trim()) {
    chips.push(el('button', {
      class: 'astor-chip', type: 'button', 'aria-label': 'Clear the search',
      text: '“' + state.query.trim() + '” ×',
      onclick: () => { state.query = ''; searchInput.value = ''; changed(); }
    }));
  }
  if (!chips.length) return null;
  if (chips.length > 1) chips.push(el('button', { class: 'astor-qx-clear', type: 'button', text: 'Clear all', onclick: clearAll }));
  return el('div', { class: 'astor-chip-row' }, chips);
}

// A theme or technique under a quotation is a way into every other quotation
// that carries it, so each one sets that filter.
function tagButton(key, id) {
  const label = key === 'theme' ? themeNames.get(id) : techniqueNames.get(id);
  if (!label) return null;
  return el('button', {
    class: 'astor-qx-tag', type: 'button', text: label,
    'aria-pressed': String(state[key] === id),
    title: 'Show every quotation tagged ' + label,
    onclick: () => {
      state[key] = state[key] === id ? '' : id;
      changed();
      countNode.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  });
}

function card(quotation) {
  const source = [
    quotation.speaker || '',
    quotation.bookTitle + (quotation.reference ? ', ' + quotation.reference : ''),
    quotation.author
  ].filter(Boolean).join(' · ');

  const themes = (quotation.themes || []).map(id => tagButton('theme', id)).filter(Boolean);
  const techniques = (quotation.techniques || []).map(id => tagButton('technique', id)).filter(Boolean);

  const links = el('p', { class: 'astor-qx-links' }, [
    el('a', { href: quotation.bookHref + '#astor-quote-' + quotation.id, text: 'Read it in the study guide' })
  ]);
  if (isRemembering()) {
    const id = quotation.bookSlug + ':' + quotation.id;
    const save = el('button', { class: 'astor-qx-keep', type: 'button' });
    const paint = () => {
      const saved = inCommonplace(id);
      save.setAttribute('aria-pressed', String(saved));
      save.textContent = saved ? 'Kept in your commonplace book' : 'Keep';
    };
    save.addEventListener('click', () => {
      toggleCommonplace({
        id, text: quotation.text,
        reference: quotation.bookTitle + ' ' + quotation.reference,
        book: quotation.bookTitle, bookHref: quotation.bookHref
      });
      paint();
    });
    paint();
    links.append(save);
  }

  return el('article', { class: 'astor-qx-card' }, [
    el('blockquote', {}, [el('p', { text: quotation.text })]),
    el('p', { class: 'astor-qx-source', text: source }),
    quotation.context ? el('p', { class: 'astor-qx-context', text: quotation.context }) : null,
    quotation.analysis ? el('p', { class: 'astor-qx-analysis', text: quotation.analysis }) : null,
    themes.length || techniques.length ? el('div', { class: 'astor-qx-tags' }, [
      themes.length ? el('p', {}, [el('span', { text: 'Themes' }), ...themes]) : null,
      techniques.length ? el('p', {}, [el('span', { text: 'Techniques' }), ...techniques]) : null
    ]) : null,
    links
  ]);
}

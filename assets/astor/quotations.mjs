// The quotation explorer: every checked quotation in the library, filterable
// by book, period, form, theme, technique and character, and searchable by
// text or speaker.
//
// Themes and techniques are shared identifiers across books, so filtering by
// "ambition" or "dramatic irony" reaches every title that uses the term — which
// is the thing a comparative essay actually needs and no single book page can
// provide.

import { el, clear, escapeHtml } from './util.mjs';
import { loadIndex, allQuotations } from './data.mjs';
import { toggleCommonplace, inCommonplace, isRemembering } from './store.mjs';

const filterForm = document.querySelector('#astor-quote-filters');
const results = document.querySelector('#astor-quote-results');
const countNode = document.querySelector('#astor-quote-count');

if (filterForm && results) start();

const state = { query: '', book: new Set(), period: new Set(), theme: new Set(), technique: new Set(), form: new Set() };

async function start() {
  let index;
  try {
    index = await loadIndex();
  } catch {
    countNode.textContent = '';
    results.append(el('p', { class: 'astor-empty', text: 'The quotations could not be loaded. Every one of them is printed, with its analysis, on the book page it belongs to.' }));
    return;
  }

  const quotations = allQuotations(index);
  // The explorer works across the library, so a shared identifier is labelled
  // with its canonical name rather than whichever book happened to be read
  // last. Each book keeps its own wording on its own page.
  const themeNames = new Map();
  const techniqueNames = new Map();
  for (const book of index.books) {
    for (const theme of book.themes) themeNames.set(theme.id, theme.canonicalName || theme.name);
    for (const technique of book.techniques) techniqueNames.set(technique.id, technique.canonicalName || technique.name);
  }

  // A link from a book page or the search palette can pre-select a filter.
  const params = new URLSearchParams(window.location.search);
  for (const key of ['theme', 'technique', 'book', 'period', 'form']) {
    for (const value of params.getAll(key)) state[key].add(value);
  }
  state.query = params.get('q') || '';

  buildFilters(index, quotations, themeNames, techniqueNames);
  render(quotations, themeNames, techniqueNames);
}

function tally(quotations, key, getter) {
  const counts = new Map();
  for (const quotation of quotations) {
    for (const value of [].concat(getter(quotation))) {
      if (!value) continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return counts;
}

function buildFilters(index, quotations, themeNames, techniqueNames) {
  clear(filterForm);
  filterForm.append(el('h2', { text: 'Narrow it down' }));

  const search = el('input', {
    type: 'search', id: 'astor-quote-search', placeholder: 'A word, a name, a phrase',
    value: state.query, autocomplete: 'off'
  });
  search.addEventListener('input', () => {
    state.query = search.value;
    syncAddress();
    render(quotations, themeNames, techniqueNames);
  });
  filterForm.append(el('fieldset', {}, [
    el('legend', { text: 'Search' }),
    search
  ]));

  const groups = [
    ['theme', 'Theme', tally(quotations, 'theme', q => q.themes), id => themeNames.get(id) || id],
    ['technique', 'Technique', tally(quotations, 'technique', q => q.techniques), id => techniqueNames.get(id) || id],
    ['book', 'Book', tally(quotations, 'book', q => q.bookSlug), slug => index.books.find(book => book.slug === slug)?.title || slug],
    ['period', 'Period', tally(quotations, 'period', q => q.period), value => value],
    ['form', 'Form', tally(quotations, 'form', q => q.form), value => value.replace(/^./, character => character.toUpperCase())]
  ];

  for (const [key, label, counts, nameOf] of groups) {
    if (counts.size < 2) continue;
    const list = el('div', { class: 'astor-filter-list' });
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1] || nameOf(a[0]).localeCompare(nameOf(b[0])));
    for (const [value, total] of entries) {
      const input = el('input', { type: 'checkbox', value, checked: state[key].has(value) });
      input.addEventListener('change', () => {
        if (input.checked) state[key].add(value); else state[key].delete(value);
        syncAddress();
        render(quotations, themeNames, techniqueNames);
      });
      list.append(el('label', { class: 'astor-check' }, [input, el('span', { text: nameOf(value) + ' (' + total + ')' })]));
    }
    filterForm.append(el('fieldset', {}, [el('legend', { text: label }), list]));
  }

  filterForm.append(el('button', {
    class: 'button secondary', type: 'button', text: 'Clear every filter',
    onclick: () => {
      state.query = '';
      for (const key of ['book', 'period', 'theme', 'technique', 'form']) state[key].clear();
      syncAddress();
      buildFilters(index, quotations, themeNames, techniqueNames);
      render(quotations, themeNames, techniqueNames);
    }
  }));
}

function syncAddress() {
  const url = new URL(window.location.href);
  url.search = '';
  for (const key of ['theme', 'technique', 'book', 'period', 'form']) {
    for (const value of state[key]) url.searchParams.append(key, value);
  }
  if (state.query.trim()) url.searchParams.set('q', state.query.trim());
  window.history.replaceState(null, '', url);
}

function matches(quotation) {
  if (state.book.size && !state.book.has(quotation.bookSlug)) return false;
  if (state.period.size && !state.period.has(quotation.period)) return false;
  if (state.form.size && !state.form.has(quotation.form)) return false;
  if (state.theme.size && !(quotation.themes || []).some(id => state.theme.has(id))) return false;
  if (state.technique.size && !(quotation.techniques || []).some(id => state.technique.has(id))) return false;
  if (state.query.trim()) {
    const words = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = (quotation.text + ' ' + quotation.speaker + ' ' + quotation.bookTitle + ' ' + quotation.author + ' ' + quotation.analysis).toLowerCase();
    if (!words.every(word => haystack.includes(word))) return false;
  }
  return true;
}

function render(quotations, themeNames, techniqueNames) {
  const shown = quotations.filter(matches);
  const books = new Set(shown.map(quotation => quotation.bookSlug));
  countNode.textContent = shown.length
    ? shown.length + (shown.length === 1 ? ' quotation' : ' quotations') +
      ' from ' + books.size + (books.size === 1 ? ' title' : ' titles')
    : 'Nothing matches those filters';

  clear(results);
  if (!shown.length) {
    results.append(el('p', { class: 'astor-empty', text: 'Try removing a filter, or searching for a single word rather than a phrase.' }));
    return;
  }

  // A long list is cheaper to build in one pass than card by card.
  const fragment = document.createDocumentFragment();
  for (const quotation of shown.slice(0, 300)) {
    fragment.append(card(quotation, themeNames, techniqueNames));
  }
  results.append(fragment);

  if (shown.length > 300) {
    results.append(el('p', { class: 'astor-inline-note', text: 'Showing the first 300. Narrow the filters to see the rest.' }));
  }
}

function card(quotation, themeNames, techniqueNames) {
  const tags = [
    ...(quotation.themes || []).map(id => themeNames.get(id)),
    ...(quotation.techniques || []).map(id => techniqueNames.get(id))
  ].filter(Boolean);

  const foot = el('div', { class: 'astor-quote-foot' });
  for (const tag of tags) foot.append(el('span', { class: 'astor-tag', text: tag }));
  foot.append(el('a', { class: 'astor-save-quote', href: quotation.bookHref + '#astor-quote-' + quotation.id, text: 'On the book page' }));

  if (isRemembering()) {
    const id = quotation.bookSlug + ':' + quotation.id;
    const save = el('button', { class: 'astor-save-quote', type: 'button' });
    const paint = () => {
      const saved = inCommonplace(id);
      save.setAttribute('aria-pressed', String(saved));
      save.textContent = saved ? 'Kept' : 'Keep';
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
    foot.append(save);
  }

  return el('article', { class: 'astor-quote-card' }, [
    el('blockquote', {}, [el('p', { text: quotation.text })]),
    el('p', {
      class: 'astor-quote-attribution',
      text: (quotation.speaker ? quotation.speaker + ' · ' : '') + quotation.bookTitle + ' ' + quotation.reference + ' · ' + quotation.author
    }),
    quotation.context ? el('p', { class: 'astor-context', text: quotation.context }) : null,
    el('p', { class: 'astor-analysis', text: quotation.analysis }),
    foot
  ]);
}

export { escapeHtml };

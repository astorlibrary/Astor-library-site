// The site-wide search palette.
//
// Press / or Ctrl-K (Cmd-K) anywhere on the site and a box opens over the
// page. It searches books, writers, subjects, collections, guides, study
// editions, close readings, seasons, characters, themes, techniques,
// quotations and the study tools — so "Fleance", "equivocation" and "who said
// it" all reach a page without a round trip.
//
// The index is fetched the first time the palette opens, never on page load.

import './offline.mjs';
import { el, clear } from './util.mjs';

const MAX_RESULTS = 12;
let entries = null;
let palette = null;
let input = null;
let list = null;
let selected = 0;
let lastFocus = null;

document.addEventListener('keydown', event => {
  const openCombo = (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
  const openSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
  if (!openCombo && !openSlash) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
  event.preventDefault();
  open();
});

// The header's existing Search link keeps working as a link; a modified click
// or a plain click both stay useful, so only the palette shortcut is new.
for (const trigger of document.querySelectorAll('[data-astor-palette]')) {
  trigger.addEventListener('click', event => {
    event.preventDefault();
    open();
  });
}

function build() {
  list = el('ul', { class: 'astor-palette-results', id: 'astor-palette-results', role: 'listbox', 'aria-label': 'Search results' });
  input = el('input', {
    type: 'search', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'Search books, characters, themes, quotations…',
    'aria-label': 'Search Astor Library',
    role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'astor-palette-results', 'aria-autocomplete': 'list'
  });
  const box = el('div', { class: 'astor-palette-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search Astor Library' }, [
    input,
    list,
    el('p', { class: 'astor-palette-hint', text: 'Arrow keys to move, Enter to open, Esc to close.' })
  ]);
  palette = el('div', { class: 'astor-palette', hidden: true }, [box]);
  palette.addEventListener('click', event => { if (event.target === palette) close(); });
  input.addEventListener('input', () => { selected = 0; render(); });
  input.addEventListener('keydown', onKey);
  document.body.append(palette);
}

async function open() {
  if (!palette) build();
  lastFocus = document.activeElement;
  palette.hidden = false;
  input.value = '';
  selected = 0;
  input.focus();
  render();
  if (entries) return;
  try {
    const response = await fetch('/assets/search-index.json', { credentials: 'omit' });
    entries = (await response.json()).entries;
  } catch {
    entries = [];
  }
  render();
}

function close() {
  if (!palette) return;
  palette.hidden = true;
  lastFocus?.focus?.();
}

function onKey(event) {
  if (event.key === 'Escape') { event.preventDefault(); return close(); }
  const rows = [...list.children];
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!rows.length) return;
    selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
    paintSelection(rows);
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    rows[selected]?.querySelector('a')?.click();
  }
}

function paintSelection(rows) {
  rows.forEach((row, index) => {
    row.setAttribute('aria-selected', String(index === selected));
    if (index === selected) row.scrollIntoView({ block: 'nearest' });
  });
}

function score(entry, words) {
  let total = 0;
  for (const word of words) {
    const at = entry.s.indexOf(word);
    if (at < 0) return -1;
    // A match at the start of the entry is worth more than one buried in it.
    total += at === 0 ? 3 : at < 24 ? 2 : 1;
  }
  // Destinations a reader is more likely to want come first on an equal score.
  const weight = { Book: 6, Tool: 5, Writer: 4, 'Study edition': 4, Subject: 3, Collection: 3, 'Free guide': 3, 'Close reading': 2, Character: 2, Theme: 2, Technique: 2, Seasonal: 2, Quotation: 1 }[entry.k] || 1;
  return total * 10 + weight;
}

function render() {
  clear(list);
  const query = input.value.trim().toLowerCase();

  if (!entries) {
    list.append(el('li', {}, [el('p', { class: 'astor-palette-hint', text: 'Loading…' })]));
    return;
  }

  if (!query) {
    for (const suggestion of entries.filter(entry => entry.k === 'Tool').slice(0, 8)) {
      list.append(row(suggestion));
    }
    paintSelection([...list.children]);
    return;
  }

  const words = query.split(/\s+/).filter(Boolean);
  const ranked = entries
    .map(entry => ({ entry, rank: score(entry, words) }))
    .filter(item => item.rank >= 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, MAX_RESULTS);

  if (!ranked.length) {
    list.append(el('li', {}, [el('p', { class: 'astor-palette-hint', text: 'No matches. Try a single word.' })]));
    list.append(row({ k: 'Search', t: 'Search the catalogue for “' + input.value.trim() + '”', h: '/explore/?q=' + encodeURIComponent(input.value.trim()), n: '' }));
    paintSelection([...list.children]);
    return;
  }

  for (const item of ranked) list.append(row(item.entry));
  paintSelection([...list.children]);
}

function row(entry) {
  return el('li', { role: 'option', 'aria-selected': 'false' }, [
    el('a', { href: entry.h }, [
      el('span', { class: 'astor-palette-kind', text: entry.k }),
      el('span', { class: 'astor-palette-title' }, [
        el('span', { text: entry.t }),
        entry.n ? el('small', { text: entry.n }) : null
      ])
    ])
  ]);
}

// The site-wide search palette.
//
// Press / or Ctrl-K (Cmd-K) anywhere on the site and a box opens over the
// page. It searches books, study guides, key quotations, the quizzes, close
// readings, slide guides, Study Editions, writers, characters, themes and the
// rest, so "Out, damned spot", "Macbeth quotes" and "Fleance" all reach a
// page without a round trip. Each result says what it is, and whether it is
// free on the web, needs a free account or is a printed book.
//
// The ranking lives in search.mjs, which the Search page at /explore/ uses
// too. The index is fetched the first time the palette opens, never on page
// load.

import './offline.mjs';
import { el, clear } from './util.mjs';
import { shortlist, kindInfo, loadSearchIndex } from './search.mjs';

const MAX_RESULTS = 12;
let entries = null;
let palette = null;
let input = null;
let list = null;
let selected = 0;
let lastFocus = null;
let loadFailed = false;
let allLink = null;

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
// opens the catalogue in a new tab as usual.
for (const trigger of document.querySelectorAll('[data-astor-palette]')) {
  trigger.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open();
  });
}

function build() {
  list = el('ul', { class: 'astor-palette-results', id: 'astor-palette-results', role: 'listbox', 'aria-label': 'Search results' });
  input = el('input', {
    type: 'search', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'A book, a line, a character, a theme…',
    'aria-label': 'Search Astor Library',
    role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'astor-palette-results', 'aria-autocomplete': 'list'
  });
  allLink = el('a', { class: 'astor-palette-all', href: '/explore/', hidden: true });
  const box = el('div', { class: 'astor-palette-box' }, [
    el('div', { class: 'astor-palette-heading' }, [el('strong', { text: 'Search Astor Library' }), el('button', { type: 'button', class: 'astor-palette-close', text: 'Close', onclick: close })]),
    input,
    list,
    el('p', { class: 'astor-palette-hint' }, [allLink, el('span', { text: 'Arrow keys to move, Enter to open, Esc to close.' })])
  ]);
  palette = el('dialog', { class: 'astor-palette', 'aria-label': 'Search Astor Library' }, [box]);
  palette.addEventListener('click', event => { if (event.target === palette) close(); });
  input.addEventListener('input', () => { selected = 0; render(); });
  input.addEventListener('keydown', onKey);
  document.body.append(palette);
}

async function open() {
  if (!palette) build();
  lastFocus = document.activeElement;
  if (!palette.open) palette.showModal();
  input.value = '';
  selected = 0;
  input.focus();
  render();
  if (entries) return;
  loadFailed = false;
  render();
  try {
    entries = await loadSearchIndex();
    loadFailed = false;
  } catch {
    loadFailed = true;
  }
  render();
}

function close() {
  if (!palette) return;
  palette.close();
  lastFocus?.focus?.();
}

function onKey(event) {
  if (event.key === 'Escape') { event.preventDefault(); return close(); }
  const rows = [...list.querySelectorAll('[role=option]')];
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
    if (index === selected) {
      input.setAttribute('aria-activedescendant', row.id);
      row.scrollIntoView({ block: 'nearest' });
    }
  });
}

function render() {
  clear(list);
  input.removeAttribute('aria-activedescendant');
  const typed = input.value.trim();
  if (allLink) allLink.hidden = true;

  if (loadFailed) {
    list.append(el('li', {}, [el('p', { class: 'astor-palette-hint', text: 'Search could not load. You can still search the catalogue below, or close and retry.' })]));
    list.append(row({ k: 'Search', t: 'Search the catalogue', h: '/explore/?q=' + encodeURIComponent(typed) }));
    paintSelection([...list.querySelectorAll('[role=option]')]);
    return;
  }

  if (!entries) {
    list.append(el('li', {}, [el('p', { class: 'astor-palette-hint', text: 'Loading…' })]));
    return;
  }

  if (!typed) {
    for (const suggestion of entries.filter(entry => entry.k === 'Tool').slice(0, 6)) {
      list.append(row(suggestion));
    }
    paintSelection([...list.querySelectorAll('[role=option]')]);
    return;
  }

  const found = shortlist(entries, typed, MAX_RESULTS);

  if (!found.length) {
    list.append(el('li', {}, [el('p', { class: 'astor-palette-hint', text: 'No matches. Try one word from a title or a line.' })]));
    list.append(row({ k: 'Search', t: 'Search the catalogue for “' + typed + '”', h: '/explore/?q=' + encodeURIComponent(typed), n: '' }));
    paintSelection([...list.querySelectorAll('[role=option]')]);
    return;
  }

  // A misspelling put right: say what was searched for instead.
  if (found.note) list.append(el('li', {}, [el('p', { class: 'astor-palette-hint is-note', text: 'Showing results for “' + found.note + '”.' })]));
  for (const entry of found) list.append(row(entry));
  if (allLink) {
    allLink.hidden = false;
    allLink.textContent = 'All results for “' + typed + '”';
    allLink.setAttribute('href', '/explore/?q=' + encodeURIComponent(typed));
  }
  paintSelection([...list.querySelectorAll('[role=option]')]);
}

// One result: what kind of thing it is, its name, the book or writer it
// belongs to, and what it takes to open it.
function row(entry) {
  const info = kindInfo(entry.k);
  return el('li', { role: 'option', id: 'astor-result-' + list.querySelectorAll('[role=option]').length, 'aria-selected': 'false' }, [
    el('a', { href: entry.h }, [
      el('span', { class: 'astor-palette-kind', text: info.label }),
      el('span', { class: 'astor-palette-title' }, [
        el('span', { text: entry.t }),
        entry.n ? el('small', { text: entry.n }) : null
      ]),
      info.access ? el('span', { class: 'astor-palette-access', text: info.access }) : null
    ])
  ]);
}

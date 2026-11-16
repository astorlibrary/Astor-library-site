// The Search page at /explore/.
//
// The same index and the same ranking as the palette that opens over every
// page (search.mjs), with room to show everything that matches: results are
// set under headings that say what each kind of thing is and what it takes
// to open it. A search can be linked to: /explore/?q=out+damned+spot.

import { el, clear } from './util.mjs';
import { grouped, kindInfo, loadSearchIndex } from './search.mjs';

const input = document.querySelector('#explore-search');
const mount = document.querySelector('#explore-results');
const status = document.querySelector('#explore-count');
const start = document.querySelector('#explore-start');
const form = input?.closest('form');

// What a reader should know about a whole group before opening anything in it.
const GROUP_NOTE = {
  'Books': 'Astor editions in print, each with its own page',
  'Study guides': 'Free to read on the web, no account',
  'Revise': 'Free quizzes and flashcards',
  'Quotations': 'Key lines with their references and analysis',
  'Close readings': 'Famous passages with notes on the words, free on the web',
  'Slide guides': 'The first three slides are open; a free account opens the rest',
  'Study Editions': 'Printed books: the text with study material',
  'Characters': 'In the study guides',
  'Themes': 'In the study guides',
  'Literary terms': 'Each defined, with a line that uses it'
};
const FIRST = { Quotations: 8 };
const DEFAULT_FIRST = 6;

let entries = null;
let failed = false;
let timer = 0;
const opened = new Set();

if (input && mount) begin();

function begin() {
  const initial = new URLSearchParams(window.location.search).get('q') || '';
  if (initial) input.value = initial;
  form?.addEventListener('submit', event => { event.preventDefault(); run(); input.blur(); });
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 70);
  });
  // Fetch the index as soon as somebody shows they mean to search.
  input.addEventListener('focus', load, { once: true });
  if (initial) run();
}

async function load() {
  if (entries || failed) return entries;
  try {
    entries = await loadSearchIndex();
  } catch {
    failed = true;
  }
  return entries;
}

async function run() {
  const typed = input.value.trim();
  const url = new URL(window.location.href);
  if (typed) url.searchParams.set('q', typed); else url.searchParams.delete('q');
  window.history.replaceState(null, '', url);
  opened.clear();

  if (!typed) {
    clear(mount);
    mount.hidden = true;
    if (start) start.hidden = false;
    status.textContent = '';
    return;
  }
  if (!entries && !failed) status.textContent = 'Searching…';
  await load();
  if (input.value.trim() !== typed) return;
  if (failed) {
    status.textContent = 'Search didn’t load. Check your connection and try again, or use the lists below.';
    return;
  }
  render(typed);
}

function render(typed) {
  const found = grouped(entries, typed);
  clear(mount);
  mount.hidden = false;
  if (start) start.hidden = true;
  if (!found.total) {
    status.textContent = 'Nothing matches “' + typed + '”.';
    mount.append(el('p', { class: 'search-none', text: 'Try one word from the title or the line, or a writer’s surname. The lists at the foot of this page have every book, guide and close reading by name.' }));
    return;
  }
  status.textContent = found.total + (found.total === 1 ? ' result' : ' results') + ' for “' + typed + '”';
  for (const group of found.groups) mount.append(drawGroup(group, typed));
}

function drawGroup(group, typed) {
  const first = FIRST[group.name] || DEFAULT_FIRST;
  const open = opened.has(group.name);
  const shown = open ? group.entries : group.entries.slice(0, first);
  const section = el('section', { class: 'search-group' }, [
    el('h2', {}, [
      el('span', { text: group.name }),
      GROUP_NOTE[group.name] ? el('small', { text: GROUP_NOTE[group.name] }) : null
    ]),
    el('ol', { class: 'search-list' + (shown.some(entry => entry.i) ? ' has-covers' : '') }, shown.map(entry => drawRow(entry, group.name)))
  ]);
  if (group.entries.length > shown.length) {
    const more = el('button', { type: 'button', class: 'search-more', text: 'Show all ' + group.entries.length + ' ' + group.name.toLowerCase() });
    more.addEventListener('click', () => { opened.add(group.name); section.replaceWith(drawGroup(group, typed)); });
    section.append(more);
  }
  return section;
}

function drawRow(entry, groupName) {
  const info = kindInfo(entry.k);
  // Inside a group every row is the same kind of thing, so the label is only
  // worth printing where the group mixes kinds.
  const mixed = groupName === 'Subjects and collections' || groupName === 'On the site';
  return el('li', {}, [
    el('a', { href: entry.h, class: entry.i ? 'has-cover' : '' }, [
      entry.i ? el('img', { src: entry.i, alt: '', width: '48', height: '72', loading: 'lazy', decoding: 'async' }) : null,
      el('span', { class: 'search-row-text' }, [
        mixed ? el('span', { class: 'search-row-kind', text: info.label }) : null,
        el('span', { class: 'search-row-title', text: entry.t }),
        entry.n ? el('span', { class: 'search-row-note', text: entry.n }) : null
      ])
    ])
  ]);
}

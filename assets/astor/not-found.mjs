// The page shown for an address that is not on the site. The words in the
// address go into the search box, and the pages that best match them are
// listed underneath, so an old link to "/macbeth-quotes" still leads
// somewhere useful. Nothing here runs without the search index.

import { shortlist, kindInfo, loadSearchIndex } from './search.mjs';

const ASIDE = new Set(['html', 'htm', 'php', 'index', 'www', 'amp', 'page', 'pages']);

function wordsFromAddress(pathname) {
  let text = pathname;
  try { text = decodeURIComponent(pathname); } catch { /* keep it as it came */ }
  return text.split(/[/\-_.+\s]+/).map(word => word.toLowerCase())
    .filter(word => word && !ASIDE.has(word) && !/^\d+$/.test(word)).join(' ').trim();
}

function row(entry) {
  const info = kindInfo(entry.k);
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = entry.h;
  const text = document.createElement('span');
  text.className = 'search-row-text';
  const kind = document.createElement('span');
  kind.className = 'search-row-kind';
  kind.textContent = info.label;
  const title = document.createElement('span');
  title.className = 'search-row-title';
  title.textContent = entry.t;
  text.append(kind, title);
  if (entry.n) {
    const note = document.createElement('span');
    note.className = 'search-row-note';
    note.textContent = entry.n;
    text.append(note);
  }
  link.append(text);
  item.append(link);
  return item;
}

async function start() {
  const input = document.getElementById('not-found-search');
  const box = document.querySelector('[data-not-found]');
  if (!input || !box) return;
  const words = wordsFromAddress(window.location.pathname);
  if (!words) return;
  if (!input.value) input.value = words;
  let entries;
  try { entries = await loadSearchIndex(); } catch { return; }
  const found = shortlist(entries, words, 6, 2);
  if (!found.length) return;
  const list = box.querySelector('ul');
  list.replaceChildren(...found.map(row));
  box.hidden = false;
}

start();

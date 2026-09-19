// The book chooser that sits at the top of every tool taking a single title.
//
// It reads ?book= from the address, falls back to the last title the reader
// used, and keeps the address in step so a chosen book can be linked or
// bookmarked. Shared here so that the games, the flashcards, the character
// maps, the essay forge and the teachers' page all behave identically.

import { el, clear } from './util.mjs';
import { loadIndex } from './data.mjs';

const REMEMBERED = 'astor-last-book';

export function rememberedBook() {
  try { return window.localStorage.getItem(REMEMBERED) || ''; } catch { return ''; }
}

function remember(slug) {
  try { window.localStorage.setItem(REMEMBERED, slug); } catch { /* storage is optional */ }
}

export function requestedBook() {
  return new URLSearchParams(window.location.search).get('book') || '';
}

export function chooseBook(books, preferred) {
  const wanted = preferred || requestedBook() || rememberedBook();
  return books.find(book => book.slug === wanted) || books[0] || null;
}

export function mountChooser(container, {
  books, current, label = 'Choose a book', onChange, extra = []
}) {
  if (!container) return;
  clear(container);

  const select = el('select', { id: container.id + '-select', 'aria-label': label });
  for (const book of books) {
    select.append(el('option', { value: book.slug, text: book.title + ' — ' + book.author, selected: book.slug === current?.slug }));
  }
  select.addEventListener('change', () => {
    const book = books.find(item => item.slug === select.value);
    if (!book) return;
    remember(book.slug);
    const url = new URL(window.location.href);
    url.searchParams.set('book', book.slug);
    window.history.replaceState(null, '', url);
    onChange?.(book);
  });

  container.append(el('div', {}, [
    el('label', { for: select.id, text: label }),
    select
  ]));
  for (const node of extra) container.append(node);
  if (current) remember(current.slug);
}

// Most tools want the same three lines of boilerplate: load the index, pick a
// book, draw the chooser, render. This does that and hands back the index.
export async function withBooks(container, options, render) {
  let index;
  try {
    index = await loadIndex();
  } catch {
    if (container) {
      clear(container);
      container.append(el('p', { class: 'astor-empty', text: 'The study data could not be loaded. Reload the page, or open a book page directly from the catalogue.' }));
    }
    return null;
  }
  const books = (options.filter ? index.books.filter(options.filter) : index.books)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title));
  if (!books.length) {
    if (container) {
      clear(container);
      container.append(el('p', { class: 'astor-empty', text: 'No titles carry the material this tool needs yet.' }));
    }
    return null;
  }
  let current = chooseBook(books, options.preferred);
  mountChooser(container, {
    books,
    current,
    label: options.label,
    extra: options.extra,
    onChange: book => { current = book; render(book, index, books); }
  });
  render(current, index, books);
  return index;
}

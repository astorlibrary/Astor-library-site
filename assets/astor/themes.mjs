// The themes explorer.
//
// A theme that several books share is one idea handled several ways. This
// page puts each book's handling beside the others — its own account of the
// theme, how it develops, and the lines that carry it — which is the view a
// comparative essay needs and no single book page can give.

import { el, clear } from './util.mjs';
import { loadIndex, allThemes } from './data.mjs';

const search = document.querySelector('#astor-theme-search');
const listMount = document.querySelector('#astor-theme-list');

if (listMount) start();

async function start() {
  let index;
  try {
    index = await loadIndex();
  } catch {
    listMount.append(el('p', { class: 'astor-empty', text: 'Couldn’t load the themes. Try reloading the page.' }));
    return;
  }

  const themes = allThemes(index);
  if (!themes.length) {
    listMount.append(el('p', { class: 'astor-empty', text: 'No themes yet.' }));
    return;
  }

  clear(search);
  const input = el('input', {
    type: 'search', id: 'astor-theme-query', autocomplete: 'off',
    placeholder: 'A theme or a book'
  });
  const order = el('select', { id: 'astor-theme-order', 'aria-label': 'Sort themes' });
  order.append(el('option', { value: 'books', text: 'Most books first' }));
  order.append(el('option', { value: 'name', text: 'A to Z' }));
  input.addEventListener('input', () => render(themes, input.value, order.value, window.location.hash.slice(1)));
  order.addEventListener('change', () => render(themes, input.value, order.value, window.location.hash.slice(1)));
  search.append(el('div', { class: 'astor-chooser-grow' }, [el('label', { for: input.id, text: 'Find a theme' }), input]));
  search.append(el('div', {}, [el('label', { for: order.id, text: 'Sort' }), order]));

  const target = window.location.hash.slice(1);
  render(themes, '', 'books', target);
  if (target) document.getElementById(target)?.scrollIntoView({ block: 'start' });
  window.addEventListener('hashchange', () => {
    const entry = document.getElementById(window.location.hash.slice(1));
    if (entry?.classList.contains('astor-term')) {
      const group = entry.closest('.astor-term-group');
      if (group) group.open = true;
      entry.open = true;
      entry.scrollIntoView({ block: 'start' });
    }
  });
}

function render(themes, query, order, openId) {
  clear(listMount);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = themes.filter(theme => {
    if (!words.length) return true;
    const haystack = (theme.name + ' ' + theme.books.map(book => book.title + ' ' + book.name + ' ' + book.summary).join(' ')).toLowerCase();
    return words.every(word => haystack.includes(word));
  });
  if (order === 'name') shown.sort((a, b) => a.name.localeCompare(b.name));
  else shown.sort((a, b) => b.books.length - a.books.length || a.name.localeCompare(b.name));

  const shared = shown.filter(theme => theme.books.length > 1).length;
  listMount.append(el('p', {
    class: 'astor-explorer-count',
    text: shown.length + (shown.length === 1 ? ' theme' : ' themes') + ', ' + shared + ' in more than one book'
  }));

  if (!shown.length) {
    listMount.append(el('p', { class: 'astor-empty', text: 'No theme matches that. Try a shorter word.' }));
    return;
  }
  // Unsearched, the page is about what books share: those themes come first,
  // and the ones a single book carries are folded beneath them.
  const single = words.length ? [] : shown.filter(theme => theme.books.length === 1);
  for (const theme of shown) {
    if (single.includes(theme)) continue;
    listMount.append(entry(theme, theme.id === openId || words.length > 0));
  }
  if (single.length) {
    const group = el('details', {
      class: 'astor-term-group',
      open: single.some(theme => theme.id === openId)
    });
    group.append(el('summary', {}, [
      el('span', { class: 'astor-term-name', text: 'Themes in one book only' }),
      el('small', { text: single.length + ' themes' })
    ]));
    for (const theme of single) group.append(entry(theme, theme.id === openId));
    listMount.append(group);
  }
}

function entry(theme, open) {
  const books = theme.books.length;
  const details = el('details', { class: 'astor-term', id: theme.id, open });
  details.append(el('summary', {}, [
    el('span', { class: 'astor-term-name', text: theme.name }),
    el('span', { class: 'astor-term-definition', text: books === 1
      ? 'In ' + theme.books[0].title + ' only.'
      : theme.books.map(book => book.title).join(' · ') }),
    el('small', { text: books + (books === 1 ? ' book' : ' books') })
  ]));

  const body = el('div', { class: 'astor-term-body' });
  const grid = el('div', { class: 'astor-note-grid' });
  for (const book of theme.books) {
    const block = el('article', { class: 'astor-note' });
    block.append(el('h4', {}, [el('a', { href: book.href + '#astor-theme-' + theme.id, text: book.title })]));
    if (book.name && book.name !== theme.name) {
      block.append(el('p', { class: 'astor-quote-attribution', text: 'Also called ' + book.name }));
    }
    block.append(el('p', { text: book.summary }));
    if (book.development) block.append(el('p', { class: 'astor-note-aside', text: book.development }));
    const quotation = book.quotations[0];
    if (quotation) {
      block.append(el('blockquote', { class: 'astor-game-quote' }, [el('p', { text: quotation.text })]));
      block.append(el('p', {
        class: 'astor-quote-attribution',
        text: (quotation.speaker ? quotation.speaker + ' · ' : '') + book.title + ' ' + quotation.reference
      }));
    }
    grid.append(block);
  }
  body.append(grid);
  const actions = el('p', { class: 'astor-toolkit-actions' }, [
    el('a', { class: 'button secondary', href: '/explore/quotations/?theme=' + encodeURIComponent(theme.id), text: 'See the quotations' })
  ]);
  if (theme.books.length > 1) {
    actions.append(el('a', {
      class: 'button secondary',
      href: '/explore/compare/?a=' + encodeURIComponent(theme.books[0].slug) + '&b=' + encodeURIComponent(theme.books[1].slug),
      text: 'Compare ' + theme.books[0].title + ' and ' + theme.books[1].title
    }));
  }
  body.append(actions);
  details.append(body);
  return details;
}

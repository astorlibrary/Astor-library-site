// The technique glossary.
//
// A term is defined once, and then shown doing a particular job in a
// particular line, in every book that uses it. A glossary that only defines is
// a glossary nobody can write from; the point here is the second half of each
// entry.
//
// Two hundred terms need a way in that is not two hundred links: an A to Z
// bar, a search box, and entries that open on the definition and unfold the
// examples when asked.

import { el, clear } from './util.mjs';
import { loadIndex, allTechniques } from './data.mjs';

const search = document.querySelector('#astor-technique-search');
const listMount = document.querySelector('#astor-technique-list');

if (listMount) start();

async function start() {
  let index;
  try {
    index = await loadIndex();
  } catch {
    listMount.append(el('p', { class: 'astor-empty', text: 'Couldn’t load the glossary. Try reloading the page.' }));
    return;
  }

  const techniques = allTechniques(index);
  if (!techniques.length) {
    listMount.append(el('p', { class: 'astor-empty', text: 'No terms yet.' }));
    return;
  }

  clear(search);
  const input = el('input', {
    type: 'search', id: 'astor-technique-query', autocomplete: 'off',
    placeholder: 'A term or a book'
  });
  input.addEventListener('input', () => render(techniques, input.value, document.location.hash.slice(1)));
  search.append(el('div', { class: 'astor-chooser-grow' }, [
    el('label', { for: input.id, text: 'Find a term' }),
    input
  ]));

  const letters = [...new Set(techniques.map(technique => initial(technique.name)))].sort();
  const bar = el('nav', { class: 'astor-alphabet', 'aria-label': 'Jump to a letter' });
  for (const letter of letters) {
    bar.append(el('a', { href: '#astor-letter-' + letter, text: letter }));
  }
  search.append(bar);

  // A link from a book page arrives with the term in the fragment; open that
  // entry and go to it.
  const target = window.location.hash.slice(1);
  render(techniques, '', target);
  if (target) document.getElementById(target)?.scrollIntoView({ block: 'start' });
  window.addEventListener('hashchange', () => {
    const id = window.location.hash.slice(1);
    const entry = document.getElementById(id);
    if (entry?.classList.contains('astor-term')) entry.open = true;
  });
}

function initial(name) {
  const letter = name.replace(/^(the|a|an)\s+/i, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
}

function render(techniques, query, openId) {
  clear(listMount);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = techniques.filter(technique => {
    if (!words.length) return true;
    const haystack = (technique.name + ' ' + technique.definition + ' ' +
      technique.examples.map(example => example.title + ' ' + example.inThisBook).join(' ')).toLowerCase();
    return words.every(word => haystack.includes(word));
  });

  listMount.append(el('p', {
    class: 'astor-explorer-count',
    text: shown.length + (shown.length === 1 ? ' term' : ' terms') +
      ' across ' + new Set(shown.flatMap(technique => technique.examples.map(example => example.slug))).size + ' books'
  }));

  if (!shown.length) {
    listMount.append(el('p', { class: 'astor-empty', text: 'No term matches that. Try a shorter word.' }));
    return;
  }

  let letter = '';
  for (const technique of shown) {
    const first = initial(technique.name);
    if (first !== letter && !words.length) {
      letter = first;
      listMount.append(el('h2', { class: 'astor-letter', id: 'astor-letter-' + letter, text: letter }));
    }
    listMount.append(entry(technique, technique.id === openId || words.length > 0));
  }
}

function entry(technique, open) {
  const books = technique.examples.length;
  const details = el('details', { class: 'astor-term', id: technique.id, open });
  details.append(el('summary', {}, [
    el('span', { class: 'astor-term-name', text: technique.name }),
    el('span', { class: 'astor-term-definition', text: technique.definition }),
    el('small', { text: books + (books === 1 ? ' book' : ' books') })
  ]));

  const body = el('div', { class: 'astor-term-body' });
  const grid = el('div', { class: 'astor-note-grid' });
  for (const example of technique.examples) {
    const block = el('article', { class: 'astor-note' });
    block.append(el('h4', {}, [el('a', { href: example.href, text: example.title })]));
    if (example.bookName && example.bookName !== technique.name) {
      block.append(el('p', { class: 'astor-quote-attribution', text: 'Also called ' + example.bookName }));
    }
    block.append(el('p', { text: example.inThisBook }));
    const quotation = example.quotations[0];
    if (quotation) {
      block.append(el('blockquote', { class: 'astor-game-quote' }, [el('p', { text: quotation.text })]));
      block.append(el('p', {
        class: 'astor-quote-attribution',
        text: (quotation.speaker ? quotation.speaker + ' · ' : '') + example.title + ' ' + quotation.reference
      }));
    }
    grid.append(block);
  }
  body.append(grid);
  body.append(el('p', { class: 'astor-toolkit-actions' }, [
    el('a', {
      class: 'button secondary',
      href: '/explore/quotations/?technique=' + encodeURIComponent(technique.id),
      text: 'See the quotations'
    }),
    el('a', { class: 'button secondary', href: '/play/technique-spotter/', text: 'Practise spotting it' })
  ]));
  details.append(body);
  return details;
}

// The technique glossary.
//
// A term is defined once, and then shown doing a particular job in a
// particular line, in every book that uses it. A glossary that only defines is
// a glossary nobody can write from; the point here is the second half of each
// entry.

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
    listMount.append(el('p', { class: 'astor-empty', text: 'The glossary could not load. Each book page has a “How it is written” section covering the same terms for that title.' }));
    return;
  }

  const techniques = allTechniques(index);
  if (!techniques.length) {
    listMount.append(el('p', { class: 'astor-empty', text: 'No techniques recorded yet.' }));
    return;
  }

  clear(search);
  const input = el('input', {
    type: 'search', id: 'astor-technique-query', autocomplete: 'off',
    placeholder: 'A term, or a book that uses it'
  });
  input.addEventListener('input', () => render(techniques, input.value));
  search.append(el('div', {}, [
    el('label', { for: input.id, text: 'Find a term' }),
    input
  ]));

  const jump = el('div', { class: 'astor-tag-row' });
  for (const technique of techniques) {
    jump.append(el('a', { class: 'astor-tag', href: '#' + technique.id, text: technique.name }));
  }
  search.append(jump);

  render(techniques, '');

  // A link from a book page arrives with the term in the fragment.
  const target = window.location.hash.slice(1);
  if (target) document.getElementById(target)?.scrollIntoView({ block: 'start' });
}

function render(techniques, query) {
  clear(listMount);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = techniques.filter(technique => {
    if (!words.length) return true;
    const haystack = (technique.name + ' ' + technique.definition + ' ' + technique.examples.map(example => example.title + ' ' + example.inThisBook).join(' ')).toLowerCase();
    return words.every(word => haystack.includes(word));
  });

  listMount.append(el('p', {
    class: 'astor-explorer-count',
    text: shown.length + (shown.length === 1 ? ' term' : ' terms') +
      ', shown across ' + new Set(shown.flatMap(technique => technique.examples.map(example => example.slug))).size + ' titles'
  }));

  if (!shown.length) {
    listMount.append(el('p', { class: 'astor-empty', text: 'No term matches that. Try a shorter word.' }));
    return;
  }

  for (const technique of shown) {
    const section = el('section', { class: 'astor-toolkit', id: technique.id });
    section.append(el('div', { class: 'astor-toolkit-head' }, [
      el('div', {}, [
        el('p', { class: 'kicker', text: 'Technique' }),
        el('h2', { text: technique.name }),
        el('p', { text: technique.definition })
      ]),
      el('div', { class: 'astor-toolkit-actions' }, [
        el('a', {
          class: 'button secondary',
          href: '/explore/quotations/?technique=' + encodeURIComponent(technique.id),
          text: 'Every example'
        })
      ])
    ]));

    const panel = el('div', { class: 'astor-panel' });
    for (const example of technique.examples) {
      const block = el('article', { class: 'astor-note' });
      block.append(el('h4', {}, [el('a', { href: example.href, text: example.title })]));
      block.append(el('p', { text: example.inThisBook }));
      const quotation = example.quotations[0];
      if (quotation) {
        block.append(el('blockquote', { class: 'astor-game-quote' }, [
          el('p', { text: quotation.text })
        ]));
        block.append(el('p', {
          class: 'astor-quote-attribution',
          text: (quotation.speaker ? quotation.speaker + ' · ' : '') + example.title + ' ' + quotation.reference
        }));
      }
      panel.append(block);
    }
    panel.className = 'astor-panel';
    const grid = el('div', { class: 'astor-note-grid' });
    while (panel.firstChild) grid.append(panel.firstChild);
    panel.append(grid);
    section.append(panel);
    listMount.append(section);
  }
}

// Compare two texts.
//
// Comparative essays go wrong in a predictable way: two separate accounts
// stapled together, with the comparison left to the reader. This tool starts
// from the shared ground instead — the themes and techniques both books use —
// and pairs the quotations that carry them, because that is where a
// comparative paragraph actually begins.

import { el, clear } from './util.mjs';
import { loadIndex } from './data.mjs';
import { mountChooser } from './chooser.mjs';

const chooser = document.querySelector('#astor-compare-chooser');
const mount = document.querySelector('#astor-compare');

if (mount) start();

async function start() {
  let index;
  try {
    index = await loadIndex();
  } catch {
    mount.append(el('p', { class: 'astor-empty', text: 'Couldn’t load the books. Try reloading the page.' }));
    return;
  }

  const books = index.books.slice().sort((a, b) => a.title.localeCompare(b.title));
  if (books.length < 2) {
    mount.append(el('p', { class: 'astor-empty', text: 'Not enough books to compare yet.' }));
    return;
  }

  const params = new URLSearchParams(window.location.search);
  let left = books.find(book => book.slug === params.get('a')) || books[0];
  let right = books.find(book => book.slug === params.get('b')) || books.find(book => book.slug !== left.slug);

  clear(chooser);
  const leftSelect = select('astor-compare-left', 'First book', books, left, value => {
    left = value;
    if (right.slug === left.slug) right = books.find(book => book.slug !== left.slug);
    rightSelect.value = right.slug;
    update();
  });
  const rightSelect = select('astor-compare-right', 'Second book', books, right, value => { right = value; update(); });
  chooser.append(leftSelect.wrapper);
  chooser.append(rightSelect.wrapper);
  chooser.append(el('button', {
    class: 'button secondary', type: 'button', text: 'Swap them',
    onclick: () => {
      [left, right] = [right, left];
      leftSelect.node.value = left.slug;
      rightSelect.node.value = right.slug;
      update();
    }
  }));

  function update() {
    const url = new URL(window.location.href);
    url.searchParams.set('a', left.slug);
    url.searchParams.set('b', right.slug);
    window.history.replaceState(null, '', url);
    render(left, right);
  }

  update();

  function select(id, label, list, current, onChange) {
    const node = el('select', { id, 'aria-label': label });
    for (const book of list) node.append(el('option', { value: book.slug, text: book.title + ' — ' + book.author, selected: book.slug === current.slug }));
    node.addEventListener('change', () => onChange(list.find(book => book.slug === node.value)));
    return { node, wrapper: el('div', {}, [el('label', { for: id, text: label }), node]) };
  }
}

function row(heading, leftContent, rightContent) {
  return el('div', { class: 'astor-compare-row' }, [
    el('p', { class: 'astor-compare-heading', text: heading }),
    el('div', { class: 'astor-compare-grid' }, [
      el('div', {}, leftContent),
      el('div', {}, rightContent)
    ])
  ]);
}

function facts(book) {
  return [
    el('p', { class: 'astor-analysis', text: book.summary }),
    el('ul', { class: 'astor-question-list' }, [
      el('li', { text: 'Form: ' + (book.genre || book.form) }),
      el('li', { text: 'Period: ' + book.period }),
      book.written || book.firstPublished ? el('li', { text: 'Date: ' + (book.written || book.firstPublished) }) : null,
      book.setting ? el('li', { text: 'Setting: ' + book.setting }) : null,
      el('li', { text: 'Structure: ' + book.structure.length + ' ' + (book.form === 'play' ? 'acts' : 'sections') })
    ].filter(Boolean))
  ];
}

function shared(left, right, key) {
  const rightIds = new Set(right[key].map(item => item.id));
  return left[key].filter(item => rightIds.has(item.id));
}

function render(left, right) {
  clear(mount);

  const sharedThemes = shared(left, right, 'themes');
  const sharedTechniques = shared(left, right, 'techniques');

  const panel = el('div', { class: 'astor-toolkit' });
  panel.append(el('div', { class: 'astor-toolkit-head' }, [
    el('div', {}, [
      el('p', { class: 'kicker', text: 'Side by side' }),
      el('h2', { text: left.title + ' and ' + right.title }),
      el('p', {
        text: sharedThemes.length || sharedTechniques.length
          ? 'They share ' + sharedThemes.length + ' ' + (sharedThemes.length === 1 ? 'theme' : 'themes') +
            ' and ' + sharedTechniques.length + ' ' + (sharedTechniques.length === 1 ? 'technique' : 'techniques') +
            '.'
          : 'These two have no themes or techniques in common.'
      })
    ])
  ]));

  panel.append(row('The books', facts(left), facts(right)));

  if (sharedThemes.length) {
    panel.append(el('p', { class: 'astor-compare-heading', text: 'Shared themes' }));
    for (const theme of sharedThemes) {
      const leftTheme = left.themes.find(item => item.id === theme.id);
      const rightTheme = right.themes.find(item => item.id === theme.id);
      const leftQuote = left.quotations.find(quotation => (quotation.themes || []).includes(theme.id));
      const rightQuote = right.quotations.find(quotation => (quotation.themes || []).includes(theme.id));
      panel.append(el('div', { class: 'astor-compare-row' }, [
        el('p', { class: 'astor-compare-heading', text: theme.name }),
        el('div', { class: 'astor-compare-grid' }, [
          el('div', {}, quoteBlock(left, leftTheme, leftQuote)),
          el('div', {}, quoteBlock(right, rightTheme, rightQuote))
        ])
      ]));
    }
  }

  if (sharedTechniques.length) {
    panel.append(row('Shared techniques',
      [el('ul', { class: 'astor-shared-list' }, sharedTechniques.map(technique =>
        el('li', {}, [el('a', { class: 'astor-tag', href: '/explore/techniques/#' + technique.id, text: technique.name })])))],
      [el('p', { class: 'astor-analysis', text: 'See the glossary for how each book uses them.' })]
    ));
  }

  const onlyLeft = left.themes.filter(theme => !right.themes.some(other => other.id === theme.id));
  const onlyRight = right.themes.filter(theme => !left.themes.some(other => other.id === theme.id));
  if (onlyLeft.length || onlyRight.length) {
    panel.append(row('Themes not shared',
      [el('ul', { class: 'astor-question-list' }, onlyLeft.map(theme => el('li', { text: theme.name + ' — ' + theme.summary })))],
      [el('ul', { class: 'astor-question-list' }, onlyRight.map(theme => el('li', { text: theme.name + ' — ' + theme.summary })))]
    ));
  }

  panel.append(row('What next',
    [el('div', { class: 'button-row' }, [
      el('a', { class: 'button secondary', href: left.href, text: 'Study ' + left.title }),
      el('a', { class: 'button secondary', href: '/play/essay-forge/?book=' + left.slug, text: 'Plan an essay' })
    ])],
    [el('div', { class: 'button-row' }, [
      el('a', { class: 'button secondary', href: right.href, text: 'Study ' + right.title }),
      el('a', { class: 'button secondary', href: '/play/essay-forge/?book=' + right.slug, text: 'Plan an essay' })
    ])]
  ));

  mount.append(panel);
}

function quoteBlock(book, theme, quotation) {
  return [
    el('p', { class: 'astor-quote-attribution', text: book.title }),
    theme ? el('p', { class: 'astor-analysis', text: theme.summary }) : null,
    quotation ? el('blockquote', { class: 'astor-game-quote' }, [el('p', { text: quotation.text })]) : null,
    quotation ? el('p', { class: 'astor-context', text: (quotation.speaker ? quotation.speaker + ' · ' : '') + quotation.reference }) : null
  ].filter(Boolean);
}

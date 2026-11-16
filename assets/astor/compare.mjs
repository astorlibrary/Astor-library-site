// Two books side by side.
//
// What this page can say reliably is what each book's record holds: when and
// how it was written, where it is set, how it is built, and the themes its
// study guide covers. It sets those next to each other. Where the two guides
// treat a theme under the same heading, it pairs a line from each.
//
// It does not say that two books share nothing. Each guide names a book's
// themes in that book's own terms (ambition and guilt in Macbeth, the divided
// self and respectability in Jekyll and Hyde), so two guides with no heading
// in common are still very often about the same things, and a comparison of
// them is the reader's to make. Where Astor prints the pair in one volume,
// the page says so and points to the book.

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

  let paired = [];
  try { paired = JSON.parse(chooser?.dataset.paired || '[]'); } catch { /* the page works without them */ }
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
    render(left, right, paired.find(edition => edition.slugs.includes(left.slug) && edition.slugs.includes(right.slug)));
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

// "Written 1843", but a note that carries its own verb stands as it is
// ("Drafted 1796–97 as First Impressions; revised 1811–12").
function writtenLine(written) {
  const text = String(written || '').trim();
  if (!text) return '';
  return /^(c\. ?)?\d/.test(text) ? 'Written ' + text : text;
}

function facts(book) {
  return [
    el('p', { class: 'astor-analysis', text: book.summary }),
    el('ul', { class: 'astor-question-list' }, [
      el('li', { text: 'Form: ' + (book.genre || book.form) }),
      el('li', { text: 'Period: ' + book.period }),
      book.written ? el('li', { text: writtenLine(book.written) }) : null,
      book.firstPublished ? el('li', { text: (book.firstPublished < 1700 ? 'First printed ' : 'First published ') + book.firstPublished }) : null,
      book.setting ? el('li', { text: 'Setting: ' + book.setting }) : null,
      el('li', { text: 'Structure: ' + book.structure.length + ' ' + (book.form === 'play' ? 'acts' : 'sections') })
    ].filter(Boolean))
  ];
}

function shared(left, right, key) {
  const rightIds = new Set(right[key].map(item => item.id));
  return left[key].filter(item => rightIds.has(item.id));
}

function themeList(book) {
  return el('ul', { class: 'astor-question-list' }, book.themes.map(theme =>
    el('li', {}, [
      el('a', { href: '/guides/' + book.slug + '/themes/#astor-theme-' + theme.id, text: theme.name }),
      ' — ' + theme.summary
    ])));
}

function render(left, right, edition) {
  clear(mount);

  const sharedThemes = shared(left, right, 'themes');
  const sharedTechniques = shared(left, right, 'techniques');

  const panel = el('div', { class: 'astor-toolkit' });
  panel.append(el('div', { class: 'astor-toolkit-head' }, [
    el('div', {}, [
      el('p', { class: 'kicker', text: 'Side by side' }),
      el('h2', { text: left.title + ' and ' + right.title }),
      edition ? el('p', {}, [
        'Astor prints these two in one volume: ',
        el('a', { href: edition.href, text: edition.title + ', Paired Study Edition' }),
        '.'
      ]) : null,
      sharedThemes.length ? el('p', {
        text: 'The two study guides treat ' + (sharedThemes.length === 1 ? 'one theme' : sharedThemes.length + ' themes') +
          ' under the same heading: ' + sharedThemes.map(theme => theme.name.toLowerCase()).join(', ') + '.'
      }) : null
    ])
  ]));

  panel.append(row('The books', facts(left), facts(right)));

  if (sharedThemes.length) {
    panel.append(el('p', { class: 'astor-compare-heading', text: 'Under the same heading in both guides' }));
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

  // Every theme of each book, in that book's own words, so the reader can see
  // where the two meet even where the guides name things differently.
  panel.append(row(sharedThemes.length ? 'All the themes of each book' : 'The themes of each book', [themeList(left)], [themeList(right)]));

  if (sharedTechniques.length) {
    panel.append(row('Techniques both guides name',
      [el('ul', { class: 'astor-shared-list' }, sharedTechniques.map(technique =>
        el('li', {}, [el('a', { class: 'astor-tag', href: '/explore/techniques/#' + technique.id, text: technique.name })])))],
      [el('p', { class: 'astor-analysis', text: 'The glossary shows how each book uses them.' })]
    ));
  }

  panel.append(row('Read on',
    [el('div', { class: 'button-row' }, [
      el('a', { class: 'button secondary', href: '/guides/' + left.slug + '/', text: 'Study guide to ' + left.title })
    ])],
    [el('div', { class: 'button-row' }, [
      el('a', { class: 'button secondary', href: '/guides/' + right.slug + '/', text: 'Study guide to ' + right.title })
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

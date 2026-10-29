// The Revise page, served at /play/.
//
// It opens on one book, dressed in that book's cover: its colour, its
// drawings and its title. Below that is one way to start (ten mixed
// questions), the activities in three short groups with the reader's best
// score beside each, one line on how many of the book's key lines are known,
// and the quizzes that range across the whole library.

import { el, clear } from './util.mjs';
import { snapshot, today, recentlyViewed, dailyResult, isRemembering } from './store.mjs';
import {
  loadFailed, loadShelf, loadBook, setAccent, keepAddress, preferredSlug,
  LIBRARY_QUIZZES, availableQuizzes, bookLines, lineSummary, shortTitle,
  changeBookButton, coverImage, activityHref, modeToggle
} from './revise-kit.mjs';

const titleMount = document.querySelector('#rv-title');
const hubMount = document.querySelector('#rv-hub');

if (hubMount) start();

let shelf = null;

async function start() {
  try {
    shelf = await loadShelf();
  } catch (error) {
    loadFailed(hubMount, undefined, error);
    return;
  }
  const recent = recentlyViewed(20).map(entry => entry.slug);
  const wanted = preferredSlug();
  const first = shelf.books.find(book => book.slug === wanted)
    || shelf.books.find(book => recent.includes(book.slug))
    || shelf.books.find(book => book.slug === 'macbeth')
    || shelf.books[0];
  show(first);
}

let generation = 0;

async function show(meta) {
  // A slow book must not overwrite a quicker, later choice.
  const ticket = ++generation;
  keepAddress(meta.slug);
  setAccent(document.querySelector('main'), meta);
  let book;
  try {
    book = await loadBook(meta.slug);
  } catch {
    if (ticket !== generation) return;
    clear(hubMount);
    hubMount.append(el('p', { class: 'rv-empty', text: 'That book didn’t load. Try another, or reload the page.' }));
    return;
  }
  if (ticket !== generation || book.slug !== meta.slug) return;
  const state = snapshot();
  const day = today();
  const counts = lineSummary(bookLines(book, state.cards || {}, day));

  drawHero(meta, book);
  clear(hubMount);
  hubMount.append(
    drawActivities(book, meta, state, counts),
    drawProgress(book, counts),
    drawLibrary(day)
  );
  document.title = 'Revise ' + shortTitle(book) + ' | Astor Library';
}

// --- the book --------------------------------------------------------------------

function drawHero(meta, book) {
  if (!titleMount) return;
  clear(titleMount);
  titleMount.className = 'rx-hero rx-hub-hero';
  titleMount.classList.toggle('is-cover', Boolean(meta.edition?.motifs));
  const cover = el('a', { class: 'rx-hero-cover', href: book.href, 'aria-label': 'The Astor edition of ' + book.title }, [
    coverImage(meta, { width: 160, eager: true })
  ]);
  const words = el('div', { class: 'rx-hero-words' }, [
    el('p', { class: 'rx-hero-kicker', text: 'Revise' }),
    el('h1', { class: 'rx-hero-title', text: shortTitle(book) }),
    el('p', { class: 'rx-hero-author', text: book.author }),
    el('a', { class: 'rx-hero-start', href: activityHref('mixed-round', book.slug) }, [
      el('b', { text: 'Ten questions' }),
      el('span', { text: 'A mix of every kind, starting with the lines you need most.' })
    ]),
    el('p', { class: 'rx-hero-links' }, [
      changeBookButton({ books: shelf.books, current: meta, onChoose: choice => show(choice), className: 'rx-hero-link is-button' }),
      modeToggle('rx-hero-link is-icon rx-mode-toggle')
    ])
  ]);
  titleMount.append(el('span', { class: 'rx-hero-art', 'aria-hidden': 'true' }), el('div', { class: 'rx-hero-inner' }, [cover, words]));
}

// --- the activities --------------------------------------------------------------

const GROUPS = [
  { title: 'Quotations', ids: ['who-said-it', 'fill-the-line', 'flashcards'] },
  { title: 'Ideas', ids: ['theme-match', 'technique-spotter'] },
  { title: 'Characters and plot', ids: ['character-identification', 'order-the-plot'] }
];

const DESCRIPTIONS = {
  'who-said-it': ['Who said it?', 'Name the speaker of a line.'],
  'fill-the-line': ['Fill the line', 'Put the missing words back into a quotation.'],
  'flashcards': ['Flashcards', 'Learn the key lines, a few at a time.'],
  'theme-match': ['Theme match', 'Match a line to the theme it belongs to.'],
  'technique-spotter': ['Technique spotter', 'Name the technique used in a line.'],
  'character-identification': ['Who is this?', 'Identify a character from a description.'],
  'order-the-plot': ['Order the plot', 'Put the events back in order.']
};

function drawActivities(book, meta, state, counts) {
  const available = new Set(availableQuizzes(book).map(quiz => quiz.id));
  if (book.quotations.length >= 5) available.add('flashcards');

  const section = el('section', { class: 'rx-hub-list', 'aria-labelledby': 'rx-acts-title' });
  section.append(el('h2', { class: 'rx-visually-hidden', id: 'rx-acts-title', text: 'Activities' }));
  for (const group of GROUPS) {
    const ids = group.ids.filter(id => available.has(id));
    if (!ids.length) continue;
    section.append(el('div', { class: 'rx-hub-group' }, [
      el('h3', { text: group.title }),
      el('ul', {}, ids.map(id => el('li', {}, [activityRow(id, book, state, counts)])))
    ]));
  }
  return section;
}

function activityRow(id, book, state, counts) {
  const [name, note] = DESCRIPTIONS[id];
  let status = '';
  if (id === 'flashcards') {
    const met = counts.known + counts.growing + counts.shaky;
    if (met) status = counts.known + ' of ' + book.quotations.length + ' known' + (counts.due ? ', ' + counts.due + ' due' : '');
  } else {
    const result = state.scores?.[id]?.byBook?.[book.slug];
    if (result?.total) status = 'Best ' + result.best + ' of ' + result.total;
  }
  return el('a', { class: 'rx-hub-row', href: activityHref(id, book.slug) }, [
    el('span', { class: 'rx-hub-name', text: name }),
    el('span', { class: 'rx-hub-note', text: note }),
    status ? el('span', { class: 'rx-hub-status', text: status }) : null
  ]);
}

// --- how well the book is known, in one line ---------------------------------------

function drawProgress(book, counts) {
  const total = book.quotations.length;
  const met = counts.known + counts.growing + counts.shaky;
  let text;
  if (!isRemembering()) text = 'This browser is not saving progress, so scores will not be kept.';
  else if (!met) text = shortTitle(book) + ' has ' + total + ' key lines. Your progress on them is kept in this browser.';
  else text = 'You know ' + counts.known + ' of the ' + total + ' key lines in ' + shortTitle(book) + (counts.due ? '. ' + counts.due + (counts.due === 1 ? ' is' : ' are') + ' due for another look today.' : '.');
  return el('p', { class: 'rx-hub-progress' }, [
    text + ' ',
    el('a', { href: '/guides/' + book.slug + '/quotations/', text: 'Read the key quotations' })
  ]);
}

// --- across the library -------------------------------------------------------------

function drawLibrary(day) {
  const done = dailyResult(day);
  const rows = [
    el('li', {}, [el('a', { class: 'rx-hub-row', href: '/today/' }, [
      el('span', { class: 'rx-hub-name', text: 'Today' }),
      el('span', { class: 'rx-hub-note', text: 'Five questions on literature, new each day.' }),
      done ? el('span', { class: 'rx-hub-status', text: 'Done today, ' + done.score + ' of ' + (done.total || 5) }) : null
    ])])
  ];
  for (const quiz of LIBRARY_QUIZZES) {
    const result = snapshot().scores?.[quiz.id];
    rows.push(el('li', {}, [el('a', { class: 'rx-hub-row', href: '/play/' + quiz.id + '/' }, [
      el('span', { class: 'rx-hub-name', text: quiz.name }),
      el('span', { class: 'rx-hub-note', text: quiz.note }),
      result?.bestTotal ? el('span', { class: 'rx-hub-status', text: 'Best ' + result.best + ' of ' + result.bestTotal }) : null
    ])]));
  }
  return el('section', { class: 'rx-hub-list rx-hub-library', 'aria-labelledby': 'rx-library-title' }, [
    el('div', { class: 'rx-hub-group' }, [
      el('h2', { id: 'rx-library-title', text: 'Across the library' }),
      el('ul', {}, rows)
    ])
  ]);
}

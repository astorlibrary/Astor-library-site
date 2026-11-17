// The Revise page, served at /play/.
//
// It opens on what a reader came for: which book, how to change it, and one
// button that starts ten questions. The cover sits beside the title, and the
// book's colour and drawings run behind as a narrow band, so the page still
// belongs to the book without the book filling the screen. Below that are the
// other activities in a quieter list, with the reader's best score beside
// each, today's five questions, and the quizzes that range across the library.

import { el, clear } from './util.mjs';
import { snapshot, today, recentlyViewed, dailyResult, isRemembering } from './store.mjs';
import {
  loadFailed, loadShelf, loadBook, setAccent, keepAddress, preferredSlug,
  LIBRARY_QUIZZES, availableQuizzes, bookLines, lineSummary, shortTitle,
  changeBookButton, coverImage, activityHref, modeToggle
} from './revise-kit.mjs';

const titleMount = document.querySelector('#rv-title');
const hubMount = document.querySelector('#rv-hub');

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
  titleMount.className = 'rv-start';
  titleMount.classList.toggle('is-cover', Boolean(meta.edition?.motifs));
  const cover = el('a', { class: 'rv-start-cover', href: book.href, 'aria-label': 'The Astor edition of ' + book.title }, [
    coverImage(meta, { width: 120, eager: true })
  ]);
  const words = el('div', { class: 'rv-start-words' }, [
    el('p', { class: 'rv-start-kicker', text: 'Revise' }),
    el('h1', { class: 'rv-start-title', text: shortTitle(book) }),
    el('p', { class: 'rv-start-author', text: book.author })
  ]);
  const tools = el('p', { class: 'rv-start-tools' }, [
    changeBookButton({ books: shelf.books, current: meta, onChoose: choice => show(choice), className: 'rv-start-change' }),
    modeToggle('rv-start-mode rx-mode-toggle')
  ]);
  const go = el('div', { class: 'rv-start-go' }, [
    el('a', { class: 'rv-start-button', href: activityHref('mixed-round', book.slug) }, [
      el('span', { text: 'Start ten questions' }),
      el('span', { class: 'rv-start-arrow', 'aria-hidden': 'true', text: '→' })
    ]),
    el('p', { class: 'rv-start-note', text: 'A mix of every kind, starting with the lines you need most.' })
  ]);
  titleMount.append(
    el('span', { class: 'rv-start-art', 'aria-hidden': 'true' }),
    el('div', { class: 'rv-start-inner' }, [cover, words, tools, go])
  );
}

// --- the activities --------------------------------------------------------------

const ORDER = ['flashcards', 'who-said-it', 'fill-the-line', 'theme-match', 'technique-spotter', 'character-identification', 'order-the-plot'];

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
  const ids = ORDER.filter(id => available.has(id));
  const section = el('section', { class: 'rx-hub-list rx-hub-more', 'aria-labelledby': 'rx-acts-title' });
  if (!ids.length) return section;
  section.append(el('div', { class: 'rx-hub-group' }, [
    el('h2', { id: 'rx-acts-title', text: 'One thing at a time' }),
    el('ul', {}, ids.map(id => el('li', {}, [activityRow(id, book, state, counts)])))
  ]));
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
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayBlock = el('a', { class: 'rx-hub-today', href: '/today/' }, [
    el('span', { class: 'rx-hub-today-date', text: date }),
    el('span', { class: 'rx-hub-today-name', text: 'Today’s five questions' }),
    el('span', { class: 'rx-hub-today-note', text: done
      ? 'Done today: ' + done.score + ' of ' + (done.total || 5) + '. Five new ones tomorrow.'
      : 'The same five for everyone, on books, plays and poems from across the library.' })
  ]);
  const rows = [];
  for (const quiz of LIBRARY_QUIZZES) {
    const result = snapshot().scores?.[quiz.id];
    rows.push(el('li', {}, [el('a', { class: 'rx-hub-row', href: '/play/' + quiz.id + '/' }, [
      el('span', { class: 'rx-hub-name', text: quiz.name }),
      el('span', { class: 'rx-hub-note', text: quiz.note }),
      result?.bestTotal ? el('span', { class: 'rx-hub-status', text: 'Best ' + result.best + ' of ' + result.bestTotal }) : null
    ])]));
  }
  return el('section', { class: 'rx-hub-list rx-hub-library', 'aria-labelledby': 'rx-library-title' }, [
    todayBlock,
    el('div', { class: 'rx-hub-group' }, [
      el('h2', { id: 'rx-library-title', text: 'Across the library' }),
      el('ul', {}, rows)
    ])
  ]);
}

// Started last, once every declaration above has run. Safari stops with
// "Cannot access ... before initialization" when a module-level variable
// is assigned (even after an await) before its `let` line has run.
if (hubMount) start();

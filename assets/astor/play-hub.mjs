// The Revise hub, served at /play/.
//
// Shows which quizzes a chosen title can actually support, what the reader has
// scored, and how long their revision streak is. A quiz that a book has no
// material for is not offered: an empty quiz is worse than no link.

import { el, clear } from './util.mjs';
import { loadIndex } from './data.mjs';
import { buildRound } from './questions.mjs';
import { mountChooser, chooseBook } from './chooser.mjs';
import { scores, streak, snapshot, today, isRemembering, recentlyViewed } from './store.mjs';
import { cardId } from './data.mjs';

const BOOK_GAMES = [
  ['who-said-it', 'Who said it?', 'Read a line and name who says it.'],
  ['fill-the-line', 'Fill the line', 'Put the missing words back.'],
  ['theme-match', 'Theme match', 'Match each quotation to its theme.'],
  ['technique-spotter', 'Technique spotter', 'Spot the technique in each quotation.'],
  ['character-identification', 'Who is this?', 'Name the character from a description.'],
  ['order-the-plot', 'Order the plot', 'Put the story back in order.'],
  ['mixed-round', 'Mixed questions', 'A few questions of every kind.']
];

const LIBRARY_GAMES = [
  ['which-book', 'Which book?', 'Name the book a line comes from.'],
  ['context-sprint', 'Which year?', 'Pick the year each event happened.'],
  ['opening-lines', 'Opening lines', 'Name the book from its first sentence.']
];

const TOOLS = [
  ['flashcards', 'Flashcards', 'Learn the key quotations for each book.', 'Quotations'],
  ['essay-forge', 'Essay planner', 'Plan an essay, one paragraph at a time.', 'Planning'],
  ['defend-the-reading', 'Defend the reading', 'Argue for or against a reading of the book.', 'Argument']
];

const statsMount = document.querySelector('#astor-play-stats');
const chooser = document.querySelector('#astor-play-chooser');
const bookMount = document.querySelector('#astor-play-book-games');
const libraryMount = document.querySelector('#astor-play-library-games');
const toolMount = document.querySelector('#astor-play-tools');

if (bookMount) start();

async function start() {
  let index;
  try {
    index = await loadIndex();
  } catch {
    bookMount.append(el('p', { class: 'astor-empty', text: 'The quizzes didn’t load. Try reloading the page.' }));
    return;
  }

  renderStats(index);

  const books = index.books.slice().sort((a, b) => a.title.localeCompare(b.title));
  // If the reader has just been reading something, offer that first.
  const recent = recentlyViewed(20).map(entry => entry.slug).find(slug => books.some(book => book.slug === slug));
  let current = chooseBook(books, recent);

  mountChooser(chooser, {
    books,
    current,
    label: 'Which book?',
    // The tool cards carry the chosen book in their links, so they follow it too.
    onChange: book => { current = book; renderBookGames(book); renderTools(index, () => current); }
  });

  renderBookGames(current);
  renderLibraryGames(index);
  renderTools(index, () => current);
}

function count(gameId, source) {
  try { return buildRound(gameId, source, { length: 999, seed: 1 }).length; } catch { return 0; }
}

function card(href, kind, title, note, stat) {
  return el('a', { class: 'astor-play-card', href }, [
    el('span', { class: 'astor-play-kind', text: kind }),
    el('h3', { text: title }),
    el('p', { text: note }),
    stat ? el('span', { class: 'astor-play-stat', text: stat }) : null
  ]);
}

function bestLine(gameId, bookSlug) {
  const entry = scores()[gameId];
  if (!entry) return '';
  const book = bookSlug ? entry.byBook?.[bookSlug] : null;
  if (book && book.total) return 'Your best: ' + book.best + '/' + book.total;
  if (entry.bestTotal) return 'Your best: ' + entry.best + '/' + entry.bestTotal;
  return '';
}

function renderBookGames(book) {
  clear(bookMount);
  let offered = 0;
  for (const [id, title, note] of BOOK_GAMES) {
    const available = count(id, book);
    if (available < 4) continue;
    offered += 1;
    bookMount.append(card(
      '/play/' + id + '/?book=' + encodeURIComponent(book.slug),
      'Quiz',
      title,
      note,
      [Math.min(10, available) + ' questions', bestLine(id, book.slug)].filter(Boolean).join(' · ')
    ));
  }
  if (!offered) {
    bookMount.append(el('p', { class: 'astor-empty', text: 'No quizzes for ' + book.title + ' yet. Try another book.' }));
  }
}

function renderLibraryGames(index) {
  clear(libraryMount);
  for (const [id, title, note] of LIBRARY_GAMES) {
    const available = count(id, index.books);
    if (available < 4) continue;
    libraryMount.append(card('/play/' + id + '/', 'Quiz · every book', title, note, bestLine(id)));
  }
  libraryMount.append(card('/today/', 'Daily', 'Today’s questions', 'Five quick questions. New every day.', 'Share your score'));
  if (!libraryMount.children.length) {
    libraryMount.append(el('p', { class: 'astor-empty', text: 'The library quizzes aren’t ready yet.' }));
  }
}

function renderTools(index, currentBook) {
  clear(toolMount);
  const cards = snapshot().cards || {};
  const day = today();
  for (const [slug, title, note, kind] of TOOLS) {
    const book = currentBook();
    let stat = '';
    if (slug === 'flashcards') {
      const ids = book.quotations.map(quotation => cardId(book.slug, quotation.id));
      const studied = isRemembering() ? ids.map(id => cards[id]).filter(Boolean) : [];
      const due = studied.filter(entry => entry.due <= day).length;
      stat = !studied.length ? ids.length + ' cards for ' + book.title
        : due ? due + ' to review today' : 'Nothing to review today';
    }
    if (slug === 'essay-forge') stat = (book.essayQuestions?.length || 0) + ' questions for ' + book.title;
    toolMount.append(card('/play/' + slug + '/?book=' + encodeURIComponent(book.slug), kind, title, note, stat));
  }
}

function renderStats(index) {
  if (!statsMount) return;
  clear(statsMount);
  const run = streak();
  const done = Object.values(scores()).reduce((total, entry) => total + entry.played, 0);
  const revised = new Set(Object.values(scores()).flatMap(entry => Object.keys(entry.byBook || {}))).size;

  const tiles = [
    ['Days in a row', run.live && run.current ? String(run.current) : '0', run.live && run.current
      ? 'Your longest run is ' + run.longest + '.'
      : 'Do one quiz today to start a run.'],
    ['Quizzes done', String(done), done ? 'on this device.' : 'None yet. Choose a book below.'],
    ['Books revised', String(revised), revised ? 'with at least one quiz done.' : 'Choose one below to start.']
  ];

  if (!isRemembering()) {
    tiles[0] = ['Days in a row', '—', 'Browser storage is switched off here, so nothing can be remembered between visits.'];
  }

  for (const [label, value, note] of tiles) {
    statsMount.append(el('div', { class: 'astor-dash-tile' }, [
      el('b', { text: label }),
      el('strong', { text: value }),
      el('small', { text: note })
    ]));
  }
}

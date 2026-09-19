// The Play & revise hub.
//
// Shows which games a chosen title can actually support, what the reader has
// scored, and how long their revision streak is. A game that a book has no
// material for is not offered: an empty round is worse than no link.

import { el, clear } from './util.mjs';
import { loadIndex } from './data.mjs';
import { buildRound } from './questions.mjs';
import { mountChooser, chooseBook } from './chooser.mjs';
import { scores, streak, deckSummary, isRemembering, recentlyViewed } from './store.mjs';
import { cardId } from './data.mjs';

const BOOK_GAMES = [
  ['who-said-it', 'Who said it?', 'A line appears without its speaker. Name who says it.'],
  ['fill-the-line', 'Fill the line', 'Words are taken out of a speech. Put them back.'],
  ['theme-match', 'Theme match', 'Decide which theme a quotation carries.'],
  ['technique-spotter', 'Technique spotter', 'Name the device doing the work.'],
  ['character-identification', 'Who is this?', 'A character described without being named.'],
  ['order-the-plot', 'Order the plot', 'Put the acts and scenes back into sequence.']
];

const LIBRARY_GAMES = [
  ['which-book', 'Which book?', 'One line, every title. Name where it comes from.'],
  ['context-sprint', 'Context sprint', 'Place an event in the right year, against near misses.'],
  ['opening-lines', 'Opening lines', 'Name the book from its first sentence.']
];

const TOOLS = [
  ['flashcards', 'Flashcards', 'Spaced repetition over a title’s quotations.', 'Spaced repetition'],
  ['essay-forge', 'Essay forge', 'Build a plan paragraph by paragraph from real questions.', 'Planning'],
  ['defend-the-reading', 'Defend the reading', 'Argue one reading against the strongest case on the other side.', 'Argument']
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
    bookMount.append(el('p', { class: 'astor-empty', text: 'The games could not load their material. Reload the page, or read the same quotations on the book pages.' }));
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
    label: 'Revise which book?',
    onChange: book => { current = book; renderBookGames(book); }
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
      title === 'Order the plot' ? 'Sequencing' : 'Game',
      title,
      note,
      [available + ' questions ready', bestLine(id, book.slug)].filter(Boolean).join(' · ')
    ));
  }
  if (!offered) {
    bookMount.append(el('p', { class: 'astor-empty', text: book.title + ' does not yet carry enough material for a round. Try another title.' }));
  }
}

function renderLibraryGames(index) {
  clear(libraryMount);
  for (const [id, title, note] of LIBRARY_GAMES) {
    const available = count(id, index.books);
    if (available < 4) continue;
    libraryMount.append(card('/play/' + id + '/', 'Whole library', title, note, [available + ' questions ready', bestLine(id)].filter(Boolean).join(' · ')));
  }
  libraryMount.append(card('/today/', 'Daily', 'The Daily Five', 'Five questions, the same for everybody, changing at midnight.', 'Shareable result'));
  if (!libraryMount.children.length) {
    libraryMount.append(el('p', { class: 'astor-empty', text: 'The library games need a few more titles before they are worth playing.' }));
  }
}

function renderTools(index, currentBook) {
  clear(toolMount);
  for (const [slug, title, note, kind] of TOOLS) {
    const book = currentBook();
    let stat = '';
    if (slug === 'flashcards' && isRemembering()) {
      const deck = deckSummary(book.quotations.map(quotation => cardId(book.slug, quotation.id)));
      stat = deck.due + ' of ' + deck.total + ' due today';
    }
    if (slug === 'essay-forge') stat = (book.essayQuestions?.length || 0) + ' questions for ' + book.title;
    toolMount.append(card('/play/' + slug + '/?book=' + encodeURIComponent(book.slug), kind, title, note, stat));
  }
}

function renderStats(index) {
  if (!statsMount) return;
  clear(statsMount);
  const run = streak();
  const played = Object.values(scores()).reduce((total, entry) => total + entry.played, 0);

  // Count the questions rather than estimating them: the builders are cheap to
  // run and a made-up total would be the one number on the page nobody checked.
  let available = 0;
  for (const [id] of [...BOOK_GAMES, ...LIBRARY_GAMES]) {
    if (LIBRARY_GAMES.some(game => game[0] === id)) available += count(id, index.books);
    else for (const book of index.books) available += count(id, book);
  }

  const tiles = [
    ['Revision streak', run.live && run.current ? String(run.current) : '0', run.live && run.current
      ? 'day' + (run.current === 1 ? '' : 's') + ' in a row. Longest: ' + run.longest + '.'
      : 'Play a round today to start one.'],
    ['Rounds played', String(played), played ? 'on this device.' : 'Nothing yet — start anywhere below.'],
    ['Questions available', available.toLocaleString('en-GB'), 'generated from ' + index.counts.quotations.toLocaleString('en-GB') + ' checked quotations across ' + index.counts.books + ' titles.'],
    ['Titles with games', String(index.counts.books), 'and every one of them adds nine more rounds.']
  ];

  if (!isRemembering()) {
    tiles[0] = ['Revision streak', '—', 'Browser storage is switched off here, so nothing can be remembered between visits.'];
  }

  for (const [label, value, note] of tiles) {
    statsMount.append(el('div', { class: 'astor-dash-tile' }, [
      el('b', { text: label }),
      el('strong', { text: value }),
      el('small', { text: note })
    ]));
  }
}

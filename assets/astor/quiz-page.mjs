// Drives every page under /play/<quiz>/.
//
// A book quiz loads the small revise index for the running head and the
// "Change book" list, then fetches only the chosen book's record. Ten
// questions (/play/mixed-round/) builds its round from the reader's own lines:
// the ones that are due first, then the ones not met yet. The library quizzes
// still read the whole study index, because their questions come from every
// book.

import { el, clear } from './util.mjs';
import { loadIndex } from './data.mjs';
import { buildRound, GAME_BUILDERS } from './questions.mjs';
import { recentlyViewed } from './store.mjs';
import { QuizRound, emptyState } from './quiz-round.mjs';
import {
  loadShelf, loadBook, drawing, setAccent, bookSwitcher, keepAddress, preferredSlug,
  sessionPlan, nextStep, availableQuizzes
} from './revise-kit.mjs';

const mount = document.querySelector('#astor-game');
const head = document.querySelector('#rv-head-book');
if (mount) start(mount);

async function start(container) {
  const gameId = container.dataset.game;
  const scope = container.dataset.scope;
  if (!GAME_BUILDERS[gameId]) return emptyState(container, 'That quiz isn’t available.');
  container.append(el('p', { class: 'rv-loading', text: 'Setting out the questions…' }));

  if (scope === 'library') {
    let index;
    try { index = await loadIndex(); } catch {
      return emptyState(container, 'The quiz didn’t load. Try reloading the page.', [{ href: '/play/', label: 'More revision' }]);
    }
    return runLibrary(container, gameId, index);
  }

  let shelf;
  try { shelf = await loadShelf(); } catch {
    return emptyState(container, 'The quiz didn’t load. Try reloading the page.', [{ href: '/library/', label: 'Browse the catalogue' }]);
  }
  const wanted = preferredSlug();
  const first = shelf.books.find(book => book.slug === wanted)
    || shelf.books.find(book => recentlyViewed(20).some(entry => entry.slug === book.slug))
    || shelf.books.find(book => book.slug === 'macbeth')
    || shelf.books[0];
  runBook(container, gameId, shelf, first);
}

let round = null;
let generation = 0;

async function runBook(container, gameId, shelf, meta) {
  // A slow book must not overwrite a quicker, later choice.
  const ticket = ++generation;
  round?.stop();
  keepAddress(meta.slug);
  setAccent(document.querySelector('main'), meta);
  drawHead(gameId, shelf, meta, choice => runBook(container, gameId, shelf, choice));

  let book;
  try { book = await loadBook(meta.slug); } catch {
    if (ticket !== generation) return;
    return emptyState(container, 'That book didn’t load. Try reloading the page.', [{ href: '/play/', label: 'More revision' }]);
  }
  if (ticket !== generation) return;

  const build = () => gameId === 'mixed-round'
    ? sessionPlan(book).questions
    : buildRound(gameId, book, { length: 10 });
  const questions = build();
  if (questions.length < 4) {
    const others = availableQuizzes(book).filter(quiz => quiz.id !== gameId).slice(0, 2);
    return emptyState(container, 'There aren’t enough questions of this kind for ' + book.title + '. Try another quiz on it, or another book.', [
      ...others.map(quiz => ({ href: '/play/' + quiz.id + '/?book=' + encodeURIComponent(book.slug), label: quiz.name })),
      { href: '/play/?book=' + encodeURIComponent(book.slug), label: 'All revision' }
    ]);
  }

  clear(container);
  round?.stop();
  round = new QuizRound(container, questions, {
    gameId,
    book,
    meta,
    reshuffle: build,
    next: current => nextStep(current, { exclude: gameId })
  });
  round.start();
}

function drawHead(gameId, shelf, meta, onChoose) {
  if (!head) return;
  clear(head);
  const recent = recentlyViewed(20).map(entry => entry.slug);
  head.append(
    drawing(meta.motif, 22, 'rv-head-motif'),
    el('a', { class: 'rv-head-title', href: '/play/?book=' + encodeURIComponent(meta.slug), text: meta.title }),
    el('span', { class: 'rv-head-author', text: meta.author }),
    bookSwitcher(shelf.books, meta, recent, onChoose)
  );
}

function runLibrary(container, gameId, index) {
  const build = () => buildRound(gameId, index.books, { length: 10 });
  const questions = build();
  if (questions.length < 4) {
    return emptyState(container, 'This quiz isn’t ready yet. Try another one.', [{ href: '/play/', label: 'More revision' }]);
  }
  if (head) head.remove();
  clear(container);
  round = new QuizRound(container, questions, {
    gameId,
    reshuffle: build
  });
  round.start();
}

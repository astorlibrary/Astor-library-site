// Drives every page under /play/<game>/.
//
// The page declares which game it is and whether it takes one book or the
// whole library; everything else — building the round, the chooser, the
// keyboard, the scoring, the end screen — is shared.

import { el, clear } from './util.mjs';
import { loadIndex } from './data.mjs';
import { buildRound, GAME_BUILDERS } from './questions.mjs';
import { Round, emptyState } from './engine.mjs';
import { mountChooser, chooseBook } from './chooser.mjs';

const mount = document.querySelector('#astor-game');
if (mount) start(mount);

async function start(container) {
  const gameId = container.dataset.game;
  const scope = container.dataset.scope;
  const builder = GAME_BUILDERS[gameId];
  if (!builder) return emptyState(container, 'That game is not available.');

  container.append(el('p', { class: 'astor-inline-note', text: 'Loading the material…' }));

  let index;
  try {
    index = await loadIndex();
  } catch {
    return emptyState(container, 'The study material could not be loaded just now. Reload the page, or read the same quotations on the book pages.', [
      { href: '/library/', label: 'Browse the catalogue' }
    ]);
  }

  if (scope === 'library') return runLibrary(container, gameId, index);
  return runBook(container, gameId, index);
}

function playable(gameId, book) {
  return buildRound(gameId, book, { length: 4, seed: 1 }).length >= 4;
}

function runBook(container, gameId, index) {
  const books = index.books
    .filter(book => playable(gameId, book))
    .sort((a, b) => a.title.localeCompare(b.title));

  if (!books.length) {
    return emptyState(container, 'No title yet carries enough material for this game. It appears as soon as a book’s record does.', [
      { href: '/play/', label: 'Other games' }
    ]);
  }

  const chooser = document.querySelector('#astor-game-chooser');
  let round = null;

  function play(book) {
    round?.stop();
    clear(container);
    const questions = buildRound(gameId, book, { length: 10 });
    round = new Round(container, questions, {
      gameId,
      bookSlug: book.slug,
      reshuffle: () => buildRound(gameId, book, { length: 10 }),
      endLinks: [
        { href: book.href, label: 'Back to ' + book.title },
        { href: '/play/', label: 'Another game' }
      ]
    });
    round.start();
  }

  mountChooser(chooser, {
    books,
    current: chooseBook(books),
    label: 'Which book?',
    onChange: play
  });
  play(chooseBook(books));
}

function runLibrary(container, gameId, index) {
  const questions = buildRound(gameId, index.books, { length: 10 });
  if (questions.length < 4) {
    return emptyState(container, 'This game needs more titles in the library than currently carry the material. Try one of the single-book games.', [
      { href: '/play/', label: 'Other games' }
    ]);
  }
  clear(container);
  const round = new Round(container, questions, {
    gameId,
    reshuffle: () => buildRound(gameId, index.books, { length: 10 }),
    endLinks: [
      { href: '/today/', label: 'The Daily Five' },
      { href: '/play/', label: 'Another game' }
    ]
  });
  round.start();
}

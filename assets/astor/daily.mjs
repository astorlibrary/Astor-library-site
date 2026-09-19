// Astor today: a passage for the day, a title for the day, an anniversary the
// current year carries, and the Daily Five puzzle.
//
// Everything is chosen from the date itself. Two readers on opposite sides of
// the world run the same arithmetic on the same string and see the same five
// questions, with no server deciding anything and nothing recorded off the
// device.

import { el, clear, seededRandom, hashString, pick, formatDate } from './util.mjs';
import { loadIndex, allQuotations } from './data.mjs';
import { dailyRound, resultGrid, dailyPassage } from './questions.mjs';
import { Round, emptyState } from './engine.mjs';
import { today, dailyResult, recordDaily, streak, isRemembering } from './store.mjs';

const strip = document.querySelector('#astor-daily-strip');
const gameMount = document.querySelector('#astor-daily-game');

if (strip && gameMount) start();

async function start() {
  let index;
  try {
    index = await loadIndex();
  } catch {
    strip.remove();
    return emptyState(gameMount, 'Today’s material could not be loaded. The Passage Room has ninety close readings that need nothing but a browser.', [
      { href: '/passage-room/', label: 'Open the Passage Room' }
    ]);
  }

  const day = today();
  renderStrip(index, day);
  renderPuzzle(index, day);
}

function renderStrip(index, day) {
  clear(strip);
  const random = seededRandom(hashString('astor-strip:' + day));
  const quotations = allQuotations(index);
  const year = new Date().getFullYear();

  if (quotations.length) {
    const quotation = dailyPassage(index, day);
    strip.append(el('section', {}, [
      el('h2', { text: 'Passage of the day' }),
      el('blockquote', {}, [el('p', { text: quotation.text })]),
      el('p', { class: 'astor-quote-attribution', text: (quotation.speaker ? quotation.speaker + ' · ' : '') + quotation.bookTitle + ' ' + quotation.reference }),
      el('p', { text: quotation.analysis }),
      el('p', {}, [el('a', { href: quotation.bookHref, text: 'Read ' + quotation.bookTitle + ' →' })])
    ]));
  }

  const book = pick(index.books, random);
  strip.append(el('section', {}, [
    el('h2', { text: 'A book for today' }),
    el('blockquote', {}, [el('p', { text: book.title })]),
    el('p', { text: book.summary }),
    el('p', {}, [el('a', { href: book.href, text: 'Open the study toolkit →' })])
  ]));

  // Year-level anniversaries only: the records hold the year a thing happened,
  // not the day, so the page says "this year" rather than "on this day".
  const anniversaries = index.books
    .flatMap(entry => (entry.timeline || []).map(event => ({ ...event, book: entry })))
    .filter(event => year - event.year > 0 && (year - event.year) % 25 === 0);
  if (anniversaries.length) {
    const event = pick(anniversaries, random);
    const distance = year - event.year;
    strip.append(el('section', {}, [
      el('h2', { text: 'An anniversary this year' }),
      el('blockquote', {}, [el('p', { text: distance + ' years' })]),
      el('p', { text: event.year + ': ' + event.label + (event.detail ? '. ' + event.detail : '.') }),
      el('p', {}, [el('a', { href: event.book.href, text: 'Read ' + event.book.title + ' →' })])
    ]));
  }

  strip.append(el('section', {}, [
    el('h2', { text: 'The date' }),
    el('blockquote', {}, [el('p', { text: formatDate(new Date()) })]),
    el('p', { text: 'Everything on this page changes at midnight, and everybody sees the same thing. Nothing here is chosen for you in particular.' })
  ]));
}

function renderPuzzle(index, day) {
  const questions = dailyRound(index, day);
  if (questions.length < 3) {
    return emptyState(gameMount, 'The library needs a few more titles before the Daily Five is worth playing. The single-book games are ready now.', [
      { href: '/play/', label: 'Play & revise' }
    ]);
  }

  const already = dailyResult(day);
  if (already) return renderDone(already, questions.length, day);

  clear(gameMount);
  const round = new Round(gameMount, questions, {
    gameId: 'daily',
    onFinish: result => {
      const marks = result.answers.slice();
      if (isRemembering()) recordDaily({ score: result.score, total: result.total, marks }, day);
      window.setTimeout(() => renderDone({ score: result.score, total: result.total, marks }, result.total, day), 0);
    },
    endLinks: [{ href: '/play/', label: 'More games' }]
  });
  round.start();
}

function renderDone(result, total, day) {
  clear(gameMount);
  const grid = resultGrid(result.marks || []);
  const run = streak();

  const panel = el('div', { class: 'astor-game-end' });
  panel.append(el('p', { class: 'kicker', text: 'The Daily Five · ' + day }));
  panel.append(el('h2', { text: result.score + ' out of ' + (result.total || total) }));
  panel.append(el('p', { class: 'astor-share-grid', text: grid }));
  panel.append(el('p', {
    class: 'astor-game-end-note',
    text: run.live && run.current
      ? 'That is ' + run.current + ' day' + (run.current === 1 ? '' : 's') + ' in a row. A new five arrives at midnight.'
      : 'A new five arrives at midnight.'
  }));

  const shareText = 'Astor Library — The Daily Five, ' + day + '\n' + grid + ' ' + result.score + '/' + (result.total || total) + '\nhttps://astorlibrary.com/today/';
  const row = el('div', { class: 'button-row' });
  const share = el('button', { class: 'button primary', type: 'button', text: 'Copy your result' });
  share.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      share.textContent = 'Copied';
    } catch {
      share.textContent = 'Select the grid above to copy it';
    }
  });
  row.append(share);
  row.append(el('a', { class: 'button secondary', href: '/play/', text: 'Play something else' }));
  row.append(el('a', { class: 'button secondary', href: '/my-library/', text: 'My library' }));
  panel.append(row);
  panel.append(el('p', { class: 'astor-inline-note', text: 'The grid gives nothing away: a filled square is a right answer, an empty one is not.' }));
  gameMount.append(panel);
}

// Astor today: five questions, the same for everyone, then a passage for the
// day, a title for the day and an anniversary the current year carries.
//
// Everything is chosen from the date itself. Two readers on opposite sides of
// the world run the same arithmetic on the same string and see the same five
// questions, with no server deciding anything and nothing recorded off the
// device.

import { el, clear, seededRandom, hashString, pick, formatDate, describeError } from './util.mjs';
import { loadIndex, allQuotations } from './data.mjs';
import { dailyRound, resultGrid, dailyPassage } from './questions.mjs';
import { QuizRound, emptyState, kindOf, completion, celebrate } from './quiz-round.mjs';
import { today, dailyResult, recordDaily, streak, isRemembering, dailyHistory } from './store.mjs';
import { loadShelf, coverImage, drawing, clip, shortTitle } from './revise-kit.mjs';

const head = document.querySelector('#astor-today-head');
const strip = document.querySelector('#astor-daily-strip');
const gameMount = document.querySelector('#astor-daily-game');

const KIND_NAMES = { who: 'Who said it?', book: 'Which book?', theme: 'Theme match', cloze: 'Fill the line', context: 'Which year?', character: 'Who is this?', technique: 'Technique', opening: 'Opening lines' };
const KIND_ICONS = { who: 'who-said-it', book: 'which-book', theme: 'theme-match', cloze: 'fill-the-line', context: 'context-sprint', character: 'character-identification', technique: 'technique-spotter', opening: 'opening-lines' };

let shelf = { books: [], icons: {} };

if (strip && gameMount) start();

async function start() {
  let index;
  try {
    [index, shelf] = await Promise.all([loadIndex(), loadShelf().catch(() => shelf)]);
  } catch (error) {
    strip.remove();
    return emptyState(gameMount, 'Today’s questions didn’t load. Try reloading the page, or read a close reading in the Passage Room.', [
      { href: '/passage-room/', label: 'Open the Passage Room' }
    ], describeError(error));
  }

  const day = today();
  renderHead(day);
  renderPuzzle(index, day);
  renderStrip(index, day);
}

function renderHead(day) {
  if (!head) return;
  clear(head);
  const now = new Date();
  const run = streak();
  head.append(el('div', { class: 'rx-almanac' }, [
    el('p', { class: 'rx-almanac-kicker', text: 'Astor today' }),
    el('h1', { class: 'rx-almanac-date' }, [
      el('span', { class: 'rx-almanac-day', text: now.toLocaleDateString('en-GB', { weekday: 'long' }) }),
      el('span', { text: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) })
    ]),
    el('p', { class: 'rx-almanac-deck', text: 'Five questions, the same for everyone today.' }),
    run.live && run.current >= 2 ? el('p', { class: 'rx-almanac-streak', text: run.current + ' days of revision running' }) : null
  ]));
  void day;
}

function renderPuzzle(index, day) {
  const questions = dailyRound(index, day);
  if (questions.length < 3) {
    return emptyState(gameMount, 'Not enough books yet. Try a quiz on one book.', [{ href: '/play/', label: 'Revise' }]);
  }
  const already = dailyResult(day);
  if (already) return renderDone(already, questions, day);

  clear(gameMount);
  const kinds = el('ol', { class: 'rx-daily-kinds' });
  questions.forEach((question, position) => {
    const kind = kindOf(question);
    kinds.append(el('li', {}, [
      el('span', { class: 'rx-daily-num', text: String(position + 1) }),
      drawing(shelf.icons[KIND_ICONS[kind]] || '', 20),
      el('span', { text: KIND_NAMES[kind] || 'Question' })
    ]));
  });
  const begin = el('button', { class: 'rx-button is-primary is-wide', type: 'button', text: 'Begin today’s five', onclick: () => play(index, questions, day) });
  gameMount.append(el('section', { class: 'rx-daily-start' }, [
    el('div', {}, [
      el('p', { class: 'rx-eyebrow', text: 'The Daily Five' }),
      el('h2', { text: 'Five questions. Two minutes.' }),
      el('p', { class: 'rx-daily-note', text: 'One go each, no hints.' })
    ]),
    kinds,
    begin
  ]));
}

function play(index, questions, day) {
  clear(gameMount);
  const round = new QuizRound(gameMount, questions, {
    gameId: 'daily',
    ownEnd: true,
    noHints: true,
    icons: shelf.icons,
    catalogue: new Map(shelf.books.map(book => [book.title, book])),
    onFinish: result => {
      const marks = result.answers.slice();
      if (isRemembering()) recordDaily({ score: result.score, total: result.total, marks }, day);
      window.setTimeout(() => { round.stop(); renderDone({ score: result.score, total: result.total, marks }, questions, day); }, 0);
    }
  });
  round.start();
  gameMount.scrollIntoView({ block: 'start' });
}

function renderDone(result, questions, day) {
  clear(gameMount);
  const total = result.total || questions.length;
  const grid = resultGrid(result.marks || []);
  const run = streak();

  const squares = el('ol', { class: 'rx-daily-result', 'aria-label': result.score + ' right out of ' + total });
  (result.marks || []).forEach((mark, position) => {
    const kind = kindOf(questions[position]);
    squares.append(el('li', { class: mark ? 'is-right' : 'is-wrong' }, [
      el('span', { class: 'rx-daily-square', 'aria-hidden': 'true', text: mark ? '✓' : '✗' }),
      el('span', { text: KIND_NAMES[kind] || 'Question ' + (position + 1) })
    ]));
  });

  const history = dailyHistory() || {};
  const week = Object.keys(history).sort().slice(-7).map(key => ({ day: key, ...history[key] }));

  const panel = el('section', { class: 'rx-daily-done' }, [
    completion({
      score: result.score, total,
      kicker: 'Today’s five · ' + formatDate(new Date()),
      title: result.score === total ? 'All five. Superb.' : result.score >= 3 ? 'A good day.' : 'Done for today.',
      chips: [run.live && run.current >= 2 ? run.current + '-day streak' : '', 'New questions at midnight'].filter(Boolean)
    }),
    squares
  ]);
  if (week.length >= 2) {
    panel.append(el('p', { class: 'rx-daily-week' }, [el('span', { class: 'rx-label', text: 'Your recent days' }), ...week.map(entry => el('span', { class: 'rx-daily-day', title: entry.day + ': ' + entry.score + ' of ' + (entry.total || 5), text: entry.score + '/' + (entry.total || 5) }))]));
  }

  const shareText = 'Astor Library — today’s questions, ' + day + '\n' + grid + ' ' + result.score + '/' + total + '\nhttps://astorlibrary.com/today/';
  const share = el('button', { class: 'rx-button is-primary', type: 'button', text: 'Copy your result' });
  share.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(shareText); share.textContent = 'Copied'; }
    catch { share.textContent = 'Select the grid to copy it'; }
  });
  panel.append(el('div', { class: 'rx-results-actions' }, [
    share,
    el('a', { class: 'rx-button is-secondary', href: '/play/', text: 'Revise a book' })
  ]));
  gameMount.append(panel);
  panel.querySelector('.rx-results-title')?.focus({ preventScroll: true });
  celebrate(panel);
}

function renderStrip(index, day) {
  clear(strip);
  strip.className = 'rx-today-grid';
  const random = seededRandom(hashString('astor-strip:' + day));
  const quotations = allQuotations(index);
  const year = new Date().getFullYear();
  const metaFor = slug => shelf.books.find(book => book.slug === slug);

  if (quotations.length) {
    const quotation = dailyPassage(index, day);
    const meta = metaFor(quotation.bookSlug);
    strip.append(el('section', { class: 'rx-today-card is-passage', style: meta?.accent ? '--book-accent:' + meta.accent : null }, [
      el('p', { class: 'rx-eyebrow', text: 'Passage of the day' }),
      el('blockquote', {}, [el('p', { text: quotation.text })]),
      el('p', { class: 'rx-today-cite', text: [quotation.speaker, quotation.bookTitle, quotation.reference].filter(Boolean).join(' · ') }),
      el('p', { class: 'rx-today-body', text: quotation.analysis }),
      el('p', { class: 'rx-links' }, [
        el('a', { href: quotation.bookHref + '#astor-quote-' + quotation.id, text: 'See it in the book →' }),
        meta ? el('a', { href: '/play/?book=' + encodeURIComponent(meta.slug), text: 'Revise ' + shortTitle(meta) + ' →' }) : null
      ])
    ]));
  }

  const book = pick(index.books, random);
  const bookMeta = metaFor(book.slug);
  strip.append(el('section', { class: 'rx-today-card is-book', style: bookMeta?.accent ? '--book-accent:' + bookMeta.accent : null }, [
    el('p', { class: 'rx-eyebrow', text: 'A book for today' }),
    el('div', { class: 'rx-today-book' }, [
      bookMeta ? el('a', { class: 'rx-today-cover', href: book.href, 'aria-hidden': 'true', tabindex: '-1' }, [coverImage(bookMeta, { width: 96 })]) : null,
      el('div', {}, [
        el('h2', { text: book.title }),
        el('p', { class: 'rx-today-author', text: book.author }),
        el('p', { class: 'rx-today-body', text: clip(book.summary, 220) })
      ])
    ]),
    el('p', { class: 'rx-links' }, [
      el('a', { href: book.href, text: 'Open the book →' }),
      bookMeta ? el('a', { href: '/play/?book=' + encodeURIComponent(book.slug), text: 'Revise it →' }) : null
    ])
  ]));

  // Year-level anniversaries only: the records hold the year a thing happened,
  // not the day, so the page says "this year" rather than "on this day".
  const anniversaries = index.books
    .flatMap(entry => (entry.timeline || []).map(event => ({ ...event, book: entry })))
    .filter(event => year - event.year > 0 && (year - event.year) % 25 === 0);
  if (anniversaries.length) {
    const event = pick(anniversaries, random);
    const distance = year - event.year;
    strip.append(el('section', { class: 'rx-today-card is-anniversary' }, [
      el('p', { class: 'rx-eyebrow', text: 'An anniversary this year' }),
      el('p', { class: 'rx-today-big' }, [el('b', { text: String(distance) }), el('span', { text: 'years' })]),
      el('p', { class: 'rx-today-body' }, [el('b', { text: event.year + '. ' }), event.label + (event.detail ? '. ' + event.detail : '.')]),
      el('p', { class: 'rx-links' }, [el('a', { href: event.book.href, text: shortTitle(event.book) + ' →' })])
    ]));
  }
}

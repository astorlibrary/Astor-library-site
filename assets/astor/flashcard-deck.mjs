// Flashcards over a book's key lines, ten at a time, in three ways of working.
//
//   Recall     the line is on the front; say who speaks it, where it comes and
//              what it is doing, then turn the card.
//   Complete   the speaker, the moment and the first words are on the front;
//              say the rest of the line, then turn the card.
//   Memorise   the line is shown whole, then with more and more of its words
//              reduced to their first letter, until it can be said from the
//              letters alone. The way actors learn a speech.
//
// However a card is worked, the reader marks themselves honestly and the line
// moves through the same five boxes store.mjs keeps for every line, so a line
// missed in a quiz is due here too. Lines that are due come first, then lines
// not met yet.
//
// Keyboard: Space or Enter turns the card (or hides more words), the right
// arrow says "Got it", the left arrow "Not yet". On a touch screen a turned
// card can be swiped right or left.

import { el, clear, shuffle, announce, seededRandom, hashString } from './util.mjs';
import { isRemembering, reviewCard, snapshot, today, toggleCommonplace, inCommonplace, recentlyViewed } from './store.mjs';
import { completion } from './quiz-round.mjs';
import {
  loadFailed,
  loadShelf, loadBook, setAccent, keepAddress, preferredSlug, studyBar,
  bookLines, lineSummary, lineState, STATE_WORDS, cardId, activityHref, quoted, inline, clip
} from './revise-kit.mjs';

const mount = document.querySelector('#astor-flashcards');
const head = document.querySelector('#rv-head-book');
const SITTING = 10;
const MODE_KEY = 'astor-flashcard-mode';

const MODES = [
  { id: 'recall', name: 'Recall', note: 'Name who says it',
    help: 'Read the line. Say who speaks it, when it comes and why it matters, then turn the card to check.' },
  { id: 'complete', name: 'Complete', note: 'Finish the line',
    help: 'You get the moment and the first few words. Say the rest of the line aloud, then turn to check it word for word.' },
  { id: 'memorise', name: 'Memorise', note: 'Learn it by heart',
    help: 'Read the line aloud, then hide more of it each time until the first letters are enough. Tap a hidden word to peek.' }
];
const MEMORISE_PROMPTS = [
  'Read it aloud, twice.',
  'Say it in full. A third of the words are hidden.',
  'Again. Two thirds are hidden now.',
  'Only first letters. Can you say it all?'
];

const BOXES = [
  { label: 'Not met', note: 'new' },
  { label: 'Box 1', note: 'daily' },
  { label: 'Box 2', note: 'every 2 days' },
  { label: 'Box 3', note: 'every 4 days' },
  { label: 'Box 4', note: 'every 8 days' },
  { label: 'Box 5', note: 'every 16 days' }
];

function savedMode() {
  try { return MODES.some(mode => mode.id === window.localStorage.getItem(MODE_KEY)) ? window.localStorage.getItem(MODE_KEY) : 'recall'; } catch { return 'recall'; }
}
function saveMode(id) {
  try { window.localStorage.setItem(MODE_KEY, id); } catch { /* optional */ }
}


let keyHandler = null;

async function start() {
  mount.append(el('p', { class: 'rv-loading', text: 'Shuffling the deck…' }));
  let shelf;
  try { shelf = await loadShelf(); } catch (error) {
    loadFailed(mount, 'The cards didn’t load.', error);
    return;
  }
  const books = shelf.books.filter(book => book.quotations >= 5);
  if (!books.length) {
    loadFailed(mount, 'No books have flashcards yet.', null, 'Try again later.');
    return;
  }
  const wanted = preferredSlug();
  const first = books.find(book => book.slug === wanted)
    || books.find(book => recentlyViewed(20).some(entry => entry.slug === book.slug))
    || books.find(book => book.slug === 'macbeth')
    || books[0];
  open(shelf, books, first);
}

let generation = 0;

async function open(shelf, books, meta) {
  const ticket = ++generation;
  keepAddress(meta.slug);
  setAccent(document.querySelector('main'), meta);
  studyBar(head, { books, meta, active: 'flashcards', onChoose: choice => open(shelf, books, choice) });
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  clear(mount);
  mount.append(el('p', { class: 'rv-loading', text: 'Opening ' + meta.title + '…' }));
  let book;
  try { book = await loadBook(meta.slug); } catch (error) {
    if (ticket !== generation) return;
    loadFailed(mount, 'That deck didn’t load.', error);
    return;
  }
  if (ticket !== generation || book.slug !== meta.slug) return;
  sitting(book, meta, savedMode());
}

function queueFor(book) {
  const lines = bookLines(book, snapshot().cards || {}, today());
  const due = lines.filter(line => line.due).sort((a, b) => a.card.box - b.card.box);
  const fresh = shuffle(lines.filter(line => line.state === 'new'));
  const rest = lines.filter(line => !line.due && line.state !== 'new').sort((a, b) => a.card.box - b.card.box);
  const waiting = due.length + fresh.length;
  const chosen = (waiting ? [...due, ...fresh] : rest).slice(0, SITTING);
  return { queue: chosen.map(line => line.quotation), waiting, anyway: !waiting };
}

// Where the book's lines stand in the five boxes, as one line of figures, so a
// student can watch lines travel from "not met" to "every sixteen days".
function boxShelf(book) {
  const cards = snapshot().cards || {};
  const counts = [0, 0, 0, 0, 0, 0];
  for (const quotation of book.quotations) {
    const card = cards[cardId(book.slug, quotation.id)];
    counts[card ? Math.min(card.box, 4) + 1 : 0] += 1;
  }
  const total = book.quotations.length;
  return el('dl', { class: 'rx-boxes', 'aria-label': 'Where the ' + total + ' lines are in the five boxes' },
    BOXES.map((box, index) => el('div', {}, [el('dt', {}, [box.label, el('small', { text: box.note })]), el('dd', { text: String(counts[index]) })])));
}

// `only`, when given, is a set of lines to work through instead of the usual
// queue: the ones just missed, for example, which are not due until tomorrow.
function sitting(book, meta, mode, only = null) {
  const live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
  const planned = queueFor(book);
  const queue = only && only.length ? only : planned.queue;
  const waiting = planned.waiting;
  const anyway = !only && planned.anyway;
  let position = 0;
  let turned = false;
  let step = 0;          // Memorise: how many rounds of hiding so far
  let reviewed = 0;
  let knew = 0;
  const results = [];

  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : document.body;
    if (target !== document.body && !mount.contains(target)) return;
    if (target.closest('input, textarea, select, dialog')) return;
    if (position >= queue.length) return;
    if ((event.key === ' ' || event.key === 'Enter') && !target.closest('button, a')) {
      event.preventDefault();
      advance();
    } else if (turned && (event.key === 'ArrowRight' || event.key.toLowerCase() === 'k')) {
      event.preventDefault(); answer(true);
    } else if (turned && (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'j')) {
      event.preventDefault(); answer(false);
    }
  };
  document.addEventListener('keydown', keyHandler);

  function advance() {
    if (turned) return;
    if (mode === 'memorise' && step < 3) { step += 1; render(); return; }
    turned = true;
    render();
  }
  function stepBack() {
    if (turned || step === 0) return;
    step -= 1;
    render();
  }

  function modeSwitch() {
    const group = el('div', { class: 'rx-modes', role: 'radiogroup', 'aria-label': 'How to work through the cards' });
    for (const option of MODES) {
      group.append(el('button', {
        type: 'button', role: 'radio', class: 'rx-mode', 'aria-checked': String(option.id === mode),
        onclick: () => { if (option.id === mode) return; saveMode(option.id); sitting(book, meta, option.id); },
        title: option.note, text: option.name
      }));
    }
    return group;
  }
  // What this way of working asks, in a sentence, under the switch.
  function modeHelp() {
    return el('p', { class: 'rx-mode-help', text: MODES.find(option => option.id === mode).help });
  }

  function render() {
    clear(mount);
    mount.append(live);
    if (position >= queue.length) return end();
    const quotation = queue[position];
    const id = cardId(book.slug, quotation.id);
    const state = lineState(snapshot().cards?.[id]);
    const stage = book.structure.find(entry => entry.id === quotation.stage);
    // "Book XII" is said once, not as the part and again as the reference.
    const place = [stage?.label, quotation.reference].filter((part, index, all) => part && all.indexOf(part) === index);
    const where = [quotation.speaker, ...place].filter(Boolean).join(' · ');

    const page = el('div', { class: 'rx-deck', 'data-mode': mode });
    const line = el('span', { class: 'rx-progress-line', 'aria-hidden': 'true' }, [el('i')]);
    line.firstChild.style.width = (100 * position / queue.length) + '%';
    page.append(el('div', { class: 'rx-deck-top' }, [
      modeSwitch(),
      el('div', { class: 'rx-progress' }, [el('p', { class: 'rx-progress-count', text: 'Card ' + (position + 1) + ' of ' + queue.length }), line])
    ]));
    if (position === 0 && step === 0 && !turned) page.append(modeHelp());
    if (anyway && position === 0 && !turned) page.append(el('p', { class: 'rx-deck-note', text: 'Nothing due today — here are lines you’ve met before.' }));

    // The card: a front and a back on one sheet, turned in three dimensions.
    const front = el('div', { class: 'rx-flip-face is-front', 'aria-hidden': String(turned) });
    const back = el('div', { class: 'rx-flip-face is-back', 'aria-hidden': String(!turned) });
    const badge = el('p', { class: 'rx-flip-state is-' + state, text: state === 'new' ? 'A new line' : STATE_WORDS[state].replace(/^./, c => c.toUpperCase()) });
    // Each side opens with one small line: where the line stands, or where it comes from.
    const headRow = left => el('div', { class: 'rx-flip-head' }, [left]);
    const words = quotation.text.split(/\s+/);
    const given = Math.min(4, Math.max(2, Math.floor(words.length / 4)));

    if (mode === 'recall') {
      put(front, headRow(badge),
        el('blockquote', { class: 'rx-flip-line' }, [el('p', { text: quotation.text })]),
        el('p', { class: 'rx-flip-prompt', text: 'Who says it? When? Why does it matter?' }));
    } else if (mode === 'complete') {
      const opening = words.slice(0, given).join(' ');
      put(front, headRow(badge),
        el('p', { class: 'rx-flip-cue', text: where }),
        quotation.context ? el('p', { class: 'rx-flip-context', text: quotation.context }) : null,
        el('blockquote', { class: 'rx-flip-line is-start' }, [el('p', { text: '“' + inline(opening).replace(/^[“"]/, '') + ' …”' })]),
        el('p', { class: 'rx-flip-prompt', text: 'Say the rest aloud, then turn.' }));
    } else {
      put(front, headRow(el('p', { class: 'rx-flip-state', text: 'Step ' + (step + 1) + ' of 4' })),
        el('blockquote', { class: 'rx-flip-line is-memorise' }, [memoriseLine(quotation, step)]),
        el('p', { class: 'rx-flip-prompt', text: MEMORISE_PROMPTS[step] }));
    }

    // The back answers the front: in Recall, who and where; in Complete, the
    // words the reader had to supply, set apart from those they were given.
    const answerLine = mode === 'complete'
      ? el('blockquote', { class: 'rx-flip-line is-answer' }, [el('p', {}, [el('span', { class: 'rx-flip-given', text: words.slice(0, given).join(' ') }), restOf(quotation.text, given)])])
      : el('blockquote', { class: 'rx-flip-line is-answer' }, [el('p', { text: quotation.text })]);
    put(back,
      headRow(el('p', { class: 'rx-flip-where' }, [
        quotation.speaker ? el('b', { text: quotation.speaker }) : null,
        el('span', { text: place.join(' · ') })
      ])),
      mode === 'recall' ? null : answerLine,
      quotation.context && mode === 'recall' ? el('p', { class: 'rx-flip-context', text: quotation.context }) : null,
      el('p', { class: 'rx-flip-analysis', text: quotation.analysis }),
      mode === 'recall' ? el('p', { class: 'rx-flip-small', text: quoted(clip(quotation.text, 80)) }) : null
    );

    // One side of the card at a time: turning it shows the back in its place.
    const card = el('div', { class: 'rx-flip' + (turned ? ' is-turned' : ''), tabindex: '-1', 'aria-label': turned ? 'The answer' : 'The card' }, [
      turned ? back : front
    ]);
    page.append(card);
    if (turned) enableSwipe(card);

    const actions = el('div', { class: 'rx-deck-actions' });
    if (!turned) {
      const label = mode === 'memorise' && step < 3 ? 'Hide more words' : 'Turn the card';
      actions.append(el('button', { class: 'rx-button is-primary', type: 'button', onclick: advance, text: label }));
      if (mode === 'memorise' && step > 0) actions.append(el('button', { class: 'rx-text-button', type: 'button', text: 'Show more words', onclick: stepBack }));
    } else {
      actions.append(
        el('button', { class: 'rx-rate is-not', type: 'button', onclick: () => answer(false) }, [el('b', { text: 'Not yet' }), el('span', { text: 'again tomorrow' })]),
        el('button', { class: 'rx-rate is-got', type: 'button', onclick: () => answer(true) }, [el('b', { text: 'Got it' }), el('span', { text: 'up a box' })])
      );
    }
    page.append(actions);

    const keep = el('button', {
      class: 'rx-text-button rx-keep', type: 'button', 'aria-pressed': String(inCommonplace(id)),
      text: inCommonplace(id) ? 'Saved to your commonplace book' : 'Save this line'
    });
    keep.addEventListener('click', () => {
      const added = toggleCommonplace({ id, text: quotation.text, reference: book.title + ' ' + quotation.reference, book: book.title, bookHref: book.href });
      keep.setAttribute('aria-pressed', String(added));
      keep.textContent = added ? 'Saved to your commonplace book' : 'Save this line';
    });
    page.append(el('p', { class: 'rx-deck-foot' }, [
      keep,
      el('span', { class: 'rx-deck-keys', 'aria-hidden': 'true', text: turned ? '← not yet · got it →' : 'Space to turn' })
    ]));
    mount.append(page);
    // After turning, focus the card so its answer is read before the buttons.
    if (turned) card.focus({ preventScroll: true });
    else if (position > 0 || step > 0) page.querySelector('.rx-deck-actions button')?.focus({ preventScroll: true });
  }

  function enableSwipe(card) {
    let startX = null;
    card.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') { startX = event.clientX; card.setPointerCapture?.(event.pointerId); } });
    card.addEventListener('pointermove', event => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      card.style.transform = 'translateX(' + dx + 'px)';
      card.classList.toggle('is-leaning-got', dx > 60);
      card.classList.toggle('is-leaning-not', dx < -60);
    });
    const release = event => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      startX = null;
      card.style.transform = '';
      card.classList.remove('is-leaning-got', 'is-leaning-not');
      if (dx > 90) answer(true);
      else if (dx < -90) answer(false);
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', () => { startX = null; card.style.transform = ''; });
  }

  function answer(correct) {
    const quotation = queue[position];
    if (!quotation) return;
    if (isRemembering()) reviewCard(cardId(book.slug, quotation.id), correct);
    reviewed += 1;
    results.push(correct);
    if (correct) knew += 1;
    announce(live, correct ? 'Got it. Up a box.' : isRemembering() ? 'Not yet. This one comes back tomorrow.' : 'Not yet.');
    position += 1;
    turned = false;
    step = 0;
    render();
  }

  function end() {
    document.removeEventListener('keydown', keyHandler);
    const counts = lineSummary(bookLines(book, snapshot().cards || {}, today()));
    const left = counts.due + counts.new;
    const missedLines = queue.filter((_, index) => !results[index]);
    const page = el('div', { class: 'rx-results rx-deck-end' });
    page.append(completion({
      score: knew, total: reviewed,
      kicker: 'Flashcards',
      title: knew === reviewed ? 'Every card known.' : knew / reviewed >= 0.7 ? 'Most of these are yours.' : knew / reviewed >= 0.4 ? 'Coming along.' : 'These need another look.',
      sub: (counts.known ? counts.known + ' of the ' + book.quotations.length + ' key lines are known. ' : '') + (left ? left + (left === 1 ? ' line is' : ' lines are') + ' still waiting today.' : 'Nothing else is due today.')
    }));

    const actions = el('div', { class: 'rx-results-actions' });
    if (left) actions.append(el('button', { class: 'rx-button is-primary', type: 'button', text: 'Ten more cards', onclick: () => sitting(book, meta, mode) }));
    if (mode !== 'memorise' && missedLines.length) actions.append(el('button', { class: 'rx-button is-secondary', type: 'button', text: 'Memorise the ones I missed', onclick: () => sitting(book, meta, 'memorise', missedLines) }));
    actions.append(el('a', { class: left ? 'rx-button is-secondary' : 'rx-button is-primary', href: activityHref('mixed-round', book.slug), text: 'Ten questions' }));
    page.append(actions);
    if (missedLines.length) {
      const list = el('ul', { class: 'rx-deck-missed' });
      for (const quotation of missedLines) list.append(el('li', {}, [el('q', { text: quotation.text }), el('span', { text: [quotation.speaker, quotation.reference].filter(Boolean).join(' · ') })]));
      page.append(el('section', { class: 'rx-review', 'aria-labelledby': 'rx-still-title' }, [el('h3', { id: 'rx-still-title', text: 'Still learning' }), list]));
    }
    page.append(el('section', { class: 'rx-review', 'aria-labelledby': 'rx-boxes-title' }, [
      el('h3', { id: 'rx-boxes-title', text: 'Where the ' + book.quotations.length + ' lines stand' }),
      boxShelf(book)
    ]));
    clear(mount);
    mount.append(live, page);
    page.querySelector('.rx-results-title')?.focus({ preventScroll: true });
  }

  if (!queue.length) {
    clear(mount);
    mount.append(el('p', { class: 'rv-empty', text: 'There are no cards for ' + book.title + ' yet.' }));
    return;
  }
  void waiting;
  render();
}

// The line after its first `count` words, with its own spacing and line breaks.
function restOf(text, count) {
  const tokens = text.split(/(\s+)/);
  return tokens.slice(count * 2 - 1).join('');
}

// Element.append writes null as text, so the optional parts go through here.
function put(node, ...parts) {
  node.append(...parts.filter(part => part !== null && part !== undefined && part !== false));
}

// The line with a growing share of its words reduced to their first letter.
// The same words go first every time for one line, so each step builds on the
// last; short function words go last.
const LIGHT = new Set(['a', 'an', 'the', 'and', 'of', 'to', 'in', 'is', 'it', 'i', 'my', 'me', 'o']);
export function memoriseLine(quotation, step) {
  const tokens = quotation.text.split(/(\s+)/);
  const words = tokens.map((token, index) => ({ token, index })).filter(entry => /\p{L}/u.test(entry.token));
  const random = seededRandom(hashString(quotation.id || quotation.text));
  const heavy = shuffle(words.filter(entry => !LIGHT.has(entry.token.toLowerCase().replace(/[^\p{L}]/gu, ''))), random);
  const light = shuffle(words.filter(entry => LIGHT.has(entry.token.toLowerCase().replace(/[^\p{L}]/gu, ''))), random);
  const orderOfHiding = [...heavy, ...light];
  const share = [0, 0.34, 0.67, 1][step] || 0;
  const hidden = new Set(orderOfHiding.slice(0, Math.ceil(orderOfHiding.length * share)).map(entry => entry.index));
  const line = el('p', {});
  tokens.forEach((token, index) => {
    if (!hidden.has(index)) { line.append(token); return; }
    const match = token.match(/^([^\p{L}]*)(\p{L})([\p{L}'’-]*)(.*)$/u);
    if (!match) { line.append(token); return; }
    const [, before, first, rest, after] = match;
    // A hidden word keeps its first letter; tapping it shows the rest for a moment.
    const word = el('button', { type: 'button', class: 'rx-mem-word', 'aria-label': 'Word beginning ' + first + '. Show it', style: '--len:' + Math.max(1, rest.length) }, [
      el('b', { text: first }), el('span', { class: 'rx-mem-rest', 'aria-hidden': 'true', text: rest })
    ]);
    word.addEventListener('click', () => {
      word.classList.add('is-peek');
      word.setAttribute('aria-label', first + rest);
      clearTimeout(word.peekTimer);
      word.peekTimer = setTimeout(() => { word.classList.remove('is-peek'); word.setAttribute('aria-label', 'Word beginning ' + first + '. Show it'); }, 1800);
    });
    line.append(before, word, after);
  });
  return line;
}

// Started last, once every declaration above has run (see revise-hub.mjs).
if (mount) start();

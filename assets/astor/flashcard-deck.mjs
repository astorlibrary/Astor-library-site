// Flashcards over a book's key lines, ten at a time.
//
// The card shows a line; the reader recalls who says it, where it comes and
// what it is doing, then turns the card and marks themselves honestly. Lines
// that are due come first, then lines not met yet. The schedule is the one
// store.mjs keeps for every line, so a line missed in a quiz is due here too.

import { el, clear, shuffle, announce, prefersReducedMotion } from './util.mjs';
import { isRemembering, reviewCard, snapshot, today, toggleCommonplace, inCommonplace } from './store.mjs';
import { recentlyViewed } from './store.mjs';
import {
  loadShelf, loadBook, drawing, setAccent, bookSwitcher, keepAddress, preferredSlug,
  bookLines, lineSummary, lineState, STATE_WORDS, cardId, shortTitle
} from './revise-kit.mjs';

const mount = document.querySelector('#astor-flashcards');
const head = document.querySelector('#rv-head-book');
const SITTING = 10;

if (mount) start();

async function start() {
  mount.append(el('p', { class: 'rv-loading', text: 'Shuffling the deck…' }));
  let shelf;
  try { shelf = await loadShelf(); } catch {
    clear(mount);
    mount.append(el('p', { class: 'rv-empty', text: 'The cards didn’t load. Try reloading the page.' }));
    return;
  }
  const books = shelf.books.filter(book => book.quotations >= 5);
  const wanted = preferredSlug();
  const first = books.find(book => book.slug === wanted)
    || books.find(book => recentlyViewed(20).some(entry => entry.slug === book.slug))
    || books.find(book => book.slug === 'macbeth')
    || books[0];
  open(books, first);
}

let generation = 0;

async function open(books, meta) {
  const ticket = ++generation;
  keepAddress(meta.slug);
  setAccent(document.querySelector('main'), meta);
  if (head) {
    clear(head);
    head.append(
      drawing(meta.motif, 22, 'rv-head-motif'),
      el('a', { class: 'rv-head-title', href: '/play/?book=' + encodeURIComponent(meta.slug), text: meta.title }),
      el('span', { class: 'rv-head-author', text: meta.author }),
      bookSwitcher(books, meta, recentlyViewed(20).map(entry => entry.slug), choice => open(books, choice))
    );
  }
  let book;
  try { book = await loadBook(meta.slug); } catch {
    if (ticket !== generation) return;
    clear(mount);
    mount.append(el('p', { class: 'rv-empty', text: 'That deck didn’t load. Try another book.' }));
    return;
  }
  if (ticket !== generation) return;
  sitting(book, meta);
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

function sitting(book, meta) {
  const live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
  const { queue, waiting, anyway } = queueFor(book);
  let position = 0;
  let turned = false;
  let reviewed = 0;
  let knew = 0;

  function render() {
    clear(mount);
    mount.append(live);
    if (position >= queue.length) return end();
    const quotation = queue[position];
    const id = cardId(book.slug, quotation.id);
    const state = lineState(snapshot().cards?.[id]);

    const page = el('div', { class: 'rv-q rv-deck' });
    const ticks = el('span', { class: 'rv-ticks', 'aria-hidden': 'true' });
    queue.forEach((_, index) => ticks.append(el('i', { class: index < position ? 'is-done' : index === position ? 'is-now' : '' })));
    page.append(el('div', { class: 'rv-q-folio' }, [
      el('p', { text: 'Card ' + (position + 1) + ' of ' + queue.length }),
      ticks
    ]));
    if (anyway && position === 0) page.append(el('p', { class: 'rv-deck-note', text: 'Nothing is due today, so these are lines you’ve met before.' }));

    const card = el('div', { class: 'rv-card' + (turned ? ' is-turned' : ''), tabindex: '-1' });
    card.append(el('p', { class: 'rv-card-state' }, [
      el('span', { class: 'rv-mark is-' + state, 'aria-hidden': 'true' }),
      ' ' + (state === 'new' ? 'A new line' : 'This line: ' + STATE_WORDS[state])
    ]));
    card.append(el('blockquote', { class: 'rv-q-line' }, [el('p', { text: quotation.text })]));
    if (!turned) {
      card.append(el('p', { class: 'rv-card-prompt', text: 'Who says it, where does it come, and what is it doing?' }));
    } else {
      const stage = book.structure.find(entry => entry.id === quotation.stage);
      card.append(el('p', { class: 'rv-note-where', text: [quotation.speaker, stage?.label, quotation.reference].filter(Boolean).join(' · ') }));
      if (quotation.context) card.append(el('p', { class: 'rv-card-context', text: quotation.context }));
      card.append(el('p', { class: 'rv-note-body', text: quotation.analysis }));
    }
    page.append(card);

    const actions = el('div', { class: 'rv-q-actions' });
    if (!turned) {
      actions.append(el('button', { class: 'button primary', type: 'button', text: 'Turn the card', onclick: () => { turned = true; render(); } }));
    } else {
      actions.append(
        el('button', { class: 'button primary', type: 'button', text: 'I knew it', onclick: () => answer(id, true) }),
        el('button', { class: 'button secondary', type: 'button', text: 'Not yet', onclick: () => answer(id, false) })
      );
      const keep = el('button', {
        class: 'rv-keep', type: 'button', 'aria-pressed': String(inCommonplace(id)),
        text: inCommonplace(id) ? 'Kept in your commonplace book' : 'Keep this line'
      });
      keep.addEventListener('click', () => {
        const added = toggleCommonplace({ id, text: quotation.text, reference: book.title + ' ' + quotation.reference, book: book.title, bookHref: book.href });
        keep.setAttribute('aria-pressed', String(added));
        keep.textContent = added ? 'Kept in your commonplace book' : 'Keep this line';
      });
      actions.append(keep);
    }
    page.append(actions);
    mount.append(page);
    if (!prefersReducedMotion() && turned) card.animate?.([{ opacity: 0.4 }, { opacity: 1 }], { duration: 160 });
    // After turning, focus the card so its answer is read before the buttons.
    if (turned) card.focus({ preventScroll: true });
    else if (position > 0) page.querySelector('.rv-q-actions button')?.focus({ preventScroll: true });
  }

  function answer(id, correct) {
    if (isRemembering()) reviewCard(id, correct);
    reviewed += 1;
    if (correct) knew += 1;
    announce(live, correct ? 'Got it.' : isRemembering() ? 'This one comes back tomorrow.' : 'Not yet.');
    position += 1;
    turned = false;
    render();
  }

  function end() {
    const counts = lineSummary(bookLines(book, snapshot().cards || {}, today()));
    const page = el('div', { class: 'rv-end' });
    if (meta.motif) page.append(drawing(meta.motif, 30, 'rv-tailpiece'));
    page.append(el('h2', { class: 'rv-end-score', tabindex: '-1', text: reviewed === SITTING ? 'Ten done.' : reviewed + (reviewed === 1 ? ' card done.' : ' cards done.') }));
    page.append(el('p', { class: 'rv-end-what', text: shortTitle(book) + ' · Flashcards' }));
    const parts = ['You knew ' + knew + ' of ' + reviewed + '.'];
    if (counts.known) parts.push('You know ' + counts.known + ' of the ' + book.quotations.length + ' key lines in ' + shortTitle(book) + ' well.');
    const left = counts.due + counts.new;
    if (left) parts.push(left + (left === 1 ? ' is' : ' are') + ' still waiting: ' + [counts.due ? counts.due + ' due for another look' : '', counts.new ? counts.new + ' not met yet' : ''].filter(Boolean).join(' and ') + '.');
    else parts.push('Nothing else is waiting today.' + (knew < reviewed ? ' The ones you missed come back tomorrow.' : ''));
    page.append(el('p', { class: 'rv-end-note', text: parts.join(' ') }));

    const actions = el('div', { class: 'button-row rv-end-actions' });
    if (left) actions.append(el('button', { class: 'button primary', type: 'button', text: 'Ten more cards', onclick: () => sitting(book, meta) }));
    actions.append(el('a', { class: left ? 'button secondary' : 'button primary', href: '/play/mixed-round/?book=' + encodeURIComponent(book.slug), text: 'Ten questions on ' + shortTitle(book) }));
    page.append(actions);
    page.append(el('p', { class: 'rv-end-links' }, [
      el('a', { href: book.href, text: 'Back to ' + shortTitle(book) }),
      el('a', { href: '/play/?book=' + encodeURIComponent(book.slug), text: 'All revision' })
    ]));
    clear(mount);
    mount.append(live, page);
    page.querySelector('.rv-end-score')?.focus({ preventScroll: true });
  }

  if (!queue.length) {
    clear(mount);
    mount.append(el('p', { class: 'rv-empty', text: 'There are no cards for ' + book.title + ' yet.' }));
    return;
  }
  render();
}

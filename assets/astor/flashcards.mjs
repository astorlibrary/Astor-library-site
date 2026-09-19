// Spaced-repetition flashcards over a title's checked quotations.
//
// The card shows a quotation; the reader recalls who says it, where it comes
// and what it is doing, then turns the card and marks themselves honestly.
// The schedule lives in store.mjs: five boxes at one, two, four, eight and
// sixteen days, so the lines that keep slipping come back soonest.

import { el, clear, shuffle, announce } from './util.mjs';
import { cardId } from './data.mjs';
import { withBooks } from './chooser.mjs';
import { isRemembering, dueCards, reviewCard, deckSummary, cardState, toggleCommonplace, inCommonplace } from './store.mjs';

const chooser = document.querySelector('#astor-deck-chooser');
const mount = document.querySelector('#astor-flashcards');

if (mount) {
  withBooks(chooser, { label: 'Which deck?', filter: book => book.quotations.length >= 5 }, book => runDeck(book));
}

function runDeck(book) {
  clear(mount);
  const live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
  mount.append(live);

  const ids = book.quotations.map(quotation => cardId(book.slug, quotation.id));
  const byId = new Map(book.quotations.map(quotation => [cardId(book.slug, quotation.id), quotation]));

  if (!isRemembering()) {
    mount.append(el('div', { class: 'astor-game-panel' }, [
      el('p', { class: 'astor-inline-note', text: 'Browser storage is switched off here, so the schedule cannot be kept between visits. The deck still works; every card is simply treated as new.' })
    ]));
  }

  const due = isRemembering() ? dueCards(ids) : ids.slice();
  const queue = shuffle(due.length ? due : ids);
  let position = 0;
  let turned = false;
  let reviewed = 0;

  function render() {
    clear(mount);
    mount.append(live);
    if (position >= queue.length) return renderEnd();

    const id = queue[position];
    const quotation = byId.get(id);
    const state = cardState(id);

    const panel = el('div', { class: 'astor-game-panel' });
    panel.append(el('div', { class: 'astor-game-meta' }, [
      el('p', { text: 'Card ' + (position + 1) + ' of ' + queue.length }),
      el('p', { text: state ? 'Box ' + (state.box + 1) + ' of 5' : 'New card' })
    ]));

    const bar = el('div', { class: 'astor-game-bar' });
    bar.append(el('span', { style: 'width:' + Math.round((position / queue.length) * 100) + '%' }));
    panel.append(bar);

    const card = el('div', { class: 'astor-flashcard' });
    card.append(el('blockquote', {}, [el('p', { text: quotation.text })]));
    if (!turned) {
      card.append(el('p', { class: 'astor-inline-note', text: 'Who says it, where does it come, and what is it doing?' }));
    } else {
      card.append(el('p', { class: 'astor-quote-attribution', text: (quotation.speaker ? quotation.speaker + ' · ' : '') + book.title + ' ' + quotation.reference }));
      card.append(el('p', { class: 'astor-flashcard-answer', text: quotation.analysis }));
    }
    panel.append(card);

    const actions = el('div', { class: 'astor-game-actions' });
    if (!turned) {
      actions.append(el('button', {
        class: 'button primary', type: 'button', text: 'Turn the card',
        onclick: () => { turned = true; render(); }
      }));
    } else {
      actions.append(el('button', {
        class: 'button primary', type: 'button', text: 'I knew it',
        onclick: () => answer(id, true)
      }));
      actions.append(el('button', {
        class: 'button secondary', type: 'button', text: 'Not yet',
        onclick: () => answer(id, false)
      }));
      const save = el('button', {
        class: 'astor-save-quote', type: 'button',
        'aria-pressed': String(inCommonplace(id)),
        text: inCommonplace(id) ? 'In your commonplace book' : 'Keep this quotation'
      });
      save.addEventListener('click', () => {
        const added = toggleCommonplace({
          id, text: quotation.text,
          reference: book.title + ' ' + quotation.reference,
          book: book.title, bookHref: book.href
        });
        save.setAttribute('aria-pressed', String(added));
        save.textContent = added ? 'In your commonplace book' : 'Keep this quotation';
      });
      actions.append(save);
    }
    panel.append(actions);
    mount.append(panel);
    panel.querySelector('button')?.focus({ preventScroll: true });
  }

  function answer(id, correct) {
    reviewCard(id, correct);
    reviewed += 1;
    announce(live, correct ? 'Marked as known.' : 'Marked for tomorrow.');
    position += 1;
    turned = false;
    render();
  }

  function renderEnd() {
    const summary = deckSummary(ids);
    const panel = el('div', { class: 'astor-game-end' });
    panel.append(el('p', { class: 'kicker', text: 'Deck finished' }));
    panel.append(el('h2', { text: reviewed + ' reviewed' }));
    panel.append(el('p', {
      class: 'astor-game-end-note',
      text: summary.learned + ' of ' + summary.total + ' cards in ' + book.title +
        ' have reached the later boxes. ' +
        (summary.due ? summary.due + ' are due again today.' : 'Nothing else is due today — come back tomorrow.')
    }));
    const row = el('div', { class: 'button-row' });
    row.append(el('button', {
      class: 'button primary', type: 'button', text: 'Go through the whole deck again',
      onclick: () => { position = 0; turned = false; reviewed = 0; queue.splice(0, queue.length, ...shuffle(ids)); render(); }
    }));
    row.append(el('a', { class: 'button secondary', href: book.href, text: 'Back to ' + book.title }));
    row.append(el('a', { class: 'button secondary', href: '/play/', text: 'Other games' }));
    panel.append(row);
    mount.append(panel);
    panel.querySelector('button')?.focus({ preventScroll: true });
  }

  render();
}

// The study guide pages under /guides/<slug>/.
//
// Every word of a guide is in the page as it arrives. This module adds what
// needs a reader in front of it: remembering the visit, the save button on the
// contents page, a tick for each act or section read, the character map, the
// map of places, and a way to keep a quotation in the commonplace book.

import { el, announce } from './util.mjs';
import {
  isRemembering, recordVisit, isSaved, toggleSaved,
  bookProgress, markStage, toggleCommonplace, inCommonplace
} from './store.mjs';

const main = document.querySelector('main[data-guide]');
if (main) enhance(main);

function enhance(root) {
  const book = {
    slug: root.dataset.guide,
    title: root.dataset.guideTitle,
    href: root.dataset.guideHref
  };
  recordVisit({ href: book.href, title: book.title, slug: book.slug, kind: 'book' });
  const live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
  root.append(live);
  setUpSave(root, book, live);
  setUpProgress(root, book, live);
  setUpKeep(root, book, live);
  embedCharacterMap(root);
  embedPlaces(root);
}

function setUpSave(root, book, live) {
  const button = root.querySelector('[data-guide-save]');
  if (!button || !isRemembering()) return;
  button.hidden = false;
  const paint = () => {
    const saved = isSaved(book.href);
    button.setAttribute('aria-pressed', String(saved));
    button.textContent = saved ? 'Saved to My library' : 'Save to My library';
  };
  paint();
  button.addEventListener('click', () => {
    const saved = toggleSaved({ href: book.href, title: book.title, slug: book.slug, kind: 'book' });
    paint();
    announce(live, saved ? book.title + ' saved to My library.' : book.title + ' removed from My library.');
  });
}

// "Read" ticks on What happens. They feed My library's progress list.
function setUpProgress(root, book, live) {
  if (!isRemembering()) return;
  for (const stage of root.querySelectorAll('.guide-stage[data-stage]')) {
    const id = stage.dataset.stage;
    const label = stage.querySelector('h2')?.firstChild?.textContent?.trim() || 'this part';
    const button = el('button', { class: 'guide-read', type: 'button', 'aria-label': 'Mark ' + label + ' as read' });
    const paint = () => {
      const done = bookProgress(book.slug).stages.includes(id);
      button.setAttribute('aria-pressed', String(done));
      button.textContent = done ? 'Read' : 'Mark as read';
    };
    button.addEventListener('click', () => {
      const done = bookProgress(book.slug).stages.includes(id);
      markStage(book.slug, id, !done);
      paint();
      announce(live, label + (done ? ' unmarked.' : ' marked as read.'));
    });
    paint();
    stage.append(button);
  }
}

function setUpKeep(root, book, live) {
  if (!isRemembering()) return;
  for (const figure of root.querySelectorAll('.guide-quote[data-quote-id]')) {
    const caption = figure.querySelector('figcaption');
    if (!caption) continue;
    const id = book.slug + ':' + figure.dataset.quoteId;
    const text = figure.querySelector('blockquote p')?.textContent || '';
    const reference = caption.textContent || '';
    const button = el('button', { class: 'guide-keep', type: 'button' });
    const paint = () => {
      const kept = inCommonplace(id);
      button.setAttribute('aria-pressed', String(kept));
      button.textContent = kept ? 'Kept' : 'Keep';
      button.setAttribute('aria-label', (kept ? 'Remove from' : 'Keep in') + ' your commonplace book');
    };
    button.addEventListener('click', () => {
      toggleCommonplace({ id, text, reference, book: book.title, bookHref: book.href });
      paint();
      announce(live, inCommonplace(id) ? 'Kept in your commonplace book.' : 'Removed from your commonplace book.');
    });
    paint();
    caption.append(' ', button);
  }
}

function embedCharacterMap(root) {
  const box = root.querySelector('[data-astor-character-map]');
  if (!box) return;
  import('./characters.mjs')
    .then(module => module.embedCharacterMap(box, box.dataset.astorCharacterMap))
    .catch(() => { /* the link to the full map stays */ });
}

function embedPlaces(root) {
  const box = root.querySelector('[data-astor-book-map]');
  if (!box) return;
  import('./map.mjs')
    .then(module => module.embedBookMap(box, box.dataset.astorBookMap))
    .then(map => { if (!map) box.remove(); })
    .catch(() => box.remove());
}

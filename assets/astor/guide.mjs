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
  setUpFind(root);
  showCurrentPart(root);
  keepTarget();
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
    const reference = figure.dataset.reference || caption.textContent || '';
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
    caption.append(button);
  }
}

// Key quotations: a box that narrows the page to the lines containing a
// word, a speaker or a reference, and a way to show one theme's lines
// (/guides/macbeth/quotations/?theme=guilt, linked from the Themes page).
// A function declaration, so it exists when enhance() runs at the top of the module.
function foldText(text) {
  return String(text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘']/g, '').replace(/[^\p{L}\p{N}.]+/gu, ' ').trim();
}

function setUpFind(root) {
  const box = root.querySelector('[data-guide-find]');
  if (!box) return;
  const input = box.querySelector('input');
  const status = box.querySelector('[data-guide-find-status]');
  const figures = [...root.querySelectorAll('.guide-quote[data-quote-id]')];
  const groups = [...root.querySelectorAll('.guide-quote-group')];
  const extras = [...root.querySelectorAll('.guide-jump, .guide-line-index')];
  let themeNames = {};
  try { themeNames = JSON.parse(box.dataset.themes || '{}'); } catch { /* no theme names */ }
  const text = new Map(figures.map(figure => [figure, foldText(
    (figure.querySelector('blockquote')?.textContent || '') + ' ' + (figure.dataset.reference || '')
  )]));
  const params = new URLSearchParams(window.location.search);
  let theme = themeNames[params.get('theme')] ? params.get('theme') : '';
  const themeLinks = [...box.querySelectorAll('[data-theme]')];
  box.hidden = false;

  // A theme link narrows the page in place; the address follows, so the
  // narrowed page can be shared. A second tap on the same theme lets go.
  function chooseTheme(next) {
    theme = next === theme ? '' : next;
    const url = new URL(window.location.href);
    if (theme) url.searchParams.set('theme', theme); else url.searchParams.delete('theme');
    url.hash = '';
    window.history.replaceState(null, '', url);
    apply();
  }
  for (const link of themeLinks) {
    link.addEventListener('click', event => {
      event.preventDefault();
      chooseTheme(link.dataset.theme);
    });
  }

  function apply() {
    for (const link of themeLinks) {
      if (link.dataset.theme === theme) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    }
    const words = foldText(input.value).split(' ').filter(Boolean);
    let shown = 0;
    for (const figure of figures) {
      const inTheme = !theme || (figure.dataset.themes || '').split(' ').includes(theme);
      const match = inTheme && words.every(word => text.get(figure).includes(word));
      figure.hidden = !match;
      if (match) shown += 1;
    }
    for (const group of groups) group.hidden = !group.querySelector('.guide-quote:not([hidden])');
    const narrowed = Boolean(words.length || theme);
    for (const extra of extras) extra.hidden = narrowed;
    status.textContent = '';
    if (!narrowed) return;
    const what = theme ? (shown === 1 ? ' line on ' : ' lines on ') + themeNames[theme] : (shown === 1 ? ' line' : ' lines');
    status.append(shown ? shown + what + (words.length ? ' matching “' + input.value.trim() + '”' : '') + '. ' : 'No key line matches. ');
    const all = el('button', { type: 'button', text: 'Show all ' + figures.length });
    all.addEventListener('click', () => {
      input.value = '';
      theme = '';
      const url = new URL(window.location.href);
      url.searchParams.delete('theme');
      window.history.replaceState(null, '', url);
      apply();
      input.focus();
    });
    status.append(all);
  }

  input.addEventListener('input', apply);
  if (theme) apply();
}

// A reader sent to one line (…/quotations/#astor-quote-out-damned-spot) should
// arrive at it. The buttons and the finder added above change the height of
// what comes before the line, so once they are in, go to it again.
function keepTarget() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = id && document.getElementById(id);
  if (!target) return;
  requestAnimationFrame(() => {
    try { target.scrollIntoView({ block: 'start', behavior: 'instant' }); } catch { target.scrollIntoView(); }
  });
}

// On a phone the guide's parts run in one line that scrolls sideways; bring
// the part being read into view without moving the page.
function showCurrentPart(root) {
  const list = root.querySelector('.guide-toc ol');
  const current = list?.querySelector('[aria-current="page"]');
  if (!list || !current || list.scrollWidth <= list.clientWidth) return;
  const item = current.closest('li');
  list.scrollLeft = Math.max(0, item.offsetLeft - list.offsetLeft - (list.clientWidth - item.offsetWidth) / 2);
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

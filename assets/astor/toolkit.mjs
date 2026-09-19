// Upgrades the study toolkit that the build writes into book and study pages.
//
// The markup arrives complete and readable. This module adds the parts that
// only make sense with a reader in front of them: tabs, the save button,
// per-act progress, quotation filters and the commonplace-book control on each
// quotation. Nothing here is required to read the page.

import { el, announce } from './util.mjs';
import {
  isRemembering, recordVisit, isSaved, toggleSaved,
  bookProgress, markStage, toggleCommonplace, inCommonplace
} from './store.mjs';

const toolkit = document.querySelector('#astor-study-toolkit');
if (toolkit) enhance(toolkit);

function enhance(root) {
  const slug = root.dataset.astorBook;
  const title = root.dataset.astorBookTitle;
  const href = root.dataset.astorBookHref;

  recordVisit({ href, title, slug, kind: 'book' });

  const live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
  root.append(live);

  setUpTabs(root, live);
  setUpSaveButton(root, { slug, title, href }, live);
  setUpProgress(root, slug, title, live);
  setUpQuoteFilters(root, live);
  setUpCommonplace(root, { slug, title, href });
  setUpVideos(root);

  root.classList.add('is-enhanced');
}

// --- tabs ------------------------------------------------------------------

function setUpTabs(root, live) {
  const tablist = root.querySelector('.astor-tabs');
  const panels = [...root.querySelectorAll('.astor-panel')];
  if (!tablist || panels.length < 2) return;

  const tabs = [...tablist.querySelectorAll('.astor-tab')];
  if (tabs.length !== panels.length) return;

  tablist.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    const panel = panels[index];
    tab.setAttribute('role', 'tab');
    tab.id = 'astor-tab-' + panel.id;
    tab.setAttribute('aria-controls', panel.id);
    tab.tabIndex = index === 0 ? 0 : -1;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    panel.hidden = index !== 0;
    tab.addEventListener('click', () => show(index, true));
    tab.addEventListener('keydown', event => {
      const step = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: tabs.length - 1 - index }[event.key];
      if (step === undefined) return;
      event.preventDefault();
      show((index + step + tabs.length) % tabs.length, true);
    });
  });

  function show(index, focus) {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    if (focus) tabs[index].focus();
    const hash = '#' + panels[index].id;
    if (window.history.replaceState) window.history.replaceState(null, '', hash);
    announce(live, panels[index].querySelector('h3')?.textContent || '');
  }

  // Arriving on /books/macbeth/#astor-quotations should open that section, and
  // so should a jump from the search palette while the page is already open.
  function openFromHash() {
    const target = window.location.hash.slice(1);
    if (!target) return;
    const direct = panels.findIndex(panel => panel.id === target);
    if (direct >= 0) return show(direct, false);
    const owner = panels.findIndex(panel => panel.querySelector('#' + CSS.escape(target)));
    if (owner >= 0) {
      show(owner, false);
      document.getElementById(target)?.scrollIntoView({ block: 'center' });
    }
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
}

// --- saving ----------------------------------------------------------------

function setUpSaveButton(root, book, live) {
  const button = root.querySelector('[data-astor-save]');
  if (!button) return;
  if (!isRemembering()) {
    button.disabled = true;
    button.title = 'Saving needs browser storage, which is switched off here.';
    return;
  }
  const paint = () => {
    const saved = isSaved(book.href);
    button.setAttribute('aria-pressed', String(saved));
    button.textContent = saved ? 'Saved to my library' : 'Save to my library';
  };
  paint();
  button.addEventListener('click', () => {
    const saved = toggleSaved({ href: book.href, title: book.title, slug: book.slug, kind: 'book' });
    paint();
    announce(live, saved ? book.title + ' saved to your library.' : book.title + ' removed from your library.');
  });
}

// --- progress --------------------------------------------------------------

function setUpProgress(root, slug, title, live) {
  const spine = root.querySelector('#astor-plot .astor-spine');
  if (!spine || !isRemembering()) return;
  const rows = [...spine.querySelectorAll('li[data-stage]')];
  if (!rows.length) return;

  const ring = el('div', { class: 'astor-ring' });
  root.querySelector('.astor-toolkit-actions')?.prepend(ring);

  function paintRing() {
    const done = bookProgress(slug).stages.length;
    const share = rows.length ? done / rows.length : 0;
    const circumference = 2 * Math.PI * 18;
    ring.innerHTML =
      '<svg viewBox="0 0 46 46" role="img" aria-label="' + done + ' of ' + rows.length + ' read">' +
      '<circle class="astor-ring-track" cx="23" cy="23" r="18"></circle>' +
      '<circle class="astor-ring-value" cx="23" cy="23" r="18" stroke-dasharray="' + circumference +
      '" stroke-dashoffset="' + (circumference * (1 - share)) + '"></circle></svg>' +
      '<span>' + done + '/' + rows.length + ' read</span>';
  }

  for (const row of rows) {
    const stage = row.dataset.stage;
    const slot = row.querySelector('.astor-stage-slot');
    if (!slot) continue;
    const label = row.querySelector('.astor-stage-label')?.textContent || 'this section';
    const button = el('button', {
      class: 'astor-read-toggle', type: 'button',
      'aria-label': 'Mark ' + label + ' of ' + title + ' as read'
    });
    const paint = () => {
      const done = bookProgress(slug).stages.includes(stage);
      button.setAttribute('aria-pressed', String(done));
      button.textContent = done ? 'Read' : 'Mark as read';
    };
    button.addEventListener('click', () => {
      const done = bookProgress(slug).stages.includes(stage);
      markStage(slug, stage, !done);
      paint();
      paintRing();
      announce(live, label + (done ? ' unmarked.' : ' marked as read.'));
    });
    paint();
    slot.replaceWith(button);
  }
  paintRing();
}

// --- quotation filters -----------------------------------------------------

function setUpQuoteFilters(root, live) {
  const buttons = [...root.querySelectorAll('[data-quote-filter]')];
  const cards = [...root.querySelectorAll('.astor-quote-card')];
  if (!buttons.length || !cards.length) return;

  const count = el('p', { class: 'astor-explorer-count', text: cards.length + ' quotations' });
  root.querySelector('.astor-quote-list')?.before(count);

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const key = button.dataset.quoteFilter;
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      let shown = 0;
      for (const card of cards) {
        const match = key === 'all' || (card.dataset.quoteKeys || '').split(' ').includes(key);
        card.hidden = !match;
        if (match) shown += 1;
      }
      count.textContent = shown + (shown === 1 ? ' quotation' : ' quotations');
      announce(live, shown + ' quotations shown.');
    });
  }
}

// --- click-to-load video ---------------------------------------------------
//
// The page contacts no video service until a reader presses the button, and
// then only youtube-nocookie.com or player.vimeo.com.

const VIDEO_FRAMES = {
  'youtube-nocookie': id => 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0',
  vimeo: id => 'https://player.vimeo.com/video/' + encodeURIComponent(id)
};

function setUpVideos(root) {
  for (const card of root.querySelectorAll('.astor-video')) {
    const button = card.querySelector('[data-video-play]');
    if (!button) continue;
    button.addEventListener('click', () => {
      const build = VIDEO_FRAMES[card.dataset.videoProvider];
      if (!build) return;
      const frame = el('iframe', {
        src: build(card.dataset.videoId),
        title: card.querySelector('h4')?.textContent || 'Video',
        loading: 'lazy',
        allow: 'accelerometer; encrypted-media; picture-in-picture',
        referrerpolicy: 'no-referrer',
        allowfullscreen: true
      });
      button.replaceWith(el('div', { class: 'astor-video-frame' }, [frame]));
    });
  }
}

// --- commonplace book ------------------------------------------------------

function setUpCommonplace(root, book) {
  if (!isRemembering()) return;
  for (const card of root.querySelectorAll('.astor-quote-card')) {
    const foot = card.querySelector('.astor-quote-foot');
    if (!foot) continue;
    const id = book.slug + ':' + card.dataset.quoteId;
    const text = card.querySelector('blockquote p')?.textContent || '';
    const reference = card.querySelector('.astor-quote-attribution')?.textContent || '';
    const button = el('button', { class: 'astor-save-quote', type: 'button' });
    const paint = () => {
      const saved = inCommonplace(id);
      button.setAttribute('aria-pressed', String(saved));
      button.textContent = saved ? 'In your commonplace book' : 'Save this quotation';
    };
    button.addEventListener('click', () => {
      toggleCommonplace({ id, text, reference, book: book.title, bookHref: book.href });
      paint();
    });
    paint();
    foot.append(button);
  }
}

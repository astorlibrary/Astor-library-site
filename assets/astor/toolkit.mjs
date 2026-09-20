// Upgrades the study toolkit that the build writes into book and study pages.
//
// The markup arrives complete and readable. This module adds the parts that
// only make sense with a reader in front of them: tabs, the save button,
// per-act progress, quotation filters and the commonplace-book control on each
// quotation. Nothing here is required to read the page.

import { el, clear, announce, download } from './util.mjs';
import { loadBook } from './data.mjs';
import {
  isRemembering, recordVisit, isSaved, toggleSaved,
  bookProgress, markStage, toggleCommonplace, inCommonplace,
  readingPlan, savePlan, removePlan, markSitting
} from './store.mjs';

// Boxes whose drawing has already been fetched. Declared before the set-up
// below runs, because a page opened on a panel (#astor-characters) draws it
// during set-up.
const embedded = new WeakSet();

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
  setUpReadingPlan(root, { slug, title, href }, live);
  setUpSheet(root, { slug, title });

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
    embedMap(panels[index]);
    embedPlaces(panels[index]);
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

// --- the relationship map ---------------------------------------------------
//
// The Characters panel carries a box for the map. The record and the drawing
// code are fetched the first time the panel is opened, not before, so a reader
// who never opens it never pays for it.


// The Context panel lists a book's places; the first time it is opened they
// are drawn on a map above the list, which stays as it was if that fails.
function embedPlaces(panel) {
  const box = panel.querySelector('[data-astor-book-map]');
  if (!box || embedded.has(box)) return;
  embedded.add(box);
  const list = box.querySelector('ul');
  const holder = el('div', {});
  box.prepend(holder);
  import('./map.mjs')
    .then(module => module.embedBookMap(holder, box.dataset.astorBookMap))
    .then(map => { if (!map) holder.remove(); else if (list) list.classList.add('is-under-map'); })
    .catch(() => holder.remove());
}

function embedMap(panel) {
  const box = panel.querySelector('[data-astor-character-map]');
  if (!box || embedded.has(box)) return;
  embedded.add(box);
  const link = box.querySelector('a');
  import('./characters.mjs')
    .then(module => module.embedCharacterMap(box, box.dataset.astorCharacterMap))
    .then(map => {
      if (!map) return;
      // Keep the way through to the full-page explorer underneath the drawing.
      box.append(el('p', { class: 'astor-inline-note' }, [
        el('a', { href: link?.getAttribute('href') || '/explore/characters/', text: 'Open this map on its own page \u2192' })
      ]));
    })
    .catch(() => { /* the link to the explorer is still there */ });
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

  const painters = [];
  root.addEventListener('astor:progress', () => { for (const paint of painters) paint(); paintRing(); });

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
    painters.push(paint);
    slot.replaceWith(button);
  }
  paintRing();
}

// --- reading plan ------------------------------------------------------------
//
// The record's acts or sections are shared out across the days a reader has
// free before a date they choose. The plan is kept on this device; ticking a
// sitting marks its parts as read, so the plot tab and the plan agree.

function setUpReadingPlan(root, book, live) {
  const box = root.querySelector('[data-astor-plan]');
  if (!box) return;
  let plan = isRemembering() ? readingPlan(book.slug) : null;
  let record = null;
  const load = () => (record ? Promise.resolve(record) : loadBook(book.slug).then(loaded => { record = loaded; return loaded; }));
  const mount = el('div', { class: 'astor-plan-body' });
  box.append(mount);
  draw();

  function draw() {
    clear(mount);
    import('./plan.mjs').then(planning => (plan ? drawPlan(planning) : drawForm(planning)))
      .catch(() => mount.append(el('p', { class: 'astor-inline-note', text: 'The planner could not load. The acts and sections are listed under Plot.' })));
  }

  function drawForm({ todayKey, addDays, WEEKDAYS, buildPlan }) {
    const today = todayKey();
    const finish = el('input', { type: 'date', id: 'astor-plan-finish-' + book.slug, value: addDays(today, 13), min: today, required: true });
    const days = el('div', { class: 'astor-plan-days' });
    const checks = [];
    for (let offset = 1; offset <= 7; offset += 1) {
      const day = offset % 7;
      const input = el('input', { type: 'checkbox', value: String(day), checked: true });
      checks.push(input);
      days.append(el('label', { class: 'astor-check' }, [input, el('span', { text: WEEKDAYS[day].slice(0, 3) })]));
    }
    const form = el('form', { class: 'astor-plan-form' }, [
      el('div', {}, [el('label', { for: finish.id, text: 'Finish by' }), finish]),
      el('fieldset', {}, [el('legend', { text: 'Days you can read' }), days]),
      el('button', { class: 'button', type: 'submit', text: 'Make my plan' })
    ]);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const weekdays = checks.filter(input => input.checked).map(input => Number(input.value));
      load().then(loaded => {
        const built = buildPlan(loaded, { start: today, finish: finish.value, weekdays });
        if (!built) {
          announce(live, 'No free days fall before that date. Choose a later date or more days.');
          form.append(el('p', { class: 'astor-inline-note', text: 'No free days fall before that date. Choose a later date or more days.' }));
          return;
        }
        plan = built;
        if (isRemembering()) savePlan(plan);
        draw();
        announce(live, 'Plan made: ' + plan.sittings.length + ' sittings.');
      });
    });
    mount.append(form);
  }

  function drawPlan({ planSummary, readableDay, toIcs, replan }) {
    const summary = planSummary(plan);
    mount.append(el('p', {
      class: 'astor-explorer-count',
      text: summary.total + (summary.total === 1 ? ' sitting, ' : ' sittings, ') + readableDay(plan.start) + ' to ' + readableDay(plan.finish) +
        ' \u00b7 ' + summary.done + ' done' + (summary.overdue ? ', ' + summary.overdue + ' behind' : '')
    }));
    const list = el('ol', { class: 'astor-plan-list' });
    plan.sittings.forEach((sitting, index) => {
      const input = el('input', { type: 'checkbox', checked: sitting.done, id: 'astor-sitting-' + book.slug + '-' + index });
      const row = el('li', { class: sitting.done ? 'is-done' : '' }, [
        el('label', { class: 'astor-check' }, [
          input,
          el('span', {}, [
            el('b', { text: readableDay(sitting.date) }),
            document.createTextNode(' \u00b7 ' + sitting.label + ' '),
            el('small', { text: 'about ' + sitting.minutes + ' minutes' })
          ])
        ])
      ]);
      input.addEventListener('change', () => {
        sitting.done = input.checked;
        row.classList.toggle('is-done', input.checked);
        if (isRemembering()) {
          markSitting(book.slug, index, input.checked);
          for (const id of sitting.stages) markStage(book.slug, id, input.checked);
          root.dispatchEvent(new CustomEvent('astor:progress'));
        }
        announce(live, sitting.label + (input.checked ? ' done.' : ' not done yet.'));
      });
      list.append(row);
    });
    mount.append(list);
    mount.append(el('div', { class: 'astor-toolkit-actions' }, [
      el('button', {
        class: 'button secondary', type: 'button', text: 'Add to my calendar (.ics)',
        onclick: () => download(book.slug + '-reading-plan.ics', toIcs(plan), 'text/calendar;charset=utf-8')
      }),
      summary.overdue ? el('button', {
        class: 'button secondary', type: 'button', text: 'Re-plan from today',
        onclick: () => load().then(loaded => {
          plan = replan(plan, loaded);
          if (isRemembering()) savePlan(plan);
          draw();
          announce(live, 'Plan re-spread from today: ' + plan.sittings.filter(sitting => !sitting.done).length + ' sittings to go.');
        })
      }) : null,
      el('button', {
        class: 'button secondary', type: 'button', text: 'Start again',
        onclick: () => { plan = null; if (isRemembering()) removePlan(book.slug); draw(); }
      })
    ]));
    if (!isRemembering()) {
      mount.append(el('p', { class: 'astor-inline-note', text: 'Storage is off in this browser, so the plan will not be saved. Add it to your calendar to keep it.' }));
    }
  }
}

// --- revision sheet -----------------------------------------------------------

function setUpSheet(root, book) {
  const box = root.querySelector('[data-astor-sheet]');
  if (!box) return;
  // The printed copy is a clone placed directly under <body>; the print
  // stylesheet hides everything else, so the page's own length does not turn
  // into blank pages after the sheet.
  let printed = null;
  window.addEventListener('beforeprint', () => {
    const current = box.querySelector('.astor-sheet');
    if (!current || printed) return;
    printed = el('div', { class: 'astor-sheet-print' }, [current.cloneNode(true)]);
    document.body.append(printed);
  });
  window.addEventListener('afterprint', () => { printed?.remove(); printed = null; });
  const button = el('button', { class: 'button secondary', type: 'button', text: 'Show the revision sheet', 'aria-expanded': 'false' });
  box.append(el('p', { class: 'astor-toolkit-actions' }, [button]));
  let sheet = null;
  button.addEventListener('click', () => {
    if (sheet) {
      sheet.remove();
      sheet = null;
      document.body.classList.remove('astor-has-sheet');
      button.textContent = 'Show the revision sheet';
      button.setAttribute('aria-expanded', 'false');
      return;
    }
    Promise.all([import('./sheet.mjs'), loadBook(book.slug)]).then(([module, record]) => {
      sheet = el('div', { class: 'astor-sheet-wrap' });
      sheet.append(module.buildSheet(record));
      sheet.append(el('p', { class: 'astor-toolkit-actions' }, [
        el('button', { class: 'button', type: 'button', text: 'Print it', onclick: () => window.print() })
      ]));
      box.append(sheet);
      document.body.classList.add('astor-has-sheet');
      button.textContent = 'Hide the revision sheet';
      button.setAttribute('aria-expanded', 'true');
    }).catch(() => {
      box.append(el('p', { class: 'astor-inline-note', text: 'The sheet could not be built just now. Everything on it is in the tabs above.' }));
    });
  });
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
        allow: 'accelerometer; encrypted-media; picture-in-picture; fullscreen',
        // YouTube refuses an embed that names no origin (its "Error 153"), so
        // the player is told which site it is on, and nothing about the page.
        referrerpolicy: 'strict-origin-when-cross-origin',
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

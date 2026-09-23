// My library: everything this browser has remembered, and the controls to
// export or forget it.
//
// There is no account behind this page. If it is empty, that is because this
// device has not read anything yet, not because a sign-in is missing.

import { el, clear, formatDate, download } from './util.mjs';
import { planSummary, nextSitting, readableDay } from './plan.mjs';
import { loadIndex } from './data.mjs';
import {
  isRemembering, savedBooks, recentlyViewed, allProgress, commonplace,
  annotate, toggleCommonplace, scores, streak, exportAll, forget, deckSummary,
  allPlans, removePlan
} from './store.mjs';
import { cardId } from './data.mjs';

const mounts = {
  dash: document.querySelector('#astor-dash'),
  saved: document.querySelector('#astor-saved'),
  progress: document.querySelector('#astor-progress'),
  recent: document.querySelector('#astor-recent'),
  commonplace: document.querySelector('#astor-commonplace'),
  plans: document.querySelector('#astor-plans'),
  scores: document.querySelector('#astor-scores'),
  controls: document.querySelector('#astor-data-controls')
};

if (mounts.dash) start();

async function start() {
  if (!isRemembering()) {
    for (const [key, node] of Object.entries(mounts)) {
      if (!node || key === 'dash') continue;
      clear(node);
    }
    clear(mounts.dash);
    mounts.dash.append(el('p', {
      class: 'astor-empty',
      text: 'Storage is turned off in this browser, so nothing can be saved.'
    }));
    return;
  }

  let index = null;
  try { index = await loadIndex(); } catch { /* the page is still useful without it */ }

  renderDash(index);
  renderSaved();
  renderProgress(index);
  renderRecent();
  renderCommonplace();
  renderPlans();
  renderScores();
  renderControls();
}

function renderDash(index) {
  clear(mounts.dash);
  const run = streak();
  const progress = allProgress();
  const readStages = Object.values(progress).reduce((total, entry) => total + entry.stages.length, 0);
  const played = Object.values(scores()).reduce((total, entry) => total + entry.played, 0);

  let due = 0;
  if (index) {
    for (const book of index.books) {
      const ids = book.quotations.map(quotation => cardId(book.slug, quotation.id));
      due += deckSummary(ids).due;
    }
  }

  const tiles = [
    ['Saved books', String(savedBooks().length), 'on your shelf.'],
    ['Sections read', String(readStages), 'across ' + Object.keys(progress).length + ' ' + (Object.keys(progress).length === 1 ? 'title' : 'titles') + '.'],
    ['Revision streak', run.live && run.current ? String(run.current) : '0', run.live && run.current ? 'days in a row. Longest: ' + run.longest + '.' : 'Play a round today to start one.'],
    ['Quotations kept', String(commonplace().length), 'in your commonplace book.'],
    ['Rounds played', String(played), played ? 'so far.' : 'Try a game.'],
    ['Flashcards due', String(due), due ? 'to review today.' : 'All done for today.']
  ];

  for (const [label, value, note] of tiles) {
    mounts.dash.append(el('div', { class: 'astor-dash-tile' }, [
      el('b', { text: label }), el('strong', { text: value }), el('small', { text: note })
    ]));
  }
}

function shelf(node, items, emptyMessage) {
  clear(node);
  if (!items.length) {
    node.append(el('p', { class: 'astor-empty', text: emptyMessage }));
    return;
  }
  const grid = el('div', { class: 'astor-shelf' });
  for (const item of items) {
    grid.append(el('a', { href: item.href }, [
      el('b', { text: item.title || item.href }),
      el('small', { text: item.note || '' })
    ]));
  }
  node.append(grid);
}

function renderSaved() {
  shelf(mounts.saved, savedBooks().map(book => ({
    href: book.href, title: book.title,
    note: 'Saved ' + formatDate(book.at)
  })), 'No saved books yet. Save one from any book page.');
}

function renderRecent() {
  shelf(mounts.recent, recentlyViewed(12).map(entry => ({
    href: entry.href, title: entry.title,
    note: formatDate(entry.at)
  })), 'Nothing yet. Pages you open will appear here.');
}

function renderProgress(index) {
  clear(mounts.progress);
  const progress = allProgress();
  const slugs = Object.keys(progress).filter(slug => progress[slug].stages.length);
  if (!slugs.length) {
    mounts.progress.append(el('p', { class: 'astor-empty', text: 'Nothing marked yet. Tick off sections on a book page as you read.' }));
    return;
  }
  const grid = el('div', { class: 'astor-dash-grid' });
  for (const slug of slugs) {
    const book = index?.books.find(entry => entry.slug === slug);
    const done = progress[slug].stages.length;
    const total = book ? book.structure.length : done;
    const share = total ? Math.round((done / total) * 100) : 0;
    grid.append(el('div', { class: 'astor-dash-tile' }, [
      el('b', { text: book ? book.title : slug }),
      el('strong', { text: share + '%' }),
      el('small', { text: done + ' of ' + total + ' ' + (book?.form === 'play' ? 'acts' : 'sections') + ' read.' }),
      book ? el('small', {}, [el('a', { href: book.href, text: 'Carry on →' })]) : null
    ]));
  }
  mounts.progress.append(grid);
}

function renderCommonplace() {
  clear(mounts.commonplace);
  const entries = commonplace();
  if (!entries.length) {
    mounts.commonplace.append(el('p', {
      class: 'astor-empty',
      text: 'Nothing kept yet. Keep a quotation and it will appear here.'
    }));
    return;
  }

  const list = el('div', { class: 'astor-commonplace' });
  for (const entry of entries) {
    const note = el('textarea', {
      value: entry.note || '',
      'aria-label': 'Your note on this quotation',
      placeholder: 'Add a note'
    });
    let timer = null;
    note.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => annotate(entry.id, note.value), 400);
    });
    const remove = el('button', {
      class: 'astor-save-quote', type: 'button', text: 'Remove',
      onclick: () => { toggleCommonplace(entry); renderCommonplace(); renderDash(null); }
    });
    list.append(el('article', {}, [
      el('blockquote', {}, [el('p', { text: entry.text })]),
      el('footer', {}, [
        el('a', { href: entry.bookHref || '/library/', text: entry.reference || entry.book || 'Astor Library' })
      ]),
      note,
      el('div', { class: 'astor-quote-foot' }, [remove])
    ]));
  }
  mounts.commonplace.append(list);

  const exportRow = el('div', { class: 'button-row' });
  exportRow.append(el('button', {
    class: 'button secondary', type: 'button', text: 'Copy all',
    onclick: async event => {
      const text = entries.map(entry =>
        '“' + entry.text + '”\n— ' + (entry.reference || entry.book || '') + (entry.note ? '\n' + entry.note : '')
      ).join('\n\n');
      try {
        await navigator.clipboard.writeText(text);
        event.currentTarget.textContent = 'Copied';
      } catch {
        event.currentTarget.textContent = 'Couldn’t copy';
      }
    }
  }));
  exportRow.append(el('button', {
    class: 'button secondary', type: 'button', text: 'Download as text',
    onclick: () => download('astor-commonplace-book.txt', entries.map(entry =>
      '“' + entry.text + '”\n— ' + (entry.reference || entry.book || '') + (entry.note ? '\n' + entry.note : '')
    ).join('\n\n'))
  }));
  mounts.commonplace.append(exportRow);
}

function renderPlans() {
  if (!mounts.plans) return;
  clear(mounts.plans);
  const plans = allPlans().sort((a, b) => (nextSitting(a)?.date || 'z').localeCompare(nextSitting(b)?.date || 'z'));
  if (!plans.length) {
    mounts.plans.append(el('p', { class: 'astor-empty', text: 'No plans yet. Make one in the Revise tab on any book page.' }));
    return;
  }
  const grid = el('div', { class: 'astor-dash-grid' });
  for (const plan of plans) {
    const summary = planSummary(plan);
    const next = nextSitting(plan);
    const tile = el('div', { class: 'astor-dash-tile' }, [
      el('b', { text: plan.title }),
      el('strong', { text: summary.finished ? 'Finished' : next ? readableDay(next.date) : '\u2014' }),
      el('small', { text: summary.finished
        ? 'All ' + summary.total + ' sittings done.'
        : next.label + ', about ' + next.minutes + ' minutes. ' + summary.done + ' of ' + summary.total + ' sittings done' +
          (summary.overdue ? ', ' + summary.overdue + ' behind.' : '.') }),
      el('small', {}, [
        el('a', { href: plan.href + '#astor-revise', text: 'Open the plan \u2192' }),
        ' \u00b7 ',
        el('button', { class: 'astor-link-button', type: 'button', text: 'Remove', onclick: () => { removePlan(plan.slug); renderPlans(); } })
      ])
    ]);
    grid.append(tile);
  }
  mounts.plans.append(grid);
}

function renderScores() {
  clear(mounts.scores);
  const entries = Object.entries(scores());
  if (!entries.length) {
    mounts.scores.append(el('p', { class: 'astor-empty', text: 'No games played yet.' }));
    return;
  }
  const grid = el('div', { class: 'astor-dash-grid' });
  for (const [gameId, entry] of entries.sort((a, b) => b[1].lastAt - a[1].lastAt)) {
    grid.append(el('div', { class: 'astor-dash-tile' }, [
      el('b', { text: gameName(gameId) }),
      el('strong', { text: entry.bestTotal ? entry.best + '/' + entry.bestTotal : String(entry.played) }),
      el('small', { text: entry.played + ' round' + (entry.played === 1 ? '' : 's') + ', last played ' + formatDate(entry.lastAt) + '.' }),
      gameId === 'daily' ? null : el('small', {}, [el('a', { href: '/play/' + gameId + '/', text: 'Play again →' })])
    ]));
  }
  mounts.scores.append(grid);
}

function gameName(gameId) {
  return ({
    'who-said-it': 'Who said it?',
    'fill-the-line': 'Fill the line',
    'theme-match': 'Theme match',
    'technique-spotter': 'Technique spotter',
    'character-identification': 'Who is this?',
    'order-the-plot': 'Order the plot',
    'which-book': 'Which book?',
    'context-sprint': 'Context sprint',
    'opening-lines': 'Opening lines',
    'mixed-round': 'Mixed round',
    daily: 'Today’s questions'
  })[gameId] || gameId;
}

function renderControls() {
  clear(mounts.controls);
  mounts.controls.append(el('button', {
    class: 'button secondary', type: 'button', text: 'Download my data',
    onclick: () => download('astor-library-data.json', exportAll())
  }));
  for (const [section, label] of [
    ['recent', 'Clear recently viewed'],
    ['saved', 'Clear saved books'],
    ['commonplace', 'Clear commonplace book'],
    ['cards', 'Reset flashcards'],
    [null, 'Forget everything']
  ]) {
    const button = el('button', { class: 'button secondary', type: 'button', text: label });
    let armed = false;
    button.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        button.textContent = 'Press again to confirm';
        window.setTimeout(() => { armed = false; button.textContent = label; }, 5000);
        return;
      }
      forget(section);
      start();
    });
    mounts.controls.append(button);
  }
}

// My library: everything this browser has remembered, and the controls to
// export or forget it.
//
// There is no account behind this page. If it is empty, that is because this
// device has not read anything yet, not because a sign-in is missing.

import { el, clear, formatDate } from './util.mjs';
import { loadIndex } from './data.mjs';
import {
  isRemembering, savedBooks, recentlyViewed, allProgress, commonplace,
  annotate, toggleCommonplace, scores, streak, exportAll, forget, deckSummary
} from './store.mjs';
import { cardId } from './data.mjs';

const mounts = {
  dash: document.querySelector('#astor-dash'),
  saved: document.querySelector('#astor-saved'),
  progress: document.querySelector('#astor-progress'),
  recent: document.querySelector('#astor-recent'),
  commonplace: document.querySelector('#astor-commonplace'),
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
      text: 'This browser has storage switched off, so nothing can be remembered between visits. Everything else on the site works as usual; only this page has nothing to show.'
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
    ['Saved books', String(savedBooks().length), 'kept from the study toolkit on a book page.'],
    ['Sections read', String(readStages), 'across ' + Object.keys(progress).length + ' ' + (Object.keys(progress).length === 1 ? 'title' : 'titles') + ', marked by you.'],
    ['Revision streak', run.live && run.current ? String(run.current) : '0', run.live && run.current ? 'days in a row. Longest: ' + run.longest + '.' : 'Play a round today to start one.'],
    ['Quotations kept', String(commonplace().length), 'in your commonplace book.'],
    ['Rounds played', String(played), played ? 'since you started.' : 'nothing yet.'],
    ['Flashcards due', String(due), due ? 'waiting in your decks today.' : 'nothing due today.']
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
  })), 'Nothing saved yet. Open any book with a study toolkit and use “Save to my library”.');
}

function renderRecent() {
  shelf(mounts.recent, recentlyViewed(12).map(entry => ({
    href: entry.href, title: entry.title,
    note: formatDate(entry.at)
  })), 'Nothing here yet. Pages you open will appear as you go.');
}

function renderProgress(index) {
  clear(mounts.progress);
  const progress = allProgress();
  const slugs = Object.keys(progress).filter(slug => progress[slug].stages.length);
  if (!slugs.length) {
    mounts.progress.append(el('p', { class: 'astor-empty', text: 'No progress marked yet. On a book page, tick an act or a section once you have read it.' }));
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
      text: 'Empty so far. Every quotation on a book page, in the explorer and in the flashcards has a button to keep it here.'
    }));
    return;
  }

  const list = el('div', { class: 'astor-commonplace' });
  for (const entry of entries) {
    const note = el('textarea', {
      value: entry.note || '',
      'aria-label': 'Your note on this quotation',
      placeholder: 'Why you kept it, or what you want to say about it.'
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
    class: 'button secondary', type: 'button', text: 'Copy the whole commonplace book',
    onclick: async event => {
      const text = entries.map(entry =>
        '“' + entry.text + '”\n— ' + (entry.reference || entry.book || '') + (entry.note ? '\n' + entry.note : '')
      ).join('\n\n');
      try {
        await navigator.clipboard.writeText(text);
        event.currentTarget.textContent = 'Copied';
      } catch {
        event.currentTarget.textContent = 'Copying is blocked in this browser';
      }
    }
  }));
  exportRow.append(el('button', {
    class: 'button secondary', type: 'button', text: 'Download it as a text file',
    onclick: () => download('astor-commonplace-book.txt', entries.map(entry =>
      '“' + entry.text + '”\n— ' + (entry.reference || entry.book || '') + (entry.note ? '\n' + entry.note : '')
    ).join('\n\n'))
  }));
  mounts.commonplace.append(exportRow);
}

function renderScores() {
  clear(mounts.scores);
  const entries = Object.entries(scores());
  if (!entries.length) {
    mounts.scores.append(el('p', { class: 'astor-empty', text: 'No rounds played yet. The games are at /play/.' }));
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
    daily: 'The Daily Five'
  })[gameId] || gameId;
}

function download(name, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderControls() {
  clear(mounts.controls);
  mounts.controls.append(el('button', {
    class: 'button secondary', type: 'button', text: 'Export everything as JSON',
    onclick: () => download('astor-library-data.json', exportAll())
  }));
  for (const [section, label] of [
    ['recent', 'Clear recently viewed'],
    ['saved', 'Clear saved books'],
    ['commonplace', 'Clear the commonplace book'],
    ['cards', 'Reset the flashcard schedule'],
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

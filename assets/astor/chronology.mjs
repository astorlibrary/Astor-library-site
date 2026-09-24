// The library timeline, as a list you can read down.
//
// Two views of the same dates. "The books" puts every title in order of first
// publication, one line each, and any line opens to show that book's own dates
// in place. "Every date" lists all of them, from every book, with the kind of
// event and the book it belongs to on each line.
//
// It replaced a chart that laid years out across the page as coloured bars.
// Six hundred years across 1,100 pixels put a decade in a few pixels, so the
// bars stacked into a staircase and every one had to be clicked to be read.

import { el, clear, formatYear } from './util.mjs';
import { loadIndex } from './data.mjs';

const KINDS = [
  ['work', 'The book'],
  ['author', 'The writer'],
  ['context', 'Context'],
  ['reception', 'Afterwards']
];
const KIND_NAME = new Map(KINDS);

const controls = document.querySelector('#astor-timeline-controls');
const jump = document.querySelector('#astor-timeline-jump');
const list = document.querySelector('#astor-timeline');

const state = { view: 'books', kinds: new Set(KINDS.map(kind => kind[0])), book: '', period: '', mark: '', open: new Set() };
let books = [];
let events = [];

if (list) start();

async function loadTimelineIndex() {
  try {
    const response = await fetch('/assets/timeline-index.json', { credentials: 'omit' });
    if (response.ok) return await response.json();
  } catch { /* fall through */ }
  return loadIndex();
}

async function start() {
  let index;
  try {
    index = await loadTimelineIndex();
  } catch {
    list.append(el('p', { class: 'astor-empty', text: 'The timeline did not load. Reload the page to try again.' }));
    return;
  }

  books = index.books
    .filter(book => Number.isFinite(Number(book.firstPublished)))
    .map(book => ({ ...book, year: Number(book.firstPublished) }))
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
  events = index.books.flatMap(book => (book.timeline || []).map(event => ({
    ...event, kind: event.kind || 'context', book
  }))).sort((a, b) => a.year - b.year || a.book.title.localeCompare(b.book.title));

  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'events') state.view = 'events';
  state.period = params.get('period') || '';
  const kinds = params.getAll('kind').filter(kind => KIND_NAME.has(kind));
  if (kinds.length) state.kinds = new Set(kinds);
  const marked = params.get('mark');
  if (marked && books.some(book => book.slug === marked)) state.mark = marked;
  const asked = params.get('book');
  if (asked && books.some(book => book.slug === asked)) {
    if (state.view === 'events') state.book = asked;
    else state.open.add(asked);
  }

  buildControls();
  render();

  // Arriving from a book page opens that book's line and brings it into view;
  // arriving with one book marked among all the others goes to its first date.
  if (asked && state.view === 'books') {
    document.getElementById('astor-tl-book-' + asked)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  } else if (state.mark && state.view === 'events') {
    list.querySelector('.is-marked')?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
}

// --- controls ----------------------------------------------------------------

function buildControls() {
  clear(controls);

  const views = el('div', { class: 'astor-tl-views', role: 'group', 'aria-label': 'What to show' });
  for (const [view, label] of [['books', 'The books'], ['events', 'Every date']]) {
    views.append(el('button', {
      type: 'button', class: 'astor-tl-view', 'aria-pressed': String(state.view === view), text: label,
      onclick: () => {
        if (state.view === view) return;
        state.view = view;
        buildControls();
        render();
        syncAddress();
      }
    }));
  }
  controls.append(views);

  const fields = el('div', { class: 'astor-tl-fields' });

  const periods = [...new Set(books.map(book => book.period))]
    .sort((a, b) => firstYearOf(a) - firstYearOf(b));
  const periodSelect = el('select', { id: 'astor-tl-period' });
  periodSelect.append(el('option', { value: '', text: 'Every period' }));
  for (const period of periods) periodSelect.append(el('option', { value: period, text: period }));
  periodSelect.value = state.period;
  periodSelect.addEventListener('change', () => { state.period = periodSelect.value; render(); syncAddress(); });
  fields.append(el('div', { class: 'astor-tl-field' }, [el('label', { for: periodSelect.id, text: 'Period' }), periodSelect]));

  if (state.view === 'events') {
    const bookSelect = el('select', { id: 'astor-tl-book' });
    bookSelect.append(el('option', { value: '', text: 'Every book' }));
    for (const book of books.slice().sort((a, b) => a.title.localeCompare(b.title))) {
      bookSelect.append(el('option', { value: book.slug, text: book.title }));
    }
    bookSelect.value = state.book;
    bookSelect.addEventListener('change', () => { state.book = bookSelect.value; render(); syncAddress(); });
    fields.append(el('div', { class: 'astor-tl-field' }, [el('label', { for: bookSelect.id, text: 'Book' }), bookSelect]));

    const kinds = el('fieldset', { class: 'astor-tl-kinds' }, [el('legend', { text: 'Kinds of date' })]);
    for (const [kind, label] of KINDS) {
      const input = el('input', { type: 'checkbox', value: kind, checked: state.kinds.has(kind) });
      input.addEventListener('change', () => {
        if (input.checked) state.kinds.add(kind); else state.kinds.delete(kind);
        render();
        syncAddress();
      });
      kinds.append(el('label', { class: 'astor-tl-kind', 'data-kind': kind }, [input, el('span', { text: label })]));
    }
    fields.append(kinds);
  }
  controls.append(fields);
}

function firstYearOf(period) {
  return Math.min(...books.filter(book => book.period === period).map(book => book.year));
}

function syncAddress() {
  const url = new URL(window.location.href);
  url.search = '';
  if (state.view === 'events') {
    url.searchParams.set('view', 'events');
    if (state.book) url.searchParams.set('book', state.book);
    if (state.kinds.size < KINDS.length) for (const kind of state.kinds) url.searchParams.append('kind', kind);
    if (state.mark) url.searchParams.set('mark', state.mark);
  }
  if (state.period) url.searchParams.set('period', state.period);
  window.history.replaceState(null, '', url);
}

// --- grouping ----------------------------------------------------------------

// Centuries are the headings, with everything before 1500 together: the
// library has a handful of ancient and medieval dates and they would otherwise
// be a string of one-line sections.
function bucketOf(year) {
  if (year < 1500) return { id: 'before-1500', label: 'Before 1500' };
  const century = Math.floor(year / 100) * 100;
  return { id: century + 's', label: 'The ' + century + 's' };
}

function grouped(items) {
  const buckets = [];
  for (const item of items) {
    const bucket = bucketOf(item.year);
    let current = buckets[buckets.length - 1];
    if (!current || current.id !== bucket.id) {
      current = { ...bucket, years: [] };
      buckets.push(current);
    }
    let year = current.years[current.years.length - 1];
    if (!year || year.year !== item.year) {
      year = { year: item.year, items: [] };
      current.years.push(year);
    }
    year.items.push(item);
  }
  return buckets;
}

// --- rendering ---------------------------------------------------------------

function render() {
  clear(list);
  const shownBooks = books.filter(book => !state.period || book.period === state.period);
  const items = state.view === 'books'
    ? shownBooks
    : events.filter(event =>
      state.kinds.has(event.kind) &&
      (!state.period || event.book.period === state.period) &&
      (!state.book || event.book.slug === state.book));

  if (!items.length) {
    renderJump([]);
    list.append(el('p', { class: 'astor-empty', text: state.view === 'events' && !state.kinds.size
      ? 'Tick at least one kind of date.'
      : 'Nothing matches. Choose another period or book.' }));
    return;
  }

  const buckets = grouped(items);
  renderJump(buckets);

  const first = items[0].year;
  const last = items[items.length - 1].year;
  const summary = el('p', { class: 'astor-tl-summary', text: state.view === 'books'
    ? items.length + (items.length === 1 ? ' book' : ' books') + ', first published ' + formatYear(first) + ' to ' + formatYear(last) + '. Open a book to see its own dates.'
    : items.length > 100
      ? 'Dates from every book, ' + formatYear(first) + ' to ' + formatYear(last) + '. Jump to a century, or untick a kind of date, to narrow the list.'
      : items.length + (items.length === 1 ? ' date' : ' dates') + ', ' + formatYear(first) + ' to ' + formatYear(last) + '.' });
  const markedBook = state.view === 'events' && state.mark && books.find(book => book.slug === state.mark);
  if (markedBook) {
    summary.append(' The dates for ' + markedBook.title + ' are marked. ', el('button', {
      type: 'button', class: 'astor-tl-unmark', text: 'Remove the marks',
      onclick: () => { state.mark = ''; render(); syncAddress(); }
    }));
  }
  list.append(summary);

  for (const bucket of buckets) {
    const section = el('section', { class: 'astor-tl-century', id: 'astor-tl-' + bucket.id, 'aria-labelledby': 'astor-tl-h-' + bucket.id });
    section.append(el('h2', { id: 'astor-tl-h-' + bucket.id, text: bucket.label }));
    const years = el('ol', { class: 'astor-tl-years' });
    for (const { year, items: entries } of bucket.years) {
      years.append(el('li', { class: 'astor-tl-year' }, [
        el('span', { class: 'astor-tl-date', text: formatYear(year) }),
        el('ul', { class: 'astor-tl-entries' }, entries.map(entry => state.view === 'books' ? bookLine(entry) : eventLine(entry)))
      ]));
    }
    section.append(years);
    list.append(section);
  }
}

function renderJump(buckets) {
  if (!jump) return;
  clear(jump);
  if (buckets.length < 2) { jump.hidden = true; return; }
  jump.hidden = false;
  jump.append(el('span', { text: 'Jump to' }));
  for (const bucket of buckets) {
    const count = bucket.years.reduce((total, year) => total + year.items.length, 0);
    jump.append(el('a', { href: '#astor-tl-' + bucket.id }, [
      bucket.label.replace(/^The /, ''),
      el('small', { text: String(count) })
    ]));
  }
}

function bookLine(book) {
  const dates = events.filter(event => event.book.slug === book.slug);
  const open = state.open.has(book.slug);
  const panelId = 'astor-tl-dates-' + book.slug;
  const item = el('li', { class: 'astor-tl-book' + (open ? ' is-open' : ''), id: 'astor-tl-book-' + book.slug });

  item.append(el('p', { class: 'astor-tl-title' }, [el('a', { href: book.href, text: book.title })]));
  item.append(el('p', { class: 'astor-tl-meta', text: [book.author, book.form].filter(Boolean).join(' · ') }));

  if (dates.length) {
    const toggle = el('button', {
      type: 'button', class: 'astor-tl-toggle', 'aria-expanded': String(open), 'aria-controls': panelId,
      text: open ? 'Hide its dates' : dates.length + (dates.length === 1 ? ' date' : ' dates') + ' for this book'
    });
    const panel = el('div', { class: 'astor-tl-dates', id: panelId, hidden: !open });
    if (open) fillDates(panel, book, dates);
    toggle.addEventListener('click', () => {
      const opening = !state.open.has(book.slug);
      if (opening) { state.open.add(book.slug); fillDates(panel, book, dates); }
      else state.open.delete(book.slug);
      panel.hidden = !opening;
      item.classList.toggle('is-open', opening);
      toggle.setAttribute('aria-expanded', String(opening));
      toggle.textContent = opening ? 'Hide its dates' : dates.length + (dates.length === 1 ? ' date' : ' dates') + ' for this book';
    });
    item.append(toggle, panel);
  }
  return item;
}

function fillDates(panel, book, dates) {
  clear(panel);
  if (book.written && String(book.written).trim() !== String(book.year)) {
    panel.append(el('p', { class: 'astor-tl-written' }, [el('span', { text: 'Written ' }), String(book.written)]));
  }
  panel.append(el('ol', { class: 'astor-tl-own' }, dates.map(event => el('li', { 'data-kind': event.kind }, [
    el('span', { class: 'astor-tl-date', text: formatYear(event.year) }),
    el('div', {}, [
      el('p', { class: 'astor-tl-label' }, [
        event.label,
        el('span', { class: 'astor-tl-kind-name', text: KIND_NAME.get(event.kind) || 'Context' })
      ]),
      event.detail ? el('p', { class: 'astor-tl-detail', text: event.detail }) : null
    ])
  ]))));
  panel.append(el('p', { class: 'astor-tl-more' }, [
    el('a', { href: '?view=events&mark=' + encodeURIComponent(book.slug), text: 'See these dates among every other book’s' })
  ]));
}

function eventLine(event) {
  return el('li', { class: 'astor-tl-event' + (state.mark && event.book.slug === state.mark ? ' is-marked' : ''), 'data-kind': event.kind }, [
    el('p', { class: 'astor-tl-label', text: event.label }),
    el('p', { class: 'astor-tl-meta' }, [
      el('a', { href: event.book.href, text: event.book.title }),
      el('span', { class: 'astor-tl-kind-name', text: KIND_NAME.get(event.kind) || 'Context' })
    ]),
    event.detail ? el('p', { class: 'astor-tl-detail', text: event.detail }) : null
  ]);
}

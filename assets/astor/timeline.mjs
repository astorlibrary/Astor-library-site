// The library timeline: every dated event held against every other.
//
// Each title's record carries the dates that matter to it — composition,
// printing, first performance, the political weather it was written into, its
// later life. Laid on one scale they answer a question no book page can: what
// else was being written while this was being written.

import { el, clear, announce, formatYear } from './util.mjs';
import { loadIndex } from './data.mjs';

const KINDS = [
  ['work', 'The book'],
  ['context', 'History'],
  ['author', 'The writer'],
  ['reception', 'Afterwards']
];

const controls = document.querySelector('#astor-timeline-controls');
const track = document.querySelector('#astor-timeline');
const detail = document.querySelector('#astor-timeline-detail');

// A thousand years on one axis puts 1606 and 1611 in the same pixel, so the
// page opens on the stretch of time most of the events actually fall in and
// offers the wider spans as a choice.
const SPANS = [
  ['all', 'Everything', -Infinity, Infinity],
  ['ancient', 'Before 1500', -Infinity, 1500],
  ['early-modern', '1500 to 1700', 1500, 1700],
  ['long-eighteenth', '1700 to 1830', 1700, 1830],
  ['victorian', '1830 to 1900', 1830, 1900],
  ['modern', '1900 onwards', 1900, Infinity]
];

// The page opens on the works themselves — when each book was written,
// performed or printed — because that is the one view every reader wants
// first. The other three kinds are a click away and the note says so.
const state = { kinds: new Set(['work']), period: 'all', book: 'all', span: 'all' };
let events = [];
let books = [];

if (track) start();

async function start() {
  let index;
  try {
    index = await loadIndex();
  } catch {
    track.append(el('p', { class: 'astor-empty', text: 'Couldn’t load the timeline. Try reloading the page.' }));
    return;
  }

  books = index.books.slice().sort((a, b) => a.title.localeCompare(b.title));
  events = index.books.flatMap(book => (book.timeline || []).map((event, position) => ({
    ...event,
    kind: event.kind || 'context',
    id: book.slug + ':' + position,
    book
  })));

  if (!events.length) {
    track.append(el('p', { class: 'astor-empty', text: 'No dates here yet.' }));
    return;
  }

  // Open on whichever span holds the most events, so the first view is the
  // one a reader can actually read.
  const busiest = SPANS.filter(span => span[0] !== 'all')
    .map(span => ({
      id: span[0],
      count: events.filter(event => (event.kind || 'context') === 'work' && event.year >= span[2] && event.year < span[3]).length
    }))
    .sort((a, b) => b.count - a.count)[0];
  if (busiest && busiest.count >= 8) state.span = busiest.id;

  buildControls();
  render();
}

function buildControls() {
  clear(controls);

  const periodSelect = el('select', { id: 'astor-timeline-period', 'aria-label': 'Filter by period' });
  periodSelect.append(el('option', { value: 'all', text: 'Every period' }));
  for (const period of [...new Set(books.map(book => book.period))].sort()) {
    periodSelect.append(el('option', { value: period, text: period }));
  }
  periodSelect.addEventListener('change', () => { state.period = periodSelect.value; render(); });
  controls.append(el('div', {}, [el('label', { for: periodSelect.id, text: 'Period' }), periodSelect]));

  const bookSelect = el('select', { id: 'astor-timeline-book', 'aria-label': 'Filter by book' });
  bookSelect.append(el('option', { value: 'all', text: 'Every book' }));
  for (const book of books) bookSelect.append(el('option', { value: book.slug, text: book.title }));
  bookSelect.addEventListener('change', () => { state.book = bookSelect.value; render(); });
  controls.append(el('div', {}, [el('label', { for: bookSelect.id, text: 'Book' }), bookSelect]));

  const spanSelect = el('select', { id: 'astor-timeline-span', 'aria-label': 'Time span' });
  for (const [id, label, from, to] of SPANS) {
    const count = events.filter(event => event.year >= from && event.year < to).length;
    spanSelect.append(el('option', { value: id, text: label + ' (' + count + ')', selected: id === state.span }));
  }
  spanSelect.addEventListener('change', () => { state.span = spanSelect.value; render(); });
  controls.append(el('div', {}, [el('label', { for: spanSelect.id, text: 'When' }), spanSelect]));

  const kindGroup = el('div', {}, [el('label', { text: 'Kind of event' })]);
  const row = el('div', { class: 'astor-tag-row' });
  for (const [kind, label] of KINDS) {
    const button = el('button', {
      class: 'astor-filter', type: 'button', 'aria-pressed': String(state.kinds.has(kind)), text: label,
      onclick: () => {
        if (state.kinds.has(kind)) state.kinds.delete(kind); else state.kinds.add(kind);
        button.setAttribute('aria-pressed', String(state.kinds.has(kind)));
        render();
      }
    });
    row.append(button);
  }
  kindGroup.append(row);
  controls.append(kindGroup);
}

function visible() {
  const span = SPANS.find(entry => entry[0] === state.span) || SPANS[0];
  return events.filter(event => {
    if (event.year < span[2] || event.year >= span[3]) return false;
    if (!state.kinds.has(event.kind)) return false;
    if (state.period !== 'all' && event.book.period !== state.period) return false;
    if (state.book !== 'all' && event.book.slug !== state.book) return false;
    return true;
  });
}

function render() {
  clear(track);
  const shown = visible().sort((a, b) => a.year - b.year);
  if (!shown.length) {
    track.append(el('p', { class: 'astor-empty', text: 'Nothing matches those filters.' }));
    detail.hidden = true;
    return;
  }

  const first = shown[0].year;
  const last = shown[shown.length - 1].year;

  // One marker per year, not one per event. Six books printed in 1850 would
  // otherwise need six rows to themselves and push everything else off the
  // screen; grouped, the year is one marker that opens all six.
  const byYear = new Map();
  for (const event of shown) {
    if (!byYear.has(event.year)) byYear.set(event.year, []);
    byYear.get(event.year).push(event);
  }
  const years = [...byYear.entries()].sort((a, b) => a[0] - b[0]);

  const boardWidth = track.clientWidth || 1100;
  if (boardWidth < 640) renderColumn(years, shown, first, last);
  else renderBoard(years, shown, first, last, boardWidth);
}

// A phone has no width to lay years along, so there the timeline runs down the
// page: the year on the left, what happened on the right, in order.
function renderColumn(years, shown, first, last) {
  const list = el('ol', { class: 'astor-timeline-column' });
  for (const [year, group] of years) {
    const kinds = new Set(group.map(event => event.kind));
    const button = el('button', {
      class: 'astor-timeline-event', type: 'button',
      'data-kind': kinds.size === 1 ? [...kinds][0] : 'mixed',
      'aria-expanded': 'false',
      text: group.length === 1 ? group[0].label : group.length + ' events'
    });
    button.addEventListener('click', () => select(year, group, button));
    list.append(el('li', {}, [
      el('span', { class: 'astor-timeline-year', text: formatYear(year) }),
      el('span', { class: 'astor-timeline-what' }, [
        button,
        el('span', { class: 'astor-timeline-books', text: [...new Set(group.map(event => event.book.title))].join(' \u00b7 ') })
      ])
    ]));
  }
  track.append(list);
  track.append(el('p', {
    class: 'astor-inline-note',
    text: shown.length + ' events in ' + years.length + ' different years, ' + formatYear(first) +
      ' to ' + formatYear(last) + '. Pick a year for details.'
  }));
}

function renderBoard(years, shown, first, last, boardWidth) {
  const span = Math.max(1, last - first);
  const scale = el('div', { class: 'astor-timeline-scale' });
  const steps = 6;
  for (let step = 0; step < steps; step += 1) {
    scale.append(el('span', { text: formatYear(Math.round(first + (span * step) / steps)) }));
  }
  track.append(scale);

  // A marker in the left half of the scale runs rightwards from its year and
  // one in the right half runs leftwards to it, so neither is pushed off the
  // page. Each joins the first row whose last marker finished before it starts.
  const markerWidth = Math.min(210, Math.max(118, Math.round(boardWidth / 3.4)));
  const widthPercent = (markerWidth / boardWidth) * 100;
  const padding = (8 / boardWidth) * 100;

  const rowEnds = [];
  const board = el('div', { class: 'astor-timeline-track' });
  for (const [year, group] of years) {
    const at = ((year - first) / span) * 100;
    const anchorsLeft = at <= 50;
    const markerStart = anchorsLeft ? at : at - widthPercent;
    const markerEnd = anchorsLeft ? at + widthPercent : at;

    let rowIndex = rowEnds.findIndex(rowEnd => markerStart >= rowEnd + padding);
    if (rowIndex < 0) { rowEnds.push(markerEnd); rowIndex = rowEnds.length - 1; } else rowEnds[rowIndex] = markerEnd;

    const label = group.length === 1
      ? formatYear(year) + ' \u00b7 ' + shorten(group[0].book.title)
      : formatYear(year) + ' \u00b7 ' + group.length + ' events';
    const kinds = new Set(group.map(event => event.kind));
    const button = el('button', {
      class: 'astor-timeline-event', type: 'button',
      'data-kind': kinds.size === 1 ? [...kinds][0] : 'mixed',
      'aria-expanded': 'false',
      'aria-label': formatYear(year) + ': ' + group.map(event => event.label).join('; '),
      style: (anchorsLeft ? 'left:' + at + '%;' : 'right:' + (100 - at) + '%;') +
        ' top:' + (rowIndex * 32) + 'px; width:' + markerWidth + 'px',
      text: label
    });
    button.addEventListener('click', () => select(year, group, button));
    board.append(button);
  }
  board.style.minHeight = (rowEnds.length * 32 + 20) + 'px';
  track.append(board);
  track.append(el('p', {
    class: 'astor-inline-note',
    text: shown.length + ' events in ' + years.length + ' different years, ' + formatYear(first) +
      ' to ' + formatYear(last) + '. Pick a year for details. ' +
      'Add more kinds of event with the buttons above.'
  }));
}

// A title in a marker has to fit beside its neighbours; the full one is in the
// panel the marker opens.
function shorten(title) {
  return title.length > 22 ? title.slice(0, 20).replace(/[\s,;:]+\S*$/, '') + '\u2026' : title;
}

function select(year, group, button) {
  for (const other of track.querySelectorAll('.astor-timeline-event')) other.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-expanded', 'true');
  clear(detail);
  detail.hidden = false;
  detail.append(el('p', { class: 'kicker', text: formatYear(year) }));
  detail.append(el('h3', {
    text: group.length === 1 ? group[0].label : group.length + ' things happened in ' + formatYear(year)
  }));

  for (const event of group) {
    detail.append(el('article', { class: 'astor-note' }, [
      el('h4', {}, [el('a', { href: event.book.href, text: event.book.title })]),
      el('p', { class: 'astor-quote-attribution', text: KINDS.find(kind => kind[0] === event.kind)?.[1] || 'Event' }),
      group.length === 1 ? null : el('p', { text: event.label }),
      event.detail ? el('p', { text: event.detail }) : null
    ]));
  }

  const neighbours = visible()
    .filter(other => other.year !== year && Math.abs(other.year - year) <= 12)
    .sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year))
    .slice(0, 5);
  if (neighbours.length) {
    detail.append(el('p', { class: 'astor-quote-attribution', text: 'Around the same time' }));
    detail.append(el('ul', { class: 'astor-question-list' }, neighbours.map(other =>
      el('li', {}, [el('a', { href: other.book.href, text: formatYear(other.year) + ' \u2014 ' + other.label })]))));
  }
  announce(detail, formatYear(year) + '. ' + group.map(event => event.label).join('. '));
}

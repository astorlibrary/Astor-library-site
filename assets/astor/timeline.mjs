// The library timeline: every dated event held against every other.
//
// Each title's record carries the dates that matter to it — composition,
// printing, first performance, the political weather it was written into, its
// later life. Laid on one scale they answer a question no book page can: what
// else was being written while this was being written.

import { el, clear, announce } from './util.mjs';
import { loadIndex } from './data.mjs';

const KINDS = [
  ['work', 'The work itself'],
  ['context', 'History around it'],
  ['author', 'The writer'],
  ['reception', 'Afterwards']
];

const controls = document.querySelector('#astor-timeline-controls');
const track = document.querySelector('#astor-timeline');
const detail = document.querySelector('#astor-timeline-detail');

const state = { kinds: new Set(KINDS.map(kind => kind[0])), period: 'all', book: 'all' };
let events = [];
let books = [];

if (track) start();

async function start() {
  let index;
  try {
    index = await loadIndex();
  } catch {
    track.append(el('p', { class: 'astor-empty', text: 'The timeline could not load. Each book page carries its own dated context.' }));
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
    track.append(el('p', { class: 'astor-empty', text: 'No dated events yet. They arrive with each title’s record.' }));
    return;
  }

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

  const kindGroup = el('div', {}, [el('label', { text: 'Kind of event' })]);
  const row = el('div', { class: 'astor-tag-row' });
  for (const [kind, label] of KINDS) {
    const button = el('button', {
      class: 'astor-filter', type: 'button', 'aria-pressed': 'true', text: label,
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
  return events.filter(event => {
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
  const span = Math.max(1, last - first);

  const scale = el('div', { class: 'astor-timeline-scale' });
  const steps = 6;
  for (let step = 0; step < steps; step += 1) {
    scale.append(el('span', { text: String(Math.round(first + (span * step) / steps)) }));
  }
  track.append(scale);

  // Events are stacked into rows so that near-identical years stay readable.
  const rows = [];
  const board = el('div', { class: 'astor-timeline-track' });
  for (const event of shown) {
    const left = ((event.year - first) / span) * 100;
    let rowIndex = rows.findIndex(lastLeft => left - lastLeft > 9);
    if (rowIndex < 0) { rows.push(left); rowIndex = rows.length - 1; } else rows[rowIndex] = left;
    const button = el('button', {
      class: 'astor-timeline-event', type: 'button',
      'data-kind': event.kind,
      'aria-expanded': 'false',
      style: 'left:' + left + '%; top:' + (rowIndex * 32) + 'px',
      text: event.year + ' · ' + event.book.title
    });
    button.addEventListener('click', () => select(event, button));
    board.append(button);
  }
  board.style.minHeight = (rows.length * 32 + 20) + 'px';
  track.append(board);
  track.append(el('p', {
    class: 'astor-inline-note',
    text: shown.length + ' events between ' + first + ' and ' + last + '. Select one to read it.'
  }));
}

function select(event, button) {
  for (const other of track.querySelectorAll('.astor-timeline-event')) other.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-expanded', 'true');
  clear(detail);
  detail.hidden = false;
  detail.append(el('p', { class: 'kicker', text: KINDS.find(kind => kind[0] === event.kind)?.[1] || 'Event' }));
  detail.append(el('h3', { text: event.year + ': ' + event.label }));
  if (event.detail) detail.append(el('p', { text: event.detail }));
  detail.append(el('p', {}, [
    el('a', { href: event.book.href, text: 'Read ' + event.book.title + ' →' })
  ]));
  const neighbours = visible()
    .filter(other => other.id !== event.id && Math.abs(other.year - event.year) <= 12)
    .sort((a, b) => Math.abs(a.year - event.year) - Math.abs(b.year - event.year))
    .slice(0, 4);
  if (neighbours.length) {
    detail.append(el('p', { class: 'astor-quote-attribution', text: 'Around the same time' }));
    detail.append(el('ul', { class: 'astor-question-list' }, neighbours.map(other =>
      el('li', {}, [el('a', { href: other.book.href, text: other.year + ' — ' + other.label }) ]))));
  }
  announce(detail, event.year + '. ' + event.label);
}

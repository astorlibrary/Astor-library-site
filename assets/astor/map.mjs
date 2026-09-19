// A map of where the books happen.
//
// Drawn as inline SVG on an equirectangular projection from coordinates held
// with each book's record. No tiles are fetched and no third party is
// contacted: the map is a grid, a set of points and a list, and the list is
// the part that carries the information.

import { el, clear } from './util.mjs';
import { loadIndex } from './data.mjs';

const controls = document.querySelector('#astor-map-controls');
const mapMount = document.querySelector('#astor-map');
const listMount = document.querySelector('#astor-map-list');

const VIEWS = {
  world: { name: 'The whole world', west: -180, east: 180, south: -60, north: 80 },
  europe: { name: 'Europe', west: -12, east: 32, south: 35, north: 62 },
  britain: { name: 'Britain and Ireland', west: -11, east: 3, south: 49.5, north: 59.5 },
  americas: { name: 'The Americas', west: -130, east: -30, south: -20, north: 62 }
};

let places = [];
let view = 'world';
let bookFilter = 'all';

if (mapMount) start();

async function start() {
  let index;
  try {
    index = await loadIndex();
  } catch {
    mapMount.append(el('p', { class: 'astor-empty', text: 'The map could not load. Each book page names its settings in the “At a glance” panel.' }));
    return;
  }

  places = index.books.flatMap(book => (book.places || []).map(place => ({ ...place, book })));
  if (!places.length) {
    mapMount.append(el('p', { class: 'astor-empty', text: 'No settings are plotted yet. They arrive with each title’s record.' }));
    return;
  }

  buildControls(index);
  render();
}

function buildControls(index) {
  clear(controls);

  const viewSelect = el('select', { id: 'astor-map-view', 'aria-label': 'Choose a view' });
  for (const [key, entry] of Object.entries(VIEWS)) {
    viewSelect.append(el('option', { value: key, text: entry.name }));
  }
  viewSelect.addEventListener('change', () => { view = viewSelect.value; render(); });
  controls.append(el('div', {}, [el('label', { for: viewSelect.id, text: 'View' }), viewSelect]));

  const bookSelect = el('select', { id: 'astor-map-book', 'aria-label': 'Filter by book' });
  bookSelect.append(el('option', { value: 'all', text: 'Every book' }));
  const withPlaces = index.books.filter(book => (book.places || []).length).sort((a, b) => a.title.localeCompare(b.title));
  for (const book of withPlaces) bookSelect.append(el('option', { value: book.slug, text: book.title }));

  const requested = new URLSearchParams(window.location.search).get('book');
  if (requested && withPlaces.some(book => book.slug === requested)) {
    bookFilter = requested;
    bookSelect.value = requested;
    const book = withPlaces.find(entry => entry.slug === requested);
    const fits = key => (book.places || []).every(place =>
      place.lon >= VIEWS[key].west && place.lon <= VIEWS[key].east &&
      place.lat >= VIEWS[key].south && place.lat <= VIEWS[key].north);
    view = ['britain', 'europe', 'americas', 'world'].find(fits) || 'world';
    viewSelect.value = view;
  }

  bookSelect.addEventListener('change', () => { bookFilter = bookSelect.value; render(); });
  controls.append(el('div', {}, [el('label', { for: bookSelect.id, text: 'Book' }), bookSelect]));
}

function svgEl(name, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function shown() {
  const bounds = VIEWS[view];
  return places.filter(place =>
    (bookFilter === 'all' || place.book.slug === bookFilter) &&
    place.lon >= bounds.west && place.lon <= bounds.east &&
    place.lat >= bounds.south && place.lat <= bounds.north);
}

function render() {
  clear(mapMount);
  clear(listMount);
  const bounds = VIEWS[view];
  const width = 960;
  const height = Math.round(width * ((bounds.north - bounds.south) / (bounds.east - bounds.west)) * 0.72);
  const visible = shown();

  const svg = svgEl('svg', {
    class: 'astor-graph',
    viewBox: '0 0 ' + width + ' ' + height,
    role: 'img',
    'aria-label': visible.length + ' places from the Astor Library catalogue, shown on ' + bounds.name.toLowerCase()
  });

  svg.append(svgEl('rect', { x: 0, y: 0, width, height, fill: '#fbf3e9' }));

  // A graticule rather than a coastline: the grid gives a sense of scale
  // without claiming a cartographic accuracy the page does not have.
  const grid = svgEl('g', { stroke: 'rgba(32,28,26,.12)', 'stroke-width': '1' });
  for (let longitude = Math.ceil(bounds.west / 10) * 10; longitude <= bounds.east; longitude += 10) {
    const x = project(longitude, bounds.south, bounds, width, height).x;
    grid.append(svgEl('line', { x1: x, y1: 0, x2: x, y2: height }));
  }
  for (let latitude = Math.ceil(bounds.south / 10) * 10; latitude <= bounds.north; latitude += 10) {
    const y = project(bounds.west, latitude, bounds, width, height).y;
    grid.append(svgEl('line', { x1: 0, y1: y, x2: width, y2: y }));
  }
  svg.append(grid);

  for (const place of visible) {
    const point = project(place.lon, place.lat, bounds, width, height);
    const node = svgEl('g', {
      class: 'astor-node', tabindex: '0', role: 'button',
      'aria-label': place.name + ', ' + place.book.title + '. ' + (place.note || '')
    });
    node.append(svgEl('circle', { cx: point.x, cy: point.y, r: 9 }));
    const label = svgEl('text', { x: point.x + 14, y: point.y + 4, 'text-anchor': 'start' });
    label.textContent = place.name;
    node.append(label);
    const select = () => highlight(place);
    node.addEventListener('click', select);
    node.addEventListener('focus', select);
    svg.append(node);
  }

  mapMount.append(svg);
  mapMount.append(el('p', {
    class: 'astor-inline-note',
    text: visible.length
      ? visible.length + ' place' + (visible.length === 1 ? '' : 's') + ' in view. Every one is listed below with what happens there.'
      : 'Nothing in this view. Try “The whole world”.'
  }));

  const grouped = new Map();
  for (const place of visible) {
    if (!grouped.has(place.book.slug)) grouped.set(place.book.slug, { book: place.book, places: [] });
    grouped.get(place.book.slug).places.push(place);
  }
  const grid2 = el('div', { class: 'astor-note-grid' });
  for (const entry of [...grouped.values()].sort((a, b) => a.book.title.localeCompare(b.book.title))) {
    grid2.append(el('article', { class: 'astor-note' }, [
      el('h4', {}, [el('a', { href: entry.book.href, text: entry.book.title })]),
      el('ul', { class: 'astor-question-list' }, entry.places.map(place =>
        el('li', { id: 'astor-place-' + place.book.slug + '-' + slugify(place.name), text: place.name + ' — ' + (place.note || '') })))
    ]));
  }
  listMount.append(grid2);
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function highlight(place) {
  const id = 'astor-place-' + place.book.slug + '-' + slugify(place.name);
  for (const item of listMount.querySelectorAll('li')) item.style.color = '';
  const target = document.getElementById(id);
  if (target) target.style.color = 'var(--burgundy)';
}

function project(longitude, latitude, bounds, width, height) {
  return {
    x: ((longitude - bounds.west) / (bounds.east - bounds.west)) * width,
    y: height - ((latitude - bounds.south) / (bounds.north - bounds.south)) * height
  };
}

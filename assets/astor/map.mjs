// A map of where the books happen.
//
// Drawn as inline SVG on an equirectangular projection from coordinates held
// with each book's record. No tiles are fetched and no third party is
// contacted: the map is a grid, a set of points and a list, and the list is
// the part that carries the information.
//
// Three hundred places do not fit three hundred labels, so the map shows dots
// and names only the one you choose. Every place is also in the list below,
// book by book, and choosing it there lights it on the map.

import { el, clear, announce, prefersReducedMotion } from './util.mjs';
import { loadIndex } from './data.mjs';

const controls = document.querySelector('#astor-map-controls');
const mapMount = document.querySelector('#astor-map');
const listMount = document.querySelector('#astor-map-list');

const VIEWS = {
  britain: { name: 'Britain and Ireland', west: -11, east: 3, south: 49.5, north: 59.5 },
  europe: { name: 'Europe', west: -12, east: 32, south: 35, north: 62 },
  americas: { name: 'The Americas', west: -130, east: -30, south: -20, north: 62 },
  world: { name: 'The whole world', west: -180, east: 180, south: -60, north: 80 }
};
const ORDER = ['britain', 'europe', 'americas', 'world'];

// Britain is taller than it is wide, and drawn to its true shape it would run
// to twelve hundred pixels on a desk. Each view is widened, sea on both sides,
// until the drawing is no taller than seven-tenths of its width.
for (const bounds of Object.values(VIEWS)) {
  const cosine = Math.cos(((bounds.north + bounds.south) / 2) * (Math.PI / 180));
  const needed = (bounds.north - bounds.south) / (0.7 * cosine);
  const span = bounds.east - bounds.west;
  if (needed > span) {
    bounds.west -= (needed - span) / 2;
    bounds.east += (needed - span) / 2;
  }
}

let places = [];
let view = 'britain';
let bookFilter = 'all';
let selected = null;
let live = null;

if (mapMount) start();

async function start() {
  let index;
  try {
    index = await loadIndex();
  } catch {
    mapMount.append(el('p', { class: 'astor-empty', text: 'The map could not load. Each book page names its settings in the “At a glance” panel.' }));
    return;
  }

  places = index.books.flatMap(book => (book.places || []).map((place, position) => ({
    ...place, book, id: book.slug + '-' + position
  })));
  if (!places.length) {
    mapMount.append(el('p', { class: 'astor-empty', text: 'No settings are plotted yet. They arrive with each title’s record.' }));
    return;
  }

  live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
  listMount.before(live);

  buildControls(index);
  render();

  if ('ResizeObserver' in window) {
    let lastWidth = mapMount.clientWidth;
    let timer = 0;
    new ResizeObserver(() => {
      const width = mapMount.clientWidth;
      if (Math.abs(width - lastWidth) < 8) return;
      lastWidth = width;
      window.clearTimeout(timer);
      timer = window.setTimeout(renderMap, 120);
    }).observe(mapMount);
  }
}

function fittingView(book) {
  const fits = key => (book.places || []).every(place =>
    place.lon >= VIEWS[key].west && place.lon <= VIEWS[key].east &&
    place.lat >= VIEWS[key].south && place.lat <= VIEWS[key].north);
  return ORDER.find(fits) || 'world';
}

function buildControls(index) {
  clear(controls);

  const viewSelect = el('select', { id: 'astor-map-view', 'aria-label': 'Choose a view' });
  for (const key of ORDER) {
    const count = places.filter(place => inView(place, VIEWS[key])).length;
    viewSelect.append(el('option', { value: key, text: VIEWS[key].name + ' (' + count + ')' }));
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
    view = fittingView(withPlaces.find(entry => entry.slug === requested));
  }
  viewSelect.value = view;

  bookSelect.addEventListener('change', () => {
    bookFilter = bookSelect.value;
    selected = null;
    if (bookFilter !== 'all') {
      view = fittingView(withPlaces.find(entry => entry.slug === bookFilter));
      viewSelect.value = view;
    }
    render();
  });
  controls.append(el('div', {}, [el('label', { for: bookSelect.id, text: 'Book' }), bookSelect]));
}

function svgEl(name, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function inView(place, bounds) {
  return place.lon >= bounds.west && place.lon <= bounds.east &&
    place.lat >= bounds.south && place.lat <= bounds.north;
}

function shown() {
  const bounds = VIEWS[view];
  return places.filter(place => (bookFilter === 'all' || place.book.slug === bookFilter) && inView(place, bounds));
}

function render() {
  renderMap();
  renderList();
}

function renderMap() {
  clear(mapMount);
  const bounds = VIEWS[view];
  const width = 960;
  // Degrees of longitude shrink towards the poles; scaling the height by the
  // cosine of the middle latitude keeps Britain roughly the shape it is.
  const midLatitude = ((bounds.north + bounds.south) / 2) * (Math.PI / 180);
  const height = Math.round(width * ((bounds.north - bounds.south) / (bounds.east - bounds.west)) / Math.cos(midLatitude));
  const visible = shown();

  // Dots are sized for the screen, not the drawing: on a phone the drawing is
  // scaled to a third of its width and a dot that stays readable there is
  // drawn three times as large.
  const scale = width / Math.max(240, mapMount.clientWidth || width);
  const radius = 5.5 * scale;
  const fontSize = 12 * scale;

  const svg = svgEl('svg', {
    class: 'astor-map-svg',
    viewBox: '0 0 ' + width + ' ' + height,
    role: 'group',
    'aria-label': visible.length + ' places from the Astor Library catalogue, shown on ' + bounds.name.toLowerCase()
  });

  svg.append(svgEl('rect', { x: 0, y: 0, width, height, fill: '#fbf3e9' }));

  // A graticule rather than a coastline: the grid gives a sense of scale
  // without claiming a cartographic accuracy the page does not have.
  const step = view === 'britain' ? 2 : view === 'europe' ? 5 : 20;
  const grid = svgEl('g', { stroke: 'rgba(32,28,26,.1)', 'stroke-width': String(scale) });
  for (let longitude = Math.ceil(bounds.west / step) * step; longitude <= bounds.east; longitude += step) {
    const x = project(longitude, bounds.south, bounds, width, height).x;
    grid.append(svgEl('line', { x1: x, y1: 0, x2: x, y2: height }));
  }
  for (let latitude = Math.ceil(bounds.south / step) * step; latitude <= bounds.north; latitude += step) {
    const y = project(bounds.west, latitude, bounds, width, height).y;
    grid.append(svgEl('line', { x1: 0, y1: y, x2: width, y2: y }));
  }
  svg.append(grid);

  const name = svgEl('text', { class: 'astor-map-name', x: 14 * scale, y: 22 * scale, 'font-size': fontSize * 0.9 });
  name.textContent = bounds.name + ' · ' + step + '° grid';
  svg.append(name);

  let selectedNode = null;
  for (const place of visible) {
    const point = project(place.lon, place.lat, bounds, width, height);
    const isSelected = selected === place.id;
    const node = svgEl('g', {
      class: 'astor-place' + (isSelected ? ' is-selected' : ''),
      tabindex: '0', role: 'button', 'aria-pressed': String(isSelected),
      'aria-label': place.name + ', ' + place.book.title + '.'
    });
    node.append(svgEl('circle', { cx: point.x, cy: point.y, r: isSelected ? radius * 1.5 : radius }));
    const title = svgEl('title');
    title.textContent = place.name + ' — ' + place.book.title;
    node.append(title);
    const choose = () => select(isSelected ? null : place.id, true);
    node.addEventListener('click', choose);
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
    });
    svg.append(node);
    if (isSelected) {
      selectedNode = node;
      // The label goes on whichever side has room.
      const leftward = point.x > width * 0.72;
      const label = svgEl('text', {
        class: 'astor-place-label',
        x: leftward ? point.x - radius * 2.2 : point.x + radius * 2.2,
        y: point.y + fontSize * 0.36,
        'font-size': fontSize,
        'text-anchor': leftward ? 'end' : 'start'
      });
      label.textContent = place.name + ' · ' + place.book.title;
      svg.append(label);
    }
  }
  mapMount.append(svg);
  if (selectedNode && !mapMount.contains(document.activeElement)) selectedNode.focus({ preventScroll: true });

  mapMount.append(el('p', {
    class: 'astor-inline-note',
    text: visible.length
      ? visible.length + ' place' + (visible.length === 1 ? '' : 's') + ' in view. Choose a dot to name it, or a place in the list below to find it on the map.'
      : 'Nothing in this view. Try “The whole world”.'
  }));
}

function renderList() {
  clear(listMount);
  const visible = shown();
  const grouped = new Map();
  for (const place of visible) {
    if (!grouped.has(place.book.slug)) grouped.set(place.book.slug, { book: place.book, places: [] });
    grouped.get(place.book.slug).places.push(place);
  }
  const books = [...grouped.values()].sort((a, b) => a.book.title.localeCompare(b.book.title));
  const wrap = el('div', { class: 'astor-place-books' });
  for (const entry of books) {
    const open = books.length === 1 || entry.places.some(place => place.id === selected);
    const details = el('details', { class: 'astor-place-book', id: 'astor-places-' + entry.book.slug, open });
    details.append(el('summary', {}, [
      el('span', { text: entry.book.title }),
      el('small', { text: entry.places.length + (entry.places.length === 1 ? ' place' : ' places') })
    ]));
    details.append(el('ul', {}, entry.places.map(place =>
      el('li', { id: 'astor-place-' + place.id, class: place.id === selected ? 'is-selected' : '' }, [
        el('button', { class: 'astor-link-button', type: 'button', text: place.name, onclick: () => select(place.id, false) }),
        document.createTextNode(place.note || ''),
        ' ',
        el('a', { href: entry.book.href, text: 'Book page →', class: 'astor-place-link' })
      ]))));
    wrap.append(details);
  }
  listMount.append(wrap);
}

function select(id, fromMap) {
  selected = id;
  renderMap();
  renderList();
  const place = places.find(entry => entry.id === id);
  if (!place) return;
  announce(live, place.name + ', ' + place.book.title + '. ' + (place.note || ''));
  if (fromMap) {
    document.getElementById('astor-place-' + id)?.scrollIntoView({ block: 'center', behavior: motion() });
  } else {
    mapMount.scrollIntoView({ block: 'nearest', behavior: motion() });
  }
}

function motion() {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

function project(longitude, latitude, bounds, width, height) {
  return {
    x: ((longitude - bounds.west) / (bounds.east - bounds.west)) * width,
    y: height - ((latitude - bounds.south) / (bounds.north - bounds.south)) * height
  };
}

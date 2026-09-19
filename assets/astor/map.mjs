// A map of where the books happen.
//
// Drawn as inline SVG on an equirectangular projection from coordinates held
// with each book's record. The coastlines and borders are Natural Earth's,
// prepared by scripts/build-map-geography.js and served from this site: no
// tiles are fetched and no third party is contacted.
//
// Three hundred places do not fit three hundred labels, and forty of them are
// in London. Places that fall on the same spot of the drawing are gathered
// into one numbered marker; names are lettered only where there is room for
// them; and choosing a marker lists what happens there beneath the map. Every
// place is also in the list below, book by book, and choosing it there lights
// it on the map.

import { el, clear, announce, prefersReducedMotion } from './util.mjs';
import { loadIndex, loadBook } from './data.mjs';

const controls = document.querySelector('#astor-map-controls');
// The page has one map. A book page borrows the same drawing for its own
// places through embedBookMap, which points these at a box of its own.
let mapMount = document.querySelector('#astor-map');
let listMount = document.querySelector('#astor-map-list');

const VIEWS = {
  london: { name: 'London and the South-East', west: -1.35, east: 1.5, south: 50.7, north: 52.1 },
  britain: { name: 'Britain and Ireland', west: -11, east: 3, south: 49.5, north: 59.5 },
  europe: { name: 'Europe', west: -12, east: 32, south: 35, north: 62 },
  americas: { name: 'The Americas', west: -130, east: -30, south: -20, north: 62 },
  world: { name: 'The whole world', west: -180, east: 180, south: -60, north: 80 }
};
const ORDER = ['london', 'britain', 'europe', 'americas', 'world'];

// Names that orient the eye. Seas are lettered in italic, lands in capitals.
const REFERENCE = {
  london: [
    ['Kent', 0.75, 51.2], ['Surrey', -0.45, 51.22], ['Sussex', -0.2, 50.95], ['Essex', 0.55, 51.82],
    ['Hertfordshire', -0.25, 51.85], ['Berkshire', -1.05, 51.43], ['Thames Estuary', 0.95, 51.5, 'sea'],
    ['English Channel', 0.2, 50.74, 'sea']
  ],
  britain: [
    ['England', -1.4, 52.7], ['Scotland', -4.2, 56.9], ['Wales', -3.7, 52.3], ['Ireland', -8, 53.3],
    ['France', 2.2, 49.9], ['North Sea', 2.6, 56.2, 'sea'], ['Irish Sea', -4.9, 53.8, 'sea'],
    ['English Channel', -1.5, 50.05, 'sea'], ['Atlantic Ocean', -11.5, 56.5, 'sea']
  ],
  europe: [
    ['Britain', -1.6, 52.6], ['Ireland', -8, 53.2], ['France', 2.5, 46.8], ['Spain', -3.7, 40.2], ['Germany', 10.3, 51],
    ['Italy', 12.6, 42.8], ['Norway', 9, 61], ['Sweden', 15.5, 60.5], ['Poland', 19.3, 52], ['Greece', 22, 39.4],
    ['Turkey', 30, 39], ['Russia', 30, 57], ['Mediterranean Sea', 17, 35.8, 'sea'], ['North Sea', 3, 56.4, 'sea'],
    ['Atlantic Ocean', -11, 45, 'sea'], ['Black Sea', 34, 43.3, 'sea'], ['Baltic Sea', 19.5, 56.8, 'sea']
  ],
  americas: [
    ['Canada', -105, 57], ['United States', -99, 39.5], ['Mexico', -102.5, 23.8], ['Brazil', -53, -10],
    ['Greenland', -42, 72], ['Pacific Ocean', -125, 12, 'sea'], ['Atlantic Ocean', -48, 27, 'sea'],
    ['Caribbean Sea', -75, 15, 'sea'], ['Gulf of Mexico', -90, 25, 'sea']
  ],
  world: [
    ['North America', -102, 45], ['South America', -59, -12], ['Europe', 16, 50], ['Africa', 20, 8], ['Asia', 90, 45],
    ['Australia', 134, -25], ['Atlantic Ocean', -35, 28, 'sea'], ['Pacific Ocean', -145, 5, 'sea'],
    ['Indian Ocean', 78, -22, 'sea'], ['Southern Ocean', 20, -56, 'sea'], ['Arctic Ocean', -10, 77, 'sea']
  ]
};

// A view is drawn to the shape of the box it is given: wide on a desk, tall
// on a phone, with sea added on whichever sides are needed to fill it.
function frame(key, width) {
  const base = VIEWS[key];
  const cosine = Math.cos(((base.north + base.south) / 2) * (Math.PI / 180));
  const tallest = width < 560 ? 1.25 : 0.62;
  const shortest = tallest * (width < 560 ? 0.92 : 0.72);
  let { west, east, south, north } = base;
  const ratio = ((north - south) / ((east - west) * cosine));
  if (ratio > tallest) {
    const needed = (north - south) / (tallest * cosine);
    west -= (needed - (east - west)) / 2;
    east += (needed - (base.east - base.west)) / 2;
  } else if (ratio < shortest) {
    const needed = (east - west) * cosine * shortest;
    south -= (needed - (north - south)) / 2;
    north += (needed - (base.north - base.south)) / 2;
    south = Math.max(south, -85); north = Math.min(north, 85);
  }
  const height = Math.round(width * ((north - south) / ((east - west) * cosine)));
  return { name: base.name, west, east, south, north, width, height };
}

const geography = new Map();
function loadGeography(key) {
  if (!geography.has(key)) {
    geography.set(key, fetch('/assets/astor/geo/' + key + '.json')
      .then(response => (response.ok ? response.json() : null))
      .catch(() => null));
  }
  return geography.get(key);
}

let places = [];
let view = 'britain';
let bookFilter = 'all';
let selected = null;
let selectedSpot = null;
let live = null;
let detailMount = null;
let drawing = 0;

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
  detailMount = el('div', { class: 'astor-map-detail' });
  mapMount.after(detailMount);

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

// The coastline files, and the ground each one covers in enough detail.
const GEOGRAPHY = [
  ['london', -2.6, 50.2, 2.8, 52.7], ['britain', -18, 47, 9, 62.5], ['europe', -40, 25, 60, 75],
  ['americas', -175, -60, -20, 84], ['world', -180, -90, 180, 90]
];

// A view fitted to one book's places, drawn from the most detailed coastline
// that covers them, so the Odyssey is the Aegean and not a speck on Europe.
function bookView(book) {
  const lons = book.places.map(place => place.lon);
  const lats = book.places.map(place => place.lat);
  let west = Math.min(...lons), east = Math.max(...lons), south = Math.min(...lats), north = Math.max(...lats);
  const pad = Math.max(0.5, Math.max(east - west, north - south) * 0.22);
  west -= pad; east += pad; south -= pad; north += pad;
  const [geography] = GEOGRAPHY.find(([, w, s2, e, n]) => west >= w && east <= e && south >= s2 && north <= n) || GEOGRAPHY[GEOGRAPHY.length - 1];
  // Too wide a spread for one fitted frame (the Pacific and the Atlantic in
  // one book) falls back to the widest named view that holds it.
  if (east - west > 200) return fittingView(book);
  VIEWS.book = { name: 'The places in ' + book.title, west, east, south: Math.max(-80, south), north: Math.min(84, north), geography };
  return 'book';
}

// Draws one book's places into a box on its own page. The toolkit calls this
// the first time the Context panel is opened.
export async function embedBookMap(root, slug) {
  const book = await loadBook(slug);
  if (!book || !(book.places || []).length) return null;
  clear(root);
  mapMount = el('div', { class: 'astor-book-map' });
  detailMount = el('div', { class: 'astor-map-detail' });
  live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
  listMount = null;
  root.append(el('div', { class: 'astor-graph-wrap' }, [mapMount]), live, detailMount);
  places = book.places.map((place, position) => ({ ...place, book, id: book.slug + '-' + position }));
  view = bookView(book);
  bookFilter = 'all';
  await renderMap();
  if ('ResizeObserver' in window) {
    let lastWidth = mapMount.clientWidth;
    let timer = 0;
    new ResizeObserver(() => {
      const width = mapMount.clientWidth;
      if (!width || Math.abs(width - lastWidth) < 8) return;
      lastWidth = width;
      window.clearTimeout(timer);
      timer = window.setTimeout(renderMap, 120);
    }).observe(mapMount);
  }
  return { view };
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
  viewSelect.addEventListener('change', () => { view = viewSelect.value; selectedSpot = null; render(); });
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
    selectedSpot = null;
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
  const bounds = frame(view, drawnWidth());
  return places.filter(place => (bookFilter === 'all' || place.book.slug === bookFilter) && inView(place, bounds));
}

function drawnWidth() {
  return Math.max(260, Math.floor(mapMount.clientWidth || 720));
}

function render() {
  renderMap();
  renderList();
}

// Gathers places that would be drawn on top of one another into one marker.
function gather(visible, bounds) {
  const reach = 15;
  const spots = [];
  for (const place of visible) {
    const point = project(place.lon, place.lat, bounds);
    let home = null;
    for (const spot of spots) {
      if (Math.hypot(spot.x - point.x, spot.y - point.y) <= reach) { home = spot; break; }
    }
    if (home) {
      home.places.push(place);
      home.x += (point.x - home.x) / home.places.length;
      home.y += (point.y - home.y) / home.places.length;
    } else {
      spots.push({ x: point.x, y: point.y, places: [place] });
    }
  }
  // A marker grows with what it holds, so two that were apart can come to
  // touch; those are joined, and joined again, until none do.
  const size = spot => (spot.places.length === 1 ? 6 : Math.min(17, 9 + Math.sqrt(spot.places.length) * 1.6));
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < spots.length && !merged; i += 1) {
      for (let j = i + 1; j < spots.length; j += 1) {
        const a = spots[i];
        const b = spots[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) >= size(a) + size(b) + 1) continue;
        const total = a.places.length + b.places.length;
        a.x = (a.x * a.places.length + b.x * b.places.length) / total;
        a.y = (a.y * a.places.length + b.y * b.places.length) / total;
        a.places.push(...b.places);
        spots.splice(j, 1);
        merged = true;
        break;
      }
    }
  }
  for (const spot of spots) {
    spot.key = spot.places.map(place => place.id).sort().join(' ');
    spot.radius = spot.places.length === 1 ? 6 : Math.min(17, 9 + Math.sqrt(spot.places.length) * 1.6);
    // A crowded marker is named for the place most of its books agree on.
    const tally = new Map();
    for (const place of spot.places) tally.set(place.name, (tally.get(place.name) || 0) + 1);
    const names = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
    spot.label = names.length === 1 ? names[0] : names[0] + ' +' + (names.length - 1);
  }
  return spots;
}

function overlaps(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

async function renderMap() {
  const turn = ++drawing;
  const width = drawnWidth();
  const bounds = frame(view, width);
  const height = bounds.height;
  const land = await loadGeography(VIEWS[view].geography || view);
  if (turn !== drawing) return;
  clear(mapMount);
  const visible = shown();
  const spots = gather(visible, bounds);
  const narrow = width < 560;
  const fontSize = narrow ? 11 : 12;

  const svg = svgEl('svg', {
    class: 'astor-map-svg',
    viewBox: '0 0 ' + width + ' ' + height,
    width, height,
    role: 'group',
    'aria-label': visible.length + ' places from the Astor Library catalogue, shown on a map of ' + bounds.name.replace(/^The /, 'the ')
  });
  svg.append(svgEl('rect', { class: 'astor-map-sea', x: 0, y: 0, width, height }));

  // The coast is held in degrees; one transform puts all of it in place.
  if (land) {
    const sx = width / (bounds.east - bounds.west);
    const sy = height / (bounds.north - bounds.south);
    const group = svgEl('g', { transform: 'translate(' + (-bounds.west * sx) + ' ' + (bounds.north * sy) + ') scale(' + sx + ' ' + (-sy) + ')' });
    group.append(svgEl('path', { class: 'astor-map-land', d: land.land }));
    if (land.borders) group.append(svgEl('path', { class: 'astor-map-border', d: land.borders }));
    svg.append(group);
  }

  const span = bounds.east - bounds.west;
  const step = span < 5 ? 0.5 : span < 24 ? 2 : span < 70 ? 5 : 20;
  const grid = svgEl('g', { class: 'astor-map-grid' });
  for (let longitude = Math.ceil(bounds.west / step) * step; longitude <= bounds.east; longitude += step) {
    const x = project(longitude, bounds.south, bounds).x;
    grid.append(svgEl('line', { x1: x, y1: 0, x2: x, y2: height }));
  }
  for (let latitude = Math.ceil(bounds.south / step) * step; latitude <= bounds.north; latitude += step) {
    const y = project(bounds.west, latitude, bounds).y;
    grid.append(svgEl('line', { x1: 0, y1: y, x2: width, y2: y }));
  }
  svg.append(grid);

  // Markers first claim their own ground, so nothing is lettered over one.
  const taken = [];
  const letter = (text, size) => text.length * size * 0.58;
  for (const spot of spots) {
    taken.push({ left: spot.x - spot.radius - 2, right: spot.x + spot.radius + 2, top: spot.y - spot.radius - 2, bottom: spot.y + spot.radius + 2 });
  }
  // Seas and countries are lettered last, into whatever room the book's own
  // places leave, but drawn underneath them.
  const referenceLayer = svgEl('g', { class: 'astor-map-references' });
  svg.append(referenceLayer);


  const isChosen = spot => spot.key === selectedSpot || spot.places.some(place => place.id === selected);
  const ordered = [...spots].sort((a, b) => (isChosen(b) - isChosen(a)) || (b.places.length - a.places.length));
  const labels = [];
  for (const spot of ordered) {
    const chosen = isChosen(spot);
    const text = chosen && selected ? (spot.places.find(place => place.id === selected)?.name || spot.label) : spot.label;
    const w = letter(text, fontSize) + 4;
    const h = fontSize + 4;
    const gap = spot.radius + 4;
    const options = [
      { anchor: 'start', x: spot.x + gap, y: spot.y, left: spot.x + gap, top: spot.y - h / 2 },
      { anchor: 'end', x: spot.x - gap, y: spot.y, left: spot.x - gap - w, top: spot.y - h / 2 },
      { anchor: 'middle', x: spot.x, y: spot.y - gap - h / 2 + 2, left: spot.x - w / 2, top: spot.y - gap - h + 2 },
      { anchor: 'middle', x: spot.x, y: spot.y + gap + h / 2 - 2, left: spot.x - w / 2, top: spot.y + gap - 2 }
    ];
    const fits = option => {
      const box = { left: option.left, right: option.left + w, top: option.top, bottom: option.top + h };
      if (box.left < 2 || box.right > width - 2 || box.top < 2 || box.bottom > height - 2) return null;
      return taken.some(other => overlaps(box, other)) ? null : box;
    };
    let placed = null;
    for (const option of options) {
      const box = fits(option);
      if (box) { placed = { option, box }; break; }
    }
    // "Troy (Hisarlik)" can be "Troy" where the gloss will not fit; the full
    // name is still in the panel and the list.
    const shorter = text.replace(/\s*\(.*?\)\s*/g, ' ').replace(/,.*$/, '').trim();
    if (!placed && shorter && shorter !== text) {
      const sw = letter(shorter, fontSize) + 4;
      const again = [
        { anchor: 'start', x: spot.x + gap, y: spot.y, left: spot.x + gap, top: spot.y - h / 2 },
        { anchor: 'end', x: spot.x - gap, y: spot.y, left: spot.x - gap - sw, top: spot.y - h / 2 },
        { anchor: 'middle', x: spot.x, y: spot.y - gap - h / 2 + 2, left: spot.x - sw / 2, top: spot.y - gap - h + 2 },
        { anchor: 'middle', x: spot.x, y: spot.y + gap + h / 2 - 2, left: spot.x - sw / 2, top: spot.y + gap - 2 }
      ];
      for (const option of again) {
        const box = { left: option.left, right: option.left + sw, top: option.top, bottom: option.top + h };
        if (box.left < 2 || box.right > width - 2 || box.top < 2 || box.bottom > height - 2) continue;
        if (taken.some(other => overlaps(box, other))) continue;
        placed = { option, box, text: shorter };
        break;
      }
    }
    // The chosen place is always named, even where it has to sit on something.
    if (!placed && chosen) {
      const option = options.find(entry => entry.left >= 2 && entry.left + w <= width - 2) || options[0];
      placed = { option, box: { left: option.left, right: option.left + w, top: option.top, bottom: option.top + h } };
    }
    if (!placed) continue;
    taken.push(placed.box);
    labels.push({ spot, text: placed.text || text, chosen, ...placed.option });
  }

  for (const [text, longitude, latitude, kind] of REFERENCE[VIEWS[view].geography || view] || []) {
    const point = project(longitude, latitude, bounds);
    const size = kind === 'sea' ? fontSize : fontSize - 1;
    const half = (kind === 'sea' ? letter(text, size) : letter(text, size) * 1.55) / 2;
    const box = { left: point.x - half, right: point.x + half, top: point.y - size, bottom: point.y + 3 };
    if (box.left < 4 || box.right > width - 4 || box.top < 4 || box.bottom > height - 4) continue;
    if (taken.some(other => overlaps(box, other))) continue;
    taken.push(box);
    const label = svgEl('text', {
      class: 'astor-map-reference' + (kind === 'sea' ? ' is-sea' : ''),
      x: point.x, y: point.y, 'text-anchor': 'middle', 'font-size': size
    });
    label.textContent = text;
    referenceLayer.append(label);
  }
  let selectedNode = null;
  for (const spot of spots) {
    const chosen = isChosen(spot);
    const many = spot.places.length > 1;
    const books = new Set(spot.places.map(place => place.book.title));
    const node = svgEl('g', {
      class: 'astor-place' + (chosen ? ' is-selected' : '') + (many ? ' is-many' : ''),
      tabindex: '0', role: 'button', 'aria-pressed': String(chosen),
      'aria-label': many
        ? spot.places.length + ' places near ' + spot.places[0].name + ', from ' + books.size + (books.size === 1 ? ' book.' : ' books.')
        : spot.places[0].name + ', ' + spot.places[0].book.title + '.'
    });
    node.append(svgEl('circle', { class: 'astor-place-hit', cx: spot.x, cy: spot.y, r: Math.max(18, spot.radius + 6) }));
    node.append(svgEl('circle', { class: 'astor-place-dot', cx: spot.x, cy: spot.y, r: spot.radius }));
    if (many) {
      const count = svgEl('text', { class: 'astor-place-count', x: spot.x, y: spot.y + 3.6, 'text-anchor': 'middle', 'font-size': 10.5 });
      count.textContent = String(spot.places.length);
      node.append(count);
    }
    const title = svgEl('title');
    title.textContent = many ? spot.places.length + ' places here' : spot.places[0].name + ' — ' + spot.places[0].book.title;
    node.append(title);
    const choose = () => {
      if (chosen) { selected = null; selectedSpot = null; render(); renderDetail(null); return; }
      selectedSpot = spot.key;
      selected = many ? null : spot.places[0].id;
      render();
      renderDetail(spot.places);
      announce(live, many ? spot.places.length + ' places here, listed beneath the map.' : spot.places[0].name + ', ' + spot.places[0].book.title + '. ' + (spot.places[0].note || ''));
    };
    node.addEventListener('click', choose);
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
    });
    svg.append(node);
    if (chosen) selectedNode = node;
  }

  const labelLayer = svgEl('g', { class: 'astor-place-labels', 'aria-hidden': 'true' });
  for (const label of labels) {
    const text = svgEl('text', {
      class: 'astor-place-label' + (label.chosen ? ' is-selected' : ''),
      x: label.x, y: label.y + fontSize * 0.36, 'text-anchor': label.anchor, 'font-size': fontSize
    });
    text.textContent = label.text;
    labelLayer.append(text);
  }
  svg.append(labelLayer);

  mapMount.append(svg);

  // Country and sea names were placed by estimate. Now they are drawn, measure
  // them, and drop any that touch a place name, a marker or each other.
  const clear2 = (a, b) => a.x + a.width + 2 < b.x || b.x + b.width + 2 < a.x || a.y + a.height + 2 < b.y || b.y + b.height + 2 < a.y;
  const blocking = [
    ...[...svg.querySelectorAll('.astor-place-label')].map(text => text.getBBox()),
    ...spots.map(spot => ({ x: spot.x - spot.radius, y: spot.y - spot.radius, width: spot.radius * 2, height: spot.radius * 2 }))
  ];
  for (const text of [...referenceLayer.children]) {
    let box;
    try { box = text.getBBox(); } catch { continue; }
    const outside = box.x < 2 || box.y < 2 || box.x + box.width > width - 2 || box.y + box.height > height - 2;
    if (outside || !blocking.every(other => clear2(box, other))) text.remove();
    else blocking.push(box);
  }

  if (selectedNode && !mapMount.contains(document.activeElement) && document.activeElement === document.body) {
    selectedNode.focus({ preventScroll: true });
  }

  mapMount.append(el('p', {
    class: 'astor-inline-note',
    text: visible.length
      ? visible.length + ' place' + (visible.length === 1 ? '' : 's') + ' in view' +
        (spots.length < visible.length ? ', gathered into ' + spots.length + ' markers where they crowd; a number is how many share the spot' : '') +
        '. Choose a marker to read what happens there. Coastlines: Natural Earth.'
      : 'Nothing in this view. Try “The whole world”.'
  }));

  // A place chosen from the list below lights its marker; say what is there.
  if (selected && !selectedSpot) {
    const spot = spots.find(entry => entry.places.some(place => place.id === selected));
    if (spot) renderDetail(spot.places.filter(place => place.id === selected));
  }
}

function renderDetail(chosen) {
  if (!detailMount) return;
  clear(detailMount);
  if (!chosen || !chosen.length) return;
  const byBook = new Map();
  for (const place of chosen) {
    if (!byBook.has(place.book.slug)) byBook.set(place.book.slug, { book: place.book, places: [] });
    byBook.get(place.book.slug).places.push(place);
  }
  // A crowded marker on a wide view can be opened out on a closer one.
  const here = ORDER.indexOf(view);
  const closer = chosen.length > 1 && here > 0
    ? ORDER.slice(0, here).find(key => chosen.filter(place => inView(place, VIEWS[key])).length >= chosen.length * 0.75)
    : null;
  const zoom = closer
    ? el('p', { class: 'astor-toolkit-actions' }, [el('button', {
      class: 'button secondary', type: 'button',
      text: 'Zoom to ' + VIEWS[closer].name.replace(/^The /, 'the '),
      onclick: () => {
        view = closer;
        selectedSpot = null;
        selected = null;
        const select = document.querySelector('#astor-map-view');
        if (select) select.value = closer;
        render();
        renderDetail(null);
        announce(live, 'Showing ' + VIEWS[closer].name + '.');
        mapMount.scrollIntoView({ block: 'nearest', behavior: motion() });
      }
    })])
    : null;
  detailMount.append(el('article', { class: 'astor-quote-card astor-map-card' }, [
    el('h3', { text: chosen.length === 1 ? chosen[0].name : chosen.length + ' places here' }),
    zoom,
    ...[...byBook.values()].sort((a, b) => a.book.title.localeCompare(b.book.title)).map(entry => {
      const list = el('ul', {}, entry.places.map(place => el('li', {}, [
        chosen.length === 1 ? null : el('strong', { text: place.name + (place.note ? ' — ' : '') }),
        document.createTextNode(place.note || '')
      ])));
      const link = el('p', { class: 'astor-map-card-link' }, [el('a', { href: entry.book.href, text: 'Open ' + entry.book.title + ' →' })]);
      // A marker holding many books folds them, so the panel stays a panel.
      if (byBook.size > 4) {
        return el('details', { class: 'astor-place-book' }, [
          el('summary', {}, [
            el('span', { text: entry.book.title }),
            el('small', { text: entry.places.length + (entry.places.length === 1 ? ' place' : ' places') })
          ]),
          list, link
        ]);
      }
      return el('div', { class: 'astor-map-card-book' }, [
        el('p', { class: 'astor-quote-attribution' }, [el('a', { href: entry.book.href, text: entry.book.title })]),
        list
      ]);
    })
  ]));
}

function renderList() {
  if (!listMount) return;
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
  selectedSpot = null;
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

function project(longitude, latitude, bounds) {
  return {
    x: ((longitude - bounds.west) / (bounds.east - bounds.west)) * bounds.width,
    y: bounds.height - ((latitude - bounds.south) / (bounds.north - bounds.south)) * bounds.height
  };
}

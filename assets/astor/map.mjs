// The map of settings, on a real map.
//
// MapLibre (hosted in assets/vendor) draws OpenStreetMap tiles served by
// OpenFreeMap. Places that share a spot are one marker; markers that crowd
// each other gather into numbered clusters that open as you zoom. Choosing a
// marker lists what happens there beneath the map.
//
// If the browser cannot draw WebGL, or the tiles do not arrive (no signal),
// the outline map in map-outline.mjs takes over, drawn from coastline files
// this site serves itself.

import { el, clear, announce } from './util.mjs';
import { loadIndex, loadBook } from './data.mjs';

const LIBRARY = '/assets/vendor/maplibre-gl-5.24.0/maplibre-gl.js';
const LIBRARY_CSS = '/assets/vendor/maplibre-gl-5.24.0/maplibre-gl.css';
const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const INK = '#6E1F2B';
const HEIGHT = 'height:min(68vh,640px);min-height:380px;width:100%;position:relative;background:#dfe8ea';
const BOOK_HEIGHT = 'height:min(52vh,460px);min-height:300px;width:100%;position:relative;background:#dfe8ea';
const PAPER = '#fffdfa';

const VIEWS = {
  london: { name: 'London and the South-East', bounds: [[-1.35, 50.7], [1.5, 52.1]] },
  britain: { name: 'Britain and Ireland', bounds: [[-10.8, 49.8], [2.2, 59.2]] },
  europe: { name: 'Europe', bounds: [[-12, 35], [32, 62]] },
  americas: { name: 'The Americas', bounds: [[-130, -20], [-30, 62]] },
  world: { name: 'The whole world', bounds: [[-170, -55], [175, 72]] }
};
const ORDER = ['london', 'britain', 'europe', 'americas', 'world'];

// --- loading the library ----------------------------------------------------

let library = null;

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function loadLibrary() {
  if (library) return library;
  library = new Promise((resolve, reject) => {
    if (!webglAvailable()) { reject(new Error('no webgl')); return; }
    if (window.maplibregl) { resolve(window.maplibregl); return; }
    if (!document.querySelector('link[href="' + LIBRARY_CSS + '"]')) {
      document.head.append(el('link', { rel: 'stylesheet', href: LIBRARY_CSS }));
    }
    const script = el('script', { src: LIBRARY });
    script.addEventListener('load', () => (window.maplibregl ? resolve(window.maplibregl) : reject(new Error('no library'))));
    script.addEventListener('error', () => reject(new Error('library failed')));
    document.head.append(script);
  });
  return library;
}

// --- the places ---------------------------------------------------------------

// Places at the same spot (forty books name London) become one marker.
function spots(places) {
  const byKey = new Map();
  for (const place of places) {
    const key = place.lon.toFixed(3) + ',' + place.lat.toFixed(3);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(place);
  }
  return [...byKey.values()].map((group, index) => {
    const tally = new Map();
    for (const place of group) tally.set(place.name, (tally.get(place.name) || 0) + 1);
    const name = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return {
      type: 'Feature',
      id: index + 1,
      geometry: { type: 'Point', coordinates: [group[0].lon, group[0].lat] },
      properties: {
        spot: index + 1,
        name: name.replace(/\s*\(.*?\)\s*/g, ' ').trim(),
        label: group.length > 1 ? name.replace(/\s*\(.*?\)\s*/g, ' ').trim() + ' · ' + group.length : name.replace(/\s*\(.*?\)\s*/g, ' ').trim(),
        count: group.length,
        ids: group.map(place => place.id).join(' ')
      }
    };
  });
}

function boundsOf(places) {
  const lons = places.map(place => place.lon);
  const lats = places.map(place => place.lat);
  return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
}

// --- drawing ------------------------------------------------------------------

function isTouch() {
  return window.matchMedia('(pointer: coarse)').matches;
}

// Builds a map in `container` and calls back with its methods once the style
// has loaded, or calls `failed` if it cannot.
function makeMap(maplibregl, container, options, failed) {
  let gone = false;
  let map;
  try {
    map = buildMap(maplibregl, container, options, () => giveUpSafely());
  } catch {
    failed();
    return null;
  }

  function giveUpSafely() {
    if (gone) return;
    gone = true;
    try { map.remove(); } catch { /* it may never have started */ }
    failed();
  }

  // A container with no height draws nothing. Give it one and tell the map.
  const watchSize = () => {
    if (gone) return;
    if (container.clientHeight < 40) {
      container.style.minHeight = '380px';
      try { map.resize(); } catch { /* not ready yet */ }
    }
  };
  window.setTimeout(watchSize, 400);
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!gone) { try { map.resize(); } catch { /* not ready */ } } }).observe(container);
  container.addEventListener('webglcontextlost', giveUpSafely);

  // A map built while the tab was in the background has drawn nothing. Draw
  // it when the reader comes back to it.
  document.addEventListener('visibilitychange', () => {
    if (gone || document.visibilityState !== 'visible') return;
    try { map.resize(); map.triggerRepaint(); } catch { /* not ready yet */ }
  });
  return map;
}

function buildMap(maplibregl, container, options, giveUpSafely) {
  let loaded = false;
  const map = new maplibregl.Map({
    container,
    style: STYLE,
    bounds: options.bounds,
    fitBoundsOptions: { padding: 36, maxZoom: options.maxZoom || 9 },
    attributionControl: { compact: true },
    cooperativeGestures: options.cooperative,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    maxZoom: 16
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  // Only a style that never arrives means no map. A slow or missing tile
  // after that is the map's own business.
  let styled = false;
  const giveUp = () => {
    if (loaded) return;
    window.clearTimeout(timer);
    giveUpSafely();
  };
  const timer = window.setTimeout(() => { if (!styled) giveUp(); }, 15000);
  map.on('error', () => { if (!styled) giveUp(); });

  // The markers go on as soon as the style is ready. Waiting for 'load'
  // would mean waiting for a drawn frame, which never comes while the page
  // is in a background tab.
  map.on('style.load', () => {
    styled = true;
    loaded = true;
    window.clearTimeout(timer);
    map.addSource('places', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterRadius: 38,
      clusterMaxZoom: 9,
      clusterProperties: { places: ['+', ['get', 'count']] }
    });
    map.addLayer({
      id: 'clusters', type: 'circle', source: 'places', filter: ['has', 'point_count'],
      paint: {
        'circle-color': INK,
        'circle-opacity': 0.92,
        'circle-radius': ['step', ['get', 'places'], 13, 5, 16, 15, 20, 40, 25],
        'circle-stroke-color': PAPER,
        'circle-stroke-width': 2
      }
    });
    map.addLayer({
      id: 'cluster-count', type: 'symbol', source: 'places', filter: ['has', 'point_count'],
      layout: { 'text-field': ['to-string', ['get', 'places']], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true },
      paint: { 'text-color': PAPER }
    });
    map.addLayer({
      id: 'spot', type: 'circle', source: 'places', filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': INK,
        'circle-radius': ['case', ['boolean', ['feature-state', 'chosen'], false], 9, ['>', ['get', 'count'], 1], 8, 6],
        'circle-stroke-color': ['case', ['boolean', ['feature-state', 'chosen'], false], '#b78a42', PAPER],
        'circle-stroke-width': ['case', ['boolean', ['feature-state', 'chosen'], false], 3, 2]
      }
    });
    // Invisible stand-ins the size of each marker. Names are laid out around
    // them, so a name never lands on a marker.
    const blocker = size => ({ width: size, height: size, data: new Uint8Array(size * size * 4) });
    try {
      if (!map.hasImage('astor-spot-block')) map.addImage('astor-spot-block', blocker(24));
      if (!map.hasImage('astor-cluster-block')) map.addImage('astor-cluster-block', blocker(56));
    } catch { /* names will simply lay themselves out around each other */ }
    map.addLayer({
      id: 'spot-block', type: 'symbol', source: 'places', filter: ['!', ['has', 'point_count']],
      layout: { 'icon-image': 'astor-spot-block', 'icon-allow-overlap': true, 'icon-size': 1 }
    });
    map.addLayer({
      id: 'cluster-block', type: 'symbol', source: 'places', filter: ['has', 'point_count'],
      layout: {
        'icon-image': 'astor-cluster-block',
        'icon-allow-overlap': true,
        'icon-size': ['step', ['get', 'places'], 0.55, 5, 0.65, 15, 0.78, 40, 0.95]
      }
    });
    map.addLayer({
      id: 'spot-name', type: 'symbol', source: 'places', filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 12,
        'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
        'text-radial-offset': 1,
        'text-padding': 3,
        'text-justify': 'auto',
        'text-max-width': 12
      },
      paint: { 'text-color': '#201c1a', 'text-halo-color': PAPER, 'text-halo-width': 1.6 }
    });

    for (const layer of ['clusters', 'spot']) {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    }

    // A cluster opens by zooming in; one that will not come apart (places too
    // close to separate) lists what it holds instead.
    map.on('click', 'clusters', async event => {
      const feature = event.features[0];
      const source = map.getSource('places');
      const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
      if (zoom > 12 || zoom <= map.getZoom() + 0.05) {
        const leaves = await source.getClusterLeaves(feature.properties.cluster_id, 1000, 0);
        options.onChoose(leaves.flatMap(leaf => leaf.properties.ids.split(' ')), null);
        return;
      }
      map.easeTo({ center: feature.geometry.coordinates, zoom });
    });
    map.on('click', 'spot', event => {
      const feature = event.features[0];
      options.onChoose(feature.properties.ids.split(' '), feature.id);
    });

    options.onReady(map);
  });
  return map;
}

// --- the detail panel and the list ------------------------------------------

function renderDetail(mount, chosen) {
  clear(mount);
  if (!chosen.length) return;
  const byBook = new Map();
  for (const place of chosen) {
    if (!byBook.has(place.book.slug)) byBook.set(place.book.slug, { book: place.book, places: [] });
    byBook.get(place.book.slug).places.push(place);
  }
  const books = [...byBook.values()].sort((a, b) => a.book.title.localeCompare(b.book.title));
  const names = [...new Set(chosen.map(place => place.name))];
  mount.append(el('article', { class: 'astor-quote-card astor-map-card' }, [
    el('h3', { text: names.length === 1 ? names[0] : chosen.length + ' places' }),
    ...books.map(entry => {
      const list = el('ul', {}, entry.places.map(place => el('li', {}, [
        names.length === 1 ? null : el('strong', { text: place.name + (place.note ? ' — ' : '') }),
        document.createTextNode(place.note || '')
      ])));
      if (books.length > 4) {
        return el('details', { class: 'astor-place-book' }, [
          el('summary', {}, [
            el('span', { text: entry.book.title }),
            el('small', { text: entry.places.length + (entry.places.length === 1 ? ' place' : ' places') })
          ]),
          list,
          el('p', { class: 'astor-map-card-link' }, [el('a', { href: entry.book.href, text: entry.book.title + ' →' })])
        ]);
      }
      return el('div', { class: 'astor-map-card-book' }, [
        el('p', { class: 'astor-quote-attribution' }, [el('a', { href: entry.book.href, text: entry.book.title })]),
        list
      ]);
    })
  ]));
}

function renderList(mount, places, onPick) {
  clear(mount);
  const grouped = new Map();
  for (const place of places) {
    if (!grouped.has(place.book.slug)) grouped.set(place.book.slug, { book: place.book, places: [] });
    grouped.get(place.book.slug).places.push(place);
  }
  const books = [...grouped.values()].sort((a, b) => a.book.title.localeCompare(b.book.title));
  const wrap = el('div', { class: 'astor-place-books' });
  for (const entry of books) {
    const details = el('details', { class: 'astor-place-book', id: 'astor-places-' + entry.book.slug, open: books.length === 1 });
    details.append(el('summary', {}, [
      el('span', { text: entry.book.title }),
      el('small', { text: entry.places.length + (entry.places.length === 1 ? ' place' : ' places') })
    ]));
    details.append(el('ul', {}, entry.places.map(place =>
      el('li', { id: 'astor-place-' + place.id }, [
        el('button', { class: 'astor-link-button', type: 'button', text: place.name, onclick: () => onPick(place) }),
        document.createTextNode(place.note ? ' ' + place.note + ' ' : ' '),
        el('a', { href: entry.book.href, text: 'Book →', class: 'astor-place-link' })
      ]))));
    wrap.append(details);
  }
  mount.append(wrap);
}

// --- the explorer page --------------------------------------------------------

const controls = document.querySelector('#astor-map-controls');
const explorerMount = document.querySelector('#astor-map');
const listMount = document.querySelector('#astor-map-list');

if (explorerMount) startExplorer();

async function startExplorer() {
  let maplibregl;
  let index;
  try {
    [maplibregl, index] = await Promise.all([loadLibrary(), loadIndex()]);
  } catch {
    import('./map-outline.mjs');
    return;
  }

  const places = index.books.flatMap(book => (book.places || []).map((place, position) => ({ ...place, book, id: book.slug + '-' + position })));
  if (!places.length) {
    explorerMount.append(el('p', { class: 'astor-empty', text: 'No places yet.' }));
    return;
  }
  const byId = new Map(places.map(place => [place.id, place]));
  const withPlaces = index.books.filter(book => (book.places || []).length).sort((a, b) => a.title.localeCompare(b.title));

  const holder = el('div', { class: 'astor-slippy', style: HEIGHT, role: 'region', 'aria-label': 'Map of where the books are set' });
  const note = el('p', { class: 'astor-inline-note', text: 'Tap a marker to see what happens there.' });
  const live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
  const detail = el('div', { class: 'astor-map-detail' });
  explorerMount.append(holder, note);
  explorerMount.closest('.astor-graph-wrap')?.classList.add('has-slippy');
  (explorerMount.closest('.astor-graph-wrap') || explorerMount).after(live, detail);

  let map = null;
  let chosenSpot = null;
  let book = 'all';

  const shown = () => (book === 'all' ? places : places.filter(place => place.book.slug === book));

  function choose(ids, spotId) {
    const chosen = ids.map(id => byId.get(id)).filter(Boolean);
    if (map && chosenSpot !== null) map.setFeatureState({ source: 'places', id: chosenSpot }, { chosen: false });
    chosenSpot = spotId;
    if (map && spotId !== null) map.setFeatureState({ source: 'places', id: spotId }, { chosen: true });
    renderDetail(detail, chosen);
    announce(live, chosen.length === 1 ? chosen[0].name + ', ' + chosen[0].book.title + '.' : chosen.length + ' places, listed below the map.');
  }

  // Choosing from the list shows the place at once, then the map catches up
  // and lights its marker.
  function pick(place) {
    choose([place.id], null);
    if (!map) return;
    holder.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    map.flyTo({ center: [place.lon, place.lat], zoom: Math.max(map.getZoom(), 10) });
    map.once('idle', () => {
      try {
        const feature = map.querySourceFeatures('places')
          .find(item => !item.properties.point_count && String(item.properties.ids).split(' ').includes(place.id));
        if (feature && feature.id !== undefined) {
          if (chosenSpot !== null) map.setFeatureState({ source: 'places', id: chosenSpot }, { chosen: false });
          chosenSpot = feature.id;
          map.setFeatureState({ source: 'places', id: feature.id }, { chosen: true });
        }
      } catch { /* the panel is already showing the place */ }
    });
  }

  function refresh(fit) {
    if (!map) return;
    const current = shown();
    chosenSpot = null;
    map.getSource('places').setData({ type: 'FeatureCollection', features: spots(current) });
    renderList(listMount, current, pick);
    clear(detail);
    if (fit) map.fitBounds(fit, { padding: 36, maxZoom: 9, duration: 600 });
  }

  // Controls: a view to jump to, and a book to show on its own.
  clear(controls);
  const viewSelect = el('select', { id: 'astor-map-view' });
  for (const key of ORDER) viewSelect.append(el('option', { value: key, text: VIEWS[key].name }));
  viewSelect.value = 'britain';
  const bookSelect = el('select', { id: 'astor-map-book' });
  bookSelect.append(el('option', { value: 'all', text: 'Every book' }));
  for (const entry of withPlaces) bookSelect.append(el('option', { value: entry.slug, text: entry.title }));
  controls.append(
    el('div', {}, [el('label', { for: viewSelect.id, text: 'Go to' }), viewSelect]),
    el('div', {}, [el('label', { for: bookSelect.id, text: 'Book' }), bookSelect])
  );
  viewSelect.addEventListener('change', () => map?.fitBounds(VIEWS[viewSelect.value].bounds, { padding: 24, duration: 700 }));
  bookSelect.addEventListener('change', () => {
    book = bookSelect.value;
    refresh(book === 'all' ? VIEWS[viewSelect.value].bounds : boundsOf(shown()));
  });

  const requested = new URLSearchParams(window.location.search).get('book');
  if (requested && withPlaces.some(entry => entry.slug === requested)) {
    book = requested;
    bookSelect.value = requested;
  }

  makeMap(maplibregl, holder, {
    bounds: book === 'all' ? VIEWS.britain.bounds : boundsOf(shown()),
    cooperative: isTouch(),
    onChoose: choose,
    onReady: ready => { map = ready; refresh(null); }
  }, () => {
    // No tiles: hand the page to the outline map.
    clear(explorerMount);
    clear(controls);
    live.remove();
    detail.remove();
    explorerMount.closest('.astor-graph-wrap')?.classList.remove('has-slippy');
    import('./map-outline.mjs');
  });
}

// --- a book page ----------------------------------------------------------------

// Draws one book's places on its own page. The book-page tools call this the
// first time the Context tab is opened.
export async function embedBookMap(root, slug) {
  const book = await loadBook(slug);
  if (!book || !(book.places || []).length) return null;
  let maplibregl;
  try {
    maplibregl = await loadLibrary();
  } catch {
    return (await import('./map-outline.mjs')).embedBookMap(root, slug);
  }
  const places = book.places.map((place, position) => ({ ...place, book, id: book.slug + '-' + position }));
  const byId = new Map(places.map(place => [place.id, place]));

  clear(root);
  const holder = el('div', { class: 'astor-slippy is-book', style: BOOK_HEIGHT, role: 'region', 'aria-label': 'Map of where ' + book.title + ' is set' });
  const live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
  const detail = el('div', { class: 'astor-map-detail' });
  root.append(el('div', { class: 'astor-graph-wrap has-slippy' }, [holder]), live, detail);

  return new Promise(resolve => {
    let chosenSpot = null;
    let map = null;
    makeMap(maplibregl, holder, {
      bounds: boundsOf(places),
      maxZoom: 8,
      cooperative: true,
      onChoose: (ids, spotId) => {
        if (map && chosenSpot !== null) map.setFeatureState({ source: 'places', id: chosenSpot }, { chosen: false });
        chosenSpot = spotId;
        if (map && spotId !== null) map.setFeatureState({ source: 'places', id: spotId }, { chosen: true });
        const chosen = ids.map(id => byId.get(id)).filter(Boolean);
        renderDetail(detail, chosen);
        announce(live, chosen.map(place => place.name).join(', ') + '.');
      },
      onReady: ready => {
        map = ready;
        map.getSource('places').setData({ type: 'FeatureCollection', features: spots(places) });
        resolve({ view: 'book' });
      }
    }, async () => {
      resolve(await (await import('./map-outline.mjs')).embedBookMap(root, slug));
    });
  });
}

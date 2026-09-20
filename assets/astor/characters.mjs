// Character relationship maps.
//
// Each title's characters are placed around a ring and the relationships drawn
// between them. Relationships can declare the stages they hold in, so stepping
// through the acts redraws the map and a household can be watched coming apart
// in the right order.
//
// The diagram is inline SVG with no library behind it, drawn at the size of
// the box it sits in rather than scaled down from a fixed canvas, so the type
// is the same size on a phone as on a desk. Names sit outside the ring where
// they cannot collide with the lines, and the lines carry no text: choosing a
// character lights their connections on the drawing and spells each one out
// in the panel beneath, where there is room to. Every node is focusable, so
// nothing is trapped in a picture.

import { el, clear, prefersReducedMotion } from './util.mjs';
import { withBooks } from './chooser.mjs';
import { loadBook } from './data.mjs';

const KINDS = [
  ['marriage', 'Marriage'], ['family', 'Family'], ['love', 'Love'], ['friendship', 'Friendship'],
  ['ally', 'Ally'], ['mentor', 'Mentor'], ['service', 'Service'],
  ['rival', 'Rival'], ['enemy', 'Enemy'], ['doubling', 'Doubling']
];

const chooser = document.querySelector('#astor-character-chooser');
const graphMount = document.querySelector('#astor-character-graph');

if (graphMount) {
  withBooks(chooser, { label: 'Choose a book', filter: book => book.characters.length >= 3 }, book => {
    mountCharacterMap({
      graph: graphMount,
      switcher: document.querySelector('#astor-stage-switch'),
      detail: document.querySelector('#astor-character-detail')
    }, book);
  });
}

function svgEl(name, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) continue;
    node.setAttribute(key, String(value));
  }
  return node;
}

// Sets up the map, the stage switch and the entry panel for one book inside
// the given mounts. The book-page toolkit and the explorer both call this.
export function mountCharacterMap(mounts, book) {
  const state = { stage: 'all', selected: null };
  let observer = null;

  function draw() {
    if (mounts.switcher) renderSwitch(mounts.switcher, book, state.stage, next => { state.stage = next; draw(); });
    renderGraph(mounts.graph, book, state, id => { state.selected = state.selected === id ? null : id; draw(); });
    if (mounts.detail) renderDetail(mounts.detail, book, state, id => { state.selected = id; draw(); });
  }
  draw();

  // A resize means a different width to draw at; a redraw keeps the selection.
  if ('ResizeObserver' in window) {
    let lastWidth = mounts.graph.clientWidth;
    let timer = 0;
    observer = new ResizeObserver(() => {
      const width = mounts.graph.clientWidth;
      if (Math.abs(width - lastWidth) < 8) return;
      lastWidth = width;
      window.clearTimeout(timer);
      timer = window.setTimeout(draw, 120);
    });
    observer.observe(mounts.graph);
  }
  return { redraw: draw, disconnect: () => observer?.disconnect() };
}

// Loads a record and draws it into a box on a book page. The toolkit calls
// this the first time the Characters tab is opened.
export async function embedCharacterMap(root, slug) {
  const book = await loadBook(slug);
  if (!book || (book.characters || []).length < 3) return null;
  clear(root);
  const switcher = el('div', { class: 'astor-stage-switch' });
  const graph = el('div', { class: 'astor-graph-wrap' });
  const detail = el('div', { class: 'astor-character-detail' });
  root.append(switcher, graph, detail);
  return mountCharacterMap({ switcher, graph, detail }, book);
}

function renderSwitch(switcher, book, current, onChange) {
  clear(switcher);
  const options = [{ id: 'all', label: 'The whole book' }, ...book.structure.map(item => ({ id: item.id, label: item.label }))];
  for (const option of options) {
    switcher.append(el('button', {
      class: 'astor-filter', type: 'button',
      'aria-pressed': String(option.id === current),
      text: option.label,
      onclick: () => onChange(option.id)
    }));
  }
}

function edgesFor(book, stage) {
  const known = new Set(book.characters.map(character => character.id));
  const edges = [];
  const seen = new Set();
  for (const character of book.characters) {
    for (const relationship of character.relationships || []) {
      if (!known.has(relationship.to) || relationship.to === character.id) continue;
      const stages = relationship.stages || [];
      if (stage !== 'all' && stages.length && !stages.includes(stage)) continue;
      // Two characters who each declare the relationship should get one line.
      const key = [character.id, relationship.to].sort().join('|') + '|' + relationship.label;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: character.id, to: relationship.to, label: relationship.label, kind: relationship.kind || 'ally', stages });
    }
  }
  return edges;
}

// The name as it is lettered on the map: the record's own shortName where it
// has one, otherwise the full name without any bracketed gloss.
function displayName(character) {
  return (character.shortName || character.name.replace(/\s*\(.*?\)\s*/g, ' ')).trim();
}

// Measures lettering in the type the map is actually set in, so the layout
// works from real widths and never from a guess at them.
function textMeasurer(mount, fontSize) {
  const probe = svgEl('svg', { class: 'astor-graph', width: 10, height: 10, 'aria-hidden': 'true' });
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  const node = svgEl('g', { class: 'astor-node' });
  const text = svgEl('text', { class: 'astor-node-label', 'font-size': fontSize });
  node.append(text);
  probe.append(node);
  mount.append(probe);
  const cache = new Map();
  const measure = value => {
    if (cache.has(value)) return cache.get(value);
    text.textContent = value;
    let width = 0;
    try { width = text.getComputedTextLength(); } catch (error) { width = 0; }
    if (!width) width = value.length * fontSize * 0.62;
    cache.set(value, width);
    return width;
  };
  measure.done = () => probe.remove();
  return measure;
}

// Breaks a name into lines no wider than the limit. A single word wider than
// the limit keeps a line to itself rather than being cut.
function wrapName(name, limit, measure) {
  const lines = [];
  let line = '';
  for (const word of name.split(/\s+/)) {
    const trial = line ? line + ' ' + word : word;
    if (line && measure(trial) > limit) { lines.push(line); line = word; } else line = trial;
  }
  if (line) lines.push(line);
  // A short connective stranded on its own line reads better joined to the
  // shorter of its neighbours, when that still fits.
  for (let index = lines.length - 2; index >= 1; index -= 1) {
    if (lines[index].length > 3) continue;
    const up = lines[index - 1] + ' ' + lines[index];
    const down = lines[index] + ' ' + lines[index + 1];
    if (measure(down) <= limit && measure(down) <= measure(up)) lines.splice(index, 2, down);
    else if (measure(up) <= limit) lines.splice(index - 1, 2, up);
  }
  return lines;
}

// Points spaced by equal arc length around an ellipse, starting at the top.
function ellipsePoints(count, rx, ry) {
  const samples = 720;
  const points = [];
  let length = 0;
  let previous = null;
  for (let index = 0; index <= samples; index += 1) {
    const angle = -Math.PI / 2 + (index / samples) * Math.PI * 2;
    const point = { x: Math.cos(angle) * rx, y: Math.sin(angle) * ry, angle };
    if (previous) length += Math.hypot(point.x - previous.x, point.y - previous.y);
    points.push({ ...point, at: length });
    previous = point;
  }
  const result = [];
  for (let index = 0; index < count; index += 1) {
    const target = (index / count) * length;
    const point = points.find(candidate => candidate.at >= target) || points[points.length - 1];
    result.push(point);
  }
  return result;
}

// Places every node and its lettering for a ring of the given radii, with the
// centre of the ring at the origin. Each label is a box: side labels are
// centred on their node, the ones at the top and bottom stand clear above and
// below it.
function placeRing(items, rx, ry, lineHeight) {
  const points = ellipsePoints(items.length, rx, ry);
  return items.map((item, index) => {
    const point = points[index];
    const cos = Math.cos(point.angle);
    const sin = Math.sin(point.angle);
    const gap = item.radius + 6;
    const blockHeight = item.lines.length * lineHeight;
    let anchor = 'middle';
    if (cos > 0.2) anchor = 'start'; else if (cos < -0.2) anchor = 'end';
    let left;
    let top;
    if (anchor === 'middle') {
      left = point.x - item.width / 2;
      top = sin < 0 ? point.y - gap - blockHeight : point.y + gap;
    } else {
      left = anchor === 'start' ? point.x + gap : point.x - gap - item.width;
      // Lean the block a little away from the ring's waist, so labels towards
      // the top ride high and those towards the bottom ride low.
      top = point.y - blockHeight / 2 + sin * blockHeight * 0.35;
    }
    return {
      ...item, x: point.x, y: point.y, anchor,
      box: { left, top, right: left + item.width, bottom: top + blockHeight }
    };
  });
}

function boxesCollide(placed) {
  const pad = 3;
  const hit = (a, b) => a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad;
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = 0; j < placed.length; j += 1) {
      if (i === j) continue;
      if (j > i && hit(placed[i].box, placed[j].box)) return true;
      const other = placed[j];
      const disc = { left: other.x - other.radius, right: other.x + other.radius, top: other.y - other.radius, bottom: other.y + other.radius };
      if (hit(placed[i].box, disc)) return true;
    }
  }
  return false;
}

function extent(placed) {
  const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  for (const item of placed) {
    bounds.left = Math.min(bounds.left, item.box.left, item.x - item.radius);
    bounds.right = Math.max(bounds.right, item.box.right, item.x + item.radius);
    bounds.top = Math.min(bounds.top, item.box.top, item.y - item.radius);
    bounds.bottom = Math.max(bounds.bottom, item.box.bottom, item.y + item.radius);
  }
  return bounds;
}

// Finds a ring that fits the width it is given with every name whole, inside
// the drawing, and clear of every other name and node. The ring is made as
// wide as the lettering allows, then grown taller until nothing touches.
function layoutRing(items, width, lineHeight, narrow) {
  const margin = 6;
  const minimumRx = 44;
  const maximumRx = 230;
  let rx = Math.min(maximumRx, Math.max(minimumRx, width / 2 - 120));
  let ry = Math.max(rx, Math.min(narrow ? 380 : 300, (items.length * (narrow ? 40 : 46)) / Math.PI));
  let placed = placeRing(items, rx, ry, lineHeight);
  let shrunk = false;
  for (let pass = 0; pass < 60; pass += 1) {
    placed = placeRing(items, rx, ry, lineHeight);
    const bounds = extent(placed);
    const spare = width - 2 * margin - (bounds.right - bounds.left);
    if (spare < -0.5 && rx > minimumRx) { rx = Math.max(minimumRx, rx + spare / 2 - 1); shrunk = true; continue; }
    if (!shrunk && spare > 24 && rx < ry && rx < maximumRx) { rx = Math.min(ry, maximumRx, rx + spare / 2 - 4); continue; }
    if (boxesCollide(placed)) { ry = Math.round(ry * 1.1 + 6); continue; }
    break;
  }
  const bounds = extent(placed);
  return { placed, bounds, rx, ry };
}

function renderGraph(mount, book, state, onToggle) {
  clear(mount);
  const characters = book.characters;
  const edges = edgesFor(book, state.stage);
  // Node sizes follow the whole book, so a node does not change size, and the
  // map does not shuffle, as the acts are stepped through.
  const weight = new Map(characters.map(character => [character.id, 0]));
  for (const edge of edgesFor(book, 'all')) {
    weight.set(edge.from, weight.get(edge.from) + 1);
    weight.set(edge.to, weight.get(edge.to) + 1);
  }
  const degree = new Map(characters.map(character => [character.id, 0]));
  for (const edge of edges) {
    degree.set(edge.from, degree.get(edge.from) + 1);
    degree.set(edge.to, degree.get(edge.to) + 1);
  }
  const neighbours = new Set();
  if (state.selected) {
    for (const edge of edges) {
      if (edge.from === state.selected) neighbours.add(edge.to);
      if (edge.to === state.selected) neighbours.add(edge.from);
    }
  }

  // Everything is measured in pixels of the box the map is drawn into.
  const style = window.getComputedStyle(mount);
  const inner = (mount.clientWidth || 640) - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0);
  const width = Math.max(260, Math.floor(inner));
  const narrow = width < 560;
  const fontSize = narrow ? 12 : 13;
  const lineHeight = Math.round(fontSize * 1.22);
  const measure = textMeasurer(mount, fontSize);
  const lineLimit = narrow ? Math.min(84, width * 0.24) : 170;
  const items = characters.map(character => {
    const lines = wrapName(displayName(character), lineLimit, measure);
    return {
      id: character.id,
      lines,
      width: Math.ceil(Math.max(...lines.map(measure))) + 2,
      radius: 6 + Math.min(weight.get(character.id), 6) * 1.3
    };
  });
  measure.done();

  const { placed, bounds } = layoutRing(items, width, lineHeight, narrow);
  const padY = 10;
  const height = Math.ceil(bounds.bottom - bounds.top + 2 * padY);
  // Centre the drawing, lettering included, in the width it was given.
  const shiftX = (width - (bounds.right - bounds.left)) / 2 - bounds.left;
  const shiftY = padY - bounds.top;
  const centre = { x: shiftX, y: shiftY };
  const positions = new Map(placed.map(item => [item.id, item]));

  const stageLabel = state.stage === 'all' ? '' : ', ' + (book.structure.find(item => item.id === state.stage)?.label || '');
  const svg = svgEl('svg', {
    class: 'astor-graph' + (state.selected ? ' has-selection' : ''),
    viewBox: '0 0 ' + width + ' ' + height,
    width, height,
    role: 'group',
    'aria-label': 'Relationship map for ' + book.title + stageLabel + ': ' + characters.length + ' characters, ' + edges.length + ' connections.'
  });
  if (prefersReducedMotion()) svg.classList.add('no-motion');

  // Two characters can be tied in more than one way; fan those lines apart so
  // each can be seen.
  // The same tie declared from both ends (employer of, clerk to) is one line.
  const pairKey = edge => [edge.from, edge.to].sort().join('|');
  const lines = new Map();
  for (const edge of edges) {
    const key = pairKey(edge) + '|' + edge.kind;
    if (lines.has(key)) lines.get(key).also.push(edge); else lines.set(key, { ...edge, also: [] });
  }
  const pairCount = new Map();
  for (const edge of lines.values()) pairCount.set(pairKey(edge), (pairCount.get(pairKey(edge)) || 0) + 1);
  const pairSeen = new Map();

  const edgeLayer = svgEl('g', { class: 'astor-edges' });
  for (const edge of lines.values()) {
    const a = positions.get(edge.from);
    const b = positions.get(edge.to);
    if (!a || !b) continue;
    const from = { x: a.x + shiftX, y: a.y + shiftY };
    const to = { x: b.x + shiftX, y: b.y + shiftY };
    const involved = state.selected && (edge.from === state.selected || edge.to === state.selected);
    // A gentle curve towards the middle keeps two lines between neighbouring
    // characters from lying on top of each other.
    const key = pairKey(edge);
    const nth = pairSeen.get(key) || 0;
    pairSeen.set(key, nth + 1);
    const total = pairCount.get(key);
    const pull = 0.35 + (total > 1 ? (nth - (total - 1) / 2) * 0.3 : 0);
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const control = { x: mid.x + (centre.x - mid.x) * pull, y: mid.y + (centre.y - mid.y) * pull };
    const round = value => Math.round(value * 10) / 10;
    const path = svgEl('path', {
      class: 'astor-edge is-' + edge.kind + (involved ? ' is-involved' : ''),
      d: 'M' + round(from.x) + ' ' + round(from.y) + ' Q' + round(control.x) + ' ' + round(control.y) + ' ' + round(to.x) + ' ' + round(to.y)
    });
    const title = svgEl('title');
    title.textContent = [edge, ...edge.also]
      .map(item => nameOf(book, item.from) + ' — ' + item.label + ' — ' + nameOf(book, item.to)).join('; ');
    path.append(title);
    edgeLayer.append(path);
  }
  svg.append(edgeLayer);

  for (const character of characters) {
    const item = positions.get(character.id);
    const point = { x: item.x + shiftX, y: item.y + shiftY };
    const connections = degree.get(character.id);
    const selected = state.selected === character.id;
    const dimmed = state.selected && !selected && !neighbours.has(character.id);
    const neighbour = state.selected && neighbours.has(character.id);
    const node = svgEl('g', {
      class: 'astor-node' + (selected ? ' is-selected' : '') + (dimmed ? ' is-dimmed' : '') + (neighbour ? ' is-neighbour' : ''),
      tabindex: '0',
      role: 'button',
      'aria-pressed': String(selected),
      'aria-label': character.name + (character.role ? ', ' + character.role : '') + '. ' +
        connections + ' connection' + (connections === 1 ? '' : 's') + (state.stage === 'all' ? '' : ' here') + '.'
    });
    // A generous invisible disc first, so a fingertip finds the node.
    node.append(svgEl('circle', { class: 'astor-node-hit', cx: point.x, cy: point.y, r: Math.max(item.radius + 8, 20) }));
    node.append(svgEl('circle', { class: 'astor-node-disc', cx: point.x, cy: point.y, r: item.radius }));

    const textX = item.anchor === 'middle' ? point.x : item.anchor === 'start' ? item.box.left + shiftX : item.box.right + shiftX;
    const text = svgEl('text', { class: 'astor-node-label', 'text-anchor': item.anchor, 'font-size': fontSize });
    item.lines.forEach((line, index) => {
      const span = svgEl('tspan', { x: Math.round(textX * 10) / 10, y: Math.round((item.box.top + shiftY + index * lineHeight + fontSize * 0.86) * 10) / 10 });
      span.textContent = line;
      text.append(span);
    });
    const title = svgEl('title');
    title.textContent = character.name;
    node.append(title, text);

    const toggle = () => onToggle(character.id);
    node.addEventListener('click', toggle);
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
    });
    svg.append(node);
  }
  mount.append(svg);

  const key = el('div', { class: 'astor-tag-row astor-graph-key' });
  for (const [kind, label] of KINDS) {
    if (!edges.some(edge => edge.kind === kind)) continue;
    key.append(el('span', { class: 'astor-tag is-' + kind }, [
      el('i', { class: 'astor-key-line', 'aria-hidden': 'true' }), document.createTextNode(label)
    ]));
  }
  mount.append(key);
  mount.append(el('p', {
    class: 'astor-inline-note',
    text: edges.length
      ? 'Tap a name to see their connections.'
      : 'No connections in this part. Try “The whole book”.'
  }));

  // Selecting redraws the whole map, so hand focus back to the node that was
  // chosen and keyboard users stay where they were.
  if (state.selected) {
    const index = characters.findIndex(character => character.id === state.selected);
    if (index >= 0 && mount.contains(document.activeElement) === false) {
      svg.querySelectorAll('.astor-node')[index]?.focus({ preventScroll: true });
    }
  }
}

function nameOf(book, id) {
  return book.characters.find(character => character.id === id)?.name || id;
}

function renderDetail(mount, book, state, onSelect) {
  clear(mount);
  const character = book.characters.find(entry => entry.id === state.selected);
  if (!character) {
    mount.append(el('p', {
      class: 'astor-inline-note',
      text: 'Choose ' +
        (book.form === 'play' ? 'an act' : 'a section') + ' above to see the map at that point.'
    }));
    return;
  }
  const edges = edgesFor(book, state.stage);
  const byId = new Map(book.characters.map(entry => [entry.id, entry]));
  const stageNames = new Map(book.structure.map(stage => [stage.id, stage.label]));
  const connections = edges
    .filter(edge => edge.from === character.id || edge.to === character.id)
    .map(edge => {
      const outward = edge.from === character.id;
      const other = byId.get(outward ? edge.to : edge.from);
      return { edge, other, outward };
    })
    .filter(item => item.other);

  mount.append(el('article', { class: 'astor-quote-card astor-character-entry' }, [
    el('h3', { text: character.name }),
    character.role ? el('p', { class: 'astor-quote-attribution', text: character.role }) : null,
    el('p', { class: 'astor-analysis', text: character.summary }),
    connections.length
      ? el('ul', { class: 'astor-connection-list' }, connections.map(({ edge, other, outward }) => {
        const holds = edge.stages.length && state.stage === 'all'
          ? ' (' + edge.stages.map(id => stageNames.get(id) || id).join(', ') + ')'
          : '';
        return el('li', { class: 'is-' + edge.kind }, [
          el('span', { class: 'astor-connection-kind', text: KINDS.find(kind => kind[0] === edge.kind)?.[1] || edge.kind }),
          document.createTextNode(outward ? edge.label + ' ' : ''),
          el('button', { class: 'astor-link-button', type: 'button', text: other.name, onclick: () => onSelect(other.id) }),
          document.createTextNode(outward ? holds : ' ' + edge.label + holds)
        ]);
      }))
      : el('p', { class: 'astor-inline-note', text: 'No connections in this part of the book.' }),
    el('p', {}, [el('a', {
      href: book.href + '#astor-character-' + character.id,
      text: window.location.pathname === book.href ? 'Jump to the full entry ↓' : 'Read the full entry on the ' + book.title + ' page →'
    })])
  ]));
}

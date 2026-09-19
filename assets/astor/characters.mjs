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
  withBooks(chooser, { label: 'Whose relationships?', filter: book => book.characters.length >= 3 }, book => {
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

// A short name for each character that is still unique within the book, so
// two Verinders do not both become "Verinder".
function shortNames(characters, maxLength) {
  const names = new Map();
  const taken = new Map();
  const candidates = character => {
    const full = character.name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    const words = full.split(/\s+/);
    const list = [full];
    if (words.length > 2) list.push(words[0] + ' ' + words[words.length - 1]);
    if (words.length > 1) list.push(words[words.length - 1]);
    if (words.length > 1) list.push(words[0]);
    return list;
  };
  for (const character of characters) {
    for (const candidate of candidates(character)) {
      if (candidate.length <= maxLength) { names.set(character.id, candidate); break; }
    }
    if (!names.has(character.id)) names.set(character.id, character.name.slice(0, maxLength - 1).trim() + '…');
  }
  // Where two characters have collapsed to the same word, prefer the longer
  // candidate for both, and if nothing fits, an initial in front.
  for (const [id, name] of names) taken.set(name, (taken.get(name) || 0) + 1);
  for (const character of characters) {
    const name = names.get(character.id);
    if (taken.get(name) < 2) continue;
    const words = character.name.split(/\s+/);
    const initialled = words.length > 1 ? words[0][0] + '. ' + words[words.length - 1] : character.name;
    const longer = candidates(character).find(candidate => candidate !== name && candidate.length <= maxLength + 4);
    names.set(character.id, longer || initialled);
  }
  return names;
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

function renderGraph(mount, book, state, onToggle) {
  clear(mount);
  const characters = book.characters;
  const edges = edgesFor(book, state.stage);
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
  const width = Math.max(280, mount.clientWidth || 640);
  const narrow = width < 560;
  const fontSize = narrow ? 12 : 13;
  const names = shortNames(characters, narrow ? 14 : 22);
  const longest = Math.max(...[...names.values()].map(name => name.length));
  const labelWidth = Math.ceil(longest * fontSize * 0.56) + 6;
  const maxRadius = 14;
  const gutter = 12;
  const rx = Math.max(60, (width - 2 * (labelWidth + maxRadius + 10 + gutter)) / 2);
  // A phone is narrow and tall, so the ring becomes an ellipse and the
  // characters spread down the page instead of crowding the top of it.
  const perNode = narrow ? 44 : 52;
  const ry = Math.max(rx, Math.min(narrow ? 420 : 300, (characters.length * perNode) / Math.PI));
  const height = Math.round(2 * (ry + maxRadius + fontSize + 14));
  const centre = { x: width / 2, y: height / 2 };

  const positions = new Map();
  ellipsePoints(characters.length, rx, ry).forEach((point, index) => {
    positions.set(characters[index].id, { x: centre.x + point.x, y: centre.y + point.y, angle: point.angle });
  });

  const stageLabel = state.stage === 'all' ? '' : ', ' + (book.structure.find(item => item.id === state.stage)?.label || '');
  const svg = svgEl('svg', {
    class: 'astor-graph' + (state.selected ? ' has-selection' : ''),
    viewBox: '0 0 ' + width + ' ' + height,
    width, height,
    role: 'group',
    'aria-label': 'Relationship map for ' + book.title + stageLabel + ': ' + characters.length + ' characters, ' + edges.length + ' connections.'
  });
  if (prefersReducedMotion()) svg.classList.add('no-motion');

  const edgeLayer = svgEl('g', { class: 'astor-edges' });
  for (const edge of edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    const involved = state.selected && (edge.from === state.selected || edge.to === state.selected);
    // A gentle curve towards the middle keeps two lines between neighbouring
    // characters from lying on top of each other.
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const control = { x: mid.x + (centre.x - mid.x) * 0.35, y: mid.y + (centre.y - mid.y) * 0.35 };
    const path = svgEl('path', {
      class: 'astor-edge is-' + edge.kind + (involved ? ' is-involved' : ''),
      d: 'M' + from.x + ' ' + from.y + ' Q' + control.x + ' ' + control.y + ' ' + to.x + ' ' + to.y
    });
    const title = svgEl('title');
    title.textContent = nameOf(book, edge.from) + ' — ' + edge.label + ' — ' + nameOf(book, edge.to);
    path.append(title);
    edgeLayer.append(path);

  }
  svg.append(edgeLayer);

  for (const character of characters) {
    const point = positions.get(character.id);
    const connections = degree.get(character.id);
    const selected = state.selected === character.id;
    const dimmed = state.selected && !selected && !neighbours.has(character.id);
    const neighbour = state.selected && neighbours.has(character.id);
    const radius = 6 + Math.min(connections, 6) * 1.3;
    const node = svgEl('g', {
      class: 'astor-node' + (selected ? ' is-selected' : '') + (dimmed ? ' is-dimmed' : '') + (neighbour ? ' is-neighbour' : ''),
      tabindex: '0',
      role: 'button',
      'aria-pressed': String(selected),
      'aria-label': character.name + (character.role ? ', ' + character.role : '') + '. ' +
        connections + ' connection' + (connections === 1 ? '' : 's') + (state.stage === 'all' ? '' : ' here') + '.'
    });
    node.append(svgEl('circle', { cx: point.x, cy: point.y, r: radius }));

    // The name goes on the far side of the node from the centre: to the left
    // of nodes on the left, above the one at the top, and so on.
    const cos = Math.cos(point.angle);
    const sin = Math.sin(point.angle);
    const gap = radius + 7;
    let anchor = 'middle';
    if (cos > 0.28) anchor = 'start'; else if (cos < -0.28) anchor = 'end';
    const text = svgEl('text', {
      class: 'astor-node-label',
      x: point.x + cos * gap,
      y: point.y + sin * (gap + (anchor === 'middle' ? fontSize * 0.55 : 0)) + fontSize * 0.36,
      'text-anchor': anchor,
      'font-size': fontSize
    });
    text.textContent = names.get(character.id);
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
      ? edges.length + ' connection' + (edges.length === 1 ? '' : 's') + ' between ' + characters.length +
        ' characters. Choose a name to see who it is tied to and how; choose it again to clear.'
      : 'No relationships are recorded for this part of the book. Try “The whole book”.'
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
      text: 'Choose a character to read their entry, or step through the ' +
        (book.form === 'play' ? 'acts' : 'sections') + ' above to see which connections hold when.'
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
      : el('p', { class: 'astor-inline-note', text: 'No connections recorded in this part of the book.' }),
    el('p', {}, [el('a', {
      href: book.href + '#astor-character-' + character.id,
      text: window.location.pathname === book.href ? 'Jump to the full entry ↓' : 'Read the full entry on the ' + book.title + ' page →'
    })])
  ]));
}

// Character relationship maps.
//
// Each title's characters are placed on a circle and the relationships drawn
// between them. Relationships can declare the stages they hold in, so stepping
// through the acts redraws the map and a household can be watched coming apart
// in the right order.
//
// The diagram is inline SVG with no library behind it. Every node is
// focusable, and selecting one writes the character's full entry out below, so
// the information is never trapped in a picture.

import { el, clear, prefersReducedMotion } from './util.mjs';
import { withBooks } from './chooser.mjs';

const SIZE = 640;
const RADIUS = 232;

const chooser = document.querySelector('#astor-character-chooser');
const switcher = document.querySelector('#astor-stage-switch');
const graphMount = document.querySelector('#astor-character-graph');
const detailMount = document.querySelector('#astor-character-detail');

if (graphMount) {
  withBooks(chooser, { label: 'Whose relationships?', filter: book => book.characters.length >= 3 }, book => {
    renderBook(book);
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

function renderBook(book) {
  let stage = 'all';

  function draw() {
    renderSwitch(book, stage, next => { stage = next; draw(); });
    renderGraph(book, stage);
    renderDetail(book, null);
  }
  draw();
}

function renderSwitch(book, current, onChange) {
  clear(switcher);
  const options = [{ id: 'all', label: 'The whole book' }, ...book.structure.map(item => ({ id: item.id, label: item.label }))];
  for (const option of options) {
    const button = el('button', {
      class: 'astor-filter', type: 'button',
      'aria-pressed': String(option.id === current),
      text: option.label,
      onclick: () => onChange(option.id)
    });
    switcher.append(button);
  }
}

function edgesFor(book, stage) {
  const known = new Set(book.characters.map(character => character.id));
  const edges = [];
  const seen = new Set();
  for (const character of book.characters) {
    for (const relationship of character.relationships || []) {
      if (!known.has(relationship.to)) continue;
      const stages = relationship.stages || [];
      if (stage !== 'all' && stages.length && !stages.includes(stage)) continue;
      // Two characters who each declare the relationship should get one line.
      const key = [character.id, relationship.to].sort().join('|') + '|' + relationship.label;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: character.id, to: relationship.to, label: relationship.label, kind: relationship.kind || 'ally' });
    }
  }
  return edges;
}

function renderGraph(book, stage) {
  clear(graphMount);
  const characters = book.characters;
  const edges = edgesFor(book, stage);
  const positions = new Map();
  const centre = SIZE / 2;

  characters.forEach((character, index) => {
    const angle = (index / characters.length) * Math.PI * 2 - Math.PI / 2;
    positions.set(character.id, {
      x: centre + Math.cos(angle) * RADIUS,
      y: centre + Math.sin(angle) * RADIUS
    });
  });

  const svg = svgEl('svg', {
    class: 'astor-graph',
    viewBox: '0 0 ' + SIZE + ' ' + SIZE,
    role: 'img',
    'aria-label': 'Relationship map for ' + book.title + (stage === 'all' ? '' : ', ' + (book.structure.find(item => item.id === stage)?.label || ''))
  });

  const edgeLayer = svgEl('g');
  for (const edge of edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    edgeLayer.append(svgEl('line', {
      class: 'astor-edge is-' + edge.kind,
      x1: from.x, y1: from.y, x2: to.x, y2: to.y
    }));
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const label = svgEl('text', {
      class: 'astor-edge-label', x: midX, y: midY, 'text-anchor': 'middle'
    });
    label.textContent = edge.label;
    edgeLayer.append(label);
  }
  svg.append(edgeLayer);

  for (const character of characters) {
    const point = positions.get(character.id);
    const degree = edges.filter(edge => edge.from === character.id || edge.to === character.id).length;
    const node = svgEl('g', {
      class: 'astor-node',
      tabindex: '0',
      role: 'button',
      'aria-label': character.name + (character.role ? ', ' + character.role : '') + '. ' + degree + ' connection' + (degree === 1 ? '' : 's') + ' here.'
    });
    node.append(svgEl('circle', { cx: point.x, cy: point.y, r: 30 + Math.min(degree, 4) * 3 }));
    const text = svgEl('text', { x: point.x, y: point.y + 4, 'text-anchor': 'middle' });
    text.textContent = shortName(character.name);
    node.append(text);
    const select = () => renderDetail(book, character, edges);
    node.addEventListener('click', select);
    node.addEventListener('focus', select);
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
    });
    svg.append(node);
  }

  graphMount.append(svg);

  const key = el('div', { class: 'astor-tag-row' });
  for (const [kind, label] of [['marriage', 'Marriage'], ['family', 'Family'], ['ally', 'Ally'], ['rival', 'Rival'], ['enemy', 'Enemy'], ['love', 'Love'], ['service', 'Service']]) {
    if (!edges.some(edge => edge.kind === kind)) continue;
    key.append(el('span', { class: 'astor-tag', text: label }));
  }
  graphMount.append(key);
  graphMount.append(el('p', {
    class: 'astor-inline-note',
    text: edges.length
      ? edges.length + ' connection' + (edges.length === 1 ? '' : 's') + ' shown. Move through the characters with the tab key to read each one.'
      : 'No relationships are recorded for this part of the book. Try “The whole book”.'
  }));
  if (prefersReducedMotion()) svg.style.transition = 'none';
}

function shortName(name) {
  if (name.length <= 12) return name;
  const words = name.split(/\s+/);
  return words.length > 1 ? words[words.length - 1] : name.slice(0, 11) + '…';
}

function renderDetail(book, character, edges = []) {
  clear(detailMount);
  if (!character) {
    detailMount.append(el('p', {
      class: 'astor-inline-note',
      text: 'Select a character to read their entry, or step through the ' + (book.form === 'play' ? 'acts' : 'sections') + ' above to see which connections hold when.'
    }));
    return;
  }
  const byId = new Map(book.characters.map(entry => [entry.id, entry]));
  const connections = edges
    .filter(edge => edge.from === character.id || edge.to === character.id)
    .map(edge => {
      const otherId = edge.from === character.id ? edge.to : edge.from;
      return { label: edge.label, other: byId.get(otherId) };
    })
    .filter(item => item.other);

  detailMount.append(el('article', { class: 'astor-quote-card' }, [
    el('h3', { text: character.name }),
    character.role ? el('p', { class: 'astor-quote-attribution', text: character.role }) : null,
    el('p', { class: 'astor-analysis', text: character.summary }),
    connections.length
      ? el('ul', { class: 'astor-question-list' }, connections.map(item =>
        el('li', { text: item.label + ' ' + item.other.name })))
      : el('p', { class: 'astor-inline-note', text: 'No connections recorded in this part of the book.' }),
    el('p', {}, [el('a', { href: book.href + '#astor-character-' + character.id, text: 'Read the full entry on the ' + book.title + ' page →' })])
  ]));
}

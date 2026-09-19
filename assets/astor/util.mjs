// Small shared helpers for the study tools. No dependencies, no build step.

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function el(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === 'class') node.className = value;
    else if (name === 'text') node.textContent = value;
    else if (name === 'html') node.innerHTML = value;
    else if (name.startsWith('on') && typeof value === 'function') node.addEventListener(name.slice(2), value);
    else if (name === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// A small deterministic generator, so that "today's puzzle" is the same puzzle
// for everyone without a server deciding it. mulberry32 is short, fast and
// good enough for shuffling a question list.
export function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shuffle(items, random = Math.random) {
  const list = items.slice();
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [list[index], list[swap]] = [list[swap], list[index]];
  }
  return list;
}

export function sample(items, count, random = Math.random) {
  return shuffle(items, random).slice(0, count);
}

export function pick(items, random = Math.random) {
  return items[Math.floor(random() * items.length)];
}

export function plural(count, one, many = one + 's') {
  return count === 1 ? one : many;
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// Reads the page-level study context that build-static.js writes into the
// document, so every tool knows which book it is standing in.
export function pageBook() {
  const node = document.querySelector('[data-astor-book]');
  if (!node) return null;
  return {
    slug: node.dataset.astorBook,
    title: node.dataset.astorBookTitle || '',
    href: node.dataset.astorBookHref || ''
  };
}

export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function announce(node, message) {
  if (!node) return;
  node.textContent = '';
  // A repeated identical string is not always re-announced; a tick of delay
  // makes the live region reliable across screen readers.
  window.setTimeout(() => { node.textContent = message; }, 40);
}

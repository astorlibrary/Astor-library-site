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

// Years before the common era are stored as negative integers and shown the
// way a reader writes them, so a record can carry Actium without printing -31.
export function formatYear(year) {
  const value = Number(year);
  if (!Number.isFinite(value)) return String(year);
  return value < 0 ? Math.abs(value) + ' BC' : String(value);
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

// Hands the reader a file made in the page, with nothing sent anywhere.
export function download(name, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// "Safari 17.4 on iPhone", for the small print under a failure message, so a
// reader who reports a problem says where it happened without being asked.
export function browserName() {
  const ua = navigator.userAgent;
  const device = (ua.match(/iPhone|iPad|Android|Macintosh|Windows|Linux/) || ['unknown device'])[0];
  const name = ua.match(/(Edg|Firefox|CriOS|FxiOS|Chrome)\/(\d+)/) || ua.match(/Version\/([\d.]+).*(Safari)/) || [];
  return (name.length ? (name[2] === 'Safari' ? 'Safari ' + name[1] : name[1] + ' ' + name[2]) : 'browser') + ' on ' + device;
}

// The site's own data files, fetched like the page itself (with its cookies,
// so a preview behind a sign-in still loads them). A request that fails is
// tried again, after a pause, past the browser's copy, then at a new address
// no cache has seen, before giving up: the pauses let a passing fault (a
// dropped signal, the offline helper being replaced) clear first. The reason
// is written to the console and carried on the error, so the page can show
// it. `isWhole`, when given, rejects a copy that parses but is not the shape
// the caller needs (an old cached one).
export async function fetchJson(url, isWhole = null) {
  let lastError = null;
  const fresh = url + (url.includes('?') ? '&' : '?') + 'fresh=' + Date.now();
  for (const [address, cache, pause] of [[url, 'default', 0], [url, 'reload', 700], [fresh, 'no-store', 2000]]) {
    if (pause) await new Promise(resolve => setTimeout(resolve, pause));
    try {
      const response = await fetch(address, { credentials: 'same-origin', cache });
      if (!response.ok) throw new Error(url + ' answered ' + response.status);
      const type = response.headers.get('content-type') || '';
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch {
        throw new Error(url + ' did not return JSON (' + (type || 'no content type') + ', starts "' + text.slice(0, 40).replace(/\s+/g, ' ') + '")');
      }
      if (isWhole && !isWhole(data)) throw new Error(url + ' was not in the expected form');
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  console.error('Astor Library: could not load data.', lastError);
  throw lastError;
}

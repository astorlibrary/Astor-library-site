// Registers the service worker that keeps the study tools available offline,
// and on the offline page itself lists what this device has kept.

import { el, clear } from './util.mjs';

const secure = window.location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(window.location.hostname);

if ('serviceWorker' in navigator && secure) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* the site works without it */ });
  });
}

const list = document.querySelector('#astor-offline-list');
if (list && 'caches' in window) listKept(list);

async function listKept(mount) {
  let pages = [];
  try {
    const keys = await window.caches.keys();
    for (const key of keys.filter(name => name.startsWith('astor-'))) {
      const cache = await window.caches.open(key);
      for (const request of await cache.keys()) {
        const url = new URL(request.url);
        if (/^\/(books|study|play|explore|today|my-library|for-teachers)\//.test(url.pathname) && url.pathname.endsWith('/')) {
          pages.push(url.pathname);
        }
      }
    }
  } catch {
    return;
  }
  pages = [...new Set(pages)].sort();
  clear(mount);
  if (!pages.length) {
    mount.append(el('p', { class: 'astor-empty', text: 'Nothing saved for offline yet. Open a few pages while online.' }));
    return;
  }
  const books = pages.filter(page => page.startsWith('/books/') || page.startsWith('/study/'));
  const tools = pages.filter(page => !books.includes(page));
  const group = (title, items) => items.length ? el('section', { class: 'astor-note' }, [
    el('h4', { text: title }),
    el('ul', { class: 'astor-question-list' }, items.map(page => el('li', {}, [el('a', { href: page, text: page })])))
  ]) : null;
  mount.append(el('div', { class: 'astor-note-grid' }, [group('Books and study pages', books), group('Tools', tools)]));
}

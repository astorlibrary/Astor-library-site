// Astor Library service worker: the study tools on a train.
//
// Everything a reader needs to revise is static — the study modules, the
// stylesheets, the index of quotations and the record of each book — so it
// can all be kept on the device and served when there is no signal. Pages
// are fetched from the network first and a copy kept, so a book page opened
// once still opens on the platform. Nothing to do with accounts, sign-in or
// the API is touched: those requests pass straight through.
//
// build-static.js stamps the version and the module list at build time, so a
// new deploy is a new worker, a new cache, and the old one thrown away.

const VERSION = '__ASTOR_BUILD__';
const CACHE = 'astor-' + VERSION;
const MODULES = __ASTOR_MODULES__;
const CORE = [
  '/offline/',
  '/assets/styles.css',
  '/assets/navigation.css',
  '/assets/astor-study.css',
  '/assets/study-index.json',
  '/assets/search-index.json'
].concat(MODULES);

const STUDY_ROUTES = /^\/(play|explore|today|my-library|for-teachers|books|study|offline)\//;
const NEVER = /^\/(api|account|auth|login|logout|sign-in|admin)(\/|$)/;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // One missing file must not stop the rest from being kept.
    await Promise.all(CORE.map(url => cache.add(url).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('astor-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

function isData(url) {
  return url.pathname.startsWith('/data/books/') ||
    url.pathname === '/assets/study-index.json' ||
    url.pathname === '/assets/search-index.json' ||
    url.pathname === '/assets/content-index.json' ||
    url.pathname === '/assets/quotation-index.json' ||
    url.pathname === '/assets/timeline-index.json' ||
    url.pathname.startsWith('/assets/astor/geo/');
}

function isAsset(url) {
  return url.pathname.startsWith('/assets/') && /\.(mjs|js|css|svg|png|webp|avif|woff2?)$/.test(url.pathname);
}

// Data and study modules come from the network whenever there is one, with
// the kept copy as the fallback. Serving them from the cache first meant a
// returning reader saw the previous deploy's quotations, and could get last
// week's module running against this week's page, until a second visit.
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match('/offline/');
    return offline || new Response('You are offline and this page has not been kept on this device.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER.test(url.pathname)) return;

  if (isData(url) || /\.m?js$/.test(url.pathname)) { event.respondWith(networkFirst(request)); return; }
  if (isAsset(url)) { event.respondWith(cacheFirst(request)); return; }
  if (request.mode === 'navigate' && STUDY_ROUTES.test(url.pathname)) {
    event.respondWith(networkFirstPage(request));
  }
});

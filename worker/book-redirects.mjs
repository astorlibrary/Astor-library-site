import catalogue from './book-links.json' with { type: 'json' };

const STORES = { GB: ['UK', 'www.amazon.co.uk'], US: ['US', 'www.amazon.com'], CA: ['Canada', 'www.amazon.ca'], AU: ['Australia', 'www.amazon.com.au'] };
const HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function destination(book, country, data) {
  const value = book.destinations[country];
  // "unavailable": Amazon does not sell the edition in that store at all.
  if (!value || value.kind === 'unavailable' || !Object.hasOwn(STORES, country)) return null;
  const url = new URL(value.url);
  if (url.protocol !== 'https:' || url.hostname !== STORES[country][1] || url.username || url.password || url.port) return null;
  if (value.kind === 'product' && !/^\/dp\/[A-Z0-9]{10}$/.test(url.pathname)) return null;
  if (value.kind === 'search' && url.pathname !== '/s') return null;
  if (!['product', 'search'].includes(value.kind)) return null;
  const tag = data.associates?.[country];
  if (tag) url.searchParams.set('tag', tag);
  return { url: url.href, kind: value.kind };
}

export function handleBookRedirect(request, data = catalogue) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/go/')) return null;
  const match = url.pathname.match(/^\/go\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
  const slug = match?.[1];
  const key = Object.hasOwn(data.aliases || {}, slug) ? data.aliases[slug] : slug;
  const book = key && Object.hasOwn(data.books, key) ? data.books[key] : null;
  if (!book) return new Response('Book link not found.', { status: 404, headers: HEADERS });
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed.', { status: 405, headers: { ...HEADERS, Allow: 'GET, HEAD' } });
  const explicit = url.searchParams.get('country')?.toUpperCase();
  const country = explicit === 'UK' ? 'GB' : explicit || request.cf?.country;
  if (explicit && !Object.hasOwn(STORES, country)) return new Response('Unknown Amazon country.', { status: 400, headers: HEADERS });
  const target = destination(book, country, data);
  if (url.searchParams.get('choose') !== '1' && target && (target.kind === 'product' || explicit)) {
    return new Response(null, { status: 302, headers: { ...HEADERS, Location: target.url } });
  }
  const unavailable = Object.keys(STORES).filter(code => book.destinations[code]?.kind === 'unavailable');
  const options = Object.entries(STORES).flatMap(([code, [label]]) => {
    if (unavailable.includes(code)) return [`<li class="off"><span>Amazon ${escape(label)}</span><small>Not sold in this store.</small></li>`];
    const target = destination(book, code, data);
    if (!target) return [];
    const text = target.kind === 'product' ? 'Amazon ' + label : 'Search Amazon ' + label;
    return `<li><a href="${escape(target.url)}">${escape(text)}</a>${target.kind === 'search' ? '<small>A matching local product listing has not been confirmed. Check the edition and format in the results.</small>' : ''}</li>`;
  }).join('');
  const here = unavailable.includes(country) ? STORES[country][0] : null;
  const notice = here || (unavailable.length && book.note)
    ? '<p class="notice">' + (here ? '<strong>Not sold on Amazon ' + escape(here) + '.</strong> ' : '') + escape(book.note || '') + '</p>'
    : '';
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(book.title)} — Amazon stores | Astor Library</title><style>body{margin:0;background:#f7f3ea;color:#242b35;font:18px/1.55 Georgia,serif}main{max-width:38rem;margin:6vh auto;padding:24px}a{color:inherit}header{font:700 14px/1.5 system-ui,sans-serif;letter-spacing:.14em}h1{font-size:clamp(1.8rem,6vw,2.8rem);line-height:1.15}ul{list-style:none;padding:0}li{margin:18px 0}li a{display:block;border:1px solid #827658;padding:14px 18px;text-decoration:none}a:focus-visible{outline:3px solid #886827;outline-offset:4px}small{display:block;font:14px/1.5 system-ui,sans-serif;margin-top:6px}li.off span{display:block;border:1px dashed #b5aa90;padding:14px 18px;color:#6b6457}.notice{border-left:3px solid #886827;padding-left:14px}.format{font-style:italic}</style></head><body><main><header><a href="/">ASTOR LIBRARY</a></header><h1>${escape(book.title)}</h1><p class="format">${escape(book.format)}</p>${notice}<p>Choose your Amazon store.</p><ul>${options}</ul><p><a href="/library/">Back to the library</a></p></main></body></html>`;
  return new Response(request.method === 'HEAD' ? null : body, { headers: { ...HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" } });
}

// The country a visitor's Amazon links resolve for, so a book page can grey
// out a format that Amazon does not sell there. Nothing is stored.
export function handleStoreCountry(request) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/store-country') return null;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed.', { status: 405, headers: { ...HEADERS, Allow: 'GET, HEAD' } });
  const country = /^[A-Z]{2}$/.test(request.cf?.country || '') ? request.cf.country : null;
  return new Response(request.method === 'HEAD' ? null : JSON.stringify({ country }), { headers: { ...HEADERS, 'Content-Type': 'application/json; charset=utf-8' } });
}

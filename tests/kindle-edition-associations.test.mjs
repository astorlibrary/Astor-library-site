import test from 'node:test';
import assert from 'node:assert/strict';
import catalogue from '../worker/book-links.json' with { type: 'json' };
import bookFormats from '../scripts/book-formats.json' with { type: 'json' };

function isKindle(row) {
  return /^Kindle\b/i.test(row.format);
}

function linkedBook(row) {
  const url = new URL(row.url, 'https://astorlibrary.com');
  const match = url.pathname.match(/^\/go\/([^/]+)\/?$/);
  if (!match) return undefined;
  const slug = catalogue.aliases[match[1]] || match[1];
  return catalogue.books[slug];
}

function destinationIdentifies(destination, asin) {
  const url = new URL(destination.url);
  if (destination.kind === 'product') return url.pathname === `/dp/${asin}`;
  return destination.kind === 'search' && url.pathname === '/s'
    && (url.searchParams.get('k') || '').trim().split(/\s+/).includes(asin);
}

// The supplied KDP paperback pairings distinguish these editions. A shared play
// title must never put the scholarly Kindle beside the ordinary paperback.
for (const [page, asin] of [
  ['othello-expanded-scholarly-edition', 'B0FFYMGLR8'],
  ['a-midsummer-nights-dream-expanded-scholarly-edition', 'B0FZXLQBKM'],
  ['othello', 'B0F4M4QDYN'],
  ['macbeth', 'B0HFH2GK8N'],
  // "Scholarly Commentary" in this poem's subtitle is not a separate edition.
  ['venus-and-adonis', 'B0HFG1KMX5'],
]) {
  test(`${asin} belongs only to the ${page} Kindle format`, () => {
    const matches = [];
    for (const [pageSlug, rows] of Object.entries(bookFormats)) {
      for (const row of rows.filter(isKindle)) {
        const book = linkedBook(row);
        if (book && Object.values(book.destinations).some(destination => destinationIdentifies(destination, asin))) {
          matches.push({ pageSlug, row, book });
        }
      }
    }

    assert.deepEqual(matches.map(match => match.pageSlug), [page],
      `Kindle ${asin} must appear once, only on its paired edition's page`);
    const { row, book } = matches[0];
    assert.equal(new URL(row.url, 'https://astorlibrary.com').pathname, `/go/${page}-kindle`);
    assert.match(book.format, /^Kindle\b/i);
    assert.ok(Object.keys(book.destinations).length, 'Kindle route needs at least one destination');
    for (const [country, destination] of Object.entries(book.destinations)) {
      assert.ok(destinationIdentifies(destination, asin), `${page}: ${country} must identify Kindle ${asin}`);
    }
  });
}

test('each book page lists a Kindle format URL at most once', () => {
  for (const [page, rows] of Object.entries(bookFormats)) {
    const urls = rows.filter(isKindle).map(row => new URL(row.url, 'https://astorlibrary.com').href);
    assert.equal(new Set(urls).size, urls.length, `${page} repeats a Kindle format URL`);
  }
});

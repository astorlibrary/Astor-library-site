import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import records from '../scripts/october-catalogue-data.json' with { type: 'json' };
import formats from '../scripts/book-formats.json' with { type: 'json' };
import links from '../worker/book-links.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const { paperbackEditionSchema } = require('../scripts/book-edition-schema');

test('new paperbacks keep their verified edition identity across page, format box and retailer route', () => {
  assert.equal(records.length, 8);
  const expected = {
    'bartleby-the-scrivener': 'B0HLKYQLBQ',
    'selected-war-poems-of-wilfred-owen': 'B0HLL9XJSV',
    dubliners: 'B0HMJNQVRJ',
    pygmalion: 'B0HN5BYSMR',
    'to-the-lighthouse': 'B0HND6LTXM',
    'selected-poems-of-john-keats': 'B0HP2BWWY6',
    'the-tower': 'B0HNT61LL8',
    'home-to-harlem': 'B0HP89STRK'
  };
  for (const book of records) {
    assert.equal(book.asin, expected[book.slug]);
    assert.ok(fs.existsSync(book.image), `${book.slug} has its supplied cover`);
    const paperback = formats[book.slug].filter(format => format.format === 'Paperback');
    assert.equal(paperback.length, 1);
    assert.equal(decodeURIComponent(paperback[0].image), '/' + book.image);
    assert.equal(paperback[0].url, book.purchaseUrl);
    const destination = links.books[book.slug].destinations.GB;
    if (book.slug === 'pygmalion') {
      assert.equal(destination.kind, 'search', 'KDP identity is confirmed but the public UK product page was unavailable');
      assert.equal(new URL(destination.url).searchParams.get('k'), book.asin);
    } else {
      assert.equal(destination.kind, 'product');
      assert.equal(new URL(destination.url).pathname, '/dp/' + book.asin);
    }
    const html = fs.readFileSync('dist' + book.href + 'index.html', 'utf8');
    assert.ok(html.includes(book.isbn));
    assert.ok(html.includes(book.purchaseUrl));
    assert.doesNotMatch(html, /class="astor-toolkit"|id="astor-study-toolkit"/);
    assert.equal(fs.existsSync('data/books/' + book.slug + '.json'), false);
    const schemaBlock = html.match(/<script\b[^>]*data-astor-book-schema[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(schemaBlock, `${book.slug} publishes its edition metadata`);
    const schema = JSON.parse(schemaBlock[1]).about.workExample.find(edition => edition.bookFormat === 'https://schema.org/Paperback');
    assert.equal(schema.isbn, book.isbn);
    assert.equal(schema.numberOfPages, book.numberOfPages);
    assert.equal(schema.datePublished, book.publicationDate);
  }
});

test('explicit verified paperback artwork cannot override a hardcover filename', () => {
  const book = { title: 'Example', image: 'Example Hardcover.png', imageFormat: 'Paperback', purchaseUrl: 'https://astorlibrary.com/go/example' };
  assert.throws(() => paperbackEditionSchema(book, 'https://astorlibrary.com/books/example/', value => value), /paperback cover/);
});

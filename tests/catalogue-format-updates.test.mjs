import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import catalogue from '../worker/book-links.json' with { type: 'json' };
import bookFormats from '../scripts/book-formats.json' with { type: 'json' };
import septemberCatalogue from '../scripts/september-catalogue-data.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const release = require('../scripts/format-release-data');
const { coverFormat } = require('../scripts/book-edition-schema');
const retiredHardbacks = [
  'war-of-the-worlds', 'the-chimes', 'the-haunted-man-and-the-ghosts-bargain',
  'cricket-on-the-hearth', 'call-of-the-wild'
];

test('withdrawn hardbacks disappear from current choices while their existing links remain usable', () => {
  for (const slug of retiredHardbacks) {
    assert.ok(bookFormats[slug].some(row => row.format === 'Paperback'), `${slug} keeps its paperback`);
    assert.ok(bookFormats[slug].every(row => row.format !== 'Hardback'), `${slug} advertises no hardback`);
    assert.ok(release.hardbacks.every(book => book.slug !== slug));
    assert.ok(septemberCatalogue.every(book => book.slug !== slug || book.format !== 'hardcover'));
    assert.ok(catalogue.books[slug + '-hardback'], `${slug} preserves its existing public route`);
  }
});

test('withdrawing a hardback preserves the work on its existing subject shelves', () => {
  const subjects = require('../scripts/subject-data');
  for (const [slug, memberships] of [
    ['war-of-the-worlds', ['gothic-literature']],
    ['the-chimes', ['satire-political-writing', 'seasonal-writing']],
    ['the-haunted-man-and-the-ghosts-bargain', ['seasonal-writing']],
    ['cricket-on-the-hearth', ['seasonal-writing']],
    ['call-of-the-wild', ['travel-and-landscape']]
  ]) {
    const paperback = bookFormats[slug].find(row => row.format === 'Paperback');
    for (const subjectSlug of memberships) {
      const subject = subjects.find(entry => entry.slug === subjectSlug);
      assert.ok(subject, `existing subject ${subjectSlug}`);
      const book = subject.books.find(entry => entry.href === `/books/${slug}/`);
      assert.ok(book, `${slug} remains in ${subjectSlug}`);
      assert.equal(book.image, paperback.image, `${slug} uses its active paperback artwork`);
      assert.notEqual(coverFormat(book.image), 'Hardcover');
    }
  }
});

test('new formats use their own exact ASINs and conservative regional destinations', () => {
  for (const [slug, format, asin] of [
    ['american-ghost-stories', 'Kindle', 'B0HN9D1SG3'],
    ['american-christmas-stories', 'Kindle', 'B0HN7RFFH4'],
    ['songs-of-innocence-and-of-experience', 'Kindle', 'B0H3KR44XM'],
    ['heart-of-darkness', 'Kindle', 'B0HLPWY6X7'],
    ['home-to-harlem', 'Kindle', 'B0HP1S8CBB'],
    ['the-tower', 'Kindle', 'B0HP2Y7JK5'],
    ['edgar-allan-poe-selected-tales', 'Hardback', 'B0HP6G6MGS'],
    ['american-christmas-stories', 'Hardback', 'B0HN7L9J8F'],
    ['american-ghost-stories', 'Hardback', 'B0HN8VF42Y']
  ]) {
    const suffix = format === 'Kindle' ? 'kindle' : 'hardback';
    const route = `${slug}-${suffix}`;
    const rows = bookFormats[slug].filter(row => row.format === format);
    assert.equal(rows.length, 1, `${slug} lists one ${format}`);
    assert.equal(rows[0].url, `https://astorlibrary.com/go/${route}`);
    assert.equal(catalogue.books[route].format, format);
    assert.deepEqual(Object.keys(catalogue.books[route].destinations).sort(), ['AU', 'CA', 'GB', 'US']);
    for (const [country, destination] of Object.entries(catalogue.books[route].destinations)) {
      const url = new URL(destination.url);
      if (country === 'GB') {
        assert.equal(destination.kind, 'product');
        assert.equal(url.pathname, `/dp/${asin}`);
      } else {
        assert.equal(destination.kind, 'search', `${route}/${country} awaits local product verification`);
        assert.equal(url.searchParams.get('k'), asin);
      }
    }
    if (format === 'Hardback') {
      assert.equal(coverFormat(rows[0].image), 'Hardcover');
      const paired = release.hardbacks.find(book => book.slug === slug);
      assert.equal(decodeURIComponent(rows[0].image), '/' + paired.image);
      assert.equal(coverFormat(paired.paperbackImage), 'Paperback');
    }
  }
});

test('introduced covers remain distinct from commentary and hardback artwork', () => {
  for (const [slug, image] of [
    ['frankenstein', '/Frankenstein%20Introduced.png'],
    ['moby-dick', '/Moby%20Dick%20Introduced.jpeg']
  ]) {
    const rows = bookFormats[slug];
    const introduced = rows.find(row => row.edition === 'Introduced edition');
    assert.equal(introduced.image, image);
    assert.equal(introduced.format, 'Paperback');
    assert.ok(rows.filter(row => row !== introduced).every(row => row.image !== image));
    const main = rows.find(row => row.format === 'Paperback' && row.edition !== 'Introduced edition');
    assert.equal('/' + encodeURIComponent(release.hardbacks.find(book => book.slug === slug).paperbackImage), main.image);
  }
  assert.equal(coverFormat('A book harcover.png'), 'Hardcover');
  assert.equal(coverFormat('A book Main Cover.png'), 'Paperback');
});

test('rebuilding format panels removes retired choices and preserves the remaining page', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'astor-format-fixture-'));
  const write = (relative, content = '') => {
    const file = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const page = '<html><body><main><p>Retained editorial text.</p><nav class="book-end-nav"></nav></main></body></html>';
  try {
    for (const book of [...release.books, ...release.hardbacks]) {
      write(`books/${book.slug}/index.html`, page);
      write(book.collectionHref.slice(1) + 'index.html', page);
      write(book.image);
      if (book.paperbackImage) write(book.paperbackImage);
    }
    for (const slug of retiredHardbacks) {
      write(`books/${slug}/index.html`, page.replace('<nav', '<!-- ASTOR FORMAT OPTIONS START --><section>Old hardback choice.</section><!-- ASTOR FORMAT OPTIONS END --><nav'));
    }
    const generator = fileURLToPath(new URL('../scripts/rebuild-format-release.js', import.meta.url));
    execFileSync(process.execPath, [generator], { cwd: fixture });
    for (const slug of retiredHardbacks) {
      const html = fs.readFileSync(path.join(fixture, 'books', slug, 'index.html'), 'utf8');
      assert.match(html, /Retained editorial text\./);
      assert.doesNotMatch(html, /ASTOR FORMAT OPTIONS|Old hardback choice/);
    }
    for (const book of release.hardbacks) {
      const file = path.join(fixture, 'books', book.slug, 'index.html');
      const html = fs.readFileSync(file, 'utf8');
      assert.equal([...html.matchAll(/ASTOR FORMAT OPTIONS START/g)].length, 1);
      assert.ok(html.includes(book.purchaseUrl));
    }
    const before = fs.readFileSync(path.join(fixture, 'hardbacks', 'index.html'), 'utf8');
    execFileSync(process.execPath, [generator], { cwd: fixture });
    assert.equal(fs.readFileSync(path.join(fixture, 'hardbacks', 'index.html'), 'utf8'), before);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { metadata, validatePageSeo, validateSitemapUrls } = require('../scripts/seo-validation.js');
const { coverFormat, bookEditionSchemas, paperbackEditionSchema } = require('../scripts/book-edition-schema.js');
const url = 'https://astorlibrary.com/books/the-odyssey/';
const page = `<html><head><title>The Odyssey | Astor Library</title>
<meta content='The Odyssey, translated by Samuel Butler.' name='description'>
<link href='${url}' rel='canonical'><meta content='${url}' property='og:url'>
<script type='application/ld+json'>{"@type":"Book","name":"The Odyssey"}</script></head></html>`;

test('metadata validation accepts reordered attributes and rejects another book’s canonical', () => {
  assert.deepEqual(validatePageSeo(page, url), []);
  const wrong = page.replace(`href='${url}'`, "href='https://astorlibrary.com/books/the-iliad/'");
  assert.match(validatePageSeo(wrong, url).join(' '), /exactly one canonical/);
});

test('duplicate canonical, title and description tags cannot silently pass', () => {
  const repeated = page.replace('</head>', `<link rel="canonical" href="${url}"><title>Other title</title><meta name="description" content="Other description"></head>`);
  const errors = validatePageSeo(repeated, url).join(' ');
  assert.match(errors, /one nonempty title/);
  assert.match(errors, /one nonempty search description/);
  assert.match(errors, /exactly one canonical/);
});

test('invalid JSON-LD and a mismatched social URL are rejected', () => {
  assert.match(validatePageSeo(page.replace('"name":"The Odyssey"', '"name":'), url).join(' '), /invalid JSON-LD/);
  assert.match(validatePageSeo(page.replace(`content='${url}'`, "content='https://astorlibrary.com/'"), url).join(' '), /og:url/);
});

test('sitemap eligibility respects robots attribute order and Googlebot-specific noindex', () => {
  assert.equal(metadata(page).noindex, false);
  for (const tag of ["<meta content='noindex,follow' name='robots'>", '<meta name="googlebot" content="noindex">']) {
    assert.equal(metadata(page.replace('</head>', tag + '</head>')).noindex, true);
  }
});

test('sitemap checks exact URL membership, including equal-count errors and duplicate URLs', () => {
  assert.deepEqual(validateSitemapUrls([url], [url]), []);
  assert.equal(validateSitemapUrls(['https://astorlibrary.com/account/'], [url]).length, 2);
  assert.match(validateSitemapUrls([url, url], [url]).join(' '), /repeats/);
});

test('edition schema keeps the cover and purchase target attached to the right physical format', () => {
  const record = {
    title: 'Example book', image: 'Example Hard Cover.png', purchaseUrl: 'https://mybook.to/hardback',
    paperbackImage: 'Example Main Cover.png', paperbackPurchaseUrl: 'https://mybook.to/paperback'
  };
  const editions = bookEditionSchemas(record, url, image => 'https://astorlibrary.com/' + encodeURIComponent(image));
  assert.equal(editions[0].bookFormat, 'https://schema.org/Paperback');
  assert.equal(editions[0].potentialAction.target, record.paperbackPurchaseUrl);
  assert.equal(editions[0].image, 'https://astorlibrary.com/Example%20Main%20Cover.png');
  assert.equal(editions[1].bookFormat, 'https://schema.org/Hardcover');
  assert.equal(editions[1].potentialAction.target, record.purchaseUrl);
  assert.equal(editions[1].image, 'https://astorlibrary.com/Example%20Hard%20Cover.png');
  assert.notEqual(editions[0]['@id'], editions[1]['@id']);
  assert.throws(() => bookEditionSchemas({ ...record, image: record.paperbackImage }, url, x => x), /Hardcover metadata uses Paperback/);
  assert.throws(() => bookEditionSchemas({ ...record, paperbackImage: record.image }, url, x => x), /Paperback metadata uses Hardcover/);
  assert.throws(() => bookEditionSchemas({ ...record, paperbackPurchaseUrl: record.purchaseUrl }, url, x => x), /distinct covers and purchase links/);
});

test('cover format recognition follows all supplied filename conventions without guessing from unmarked artwork', () => {
  for (const suffix of ['Main Cover', 'Main%20Cover']) assert.equal(coverFormat('Example ' + suffix + '.png'), 'Paperback');
  for (const suffix of ['hard cover', 'Hardcover', 'Hardback']) assert.equal(coverFormat('Example ' + suffix + '.png'), 'Hardcover');
  assert.equal(coverFormat('The Odyssey.png'), null);
});

test('a supplied paperback has one exact edition entity and cannot use hardcover artwork', () => {
  const record = { title: 'Example', image: 'Example Main Cover.png', purchaseUrl: 'https://mybook.to/example' };
  const edition = paperbackEditionSchema(record, url, image => '/' + image);
  assert.equal(edition.bookFormat, 'https://schema.org/Paperback');
  assert.equal(edition.potentialAction.target, record.purchaseUrl);
  assert.equal(edition.image, '/' + record.image);
  assert.throws(() => paperbackEditionSchema({ ...record, image: 'Example hardcover.png' }, url, x => x), /paperback cover/);
});

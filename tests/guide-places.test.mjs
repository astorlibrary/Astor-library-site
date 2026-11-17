import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { inScene, quoteOpening } = require('../scripts/book-places.js');
const { loadBooks } = require('../scripts/book-data.js');
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('a quotation is placed in the scene its reference falls in', () => {
  assert.equal(inScene('2.1.32', '2.1', true), true);
  assert.equal(inScene('2.1.32', '2.2', true), false);
  assert.equal(inScene('Chapter 23', 'Chapters 22-23', false), true);
  assert.equal(inScene('Chapter II', 'Chapters I-II', false), true);
  assert.equal(inScene('18.1–2', 'Sonnet 18', false), true);
  assert.equal(inScene('Story of the Door', 'Story of the Door', false), true);
  assert.equal(inScene('Stave I', 'Counting house', false), false);
});

test('a quotation is shortened at a natural break and keeps its speech marks balanced', () => {
  assert.equal(quoteOpening('Fair is foul, and foul is fair: / Hover through the fog and filthy air.'), '“Fair is foul, and foul is fair”');
  assert.equal(quoteOpening('the moment I choose, I can be rid of Mr. Hyde.'), '“the moment I choose, I can be rid of Mr. Hyde.”');
  assert.equal(quoteOpening('“Are there no prisons?” asked Scrooge.'), '“Are there no prisons?” asked Scrooge.');
  for (const book of loadBooks()) {
    for (const quotation of book.quotations) {
      const short = quoteOpening(quotation.text);
      assert.equal((short.match(/“/g) || []).length, (short.match(/”/g) || []).length, book.slug + ': ' + short);
      assert.ok(short.split(/\s+/).length <= 14, book.slug + ': ' + short);
    }
  }
});

test('What happens lists each scene’s key lines, and each one exists', () => {
  const page = read('guides/macbeth/what-happens/index.html');
  const scene = page.match(/<div id="act-1-1-5">[\s\S]*?<\/div>/)[0];
  assert.match(scene, /Key lines/);
  const quotations = read('guides/macbeth/quotations/index.html');
  for (const [, id] of page.matchAll(/href="\/guides\/macbeth\/quotations\/#(astor-quote-[^"]+)"/g)) {
    assert.match(quotations, new RegExp('id="' + id + '"'), id);
  }
});

test('the list of study guides has a find box that falls back to the Search page', () => {
  const page = read('guides/index.html');
  assert.match(page, /<form class="guides-find" action="\/explore\/" role="search" data-guides-find>/);
  assert.match(page, /<input id="guides-find-input" name="q"/);
  assert.match(page, /src="\/assets\/astor\/guides-find\.mjs"/);
  const entries = [...page.matchAll(/<li data-find="([^"]+)"><a href="\/guides\/([^/]+)\/">/g)];
  assert.equal(entries.length, loadBooks().length);
  // The set texts come first, each with its key quotations and themes, and
  // are left out of the find box's list so a book is found once.
  const set = page.match(/<section class="guides-group guides-set"[\s\S]*?<\/section>/)[0];
  assert.equal(page.indexOf(set) < page.indexOf('<section class="guides-group"><h2>'), true);
  const setBooks = [...set.matchAll(/<li><a href="\/guides\/([^/]+)\/">/g)].map(match => match[1]);
  assert.equal(setBooks.length, 13);
  for (const slug of setBooks) {
    assert.match(set, new RegExp('href="/guides/' + slug + '/quotations/">Key quotations</a><a href="/guides/' + slug + '/themes/">Themes</a>'));
  }
  assert.doesNotMatch(set, /data-find=/);
  const jekyll = entries.find(entry => entry[2] === 'jekyll-and-hyde');
  assert.match(jekyll[1], /Jekyll/);
  assert.match(jekyll[1], /Stevenson/);
});

test('the not-found page searches for the words in the address', () => {
  const page = read('404.html');
  assert.match(page, /<form class="search-form not-found-search" role="search" action="\/explore\/"/);
  assert.match(page, /src="\/assets\/astor\/not-found\.mjs"/);
  assert.match(page, /data-not-found hidden/);
  const script = read('assets/astor/not-found.mjs');
  assert.match(script, /shortlist\(entries, words/);
});

test('the paired Study Edition texts and the other GCSE set texts have hand-chosen evidence for every theme', () => {
  const books = new Map(loadBooks().map(book => [book.slug, book]));
  const chosen = [
    // The five texts in Astor's paired Study Editions.
    'macbeth', 'a-christmas-carol', 'pride-and-prejudice', 'jekyll-and-hyde', 'romeo-and-juliet',
    // The other nineteenth-century novels and Shakespeare plays set for GCSE English Literature.
    'frankenstein', 'great-expectations', 'jane-eyre', 'sign-of-four',
    'the-tempest', 'the-merchant-of-venice', 'much-ado-about-nothing', 'julius-caesar'
  ];
  for (const slug of chosen) {
    const book = books.get(slug);
    for (const theme of book.themes) {
      // A theme with no key quotation filed under it has nothing to choose from.
      if (!book.quotations.some(quotation => (quotation.themes || []).includes(theme.id))) continue;
      assert.ok(Array.isArray(theme.evidence) && theme.evidence.length, slug + ': ' + theme.id);
    }
  }
});

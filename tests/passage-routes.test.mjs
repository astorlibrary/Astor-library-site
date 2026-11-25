import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { passageRoutes, placeOf, sceneFor, linesIn } = require('../scripts/passage-routes.js');
const { loadBooks } = require('../scripts/book-data.js');
const books = new Map(loadBooks().map(book => [book.slug, book]));
const discovery = JSON.parse(fs.readFileSync(new URL('../assets/content-index.json', import.meta.url), 'utf8'));
const source = slug => fs.readFileSync(new URL('../passage-room/' + slug + '/index.html', import.meta.url), 'utf8');
const routes = (slug, bookSlug) => {
  const html = passageRoutes(source(slug), { book: books.get(bookSlug) || null, bookHref: '/books/' + bookSlug + '/', discovery });
  return html.match(/<section class="passage-context">[\s\S]*?<\/section>/)[0];
};

test('places are read the way the guides and the close readings write them', () => {
  assert.deepEqual(placeOf('Act 2, Scene 1'), { kind: 'act', from: 2001, to: 2001 });
  assert.deepEqual(placeOf('2.1', true), { kind: 'act', from: 2001, to: 2001 });
  assert.deepEqual(placeOf('Chapter XV · the fog'), { kind: 'chapter', from: 15, to: 15 });
  assert.deepEqual(placeOf('Chapters IX-X'), { kind: 'chapter', from: 9, to: 10 });
  assert.deepEqual(placeOf('Stave One'), { kind: 'stave', from: 1, to: 1 });
  assert.equal(placeOf('The final entries'), null);
});

test('a scene is linked only when it is the one place named', () => {
  const dagger = sceneFor(books.get('macbeth'), 'Act 2, Scene 1');
  assert.equal(dagger.scene.ref, '2.1');
  assert.equal(dagger.id, 'act-2-2-1');
  // Dracula's guide groups chapters I and II together; chapter 2 falls inside.
  assert.equal(sceneFor(books.get('dracula'), 'Chapter 2 · Jonathan Harker’s journal').scene.ref, 'Chapters I-II');
  assert.equal(sceneFor(books.get('jane-eyre'), 'The opening'), null);
});

test('the passage’s own lines are found in the key quotations, in order', () => {
  const html = source('macbeth-tomorrow-and-tomorrow');
  const passage = html.match(/<blockquote class="passage-text[^"]*">([\s\S]*?)<\/blockquote>/)[1];
  assert.deepEqual(linesIn(books.get('macbeth'), passage).map(line => line.id), ['tomorrow', 'walking-shadow']);
});

test('the dagger close reading leads to its line, its scene, the guide, Revise and the editions', () => {
  const section = routes('macbeth-is-this-a-dagger', 'macbeth');
  const links = [...section.matchAll(/<li><a href="([^"]+)">([^<]+)<\/a>/g)].map(match => [match[2], match[1]]);
  assert.deepEqual(links, [
    ['This line in the key quotations', '/guides/macbeth/quotations/#astor-quote-is-this-a-dagger'],
    ['What happens in Act 2, Scene 1', '/guides/macbeth/what-happens/#act-2-2-1'],
    ['Study guide', '/guides/macbeth/'],
    ['Revise', '/play/?book=macbeth'],
    ['The Astor edition', '/books/macbeth/'],
    ['Study Edition', '/study/macbeth/']
  ]);
  // The old row called the Study Edition sales page "Study Macbeth".
  assert.doesNotMatch(section, /Study Macbeth|Macbeth Study page/);
  assert.match(section, /Texts consulted/);
});

test('a close reading without a study guide still leads to the book and its subject', () => {
  const section = routes('aeneid-arms-and-the-man', 'the-aeneid');
  assert.match(section, /href="\/books\/the-aeneid\/">The Astor edition<\/a><span>The full Astor page follows the poem’s twelve books/);
  assert.match(section, /href="\/subjects\/epic-poetry\/"/);
  assert.doesNotMatch(section, /\/guides\/|\/play\//);
});

test('every guide and quotation a close reading links to exists', () => {
  for (const passage of discovery.passages) {
    const slug = passage.href.split('/')[2];
    const book = (passage.relatedBooks || []).map(href => books.get(href.split('/')[2])).find(Boolean);
    if (!book) continue;
    const section = routes(slug, book.slug);
    for (const [, href] of section.matchAll(/href="(\/guides\/[^"]+)"/g)) {
      const [address, id] = href.split('#');
      const file = new URL('..' + address + 'index.html', import.meta.url);
      assert.ok(fs.existsSync(file), slug + ': ' + address);
      if (id) assert.match(fs.readFileSync(file, 'utf8'), new RegExp('id="' + id + '"'), slug + ': #' + id);
    }
  }
});

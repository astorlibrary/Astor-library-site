import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Reads the built site, so it runs after `npm run build`.
const built = slug => fs.readFileSync('dist/books/' + slug + '/index.html', 'utf8');
const main = html => html.match(/<main\b[\s\S]*?<\/main>/)[0];
const haveDist = fs.existsSync('dist/books/macbeth/index.html');

test('a book page introduces the book once and shows its cover', { skip: !haveDist && 'run npm run build first' }, () => {
  for (const slug of ['macbeth', 'hamlet', 'jane-eyre', 'the-odyssey', 'the-overcoat', 'selected-poems-of-john-skelton', 'a-victorian-christmas']) {
    const page = main(built(slug));
    assert.equal((page.match(/<h1\b/g) || []).length, 1, slug);
    assert.equal((page.match(/class="book-top /g) || []).length, 1, slug + ' has more than one opening');
    assert.match(page, /<figure class="book-cover"><img [^>]*src="[^"]+"/, slug + ' has no cover');
    assert.doesNotMatch(page, /edition-sample|astor-toolkit|class="quick-facts|class="edition-card|Standard or expanded scholarship/, slug + ' still has a retired panel');
    assert.doesNotMatch(page, /\/assets\/samples\//, slug + ' still shows inside pages');
  }
});

test('every format on a book page has its own buy link', { skip: !haveDist && 'run npm run build first' }, () => {
  const formats = JSON.parse(fs.readFileSync('scripts/book-formats.json', 'utf8'));
  for (const [slug, list] of Object.entries(formats)) {
    if (!fs.existsSync('dist/books/' + slug + '/index.html')) continue;
    const page = main(built(slug));
    for (const format of list) assert.ok(page.includes('href="' + format.url + '"'), slug + ' is missing ' + format.format + ' ' + format.url);
  }
});

test('Macbeth links to its study guide, Revise and the Expanded Scholarly Edition', { skip: !haveDist && 'run npm run build first' }, () => {
  const page = main(built('macbeth'));
  assert.ok(page.includes('href="/guides/macbeth/"'));
  assert.ok(page.includes('href="/play/?book=macbeth"'));
  assert.ok(page.includes('href="/books/macbeth-expanded-scholarly-edition/"'));
  assert.ok(page.includes('Paired Study Edition'), 'the paired volumes are named as such');
  assert.doesNotMatch(page, /the critics and model paragraphs/);
});

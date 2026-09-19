import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadBooks, validateBook, validateAll } = require('../scripts/book-data.js');
const { missingCanonicalNames, loadVocabulary } = require('../scripts/rebuild-vocabulary.js');
const { renderToolkit } = require('../scripts/study-toolkit.js');

const root = process.cwd();
const books = loadBooks();

test('every book record passes the schema', () => {
  const problems = validateAll(books);
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('the library holds book records at all', () => {
  assert.ok(books.length >= 1, 'expected at least one data/books/*.json');
});

test('every quotation carries a reference and the text it was checked against', () => {
  for (const book of books) {
    for (const quotation of book.quotations) {
      assert.ok(quotation.reference, book.slug + '/' + quotation.id + ' has no reference');
      assert.ok(quotation.source, book.slug + '/' + quotation.id + ' has no source');
      assert.ok(quotation.text.trim().length > 4, book.slug + '/' + quotation.id + ' has no text');
    }
  }
});

test('every page a record points at exists', () => {
  const exists = href => fs.existsSync(path.join(root, href.replace(/^\//, ''), 'index.html'));
  for (const book of books) {
    assert.ok(exists(book.href), book.slug + ' points at a missing book page');
    if (book.studyHref) assert.ok(exists(book.studyHref), book.slug + ' points at a missing study page');
    for (const related of book.related || []) {
      assert.ok(exists(related.href), book.slug + ' links to a missing page: ' + related.href);
    }
  }
});

test('quotations only reference themes, techniques and characters the book declares', () => {
  for (const book of books) {
    const themes = new Set(book.themes.map(theme => theme.id));
    const techniques = new Set((book.techniques || []).map(technique => technique.id));
    const characters = new Set(book.characters.map(character => character.id));
    for (const quotation of book.quotations) {
      for (const id of quotation.themes || []) assert.ok(themes.has(id), book.slug + ' ' + quotation.id + ' -> theme ' + id);
      for (const id of quotation.techniques || []) assert.ok(techniques.has(id), book.slug + ' ' + quotation.id + ' -> technique ' + id);
      for (const id of quotation.characters || []) assert.ok(characters.has(id), book.slug + ' ' + quotation.id + ' -> character ' + id);
    }
  }
});

test('every hidden cloze word really appears in its quotation', () => {
  for (const book of books) {
    for (const quotation of book.quotations) {
      for (const word of quotation.cloze || []) {
        assert.ok(
          quotation.text.toLowerCase().includes(word.toLowerCase()),
          book.slug + '/' + quotation.id + ' hides "' + word + '", which is not in the line'
        );
      }
    }
  }
});

test('the validator rejects a record with an unreferenced quotation', () => {
  const broken = JSON.parse(JSON.stringify(books[0]));
  delete broken.quotations[0].reference;
  const problems = validateBook(broken, broken.slug + '.json');
  assert.ok(problems.some(problem => problem.includes('without a reference')), problems.join('\n'));
});

test('the validator rejects a quotation tagged with a theme the book does not have', () => {
  const broken = JSON.parse(JSON.stringify(books[0]));
  broken.quotations[0].themes = ['a-theme-that-does-not-exist'];
  const problems = validateBook(broken, broken.slug + '.json');
  assert.ok(problems.some(problem => problem.includes('unknown theme')), problems.join('\n'));
});

test('the validator rejects a cloze word that is not in the line', () => {
  const broken = JSON.parse(JSON.stringify(books[0]));
  broken.quotations[0].cloze = ['zzzznotpresent'];
  const problems = validateBook(broken, broken.slug + '.json');
  assert.ok(problems.some(problem => problem.includes('not in quotation')), problems.join('\n'));
});

test('the published study index is in step with the data files', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'study-index.json'), 'utf8'));
  assert.equal(index.books.length, books.length, 'run node scripts/rebuild-study-data.js');
  const slugs = new Set(books.map(book => book.slug));
  for (const entry of index.books) assert.ok(slugs.has(entry.slug), 'stale entry: ' + entry.slug);
  assert.equal(
    index.counts.quotations,
    books.reduce((total, book) => total + book.quotations.length, 0)
  );
});

test('the search index only points at pages that exist', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'search-index.json'), 'utf8'));
  assert.ok(index.entries.length > 0);
  const seen = new Set();
  for (const entry of index.entries) {
    const target = entry.h.split('#')[0].split('?')[0];
    if (seen.has(target)) continue;
    seen.add(target);
    assert.ok(
      fs.existsSync(path.join(root, target.replace(/^\//, ''), 'index.html')),
      'search index points at a missing page: ' + entry.h
    );
  }
});

test('every shared theme and technique identifier has one canonical name', () => {
  const missing = missingCanonicalNames(books);
  assert.deepEqual(
    missing.map(item => item.kind + '/' + item.id),
    [],
    'run node scripts/rebuild-vocabulary.js --draft'
  );
});

test('the vocabulary only names identifiers the data actually uses', () => {
  const vocabulary = loadVocabulary();
  const used = { themes: new Set(), techniques: new Set() };
  for (const book of books) {
    for (const theme of book.themes) used.themes.add(theme.id);
    for (const technique of book.techniques || []) used.techniques.add(technique.id);
  }
  for (const kind of ['themes', 'techniques']) {
    for (const id of Object.keys(vocabulary[kind])) {
      assert.ok(used[kind].has(id), 'data/vocabulary.json names an unused ' + kind + ' identifier: ' + id);
    }
  }
});

test('the study toolkit renders one unique id per section', () => {
  for (const book of books) {
    const html = renderToolkit(book, { titleFor: () => null });
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, book.slug + ' repeats an id in its toolkit');
    assert.ok(html.includes('id="astor-quotations"'), book.slug + ' has no quotations panel');
    assert.ok(html.includes('data-astor-book="' + book.slug + '"'));
  }
});

test('the study toolkit escapes the text it is given', () => {
  const book = JSON.parse(JSON.stringify(books[0]));
  book.title = 'Trouble <script>alert(1)</script>';
  const html = renderToolkit(book, { titleFor: () => null });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('no record names an exam board', () => {
  for (const book of books) {
    const text = JSON.stringify(book).toLowerCase();
    for (const board of ['aqa', 'edexcel', 'eduqas', 'wjec']) {
      assert.ok(!text.includes(board), book.slug + ' names ' + board.toUpperCase());
    }
  }
});

test('no record ships an unverified video', () => {
  for (const book of books) {
    for (const video of book.videos || []) {
      assert.ok(['youtube-nocookie', 'vimeo'].includes(video.provider), book.slug + ' has an unsupported video provider');
      assert.ok(video.url.startsWith('https://'), book.slug + ' has a video without an https address');
    }
  }
});

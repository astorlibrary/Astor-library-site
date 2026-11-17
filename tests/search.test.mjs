import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { find, shortlist, grouped, kindInfo, KINDS } from '../assets/astor/search.mjs';

const entries = JSON.parse(fs.readFileSync(new URL('../assets/search-index.json', import.meta.url), 'utf8')).entries;
const first = query => find(entries, query).results[0];
const hrefs = (query, limit = 12) => shortlist(entries, query, limit).map(entry => entry.h);

test('every entry in the search index is a kind the search knows how to label', () => {
  for (const entry of entries) assert.ok(KINDS[entry.k], 'unknown kind ' + entry.k + ' on ' + entry.t);
  assert.equal(kindInfo('Slide guide').access, 'Free account after 3 slides');
  assert.equal(kindInfo('Study guide').access, 'Free on the web');
  assert.equal(kindInfo('Study Edition').access, 'Printed book');
});

// The searches that returned nothing when the site was reviewed.
test('a line, and a book’s quotes, are found from the main search', () => {
  assert.equal(first('Out, damned spot').h, '/guides/macbeth/quotations/#astor-quote-out-damned-spot');
  assert.equal(first('out damned spot').h, '/guides/macbeth/quotations/#astor-quote-out-damned-spot');
  const quotes = find(entries, 'Macbeth quotes').results;
  assert.equal(quotes[0].h, '/guides/macbeth/quotations/');
  assert.ok(quotes.filter(entry => entry.k === 'Quotation').length >= 20);
  assert.equal(first('quotes from macbeth').h, '/guides/macbeth/quotations/');
});

test('a title lists the book, the web guide, its quotations and quizzes before the printed and slide guides', () => {
  const list = shortlist(entries, 'Macbeth');
  assert.deepEqual(list.slice(0, 5).map(entry => entry.k), ['Book', 'Study guide', 'Key quotations', 'Revise', 'Study Edition']);
  assert.equal(list[1].h, '/guides/macbeth/');
  assert.ok(list.some(entry => entry.k === 'Close reading'), 'no close reading in the short list');
  assert.ok(list.some(entry => entry.k === 'Slide guide'), 'no slide guide in the short list');
  const groups = grouped(entries, 'Macbeth').groups.map(group => group.name);
  assert.deepEqual(groups.slice(0, 2), ['Books', 'Study guides']);
  assert.ok(groups.indexOf('Study guides') < groups.indexOf('Slide guides'));
});

test('a character’s or a theme’s quotes are quotations, not a page with the word on it', () => {
  const lady = find(entries, 'Lady Macbeth quotes').results;
  assert.ok(lady.length >= 4 && lady.every(entry => entry.k === 'Quotation'));
  assert.ok(lady.slice(0, 4).every(entry => entry.n.startsWith('Lady Macbeth')), 'her own lines come first');
  const scrooge = find(entries, 'scrooge quotes').results;
  assert.ok(scrooge.length >= 5 && scrooge.every(entry => entry.k === 'Quotation' && entry.h.startsWith('/guides/a-christmas-carol/')));
  const ambition = find(entries, 'macbeth ambition quotes').results;
  assert.ok(ambition.some(entry => entry.h.endsWith('#astor-quote-vaulting-ambition')));
  assert.ok(ambition.every(entry => entry.h.startsWith('/guides/macbeth/quotations/')));
});

test('an act, a scene, a stave or a chapter is found however it is numbered', () => {
  for (const query of ['macbeth act 1 scene 7', 'Macbeth 1.7', 'macbeth act one scene seven']) {
    assert.equal(first(query).h, '/guides/macbeth/what-happens/#act-1-1-7', query);
  }
  assert.equal(first('hamlet act 3').h, '/guides/hamlet/what-happens/#act-3');
  assert.equal(first('christmas carol stave 3').h, '/guides/a-christmas-carol/what-happens/#stave-3');
  assert.equal(first('christmas carol stave three').h, '/guides/a-christmas-carol/what-happens/#stave-3');
  assert.equal(first('jane eyre chapter 23').k, 'Scene');
});

test('every act and scene the search points to is on its guide’s page', () => {
  const pages = new Map();
  for (const entry of entries.filter(item => item.k === 'Scene')) {
    const [address, id] = entry.h.split('#');
    if (!pages.has(address)) pages.set(address, fs.readFileSync(new URL('..' + address + 'index.html', import.meta.url), 'utf8'));
    assert.ok(pages.get(address).includes('id="' + id + '"'), entry.t + ' points at a missing place: ' + entry.h);
  }
});

test('words about the course are set aside, and a question finds its subject', () => {
  assert.equal(first('macbeth gcse').h, '/books/macbeth/');
  assert.equal(first('macbeth essay').h, '/books/macbeth/');
  assert.equal(first('who is banquo').h, '/guides/macbeth/characters/#astor-character-banquo');
});

test('“analysis”, “summary”, “plot” and “quiz” lead to the open web guide and its parts', () => {
  assert.equal(first('macbeth analysis').h, '/guides/macbeth/');
  assert.equal(first('romeo and juliet summary').h, '/guides/romeo-and-juliet/');
  assert.equal(first('macbeth plot').h, '/guides/macbeth/what-happens/');
  assert.equal(first('macbeth quiz').h, '/play/?book=macbeth');
  assert.equal(first('macbeth themes').h, '/guides/macbeth/themes/');
});

test('a misspelt title is put right, and the search says so', () => {
  const macbeth = find(entries, 'mcbeth');
  assert.equal(macbeth.note, 'macbeth');
  assert.equal(macbeth.results[0].h, '/books/macbeth/');
  assert.equal(find(entries, 'frankenstien').note, 'frankenstein');
  const quotes = find(entries, 'pride and predjudice quotes');
  assert.equal(quotes.note, 'pride and prejudice quotes');
  assert.equal(quotes.results[0].h, '/guides/pride-and-prejudice/quotations/');
  assert.equal(shortlist(entries, 'mcbeth').note, 'macbeth');
  assert.equal(find(entries, 'Macbeth').note, '');
});

test('a quoted phrase made of common words finds the line and nothing else', () => {
  assert.deepEqual(find(entries, 'to be or not to be').results.map(entry => entry.h),
    ['/passage-room/hamlet-to-be/', '/guides/hamlet/quotations/#astor-quote-to-be-or-not-to-be']);
  const tomorrow = hrefs('tomorrow and tomorrow and tomorrow');
  assert.equal(tomorrow[0], '/passage-room/macbeth-tomorrow-and-tomorrow/');
  assert.equal(tomorrow[1], '/guides/macbeth/quotations/#astor-quote-tomorrow', 'the hyphenated line is found');
});

test('a book Astor does not publish finds nothing, not something else', () => {
  assert.equal(find(entries, 'an inspector calls').results.length, 0);
  assert.equal(find(entries, 'zzzz').results.length, 0);
});

test('a short list keeps to the order of the match', () => {
  const kinds = shortlist(entries, 'ambition').map(entry => entry.k);
  assert.ok(kinds.lastIndexOf('Theme') < kinds.indexOf('Quotation'), 'themes named for the word come before lines that mention it');
  assert.equal(first('christmas').k, 'Seasonal');
  assert.equal(hrefs('christmas')[1], '/books/a-christmas-carol/');
  assert.equal(first('dickens').k, 'Writer');
});

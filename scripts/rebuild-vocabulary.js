// Keeps the shared vocabulary honest.
//
// Themes and techniques carry identifiers that are shared across titles, so
// that filtering by "ambition" or "dramatic irony" reaches every book that
// uses the term. Each book is still free to name the idea in the way that
// suits its own page — Wuthering Heights calls its nature theme "Weather,
// moor and the two houses" — but a term that appears in more than one book
// needs one canonical name for the glossary and the cross-library filters,
// or two different ideas quietly merge into one heading.
//
// data/vocabulary.json holds those canonical names. This script reports which
// shared identifiers are still missing one, and with --draft proposes entries
// to paste in and edit.

const fs = require('fs');
const path = require('path');
const { loadBooks } = require('./book-data');

const root = process.cwd();
const vocabularyFile = path.join(root, 'data', 'vocabulary.json');

function loadVocabulary() {
  if (!fs.existsSync(vocabularyFile)) return { themes: {}, techniques: {} };
  const parsed = JSON.parse(fs.readFileSync(vocabularyFile, 'utf8'));
  return { themes: parsed.themes || {}, techniques: parsed.techniques || {} };
}

function usage(books) {
  const result = { themes: new Map(), techniques: new Map() };
  for (const book of books) {
    for (const kind of ['themes', 'techniques']) {
      for (const entry of book[kind] || []) {
        if (!result[kind].has(entry.id)) result[kind].set(entry.id, []);
        result[kind].get(entry.id).push({ slug: book.slug, name: entry.name, definition: entry.definition || '' });
      }
    }
  }
  return result;
}

function missingCanonicalNames(books, vocabulary = loadVocabulary()) {
  const used = usage(books);
  const missing = [];
  for (const kind of ['themes', 'techniques']) {
    for (const [id, entries] of used[kind]) {
      const names = new Set(entries.map(entry => entry.name));
      if (entries.length < 2 || names.size < 2) continue;
      if (vocabulary[kind][id]) continue;
      missing.push({ kind, id, entries });
    }
  }
  return missing;
}

module.exports = { loadVocabulary, usage, missingCanonicalNames, vocabularyFile };

if (require.main === module) {
  const books = loadBooks();
  const vocabulary = loadVocabulary();
  const missing = missingCanonicalNames(books, vocabulary);
  const used = usage(books);

  const drafting = process.argv.includes('--draft');
  const report = drafting ? console.error : console.log;
  const counts = {
    themes: Object.keys(vocabulary.themes).length,
    techniques: Object.keys(vocabulary.techniques).length
  };
  report('Shared vocabulary: ' + counts.themes + ' themes and ' + counts.techniques + ' techniques named, ' +
    used.themes.size + ' theme identifiers and ' + used.techniques.size + ' technique identifiers in use.');

  if (!missing.length && !drafting) { console.log('Every shared identifier has a canonical name.'); return; }

  if (drafting) {
    const draft = { themes: { ...vocabulary.themes }, techniques: { ...vocabulary.techniques } };
    for (const item of missing) {
      // The shortest name is usually the plain term rather than one book's
      // particular slant on it, which makes it the better starting point.
      const shortest = item.entries.slice().sort((a, b) => a.name.length - b.name.length)[0];
      draft[item.kind][item.id] = item.kind === 'techniques'
        ? { name: shortest.name, definition: shortest.definition }
        : { name: shortest.name };
    }
    console.log(JSON.stringify(
      { themes: sortKeys(draft.themes), techniques: sortKeys(draft.techniques) }, null, 2));
    return;
  }

  report('\n' + missing.length + ' shared identifiers have no canonical name:');
  for (const item of missing) {
    report('  ' + item.kind + '/' + item.id);
    for (const entry of item.entries) report('    ' + entry.slug + ': ' + entry.name);
  }
  report('\nRun with --draft to print a starting point for data/vocabulary.json.');
  process.exitCode = 1;
}

function sortKeys(object) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
}

// Publishes the cross-library study index that the explorers, the games, the
// daily puzzle and the search palette all read.
//
// Per-book pages fetch data/books/<slug>.json directly. Everything that works
// across the whole library reads one file instead, so a reader opening the
// quotation explorer makes a single request rather than thirty.

const fs = require('fs');
const path = require('path');
const { loadBooks, validateAll } = require('./book-data');
const { loadVocabulary } = require('./rebuild-vocabulary');

const root = process.cwd();
const outputFile = path.join(root, 'assets', 'study-index.json');

// Each book names its themes and techniques in its own words. Where a term is
// shared across titles, data/vocabulary.json supplies the one name the
// glossary and the cross-library filters use, so that two books' particular
// slants on "dialect" do not become two separate headings.
const vocabulary = loadVocabulary();
const canonical = (kind, entry) => vocabulary[kind][entry.id]?.name || entry.name;

// The index carries what a cross-library tool needs. That includes the essay
// questions, critical positions and discussion questions, because the essay
// forge, the argument builder and the teachers' generators all work from a
// chosen title without loading its individual record.
function indexEntry(book) {
  return {
    slug: book.slug,
    title: book.title,
    author: book.author,
    href: book.href,
    studyHref: book.studyHref || '',
    playHref: '/play/?book=' + book.slug,
    form: book.form,
    genre: book.genre || '',
    period: book.period,
    setting: book.setting || '',
    written: book.written || '',
    firstPublished: book.firstPublished || null,
    readingTime: book.readingTime || null,
    difficulty: book.difficulty || null,
    lengthNote: book.lengthNote || '',
    openingLine: book.openingLine || '',
    summary: book.summary,
    referenceStyle: book.referenceStyle,
    sourceText: book.sourceText,
    structure: (book.structure || []).map(stage => ({
      id: stage.id,
      label: stage.label,
      title: stage.title,
      summary: stage.summary,
      scenes: (stage.scenes || []).map(scene => ({ ref: scene.ref, title: scene.title || '', summary: scene.summary }))
    })),
    characters: (book.characters || []).map(character => ({
      id: character.id,
      name: character.name,
      role: character.role || '',
      summary: character.summary,
      clue: character.clue || '',
      firstAppearance: character.firstAppearance || '',
      traits: character.traits || [],
      relationships: character.relationships || []
    })),
    themes: (book.themes || []).map(theme => ({
      id: theme.id,
      name: theme.name,
      canonicalName: canonical('themes', theme),
      summary: theme.summary,
      development: theme.development || ''
    })),
    techniques: (book.techniques || []).map(technique => ({
      id: technique.id,
      name: technique.name,
      canonicalName: canonical('techniques', technique),
      definition: vocabulary.techniques[technique.id]?.definition || technique.definition,
      bookDefinition: technique.definition,
      inThisBook: technique.inThisBook
    })),
    quotations: (book.quotations || []).map(quotation => ({
      id: quotation.id,
      text: quotation.text,
      speaker: quotation.speaker || '',
      reference: quotation.reference,
      stage: quotation.stage || '',
      context: quotation.context || '',
      analysis: quotation.analysis,
      themes: quotation.themes || [],
      techniques: quotation.techniques || [],
      characters: quotation.characters || [],
      source: quotation.source,
      cloze: quotation.cloze || []
    })),
    atAGlance: book.atAGlance || [],
    criticalViews: book.criticalViews || [],
    essayQuestions: book.essayQuestions || [],
    discussionQuestions: book.discussionQuestions || [],
    timeline: book.timeline || [],
    places: book.places || [],
    related: book.related || [],
    videos: book.videos || []
  };
}

const books = loadBooks();
const problems = validateAll(books);
if (problems.length) {
  console.error('The study data has ' + problems.length + ' problem' + (problems.length === 1 ? '' : 's') + ':');
  for (const problem of problems) console.error('- ' + problem);
  process.exit(1);
}

const entries = books.map(indexEntry);
const index = {
  counts: {
    books: entries.length,
    quotations: entries.reduce((total, book) => total + book.quotations.length, 0),
    characters: entries.reduce((total, book) => total + book.characters.length, 0),
    themes: new Set(entries.flatMap(book => book.themes.map(theme => theme.id))).size,
    techniques: new Set(entries.flatMap(book => book.techniques.map(technique => technique.id))).size,
    timelineEvents: entries.reduce((total, book) => total + book.timeline.length, 0),
    places: entries.reduce((total, book) => total + book.places.length, 0)
  },
  // No build timestamp: CI regenerates this file and compares it with the
  // committed one, so anything that changes on every run would fail the check.
  books: entries
};

fs.writeFileSync(outputFile, JSON.stringify(index, null, 2) + '\n');

// --- the search palette's index -------------------------------------------
//
// The palette opens over whatever page a reader is on, so it loads a small
// file rather than the full study index: one line per destination, with the
// words somebody might actually type. Characters, themes and quotations are
// included so that searching "Fleance" or "equivocation" reaches a page.

const discoveryFile = path.join(root, 'assets', 'content-index.json');
const searchFile = path.join(root, 'assets', 'search-index.json');
const discovery = fs.existsSync(discoveryFile) ? JSON.parse(fs.readFileSync(discoveryFile, 'utf8')) : {};
const searchEntries = [];
const seenHrefs = new Set();

function addEntry(kind, title, href, note, terms) {
  const key = kind + '|' + href + '|' + title;
  if (seenHrefs.has(key)) return;
  seenHrefs.add(key);
  searchEntries.push({ k: kind, t: title, h: href, n: note || '', s: (terms || title).toLowerCase() });
}

const discoveryGroups = [
  ['books', 'Book'],
  ['authors', 'Writer'],
  ['subjects', 'Subject'],
  ['collections', 'Collection'],
  ['resources', 'Free guide'],
  ['studyEditions', 'Study edition'],
  ['passages', 'Close reading'],
  ['seasons', 'Seasonal']
];
for (const [group, label] of discoveryGroups) {
  for (const item of discovery[group] || []) {
    if (!item.href || !item.href.startsWith('/')) continue;
    addEntry(label, item.title, item.href, item.author || item.collection || '', [item.title, item.author, item.collection].filter(Boolean).join(' '));
  }
}

for (const book of entries) {
  for (const character of book.characters) {
    addEntry('Character', character.name, book.href + '#astor-characters', book.title, character.name + ' ' + book.title + ' ' + (character.role || ''));
  }
  for (const theme of book.themes) {
    addEntry('Theme', theme.name + ' in ' + book.title, '/explore/quotations/?theme=' + theme.id, book.title, theme.name + ' ' + book.title);
  }
  for (const technique of book.techniques) {
    addEntry('Technique', technique.name, '/explore/techniques/#' + technique.id, technique.definition, technique.name);
  }
  for (const quotation of book.quotations) {
    addEntry('Quotation', quotation.text.length > 76 ? quotation.text.slice(0, 74).trim() + '\u2026' : quotation.text,
      book.href + '#astor-quotations', book.title + ' ' + quotation.reference,
      quotation.text + ' ' + (quotation.speaker || '') + ' ' + book.title);
  }
}

for (const tool of [
  ['Tool', 'Play and revise', '/play/', 'Every revision game in one place', 'play games revise quiz revision'],
  ['Tool', 'The Daily Five', '/today/', "Today's passage, puzzle and literary anniversary", 'daily puzzle today streak'],
  ['Tool', 'Quotation explorer', '/explore/quotations/', 'Filter every quotation by theme, character and technique', 'quotations explorer filter'],
  ['Tool', 'Literature timeline', '/explore/timeline/', 'Every Astor title against its historical moment', 'timeline history dates'],
  ['Tool', 'Character maps', '/explore/characters/', 'Relationship diagrams that change act by act', 'characters relationships map diagram'],
  ['Tool', 'Technique glossary', '/explore/techniques/', 'Literary terms with live examples from the texts', 'technique glossary terms devices'],
  ['Tool', 'Map of settings', '/explore/map/', 'Where the books take place', 'map places settings geography'],
  ['Tool', 'Compare two texts', '/explore/compare/', 'Shared themes and techniques, side by side', 'compare comparative essay two texts'],
  ['Tool', 'My library', '/my-library/', 'Saved books, progress, streak and commonplace book', 'my library saved progress streak commonplace'],
  ['Tool', 'For teachers', '/for-teachers/', 'Lesson starters, worksheets and projector mode', 'teachers lesson worksheet classroom printable']
]) addEntry(tool[0], tool[1], tool[2], tool[3], tool[4]);

fs.writeFileSync(searchFile, JSON.stringify({ entries: searchEntries }, null, 0) + '\n');

// The homepage states how much study material exists; keep the two numbers
// truthful rather than leaving them to rot.
const homepageFile = path.join(root, 'index.html');
if (fs.existsSync(homepageFile)) {
  let homepage = fs.readFileSync(homepageFile, 'utf8');
  for (const [key, value] of [['quotations', index.counts.quotations], ['titles', index.counts.books]]) {
    const pattern = new RegExp('(<span data-astor-count="' + key + '">)\\d+(<\\/span>)', 'g');
    if (!pattern.test(homepage)) throw new Error('The homepage has no ' + key + ' counter');
    homepage = homepage.replace(pattern, '$1' + value + '$2');
  }
  fs.writeFileSync(homepageFile, homepage);
}

console.log(
  'Published study data for ' + index.counts.books + ' titles: ' +
  index.counts.quotations + ' quotations, ' +
  index.counts.characters + ' characters, ' +
  index.counts.themes + ' themes, ' +
  index.counts.techniques + ' techniques. Search palette index: ' + searchEntries.length + ' entries.'
);

module.exports = { indexEntry };

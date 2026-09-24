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

// The quotation explorer and the timeline each need one slice of that index.
// The whole of it is nearly six megabytes, which on a phone is a long wait
// before the first quotation or date appears, so each gets its own file.
const slim = (book, extra) => ({
  slug: book.slug, title: book.title, author: book.author, href: book.href,
  period: book.period, form: book.form, firstPublished: book.firstPublished, ...extra
});
const names = list => list.map(({ id, name, canonicalName }) => ({ id, name, canonicalName }));
fs.writeFileSync(path.join(root, 'assets', 'quotation-index.json'), JSON.stringify({
  books: entries.map(book => slim(book, {
    themes: names(book.themes),
    techniques: names(book.techniques),
    characters: book.characters.map(({ id, name }) => ({ id, name })),
    quotations: book.quotations.map(({ cloze, source, ...quotation }) => quotation)
  }))
}) + '\n');
fs.writeFileSync(path.join(root, 'assets', 'timeline-index.json'), JSON.stringify({
  books: entries.map(book => slim(book, { written: book.written, timeline: book.timeline }))
}) + '\n');

// The Revise pages open on one book at a time, so they read a small index for
// the chooser (title, author, cover, colour, drawing) and then fetch only the
// chosen book's record, rather than the whole study index above.
{
  const { identityFor, MOTIFS } = require('./book-motifs');
  const thumbnails = fs.existsSync(path.join(root, 'assets', 'book-thumbnails.json'))
    ? JSON.parse(fs.readFileSync(path.join(root, 'assets', 'book-thumbnails.json'), 'utf8')) : {};
  const discoveryBooks = fs.existsSync(path.join(root, 'assets', 'content-index.json'))
    ? (JSON.parse(fs.readFileSync(path.join(root, 'assets', 'content-index.json'), 'utf8')).books || []) : [];
  // Which quizzes each book can fill (four questions or more), worked out with
  // the same builders the browser uses, so the book page never offers a quiz
  // that would open empty. Node 22 and later can require the ES module.
  const QUIZ_IDS = ['who-said-it', 'fill-the-line', 'theme-match', 'technique-spotter', 'character-identification', 'order-the-plot'];
  let quizzesFor = () => QUIZ_IDS;
  try {
    const { GAME_BUILDERS } = require('../assets/astor/questions.mjs');
    const { seededRandom } = require('../assets/astor/util.mjs');
    quizzesFor = book => QUIZ_IDS.filter(id => {
      try { return GAME_BUILDERS[id].build(book, seededRandom(1)).length >= 4; } catch { return false; }
    });
  } catch (error) {
    console.warn('Could not load the quiz builders, so every quiz is listed: ' + error.message);
  }
  const coverFor = href => {
    const image = discoveryBooks.find(item => item.href === href)?.image || '';
    const thumb = thumbnails[image] || '';
    return thumb ? thumb.replace(/\.jpg$/, '-360.jpg') : '';
  };
  fs.writeFileSync(path.join(root, 'assets', 'revise-index.json'), JSON.stringify({
    icons: require('./revise-icons'),
    books: entries.map(book => {
      const identity = identityFor(book.slug, book.title);
      return {
        slug: book.slug, title: book.title, author: book.author, href: book.href,
        accent: identity.accent, motif: MOTIFS[identity.motif] || '', cover: coverFor(book.href),
        quotations: book.quotations.length, characters: book.characters.length,
        stages: book.structure.length, essays: book.essayQuestions.length,
        openingLine: book.openingLine || '',
        views: book.criticalViews.length,
        quizzes: quizzesFor(book)
      };
    })
  }) + '\n');
}

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
    addEntry('Theme', theme.name + ' in ' + book.title, '/explore/themes/#' + theme.id, book.title, theme.name + ' ' + book.title);
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
  ['Tool', 'Revise', '/play/', 'Quizzes, flashcards and the essay planner', 'play games revise quiz quizzes revision flashcards'],
  ['Tool', 'Today’s questions', '/today/', "A passage, a book and five questions", 'daily puzzle today streak'],
  ['Tool', 'Quotation explorer', '/explore/quotations/', 'Filter every quotation by theme, character and technique', 'quotations explorer filter'],
  ['Tool', 'Literature timeline', '/explore/timeline/', 'Every book in order, with its dates', 'timeline history dates'],
  ['Tool', 'Character maps', '/explore/characters/', 'Who is linked to whom in each book', 'characters relationships map diagram'],
  ['Tool', 'Themes across the library', '/explore/themes/', 'Each shared theme, book by book', 'themes theme explorer compare'],
  ['Tool', 'Technique glossary', '/explore/techniques/', 'Literary terms, with examples from the books', 'technique glossary terms devices'],
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

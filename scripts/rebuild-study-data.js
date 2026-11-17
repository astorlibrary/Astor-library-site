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

// The index carries what a cross-library tool needs, so the explorers, the
// library-wide quizzes and the teachers' worksheets can work from a chosen
// title without loading its individual record.
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
    criticalViews: book.criticalViews || [],
    timeline: book.timeline || [],
    places: book.places || []
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
  const { editionFor, loadEditionSources } = require('./editions');
  const editionSources = loadEditionSources(root);
  fs.writeFileSync(path.join(root, 'assets', 'revise-index.json'), JSON.stringify({
    icons: require('./revise-icons'),
    books: entries.map(book => {
      const identity = identityFor(book.slug, book.title);
      return {
        slug: book.slug, title: book.title, author: book.author, href: book.href,
        period: book.period, form: book.form, genre: book.genre || '',
        edition: editionFor({ slug: book.slug, period: book.period, form: book.form, genre: book.genre, accent: identity.accent }, editionSources.colours[book.slug], editionSources.overrides, editionSources.art[book.slug]),
        accent: identity.accent, motif: MOTIFS[identity.motif] || '', cover: coverFor(book.href),
        quotations: book.quotations.length, characters: book.characters.length,
        stages: book.structure.length,
        openingLine: book.openingLine || '',
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

// `also` is the other names an entry answers to: a study guide is what
// somebody means by "notes", "summary" or "analysis", and the key quotations
// are "quotes". The search treats them as part of the entry's name.
function addEntry(kind, title, href, note, terms, image, also) {
  const key = kind + '|' + href + '|' + title;
  if (seenHrefs.has(key)) return;
  seenHrefs.add(key);
  const entry = { k: kind, t: title, h: href, n: note || '', s: (terms || title).toLowerCase() };
  if (image) entry.i = image;
  if (also) entry.a = also;
  searchEntries.push(entry);
}

// The names the search uses for each kind of page (assets/astor/search.mjs
// says what each means to a reader): the web study guides are "Study guide",
// the slide guides under /resources/ are "Slide guide", and the printed
// Study Editions are "Study Edition".
const discoveryGroups = [
  ['books', 'Book'],
  ['authors', 'Writer'],
  ['subjects', 'Subject'],
  ['collections', 'Collection'],
  ['resources', 'Slide guide'],
  ['studyEditions', 'Study Edition'],
  ['passages', 'Close reading'],
  ['seasons', 'Seasonal']
];
const bookTitleByHref = new Map((discovery.books || []).map(item => [item.href, item]));
const searchThumbs = fs.existsSync(path.join(root, 'assets', 'book-thumbnails.json'))
  ? JSON.parse(fs.readFileSync(path.join(root, 'assets', 'book-thumbnails.json'), 'utf8')) : {};
const smallCover = image => (searchThumbs[image] || '').replace(/\.jpg$/, '-360.jpg');
const passageCards = fs.existsSync(path.join(root, 'scripts', 'passage-cards.json'))
  ? JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'passage-cards.json'), 'utf8')) : {};
const bookFormatNames = fs.existsSync(path.join(root, 'scripts', 'book-formats.json'))
  ? JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'book-formats.json'), 'utf8')) : {};
for (const [group, label] of discoveryGroups) {
  for (const item of discovery[group] || []) {
    // A paired Study Edition has no page of its own; it is sold from the
    // page of the first book in it.
    const pairedOnly = label === 'Study Edition' && item.href && !item.href.startsWith('/') && (item.relatedBooks || [])[0];
    const href = pairedOnly ? item.relatedBooks[0] + '#buy' : item.href;
    if (!href || !href.startsWith('/')) continue;
    const related = (item.relatedBooks || []).map(href => bookTitleByHref.get(href)).filter(Boolean);
    const relatedTitles = related.map(book => book.title);
    let note = item.author || item.collection || '';
    const terms = [item.title, item.author, item.collection];
    let image = '';
    if (label === 'Book') {
      const slug = item.href.split('/')[2];
      const formats = (bookFormatNames[slug] || []).map(format => format.format);
      terms.push('book edition buy', ...formats);
      image = smallCover(item.image);
    } else if (label === 'Close reading') {
      const card = passageCards[item.href.split('/')[2]];
      note = card?.small || relatedTitles.join(', ');
      terms.push(item.search, ...relatedTitles, 'close reading passage annotated');
    } else if (label === 'Slide guide') {
      note = relatedTitles.join(', ') || item.subject || '';
      terms.push(...relatedTitles, ...(item.tags || []).slice(0, 2), 'slides illustrated guide');
    } else if (label === 'Study Edition') {
      note = item.paired ? 'Two texts in one volume' : (related[0]?.author || '');
      terms.push(...relatedTitles, 'study edition printed print book buy');
      image = smallCover(item.image);
    } else if (label === 'Seasonal') {
      terms.push('season seasonal');
    }
    addEntry(label, item.title, href, note, terms.filter(Boolean).join(' '), image);
  }
}

// What each part of a guide is called, and the other words a reader might use
// for it: "Macbeth plot", "Macbeth summary" and "Macbeth what happens" are the
// same request.
const GUIDE_PARTS = [
  ['what-happens', 'what happens', 'plot summary synopsis story'],
  ['characters', 'characters', 'character people'],
  ['themes', 'themes', 'theme ideas'],
  ['form-and-language', 'form and language', 'structure techniques methods devices'],
  ['context', 'context', 'history background dates critics criticism']
];

// "Act I" is also "act 1" and "act one"; "Chapters 1–4" is also "chapter 3".
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20, xxi: 21, xxii: 22, xxiii: 23, xxiv: 24 };
const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
// Other ways of naming a part of a book, each a whole name the search can
// match exactly ("Hamlet Act 3"), joined by "|".
function numberForms(name, label) {
  const forms = [];
  const text = String(label);
  // Act I, Stave III, Book XII, Part II
  const roman = text.match(/^(Act|Stave|Book|Part|Canto|Volume|Chapter|Letter) ([IVXL]+)\b/);
  if (roman && ROMAN[roman[2].toLowerCase()]) {
    const n = ROMAN[roman[2].toLowerCase()];
    forms.push(name + ' ' + roman[1] + ' ' + n);
    if (NUMBER_WORDS[n]) forms.push(name + ' ' + roman[1] + ' ' + NUMBER_WORDS[n]);
  }
  // Chapters 1–4, Books 1–3, Letters 1–4
  const range = text.match(/^(Chapters|Books|Letters|Parts|Scenes|Cantos) (\d+)[–-](\d+)$/);
  if (range && Number(range[3]) - Number(range[2]) < 40) {
    const unit = range[1].replace(/s$/, '');
    for (let n = Number(range[2]); n <= Number(range[3]); n++) forms.push(unit + ' ' + n);
  }
  return forms.join(' | ');
}

const { sceneAnchors } = require('./rebuild-guides');

for (const book of entries) {
  const guide = '/guides/' + book.slug + '/';
  const name = String(book.title).split(';')[0].trim();
  addEntry('Study guide', name + ' study guide', guide, book.author, name + ' ' + book.author, '', 'notes summary analysis revision');
  addEntry('Key quotations', name + ': key quotations', guide + 'quotations/', book.quotations.length + ' lines with references and analysis',
    name + ' ' + book.author + ' important', '', 'quotes quote lines');
  addEntry('Revise', 'Revise ' + name, '/play/?book=' + book.slug, 'Ten questions, quizzes and flashcards',
    name + ' ' + book.author + ' questions', '', 'revision quiz quizzes test practice practise flashcards');
  for (const [part, label, words] of GUIDE_PARTS) {
    addEntry('Guide part', name + ': ' + label, guide + part + '/', book.author, name + ' ' + book.author, '', words);
  }
  // What happens, act by act and scene by scene: "Macbeth act 1 scene 7",
  // "Christmas Carol stave 3", "Jane Eyre chapter 23".
  const anchors = sceneAnchors(book);
  const clip = text => (String(text).length > 84 ? String(text).slice(0, 82).replace(/\s+\S*$/, '') + '…' : String(text));
  for (const stage of book.structure) {
    addEntry('Scene', name + ', ' + stage.label, guide + 'what-happens/#' + stage.id, stage.title && stage.title !== stage.label ? stage.title : clip(stage.summary),
      name + ' ' + stage.label + ' ' + (stage.title || ''), '', numberForms(name, stage.label));
    for (const scene of stage.scenes || []) {
      const ref = String(scene.ref);
      const play = ref.match(/^(\d+)\.(\d+)$/);
      const title = play ? name + ', Act ' + play[1] + ', Scene ' + play[2] : name + ', ' + ref;
      const forms = play
        ? name + ' ' + ref + (NUMBER_WORDS[play[1]] && NUMBER_WORDS[play[2]] ? ' | ' + name + ' Act ' + NUMBER_WORDS[play[1]] + ' Scene ' + NUMBER_WORDS[play[2]] : '')
        : numberForms(name, ref);
      addEntry('Scene', title, guide + 'what-happens/#' + anchors.get(scene), clip(scene.summary), name + ' ' + ref + ' ' + (scene.title || ''), '', forms);
    }
  }
  for (const character of book.characters) {
    addEntry('Character', character.name, guide + 'characters/#astor-character-' + character.id, book.title, character.name + ' ' + book.title + ' ' + (character.role || ''));
  }
  for (const theme of book.themes) {
    addEntry('Theme', theme.name + ' in ' + book.title, guide + 'themes/#astor-theme-' + theme.id, book.title, theme.name + ' ' + book.title);
  }
  for (const technique of book.techniques) {
    addEntry('Technique', technique.name, '/explore/techniques/#' + technique.id, technique.definition, technique.name);
  }
  // A line is also found by the themes it is filed under: "Macbeth ambition quotes".
  const themeName = new Map(book.themes.map(theme => [theme.id, theme.name]));
  for (const quotation of book.quotations) {
    const about = (quotation.themes || []).map(id => themeName.get(id)).filter(Boolean).join(' ');
    addEntry('Quotation', quotation.text.length > 76 ? quotation.text.slice(0, 74).trim() + '…' : quotation.text,
      guide + 'quotations/#astor-quote-' + quotation.id, [quotation.speaker, book.title + ' ' + quotation.reference].filter(Boolean).join(', '),
      quotation.text + ' ' + (quotation.speaker || '') + ' ' + book.title + ' ' + about);
  }
}

// The first six are what the empty search box suggests.
for (const tool of [
  ['Tool', 'Study guides', '/guides/', 'Plot, characters, themes, key quotations and context, free on the web. The GCSE set texts come first', 'study guide guides notes summary revision gcse igcse aqa ocr edexcel wjec eduqas set texts set text exam english literature'],
  ['Tool', 'Revise', '/play/', 'Ten questions on a book, with quizzes and flashcards', 'play games revise quiz quizzes revision flashcards'],
  ['Tool', 'All books', '/library/', 'Every Astor edition in print', 'books catalogue library editions buy'],
  ['Tool', 'Close readings', '/passage-room/', 'Famous passages with notes on the exact words', 'close readings passages passage room annotated'],
  ['Tool', 'Quotations across the library', '/explore/quotations/', 'Every key line, by book, theme and technique', 'quotations quotes explorer filter'],
  ['Tool', 'Today’s five questions', '/today/', 'Five questions a day on books, plays and poems', 'daily puzzle today quiz five questions'],
  ['Tool', 'Slide guides', '/resources/', 'Illustrated guides; a free account opens each one after its first three slides', 'slides illustrated guides free resources presentations'],
  ['Tool', 'Study Editions', '/study/', 'Printed books with the text and study material together', 'study editions printed print'],
  ['Tool', 'My library', '/my-library/', 'Saved books, reading progress, scores and kept quotations', 'my library saved progress commonplace'],
  ['Tool', 'Literary terms', '/explore/techniques/', 'What each term means, with a line from a book using it', 'technique glossary terms devices'],
  ['Tool', 'Literature timeline', '/explore/timeline/', 'Every book in order, with its dates', 'timeline history dates'],
  ['Tool', 'Character maps', '/explore/characters/', 'Who is linked to whom in each book', 'characters relationships map diagram'],
  ['Tool', 'Themes across the library', '/explore/themes/', 'Each shared theme, book by book', 'themes theme explorer'],
  ['Tool', 'Map of settings', '/explore/map/', 'Where the books take place', 'map places settings geography'],
  ['Tool', 'Two books side by side', '/explore/compare/', 'The facts and themes of two books, set next to each other', 'compare comparative comparison two texts side by side'],
  // The Revise games, so "who said it" or "flashcards" opens the game itself.
  ['Tool', 'Who said it?', '/play/who-said-it/', 'Name the speaker of a line', 'quiz revise speaker'],
  ['Tool', 'Fill the line', '/play/fill-the-line/', 'Put the missing words back into a speech', 'quiz revise gap missing words'],
  ['Tool', 'Which book?', '/play/which-book/', 'One line, the whole library', 'quiz revise'],
  ['Tool', 'Who is this?', '/play/character-identification/', 'A character described without being named', 'quiz revise character'],
  ['Tool', 'Theme match', '/play/theme-match/', 'Decide which theme a quotation carries', 'quiz revise themes'],
  ['Tool', 'Technique spotter', '/play/technique-spotter/', 'Name the technique used in a line', 'quiz revise techniques devices'],
  ['Tool', 'Order the plot', '/play/order-the-plot/', 'Put acts, chapters and scenes back in sequence', 'quiz revise plot sequence'],
  ['Tool', 'Which year?', '/play/context-sprint/', 'Place an event in the right year', 'quiz revise dates context'],
  ['Tool', 'Opening lines', '/play/opening-lines/', 'Name the book from its first sentence', 'quiz revise first lines'],
  ['Tool', 'Ten questions', '/play/mixed-round/', 'Ten questions on one book', 'quiz revise mixed round'],
  ['Tool', 'Flashcards', '/play/flashcards/', 'Learn a book’s key lines a few at a time', 'flashcards revise spaced repetition']
]) addEntry(tool[0], tool[1], tool[2], tool[3], tool[4]);

fs.writeFileSync(searchFile, JSON.stringify({ entries: searchEntries }, null, 0) + '\n');

// Pages that state how much study material exists carry the figure in a
// <span data-astor-count="…">, and the build writes the real number in.
for (const file of ['index.html', 'guides/index.html']) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) continue;
  let html = fs.readFileSync(target, 'utf8');
  for (const [key, value] of [['quotations', index.counts.quotations], ['titles', index.counts.books], ['guides', index.counts.books]]) {
    const pattern = new RegExp('(<span data-astor-count="' + key + '">)[\\d,]+(<\\/span>)', 'g');
    html = html.replace(pattern, '$1' + Number(value).toLocaleString('en-GB') + '$2');
  }
  fs.writeFileSync(target, html);
}

console.log(
  'Published study data for ' + index.counts.books + ' titles: ' +
  index.counts.quotations + ' quotations, ' +
  index.counts.characters + ' characters, ' +
  index.counts.themes + ' themes, ' +
  index.counts.techniques + ' techniques. Search palette index: ' + searchEntries.length + ' entries.'
);

module.exports = { indexEntry };

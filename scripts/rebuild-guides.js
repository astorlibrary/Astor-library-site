// Builds the free study guides: /guides/ and, for every title with a record in
// data/books/, /guides/<slug>/ with six short pages beneath it.
//
// A guide is reference material, so each part has its own page and its own
// address: what happens, the characters, the themes, the key quotations, form
// and language, and context. The guide's opening page carries the title, a
// short introduction and the contents, and nothing else.
//
// build-static.js replaces the header and footer on the way to dist/, as it
// does for every other page.

const fs = require('fs');
const path = require('path');
const { loadBooks } = require('./book-data');

const root = process.cwd();
const guidesRoot = path.join(root, 'guides');

const SECTIONS = [
  { slug: 'what-happens', title: 'What happens' },
  { slug: 'characters', title: 'Characters' },
  { slug: 'themes', title: 'Themes' },
  { slug: 'quotations', title: 'Key quotations' },
  { slug: 'form-and-language', title: 'Form and language' },
  { slug: 'context', title: 'Context' }
];

const COLLECTION_ORDER = ['Shakespeare', 'Ancient & Epic', 'Renaissance & Early Modern', 'Restoration & Enlightenment', 'Romantic & Regency', 'Victorian', 'American Classics', 'Modern Classics', 'Russian'];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function guideHref(slug, section) {
  return '/guides/' + slug + '/' + (section ? section + '/' : '');
}

function formatYear(year) {
  const value = Number(year);
  if (!Number.isFinite(value)) return String(year);
  return value < 0 ? Math.abs(value) + ' BC' : String(value);
}

// Titles such as "Macbeth" are italicised in running text; a page heading is
// set in roman.
function shortTitle(book) {
  return String(book.title).split(';')[0].trim();
}

const HEADER = `<header class="site-header">
  <a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt=""><span class="word">LIBRARY</span></a>
  <nav class="nav" aria-label="Primary navigation"><a class="nav-link" href="/library/">Books</a><a class="nav-link" href="/guides/">Study guides</a><a class="nav-link" href="/play/">Revise</a></nav>
</header>`;

const FOOTER = '<footer class="site-footer"><div><p class="footer-brand">Astor Library</p></div><div class="footer-links"><a href="/library/">Books</a><a href="/guides/">Study guides</a><a href="/play/">Revise</a></div></footer>';

function shell({ title, description, body, bookSlug, maps }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="stylesheet" href="/assets/styles.css">
${maps ? '  <link rel="stylesheet" href="/assets/astor-study.css">\n' : ''}${bookSlug ? '  <script type="module" src="/assets/astor/guide.mjs"></script>\n' : ''}</head>
<body>
${HEADER}
${body}
${FOOTER}
</body>
</html>
`;
}

function write(relative, html) {
  const directory = path.join(guidesRoot, relative);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), html);
}

// --- the parts of a guide ----------------------------------------------------

function contentsNav(book, current) {
  const items = SECTIONS.map((section, index) => {
    const here = section.slug === current;
    return '<li><a href="' + guideHref(book.slug, section.slug) + '"' + (here ? ' aria-current="page"' : '') + '>' +
      '<span class="guide-toc-number">' + (index + 1) + '</span>' + escapeHtml(section.title) + '</a></li>';
  }).join('');
  return '<nav class="guide-toc" aria-label="' + escapeHtml(shortTitle(book)) + ' study guide">' +
    '<p class="guide-toc-title"><a href="' + guideHref(book.slug) + '">' + escapeHtml(shortTitle(book)) + '</a></p>' +
    '<ol>' + items + '</ol></nav>';
}

function quoteBlock(book, quotation, { explain = true, id = true } = {}) {
  const where = [quotation.speaker, quotation.reference].filter(Boolean).join(', ');
  const note = [quotation.context, quotation.analysis].filter(Boolean).map(text => '<p>' + escapeHtml(text) + '</p>').join('');
  return '<figure class="guide-quote"' + (id ? ' id="astor-quote-' + escapeHtml(quotation.id) + '" data-quote-id="' + escapeHtml(quotation.id) + '"' : '') + '>' +
    '<blockquote><p>' + escapeHtml(quotation.text) + '</p></blockquote>' +
    '<figcaption>' + escapeHtml(where) + '</figcaption>' +
    (explain && note ? '<div class="guide-quote-note">' + note + '</div>' : '') +
    '</figure>';
}

function shortQuote(quotation) {
  const where = [quotation.speaker, quotation.reference].filter(Boolean).join(', ');
  return '<blockquote class="guide-example"><p>' + escapeHtml(quotation.text) + '</p><footer>' + escapeHtml(where) + '</footer></blockquote>';
}

function whatHappens(book) {
  const stages = book.structure.map(stage => {
    const scenes = (stage.scenes || []).length
      ? '<dl class="guide-scenes">' + stage.scenes.map(scene =>
        '<div><dt>' + escapeHtml(scene.ref) + '</dt><dd>' + escapeHtml(scene.summary) + '</dd></div>').join('') + '</dl>'
      : '';
    return '<section class="guide-stage" id="' + escapeHtml(stage.id) + '" data-stage="' + escapeHtml(stage.id) + '">' +
      '<h2>' + escapeHtml(stage.label) + (stage.title && stage.title !== stage.label ? ' <span class="guide-stage-title">' + escapeHtml(stage.title) + '</span>' : '') + '</h2>' +
      '<p>' + escapeHtml(stage.summary) + '</p>' + scenes +
      '</section>';
  }).join('');
  return stages;
}

function characters(book) {
  const entries = book.characters.map(character => {
    const role = [character.role, character.firstAppearance ? 'first appears ' + character.firstAppearance : ''].filter(Boolean).join('; ');
    return '<section class="guide-entry" id="astor-character-' + escapeHtml(character.id) + '">' +
      '<h2>' + escapeHtml(character.name) + '</h2>' +
      (role ? '<p class="guide-entry-role">' + escapeHtml(role.replace(/^./, c => c.toUpperCase())) + '</p>' : '') +
      '<p>' + escapeHtml(character.summary) + '</p>' +
      '</section>';
  }).join('');
  const map = '<section class="guide-map" aria-labelledby="guide-map-title">' +
    '<h2 id="guide-map-title">Character map</h2>' +
    '<div class="guide-map-box" data-astor-character-map="' + escapeHtml(book.slug) + '">' +
    '<p><a href="/explore/characters/?book=' + escapeHtml(book.slug) + '">Open the character map</a></p></div></section>';
  return entries + map;
}

function themes(book) {
  return book.themes.map(theme => {
    const examples = book.quotations.filter(quotation => (quotation.themes || []).includes(theme.id)).slice(0, 2);
    return '<section class="guide-entry" id="astor-theme-' + escapeHtml(theme.id) + '">' +
      '<h2>' + escapeHtml(theme.name) + '</h2>' +
      '<p>' + escapeHtml(theme.summary) + '</p>' +
      (theme.development ? '<p>' + escapeHtml(theme.development) + '</p>' : '') +
      examples.map(shortQuote).join('') +
      '</section>';
  }).join('');
}

function quotations(book) {
  const stageOf = new Map(book.structure.map(stage => [stage.id, stage]));
  const groups = [];
  for (const quotation of book.quotations) {
    const stage = stageOf.get(quotation.stage);
    const key = stage ? stage.id : '';
    let group = groups.find(entry => entry.key === key);
    if (!group) {
      group = { key, label: stage ? stage.label : 'Elsewhere', items: [] };
      groups.push(group);
    }
    group.items.push(quotation);
  }
  const order = new Map(book.structure.map((stage, index) => [stage.id, index]));
  groups.sort((a, b) => (order.has(a.key) ? order.get(a.key) : 999) - (order.has(b.key) ? order.get(b.key) : 999));
  const single = groups.length === 1;
  return groups.map(group =>
    '<section class="guide-quote-group">' + (single ? '' : '<h2>' + escapeHtml(group.label) + '</h2>') +
    group.items.map(quotation => quoteBlock(book, quotation)).join('') + '</section>'
  ).join('');
}

function formAndLanguage(book) {
  if (!book.techniques.length) return '<p>There is no separate note on form and language for this book yet.</p>';
  return book.techniques.map(technique => {
    const example = book.quotations.find(quotation => (quotation.techniques || []).includes(technique.id));
    return '<section class="guide-entry" id="astor-technique-' + escapeHtml(technique.id) + '">' +
      '<h2>' + escapeHtml(technique.name) + '</h2>' +
      '<p class="guide-definition">' + escapeHtml(technique.definition) + '</p>' +
      '<p>' + escapeHtml(technique.inThisBook) + '</p>' +
      (example ? shortQuote(example) : '') +
      '</section>';
  }).join('');
}

function context(book) {
  const parts = [];
  const timeline = (book.timeline || []).slice().sort((a, b) => a.year - b.year);
  if (timeline.length) {
    parts.push('<section class="guide-dates" aria-labelledby="guide-dates-title"><h2 id="guide-dates-title">Dates</h2><dl>' +
      timeline.map(entry => '<div><dt>' + escapeHtml(formatYear(entry.year)) + '</dt><dd><strong>' + escapeHtml(entry.label) + '</strong>' +
        (entry.detail ? ' ' + escapeHtml(entry.detail) : '') + '</dd></div>').join('') + '</dl></section>');
  }
  if ((book.places || []).length) {
    parts.push('<section class="guide-places" aria-labelledby="guide-places-title"><h2 id="guide-places-title">Places</h2>' +
      '<div class="guide-map-box" data-astor-book-map="' + escapeHtml(book.slug) + '"></div>' +
      '<dl class="guide-place-list">' + book.places.map(place =>
        '<div><dt>' + escapeHtml(place.name) + '</dt>' + (place.note ? '<dd>' + escapeHtml(place.note) + '</dd>' : '') + '</div>').join('') + '</dl></section>');
  }
  if ((book.criticalViews || []).length) {
    parts.push('<section class="guide-criticism" aria-labelledby="guide-criticism-title"><h2 id="guide-criticism-title">Critics</h2>' +
      book.criticalViews.map(view =>
        '<div class="guide-critic"><h3>' + escapeHtml(view.critic) + '</h3>' +
        '<p class="guide-critic-work"><cite>' + escapeHtml(view.work) + '</cite>' + (view.year ? ' (' + escapeHtml(view.year) + ')' : '') + '</p>' +
        '<p>' + escapeHtml(view.summary) + '</p></div>'
      ).join('') +
      '<p class="guide-small">The summaries are our own. Short quotations are from the works named.</p>' +
      '</section>');
  }
  return parts.join('');
}

const RENDER = {
  'what-happens': whatHappens,
  characters,
  themes,
  quotations,
  'form-and-language': formAndLanguage,
  context
};

// Titles in running text and meta descriptions.
const DESCRIBE = {
  'what-happens': book => 'What happens in ' + shortTitle(book) + ', ' + (book.form === 'play' ? 'act by act and scene by scene' : 'section by section') + '.',
  characters: book => 'The characters in ' + shortTitle(book) + ' by ' + book.author + ', who they are and what they do.',
  themes: book => 'The main themes of ' + shortTitle(book) + ' by ' + book.author + ', with quotations from the text.',
  quotations: book => 'Key quotations from ' + shortTitle(book) + ' with their speakers, references and explanations.',
  'form-and-language': book => 'Form, structure and language in ' + shortTitle(book) + ' by ' + book.author + ', with examples.',
  context: book => 'Dates, places and historical context for ' + shortTitle(book) + ' by ' + book.author + '.'
};

function sourceNote(book) {
  const label = book.sourceText?.label || '';
  if (!label) return '';
  const named = /^(Project Gutenberg|Standard Ebooks|Globe\/Moby) /.test(label) ? 'the ' + label : label;
  return '<p class="guide-small guide-source">Quotations are from ' + escapeHtml(named) + (book.referenceStyle ? '. References give ' + escapeHtml(book.referenceStyle.replace(/^./, c => c.toLowerCase())) : '') + '.</p>';
}

function writtenLine(book) {
  const parts = [];
  if (book.written) parts.push('Written ' + book.written);
  if (book.firstPublished) parts.push((Number(book.firstPublished) < 1700 ? 'first printed ' : 'first published ') + formatYear(book.firstPublished));
  const line = parts.join('; ');
  return line ? '<p class="guide-dates-line">' + escapeHtml(line.replace(/^./, c => c.toUpperCase())) + '.</p>' : '';
}

function guideIndex(book, bookInfo) {
  const cover = bookInfo?.image
    ? '<a class="guide-cover" href="' + escapeHtml(book.href) + '"><img src="' + escapeHtml(bookInfo.image) + '" alt="' + escapeHtml(shortTitle(book)) + ', Astor Library edition" width="360" height="540"></a>'
    : '';
  const contents = '<ol class="guide-contents">' + SECTIONS.map((section, index) =>
    '<li><a href="' + guideHref(book.slug, section.slug) + '"><span class="guide-toc-number">' + (index + 1) + '</span>' + escapeHtml(section.title) + '</a></li>'
  ).join('') + '</ol>';
  const body = `<main class="page-wrap guide guide-home" data-guide="${escapeHtml(book.slug)}" data-guide-title="${escapeHtml(shortTitle(book))}" data-guide-href="${escapeHtml(book.href)}">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/guides/">Study guides</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(shortTitle(book))}</span></nav>
  <header class="guide-intro">
    <div class="guide-intro-text">
      <p class="guide-author">${escapeHtml(book.author)}</p>
      <h1>${escapeHtml(shortTitle(book))}</h1>
      <p class="guide-kind">A study guide</p>
      <p class="guide-summary">${escapeHtml(book.summary)}</p>
      ${writtenLine(book)}
    </div>
    ${cover}
  </header>
  <section class="guide-contents-block" aria-labelledby="guide-contents-title">
    <h2 id="guide-contents-title">Contents</h2>
    ${contents}
  </section>
  <p class="guide-links"><a href="${escapeHtml(book.href)}">The Astor edition</a><a href="/play/?book=${escapeHtml(book.slug)}">Revise ${escapeHtml(shortTitle(book))}</a><button class="guide-save" type="button" data-guide-save hidden>Save to My library</button></p>
  ${sourceNote(book)}
</main>`;
  return shell({
    title: shortTitle(book) + ' Study Guide | Astor Library',
    description: 'A free study guide to ' + shortTitle(book) + ' by ' + book.author + ': what happens, the characters, themes, key quotations, form and language, and context.',
    body,
    bookSlug: book.slug
  });
}

function guideSection(book, section, index) {
  const next = SECTIONS[index + 1];
  const previous = SECTIONS[index - 1];
  const pager = '<nav class="guide-pager" aria-label="Next and previous">' +
    (previous ? '<a class="guide-pager-prev" href="' + guideHref(book.slug, previous.slug) + '"><small>Previous</small>' + escapeHtml(previous.title) + '</a>' : '<a class="guide-pager-prev" href="' + guideHref(book.slug) + '"><small>Back to</small>Contents</a>') +
    (next ? '<a class="guide-pager-next" href="' + guideHref(book.slug, next.slug) + '"><small>Next</small>' + escapeHtml(next.title) + '</a>' : '<a class="guide-pager-next" href="/play/?book=' + escapeHtml(book.slug) + '"><small>Next</small>Revise ' + escapeHtml(shortTitle(book)) + '</a>') +
    '</nav>';
  const extra = section.slug === 'quotations' ? sourceNote(book) : '';
  const body = `<main class="page-wrap guide guide-part" data-guide="${escapeHtml(book.slug)}" data-guide-title="${escapeHtml(shortTitle(book))}" data-guide-href="${escapeHtml(book.href)}" data-guide-section="${section.slug}">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/guides/">Study guides</a><span aria-hidden="true">/</span><a href="${guideHref(book.slug)}">${escapeHtml(shortTitle(book))}</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(section.title)}</span></nav>
  <div class="guide-layout">
    ${contentsNav(book, section.slug)}
    <article class="guide-article">
      <header class="guide-head">
        <p class="guide-author"><a href="${guideHref(book.slug)}">${escapeHtml(shortTitle(book))}</a> · ${escapeHtml(book.author)}</p>
        <h1>${escapeHtml(section.title)}</h1>
      </header>
      <div class="guide-body guide-body-${section.slug}">
        ${RENDER[section.slug](book)}
        ${extra}
      </div>
      ${pager}
    </article>
  </div>
</main>`;
  return shell({
    title: shortTitle(book) + ': ' + section.title + ' | Astor Library Study Guide',
    description: DESCRIBE[section.slug](book),
    body,
    bookSlug: book.slug,
    maps: section.slug === 'characters' || section.slug === 'context'
  });
}

function guidesHome(books, discovery) {
  const byCollection = new Map();
  for (const book of books) {
    const info = discovery.books.find(item => item.href === book.href);
    const collection = info?.collection || book.period || 'Other';
    if (!byCollection.has(collection)) byCollection.set(collection, []);
    byCollection.get(collection).push({ book, info });
  }
  const names = [...byCollection.keys()].sort((a, b) => {
    const ia = COLLECTION_ORDER.indexOf(a), ib = COLLECTION_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  const sections = names.map(name => {
    const entries = byCollection.get(name).sort((a, b) => shortTitle(a.book).localeCompare(shortTitle(b.book)));
    return '<section class="guides-group"><h2>' + escapeHtml(name) + '</h2><ul class="guides-list">' +
      entries.map(({ book }) => '<li><a href="' + guideHref(book.slug) + '"><span class="guides-title">' + escapeHtml(shortTitle(book)) + '</span><span class="guides-author">' + escapeHtml(book.author) + '</span></a></li>').join('') +
      '</ul></section>';
  }).join('');
  const body = `<main class="page-wrap guides-home">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">Study guides</span></nav>
  <header class="guides-intro">
    <h1>Study guides</h1>
    <p>Free guides to <span data-astor-count="guides">${books.length}</span> books in the Astor catalogue. Each one covers what happens, the characters, the themes, key quotations, form and language, and the book’s historical context. Every quotation has been checked against a named text of the book.</p>
    <p>The guides are free to read and need no account. They are separate from the Astor <a href="/study/">Study Editions</a>, which are printed books.</p>
  </header>
  ${sections}
</main>`;
  return shell({
    title: 'Study Guides | Astor Library',
    description: 'Free study guides to ' + books.length + ' classic novels, plays and poems: plot, characters, themes, key quotations, form and language, and context.',
    body
  });
}

function rebuildGuides() {
  const books = loadBooks();
  const discoveryFile = path.join(root, 'assets', 'content-index.json');
  const discovery = fs.existsSync(discoveryFile) ? JSON.parse(fs.readFileSync(discoveryFile, 'utf8')) : { books: [] };

  // Start clean so a retired guide or section cannot linger.
  fs.rmSync(guidesRoot, { recursive: true, force: true });
  fs.mkdirSync(guidesRoot, { recursive: true });

  write('', guidesHome(books, discovery));
  for (const book of books) {
    const info = discovery.books.find(item => item.href === book.href);
    write(book.slug, guideIndex(book, info));
    SECTIONS.forEach((section, index) => write(book.slug + '/' + section.slug, guideSection(book, section, index)));
  }
  return books.length;
}

if (require.main === module) {
  console.log('Built ' + rebuildGuides() + ' study guides.');
}

module.exports = { SECTIONS, guideHref, rebuildGuides };

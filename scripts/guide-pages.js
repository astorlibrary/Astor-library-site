// The study guides: one for every book with a study record, at /guides/<slug>/,
// with a page for each part of what used to be the study toolkit on the book
// page. The book page now shows the edition; the guide is where a reader
// learns the book; Revise (/play/) is where they practise it.
//
// scripts/rebuild-guides.js writes a small source page for each guide page
// (title, description, breadcrumb), so the site's page checks and sitemap see
// them. build-static.js fills each one from data/books/<slug>.json at build
// time, the way the toolkit was filled, using the panel renderers in
// study-toolkit.js, so a change to a record reaches the guide, the explorers
// and the games in the same build.

const {
  escapeHtml, glance, plotPanel, charactersPanel, themesPanel, quotationsPanel, techniquesPanel,
  contextPanel, essaysPanel, videosPanel, relatedPanel, formatYear, readingTimeLabel, fallbackTitle
} = require('./study-toolkit');

const isPlay = book => book.form === 'play';
const parts = book => (isPlay(book) ? 'acts' : 'sections');
const plural = (count, one, many) => count + ' ' + (count === 1 ? one : many);

// The sections, in reading order. `panel` draws the section's material (empty
// when the record has none, and then the section is left out); `size` is the
// short count shown in the contents; `about` says what the page is for, in
// the guide's own index and the page's description.
const SECTIONS = [
  {
    id: 'plot', name: 'What happens',
    panel: book => plotPanel(book),
    size: book => plural(book.structure.length, isPlay(book) ? 'act' : 'section', parts(book)),
    about: book => 'The story ' + (isPlay(book) ? 'act by act, with every scene' : 'section by section') + '.'
  },
  {
    id: 'characters', name: 'Characters',
    panel: book => (book.characters.length ? charactersPanel(book) : ''),
    size: book => plural(book.characters.length, 'character', 'characters'),
    about: () => 'Who they are, what drives them, and a map of how they connect.'
  },
  {
    id: 'themes', name: 'Themes',
    panel: book => (book.themes.length ? themesPanel(book) : ''),
    size: book => plural(book.themes.length, 'theme', 'themes'),
    about: () => 'The ideas the book keeps returning to, and how each develops.'
  },
  {
    id: 'quotations', name: 'Key quotations',
    panel: book => (book.quotations.length ? quotationsPanel(book) : ''),
    size: book => plural(book.quotations.length, 'quotation', 'quotations'),
    about: () => 'The lines worth knowing, each with where it comes from and what it does.'
  },
  {
    id: 'language', name: 'Form and language',
    panel: book => techniquesPanel(book),
    size: book => plural(book.techniques.length, 'technique', 'techniques'),
    about: () => 'How the writing works: the techniques, and where to find them.'
  },
  {
    id: 'context', name: 'Context',
    panel: book => contextPanel(book) + videosPanel(book),
    size: book => {
      const views = (book.criticalViews || []).length;
      return views ? plural(views, 'critical view', 'critical views') : plural((book.timeline || []).length, 'date', 'dates');
    },
    about: () => 'When and how it was written, how it has been read, and where it is set.'
  },
  {
    id: 'essays', name: 'Essay questions',
    panel: book => essaysPanel(book),
    size: book => plural((book.essayQuestions || []).length, 'question', 'questions'),
    about: () => 'Exam-style questions, each with a plan to build an answer from.'
  }
];

// Where an old address on a book page now lives: /books/macbeth/#astor-quote-x
// becomes /guides/macbeth/quotations/#astor-quote-x. Each panel's place is
// written relative to the guide, with the part of the page it opens on.
const OLD_PANELS = {
  'astor-plot': 'plot/', 'astor-characters': 'characters/', 'astor-themes': 'themes/',
  'astor-quotations': 'quotations/', 'astor-techniques': 'language/', 'astor-context': 'context/',
  'astor-watch': 'context/#astor-watch', 'astor-essays': 'essays/', 'astor-revise': '#sg-practise-title',
  'astor-related': '#astor-related', 'astor-study-toolkit': ''
};
const OLD_ITEMS = { 'astor-character-': 'characters', 'astor-theme-': 'themes', 'astor-quote-': 'quotations', 'astor-technique-': 'language' };

function guideHref(slug, section = '') {
  return '/guides/' + slug + '/' + (section ? section + '/' : '');
}

function sectionsFor(book) {
  return SECTIONS.filter(section => section.panel(book));
}

function shortTitle(book) {
  return String(book.title).split(';')[0].trim();
}

function clip(text, length) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= length) return value;
  const cut = value.slice(0, length);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—–-]+$/, '') + '…';
}

// --- the source pages ----------------------------------------------------------

// The shared header and footer a source page carries; build-static.js replaces
// both with the site's own.
const SOURCE_HEADER = '<header class="site-header"><a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><span class="word">LIBRARY</span></a>' +
  '<nav class="nav" aria-label="Primary navigation"><a class="nav-link" href="/library/">Books</a><a class="nav-link" href="/guides/">Study guides</a><a class="nav-link" href="/study/">Study editions</a><a class="nav-link" href="/resources/">Free resources</a><a class="nav-link" href="/play/">Revise</a><a class="nav-link" href="/explore/">Search</a></nav></header>\n';
const SOURCE_FOOTER = '<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Classic books, study editions and free literature resources.</p></div></footer>\n';

function pageTitle(book, id) {
  const title = shortTitle(book);
  if (!id) return title + ' study guide | Astor Library';
  return {
    plot: 'What happens in ' + title + ': summary',
    characters: title + ' characters',
    themes: title + ' themes',
    quotations: title + ' key quotations',
    language: title + ': form and language',
    context: title + ': context and critical views',
    essays: title + ' essay questions'
  }[id] + ' | ' + title + ' study guide | Astor Library';
}

function pageDescription(book, id) {
  const title = shortTitle(book);
  const by = book.author ? ' by ' + book.author : '';
  if (!id) {
    return clip('A free study guide to ' + title + by + ': what happens, the characters, themes, key quotations, form and language, context and essay questions.', 300);
  }
  if (id === 'plot') return clip('What happens in ' + title + by + ', ' + (isPlay(book) ? 'act by act and scene by scene' : 'section by section') + '. ' + book.summary, 300);
  if (id === 'characters') return clip('The characters of ' + title + ': ' + book.characters.map(character => character.name).join(', ') + '.', 300);
  if (id === 'themes') return clip('The themes of ' + title + ': ' + book.themes.map(theme => theme.name.toLowerCase()).join(', ') + ', with how each develops.', 300);
  if (id === 'quotations') return clip(book.quotations.length + ' key quotations from ' + title + ', each with its reference, its moment and what it shows.', 300);
  if (id === 'language') return clip('Form and language in ' + title + ': ' + book.techniques.map(technique => technique.name.toLowerCase()).join(', ') + '.', 300);
  if (id === 'context') return clip('The context of ' + title + ': key dates' + ((book.criticalViews || []).length ? ', critical views' : '') + ((book.places || []).length ? ', places' : '') + ' and how the book has been read.', 300);
  return clip((book.essayQuestions || []).length + ' essay questions on ' + title + ', each with a plan, and questions for discussion.', 300);
}

function renderStub(book, id) {
  const section = SECTIONS.find(entry => entry.id === id);
  const crumbs = '<a href="/guides/">Study guides</a><span aria-hidden="true">/</span>' + (id
    ? '<a href="' + guideHref(book.slug) + '">' + escapeHtml(shortTitle(book)) + '</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(section.name) + '</span>'
    : '<span aria-current="page">' + escapeHtml(shortTitle(book)) + '</span>');
  return '<!doctype html>\n<html lang="en-GB">\n<head>\n' +
    '  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <title>' + escapeHtml(pageTitle(book, id)) + '</title>\n' +
    '  <meta name="description" content="' + escapeHtml(pageDescription(book, id)) + '">\n' +
    '  <link rel="stylesheet" href="/assets/styles.css">\n  <link rel="stylesheet" href="/assets/astor-study.css">\n' +
    '</head>\n<body>\n' +
    SOURCE_HEADER +
    '<main id="main-content" class="page-wrap sg-page" data-astor-guide="' + escapeHtml(book.slug) + '" data-guide-section="' + escapeHtml(id) + '">\n' +
    '  <nav class="book-breadcrumb" aria-label="Breadcrumb">' + crumbs + '</nav>\n' +
    '  <h1>' + escapeHtml(id ? section.name : shortTitle(book)) + '</h1>\n' +
    '  <!-- Filled at build time by scripts/build-static.js from data/books/' + escapeHtml(book.slug) + '.json (see scripts/guide-pages.js). -->\n' +
    '</main>\n' +
    SOURCE_FOOTER +
    '</body>\n</html>\n';
}

// --- the filled pages ------------------------------------------------------------

// The one contents list. On a section page it sits beside the text on a wide
// screen and after it on a narrow one, so a phone opens on the reading; the
// overview carries its own fuller list instead.
function contents(book, here, { editionHref } = {}) {
  const sections = sectionsFor(book);
  const item = (href, name, current) =>
    '<li><a href="' + href + '"' + (current ? ' aria-current="page"' : '') + '>' + escapeHtml(name) + '</a></li>';
  return '<nav class="gd-contents" aria-labelledby="gd-contents-title">' +
    '<p class="gd-contents-title" id="gd-contents-title"><a href="' + guideHref(book.slug) + '">' + escapeHtml(shortTitle(book)) + '</a></p>' +
    '<ol>' + sections.map(section => item(guideHref(book.slug, section.id), section.name, section.id === here)).join('') + '</ol>' +
    '<ul class="gd-contents-more">' +
    '<li><a href="/play/?book=' + escapeHtml(book.slug) + '">Revise ' + escapeHtml(shortTitle(book)) + '</a></li>' +
    '<li><a href="' + escapeHtml(editionHref || book.href) + '">The Astor edition</a></li>' +
    '</ul>' +
    '</nav>';
}

function pager(book, here) {
  const order = [{ id: '', name: 'Contents' }, ...sectionsFor(book)];
  const at = order.findIndex(section => section.id === here);
  const previous = order[at - 1];
  const next = order[at + 1];
  if (!previous && !next) return '';
  const link = (section, rel, label) => section
    ? '<a class="gd-pager-' + rel + '" rel="' + rel + '" href="' + guideHref(book.slug, section.id) + '"><small>' + label + '</small> ' + escapeHtml(section.name) + '</a>'
    : '<span></span>';
  return '<nav class="gd-pager" aria-label="Previous and next sections">' + link(previous, 'prev', 'Previous') + link(next, 'next', 'Next') + '</nav>';
}

// The overview: the book, a way to begin, the contents, and what goes with it.
function overview(book, { passages, titleFor, cover, editionHref }) {
  const sections = sectionsFor(book);
  const slug = escapeHtml(book.slug);
  const title = escapeHtml(shortTitle(book));
  const first = sections[0];
  const toc = sections.map(section =>
    '<li><a href="' + guideHref(book.slug, section.id) + '">' + escapeHtml(section.name) + '</a>' +
    '<span>' + escapeHtml(section.about(book)) + '</span></li>').join('');
  // A related page the catalogue cannot name is titled from its address.
  const related = relatedPanel(book, href => (titleFor && titleFor(href)) || fallbackTitle(href), passages || []);
  const coverHtml = cover
    ? '<a class="gd-cover" href="' + escapeHtml(editionHref || book.href) + '" aria-label="The Astor edition of ' + title + '"><img src="' + escapeHtml(cover) + '" alt="" width="160" height="240" decoding="async"></a>'
    : '';
  return '<header class="gd-title' + (cover ? '' : ' no-cover') + '">' + coverHtml +
    '<div class="gd-title-words">' +
    (book.author ? '<p class="gd-author">' + escapeHtml(book.author) + '</p>' : '') +
    '<h1>' + title + '</h1>' +
    '<p class="gd-subtitle">A study guide</p>' +
    '</div></header>' +
    '<div class="gd-text gd-overview">' +
    '<p class="gd-lead">' + escapeHtml(book.summary) + '</p>' +
    '<p class="gd-begin">' +
    (first ? '<a class="gd-button" href="' + guideHref(book.slug, first.id) + '">Begin with ' + escapeHtml(first.name.toLowerCase()) + ' <span aria-hidden="true">→</span></a>' : '') +
    '<button class="gd-text-button" type="button" data-astor-save aria-pressed="false">Save to my library</button>' +
    '</p>' +
    '<section class="gd-toc" aria-labelledby="gd-toc-title"><h2 id="gd-toc-title">Contents</h2><ol>' + toc + '</ol></section>' +
    '<section class="gd-alongside" aria-labelledby="sg-practise-title">' +
    '<h2 id="sg-practise-title">Alongside the guide</h2>' +
    '<p><a href="/play/?book=' + slug + '">Revise ' + title + '</a> with quizzes, flashcards for the ' + book.quotations.length + ' key lines' +
    ((book.essayQuestions || []).length ? ' and an essay planner' : '') + '. Your answers stay in this browser.</p>' +
    '<details class="gd-tool" id="sg-tools-title"><summary>Make a reading plan</summary>' +
    '<div class="astor-plan" data-astor-plan="' + slug + '"><p>Choose a finish date and the days you can read, and the ' + parts(book) + ' are shared out between them.</p></div></details>' +
    '<details class="gd-tool"><summary>Print a revision sheet</summary>' +
    '<div class="astor-sheet-box" data-astor-sheet="' + slug + '"><p>The plot, characters, themes and ' + Math.min(8, book.quotations.length) + ' key quotations on one page.</p></div></details>' +
    '</section>' +
    related +
    '<section class="gd-about" aria-labelledby="gd-about-title"><h2 id="gd-about-title">About the book</h2>' + glance(book) + '</section>' +
    '</div>';
}

// Everything inside <main> for one guide page.
function renderGuideMain(book, id, { cover, editionHref, passages, titleFor } = {}) {
  const section = SECTIONS.find(entry => entry.id === id);
  const title = shortTitle(book);
  const crumbs = '<a href="/guides/">Study guides</a><span aria-hidden="true">/</span>' + (id
    ? '<a href="' + guideHref(book.slug) + '">' + escapeHtml(title) + '</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(section.name) + '</span>'
    : '<span aria-current="page">' + escapeHtml(title) + '</span>');
  const data = ' id="astor-study-toolkit" data-astor-book="' + escapeHtml(book.slug) + '" data-astor-book-title="' + escapeHtml(book.title) + '" data-astor-book-href="' + escapeHtml(book.href) + '" data-astor-stages="' + book.structure.length + '"';
  if (!id) {
    return '\n  <nav class="book-breadcrumb" aria-label="Breadcrumb">' + crumbs + '</nav>\n' +
      '  <div class="gd-book"' + data + '>' + overview(book, { passages, titleFor, cover, editionHref }) + '</div>\n';
  }
  // The edition's page keeps the book's own history (its text, sources and
  // afterlife); the Context section points there rather than repeating it.
  const more = id === 'context'
    ? '<p class="gd-see-also">The book’s publication, sources and later history are on <a href="' + escapeHtml(editionHref || book.href) + '">the Astor edition’s page</a>.</p>'
    : '';
  return '\n  <nav class="book-breadcrumb" aria-label="Breadcrumb">' + crumbs + '</nav>\n' +
    '  <div class="gd-layout">' +
    '<article class="gd-text"' + data + '>' +
    '<h1>' + escapeHtml(section.name) + '</h1>' +
    section.panel(book) + more +
    pager(book, id) +
    '</article>' +
    contents(book, id, { editionHref }) +
    '</div>\n';
}

// --- the index of guides ----------------------------------------------------------

function renderIndex(books, { coverFor } = {}) {
  const groups = new Map();
  for (const book of books.slice().sort((a, b) => shortTitle(a).localeCompare(shortTitle(b)))) {
    const period = book.period || 'Other';
    if (!groups.has(period)) groups.set(period, []);
    groups.get(period).push(book);
  }
  const ORDER = ['Shakespeare', 'Ancient & Epic', 'Renaissance & Early Modern', 'Restoration & Enlightenment', 'Romantic & Regency', 'Victorian', 'American Classics', 'Modern Classics', 'Russian'];
  const periods = [...groups.keys()].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b));
  const card = book => {
    const cover = coverFor ? coverFor(book) : '';
    return '<li><a class="sg-index-book" href="' + guideHref(book.slug) + '">' +
      (cover ? '<img src="' + escapeHtml(cover) + '" alt="" width="72" height="108" loading="lazy" decoding="async">' : '<span class="sg-index-blank" aria-hidden="true"></span>') +
      '<span><b>' + escapeHtml(shortTitle(book)) + '</b><small>' + escapeHtml(book.author || '') + '</small></span></a></li>';
  };
  const sections = periods.map(period =>
    '<section class="sg-index-group" aria-labelledby="sg-p-' + escapeHtml(period.toLowerCase().replace(/[^a-z]+/g, '-')) + '">' +
    '<h2 id="sg-p-' + escapeHtml(period.toLowerCase().replace(/[^a-z]+/g, '-')) + '">' + escapeHtml(period) + '</h2>' +
    '<ul class="sg-index-grid">' + groups.get(period).map(card).join('') + '</ul></section>').join('\n  ');
  return '<!doctype html>\n<html lang="en-GB">\n<head>\n' +
    '  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <title>Free study guides | Astor Library</title>\n' +
    '  <meta name="description" content="Free study guides to ' + books.length + ' classic books: what happens, the characters, themes, key quotations, form and language, context and essay questions, with revision quizzes for each.">\n' +
    '  <link rel="stylesheet" href="/assets/styles.css">\n  <link rel="stylesheet" href="/assets/astor-study.css">\n' +
    '</head>\n<body>\n' +
    SOURCE_HEADER +
    '<main id="main-content" class="page-wrap sg-index">\n' +
    '  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">Study guides</span></nav>\n' +
    '  <header class="sg-index-head"><p class="kicker">Study guides</p><h1>Study a book, free.</h1>' +
    '<p>A guide to each of ' + books.length + ' books: what happens, the characters, themes, key quotations, form and language, context and essay questions. Every guide links to quizzes and flashcards for practising what you have read.</p></header>\n' +
    '  ' + sections + '\n' +
    '  <nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a><a href="/play/">Revise</a><a href="/library/">All books</a><a href="/explore/">Search the library</a></nav>\n' +
    '</main>\n' +
    SOURCE_FOOTER +
    '</body>\n</html>\n';
}

// --- on the book page -------------------------------------------------------------

// What Revise offers for a book, in words, from its shelf entry.
function reviseWords(shelf) {
  if (!shelf) return 'Quizzes and flashcards';
  const offers = [];
  if ((shelf.quizzes || []).length) offers.push(plural(shelf.quizzes.length + 1, 'quiz', 'quizzes'));
  if (shelf.quotations >= 5) offers.push('flashcards');
  if (shelf.essays > 0) offers.push('an essay planner');
  if (shelf.views >= 2 && shelf.quotations >= 6) offers.push('a critical debate');
  if (!offers.length) return 'Quizzes and flashcards';
  const list = offers.length > 1 ? offers.slice(0, -1).join(', ') + ' and ' + offers[offers.length - 1] : offers[0];
  return list.replace(/^./, character => character.toUpperCase());
}

// The invitation on an edition's page (and a study edition's) to study the
// book free: two plain links, to the guide and to Revise, under one heading.
function renderStudyInvite(book, { shelf, editionHref } = {}) {
  const title = shortTitle(book);
  const slug = escapeHtml(book.slug);
  const guideNote = sectionsFor(book).map(section => {
    if (section.id === 'quotations') return book.quotations.length + ' key quotations';
    if (section.id === 'characters') return 'the characters';
    if (section.id === 'plot') return 'what happens';
    return section.name.toLowerCase();
  }).join(', ').replace(/, ([^,]*)$/, ' and $1');
  return '<section class="book-study" data-astor-study-invite data-astor-book="' + slug + '" data-astor-book-title="' + escapeHtml(book.title) + '" data-astor-book-href="' + escapeHtml(editionHref || book.href) + '" aria-labelledby="book-study-title">' +
    '<h2 id="book-study-title">Study ' + escapeHtml(title) + '</h2>' +
    '<ul class="book-study-ways">' +
    '<li><a href="' + guideHref(book.slug) + '">The study guide</a> ' + escapeHtml(guideNote.replace(/^./, character => character.toUpperCase())) + '.</li>' +
    '<li><a href="/play/?book=' + slug + '">Revise</a> ' + escapeHtml(reviseWords(shelf)) + ', all on ' + escapeHtml(title) + '.</li>' +
    '</ul>' +
    '<p class="book-study-note">Both are free, with nothing to sign up for. <button class="gd-text-button" type="button" data-astor-save aria-pressed="false">Save to my library</button></p>' +
    '</section>';
}

// A book page's old addresses (#astor-characters, #astor-quote-…) now live in
// the guide. The server never sees a fragment, so this small script, run
// before the page draws, sends such a link on to the same place in the guide.
function forwardingScript(slug) {
  const items = Object.fromEntries(Object.entries(OLD_ITEMS).map(([prefix, section]) => [prefix, section + '/']));
  return '<script data-guide-forward>(function(g,s,p){function f(){var h=location.hash.slice(1);' +
    'try{h=decodeURIComponent(h)}catch(e){}if(h.indexOf("astor-")!==0)return;var t=null;if(Object.prototype.hasOwnProperty.call(s,h))t=g+s[h];' +
    'else for(var k in p)if(h.indexOf(k)===0){t=g+p[k]+"#"+encodeURIComponent(h);break}if(t)location.replace(t)}' +
    'f();addEventListener("hashchange",f)})(' + JSON.stringify(guideHref(slug)) + ',' + JSON.stringify(OLD_PANELS) + ',' + JSON.stringify(items) + ')</script>';
}

// The address in the guide for an old fragment on a book page, or null.
function guideTargetFor(slug, fragment) {
  let id = String(fragment || '').replace(/^#/, '');
  try { id = decodeURIComponent(id); } catch { /* keep it as written */ }
  if (Object.hasOwn(OLD_PANELS, id)) return guideHref(slug) + OLD_PANELS[id];
  for (const [prefix, section] of Object.entries(OLD_ITEMS)) {
    if (id.startsWith(prefix)) return guideHref(slug, section) + '#' + id;
  }
  return null;
}

module.exports = {
  SECTIONS, OLD_PANELS, OLD_ITEMS, guideHref, sectionsFor, shortTitle, pageTitle, pageDescription,
  renderStub, renderGuideMain, renderIndex, guideTargetFor, renderStudyInvite, forwardingScript,
  formatYear, readingTimeLabel
};

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

function contentsNav(book, current, bookInfo) {
  const cover = bookInfo?.image
    ? '<img src="' + escapeHtml(bookInfo.image) + '" alt="" width="60" height="90" loading="lazy" decoding="async">'
    : '';
  // Every page of a guide carries the two ways on: revise the book, or read
  // it in the printed edition.
  const edition = '<div class="guide-toc-edition">' +
    '<a class="guide-toc-book" href="' + escapeHtml(book.href) + '#buy">' + cover + '<span><b>The Astor edition</b><small>The complete text in print, annotated</small></span></a>' +
    '<a class="guide-toc-revise" href="/play/?book=' + escapeHtml(book.slug) + '">Revise ' + escapeHtml(shortTitle(book)) + '</a>' +
    '</div>';
  const items = SECTIONS.map((section, index) => {
    const here = section.slug === current;
    return '<li><a href="' + guideHref(book.slug, section.slug) + '"' + (here ? ' aria-current="page"' : '') + '>' +
      '<span class="guide-toc-number">' + (index + 1) + '</span>' + escapeHtml(section.title) + '</a></li>';
  }).join('');
  return '<nav class="guide-toc" aria-label="' + escapeHtml(shortTitle(book)) + ' study guide">' +
    '<p class="guide-toc-title"><a href="' + guideHref(book.slug) + '">' + escapeHtml(shortTitle(book)) + '</a></p>' +
    '<ol>' + items + '</ol>' + edition + '</nav>';
}

// Verse quotations mark their line ends with " / "; in a play or a poem the
// guide sets them as lines.
function quoteText(book, text) {
  const escaped = escapeHtml(text);
  return ['play', 'poem'].includes(book.form) ? escaped.replace(/ \/ /g, '<br>') : escaped;
}

// One quotation, set the same way wherever the guide prints it in full: where
// it comes from, the words, the moment, then the analysis under its own label.
// The three are styled apart so that a reader scanning for "5.1" or for a
// line they half remember finds it without reading the notes.
function referenceParts(quotation) {
  return {
    place: quotation.reference || '',
    speaker: quotation.speaker || ''
  };
}

function referenceText(quotation) {
  return [quotation.speaker, quotation.reference].filter(Boolean).join(', ');
}

function quoteBlock(book, quotation, { explain = true, id = true } = {}) {
  const { place, speaker } = referenceParts(quotation);
  const themeLinks = (quotation.themes || [])
    .map(themeId => book.themes.find(theme => theme.id === themeId))
    .filter(Boolean)
    .map(theme => '<a href="' + guideHref(book.slug, 'themes') + '#astor-theme-' + escapeHtml(theme.id) + '">' + escapeHtml(theme.name) + '</a>');
  const moment = quotation.context ? '<p class="guide-quote-moment">' + escapeHtml(quotation.context) + '</p>' : '';
  const analysis = explain && quotation.analysis
    ? '<div class="guide-quote-note"><p class="guide-label">Analysis</p><p>' + escapeHtml(quotation.analysis) + '</p></div>'
    : '';
  const tags = themeLinks.length ? '<p class="guide-quote-tags"><span class="guide-label">Themes</span> ' + themeLinks.join('<span aria-hidden="true"> · </span>') + '</p>' : '';
  return '<figure class="guide-quote"' + (id ? ' id="astor-quote-' + escapeHtml(quotation.id) + '" data-quote-id="' + escapeHtml(quotation.id) + '"' : '') +
    ' data-reference="' + escapeHtml(referenceText(quotation)) + '" data-themes="' + escapeHtml((quotation.themes || []).join(' ')) + '">' +
    '<figcaption class="guide-quote-ref"><span class="guide-ref-place">' + escapeHtml(place) + '</span>' +
    (speaker ? '<span class="guide-ref-speaker">' + escapeHtml(speaker) + '</span>' : '') + '</figcaption>' +
    '<div class="guide-quote-main"><blockquote><p>' + quoteText(book, quotation.text) + '</p></blockquote>' +
    moment + analysis + tags + '</div>' +
    '</figure>';
}

// A quotation given as evidence on another page links to its full entry.
function shortQuote(book, quotation) {
  const where = referenceText(quotation);
  return '<blockquote class="guide-example"><p>' + quoteText(book, quotation.text) + '</p><footer><a href="' + guideHref(book.slug, 'quotations') + '#astor-quote-' + escapeHtml(quotation.id) + '">' + escapeHtml(where) + '</a></footer></blockquote>';
}

// A line of links to the parts of the page: acts, themes, people, terms.
function jumpNav(items, label = 'On this page') {
  if (items.length < 2) return '';
  return '<nav class="guide-jump" aria-label="' + escapeHtml(label) + '"><p class="guide-label">' + escapeHtml(label) + '</p><ul>' +
    items.map(item => '<li><a href="#' + escapeHtml(item.id) + '">' + escapeHtml(item.label) + (item.count ? ' <span class="guide-jump-count">' + item.count + '</span>' : '') + '</a></li>').join('') +
    '</ul></nav>';
}

function idSlug(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// The address of each scene or chapter on What happens: the act's id, then
// the scene's reference (act-1-1-7 for Macbeth 1.7), numbered where two in
// one act would otherwise share an address. The search index uses the same
// addresses, so "Macbeth act 1 scene 7" goes to the scene.
function sceneAnchors(book) {
  const used = new Set(book.structure.map(stage => stage.id));
  const anchors = new Map();
  for (const stage of book.structure) {
    for (const scene of stage.scenes || []) {
      let id = stage.id + '-' + idSlug(scene.ref);
      for (let n = 2; used.has(id); n++) id = stage.id + '-' + idSlug(scene.ref) + '-' + n;
      used.add(id);
      anchors.set(scene, id);
    }
  }
  return anchors;
}

function whatHappens(book) {
  const anchors = sceneAnchors(book);
  const sceneId = (stage, scene) => anchors.get(scene);
  const stages = book.structure.map(stage => {
    const scenes = (stage.scenes || []).length
      ? '<dl class="guide-scenes">' + stage.scenes.map(scene =>
        '<div id="' + escapeHtml(sceneId(stage, scene)) + '"><dt>' + escapeHtml(scene.ref) + '</dt><dd>' + escapeHtml(scene.summary) + '</dd></div>').join('') + '</dl>'
      : '';
    const lines = book.quotations.filter(quotation => quotation.stage === stage.id).length;
    const more = lines
      ? '<p class="guide-more"><a href="' + guideHref(book.slug, 'quotations') + '#lines-' + escapeHtml(stage.id) + '">' + lines + (lines === 1 ? ' key line' : ' key lines') + ' from ' + escapeHtml(stage.label) + '</a></p>'
      : '';
    return '<section class="guide-stage" id="' + escapeHtml(stage.id) + '" data-stage="' + escapeHtml(stage.id) + '">' +
      '<h2>' + escapeHtml(stage.label) + (stage.title && stage.title !== stage.label ? ' <span class="guide-stage-title">' + escapeHtml(stage.title) + '</span>' : '') + '</h2>' +
      '<p>' + escapeHtml(stage.summary) + '</p>' + scenes + more +
      '</section>';
  }).join('');
  return jumpNav(book.structure.map(stage => ({ id: stage.id, label: stage.label }))) + stages;
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
  return jumpNav(book.characters.map(character => ({ id: 'astor-character-' + character.id, label: character.shortName || character.name })), 'People') + entries + map;
}

// What a theme's account says about where it shows: "the last stave", "Act
// V", "Chapter 36", "4.3". A quotation from one of those places is better
// evidence for that account than whichever line happens to come first.
function stagesNamed(book, text) {
  const named = new Set();
  const lower = text.toLowerCase();
  book.structure.forEach((stage, index) => {
    if (stage.label && lower.includes(stage.label.toLowerCase())) named.add(stage.id);
    const arabic = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
    const roman = (stage.label.match(/\b([IVX]+)$/) || [])[1];
    if (roman && new RegExp('\\b' + arabic[roman.toLowerCase()] + '\\.\\d').test(text)) named.add(stage.id);
    if (index === book.structure.length - 1 && /\b(last|final|closing) (act|stave|chapter|chapters|book|part|volume|section|scene|pages|paragraph)/.test(lower)) named.add(stage.id);
    if (index === 0 && /\b(first|opening) (act|stave|chapter|chapters|book|part|volume|section|scene|sentence|page|pages|paragraph)/.test(lower)) named.add(stage.id);
  });
  return named;
}

function placeNamed(quotation, text) {
  const reference = String(quotation.reference || '');
  const scene = (reference.match(/^(\d+\.\d+)\./) || [])[1];
  if (scene && new RegExp('(^|[^\\d.])' + scene.replace('.', '\\.') + '(?![\\d])').test(text)) return true;
  return /^(Chapter|Book|Part|Letter|Stave|Canto) /.test(reference) && new RegExp('\\b' + reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text);
}

// The lines printed under a theme. A record may choose them itself, each with
// a sentence saying what the line shows about the theme (`evidence`). Where it
// does not, the guide picks up to two lines no other theme has used, preferring
// the places the theme's own account points to and lines filed under this
// theme first, and prints each with its analysis.
function themeEvidence(book, theme, shown) {
  const byId = new Map(book.quotations.map(quotation => [quotation.id, quotation]));
  if (Array.isArray(theme.evidence) && theme.evidence.length) {
    return theme.evidence
      .map(entry => ({ quotation: byId.get(entry.quote), note: entry.note }))
      .filter(entry => entry.quotation);
  }
  const tagged = book.quotations.filter(quotation => (quotation.themes || []).includes(theme.id));
  const fresh = tagged.filter(quotation => !shown.has(quotation));
  if (!fresh.length) return tagged.slice(0, 1).map(quotation => ({ quotation, note: '' }));
  const account = theme.summary + ' ' + (theme.development || '');
  const named = stagesNamed(book, account);
  const order = new Map(book.quotations.map((quotation, index) => [quotation, index]));
  const score = quotation =>
    (placeNamed(quotation, account) ? 4 : 0) +
    (named.has(quotation.stage) ? 2 : 0) +
    ((quotation.themes || [])[0] === theme.id ? 2 : 0);
  const ranked = fresh.slice().sort((a, b) => score(b) - score(a) || order.get(a) - order.get(b));
  const first = ranked[0];
  const second = ranked.find(quotation => quotation !== first && quotation.stage !== first.stage) || ranked[1];
  return [first, second].filter(Boolean)
    .sort((a, b) => order.get(a) - order.get(b))
    .map(quotation => ({ quotation, note: '' }));
}

// A quotation that serves several themes is printed under one of them, so the
// page does not show the same lines twice. A theme whose quotations have all
// appeared above it still keeps one.
function themes(book) {
  const shown = new Set();
  // Lines a record has chosen for one theme are not offered to another.
  const byId = new Map(book.quotations.map(quotation => [quotation.id, quotation]));
  for (const theme of book.themes) for (const entry of theme.evidence || []) if (byId.has(entry.quote)) shown.add(byId.get(entry.quote));
  const stageWord = book.form === 'play' ? 'Through the play' : book.form === 'poem' ? 'Through the poem' : 'Through the book';
  const entries = book.themes.map(theme => {
    const tagged = book.quotations.filter(quotation => (quotation.themes || []).includes(theme.id));
    const evidence = themeEvidence(book, theme, shown);
    evidence.forEach(entry => shown.add(entry.quotation));
    const items = evidence.map(({ quotation, note }) =>
      '<div class="guide-evidence-item">' + shortQuote(book, quotation) +
      '<p class="guide-evidence-note">' + escapeHtml(note || quotation.analysis) + '</p></div>').join('');
    const more = tagged.length > evidence.length
      ? '<p class="guide-more"><a href="' + guideHref(book.slug, 'quotations') + '?theme=' + escapeHtml(theme.id) + '">All ' + tagged.length + ' key lines on this theme</a></p>'
      : '';
    return '<section class="guide-entry" id="astor-theme-' + escapeHtml(theme.id) + '">' +
      '<h2>' + escapeHtml(theme.name) + '</h2>' +
      '<p>' + escapeHtml(theme.summary) + '</p>' +
      (theme.development ? '<p class="guide-development"><span class="guide-label">' + stageWord + '</span> ' + escapeHtml(theme.development) + '</p>' : '') +
      (items ? '<div class="guide-evidence"><p class="guide-label">In the text</p>' + items + '</div>' : '') +
      more +
      '</section>';
  }).join('');
  return jumpNav(book.themes.map(theme => ({ id: 'astor-theme-' + theme.id, label: theme.name })), 'Themes') + entries;
}

// The first words of a line, for the index of lines.
function firstWords(text, limit = 9) {
  const words = String(text).replace(/ \/ /g, ' ').split(/\s+/);
  return words.length <= limit ? words.join(' ') : words.slice(0, limit).join(' ').replace(/[,;:—–-]+$/, '') + '…';
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
  const groupId = group => 'lines-' + (group.key || 'elsewhere');
  const themeNames = JSON.stringify(Object.fromEntries(book.themes.map(theme => [theme.id, theme.name])));
  // Typing in the box narrows the page to matching lines; it appears only
  // when the script that runs it has loaded.
  const find = '<div class="guide-find" data-guide-find data-themes="' + escapeHtml(themeNames) + '" hidden>' +
    '<label for="guide-find-input">Find a line</label>' +
    '<input id="guide-find-input" type="search" autocomplete="off" spellcheck="false" placeholder="A word, a speaker or a reference">' +
    '<p class="guide-find-status" data-guide-find-status role="status"></p></div>';
  const jump = single ? '' : jumpNav(groups.map(group => ({ id: groupId(group), label: group.label, count: group.items.length })));
  const index = '<details class="guide-line-index"><summary>All ' + book.quotations.length + ' lines in order</summary><ol>' +
    groups.flatMap(group => group.items).map(quotation =>
      '<li><a href="#astor-quote-' + escapeHtml(quotation.id) + '"><span class="guide-ref-place">' + escapeHtml(quotation.reference) + '</span>' +
      '<span class="guide-line-words">' + escapeHtml(firstWords(quotation.text)) + '</span></a></li>').join('') +
    '</ol></details>';
  return find + jump + index + groups.map(group =>
    '<section class="guide-quote-group" id="' + escapeHtml(groupId(group)) + '">' + (single ? '' : '<h2>' + escapeHtml(group.label) + '</h2>') +
    group.items.map(quotation => quoteBlock(book, quotation)).join('') + '</section>'
  ).join('');
}

function formAndLanguage(book) {
  if (!book.techniques.length) return '<p>There is no separate note on form and language for this book yet.</p>';
  const shown = new Set();
  const entries = book.techniques.map(technique => {
    const tagged = book.quotations.filter(quotation => (quotation.techniques || []).includes(technique.id));
    const example = tagged.find(quotation => !shown.has(quotation)) || tagged[0];
    if (example) shown.add(example);
    return '<section class="guide-entry" id="astor-technique-' + escapeHtml(technique.id) + '">' +
      '<h2>' + escapeHtml(technique.name) + '</h2>' +
      '<p class="guide-definition">' + escapeHtml(technique.definition) + '</p>' +
      '<p>' + escapeHtml(technique.inThisBook) + '</p>' +
      (example ? shortQuote(book, example) : '') +
      '</section>';
  }).join('');
  return jumpNav(book.techniques.map(technique => ({ id: 'astor-technique-' + technique.id, label: technique.name })), 'Terms') + entries;
}

// Titles of works inside a summary are marked *thus* and set in italics.
function withTitles(text) {
  return escapeHtml(text).replace(/\*([^*]+)\*/g, '<cite>$1</cite>');
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
        '<p class="guide-critic-work">' + (view.essay ? '“' + escapeHtml(view.essay.replace(/“/g, '‘').replace(/”/g, '’')) + '”, in ' : '') + '<cite>' + escapeHtml(view.work) + '</cite> (' + escapeHtml(view.year) + ')</p>' +
        '<p>' + withTitles(view.summary) + '</p></div>'
      ).join('') +
      '<p class="guide-small">The summaries are our own. Short quotations are from the works named or from the ' + (['play', 'poem'].includes(book.form) ? book.form : 'book') + '.</p>' +
      '</section>');
  }
  const jump = [];
  if (timeline.length) jump.push({ id: 'guide-dates-title', label: 'Dates' });
  if ((book.places || []).length) jump.push({ id: 'guide-places-title', label: 'Places' });
  if ((book.criticalViews || []).length) jump.push({ id: 'guide-criticism-title', label: 'Critics' });
  return jumpNav(jump) + parts.join('');
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
  return '<p class="guide-small guide-source">Quotations are from ' + escapeHtml(named) + (book.referenceStyle ? '. References give the ' + escapeHtml(book.referenceStyle) : '') + '.</p>';
}

// "Written 1843", but not "Written Drafted 1796–97": a record's note on when
// a book was written is sometimes a date and sometimes a phrase with its own
// verb, and each needs a different way in.
function writtenPhrase(written) {
  const text = String(written || '').trim();
  if (!text) return '';
  // Already has its verb: "Drafted…", "Begun…", "Composed…", "Planned…".
  if (/^(Drafted|Begun|Composed|Researched|Planned|Dictated|Revised|Finished|Started)\b/.test(text)) return text;
  // "Early 1590s", "Mid-1890s, largely at Woking".
  if (/^(Early|Mid|Late)[ -]/.test(text)) return 'Written in the ' + text.charAt(0).toLowerCase() + text.slice(1);
  // "Out of a canoe journey…", "Between 1893 and 1936…", "In the 1720s", "About 1905–1923", "Mostly between…".
  if (/^(Out of|Between|In the|About|Mostly|Probably|Over|During|After|Before|From)\b/.test(text)) return 'Written ' + text.charAt(0).toLowerCase() + text.slice(1);
  // A date: "1843", "c. 1606", "1846–47".
  if (/^(c\. ?)?\d/.test(text)) return 'Written ' + text;
  // Anything else is a note in its own words ("The Yellow Wall-Paper in two days…").
  return 'Written: ' + text;
}

function writtenLine(book) {
  const parts = [];
  const written = writtenPhrase(book.written);
  if (written) parts.push(written);
  if (book.firstPublished) parts.push((Number(book.firstPublished) < 1700 ? 'first printed ' : 'first published ') + formatYear(book.firstPublished));
  const line = parts.join('; ');
  return line ? '<p class="guide-dates-line">' + escapeHtml(line.replace(/^./, c => c.toUpperCase())) + '.</p>' : '';
}

// One line under each entry in a guide's contents, saying what this book's
// page holds: the acts, the people, the themes by name.
function listNames(names, limit = 3) {
  const few = names.slice(0, limit);
  return few.join(', ') + (names.length > limit ? ' and ' + (names.length - limit) + ' more' : '');
}

function numberWord(n) {
  return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] || String(n);
}

function stageNoun(book, count) {
  const label = (book.structure[0]?.label || '').split(/\s+/)[0].toLowerCase();
  const known = { act: 'acts', stave: 'staves', chapter: 'parts', chapters: 'parts', book: 'books', books: 'parts', part: 'parts', volume: 'volumes', letter: 'parts', letters: 'parts', canto: 'cantos', phase: 'phases' };
  const plural = known[label] || 'parts';
  return count === 1 ? plural.replace(/s$/, '') : plural;
}

const CONTENTS_NOTE = {
  'what-happens': book => {
    const count = book.structure.length;
    const scenes = book.structure.reduce((sum, stage) => sum + (stage.scenes || []).length, 0);
    const words = numberWord(count) + ' ' + stageNoun(book, count);
    return words.charAt(0).toUpperCase() + words.slice(1) + (scenes ? (book.form === 'play' ? ', scene by scene' : ', step by step') : '');
  },
  characters: book => listNames(book.characters.map(character => character.shortName || character.name)),
  themes: book => listNames(book.themes.map(theme => theme.name), 2),
  quotations: book => book.quotations.length + ' lines, each with its reference and analysis',
  'form-and-language': book => (book.techniques.length ? listNames(book.techniques.map(technique => technique.name), 2) : ''),
  context: book => {
    const parts = [];
    if ((book.timeline || []).length) parts.push('dates');
    if ((book.places || []).length) parts.push('places');
    if ((book.criticalViews || []).length) parts.push(numberWord(book.criticalViews.length) + (book.criticalViews.length === 1 ? ' critic' : ' critics'));
    const line = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts.join('');
    return line.charAt(0).toUpperCase() + line.slice(1);
  }
};

function guideIndex(book, bookInfo) {
  const cover = bookInfo?.image
    ? '<a class="guide-cover" href="' + escapeHtml(book.href) + '"><img src="' + escapeHtml(bookInfo.image) + '" alt="' + escapeHtml(shortTitle(book)) + ', Astor Library edition" width="360" height="540"></a>'
    : '';
  const contents = '<ol class="guide-contents">' + SECTIONS.map((section, index) => {
    const note = CONTENTS_NOTE[section.slug](book);
    return '<li><a href="' + guideHref(book.slug, section.slug) + '"><span class="guide-toc-number">' + (index + 1) + '</span>' +
      '<span class="guide-contents-name">' + escapeHtml(section.title) + (note ? '<small>' + escapeHtml(note) + '</small>' : '') + '</span></a></li>';
  }).join('') + '</ol>';
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
  <p class="guide-links"><a class="guide-link-main" href="/play/?book=${escapeHtml(book.slug)}">Revise ${escapeHtml(shortTitle(book))}</a><a href="${escapeHtml(book.href)}#buy">The Astor edition in print</a><button class="guide-save" type="button" data-guide-save hidden>Save to My library</button></p>
  ${sourceNote(book)}
</main>`;
  return shell({
    title: shortTitle(book) + ' Study Guide | Astor Library',
    description: 'A free study guide to ' + shortTitle(book) + ' by ' + book.author + ': what happens, the characters, themes, key quotations, form and language, and context.',
    body,
    bookSlug: book.slug
  });
}

function guideSection(book, section, index, bookInfo) {
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
    ${contentsNav(book, section.slug, bookInfo)}
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
    // Under the Shakespeare heading his name would repeat on every line.
    const byline = book => name === 'Shakespeare' && book.author === 'William Shakespeare' ? '' : '<span class="guides-author">' + escapeHtml(book.author) + '</span>';
    return '<section class="guides-group"><h2>' + escapeHtml(name) + '</h2><ul class="guides-list">' +
      entries.map(({ book }) => '<li><a href="' + guideHref(book.slug) + '"><span class="guides-title">' + escapeHtml(shortTitle(book)) + '</span>' + byline(book) + '</a></li>').join('') +
      '</ul></section>';
  }).join('');
  const body = `<main class="page-wrap guides-home">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">Study guides</span></nav>
  <header class="guides-intro">
    <h1>Study guides</h1>
    <p>Guides to <span data-astor-count="guides">${books.length}</span> books in the Astor catalogue, free to read here with no account. Each one covers what happens, the characters, the themes, key quotations, form and language, and the book’s historical context. Every quotation has been checked against a named text of the book.</p>
    <p class="guides-kinds">Two other things on the site have “guide” or “study” in their names. The <a href="/study/">Study Editions</a> are printed books. The <a href="/resources/">slide guides</a> are illustrated slides, which ask for a free account after their first three.</p>
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
    SECTIONS.forEach((section, index) => write(book.slug + '/' + section.slug, guideSection(book, section, index, info)));
  }
  return books.length;
}

if (require.main === module) {
  console.log('Built ' + rebuildGuides() + ' study guides.');
}

module.exports = { SECTIONS, guideHref, rebuildGuides, sceneAnchors };

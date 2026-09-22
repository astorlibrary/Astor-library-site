// Builds an on-site study page for every title that has both an Astor study
// edition and a structured record in data/books.
//
// The six pilot pages (Hamlet, Othello, Romeo and Juliet, A Christmas Carol,
// Jekyll and Hyde, Frankenstein, and the Henry V skeleton they were built
// from) stay hand-written. These pages carry the same furniture — the edition,
// the facts, where to go next — and let the study toolkit that build-static.js
// injects carry the act-by-act work, the characters, the checked quotations,
// the language, the context and the essay plans.
//
// Because the toolkit is generated from the same record as the book page, a
// correction to one quotation reaches the book page, the study page, the
// explorers and nine games in the same build.

const fs = require('fs');
const { accentFor, motifSvg, motifName } = require('./book-motifs');
const path = require('path');
const { loadBooks } = require('./book-data');
const additions = require('./study-additions');
const { readingTimeLabel, DIFFICULTY_WORDS } = require('./study-toolkit');

const root = process.cwd();

// Pages written by hand, which this script must never overwrite.
const HAND_WRITTEN = new Set([
  '/study/hamlet/', '/study/othello/', '/study/romeo-and-juliet/',
  '/study/a-christmas-carol/', '/study/jekyll-and-hyde/', '/study/frankenstein/',
  '/study/henry-v/', '/study/macbeth/', '/study/the-merchant-of-venice/',
  '/study/the-taming-of-the-shrew/', '/study/rime-of-the-ancient-mariner/'
]);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeEntities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', nbsp: ' ', hellip: '…', mdash: '—', ndash: '–' };
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => named[name] ?? match);
}

// Titles are compared loosely: the catalogue says "Moby-Dick" where a record
// says "Moby Dick", and "The Picture of Dorian Gray" where a slug says
// dorian-gray.
function titleKey(value) {
  return decodeEntities(String(value))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^the/, '');
}

function studyEditions() {
  const html = fs.readFileSync(path.join(root, 'study', 'index.html'), 'utf8');
  const editions = new Map();
  for (const match of html.matchAll(/<a class="study-card[^"]*" href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g)) {
    const inner = match[3];
    const title = (inner.match(/<h3><em>([\s\S]*?)<\/em><\/h3>/) || [])[1];
    if (!title) continue;
    const buyUrl = match[1].startsWith('http')
      ? match[1]
      : (match[2].match(/data-buy-url="([^"]+)"/) || [])[1] || '';
    editions.set(titleKey(title), {
      title: decodeEntities(title),
      buyUrl,
      pageHref: match[1].startsWith('/study/') ? match[1] : '',
      image: (inner.match(/<img src="([^"]+)"/) || [])[1] || '',
      description: decodeEntities((inner.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || '').replace(/<[^>]+>/g, '')
    });
  }
  for (const edition of additions) {
    const key = titleKey(edition.title);
    if (editions.has(key)) continue;
    editions.set(key, {
      title: edition.title,
      buyUrl: edition.url,
      pageHref: '',
      image: '/' + encodeURIComponent(edition.image).replace(/'/g, '%27'),
      description: edition.description
    });
  }
  return editions;
}

// Which titles get a generated page, and where each one lives. Both
// rebuild-study-additions.js and rebuild-discovery.js read this so that a card
// and its discovery entry follow the page automatically.
function generatedStudyPages() {
  const editions = studyEditions();
  const pages = {};
  for (const book of loadBooks()) {
    const edition = editions.get(titleKey(book.title));
    if (!edition || !edition.buyUrl) continue;
    const href = '/study/' + book.slug + '/';
    if (HAND_WRITTEN.has(href) || HAND_WRITTEN.has(edition.pageHref)) continue;
    if (edition.pageHref && edition.pageHref !== href) continue;
    pages[edition.buyUrl] = href;
  }
  return pages;
}

const HEADER = `<header class="site-header">
  <a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt="Astor Library torch"><span class="word">LIBRARY</span></a>
  <nav class="nav" aria-label="Primary navigation"><a class="nav-link" href="/library/">Books</a><a class="nav-link" href="/study/" aria-current="page">Study editions</a><a class="nav-link" href="/resources/">Free resources</a><a class="nav-link" href="/play/">Play &amp; revise</a></nav>
</header>`;

// One panel that is not on every page. Which one a book gets depends on what
// its record actually holds and on the title itself, so two study pages
// opened side by side are not the same page with different words in it.
function openingPanel(book) {
  if (!book.openingLine) return null;
  return {
    kind: 'It opens',
    html: '<blockquote class="astor-feature-line">' + escapeHtml(book.openingLine) + '</blockquote>' +
      '<p class="astor-feature-note">The first sentence of ' + escapeHtml(book.title) + '.</p>'
  };
}

function placesPanel(book) {
  const places = (book.places || []).slice(0, 5);
  if (places.length < 4) return null;
  return {
    kind: 'Where it happens',
    html: '<ul class="astor-feature-list">' + places.map(place =>
      '<li><b>' + escapeHtml(place.name) + '</b>' + (place.note ? ' ' + escapeHtml(place.note) : '') + '</li>').join('') +
      '</ul><p class="astor-feature-note"><a href="/explore/map/?book=' + escapeHtml(book.slug) + '">See these on the map</a></p>'
  };
}

function castPanel(book) {
  const cast = (book.characters || []).slice(0, 5);
  if (cast.length < 4) return null;
  return {
    kind: 'Who to watch',
    html: '<ul class="astor-feature-list">' + cast.map(character =>
      '<li><b>' + escapeHtml(character.name) + '</b> ' + escapeHtml(character.role || '') + '</li>').join('') +
      '</ul><p class="astor-feature-note"><a href="/explore/characters/?book=' + escapeHtml(book.slug) + '">See how they connect</a></p>'
  };
}

function yearPanel(book) {
  const events = (book.timeline || []).filter(entry => entry.year).slice(0, 4);
  if (events.length < 3) return null;
  return {
    kind: 'The years around it',
    html: '<ul class="astor-feature-years">' + events.map(entry =>
      '<li><b>' + escapeHtml(String(entry.year)) + '</b> ' + escapeHtml(entry.label) + '</li>').join('') +
      '</ul><p class="astor-feature-note"><a href="/explore/timeline/">See it against the other books</a></p>'
  };
}

function featureBlock(book) {
  const panels = [openingPanel(book), castPanel(book), placesPanel(book), yearPanel(book)].filter(Boolean);
  if (!panels.length) return '';
  let hash = 0;
  for (const character of book.slug) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const panel = panels[hash % panels.length];
  return '<section class="astor-feature" aria-label="' + escapeHtml(panel.kind) + '">' +
    '<p class="kicker">' + escapeHtml(panel.kind) + '</p>' + panel.html + '</section>';
}

function factCells(book) {
  const cells = (book.atAGlance || []).slice(0, 4).map(fact =>
    '<div class="fact"><b>' + escapeHtml(fact.value) + '</b><span>' +
    escapeHtml(fact.note || fact.label) + '</span></div>');
  if (cells.length < 4 && book.readingTime) {
    cells.push('<div class="fact"><b>' + escapeHtml(readingTimeLabel(book.readingTime)) +
      '</b><span>An unhurried first reading, without notes.</span></div>');
  }
  if (cells.length < 4 && book.difficulty) {
    cells.push('<div class="fact"><b>' + escapeHtml(DIFFICULTY_WORDS[book.difficulty]) +
      '</b><span>How the text reads going in cold, rated ' + book.difficulty + ' out of 5.</span></div>');
  }
  return cells.join('');
}

function relatedCards(book, titleFor) {
  return (book.related || []).slice(0, 3).map(related =>
    '<article><span>Read next</span><h3><a href="' + escapeHtml(related.href) + '">' +
    escapeHtml(titleFor(related.href)) + '</a></h3><p>' + escapeHtml(related.why) + '</p></article>'
  ).join('');
}

function buildPage(book, edition, titleFor) {
  const stageWord = book.form === 'play' ? 'act by act' : 'section by section';
  const quotationCount = book.quotations.length;
  const description = book.summary.replace(/\s+/g, ' ').slice(0, 155).replace(/[,;:\s]+\S*$/, '') + '.';

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(book.title)} Study Edition | Astor Library</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
${HEADER}
<main id="main-content" class="page-wrap astor-book-record" style="--book-accent: ${accentFor(book.slug)}" data-motif="${motifName(book)}">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/study/">Study editions</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(book.title)}</span></nav>
  <section class="page-intro astor-book-hero">${motifSvg(book, 168, 'astor-motif-watermark')}
    <div><p class="kicker">${motifSvg(book, 22)}${escapeHtml(book.author)}</p><h1>${escapeHtml(book.title)}</h1><p class="deck">${escapeHtml(book.summary)}</p></div>
    <aside class="source-note astor-book-cover"><img src="${escapeHtml(edition.image)}" alt="${escapeHtml(book.title)} Astor Library Study Edition cover"><div><p><strong>Astor Study Edition</strong><br>${escapeHtml(edition.description)}</p><div class="button-row"><a class="button primary" href="${escapeHtml(edition.buyUrl)}">Buy / view the Astor Study Edition</a><a class="button secondary" href="${escapeHtml(book.href)}">Explore the main edition</a></div></div></aside>
  </section>

  <section class="quick-facts" aria-label="${escapeHtml(book.title)} facts">${factCells(book)}</section>

  ${featureBlock(book)}

  <section class="section-title astor-marked" id="edition"><p class="kicker">Edition contents</p><h2>What the study edition contains.</h2><p>The complete text, with a summary for every scene or chapter, notes on the same page, essays on the context, the characters and themes set out, passage work and essay questions.</p></section>
  <section class="timeline"><article class="edition-card new-edition"><img src="${escapeHtml(edition.image)}" alt="${escapeHtml(book.title)} Study Edition cover"><div><p class="year">Astor Study Edition</p><h2><em>${escapeHtml(book.title)}</em>, ${escapeHtml(book.author)}</h2><p>${escapeHtml(book.summary)}</p><p>Everything below this card is worked out on the page rather than kept for the book: the plot ${escapeHtml(stageWord)}, the characters and how they are connected, the themes with the evidence attached, ${quotationCount} quotations checked against ${escapeHtml(book.sourceText.label)}, the language, the context and four essay questions with a route through each.</p><div class="button-row"><a class="button primary" href="${escapeHtml(edition.buyUrl)}">Buy / view the Astor Study Edition</a></div></div></article></section>

  <section class="section-title astor-marked" id="sources"><p class="kicker">Go further</p><h2>Where the quotations come from.</h2><p>Every quotation on this page was located in ${escapeHtml(book.sourceText.label)} before it was published, and carries its ${escapeHtml(book.referenceStyle)}.${book.sourceText.note ? ' ' + escapeHtml(book.sourceText.note) : ''} The edition page for <em>${escapeHtml(book.title)}</em> holds the archives, theatre records and library catalogues behind its publication and performance history.</p></section>
  <section class="astor-context-grid">${relatedCards(book, titleFor)}</section>

  <nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a><a href="${escapeHtml(book.href)}">${escapeHtml(book.title)}: the edition page</a><a href="/play/?book=${escapeHtml(book.slug)}">Revise ${escapeHtml(book.title)}</a><a href="/study/">All study editions</a><a href="/resources/">Free resources</a><a href="/explore/">Search the library <span aria-hidden="true">&rarr;</span></a></nav>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Classic books, study editions and free literature resources.</p></div><div class="footer-links"><a href="${escapeHtml(book.href)}">${escapeHtml(book.title)}</a><a href="/study/">Study editions</a><a href="/play/">Play &amp; revise</a><a href="/library/">Books</a></div></footer>
</body>
</html>
`;
}

function build() {
  const editions = studyEditions();
  const pages = generatedStudyPages();
  const discoveryFile = path.join(root, 'assets', 'content-index.json');
  const discovery = fs.existsSync(discoveryFile) ? JSON.parse(fs.readFileSync(discoveryFile, 'utf8')) : {};
  const titleFor = href => {
    for (const group of ['books', 'resources', 'studyEditions', 'passages']) {
      const found = (discovery[group] || []).find(item => item.href === href);
      if (found) return decodeEntities(String(found.title).replace(/<[^>]+>/g, ''));
    }
    return href.replace(/^\/[a-z-]+\//, '').replace(/\/$/, '').replace(/-/g, ' ')
      .replace(/(^|\s)\S/g, character => character.toUpperCase());
  };

  const written = [];
  for (const book of loadBooks()) {
    const href = '/study/' + book.slug + '/';
    if (!Object.values(pages).includes(href)) continue;
    const edition = editions.get(titleKey(book.title));
    if (!edition) continue;
    const directory = path.join(root, 'study', book.slug);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'index.html'), buildPage(book, edition, titleFor));
    written.push(book.slug);
  }
  return written;
}

module.exports = { generatedStudyPages, studyEditions, titleKey, build };

if (require.main === module) {
  const written = build();
  console.log('Generated ' + written.length + ' study pages from book records' +
    (written.length ? ': ' + written.join(', ') : '.'));
}

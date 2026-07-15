const fs = require('fs');
const path = require('path');

const root = process.cwd();
const collections = [
  ['ancient-epic/index.html', 'Ancient & Epic'],
  ['renaissance-early-modern/index.html', 'Renaissance & Early Modern'],
  ['shakespeare/index.html', 'Shakespeare'],
  ['restoration-enlightenment/index.html', 'Restoration & Enlightenment'],
  ['romantic-regency/index.html', 'Romantic & Regency'],
  ['victorian/index.html', 'Victorian'],
  ['american/index.html', 'American Classics'],
  ['modern/index.html', 'Modern Classics']
];

function decodeEntities(value) {
  const named = {
    Agrave: 'À', amp: '&', aacute: 'á', agrave: 'à', apos: "'", copy: '©', eacute: 'é', euml: 'ë',
    gt: '>', hellip: '…', laquo: '«', ldquo: '“', lsquo: '‘', lt: '<', mdash: '—', ndash: '–',
    nbsp: ' ', oacute: 'ó', ograve: 'ò', pound: '£', quot: '"', raquo: '»', rdquo: '”', rsquo: '’', ugrave: 'ù'
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name] || named[name.toLowerCase()] || entity);
}

function textOnly(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, '')).trim();
}

function rootPath(value) {
  if (value.startsWith('/')) return value;
  return `/${value.replace(/^\.\.\//, '')}`;
}

function firstSentence(value) {
  const match = value.match(/^([\s\S]*?[.!?])(?:\s|$)/);
  return match ? match[1] : value;
}

const books = new Map();

for (const [relative, collection] of collections) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  const cards = html.match(/<article class="edition-card">[\s\S]*?<\/article>/g) || [];

  for (const card of cards) {
    const hrefMatch = card.match(/<a class="button primary" href="([^"]+)">Open page<\/a>/);
    const imageMatch = card.match(/<img src="([^"]+)" alt="([^"]+)">/);

    if (!hrefMatch || !imageMatch) {
      throw new Error(`Could not read a catalogue card in ${relative}`);
    }

    const href = rootPath(hrefMatch[1]);
    if (books.has(href)) {
      throw new Error(href + ' appears in both ' + books.get(href).collection + ' and ' + collection);
    }
    const bookFile = path.join(root, href.replace(/^\//, ''), 'index.html');
    const bookHtml = fs.readFileSync(bookFile, 'utf8');
    const titleMatch = bookHtml.match(/<h1>([\s\S]*?)<\/h1>/);
    const authorMatch = bookHtml.match(/<p class="kicker">([\s\S]*?)<\/p>/);
    const deckMatch = bookHtml.match(/<p class="deck">([\s\S]*?)<\/p>/);

    if (!titleMatch || !authorMatch || !deckMatch) {
      throw new Error(`Could not read the title, author or introduction in ${bookFile}`);
    }

    const titleHtml = titleMatch[1].replace(/\.$/, '');

    books.set(href, {
      href,
      collection,
      titleHtml,
      titleText: textOnly(titleHtml),
      authorHtml: authorMatch[1],
      descriptionHtml: firstSentence(deckMatch[1]),
      image: rootPath(imageMatch[1]),
      imageAlt: imageMatch[2]
    });
  }
}

const uncatalogued = fs.readdirSync(path.join(root, 'books'), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(root, 'books', entry.name, 'index.html')))
  .map(entry => '/books/' + entry.name + '/')
  .filter(href => !books.has(href));

if (uncatalogued.length) {
  throw new Error('Book pages missing from a collection: ' + uncatalogued.join(', '));
}

const sorted = [...books.values()].sort((a, b) => a.titleText.localeCompare(b.titleText, 'en', { sensitivity: 'base' }));
if (!sorted.length) throw new Error('No catalogue books were found');

const filterButtons = ['All books', ...collections.map(([, label]) => label)]
  .map((label, index) => `<button type="button" class="catalog-filter${index === 0 ? ' is-active' : ''}" data-filter="${index === 0 ? 'all' : label}" aria-pressed="${index === 0 ? 'true' : 'false'}">${label}</button>`)
  .join('');

const cards = sorted.map(book => `
      <article class="catalog-card" data-collection="${book.collection}">
        <a class="catalog-cover" href="${book.href}"><img src="${book.image}" alt="${book.imageAlt}" loading="lazy"></a>
        <div class="catalog-card-copy"><p class="catalog-collection">${book.collection}</p><h2><a href="${book.href}">${book.titleHtml}</a></h2><p class="catalog-author">${book.authorHtml}</p><p>${book.descriptionHtml}</p><a class="home-text-link" href="${book.href}">Explore the book <span aria-hidden="true">&rarr;</span></a></div>
      </article>`).join('');

const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>All Books | Astor Library</title><meta name="description" content="Browse every Astor Library book across classical, Shakespearean, Renaissance, Restoration, Romantic, Victorian, American and modern literature."><link rel="stylesheet" href="/assets/styles.css"><script src="/assets/catalogue.js" defer></script></head>
<body>
<header class="site-header">
  <a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt="Astor Library torch"><span class="word">LIBRARY</span></a>
  <nav class="nav" aria-label="Primary navigation">
    <a class="nav-link" href="/">Home</a><a class="nav-link" href="/explore/">Explore</a><a class="nav-link" href="/subjects/">Subjects</a><a class="nav-link" href="/authors/">Writers</a><a class="nav-link" href="/library/">All books</a>
    <details class="browse-menu"><summary>Browse collections</summary><div class="browse-panel">
      <a class="browse-card" href="/ancient-epic/" style="--browse-image:url('/Ancient%20and%20Epic.png')"><span>Ancient &amp; Epic</span></a><a class="browse-card" href="/renaissance-early-modern/" style="--browse-image:url('/Renaissance%20and%20Early%20Modern.png')"><span>Renaissance &amp; Early Modern</span></a><a class="browse-card" href="/shakespeare/" style="--browse-image:url('/Shakespeare.png')"><span>Shakespeare</span></a><a class="browse-card" href="/restoration-enlightenment/" style="--browse-image:url('/Restoration%20and%20Enlightenment.png')"><span>Restoration &amp; Enlightenment</span></a><a class="browse-card" href="/romantic-regency/" style="--browse-image:url('/Romantic%20and%20Regency.png')"><span>Romantic &amp; Regency</span></a><a class="browse-card" href="/victorian/" style="--browse-image:url('/Victorian.png')"><span>Victorian</span></a><a class="browse-card" href="/american/" style="--browse-image:url('/American%20Classics.png')"><span>American Classics</span></a><a class="browse-card" href="/modern/" style="--browse-image:url('/Modern%20Classics.png')"><span>Modern Classics</span></a><a class="browse-card" href="/study/" style="--browse-image:url('/Study%20Resources.png')"><span>Study Editions</span></a>
    </div></details>
    <a class="nav-link" href="/study/">Study editions</a><a class="nav-link" href="/resources/">Free resources</a>
  </nav>
</header>
<main class="page-wrap catalog-page">
  <section class="catalog-hero"><div><p class="kicker">The complete catalogue</p><h1>Find your next classic.</h1><p class="deck">${sorted.length} books across eight collections, from ancient epic and Shakespeare to Victorian, American and modern classics.</p></div><div class="catalog-hero-covers" aria-hidden="true"><img src="/The%20Aeneid.png" alt=""><img src="/Pride%20and%20Prejudice.png" alt=""><img src="/Moby%20Dick.png" alt=""></div></section>
  <section class="catalog-tools" aria-label="Filter the catalogue"><label for="catalog-search">Search by title, author or subject</label><div class="catalog-search-row"><input id="catalog-search" type="search" autocomplete="off" placeholder="Try Hamlet, Dickens or Gothic"><p id="catalog-count" aria-live="polite">${sorted.length} books</p></div><div class="catalog-filters">${filterButtons}</div></section>
  <section class="catalog-grid" aria-label="Astor Library books">${cards}
  </section>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Classic literature for readers, students and teachers.</p></div><div class="footer-links"><a href="/">Home</a><a href="/subjects/">Subjects</a><a href="/authors/">Writers</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></div></footer>
</body></html>`;

fs.writeFileSync(path.join(root, 'library/index.html'), html);
console.log(`Rebuilt the library with ${sorted.length} books.`);
require('./rebuild-subjects');
require('./rebuild-discovery');

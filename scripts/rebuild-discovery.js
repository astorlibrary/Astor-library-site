const fs = require('fs');
const path = require('path');

const root = process.cwd();

const collectionFiles = [
  { file: 'ancient-epic/index.html', name: 'Ancient & Epic', href: '/ancient-epic/', image: '/Ancient%20and%20Epic.png' },
  { file: 'renaissance-early-modern/index.html', name: 'Renaissance & Early Modern', href: '/renaissance-early-modern/', image: '/Renaissance%20and%20Early%20Modern.png' },
  { file: 'shakespeare/index.html', name: 'Shakespeare', href: '/shakespeare/', image: '/Shakespeare.png' },
  { file: 'restoration-enlightenment/index.html', name: 'Restoration & Enlightenment', href: '/restoration-enlightenment/', image: '/Restoration%20and%20Enlightenment.png' },
  { file: 'romantic-regency/index.html', name: 'Romantic & Regency', href: '/romantic-regency/', image: '/Romantic%20and%20Regency.png' },
  { file: 'victorian/index.html', name: 'Victorian', href: '/victorian/', image: '/Victorian.png' },
  { file: 'american/index.html', name: 'American Classics', href: '/american/', image: '/American%20Classics.png' },
  { file: 'modern/index.html', name: 'Modern Classics', href: '/modern/', image: '/Modern%20Classics.png' }
];

const studyBookLinks = {
  'https://mybook.to/OS3XKr': ['/books/a-christmas-carol/'],
  'https://mybook.to/tih5': ['/books/a-midsummer-nights-dream/'],
  'https://mybook.to/BMP2uu': ['/books/dorian-gray/'],
  'https://mybook.to/xGiajwx': ['/books/dracula/'],
  'https://mybook.to/uGEUdh': ['/books/frankenstein/'],
  'https://mybook.to/jAoMkeE': ['/books/great-expectations/'],
  'https://mybook.to/Q1lrp8': ['/books/hamlet/'],
  'https://mybook.to/ddk9RnO': ['/books/jekyll-and-hyde/'],
  'https://mybook.to/yIeXaP': ['/books/king-lear/'],
  'https://mybook.to/cntRBz': ['/books/macbeth/'],
  'https://mybook.to/dmYF3qO': ['/books/merry-wives-of-windsor/'],
  'https://mybook.to/VCYoiwF': ['/books/moby-dick/'],
  'https://mybook.to/8DvAj': ['/books/much-ado-about-nothing/'],
  'https://mybook.to/A8uO': ['/books/othello/'],
  'https://mybook.to/bqGB': ['/books/richard-iii/'],
  'https://mybook.to/wwhLC': ['/books/romeo-and-juliet/'],
  'https://mybook.to/FSRJnn': ['/books/tess-of-the-durbervilles/'],
  'https://mybook.to/pSaIay': ['/books/the-tempest/'],
  'https://mybook.to/FAHByQ': ['/books/macbeth/', '/books/jekyll-and-hyde/'],
  'https://mybook.to/iFtKs': ['/books/macbeth/', '/books/a-christmas-carol/'],
  'https://mybook.to/ABlyJH': ['/books/romeo-and-juliet/', '/books/jekyll-and-hyde/'],
  'https://mybook.to/2AqrIlR': ['/books/romeo-and-juliet/', '/books/a-christmas-carol/']
};

const resourceBookLinks = {
  '/resources/dracula/complete-overview/': ['/books/dracula/'],
  '/resources/dracula/gender-roles/': ['/books/dracula/'],
  '/resources/midsummer-nights-dream/study-guide/': ['/books/a-midsummer-nights-dream/'],
  '/resources/frankenstein/study-guide/': ['/books/frankenstein/'],
  '/resources/great-expectations/study-guide/': ['/books/great-expectations/'],
  '/resources/hamlet/sources-texts-contexts/': ['/books/hamlet/'],
  '/resources/hamlet/stage-physical-performance-audience/': ['/books/hamlet/'],
  '/resources/jekyll-and-hyde/analysing-quotations/': ['/books/jekyll-and-hyde/'],
  '/resources/king-lear/summary-guide/': ['/books/king-lear/'],
  '/resources/macbeth/summary-analysis/': ['/books/macbeth/'],
  '/resources/moby-dick/study-guide/': ['/books/moby-dick/'],
  '/resources/much-ado-about-nothing/passage-analysis/': ['/books/much-ado-about-nothing/'],
  '/resources/romeo-and-juliet/summary-guide/': ['/books/romeo-and-juliet/'],
  '/resources/shakespeare/tragedies-overview/': [
    '/books/hamlet/',
    '/books/king-lear/',
    '/books/macbeth/',
    '/books/othello/',
    '/books/romeo-and-juliet/',
    '/books/titus-andronicus/'
  ]
};

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function decodeEntities(value) {
  const named = {
    Agrave: 'À',
    amp: '&',
    aacute: 'á',
    agrave: 'à',
    apos: "'",
    copy: '©',
    eacute: 'é',
    euml: 'ë',
    gt: '>',
    hellip: '…',
    laquo: '«',
    ldquo: '“',
    lsquo: '‘',
    lt: '<',
    mdash: '—',
    ndash: '–',
    nbsp: ' ',
    oacute: 'ó',
    ograve: 'ò',
    pound: '£',
    quot: '"',
    raquo: '»',
    rdquo: '”',
    rsquo: '’',
    ugrave: 'ù'
  };

  return value
    .replace(/&#(\d+);/g, function (_, code) { return String.fromCodePoint(Number(code)); })
    .replace(/&#x([0-9a-f]+);/gi, function (_, code) { return String.fromCodePoint(parseInt(code, 16)); })
    .replace(/&([a-z]+);/gi, function (entity, name) { return named[name] || named[name.toLowerCase()] || entity; });
}

function textOnly(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\s+([:;,.!?])/g, '$1').trim());
}

function firstSentence(value) {
  const plain = textOnly(value);
  const match = plain.match(/^([\s\S]*?[.!?])(?:\s|$)/);
  return match ? match[1] : plain;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rootPath(value) {
  if (value.startsWith('/')) return value;
  return '/' + value.replace(/^\.\.\//, '');
}

function unique(values) {
  return Array.from(new Set(values));
}

function matchText(block, pattern, label) {
  const match = block.match(pattern);
  if (!match) throw new Error('Could not read ' + label);
  return match[1];
}

function siteHeader() {
  return '<header class="site-header">' +
    '<a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt="Astor Library torch"><span class="word">LIBRARY</span></a>' +
    '<nav class="nav" aria-label="Primary navigation">' +
    '<a class="nav-link" href="/">Home</a>' +
    '<a class="nav-link" href="/explore/">Explore</a>' +
    '<a class="nav-link" href="/library/">All books</a>' +
    '<details class="browse-menu"><summary>Browse collections</summary><div class="browse-panel">' +
    '<a class="browse-card" href="/ancient-epic/" style="--browse-image:url(\'/Ancient%20and%20Epic.png\')"><span>Ancient &amp; Epic</span></a>' +
    '<a class="browse-card" href="/renaissance-early-modern/" style="--browse-image:url(\'/Renaissance%20and%20Early%20Modern.png\')"><span>Renaissance &amp; Early Modern</span></a>' +
    '<a class="browse-card" href="/shakespeare/" style="--browse-image:url(\'/Shakespeare.png\')"><span>Shakespeare</span></a>' +
    '<a class="browse-card" href="/restoration-enlightenment/" style="--browse-image:url(\'/Restoration%20and%20Enlightenment.png\')"><span>Restoration &amp; Enlightenment</span></a>' +
    '<a class="browse-card" href="/romantic-regency/" style="--browse-image:url(\'/Romantic%20and%20Regency.png\')"><span>Romantic &amp; Regency</span></a>' +
    '<a class="browse-card" href="/victorian/" style="--browse-image:url(\'/Victorian.png\')"><span>Victorian</span></a>' +
    '<a class="browse-card" href="/american/" style="--browse-image:url(\'/American%20Classics.png\')"><span>American Classics</span></a>' +
    '<a class="browse-card" href="/modern/" style="--browse-image:url(\'/Modern%20Classics.png\')"><span>Modern Classics</span></a>' +
    '<a class="browse-card" href="/study/" style="--browse-image:url(\'/Study%20Resources.png\')"><span>Study Editions</span></a>' +
    '</div></details>' +
    '<a class="nav-link" href="/study/">Study editions</a>' +
    '<a class="nav-link" href="/resources/">Free resources</a>' +
    '</nav></header>';
}

const books = [];
const libraryHtml = read('library/index.html');
const bookPattern = /<article class="catalog-card" data-collection="([^"]+)">([\s\S]*?)<\/article>/g;

for (const match of libraryHtml.matchAll(bookPattern)) {
  const block = match[2];
  const titleMatch = block.match(/<h2><a href="([^"]+)">([\s\S]*?)<\/a><\/h2>/);
  const imageMatch = block.match(/<img src="([^"]+)" alt="([^"]*)"/);
  if (!titleMatch || !imageMatch) throw new Error('Could not read a book card');

  const authorHtml = matchText(block, /<p class="catalog-author">([\s\S]*?)<\/p>/, 'book author');
  const descriptionHtml = matchText(block, /<p>([\s\S]*?)<\/p><a class="home-text-link"/, 'book description');
  const title = textOnly(titleMatch[2]);
  const author = textOnly(authorHtml);
  const collection = textOnly(match[1]);
  const bookFile = path.join(root, rootPath(titleMatch[1]).replace(/^\//, ''), 'index.html');
  const bookHtml = fs.readFileSync(bookFile, 'utf8');
  const topics = unique(Array.from(bookHtml.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g), function (heading) {
    return textOnly(heading[1]);
  })).slice(0, 60);

  books.push({
    type: 'book',
    typeLabel: 'Book',
    title: title,
    author: author,
    collection: collection,
    description: textOnly(descriptionHtml),
    href: rootPath(titleMatch[1]),
    image: rootPath(imageMatch[1]),
    imageAlt: textOnly(imageMatch[2]),
    search: [title, author, collection, textOnly(descriptionHtml)].concat(topics).join(' ')
  });
}

const resources = [];
const resourcesHtml = read('resources/index.html');
const resourcePattern = /<a class="resource-card" href="([^"]+)">([\s\S]*?)<\/a>/g;

for (const match of resourcesHtml.matchAll(resourcePattern)) {
  const href = rootPath(match[1]);
  const block = match[2];
  const imageMatch = block.match(/<img class="resource-thumb" src="([^"]+)" alt="([^"]*)"/);
  const titleHtml = matchText(block, /<h3>([\s\S]*?)<\/h3>/, 'resource title');
  const descriptionHtml = matchText(block, /<p>([\s\S]*?)<\/p>/, 'resource description');
  const tags = Array.from(block.matchAll(/<span class="tag">([\s\S]*?)<\/span>/g), function (tag) { return textOnly(tag[1]); });
  let relatedBooks = resourceBookLinks[href] || [];
  const detailFile = path.join(root, href.replace(/^\//, ''), 'index.html');

  if (fs.existsSync(detailFile)) {
    const detailHtml = fs.readFileSync(detailFile, 'utf8');
    const discovered = Array.from(detailHtml.matchAll(/href="(\/books\/[^"]+\/)"/g), function (book) { return book[1]; });
    relatedBooks = unique(relatedBooks.concat(discovered));
    tags.push.apply(tags, Array.from(detailHtml.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g), function (heading) {
      return textOnly(heading[1]);
    }));
  }

  const title = textOnly(titleHtml);
  const description = textOnly(descriptionHtml);
  resources.push({
    type: 'resource',
    typeLabel: 'Free guide',
    title: title,
    description: description,
    tags: unique(tags),
    href: href,
    image: imageMatch ? rootPath(imageMatch[1]) : '',
    imageAlt: imageMatch ? textOnly(imageMatch[2]) : '',
    relatedBooks: relatedBooks,
    search: [title, description].concat(unique(tags)).join(' ')
  });
}

const studyEditions = [];
const studyHtml = read('study/index.html');
const studyPattern = /<a class="study-card( dual)?" href="([^"]+)">([\s\S]*?)<\/a>/g;

for (const match of studyHtml.matchAll(studyPattern)) {
  const paired = Boolean(match[1]);
  const href = match[2];
  const block = match[3];
  const imageMatch = block.match(/<img src="([^"]+)" alt="([^"]*)"/);
  const titleHtml = matchText(block, /<h3>([\s\S]*?)<\/h3>/, 'study edition title');
  const descriptionHtml = matchText(block, /<p>([\s\S]*?)<\/p>/, 'study edition description');
  const title = textOnly(titleHtml);
  const description = textOnly(descriptionHtml);

  studyEditions.push({
    type: 'study',
    typeLabel: paired ? 'Paired study edition' : 'Study edition',
    title: title,
    description: description,
    href: href,
    image: imageMatch ? rootPath(imageMatch[1]) : '',
    imageAlt: imageMatch ? textOnly(imageMatch[2]) : '',
    paired: paired,
    relatedBooks: studyBookLinks[href] || [],
    search: [title, description, paired ? 'paired two texts' : 'single text'].join(' ')
  });
}

const collections = collectionFiles.map(function (collection) {
  const html = read(collection.file);
  const deckHtml = matchText(html, /<p class="deck">([\s\S]*?)<\/p>/, collection.name + ' introduction');
  return {
    type: 'collection',
    typeLabel: 'Collection',
    title: collection.name,
    description: firstSentence(deckHtml),
    href: collection.href,
    image: collection.image,
    imageAlt: collection.name + ' illustrated banner',
    search: [collection.name, textOnly(deckHtml)].join(' ')
  };
});

if (!books.length || !resources.length || !studyEditions.length || !collections.length) {
  throw new Error('Discovery could not find all four kinds of content');
}

const entries = books.concat(resources, studyEditions, collections);
const index = {
  counts: {
    books: books.length,
    resources: resources.length,
    studyEditions: studyEditions.length,
    collections: collections.length,
    entries: entries.length
  },
  books: books,
  resources: resources,
  studyEditions: studyEditions,
  collections: collections
};

fs.writeFileSync(path.join(root, 'assets/content-index.json'), JSON.stringify(index, null, 2) + '\n');

const typeCtas = {
  book: 'Open the book',
  collection: 'Browse the collection',
  resource: 'Read the guide',
  study: 'View the edition'
};

const entryCards = entries.map(function (entry) {
  const detail = entry.author ? entry.author + ' · ' + entry.collection : entry.typeLabel;
  const search = [entry.search, entry.typeLabel].join(' ').toLocaleLowerCase();
  const image = entry.image
    ? '<img src="' + escapeHtml(entry.image) + '" alt="' + escapeHtml(entry.imageAlt || '') + '" loading="lazy">'
    : '<span class="explore-card-no-image" aria-hidden="true">A</span>';

  return '<article class="explore-card explore-card-' + entry.type + '" data-type="' + entry.type + '" data-search="' + escapeHtml(search) + '">' +
    '<a href="' + escapeHtml(entry.href) + '">' +
    '<div class="explore-card-image">' + image + '</div>' +
    '<div class="explore-card-copy">' +
    '<p class="explore-kind">' + escapeHtml(detail) + '</p>' +
    '<h2>' + escapeHtml(entry.title) + '</h2>' +
    '<p>' + escapeHtml(entry.description) + '</p>' +
    '<span class="home-text-link">' + typeCtas[entry.type] + ' <span aria-hidden="true">&rarr;</span></span>' +
    '</div></a></article>';
}).join('');

const exploreHtml = '<!doctype html><html lang="en"><head>' +
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>Explore Literature | Astor Library</title>' +
  '<meta name="description" content="Search Astor Library books, free literature guides, study editions and historical collections in one place.">' +
  '<link rel="stylesheet" href="/assets/styles.css"><script src="/assets/explore.js" defer></script>' +
  '</head><body>' + siteHeader() +
  '<main class="page-wrap explore-page">' +
  '<section class="explore-hero"><div><p class="kicker">Books, guides and editions</p><h1>Find your way in.</h1>' +
  '<p class="deck">Search ' + books.length + ' books, ' + resources.length + ' free guides and ' + studyEditions.length + ' study editions. You can begin with a title, an author, a period or simply an idea that interests you.</p></div>' +
  '<aside class="explore-hero-note"><p>The library is meant to be wandered through. Search when you know what you need, or follow a collection and see where it takes you.</p></aside></section>' +
  '<section class="explore-tools" aria-label="Search everything">' +
  '<label for="explore-search">What are you looking for?</label>' +
  '<div class="explore-search-row"><input id="explore-search" type="search" autocomplete="off" placeholder="Try Austen, tragedy, quotation or Gothic"><p id="explore-count" aria-live="polite">' + entries.length + ' results</p></div>' +
  '<div class="explore-filters">' +
  '<button type="button" class="explore-filter is-active" data-filter="all" aria-pressed="true">Everything</button>' +
  '<button type="button" class="explore-filter" data-filter="book" aria-pressed="false">Books</button>' +
  '<button type="button" class="explore-filter" data-filter="resource" aria-pressed="false">Free guides</button>' +
  '<button type="button" class="explore-filter" data-filter="study" aria-pressed="false">Study editions</button>' +
  '<button type="button" class="explore-filter" data-filter="collection" aria-pressed="false">Collections</button>' +
  '</div></section>' +
  '<section class="explore-paths" aria-label="Ways into Astor Library">' +
  '<a href="/library/"><span>Choose a book</span><p>Read its story, publication history and life on stage or screen.</p></a>' +
  '<a href="/study/"><span>Study a set text</span><p>Find an Astor edition with close-reading and essay support.</p></a>' +
  '<a href="/resources/"><span>Use a free guide</span><p>Open focused help with a text, passage, theme or question.</p></a>' +
  '</section>' +
  '<section class="explore-results" aria-label="Search results">' + entryCards + '</section>' +
  '<p class="explore-empty" id="explore-empty" hidden>Nothing quite matches that search yet. Try a title, author, period or broader word.</p>' +
  '</main>' +
  '<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Classic literature, carefully introduced and kept open to curious readers.</p></div>' +
  '<div class="footer-links"><a href="/about/">About</a><a href="/library/">All books</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></div></footer>' +
  '</body></html>';

fs.mkdirSync(path.join(root, 'explore'), { recursive: true });
fs.writeFileSync(path.join(root, 'explore/index.html'), exploreHtml);

console.log('Rebuilt discovery with ' + entries.length + ' searchable entries.');

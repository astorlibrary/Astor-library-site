const fs = require('fs');
const path = require('path');
const subjectData = require('./subject-data');

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
  '/resources/antony-and-cleopatra/themes-critical-contexts/': ['/books/antony-and-cleopatra/'],
  '/resources/dorian-gray/introduction/': ['/books/dorian-gray/'],
  '/resources/macbeth/quick-guide/': ['/books/macbeth/'],
  '/resources/pamela/psychological-analysis/': ['/books/pamela/'],
  '/resources/richard-ii/study-guide/': ['/books/richard-ii/'],
  '/resources/shakespeare/gender-power-omkara-maqbool/': ['/books/othello/', '/books/macbeth/'],
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

function slugify(value) {
  return String(value)
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
    '<a class="nav-link" href="/subjects/">Subjects</a>' +
    '<a class="nav-link" href="/authors/">Writers</a>' +
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

const authorProfiles = {
  'Arthur Conan Doyle': '/authors/arthur-conan-doyle/',
  'Charles Dickens': '/authors/charles-dickens/',
  'Frederick Douglass': '/authors/frederick-douglass/',
  'Jane Austen': '/authors/jane-austen/',
  'Mary Shelley': '/authors/mary-shelley/',
  'William Shakespeare': '/shakespeare/'
};

const authors = Array.from(books.reduce(function (groups, book) {
  if (!groups.has(book.author)) groups.set(book.author, []);
  groups.get(book.author).push(book);
  return groups;
}, new Map())).map(function (pair) {
  const name = pair[0];
  const authorBooks = pair[1].slice().sort(function (a, b) { return a.title.localeCompare(b.title, 'en'); });
  const slug = slugify(name);
  const titles = authorBooks.map(function (book) { return book.title; });
  const href = authorProfiles[name] || '/authors/#' + slug;
  const titleList = titles.length === 1
    ? titles[0]
    : titles.slice(0, -1).join(', ') + ' and ' + titles[titles.length - 1];
  const description = authorBooks.length === 1
    ? 'Read ' + name + ' through Astor Library\'s page for ' + titleList + '.'
    : 'Read ' + name + ' across ' + authorBooks.length + ' Astor Library books: ' + titleList + '.';

  authorBooks.forEach(function (book) { book.authorHref = href; });

  return {
    type: 'author',
    typeLabel: 'Writer',
    title: name,
    description: description,
    href: href,
    image: authorBooks[0].image,
    imageAlt: authorBooks[0].imageAlt,
    bookCount: authorBooks.length,
    books: authorBooks.map(function (book) {
      return { title: book.title, href: book.href, image: book.image, imageAlt: book.imageAlt, collection: book.collection };
    }),
    search: [name].concat(titles, authorBooks.map(function (book) { return book.collection; })).join(' ')
  };
}).sort(function (a, b) { return a.title.localeCompare(b.title, 'en'); });

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

const subjects = subjectData.map(function (subject) {
  const relatedBooks = subject.books.map(function (book) { return book.href; });
  const relatedResources = subject.resources
    .map(function (resource) { return resource.href; })
    .filter(function (href) { return href.startsWith('/resources/'); });
  return {
    type: 'subject',
    typeLabel: 'Subject guide',
    title: subject.title,
    description: subject.description,
    href: '/subjects/' + subject.slug + '/',
    image: subject.books[0].image,
    imageAlt: subject.title + ' books in Astor Library',
    bookCount: relatedBooks.length,
    relatedBooks: relatedBooks,
    relatedResources: relatedResources,
    search: [subject.title, subject.kicker, subject.description, subject.search]
      .concat(subject.terms.map(function (term) { return term.term + ' ' + term.copy; }))
      .join(' ')
  };
});

books.forEach(function (book) {
  book.subjects = subjects
    .filter(function (subject) { return subject.relatedBooks.includes(book.href); })
    .map(function (subject) { return { title: subject.title, href: subject.href }; });
});

if (!books.length || !authors.length || !resources.length || !studyEditions.length || !collections.length || !subjects.length) {
  throw new Error('Discovery could not find every kind of content');
}

const entries = subjects.concat(books, authors, resources, studyEditions, collections);
const index = {
  counts: {
    books: books.length,
    authors: authors.length,
    subjects: subjects.length,
    resources: resources.length,
    studyEditions: studyEditions.length,
    collections: collections.length,
    entries: entries.length
  },
  books: books,
  authors: authors,
  subjects: subjects,
  resources: resources,
  studyEditions: studyEditions,
  collections: collections
};

fs.writeFileSync(path.join(root, 'assets/content-index.json'), JSON.stringify(index, null, 2) + '\n');

const typeCtas = {
  author: 'Read the writer page',
  book: 'Open the book',
  collection: 'Browse the collection',
  resource: 'Read the guide',
  study: 'View the edition',
  subject: 'Open the subject guide'
};

const entryCards = entries.map(function (entry) {
  const detail = entry.author ? entry.author + ' · ' + entry.collection : entry.type === 'author' ? entry.bookCount + (entry.bookCount === 1 ? ' book' : ' books') : entry.typeLabel;
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
  '<meta name="description" content="Search Astor Library books, writers, subject guides, free literature resources, study editions and historical collections in one place.">' +
  '<link rel="stylesheet" href="/assets/styles.css"><style>.explore-paths{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:1050px){.explore-paths{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.explore-paths{grid-template-columns:1fr}}</style><script src="/assets/explore.js" defer></script>' +
  '</head><body>' + siteHeader() +
  '<main class="page-wrap explore-page">' +
  '<section class="explore-hero"><div><p class="kicker">Books, guides and editions</p><h1>Find your way in.</h1>' +
  '<p class="deck">Search ' + books.length + ' books, ' + subjects.length + ' subject guides, ' + authors.length + ' writers, ' + resources.length + ' free guides and ' + studyEditions.length + ' study editions. Begin with a title, a writer, a form or an idea that interests you.</p></div>' +
  '<aside class="explore-hero-note"><p>The library is meant to be wandered through. Search when you know what you need, or follow a collection and see where it takes you.</p></aside></section>' +
  '<section class="explore-tools" aria-label="Search everything">' +
  '<label for="explore-search">What are you looking for?</label>' +
  '<div class="explore-search-row"><input id="explore-search" type="search" autocomplete="off" placeholder="Try Austen, tragedy, quotation or Gothic"><p id="explore-count" aria-live="polite">' + entries.length + ' results</p></div>' +
  '<div class="explore-filters">' +
  '<button type="button" class="explore-filter is-active" data-filter="all" aria-pressed="true">Everything</button>' +
  '<button type="button" class="explore-filter" data-filter="book" aria-pressed="false">Books</button>' +
  '<button type="button" class="explore-filter" data-filter="subject" aria-pressed="false">Subjects</button>' +
  '<button type="button" class="explore-filter" data-filter="author" aria-pressed="false">Writers</button>' +
  '<button type="button" class="explore-filter" data-filter="resource" aria-pressed="false">Free guides</button>' +
  '<button type="button" class="explore-filter" data-filter="study" aria-pressed="false">Study editions</button>' +
  '<button type="button" class="explore-filter" data-filter="collection" aria-pressed="false">Collections</button>' +
  '</div></section>' +
  '<section class="explore-paths" aria-label="Ways into Astor Library">' +
  '<a href="/library/"><span>Choose a book</span><p>Read its story, publication history and life on stage or screen.</p></a>' +
  '<a href="/subjects/"><span>Read by subject</span><p>Begin with comedy, Gothic, tragedy, detection, epic, satire, narration or writing about slavery and freedom.</p></a>' +
  '<a href="/authors/"><span>Meet a writer</span><p>Follow an author across the books, forms and questions that shaped their work.</p></a>' +
  '<a href="/study/"><span>Study a set text</span><p>Find an Astor edition with close-reading and essay support.</p></a>' +
  '<a href="/resources/"><span>Use a free guide</span><p>Open focused help with a text, passage, theme or question.</p></a>' +
  '<a href="/reading-routes/"><span>Follow a question</span><p>Move across periods through home, freedom, fear, power, evidence and voice.</p></a>' +
  '</section>' +
  '<section class="explore-results" aria-label="Search results">' + entryCards + '</section>' +
  '<p class="explore-empty" id="explore-empty" hidden>Nothing quite matches that search yet. Try a title, author, period or broader word.</p>' +
  '</main>' +
  '<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Classic literature, carefully introduced and kept open to curious readers.</p></div>' +
  '<div class="footer-links"><a href="/about/">About</a><a href="/subjects/">Subjects</a><a href="/authors/">Writers</a><a href="/reading-routes/">Reading routes</a><a href="/library/">All books</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></div></footer>' +
  '</body></html>';

fs.mkdirSync(path.join(root, 'explore'), { recursive: true });
fs.writeFileSync(path.join(root, 'explore/index.html'), exploreHtml);

const featuredAuthorNames = ['Charles Dickens', 'Jane Austen', 'Frederick Douglass', 'Mary Shelley', 'Arthur Conan Doyle', 'William Shakespeare'];
const featuredAuthors = featuredAuthorNames.map(function (name) { return authors.find(function (author) { return author.title === name; }); }).filter(Boolean);

function authorCoverStack(author) {
  const covers = author.books.slice(0, 3).map(function (book, index) {
    return '<img src="' + escapeHtml(book.image) + '" alt="' + escapeHtml(index === 0 ? book.imageAlt : '') + '" loading="lazy">';
  }).join('');
  return '<div class="author-cover-stack" aria-label="Books by ' + escapeHtml(author.title) + '">' + covers + '</div>';
}

const featuredAuthorCards = featuredAuthors.map(function (author) {
  return '<article class="featured-author-card"><a href="' + escapeHtml(author.href) + '">' + authorCoverStack(author) + '<div><p class="kicker">' + author.bookCount + (author.bookCount === 1 ? ' book' : ' books') + ' in the library</p><h2>' + escapeHtml(author.title) + '</h2><p>' + escapeHtml(author.description) + '</p><span class="home-text-link">Read the writer page <span aria-hidden="true">&rarr;</span></span></div></a></article>';
}).join('');

const authorDirectoryCards = authors.map(function (author) {
  const bookLinks = author.books.map(function (book) {
    return '<a href="' + escapeHtml(book.href) + '">' + escapeHtml(book.title) + '</a>';
  }).join('');
  const name = authorProfiles[author.title]
    ? '<a href="' + escapeHtml(author.href) + '">' + escapeHtml(author.title) + '</a>'
    : escapeHtml(author.title);
  return '<article class="author-directory-card" id="' + slugify(author.title) + '"><p class="author-directory-count">' + author.bookCount + (author.bookCount === 1 ? ' book' : ' books') + '</p><h2>' + name + '</h2><div class="author-book-links">' + bookLinks + '</div></article>';
}).join('');

const authorsHtml = '<!doctype html><html lang="en"><head>' +
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>Classic Authors and Writers | Astor Library</title><meta name="description" content="Explore classic authors in Astor Library, with dedicated pages for Dickens, Austen, Frederick Douglass, Mary Shelley, Conan Doyle and Shakespeare and links to every available book.">' +
  '<link rel="stylesheet" href="/assets/styles.css"></head><body>' + siteHeader() +
  '<main class="page-wrap authors-page"><section class="authors-hero"><div><p class="kicker">Lives, books and ways of reading</p><h1>Writers in the library.</h1><p class="deck">A book never arrives alone. Here you can follow a writer across several works, see the pressures under which those works were made, and move directly into the Astor reading pages.</p><div class="button-row"><a class="button primary" href="#all-writers">See every writer</a><a class="button secondary" href="/library/">Browse all books</a></div></div><div class="authors-hero-shelf" aria-hidden="true"><img src="/Great%20Expectations.png" alt=""><img src="/Pride%20and%20Prejudice.png" alt=""><img src="/Adventures%20of%20Sherlock%20Holmes.png" alt=""></div></section>' +
  '<section class="authors-intro"><p>These pages are not short biographies pasted beside a list of titles. They are places to understand how a writer worked: the forms they chose, the world they wrote from and the questions that keep their books alive.</p></section>' +
  '<section class="featured-authors" aria-labelledby="featured-authors-title"><div class="section-title"><p class="kicker">Begin with a shelf</p><h2 id="featured-authors-title">Writers held in depth.</h2></div>' + featuredAuthorCards + '</section>' +
  '<section class="author-directory" id="all-writers" aria-labelledby="all-writers-title"><div class="author-directory-head"><div><p class="kicker">The full catalogue</p><h2 id="all-writers-title">Every writer.</h2></div><p>' + authors.length + ' writers currently appear in Astor Library. More detailed lives and reading paths will be added as their shelves grow.</p></div><div class="author-directory-grid">' + authorDirectoryCards + '</div></section>' +
  '</main><footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Classic books read in the company of the writers who made them.</p></div><div class="footer-links"><a href="/library/">All books</a><a href="/explore/">Search</a><a href="/reading-routes/">Reading routes</a><a href="/resources/">Free resources</a></div></footer></body></html>';

fs.mkdirSync(path.join(root, 'authors'), { recursive: true });
fs.writeFileSync(path.join(root, 'authors/index.html'), authorsHtml);

const collectionSections = collections.map(function (collection) {
  const links = books
    .filter(function (book) { return book.collection === collection.title; })
    .sort(function (a, b) { return a.title.localeCompare(b.title, 'en'); })
    .map(function (book) {
      return '<a href="' + escapeHtml(book.href) + '"><span>' + escapeHtml(book.title) + '</span><small>' + escapeHtml(book.author) + '</small></a>';
    }).join('');
  return '<section class="index-group" id="index-' + collection.href.replace(/\//g, '') + '"><h2><a href="' + collection.href + '">' + escapeHtml(collection.title) + '</a></h2><div class="index-links">' + links + '</div></section>';
}).join('');

const resourceLinks = resources
  .slice()
  .sort(function (a, b) { return a.title.localeCompare(b.title, 'en'); })
  .map(function (resource) { return '<a href="' + escapeHtml(resource.href) + '"><span>' + escapeHtml(resource.title) + '</span><small>Free guide</small></a>'; })
  .join('');

const studyLinks = studyEditions
  .slice()
  .sort(function (a, b) { return a.title.localeCompare(b.title, 'en'); })
  .map(function (edition) { return '<a href="' + escapeHtml(edition.href) + '"><span>' + escapeHtml(edition.title) + '</span><small>' + escapeHtml(edition.typeLabel) + '</small></a>'; })
  .join('');

const authorLinks = authors
  .map(function (author) { return '<a href="' + escapeHtml(author.href) + '"><span>' + escapeHtml(author.title) + '</span><small>' + author.bookCount + (author.bookCount === 1 ? ' book' : ' books') + '</small></a>'; })
  .join('');

const subjectLinks = subjects
  .map(function (subject) { return '<a href="' + escapeHtml(subject.href) + '"><span>' + escapeHtml(subject.title) + '</span><small>' + subject.bookCount + (subject.bookCount === 1 ? ' book' : ' books') + ' in the guide</small></a>'; })
  .join('');

const siteIndexHtml = '<!doctype html><html lang="en"><head>' +
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>Site Index | Astor Library</title><meta name="description" content="A complete, crawlable index of Astor Library books, writers, subject guides, collections, free literature guides, study editions and reading routes.">' +
  '<link rel="stylesheet" href="/assets/styles.css"><style>' +
  '.site-index-quick{display:flex;gap:10px;flex-wrap:wrap;margin:30px 0 60px}.site-index-quick a{font-family:system-ui,-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-weight:800;color:var(--burgundy);border:1px solid var(--line);background:#fff8ef;padding:10px 13px;text-decoration:none}.index-group{border-top:1px solid var(--line);padding:38px 0 14px}.index-group h2{font-size:clamp(34px,5vw,58px);line-height:.95;letter-spacing:-.04em;margin:0 0 22px}.index-group h2 a{text-decoration:none}.index-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.index-links>a{display:flex;flex-direction:column;gap:6px;min-height:92px;border:1px solid var(--line);background:rgba(255,248,239,.86);padding:15px;text-decoration:none}.index-links span{font-size:21px;font-weight:700;line-height:1.08}.index-links small{font-family:system-ui,-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;color:var(--muted);line-height:1.35}@media(max-width:820px){.index-links{grid-template-columns:1fr}}' +
  '</style></head><body>' + siteHeader() +
  '<main class="page-wrap"><section class="page-intro"><div><p class="kicker">Everything in one place</p><h1>Site index.</h1><p class="deck">Every book, writer, subject guide, free resource, study edition and collection currently held by Astor Library. Use this page when you know the title, or when you simply want to see the full shape of the library.</p></div><aside class="source-note"><p><strong>' + books.length + ' books, ' + subjects.length + ' subject guides, ' + authors.length + ' writers, ' + resources.length + ' free guides and ' + studyEditions.length + ' study editions.</strong> For a visual search, use Explore. For connections across periods, begin with Subjects or the reading routes.</p><div class="button-row"><a class="button primary" href="/explore/">Search everything</a><a class="button secondary" href="/subjects/">Read by subject</a></div></aside></section>' +
  '<nav class="site-index-quick" aria-label="Site index sections"><a href="#subjects">Subjects</a><a href="#writers">Writers</a><a href="#books">Books by collection</a><a href="#free-guides">Free guides</a><a href="#study-editions">Study editions</a><a href="/about/">About Astor Library</a><a href="/editorial/">Editorial standards</a></nav>' +
  '<section class="index-group" id="subjects"><h2><a href="/subjects/">Subject guides</a></h2><div class="index-links">' + subjectLinks + '</div></section>' +
  '<section class="index-group" id="writers"><h2><a href="/authors/">Writers</a></h2><div class="index-links">' + authorLinks + '</div></section>' +
  '<div id="books">' + collectionSections + '</div>' +
  '<section class="index-group" id="free-guides"><h2><a href="/resources/">Free literature guides</a></h2><div class="index-links">' + resourceLinks + '</div></section>' +
  '<section class="index-group" id="study-editions"><h2><a href="/study/">Study editions</a></h2><div class="index-links">' + studyLinks + '</div></section>' +
  '</main><footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Making classic literature easier to read, teach and study, while keeping the original texts intact.</p></div><div class="footer-links"><a href="/">Home</a><a href="/subjects/">Subjects</a><a href="/authors/">Writers</a><a href="/explore/">Explore</a><a href="/reading-routes/">Reading routes</a><a href="/resources/">Free resources</a></div></footer></body></html>';

fs.mkdirSync(path.join(root, 'site-index'), { recursive: true });
fs.writeFileSync(path.join(root, 'site-index/index.html'), siteIndexHtml);

console.log('Rebuilt discovery with ' + entries.length + ' searchable entries.');

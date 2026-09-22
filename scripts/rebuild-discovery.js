const fs = require('fs');
const path = require('path');
const subjectData = require('./subject-data');
const resourceData = require('./resource-data');
const authorProfileData = require('./author-profiles');
const editionUpdateData = require('./edition-update-data');
const formatReleaseData = require('./format-release-data');

const root = process.cwd();

const collectionFiles = [
  { file: 'ancient-epic/index.html', name: 'Ancient & Epic', href: '/ancient-epic/', image: '/assets/home/ancient-epic.jpg' },
  { file: 'renaissance-early-modern/index.html', name: 'Renaissance & Early Modern', href: '/renaissance-early-modern/', image: '/assets/home/renaissance-early-modern.jpg' },
  { file: 'shakespeare/index.html', name: 'Shakespeare', href: '/shakespeare/', image: '/assets/home/shakespeare.jpg' },
  { file: 'shakespeare/apocrypha/index.html', name: 'Shakespeare Apocrypha', href: '/shakespeare/apocrypha/', image: '/Edward%20III%20Main%20Cover.png', relatedBooks: editionUpdateData.filter(book => book.range === 'apocrypha').map(book => '/books/' + book.slug + '/') },
  { file: 'shakespeare/expanded-scholarly-editions/index.html', name: 'Astor Shakespeare: Expanded Scholarly Editions', href: '/shakespeare/expanded-scholarly-editions/', image: '/Hamlet%20Scholarly%20Cover.png', relatedBooks: editionUpdateData.filter(book => book.range === 'expanded').map(book => '/books/' + book.slug + '/') },
  { file: 'hardbacks/index.html', name: 'Hardback Editions', href: '/hardbacks/', image: '/Great%20Gatsby%20Hardcover.png', relatedBooks: formatReleaseData.hardbacks.map(book => book.href) },
  { file: 'restoration-enlightenment/index.html', name: 'Restoration & Enlightenment', href: '/restoration-enlightenment/', image: '/assets/home/restoration-enlightenment.jpg' },
  { file: 'romantic-regency/index.html', name: 'Romantic & Regency', href: '/romantic-regency/', image: '/assets/home/romantic-regency.jpg' },
  { file: 'victorian/index.html', name: 'Victorian', href: '/victorian/', image: '/assets/home/victorian.jpg' },
  { file: 'american/index.html', name: 'American Classics', href: '/american/', image: '/assets/home/american-classics.jpg' },
  { file: 'modern/index.html', name: 'Modern Classics', href: '/modern/', image: '/assets/home/modern-classics.jpg' }
];

const studyBookLinks = {
  '/study/macbeth/': ['/books/macbeth/'],
  '/study/a-christmas-carol/': ['/books/a-christmas-carol/'],
  'https://mybook.to/tih5': ['/books/a-midsummer-nights-dream/'],
  'https://mybook.to/BMP2uu': ['/books/dorian-gray/'],
  'https://mybook.to/xGiajwx': ['/books/dracula/'],
  '/study/frankenstein/': ['/books/frankenstein/'],
  'https://mybook.to/jAoMkeE': ['/books/great-expectations/'],
  '/study/hamlet/': ['/books/hamlet/'],
  '/study/jekyll-and-hyde/': ['/books/jekyll-and-hyde/'],
  'https://mybook.to/yIeXaP': ['/books/king-lear/'],
  'https://mybook.to/cntRBz': ['/books/macbeth/'],
  'https://mybook.to/dmYF3qO': ['/books/merry-wives-of-windsor/'],
  'https://mybook.to/VCYoiwF': ['/books/moby-dick/'],
  'https://mybook.to/8DvAj': ['/books/much-ado-about-nothing/'],
  '/study/othello/': ['/books/othello/'],
  'https://mybook.to/bqGB': ['/books/richard-iii/'],
  '/study/romeo-and-juliet/': ['/books/romeo-and-juliet/'],
  'https://mybook.to/FSRJnn': ['/books/tess-of-the-durbervilles/'],
  'https://mybook.to/pSaIay': ['/books/the-tempest/'],
  'https://mybook.to/FAHByQ': ['/books/macbeth/', '/books/jekyll-and-hyde/'],
  'https://mybook.to/iFtKs': ['/books/macbeth/', '/books/a-christmas-carol/'],
  'https://mybook.to/ABlyJH': ['/books/romeo-and-juliet/', '/books/jekyll-and-hyde/'],
  'https://mybook.to/2AqrIlR': ['/books/romeo-and-juliet/', '/books/a-christmas-carol/'],
  'https://mybook.to/lhbh': ['/books/alls-well-that-ends-well/'],
  'https://mybook.to/VgUfa': ['/books/antony-and-cleopatra/'],
  'https://mybook.to/3EoUR': ['/books/as-you-like-it/'],
  'https://mybook.to/x08hp4o': ['/books/comedy-of-errors/'],
  'https://mybook.to/x4F6rs': ['/books/coriolanus/'],
  'https://mybook.to/ySSywz': ['/books/cymbeline/'],
  'https://mybook.to/3xXPCSy': ['/books/henry-iv-parts-1-and-2/', '/books/henry-iv-part-1/', '/books/henry-iv-part-2/'],
  'https://mybook.to/a6b3c': ['/books/henry-iv-part-2/'],
  'https://mybook.to/HPiX': ['/books/henry-v/'],
  'https://mybook.to/ENJxO': ['/books/loves-labours-lost/'],
  'https://mybook.to/x8aiiFG': ['/books/measure-for-measure/'],
  'https://mybook.to/2QzQqmh': ['/books/the-merchant-of-venice/'],
  'https://mybook.to/M4c6K': ['/books/mrs-dalloway/'],
  'https://mybook.to/o0Am2j': ['/books/richard-ii/'],
  'https://mybook.to/2mR1': ['/books/taming-of-the-shrew/'],
  'https://mybook.to/gf9uZE': ['/books/titus-andronicus/'],
  'https://mybook.to/l4zC9': ['/books/twelfth-night/']
};

// A study edition that gains an on-site page changes its key in this map from
// the retailer address to the page address. Re-keying it here means the map
// above never has to be edited when a page is generated.
for (const [buyUrl, pageHref] of Object.entries(require('./rebuild-generated-study-pages').generatedStudyPages())) {
  if (!studyBookLinks[buyUrl]) continue;
  studyBookLinks[pageHref] = studyBookLinks[buyUrl];
  delete studyBookLinks[buyUrl];
}

const resourceBookLinks = Object.fromEntries(resourceData.map(function (resource) {
  return [resource.route, resource.relatedBooks || []];
}));

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
  return require('./text-excerpt').firstSentence(textOnly(value));
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

function linkPath(value) {
  return /^(?:https?:)?\/\//i.test(value) ? value : rootPath(value);
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
    '<a class="nav-link" href="/passage-room/">Passages</a>' +
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
const bookPattern = /<article class="catalog-card" data-collection="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g;

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

const authorProfiles = Object.fromEntries(authorProfileData.map(function (author) {
  return [author.name, author.href];
}));

const authorDescriptions = Object.fromEntries(authorProfileData.map(function (author) {
  return [author.name, author.description];
}));

for (const author of authorProfileData) {
  const profileFile = path.join(root, author.href.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(profileFile)) continue;
  const profileHtml = fs.readFileSync(profileFile, 'utf8');
  const updatedProfileHtml = profileHtml.replace(
    /(<div class="author-profile-heading">[\s\S]*?<p class="deck">)[\s\S]*?(<\/p>)/,
    '$1' + escapeHtml(author.description) + '$2'
  );
  fs.writeFileSync(profileFile, updatedProfileHtml);
}

const authors = Array.from(books.reduce(function (groups, book) {
  for (const name of authorProfileData.authorNamesForBook(book)) {
    if (!groups.has(name)) groups.set(name, []);
    if (!groups.get(name).some(entry => entry.href === book.href)) groups.get(name).push(book);
  }
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
  // A catalogue line, not a pitch: what the library holds by this writer.
  const counts = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const howMany = counts[authorBooks.length] || String(authorBooks.length);
  const description = authorDescriptions[name] || (authorBooks.length === 1
    ? 'One book in the catalogue: ' + titleList + '.'
    : howMany + ' books in the catalogue: ' + titleList + '.');

  authorBooks.forEach(function (book) {
    const names = authorProfileData.authorNamesForBook(book);
    book.authorHref = names.length === 1 ? href : '/authors/#all-writers';
  });

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
      return { title: book.title, href: book.href, image: book.image, imageAlt: book.imageAlt, collection: book.collection, description: book.description };
    }),
    search: [name].concat(titles, authorBooks.map(function (book) { return book.collection; })).join(' ')
  };
}).sort(function (a, b) { return a.title.localeCompare(b.title, 'en'); });

const resources = [];
const resourcesHtml = read('resources/index.html');
const resourcePattern = /<a class="resource-card" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

for (const match of resourcesHtml.matchAll(resourcePattern)) {
  const href = linkPath(match[1]);
  const block = match[2];
  const imageMatch = block.match(/<img class="resource-thumb" src="([^"]+)" alt="([^"]*)"/);
  const titleHtml = matchText(block, /<h3>([\s\S]*?)<\/h3>/, 'resource title');
  const descriptionHtml = matchText(block, /<p>([\s\S]*?)<\/p>/, 'resource description');
  const data = resourceData.find(function (resource) { return resource.route === href; });
  // The hub lists the guides plainly; their tags come from the record.
  const tags = data?.tags?.slice() || Array.from(block.matchAll(/<span class="tag">([\s\S]*?)<\/span>/g), function (tag) { return textOnly(tag[1]); });
  let relatedBooks = resourceBookLinks[href] || [];
  const detailFile = data?.route
    ? path.join(root, data.route.replace(/^\//, ''), 'index.html')
    : '';

  if (detailFile && fs.existsSync(detailFile)) {
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
    externalUrl: data?.url || '',
    image: imageMatch ? rootPath(imageMatch[1]) : '',
    imageAlt: imageMatch ? textOnly(imageMatch[2]) : '',
    relatedBooks: relatedBooks,
    search: [title, description].concat(unique(tags)).join(' ')
  });
}

const studyEditions = [];
const studyHtml = read('study/index.html');
const studyPattern = /<a class="study-card( dual)?" href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g;

for (const match of studyHtml.matchAll(studyPattern)) {
  const paired = Boolean(match[1]);
  const href = match[2];
  const attributes = match[3];
  const block = match[4];
  const externalUrl = attributes.match(/data-buy-url="([^"]+)"/)?.[1] || (/^https?:\/\//.test(href) ? href : '');
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
    externalUrl: externalUrl,
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
    relatedBooks: collection.relatedBooks || [],
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

const passages = [
  {
    type: 'passage', typeLabel: 'Close reading', title: '“To be, or not to be”',
    description: 'A speech that sounds private and never once says “I”, weighing an impossible sea of troubles until the metaphor turns its own answer round.',
    href: '/passage-room/hamlet-to-be/', image: '/Hamlet.png', imageAlt: 'Astor Library Hamlet cover',
    relatedBooks: ['/books/hamlet/'], search: 'Hamlet Shakespeare to be or not to be soliloquy death sleep dream close reading language tragedy'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“man is not truly one”',
    description: 'Follow Jekyll’s theory of two selves as his own vocabulary turns that tidy pair into a crowd of inhabitants.',
    href: '/passage-room/jekyll-duality/', image: '/Jekyll%20and%20Hyde.png', imageAlt: 'Astor Library Jekyll and Hyde cover',
    relatedBooks: ['/books/jekyll-and-hyde/'], search: 'Jekyll Hyde Stevenson duality divided self truly two confession Gothic close reading language'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“but I done it”',
    description: 'Its fifteen-minute delay, its unheroic action and the racist language that Huck has not left behind — Huck’s apology to Jim.',
    href: '/passage-room/huckleberry-finn-apology/', image: '/Huckleberry%20Finn.png', imageAlt: 'Astor Library Huckleberry Finn cover',
    relatedBooks: ['/books/adventures-of-huckleberry-finn/'], search: 'Huckleberry Finn Mark Twain Huck apologises Jim Chapter 15 conscience racism freedom close reading language'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“always the woman”',
    description: 'Watson’s opening portrait of Irene Adler and the reasoning machine she has already proved incomplete.',
    href: '/passage-room/sherlock-holmes-scandal/', image: '/Adventures%20of%20Sherlock%20Holmes.png', imageAlt: 'Astor Library Adventures of Sherlock Holmes cover',
    relatedBooks: ['/books/adventures-of-sherlock-holmes/'], search: 'Sherlock Holmes Irene Adler the woman Watson machine Scandal in Bohemia detective fiction close reading narration'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“I never knew myself”',
    description: 'Follow Elizabeth Bennet as she unfolds Darcy’s letter again, tests its evidence and discovers how vanity has shaped her judgment.',
    href: '/passage-room/pride-prejudice-self-knowledge/', image: '/Pride%20and%20Prejudice.png', imageAlt: 'Astor Library Pride and Prejudice cover',
    relatedBooks: ['/books/pride-and-prejudice/'], search: 'Pride and Prejudice Jane Austen Elizabeth Bennet Darcy letter Chapter 36 rereading self knowledge judgement vanity close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“the pathway from slavery to freedom”',
    description: 'Hugh Auld’s attempt to forbid literacy gives Frederick Douglass a new understanding of power and a fixed purpose to learn.',
    href: '/passage-room/douglass-pathway-freedom/', image: '/Frederick%20Douglass.png', imageAlt: 'Astor Library Narrative of the Life of Frederick Douglass cover',
    relatedBooks: ['/books/narrative-of-the-life-of-frederick-douglass/'], search: 'Frederick Douglass Narrative literacy education slavery freedom Hugh Auld Chapter 6 close reading abolition power'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“I ought to be thy Adam”',
    description: 'The creature’s appeal to Victor: creation, abandonment, Adam, the fallen angel and the disputed duties of each.',
    href: '/passage-room/frankenstein-adam/', image: '/Frankenstein.png', imageAlt: 'Astor Library Frankenstein cover',
    relatedBooks: ['/books/frankenstein/'], search: 'Frankenstein Mary Shelley creature Adam fallen angel Paradise Lost creator responsibility abandonment Gothic close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Who has been taking my bed?”',
    description: 'Penelope’s final test: craft, secret knowledge and the rooted olive bed that makes homecoming material.',
    href: '/passage-room/odyssey-olive-bed/', image: '/The%20Odyssey.png', imageAlt: 'Astor Library Odyssey cover',
    relatedBooks: ['/books/the-odyssey/'], search: 'Odyssey Homer Penelope Odysseus Ulysses bed olive tree Book 23 recognition homecoming craft close reading epic'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Are there no prisons?”',
    description: 'Scrooge turns a request for direct help into a cold question about prisons, workhouses and the Poor Law.',
    href: '/passage-room/christmas-carol-prisons/', image: '/A%20Christmas%20Carol.png', imageAlt: 'Astor Library A Christmas Carol cover',
    relatedBooks: ['/books/a-christmas-carol/'], search: 'Christmas Carol Dickens Scrooge prisons workhouses Poor Law poverty charity Stave One close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Trifles light as air”',
    description: 'Iago understands that jealousy can make a slight object carry the authority of proof.',
    href: '/passage-room/othello-trifles-proof/', image: '/Othello.png', imageAlt: 'Astor Library Othello cover',
    relatedBooks: ['/books/othello/'], search: 'Othello Shakespeare Iago handkerchief jealousy evidence proof trifles light as air Act 3 Scene 3 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“one wild cry and flying leap”',
    description: 'Eliza crosses the Ohio on broken ice in a scene where bodily danger exposes the violence of sale and pursuit.',
    href: '/passage-room/uncle-toms-cabin-ice/', image: '/Uncle%20Tom%27s%20Cabin.png', imageAlt: 'Astor Library Uncle Tom’s Cabin cover',
    relatedBooks: ['/books/uncle-toms-cabin/'], search: 'Uncle Toms Cabin Stowe Eliza Harry Ohio River ice escape slavery mother child Chapter 7 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Call me Ishmael.”',
    description: 'Melville opens with a name, an invitation and a narrator who presents the sea as a way of surviving life on shore.',
    href: '/passage-room/moby-dick-call-me-ishmael/', image: '/Moby%20Dick.png', imageAlt: 'Astor Library Moby-Dick cover',
    relatedBooks: ['/books/moby-dick/'], search: 'Moby Dick Melville Ishmael call me opening narrator voice sea spleen Loomings Chapter 1 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“unsex me here”',
    description: 'Command, bodily imagery and the distance between imagined hardness and what the play later shows — Lady Macbeth’s invocation.',
    href: '/passage-room/macbeth-unsex-me-here/', image: '/FB3AE04E-B2F3-4AB6-96D5-49BF6CF4C298.png', imageAlt: 'Astor Library Macbeth cover',
    relatedBooks: ['/books/macbeth/'], search: 'Macbeth Shakespeare Lady Macbeth unsex me here Act 1 Scene 5 gender body spirits close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Is this a dagger”',
    description: 'Follow Macbeth’s question as sight, touch and intention pull apart on the walk towards Duncan’s chamber.',
    href: '/passage-room/macbeth-is-this-a-dagger/', image: '/FB3AE04E-B2F3-4AB6-96D5-49BF6CF4C298.png', imageAlt: 'Astor Library Macbeth cover',
    relatedBooks: ['/books/macbeth/'], search: 'Macbeth Shakespeare dagger soliloquy Act 2 Scene 1 hallucination murder close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Tomorrow, and tomorrow, and tomorrow”',
    description: 'Macbeth’s final meditation: repetition, measured time and the theatrical images with which he empties life of meaning.',
    href: '/passage-room/macbeth-tomorrow-and-tomorrow/', image: '/FB3AE04E-B2F3-4AB6-96D5-49BF6CF4C298.png', imageAlt: 'Astor Library Macbeth cover',
    relatedBooks: ['/books/macbeth/'], search: 'Macbeth Shakespeare tomorrow tomorrow tomorrow Act 5 Scene 5 time candle player tale close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Juliet is the sun”',
    description: 'Romeo beneath the window: sun and moon, green-sickness, Ptolemaic stars and the love rhetoric Juliet is about to answer.',
    href: '/passage-room/romeo-and-juliet-light/', image: '/Romeo%20and%20Juliet.png', imageAlt: 'Astor Library Romeo and Juliet cover',
    relatedBooks: ['/books/romeo-and-juliet/'], search: 'Romeo and Juliet Shakespeare balcony scene Act 2 Scene 2 east sun light moon Petrarchan close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Blow, winds, and crack your cheeks!”',
    description: 'Its impossible commands, its legal language and the first true description he gives of himself — Lear’s speech to the storm.',
    href: '/passage-room/king-lear-blow-winds/', image: '/King%20Lear.png', imageAlt: 'Astor Library King Lear cover',
    relatedBooks: ['/books/king-lear/'], search: 'King Lear Shakespeare storm scene Act 3 Scene 2 blow winds cataracts hurricanoes germens Fool close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Our revels now are ended”',
    description: 'Prospero’s revels speech: the interrupted masque, the great globe, the rack of cloud and the troubled mind behind the calm.',
    href: '/passage-room/tempest-our-revels/', image: '/The%20Tempest.png', imageAlt: 'Astor Library Tempest cover',
    relatedBooks: ['/books/the-tempest/'], search: 'Tempest Shakespeare Prospero revels ended Act 4 masque spirits great globe dreams rounded with a sleep close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Was this the face that launch’d a thousand ships”',
    description: 'Faustus’s address to Helen: its burning imagery, the demonic kiss and the myths of mortals destroyed by divine lovers.',
    href: '/passage-room/doctor-faustus-thousand-ships/', image: '/Doctor%20Faustus%20Cover.png', imageAlt: 'Astor Library Doctor Faustus cover',
    relatedBooks: ['/books/doctor-faustus/'], search: 'Doctor Faustus Marlowe Helen of Troy thousand ships topless towers Ilium kiss damnation close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“My mistress’ eyes are nothing like the sun”',
    description: 'Shakespeare takes the blazon apart comparison by comparison — wires, reeks, coral — and the couplet turns the demolition into the compliment.',
    href: '/passage-room/sonnet-130-false-compare/', image: '/Shakespeare%27s%20Sonnets%20Main%20Cover.png', imageAlt: 'Astor Library Shakespeare’s Sonnets cover',
    relatedBooks: ['/books/shakespeares-sonnets/'], search: 'Shakespeare Sonnet 130 mistress eyes blazon dark lady false compare anti-Petrarchan close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“The mind is its own place”',
    description: 'Satan builds his case out of antitheses and a politics of reigning and serving, and Book IV takes the best line back.',
    href: '/passage-room/paradise-lost-mind-its-own-place/', image: '/Paradise%20Lost%20Main%20Cover.png', imageAlt: 'Astor Library Paradise Lost cover',
    relatedBooks: ['/books/paradise-lost/'], search: 'Paradise Lost Milton Satan mind its own place better to reign in hell Book 1 epic close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Water, water, every where”',
    description: 'Copper sky, painted ocean, and a rot in the sea that only the blessing of the snakes will undo.',
    href: '/passage-room/ancient-mariner-water-water/', image: '/Rime%20of%20the%20Ancient%20Mariner%20Main%20Cover.png', imageAlt: 'Astor Library Rime of the Ancient Mariner cover',
    relatedBooks: ['/books/the-rime-of-the-ancient-mariner/'], search: 'Rime of the Ancient Mariner Coleridge water water everywhere painted ship painted ocean albatross ballad close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“I am no bird; and no net ensnares me”',
    description: 'Jane tells Rochester she is no automaton, in four small adjectives, and claims equality at God’s feet before refusing to be his bird.',
    href: '/passage-room/jane-eyre-i-am-no-bird/', image: '/Jane%20Eyre%20Main%20Cover.png', imageAlt: 'Astor Library Jane Eyre cover',
    relatedBooks: ['/books/jane-eyre/'], search: 'Jane Eyre Charlotte Bronte Rochester proposal Chapter 23 equal souls no bird free human being close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Nelly, I am Heathcliff!”',
    description: 'Catherine compares her love to foliage and to eternal rocks, the simile collapses into identity, and Heathcliff leaves before the half that matters.',
    href: '/passage-room/wuthering-heights-i-am-heathcliff/', image: '/Wuthering%20Heights.png', imageAlt: 'Astor Library Wuthering Heights cover',
    relatedBooks: ['/books/wuthering-heights/'], search: 'Wuthering Heights Emily Bronte Catherine Heathcliff Chapter 9 foliage eternal rocks identity Nelly close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“the small bundle of shivers … was Pip”',
    description: 'One enormous sentence gives Pip the identity of things, and then a voice out of the graves interrupts it.',
    href: '/passage-room/great-expectations-marsh-country/', image: '/Great%20Expectations.png', imageAlt: 'Astor Library Great Expectations cover',
    relatedBooks: ['/books/great-expectations/'], search: 'Great Expectations Dickens Pip churchyard opening marsh country Magwitch identity Chapter 1 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“‘Justice’ was done”',
    description: 'A black flag goes up, Hardy puts Justice in quotation marks with a phrase borrowed from Aeschylus, and two people walk on.',
    href: '/passage-room/tess-president-of-the-immortals/', image: '/Tess%20of%20the%20D%27urbervilles.png', imageAlt: 'Astor Library Tess of the d’Urbervilles cover',
    relatedBooks: ['/books/tess-of-the-durbervilles/'], search: 'Tess of the dUrbervilles Hardy ending President of the Immortals black flag Wintoncester justice close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“I’ve got out at last”',
    description: 'The reversal of power, the mystery of Jane and the man fainting across the creeping path — the ending of The Yellow Wallpaper.',
    href: '/passage-room/yellow-wallpaper-got-out-at-last/', image: '/The%20Yellow%20Paper%20and%20The%20Giant%20Wistaria%20Main%20Cover.png', imageAlt: 'Astor Library Yellow Wall-Paper cover',
    relatedBooks: ['/books/the-yellow-wallpaper-and-the-giant-wistaria/'], search: 'Yellow Wallpaper Gilman ending got out at last Jane rest cure creeping John fainted close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“the children of the night. What music they make!”',
    description: 'Wolves outside, courtesy inside, and a modern young man writing everything down to keep hold of his reason.',
    href: '/passage-room/dracula-children-of-the-night/', image: '/0194_1_like-the-one-attached-match-background-c_8YvDNXceV1S2geaPKOSiFg_oMVpLDveSW6UbY4s9hlomg_cover.png', imageAlt: 'Astor Library Dracula cover',
    relatedBooks: ['/books/dracula/'], search: 'Dracula Stoker children of the night wolves music Harker journal castle Chapter 2 Gothic close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“So we beat on, boats against the current”',
    description: 'Fitzgerald ends on the green breast of the new world, a future that recedes as you reach it, and a boat rowing against the current.',
    href: '/passage-room/great-gatsby-boats-against-the-current/', image: '/The%20Great%20Gatsby%20Main%20Cover.png', imageAlt: 'Astor Library Great Gatsby cover',
    relatedBooks: ['/books/the-great-gatsby/'], search: 'Great Gatsby Fitzgerald ending boats against the current green light Dutch sailors orgiastic future close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“a woman must have money and a room of her own”',
    description: 'The opening argument of A Room of One’s Own: the famous minor point, the fictional I and truth told through lies.',
    href: '/passage-room/room-of-ones-own-money-and-a-room/', image: '/A%20Room%20of%20One%27s%20Own%20Main%20COver.png', imageAlt: 'Astor Library A Room of One’s Own cover',
    relatedBooks: ['/books/a-room-of-ones-own/'], search: 'A Room of Ones Own Virginia Woolf money and a room lecture women and fiction Judith Shakespeare essay close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“If music be the food of love, play on”',
    description: 'Orsino’s opening speech: appetite and excess, the dying fall, and a lover who disproves his own theory in four lines.',
    href: '/passage-room/twelfth-night-food-of-love/', image: '/Twelfth%20Night%20Main%20Cover.jpg', imageAlt: 'Astor Library Twelfth Night cover',
    relatedBooks: ['/books/twelfth-night/'], search: 'Twelfth Night Shakespeare Orsino if music be the food of love Act 1 Scene 1 appetite melancholy Illyria close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“The lunatic, the lover, and the poet”',
    description: 'Airy nothing and the bush supposed a bear—and Hippolyta’s quiet rebuttal that wins the argument — Theseus on imagination.',
    href: '/passage-room/midsummer-nights-dream-imagination/', image: '/4A5A73B5-A856-4507-94DD-FC862EC2F9A7.png', imageAlt: 'Astor Library A Midsummer Night’s Dream cover',
    relatedBooks: ['/books/a-midsummer-nights-dream/'], search: 'Midsummer Nights Dream Shakespeare Theseus Hippolyta lunatic lover poet imagination airy nothing Act 5 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“This royal throne of kings, this sceptered isle”',
    description: 'Gaunt’s deathbed speech: its suspended grammar and the accusation the famous catalogue exists to deliver.',
    href: '/passage-room/richard-ii-sceptred-isle/', image: '/Richard%20II.png', imageAlt: 'Astor Library Richard II cover',
    relatedBooks: ['/books/richard-ii/'], search: 'Richard II Shakespeare John of Gaunt sceptred isle this England Act 2 Scene 1 leased out history play close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“We few, we happy few, we band of brothers”',
    description: 'Henry turns honour into arithmetic, offers anyone who wants it a passport home, and promises the day will be remembered with advantages.',
    href: '/passage-room/henry-v-band-of-brothers/', image: '/Henry%20V%20Main%20Cover.jpg', imageAlt: 'Astor Library Henry V cover',
    relatedBooks: ['/books/henry-v/'], search: 'Henry V Shakespeare band of brothers St Crispin Crispian Agincourt Act 4 Scene 3 rhetoric honour close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Hath not a Jew eyes?”',
    description: 'Shylock reads out a ledger of injuries, argues for common humanity from the body, and turns at the end to the revenge the questions were preparing.',
    href: '/passage-room/merchant-of-venice-hath-not-a-jew-eyes/', image: '/The%20Merchant%20of%20Venice%20Main%20Cover.jpg', imageAlt: 'Astor Library Merchant of Venice cover',
    relatedBooks: ['/books/the-merchant-of-venice/'], search: 'Merchant of Venice Shakespeare Shylock hath not a Jew eyes prick us bleed revenge Act 3 Scene 1 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“I am Duchess of Malfi still.”',
    description: 'The Duchess’s exchange with the disguised Bosola: worm-seed, the caged lark and the most debated line in Jacobean tragedy.',
    href: '/passage-room/duchess-of-malfi-still/', image: '/Duchess%20of%20Malfi%20Cover.png', imageAlt: 'Astor Library Duchess of Malfi cover',
    relatedBooks: ['/books/the-duchess-of-malfi/'], search: 'Duchess of Malfi Webster Bosola I am Duchess of Malfi still Act 4 Scene 2 identity Jacobean tragedy close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“the print of a man’s naked foot”',
    description: 'Defoe’s matter-of-fact realism, the forensic checking of evidence, and the fear that rewrites an island — the footprint scene.',
    href: '/passage-room/robinson-crusoe-footprint/', image: '/Robinson%20Crusoe.png', imageAlt: 'Astor Library Robinson Crusoe cover',
    relatedBooks: ['/books/robinson-crusoe/'], search: 'Robinson Crusoe Defoe footprint naked foot on the shore thunderstruck island fear castle close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“a wild rose-bush”',
    description: 'The opening of The Scarlet Letter: the black flower of society, the rose at the prison door and a narrator who refuses to decide.',
    href: '/passage-room/scarlet-letter-rose-bush/', image: '/The%20Scarlet%20Letter%20%28Main%20Cover%29%20.png', imageAlt: 'Astor Library Scarlet Letter cover',
    relatedBooks: ['/books/the-scarlet-letter/'], search: 'Scarlet Letter Hawthorne prison door rose-bush Ann Hutchinson black flower Chapter 1 symbolism close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“a sense sublime”',
    description: 'The central movement of Tintern Abbey: the sounding cataract, the still sad music of humanity and what the eye half-creates.',
    href: '/passage-room/tintern-abbey-sense-sublime/', image: '/Lyrical%20Ballads%20Main%20Cover.png', imageAlt: 'Astor Library Lyrical Ballads cover',
    relatedBooks: ['/books/lyrical-ballads/'], search: 'Tintern Abbey Wordsworth Lyrical Ballads sense sublime deeply interfused still sad music of humanity Romantic close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Who are you?”',
    description: 'The puns that turn idiom into metaphysics and the chrysalis argument the child wins — Alice and the Caterpillar.',
    href: '/passage-room/alice-in-wonderland-who-are-you/', image: '/Alice%27s%20Adventures%20in%20Wonderland%20Main%20Cover.png', imageAlt: 'Astor Library Alice in Wonderland cover',
    relatedBooks: ['/books/alices-adventures-in-wonderland/'], search: 'Alice in Wonderland Carroll Caterpillar who are you identity chrysalis explain yourself Chapter 5 nonsense logic close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“All art is quite useless.”',
    description: 'Wilde’s preface: the rage of Caliban, surface and symbol, and aphorisms written as a defence and tested by their own novel.',
    href: '/passage-room/dorian-gray-preface/', image: '/Picture%20of%20Dorian%20Gray.png', imageAlt: 'Astor Library Picture of Dorian Gray cover',
    relatedBooks: ['/books/dorian-gray/'], search: 'Picture of Dorian Gray Wilde preface all art is quite useless no moral or immoral book Caliban aestheticism close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“intellects vast and cool and unsympathetic”',
    description: 'The opening of The War of the Worlds: the reversed microscope, infinite complacency and the empire over matter.',
    href: '/passage-room/war-of-the-worlds-opening/', image: '/War%20of%20the%20Worlds.png', imageAlt: 'Astor Library War of the Worlds cover',
    relatedBooks: ['/books/war-of-the-worlds/'], search: 'War of the Worlds Wells opening intellects vast and cool unsympathetic Mars microscope invasion close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“safer to be feared than loved”',
    description: 'The careful hedges and the dark view of human nature beneath them — Machiavelli on whether a prince should be loved or feared,.',
    href: '/passage-room/the-prince-feared-or-loved/', image: '/The%20Prince.png', imageAlt: 'Astor Library The Prince cover',
    relatedBooks: ['/books/the-prince/'], search: 'The Prince Machiavelli feared or loved Chapter 17 fear love human nature politics realism close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“a perfect ebony, or polished jet”',
    description: 'Aphra Behn’s first portrait of Oroonoko,: the European standard of beauty it applies and the contradiction at the book’s heart.',
    href: '/passage-room/oroonoko-royal-slave/', image: '/Oroonoko%20Main%20Cover.png', imageAlt: 'Astor Library Oroonoko cover',
    relatedBooks: ['/books/oroonoko/'], search: 'Oroonoko Aphra Behn royal slave ebony Roman nose beauty race slavery Surinam close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“the most pernicious race of little odious vermin”',
    description: 'The King of Brobdingnag’s verdict on mankind,: the mock-panegyric and the satire Swift builds by changing the scale.',
    href: '/passage-room/gullivers-travels-odious-vermin/', image: '/Gulliver%27s%20Travels%20Replacement.jpg', imageAlt: 'Astor Library Gulliver’s Travels cover',
    relatedBooks: ['/books/gullivers-travels/'], search: 'Gullivers Travels Swift Brobdingnag odious vermin king satire scale panegyric close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“transformed… into a horrible vermin”',
    description: 'The untranslatable Ungeziefer and the flatness with which the miracle is met — the first sentence of Kafka’s Metamorphosis,.',
    href: '/passage-room/metamorphosis-vermin/', image: '/The%20Metamorphosis%20Main%20Cover.png', imageAlt: 'Astor Library The Metamorphosis cover',
    relatedBooks: ['/books/the-metamorphosis/'], search: 'Metamorphosis Kafka Gregor Samsa vermin Ungeziefer transformed insect opening translation close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“scared… at the horse-hair plume”',
    description: 'Hector, Andromache and the frightened child in Iliad Book VI,: the plume that scares the baby and the tenderness inside the war poem.',
    href: '/passage-room/iliad-hectors-helmet/', image: '/The%20Iliad.png', imageAlt: 'Astor Library The Iliad cover',
    relatedBooks: ['/books/the-iliad/'], search: 'Iliad Homer Hector Andromache Astyanax helmet plume Book 6 farewell war tenderness Butler close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“the touch of a hand… from behind”',
    description: 'Walter Hartright’s midnight meeting with the woman in white,: the stopped blood and the dread a sensation novel builds from a single touch.',
    href: '/passage-room/woman-in-white-midnight-touch/', image: '/The%20Woman%20in%20White%20Main%20Cover.png', imageAlt: 'Astor Library The Woman in White cover',
    relatedBooks: ['/books/the-woman-in-white/'], search: 'Woman in White Wilkie Collins Hartright woman in white midnight road touch sensation novel Anne Catherick close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“pasted in the sky like a wafer”',
    description: 'The impersonal cosmos and war stripped of glory — the death of Jim Conklin and Crane’s famous red sun,.',
    href: '/passage-room/red-badge-sun-like-a-wafer/', image: '/Red%20Badge%20of%20Courage.png', imageAlt: 'Astor Library The Red Badge of Courage cover',
    relatedBooks: ['/books/red-badge-of-courage/'], search: 'Red Badge of Courage Stephen Crane red sun wafer Jim Conklin death naturalism indifferent universe close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“the ecstasy that marks the summit of life”',
    description: 'Buck running down the rabbit in The Call of the Wild,: London’s Darwinian rapture and the joy of the hunt.',
    href: '/passage-room/call-of-the-wild-ecstasy/', image: '/Call%20of%20the%20Wild.png', imageAlt: 'Astor Library The Call of the Wild cover',
    relatedBooks: ['/books/call-of-the-wild/'], search: 'Call of the Wild Jack London Buck ecstasy summit of life hunt atavism womb of Time naturalism close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“such a book as Robinson Crusoe never was written”',
    description: 'Gabriel Betteredge’s devotion to Robinson Crusoe at the opening of The Moonstone,: the comic narrator and the detective novel built on a voice.',
    href: '/passage-room/moonstone-robinson-crusoe/', image: '/The%20Moonstone%20Main%20Cover.png', imageAlt: 'Astor Library The Moonstone cover',
    relatedBooks: ['/books/the-moonstone/'], search: 'Moonstone Wilkie Collins Betteredge Robinson Crusoe detective novel voice narrator testimony close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Afraid! Of Him?”',
    description: 'Awe fused with love and the strange gift of forgetfulness — the vision of the god Pan in The Wind in the Willows,.',
    href: '/passage-room/wind-in-the-willows-piper/', image: '/The%20Wind%20in%20the%20Willows%20-%20Main%20Cover.png', imageAlt: 'Astor Library The Wind in the Willows cover',
    relatedBooks: ['/books/the-wind-in-the-willows/'], search: 'Wind in the Willows Grahame Pan Piper at the Gates of Dawn Rat Mole awe forgetfulness close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“the White Way of Delight”',
    description: 'Anne renaming the Avenue and Barry’s pond,: imagination as survival and the child who improves the world by naming it.',
    href: '/passage-room/anne-of-green-gables-naming/', image: '/Anne%20of%20Green%20Gables%20Main%20Cover.png', imageAlt: 'Astor Library Anne of Green Gables cover',
    relatedBooks: ['/books/anne-of-green-gables/'], search: 'Anne of Green Gables Montgomery White Way of Delight Lake of Shining Waters renaming imagination Matthew close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“buy the flowers herself”',
    description: 'The opening of Mrs Dalloway,: the plunge into memory, free indirect style, and a whole life opening from an errand.',
    href: '/passage-room/mrs-dalloway-flowers-herself/', image: '/Mrs%20Dalloway%20Main%20Cover.png', imageAlt: 'Astor Library Mrs Dalloway cover',
    relatedBooks: ['/books/mrs-dalloway/'], search: 'Mrs Dalloway Virginia Woolf buy the flowers herself Clarissa Bourton Peter Walsh free indirect style memory close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Now is the winter of our discontent”',
    description: 'The sun/son pun, the body he blames and the villain who makes the audience his confidant — Richard’s opening soliloquy.',
    href: '/passage-room/richard-iii-winter-of-our-discontent/', image: '/Richard%20III.png', imageAlt: 'Astor Library Richard III cover',
    relatedBooks: ['/books/richard-iii/'], search: 'Richard III Shakespeare winter of our discontent soliloquy Act 1 Scene 1 villain deformity determined close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“All the world’s a stage”',
    description: 'Jaques’s seven ages: the satirist’s eye, the sans that strips everything, and the old man carried on stage to refute him.',
    href: '/passage-room/as-you-like-it-seven-ages/', image: '/As%20you%20like%20it.png', imageAlt: 'Astor Library As You Like It cover',
    relatedBooks: ['/books/as-you-like-it/'], search: 'As You Like It Shakespeare Jaques all the worlds a stage seven ages of man Act 2 Scene 7 Adam Orlando close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Ay, but to die, and go we know not where”',
    description: 'Claudio’s speech on death and Isabella’s fury,: the kneaded clod, the thick-ribbed ice and the plea that darkens a comedy.',
    href: '/passage-room/measure-for-measure-to-die/', image: '/Measure%20for%20Measure%20Main%20Cover.png', imageAlt: 'Astor Library Measure for Measure cover',
    relatedBooks: ['/books/measure-for-measure/'], search: 'Measure for Measure Shakespeare Claudio Isabella ay but to die Act 3 Scene 1 death prison problem play close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“The barge she sat in, like a burnished throne”',
    description: 'Love-sick winds, fans that heat what they cool and the cynic who cannot stop describing her — Enobarbus on Cleopatra at the Cydnus,.',
    href: '/passage-room/antony-and-cleopatra-the-barge/', image: '/Antony%20and%20Cleopatra.png', imageAlt: 'Astor Library Antony and Cleopatra cover',
    relatedBooks: ['/books/antony-and-cleopatra/'], search: 'Antony and Cleopatra Shakespeare Enobarbus barge burnished throne Cydnus Act 2 Scene 2 Plutarch description close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Things fall apart; the centre cannot hold”',
    description: 'Yeats’s The Second Coming as printed in 1921,: the gyre, the ceremony of innocence, Spiritus Mundi and the rough beast.',
    href: '/passage-room/yeats-the-second-coming/', image: '/Michael%20Robartes%20Main%20Cover.png', imageAlt: 'Astor Library Michael Robartes and the Dancer cover',
    relatedBooks: ['/books/michael-robartes-and-the-dancer/'], search: 'Yeats Second Coming things fall apart centre cannot hold gyre rough beast Bethlehem Michael Robartes 1921 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Arms, and the man I sing”',
    description: 'The opening of the Aeneid in Dryden’s translation,: the first three words, Juno’s hatred and the question about heavenly spite.',
    href: '/passage-room/aeneid-arms-and-the-man/', image: '/The%20Aeneid.png', imageAlt: 'Astor Library The Aeneid cover',
    relatedBooks: ['/books/the-aeneid/'], search: 'Aeneid Virgil Dryden arms and the man I sing Book 1 opening Juno Rome epic invocation close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“your sheep… may be said now to devour men”',
    description: 'The mild sheep turned man-eaters, the abbots in the dock and a Tudor argument about who makes the poor — More on enclosure.',
    href: '/passage-room/utopia-sheep-devour-men/', image: '/Utopia.png', imageAlt: 'Astor Library Utopia cover',
    relatedBooks: ['/books/utopia/'], search: 'Utopia Thomas More sheep devour men enclosure Hythloday Book 1 Cardinal Morton theft Tudor social criticism close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“A wonderful serenity has taken possession of my entire soul”',
    description: 'Werther’s letter of 10 May: the artist who cannot draw, nature as sanctuary and the longing that already contains the ending.',
    href: '/passage-room/werther-wonderful-serenity/', image: '/The%20Sorrows%20of%20Young%20Werther%20Main%20Cover.png', imageAlt: 'Astor Library The Sorrows of Young Werther cover',
    relatedBooks: ['/books/the-sorrows-of-young-werther/'], search: 'Sorrows of Young Werther Goethe letter May 10 wonderful serenity nature artist Romantic epistolary close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Don’t wonder to see the paper so blotted”',
    description: 'The first letter of Pamela: trouble and comfort, a servant qualified above her degree, the blotted page and the master who takes her hand.',
    href: '/passage-room/pamela-dear-father-and-mother/', image: '/Pamela.png', imageAlt: 'Astor Library Pamela cover',
    relatedBooks: ['/books/pamela/'], search: 'Pamela Richardson Letter 1 dear father and mother blotted paper epistolary writing to the moment Shamela close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“people always live for ever when there is an annuity”',
    description: 'The arithmetic of selfishness and Austen’s deadliest comic scene — John and Fanny Dashwood talking three thousand pounds down to nothing,.',
    href: '/passage-room/sense-and-sensibility-annuity/', image: '/0002_1_use-the-don-juan-cover-as-an-exact-colou_sMgaBHLlUme1jzOdjH5LaA_aUz8n_6YSzut1qW8z3QwNg_cover.png', imageAlt: 'Astor Library Sense and Sensibility cover',
    relatedBooks: ['/books/sense-and-sensibility/'], search: 'Sense and Sensibility Austen John Dashwood Fanny annuity Chapter 2 three thousand pounds money comedy close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“each time it was a different story”',
    description: 'The opening of Ethan Frome: a story told in pieces, the ruin of a man, the lameness like a chain and a frame narrator who admits his doubts.',
    href: '/passage-room/ethan-frome-bit-by-bit/', image: '/Ethan%20Frome%20Main%20Cover.png', imageAlt: 'Astor Library Ethan Frome cover',
    relatedBooks: ['/books/ethan-frome/'], search: 'Ethan Frome Wharton opening bit by bit Starkfield frame narrator lameness chain close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“For the life of him he could not remember”',
    description: 'The ending of Mansfield’s The Fly: the boss and the inkpot, the grinding wretchedness and the forgetting that closes the story.',
    href: '/passage-room/the-fly-he-could-not-remember/', image: '/The%20Doves%27%20Nest%20and%20Other%20Stories%20Main%20COver.png', imageAlt: 'Astor Library The Doves’ Nest cover',
    relatedBooks: ['/books/the-doves-nest-and-other-stories/'], search: 'The Fly Katherine Mansfield Doves Nest boss inkpot son war grief forgetting ending short story close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“What is honour? A word.”',
    description: 'The question-and-answer form, the man who died a Wednesday and the scutcheon that ends the argument — Falstaff’s catechism on honour before Shrewsbury,.',
    href: '/passage-room/henry-iv-what-is-honour/', image: '/Henry%20IV,%20Part%201.png', imageAlt: 'Astor Library Henry IV Part 1 cover',
    relatedBooks: ['/books/henry-iv-part-1/', '/books/henry-iv-parts-1-and-2/'], search: 'Henry IV Part 1 Shakespeare Falstaff what is honour a word catechism Shrewsbury Act 5 Scene 1 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“O, she’s warm!”',
    description: 'The statue scene of The Winter’s Tale: awakened faith, Paulina’s spell and a resurrection the play calls an art lawful as eating.',
    href: '/passage-room/winters-tale-she-is-warm/', image: '/The%20Winter%27s%20Tale%20Main%20COver.png', imageAlt: 'Astor Library The Winter’s Tale cover',
    relatedBooks: ['/books/the-winters-tale/'], search: 'Winters Tale Shakespeare statue scene Hermione Paulina awake your faith O shes warm Act 5 Scene 3 romance close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“This can be no trick”',
    description: 'Benedick talking himself into love: the overheard trick, the appetite that alters, paper bullets of the brain and the world that must be peopled.',
    href: '/passage-room/much-ado-this-can-be-no-trick/', image: '/Much%20Ado%20About%20Nothing.png', imageAlt: 'Astor Library Much Ado About Nothing cover',
    relatedBooks: ['/books/much-ado-about-nothing/'], search: 'Much Ado About Nothing Shakespeare Benedick this can be no trick world must be peopled gulling Act 2 Scene 3 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“I banish you!”',
    description: 'The common cry of curs, the reversal that banishes Rome and the exit line “There is a world elsewhere” — Coriolanus’s reply to his banishment.',
    href: '/passage-room/coriolanus-i-banish-you/', image: '/Coriolanus.png', imageAlt: 'Astor Library Coriolanus cover',
    relatedBooks: ['/books/coriolanus/'], search: 'Coriolanus Shakespeare I banish you world elsewhere common cry of curs Act 3 Scene 3 banishment tribunes close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Golden lads and girls all must, / As chimney-sweepers, come to dust”',
    description: 'The dirge from Cymbeline: the wages of a worldly task, the reed and the oak, and a funeral song sung over someone who is not dead.',
    href: '/passage-room/cymbeline-fear-no-more/', image: '/Cymbeline%20Main%20Cover.png', imageAlt: 'Astor Library Cymbeline cover',
    relatedBooks: ['/books/cymbeline/'], search: 'Cymbeline Shakespeare fear no more the heat of the sun dirge golden lads chimney-sweepers Imogen Act 4 Scene 2 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“O tiger’s heart wrapped in a woman’s hide!”',
    description: 'York’s speech to Queen Margaret: the she-wolf of France, the bloody handkerchief and the line Robert Greene turned against Shakespeare.',
    href: '/passage-room/henry-vi-tigers-heart/', image: '/Henry%20VI%2C%20Part%203.png', imageAlt: 'Astor Library Henry VI Part 3 cover',
    relatedBooks: ['/books/henry-vi-part-3/', '/books/henry-vi-parts-1-2-and-3/'], search: 'Henry VI Part 3 Shakespeare York Margaret tigers heart womans hide Rutland Greene upstart crow Act 1 Scene 4 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Time’s glory is to calm contending kings”',
    description: 'The catalogue of Time’s offices, worm-holes in monuments, and a woman arguing with an abstraction because no one else will listen — Lucrece’s apostrophe to Time.',
    href: '/passage-room/lucrece-times-glory/', image: '/The%20Rape%20of%20Lucrece%20Main%20Cover.png', imageAlt: 'Astor Library The Rape of Lucrece cover',
    relatedBooks: ['/books/the-rape-of-lucrece/', '/books/the-rape-of-lucrece-and-venus-and-adonis/'], search: 'Rape of Lucrece Shakespeare Times glory calm contending kings apostrophe rhyme royal narrative poem close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Grief fills the room up of my absent child”',
    description: 'Constance’s speech on grief: the empty garments stuffed out with form, the men who call her too fond of sorrow, and the unbound hair.',
    href: '/passage-room/king-john-grief-fills-the-room/', image: '/King%20John%20Main%20Cover.jpg', imageAlt: 'Astor Library King John cover',
    relatedBooks: ['/books/king-john/'], search: 'King John Shakespeare Constance grief fills the room up absent child Arthur Act 3 Scene 4 mourning close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Which is it to-day, morphine or cocaine?”',
    description: 'The opening of The Sign of the Four: Holmes’s cocaine, Watson’s medical protest and a detective who takes drugs against the dull routine of existence.',
    href: '/passage-room/sign-of-four-seven-per-cent/', image: '/The%20SIgn%20Of%20Four.png', imageAlt: 'Astor Library The Sign of the Four cover',
    relatedBooks: ['/books/sign-of-four/'], search: 'Sign of the Four Conan Doyle Holmes cocaine seven per cent solution Watson opening Chapter 1 detective close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“The cognomen of Crane was not inapplicable”',
    description: 'The weather-cock head, the genius of famine and the scarecrow eloped from a cornfield — Irving’s portrait of Ichabod Crane.',
    href: '/passage-room/sleepy-hollow-ichabod-crane/', image: '/Sleepy%20Hollow%20Main%20Cover.png', imageAlt: 'Astor Library Sleepy Hollow cover',
    relatedBooks: ['/books/sleepy-hollow-and-other-stories/'], search: 'Legend of Sleepy Hollow Washington Irving Ichabod Crane portrait scarecrow weather-cock caricature close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“he does say Victoria, and lo! it is Victoria”',
    description: 'Syme’s defence of the railway timetable: the poetry of order, the wild arrow and the wild engine, and chaos as dullness.',
    href: '/passage-room/man-who-was-thursday-victoria/', image: '/The%20Man%20Who%20Was%20Thursday.png', imageAlt: 'Astor Library The Man Who Was Thursday cover',
    relatedBooks: ['/books/the-man-who-was-thursday/'], search: 'Man Who Was Thursday Chesterton Syme Gregory Victoria timetable Bradshaw paradox order anarchy Chapter 1 close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Lord keep my Memory green.”',
    description: 'The ending of Dickens’s last Christmas book: a narrator who says nothing, the shadows that change the room, and the portrait under holly.',
    href: '/passage-room/haunted-man-memory-green/', image: '/The%20Haunted%20Man%20and%20the%20Ghost%27s%20Bargain%20Main%20Cover.png', imageAlt: 'Astor Library The Haunted Man cover',
    relatedBooks: ['/books/the-haunted-man-and-the-ghosts-bargain/', '/books/dickens-at-christmas/'], search: 'Haunted Man Ghosts Bargain Dickens Christmas book ending Lord keep my memory green Redlaw Milly portrait holly close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Uneasy lies the head that wears a crown”',
    description: 'The ship-boy on the mast, the watch-case and a usurper’s guilt — the sleepless king’s apostrophe to sleep.',
    href: '/passage-room/henry-iv-part-2-uneasy-lies-the-head/', image: '/Henry%20IV%20part%202%20Main.jpeg', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/henry-iv-part-2/'], search: 'Henry IV Part 2 Shakespeare uneasy lies the head sleep Act 3 Scene 1 ship-boy insomnia king close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Farewell? A long farewell to all my greatness!”',
    description: 'Wolsey’s fall: the three-day plant, boys on bladders, the sea of glory and the fall like Lucifer.',
    href: '/passage-room/henry-viii-long-farewell/', image: '/Henry%20VIII%20Main%20Cover.jpg', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/henry-viii/'], search: 'Henry VIII Shakespeare Fletcher Wolsey long farewell greatness Act 3 Scene 2 fall Lucifer close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Take but degree away, untune that string”',
    description: 'Ulysses on degree: the untuned string, the universal wolf and the schemer who preaches order.',
    href: '/passage-room/troilus-and-cressida-degree/', image: '/Troilus%20and%20Cressida%20Main.png', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/troilus-and-cressida/'], search: 'Troilus and Cressida Shakespeare Ulysses degree untune the string universal wolf Act 1 Scene 3 hierarchy close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Thus much of this will make black white, foul fair”',
    description: 'The yellow slave, the inversions money performs and the speech Marx quoted — Timon and the gold.',
    href: '/passage-room/timon-of-athens-gold/', image: '/Timon%20of%20Athens%20Main.png', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/timon-of-athens/'], search: 'Timon of Athens Shakespeare Middleton gold yellow slave black white Act 4 Scene 3 money Marx close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“I am the sea. Hark how her sighs doth flow!”',
    description: 'Titus refusing reason: bottomless grief, the weeping welkin and a messenger with two heads and a hand.',
    href: '/passage-room/titus-andronicus-i-am-the-sea/', image: '/Titus%20Andronicus.png', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/titus-andronicus/'], search: 'Titus Andronicus Shakespeare I am the sea reason grief Act 3 Scene 1 Lavinia revenge close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Thy husband is thy lord, thy life, thy keeper”',
    description: 'Katherina’s last speech: the troubled fountain, subject and prince, and four centuries of argument about whether she means it.',
    href: '/passage-room/taming-of-the-shrew-thy-husband-is-thy-lord/', image: '/The%20Taming%20of%20the%20Shrew%20Main%20Cover.jpg', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/taming-of-the-shrew/'], search: 'Taming of the Shrew Shakespeare Katherina obedience husband is thy lord Act 5 Scene 2 Kate wager close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“I to the world am like a drop of water”',
    description: 'The drop that seeks another drop and a farce that opens on lost identity — Antipholus alone in Ephesus.',
    href: '/passage-room/comedy-of-errors-drop-of-water/', image: '/Comedy%20of%20Errors%20%28Main%20Page%29.png', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/comedy-of-errors/'], search: 'Comedy of Errors Shakespeare Antipholus drop of water identity twins Act 1 Scene 2 Ephesus close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“From women’s eyes this doctrine I derive”',
    description: 'Berowne’s defence of breaking the oath: Promethean fire, women as academes and a play that will not let him win.',
    href: '/passage-room/loves-labours-lost-womens-eyes/', image: '/Love%27s%20Labour%27s%20Lost%20Main%20Cover.jpg', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/loves-labours-lost/'], search: 'Loves Labours Lost Shakespeare Berowne from womens eyes oath Promethean fire Act 4 Scene 3 sophistry close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Our remedies oft in ourselves do lie”',
    description: 'Helena resolving to act: the fated sky that gives free scope and the most self-reliant heroine in the comedies.',
    href: '/passage-room/alls-well-our-remedies/', image: '/Alls%20Well%20That%20Ends%20Well%20Main%20Cover.png', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/alls-well-that-ends-well/'], search: 'Alls Well That Ends Well Shakespeare Helena our remedies in ourselves Act 1 Scene 1 king project close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“the sourest-natured dog that lives”',
    description: 'The shoes that are parents, “I am the dog”, and the first great clown speech — Launce’s farewell with his dog Crab.',
    href: '/passage-room/two-gentlemen-launce-and-crab/', image: '/Two%20Gentleman%20of%20Verona%20Main%20Cover.png', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/the-two-gentlemen-of-verona/'], search: 'Two Gentlemen of Verona Shakespeare Launce Crab dog Act 2 Scene 3 clown malapropism close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“Hunting he lov’d, but love he laugh’d to scorn”',
    description: 'The opening of Venus and Adonis: the sun taking leave, the goddess as bold-faced suitor and the poem that made Shakespeare famous.',
    href: '/passage-room/venus-and-adonis-purple-coloured-face/', image: '/Venus%20and%20Adonis%20Main%20Cover.png', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/venus-and-adonis/'], search: 'Venus and Adonis Shakespeare narrative poem opening Adonis goddess suitor 1593 Southampton close reading'
  },
  {
    type: 'passage', typeLabel: 'Close reading', title: '“The kettle began it!”',
    description: 'The opening of Dickens’s third Christmas book: a narrator who argues with a character about a kettle and the Dutch clock.',
    href: '/passage-room/cricket-on-the-hearth-the-kettle-began-it/', image: '/Cricket%20on%20the%20Hearth.png', imageAlt: 'Astor Library cover',
    relatedBooks: ['/books/cricket-on-the-hearth/'], search: 'Cricket on the Hearth Dickens kettle began it Christmas book narrator Peerybingle Dutch clock close reading'
  },
];

if (!books.length || !authors.length || !resources.length || !studyEditions.length || !collections.length || !subjects.length || !passages.length) {
  throw new Error('Discovery could not find every kind of content: ' + JSON.stringify({
    books: books.length,
    authors: authors.length,
    resources: resources.length,
    studyEditions: studyEditions.length,
    collections: collections.length,
    subjects: subjects.length,
    passages: passages.length
  }));
}

const seasons = require('./seasonal-helpers').discoveryEntries(books);
const entries = passages.concat(subjects, books, authors, resources, studyEditions, collections, seasons);
const index = {
  counts: {
    books: books.length,
    authors: authors.length,
    subjects: subjects.length,
    resources: resources.length,
    studyEditions: studyEditions.length,
    collections: collections.length,
    passages: passages.length,
    seasons: seasons.length,
    entries: entries.length
  },
  books: books,
  authors: authors,
  subjects: subjects,
  resources: resources,
  studyEditions: studyEditions,
  collections: collections,
  passages: passages,
  seasons: seasons
};

fs.writeFileSync(path.join(root, 'assets/content-index.json'), JSON.stringify(index, null, 2) + '\n');

const typeCtas = {
  season: 'Explore the seasonal collection',
  author: 'Read the writer page',
  book: 'Open the book',
  collection: 'Browse the collection',
  passage: 'Read with the notes',
  resource: 'Read the guide',
  study: 'View the edition',
  subject: 'Open the subject guide'
};

const entryCards = entries.map(function (entry) {
  const detail = entry.author ? entry.author + ' · ' + entry.collection : entry.type === 'author' ? entry.bookCount + (entry.bookCount === 1 ? ' book' : ' books') : entry.typeLabel;
  const search = [entry.search, entry.typeLabel].join(' ').toLocaleLowerCase();
  const image = entry.image
    ? '<img src="' + escapeHtml(entry.image) + '" alt="' + escapeHtml(entry.imageAlt || '') + '" width="240" height="360" loading="lazy">'
    : '<span class="explore-card-no-image" aria-hidden="true">A</span>';

  // A result that leaves the site (a study edition with no on-site page yet)
  // must say so; an internal-looking label in front of a retailer link
  // misleads the reader.
  const external = /^https?:\/\//i.test(entry.href);
  const cta = external ? 'Buy / view on Amazon <span aria-hidden="true">&nearr;</span>' : typeCtas[entry.type] + ' <span aria-hidden="true">&rarr;</span>';
  return '<article class="explore-card explore-card-' + entry.type + '" data-type="' + entry.type + '" data-search="' + escapeHtml(search) + '">' +
    '<a href="' + escapeHtml(entry.href) + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
    '<div class="explore-card-image">' + image + '</div>' +
    '<div class="explore-card-copy">' +
    '<p class="explore-kind">' + escapeHtml(detail) + '</p>' +
    '<h2>' + escapeHtml(entry.title) + '</h2>' +
    '<p>' + escapeHtml(entry.description) + '</p>' +
    '<span class="home-text-link">' + cta + '</span>' +
    '</div></a></article>';
}).join('');

const exploreHtml = '<!doctype html><html lang="en"><head>' +
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>Search the Catalogue | Astor Library</title>' +
  '<meta name="description" content="Search Astor Library books, close readings, writers, subject guides, free literature resources and study editions in one place.">' +
  '<link rel="stylesheet" href="/assets/styles.css"><style>.explore-paths{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:1050px){.explore-paths{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.explore-paths{grid-template-columns:1fr}}</style><script src="/assets/explore.js" defer></script>' +
  '</head><body>' + siteHeader() +
  '<main class="page-wrap explore-page">' +
  '<section class="explore-hero"><div><p class="kicker">Books, passages, guides and editions</p><h1>Search the catalogue.</h1>' +
  '<p class="deck">Search ' + books.length + ' books, ' + passages.length + ' close readings, ' + subjects.length + ' subject guides, ' + authors.length + ' writers, ' + resources.length + ' free guides and ' + studyEditions.length + ' study editions by title, writer, period, subject or resource type. Press the slash key anywhere on the site to search without leaving the page.</p></div>' +
  '<aside class="explore-hero-note"><p>Use the search field for a title or subject. Use the filters to limit results to books, guides, study editions, authors, passages or collections.</p></aside></section>' +
  '<section class="explore-tools" aria-label="Search everything">' +
  '<label for="explore-search">What are you looking for?</label>' +
  '<div class="explore-search-row"><input id="explore-search" type="search" autocomplete="off" placeholder="Try Austen, tragedy, quotation or Gothic"><p id="explore-count" aria-live="polite">' + entries.length + ' results</p></div>' +
  '<div class="explore-filters">' +
  '<button type="button" class="explore-filter is-active" data-filter="all" aria-pressed="true">Everything</button>' +
  '<button type="button" class="explore-filter" data-filter="book" aria-pressed="false">Books</button>' +
  '<button type="button" class="explore-filter" data-filter="passage" aria-pressed="false">Close readings</button>' +
  '<button type="button" class="explore-filter" data-filter="subject" aria-pressed="false">Subjects</button>' +
  '<button type="button" class="explore-filter" data-filter="author" aria-pressed="false">Writers</button>' +
  '<button type="button" class="explore-filter" data-filter="resource" aria-pressed="false">Free guides</button>' +
  '<button type="button" class="explore-filter" data-filter="study" aria-pressed="false">Study editions</button>' +
  '<button type="button" class="explore-filter" data-filter="season" aria-pressed="false">Seasons</button>' +
  '<button type="button" class="explore-filter" data-filter="collection" aria-pressed="false">Collections</button>' +
  '</div></section>' +
  '<section class="explore-paths" aria-label="Ways into Astor Library">' +
  '<a href="/seasons/"><span>The seasonal library</span><p>Books and resources for Halloween, Christmas, Bonfire Night and the changing seasons.</p></a>' +
  '<a href="/passage-room/"><span>Annotated passages</span><p>Short extracts with notes on language, structure and context.</p></a>' +
  '<a href="/library/"><span>Main editions</span><p>Complete texts and book pages listing the material included in each edition.</p></a>' +
  '<a href="/subjects/"><span>Subject guides</span><p>Guides to comedy, Gothic, tragedy, detective fiction, epic, satire, narration, slavery and freedom.</p></a>' +
  '<a href="/authors/"><span>Author pages</span><p>A life, the publication history, and every Astor edition by that writer.</p></a>' +
  '<a href="/study/"><span>Study editions</span><p>The complete text, with the summaries, quotations, criticism and model paragraphs an essay needs.</p></a>' +
  '<a href="/resources/"><span>Free guides</span><p>Online guides to individual texts, passages, themes and historical contexts.</p></a>' +
  '<a href="/reading-routes/"><span>Cross-period reading lists</span><p>Book lists organised around home, freedom, fear, power, evidence, voice and knowledge.</p></a>' +
  '<a href="/explore/quotations/"><span>Quotation explorer</span><p>Every quotation in the catalogue. Filter by book, theme, character or period.</p></a>' +
  '<a href="/explore/timeline/"><span>Literature timeline</span><p>Every book on one scale, beside everything written at the same time.</p></a>' +
  '<a href="/explore/characters/"><span>Character maps</span><p>Who is tied to whom, and how it changes act by act.</p></a>' +
  '<a href="/explore/themes/"><span>Themes across the library</span><p>Themes the books share, set out book by book.</p></a>' +
  '<a href="/explore/techniques/"><span>Technique glossary</span><p>What each term means, with a line from a book using it.</p></a>' +
  '<a href="/explore/map/"><span>Map of settings</span><p>Where the books are set, from Inverness to Transylvania.</p></a>' +
  '<a href="/explore/compare/"><span>Compare two texts</span><p>Two books side by side, with paired quotations.</p></a>' +
  '<a href="/play/"><span>Play &amp; revise</span><p>Nine revision games, flashcards and an essay planner.</p></a>' +
  '<a href="/for-teachers/"><span>For teachers</span><p>Lesson starters, printable worksheets, discussion sheets and a projector mode.</p></a>' +
  '</section>' +
  '<section class="explore-results" aria-label="Search results">' + entryCards + '</section>' +
  '<button class="explore-more" id="explore-more" type="button">Show 24 more</button>' +
  '<p class="explore-empty" id="explore-empty" hidden>No results match that search. Try a title, author, period or broader term.</p>' +
  '</main>' +
  '<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Complete classic texts, study editions and free literature resources.</p></div>' +
  '<div class="footer-links"><a href="/about/">About</a><a href="/passage-room/">Passage Room</a><a href="/subjects/">Subjects</a><a href="/authors/">Writers</a><a href="/reading-routes/">Reading routes</a><a href="/library/">All books</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></div></footer>' +
  '</body></html>';

fs.mkdirSync(path.join(root, 'explore'), { recursive: true });
fs.writeFileSync(path.join(root, 'explore/index.html'), exploreHtml);

const featuredAuthorNames = ['Charles Dickens', 'Jane Austen', 'Frederick Douglass', 'Mary Shelley', 'Arthur Conan Doyle', 'H. G. Wells', 'Mark Twain', 'William Shakespeare', 'Christopher Marlowe', 'John Milton', 'Nathaniel Hawthorne', 'Harriet Beecher Stowe'];
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
    const attribution = authorProfileData.contributorNotes?.[book.href]?.[author.title];
    return '<a href="' + escapeHtml(book.href) + '">' + escapeHtml(book.title) + (attribution ? ' <span>(' + escapeHtml(attribution) + ')</span>' : '') + '</a>';
  }).join('');
  const name = authorProfiles[author.title]
    ? '<a href="' + escapeHtml(author.href) + '">' + escapeHtml(author.title) + '</a>'
    : escapeHtml(author.title);
  return '<article class="author-directory-card" id="' + slugify(author.title) + '"><p class="author-directory-count">' + author.bookCount + (author.bookCount === 1 ? ' book' : ' books') + '</p><h2>' + name + '</h2><div class="author-book-links">' + bookLinks + '</div></article>';
}).join('');

const authorsHtml = '<!doctype html><html lang="en"><head>' +
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>Classic Authors and Writers | Astor Library</title><meta name="description" content="Author pages with biographical information, publication context, literary analysis and links to every Astor Library edition by each writer.">' +
  '<link rel="stylesheet" href="/assets/styles.css"></head><body>' + siteHeader() +
  '<main class="page-wrap authors-page"><section class="authors-hero"><div><p class="kicker">Authors and editions</p><h1>Authors represented in Astor Library.</h1><p class="deck">Author pages include biographical information, publication context, discussion of literary form and links to the writer’s books, guides and study editions.</p><div class="button-row"><a class="button primary" href="#all-writers">See every writer</a><a class="button secondary" href="/library/">Browse all books</a></div></div><div class="authors-hero-shelf" aria-hidden="true"><img src="/Great%20Expectations.png" alt=""><img src="/Pride%20and%20Prejudice.png" alt=""><img src="/Adventures%20of%20Sherlock%20Holmes.png" alt=""></div></section>' +
  '<section class="authors-intro"><p>Writer pages include full biographical guides and concise catalogues of available books. Anthologies are also listed under their named contributors.</p></section>' +
  '<section class="featured-authors" aria-labelledby="featured-authors-title"><div class="section-title"><p class="kicker">Detailed pages</p><h2 id="featured-authors-title">Author biographies and reading guides.</h2></div>' + featuredAuthorCards + '</section>' +
  '<section class="author-directory" id="all-writers" aria-labelledby="all-writers-title"><div class="author-directory-head"><div><p class="kicker">Author directory</p><h2 id="all-writers-title">All authors.</h2></div><p>' + authors.length + ' writers currently appear in Astor Library. Every entry links to the relevant books and collections.</p></div><div class="author-directory-grid">' + authorDirectoryCards + '</div></section>' +
  '</main><footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Author pages, complete classic texts and study resources.</p></div><div class="footer-links"><a href="/library/">All books</a><a href="/explore/">Search</a><a href="/reading-routes/">Reading routes</a><a href="/resources/">Free resources</a></div></footer></body></html>';

fs.mkdirSync(path.join(root, 'authors'), { recursive: true });
fs.writeFileSync(path.join(root, 'authors/index.html'), authorsHtml);

const collectionSections = collections.map(function (collection) {
  const collectionBooks = collection.relatedBooks?.length
    ? collection.relatedBooks.map(function (href) { return books.find(function (book) { return book.href === href; }); }).filter(Boolean)
    : books.filter(function (book) { return book.collection === collection.title; });
  const links = collectionBooks
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
  .map(function (edition) {
    const external = /^https?:\/\//i.test(edition.href);
    const label = external ? edition.typeLabel + ' · on Amazon &nearr;' : edition.typeLabel;
    return '<a href="' + escapeHtml(edition.href) + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '><span>' + escapeHtml(edition.title) + '</span><small>' + label + '</small></a>';
  })
  .join('');

const authorLinks = authors
  .map(function (author) { return '<a href="' + escapeHtml(author.href) + '"><span>' + escapeHtml(author.title) + '</span><small>' + author.bookCount + (author.bookCount === 1 ? ' book' : ' books') + '</small></a>'; })
  .join('');

const subjectLinks = subjects
  .map(function (subject) { return '<a href="' + escapeHtml(subject.href) + '"><span>' + escapeHtml(subject.title) + '</span><small>' + subject.bookCount + (subject.bookCount === 1 ? ' book' : ' books') + ' in the guide</small></a>'; })
  .join('');

const passageLinks = passages
  .map(function (passage) { return '<a href="' + escapeHtml(passage.href) + '"><span>' + escapeHtml(passage.title) + '</span><small>' + escapeHtml(passage.typeLabel) + '</small></a>'; })
  .join('');

const siteIndexHtml = '<!doctype html><html lang="en"><head>' +
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>Site Index | Astor Library</title><meta name="description" content="A complete, crawlable index of Astor Library books, close readings, writers, subject guides, free guides, study editions and reading routes.">' +
  '<link rel="stylesheet" href="/assets/styles.css"><style>' +
  '.site-index-quick{display:flex;gap:10px;flex-wrap:wrap;margin:30px 0 60px}.site-index-quick a{font-family:system-ui,-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-weight:800;color:var(--burgundy);border:1px solid var(--line);background:#fff8ef;padding:10px 13px;text-decoration:none}.index-group{border-top:1px solid var(--line);padding:38px 0 14px}.index-group h2{font-size:clamp(34px,5vw,58px);line-height:.95;letter-spacing:-.04em;margin:0 0 22px}.index-group h2 a{text-decoration:none}.index-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.index-links>a{display:flex;flex-direction:column;gap:6px;min-height:92px;border:1px solid var(--line);background:rgba(255,248,239,.86);padding:15px;text-decoration:none}.index-links span{font-size:21px;font-weight:700;line-height:1.08}.index-links small{font-family:system-ui,-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;color:var(--muted);line-height:1.35}@media(max-width:820px){.index-links{grid-template-columns:1fr}}' +
  '</style></head><body>' + siteHeader() +
  '<main class="page-wrap"><section class="page-intro"><div><p class="kicker">Complete directory</p><h1>Site index.</h1><p class="deck">Links to every book, close reading, writer, subject guide, free resource, study edition and collection currently available from Astor Library.</p></div><aside class="source-note"><p><strong>' + books.length + ' books, ' + passages.length + ' close readings, ' + subjects.length + ' subject guides, ' + authors.length + ' writers, ' + resources.length + ' free guides and ' + studyEditions.length + ' study editions, plus twenty-two study tools.</strong> Use the catalogue search to filter these entries, or browse the sections below.</p><div class="button-row"><a class="button primary" href="/explore/">Search everything</a><a class="button secondary" href="/passage-room/">Read a passage</a></div></aside></section>' +
  '<nav class="site-index-quick" aria-label="Site index sections"><a href="#seasons">Seasons</a><a href="#passages">Close readings</a><a href="#subjects">Subjects</a><a href="#writers">Writers</a><a href="#books">Books by collection</a><a href="#free-guides">Free guides</a><a href="#study-editions">Study editions</a><a href="#tools">Study tools</a><a href="/about/">About Astor Library</a><a href="/editorial/">Editorial standards</a></nav>' +
  // The tools are part of the site and belong in a page that calls itself a
  // complete directory; they are listed by hand because there are few of them
  // and each needs a sentence rather than a category.
  '<section class="index-group" id="tools"><h2><a href="/play/">Study tools</a></h2><div class="index-links">' + [
    ['/play/', 'Play &amp; revise', 'Nine revision games, flashcards and an essay planner'],
    ['/play/who-said-it/', 'Who said it?', 'Name the speaker of a line'],
    ['/play/fill-the-line/', 'Fill the line', 'Put the missing words back into a speech'],
    ['/play/theme-match/', 'Theme match', 'Decide which theme a quotation carries'],
    ['/play/technique-spotter/', 'Technique spotter', 'Name the device doing the work'],
    ['/play/character-identification/', 'Who is this?', 'A character described without being named'],
    ['/play/order-the-plot/', 'Order the plot', 'Put acts, chapters and scenes back in sequence'],
    ['/play/which-book/', 'Which book?', 'One line, the whole library'],
    ['/play/context-sprint/', 'Context sprint', 'Place an event in the right year'],
    ['/play/opening-lines/', 'Opening lines', 'Name the book from its first sentence'],
    ['/play/flashcards/', 'Flashcards', 'Spaced repetition over a title’s quotations'],
    ['/play/essay-forge/', 'Essay planner', 'Build a plan paragraph by paragraph'],
    ['/play/defend-the-reading/', 'Defend the reading', 'Argue a reading against the case on the other side'],
    ['/today/', 'Astor today', 'A passage, a book and five questions'],
    ['/explore/quotations/', 'Quotation explorer', 'Every checked quotation, filterable'],
    ['/explore/timeline/', 'Literature timeline', 'Each book against its historical moment'],
    ['/explore/characters/', 'Character maps', 'Relationship diagrams, act by act'],
    ['/explore/themes/', 'Themes across the library', 'One idea, handled many ways'],
    ['/explore/techniques/', 'Technique glossary', 'Terms with the evidence attached'],
    ['/explore/map/', 'Map of settings', 'Where the books happen'],
    ['/explore/compare/', 'Compare two texts', 'Shared themes and techniques side by side'],
    ['/my-library/', 'My library', 'Saved books, progress, streak and commonplace book'],
    ['/for-teachers/', 'For teachers', 'Lesson starters, worksheets and projector mode']
  ].map(tool => '<a href="' + tool[0] + '"><span>' + tool[1] + '</span><small>' + tool[2] + '</small></a>').join('') + '</div></section>' +
  '<section class="index-group" id="seasons"><h2><a href="/seasons/">The seasonal library</a></h2><div class="index-links">' + seasons.map(season => '<a href="' + season.href + '"><span>' + escapeHtml(season.title) + '</span><small>Books and resources · open all year</small></a>').join('') + '</div></section>' +
  '<section class="index-group" id="passages"><h2><a href="/passage-room/">The Passage Room</a></h2><div class="index-links">' + passageLinks + '</div></section>' +
  '<section class="index-group" id="subjects"><h2><a href="/subjects/">Subject guides</a></h2><div class="index-links">' + subjectLinks + '</div></section>' +
  '<section class="index-group" id="writers"><h2><a href="/authors/">Writers</a></h2><div class="index-links">' + authorLinks + '</div></section>' +
  '<div id="books">' + collectionSections + '</div>' +
  '<section class="index-group" id="free-guides"><h2><a href="/resources/">Free literature guides</a></h2><div class="index-links">' + resourceLinks + '</div></section>' +
  '<section class="index-group" id="study-editions"><h2><a href="/study/">Study editions</a></h2><div class="index-links">' + studyLinks + '</div></section>' +
  '</main><footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Complete classic texts, study editions and free literature resources.</p></div><div class="footer-links"><a href="/">Home</a><a href="/passage-room/">Passage Room</a><a href="/subjects/">Subjects</a><a href="/authors/">Writers</a><a href="/explore/">Explore</a><a href="/reading-routes/">Reading routes</a><a href="/resources/">Free resources</a></div></footer></body></html>';

fs.mkdirSync(path.join(root, 'site-index'), { recursive: true });
fs.writeFileSync(path.join(root, 'site-index/index.html'), siteIndexHtml);

console.log('Rebuilt discovery with ' + entries.length + ' searchable entries.');

require('./rebuild-author-catalogue')(authors, siteHeader);

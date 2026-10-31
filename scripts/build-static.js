const fs = require('fs');
const path = require('path');
const authorProfileData = require('./author-profiles');
const { metadata: pageMetadata } = require('./seo-validation');
const { hardbacks } = require('./format-release-data');
const { bookEditionSchemas, paperbackEditionSchema } = require('./book-edition-schema');
const septemberCatalogue = require('./september-catalogue-data.json');
const conciseCatalogue = require('./concise-catalogue-data.json');
const octoberCatalogue = require('./october-catalogue-data.json');
const { seasons, booksFor, hrefFor } = require('./seasonal-helpers');
const { loadBooks } = require('./book-data');
const { accentFor, motifSvg, motifSvgByName, motifName, identityFor } = require('./book-motifs');
const { restructureBookPage } = require('./book-page');
const { plainHubPage } = require('./hub-pages');
const { searchDescription } = require('./text-excerpt');

const root = process.cwd();
const seasonalStylesVersion = require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/seasons.css'))).digest('hex').slice(0, 10);
// Every other stylesheet and shared script is stamped with a hash of its own
// contents. A reader holding an hour-old stylesheet with a fresh script is how
// the map came to have no height at all on a phone; a changed file now arrives
// under a new address and cannot be served from a stale cache.
const assetVersions = new Map();
function versionOf(assetPath) {
  if (!assetVersions.has(assetPath)) {
    const file = path.join(root, assetPath.replace(/^\//, ''));
    const hash = fs.existsSync(file)
      ? require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10)
      : '';
    assetVersions.set(assetPath, hash);
  }
  return assetVersions.get(assetPath);
}

const VERSIONED_ASSETS = [
  '/assets/styles.css', '/assets/astor-study.css', '/assets/home.css', '/assets/seasons.css',
  '/assets/account.css', '/assets/presentation-viewer.css', '/assets/site.js', '/assets/catalogue.js',
  '/assets/explore.js', '/assets/resources.js', '/assets/resource-library.js', '/assets/seasonal-theme.css',
  '/assets/theme.css', '/assets/editorial.css'
];

function versionAssets(html) {
  for (const asset of VERSIONED_ASSETS) {
    const version = versionOf(asset);
    if (!version) continue;
    const escaped = asset.replace(/[/.]/g, character => '\\' + character);
    html = html.replace(new RegExp('((?:href|src)=["\'])' + escaped + '(?:\\?[^"\']*)?(["\'])', 'g'), '$1' + asset + '?v=' + version + '$2');
  }
  return html;
}

const navigationVersion = require('crypto').createHash('sha256')
  .update(fs.readFileSync(path.join(root, 'assets/navigation.css')))
  .update(fs.readFileSync(path.join(root, 'assets/astor/palette.mjs')))
  .digest('hex').slice(0, 10);
const outDir = path.join(root, 'dist');
const SITE_URL = 'https://astorlibrary.com';
const discoveryFile = path.join(root, 'assets', 'content-index.json');
const discovery = fs.existsSync(discoveryFile)
  ? JSON.parse(fs.readFileSync(discoveryFile, 'utf8'))
  : { books: [] };
// One structured record per title drives the study toolkit injected below.
const studyData = new Map(loadBooks().map(book => [book.slug, book]));
// A record can name other book pages that present the same text; those pages
// carry the same toolkit, addressed to themselves.
const studyEditions = new Map();
for (const book of studyData.values()) {
  for (const edition of book.editions || []) studyEditions.set(edition, book);
}

const thumbnailMapFile = path.join(root, 'assets', 'book-thumbnails.json');
const bookThumbnails = fs.existsSync(thumbnailMapFile)
  ? JSON.parse(fs.readFileSync(thumbnailMapFile, 'utf8'))
  : {};
const collectionBanners = {
  '/Ancient%20and%20Epic.png': '/assets/home/ancient-epic.jpg',
  '/Renaissance%20and%20Early%20Modern.png': '/assets/home/renaissance-early-modern.jpg',
  '/Shakespeare.png': '/assets/home/shakespeare.jpg',
  '/Restoration%20and%20Enlightenment.png': '/assets/home/restoration-enlightenment.jpg',
  '/Romantic%20and%20Regency.png': '/assets/home/romantic-regency.jpg',
  '/Victorian.png': '/assets/home/victorian.jpg',
  '/American%20Classics.png': '/assets/home/american-classics.jpg',
  '/Modern%20Classics.png': '/assets/home/modern-classics.jpg',
  '/Study%20Resources.png': '/assets/home/study-editions.jpg'
};

// Social previews, JSON-LD and the image sitemap should advertise the optimised
// catalogue thumbnails, never the multi-megabyte original uploads.
function optimisedImage(imagePath) {
  if (!imagePath) return imagePath;
  return collectionBanners[imagePath] || bookThumbnails[imagePath] || imagePath;
}

const excluded = new Set([
  '.agents',
  '.git',
  '.github',
  '.gitignore',
  '.wrangler',
  '.dev.vars.example',
  'dist',
  'node_modules',
  'scripts',
  'tests',
  'supabase',
  'worker',
  'docs',
  'README.md',
  'EDITORIAL_GUIDE.md',
  'AUTH_SETUP.md',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'wrangler.toml',
  '.DS_Store'
]);

function addImageHints(tag) {
  let result = tag;
  if (!/\bloading=/.test(result)) result = result.replace('<img', '<img loading="lazy"');
  if (!/\bdecoding=/.test(result)) result = result.replace('<img', '<img decoding="async"');
  return result;
}

function promoteFirstMainImage(html) {
  const mainStart = html.search(/<main\b/i);
  if (mainStart === -1) return html;
  const beforeMain = html.slice(0, mainStart);
  // Images marked data-no-priority (large sample spreads) must not become the
  // page's highest-priority fetch; promote the first ordinary image instead.
  let promoted = false;
  const mainAndAfter = html.slice(mainStart).replace(/<img\b[^>]*>/gi, function (tag) {
    if (promoted || /\bdata-no-priority\b/i.test(tag)) return tag;
    promoted = true;
    let result = tag.replace(/\bloading="lazy"/i, 'loading="eager"');
    if (!/\bloading=/i.test(result)) result = result.replace('<img', '<img loading="eager"');
    if (!/\bfetchpriority=/i.test(result)) result = result.replace('<img', '<img fetchpriority="high"');
    return result;
  });
  return beforeMain + mainAndAfter;
}

// The widths covers in lists are actually shown at, on a phone and wider,
// measured across the site. Without them a phone took the 640px file for a
// 72px cover (sizes was the declared width, or there was no srcset at all).
const LIST_COVER_SIZES = {
  'catalog-cover': '(max-width: 560px) 72px, 88px',
  'collection-entry-cover': '(max-width: 560px) 76px, 112px',
  'hub-book-cover': '(max-width: 560px) 68px, 88px',
  'explore-card-image': '64px',
  'context-image-cover': '52px',
  'resource-thumb': '52px',
  'hub-entry-covers': '46px',
  'book-format-cover': '48px'
};

function listCoverSizes(tag, wrapper) {
  const own = tag.match(/\bclass="([^"]*)"/i)?.[1] || '';
  for (const name of (own + ' ' + wrapper).split(/\s+/)) {
    if (LIST_COVER_SIZES[name]) return LIST_COVER_SIZES[name];
  }
  return '';
}

function useBookThumbnail(tag, sourceFile, wrapper = '') {
  const source = tag.match(/\bsrc="([^"]+)"/i)?.[1];
  if (!source || /^(?:[a-z]+:|\/\/)/i.test(source)) return tag;
  const pageDirectory = path.posix.dirname(pageHref(sourceFile));
  const resolvedSource = source.startsWith('/')
    ? source
    : path.posix.resolve(pageDirectory, source);
  const alreadyThumbnail = resolvedSource.startsWith('/assets/book-thumbs/') && !/-360\.jpg$/.test(resolvedSource);
  const thumbnail = collectionBanners[resolvedSource] || bookThumbnails[resolvedSource] || (alreadyThumbnail ? resolvedSource : '');
  if (!thumbnail) return tag;
  let result = tag.replace(/\bsrc="[^"]+"/i, 'src="' + thumbnail + '"');
  // Lazy images with a declared width also get the 320px variant so small
  // cells stop downloading the 640px file. The sizes value is the declared width,
  // never "auto": browsers lay an auto-sized lazy image out at the wrong shape
  // until it decodes, which showed as squashed covers. Undeclared widths keep
  // the plain 720px source.
  const smallThumbnail = thumbnail.replace(/\.jpg$/, '-360.jpg');
  const listSizes = listCoverSizes(result, wrapper);
  if (listSizes && thumbnail.startsWith('/assets/book-thumbs/') && fs.existsSync(path.join(root, smallThumbnail.replace(/^\//, '')))) {
    return result.replace(/\s(?:srcset|sizes)="[^"]*"/gi, '')
      .replace('<img', '<img srcset="' + smallThumbnail + ' 320w, ' + thumbnail + ' 640w" sizes="' + listSizes + '"');
  }
  const declaredWidth = result.match(/\bwidth="(\d+)"/i)?.[1];
  if (declaredWidth && /\bloading="lazy"/i.test(result) && !/\bsrcset=/i.test(result) &&
      thumbnail.startsWith('/assets/book-thumbs/') &&
      fs.existsSync(path.join(root, smallThumbnail.replace(/^\//, '')))) {
    result = result.replace('<img', '<img srcset="' + smallThumbnail + ' 320w, ' + thumbnail + ' 640w" sizes="' + declaredWidth + 'px"');
  }
  return result;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeEntities(value) {
  const named = {
    amp: '&', apos: "'", copy: '©', eacute: 'é', euml: 'ë', gt: '>', hellip: '…', laquo: '«',
    ldquo: '“', lsquo: '‘', lt: '<', mdash: '—', ndash: '–', nbsp: ' ', quot: '"', raquo: '»',
    rdquo: '”', rsquo: '’'
  };
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] || entity);
}

function plainText(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\s+([:;,.!?])/g, '$1').trim());
}

function pageHref(source) {
  const relative = path.relative(root, source).split(path.sep).join('/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return '/' + relative.slice(0, -'index.html'.length);
  return '/' + relative;
}

function absoluteUrl(value) {
  const href = String(value || '/');
  if (/^https?:\/\//i.test(href)) return href;
  return SITE_URL + (href.startsWith('/') ? href : '/' + href);
}

function bookContext(source) {
  const relative = path.relative(root, source).split(path.sep).join('/');
  if (!relative.startsWith('books/') || !relative.endsWith('/index.html')) return null;

  const href = '/' + path.posix.dirname(relative) + '/';
  const book = discovery.books.find(item => item.href === href);
  if (!book) return null;
  const collection = discovery.collections?.find(item => item.title === book.collection);
  return { book, collection };
}

function resourceContext(source) {
  const href = pageHref(source);
  if (!href.startsWith('/resources/') || href === '/resources/') return null;
  const resource = discovery.resources?.find(item => item.href === href || item.legacyRoute === href);
  if (!resource) return null;
  const relatedBook = discovery.books?.find(book => resource.relatedBooks?.includes(book.href));
  return { resource, relatedBook, href };
}

function authorContext(source) {
  const href = pageHref(source);
  if (!href.startsWith('/authors/') || href === '/authors/') return null;
  const author = discovery.authors?.find(item => item.href === href);
  return author || null;
}

function subjectContext(source) {
  const href = pageHref(source);
  if (!href.startsWith('/subjects/') || href === '/subjects/') return null;
  return discovery.subjects?.find(item => item.href === href) || null;
}

function passageContext(source) {
  const href = pageHref(source);
  if (!href.startsWith('/passage-room/') || href === '/passage-room/') return null;
  return discovery.passages?.find(item => item.href === href) || null;
}

function studyContext(source) {
  const href = pageHref(source);
  if (!href.startsWith('/study/') || href === '/study/') return null;
  return discovery.studyEditions?.find(item => item.href === href) || null;
}

function addBookStructuredData(html, source) {
  const context = bookContext(source);
  if (!context) return html;
  const { book, collection } = context;
  if (!book) return html;
  const pairedFormats = hardbacks.find(edition => edition.href === book.href);
  const suppliedPaperback = [...septemberCatalogue, ...conciseCatalogue, ...octoberCatalogue].find(edition => edition.href === book.href && edition.format === 'paperback');
  const editionImageUrl = filename => absoluteUrl(optimisedImage('/' + encodeURIComponent(filename).replace(/'/g, '%27')));
  const bookAuthors = authorProfileData.authorNamesForBook(book).map(name => ({
    '@type': name === 'Astor Library' ? 'Organization' : 'Person',
    name,
    url: absoluteUrl(discovery.authors?.find(author => author.title === name)?.href || book.authorHref || '/authors/')
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: book.title + ' | Astor Library',
    description: book.description,
    url: absoluteUrl(book.href),
    inLanguage: 'en-GB',
    publisher: {
      '@type': 'Organization',
      '@id': SITE_URL + '/#organization',
      name: 'Astor Library',
      url: SITE_URL + '/'
    },
    author: {
      '@type': 'Organization',
      '@id': SITE_URL + '/#organization',
      name: 'Astor Library',
      url: SITE_URL + '/'
    },
    publishingPrinciples: absoluteUrl('/editorial/'),
    isPartOf: {
      '@type': 'CollectionPage',
      name: book.collection,
      url: absoluteUrl(collection?.href || '/library/')
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'All books', item: absoluteUrl('/library/') },
        { '@type': 'ListItem', position: 2, name: book.collection, item: absoluteUrl(collection?.href || '/library/') },
        { '@type': 'ListItem', position: 3, name: book.title, item: absoluteUrl(book.href) }
      ]
    },
    about: {
      '@type': 'Book',
      name: book.title,
      url: absoluteUrl(book.href),
      image: absoluteUrl(optimisedImage(book.image)),
      genre: (book.subjects || []).map(subject => subject.title),
      author: bookAuthors.length === 1 ? bookAuthors[0] : bookAuthors,
      ...(pairedFormats ? {
        workExample: bookEditionSchemas(pairedFormats, absoluteUrl(book.href), editionImageUrl)
      } : suppliedPaperback ? {
        workExample: [paperbackEditionSchema(suppliedPaperback, absoluteUrl(book.href), editionImageUrl)]
      } : {})
    }
  };

  const canonical = html.includes('rel="canonical"') ? '' : '<link rel="canonical" href="' + absoluteUrl(book.href) + '">';
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  const structuredData = html.includes('data-astor-book-schema')
    ? ''
    : '<script type="application/ld+json" data-astor-book-schema>' + json + '</script>';
  return html.replace('</head>', canonical + structuredData + '</head>');
}

function addAuthorStructuredData(html, source) {
  const author = authorContext(source);
  if (!author || html.includes('data-astor-author-schema')) return html;
  const profile = authorProfileData.find(item => item.name === author.title);
  const dates = profile || {};
  const description = plainText(html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] || author.description);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: author.title + ' | Astor Library',
    description,
    url: absoluteUrl(author.href),
    inLanguage: 'en-GB',
    isPartOf: { '@type': 'CollectionPage', name: 'Writers in Astor Library', url: absoluteUrl('/authors/') },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Writers', item: absoluteUrl('/authors/') },
        { '@type': 'ListItem', position: 2, name: author.title, item: absoluteUrl(author.href) }
      ]
    },
    mainEntity: {
      '@type': 'Person',
      '@id': absoluteUrl(author.href) + '#person',
      name: author.title,
      url: absoluteUrl(author.href),
      birthDate: dates.birthDate,
      deathDate: dates.deathDate,
      mainEntityOfPage: absoluteUrl(author.href),
      subjectOf: author.books.map(book => ({ '@type': 'Book', name: book.title, url: absoluteUrl(book.href), image: absoluteUrl(optimisedImage(book.image)) }))
    },
    publisher: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Astor Library', url: SITE_URL + '/' }
  };
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  return html.replace('</head>', '<script type="application/ld+json" data-astor-author-schema>' + json + '</script></head>');
}

function addResourceStructuredData(html, source) {
  const context = resourceContext(source);
  if (!context || html.includes('data-astor-resource-schema')) return html;
  const { resource, relatedBook, href } = context;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: resource.title,
    description: resource.description,
    url: absoluteUrl(href),
    sameAs: resource.externalUrl,
    image: resource.image ? absoluteUrl(optimisedImage(resource.image)) : undefined,
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
    learningResourceType: 'Study guide',
    educationalUse: ['Reading', 'Study', 'Teaching'],
    creator: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Astor Library', url: SITE_URL + '/' },
    publisher: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Astor Library', url: SITE_URL + '/' },
    publishingPrinciples: absoluteUrl('/editorial/'),
    about: relatedBook
      ? { '@type': 'Book', name: relatedBook.title, url: absoluteUrl(relatedBook.href), author: { '@type': 'Person', name: relatedBook.author } }
      : (resource.tags || []).slice(0, 4).map(name => ({ '@type': 'Thing', name })),
    isPartOf: { '@type': 'CollectionPage', name: 'Free literature resources', url: absoluteUrl('/resources/') },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Free resources', item: absoluteUrl('/resources/') },
        ...(relatedBook ? [{ '@type': 'ListItem', position: 2, name: relatedBook.title, item: absoluteUrl(relatedBook.href) }] : []),
        { '@type': 'ListItem', position: relatedBook ? 3 : 2, name: resource.title, item: absoluteUrl(href) }
      ]
    }
  };
  const canonical = html.includes('rel="canonical"') ? '' : '<link rel="canonical" href="' + absoluteUrl(href) + '">';
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  return html.replace('</head>', canonical + '<script type="application/ld+json" data-astor-resource-schema>' + json + '</script></head>');
}

function addStudyStructuredData(html, source) {
  const study = studyContext(source);
  if (!study || html.includes('data-astor-study-schema')) return html;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: study.title + ' Study Edition',
    description: study.description,
    url: absoluteUrl(study.href),
    sameAs: study.externalUrl || undefined,
    image: study.image ? absoluteUrl(optimisedImage(study.image)) : undefined,
    inLanguage: 'en-GB',
    learningResourceType: 'Study edition',
    educationalUse: ['Reading', 'Study', 'Teaching', 'Exam preparation'],
    creator: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Astor Library', url: SITE_URL + '/' },
    publisher: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Astor Library', url: SITE_URL + '/' },
    publishingPrinciples: absoluteUrl('/editorial/'),
    isPartOf: { '@type': 'CollectionPage', name: 'Astor Library Study Editions', url: absoluteUrl('/study/') },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Study editions', item: absoluteUrl('/study/') },
        { '@type': 'ListItem', position: 2, name: study.title, item: absoluteUrl(study.href) }
      ]
    }
  };
  const canonical = html.includes('rel="canonical"') ? '' : '<link rel="canonical" href="' + absoluteUrl(study.href) + '">';
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  return html.replace('</head>', canonical + '<script type="application/ld+json" data-astor-study-schema>' + json + '</script></head>');
}

function addCollectionStructuredData(html, source) {
  const href = pageHref(source);
  if (html.includes('data-astor-collection-schema')) return html;

  const collection = discovery.collections?.find(item => item.href === href);
  const subject = subjectContext(source);
  let items = [];
  let kind = '';
  const pageLinks = () => {
    const seen = new Set();
    return [...html.matchAll(/<a\b[^>]*href="(\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map(match => ({ href: match[1], title: plainText(match[2]) }))
      .filter(item => item.href !== href && item.title && !seen.has(item.href) && seen.add(item.href));
  };

  if (href === '/library/' || href === '/classic-literature/') {
    items = discovery.books || [];
    kind = 'Classic literature books';
  } else if (href === '/seasons/') {
    items = discovery.seasons || [];
    kind = 'Seasonal books and resources';
  } else if (href === '/authors/') {
    items = discovery.authors || [];
    kind = 'Classic authors and writers';
  } else if (href === '/subjects/') {
    items = discovery.subjects || [];
    kind = 'Literature subject guides';
  } else if (subject) {
    items = (discovery.books || []).filter(book => subject.relatedBooks?.includes(book.href));
    kind = subject.title + ' books';
  } else if (collection) {
    items = collection.relatedBooks?.length
      ? collection.relatedBooks.map(href => (discovery.books || []).find(book => book.href === href)).filter(Boolean)
      : (discovery.books || []).filter(book => book.collection === collection.title);
    kind = collection.title + ' books';
  } else if (href === '/resources/') {
    items = discovery.resources || [];
    kind = 'Free literature study guides';
  } else if (href === '/study/') {
    items = discovery.studyEditions || [];
    kind = 'Literature study editions';
  } else if (href === '/passage-room/') {
    items = discovery.passages || [];
    kind = 'Close readings of classic literature';
  } else if (href === '/explore/') {
    items = [
      ...(discovery.books || []),
      ...(discovery.resources || []),
      ...(discovery.studyEditions || []),
      ...(discovery.authors || []),
      ...(discovery.subjects || []),
      ...(discovery.passages || []),
      ...(discovery.seasons || [])
    ];
    kind = 'Search the Astor Library catalogue';
  } else if (href === '/reading-routes/') {
    items = pageLinks();
    kind = 'Reading routes through classic literature';
  } else if (href === '/site-index/') {
    items = pageLinks();
    kind = 'Astor Library site index';
  } else {
    return html;
  }

  const title = plainText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || kind);
  const description = plainText(html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] || kind);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: absoluteUrl(href),
    inLanguage: 'en-GB',
    isPartOf: { '@type': 'WebSite', '@id': SITE_URL + '/#website', name: 'Astor Library', url: SITE_URL + '/' },
    publisher: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Astor Library', url: SITE_URL + '/' },
    author: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Astor Library', url: SITE_URL + '/' },
    publishingPrinciples: absoluteUrl('/editorial/'),
    mainEntity: {
      '@type': 'ItemList',
      name: kind,
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: absoluteUrl(item.href)
      }))
    }
  };
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  return html.replace('</head>', '<script type="application/ld+json" data-astor-collection-schema>' + json + '</script></head>');
}

function addPassageStructuredData(html, source) {
  const passage = passageContext(source);
  if (!passage || html.includes('data-astor-passage-schema')) return html;
  const relatedBook = discovery.books?.find(book => passage.relatedBooks?.includes(book.href));
  const title = plainText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || passage.title);
  const description = plainText(html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] || passage.description);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: absoluteUrl(passage.href),
    mainEntityOfPage: absoluteUrl(passage.href),
    inLanguage: 'en-GB',
    educationalUse: ['Reading', 'Study', 'Teaching'],
    learningResourceType: 'Close reading',
    image: absoluteUrl(optimisedImage(passage.image)),
    author: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Astor Library', url: SITE_URL + '/' },
    publisher: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Astor Library', url: SITE_URL + '/', logo: { '@type': 'ImageObject', url: absoluteUrl('/icon-512.png') } },
    publishingPrinciples: absoluteUrl('/editorial/'),
    about: relatedBook ? { '@type': 'Book', name: relatedBook.title, url: absoluteUrl(relatedBook.href), author: { '@type': 'Person', name: relatedBook.author } } : undefined,
    isPartOf: { '@type': 'CollectionPage', name: 'The Passage Room', url: absoluteUrl('/passage-room/') },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'The Passage Room', item: absoluteUrl('/passage-room/') },
        ...(relatedBook ? [{ '@type': 'ListItem', position: 2, name: relatedBook.title, item: absoluteUrl(relatedBook.href) }] : []),
        { '@type': 'ListItem', position: relatedBook ? 3 : 2, name: passage.title, item: absoluteUrl(passage.href) }
      ]
    }
  };
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  return html.replace('</head>', '<script type="application/ld+json" data-astor-passage-schema>' + json + '</script></head>');
}

// Every close reading carries its book's cover in the hero, so the page
// announces which edition it belongs to before the passage is read.
function addPassageHeroCover(html, source) {
  const passage = passageContext(source);
  if (!passage || !passage.image || html.includes('class="passage-hero-cover"')) return html;
  const relatedBook = discovery.books?.find(book => passage.relatedBooks?.includes(book.href));
  const cover = optimisedImage(passage.image);
  const alt = escapeHtml(passage.imageAlt || (relatedBook ? relatedBook.title + ' cover' : 'Book cover'));
  const figure = '<a class="passage-hero-cover" href="' + (relatedBook ? relatedBook.href : '/passage-room/') + '"><img src="' + cover + '" alt="' + alt + '" width="180" height="270"></a>';
  return html.replace(/(<section class="passage-reading-hero">[\s\S]*?<aside>)/, '$1' + figure);
}

// Each reading's room is the paper treatment set on its own page; the hub is
// shelved the same way, so the related strip below a reading offers the
// nearest neighbours by author first and then by form.
const PASSAGE_FORMS = [
  ['paper-script', 'playhouse', 'Playscript'],
  ['paper-verse', 'verse', 'Verse'],
  ['paper-journal', 'manuscripts', 'Manuscript'],
  ['paper-opening', 'openings', 'Opening'],
  ['paper-closing', 'endings', 'Ending'],
  ['paper-aphorism', 'prose', 'Aphorisms']
];
function passageForm(html) {
  const classes = (html.match(/<div class="passage-paper([^"]*)"/) || [, ''])[1].split(/\s+/);
  for (const [cls, room, label] of PASSAGE_FORMS) if (classes.includes(cls)) return { room, label };
  return { room: 'prose', label: 'Prose' };
}
const passageRooms = new Map();
for (const passage of discovery.passages || []) {
  const file = path.join(root, passage.href.slice(1), 'index.html');
  if (!fs.existsSync(file)) continue;
  const book = discovery.books?.find(item => passage.relatedBooks?.includes(item.href));
  passageRooms.set(passage.href, { ...passageForm(fs.readFileSync(file, 'utf8')), author: book?.author || '', bookTitle: book?.title || '' });
}
function addPassageRelated(html, source) {
  const passage = passageContext(source);
  if (!passage || html.includes('class="passage-related"')) return html;
  const self = passageRooms.get(passage.href);
  if (!self) return html;
  const others = (discovery.passages || []).filter(item => item.href !== passage.href && passageRooms.has(item.href));
  const byAuthor = others.filter(item => self.author && passageRooms.get(item.href).author === self.author);
  const byRoom = others.filter(item => passageRooms.get(item.href).room === self.room && !byAuthor.includes(item));
  const picks = byAuthor.concat(byRoom).slice(0, 3);
  if (picks.length < 3) picks.push(...others.filter(item => !picks.includes(item)).slice(0, 3 - picks.length));
  const heading = byAuthor.length >= 2 ? 'More from ' + escapeHtml(self.author.split(' ').slice(-1)[0]) + '.' : 'Also in ' + { playhouse: 'the playhouse', verse: 'the verse room', manuscripts: 'the manuscript room', openings: 'the openings', endings: 'the endings', prose: 'the prose room' }[self.room] + '.';
  const cards = picks.map(item => {
    const info = passageRooms.get(item.href);
    return '<a href="' + item.href + '"><small>' + escapeHtml(info.label) + '</small><strong>' + item.title + '</strong><em>' + escapeHtml(info.bookTitle) + '</em></a>';
  }).join('');
  const section = '<section class="passage-related" aria-labelledby="passage-related-title"><div class="passage-related-head"><span>Keep reading</span><h2 id="passage-related-title">' + heading + '</h2></div><div class="passage-related-grid">' + cards + '</div></section>\n  ';
  return html.replace('<nav class="passage-end-nav"', section + '<nav class="passage-end-nav"');
}

const ASTOR_FOUNDER = {
  '@type': 'Person',
  name: 'Haydn Wood',
  jobTitle: 'Founder and editor',
  url: SITE_URL + '/about/#editor',
  image: SITE_URL + '/assets/about/haydn-wood-portrait-480.jpg'
};

// Search descriptions are cut to whole sentences, and a one-sentence description
// borrows the next sentence of the page's deck, so results pages show a complete thought.
function tightenSearchDescription(html) {
  const tag = html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
  if (!tag) return html;
  const current = plainText(tag[1]);
  const deck = plainText(html.match(/<p class="deck">([\s\S]*?)<\/p>/i)?.[1] || '');
  const tightened = searchDescription(current, deck);
  if (tightened === current) return html;
  const replacement = tag[0].replace(/content="[^"]*"/, 'content="' + escapeHtml(tightened) + '"');
  return html.replace(tag[0], () => replacement);
}

function addGlobalMetadata(html, source) {
  if (/http-equiv="refresh"/i.test(html)) return html;
  html = tightenSearchDescription(html);
  const href = pageHref(source);
  const title = plainText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Astor Library');
  const description = plainText(html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] || 'Complete classic texts, study editions, explanatory notes and free literature resources from Astor Library.');
  const book = bookContext(source)?.book;
  const resource = resourceContext(source)?.resource;
  const author = authorContext(source);
  const subject = subjectContext(source);
  const passage = passageContext(source);
  const study = studyContext(source);
  const season = discovery.seasons?.find(item => item.href === href);
  const imageOwner = book || resource || passage || study || author || subject || season;
  const image = optimisedImage(imageOwner?.image) || '/assets/og-logo.jpg';
  const imageAlt = imageOwner?.imageAlt || (imageOwner?.title
    ? plainText(imageOwner.title) + ', Astor Library'
    : 'Astor Library classic literature editions and resources');
  let metadata = '';
  const absoluteHref = absoluteUrl(href);
  const absoluteImage = absoluteUrl(image);
  if (!html.includes('rel="canonical"')) metadata += '<link rel="canonical" href="' + escapeHtml(absoluteHref) + '">';
  if (!/name="robots"/i.test(html)) metadata += '<meta name="robots" content="index,follow,max-image-preview:large" data-astor-global-meta>';
  if (!/property="og:site_name"/i.test(html)) metadata += '<meta property="og:site_name" content="Astor Library">';
  if (!/property="og:locale"/i.test(html)) metadata += '<meta property="og:locale" content="en_GB">';
  if (!/property="og:title"/i.test(html)) metadata += '<meta property="og:title" content="' + escapeHtml(title) + '">';
  if (!/property="og:description"/i.test(html)) metadata += '<meta property="og:description" content="' + escapeHtml(description) + '">';
  if (!/property="og:type"/i.test(html)) metadata += '<meta property="og:type" content="' + (href === '/' ? 'website' : 'article') + '">';
  if (!/property="og:url"/i.test(html)) metadata += '<meta property="og:url" content="' + escapeHtml(absoluteHref) + '">';
  if (!/property="og:image"/i.test(html)) metadata += '<meta property="og:image" content="' + escapeHtml(absoluteImage) + '">';
  if (!/property="og:image:alt"/i.test(html)) metadata += '<meta property="og:image:alt" content="' + escapeHtml(imageAlt) + '">';
  if (!/name="twitter:card"/i.test(html)) metadata += '<meta name="twitter:card" content="summary_large_image">';
  if (!/name="twitter:title"/i.test(html)) metadata += '<meta name="twitter:title" content="' + escapeHtml(title) + '">';
  if (!/name="twitter:description"/i.test(html)) metadata += '<meta name="twitter:description" content="' + escapeHtml(description) + '">';
  if (!/name="twitter:image"/i.test(html)) metadata += '<meta name="twitter:image" content="' + escapeHtml(absoluteImage) + '">';
  if (!/name="author"/i.test(html)) metadata += '<meta name="author" content="Astor Library">';
  if (!/rel="icon"/i.test(html)) {
    metadata += '<link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512">';
    metadata += '<link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48">';
    metadata += '<link rel="icon" href="/favicon.ico" sizes="any">';
    metadata += '<link rel="icon" href="/favicon.svg" type="image/svg+xml">';
    metadata += '<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">';
    metadata += '<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">';
    metadata += '<link rel="manifest" href="/site.webmanifest">';
  }
  if (!/name="theme-color"/i.test(html)) metadata += '<meta name="theme-color" content="#fffaf4">';

  if (href === '/' && !html.includes('data-astor-website-schema')) {
    const websiteSchema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': SITE_URL + '/#organization',
          name: 'Astor Library',
          alternateName: ['Astor Library Editions', 'Astor Editions', 'astorlibrary.com'],
          url: SITE_URL + '/',
          logo: { '@type': 'ImageObject', url: absoluteUrl('/icon-512.png'), width: 512, height: 512 },
          description: 'Astor Library is an independent publisher of classic literature editions, study editions and free literature resources.',
          sameAs: ['https://ko-fi.com/astorlibrary'],
          publishingPrinciples: absoluteUrl('/editorial/'),
          founder: ASTOR_FOUNDER,
          knowsAbout: ['Classic literature', 'English literature', 'Shakespeare', 'Literature study guides', 'Literature teaching resources']
        },
        {
          '@type': 'WebSite',
          '@id': SITE_URL + '/#website',
          name: 'Astor Library',
          alternateName: ['Astor Library Editions', 'Astor Editions', 'astorlibrary.com'],
          url: SITE_URL + '/',
          inLanguage: 'en-GB',
          description,
          publisher: { '@id': SITE_URL + '/#organization' },
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: SITE_URL + '/explore/?q={search_term_string}'
            },
            'query-input': 'required name=search_term_string'
          }
        }
      ]
    };
    metadata += '<script type="application/ld+json" data-astor-website-schema>' + JSON.stringify(websiteSchema).replace(/</g, '\\u003c') + '</script>';
  }
  if ((href === '/about/' || href === '/editorial/') && !html.includes('data-astor-identity-schema')) {
    const identitySchema = {
      '@context': 'https://schema.org',
      '@type': href === '/about/' ? 'AboutPage' : 'WebPage',
      name: title,
      description,
      url: absoluteHref,
      inLanguage: 'en-GB',
      author: { '@id': SITE_URL + '/#organization' },
      publisher: { '@id': SITE_URL + '/#organization' },
      about: {
        '@type': 'Organization',
        '@id': SITE_URL + '/#organization',
        name: 'Astor Library',
        alternateName: ['Astor Library Editions', 'Astor Editions'],
        url: SITE_URL + '/',
        logo: absoluteUrl('/icon-512.png'),
        sameAs: ['https://ko-fi.com/astorlibrary'],
        publishingPrinciples: absoluteUrl('/editorial/'),
        founder: ASTOR_FOUNDER
      }
    };
    metadata += '<script type="application/ld+json" data-astor-identity-schema>' + JSON.stringify(identitySchema).replace(/</g, '\\u003c') + '</script>';
  }
  return html.replace('</head>', metadata + '</head>');
}




// Aggregate a writer's close readings onto their author page — the per-book
// shelves already sit on each book page; this gathers them in one place.
function addAuthorPassageLinks(html, source) {
  const author = authorContext(source);
  if (!author || html.includes('class="author-passage-shelf"')) return html;
  const bookHrefs = new Set((author.books || []).map(book => book.href));
  const passages = (discovery.passages || []).filter(passage =>
    (passage.relatedBooks || []).some(href => bookHrefs.has(href)));
  if (!passages.length) return html;

  const shown = passages.slice(0, 8);
  const cards = shown.map(function (passage) {
    const number = String((discovery.passages || []).indexOf(passage) + 1).padStart(2, '0');
    const book = (discovery.books || []).find(item => (passage.relatedBooks || []).includes(item.href));
    return '<a href="' + escapeHtml(passage.href) + '">' +
      '<span>' + number + ' · ' + escapeHtml(book ? book.title : 'Close reading') + '</span>' +
      '<blockquote>' + escapeHtml(passage.title) + '</blockquote>' +
      '<p>' + escapeHtml(passage.description) + '</p>' +
      '<b>Read the annotated passage <span aria-hidden="true">&rarr;</span></b></a>';
  }).join('');
  const more = passages.length > shown.length
    ? '<a class="author-passage-more" href="/passage-room/">All ' + passages.length + ' close readings from this writer are in the Passage Room <span aria-hidden="true">&rarr;</span></a>'
    : '';
  const section = '<section class="book-passage-shelf author-passage-shelf" aria-labelledby="author-passage-title">' +
    '<div class="book-passage-shelf-head"><div><p class="kicker">Annotated passages</p><h2 id="author-passage-title">Close readings from this writer.</h2></div>' +
    '<p>Short passages from the writer&rsquo;s work, explained line by line.</p></div>' +
    '<div class="book-passage-grid">' + cards + '</div>' + more + '</section>';
  const anchor = html.includes('<section class="author-sources"') ? '<section class="author-sources"' : '</main>';
  return anchor === '</main>'
    ? html.replace('</main>', section + '</main>')
    : html.replace(anchor, section + anchor);
}

function addResourceReadingNavigation(html, source) {
  const context = resourceContext(source);
  if (!context) return html;
  const { resource, relatedBook } = context;
  if (!html.includes('resource-breadcrumb')) {
    const middle = relatedBook
      ? '<a href="' + escapeHtml(relatedBook.href) + '">' + escapeHtml(relatedBook.title) + '</a><span aria-hidden="true">/</span>'
      : '';
    const breadcrumb = '<nav class="book-breadcrumb resource-breadcrumb" aria-label="Breadcrumb"><a href="/resources/">Free resources</a><span aria-hidden="true">/</span>' + middle + '<span aria-current="page">' + escapeHtml(resource.title) + '</span></nav>';
    const withIntro = html.replace('<section class="page-intro"', breadcrumb + '<section class="page-intro"');
    html = withIntro === html ? html.replace(/(<main\b[^>]*>)/i, '$1' + breadcrumb) : withIntro;
  }
  if (!html.includes('resource-end-nav')) {
    const bookLink = relatedBook ? '<a href="' + escapeHtml(relatedBook.href) + '">' + escapeHtml(relatedBook.title) + ' book page</a>' : '';
    const endNav = '<nav class="book-end-nav resource-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a>' + bookLink + '<a href="/resources/">All free resources</a><a href="/site-index/">Site index</a></nav>';
    html = html.replace('</main>', endNav + '</main>');
  }
  return html;
}

function addEditorialCredit(html, source) {
  const book = bookContext(source)?.book;
  const resource = resourceContext(source)?.resource;
  if ((!book && !resource) || html.includes('class="astor-page-credit"')) return html;
  // A short catalogue page that has not yet been written up lists no sources
  // to check its claims against, so it says only where its copy came from.
  const conciseEdition = book && conciseCatalogue.find(edition => edition.href === book.href);
  const octoberEdition = book && octoberCatalogue.find(edition => edition.href === book.href);
  const copy = octoberEdition
    ? 'Edition description and paperback details checked against the Amazon listing.'
    : conciseEdition && !(conciseEdition.sources || []).length
    ? 'Edition contents and description supplied by Astor Library.'
    : book
    ? 'Dates, publication details and historical claims are checked against the sources listed on this page.'
    : 'For reading, teaching and independent study.';
  const sourcesLink = book && /\bid="sources"/.test(html) ? '<a href="#sources">The sources <span aria-hidden="true">&darr;</span></a>' : '';
  const credit = book
    ? '<aside class="astor-page-credit" aria-label="About this page"><span><b>Edited by Haydn Wood</b>' + copy + '</span>' + sourcesLink + '<a href="/about/#editor">About the editor <span aria-hidden="true">&rarr;</span></a></aside>'
    : '<aside class="astor-page-credit" aria-label="About this page"><span><b>Astor Library free guide</b>' + copy + '</span><a href="/editorial/">How we work <span aria-hidden="true">&rarr;</span></a></aside>';
  const withIntro = html.replace(/(<section class="[^"]*\bpage-intro\b[^"]*"[\s\S]*?<\/section>)/i, '$1' + credit);
  return withIntro === html ? html.replace(/(<main\b[^>]*>)/i, '$1' + credit) : withIntro;
}

// Every format of a book that can be bought: paperback, any second
// paperback edition, hardback, Kindle and Study Edition.
// scripts/book-formats.json is the only list of formats and links.
const bookFormats = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'book-formats.json'), 'utf8'));

// The Shakespeare page's genre panel listed four plays of each kind. It now
// lists every play and poem on the page, grouped by the genre each entry
// already names.
function shakespeareByGenre(html) {
  const groups = [['Histories', []], ['Comedies', []], ['Tragedies', []], ['Late plays', []], ['Poems', []]];
  const place = (label, title) => {
    if (/history/i.test(label)) return 0;
    if (/romance/i.test(label)) return 3;
    if (/poem|poetry/i.test(label)) return 4;
    if (/tragedy/i.test(label) || /^Julius Caesar$/.test(title)) return 2;
    if (/comedy|problem/i.test(label)) return 1;
    return -1;
  };
  for (const card of html.matchAll(/<article class="edition-card[^"]*">([\s\S]*?)<\/article>/g)) {
    const label = (card[1].match(/<p class="year">([^<]*)<\/p>/) || [])[1] || '';
    const title = ((card[1].match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/,\s*William Shakespeare$/, '').trim();
    const page = (card[1].match(/<a class="button primary" href="(?:\.\.)?(\/books\/[^"]+)"/) || [])[1];
    const index = place(label, title);
    if (page && title && index >= 0) groups[index][1].push('<a href="' + page + '">' + title + '</a>');
  }
  const sortKey = link => link.replace(/<[^>]+>/g, '').replace(/^The /, '');
  for (const group of groups) group[1].sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'en'));
  const table = '<div class="shakespeare-reading-table">' + groups.filter(group => group[1].length)
    .map(([name, links]) => '<article><h3>' + name + '</h3>' + links.join('') + '</article>').join('') + '</div>';
  return html
    .replace(/<div class="shakespeare-reading-table">[\s\S]*?<\/div>(?=<div class="button-row">)/, table)
    .replace('<h2 id="shakespeare-room-title">Browse the plays by genre.</h2>', '<h2 id="shakespeare-room-title">The plays and poems by genre</h2>');
}

// A period collection lists its books one under another. The page gets a
// class for the plain listing style, and its title loses the full stop and
// the "Period" label above it.
function markCollectionPage(html, source) {
  const href = pageHref(source);
  if (!(discovery.collections || []).some(item => item.href === href)) return html;
  html = html.replace(/<main\b([^>]*)\bclass="([^"]*)"/, (whole, before, classes) => '<main' + before + 'class="' + classes + ' collection-page"');
  html = html.replace(/(<section class="page-intro"><div>)<p class="kicker">[^<]*<\/p>(<h1>[\s\S]*?)\.(<\/h1>)/, '$1$2$3');
  if (href === '/shakespeare/') html = shakespeareByGenre(html);
  // Each entry is rebuilt to the same shape: the cover and the title lead to
  // the book's page, then the author, the description and where to buy it.
  // The cards had been written at different times with different labels
  // ("Paperback · author", a bare year, "Christmas book · 1844") and two
  // buttons each.
  return html.replace(/<article class="edition-card([^"]*)">([\s\S]*?)<\/article>/g, (whole, extra, body) => {
    const page = ((body.match(/<a class="button primary" href="(?:\.\.)?(\/books\/[^"]+)"/) || [])[1]);
    const book = page && (discovery.books || []).find(item => item.href === page);
    if (!book) return whole;
    const image = (body.match(/<img\b[^>]*>/) || [''])[0];
    const description = (body.match(/<\/h2>\s*<p>([\s\S]*?)<\/p>/) || [])[1] || escapeHtml(book.description || '');
    const buy = (body.match(/<a class="button secondary" href="(https?:[^"]+)"/) || [])[1];
    const author = book.authorHref
      ? '<a href="' + escapeHtml(book.authorHref) + '">' + escapeHtml(book.author) + '</a>'
      : escapeHtml(book.author || '');
    return '<article class="edition-card collection-entry' + extra + '">' +
      '<a class="collection-entry-cover" href="' + escapeHtml(page) + '" tabindex="-1" aria-hidden="true">' + image + '</a>' +
      '<div><h2><a href="' + escapeHtml(page) + '"><em>' + escapeHtml(book.title) + '</em></a></h2>' +
      (author ? '<p class="collection-entry-author">' + author + '</p>' : '') +
      '<p>' + description + '</p>' +
      (buy ? '<p class="collection-entry-links"><a href="' + escapeHtml(buy) + '" rel="noopener">Buy on Amazon</a></p>' : '') +
      '</div></article>';
  });
}

function addContextImageShelf(html, source) {
  if (html.includes('class="context-image-shelf"')) return html;
  const href = pageHref(source);
  const book = bookContext(source)?.book;
  const resource = resourceContext(source)?.resource;
  const study = studyContext(source);
  const subject = subjectContext(source);
  const passage = passageContext(source);
  let candidates = [];
  let heading = 'Related editions and guides.';
  let label = 'Related catalogue pages';

  const booksFor = routes => (routes || []).map(route => discovery.books.find(item => item.href === route)).filter(Boolean);
  const resourcesFor = routes => (discovery.resources || []).filter(item => item.relatedBooks?.some(route => routes.includes(route)));
  const studiesFor = routes => (discovery.studyEditions || []).filter(item => item.relatedBooks?.some(route => routes.includes(route)));

  if (book) {
    const routes = [book.href];
    // The paired study edition leads the shelf so the four-card cap can never
    // push a book's own study edition off its page.
    candidates = [
      ...studiesFor(routes),
      ...resourcesFor(routes),
      ...(discovery.books || []).filter(item => item.collection === book.collection && item.href !== book.href)
    ];
    label = 'For this book';
  } else if (resource) {
    const routes = resource.relatedBooks || [];
    candidates = [
      ...booksFor(routes),
      ...studiesFor(routes),
      ...resourcesFor(routes).filter(item => item.href !== resource.href)
    ];
    label = 'Books and related guides';
  } else if (study) {
    const routes = study.relatedBooks || [];
    candidates = [
      ...booksFor(routes),
      ...resourcesFor(routes),
      ...studiesFor(routes).filter(item => item.href !== study.href)
    ];
    label = 'Books and related study';
  } else if (subject) {
    candidates = booksFor(subject.relatedBooks);
    heading = 'Books in this subject.';
    label = subject.title;
  } else if (passage) {
    const routes = passage.relatedBooks || [];
    candidates = [...booksFor(routes), ...resourcesFor(routes), ...studiesFor(routes)];
    label = 'Related to this passage';
  } else {
    return html;
  }

  const seen = new Set();
  const items = candidates.filter(item => {
    if (!item?.href || !item?.image || item.href === href || seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  }).slice(0, 4);
  if (items.length < 2) return html;

  const cards = items.map(item => {
    const external = /^https?:\/\//i.test(item.href);
    const externalAttributes = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return '<a class="context-image-card" href="' + escapeHtml(item.href) + '"' + externalAttributes + '>' +
      '<span class="context-image-cover"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.imageAlt || item.title + ' cover') + '" width="360" height="576" loading="lazy"></span>' +
      '<span class="context-image-copy"><small>' + escapeHtml(item.typeLabel || 'Astor Library') + '</small><strong>' + escapeHtml(item.title) + '</strong><span class="context-image-link">Open page <span aria-hidden="true">&rarr;</span></span></span></a>';
  }).join('');

  const sectionClass = book ? 'context-image-shelf context-image-shelf-book' : 'context-image-shelf';
  const section = '<section class="' + sectionClass + '" aria-labelledby="context-image-shelf-title">' +
    '<header><p class="kicker">' + escapeHtml(label) + '</p><h2 id="context-image-shelf-title">' + escapeHtml(heading) + '</h2></header>' +
    '<div>' + cards + '</div></section>';
  const beforeEndNavigation = html.replace(/(<nav class="book-end-nav\b)/i, section + '$1');
  return beforeEndNavigation === html ? html.replace('</main>', section + '</main>') : beforeEndNavigation;
}

function addSiteIndexLink(html, source) {
  if (!html.includes('<footer')) return html;
  const href = pageHref(source);
  const links = [];
  if (href !== '/subjects/' && !html.includes('href="/subjects/"')) links.push('<a href="/subjects/">Subjects</a>');
  if (href !== '/authors/' && !html.includes('href="/authors/"')) links.push('<a href="/authors/">Writers</a>');
  if (href !== '/classic-literature/' && !html.includes('href="/classic-literature/"')) links.push('<a href="/classic-literature/">Classic literature</a>');
  if (href !== '/editorial/' && !html.includes('href="/editorial/"')) links.push('<a href="/editorial/">Editorial standards</a>');
  if (href !== '/site-index/' && !html.includes('href="/site-index/"')) links.push('<a href="/site-index/">Site index</a>');
  if (!links.length) return html;
  if (html.includes('class="footer-links"')) {
    return html.replace(/(<div class="footer-links">[\s\S]*?)(<\/div>)/i, '$1' + links.join('') + '$2');
  }
  return html.replace('</footer>', '<div class="footer-links">' + links.join('') + '</div></footer>');
}

function addDiscoveryNavigation(html, source) {
  const href = pageHref(source);
  if (html.includes('class="site-header"') && !html.includes('href="/subjects/"')) {
    html = html.replace(/(<a class="nav-link" href="\/explore\/">[\s\S]*?<\/a>)/i, '$1<a class="nav-link" href="/subjects/">Subjects</a>');
  }
  if (html.includes('class="site-header"') && !html.includes('href="/authors/"')) {
    html = html.replace(/(<a class="nav-link" href="\/subjects\/">[\s\S]*?<\/a>)/i, '$1<a class="nav-link" href="/authors/">Writers</a>');
  }
  if (href.startsWith('/subjects/') && html.includes('href="/subjects/"')) {
    html = html.replace(/<a class="nav-link" href="\/subjects\/">Subjects<\/a>/i, '<a class="nav-link" href="/subjects/" aria-current="page">Subjects</a>');
  }
  if (href.startsWith('/authors/') && html.includes('href="/authors/"')) {
    html = html.replace(/<a class="nav-link" href="\/authors\/">Writers<\/a>/i, '<a class="nav-link" href="/authors/" aria-current="page">Writers</a>');
  }
  return html;
}


// Seasonal dress. A season with a siteTheme block in seasonal-data.json gets
// a ribbon above the header on every page, a badge on the book pages in its
// collection and a marker on their catalogue cards. The reader's browser
// decides whether to show them: the script below sets data-season on <html>
// only between the season's dates, so the dress comes off on its own when
// the season ends, with no deploy. Out of season, ?season=<slug> previews it.
const themedSeasons = seasons.filter(season => season.siteTheme);
const seasonSwitch = '<script data-season-switch>(function(h){var t=' +
  JSON.stringify(themedSeasons.map(season => [season.slug, season.siteTheme.from, season.siteTheme.to])) +
  ',d=new Date(),k=("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2),q=/[?&]season=([a-z-]+)/.exec(location.search),i,f,e;' +
  'for(i=0;i<t.length;i++){f=t[i][1];e=t[i][2];if(q?q[1]===t[i][0]:(f<=e?k>=f&&k<=e:k>=f||k<=e)){h.setAttribute("data-season",t[i][0]);break}}})(document.documentElement)</script>';
const SEASON_BAT = '<svg viewBox="-60 -30 120 52" aria-hidden="true" focusable="false"><path fill="currentColor" d="M0-7 5-17 10-7Q26-28 58-26Q43-8 40 9Q24-4 17 13Q6 6 0 20Q-6 6-17 13Q-24-4-40 9Q-43-8-58-26Q-26-28-10-7L-5-17Z"/></svg>';
const SEASON_PUMPKIN = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16 8.5c0-3 1.4-4.6 4.2-5.4" stroke="#7c9a4c" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse cx="10.6" cy="19" rx="8" ry="9.6" fill="#d2611c"/><ellipse cx="21.4" cy="19" rx="8" ry="9.6" fill="#e9852b"/><ellipse cx="16" cy="19" rx="6.2" ry="10.2" fill="#f4a03f"/><path d="M12.6 9.6q-3.6 9.4 0 18.8M19.4 9.6q3.6 9.4 0 18.8" stroke="#c96a22" stroke-width="1" fill="none"/></svg>';

function addSeasonalTheme(html, source) {
  if (!themedSeasons.length || /http-equiv=["']refresh["']/i.test(html) || !/<\/head>/i.test(html)) return html;
  const href = pageHref(source);
  if (!html.includes('data-season-switch')) {
    html = /<meta charset="utf-8">/i.test(html)
      ? html.replace(/<meta charset="utf-8">/i, match => match + seasonSwitch)
      : html.replace(/<head>/i, match => match + seasonSwitch);
  }
  if (!html.includes('/assets/seasonal-theme.css')) {
    html = html.replace('</head>', '<link rel="stylesheet" href="/assets/seasonal-theme.css"></head>');
  }
  for (const season of themedSeasons) {
    const theme = season.siteTheme;
    const seasonHref = hrefFor(season);
    // The homepage and the season's own page already wear the season.
    if (href !== '/' && href !== seasonHref && html.includes('<header class="site-header astor-global-header">') && !html.includes('data-season-ribbon="' + season.slug + '"')) {
      const ribbon = '<div class="astor-season-ribbon-region" data-season-ribbon-region="' + season.slug + '" role="region" aria-label="' + escapeHtml(theme.ribbon) + '">' +
        '<a class="astor-season-ribbon" data-season-ribbon="' + season.slug + '" href="' + seasonHref + '">' + SEASON_BAT +
        '<strong>' + escapeHtml(theme.ribbon) + '</strong><span class="astor-season-ribbon-note">' + escapeHtml(theme.ribbonNote) + '</span>' +
        '<span class="astor-season-ribbon-link">' + escapeHtml(theme.ribbonLink) + ' <span aria-hidden="true">&rarr;</span></span></a></div>\n';
      html = html.replace('<header class="site-header astor-global-header">', ribbon + '<header class="site-header astor-global-header">');
    }
    const shelf = new Set(booksFor(season));
    if (shelf.has(href) && !html.includes('data-season-badge="' + season.slug + '"')) {
      const badge = '<p class="astor-season-badge" data-season-badge="' + season.slug + '"><a href="' + seasonHref + '">' + SEASON_PUMPKIN + escapeHtml(theme.badge) + '</a></p>';
      html = html.replace(/(<section class="page-intro[^"]*">\s*<div>)/, '$1' + badge);
    }
    if (href === '/library/') {
      html = html.replace(/<article class="catalog-card"([^>]*)>(\s*<a class="catalog-cover" href="([^"]+)")/g, (match, attributes, rest, cardHref) =>
        shelf.has(cardHref) && !attributes.includes('data-season-shelf') ? '<article class="catalog-card"' + attributes + ' data-season-shelf="' + season.slug + '">' + rest : match);
    }
  }
  return versionAssets(html);
}

// Light and dark themes. Before anything is painted, a few lines read the
// reader's saved choice (astor-theme) or, failing that, the system setting, and
// put data-theme on <html>. They sit ahead of every stylesheet so a dark page
// never starts light. assets/theme.css holds the dark palette and site.js the
// toggle; the theme-color meta tells the phone's address bar which to wear.
const themeInit = '<meta name="color-scheme" content="light dark"><meta name="theme-color" content="#fffaf4">' +
  '<script data-theme-init>(function(d){var t,m;try{t=localStorage.getItem("astor-theme")}catch(e){}' +
  'if(t!=="light"&&t!=="dark"){try{t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){t="light"}}' +
  'd.setAttribute("data-theme",t);d.style.colorScheme=t;m=d.querySelector("meta[name=theme-color]");' +
  'if(m&&t==="dark")m.setAttribute("content","#1b1714")})(document.documentElement)</script>';

const themeGuard = '<script data-theme-guard>(function(d){if(d.getAttribute("data-theme")&&!getComputedStyle(d).getPropertyValue("--theme-aware").trim()){' +
  'd.removeAttribute("data-theme");d.style.colorScheme=""}})(document.documentElement)</script>';

function addThemeSupport(html) {
  if (/http-equiv=["']refresh["']/i.test(html) || !/<\/head>/i.test(html) || html.includes('data-theme-init')) return html;
  html = html.replace(/<meta\b[^>]*name=["']theme-color["'][^>]*>/gi, '');
  html = /<meta charset="utf-8">/i.test(html)
    ? html.replace(/<meta charset="utf-8">/i, match => match + themeInit)
    : html.replace(/<head>/i, match => match + themeInit);
  // Last stylesheet in <head>, so the dark palette follows everything it overrides.
  // The guard runs once the stylesheets are in and before anything is painted: the
  // base stylesheets carry --theme-aware, so if a page ever meets an older cached
  // one it drops back to the light theme instead of showing dark text on dark.
  // The house stylesheet and its typeface go in just ahead of the dark palette.
  const fontPreload = '<link rel="preload" href="/assets/fonts/newsreader-latin.woff2" as="font" type="font/woff2" crossorigin>';
  const editorial = html.includes('/assets/editorial.css') ? '' : '<link rel="stylesheet" href="/assets/editorial.css">';
  return html.replace('</head>', fontPreload + editorial + '<link rel="stylesheet" href="/assets/theme.css">' + themeGuard + '</head>');
}

function addGlobalNavigation(html, source) {
  const href = pageHref(source);
  const inRoute = route => href === route || href.startsWith(route);
  const current = (active, exact = active) => active ? ` aria-current="${exact ? 'page' : 'location'}"` : '';
  const booksCurrent = href === '/library/' || href.startsWith('/books/');
  const hardbacksCurrent = href === '/hardbacks/' || href.startsWith('/hardbacks/');
  const shakespeareCurrent = href === '/shakespeare/' || href.startsWith('/shakespeare/');
  const periodsCurrent = [
    '/classic-literature/',
    '/ancient-epic/',
    '/renaissance-early-modern/',
    '/restoration-enlightenment/',
    '/romantic-regency/',
    '/victorian/',
    '/american/',
    '/modern/',
    '/russian/'
  ].some(route => href === route || href.startsWith(route));
  const authorsCurrent = href === '/authors/' || href.startsWith('/authors/');
  const subjectsCurrent = href === '/subjects/' || href.startsWith('/subjects/');
  const readingRoutesCurrent = href === '/reading-routes/' || href.startsWith('/reading-routes/');
  const resourcesCurrent = href === '/resources/' || href.startsWith('/resources/');
  const studyCurrent = href === '/study/' || href.startsWith('/study/');
  const passageCurrent = href === '/passage-room/' || href.startsWith('/passage-room/');
  const searchCurrent = href === '/explore/' || href.startsWith('/explore/');
  const playCurrent = inRoute('/play/') || href === '/today/';
  const myLibraryCurrent = href === '/my-library/';
  const teachersCurrent = href === '/for-teachers/';
  const exploreToolsCurrent = [
    '/explore/quotations/', '/explore/timeline/', '/explore/characters/', '/explore/themes/',
    '/explore/techniques/', '/explore/map/', '/explore/compare/'
  ].some(route => href === route);
  const accountCurrent = href === '/account/' || href.startsWith('/account/');
  const seasonsCurrent = inRoute('/seasons/');
  const aboutCurrent = href === '/about/' || href === '/editorial/';
  const booksSection = booksCurrent || seasonsCurrent || hardbacksCurrent || shakespeareCurrent || periodsCurrent || authorsCurrent || subjectsCurrent;
  const studySection = studyCurrent || resourcesCurrent || passageCurrent || playCurrent || teachersCurrent;
  const exploreSection = searchCurrent || exploreToolsCurrent || readingRoutesCurrent;

  const guidesCurrent = inRoute('/guides/');
  const reviseCurrent = inRoute('/play/');
  const todayCurrent = href === '/today/';
  const booksMenuCurrent = booksSection || studyCurrent;
  const exploreMenuCurrent = exploreSection || resourcesCurrent || passageCurrent || teachersCurrent;

  const header = `<header class="site-header astor-global-header">
  <div class="astor-header-identity">
    <a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-header-mark.png" alt="" width="24" height="54"><span class="word">LIBRARY</span></a>
    <p class="astor-header-strap">Annotated editions of classic literature</p>
    <button class="astor-theme-toggle-compact" type="button" data-theme-toggle aria-pressed="false" aria-label="Dark mode"><span class="astor-theme-icon" aria-hidden="true"></span></button>
    <button class="site-nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation"><span>Menu</span><span class="site-nav-mark" aria-hidden="true"></span></button>
  </div>
  <nav class="nav astor-primary-nav" id="site-navigation" aria-label="Primary navigation">
    <div class="astor-primary-links">
      <details class="astor-browse-menu astor-menu${booksMenuCurrent ? ' is-current-section' : ''}">
        <summary aria-controls="astor-menu-books"><span>Books</span></summary>
        <div class="astor-browse-panel astor-menu-panel is-two" id="astor-menu-books">
          <div class="astor-menu-col">
            <h2>The catalogue</h2>
            <a href="/library/"${current(href === '/library/')}>All books</a>
            <a href="/shakespeare/"${current(shakespeareCurrent, href === '/shakespeare/')}>Shakespeare</a>
            <a href="/study/"${current(studyCurrent, href === '/study/')}>Study Editions</a>
            <a href="/hardbacks/"${current(hardbacksCurrent, href === '/hardbacks/')}>Hardbacks</a>
            <a href="/seasons/"${current(seasonsCurrent, href === '/seasons/')}>The seasonal library</a>
            <a href="/authors/"${current(authorsCurrent, href === '/authors/')}>Writers</a>
            <a href="/subjects/"${current(subjectsCurrent, href === '/subjects/')}>Subjects</a>
          </div>
          <div class="astor-menu-col">
            <h2>By period</h2>
            <a href="/ancient-epic/"${current(inRoute('/ancient-epic/'))}>Ancient &amp; Epic</a>
            <a href="/renaissance-early-modern/"${current(inRoute('/renaissance-early-modern/'))}>Renaissance</a>
            <a href="/restoration-enlightenment/"${current(inRoute('/restoration-enlightenment/'))}>Restoration</a>
            <a href="/romantic-regency/"${current(inRoute('/romantic-regency/'))}>Romantic &amp; Regency</a>
            <a href="/victorian/"${current(inRoute('/victorian/'))}>Victorian</a>
            <a href="/american/"${current(inRoute('/american/'))}>American</a>
            <a href="/modern/"${current(inRoute('/modern/'))}>Modern</a>
            <a href="/russian/"${current(inRoute('/russian/'))}>Russian</a>
          </div>
        </div>
      </details>
      <a class="nav-link" href="/guides/"${current(guidesCurrent, href === '/guides/')}>Study guides</a>
      <a class="nav-link" href="/play/"${current(reviseCurrent, href === '/play/')}>Revise</a>
      <a class="nav-link" href="/today/"${current(todayCurrent)}>Today</a>
      <details class="astor-browse-menu astor-menu${exploreMenuCurrent ? ' is-current-section' : ''}">
        <summary aria-controls="astor-menu-explore"><span>Explore</span></summary>
        <div class="astor-browse-panel astor-menu-panel is-two" id="astor-menu-explore">
          <div class="astor-menu-col">
            <h2>Reading</h2>
            <a href="/passage-room/"${current(passageCurrent, href === '/passage-room/')}>Close readings</a>
            <a href="/resources/"${current(resourcesCurrent, href === '/resources/')}>Illustrated guides</a>
            <a href="/reading-routes/"${current(readingRoutesCurrent, href === '/reading-routes/')}>Reading routes</a>
            <a href="/for-teachers/"${current(teachersCurrent)}>For teachers</a>
          </div>
          <div class="astor-menu-col">
            <h2>Across the library</h2>
            <a href="/explore/quotations/"${current(href === '/explore/quotations/')}>Quotations</a>
            <a href="/explore/timeline/"${current(href === '/explore/timeline/')}>Timeline</a>
            <a href="/explore/characters/"${current(href === '/explore/characters/')}>Character maps</a>
            <a href="/explore/themes/"${current(href === '/explore/themes/')}>Themes</a>
            <a href="/explore/techniques/"${current(href === '/explore/techniques/')}>Literary terms</a>
            <a href="/explore/map/"${current(href === '/explore/map/')}>Map of settings</a>
            <a href="/explore/compare/"${current(href === '/explore/compare/')}>Compare two books</a>
          </div>
        </div>
      </details>
      <a class="nav-link" href="/about/"${current(aboutCurrent, href === '/about/')}>About</a>
    </div>
    <div class="astor-nav-utilities">
      <a class="astor-utility-link astor-search-link" href="/explore/" data-astor-palette${current(searchCurrent, href === '/explore/')}><span aria-hidden="true"></span>Search</a>
      <a class="astor-utility-link astor-mylibrary-link" href="/my-library/"${current(myLibraryCurrent)}>My library</a>
      <button class="astor-utility-link astor-theme-toggle" type="button" data-theme-toggle aria-pressed="false"><span class="astor-theme-switch" aria-hidden="true"></span>Dark mode</button>
      <a class="astor-utility-link astor-account-link" href="/account/" data-auth-link${current(accountCurrent, href === '/account/')}>Sign in</a>
    </div>
  </nav>
</header>`;

  const footer = `<footer class="site-footer astor-global-footer">
  <div class="astor-footer-signature"><p class="footer-brand">Astor Library</p><p>Annotated editions of classic literature, with free study guides.</p></div>
  <div class="astor-footer-group"><h2>Books</h2><a href="/library/">All books</a><a href="/shakespeare/">Shakespeare</a><a href="/study/">Study Editions</a><a href="/hardbacks/">Hardbacks</a><a href="/seasons/">The seasonal library</a><a href="/authors/">Writers</a><a href="/subjects/">Subjects</a></div>
  <div class="astor-footer-group"><h2>Study</h2><a href="/guides/">Study guides</a><a href="/play/">Revise</a><a href="/today/">Today</a><a href="/passage-room/">Close readings</a><a href="/resources/">Illustrated guides</a><a href="/explore/quotations/">Quotations</a><a href="/for-teachers/">For teachers</a><a href="/my-library/">My library</a></div>
  <div class="astor-footer-group"><h2>Astor</h2><a href="/about/">About</a><a href="/editorial/">Editorial standards</a><a href="/privacy/">Privacy</a><a href="mailto:support@astorlibrary.com">Contact</a><a href="https://ko-fi.com/astorlibrary">Support Astor Library</a><a href="/site-index/">Site index</a></div>
</footer>`;

  html = html.replace(/<header\b[^>]*\bclass=(?:"[^"]*\b(?:site-header|home-masthead)\b[^"]*"|'[^']*\b(?:site-header|home-masthead)\b[^']*')[^>]*>[\s\S]*?<\/header>/i, header);
  html = html.replace(/<footer\b[^>]*\bclass=(?:"[^"]*\bsite-footer\b[^"]*"|'[^']*\bsite-footer\b[^']*')[^>]*>[\s\S]*?<\/footer>/i, footer);

  if (!/href=["']\/assets\/navigation\.css["']/i.test(html)) {
    html = html.replace('</head>', '<link rel="stylesheet" href="/assets/navigation.css"></head>');
  }
  // The palette opens over any page, so it ships with the shared navigation.
  // It fetches its index only when a reader actually opens it.
  if (!html.includes('/assets/astor/palette.mjs')) {
    html = html.replace('</head>', '<script type="module" src="/assets/astor/palette.mjs"></script></head>');
  }
  // Version both assets together so an offline cache cannot mix old search
  // behaviour with the current shared navigation styles.
  html = html.replace(/(href=["'])\/assets\/navigation\.css(?:\?[^"']*)?(["'])/g, '$1/assets/navigation.css?v=' + navigationVersion + '$2');
  html = html.replace(/(src=["'])\/assets\/astor\/palette\.mjs(?:\?[^"']*)?(["'])/g, '$1/assets/astor/palette.mjs?v=' + navigationVersion + '$2');
  return versionAssets(html);
}

function discoveryTitle(href) {
  for (const group of ['books', 'resources', 'studyEditions', 'passages', 'authors', 'subjects', 'collections', 'seasons']) {
    const found = (discovery[group] || []).find(item => item.href === href);
    if (found) return plainText(found.title);
  }
  return null;
}





// Every book page is rebuilt into one shape by book-page.js: the book, the
// edition and how to buy it, the way into the study guide, then the book's own
// history and sources.
function buildBookPage(html, source) {
  const context = bookContext(source);
  if (!context) return html;
  const { book, collection } = context;
  const slug = book.href.split('/')[2];
  const record = studyData.get(slug) || studyEditions.get(slug);
  const passages = (discovery.passages || []).filter(passage => (passage.relatedBooks || []).includes(book.href) || (record && (passage.relatedBooks || []).includes(record.href)));
  const seasonLinks = seasons.filter(season => booksFor(season).includes(book.href)).map(season => ({ href: hrefFor(season), title: season.shortTitle || season.title }));
  html = restructureBookPage(html, {
    book,
    href: book.href,
    collectionHref: collection?.href,
    formats: bookFormats[slug],
    guideSlug: record ? record.slug : null,
    passages,
    seasons: seasonLinks,
    creditNote: octoberCatalogue.some(edition => edition.href === book.href)
      ? 'The edition description and paperback details are checked against the Amazon listing, and the publication history against the sources listed on this page.'
      : ''
  });
  if (!html.includes('href="/assets/seasons.css"')) html = html.replace('</head>', '<link rel="stylesheet" href="/assets/seasons.css"></head>');
  return html;
}

// A Study Edition page describes one printed book: what it contains, how to
// buy it, and where its free study guide and standard edition are. The words
// come from scripts/study-editions.json, which is checked against each
// edition's own title and contents; the page's older study material now lives
// in the guides.
const studyEditionCopy = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'study-editions.json'), 'utf8'));

function addStudyEditionPage(html, source) {
  const href = pageHref(source);
  if (!/^\/study\/[^/]+\/$/.test(href)) return html;
  const copy = studyEditionCopy.editions[href];
  if (!copy) return html;
  const mainOpen = html.match(/<main\b[^>]*>/);
  if (!mainOpen) return html;
  const start = mainOpen.index + mainOpen[0].length;
  const end = html.lastIndexOf('</main>');
  const record = [...studyData.values()].find(book => book.studyHref === href || book.href === copy.book);
  const guide = record ? '/guides/' + record.slug + '/' : '';
  // The list below names the contents, so the sentence that names them
  // again ("It contains the full text…") is left out of the introduction.
  const description = (copy.contents || []).length
    ? copy.description.map(text => text.replace(/\s*It contains [^.]*\./, '')).filter(text => text.trim())
    : copy.description;
  const paragraphs = description.map(text => '<p class="deck">' + text + '</p>').join('');
  const contents = (copy.contents || []).length ? '<ul class="book-edition-list">' + copy.contents.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>' : '';
  const links = [
    '<a class="book-format-buy" href="' + escapeHtml(copy.buy) + '" rel="noopener">Buy on Amazon</a>',
    copy.book ? '<a href="' + escapeHtml(copy.book) + '">The standard Astor edition</a>' : '',
    guide ? '<a href="' + guide + '">The free study guide</a>' : ''
  ].filter(Boolean).join('');
  const main = '\n<nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/study/">Study Editions</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(copy.title) + '</span></nav>' +
    '<section class="book-top page-intro study-edition-top"><div class="book-top-text">' +
    '<p class="book-author kicker">' + escapeHtml(copy.author) + '</p>' +
    '<h1>' + escapeHtml(copy.title) + '</h1>' +
    '<p class="book-subtitle">Astor Study Edition</p>' +
    paragraphs +
    (contents ? '<h2 class="book-contents-title">In this edition</h2>' + contents : '') +
    '<p class="book-links study-edition-links">' + links + '</p>' +
    '</div><figure class="book-cover"><img src="' + escapeHtml(copy.cover) + '" alt="' + escapeHtml(copy.title) + ', Astor Study Edition cover" width="400" height="600"></figure></section>' +
    '<nav class="book-end-nav" aria-label="End of page"><a href="/study/">All Study Editions</a>' + (copy.book ? '<a href="' + escapeHtml(copy.book) + '">' + escapeHtml(copy.title) + '</a>' : '') + '<a href="/guides/">Study guides</a></nav>\n';
  html = html.slice(0, start) + main + html.slice(end);
  html = html.replace(/<main\b([^>]*)>/, (whole, attributes) => /class="/.test(attributes) ? '<main' + attributes.replace(/class="([^"]*)"/, 'class="$1 book-page study-edition-page"') + '>' : '<main' + attributes + ' class="page-wrap book-page study-edition-page">');
  return html.replace(/<style>[\s\S]*?<\/style>/g, '');
}

// The number of books is counted, never typed: any page can write
// <span data-count="books">N</span> and the build puts the real figure in.
const catalogueBookCount = fs.readdirSync(path.join(root, 'books'))
  .filter(slug => fs.existsSync(path.join(root, 'books', slug, 'index.html'))).length;

// The Revise pages carry the shelf (assets/revise-index.json) in the page
// itself, so choosing a book never waits on, or fails with, a second request.
const REVISE_SCRIPTS = /\/assets\/astor\/(?:revise-hub|quiz-page|flashcard-deck)\.mjs/;
const reviseShelfJson = (() => {
  const file = path.join(root, 'assets', 'revise-index.json');
  return fs.existsSync(file) ? JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8'))).replace(/</g, '\\u003c') : '';
})();

// A watchdog in plain ES5, so it runs in any browser even when the modules do
// not. If Revise has not started after fifteen seconds it clears this site's
// service worker and caches and reloads, once; if that does not help, it says
// so on the page with the error and the browser, so a reader can report it.
const REVISE_WATCHDOG = `<script data-revise-watchdog>(function () {
  var notes = [];
  function note(text) { if (text && notes.length < 4) notes.push(String(text).slice(0, 160)); }
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (target && target !== window && (target.src || target.href)) note('Could not load ' + String(target.src || target.href).replace(location.origin, ''));
    else note(event.message);
  }, true);
  window.addEventListener('unhandledrejection', function (event) { var reason = event.reason; note(reason && reason.message ? reason.message : reason); });
  function browser() {
    var ua = navigator.userAgent, device = (ua.match(/iPhone|iPad|Android|Macintosh|Windows|Linux/) || ['unknown device'])[0];
    var name = (ua.match(/(Edg|Firefox|CriOS|FxiOS|Chrome)\\/(\\d+)/) || ua.match(/Version\\/([\\d.]+).*(Safari)/) || []);
    return (name.length ? (name[2] === 'Safari' ? 'Safari ' + name[1] : name[1] + ' ' + name[2]) : 'browser') + ' on ' + device;
  }
  function remembered(key, value) {
    try { if (value) sessionStorage.setItem(key, value); return sessionStorage.getItem(key); } catch (error) { return null; }
  }
  function reset(then) {
    var jobs = [];
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      jobs.push(navigator.serviceWorker.getRegistrations().then(function (all) { return Promise.all(all.map(function (one) { return one.unregister(); })); }));
    }
    if (window.caches && caches.keys) {
      jobs.push(caches.keys().then(function (keys) { return Promise.all(keys.map(function (key) { return caches.delete(key); })); }));
    }
    Promise.all(jobs).then(then, then);
  }
  setTimeout(function () {
    var mount = document.querySelector('#rv-hub, #astor-game, #astor-flashcards');
    if (!mount) return;
    var first = mount.firstElementChild;
    if (first && !(mount.children.length === 1 && first.className === 'rv-loading')) return;
    if (!remembered('astor-revise-reset')) {
      remembered('astor-revise-reset', '1');
      reset(function () { location.reload(); });
      return;
    }
    var panel = document.createElement('div');
    panel.className = 'rv-empty rx-load-failed';
    var message = document.createElement('p');
    message.textContent = 'Revise has not started in this browser.';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'rx-button is-primary';
    button.textContent = 'Reset and try again';
    button.onclick = function () { reset(function () { location.reload(); }); };
    var reason = document.createElement('p');
    reason.className = 'rx-load-reason';
    reason.textContent = 'Reason: ' + (notes.length ? notes.join(' / ') : 'no error was reported') + ' (' + browser() + ')';
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    panel.appendChild(message);
    panel.appendChild(button);
    panel.appendChild(reason);
    mount.appendChild(panel);
  }, 15000);
})();</script>`;

function addReviseShelf(html) {
  if (!reviseShelfJson || !REVISE_SCRIPTS.test(html) || html.includes('id="astor-shelf"')) return html;
  return html
    .replace(/<head>/, '<head>\n' + REVISE_WATCHDOG)
    .replace('</body>', '<script type="application/json" id="astor-shelf">' + reviseShelfJson + '</script>\n</body>');
}

// Headings close without a full stop across the site, as the book and hub
// pages already do. The homepage and the seasonal pages keep their wording,
// and an abbreviation keeps its point ("The Sigsand MS.").
function plainHeadingStops(html, source) {
  const href = pageHref(source);
  if (href === '/' || href.startsWith('/seasons/')) return html;
  return html.replace(/(<(h[1-3])\b[^>]*>)([\s\S]*?)<\/\2>/g, (whole, open, tag, inner) =>
    open + inner.replace(/(?<!\b(?:[A-Z]|MS|St|Mr|Mrs|Dr))\.(\s*)$/, '$1') + '</' + tag + '>');
}

function prepareHtml(html, source) {
  html = html.replace(/(<span data-count="books">)\d+(<\/span>)/g, '$1' + catalogueBookCount + '$2');
  // The site publishes British English and stamps en-GB metadata everywhere;
  // normalise the bare lang="en" used by older source pages to match.
  html = html.replace(/(<html\b[^>]*\blang=")en(")/i, '$1en-GB$2');
  // The illustrated banners that once headed the collection pages are gone;
  // the covers on each page say more about a collection than a drawing did.
  html = html.replace(/<figure class="collection-page-banner">[\s\S]*?<\/figure>\s*/g, '');
  html = addBookStructuredData(html, source);
  html = addResourceStructuredData(html, source);
  html = addStudyStructuredData(html, source);
  html = addAuthorStructuredData(html, source);
  html = addCollectionStructuredData(html, source);
  html = addPassageStructuredData(html, source);
  html = addPassageHeroCover(html, source);
  html = addPassageRelated(html, source);
  html = addGlobalMetadata(html, source);
  html = addDiscoveryNavigation(html, source);
  const isBookPage = Boolean(bookContext(source));
  if (isBookPage) {
    html = buildBookPage(html, source);
  } else {
    html = addAuthorPassageLinks(html, source);
    html = addResourceReadingNavigation(html, source);
    html = addEditorialCredit(html, source);
    html = addContextImageShelf(html, source);
    html = markCollectionPage(html, source);
    html = addStudyEditionPage(html, source);
    html = plainHubPage(html, pageHref(source), discovery);
  }
  html = addReviseShelf(html);
  html = plainHeadingStops(html, source);
  html = addSiteIndexLink(html, source);
  html = addGlobalNavigation(html, source);
  html = addSeasonalTheme(html, source);
  html = addThemeSupport(html);
  html = html.replace(/href="\/assets\/seasons\.css"/g, 'href="/assets/seasons.css?v=' + seasonalStylesVersion + '"');

  if (!html.includes('/assets/site.js')) {
    html = html.replace('</head>', '<script src="/assets/site.js" defer></script></head>');
  }
  if (!/http-equiv=["']refresh["']/i.test(html) && !html.includes('/assets/auth.js')) {
    html = html.replace('</head>', '<script src="/assets/auth.js" defer></script></head>');
  }

  if (html.includes('<main') && !html.includes('class="skip-link"')) {
    html = html.replace(/<main(?![^>]*\bid=)([^>]*)>/, '<main id="main-content"$1>');
    html = html.replace(/<body([^>]*)>/, '<body$1><a class="skip-link" href="#main-content">Skip to main content</a>');
  }

  html = html.replace(/<img\b[^>]*>/gi, addImageHints);
  html = promoteFirstMainImage(html);
  html = html.replace(/<img\b[^>]*>/gi, function (tag, offset, whole) {
    // The class of the nearest element opened before the image: the cover's
    // own wrapper in every list that LIST_COVER_SIZES knows.
    const before = whole.slice(Math.max(0, offset - 400), offset);
    const wrapper = [...before.matchAll(/<(?!img\b)[a-z][^>]*\bclass="([^"]*)"/gi)].pop()?.[1] || '';
    return useBookThumbnail(tag, source, wrapper);
  });
  // Last of all, once every script and stylesheet this page will load has been
  // added: stamp each with a version taken from its contents.
  return versionAssets(html);
}

function copyRecursive(source, destination) {
  const stat = fs.statSync(source);
  const name = path.basename(source);

  // Local environment files can contain production credentials and never belong in dist.
  if (name === '.dev.vars' || name.startsWith('.dev.vars.') || name === '.env' || name.startsWith('.env.') || name === '.npmrc') return;
  // The thumbnail manifest is a build-time lookup only; publishing it would also
  // make every original upload look referenced to the dist image prune below.
  if (name === 'book-thumbnails.json') return;
  // Presentation files are publishable and remain inside Workers Static Assets.
  // The Worker runs first for this namespace and applies the three-slide account boundary.

  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }

  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (path.extname(source) === '.html') {
      const html = prepareHtml(fs.readFileSync(source, 'utf8'), source);
      fs.writeFileSync(destination, html);
    } else if (path.extname(source) === '.json' && /^(?:assets|data)\//.test(path.relative(root, source).split(path.sep).join('/'))) {
      // Published data is minified, which the explorers parse faster; the
      // repository keeps the readable copy.
      const text = fs.readFileSync(source, 'utf8');
      let minified = null;
      try { minified = JSON.stringify(JSON.parse(text)); } catch { minified = null; }
      if (minified === null) fs.copyFileSync(source, destination);
      else fs.writeFileSync(destination, minified);
    } else {
      fs.copyFileSync(source, destination);
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of fs.readdirSync(root)) {
  if (excluded.has(entry)) continue;
  if (entry.startsWith('.') && entry !== '.well-known') continue;
  copyRecursive(path.join(root, entry), path.join(outDir, entry));
}

// The published discovery index drives client-side related-book shelves and
// search results; point its images at the optimised thumbnails so those
// features never load multi-megabyte original covers.
const distDiscoveryFile = path.join(outDir, 'assets', 'content-index.json');
if (fs.existsSync(distDiscoveryFile)) {
  const distDiscovery = JSON.parse(fs.readFileSync(distDiscoveryFile, 'utf8'));
  for (const value of Object.values(distDiscovery)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (item && typeof item.image === 'string') item.image = optimisedImage(item.image);
    }
  }
  fs.writeFileSync(distDiscoveryFile, JSON.stringify(distDiscovery));
}

const sitemapUrls = [];
function collectSitemap(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSitemap(fullPath);
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name) !== '.html') continue;
    const html = fs.readFileSync(fullPath, 'utf8');
    const metadata = pageMetadata(html);
    if (metadata.redirect || metadata.noindex) continue;
    const image = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] || '';
    const imageTitle = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] || '';
    sitemapUrls.push({
      url: absoluteUrl(pageHref(path.join(root, path.relative(outDir, fullPath)))),
      image: image && !/\/(?:Logo|assets\/og-logo)\.(?:png|jpe?g|webp)$/i.test(image) ? absoluteUrl(image) : '',
      imageTitle: imageTitle
    });
  }
}

collectSitemap(outDir);
sitemapUrls.sort((a, b) => a.url.localeCompare(b.url, 'en'));

// Each book's record is also published as a module (export default {...}),
// which Revise loads the way it loads its own scripts. Some browsers and
// networks refuse a page's script-made requests for data while letting its
// scripts through; the JSON stays for everything else.
{
  const booksDir = path.join(outDir, 'data', 'books');
  for (const name of fs.existsSync(booksDir) ? fs.readdirSync(booksDir) : []) {
    if (!name.endsWith('.json')) continue;
    const record = JSON.stringify(JSON.parse(fs.readFileSync(path.join(booksDir, name), 'utf8')));
    fs.writeFileSync(path.join(booksDir, name.replace(/\.json$/, '.mjs')), 'export default ' + record + ';\n');
  }
}
// The service worker is stamped with a version drawn from the files it keeps,
// so a deploy that changes any of them is a new worker and a fresh cache.
{
  const workerFile = path.join(outDir, 'sw.js');
  if (fs.existsSync(workerFile)) {
    const moduleDir = path.join(outDir, 'assets', 'astor');
    const modules = fs.readdirSync(moduleDir).filter(name => name.endsWith('.mjs')).sort().map(name => '/assets/astor/' + name);
    const hash = require('crypto').createHash('sha256');
    for (const file of modules.map(name => path.join(outDir, name)).concat([
      path.join(outDir, 'assets', 'astor-study.css'),
      path.join(outDir, 'assets', 'styles.css'),
      path.join(outDir, 'assets', 'navigation.css'),
      path.join(outDir, 'assets', 'study-index.json'),
      path.join(outDir, 'sw.js')
    ])) {
      if (fs.existsSync(file)) hash.update(fs.readFileSync(file));
    }
    const stamped = fs.readFileSync(workerFile, 'utf8')
      .replace('__ASTOR_BUILD__', hash.digest('hex').slice(0, 12))
      .replace('__ASTOR_MODULES__', JSON.stringify(modules));
    fs.writeFileSync(workerFile, stamped);
  }
}

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
  sitemapUrls.map(page => {
    const image = page.image
      ? '<image:image><image:loc>' + escapeHtml(page.image) + '</image:loc>' +
        (page.imageTitle ? '<image:title>' + escapeHtml(decodeEntities(page.imageTitle)) + '</image:title>' : '') +
        '</image:image>'
      : '';
    // Omit optional lastmod until each page has a verified content-change date.
    // A release-wide constant misdates newer pages and gives crawlers false signals.
    return '  <url><loc>' + escapeHtml(page.url) + '</loc>' + image + '</url>';
  }).join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);

fs.writeFileSync(path.join(outDir, '_headers'), `# Astor Library static hosting headers.
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: frame-ancestors 'self'
  X-Frame-Options: SAMEORIGIN
  Strict-Transport-Security: max-age=31536000

/assets/*.css
  Cache-Control: public, max-age=300, stale-while-revalidate=3600

/assets/*.js
  Cache-Control: public, max-age=0, must-revalidate

/assets/*.mjs
  Cache-Control: public, max-age=0, must-revalidate

/assets/vendor/*
  Cache-Control: public, max-age=31536000, immutable

/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/assets/book-thumbs/*
  Cache-Control: public, max-age=31536000, immutable

/assets/home/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

/assets/samples/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

/account/*
  Cache-Control: private, no-store
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow

/presentations/*
  X-Robots-Tag: noindex, follow

/assets/presentations/*
  X-Robots-Tag: noindex, noimageindex, noarchive
`);

// Publish only the root-level images that the generated site still references.
// The repo root keeps every original upload; readers are served thumbnails, so
// unreferenced multi-megabyte originals stay out of the deploy entirely.
const referenceableExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.webmanifest', '.txt', '.svg']);
let referenceText = '';
(function collectReferenceText(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectReferenceText(fullPath);
      continue;
    }
    if (entry.isFile() && referenceableExtensions.has(path.extname(entry.name).toLowerCase())) {
      referenceText += fs.readFileSync(fullPath, 'utf8') + '\n';
    }
  }
})(outDir);

let prunedCount = 0;
let prunedBytes = 0;
for (const entry of fs.readdirSync(outDir)) {
  if (!/\.(?:png|jpe?g)$/i.test(entry)) continue;
  const candidates = [
    entry,
    encodeURI(entry),
    encodeURIComponent(entry),
    entry.replace(/ /g, '%20'),
    entry.replace(/ /g, '%20').replace(/'/g, '%27'),
    escapeHtml(entry)
  ];
  if (candidates.some(candidate => referenceText.includes(candidate))) continue;
  const fullPath = path.join(outDir, entry);
  prunedBytes += fs.statSync(fullPath).size;
  fs.unlinkSync(fullPath);
  prunedCount += 1;
}

console.log('Static site copied to dist/ with ' + sitemapUrls.length + ' preferred addresses and image sitemap metadata.');
if (prunedCount) {
  console.log('Left ' + prunedCount + ' unreferenced root images (' + (prunedBytes / 1024 / 1024).toFixed(0) + ' MB) out of dist/.');
}

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'dist');
const SITE_URL = 'https://astorlibrary.com';
const discoveryFile = path.join(root, 'assets', 'content-index.json');
const discovery = fs.existsSync(discoveryFile)
  ? JSON.parse(fs.readFileSync(discoveryFile, 'utf8'))
  : { books: [] };

const excluded = new Set([
  '.git',
  '.github',
  '.wrangler',
  'dist',
  'node_modules',
  'scripts',
  'README.md',
  'EDITORIAL_GUIDE.md',
  'wrangler.toml',
  '.DS_Store'
]);

function addImageHints(tag) {
  let result = tag;
  if (!/\bloading=/.test(result)) result = result.replace('<img', '<img loading="lazy"');
  if (!/\bdecoding=/.test(result)) result = result.replace('<img', '<img decoding="async"');
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
  const resource = discovery.resources?.find(item => item.href === href);
  if (!resource) return null;
  const relatedBook = discovery.books?.find(book => resource.relatedBooks?.includes(book.href));
  return { resource, relatedBook };
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

function addBookStructuredData(html, source) {
  const context = bookContext(source);
  if (!context) return html;
  const { book, collection } = context;
  if (!book) return html;

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
      image: absoluteUrl(book.image),
      genre: (book.subjects || []).map(subject => subject.title),
      author: {
        '@type': 'Person',
        name: book.author,
        url: book.authorHref ? absoluteUrl(book.authorHref) : undefined
      }
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
  const dates = {
    'Arthur Conan Doyle': { birthDate: '1859-05-22', deathDate: '1930-07-07' },
    'Charles Dickens': { birthDate: '1812-02-07', deathDate: '1870-06-09' },
    'Frederick Douglass': { birthDate: '1818', deathDate: '1895-02-20' },
    'Jane Austen': { birthDate: '1775-12-16', deathDate: '1817-07-18' },
    'Mary Shelley': { birthDate: '1797-08-30', deathDate: '1851-02-01' }
  }[author.title] || {};
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
      subjectOf: author.books.map(book => ({ '@type': 'Book', name: book.title, url: absoluteUrl(book.href), image: absoluteUrl(book.image) }))
    },
    publisher: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Astor Library', url: SITE_URL + '/' }
  };
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  return html.replace('</head>', '<script type="application/ld+json" data-astor-author-schema>' + json + '</script></head>');
}

function addResourceStructuredData(html, source) {
  const context = resourceContext(source);
  if (!context || html.includes('data-astor-resource-schema')) return html;
  const { resource, relatedBook } = context;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: resource.title,
    description: resource.description,
    url: absoluteUrl(resource.href),
    image: resource.image ? absoluteUrl(resource.image) : undefined,
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
        { '@type': 'ListItem', position: relatedBook ? 3 : 2, name: resource.title, item: absoluteUrl(resource.href) }
      ]
    }
  };
  const canonical = html.includes('rel="canonical"') ? '' : '<link rel="canonical" href="' + absoluteUrl(resource.href) + '">';
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  return html.replace('</head>', canonical + '<script type="application/ld+json" data-astor-resource-schema>' + json + '</script></head>');
}

function addCollectionStructuredData(html, source) {
  const href = pageHref(source);
  if (html.includes('data-astor-collection-schema')) return html;

  const collection = discovery.collections?.find(item => item.href === href);
  const subject = subjectContext(source);
  let items = [];
  let kind = '';

  if (href === '/library/' || href === '/classic-literature/') {
    items = discovery.books || [];
    kind = 'Classic literature books';
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
    items = (discovery.books || []).filter(book => book.collection === collection.title);
    kind = collection.title + ' books';
  } else if (href === '/resources/') {
    items = discovery.resources || [];
    kind = 'Free literature study guides';
  } else if (href === '/study/') {
    items = discovery.studyEditions || [];
    kind = 'Literature study editions';
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

function addGlobalMetadata(html, source) {
  if (/http-equiv="refresh"/i.test(html)) return html;
  const href = pageHref(source);
  const title = plainText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Astor Library');
  const description = plainText(html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] || 'Classic literature, carefully introduced for readers, students and teachers.');
  const book = bookContext(source)?.book;
  const resource = resourceContext(source)?.resource;
  const author = authorContext(source);
  const subject = subjectContext(source);
  const image = book?.image || resource?.image || author?.image || subject?.image || '/Logo.png';
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
  if (!/property="og:image:alt"/i.test(html)) metadata += '<meta property="og:image:alt" content="Astor Library classic literature editions and resources">';
  if (!/name="twitter:card"/i.test(html)) metadata += '<meta name="twitter:card" content="summary_large_image">';
  if (!/name="twitter:title"/i.test(html)) metadata += '<meta name="twitter:title" content="' + escapeHtml(title) + '">';
  if (!/name="twitter:description"/i.test(html)) metadata += '<meta name="twitter:description" content="' + escapeHtml(description) + '">';
  if (!/name="twitter:image"/i.test(html)) metadata += '<meta name="twitter:image" content="' + escapeHtml(absoluteImage) + '">';
  if (!/name="author"/i.test(html)) metadata += '<meta name="author" content="Astor Library">';
  if (!/rel="icon"/i.test(html)) {
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
          knowsAbout: ['Classic literature', 'English literature', 'Shakespeare', 'Literature study guides', 'Literature teaching resources']
        },
        {
          '@type': 'WebSite',
          '@id': SITE_URL + '/#website',
          name: 'Astor Library',
          alternateName: ['Astor Editions', 'astorlibrary.com'],
          url: SITE_URL + '/',
          inLanguage: 'en-GB',
          description,
          publisher: { '@id': SITE_URL + '/#organization' }
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
        publishingPrinciples: absoluteUrl('/editorial/')
      }
    };
    metadata += '<script type="application/ld+json" data-astor-identity-schema>' + JSON.stringify(identitySchema).replace(/</g, '\\u003c') + '</script>';
  }
  return html.replace('</head>', metadata + '</head>');
}

function addBookReadingNavigation(html, source) {
  const context = bookContext(source);
  if (!context) return html;
  const { book, collection } = context;
  const collectionHref = collection?.href || '/library/';

  if (!html.includes('class="book-breadcrumb"')) {
    const breadcrumb = '<nav class="book-breadcrumb" aria-label="Breadcrumb">' +
      '<a href="/library/">All books</a><span aria-hidden="true">/</span>' +
      '<a href="' + escapeHtml(collectionHref) + '">' + escapeHtml(book.collection) + '</a>' +
      '<span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(book.title) + '</span></nav>';
    const withIntro = html.replace('<section class="page-intro"', breadcrumb + '<section class="page-intro"');
    html = withIntro === html
      ? html.replace(/(<main\b[^>]*>)/i, '$1' + breadcrumb)
      : withIntro;
  }

  if (!html.includes('class="book-end-nav"')) {
    const endNav = '<nav class="book-end-nav" aria-label="End of page">' +
      '<a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a>' +
      (book.authorHref ? '<a href="' + escapeHtml(book.authorHref) + '">More by ' + escapeHtml(book.author) + '</a>' : '') +
      '<a href="' + escapeHtml(collectionHref) + '">More from ' + escapeHtml(book.collection) + '</a>' +
      '<a href="/explore/">Find another book <span aria-hidden="true">&rarr;</span></a></nav>';
    html = html.replace('</main>', endNav + '</main>');
  }

  return html;
}

function addBookAuthorLink(html, source) {
  const context = bookContext(source);
  if (!context?.book?.authorHref) return html;
  const { book } = context;
  return html.replace(/<p class="kicker">([\s\S]*?)<\/p>/i, function (match, contents) {
    if (plainText(contents) !== book.author || /<a\b/i.test(contents)) return match;
    return '<p class="kicker book-author-kicker"><a href="' + escapeHtml(book.authorHref) + '">' + contents + '</a></p>';
  });
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
    const bookLink = relatedBook ? '<a href="' + escapeHtml(relatedBook.href) + '">Explore ' + escapeHtml(relatedBook.title) + '</a>' : '';
    const endNav = '<nav class="book-end-nav resource-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a>' + bookLink + '<a href="/resources/">All free resources</a><a href="/site-index/">Site index</a></nav>';
    html = html.replace('</main>', endNav + '</main>');
  }
  return html;
}

function addEditorialCredit(html, source) {
  const book = bookContext(source)?.book;
  const resource = resourceContext(source)?.resource;
  if ((!book && !resource) || html.includes('class="astor-page-credit"')) return html;
  const copy = book
    ? 'Prepared and checked for Astor Library. Dates, publication details and historical claims are supported by the sources listed on this page.'
    : 'Published by Astor Library as a free literature resource, made to support reading, teaching and independent study.';
  const credit = '<aside class="astor-page-credit" aria-label="About this page"><span><b>' + (book ? 'Astor Library reading page' : 'Astor Library free guide') + '</b>' + copy + '</span><a href="/editorial/">How we work <span aria-hidden="true">&rarr;</span></a></aside>';
  const withIntro = html.replace(/(<section class="page-intro"[\s\S]*?<\/section>)/i, '$1' + credit);
  return withIntro === html ? html.replace(/(<main\b[^>]*>)/i, '$1' + credit) : withIntro;
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

function prepareHtml(html, source) {
  html = addBookStructuredData(html, source);
  html = addResourceStructuredData(html, source);
  html = addAuthorStructuredData(html, source);
  html = addCollectionStructuredData(html, source);
  html = addGlobalMetadata(html, source);
  html = addDiscoveryNavigation(html, source);
  html = addBookAuthorLink(html, source);
  html = addBookReadingNavigation(html, source);
  html = addResourceReadingNavigation(html, source);
  html = addEditorialCredit(html, source);
  html = addSiteIndexLink(html, source);

  if (!html.includes('/assets/site.js')) {
    html = html.replace('</head>', '<script src="/assets/site.js" defer></script></head>');
  }

  if (html.includes('<main') && !html.includes('class="skip-link"')) {
    html = html.replace(/<main(?![^>]*\bid=)([^>]*)>/, '<main id="main-content"$1>');
    html = html.replace(/<body([^>]*)>/, '<body$1><a class="skip-link" href="#main-content">Skip to main content</a>');
  }

  html = html.replace(/<img\b[^>]*\bsrc="https?:\/\/[^"]+"[^>]*>/gi, addImageHints);
  html = html.replace(/<a class="(?:resource-card|study-card[^"]*)"[\s\S]*?<\/a>/g, block => {
    return block.replace(/<img\b[^>]*>/, addImageHints);
  });
  html = html.replace(/<img\b[^>]*\bloading="lazy"[^>]*>/g, addImageHints);
  return html;
}

function copyRecursive(source, destination) {
  const stat = fs.statSync(source);

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
    } else {
      fs.copyFileSync(source, destination);
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of fs.readdirSync(root)) {
  if (excluded.has(entry)) continue;
  copyRecursive(path.join(root, entry), path.join(outDir, entry));
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
    if (/http-equiv="refresh"/i.test(html)) continue;
    sitemapUrls.push(absoluteUrl(pageHref(path.join(root, path.relative(outDir, fullPath)))));
  }
}

collectSitemap(outDir);
sitemapUrls.sort((a, b) => a.localeCompare(b, 'en'));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemapUrls.map(url => '  <url><loc>' + escapeHtml(url) + '</loc></url>').join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);

const pdfCanonicalRules = [];
for (const resource of discovery.resources || []) {
  const source = path.join(root, resource.href.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(source)) continue;
  const html = fs.readFileSync(source, 'utf8');
  const pdfs = new Set(Array.from(html.matchAll(/href="(\/[^"?#]+\.pdf)"/gi), match => match[1]));
  for (const pdf of pdfs) {
    pdfCanonicalRules.push(pdf + '\n  Link: <' + absoluteUrl(resource.href) + '>; rel="canonical"');
  }
}
pdfCanonicalRules.sort((a, b) => a.localeCompare(b, 'en'));
fs.writeFileSync(path.join(outDir, '_headers'), '# Keep downloadable PDFs connected to their fuller guide pages.\n' + pdfCanonicalRules.join('\n\n') + '\n');

console.log('Static site copied to dist/ with ' + sitemapUrls.length + ' preferred addresses and ' + pdfCanonicalRules.length + ' PDF links.');

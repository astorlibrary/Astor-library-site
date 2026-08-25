const fs = require('fs');
const path = require('path');
const authorProfileData = require('./author-profiles');

const root = process.cwd();
const outDir = path.join(root, 'dist');
const SITE_URL = 'https://astorlibrary.com';
// This date changes only when a site-wide release materially updates every page.
const SITE_LASTMOD = '2026-08-25';
const discoveryFile = path.join(root, 'assets', 'content-index.json');
const discovery = fs.existsSync(discoveryFile)
  ? JSON.parse(fs.readFileSync(discoveryFile, 'utf8'))
  : { books: [] };
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
  const mainAndAfter = html.slice(mainStart).replace(/<img\b[^>]*>/i, function (tag) {
    let result = tag.replace(/\bloading="lazy"/i, 'loading="eager"');
    if (!/\bloading=/i.test(result)) result = result.replace('<img', '<img loading="eager"');
    if (!/\bfetchpriority=/i.test(result)) result = result.replace('<img', '<img fetchpriority="high"');
    return result;
  });
  return beforeMain + mainAndAfter;
}

function useBookThumbnail(tag, sourceFile) {
  const source = tag.match(/\bsrc="([^"]+)"/i)?.[1];
  if (!source || /^(?:[a-z]+:|\/\/)/i.test(source)) return tag;
  const pageDirectory = path.posix.dirname(pageHref(sourceFile));
  const resolvedSource = source.startsWith('/')
    ? source
    : path.posix.resolve(pageDirectory, source);
  const thumbnail = collectionBanners[resolvedSource] || bookThumbnails[resolvedSource] || '';
  return thumbnail ? tag.replace(/\bsrc="[^"]+"/i, 'src="' + thumbnail + '"') : tag;
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
  const { resource, relatedBook, href } = context;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: resource.title,
    description: resource.description,
    url: absoluteUrl(href),
    sameAs: resource.externalUrl,
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
    image: study.image ? absoluteUrl(study.image) : undefined,
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
      ...(discovery.passages || [])
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
    image: absoluteUrl(passage.image),
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

function addGlobalMetadata(html, source) {
  if (/http-equiv="refresh"/i.test(html)) return html;
  const href = pageHref(source);
  const title = plainText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Astor Library');
  const description = plainText(html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] || 'Complete classic texts, study editions, explanatory notes and free literature resources from Astor Library.');
  const book = bookContext(source)?.book;
  const resource = resourceContext(source)?.resource;
  const author = authorContext(source);
  const subject = subjectContext(source);
  const passage = passageContext(source);
  const study = studyContext(source);
  const image = book?.image || resource?.image || passage?.image || study?.image || author?.image || subject?.image || '/Logo.png';
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
    const withIntro = html.replace(/(<section class="[^"]*\bpage-intro\b[^"]*")/i, breadcrumb + '$1');
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

function addBookPassageLinks(html, source) {
  const context = bookContext(source);
  if (!context || html.includes('class="book-passage-shelf"')) return html;
  const { book } = context;
  const passages = (discovery.passages || []).filter(passage => passage.relatedBooks?.includes(book.href));
  if (!passages.length) return html;

  const cards = passages.map(function (passage) {
    const number = String((discovery.passages || []).indexOf(passage) + 1).padStart(2, '0');
    return '<a href="' + escapeHtml(passage.href) + '">' +
      '<span>' + number + ' · Close reading</span>' +
      '<blockquote>' + escapeHtml(passage.title) + '</blockquote>' +
      '<p>' + escapeHtml(passage.description) + '</p>' +
      '<b>Read the annotated passage <span aria-hidden="true">&rarr;</span></b></a>';
  }).join('');

  const resources = (discovery.resources || [])
    .filter(resource => resource.relatedBooks?.includes(book.href))
    .slice(0, 3);
  const resourceLinks = resources.length
    ? '<nav class="book-passage-resources" aria-label="Free resources for ' + escapeHtml(book.title) + '">' +
      '<span>Free guides for this book</span>' +
      resources.map(resource => '<a href="' + escapeHtml(resource.href) + '">' + escapeHtml(resource.title) + '</a>').join('') +
      '</nav>'
    : '';
  const section = '<section class="book-passage-shelf" aria-labelledby="book-passage-title">' +
    '<div class="book-passage-shelf-head"><div><p class="kicker">Annotated passages</p><h2 id="book-passage-title">Close readings from this book.</h2></div>' +
    '<p>Each page reproduces a short passage and explains its language, structure and immediate context.</p></div>' +
    '<div class="book-passage-grid">' + cards + '</div>' + resourceLinks + '</section>';
  return html.replace('</main>', section + '</main>');
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
  const copy = book
    ? 'Dates, publication details and historical claims are checked against the sources listed on this page.'
    : 'This free guide contains summaries, context or analysis for reading, teaching and independent study.';
  const credit = '<aside class="astor-page-credit" aria-label="About this page"><span><b>' + (book ? 'Astor Library reading page' : 'Astor Library free guide') + '</b>' + copy + '</span><a href="/editorial/">How we work <span aria-hidden="true">&rarr;</span></a></aside>';
  const withIntro = html.replace(/(<section class="[^"]*\bpage-intro\b[^"]*"[\s\S]*?<\/section>)/i, '$1' + credit);
  return withIntro === html ? html.replace(/(<main\b[^>]*>)/i, '$1' + credit) : withIntro;
}

function addEditionSample(html, source) {
  if (html.includes('class="edition-sample"')) return html;
  const samples = {
    '/books/macbeth/': {
      title: 'Sample pages from the Macbeth edition',
      copy: 'The spread shows the complete play with a scene summary, line numbers and explanatory notes keyed to the text.',
      image: '/Macbeth%20Sample.png',
      alt: 'Two sample pages from Macbeth showing the complete play, a scene summary, line numbers and explanatory footnotes'
    },
    '/books/the-odyssey/': {
      title: 'Sample pages from The Odyssey edition',
      copy: 'The spread shows the prose text with a chapter summary, short explanatory notes and a contextual panel.',
      image: '/The%20Odyssey%20Sample.png',
      alt: 'Two sample pages from The Odyssey showing the prose text, a Story so far summary and a contextual note panel'
    },
    '/study/rime-of-the-ancient-mariner/': {
      title: 'Sample pages from The Rime of the Ancient Mariner',
      copy: 'The spread shows the complete poem with marginal glosses, line numbers and explanatory footnotes.',
      image: '/Rime%20of%20the%20Ancient%20Mariner%20Sample.png',
      alt: 'Two sample pages from The Rime of the Ancient Mariner showing the poem, marginal glosses, line numbers and footnotes'
    },
    '/study/': {
      title: 'Sample pages from the Othello Study Edition',
      copy: 'The spread shows scene analysis, key quotations, method notes and example sentences for essay writing.',
      image: '/Othello%20Study%20Sample.png',
      alt: 'Two sample pages from the Othello Study Edition showing scene analysis, key quotations, method notes and example sentences'
    },
    '/shakespeare/': {
      title: 'Sample pages from Shakespeare’s Sonnets',
      copy: 'The spread shows complete poems with short introductions, line numbers and explanatory footnotes.',
      image: '/Shakespeare%27s%20Sonnets%20Sample.png',
      alt: 'Two sample pages from Shakespeare’s Sonnets showing complete poems, short introductions, line numbers and explanatory footnotes'
    }
  };
  const sample = samples[pageHref(source)];
  if (!sample) return html;

  const section = '<section class="edition-sample" aria-labelledby="edition-sample-title">' +
    '<div><p class="kicker">Inside the edition</p><h2 id="edition-sample-title">' + escapeHtml(sample.title) + '</h2><p>' + escapeHtml(sample.copy) + '</p></div>' +
    '<figure><a href="' + sample.image + '"><img src="' + sample.image + '" alt="' + escapeHtml(sample.alt) + '" width="1800" height="1360"></a><figcaption>Select the image to view the sample at full size.</figcaption></figure></section>';
  const withIntro = html.replace(/(<section class="[^"]*\bpage-intro\b[^"]*"[\s\S]*?<\/section>)/i, '$1' + section);
  return withIntro === html ? html.replace(/(<nav class="book-end-nav\b)/i, section + '$1') : withIntro;
}

function addContextImageShelf(html, source) {
  if (html.includes('class="context-image-shelf"')) return html;
  const href = pageHref(source);
  const book = bookContext(source)?.book;
  const resource = resourceContext(source)?.resource;
  const study = studyContext(source);
  const subject = subjectContext(source);
  const passage = passageContext(source);
  const collection = (discovery.collections || []).find(item => item.href === href);
  let candidates = [];
  let heading = 'Related editions and guides.';
  let label = 'Related catalogue pages';

  const booksFor = routes => (routes || []).map(route => discovery.books.find(item => item.href === route)).filter(Boolean);
  const resourcesFor = routes => (discovery.resources || []).filter(item => item.relatedBooks?.some(route => routes.includes(route)));
  const studiesFor = routes => (discovery.studyEditions || []).filter(item => item.relatedBooks?.some(route => routes.includes(route)));

  if (book) {
    const routes = [book.href];
    candidates = [
      ...resourcesFor(routes),
      ...studiesFor(routes),
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
  } else if (collection) {
    candidates = (discovery.books || []).filter(item => item.collection === collection.title);
    heading = 'Editions in this collection.';
    label = collection.title;
  } else {
    return html;
  }

  const seen = new Set();
  const items = candidates.filter(item => {
    if (!item?.href || !item?.image || item.href === href || seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  }).slice(0, 5);
  if (items.length < 2) return html;

  const cards = items.map(item => {
    const external = /^https?:\/\//i.test(item.href);
    const externalAttributes = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return '<a href="' + escapeHtml(item.href) + '"' + externalAttributes + '>' +
      '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.imageAlt || item.title + ' cover') + '" width="480" height="720">' +
      '<span><small>' + escapeHtml(item.typeLabel || 'Astor Library') + '</small><strong>' + escapeHtml(item.title) + '</strong></span></a>';
  }).join('');

  const section = '<section class="context-image-shelf" aria-labelledby="context-image-shelf-title">' +
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
    '/modern/'
  ].some(route => href === route || href.startsWith(route));
  const authorsCurrent = href === '/authors/' || href.startsWith('/authors/');
  const subjectsCurrent = href === '/subjects/' || href.startsWith('/subjects/');
  const readingRoutesCurrent = href === '/reading-routes/' || href.startsWith('/reading-routes/');
  const resourcesCurrent = href === '/resources/' || href.startsWith('/resources/');
  const studyCurrent = href === '/study/' || href.startsWith('/study/');
  const passageCurrent = href === '/passage-room/' || href.startsWith('/passage-room/');
  const searchCurrent = href === '/explore/' || href.startsWith('/explore/');
  const accountCurrent = href === '/account/' || href.startsWith('/account/');
  const browseCurrent = hardbacksCurrent || shakespeareCurrent || periodsCurrent || authorsCurrent || subjectsCurrent || readingRoutesCurrent;

  const header = `<header class="site-header astor-global-header">
  <div class="astor-header-identity">
    <a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-header-mark.png" alt="" width="24" height="54"><span class="word">LIBRARY</span></a>
    <p class="astor-header-strap"><span>Independent literary editions</span><small>For readers, students &amp; teachers</small></p>
    <button class="site-nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation"><span>Menu</span><span class="site-nav-mark" aria-hidden="true"></span></button>
  </div>
  <nav class="nav astor-primary-nav" id="site-navigation" aria-label="Primary navigation">
    <div class="astor-primary-links">
      <a class="nav-link" href="/library/"${current(booksCurrent, href === '/library/')}><span class="astor-nav-number" aria-hidden="true">01</span><span>Books</span></a>
      <details class="astor-browse-menu${browseCurrent ? ' is-current-section' : ''}">
        <summary aria-controls="astor-browse-panel" aria-expanded="false"><span class="astor-nav-number" aria-hidden="true">02</span><span>Browse library</span></summary>
        <div class="astor-browse-panel" id="astor-browse-panel">
          <div class="astor-browse-feature">
            <p>Open the catalogue</p>
            <h2>Find a book, writer or way into the text.</h2>
            <span>Move through Astor Library by literary period, subject, author or a connected reading route.</span>
            <a href="/explore/">Search every title <i aria-hidden="true">&rarr;</i></a>
          </div>
          <div class="astor-browse-directory">
            <section aria-labelledby="astor-browse-by-title">
              <h2 id="astor-browse-by-title">Browse by</h2>
              <div class="astor-browse-cards">
                <a href="/shakespeare/"${current(shakespeareCurrent, href === '/shakespeare/')}><em aria-hidden="true">01</em><span><b>Shakespeare</b><small>Plays, poems and editions</small></span></a>
                <a href="/hardbacks/"${current(hardbacksCurrent, href === '/hardbacks/')}><em aria-hidden="true">02</em><span><b>Hardbacks</b><small>Gift and casebound editions</small></span></a>
                <a href="/authors/"${current(authorsCurrent, href === '/authors/')}><em aria-hidden="true">03</em><span><b>Writers</b><small>Authors and their Astor editions</small></span></a>
                <a href="/subjects/"${current(subjectsCurrent, href === '/subjects/')}><em aria-hidden="true">04</em><span><b>Subjects</b><small>Genres, themes and contexts</small></span></a>
                <a href="/reading-routes/"${current(readingRoutesCurrent, href === '/reading-routes/')}><em aria-hidden="true">05</em><span><b>Reading routes</b><small>Books connected by a question</small></span></a>
              </div>
            </section>
            <section class="astor-period-directory" aria-labelledby="astor-period-title">
              <div class="astor-directory-heading"><h2 id="astor-period-title">Literary periods</h2><a href="/classic-literature/"${current(href === '/classic-literature/')}>View the overview <span aria-hidden="true">&rarr;</span></a></div>
              <div class="astor-period-links">
                <a href="/ancient-epic/"${current(inRoute('/ancient-epic/'))}><b>Ancient &amp; Epic</b><span>Epic, myth and classical inheritance</span></a>
                <a href="/renaissance-early-modern/"${current(inRoute('/renaissance-early-modern/'))}><b>Renaissance</b><span>Drama, poetry and early modern prose</span></a>
                <a href="/restoration-enlightenment/"${current(inRoute('/restoration-enlightenment/'))}><b>Restoration</b><span>Satire, reason and eighteenth-century writing</span></a>
                <a href="/romantic-regency/"${current(inRoute('/romantic-regency/'))}><b>Romantic &amp; Regency</b><span>Revolution, nature and the imagination</span></a>
                <a href="/victorian/"${current(inRoute('/victorian/'))}><b>Victorian</b><span>Industry, empire and the modern city</span></a>
                <a href="/american/"${current(inRoute('/american/'))}><b>American</b><span>Nation, freedom and American voices</span></a>
                <a href="/modern/"${current(inRoute('/modern/'))}><b>Modern</b><span>Modernism, politics and new forms</span></a>
              </div>
            </section>
          </div>
        </div>
      </details>
      <a class="nav-link" href="/resources/"${current(resourcesCurrent, href === '/resources/')}><span class="astor-nav-number" aria-hidden="true">03</span><span>Free resources</span></a>
      <a class="nav-link" href="/study/"${current(studyCurrent, href === '/study/')}><span class="astor-nav-number" aria-hidden="true">04</span><span>Study editions</span></a>
      <a class="nav-link" href="/passage-room/"${current(passageCurrent, href === '/passage-room/')}><span class="astor-nav-number" aria-hidden="true">05</span><span>Passage Room</span></a>
    </div>
    <div class="astor-nav-utilities">
      <a class="astor-utility-link astor-search-link" href="/explore/"${current(searchCurrent, href === '/explore/')}><span aria-hidden="true"></span>Search</a>
      <a class="astor-utility-link astor-account-link" href="/account/" data-auth-link${current(accountCurrent, href === '/account/')}>Sign in</a>
    </div>
  </nav>
</header>`;

  const footer = `<footer class="site-footer astor-global-footer">
  <div class="astor-footer-signature"><p class="footer-brand">Astor Library</p><p>Classic books, study editions and free literature resources.</p></div>
  <div class="astor-footer-group"><h2>Library</h2><a href="/library/">All books</a><a href="/hardbacks/">Hardback editions</a><a href="/shakespeare/">Shakespeare</a><a href="/classic-literature/">Periods &amp; collections</a><a href="/authors/">Writers</a><a href="/subjects/">Subjects</a></div>
  <div class="astor-footer-group"><h2>Read &amp; study</h2><a href="/resources/">Free resources</a><a href="/study/">Study editions</a><a href="/passage-room/">Passage Room</a><a href="/reading-routes/">Reading routes</a></div>
  <div class="astor-footer-group"><h2>Astor</h2><a href="/about/">About</a><a href="/editorial/">Editorial standards</a><a href="/privacy/">Privacy</a><a href="mailto:support@astorlibrary.com">Contact &amp; support</a><a href="https://ko-fi.com/astorlibrary">Support Astor Library</a><a href="/site-index/">Site index</a></div>
</footer>`;

  html = html.replace(/<header\b[^>]*\bclass=(?:"[^"]*\b(?:site-header|home-masthead)\b[^"]*"|'[^']*\b(?:site-header|home-masthead)\b[^']*')[^>]*>[\s\S]*?<\/header>/i, header);
  html = html.replace(/<footer\b[^>]*\bclass=(?:"[^"]*\bsite-footer\b[^"]*"|'[^']*\bsite-footer\b[^']*')[^>]*>[\s\S]*?<\/footer>/i, footer);

  if (!/href=["']\/assets\/navigation\.css["']/i.test(html)) {
    html = html.replace('</head>', '<link rel="stylesheet" href="/assets/navigation.css"></head>');
  }
  return html;
}

function prepareHtml(html, source) {
  html = addBookStructuredData(html, source);
  html = addResourceStructuredData(html, source);
  html = addStudyStructuredData(html, source);
  html = addAuthorStructuredData(html, source);
  html = addCollectionStructuredData(html, source);
  html = addPassageStructuredData(html, source);
  html = addGlobalMetadata(html, source);
  html = addDiscoveryNavigation(html, source);
  html = addBookAuthorLink(html, source);
  html = addBookPassageLinks(html, source);
  html = addBookReadingNavigation(html, source);
  html = addResourceReadingNavigation(html, source);
  html = addEditorialCredit(html, source);
  html = addEditionSample(html, source);
  html = addContextImageShelf(html, source);
  html = addSiteIndexLink(html, source);
  html = addGlobalNavigation(html, source);

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
  html = html.replace(/<img\b[^>]*>/gi, function (tag) { return useBookThumbnail(tag, source); });
  return html;
}

function copyRecursive(source, destination) {
  const stat = fs.statSync(source);
  const name = path.basename(source);

  // Local environment files can contain production credentials and never belong in dist.
  if (name === '.dev.vars' || name.startsWith('.dev.vars.') || name === '.env' || name.startsWith('.env.') || name === '.npmrc') return;
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
    if (/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*\bnoindex\b/i.test(html) ||
        /<meta\b[^>]*\bcontent=["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname=["']robots["']/i.test(html)) continue;
    const image = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] || '';
    const imageTitle = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] || '';
    sitemapUrls.push({
      url: absoluteUrl(pageHref(path.join(root, path.relative(outDir, fullPath)))),
      image: image && !/\/Logo\.(?:png|jpe?g|webp)$/i.test(image) ? absoluteUrl(image) : '',
      imageTitle: imageTitle
    });
  }
}

collectSitemap(outDir);
sitemapUrls.sort((a, b) => a.url.localeCompare(b.url, 'en'));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
  sitemapUrls.map(page => {
    const image = page.image
      ? '<image:image><image:loc>' + escapeHtml(page.image) + '</image:loc>' +
        (page.imageTitle ? '<image:title>' + escapeHtml(decodeEntities(page.imageTitle)) + '</image:title>' : '') +
        '</image:image>'
      : '';
    return '  <url><loc>' + escapeHtml(page.url) + '</loc><lastmod>' + SITE_LASTMOD + '</lastmod>' + image + '</url>';
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

/account/*
  Cache-Control: private, no-store
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow

/presentations/*
  X-Robots-Tag: noindex, follow

/assets/presentations/*
  X-Robots-Tag: noindex, noimageindex, noarchive
`);

console.log('Static site copied to dist/ with ' + sitemapUrls.length + ' preferred addresses and image sitemap metadata.');

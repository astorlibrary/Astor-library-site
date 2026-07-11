const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'dist');
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

function bookContext(source) {
  const relative = path.relative(root, source).split(path.sep).join('/');
  if (!relative.startsWith('books/') || !relative.endsWith('/index.html')) return null;

  const href = '/' + path.posix.dirname(relative) + '/';
  const book = discovery.books.find(item => item.href === href);
  if (!book) return null;
  const collection = discovery.collections?.find(item => item.title === book.collection);
  return { book, collection };
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
    url: book.href,
    inLanguage: 'en-GB',
    publisher: {
      '@type': 'Organization',
      name: 'Astor Library'
    },
    isPartOf: {
      '@type': 'CollectionPage',
      name: book.collection,
      url: collection?.href || '/library/'
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'All books', item: '/library/' },
        { '@type': 'ListItem', position: 2, name: book.collection, item: collection?.href || '/library/' },
        { '@type': 'ListItem', position: 3, name: book.title, item: book.href }
      ]
    },
    about: {
      '@type': 'Book',
      name: book.title,
      url: book.href,
      image: book.image,
      author: {
        '@type': 'Person',
        name: book.author
      }
    }
  };

  const canonical = html.includes('rel="canonical"') ? '' : '<link rel="canonical" href="' + book.href + '">';
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  const structuredData = html.includes('data-astor-book-schema')
    ? ''
    : '<script type="application/ld+json" data-astor-book-schema>' + json + '</script>';
  return html.replace('</head>', canonical + structuredData + '</head>');
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
      '<a href="' + escapeHtml(collectionHref) + '">More from ' + escapeHtml(book.collection) + '</a>' +
      '<a href="/explore/">Find another book <span aria-hidden="true">&rarr;</span></a></nav>';
    html = html.replace('</main>', endNav + '</main>');
  }

  return html;
}

function prepareHtml(html, source) {
  html = addBookStructuredData(html, source);
  html = addBookReadingNavigation(html, source);

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

console.log('Static site copied to dist/ without repository metadata.');

const fs = require('fs');
const path = require('path');
const releaseData = require('./format-release-data');

const root = process.cwd();
const formatStart = '<!-- ASTOR FORMAT OPTIONS START -->';
const formatEnd = '<!-- ASTOR FORMAT OPTIONS END -->';
const collectionOrder = [
  'Ancient & Epic',
  'Renaissance & Early Modern',
  'Shakespeare',
  'Restoration & Enlightenment',
  'Romantic & Regency',
  'Victorian',
  'American Classics',
  'Modern Classics'
];
const collectionIntroductions = {
  'Ancient & Epic': 'The <em>Iliad</em>, <em>Odyssey</em> and <em>Aeneid</em> together in the Ancient &amp; Epic series.',
  Shakespeare: 'The complete Sonnets in the distinct cover system of The Astor Shakespeare.',
  Victorian: 'Victorian fiction and seasonal collections, from Dorian Gray to Christmas and the Fifth of November.',
  'American Classics': 'Fitzgerald&rsquo;s <em>The Great Gatsby</em> and a collection tracing classic American stories into the Halloween tradition.'
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function assetPath(file) {
  return '/' + encodeURIComponent(file).replace(/'/g, '%27');
}

function requireFields(record, fields, label) {
  for (const field of fields) {
    if (typeof record[field] !== 'string' || !record[field].trim()) {
      throw new Error(`${label} is missing ${field}`);
    }
  }
}

function validateSlug(slug, label) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`${label} has an invalid slug: ${slug}`);
  }
}

function validateAsset(file, label) {
  if (path.basename(file) !== file || file === '.' || file === '..') {
    throw new Error(`${label} must name a root-level asset: ${file}`);
  }
  const target = path.join(root, file);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`${label} is missing: ${file}`);
  }
}

function validatePurchaseUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} is not a valid URL: ${value}`);
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'mybook.to' || parsed.pathname === '/' || parsed.username || parsed.password) {
    throw new Error(`${label} must be a complete https://mybook.to/ link: ${value}`);
  }
}

function validateInternalHref(value, label) {
  if (!/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)+$/.test(value)) {
    throw new Error(`${label} is not a canonical internal route: ${value}`);
  }
  const target = path.join(root, value.slice(1), 'index.html');
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`${label} does not resolve to a source page: ${value}`);
  }
  return target;
}

function validateReleaseData() {
  if (!releaseData || !Array.isArray(releaseData.books) || !Array.isArray(releaseData.hardbacks)) {
    throw new Error('format-release-data must export { books, hardbacks } arrays');
  }
  if (!releaseData.books.length || !releaseData.hardbacks.length) {
    throw new Error('format-release-data must include paperback books and hardback formats');
  }

  const bookSlugs = new Set();
  for (const book of releaseData.books) {
    const label = `Paperback record ${book.title || book.slug || '(untitled)'}`;
    requireFields(book, ['slug', 'title', 'author', 'image', 'purchaseUrl', 'collection', 'collectionHref', 'collectionFile'], label);
    validateSlug(book.slug, label);
    if (bookSlugs.has(book.slug)) throw new Error(`Duplicate paperback slug: ${book.slug}`);
    bookSlugs.add(book.slug);
    validateAsset(book.image, `${label} cover`);
    validatePurchaseUrl(book.purchaseUrl, `${label} purchase URL`);
    validateInternalHref(book.collectionHref, `${label} collection route`);
    if (book.collectionFile !== book.collectionHref.slice(1) + 'index.html') {
      throw new Error(`${label} has mismatched collectionFile and collectionHref`);
    }
    validateInternalHref(`/books/${book.slug}/`, `${label} book route`);
  }

  const hardbackHrefs = new Set();
  for (const hardback of releaseData.hardbacks) {
    const label = `Hardback record ${hardback.title || hardback.slug || '(untitled)'}`;
    requireFields(hardback, [
      'href', 'slug', 'title', 'author', 'collection', 'collectionHref', 'image', 'purchaseUrl',
      'paperbackImage', 'paperbackPurchaseUrl', 'deck', 'editorial'
    ], label);
    validateSlug(hardback.slug, label);
    if (hardback.href !== `/books/${hardback.slug}/`) throw new Error(`${label} has mismatched href and slug`);
    if (hardbackHrefs.has(hardback.href)) throw new Error(`Duplicate hardback route: ${hardback.href}`);
    hardbackHrefs.add(hardback.href);
    validateInternalHref(hardback.href, `${label} book route`);
    validateInternalHref(hardback.collectionHref, `${label} collection route`);
    validateAsset(hardback.image, `${label} cover`);
    validateAsset(hardback.paperbackImage, `${label} paperback cover`);
    validatePurchaseUrl(hardback.purchaseUrl, `${label} purchase URL`);
    validatePurchaseUrl(hardback.paperbackPurchaseUrl, `${label} paperback purchase URL`);
    if (!/(?:hardback|hardcover|casebound)/i.test(hardback.image)) {
      throw new Error(`${label} cover filename does not identify hardback artwork: ${hardback.image}`);
    }
    if (/(?:hardback|hardcover|casebound)/i.test(hardback.paperbackImage) || hardback.paperbackImage === hardback.image) {
      throw new Error(`${label} paperback artwork is not clearly distinct from the hardback cover`);
    }
  }
}

function formatPanel(book) {
  const title = escapeHtml(book.title);
  const headingId = `edition-formats-${book.slug}`;
  return `${formatStart}
<section class="edition-format-panel" aria-labelledby="${headingId}">
  <div class="edition-format-intro"><p class="kicker">Available formats</p><h2 id="${headingId}">Paperback and hardback.</h2><p>Choose the format that suits your reading or shelf. Both editions contain the same text and editorial material; each retailer link opens the cover shown below.</p></div>
  <div class="edition-format-grid">
    <article class="edition-format-card is-paperback"><a class="edition-format-cover" href="${escapeHtml(book.paperbackPurchaseUrl)}" aria-label="View the paperback edition of ${title}"><img src="${assetPath(book.paperbackImage)}" alt="Astor Library ${title} paperback cover" loading="lazy"></a><div class="edition-format-copy"><p class="edition-format-label">Paperback edition</p><h3><em>${title}</em></h3><p>The regular Astor paperback, with the text and editorial material described on this page.</p><a class="button primary" href="${escapeHtml(book.paperbackPurchaseUrl)}">View paperback edition</a></div></article>
    <article class="edition-format-card is-hardback"><a class="edition-format-cover" href="${escapeHtml(book.purchaseUrl)}" aria-label="View the hardback edition of ${title}"><img src="${assetPath(book.image)}" alt="Astor Library ${title} hardback cover" loading="lazy"></a><div class="edition-format-copy"><p class="edition-format-label">Hardback edition</p><h3><em>${title}</em></h3><p>${escapeHtml(book.editorial)}</p><a class="button secondary" href="${escapeHtml(book.purchaseUrl)}">View hardback edition</a></div></article>
  </div>
</section>
${formatEnd}`;
}

function addFormatPanel(book) {
  const file = validateInternalHref(book.href, `${book.title} book route`);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(new RegExp(formatStart + '[\\s\\S]*?' + formatEnd, 'g'), '');
  const endNavigation = html.indexOf('<nav class="book-end-nav"');
  const mainClose = html.lastIndexOf('</main>');
  const insertion = endNavigation !== -1 ? endNavigation : mainClose;
  if (insertion === -1) throw new Error(`Could not add format choices to ${book.href}`);
  html = html.slice(0, insertion).replace(/\s*$/, '\n') + formatPanel(book) + '\n' + html.slice(insertion);
  fs.writeFileSync(file, html);
}

function header() {
  return `<header class="site-header">
  <a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt="Astor Library torch"><span class="word">LIBRARY</span></a>
  <nav class="nav" aria-label="Primary navigation">
    <a class="nav-link" href="/">Home</a><a class="nav-link" href="/explore/">Explore</a><a class="nav-link" href="/passage-room/">Passages</a><a class="nav-link" href="/subjects/">Subjects</a><a class="nav-link" href="/authors/">Writers</a><a class="nav-link" href="/library/">All books</a>
    <details class="browse-menu"><summary>Browse collections</summary><div class="browse-panel">
      <a class="browse-card" href="/ancient-epic/" style="--browse-image:url('/Ancient%20and%20Epic.png')"><span>Ancient &amp; Epic</span></a><a class="browse-card" href="/renaissance-early-modern/" style="--browse-image:url('/Renaissance%20and%20Early%20Modern.png')"><span>Renaissance &amp; Early Modern</span></a><a class="browse-card" href="/shakespeare/" style="--browse-image:url('/Shakespeare.png')"><span>Shakespeare</span></a><a class="browse-card" href="/restoration-enlightenment/" style="--browse-image:url('/Restoration%20and%20Enlightenment.png')"><span>Restoration &amp; Enlightenment</span></a><a class="browse-card" href="/romantic-regency/" style="--browse-image:url('/Romantic%20and%20Regency.png')"><span>Romantic &amp; Regency</span></a><a class="browse-card" href="/victorian/" style="--browse-image:url('/Victorian.png')"><span>Victorian</span></a><a class="browse-card" href="/american/" style="--browse-image:url('/American%20Classics.png')"><span>American Classics</span></a><a class="browse-card" href="/modern/" style="--browse-image:url('/Modern%20Classics.png')"><span>Modern Classics</span></a><a class="browse-card" href="/study/" style="--browse-image:url('/Study%20Resources.png')"><span>Study Editions</span></a>
    </div></details><a class="nav-link" href="/study/">Study editions</a><a class="nav-link" href="/resources/">Free resources</a>
  </nav>
</header>`;
}

function hardbackCard(book) {
  const title = escapeHtml(book.title);
  return `<article class="hardback-card">
  <a class="hardback-cover" href="${escapeHtml(book.href)}"><img src="${assetPath(book.image)}" alt="Astor Library ${title} hardback cover" loading="lazy"></a>
  <div class="hardback-card-copy"><p class="hardback-format">Hardback edition</p><h3><a href="${escapeHtml(book.href)}"><em>${title}</em></a></h3><p class="hardback-author">${escapeHtml(book.author)}</p><p>${escapeHtml(book.deck)}</p><div class="button-row"><a class="button primary" href="${escapeHtml(book.href)}">Open book page</a><a class="button secondary" href="${escapeHtml(book.purchaseUrl)}">View hardback</a></div></div>
</article>`;
}

function hardbackPage(hardbacks) {
  const grouped = new Map();
  for (const book of hardbacks) {
    if (!grouped.has(book.collection)) grouped.set(book.collection, []);
    grouped.get(book.collection).push(book);
  }
  const groups = [...grouped.entries()].sort((a, b) => {
    const aIndex = collectionOrder.indexOf(a[0]);
    const bIndex = collectionOrder.indexOf(b[0]);
    if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0], 'en');
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  const heroSlugs = [
    'sleepy-hollow-and-other-stories',
    'the-odyssey',
    'a-victorian-bonfire-night'
  ];
  const heroBooks = heroSlugs.map(slug => {
    const book = hardbacks.find(candidate => candidate.slug === slug);
    if (!book) throw new Error(`Missing hardback hero edition: ${slug}`);
    return book;
  });
  const heroCovers = heroBooks.map((book, index) => {
    const title = escapeHtml(book.title);
    const loading = index === 1 ? ' fetchpriority="high"' : ' loading="lazy"';
    return `<a href="${escapeHtml(book.href)}" aria-label="Open ${title}"><img src="${assetPath(book.image)}" alt=""${loading} decoding="async"></a>`;
  }).join('');
  const sections = groups.map(([collection, books], index) => {
    const id = 'hardbacks-' + collection.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const collectionHref = books[0].collectionHref;
    const introduction = collectionIntroductions[collection] || `Hardback editions from the ${escapeHtml(collection)} collection.`;
    const cards = books.slice().sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' })).map(hardbackCard).join('\n');
    return `<section class="hardback-collection"${index === 0 ? ' id="hardback-shelf"' : ''} aria-labelledby="${id}"><div class="hardback-collection-heading"><div><p class="kicker">Astor collection</p><h2 id="${id}">${escapeHtml(collection)}</h2></div><p>${introduction}</p><a class="home-text-link" href="${escapeHtml(collectionHref)}">Browse the full collection <span aria-hidden="true">&rarr;</span></a></div><div class="hardback-grid">${cards}</div></section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en-GB">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hardback Editions | Astor Library</title><meta name="description" content="Browse Astor Library hardback editions across epic, Shakespeare, Victorian and American literature, with matched paperback links on every book page."><link rel="stylesheet" href="/assets/styles.css"></head>
<body>${header()}
<main id="main-content" class="page-wrap hardback-page">
  <section class="hardback-hero"><div class="hardback-hero-copy"><p class="kicker">Books to keep and give</p><h1>Hardback editions.</h1><p class="deck">A separate shelf for Astor books available in hardback: annotated classics, epic poetry, Shakespeare and seasonal collections. Each cover below is the hardback artwork for that title.</p><div class="button-row"><a class="button primary" href="#hardback-shelf">Browse the hardback shelf</a><a class="button secondary" href="/library/">All Astor books</a></div></div><nav class="hardback-hero-covers" aria-label="Highlighted hardback editions">${heroCovers}</nav></section>
  <section class="hardback-editorial-note" aria-label="About Astor hardback editions"><p><strong>Two formats, one clear route.</strong> Every hardback opens the book&rsquo;s main Astor page, where its hardback and paperback covers sit together with separate retailer links.</p><p>The section is organised by the established Astor collections so that each cover remains beside books from its own visual series.</p></section>
  ${sections}
  <nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a><a href="/library/">Browse all books</a><a href="/explore/">Search Astor Library <span aria-hidden="true">&rarr;</span></a></nav>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Complete classic texts, study editions and free literature resources.</p></div><div class="footer-links"><a href="/library/">All books</a><a href="/shakespeare/">Shakespeare</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></div></footer>
</body></html>`;
}

validateReleaseData();
for (const hardback of releaseData.hardbacks) addFormatPanel(hardback);
const hardbackDirectory = path.join(root, 'hardbacks');
fs.mkdirSync(hardbackDirectory, { recursive: true });
fs.writeFileSync(path.join(hardbackDirectory, 'index.html'), hardbackPage(releaseData.hardbacks));
console.log(`Built ${releaseData.hardbacks.length} paired-format panels and the hardback collection page.`);

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const SITE_URL = 'https://astorlibrary.com';
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const htmlFiles = [];
const failures = [];
const warnings = [];

const collectionFiles = [
  'ancient-epic/index.html',
  'renaissance-early-modern/index.html',
  'shakespeare/index.html',
  'restoration-enlightenment/index.html',
  'romantic-regency/index.html',
  'victorian/index.html',
  'american/index.html',
  'modern/index.html'
];

function walk(directory, results, ignored) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored && ignored.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, results, ignored);
    if (entry.isFile() && path.extname(entry.name) === '.html') results.push(fullPath);
  }
}

function localTarget(sourceFile, value) {
  if (/^(?:[a-z]+:|\/\/)/i.test(value)) return null;

  const withoutQuery = value.split(/[?#]/, 1)[0];
  if (!withoutQuery) return { target: sourceFile };

  let decoded;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    return { error: 'invalid URL encoding' };
  }

  let target = decoded.startsWith('/')
    ? path.join(root, decoded.slice(1))
    : path.resolve(path.dirname(sourceFile), decoded);

  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  return { target: target };
}

function relative(file) {
  return path.relative(root, file);
}

function visibleText(html) {
  return html
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt|rsquo|lsquo|rdquo|ldquo|mdash|ndash);/gi, ' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function countMatches(value, pattern) {
  return Array.from(value.matchAll(pattern)).length;
}

walk(root, htmlFiles, ignoredDirectories);

const attributePattern = /\b(?:href|src)="([^"]+)"/g;
const editorialPhrases = [
  'this page uses',
  'card uses',
  'cover expected',
  'uploaded',
  'filename',
  'placeholder',
  'classic texts, properly presented'
];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const fileName = relative(file);
  const redirect = /http-equiv="refresh"/i.test(html);

  for (const match of html.matchAll(attributePattern)) {
    const result = localTarget(file, match[1]);
    if (!result) continue;
    if (result.error || !fs.existsSync(result.target)) {
      failures.push(fileName + ' -> ' + match[1] + (result.error ? ' (' + result.error + ')' : ''));
    }
  }

  if (!/<html\b[^>]*\blang="[^"]+"/i.test(html)) failures.push(fileName + ' is missing the page language');
  if (!/<meta\b[^>]*\bname="viewport"/i.test(html)) failures.push(fileName + ' is missing the viewport setting');
  if (!/<title>[^<]+<\/title>/i.test(html)) failures.push(fileName + ' is missing a page title');

  if (!redirect) {
    if (!/<meta\b[^>]*\bname="description"[^>]*\bcontent="[^"]+"/i.test(html)) {
      failures.push(fileName + ' is missing its search description');
    }
    if (countMatches(html, /<main\b/gi) !== 1) failures.push(fileName + ' must have exactly one main content area');
    if (countMatches(html, /<h1\b/gi) !== 1) failures.push(fileName + ' must have exactly one main heading');
  }

  for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt="[^"]*"/i.test(image[0])) failures.push(fileName + ' has an image without alt text');
  }

  const ids = Array.from(html.matchAll(/\bid="([^"]+)"/gi), match => match[1]);
  const seenIds = new Set();
  for (const id of ids) {
    if (seenIds.has(id)) failures.push(fileName + ' repeats the id #' + id);
    seenIds.add(id);
  }

  for (const link of html.matchAll(/\bhref="([^"]*#[^"]*)"/gi)) {
    const value = link[1];
    if (/^(?:mailto:|tel:|javascript:)/i.test(value)) continue;
    const hashAt = value.indexOf('#');
    const fragmentValue = value.slice(hashAt + 1);
    if (!fragmentValue) continue;

    let fragment;
    try {
      fragment = decodeURIComponent(fragmentValue);
    } catch {
      failures.push(fileName + ' has an invalid section link ' + value);
      continue;
    }

    const targetResult = localTarget(file, value.slice(0, hashAt));
    if (!targetResult || targetResult.error || !fs.existsSync(targetResult.target)) continue;
    const targetHtml = fs.readFileSync(targetResult.target, 'utf8');
    const escaped = fragment.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
    if (!new RegExp('\\b(?:id|name)="' + escaped + '"', 'i').test(targetHtml)) {
      failures.push(fileName + ' links to a missing section ' + value);
    }
  }

  if (html.includes('class="site-header"')) {
    for (const href of ['/explore/', '/library/', '/study/', '/resources/']) {
      if (!html.includes('href="' + href + '"')) failures.push(fileName + ' is missing ' + href + ' from its shared navigation');
    }
  }

  const text = visibleText(html);
  for (const phrase of editorialPhrases) {
    if (text.includes(phrase)) failures.push(fileName + ' contains build wording: "' + phrase + '"');
  }
}

const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!homepage.includes('class="home-masthead"')) failures.push('The homepage is missing its editorial masthead');
if (!homepage.includes('data-motion-stage')) failures.push('The homepage is missing its living cover display');
if (countMatches(homepage, /data-motion-cover/g) !== 3) failures.push('The homepage must feature exactly three moving covers');
if (!homepage.includes('home-finder')) failures.push('The homepage is missing its library search entrance');
if (!homepage.includes('class="archive-book-shelf"')) failures.push('The homepage is missing its new-books shelf');
if (countMatches(homepage, /class="archive-catalogue-number"/g) !== 3) failures.push('The homepage must clearly explain its three kinds of resource');
if (!homepage.includes('class="archive-route-list"')) failures.push('The homepage is missing its routes across the shelves');
if (countMatches(homepage, /class="archive-author-covers"/g) !== 3) failures.push('The homepage must introduce three detailed writer pages');
if (!homepage.includes('href="/authors/"')) failures.push('The homepage is missing the writers directory');
if (!homepage.includes('href="/subjects/"')) failures.push('The homepage is missing the subjects directory');
if (countMatches(homepage, /class="archive-subject-grid"[\s\S]*?<\/section>/g) !== 1) failures.push('The homepage is missing its subject desk');
const homeSubjectSection = homepage.match(/<section class="archive-subjects[\s\S]*?<\/section>/i)?.[0] || '';
if (countMatches(homeSubjectSection, /href="\/subjects\/[^/]+\/"/g) !== 5) failures.push('The homepage must introduce exactly five subject guides');
if (!homepage.includes('data-reference-reel')) failures.push('The homepage is missing its moving reference-library story');
if (countMatches(homepage, /data-reference-frame/g) !== 3) failures.push('The homepage must feature exactly three reference-library frames');
if (homepage.includes('class="home-intro-strip"')) failures.push('The homepage has restored the repeated introduction strip');
for (const image of ['The%20Odyssey.png', 'Adventures%20of%20Sherlock%20Holmes.png', 'Uncle%20Tom%27s%20Cabin.png']) {
  if (!homepage.includes(image)) failures.push('The homepage is missing its featured ' + image + ' cover');
}
for (const image of ['home-reference-victorian.jpg', 'home-reference-shakespeare.jpg', 'home-reference-study.jpg']) {
  if (!homepage.includes('/assets/' + image)) failures.push('The homepage is missing its lighter ' + image + ' moving image');
}
for (const icon of ['favicon.ico', 'favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']) {
  if (!fs.existsSync(path.join(root, icon))) failures.push('The site is missing ' + icon);
}

const resourcesHub = fs.readFileSync(path.join(root, 'resources', 'index.html'), 'utf8');
if (!resourcesHub.includes('id="resource-search"')) failures.push('The resources page is missing its guide search');
if (!resourcesHub.includes('/assets/resources.js')) failures.push('The resources page is missing its search script');
if (countMatches(resourcesHub, /data-resource-filter=/g) < 7) failures.push('The resources page is missing its category filters');
if (!resourcesHub.includes('class="resource-editorial"')) failures.push('The resources page is missing its explanation of how to use the free library');

const classicLiterature = fs.readFileSync(path.join(root, 'classic-literature', 'index.html'), 'utf8');
if (!classicLiterature.includes('<h1>Classic literature.</h1>')) failures.push('The classic literature landing page is missing its main heading');
if (countMatches(classicLiterature, /class="classic-period"/g) !== 8) failures.push('The classic literature landing page must link all eight literary collections');
for (const href of ['/library/', '/reading-routes/', '/resources/']) {
  if (!classicLiterature.includes('href="' + href + '"')) failures.push('The classic literature landing page is missing ' + href);
}

const readingRoutes = fs.readFileSync(path.join(root, 'reading-routes', 'index.html'), 'utf8');
if (countMatches(readingRoutes, /class="route-block"/g) !== 5) failures.push('Reading routes must contain five complete routes');
if (!readingRoutes.includes('/resources/dracula/complete-overview/')) failures.push('Reading routes are not connected to the free guides');

const subjectSlugs = ['gothic-literature', 'tragedy', 'detective-fiction', 'epic-poetry', 'satire-political-writing'];
const subjectsHubFile = path.join(root, 'subjects', 'index.html');
if (!fs.existsSync(subjectsHubFile)) {
  failures.push('The subjects directory is missing');
} else {
  const subjectsHub = fs.readFileSync(subjectsHubFile, 'utf8');
  if (!subjectsHub.includes('<h1>Read by subject.</h1>')) failures.push('The subjects directory is missing its main heading');
  if (countMatches(subjectsHub, /class="subject-directory-card"/g) !== subjectSlugs.length) failures.push('The subjects directory must contain five guides');
}

for (const subjectSlug of subjectSlugs) {
  const subjectFile = path.join(root, 'subjects', subjectSlug, 'index.html');
  if (!fs.existsSync(subjectFile)) {
    failures.push('The subject guide is missing: ' + subjectSlug);
    continue;
  }
  const subjectHtml = fs.readFileSync(subjectFile, 'utf8');
  for (const className of ['subject-guide-hero', 'subject-method-grid', 'subject-book-grid', 'subject-terms', 'subject-sources']) {
    if (!subjectHtml.includes('class="' + className)) failures.push(subjectSlug + ' is missing ' + className);
  }
}

const authorsHubFile = path.join(root, 'authors', 'index.html');
if (!fs.existsSync(authorsHubFile)) {
  failures.push('The writers directory is missing');
} else {
  const authorsHub = fs.readFileSync(authorsHubFile, 'utf8');
  if (!authorsHub.includes('<h1>Writers in the library.</h1>')) failures.push('The writers directory is missing its main heading');
  for (const authorHref of ['/authors/charles-dickens/', '/authors/jane-austen/', '/authors/arthur-conan-doyle/', '/shakespeare/']) {
    if (!authorsHub.includes('href="' + authorHref + '"')) failures.push('The writers directory is missing ' + authorHref);
  }
}

for (const authorSlug of ['charles-dickens', 'jane-austen', 'arthur-conan-doyle']) {
  const authorFile = path.join(root, 'authors', authorSlug, 'index.html');
  if (!fs.existsSync(authorFile)) {
    failures.push('The detailed writer page is missing: ' + authorSlug);
    continue;
  }
  const authorHtml = fs.readFileSync(authorFile, 'utf8');
  if (!authorHtml.includes('class="author-profile-hero"')) failures.push(authorSlug + ' is missing its writer introduction');
  if (!authorHtml.includes('class="author-method-grid"')) failures.push(authorSlug + ' is missing its guide to the writing');
  if (!authorHtml.includes('class="author-book-grid')) failures.push(authorSlug + ' is missing its Astor Library books');
  if (!authorHtml.includes('class="author-sources"')) failures.push(authorSlug + ' is missing its further reading');
}

const memberships = new Map();
for (const relativeCollection of collectionFiles) {
  const collectionFile = path.join(root, relativeCollection);
  const html = fs.readFileSync(collectionFile, 'utf8');
  const cards = html.match(/<article class="edition-card">[\s\S]*?<\/article>/g) || [];

  for (const card of cards) {
    const link = card.match(/<a class="button primary" href="([^"]+)">Open page<\/a>/);
    if (!link) {
      failures.push(relativeCollection + ' has a book card without an Open page link');
      continue;
    }
    const result = localTarget(collectionFile, link[1]);
    if (!result || result.error || !result.target) continue;
    const href = '/' + path.relative(root, path.dirname(result.target)).split(path.sep).join('/') + '/';
    if (memberships.has(href)) {
      failures.push(href + ' appears in both ' + memberships.get(href) + ' and ' + relativeCollection);
    } else {
      memberships.set(href, relativeCollection);
    }
  }
}

const bookFiles = htmlFiles.filter(file => {
  const parts = relative(file).split(path.sep);
  return parts.length === 3 && parts[0] === 'books' && parts[2] === 'index.html';
});

for (const file of bookFiles) {
  const href = '/' + path.relative(root, path.dirname(file)).split(path.sep).join('/') + '/';
  if (!memberships.has(href)) failures.push(href + ' is not listed in a collection');

  const html = fs.readFileSync(file, 'utf8');
  const proseCards = html.match(/<article class="[^"]*\bprose-card\b[^"]*">[\s\S]*?<\/article>/gi) || [];
  for (const card of proseCards) {
    if (/<[ou]l\b/i.test(card)) failures.push(relative(file) + ' has a prose card that still contains a list');
    if (countMatches(card, /<p\b/gi) < 2) failures.push(relative(file) + ' has an empty prose card');
  }
  const sourceList = html.match(/<(nav|div|section) class="source-list"[^>]*>[\s\S]*?<\/\1>/i);
  if (sourceList) {
    const links = Array.from(sourceList[0].matchAll(/\bhref="https?:\/\/[^"]+"/gi), match => match[0]);
    const wikipedia = links.filter(link => /wikipedia\.org/i.test(link)).length;
    if (links.length >= 4 && wikipedia / links.length >= 0.5) {
      warnings.push(relative(file) + ' relies on Wikipedia for ' + wikipedia + ' of ' + links.length + ' listed sources');
    }
  }
}

for (const href of memberships.keys()) {
  const bookFile = path.join(root, href.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(bookFile)) failures.push('Collection card has no book page: ' + href);
}

const listHeavy = bookFiles
  .map(file => {
    const html = fs.readFileSync(file, 'utf8');
    return {
      file: relative(file),
      lists: countMatches(html, /<ul\b/gi),
      paragraphs: countMatches(html, /<p\b/gi)
    };
  })
  .filter(item => item.lists > item.paragraphs)
  .sort((a, b) => (b.lists - b.paragraphs) - (a.lists - a.paragraphs));

if (listHeavy.length) {
  warnings.push(listHeavy.length + ' book pages still use more lists than paragraphs; continue the prose pass section by section');
}

const discoveryFile = path.join(root, 'assets', 'content-index.json');
let discoveryIndex = null;
if (!fs.existsSync(discoveryFile)) {
  failures.push('The site-wide discovery index is missing');
} else {
  try {
    const discoveryText = fs.readFileSync(discoveryFile, 'utf8');
    const discovery = JSON.parse(discoveryText);
    discoveryIndex = discovery;
    if (discovery.books?.length !== bookFiles.length) {
      failures.push('The discovery index has ' + (discovery.books?.length || 0) + ' books but the site has ' + bookFiles.length);
    }
    const uniqueAuthors = new Set((discovery.books || []).map(book => book.author));
    if (discovery.authors?.length !== uniqueAuthors.size) {
      failures.push('The discovery index has ' + (discovery.authors?.length || 0) + ' writers but the books have ' + uniqueAuthors.size + ' distinct writers');
    }
    if ((discovery.books || []).some(book => !book.authorHref)) failures.push('A discovery book is missing its writer link');
    if (discovery.subjects?.length !== subjectSlugs.length) failures.push('The discovery index must contain five subject guides');
    for (const subject of discovery.subjects || []) {
      if (!subject.relatedBooks?.length) failures.push(subject.title + ' has no books in the discovery index');
      for (const href of subject.relatedBooks || []) {
        if (!(discovery.books || []).some(book => book.href === href)) failures.push(subject.title + ' points to an unknown book: ' + href);
      }
    }
    if (!(discovery.books || []).some(book => book.subjects?.length)) failures.push('Books are not connected to their subject guides');
    if (/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(discoveryText)) {
      failures.push('The discovery index contains an undecoded HTML character');
    }
  } catch {
    failures.push('The site-wide discovery index is not valid JSON');
  }
}

const distDir = path.join(root, 'dist');
if (fs.existsSync(distDir)) {
  const distHtmlFiles = [];
  walk(distDir, distHtmlFiles);
  if (distHtmlFiles.length !== htmlFiles.length) {
    failures.push('dist contains ' + distHtmlFiles.length + ' pages but the source contains ' + htmlFiles.length);
  }

  for (const file of distHtmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const fileName = path.relative(distDir, file);
    const redirect = /http-equiv="refresh"/i.test(html);
    if (html.includes('<main')) {
      if (!html.includes('/assets/site.js')) failures.push('dist/' + fileName + ' is missing site.js');
      if (!html.includes('class="skip-link"')) failures.push('dist/' + fileName + ' is missing its skip link');
      if (!/<main\b[^>]*\bid="main-content"/i.test(html)) failures.push('dist/' + fileName + ' is missing the main-content target');
      if (!redirect && !/<link rel="canonical" href="https:\/\/astorlibrary\.com\//i.test(html)) failures.push('dist/' + fileName + ' is missing its absolute preferred address');
      if (!redirect && !html.includes('property="og:title"')) failures.push('dist/' + fileName + ' is missing its sharing title');
      if (!redirect && !html.includes('property="og:description"')) failures.push('dist/' + fileName + ' is missing its sharing description');
      if (!redirect && !/<meta property="og:url" content="https:\/\/astorlibrary\.com\//i.test(html)) failures.push('dist/' + fileName + ' is missing its full sharing address');
      if (!redirect && !html.includes('data-astor-global-meta')) failures.push('dist/' + fileName + ' is missing its search visibility information');
      if (html.includes('class="site-header"') && !html.includes('href="/authors/"')) failures.push('dist/' + fileName + ' is missing Writers from its shared navigation');
      if (html.includes('class="site-header"') && !html.includes('href="/subjects/"')) failures.push('dist/' + fileName + ' is missing Subjects from its shared navigation');
    }
    if (/^books\/[^/]+\/index\.html$/.test(fileName) && !html.includes('data-astor-book-schema')) {
      failures.push('dist/' + fileName + ' is missing its book description for search engines');
    }
    if (/^(?:authors|subjects|classic-literature|library|resources|study|ancient-epic|renaissance-early-modern|shakespeare|restoration-enlightenment|romantic-regency|victorian|american|modern)\/index\.html$/.test(fileName) && !html.includes('data-astor-collection-schema')) {
      failures.push('dist/' + fileName + ' is missing its collection description for search engines');
    }
    if (/^subjects\/[^/]+\/index\.html$/.test(fileName) && !html.includes('data-astor-collection-schema')) {
      failures.push('dist/' + fileName + ' is missing its subject description for search engines');
    }
    if (/^authors\/(?:charles-dickens|jane-austen|arthur-conan-doyle)\/index\.html$/.test(fileName)) {
      if (!html.includes('data-astor-author-schema')) failures.push('dist/' + fileName + ' is missing its writer description for search engines');
      const authorData = html.match(/<script type="application\/ld\+json" data-astor-author-schema>([\s\S]*?)<\/script>/i);
      if (authorData) {
        try {
          const schema = JSON.parse(authorData[1]);
          if (schema['@type'] !== 'ProfilePage' || schema.mainEntity?.['@type'] !== 'Person' || !schema.mainEntity?.birthDate || !schema.mainEntity?.deathDate || !schema.mainEntity?.subjectOf?.length) {
            failures.push('dist/' + fileName + ' has an incomplete writer description for search engines');
          }
        } catch {
          failures.push('dist/' + fileName + ' has an invalid writer description for search engines');
        }
      }
    }
    if (/^books\/[^/]+\/index\.html$/.test(fileName)) {
      if (!/<link rel="canonical" href="https:\/\/astorlibrary\.com\/books\/[^/]+\/">/i.test(html)) {
        failures.push('dist/' + fileName + ' is missing its preferred book address');
      }
      if (!html.includes('class="book-breadcrumb"')) {
        failures.push('dist/' + fileName + ' is missing its route back to the collection');
      }
      if (!html.includes('class="book-end-nav"')) {
        failures.push('dist/' + fileName + ' is missing its end-of-page choices');
      }
      const structuredData = html.match(/<script type="application\/ld\+json" data-astor-book-schema>([\s\S]*?)<\/script>/i);
      if (structuredData) {
        try {
          const schema = JSON.parse(structuredData[1]);
          if (schema['@type'] !== 'WebPage' || !schema.url?.startsWith(SITE_URL) || !schema.isPartOf?.url?.startsWith(SITE_URL) ||
              schema.breadcrumb?.itemListElement?.length !== 3 ||
              schema.about?.['@type'] !== 'Book' || !schema.about?.image?.startsWith(SITE_URL) || !schema.about?.author?.name || !schema.about?.author?.url?.startsWith(SITE_URL)) {
            failures.push('dist/' + fileName + ' has an incomplete book description for search engines');
          }
          const bookHref = '/' + fileName.replace(/index\.html$/, '');
          const indexedBook = discoveryIndex?.books?.find(book => book.href === bookHref);
          if (indexedBook?.subjects?.length && schema.about?.genre?.length !== indexedBook.subjects.length) {
            failures.push('dist/' + fileName + ' is missing its subject genres for search engines');
          }
        } catch {
          failures.push('dist/' + fileName + ' has an invalid book description for search engines');
        }
      }
    }
    if (/^resources\/.+\/index\.html$/.test(fileName)) {
      if (!html.includes('data-astor-resource-schema')) failures.push('dist/' + fileName + ' is missing its free-guide description for search engines');
      if (!html.includes('class="book-breadcrumb resource-breadcrumb"')) failures.push('dist/' + fileName + ' is missing its route back to free resources');
      if (!html.includes('class="book-end-nav resource-end-nav"')) failures.push('dist/' + fileName + ' is missing its end-of-page choices');
    }
  }

  if (!fs.existsSync(path.join(distDir, 'assets/content-index.json'))) {
    failures.push('dist is missing the discovery index');
  }
  if (!fs.existsSync(path.join(distDir, 'site-index', 'index.html'))) {
    failures.push('dist is missing the crawlable site index');
  }
  if (!fs.existsSync(path.join(distDir, 'robots.txt'))) {
    failures.push('dist is missing its crawler instructions');
  }
  const sitemapFile = path.join(distDir, 'sitemap.xml');
  if (!fs.existsSync(sitemapFile)) {
    failures.push('dist is missing its XML sitemap');
  } else {
    const sitemap = fs.readFileSync(sitemapFile, 'utf8');
    const indexedPages = distHtmlFiles.filter(file => !/http-equiv="refresh"/i.test(fs.readFileSync(file, 'utf8'))).length;
    const sitemapEntries = countMatches(sitemap, /<url><loc>https:\/\/astorlibrary\.com\//g);
    if (sitemapEntries !== indexedPages) failures.push('The XML sitemap contains ' + sitemapEntries + ' pages but should contain ' + indexedPages);
    if (sitemap.includes('astorlibrary.co.uk')) failures.push('The XML sitemap points at the secondary domain');
  }
  const robots = fs.readFileSync(path.join(distDir, 'robots.txt'), 'utf8');
  if (!robots.includes('Sitemap: ' + SITE_URL + '/sitemap.xml')) failures.push('robots.txt does not announce the XML sitemap');
  const headersFile = path.join(distDir, '_headers');
  if (!fs.existsSync(headersFile)) {
    failures.push('dist is missing its PDF search headers');
  } else {
    const headers = fs.readFileSync(headersFile, 'utf8');
    if (countMatches(headers, /rel="canonical"/g) !== 23) failures.push('The PDF search headers do not cover all 23 free guides');
    if (!headers.includes('<' + SITE_URL + '/resources/')) failures.push('The PDF search headers do not point back to the guide pages');
  }
}

if (warnings.length) {
  console.warn('Editorial notes:');
  for (const warning of warnings) console.warn('- ' + warning);
}

if (failures.length) {
  console.error('Found ' + failures.length + ' site problem' + (failures.length === 1 ? '' : 's') + ':');
  for (const failure of failures) console.error('- ' + failure);
  process.exitCode = 1;
} else {
  console.log('Checked ' + htmlFiles.length + ' pages and ' + bookFiles.length + ' collection records: links, structure, navigation and editorial safeguards pass.');
}

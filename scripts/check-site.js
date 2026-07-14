const fs = require('fs');
const path = require('path');

const root = process.cwd();
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
if (!homepage.includes('data-reference-reel')) failures.push('The homepage is missing its moving reference-library story');
if (countMatches(homepage, /data-reference-frame/g) !== 3) failures.push('The homepage must feature exactly three reference-library frames');
if (homepage.includes('class="home-intro-strip"')) failures.push('The homepage has restored the repeated introduction strip');
for (const image of ['home-hamlet.jpg', 'home-frankenstein.jpg', 'home-red-badge.jpg']) {
  if (!homepage.includes('/assets/' + image)) failures.push('The homepage is missing its smaller ' + image + ' cover');
}
for (const image of ['home-reference-victorian.jpg', 'home-reference-shakespeare.jpg', 'home-reference-study.jpg']) {
  if (!homepage.includes('/assets/' + image)) failures.push('The homepage is missing its lighter ' + image + ' moving image');
}

const resourcesHub = fs.readFileSync(path.join(root, 'resources', 'index.html'), 'utf8');
if (!resourcesHub.includes('id="resource-search"')) failures.push('The resources page is missing its guide search');
if (!resourcesHub.includes('/assets/resources.js')) failures.push('The resources page is missing its search script');
if (countMatches(resourcesHub, /data-resource-filter=/g) < 7) failures.push('The resources page is missing its category filters');

const readingRoutes = fs.readFileSync(path.join(root, 'reading-routes', 'index.html'), 'utf8');
if (countMatches(readingRoutes, /class="route-block"/g) !== 5) failures.push('Reading routes must contain five complete routes');
if (!readingRoutes.includes('/resources/dracula/complete-overview/')) failures.push('Reading routes are not connected to the free guides');

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
if (!fs.existsSync(discoveryFile)) {
  failures.push('The site-wide discovery index is missing');
} else {
  try {
    const discoveryText = fs.readFileSync(discoveryFile, 'utf8');
    const discovery = JSON.parse(discoveryText);
    if (discovery.books?.length !== bookFiles.length) {
      failures.push('The discovery index has ' + (discovery.books?.length || 0) + ' books but the site has ' + bookFiles.length);
    }
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
      if (!redirect && !html.includes('rel="canonical"')) failures.push('dist/' + fileName + ' is missing its preferred address');
      if (!redirect && !html.includes('property="og:title"')) failures.push('dist/' + fileName + ' is missing its sharing title');
      if (!redirect && !html.includes('property="og:description"')) failures.push('dist/' + fileName + ' is missing its sharing description');
      if (!redirect && !html.includes('data-astor-global-meta')) failures.push('dist/' + fileName + ' is missing its search visibility information');
    }
    if (/^books\/[^/]+\/index\.html$/.test(fileName) && !html.includes('data-astor-book-schema')) {
      failures.push('dist/' + fileName + ' is missing its book description for search engines');
    }
    if (/^books\/[^/]+\/index\.html$/.test(fileName)) {
      if (!/<link rel="canonical" href="\/books\/[^/]+\/">/i.test(html)) {
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
          if (schema['@type'] !== 'WebPage' || !schema.url || !schema.isPartOf?.url ||
              schema.breadcrumb?.itemListElement?.length !== 3 ||
              schema.about?.['@type'] !== 'Book' || !schema.about?.image || !schema.about?.author?.name) {
            failures.push('dist/' + fileName + ' has an incomplete book description for search engines');
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

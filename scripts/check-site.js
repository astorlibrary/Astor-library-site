const fs = require('fs');
const path = require('path');
const resourceData = require('./resource-data');

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
const homepageMain = homepage.match(/<main class="library-home"[\s\S]*?<\/main>/i)?.[0] || '';
if (!homepage.includes('/assets/home.css')) failures.push('The homepage is missing its lightweight stylesheet');
if (!homepage.includes('/assets/navigation.css')) failures.push('The homepage is missing the shared navigation stylesheet');
if (!homepage.includes('class="site-header astor-global-header')) failures.push('The homepage is missing the shared header');
if (!/<footer\b[^>]*class="[^"]*\bastor-global-footer\b/i.test(homepage)) failures.push('The homepage is missing the grouped footer');
if (!homepageMain.includes('A reference library, built around the book.')) failures.push('The homepage is missing its text-first opening');
if (!homepageMain.includes('id="home-search"')) failures.push('The homepage is missing its immediate library search');
if (!homepageMain.includes('class="edition-anatomy"')) failures.push('The homepage is missing its edition anatomy');
if (!homepageMain.includes('class="library-start-grid"')) failures.push('The homepage is missing its clear starting points');
if (!homepageMain.includes('class="library-new-shelf"')) failures.push('The homepage is missing its new-books shelf');
if (!homepageMain.includes('class="library-method-ledger"')) failures.push('The homepage is missing its edition method');
if (!homepageMain.includes('class="library-browse-grid"')) failures.push('The homepage is missing its browse routes');
if (!homepageMain.includes('class="library-desks-grid"')) failures.push('The homepage is missing its reading desks');
if (!homepageMain.includes('class="library-history"')) failures.push('The homepage is missing the Astor history');
if (countMatches(homepageMain, /<section class="library-/g) !== 7) failures.push('The homepage must contain seven purposeful sections');
for (const href of ['/library/', '/shakespeare/', '/resources/', '/study/', '/passage-room/', '/authors/', '/subjects/', '/reading-routes/']) {
  if (!homepage.includes('href="' + href + '"')) failures.push('The homepage is missing ' + href);
}
if (homepage.includes('class="home-reading-desk"') || homepage.includes('class="home-library-doors"')) failures.push('The homepage still contains an older duplicate section');

const passageHubFile = path.join(root, 'passage-room', 'index.html');
if (!fs.existsSync(passageHubFile)) {
  failures.push('The site is missing the Passage Room');
} else {
  const passageHub = fs.readFileSync(passageHubFile, 'utf8');
  if (!passageHub.includes('Stay with the words.')) failures.push('The Passage Room is missing its opening statement');
  if (countMatches(passageHub, /class="passage-card /g) !== 12) failures.push('The Passage Room must open twelve close readings');
}

const passageRoutes = [
  'hamlet-to-be',
  'jekyll-duality',
  'huckleberry-finn-apology',
  'sherlock-holmes-scandal',
  'pride-prejudice-self-knowledge',
  'douglass-pathway-freedom',
  'frankenstein-adam',
  'odyssey-olive-bed',
  'christmas-carol-prisons',
  'othello-trifles-proof',
  'uncle-toms-cabin-ice',
  'moby-dick-call-me-ishmael'
];
for (const route of passageRoutes) {
  const passageFile = path.join(root, 'passage-room', route, 'index.html');
  if (!fs.existsSync(passageFile)) {
    failures.push('The close reading is missing: ' + route);
    continue;
  }
  const passage = fs.readFileSync(passageFile, 'utf8');
  if (!passage.includes('class="passage-spread"')) failures.push(route + ' is missing its annotated text');
  if (countMatches(passage, /data-passage-mark=/g) !== 5) failures.push(route + ' must attach five notes to exact phrases');
  if (countMatches(passage, /data-passage-note=/g) !== 5) failures.push(route + ' must contain five margin notes');
  if (!passage.includes('class="passage-question"')) failures.push(route + ' is missing its closing reading question');
  if (!passage.includes('Texts consulted')) failures.push(route + ' is missing its source note');
}

const editorialFile = path.join(root, 'editorial', 'index.html');
if (!fs.existsSync(editorialFile)) {
  failures.push('The site is missing its editorial standards page');
} else {
  const editorial = fs.readFileSync(editorialFile, 'utf8');
  if (!editorial.includes('How the library is made')) failures.push('The editorial standards page is missing its opening statement');
  if (countMatches(editorial, /class="editorial-principles"/g) !== 1) failures.push('The editorial standards page is missing its principles');
}
for (const icon of ['favicon.ico', 'favicon.svg', 'favicon-32x32.png', 'favicon-48x48.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']) {
  if (!fs.existsSync(path.join(root, icon))) failures.push('The site is missing ' + icon);
}

const resourcesHub = fs.readFileSync(path.join(root, 'resources', 'index.html'), 'utf8');
const resourceCardCount = countMatches(resourcesHub, /class="resource-card"/g);
if (!resourcesHub.includes('id="resource-search"')) failures.push('The resources page is missing its guide search');
if (!resourcesHub.includes('/assets/resources.js')) failures.push('The resources page is missing its search script');
if (countMatches(resourcesHub, /data-resource-filter=/g) < 7) failures.push('The resources page is missing its category filters');
if (!resourcesHub.includes('class="resource-editorial"')) failures.push('The resources page is missing its explanation of how to use the free library');
if (resourceCardCount !== resourceData.length) failures.push('The resources page contains ' + resourceCardCount + ' guides but should contain ' + resourceData.length);
if (!resourcesHub.includes('data-resource-filter="eighteenth-century"')) failures.push('The resources page is missing its eighteenth-century fiction filter');
for (const resource of resourceData) {
  if (!resourcesHub.includes('href="' + resource.route + '"')) failures.push('The resources page is missing its Astor page for ' + resource.title);
}
if (/class="resource-card" href="https?:\/\//i.test(resourcesHub)) failures.push('The resources page still sends a guide card directly away from Astor Library');

for (const resource of resourceData) {
  const resourceFile = path.join(root, resource.route.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(resourceFile)) {
    failures.push('The resource page is missing: ' + resource.route);
    continue;
  }
  const resourceHtml = fs.readFileSync(resourceFile, 'utf8');
  for (const className of ['resource-layout', 'guide-reading', 'note-box', 'resource-open-band', 'resource-related']) {
    if (!resourceHtml.includes('class="' + className)) failures.push(resource.route + ' is missing ' + className);
  }
  if (!resourceHtml.includes(resource.url)) failures.push(resource.route + ' is missing its online guide link');
  const expectedImage = '/' + encodeURIComponent(resource.image).replace(/'/g, '%27');
  if (!resourceHtml.includes(expectedImage)) failures.push(resource.route + ' is missing its cover');
  const guideReading = resourceHtml.match(/<div class="guide-reading">[\s\S]*?<\/div>/)?.[0] || '';
  if (!guideReading || countMatches(guideReading, /<article>/g) !== 3) {
    failures.push(resource.route + ' must contain three reading notes');
  }
}

const classicLiterature = fs.readFileSync(path.join(root, 'classic-literature', 'index.html'), 'utf8');
if (!classicLiterature.includes('<h1>Classic literature.</h1>')) failures.push('The classic literature landing page is missing its main heading');
if (countMatches(classicLiterature, /class="classic-period"/g) !== 8) failures.push('The classic literature landing page must link all eight literary collections');
for (const href of ['/library/', '/reading-routes/', '/resources/']) {
  if (!classicLiterature.includes('href="' + href + '"')) failures.push('The classic literature landing page is missing ' + href);
}

const readingRoutes = fs.readFileSync(path.join(root, 'reading-routes', 'index.html'), 'utf8');
if (countMatches(readingRoutes, /class="route-block"/g) !== 7) failures.push('Reading routes must contain seven complete routes');
if (!readingRoutes.includes('/resources/dracula/complete-overview/')) failures.push('Reading routes are not connected to the free guides');

const subjectSlugs = require('./subject-data').map(subject => subject.slug);
const subjectsHubFile = path.join(root, 'subjects', 'index.html');
if (!fs.existsSync(subjectsHubFile)) {
  failures.push('The subjects directory is missing');
} else {
  const subjectsHub = fs.readFileSync(subjectsHubFile, 'utf8');
  if (!subjectsHub.includes('<h1>Read by subject.</h1>')) failures.push('The subjects directory is missing its main heading');
  if (countMatches(subjectsHub, /class="subject-directory-card"/g) !== subjectSlugs.length) failures.push('The subjects directory must contain every subject guide');
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
  for (const authorHref of ['/authors/charles-dickens/', '/authors/frederick-douglass/', '/authors/jane-austen/', '/authors/mary-shelley/', '/authors/arthur-conan-doyle/', '/authors/h-g-wells/', '/authors/mark-twain/', '/shakespeare/']) {
    if (!authorsHub.includes('href="' + authorHref + '"')) failures.push('The writers directory is missing ' + authorHref);
  }
}

for (const authorSlug of ['charles-dickens', 'frederick-douglass', 'jane-austen', 'mary-shelley', 'arthur-conan-doyle', 'h-g-wells', 'mark-twain']) {
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

const newShakespeareSlugs = [
  'henry-v',
  'henry-vi-parts-1-2-and-3',
  'henry-viii',
  'king-john',
  'loves-labours-lost',
  'measure-for-measure',
  'the-merchant-of-venice',
  'pericles-prince-of-tyre',
  'the-two-noble-kinsmen',
  'the-winters-tale',
  'timon-of-athens',
  'troilus-and-cressida',
  'twelfth-night',
  'the-two-gentlemen-of-verona'
];

for (const slug of newShakespeareSlugs) {
  const file = path.join(root, 'books', slug, 'index.html');
  if (!fs.existsSync(file)) {
    failures.push('The new Shakespeare reading page is missing: ' + slug);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  for (const className of ['page-contents', 'quick-facts', 'astor-movement-grid', 'astor-reading-grid', 'astor-context-grid', 'astor-character-grid', 'astor-question-grid', 'source-list']) {
    if (!html.includes('class="' + className)) failures.push(slug + ' is missing ' + className);
  }
  if (countMatches(html, /class="fact"/g) !== 4) failures.push(slug + ' must contain four checked facts');
  if (countMatches(html, /class="prod-card prose-card"/g) !== 3) failures.push(slug + ' must contain three close readings');
  if (countMatches(html, /<section class="astor-movement-grid">[\s\S]*?<article>/g) !== 1 || countMatches(html.match(/<section class="astor-movement-grid">[\s\S]*?<\/section>/)?.[0] || '', /<article>/g) !== 5) failures.push(slug + ' must map five movements');
  const sources = html.match(/<nav class="source-list"[\s\S]*?<\/nav>/)?.[0] || '';
  if (countMatches(sources, /href="https?:\/\//g) < 4) failures.push(slug + ' needs four authoritative further-reading links');
  const wordCount = visibleText(html).split(/\s+/).filter(Boolean).length;
  if (wordCount < 1200) failures.push(slug + ' is too thin at ' + wordCount + ' visible words');
}

const shakespeareHub = fs.readFileSync(path.join(root, 'shakespeare', 'index.html'), 'utf8');
if (!shakespeareHub.includes('class="shakespeare-reading-room"')) failures.push('The Shakespeare collection is missing its reading room');
if (countMatches(shakespeareHub, /<article class="edition-card">/g) !== 39) failures.push('The Shakespeare collection must contain 39 Astor edition records');

const studyHub = fs.readFileSync(path.join(root, 'study', 'index.html'), 'utf8');
if (countMatches(studyHub, /class="study-card(?: dual)?"/g) !== 39) failures.push('The study collection must contain 39 editions');
for (const studyUrl of ['https://mybook.to/HPiX', 'https://mybook.to/ENJxO', 'https://mybook.to/x8aiiFG', 'https://mybook.to/2QzQqmh', 'https://mybook.to/o0Am2j', 'https://mybook.to/2mR1', 'https://mybook.to/gf9uZE', 'https://mybook.to/l4zC9']) {
  if (!studyHub.includes('href="' + studyUrl + '"')) failures.push('The study collection is missing ' + studyUrl);
}
const tamingPage = fs.readFileSync(path.join(root, 'books', 'taming-of-the-shrew', 'index.html'), 'utf8');
if (!tamingPage.includes('href="https://mybook.to/SjnG"')) failures.push('The Taming of the Shrew page is missing its main edition');
if (!tamingPage.includes('href="https://mybook.to/2mR1"')) failures.push('The Taming of the Shrew page is missing its study edition');

const redirectFile = path.join(root, '_redirects');
if (!fs.existsSync(redirectFile)) {
  failures.push('The site is missing its permanent redirect rules');
} else {
  const redirects = fs.readFileSync(redirectFile, 'utf8');
  for (const rule of ['/jekyll-and-hyde.html /books/jekyll-and-hyde/ 301', '/jekyll-and-hyde /books/jekyll-and-hyde/ 301']) {
    if (!redirects.includes(rule)) failures.push('The permanent redirects are missing: ' + rule);
  }
}
for (const file of htmlFiles) {
  if (/http-equiv="refresh"/i.test(fs.readFileSync(file, 'utf8'))) failures.push(relative(file) + ' still uses a browser redirect instead of a permanent server redirect');
}

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
    if (discovery.subjects?.length !== subjectSlugs.length) failures.push('The discovery index must contain every subject guide');
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
      if (!html.includes('/assets/navigation.css')) failures.push('dist/' + fileName + ' is missing navigation.css');
      if (!html.includes('class="skip-link"')) failures.push('dist/' + fileName + ' is missing its skip link');
      if (!/<main\b[^>]*\bid="main-content"/i.test(html)) failures.push('dist/' + fileName + ' is missing the main-content target');
      if (!redirect && !/<link rel="canonical" href="https:\/\/astorlibrary\.com\//i.test(html)) failures.push('dist/' + fileName + ' is missing its absolute preferred address');
      if (!redirect && !html.includes('property="og:title"')) failures.push('dist/' + fileName + ' is missing its sharing title');
      if (!redirect && !html.includes('property="og:description"')) failures.push('dist/' + fileName + ' is missing its sharing description');
      if (!redirect && !/<meta property="og:url" content="https:\/\/astorlibrary\.com\//i.test(html)) failures.push('dist/' + fileName + ' is missing its full sharing address');
      if (!redirect && !html.includes('data-astor-global-meta')) failures.push('dist/' + fileName + ' is missing its search visibility information');
      if (countMatches(html, /class="site-header astor-global-header/g) !== 1) failures.push('dist/' + fileName + ' must have one shared header');
      if (countMatches(html, /class="site-footer astor-global-footer/g) !== 1) failures.push('dist/' + fileName + ' must have one grouped footer');
      for (const href of ['/library/', '/shakespeare/', '/resources/', '/study/', '/passage-room/', '/explore/', '/authors/', '/subjects/']) {
        if (!html.includes('href="' + href + '"')) failures.push('dist/' + fileName + ' is missing ' + href + ' from shared navigation');
      }
    }
    if (/^books\/[^/]+\/index\.html$/.test(fileName) && !html.includes('data-astor-book-schema')) {
      failures.push('dist/' + fileName + ' is missing its book description for search engines');
    }
    if (/^(?:authors|subjects|passage-room|classic-literature|library|resources|study|ancient-epic|renaissance-early-modern|shakespeare|restoration-enlightenment|romantic-regency|victorian|american|modern)\/index\.html$/.test(fileName) && !html.includes('data-astor-collection-schema')) {
      failures.push('dist/' + fileName + ' is missing its collection description for search engines');
    }
    if (/^passage-room\/[^/]+\/index\.html$/.test(fileName) && !html.includes('data-astor-passage-schema')) {
      failures.push('dist/' + fileName + ' is missing its close-reading description for search engines');
    }
    if (/^subjects\/[^/]+\/index\.html$/.test(fileName) && !html.includes('data-astor-collection-schema')) {
      failures.push('dist/' + fileName + ' is missing its subject description for search engines');
    }
    if (/^authors\/(?:charles-dickens|frederick-douglass|jane-austen|mary-shelley|arthur-conan-doyle)\/index\.html$/.test(fileName)) {
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
      if (!html.includes('class="astor-page-credit"') || !html.includes('href="/editorial/"')) {
        failures.push('dist/' + fileName + ' is missing its editorial credit');
      }
      const bookHref = '/' + fileName.replace(/index\.html$/, '');
      const relatedPassages = (discoveryIndex?.passages || []).filter(passage => passage.relatedBooks?.includes(bookHref));
      if (relatedPassages.length && !html.includes('class="book-passage-shelf"')) {
        failures.push('dist/' + fileName + ' is missing its route into the Passage Room');
      }
      for (const passage of relatedPassages) {
        if (!html.includes('href="' + passage.href + '"')) {
          failures.push('dist/' + fileName + ' is missing its close-reading link to ' + passage.href);
        }
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
    if (/^resources\/[^/]+\/[^/]+\/index\.html$/.test(fileName)) {
      if (!html.includes('data-astor-resource-schema')) failures.push('dist/' + fileName + ' is missing its free-guide description for search engines');
      if (!html.includes('class="book-breadcrumb resource-breadcrumb"')) failures.push('dist/' + fileName + ' is missing its route back to free resources');
      if (!html.includes('class="book-end-nav resource-end-nav"')) failures.push('dist/' + fileName + ' is missing its end-of-page choices');
      if (!html.includes('class="astor-page-credit"') || !html.includes('href="/editorial/"')) failures.push('dist/' + fileName + ' is missing its editorial credit');
    }
    if (/^(?:about|editorial)\/index\.html$/.test(fileName) && !html.includes('data-astor-identity-schema')) {
      failures.push('dist/' + fileName + ' is missing its Astor Library identity description');
    }
    if (fileName === 'index.html') {
      const websiteData = html.match(/<script type="application\/ld\+json" data-astor-website-schema>([\s\S]*?)<\/script>/i);
      if (!websiteData) {
        failures.push('dist/index.html is missing its Astor Library identity description');
      } else {
        try {
          const schema = JSON.parse(websiteData[1]);
          const organisation = schema['@graph']?.find(item => item['@type'] === 'Organization');
          if (!organisation?.publishingPrinciples?.endsWith('/editorial/') || !organisation?.sameAs?.includes('https://ko-fi.com/astorlibrary')) {
            failures.push('dist/index.html has an incomplete Astor Library identity description');
          }
        } catch {
          failures.push('dist/index.html has an invalid Astor Library identity description');
        }
      }
    }
  }

  if (!fs.existsSync(path.join(distDir, 'assets/content-index.json'))) {
    failures.push('dist is missing the discovery index');
  }
  if (!fs.existsSync(path.join(distDir, 'site-index', 'index.html'))) {
    failures.push('dist is missing the crawlable site index');
  }
  if (!fs.existsSync(path.join(distDir, '_redirects'))) {
    failures.push('dist is missing its permanent redirect rules');
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
    if (!sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')) failures.push('The XML sitemap is missing image metadata');
  }
  const robots = fs.readFileSync(path.join(distDir, 'robots.txt'), 'utf8');
  if (!robots.includes('Sitemap: ' + SITE_URL + '/sitemap.xml')) failures.push('robots.txt does not announce the XML sitemap');
  const headersFile = path.join(distDir, '_headers');
  if (!fs.existsSync(headersFile)) {
    failures.push('dist is missing its static hosting headers');
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

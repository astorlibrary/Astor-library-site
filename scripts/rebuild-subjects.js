const fs = require('fs');
const path = require('path');
const subjects = require('./subject-data');

const root = process.cwd();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function siteHeader() {
  return '<header class="site-header">' +
    '<a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt="Astor Library torch"><span class="word">LIBRARY</span></a>' +
    '<nav class="nav" aria-label="Primary navigation">' +
    '<a class="nav-link" href="/">Home</a><a class="nav-link" href="/explore/">Explore</a><a class="nav-link" href="/subjects/">Subjects</a><a class="nav-link" href="/authors/">Writers</a><a class="nav-link" href="/library/">All books</a>' +
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
    '</div></details><a class="nav-link" href="/study/">Study editions</a><a class="nav-link" href="/resources/">Free resources</a>' +
    '</nav></header>';
}

function coverFan(books, label, className) {
  const images = books.slice(0, 3).map(function (book, index) {
    return '<img src="' + escapeHtml(book.image) + '" alt="' + escapeHtml(index === 0 ? book.title + ' Astor Library cover' : '') + '" loading="lazy">';
  }).join('');
  return '<div class="' + (className || 'subject-cover-fan') + '" aria-label="' + escapeHtml(label) + '">' + images + '</div>';
}

function subjectPage(subject) {
  const facts = subject.facts.map(function (fact) {
    return '<div><b>' + escapeHtml(fact.value) + '</b><span>' + escapeHtml(fact.label) + '</span></div>';
  }).join('');
  const methods = subject.methods.map(function (method, index) {
    return '<article><span>0' + (index + 1) + ' · ' + escapeHtml(method.label) + '</span><h3>' + escapeHtml(method.title) + '</h3><p>' + escapeHtml(method.copy) + '</p></article>';
  }).join('');
  const books = subject.books.map(function (book) {
    return '<article class="subject-book"><a href="' + escapeHtml(book.href) + '"><img src="' + escapeHtml(book.image) + '" alt="' + escapeHtml(book.title + ' Astor Library cover') + '" loading="lazy"><div><p>' + escapeHtml(book.year) + '</p><h3>' + escapeHtml(book.title) + '</h3><small>' + escapeHtml(book.author) + '</small><span>' + escapeHtml(book.copy) + '</span><b>Open the reading page <span aria-hidden="true">&rarr;</span></b></div></a></article>';
  }).join('');
  const terms = subject.terms.map(function (term) {
    return '<article><h3>' + escapeHtml(term.term) + '</h3><p>' + escapeHtml(term.copy) + '</p></article>';
  }).join('');
  const resources = subject.resources.map(function (resource) {
    return '<a href="' + escapeHtml(resource.href) + '"><b>' + escapeHtml(resource.label) + '</b><span>' + escapeHtml(resource.copy) + '</span></a>';
  }).join('');
  const sources = subject.sources.map(function (source) {
    return '<a href="' + escapeHtml(source.href) + '">' + escapeHtml(source.label) + '</a>';
  }).join('');

  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml(subject.title) + ': Books, History and Reading Guide | Astor Library</title><meta name="description" content="' + escapeHtml(subject.description) + '"><link rel="stylesheet" href="/assets/styles.css"></head><body>' +
    siteHeader() + '<main id="main-content" class="page-wrap subject-guide-page">' +
    '<nav class="book-breadcrumb subject-breadcrumb" aria-label="Breadcrumb"><a href="/subjects/">Subjects</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(subject.title) + '</span></nav>' +
    '<section class="subject-guide-hero"><div><p class="kicker">' + escapeHtml(subject.kicker) + '</p><h1>' + escapeHtml(subject.title) + '.</h1><p class="deck">' + escapeHtml(subject.description) + '</p><div class="button-row"><a class="button primary" href="#subject-books">Read the shelf</a><a class="button secondary" href="/subjects/">All subjects</a></div></div>' +
    coverFan(subject.books, 'Books in the ' + subject.title + ' guide', 'subject-hero-covers') + '</section>' +
    '<section class="subject-facts" aria-label="' + escapeHtml(subject.title) + ' at a glance">' + facts + '</section>' +
    '<section class="subject-opening"><p class="kicker">The form in view</p><div><h2>' + escapeHtml(subject.introduction.heading) + '</h2>' + subject.introduction.paragraphs.map(function (paragraph) { return '<p>' + escapeHtml(paragraph) + '</p>'; }).join('') + '</div></section>' +
    '<section class="subject-method" aria-labelledby="subject-method-title"><div class="section-title"><p class="kicker">How to read it</p><h2 id="subject-method-title">What to watch.</h2></div><div class="subject-method-grid">' + methods + '</div></section>' +
    '<section class="subject-shelf" id="subject-books" aria-labelledby="subject-books-title"><div class="subject-shelf-head"><div><p class="kicker">In Astor Library</p><h2 id="subject-books-title">The shelf.</h2></div><p>These books are joined by a form or method, not flattened into one argument. Open any reading page for its own publication history, structure, language and afterlife.</p></div><div class="subject-book-grid">' + books + '</div></section>' +
    '<section class="subject-close-reading"><div><p class="kicker">Close reading</p><h2>' + escapeHtml(subject.reading.heading) + '</h2></div><div>' + subject.reading.paragraphs.map(function (paragraph) { return '<p>' + escapeHtml(paragraph) + '</p>'; }).join('') + '</div></section>' +
    '<section class="subject-terms" aria-labelledby="subject-terms-title"><div class="section-title"><p class="kicker">A working vocabulary</p><h2 id="subject-terms-title">Four useful terms.</h2></div><div>' + terms + '</div></section>' +
    '<section class="subject-resources"><div><p class="kicker">Continue in the library</p><h2>Guides and routes.</h2></div><div class="subject-resource-links">' + resources + '</div></section>' +
    '<section class="subject-sources"><div><p class="kicker">Further reading</p><h2>Texts and collections.</h2></div><p>The guide above is written for Astor Library. These external collections provide reliable texts, manuscripts and specialist routes for going further.</p><nav class="source-list" aria-label="' + escapeHtml(subject.title) + ' sources">' + sources + '</nav></section>' +
    '<nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a><a href="/subjects/">All subjects</a><a href="/library/">All books</a><a href="/explore/">Search the library <span aria-hidden="true">&rarr;</span></a></nav>' +
    '</main><footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Books connected by form, history and the questions they leave open.</p></div><div class="footer-links"><a href="/subjects/">Subjects</a><a href="/authors/">Writers</a><a href="/library/">All books</a><a href="/resources/">Free resources</a></div></footer></body></html>';
}

function subjectIndex() {
  const cards = subjects.map(function (subject, index) {
    return '<article class="subject-directory-card"><a href="/subjects/' + escapeHtml(subject.slug) + '/">' + coverFan(subject.books, 'Books in ' + subject.title, 'subject-index-covers') + '<div><p class="kicker">0' + (index + 1) + ' · ' + subject.books.length + ' books</p><h2>' + escapeHtml(subject.title) + '</h2><p>' + escapeHtml(subject.description) + '</p><span class="home-text-link">Open the subject guide <span aria-hidden="true">&rarr;</span></span></div></a></article>';
  }).join('');

  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Literature Subjects and Genre Guides | Astor Library</title><meta name="description" content="Explore comedy, Gothic literature, tragedy, detective fiction, epic poetry, satire, narration, slavery, freedom and abolition through Astor Library books and free resources."><link rel="stylesheet" href="/assets/styles.css"></head><body>' +
    siteHeader() + '<main id="main-content" class="page-wrap subjects-page"><section class="subjects-hero"><div><p class="kicker">Forms, methods and histories</p><h1>Read by subject.</h1><p class="deck">Periods tell us when books were made. Subjects show what they do. Begin with a form, learn how it works, then move directly into the texts that complicate it.</p><div class="button-row"><a class="button primary" href="#subject-guides">Choose a subject</a><a class="button secondary" href="/reading-routes/">Follow a question</a></div></div><div class="subjects-hero-words" aria-hidden="true"><span>Comedy</span><span>Gothic</span><span>Freedom</span><span>Narration</span><span>Epic</span></div></section>' +
    '<section class="subjects-intro"><p>A genre is useful when it helps us notice more, not when it becomes a label that settles the book in advance. These guides explain a form clearly, distinguish nearby forms that are often confused and keep returning to exact choices in language, structure and narration.</p></section>' +
    '<section class="subject-directory" id="subject-guides" aria-labelledby="subject-guides-title"><div class="section-title"><p class="kicker">' + subjects.length + ' ways into the library</p><h2 id="subject-guides-title">Choose the form.</h2></div>' + cards + '</section>' +
    '<section class="subjects-reference"><div><p class="kicker">Subject or reading route?</p><h2>Two different kinds of connection.</h2></div><div><p><strong>A subject guide explains a form or method.</strong> It gives a working history, vocabulary and a shelf of books that test the category in different ways.</p><p><strong>A reading route begins with a question.</strong> Home, freedom, fear, power, evidence, voice and knowledge can move between periods and genres without claiming the books belong to one form.</p><div class="button-row"><a class="button primary" href="/reading-routes/">Open the reading routes</a><a class="button secondary" href="/explore/">Search everything</a></div></div></section>' +
    '</main><footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Classic literature approached through books, writers, periods, subjects and questions.</p></div><div class="footer-links"><a href="/authors/">Writers</a><a href="/library/">All books</a><a href="/reading-routes/">Reading routes</a><a href="/resources/">Free resources</a></div></footer></body></html>';
}

const subjectsRoot = path.join(root, 'subjects');
fs.mkdirSync(subjectsRoot, { recursive: true });
fs.writeFileSync(path.join(subjectsRoot, 'index.html'), subjectIndex());

for (const subject of subjects) {
  const directory = path.join(subjectsRoot, subject.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), subjectPage(subject));
}

console.log('Rebuilt ' + subjects.length + ' subject guides.');

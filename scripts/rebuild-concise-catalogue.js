const fs = require('fs');
const path = require('path');
const records = require('./concise-catalogue-data.json');
const { coverFormat } = require('./book-edition-schema');

// These pages intentionally contain only the publisher-supplied description
// and edition contents. Longer editorial material can be added separately.
const root = process.cwd();
const start = '<!-- ASTOR CONCISE CATALOGUE START -->';
const end = '<!-- ASTOR CONCISE CATALOGUE END -->';
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const asset = name => '/' + encodeURIComponent(name).replace(/'/g, '%27');
const header = '<header class="site-header"><a class="brand" href="/">Astor Library</a><nav class="nav" aria-label="Primary navigation"><a href="/explore/">Explore</a><a href="/library/">All books</a><a href="/authors/">Writers</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></nav></header>';
const footer = '<footer class="site-footer"><p>Astor Library</p><a href="/library/">All books</a></footer>';

function page(book) {
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(book.title)} | Astor Annotated Edition | Astor Library</title><meta name="description" content="${esc(book.summary)}"><link rel="stylesheet" href="/assets/styles.css"></head>
<body>${header}<main id="main-content" class="page-wrap astor-book-record">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/library/">All books</a><span aria-hidden="true">/</span><a href="${book.collectionHref}">${esc(book.collection)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(book.title)}</span></nav>
  <section class="page-intro astor-book-hero"><div><p class="kicker">${esc(book.author)}</p><h1>${esc(book.title)}</h1><p class="deck">${esc(book.summary)}</p></div><aside class="source-note astor-book-cover"><img src="${asset(book.image)}" alt="${esc(book.title)} — Astor paperback cover"><div><p><strong>Astor annotated edition</strong><br>Paperback · Edited by Haydn Wood</p><div class="button-row"><a class="button primary" href="${book.purchaseUrl}">View paperback edition</a><a class="button secondary" href="${book.collectionHref}">Browse ${esc(book.collection)}</a></div></div></aside></section>
  <section class="section-title" id="edition"><p class="kicker">This Astor edition</p><h2>Text and supporting material</h2><ul class="edition-includes">${book.editionIncludes.map(text => `<li>${esc(text)}</li>`).join('')}</ul></section>
  ${book.descriptionParagraphs.length ? `<div class="catalogue-essays"><section class="catalogue-essay">${book.descriptionParagraphs.map(text => `<p>${esc(text)}</p>`).join('')}</section></div>` : ''}
  <nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top</a><a href="${book.collectionHref}">More in ${esc(book.collection)}</a><a href="/library/">All books</a></nav>
</main>${footer}</body></html>\n`;
}

function card(book) {
  return `<article class="edition-card"><img src="${asset(book.image)}" alt="${esc(book.title)} — Astor paperback cover" data-no-priority><div><p class="year">Paperback · ${esc(book.author)}</p><h2><em>${esc(book.title)}</em></h2><p>${esc(book.summary)}</p><div class="button-row"><a class="button primary" href="${book.href}">Open page</a><a class="button secondary" href="${book.purchaseUrl}">View paperback</a></div></div></article>`;
}

const russianFile = path.join(root, 'russian/index.html');
if (!fs.existsSync(russianFile)) {
  fs.mkdirSync(path.dirname(russianFile), { recursive: true });
  fs.writeFileSync(russianFile, `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Russian Literature | Astor Library</title><meta name="description" content="Astor annotated editions of Dostoevsky, Tolstoy and Gogol, with complete translations, explanatory notes and historical context."><link rel="stylesheet" href="/assets/styles.css"></head><body>${header}
<main id="main-content" class="page-wrap"><section class="page-intro"><div><p class="kicker">Collection</p><h1>Russian.</h1><p class="deck">Complete works by Fyodor Dostoevsky, Leo Tolstoy and Nikolai Gogol, with explanatory notes and historical context.</p></div></section><section class="timeline"></section></main>${footer}</body></html>\n`);
}

const seen = new Set();
for (const book of records) {
  if (seen.has(book.href)) throw new Error('Repeated concise catalogue book: ' + book.href);
  seen.add(book.href);
  if (!fs.existsSync(path.join(root, book.image))) throw new Error('Missing cover: ' + book.image);
  if (coverFormat(book.image) !== 'Paperback') throw new Error('Paperback cover format mismatch: ' + book.image);
  if (book.editionIncludes.length !== 4) throw new Error('Incomplete supplied edition contents: ' + book.slug);
  const file = path.join(root, book.href.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page(book));
}

for (const collectionFile of new Set(records.map(book => book.collectionFile))) {
  const file = path.join(root, collectionFile);
  let html = fs.readFileSync(file, 'utf8').replace(new RegExp('\\s*' + start + '[\\s\\S]*?' + end + '\\s*', 'g'), '\n');
  const opening = /<section class="timeline"[^>]*>/;
  if (!opening.test(html)) throw new Error('Missing collection timeline: ' + collectionFile);
  html = html.replace(opening, match => match + '\n' + start + '\n' + records.filter(book => book.collectionFile === collectionFile).map(card).join('\n') + '\n' + end + '\n');
  fs.writeFileSync(file, html);
}
console.log(`Integrated ${records.length} concise book pages and the Russian collection.`);

const fs = require('fs');
const path = require('path');
const records = require('./october-catalogue-data.json');
const { coverFormat } = require('./book-edition-schema');

const start = '<!-- ASTOR OCTOBER CATALOGUE START -->';
const end = '<!-- ASTOR OCTOBER CATALOGUE END -->';
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const asset = name => '/' + encodeURIComponent(name).replace(/'/g, '%27');
// Titles marked *like this* in the history paragraphs are set in italics.
const prose = text => esc(text).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const history = book => (book.history || []).map(section => `<section class="section-title" id="history"><h2>${esc(section.heading)}</h2></section><div class="book-reading">${section.paragraphs.map(text => `<p>${prose(text)}</p>`).join('')}</div>`).join('\n  ');
const sources = book => (book.sources || []).length
  ? `<section class="section-title" id="sources"><h2>Sources</h2></section><nav class="book-source-grid" aria-label="Sources for ${esc(book.title)}">${book.sources.map(source => `<a href="${esc(source.url)}"><strong>${esc(source.label)}</strong><span>${esc(source.note)}</span></a>`).join('')}</nav>`
  : '';
const dateLabel = date => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));

function page(book) {
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(book.title)} | Astor Annotated Edition | Astor Library</title><meta name="description" content="${esc(book.summary)}"><link rel="stylesheet" href="/assets/styles.css"></head>
<body><header class="site-header"><a class="brand" href="/">Astor Library</a><nav class="nav" aria-label="Primary navigation"><a href="/library/">All books</a><a href="/explore/">Explore</a><a href="/authors/">Writers</a><a href="/subjects/">Subjects</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></nav></header>
<main id="main-content" class="page-wrap astor-book-record">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/library/">All books</a><span aria-hidden="true">/</span><a href="${esc(book.collectionHref)}">${esc(book.collection)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(book.title)}</span></nav>
  <section class="page-intro astor-book-hero"><div><p class="kicker">${esc(book.author)}</p><h1>${esc(book.title)}</h1><p class="deck">${esc(book.summary)}</p></div><aside class="source-note astor-book-cover"><img src="${asset(book.image)}" alt="${esc(book.title)} — Astor paperback cover"><div><p><strong>Astor annotated edition</strong><br>Paperback · Edited by ${esc(book.editor)}</p><div class="button-row"><a class="button primary" href="${esc(book.purchaseUrl)}">View paperback edition</a></div></div></aside></section>
  <section class="section-title" id="edition"><h2>What this Astor edition contains</h2><ul class="edition-includes">${book.editionIncludes.map(text => `<li>${esc(text)}</li>`).join('')}</ul></section>
  <div class="catalogue-essays"><section class="catalogue-essay" id="description"><h2>About this edition</h2>${book.descriptionParagraphs.map(text => `<p>${esc(text)}</p>`).join('')}<p><a href="${esc(book.amazonUrl)}">Read the description on Amazon</a></p></section></div>
  ${history(book)}
  <div class="catalogue-essays"><section class="catalogue-essay" id="edition-details"><h2>The paperback</h2><dl class="book-details"><div><dt>Published</dt><dd>${esc(dateLabel(book.publicationDate))}</dd></div><div><dt>Pages</dt><dd>${book.numberOfPages}</dd></div><div><dt>ISBN-13</dt><dd>${esc(book.isbn)}</dd></div><div><dt>ASIN</dt><dd>${esc(book.asin)}</dd></div><div><dt>Size</dt><dd>${esc(book.dimensions)}</dd></div><div><dt>Editor</dt><dd>${esc(book.editor)}</dd></div></dl></section></div>
  ${sources(book)}
  <nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top</a><a href="${esc(book.collectionHref)}">More in ${esc(book.collection)}</a><a href="/library/">All books</a></nav>
</main><footer class="site-footer"><p>Astor Library</p><a href="/library/">All books</a></footer></body></html>\n`;
}

function card(book) {
  return `<article class="edition-card"><img src="${asset(book.image)}" alt="${esc(book.title)} — Astor paperback cover" loading="lazy"><div><p class="year">Paperback · ${esc(book.author)}</p><h2><em>${esc(book.title)}</em></h2><p>${esc(book.summary)}</p><div class="button-row"><a class="button primary" href="${esc(book.href)}">Open page</a><a class="button secondary" href="${esc(book.purchaseUrl)}">View paperback</a></div></div></article>`;
}

function build(root = process.cwd()) {
  const seen = new Set();
  for (const book of records) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.slug) || book.href !== `/books/${book.slug}/` || seen.has(book.slug)) throw new Error('Invalid or repeated October book: ' + book.slug);
    seen.add(book.slug);
    if (!/^B[A-Z0-9]{9}$/.test(book.asin) || !['www.amazon.co.uk', 'www.amazon.com', 'www.amazon.ca', 'www.amazon.com.au'].some(host => book.amazonUrl === `https://${host}/dp/${book.asin}`)) throw new Error('Invalid verified Amazon link: ' + book.slug);
    if ((coverFormat(book.image) || book.imageFormat) !== 'Paperback' || !fs.existsSync(path.join(root, book.image))) throw new Error('Missing or mismatched paperback cover: ' + book.image);
    if (book.collectionFile !== book.collectionHref.slice(1) + 'index.html') throw new Error('Mismatched October collection: ' + book.slug);
    const target = path.join(root, book.href.slice(1), 'index.html');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, page(book));
  }
  for (const collectionFile of new Set(records.map(book => book.collectionFile))) {
    const file = path.join(root, collectionFile);
    let html = fs.readFileSync(file, 'utf8').replace(new RegExp('\\s*' + start + '[\\s\\S]*?' + end + '\\s*', 'g'), '\n');
    const opening = /<section class="timeline"[^>]*>/;
    if (!opening.test(html)) throw new Error('Missing collection timeline: ' + collectionFile);
    html = html.replace(opening, match => match + '\n' + start + '\n' + records.filter(book => book.collectionFile === collectionFile).map(card).join('\n') + '\n' + end + '\n');
    fs.writeFileSync(file, html);
  }
  console.log(`Integrated ${records.length} October paperback pages with verified edition descriptions.`);
}

module.exports = { build, page };
if (require.main === module) build();

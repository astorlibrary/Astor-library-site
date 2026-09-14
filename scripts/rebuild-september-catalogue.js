const fs = require('fs');
const path = require('path');
const records = require('./september-catalogue-data.json');
const { coverFormat } = require('./book-edition-schema');
const root = process.cwd();
const start = '<!-- ASTOR SEPTEMBER CATALOGUE START -->';
const end = '<!-- ASTOR SEPTEMBER CATALOGUE END -->';
const proseStart = '<!-- ASTOR EDITION DETAIL START -->';
const proseEnd = '<!-- ASTOR EDITION DETAIL END -->';
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const asset = name => '/' + encodeURIComponent(name).replace(/'/g, '%27');
const para = text => `<p>${esc(text)}</p>`;
const clean = (html, a, b) => html.replace(new RegExp('\\s*' + a + '[\\s\\S]*?' + b + '\\s*', 'g'), '\n');
const sourceLinks = book => (book.sources || []).map(s => `<a href="${esc(s.href)}">${esc(s.label)}</a>`).join('');
function essays(book) {
  return `<div class="catalogue-essays">${book.sections.map((s, i) => `<section class="catalogue-essay" id="edition-detail-${i + 1}"><h2>${esc(s.heading)}</h2>${s.paragraphs.map(para).join('')}</section>`).join('\n')}</div>`;
}
function newPage(book) {
  const cover = asset(book.image);
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(book.title)} | Astor Annotated Edition | Astor Library</title><meta name="description" content="${esc(book.summary)}"><link rel="stylesheet" href="/assets/styles.css"></head>
<body><header class="site-header"><a class="brand" href="/">Astor Library</a><nav class="nav" aria-label="Primary navigation"><a href="/explore/">Explore</a><a href="/library/">All books</a><a href="/authors/">Writers</a><a href="/subjects/">Subjects</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></nav></header>
<main id="main-content" class="page-wrap astor-book-record">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/library/">All books</a><span aria-hidden="true">/</span><a href="${book.collectionHref}">${esc(book.collection)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(book.title)}</span></nav>
  <section class="page-intro astor-book-hero"><div><p class="kicker">${esc(book.author)}</p><h1>${esc(book.title)}</h1><p class="deck">${esc(book.summary)}</p></div><aside class="source-note astor-book-cover"><img src="${cover}" alt="${esc(book.title)} — Astor paperback cover"><div><p><strong>Astor annotated edition</strong><br>Paperback · Edited by Haydn Wood</p><div class="button-row"><a class="button primary" href="${book.purchaseUrl}">View paperback edition</a><a class="button secondary" href="${book.collectionHref}">Browse ${esc(book.collection)}</a></div></div></aside></section>
  <nav class="page-contents" aria-label="On this page"><strong>On this page</strong><div><a href="#edition">Edition contents</a>${book.sections.map((s,i)=>`<a href="#edition-detail-${i+1}">${esc(s.heading)}</a>`).join('')}<a href="#sources">Sources</a></div></nav>
  <section class="section-title" id="edition"><p class="kicker">This Astor edition</p><h2>Text and supporting material</h2><ul class="edition-includes">${book.editionIncludes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>
  ${essays(book)}
  <section class="section-title" id="sources"><p class="kicker">Further reference</p><h2>Texts and publication records</h2></section><nav class="source-list" aria-label="Sources for ${esc(book.title)}">${sourceLinks(book)}</nav>
  <nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top</a><a href="${book.collectionHref}">More in ${esc(book.collection)}</a><a href="/library/">All books</a></nav>
</main><footer class="site-footer"><p>Astor Library</p><a href="/library/">All books</a></footer></body></html>\n`;
}
function addDetails(book) {
  const file = path.join(root, 'books', book.slug, 'index.html');
  let html = clean(fs.readFileSync(file,'utf8'),proseStart,proseEnd);
  if (book.format === 'paperback') {
    html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(book.summary)}">`);
    // These two established routes retain their earlier sections and facts.
    // Add bibliographical detail after them without duplicating their opening plot.
    book = {...book, sections: book.sections.slice(1)};
  }
  if (book.sections?.length) {
    const content = `${proseStart}\n${essays(book)}\n<nav class="source-list" aria-label="Further publication sources">${sourceLinks(book)}</nav>\n${proseEnd}\n`;
    const pos = html.indexOf('<nav class="book-end-nav"');
    const at = pos === -1 ? html.lastIndexOf('</main>') : pos;
    if(at === -1) throw new Error(`Missing main on ${book.href}`);
    html = html.slice(0,at)+content+html.slice(at);
  }
  fs.writeFileSync(file,html);
}
function card(book) {
  return `<article class="edition-card"><img src="${asset(book.image)}" alt="${esc(book.title)} — Astor paperback cover"><div><p class="year">Paperback · ${esc(book.author)}</p><h2><em>${esc(book.title)}</em></h2><p>${esc(book.summary)}</p><div class="button-row"><a class="button primary" href="${book.href}">Open page</a><a class="button secondary" href="${book.purchaseUrl}">View paperback</a></div></div></article>`;
}
const seen = new Set();
for (const book of records) {
  if (seen.has(book.href)) throw new Error('Repeated release book: '+book.href);
  seen.add(book.href);
  if (!fs.existsSync(path.join(root,book.image))) throw new Error('Missing cover: '+book.image);
  if(coverFormat(book.image)!==(book.format==='hardcover'?'Hardcover':'Paperback')) throw new Error('Cover format mismatch: '+book.image);
  if(book.format==='paperback' && !book.exists) {
    fs.mkdirSync(path.join(root,'books',book.slug),{recursive:true});
    fs.writeFileSync(path.join(root,'books',book.slug,'index.html'),newPage(book));
  } else addDetails(book);
}
for(const collectionFile of new Set(records.map(b=>b.collectionFile))) {
  const file=path.join(root,collectionFile);
  let html=clean(fs.readFileSync(file,'utf8'),start,end);
  const books=records.filter(b=>!b.exists && b.format==='paperback' && b.collectionFile===collectionFile);
  if(books.length) {
    const opening=/<section class="timeline"[^>]*>/;
    if(!opening.test(html)) throw new Error('Missing collection timeline: '+collectionFile);
    html=html.replace(opening,match=>match+'\n'+start+'\n'+books.map(card).join('\n')+'\n'+end);
  }
  fs.writeFileSync(file,html);
}
console.log(`Integrated ${records.length} requested editions, including ${records.filter(b=>!b.exists).length} new book pages.`);

const fs = require('fs');
const path = require('path');
const profiles = require('./author-profiles');
const septemberBooks = require('./september-catalogue-data.json');

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function coverStack(author) {
  return `<div class="author-profile-covers" aria-label="Books by ${escapeHtml(author.title)} in Astor Library">${author.books.slice(0, 3).map(book => `<a href="${escapeHtml(book.href)}"><img src="${escapeHtml(book.image)}" alt="${escapeHtml(book.imageAlt)}" loading="lazy"></a>`).join('')}</div>`;
}

function bookShelf(author) {
  const headingId = author.href.split('/').filter(Boolean).pop() + '-books-title';
  const cards = author.books.map(book => {
    const edition = septemberBooks.find(entry => entry.href === book.href);
    const copy = edition?.summary || book.description || `Complete text and supporting material on ${book.title}.`;
    const attribution = profiles.contributorNotes?.[book.href]?.[author.title];
    return `<article><a href="${escapeHtml(book.href)}"><img src="${escapeHtml(book.image)}" alt="${escapeHtml(book.imageAlt)}" loading="lazy"><div><p>${escapeHtml(book.collection)}</p><h3>${escapeHtml(book.title)}</h3><span>${escapeHtml(attribution || copy)}</span><b>Open book page <span aria-hidden="true">&rarr;</span></b></div></a></article>`;
  }).join('');
  const gridClass = author.books.length < 3 ? ` author-book-grid-${author.books.length === 1 ? 'one' : 'two'}` : '';
  return `<section class="author-shelf" id="books" aria-labelledby="${headingId}"><div class="author-shelf-head"><div><p class="kicker">${escapeHtml(author.title)} in Astor Library</p><h2 id="${headingId}">Books and collections.</h2></div><p>${author.bookCount} ${author.bookCount === 1 ? 'book or collection' : 'books and collections'} represented. Each book page identifies its contents, available formats and purchase links. Anthologies include work by more than one writer.</p></div><div class="author-book-grid${gridClass}">${cards}</div></section>`;
}

function sourceLinks(author) {
  const seen = new Set();
  const sources = author.books.flatMap(book => {
    const edition = septemberBooks.find(entry => entry.href === book.href);
    return (edition?.sources || []).map(source => ({ href: source.href || source.url, label: source.label || source.title }));
  }).filter(source => source.href && /^https:\/\//.test(source.href) && !source.href.includes('astorlibrary.com/go/') && !seen.has(source.href) && seen.add(source.href)).slice(0, 5);
  if (!sources.length) return author.books.map(book => `<a href="${escapeHtml(book.href)}">${escapeHtml(book.title)}: text and edition information</a>`).join('');
  return sources.map(source => `<a href="${escapeHtml(source.href)}">${escapeHtml(source.label)}</a>`).join('');
}

function catalogueProfile(profile, author, siteHeader) {
  const years = `${profile.birthDate.slice(0, 4)}–${profile.deathDate.slice(0, 4)}`;
  const collections = [...new Set(author.books.map(book => book.collection))];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(author.title)} | Books and Editions | Astor Library</title><meta name="description" content="${escapeHtml(profile.description)}"><link rel="stylesheet" href="/assets/styles.css"></head><body>${siteHeader()}<main id="main-content" class="page-wrap author-profile-page" data-author-profile-type="catalogue">
<nav class="book-breadcrumb author-breadcrumb" aria-label="Breadcrumb"><a href="/authors/">Writers</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(author.title)}</span></nav>
<section class="author-profile-hero"><div class="author-profile-heading"><p class="kicker">${years} · Writer catalogue</p><h1>${escapeHtml(author.title)}</h1><p class="deck">${escapeHtml(profile.description)}</p><div class="button-row"><a class="button primary" href="#books">Browse the books</a><a class="button secondary" href="/authors/">All writers</a></div></div>${coverStack(author)}</section>
<section class="author-facts" aria-label="${escapeHtml(author.title)} at a glance"><div><b>${profile.birthDate.slice(0, 4)}</b><span>Year of birth</span></div><div><b>${profile.deathDate.slice(0, 4)}</b><span>Year of death</span></div><div><b>${author.bookCount}</b><span>${author.bookCount === 1 ? 'Book or anthology' : 'Books and anthologies'} in the catalogue</span></div><div><b>${collections.length}</b><span>${collections.length === 1 ? 'Literary collection' : 'Literary collections'} represented</span></div></section>
<section class="author-opening"><p class="kicker">Reading and reference</p><div><h2>The editions in this catalogue.</h2><p>The books below bring together the work by ${escapeHtml(author.title)} currently available from Astor Library. A collection may include other writers; its book page lists the contents and identifies the texts used. Separate formats of one work are shown together on the same book page.</p><p>Use the individual pages for the complete edition description, publication history and the supporting material included in that volume. Textual notes distinguish an original publication date from the source used for a modern edition. Where paperback and hardcover editions are available, their covers and purchase links are labelled separately.</p></div></section>
${bookShelf(author)}
<section class="author-sources"><div><p class="kicker">Sources and further reading</p><h2>Texts and publication records.</h2></div><p>These resources support the information on the linked book pages. The edition descriptions specify the text, translation, illustrations and annotations where applicable.</p><nav class="source-list" aria-label="${escapeHtml(author.title)} sources">${sourceLinks(author)}</nav></section>
<nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a><a href="/authors/">All writers</a><a href="/library/">All books</a><a href="/explore/?q=${encodeURIComponent(author.title)}">Search this writer <span aria-hidden="true">&rarr;</span></a></nav></main><footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Complete classic texts, author pages and study resources.</p></div><div class="footer-links"><a href="/authors/">Writers</a><a href="/subjects/">Subjects</a><a href="/library/">All books</a><a href="/resources/">Free resources</a></div></footer></body></html>`;
}

module.exports = function rebuildAuthorCatalogue(authors, siteHeader) {
  let generated = 0;
  for (const profile of profiles) {
    const author = authors.find(entry => entry.title === profile.name);
    if (!author || !author.books.length) throw new Error(`Writer profile has no catalogue membership: ${profile.name}`);
    if (profile.href === '/shakespeare/') continue;
    const file = path.join(process.cwd(), profile.href.slice(1), 'index.html');
    if (profile.profileType === 'catalogue') {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, catalogueProfile(profile, author, siteHeader));
      generated += 1;
      continue;
    }
    if (!fs.existsSync(file)) throw new Error(`Missing existing writer profile: ${profile.href}`);
    let html = fs.readFileSync(file, 'utf8');
    const shelfPattern = /<section class="author-shelf"[^>]*>[\s\S]*?<\/section>/;
    if (!shelfPattern.test(html)) throw new Error(`Could not locate the book shelf in ${profile.href}`);
    html = html.replace(shelfPattern, bookShelf(author));
    html = html.replace(/<div class="author-profile-covers[^\"]*"[^>]*>[\s\S]*?<\/div>/, coverStack(author));
    html = html.replace(/(<a class="button primary" href="#books">)[\s\S]*?(<\/a>)/, '$1Browse the books$2');
    html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(profile.description)}">`);
    fs.writeFileSync(file, html);
  }
  console.log(`Rebuilt ${generated} writer catalogue profiles and refreshed existing book shelves.`);
};

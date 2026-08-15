const fs = require('fs');
const path = require('path');
const additions = require('./shakespeare-additions');

const root = process.cwd();
const collectionFile = path.join(root, 'shakespeare', 'index.html');
const blockStart = '<!-- ASTOR SHAKESPEARE ADDITIONS START -->';
const blockEnd = '<!-- ASTOR SHAKESPEARE ADDITIONS END -->';
const guideStart = '<!-- ASTOR SHAKESPEARE GUIDE START -->';
const guideEnd = '<!-- ASTOR SHAKESPEARE GUIDE END -->';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paragraph(value) {
  return '<p>' + escapeHtml(value) + '</p>';
}

function firstSentence(value) {
  return String(value).match(/^.*?[.!?](?:\s|$)/)?.[0].trim() || String(value);
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

function bookPage(book) {
  const facts = book.facts.map(function (fact) {
    return '<div class="fact"><b>' + escapeHtml(fact.label) + '</b><span>' + escapeHtml(fact.text) + '</span></div>';
  }).join('');

  const movements = book.movements.map(function (movement, index) {
    return '<article><span>' + String(index + 1).padStart(2, '0') + ' · ' + escapeHtml(movement.label) + '</span><h3>' + escapeHtml(movement.title) + '</h3><p>' + escapeHtml(movement.body) + '</p></article>';
  }).join('');

  const readings = book.readings.map(function (reading) {
    return '<article class="prod-card prose-card"><p class="year">' + escapeHtml(reading.label) + '</p><h3>' + escapeHtml(reading.title) + '</h3>' + reading.paragraphs.map(paragraph).join('') + '</article>';
  }).join('');

  const contexts = book.contexts.map(function (context) {
    return '<article><span>' + escapeHtml(context.label) + '</span><h3>' + escapeHtml(context.title) + '</h3><p>' + escapeHtml(context.body) + '</p></article>';
  }).join('');

  const characters = book.characters.map(function (character) {
    return '<article><h3>' + escapeHtml(character.name) + '</h3><p>' + escapeHtml(character.body) + '</p></article>';
  }).join('');

  const questions = book.questions.map(function (question, index) {
    return '<article><span>' + String(index + 1).padStart(2, '0') + '</span><h3>' + escapeHtml(question.title) + '</h3><p>' + escapeHtml(question.body) + '</p></article>';
  }).join('');

  const sources = book.sources.map(function (source) {
    return '<a href="' + escapeHtml(source.href) + '">' + escapeHtml(source.label) + '</a>';
  }).join('');

  const studyButton = book.studyUrl
    ? '<a class="button secondary" href="' + escapeHtml(book.studyUrl) + '">View the study edition</a>'
    : '<a class="button secondary" href="/study/">Browse study editions</a>';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(book.title)} | Text, Context and Performance | Astor Library</title><meta name="description" content="${escapeHtml(firstSentence(book.deck))}"><link rel="stylesheet" href="/assets/styles.css"></head>
<body>${header()}
<main id="main-content" class="page-wrap astor-book-record">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/library/">All books</a><span aria-hidden="true">/</span><a href="/shakespeare/">Shakespeare</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(book.title)}</span></nav>
  <section class="page-intro astor-book-hero"><div><p class="kicker">${escapeHtml(book.author)}</p><h1>${escapeHtml(book.title)}</h1><p class="deck">${escapeHtml(book.deck)}</p></div><aside class="source-note astor-book-cover"><img src="${book.image}" alt="Astor Library ${escapeHtml(book.title)} cover"><div><p><strong>Astor Library edition</strong><br>Complete play with summaries, line numbers, notes, context and material for further study.</p><div class="button-row"><a class="button primary" href="${escapeHtml(book.url)}">Buy / view edition</a>${studyButton}</div></div></aside></section>
  <nav class="page-contents" aria-label="On this page"><strong>On this page</strong><div><a href="#edition">Edition contents</a><a href="#movement">Plot and structure</a><a href="#reading">Critical reading</a><a href="#context">Text and performance</a><a href="#characters">Characters</a><a href="#questions">Study questions</a><a href="#sources">Sources</a></div></nav>
  <section class="quick-facts" aria-label="${escapeHtml(book.title)} facts">${facts}</section>
  <section class="section-title" id="edition"><p class="kicker">Edition contents</p><h2>What this Astor edition contains.</h2><p>The edition contains the complete play, scene summaries, line numbers, explanatory notes, contextual information and study material.</p></section>
  <section class="timeline"><article class="edition-card new-edition"><img src="${book.image}" alt="Astor Library ${escapeHtml(book.title)} cover"><div><p class="year">${escapeHtml(book.genre)}</p><h2><em>${escapeHtml(book.title)}</em>, ${escapeHtml(book.author)}</h2>${book.edition.map(paragraph).join('')}<div class="button-row"><a class="button primary" href="${escapeHtml(book.url)}">Buy / view Astor edition</a>${studyButton}</div></div></article></section>
  <section class="section-title" id="movement"><p class="kicker">Plot and structure</p><h2>Five stages in the action.</h2><p>These sections summarise the main developments in the plot and identify changes in power, knowledge and dramatic conflict.</p></section>
  <section class="astor-movement-grid">${movements}</section>
  <section class="section-title" id="reading"><p class="kicker">Critical reading</p><h2>Three analyses of language and form.</h2><p>Each analysis uses evidence from specific scenes, speeches and dramatic choices.</p></section>
  <section class="astor-reading-grid">${readings}</section>
  <section class="section-title" id="context"><p class="kicker">Text, sources and performance</p><h2>Publication and performance context.</h2><p>This section covers the play's date, sources, early printed texts and relevant performance history.</p></section>
  <section class="astor-context-grid">${contexts}</section>
  <section class="section-title" id="characters"><p class="kicker">Characters</p><h2>Principal characters and dramatic functions.</h2></section>
  <section class="astor-character-grid">${characters}</section>
  <section class="section-title" id="questions"><p class="kicker">Study questions</p><h2>Questions for analysis and discussion.</h2><p>Each question requires evidence from the text and can be used for discussion, notes or essay planning.</p></section>
  <section class="astor-question-grid">${questions}</section>
  <section class="section-title" id="sources"><p class="kicker">Sources</p><h2>Texts, archives and research collections.</h2><p>The links below provide source texts, performance records and further scholarly information.</p></section>
  <nav class="source-list" aria-label="${escapeHtml(book.title)} sources">${sources}</nav>
  <nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a><a href="/shakespeare/">All Shakespeare editions</a><a href="/study/">Study editions</a><a href="/explore/">Search the library <span aria-hidden="true">&rarr;</span></a></nav>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Complete Shakespeare editions with summaries, notes, context and study material.</p></div><div class="footer-links"><a href="/shakespeare/">Shakespeare</a><a href="/library/">All books</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></div></footer>
</body></html>`;
}

function catalogueCard(book) {
  return '<article class="edition-card"><img src="' + book.image + '" alt="Astor Library ' + escapeHtml(book.title) + ' cover"><div><p class="year">' + escapeHtml(book.genre) + '</p><h2><em>' + escapeHtml(book.title) + '</em></h2><p>' + escapeHtml(book.deck) + '</p><div class="button-row"><a class="button primary" href="../books/' + escapeHtml(book.slug) + '/">Open page</a><a class="button secondary" href="' + escapeHtml(book.url) + '">Buy / view edition</a></div></div></article>';
}

for (const book of additions) {
  const directory = path.join(root, 'books', book.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), bookPage(book));
}

let collection = fs.readFileSync(collectionFile, 'utf8');
collection = collection.replace(new RegExp(blockStart + '[\\s\\S]*?' + blockEnd, 'g'), '');
collection = collection.replace(new RegExp(guideStart + '[\\s\\S]*?' + guideEnd, 'g'), '');
collection = collection
  .replace('<section class="timeline" id="full-shelf">', '<section class="timeline">')
  .replace(/<meta name="description" content="[^"]+">/, '<meta name="description" content="Astor Library publishes 56 Shakespeare editions, including all 37 plays, poetry, the Shakespeare Apocrypha and five Expanded Scholarly Editions.">')
  .replace('<h1>Shakespeare.</h1><p class="deck">Shakespeare&rsquo;s plays have never stood still. Read them through early print, the stories they borrowed and centuries of performance, from playhouse to screen.</p>', '<h1>Complete Shakespeare editions.</h1><p class="deck">Astor Library publishes all thirty-seven plays, poetry, the eight-volume Shakespeare Apocrypha and five Expanded Scholarly Editions.</p>')
  .replace('../Taming%20of%20the%20Shrew.png', '/The%20Taming%20of%20the%20Shrew%20Main%20Cover.jpg')
  .replace(/https:\/\/mybook\.to\/HvvVI1/g, 'https://mybook.to/SjnG')
  .replace(/https:\/\/mybook\.to\/gMCop/g, 'https://mybook.to/q5UU')
  .replace('<section class="timeline">', `${guideStart}
<section class="shakespeare-reading-room" aria-labelledby="shakespeare-room-title"><div class="shakespeare-reading-room-head"><div><p class="kicker">Catalogue by genre</p><h2 id="shakespeare-room-title">Browse the plays by genre.</h2></div><div><strong>39 editions</strong><span>across 37 plays</span></div></div><div class="shakespeare-reading-table"><article><p>History plays</p><h3>Histories</h3><a href="/books/richard-ii/">Richard II</a><a href="/books/henry-v/">Henry V</a><a href="/books/henry-vi-parts-1-2-and-3/">Henry VI trilogy</a><a href="/books/king-john/">King John</a></article><article><p>Comic plays</p><h3>Comedies</h3><a href="/books/loves-labours-lost/">Love&rsquo;s Labour&rsquo;s Lost</a><a href="/books/the-merchant-of-venice/">The Merchant of Venice</a><a href="/books/twelfth-night/">Twelfth Night</a><a href="/books/the-two-gentlemen-of-verona/">Two Gentlemen</a></article><article><p>Tragic plays</p><h3>Tragedies</h3><a href="/books/hamlet/">Hamlet</a><a href="/books/titus-andronicus/">Titus Andronicus</a><a href="/books/timon-of-athens/">Timon of Athens</a><a href="/books/troilus-and-cressida/">Troilus and Cressida</a></article><article><p>Late and collaborative plays</p><h3>Late &amp; collaborative</h3><a href="/books/pericles-prince-of-tyre/">Pericles</a><a href="/books/the-winters-tale/">The Winter&rsquo;s Tale</a><a href="/books/the-two-noble-kinsmen/">Two Noble Kinsmen</a><a href="/books/henry-viii/">Henry VIII</a></article></div><div class="button-row"><a class="button primary" href="#full-shelf">See every edition</a><a class="button secondary" href="/study/">Shakespeare study editions</a></div></section>
${guideEnd}
<section class="timeline" id="full-shelf">`)
  .replace('<strong>39 editions</strong><span>across 37 plays</span>', '<strong>56 editions</strong><span>plays, poetry and specialist ranges</span>')
  .replace('</section></main>', blockStart + '\n' + additions.map(catalogueCard).join('\n') + '\n' + blockEnd + '\n</section></main>');

fs.writeFileSync(collectionFile, collection);
console.log('Built ' + additions.length + ' Shakespeare book pages and refreshed the collection.');

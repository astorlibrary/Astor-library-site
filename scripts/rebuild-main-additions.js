const fs = require('fs');
const path = require('path');
const additions = require('./main-additions');

const root = process.cwd();
const blockStart = '<!-- ASTOR MAIN ADDITIONS START -->';
const blockEnd = '<!-- ASTOR MAIN ADDITIONS END -->';

const collectionCopy = {
  'renaissance-early-modern/index.html': {
    title: 'Renaissance and Early Modern Literature | Astor Library',
    description: 'Astor editions of Webster, Marlowe, More, Machiavelli and Milton, with material on early modern theatre, tragedy, humanism, epic, political prose, print and power.',
    kicker: 'Period',
    heading: 'Renaissance &amp; Early Modern.',
    deck: 'Theatre, political prose and epic meet in a period preoccupied with power: who possesses it, how it is performed and what it costs. Webster and Marlowe place ambition, conscience and private choice on stage; More, Machiavelli and Milton test government, freedom and social order on the page.'
  },
  'shakespeare/index.html': {
    title: 'Shakespeare Plays, Poems, Editions and Study Guides | Astor Library',
    description: 'Fifty-six Astor Shakespeare editions: all 37 plays, poetry, eight Shakespeare Apocrypha volumes and five Expanded Scholarly Editions, with notes, context and performance history.',
    kicker: 'Shakespeare',
    heading: 'Complete Shakespeare editions.',
    deck: 'All thirty-seven plays, the poetry, eight Shakespeare Apocrypha volumes and five Expanded Scholarly Editions. Standard and specialist editions remain clearly distinguished throughout the catalogue.'
  },
  'restoration-enlightenment/index.html': {
    title: 'Restoration and Enlightenment Literature | Astor Library',
    description: 'Astor editions of Defoe, Swift and Richardson, with material on travel, survival, satire, letters, print culture, commerce and the developing English novel.',
    kicker: 'Period',
    heading: 'Restoration &amp; Enlightenment.',
    deck: 'Defoe turns travel, shipwreck and colonial commerce into a new kind of fictional life; Swift turns the travel book against human pride; Richardson builds a novel from private letters and unequal power. Together, these works show prose fiction and public argument finding new forms.'
  },
  'american/index.html': {
    title: 'American Classic Literature | Astor Library',
    description: 'Astor editions of American classics by Hawthorne, Stowe, Douglass, Melville, Twain, Crane and London, with notes, context and study material.',
    kicker: 'Period',
    heading: 'American.',
    deck: 'Hawthorne&rsquo;s romance of public punishment joins abolitionist argument, autobiography, whaling, river satire, Civil War and the Klondike. These books do not offer one account of America: they show who could claim freedom, who was denied it and what survival asked of a person.'
  }
};

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

function actionButtons(book, includeCollection) {
  const buttons = [];
  if (book.purchaseUrl) {
    buttons.push('<a class="button primary" href="' + escapeHtml(book.purchaseUrl) + '">Buy / view Astor edition</a>');
  }
  if (includeCollection) {
    buttons.push('<a class="button secondary" href="' + escapeHtml(book.collectionHref) + '">Browse ' + escapeHtml(book.collection) + '</a>');
  } else if (!book.purchaseUrl) {
    buttons.push('<a class="button secondary" href="/library/">Browse the catalogue</a>');
  }
  return '<div class="button-row">' + buttons.join('') + '</div>';
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

  const figures = book.figures.map(function (figure) {
    return '<article><h3>' + escapeHtml(figure.name) + '</h3><p>' + escapeHtml(figure.body) + '</p></article>';
  }).join('');

  const questions = book.questions.map(function (question, index) {
    return '<article><span>' + String(index + 1).padStart(2, '0') + '</span><h3>' + escapeHtml(question.title) + '</h3><p>' + escapeHtml(question.body) + '</p></article>';
  }).join('');

  const sources = book.sources.map(function (source) {
    return '<a href="' + escapeHtml(source.href) + '">' + escapeHtml(source.label) + '</a>';
  }).join('');

  const heroActions = actionButtons(book, false);
  const editionActions = actionButtons(book, true);
  const workDescription = (book.genre + ' ' + book.editionKind).toLowerCase();
  const workLabel = workDescription.includes('novel') ? 'novel' : workDescription.includes('poem') ? 'poem' : 'play';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(book.title)} | Text, Context and Study | Astor Library</title><meta name="description" content="${escapeHtml(firstSentence(book.deck))}"><link rel="stylesheet" href="/assets/styles.css"></head>
<body>${header()}
<main id="main-content" class="page-wrap astor-book-record">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/library/">All books</a><span aria-hidden="true">/</span><a href="${escapeHtml(book.collectionHref)}">${escapeHtml(book.collection)}</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(book.title)}</span></nav>
  <section class="page-intro astor-book-hero"><div><p class="kicker">${escapeHtml(book.author)}</p><h1>${escapeHtml(book.title)}</h1><p class="deck">${escapeHtml(book.deck)}</p></div><aside class="source-note astor-book-cover"><img src="${book.image}" alt="Astor Library ${escapeHtml(book.title)} cover"><div><p><strong>Astor Library edition</strong><br>${escapeHtml(book.editionKind)}</p>${heroActions}</div></aside></section>
  <nav class="page-contents" aria-label="On this page"><strong>On this page</strong><div><a href="#edition">Edition contents</a><a href="#movement">Plot and structure</a><a href="#reading">Critical reading</a><a href="#context">Context and form</a><a href="#figures">Characters</a><a href="#questions">Study questions</a><a href="#sources">Sources</a></div></nav>
  <section class="quick-facts" aria-label="${escapeHtml(book.title)} facts">${facts}</section>
  <section class="section-title" id="edition"><p class="kicker">Edition contents</p><h2>What this Astor edition contains.</h2><p>The edition contains the complete ${workLabel}, summaries, explanatory notes and title-specific material on form, publication history and interpretation.</p></section>
  <section class="timeline"><article class="edition-card new-edition"><img src="${book.image}" alt="Astor Library ${escapeHtml(book.title)} cover"><div><p class="year">${escapeHtml(book.genre)} · ${escapeHtml(book.year)}</p><h2><em>${escapeHtml(book.title)}</em>, ${escapeHtml(book.author)}</h2>${book.edition.map(paragraph).join('')}${editionActions}</div></article></section>
  <section class="section-title" id="movement"><p class="kicker">The shape of the work</p><h2>${escapeHtml(book.movementTitle)}</h2><p>${escapeHtml(book.movementIntro)}</p></section>
  <section class="astor-movement-grid">${movements}</section>
  <section class="section-title" id="reading"><p class="kicker">Critical reading</p><h2>${escapeHtml(book.readingTitle)}</h2><p>Each section identifies specific language, structure or evidence used in the interpretation.</p></section>
  <section class="astor-reading-grid">${readings}</section>
  <section class="section-title" id="context"><p class="kicker">Book, history and form</p><h2>${escapeHtml(book.contextTitle)}</h2><p>These sections explain publication history, literary form and historical information relevant to the work.</p></section>
  <section class="astor-context-grid">${contexts}</section>
  <section class="section-title" id="figures"><p class="kicker">Characters and speakers</p><h2>${escapeHtml(book.figuresTitle)}</h2></section>
  <section class="astor-character-grid">${figures}</section>
  <section class="section-title" id="questions"><p class="kicker">Study questions</p><h2>Questions for analysis and discussion.</h2><p>Answer each question with quotations or precise references to the work.</p></section>
  <section class="astor-question-grid">${questions}</section>
  <section class="section-title" id="sources"><p class="kicker">Sources</p><h2>Texts, archives and further reading.</h2><p>The links below support the publication history, historical context and interpretation on this page.</p></section>
  <nav class="source-list" aria-label="${escapeHtml(book.title)} sources">${sources}</nav>
  <nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a><a href="${escapeHtml(book.collectionHref)}">More in ${escapeHtml(book.collection)}</a><a href="/study/">Study editions</a><a href="/explore/">Search the library <span aria-hidden="true">&rarr;</span></a></nav>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Complete classic texts, study editions and free literature resources.</p></div><div class="footer-links"><a href="${escapeHtml(book.collectionHref)}">${escapeHtml(book.collection)}</a><a href="/library/">All books</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></div></footer>
</body></html>`;
}

function catalogueCard(book) {
  const buyButton = book.purchaseUrl
    ? '<a class="button secondary" href="' + escapeHtml(book.purchaseUrl) + '">Buy / view edition</a>'
    : '';
  return '<article class="edition-card"><img src="' + book.image + '" alt="Astor Library ' + escapeHtml(book.title) + ' cover"><div><p class="year">' + escapeHtml(book.genre) + '</p><h2><em>' + escapeHtml(book.title) + '</em></h2><p>' + escapeHtml(book.deck) + '</p><div class="button-row"><a class="button primary" href="/books/' + escapeHtml(book.slug) + '/">Open page</a>' + buyButton + '</div></div></article>';
}

function updateCollection(relative, books) {
  const file = path.join(root, relative);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(new RegExp('\\s*' + blockStart + '[\\s\\S]*?' + blockEnd + '\\s*', 'g'), '\n');

  const copy = collectionCopy[relative];
  if (copy) {
    html = html
      .replace(/<title>[\s\S]*?<\/title>/, '<title>' + copy.title + '</title>')
      .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + copy.description + '">')
      .replace(/<section class="page-intro">[\s\S]*?<\/section>/, '<section class="page-intro"><div><p class="kicker">' + copy.kicker + '</p><h1>' + copy.heading + '</h1><p class="deck">' + copy.deck + '</p></div></section>');
  }

  if (relative === 'shakespeare/index.html') {
    html = html
      .replace('Find the play by the pressure it holds.', 'Browse the works by genre.')
      .replace(/<strong>\d+ editions<\/strong><span>[^<]*<\/span>/, '<strong>56 editions</strong><span>37 plays + poetry + specialist ranges</span>');
  }

  const divider = relative === 'shakespeare/index.html'
    ? '<div class="section-title shakespeare-poem-divider"><p class="kicker">Shakespeare in print</p><h2>Two poems that made his name in print.</h2><p><em>Venus and Adonis</em> and <em>The Rape of Lucrece</em> were among Shakespeare&rsquo;s first named appearances in print. Read beside the plays, they open a different scale of voice, argument and classical story.</p></div>\n'
    : '';
  const block = blockStart + '\n' + divider + books.map(catalogueCard).join('\n') + '\n' + blockEnd + '\n';
  const mainClose = html.lastIndexOf('</main>');
  const timelineClose = html.lastIndexOf('</section>', mainClose);
  if (mainClose === -1 || timelineClose === -1) {
    throw new Error('Could not find the collection timeline in ' + relative);
  }
  const beforeTimelineClose = html.slice(0, timelineClose).replace(/\s*$/, '\n');
  html = beforeTimelineClose + block + html.slice(timelineClose);
  fs.writeFileSync(file, html);
}

for (const book of additions) {
  const directory = path.join(root, 'books', book.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), bookPage(book));
}

const byCollection = new Map();
for (const book of additions) {
  if (!byCollection.has(book.collectionFile)) byCollection.set(book.collectionFile, []);
  byCollection.get(book.collectionFile).push(book);
}
for (const relative of [
  'ancient-epic/index.html',
  'renaissance-early-modern/index.html',
  'shakespeare/index.html',
  'restoration-enlightenment/index.html',
  'romantic-regency/index.html',
  'victorian/index.html',
  'american/index.html',
  'modern/index.html'
]) {
  const file = path.join(root, relative);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(new RegExp('\\s*' + blockStart + '[\\s\\S]*?' + blockEnd + '\\s*', 'g'), '\n');
  fs.writeFileSync(file, html);
}
for (const [relative, books] of byCollection) updateCollection(relative, books);

console.log('Built ' + additions.length + ' main-edition pages and refreshed ' + byCollection.size + ' collections.');

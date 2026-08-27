const fs = require('fs');
const path = require('path');
const books = require('./edition-update-data');
// Book-specific section headings live outside the template so the editorial
// guide's rule against interchangeable headings survives every rebuild.
const sectionOverrides = require('./edition-section-overrides.json');
const bookEnrichments = require('./book-enrichment-data');

function sectionOverride(id, slug) {
  const section = sectionOverrides[slug]?.[id];
  if (!section || !section.heading) {
    throw new Error('Missing "' + id + '" section heading for "' + slug + '" in scripts/edition-section-overrides.json. ' +
      'Write a book-specific heading and note (EDITORIAL_GUIDE.md forbids template headings).');
  }
  return section;
}

function sectionTitleBlock(id, kicker, slug) {
  const section = sectionOverride(id, slug);
  return '<section class="section-title" id="' + id + '"><p class="kicker">' + kicker + '</p><h2>' + section.heading + '</h2>' +
    (section.note ? '<p>' + section.note + '</p>' : '') + '</section>';
}

const root = process.cwd();
const blockStart = '<!-- ASTOR EDITION UPDATE START -->';
const blockEnd = '<!-- ASTOR EDITION UPDATE END -->';
const choiceStart = '<!-- ASTOR EDITION CHOICE START -->';
const choiceEnd = '<!-- ASTOR EDITION CHOICE END -->';
const routesStart = '<!-- ASTOR SHAKESPEARE ROUTES START -->';
const routesEnd = '<!-- ASTOR SHAKESPEARE ROUTES END -->';
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
const collectionCopy = {
  'ancient-epic/index.html': {
    title: 'Ancient and Epic Literature | Astor Library',
    description: 'Astor editions of the Iliad, Odyssey and Aeneid, with material on epic form, oral tradition, war, homecoming, exile, translation and empire.',
    kicker: 'Period',
    heading: 'Ancient &amp; Epic.',
    deck: 'Homer&rsquo;s <em>Iliad</em> begins with anger inside a war; the <em>Odyssey</em> asks what survives war and wandering. Virgil&rsquo;s <em>Aeneid</em> turns the refugee from Troy towards a future Rome while keeping the cost of that future in view.'
  },
  'renaissance-early-modern/index.html': {
    title: 'Renaissance and Early Modern Literature | Astor Library',
    description: 'Astor editions of Skelton, More, Machiavelli, Marlowe, Webster and Milton, with material on Tudor poetry, humanism, drama, epic, print and political power.',
    kicker: 'Period',
    heading: 'Renaissance &amp; Early Modern.',
    deck: 'Skelton&rsquo;s quick, irregular verse joins theatre, political prose and epic in a period preoccupied with power. More and Machiavelli test government on the page; Marlowe and Webster stage ambition and conscience; Milton makes freedom and obedience the matter of epic.'
  },
  'shakespeare/index.html': {
    title: 'Shakespeare Standard Editions, Scholarly Editions and Apocrypha | Astor Library',
    description: 'Browse Astor standard editions of all 37 Shakespeare plays and the poetry, with separate collections for The Astor Shakespeare scholarly editions and Shakespeare Apocrypha.',
    kicker: 'Shakespeare',
    heading: 'Shakespeare.',
    deck: 'The main shelf brings together the regular Astor editions of all thirty-seven plays and the poetry. The Astor Shakespeare scholarly editions and the Shakespeare Apocrypha have their own collections, so each range keeps its character and remains easy to browse.'
  },
  'restoration-enlightenment/index.html': {
    title: 'Restoration and Enlightenment Literature | Astor Library',
    description: 'Astor editions of Defoe, Swift and Richardson, with material on travel, survival, satire, letters, print culture, commerce and the developing English novel.',
    kicker: 'Period',
    heading: 'Restoration &amp; Enlightenment.',
    deck: 'Defoe turns shipwreck, survival and colonial commerce into a new kind of fictional life; Swift turns the travel book against human pride; Richardson builds a novel from private letters and unequal power. Together, these works show prose fiction and public argument finding new forms.'
  },
  'romantic-regency/index.html': {
    title: 'Romantic and Regency Literature | Astor Library',
    description: 'Astor editions of Goethe, Coleridge, Austen and Shelley, with material on Romantic poetry and fiction, courtship, inheritance, nature, guilt, science and the Gothic.',
    kicker: 'Period',
    heading: 'Romantic &amp; Regency.',
    deck: 'Goethe and Coleridge turn desire, isolation, guilt and the supernatural into Romantic experiments. Austen makes courtship answer to money, inheritance and self-knowledge; Shelley gives scientific ambition a voice, a body and the power to accuse its creator.'
  },
  'victorian/index.html': {
    title: 'Victorian Literature | Astor Library',
    description: 'Victorian editions by Dickens, Brontë, Hardy, Stevenson, Stoker, Wilde, Wells and Conan Doyle, including Jane Eyre and Christmas writing, with notes and context.',
    kicker: 'Period',
    heading: 'Victorian.',
    deck: 'Dickens and Bront&euml; join Hardy, Stevenson, Stoker, Wilde, Wells and Conan Doyle in a collection moving between Christmas rooms, city streets, country houses, moors, laboratories and consulting rooms. Each edition places the work beside its publication and social history.'
  },
  'modern/index.html': {
    title: 'Modern Classic Literature | Astor Library',
    description: 'Astor editions of Virginia Woolf, G. K. Chesterton and George Orwell, with material on modernism, London, consciousness, political language, conspiracy and revolution.',
    kicker: 'Period',
    heading: 'Modern.',
    deck: 'Woolf turns one June day in London into an intricate movement through memory and consciousness. Chesterton makes political conspiracy a strange metropolitan chase; Orwell follows a revolution whose language changes as thoroughly as its promises.'
  }
};

const counterpartDetails = {
  '/books/hamlet/': { title: 'Hamlet', image: '/Hamlet.png' },
  '/books/king-lear/': { title: 'King Lear', image: '/King%20Lear.png' },
  '/books/a-midsummer-nights-dream/': { title: 'A Midsummer Night’s Dream', image: '/4A5A73B5-A856-4507-94DD-FC862EC2F9A7.png' },
  '/books/othello/': { title: 'Othello', image: '/Othello.png' },
  '/books/macbeth/': { title: 'Macbeth', image: '/FB3AE04E-B2F3-4AB6-96D5-49BF6CF4C298.png' }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function assetPath(file) {
  return '/' + encodeURIComponent(file).replace(/'/g, '%27');
}

function firstSentence(value) {
  return String(value).match(/^.*?[.!?](?:\s|$)/)?.[0].trim() || String(value);
}

function paragraphs(values) {
  return values.map(value => '<p>' + escapeHtml(value) + '</p>').join('');
}

function supportingFigure(image) {
  return `<figure class="book-document-figure"><img src="${escapeHtml(image.src)}" width="${Number(image.width)}" height="${Number(image.height)}" alt="${escapeHtml(image.alt)}" loading="lazy" decoding="async"><figcaption><span>${escapeHtml(image.caption)}</span><small>${escapeHtml(image.credit)} · <a href="${escapeHtml(image.sourceUrl)}">Source and image record</a> · ${escapeHtml(image.license)}</small></figcaption></figure>`;
}

function enrichedBookSections(book, enrichment) {
  const work = sectionOverride('work', book.slug);
  const movements = enrichment.movements.map((item, index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(item.title)}</h3>${paragraphs(item.body)}</article>`).join('');
  const closeReadings = enrichment.closeReadings.map(item => `<article><p class="book-reading-phrase">“${escapeHtml(item.phrase)}”</p><h3>${escapeHtml(item.title)}</h3>${paragraphs(item.body)}</article>`).join('');
  const contexts = enrichment.contexts.map(item => `<article><p class="year">${escapeHtml(item.label)}</p><h3>${escapeHtml(item.title)}</h3>${paragraphs(item.body)}</article>`).join('');
  const chronology = enrichment.chronology.map(item => `<article><time>${escapeHtml(item.date)}</time><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></div></article>`).join('');

  return `<section class="book-editorial-opening" id="work">
    <div><p class="kicker">Reader’s guide</p><h2>${work.heading}</h2>${work.note ? '<p class="book-editorial-note">' + work.note + '</p>' : ''}</div>
    <div class="book-editorial-lead"><h3 class="book-editorial-thesis">${escapeHtml(enrichment.heading)}</h3>${paragraphs(enrichment.introduction)}</div>
  </section>
  <section class="section-title book-section-heading" id="structure"><p class="kicker">How the work moves</p><h2>${escapeHtml(enrichment.movementHeading)}</h2><p>${escapeHtml(enrichment.movementDeck)}</p></section>
  <section class="book-movement-grid">${movements}</section>
  <section class="section-title book-section-heading" id="archive"><p class="kicker">From the archive</p><h2>${escapeHtml(enrichment.archiveHeading)}</h2><p>${escapeHtml(enrichment.archiveDeck)}</p></section>
  <section class="book-document-gallery">${enrichment.gallery.map(supportingFigure).join('')}</section>
  <section class="section-title book-section-heading" id="close-reading"><p class="kicker">Close reading</p><h2>${escapeHtml(enrichment.closeReadingHeading)}</h2><p>${escapeHtml(enrichment.closeReadingDeck)}</p></section>
  <section class="book-close-reading-grid">${closeReadings}</section>
  <section class="section-title book-section-heading" id="history"><p class="kicker">History and context</p><h2>${escapeHtml(enrichment.contextHeading)}</h2><p>${escapeHtml(enrichment.contextDeck)}</p></section>
  <section class="book-context-essays">${contexts}</section>
  <section class="book-chronology" aria-label="${escapeHtml(book.title)} chronology">${chronology}</section>`;
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
  const links = ['<a class="button primary" href="' + escapeHtml(book.purchaseUrl) + '">Buy / view Astor edition</a>'];
  if (includeCollection) links.push('<a class="button secondary" href="' + escapeHtml(book.collectionHref) + '">Browse ' + escapeHtml(book.collection) + '</a>');
  if (book.range === 'apocrypha') links.push('<a class="button secondary" href="/shakespeare/apocrypha/">The complete Apocrypha</a>');
  if (book.range === 'expanded') links.push('<a class="button secondary" href="/shakespeare/expanded-scholarly-editions/">Expanded Scholarly Editions</a>');
  return '<div class="button-row">' + links.join('') + '</div>';
}

function editionChoice(book) {
  if (!book.counterpart) return '';
  const standard = counterpartDetails[book.counterpart];
  const expandedHref = '/books/' + book.slug + '/';
  return `<section class="edition-choice-band" aria-labelledby="edition-choice-title">
    <div class="section-title"><p class="kicker">Choose an edition</p><h2 id="edition-choice-title">Standard or expanded scholarship.</h2><p>The standard Astor edition remains available. The Expanded Scholarly Edition adds substantially more textual history, criticism, contextual material, close analysis and performance history.</p></div>
    <div class="edition-choice-grid">
      <a href="${escapeHtml(book.counterpart)}"><img src="${standard.image}" alt="Astor Library ${escapeHtml(standard.title)} standard edition cover" loading="lazy"><span><b>Standard Astor edition</b><strong><em>${escapeHtml(standard.title)}</em></strong><small>Complete text with reading support</small></span></a>
      <a href="${expandedHref}" aria-current="page"><img src="${assetPath(book.image)}" alt="Astor Library ${escapeHtml(book.shortTitle)} Expanded Scholarly Edition cover" loading="lazy"><span><b>Expanded Scholarly Edition</b><strong><em>${escapeHtml(book.shortTitle)}</em></strong><small>Extended criticism, textual and performance history</small></span></a>
    </div>
  </section>`;
}

function bookPage(book) {
  const enrichment = bookEnrichments[book.slug];
  const facts = book.facts.map(fact => '<div class="fact"><b>' + escapeHtml(fact.label) + '</b><span>' + escapeHtml(fact.text) + '</span></div>').join('');
  const includes = book.editionIncludes.map(item => '<li>' + escapeHtml(item) + '</li>').join('');
  const openingOne = book.overview.slice(0, 2);
  const openingTwo = book.overview.slice(2);
  if (openingTwo.length < 2) openingTwo.push(book.editorial[0]);
  const readings = [
    { label: 'The work', title: 'Story, argument and structure.', copy: openingOne },
    { label: 'Reading the work', title: 'What the complete text brings into view.', copy: openingTwo }
  ].map(item => '<article class="prod-card prose-card"><p class="year">' + item.label + '</p><h3>' + item.title + '</h3>' + paragraphs(item.copy) + '</article>').join('');
  const contexts = [
    { label: 'Text', title: 'Editorial method', body: book.editorial[0] },
    { label: 'Supporting material', title: 'Context and interpretation', body: book.editorial[1] },
    { label: book.range ? 'Specialist range' : 'Astor edition', title: book.label, body: book.range === 'apocrypha' ? 'One of eight numbered specialist editions gathered in the Shakespeare Apocrypha collection.' : book.range === 'expanded' ? 'A premium scholarly range presented alongside, not in place of, the standard Astor Shakespeare editions.' : 'A main Astor edition placed in the catalogue’s ' + book.collection + ' collection.' }
  ].map(item => '<article><span>' + escapeHtml(item.label) + '</span><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.body) + '</p></article>').join('');
  const topics = book.topics.map((topic, index) => '<article><span>' + String(index + 1).padStart(2, '0') + '</span><h3>' + escapeHtml(topic.title) + '</h3><p>' + escapeHtml(topic.body) + '</p></article>').join('');
  const rangeCrumb = book.range === 'apocrypha'
    ? '<span aria-hidden="true">/</span><a href="/shakespeare/apocrypha/">Shakespeare Apocrypha</a>'
    : book.range === 'expanded'
      ? '<span aria-hidden="true">/</span><a href="/shakespeare/expanded-scholarly-editions/">Expanded Scholarly Editions</a>'
      : '';
  const editionLevel = book.range === 'expanded'
    ? 'Premium Astor scholarly edition'
    : book.range === 'apocrypha'
      ? 'Specialist Astor annotated edition'
      : 'Main Astor edition';
  const pageContents = enrichment
    ? '<a href="#edition">Edition</a><a href="#work">Reader’s guide</a><a href="#structure">Structure</a><a href="#archive">Archive</a><a href="#close-reading">Close reading</a><a href="#history">History</a><a href="#editorial">Edition method</a><a href="#reading">Questions</a><a href="#sources">Sources</a>'
    : '<a href="#edition">Edition contents</a><a href="#work">About the work</a><a href="#editorial">Text and context</a><a href="#reading">Reading routes</a>';
  const workSections = enrichment
    ? enrichedBookSections(book, enrichment)
    : `${sectionTitleBlock('work', 'About the work', book.slug)}
  <section class="astor-reading-grid astor-reading-grid-two">${readings}</section>`;
  const sources = enrichment
    ? `<section class="section-title book-section-heading" id="sources"><p class="kicker">Sources and further reading</p><h2>${escapeHtml(enrichment.sourcesHeading)}</h2><p>${escapeHtml(enrichment.sourcesDeck)}</p></section><nav class="book-source-grid" aria-label="Sources used for ${escapeHtml(book.title)}">${enrichment.sources.map(source => `<a href="${escapeHtml(source.url)}"><strong>${escapeHtml(source.label)}</strong><span>${escapeHtml(source.note)}</span></a>`).join('')}</nav>`
    : '';
  const choiceSection = editionChoice(book);
  const afterQuestions = enrichment ? [sources, choiceSection].filter(Boolean).join('\n') : choiceSection;

  return `<!doctype html>
<html lang="en-GB">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(book.title)} | Astor Library</title><meta name="description" content="${escapeHtml(firstSentence(book.deck))}"><link rel="stylesheet" href="/assets/styles.css"></head>
<body>${header()}
<main id="main-content" class="page-wrap astor-book-record">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/library/">All books</a><span aria-hidden="true">/</span><a href="${escapeHtml(book.collectionHref)}">${escapeHtml(book.collection)}</a>${rangeCrumb}<span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(book.shortTitle || book.title)}</span></nav>
  <section class="page-intro astor-book-hero"><div><p class="kicker">${escapeHtml(book.author)}</p><h1>${escapeHtml(book.title)}</h1><p class="deck">${escapeHtml(book.deck)}</p></div><aside class="source-note astor-book-cover"><img src="${assetPath(book.image)}" alt="Astor Library ${escapeHtml(book.title)} cover"><div><p><strong>${escapeHtml(book.label)}</strong><br>${editionLevel}</p>${actionButtons(book, false)}</div></aside></section>
  <nav class="page-contents" aria-label="On this page"><strong>On this page</strong><div>${pageContents}${book.counterpart ? '<a href="#edition-choice-title">Choose an edition</a>' : ''}</div></nav>
  <section class="quick-facts" aria-label="${escapeHtml(book.title)} facts">${facts}</section>
  <section class="section-title" id="edition"><p class="kicker">Edition contents</p><h2>What this Astor edition contains.</h2><p>These features belong to the main edition represented by the cover and purchase link on this page.</p></section>
  <section class="timeline"><article class="edition-card new-edition"><img src="${assetPath(book.image)}" alt="Astor Library ${escapeHtml(book.title)} cover" loading="lazy"><div><p class="year">${escapeHtml(book.label)}</p><h2><em>${escapeHtml(book.shortTitle || book.title)}</em></h2><ul class="edition-includes">${includes}</ul>${actionButtons(book, true)}</div></article></section>
  ${workSections}
  ${sectionTitleBlock('editorial', 'Text and context', book.slug)}
  <section class="astor-context-grid">${contexts}</section>
  ${sectionTitleBlock('reading', 'Reading routes', book.slug)}
  <section class="astor-question-grid">${topics}</section>
${afterQuestions}
  <nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a><a href="${escapeHtml(book.collectionHref)}">More in ${escapeHtml(book.collection)}</a>${book.range === 'apocrypha' ? '<a href="/shakespeare/apocrypha/">All eight Apocrypha volumes</a>' : ''}${book.range === 'expanded' ? '<a href="/shakespeare/expanded-scholarly-editions/">All Expanded Scholarly Editions</a>' : ''}<a href="/explore/">Search the library <span aria-hidden="true">&rarr;</span></a></nav>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Complete classic texts, study editions and free literature resources.</p></div><div class="footer-links"><a href="${escapeHtml(book.collectionHref)}">${escapeHtml(book.collection)}</a><a href="/library/">All books</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></div></footer>
</body></html>`;
}

function catalogueCard(book) {
  const range = book.range === 'apocrypha' ? 'Shakespeare Apocrypha · Volume ' + book.volume : book.label;
  return '<article class="edition-card"><img src="' + assetPath(book.image) + '" alt="Astor Library ' + escapeHtml(book.title) + ' cover"><div><p class="year">' + escapeHtml(range) + '</p><h2><em>' + escapeHtml(book.shortTitle || book.title) + '</em></h2><p>' + escapeHtml(book.deck) + '</p><div class="button-row"><a class="button primary" href="/books/' + escapeHtml(book.slug) + '/">Open page</a><a class="button secondary" href="' + escapeHtml(book.purchaseUrl) + '">Buy / view edition</a></div></div></article>';
}

function shakespeareRoutes(active) {
  const routes = [
    {
      id: 'standard',
      href: '/shakespeare/',
      eyebrow: 'Main Shakespeare shelf',
      title: 'Standard editions',
      copy: 'All thirty-seven plays and the poetry in the regular Astor series.'
    },
    {
      id: 'scholarly',
      href: '/shakespeare/expanded-scholarly-editions/',
      eyebrow: 'The Astor Shakespeare',
      title: 'Scholarly editions',
      copy: 'Five plays with extended textual, critical and performance material.'
    },
    {
      id: 'apocrypha',
      href: '/shakespeare/apocrypha/',
      eyebrow: 'Associated plays',
      title: 'Shakespeare Apocrypha',
      copy: 'Eight numbered editions from the disputed and collaborative canon.'
    }
  ];

  return '<nav class="shakespeare-collection-routes" aria-label="Shakespeare collections">' + routes.map(route =>
    '<a class="shakespeare-collection-route route-' + route.id + (active === route.id ? ' is-current' : '') + '" href="' + route.href + '"' + (active === route.id ? ' aria-current="page"' : '') + '><span>' + route.eyebrow + '</span><strong>' + route.title + '</strong><small>' + route.copy + '</small></a>'
  ).join('') + '</nav>';
}

function updateCollection(relative, additions) {
  const file = path.join(root, relative);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(new RegExp('\\s*' + blockStart + '[\\s\\S]*?' + blockEnd + '\\s*', 'g'), '\n');
  html = html.replace(new RegExp('\\s*' + routesStart + '[\\s\\S]*?' + routesEnd + '\\s*', 'g'), '\n');
  const copy = collectionCopy[relative];
  if (copy) {
    html = html
      .replace(/<title>[\s\S]*?<\/title>/, '<title>' + copy.title + '</title>')
      .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + copy.description + '">')
      .replace(/<section class="page-intro">[\s\S]*?<\/section>/, '<section class="page-intro"><div><p class="kicker">' + copy.kicker + '</p><h1>' + copy.heading + '</h1><p class="deck">' + copy.deck + '</p></div></section>');
  }
  let body = '';
  if (relative === 'shakespeare/index.html') {
    const standard = additions.filter(book => !book.range);
    const standardCount = (html.match(/<article class="edition-card">/g) || []).length + standard.length;
    body = '<div class="section-title shakespeare-standard-divider"><p class="kicker">More standard editions</p><h2>Shakespeare&rsquo;s poems.</h2><p>The poems remain part of the standard shelf, beside the complete dramatic works.</p></div>' + standard.map(catalogueCard).join('\n');
    html = html
      .replace(/<main(?: id="main-content")? class="page-wrap(?: [^"]*)?">/, '<main id="main-content" class="page-wrap shakespeare-collection-page shakespeare-standard-page">')
      .replace(/<strong>\d+(?: standard)? editions<\/strong><span>[^<]*<\/span>/, '<strong>' + standardCount + ' standard editions</strong><span>all 37 plays + poetry</span>');
    const routeBlock = routesStart + '\n' + shakespeareRoutes('standard') + '\n' + routesEnd;
    const introStart = html.indexOf('<section class="page-intro">');
    const introClose = introStart === -1 ? -1 : html.indexOf('</section>', introStart);
    if (introStart === -1 || introClose === -1) throw new Error('Could not place Shakespeare collection routes');
    html = html.slice(0, introClose + '</section>'.length) + '\n' + routeBlock + html.slice(introClose + '</section>'.length);
  } else {
    // New records belong to the collection itself. Keep the generator markers
    // for repeatable rebuilds, but do not split otherwise equal editions into a
    // temporary "recently added" tier in the reader-facing shelf.
    body = additions.map(catalogueCard).join('\n');
  }
  const block = blockStart + '\n' + body + '\n' + blockEnd + '\n';
  const mainClose = html.lastIndexOf('</main>');
  const timelineClose = html.lastIndexOf('</section>', mainClose);
  if (mainClose === -1 || timelineClose === -1) throw new Error('Could not find the collection shelf in ' + relative);
  html = html.slice(0, timelineClose).replace(/\s*$/, '\n') + block + html.slice(timelineClose);
  if (relative === 'shakespeare/index.html') html = html.replace(/\n(?:[ \t]*\n){2,}/g, '\n\n');
  fs.writeFileSync(file, html);
}

function specialistCard(book) {
  const standard = book.counterpart ? counterpartDetails[book.counterpart] : null;
  const image = '<img src="' + assetPath(book.image) + '" alt="Astor Library ' + escapeHtml(book.title) + ' cover" loading="lazy">';
  const covers = standard
    ? '<div class="specialist-paired-covers"><img src="' + standard.image + '" alt="' + escapeHtml(standard.title) + ' standard edition cover" loading="lazy">' + image + '</div>'
    : image;
  return '<article class="specialist-volume-card">' + covers + '<div><p class="year">' + escapeHtml(book.range === 'apocrypha' ? 'Volume ' + book.volume : 'Expanded Scholarly Edition') + '</p><h2><em>' + escapeHtml(book.shortTitle || book.title) + '</em></h2><p>' + escapeHtml(book.deck) + '</p><div class="button-row"><a class="button primary" href="/books/' + book.slug + '/">Open the edition page</a><a class="button secondary" href="' + escapeHtml(book.purchaseUrl) + '">Buy / view</a>' + (standard ? '<a class="button secondary" href="' + book.counterpart + '">Standard edition</a>' : '') + '</div></div></article>';
}

function collectionPage(range) {
  const rangeBooks = books.filter(book => book.range === range);
  const apocrypha = range === 'apocrypha';
  const title = apocrypha ? 'Shakespeare Apocrypha' : 'The Astor Shakespeare: Scholarly Editions';
  const description = apocrypha
    ? 'Eight specialist annotated editions of plays historically attributed to, associated with or connected to Shakespeare and his theatrical world, arranged in numerical order.'
    : 'Five Shakespeare editions with substantially expanded front matter, textual discussion, criticism, historical context, close analysis and performance history.';
  const coverStack = rangeBooks.slice(0, 4).map(book => '<img src="' + assetPath(book.image) + '" alt="" loading="lazy">').join('');
  const activeRoute = apocrypha ? 'apocrypha' : 'scholarly';
  const pageModifier = apocrypha ? 'shakespeare-apocrypha-page' : 'shakespeare-scholarly-page';
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} | Astor Library</title><meta name="description" content="${escapeHtml(description)}"><link rel="stylesheet" href="/assets/styles.css"></head><body>${header()}
  <main id="main-content" class="page-wrap shakespeare-collection-page specialist-collection-page ${pageModifier}"><nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/shakespeare/">Shakespeare</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(title)}</span></nav>
  ${shakespeareRoutes(activeRoute)}
  <section class="specialist-collection-hero"><div><p class="kicker">${apocrypha ? 'Volumes I–VIII' : 'The Astor Shakespeare'}</p><h1>${escapeHtml(title)}</h1><p class="deck">${escapeHtml(description)}</p><div class="button-row"><a class="button primary" href="#complete-range">Browse the complete range</a><a class="button secondary" href="/shakespeare/">Standard Shakespeare editions</a></div></div><div class="specialist-cover-stack" aria-hidden="true">${coverStack}</div></section>
  <section class="specialist-collection-note"><p><strong>${rangeBooks.length} complete editions.</strong> ${apocrypha ? 'The volume order is preserved across the collection.' : 'Every standard counterpart remains available and is linked from the matching expanded edition.'}</p></section>
  <section class="section-title" id="complete-range"><p class="kicker">Complete collection</p><h2>${apocrypha ? 'Eight volumes in numerical order.' : 'Five scholarly editions.'}</h2><p>${apocrypha ? 'Every volume has its own book page and remains searchable in the complete Astor catalogue.' : 'Use the standard-edition links to compare the two levels of reading support.'}</p></section>
  <section class="specialist-volume-grid">${rangeBooks.map(specialistCard).join('\n')}</section>
  <nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a><a href="/shakespeare/">Standard Shakespeare editions</a><a href="/library/">All books</a><a href="/explore/">Search Astor Library <span aria-hidden="true">&rarr;</span></a></nav></main>
  <footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Complete classic texts, study editions and free literature resources.</p></div><div class="footer-links"><a href="/shakespeare/">Shakespeare</a><a href="/library/">All books</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a></div></footer></body></html>`;
}

function addChoiceToStandard(book) {
  const standard = counterpartDetails[book.counterpart];
  const file = path.join(root, book.counterpart.replace(/^\//, ''), 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(new RegExp(choiceStart + '[\\s\\S]*?' + choiceEnd, 'g'), '');
  const block = `${choiceStart}<section class="edition-choice-band" aria-labelledby="expanded-choice-${book.slug}"><div class="section-title"><p class="kicker">Choose an edition</p><h2 id="expanded-choice-${book.slug}">Standard or expanded scholarship.</h2><p>This standard Astor edition remains available. The Expanded Scholarly Edition adds substantially more textual history, criticism, context, close analysis and performance history.</p></div><div class="edition-choice-grid"><a href="${book.counterpart}" aria-current="page"><img src="${standard.image}" alt="Astor Library ${escapeHtml(standard.title)} standard edition cover" loading="lazy"><span><b>Standard Astor edition</b><strong><em>${escapeHtml(standard.title)}</em></strong><small>Complete text with reading support</small></span></a><a href="/books/${book.slug}/"><img src="${assetPath(book.image)}" alt="Astor Library ${escapeHtml(book.shortTitle)} Expanded Scholarly Edition cover" loading="lazy"><span><b>Expanded Scholarly Edition</b><strong><em>${escapeHtml(book.shortTitle)}</em></strong><small>Extended criticism, textual and performance history</small></span></a></div></section>${choiceEnd}`;
  const endNav = html.indexOf('<nav class="book-end-nav"');
  const mainClose = html.lastIndexOf('</main>');
  const insertion = endNav !== -1 ? endNav : mainClose;
  if (insertion === -1) throw new Error('Could not add edition choice to ' + book.counterpart);
  html = html.slice(0, insertion) + block + html.slice(insertion);
  fs.writeFileSync(file, html);
}

for (const book of books) {
  if (!fs.existsSync(path.join(root, book.image))) throw new Error('Missing cover for ' + book.title + ': ' + book.image);
  const directory = path.join(root, 'books', book.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), bookPage(book));
}

for (const relative of collectionFiles) {
  const file = path.join(root, relative);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(new RegExp(blockStart + '[\\s\\S]*?' + blockEnd, 'g'), '');
  fs.writeFileSync(file, html);
}

const byCollection = new Map();
for (const book of books) {
  if (!byCollection.has(book.collectionFile)) byCollection.set(book.collectionFile, []);
  byCollection.get(book.collectionFile).push(book);
}
for (const [relative, additions] of byCollection) updateCollection(relative, additions);

const apocryphaDirectory = path.join(root, 'shakespeare', 'apocrypha');
const expandedDirectory = path.join(root, 'shakespeare', 'expanded-scholarly-editions');
fs.mkdirSync(apocryphaDirectory, { recursive: true });
fs.mkdirSync(expandedDirectory, { recursive: true });
fs.writeFileSync(path.join(apocryphaDirectory, 'index.html'), collectionPage('apocrypha'));
fs.writeFileSync(path.join(expandedDirectory, 'index.html'), collectionPage('expanded'));

for (const book of books.filter(book => book.counterpart)) addChoiceToStandard(book);

console.log('Built ' + books.length + ' new main-edition pages, two Shakespeare collections and five edition comparisons.');

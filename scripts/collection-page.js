// Builds the published layout of the eight collection pages.
//
// The source page for a collection is a plain record: an introduction and one
// shelf card per book, which the catalogue and discovery builders read and
// which the edition generators append to. This module turns that record into
// the reader-facing page: a heading with real covers and checked facts, a row
// of links to the other collections, the books in order of first publication
// (or, for Shakespeare, by kind of play), and the free guides, close readings
// and study editions that belong to those books.

const path = require('path');
const { collections, editionDates } = require('./collection-data');

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberWord(value) {
  if (value < 20) return ONES[value];
  if (value < 100) return TENS[Math.floor(value / 10)] + (value % 10 ? '-' + ONES[value % 10] : '');
  return String(value);
}

function capitalise(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sortTitle(title) {
  return title.replace(/^(?:the|a|an)\s+/i, '').toLowerCase();
}

function parseYear(label) {
  const match = label.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? Number(match[1]) : null;
}

function formatYear(year) {
  return year < 0 ? Math.abs(year) + ' BC' : String(year);
}

module.exports = function createCollectionPages({ discovery, escapeHtml, plainText, pageHref }) {
  const books = discovery.books || [];
  const resources = discovery.resources || [];
  const passages = discovery.passages || [];
  const studyEditions = discovery.studyEditions || [];

  function collectionFor(source) {
    const href = pageHref(source);
    return collections.find(collection => collection.href === href) || null;
  }

  function resolveHref(value, source) {
    if (value.startsWith('/')) return value;
    const resolved = path.posix.resolve(path.posix.dirname(pageHref(source)), value);
    // path.posix.resolve drops a trailing slash, which every book route carries.
    return value.endsWith('/') && !resolved.endsWith('/') ? resolved + '/' : resolved;
  }

  function parseCard(inner, source) {
    const image = inner.match(/<img\b[^>]*\bsrc="([^"]+)"[^>]*\balt="([^"]*)"/i);
    const label = inner.match(/<p class="year">([\s\S]*?)<\/p>/i)?.[1] || '';
    const heading = inner.match(/<h2>([\s\S]*?)<\/h2>/i)?.[1] || '';
    const body = inner.match(/<\/h2>([\s\S]*?)<div class="button-row">/i)?.[1] || '';
    const buttons = Array.from(inner.matchAll(/<a class="button (primary|secondary)" href="([^"]+)">([\s\S]*?)<\/a>/gi));
    const primary = buttons.find(button => button[1] === 'primary');
    if (!image || !primary) throw new Error('Could not read a collection shelf card in ' + source);
    const href = resolveHref(primary[2], source);
    const book = books.find(item => item.href === href) || null;
    const title = book ? '<em>' + escapeHtml(book.title) + '</em>' : heading.replace(/<\/em>,[\s\S]*$/i, '</em>');
    return {
      href,
      book,
      image: resolveHref(image[1], source),
      label: label.trim(),
      title,
      titleText: plainText(title),
      body: body.trim(),
      purchases: buttons.filter(button => button[1] === 'secondary').map(button => ({
        href: button[2],
        text: /buy\s*\/\s*view edition/i.test(plainText(button[3])) ? 'Buy the edition' : plainText(button[3])
      }))
    };
  }

  function authorLink(book, route) {
    if (!book) return '';
    if (route.href === '/shakespeare/' && book.author === 'William Shakespeare') return '';
    const href = book.authorHref && book.authorHref !== route.href ? book.authorHref : '';
    const name = escapeHtml(book.author);
    return '<p class="collection-card-author">' + (href ? '<a href="' + escapeHtml(href) + '">' + name + '</a>' : name) + '</p>';
  }

  function renderCard(card, route) {
    const purchases = card.purchases.map(purchase => {
      const external = /^https?:\/\//i.test(purchase.href);
      return '<a class="button secondary" href="' + escapeHtml(purchase.href) + '"' + (external ? ' rel="noopener"' : '') + '>' + escapeHtml(purchase.text) + '</a>';
    }).join('');
    return '<article class="edition-card collection-card">' +
      '<a class="collection-card-cover" href="' + escapeHtml(card.href) + '" tabindex="-1" aria-hidden="true">' +
      '<img src="' + escapeHtml(card.image) + '" alt="" width="240" height="360" loading="lazy"></a>' +
      '<div class="collection-card-body">' +
      (card.label ? '<p class="year">' + card.label + '</p>' : '') +
      '<h2><a href="' + escapeHtml(card.href) + '">' + card.title + '</a></h2>' +
      authorLink(card.book, route) +
      '<div class="collection-card-copy">' + card.body + '</div>' +
      '<div class="button-row"><a class="button primary" href="' + escapeHtml(card.href) + '">About the book</a>' + purchases + '</div>' +
      '</div></article>';
  }

  function orderCards(cards, route) {
    const dated = cards.map(card => {
      const override = editionDates[card.href];
      const year = override?.year ?? parseYear(plainText(card.label)) ?? 9999;
      return Object.assign({}, card, { year, label: override?.label ? escapeHtml(override.label) : card.label });
    });
    if (!route.groups) {
      return { groups: [{ id: 'collection-books-list', title: '', cards: dated.slice().sort((a, b) => a.year - b.year) }], dated };
    }
    const grouped = route.groups.map(group => ({ id: group.id, title: group.title, cards: [] }));
    const matchOrder = route.groupOrder || route.groups.map(group => group.id);
    for (const card of dated) {
      const label = plainText(card.label);
      const groupId = matchOrder.find(id => route.groups.find(group => group.id === id).match.test(label));
      if (!groupId) throw new Error('No Shakespeare group matches the shelf label "' + label + '" for ' + card.href);
      grouped.find(group => group.id === groupId).cards.push(card);
    }
    for (const group of grouped) group.cards.sort((a, b) => sortTitle(a.titleText).localeCompare(sortTitle(b.titleText), 'en'));
    return { groups: grouped.filter(group => group.cards.length), dated };
  }

  function relatedTo(items, hrefs) {
    const position = href => hrefs.indexOf(href);
    return items
      .filter(item => item.relatedBooks?.some(href => hrefs.includes(href)))
      .map(item => ({ item, index: Math.min(...item.relatedBooks.filter(href => hrefs.includes(href)).map(position)) }))
      .sort((a, b) => a.index - b.index)
      .map(entry => entry.item);
  }

  function linkList(items, describe) {
    return items.slice(0, 5).map(item => {
      const external = /^https?:\/\//i.test(item.href);
      return '<li><a href="' + escapeHtml(item.href) + '"' + (external ? ' rel="noopener"' : '') + '>' + escapeHtml(item.title) + '</a>' +
        (describe(item) ? '<span>' + escapeHtml(describe(item)) + '</span>' : '') + '</li>';
    }).join('');
  }

  function supportShelf(route, hrefs) {
    const bookTitle = item => books.find(book => item.relatedBooks?.includes(book.href))?.title || '';
    const columns = [];
    const guides = relatedTo(resources, hrefs);
    const readings = relatedTo(passages, hrefs);
    const studies = relatedTo(studyEditions, hrefs);
    if (guides.length) {
      columns.push('<div><h3>Free guides</h3><ul>' + linkList(guides, bookTitle) + '</ul>' +
        '<a class="collection-support-more" href="/resources/">All ' + guides.length + ' guide' + (guides.length === 1 ? '' : 's') + ' for this collection, and every other free resource <span aria-hidden="true">&rarr;</span></a></div>');
    }
    if (readings.length) {
      columns.push('<div><h3>Close readings</h3><ul>' + linkList(readings, bookTitle) + '</ul>' +
        '<a class="collection-support-more" href="/passage-room/">All ' + readings.length + ' passage' + (readings.length === 1 ? '' : 's') + ' from this collection in the Passage Room <span aria-hidden="true">&rarr;</span></a></div>');
    }
    if (studies.length) {
      columns.push('<div><h3>Study editions</h3><ul>' + linkList(studies, item => item.paired ? 'Paired study edition' : 'Study edition') + '</ul>' +
        '<a class="collection-support-more" href="/study/">All ' + studies.length + ' study edition' + (studies.length === 1 ? '' : 's') + ' for this collection <span aria-hidden="true">&rarr;</span></a></div>');
    }
    if (!columns.length) return { html: '', guides: 0, readings: 0 };
    return {
      guides: guides.length,
      readings: readings.length,
      html: '<section class="collection-support" aria-labelledby="collection-support-title">' +
        '<header><p class="kicker">Read and study</p><h2 id="collection-support-title">Free guides, close readings and study editions for these books.</h2>' +
        '<p>Everything in the first two columns can be read on the site without buying anything.</p></header>' +
        '<div class="collection-support-columns">' + columns.join('') + '</div></section>'
    };
  }

  function writersLine(cards, route) {
    if (route.href === '/shakespeare/') return '';
    const seen = new Map();
    for (const card of cards) {
      if (!card.book || card.book.author === 'Astor Library' || seen.has(card.book.author)) continue;
      seen.set(card.book.author, card.book.authorHref || '');
    }
    if (seen.size < 2) return '';
    const links = Array.from(seen, ([author, href]) => href
      ? '<a href="' + escapeHtml(href) + '">' + escapeHtml(author) + '</a>'
      : '<span>' + escapeHtml(author) + '</span>').join('');
    return '<nav class="collection-writers" aria-label="Writers in this collection"><span>Writers</span>' + links + '</nav>';
  }

  function switcher(route) {
    return '<nav class="collection-switcher" aria-label="Astor collections">' +
      collections.map(item => '<a href="' + item.href + '"' + (item.href === route.href ? ' aria-current="page"' : '') + '>' + escapeHtml(item.shortName) + '</a>').join('') +
      '<a class="collection-switcher-all" href="/classic-literature/">All collections <span aria-hidden="true">&rarr;</span></a></nav>';
  }

  function render(html, source) {
    const route = collectionFor(source);
    if (!route) return html;
    const mainMatch = html.match(/<main\b([^>]*)>([\s\S]*?)<\/main>/i);
    if (!mainMatch) return html;
    const main = mainMatch[2];

    const intro = main.match(/<section class="page-intro">([\s\S]*?)<\/section>/i);
    if (!intro) throw new Error('The collection page ' + route.href + ' has no introduction');
    const heading = intro[1].match(/<h1>([\s\S]*?)<\/h1>/i)?.[1] || escapeHtml(route.name);
    const deck = intro[1].match(/<p class="deck">([\s\S]*?)<\/p>/i)?.[1] || '';
    const routesNav = main.match(/<nav class="shakespeare-collection-routes"[\s\S]*?<\/nav>/i)?.[0] || '';
    const poemNote = main.match(/<div class="section-title shakespeare-poem-divider">[\s\S]*?<\/h2><p>([\s\S]*?)<\/p>/i)?.[1] || '';

    const cards = Array.from(main.matchAll(/<article class="edition-card">([\s\S]*?)<\/article>/gi), match => parseCard(match[1], source));
    if (!cards.length) throw new Error('The collection page ' + route.href + ' has no shelf cards');

    // Everything in the source main must be accounted for; unknown content
    // fails the build instead of silently disappearing from the published page.
    const leftover = main
      .replace(intro[0], '')
      .replace(routesNav, '')
      .replace(/<article class="edition-card">[\s\S]*?<\/article>/gi, '')
      .replace(/<section class="shakespeare-reading-room"[\s\S]*?<\/section>/i, '')
      .replace(/<div class="section-title shakespeare-[a-z-]+">[\s\S]*?<\/div>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<section class="timeline"[^>]*>|<\/section>/gi, '');
    if (plainText(leftover)) throw new Error('Unexpected content on the collection page ' + route.href + ': ' + plainText(leftover).slice(0, 120));

    const { groups, dated } = orderCards(cards, route);
    const ordered = groups.flatMap(group => group.cards);
    const hrefs = ordered.map(card => card.href);
    const years = dated.map(card => card.year).filter(year => year !== 9999);
    const span = route.span || (years.length ? formatYear(Math.min(...years)) + '–' + formatYear(Math.max(...years)) : '');
    const support = supportShelf(route, hrefs);
    const count = cards.length;

    const covers = route.featured.map(href => {
      const book = books.find(item => item.href === href);
      if (!book) throw new Error('The featured cover ' + href + ' is not in the catalogue for ' + route.href);
      return '<a href="' + escapeHtml(book.href) + '"><img src="' + escapeHtml(book.image) + '" alt="' + escapeHtml(book.title) + '" width="240" height="360"></a>';
    }).join('');

    const facts = [
      '<div><dt>Books</dt><dd>' + count + '</dd></div>',
      span ? '<div><dt>' + (route.href === '/shakespeare/' ? 'First printed' : 'First published') + '</dt><dd>' + escapeHtml(span) + '</dd></div>' : '',
      support.guides ? '<div><dt>Free guides</dt><dd>' + support.guides + '</dd></div>' : '',
      support.readings ? '<div><dt>Close readings</dt><dd>' + support.readings + '</dd></div>' : ''
    ].join('');

    const hero = '<nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/library/">All books</a><span aria-hidden="true">/</span><a href="/classic-literature/">Collections</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(route.name) + '</span></nav>' +
      '<section class="collection-hero" aria-labelledby="collection-title">' +
      '<div class="collection-hero-copy"><p class="kicker">Astor collection</p><h1 id="collection-title">' + heading + '</h1><p class="deck">' + deck + '</p>' +
      '<dl class="collection-facts">' + facts + '</dl>' +
      '<div class="button-row"><a class="button primary" href="#collection-books">Browse the books</a><a class="button secondary" href="/library/">Search all books</a></div></div>' +
      '<div class="collection-hero-covers">' + covers + '</div></section>';

    let shelfHeading;
    if (route.href === '/shakespeare/') {
      shelfHeading = capitalise(numberWord(count)) + ' editions, arranged by kind of play, with the poems last.';
    } else if (route.href === '/ancient-epic/') {
      shelfHeading = capitalise(numberWord(count)) + ' epics, from Homer to Virgil.';
    } else {
      shelfHeading = capitalise(numberWord(count)) + ' books, in order of first publication.';
    }

    const groupNav = groups.length > 1
      ? '<nav class="collection-group-nav" aria-label="Sections of this collection">' +
        groups.map(group => '<a href="#' + group.id + '">' + escapeHtml(group.title) + ' <span>' + group.cards.length + '</span></a>').join('') + '</nav>'
      : '';
    const shelfBody = groups.map(group => {
      const cardsHtml = group.cards.map(card => renderCard(card, route)).join('');
      if (groups.length === 1) return '<div class="collection-grid">' + cardsHtml + '</div>';
      const note = group.id === 'poems' && poemNote ? '<p>' + poemNote + '</p>' : '';
      return '<section class="collection-group" id="' + group.id + '" aria-labelledby="' + group.id + '-title">' +
        '<header><h3 id="' + group.id + '-title">' + escapeHtml(group.title) + '</h3><span>' + numberWord(group.cards.length) + ' edition' + (group.cards.length === 1 ? '' : 's') + '</span>' + note + '</header>' +
        '<div class="collection-grid">' + cardsHtml + '</div></section>';
    }).join('');

    const shelf = '<section class="collection-shelf" id="collection-books" aria-labelledby="collection-shelf-title">' +
      '<header class="collection-shelf-head"><div><p class="kicker">The books</p><h2 id="collection-shelf-title">' + shelfHeading + '</h2></div>' +
      '<p>Each title opens a reading page describing the edition, the book&rsquo;s publication history and its context, with links to sources and free material.</p></header>' +
      writersLine(ordered, route) + groupNav + shelfBody + '</section>';

    const endNav = '<nav class="book-end-nav" aria-label="End of page"><a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a><a href="/classic-literature/">All collections</a><a href="/library/">All books</a><a href="/explore/">Search the library <span aria-hidden="true">&rarr;</span></a></nav>';

    const mainAttributes = /\bclass="/.test(mainMatch[1])
      ? mainMatch[1].replace(/\bclass="([^"]*)"/, (match, classes) => 'class="' + (classes.split(/\s+/).includes('collection-page') ? classes : classes + ' collection-page') + '"')
      : mainMatch[1] + ' class="page-wrap collection-page"';
    const newMain = '<main' + mainAttributes + '>\n' + hero + '\n' + switcher(route) + '\n' + routesNav + '\n' + shelf + '\n' + support.html + '\n' + endNav + '\n</main>';

    let result = html.slice(0, mainMatch.index) + newMain + html.slice(mainMatch.index + mainMatch[0].length);
    if (!/href="\/assets\/collection\.css"/.test(result)) {
      result = result.replace('</head>', '<link rel="stylesheet" href="/assets/collection.css"></head>');
    }
    return result;
  }

  return { collectionFor, render };
};

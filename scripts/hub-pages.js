// Gives the writer, subject, passage and reading-list pages the same plain
// shape as the book and collection pages.
//
// These pages were built as showpieces: a coloured panel at the top with a
// fan of covers and two buttons, a row of boxed statistics, numbered cards,
// labels above every heading ("Reading method", "How the writing works") and
// a dark band of book cards. Their writing is kept. What changes is the
// setting: a plain title and introduction, plain section headings, the books
// as a list with their covers, and dates only where they are dates.

function plain(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function inner(block, tag, cls) {
  const pattern = cls
    ? new RegExp('<' + tag + '\\b[^>]*class="[^"]*\\b' + cls + '\\b[^"]*"[^>]*>([\\s\\S]*?)</' + tag + '>', 'i')
    : new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)</' + tag + '>', 'i');
  return (block.match(pattern) || [])[1] || '';
}

// The closing full stop of a heading goes, unless it follows an initial.
function headingText(text) {
  return String(text).replace(/<br\s*\/?>/g, ' ').replace(/\s+/g, ' ').trim().replace(/(?<!\b[A-Z])\.\s*$/, '');
}

function stripHeadingStops(html) {
  return html.replace(/<(h[1-3])(\b[^>]*)>([\s\S]*?)<\/\1>/g, (whole, tag, attributes, text) => '<' + tag + attributes + '>' + headingText(text) + '</' + tag + '>');
}

// Every label above a heading, and every pair of call-to-action buttons.
function stripLabels(html) {
  return html
    .replace(/<p class="kicker">[\s\S]*?<\/p>\s*/g, '')
    .replace(/<div class="button-row">[\s\S]*?<\/div>\s*/g, '');
}

function section(regex, html) {
  return (html.match(regex) || [''])[0];
}

// A row of boxed figures becomes a short list of dates. Figures that are not
// years ("15 novels", "2 collections represented") are left out.
function datesList(block, className) {
  const items = [...block.matchAll(/<div><b>([\s\S]*?)<\/b><span>([\s\S]*?)<\/span><\/div>/g)]
    .filter(match => /^\d{3,4}(?:[–-]\d{2,4})?$/.test(plain(match[1])))
    // "1843 · Year of birth" only repeats the dates beside the name.
    .filter(match => !/^year of (birth|death)$/i.test(plain(match[2])))
    .map(match => '<div><dt>' + plain(match[1]) + '</dt><dd>' + match[2].trim() + '</dd></div>');
  return items.length >= 2 ? '<dl class="hub-dates ' + className + '">' + items.join('') + '</dl>' : '';
}

function bookEntry({ href, image, alt, title, meta, copy, links }) {
  return '<article class="hub-book">' +
    '<a class="hub-book-cover" href="' + href + '" tabindex="-1" aria-hidden="true"><img src="' + image + '" alt="' + (alt || '') + '" loading="lazy" decoding="async"></a>' +
    '<div><h3><a href="' + href + '">' + title + '</a></h3>' +
    (meta ? '<p class="hub-book-meta">' + meta + '</p>' : '') +
    (copy ? '<p>' + copy + '</p>' : '') +
    (links ? '<p class="hub-book-links">' + links + '</p>' : '') +
    '</div></article>';
}

function imageOf(card) {
  const tag = (card.match(/<img\b[^>]*>/) || [''])[0];
  return {
    image: (tag.match(/\bsrc="([^"]*)"/) || [])[1] || '',
    alt: (tag.match(/\balt="([^"]*)"/) || [])[1] || ''
  };
}

// --- writer pages -----------------------------------------------------------------
function authorPage(html) {
  return html.replace(/(<main\b[^>]*class="[^"]*\bauthor-profile-page\b[^"]*"[^>]*>)([\s\S]*?)(<\/main>)/, (whole, open, body, close) => {
    // The opening: name and one line about the writer.
    body = body.replace(/<section class="author-profile-hero">[\s\S]*?<\/section>/, hero => {
      const title = headingText(inner(hero, 'h1'));
      const deck = inner(hero, 'p', 'deck');
      return '<section class="page-intro hub-intro"><h1>' + title + '</h1>' + (deck ? '<p class="deck">' + deck + '</p>' : '') + '</section>';
    });
    body = body.replace(/<section class="author-facts"[^>]*>[\s\S]*?<\/section>/, facts => datesList(facts, 'author-dates'));
    body = body.replace(/(<section class="author-method"[\s\S]*?<\/section>)/, method => method.replace(/<article>\s*<span>\d+<\/span>/g, '<article>'));
    // The shelf: a list of the books with their covers.
    body = body.replace(/<section class="author-shelf"([^>]*)>([\s\S]*?)<\/section>/, (shelf, attributes, content) => {
      const id = (content.match(/<h2 id="([^"]+)"/) || [])[1] || 'books-title';
      const count = plain((content.match(/<div class="author-shelf-head"><div>[\s\S]*?<\/div>\s*<p>([\s\S]*?)<\/p>/) || [])[1]);
      const cards = [...content.matchAll(/<article>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/article>/g)].map(match => {
        const card = match[2];
        return bookEntry({
          href: match[1],
          ...imageOf(card),
          title: inner(card, 'h3'),
          meta: plain(inner(card.replace(/<img\b[^>]*>/, ''), 'p')),
          copy: inner(card, 'span').replace(/<span aria-hidden="true">[\s\S]*$/, '')
        });
      });
      return '<section class="author-shelf hub-section"' + attributes + '><h2 id="' + id + '">Books</h2>' + (count ? '<p class="hub-lead">' + count + '</p>' : '') + '<div class="hub-books">' + cards.join('') + '</div></section>';
    });
    body = body.replace(/(<section class="author-sources"[\s\S]*?)<h2>[\s\S]*?<\/h2>/, '$1<h2>Sources</h2>');
    // Close readings: the quotation, the book and the note. Their running
    // numbers in the Passage Room mean nothing here.
    body = body.replace(/(<section class="book-passage-shelf[\s\S]*?<\/section>)/, shelf => shelf
      .replace(/<span>\d+\s*·\s*/g, '<span>')
      .replace(/<b>Read the annotated passage[\s\S]*?<\/b>/g, ''));
    body = stripHeadingStops(stripLabels(body));
    return open + body + close;
  });
}

// --- subject guides ---------------------------------------------------------------
function subjectPage(html) {
  return html.replace(/(<main\b[^>]*class="[^"]*\bsubject-guide-page\b[^"]*"[^>]*>)([\s\S]*?)(<\/main>)/, (whole, open, body, close) => {
    body = body.replace(/<section class="subject-guide-hero">[\s\S]*?<\/section>/, hero => {
      const title = headingText(inner(hero, 'h1'));
      const deck = inner(hero, 'p', 'deck');
      return '<section class="page-intro hub-intro subject-guide-hero"><h1>' + title + '</h1>' + (deck ? '<p class="deck">' + deck + '</p>' : '') + '</section>';
    });
    body = body.replace(/<section class="subject-facts"[^>]*>[\s\S]*?<\/section>/, facts => datesList(facts, 'subject-dates'));
    // The opening heading is a thesis or an instruction; the section is the
    // guide's introduction, and says so.
    body = body.replace(/(<section class="subject-opening">[\s\S]*?)<h2>[\s\S]*?<\/h2>/, '$1<h2>Introduction</h2>');
    body = body.replace(/<section class="subject-method"([^>]*)>([\s\S]*?)<\/section>/, (method, attributes, content) => {
      const id = (content.match(/<h2 id="([^"]+)"/) || [])[1] || 'subject-method-title';
      const points = [...content.matchAll(/<article><span>\d+\s*·\s*([\s\S]*?)<\/span><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/article>/g)]
        .map(match => '<article><h3>' + match[1] + '</h3><p>' + headingText(match[2]) + '. ' + match[3] + '</p></article>');
      return '<section class="subject-method hub-section"' + attributes + '><h2 id="' + id + '">What to look for</h2><div class="subject-method-grid hub-points">' + points.join('') + '</div></section>';
    });
    body = body.replace(/<section class="subject-shelf"([^>]*)>([\s\S]*?)<\/section>/, (shelf, attributes, content) => {
      const id = (content.match(/<h2 id="([^"]+)"/) || [])[1] || 'subject-books-title';
      const cards = [...content.matchAll(/<article class="subject-book"><a href="([^"]+)">([\s\S]*?)<\/a><\/article>/g)].map(match => {
        const card = match[2];
        const year = plain(inner(card.replace(/<img\b[^>]*>/, ''), 'p'));
        const author = plain(inner(card, 'small'));
        return bookEntry({
          href: match[1],
          ...imageOf(card),
          title: inner(card, 'h3'),
          meta: [author, year].filter(Boolean).join(' · '),
          copy: inner(card, 'span').replace(/<span aria-hidden="true">[\s\S]*$/, '')
        });
      });
      return '<section class="subject-shelf hub-section"' + attributes + '><h2 id="' + id + '">The books</h2><div class="subject-book-grid hub-books">' + cards.join('') + '</div></section>';
    });
    body = body.replace(/<section class="subject-close-reading">([\s\S]*?)<\/section>/, (reading, content) => {
      const lead = headingText(inner(content, 'h2'));
      const paragraphs = [...content.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(match => match[1]);
      if (lead && paragraphs.length) paragraphs[0] = lead + '. ' + paragraphs[0];
      return '<section class="subject-close-reading hub-section"><h2>Reading closely</h2>' + paragraphs.map(text => '<p>' + text + '</p>').join('') + '</section>';
    });
    body = body.replace(/<section class="subject-terms"([^>]*)>([\s\S]*?)<\/section>/, (terms, attributes, content) => {
      const id = (content.match(/<h2 id="([^"]+)"/) || [])[1] || 'subject-terms-title';
      const items = [...content.matchAll(/<article><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/article>/g)].map(match => '<div><dt>' + match[1] + '</dt><dd>' + match[2] + '</dd></div>');
      return '<section class="subject-terms hub-section"' + attributes + '><h2 id="' + id + '">Terms</h2><dl class="hub-terms">' + items.join('') + '</dl></section>';
    });
    body = body.replace(/<section class="subject-resources">([\s\S]*?)<\/section>/, (resources, content) => {
      const links = [...content.matchAll(/<a href="([^"]+)"><b>([\s\S]*?)<\/b><span>([\s\S]*?)<\/span><\/a>/g)].map(match => '<li><a href="' + match[1] + '">' + match[2] + '</a> ' + match[3] + '</li>');
      return links.length ? '<section class="subject-resources hub-section"><h2>See also</h2><ul class="hub-links">' + links.join('') + '</ul></section>' : '';
    });
    body = body.replace(/<section class="subject-sources">([\s\S]*?)<\/section>/, (sources, content) => {
      const list = (content.match(/<nav class="source-list"[\s\S]*?<\/nav>/) || [''])[0];
      return '<section class="subject-sources hub-section"><h2>Sources</h2>' + list + '</section>';
    });
    body = stripHeadingStops(stripLabels(body));
    return open + body + close;
  });
}

// --- the two directories ------------------------------------------------------------
function coversOf(block, count) {
  return [...block.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].slice(0, count).map(match => '<img src="' + match[1] + '" alt="" loading="lazy" decoding="async">').join('');
}

function directoryEntry(href, covers, title, meta, copy) {
  return '<article class="hub-entry">' +
    '<a class="hub-entry-covers" href="' + href + '" tabindex="-1" aria-hidden="true">' + covers + '</a>' +
    '<div><h3><a href="' + href + '">' + title + '</a></h3>' +
    (meta ? '<p class="hub-book-meta">' + meta + '</p>' : '') +
    (copy ? '<p>' + copy + '</p>' : '') + '</div></article>';
}

function authorsIndex(html) {
  return html.replace(/(<main\b[^>]*class="[^"]*\bauthors-page\b[^"]*"[^>]*>)([\s\S]*?)(<\/main>)/, (whole, open, body, close) => {
    body = body.replace(/<section class="authors-hero">[\s\S]*?<\/section>/, hero =>
      '<section class="page-intro hub-intro"><h1>' + headingText(inner(hero, 'h1')) + '</h1><p class="deck">' + inner(hero, 'p', 'deck') + '</p></section>');
    body = body.replace(/<section class="authors-intro">[\s\S]*?<\/section>\s*/, '');
    body = body.replace(/(<section class="featured-authors"[^>]*>)([\s\S]*?)(<\/section>)/, (section, start, content, end) => {
      const heading = (content.match(/<h2 id="featured-authors-title">[\s\S]*?<\/h2>/) || [''])[0];
      const entries = [...content.matchAll(/<article class="featured-author-card"><a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/article>/g)].map(match => {
        const card = match[2];
        const text = card.replace(/<div class="author-cover-stack"[\s\S]*?<\/div>/, '');
        return directoryEntry(match[1], coversOf(card, 3), headingText(inner(text, 'h2')), plain(inner(text, 'p', 'kicker')).replace(/ in the library$/, ''), inner(text.replace(/<p class="kicker">[\s\S]*?<\/p>/, ''), 'p'));
      });
      return start + heading + '<div class="hub-entries">' + entries.join('') + '</div>' + end;
    });
    body = stripHeadingStops(stripLabels(body));
    return open + body + close;
  });
}

function subjectsIndex(html) {
  return html.replace(/(<main\b[^>]*class="[^"]*\bsubjects-page\b[^"]*"[^>]*>)([\s\S]*?)(<\/main>)/, (whole, open, body, close) => {
    body = body.replace(/<section class="subjects-hero">[\s\S]*?<\/section>/, hero =>
      '<section class="page-intro hub-intro"><h1>' + inner(hero, 'h1') + '</h1><p class="deck">' + inner(hero, 'p', 'deck') + ' There are also <a href="/reading-routes/">reading lists</a> that group books around a question.</p></section>');
    body = body.replace(/<section class="subjects-intro">[\s\S]*?<\/section>\s*/, '');
    body = body.replace(/(<section class="subject-directory"[^>]*>)([\s\S]*?)(<\/section>)/, (section, start, content, end) => {
      const entries = [...content.matchAll(/<article class="subject-directory-card"><a href="([^"]+)">([\s\S]*?)<\/a><\/article>/g)].map(match => {
        const card = match[2];
        const text = card.replace(/<div class="subject-index-covers"[\s\S]*?<\/div>/, '');
        const count = (plain(inner(text, 'p', 'kicker')).match(/(\d+ books?)/) || [])[1] || '';
        return directoryEntry(match[1], coversOf(card, 3), inner(text, 'h2'), count, inner(text.replace(/<p class="kicker">[\s\S]*?<\/p>/, ''), 'p'));
      });
      return start + '<h2 id="subject-guides-title">All subject guides</h2><div class="hub-entries">' + entries.join('') + '</div>' + end;
    });
    body = body.replace(/<section class="subjects-reference">[\s\S]*?<\/section>\s*/, '');
    body = stripHeadingStops(stripLabels(body));
    return open + body + close;
  });
}

// --- the Passage Room ---------------------------------------------------------------
function passageHub(html) {
  return html.replace(/(<main\b[^>]*class="[^"]*\bpassage-room-page\b[^"]*"[^>]*>)([\s\S]*?)(<\/main>)/, (whole, open, body, close) => {
    const manifesto = (body.match(/<section class="passage-manifesto"[^>]*>([\s\S]*?)<\/section>/) || [])[1] || '';
    body = body.replace(/<section class="passage-hub-hero">[\s\S]*?<\/section>/, hero =>
      '<section class="page-intro hub-intro"><h1>' + headingText(inner(hero, 'h1')) + '</h1><p class="deck">' + inner(hero, 'p', 'deck') + '</p>' + manifesto.replace(/<p>/g, '<p class="hub-lead">') + '</section>');
    body = body.replace(/<section class="passage-manifesto"[^>]*>[\s\S]*?<\/section>\s*/, '');
    body = body.replace(/<nav class="passage-hub-nav" aria-label="Rooms"><span>Rooms<\/span>/, '<nav class="passage-hub-nav" aria-label="Rooms">');
    // Each room: its name as the heading, its description as one line.
    body = body.replace(/<div class="passage-room-head"><div><span>([\s\S]*?)<\/span><h3 id="([^"]+)">([\s\S]*?)<\/h3>\s*<\/div>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g,
      (head, name, id, line, description) => '<div class="passage-room-head"><h2 id="' + id + '">' + name + '</h2><p>' + description + '</p></div>');
    body = body.replace(/<i class="passage-card-form">[\s\S]*?<\/i>|<span class="passage-card-number">[\s\S]*?<\/span>|<b>Read with the notes <span aria-hidden="true">&rarr;<\/span><\/b>/g, '');
    body = stripHeadingStops(stripLabels(body));
    return open + body + close;
  });
}

// --- reading lists --------------------------------------------------------------------
function readingRoutes(html, href) {
  if (href !== '/reading-routes/') return html;
  return html.replace(/(<main\b[^>]*>)([\s\S]*?)(<\/main>)/, (whole, open, body, close) => {
    body = body.replace(/<section class="page-intro"><div class="route-intro">([\s\S]*?)<\/div>\s*<aside class="source-note">[\s\S]*?<\/aside><\/section>/, (intro, content) =>
      '<section class="page-intro hub-intro">' + content.replace(/<p class="kicker">[\s\S]*?<\/p>\s*/, '') + '</section>');
    body = body.replace(/<span class="route-number">[\s\S]*?<\/span>/g, '');
    body = body.replace(/<span>Continue with:<\/span>/g, '<span>Free guides:</span>');
    body = stripHeadingStops(stripLabels(body));
    return open.replace('<main', '<main data-hub="routes"') + body + close;
  });
}

// --- hardbacks ------------------------------------------------------------------------
function hardbacksPage(html) {
  return html.replace(/(<main\b[^>]*class="[^"]*\bhardback-page\b[^"]*"[^>]*>)([\s\S]*?)(<\/main>)/, (whole, open, body, close) => {
    const note = inner((body.match(/<section class="hardback-editorial-note"[\s\S]*?<\/section>/) || [''])[0], 'p');
    body = body.replace(/<section class="hardback-hero">[\s\S]*?<\/section>/, hero =>
      '<section class="page-intro hub-intro"><h1>' + headingText(inner(hero, 'h1')) + '</h1><p class="deck">' + inner(hero, 'p', 'deck') + '</p>' + (note ? '<p class="hub-lead">' + note + '</p>' : '') + '</section>');
    body = body.replace(/<section class="hardback-editorial-note"[\s\S]*?<\/section>\s*/, '');
    body = body.replace(/<div class="hardback-collection-heading"><div>[\s\S]*?(<h2[^>]*>[\s\S]*?<\/h2>)\s*<\/div>\s*(<p>[\s\S]*?<\/p>)?\s*<a class="home-text-link" href="([^"]+)">[\s\S]*?<\/a><\/div>/g,
      (heading, h2, intro, href) => h2 + (intro ? intro.replace('<p>', '<p class="hub-lead">') : ''));
    body = body.replace(/<div class="hardback-grid">([\s\S]*?)<\/div>\s*(?=<\/section>)/g, (grid, cards) => {
      const entries = [...cards.matchAll(/<article class="hardback-card">([\s\S]*?)<\/article>/g)].map(match => {
        const card = match[1];
        const href = (card.match(/<a class="hardback-cover" href="([^"]+)"/) || [])[1] || '';
        const buy = (card.match(/<a class="button secondary" href="([^"]+)"/) || [])[1] || '';
        const copy = [...card.replace(/<div class="button-row">[\s\S]*?<\/div>/, '').matchAll(/<p>([\s\S]*?)<\/p>/g)].map(item => item[1]).pop() || '';
        return bookEntry({
          href,
          ...imageOf(card),
          title: inner(inner(card, 'h3'), 'a') || inner(card, 'h3'),
          meta: inner(card, 'p', 'hardback-author'),
          copy,
          links: buy ? '<a href="' + buy + '" rel="noopener">Buy the hardback on Amazon</a>' : ''
        });
      });
      return '<div class="hardback-grid hub-books">' + entries.join('') + '</div>';
    });
    body = stripHeadingStops(stripLabels(body));
    return open.replace('<main', '<main data-hub="hardbacks"') + body + close;
  });
}

// --- free guides --------------------------------------------------------------------
// Each guide page said what the guide was for three times, behind a navy
// panel, a band of labelled cards and a second call to open it. It now has
// one introduction, one way in, the sign-in line, a short account of the
// guide and the related pages.
function resourcePage(html) {
  return html.replace(/(<main\b[^>]*class="[^"]*\bresource-landing-page\b[^"]*"[^>]*>)([\s\S]*?)(<\/main>)/, (whole, open, body, close) => {
    const intro = (body.match(/<section class="page-intro resource-page-intro">[\s\S]*?<\/section>/) || [''])[0];
    const hero = (body.match(/<section class="resource-layout resource-landing-hero">[\s\S]*?<\/section>/) || [''])[0];
    const reading = (body.match(/<section class="resource-reading-section">[\s\S]*?<\/section>/) || [''])[0];
    const note = inner((body.match(/<aside class="note-box resource-use-note">[\s\S]*?<\/aside>/) || [''])[0], 'p');
    const shelf = (body.match(/<section class="context-image-shelf"[\s\S]*?<\/section>/) || [''])[0];
    if (!intro) return whole;

    const title = inner(intro, 'h1');
    const deck = inner(intro, 'p', 'deck');
    const preview = (intro.match(/<a class="button primary" href="([^"]+)"/) || [])[1] || '';
    const access = inner((intro.match(/<aside class="source-note">[\s\S]*?<\/aside>/) || [''])[0].replace(/<p><strong>[\s\S]*?<\/strong><\/p>/, ''), 'p');
    const length = plain(inner(intro, 'strong')).replace(/\s*·\s*written and published by Astor Library/i, '');
    const cover = (hero.match(/<img\b[^>]*>/) || [''])[0];
    const heroParagraphs = [...hero.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(match => match[1]).filter(text => plain(text) !== plain(deck));
    // The notes, without the coursework question at the end.
    const notes = [...reading.matchAll(/<article><p class="year">([\s\S]*?)<\/p>\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/article>/g)]
      .filter(match => !/question/i.test(plain(match[1])))
      .map(match => match[3]);
    const about = [...heroParagraphs, ...notes].filter((text, index, all) => all.indexOf(text) === index);
    const related = [...shelf.matchAll(/<a class="context-image-card" href="([^"]+)">[\s\S]*?<small>([\s\S]*?)<\/small><strong>([\s\S]*?)<\/strong>[\s\S]*?<\/a>/g)]
      .map(match => '<li><a href="' + match[1] + '">' + match[3] + '</a> <span>' + plain(match[2]).toLowerCase() + '</span></li>');

    const top = '<section class="page-intro hub-intro resource-intro"><div><h1>' + title + '</h1>' +
      (deck ? '<p class="deck">' + deck + '</p>' : '') +
      '<p class="hub-lead">' + [length ? length + ', written and published by Astor Library.' : '', access].filter(Boolean).join(' ') + '</p>' +
      (preview ? '<p class="resource-open"><a class="button primary" href="' + preview + '">Open the guide</a></p>' : '') +
      '</div>' + (cover ? '<figure class="resource-cover">' + cover + '</figure>' : '') + '</section>';

    body = body.replace(intro, top);
    // The credit moves from under the title to the foot of the page.
    body = body.replace(/<aside class="astor-page-credit"[\s\S]*?<\/aside>\s*/, '');
    body = body.replace(/(<nav class="book-end-nav resource-end-nav")/, '<aside class="astor-page-credit" aria-label="About this page"><p>Written and published by Astor Library for reading, teaching and independent study. See the <a href="/editorial/">editorial standards</a>.</p></aside>\n$1');
    // The library panel keeps its controls; its heading and label go.
    body = body.replace(/(<section class="resource-library-panel"[^>]*)aria-labelledby="resource-library-title"([^>]*>)\s*<div><p class="kicker">[\s\S]*?<\/p>\s*<h2 id="resource-library-title">[\s\S]*?<\/h2>/,
      '$1aria-label="Your Astor library"$2<div>');
    body = body.replace(hero, about.length ? '<section class="hub-section resource-about"><h2>About the guide</h2>' + about.map(text => '<p>' + text + '</p>').join('') + (note ? '<p>' + plain(note).replace(/^How to use this guide\.\s*/, '') + '</p>' : '') + '</section>' : '');
    body = body.replace(reading, '');
    body = body.replace(/<section class="resource-contents-section"><div class="resource-contents-heading">(?:<p class="kicker">[\s\S]*?<\/p>)?(<h2>[\s\S]*?<\/h2>)\s*(<p>[\s\S]*?<\/p>)?\s*<\/div>\s*<ol class="resource-contents">([\s\S]*?)<\/ol><\/section>/,
      (section, heading, lead, items) => '<section class="hub-section resource-contents-list">' + heading + (lead || '') + '<ul class="hub-links">' +
        [...items.matchAll(/<li><span>\d+<\/span><p>([\s\S]*?)<\/p>\s*<\/li>/g)].map(item => '<li>' + item[1] + '</li>').join('') + '</ul></section>');
    body = body.replace(/<aside class="note-box resource-use-note">[\s\S]*?<\/aside>\s*/, '');
    body = body.replace(/<section class="resource-open-band">[\s\S]*?<\/section>\s*/, '');
    body = body.replace(/<section class="resource-related">[\s\S]*?<\/section>\s*/, '');
    body = body.replace(shelf, related.length ? '<section class="hub-section resource-related-list"><h2>Related pages</h2><ul class="hub-links">' + related.join('') + '</ul></section>' : '');
    body = stripHeadingStops(stripLabels(body));
    return open.replace('<main', '<main data-hub="resource"') + body + close;
  });
}

function plainHubPage(html, href) {
  html = resourcePage(html);
  html = hardbacksPage(html);
  html = authorPage(html);
  html = subjectPage(html);
  html = authorsIndex(html);
  html = subjectsIndex(html);
  html = passageHub(html);
  html = readingRoutes(html, href);
  return html;
}

module.exports = { plainHubPage, headingText };

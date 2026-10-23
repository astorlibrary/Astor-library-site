// Gives every /books/<slug>/ page the same plain shape.
//
// The book pages were written over a year by several hands and several
// scripts, and most of them introduced the book three times: in the opening,
// in an "edition card" and again in a section on what the edition contains.
// Many also carried their own plot summaries, character lists and study
// questions, which now live in the study guide. This module rebuilds the top
// of each page from what the page already says, keeps the book's history and
// sources, and drops what repeats.
//
// The order is: the book (author, title, one introduction, cover), the Astor
// edition and how to buy it, links to the study guide and revision, then the
// book's own history, its sources, and a short foot.

const { topLevelBlocks } = require('./normalise-book-page');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plain(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeBasic(text) {
  return text
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&amp;/g, '&').replace(/&eacute;/g, 'é').replace(/&euml;/g, 'ë');
}

function inner(block, tag, cls) {
  const pattern = cls
    ? new RegExp('<' + tag + '\\b[^>]*class="[^"]*\\b' + cls + '\\b[^"]*"[^>]*>([\\s\\S]*?)</' + tag + '>', 'i')
    : new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)</' + tag + '>', 'i');
  return (block.match(pattern) || [])[1] || '';
}

// Headings that name the book's own study material. Where a study guide
// exists, the guide carries this material and the page drops it.
const STUDY_HEADINGS = [
  /^a closer reading/i, /^at a glance/i, /^characters?\b/i, /^principal characters/i, /^four groups of characters/i,
  /^historical figures in the play/i, /^character and allegory/i, /^(five|six|three|seven|ten) (key|stages|turning|decisive)/i,
  /^key passages/i, /^passages to return to/i, /^how the (action|story|fable|farce|deceptions|novel|poem)/i,
  /^language( and| ,|,|$)/i, /^form, language/i, /^narrative (design|pace|structure)/i, /^structure and/i,
  /^reading the/i, /^ways to study/i, /^the story'?s movement/i, /^the shape of the/i, /^the plot$/i, /^the story\.?$/i,
  /^book-by-book structure/i, /^what the reader knows/i, /^what changes in/i, /^does henry mature/i, /^hal’s education/i,
  /^hamlet’s delay/i, /^jekyll’s mistakes/i, /^huck’s voice/i, /^four key words/i, /^four rhetorical/i, /^three patterns/i,
  /^who (gets believed|owns the ending|introduces)/i, /^six (key|stages|turning)/i, /^the seven phases/i, /^the twelve (books|cases)/i,
  /^four (courtships|voyages)/i, /^the (four|three) /i, /^critical guide/i, /^context and themes/i, /^the narrator/i,
  /^sense and sensibility$/i, /^pip’s world/i, /^buck’s world/i, /^court, tavern/i, /^loyalties$/i, /^evidence$/i,
  /^objects$/i, /^violence$/i, /^women$/i, /^theatre$/i, /^the crown$/i, /^the kingdom$/i, /^denmark$/i, /^messina$/i,
  /^rome and egypt$/i, /^aufidius$/i, /^a kingdom divided$/i, /^the case begins$/i, /^the celebration$/i, /^chance and cause$/i
];

// Never kept: they belong to coursework, not to a book page.
const ALWAYS_DROP = [/^questions for/i, /^topics for analysis/i, /^open questions/i, /^questions for the stage/i, /^ways to study/i, /^aqa\b/i, /^choose your edition/i];

const KICKER_RULES = {
  'edition contents': { role: 'edition' },
  'this astor edition': { role: 'edition' },
  'about the work': { role: 'study', heading: 'The story' },
  'reading routes': { role: 'study', heading: 'Themes' },
  'critical reading': { role: 'study', heading: 'Language and form' },
  'plot and structure': { role: 'study', heading: 'The plot' },
  'characters': { role: 'study', heading: 'Characters' },
  'characters and speakers': { role: 'study', heading: 'Characters' },
  'study questions': { role: 'drop' },
  'text and context': { role: 'keep', heading: 'The text' },
  'text, sources and performance': { role: 'keep', heading: 'Text, sources and performance' },
  'further reference': { role: 'sources', heading: 'Sources' },
  'sources': { role: 'sources', heading: 'Sources' },
  'the shape of the work': { role: 'study', heading: 'The shape of the work' },
  'book, history and form': { role: 'keep', heading: 'Book, history and form' }
};

// Blocks that carry thematic summaries in coloured panels ("Crown — Henry
// IV…"). They repeat the guide and are dropped wherever a guide exists.
const PANEL_STRIP = /^<section class="(?:[a-z]+-strip|dream-strip|north-strip|voyage-grid|scene-grid|trick-grid|ado-grid|phase-grid|ritual-grid|portrait-grid|image-wall|book-grid)\b/;

function classOf(block) {
  return (block.match(/^<[a-z]+\b[^>]*class="([^"]*)"/i) || [])[1] || '';
}

function isSectionTitle(block) {
  return /^<section class="section-title"/.test(block);
}

function headingOf(block) {
  return decodeBasic(plain(inner(block, 'h2')));
}

function kickerOf(block) {
  return decodeBasic(plain(inner(block, 'p', 'kicker'))).toLowerCase();
}

// Turns the "what this edition contains" material into one short list or paragraph.
function editionContents(blocks, start) {
  const title = blocks[start];
  let list = (title.match(/<ul class="edition-includes">[\s\S]*?<\/ul>/) || [])[0] || '';
  let note = '';
  const intro = plain(inner(title.replace(/<h2[\s\S]*?<\/h2>/, '').replace(/<p class="kicker">[\s\S]*?<\/p>/, ''), 'p'));
  if (intro && !/^everything listed here/i.test(intro)) note = intro;
  let consumed = 1;
  const next = blocks[start + 1] || '';
  if (/^<section class="timeline"/.test(next) && /edition-card/.test(next)) {
    consumed = 2;
    if (!list) list = (next.match(/<ul class="edition-includes">[\s\S]*?<\/ul>/) || [])[0] || '';
    if (!note) {
      const paragraphs = [...next.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(match => match[1]);
      const describing = paragraphs.find(text => /\b(this|the) (astor|study|edition)\b|\bedition (contains|presents|prints|includes)|\bincludes\b/i.test(plain(text)));
      if (describing) note = describing;
    }
  }
  return { list, note, consumed };
}

function cardContents(card) {
  const list = (card.match(/<ul class="edition-includes">[\s\S]*?<\/ul>/) || [])[0] || '';
  const paragraphs = [...card.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(match => match[1]);
  const note = paragraphs.find(text => /\b(this|the) (astor|study|edition)\b|\bedition (contains|presents|prints|includes)|\bincludes\b/i.test(plain(text))) || '';
  return { list, note };
}

function cleanHeading(text) {
  return text.replace(/\.\s*$/, '');
}

// A section-title block, rewritten as a plain heading with its line of
// explanation (if any) as an ordinary paragraph.
function plainSectionTitle(block, heading) {
  const id = (block.match(/^<section class="section-title"[^>]*\bid="([^"]+)"/) || [])[1];
  const h2 = heading || cleanHeading(inner(block, 'h2'));
  const rest = block
    .replace(/^<section[^>]*>/, '')
    .replace(/<\/section>\s*$/, '')
    .replace(/<p class="kicker">[\s\S]*?<\/p>/, '')
    .replace(/<h2[^>]*>[\s\S]*?<\/h2>/, '')
    .trim();
  return '<section class="section-title"' + (id ? ' id="' + id + '"' : '') + '><h2>' + h2 + '</h2>' + rest + '</section>';
}

// Groups the page's material under its section headings, so a heading and
// everything until the next heading can be kept or dropped together.
function groupSections(blocks) {
  const groups = [];
  let current = { title: null, body: [] };
  for (const block of blocks) {
    if (isSectionTitle(block)) {
      if (current.title || current.body.length) groups.push(current);
      current = { title: block, body: [] };
    } else {
      current.body.push(block);
    }
  }
  if (current.title || current.body.length) groups.push(current);
  return groups;
}

function formatRows(formats, mainImage, studyPage) {
  if (!formats || !formats.length) return '';
  return formats.map(format => {
    const isStudy = /study/i.test(format.format);
    const label = isStudy ? 'Study Edition' : format.format;
    const edition = format.edition ? ' <span class="book-format-edition">' + escapeHtml(format.edition) + '</span>' : '';
    const note = format.note ? '<p class="book-format-note">' + escapeHtml(format.note) + '</p>' : '';
    const thumb = format.image && format.image !== mainImage
      ? '<img class="book-format-cover" src="' + escapeHtml(format.image) + '" alt="" width="48" height="72" loading="lazy" decoding="async">'
      : '<span class="book-format-cover is-empty" aria-hidden="true"></span>';
    const more = format.page ? '<a class="book-format-more" href="' + escapeHtml(format.page) + '">About this edition</a>' : '';
    const unavailable = format.unavailableIn ? ' data-unavailable-in="' + escapeHtml(format.unavailableIn.join(' ')) + '"' : '';
    return '<li class="book-format astor-buy-item"' + unavailable + '>' + thumb +
      '<div class="book-format-text"><p class="book-format-name">' + escapeHtml(label) + edition + '</p>' + note + more + '</div>' +
      '<p class="astor-buy-actions"><a class="book-format-buy astor-buy-button" href="' + escapeHtml(format.url) + '" rel="noopener">Buy on Amazon</a></p></li>';
  }).join('');
}

function restructureBookPage(html, ctx) {
  const mainOpen = html.match(/<main\b[^>]*>/);
  if (!mainOpen) return html;
  const innerStart = mainOpen.index + mainOpen[0].length;
  const innerEnd = html.lastIndexOf('</main>');
  if (innerEnd <= innerStart) return html;
  const raw = html.slice(innerStart, innerEnd);
  let blocks = topLevelBlocks(raw).map(block => block.text.trim()).filter(text => text && !/^<!--/.test(text));

  const { book, collectionHref, formats, guideSlug, passages, seasons } = ctx;

  // --- the opening ---------------------------------------------------------------
  const heroIndex = blocks.findIndex(block => /^<section[^>]*class="[^"]*(?:page-intro|-hero)\b/.test(block));
  const hero = heroIndex >= 0 ? blocks[heroIndex] : '';
  const authorHtml = inner(hero, 'p', 'kicker') || escapeHtml(book.author || '');
  const titleHtml = cleanHeading(inner(hero, 'h1') || escapeHtml(book.title));
  const decks = [...hero.matchAll(/<p class="deck">([\s\S]*?)<\/p>/g)].map(match => match[1]);
  const aside = (hero.match(/<aside[\s\S]*?<\/aside>/) || [''])[0];
  const heroImage = (aside.match(/<img\b[^>]*\bsrc="([^"]+)"/) || [])[1];
  const coverSrc = book.image || heroImage;
  // The opening note beside the cover often says what the edition contains:
  // "Astor Library edition. The complete play with…". Labels such as
  // "Paperback · Edited by Haydn Wood" say nothing and are left out.
  let asideNote = '';
  for (const paragraph of aside.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const text = paragraph[1].replace(/<strong>[\s\S]*?<\/strong>\s*(?:<br>)?/, '').trim();
    if (plain(text).length > 40 && !/\b(AQA|OCR|Edexcel|WJEC|GCSE)\b/.test(text)) { asideNote = text; break; }
  }
  if (heroIndex >= 0) blocks.splice(heroIndex, 1);

  // --- what the edition contains --------------------------------------------------
  let editionList = '';
  let editionNote = '';
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (isSectionTitle(block) && (KICKER_RULES[kickerOf(block)]?.role === 'edition' || /^(what this astor edition contains|text and supporting material)/i.test(headingOf(block)))) {
      const found = editionContents(blocks, index);
      editionList = editionList || found.list;
      editionNote = editionNote || found.note;
      blocks.splice(index, found.consumed);
      index -= 1;
    }
  }
  blocks = blocks.filter(block => {
    if (/^<article class="edition-card/.test(block) || (/^<section class="timeline"/.test(block) && /<article class="edition-card/.test(block) && !/<article class="prod-card/.test(block))) {
      const found = cardContents(block);
      editionList = editionList || found.list;
      editionNote = editionNote || found.note;
      return false;
    }
    return true;
  });
  const editionHtml = editionList
    ? editionList.replace('class="edition-includes"', 'class="book-edition-list"')
    : (editionNote || asideNote) ? '<p>' + (editionNote || asideNote) + '</p>' : '';

  // --- drop what repeats or what belongs elsewhere --------------------------------
  const dropClasses = /^(quick-facts|page-contents|astor-toolkit|edition-sample|edition-format-panel|edition-choice-band|astor-buy|astor-page-credit|book-passage-shelf|context-image-shelf|season-book-backlinks|book-end-nav|book-breadcrumb|book-callout)\b/;
  blocks = blocks.filter(block => !dropClasses.test(classOf(block)) && !/^<nav class="book-breadcrumb/.test(block) && !/^<style\b/.test(block));
  if (guideSlug) blocks = blocks.filter(block => !PANEL_STRIP.test(block));

  // --- keep the book's history, in plain sections ----------------------------------
  const groups = groupSections(blocks);
  const kept = [];
  let sourcesHtml = '';
  for (const group of groups) {
    if (!group.title) {
      kept.push(...group.body);
      continue;
    }
    const heading = headingOf(group.title);
    const rule = KICKER_RULES[kickerOf(group.title)];
    if (ALWAYS_DROP.some(pattern => pattern.test(heading)) || rule?.role === 'drop') continue;
    const study = rule?.role === 'study' || (!rule && STUDY_HEADINGS.some(pattern => pattern.test(heading)));
    if (study && guideSlug) continue;
    const isSources = rule?.role === 'sources' || /^(sources|texts and publication records|texts, archives)/i.test(heading);
    const title = plainSectionTitle(group.title, rule?.heading && rule.role !== 'sources' ? rule.heading : (isSources ? 'Sources' : undefined));
    const section = title + group.body.join('\n');
    if (isSources) sourcesHtml += section;
    else kept.push(section);
  }
  // A source list with no heading of its own still goes at the end.
  for (let index = kept.length - 1; index >= 0; index--) {
    if (/^<nav class="source-list/.test(kept[index]) && !/<section class="section-title"/.test(kept[index])) {
      sourcesHtml = '<section class="section-title" id="sources"><h2>Sources</h2></section>' + kept[index] + sourcesHtml;
      kept.splice(index, 1);
    }
  }
  if (sourcesHtml && !/id="sources"/.test(sourcesHtml)) sourcesHtml = sourcesHtml.replace('<section class="section-title"', '<section class="section-title" id="sources"');

  // --- the new opening --------------------------------------------------------------
  const studyFormat = (formats || []).find(format => /study/i.test(format.format) && format.page);
  const links = [];
  if (guideSlug) links.push('<a href="/guides/' + escapeHtml(guideSlug) + '/">Study guide</a>');
  if (guideSlug) links.push('<a href="/play/?book=' + escapeHtml(guideSlug) + '">Revise</a>');
  const linkLine = links.length ? '<p class="book-links">' + links.join('') + '</p>' : '';

  const cover = coverSrc
    ? '<figure class="book-cover"><img src="' + escapeHtml(coverSrc) + '" alt="' + escapeHtml(plain(titleHtml)) + ', Astor Library edition" width="400" height="600"></figure>'
    : '';
  const breadcrumb = '<nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/library/">All books</a><span aria-hidden="true">/</span>' +
    '<a href="' + escapeHtml(collectionHref || '/library/') + '">' + escapeHtml(book.collection || 'Books') + '</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(plain(titleHtml)) + '</span></nav>';
  const author = book.authorHref && !/<a\b/.test(authorHtml)
    ? '<a href="' + escapeHtml(book.authorHref) + '">' + authorHtml + '</a>'
    : authorHtml;
  const buyRows = formatRows(formats, coverSrc, studyFormat?.page);
  const top = '<section class="book-top page-intro">' +
    '<div class="book-top-text">' +
    '<p class="book-author kicker">' + author + '</p>' +
    '<h1>' + titleHtml + '</h1>' +
    decks.map(deck => '<p class="deck">' + deck + '</p>').join('') +
    '</div>' + cover + '</section>' +
    '<section class="book-edition" id="buy" aria-labelledby="book-edition-title">' +
    '<h2 id="book-edition-title">The Astor edition</h2>' +
    (editionHtml ? '<div class="book-edition-note">' + editionHtml + '</div>' : '') +
    (buyRows ? '<ul class="book-formats astor-buy-list">' + buyRows + '</ul>' : '') +
    linkLine +
    '</section>';

  // --- the foot --------------------------------------------------------------------
  const extras = [];
  if ((passages || []).length) {
    extras.push('<p><span>Close readings</span> ' + passages.map(passage => '<a href="' + escapeHtml(passage.href) + '">' + escapeHtml(plain(passage.title)) + '</a>').join(', ') + '</p>');
  }
  if ((seasons || []).length) {
    extras.push('<p><span>In the seasonal library</span> ' + seasons.map(season => '<a href="' + escapeHtml(season.href) + '">' + escapeHtml(season.title) + '</a>').join(', ') + '</p>');
  }
  const foot = (extras.length ? '<aside class="book-also" aria-label="Elsewhere on Astor Library">' + extras.join('') + '</aside>' : '') +
    '<p class="book-credit">Edited by Haydn Wood. Dates and publication details are checked against the sources listed on this page. <a href="/about/#editor">About the editor</a></p>';
  const endNav = '<nav class="book-end-nav" aria-label="End of page">' +
    '<a href="#main-content">Back to the top</a>' +
    (book.authorHref ? '<a href="' + escapeHtml(book.authorHref) + '">More by ' + escapeHtml(book.author) + '</a>' : '') +
    '<a href="' + escapeHtml(collectionHref || '/library/') + '">More from ' + escapeHtml(book.collection) + '</a>' +
    '<a href="/library/">All books</a></nav>';

  const body = kept.length ? '<div class="book-body">' + kept.join('\n') + '</div>' : '';
  const rebuilt = '\n' + breadcrumb + '\n' + top + '\n' + body + '\n' + (sourcesHtml ? '<div class="book-sources">' + sourcesHtml + '</div>' : '') + '\n' + foot + '\n' + endNav + '\n';
  let out = html.slice(0, innerStart) + rebuilt + html.slice(innerEnd);
  out = out.replace(/<main\b([^>]*)>/, (whole, attributes) => {
    const withClass = /class="/.test(attributes) ? attributes.replace(/class="([^"]*)"/, 'class="$1 book-page"') : attributes + ' class="page-wrap book-page"';
    return '<main' + withClass + (guideSlug ? ' data-guide="' + escapeHtml(guideSlug) + '"' : '') + '>';
  });
  // Each page's own style block only ever styled the panels removed above.
  out = out.replace(/<style>[\s\S]*?<\/style>/g, '');
  return out;
}

module.exports = { restructureBookPage, STUDY_HEADINGS };

// Renders the sections of a book's study material from its data/books/<slug>.json
// record: what happens, characters, themes, quotations, form and language,
// context, essays, videos and further reading. scripts/guide-pages.js gives
// each section a page of its own in the book's study guide.
//
// The markup is written to be read, like the pages of a printed study guide:
// headings, paragraphs and lists, with no boxes around them. A quotation, the
// note on where it comes from and the commentary on it each have their own
// element, so the stylesheet can set them apart by type alone. toolkit.mjs
// adds the few controls a reader with scripts gets (mark a section as read,
// keep a quotation, the maps). Without JavaScript every word is still there.

const DIFFICULTY_WORDS = {
  1: 'Straightforward',
  2: 'Steady going',
  3: 'Demanding in places',
  4: 'Difficult',
  5: 'Very difficult'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Years before the common era are stored as negative integers and shown the
// way a reader writes them.
function formatYear(year) {
  const value = Number(year);
  if (!Number.isFinite(value)) return String(year);
  return value < 0 ? Math.abs(value) + ' BC' : String(value);
}

function readingTimeLabel(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return minutes + ' minutes';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours + (hours === 1 ? ' hour' : ' hours') + (rest ? ' ' + rest + ' minutes' : '');
}

const isPlay = book => book.form === 'play';
const shortTitle = book => String(book.title).split(';')[0].trim();

// The facts about the book, set like the details on a book's imprint page.
function glance(book) {
  const rows = [];
  if (book.form) {
    rows.push(['Form', book.genre || book.form.replace(/^./, character => character.toUpperCase()), book.lengthNote || '']);
  }
  // `written` is when the work was composed and `firstPublished` the year it
  // reached print. Before 1700 editors speak of a work being first printed
  // (a Shakespeare quarto, the first printed Homer), so the label follows suit.
  if (book.written || book.firstPublished) {
    const verb = Number(book.firstPublished) < 1700 ? 'First printed' : 'First published';
    rows.push(book.written
      ? ['Written', book.written, book.firstPublished ? verb + ' ' + formatYear(book.firstPublished) + '.' : '']
      : [verb, formatYear(book.firstPublished), '']);
  }
  if (book.readingTime) rows.push(['Reading time', readingTimeLabel(book.readingTime), 'At an easy pace, without notes.']);
  if (book.difficulty) rows.push(['Difficulty', DIFFICULTY_WORDS[book.difficulty], 'Rated ' + book.difficulty + ' out of 5 for first-time readers.']);
  if (book.setting) rows.push(['Setting', book.setting, '']);
  if (!rows.length) return '';
  return '<dl class="gd-facts">' + rows.map(([label, value, note]) =>
    '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + (note ? ' <span>' + escapeHtml(note) + '</span>' : '') + '</dd></div>'
  ).join('') + '</dl>';
}

// A line at the foot of a section that points somewhere else on the site.
function seeAlso(html) {
  return '<p class="gd-see-also">' + html + '</p>';
}

function plotPanel(book) {
  const parts = book.structure.map(stage => {
    const scenes = (stage.scenes || []).length
      // Short references (1.3) hang in the margin; longer ones (Chapter 12) head their line.
      ? '<dl class="gd-scenes' + (stage.scenes.some(scene => String(scene.ref).length > 5) ? ' is-stacked' : '') + '">' + stage.scenes.map(scene =>
        '<div><dt>' + escapeHtml(scene.ref) + '</dt><dd>' +
        (scene.title ? '<i>' + escapeHtml(scene.title) + '.</i> ' : '') + escapeHtml(scene.summary) + '</dd></div>'
      ).join('') + '</dl>'
      : '';
    return '<section class="gd-part" data-stage="' + escapeHtml(stage.id) + '" aria-labelledby="gd-stage-' + escapeHtml(stage.id) + '">' +
      '<p class="gd-part-label"><span data-stage-label>' + escapeHtml(stage.label) + '</span><span class="astor-stage-slot"></span></p>' +
      '<h2 id="gd-stage-' + escapeHtml(stage.id) + '">' + escapeHtml(stage.title) + '</h2>' +
      '<p>' + escapeHtml(stage.summary) + '</p>' + scenes +
      '</section>';
  }).join('');
  return '<div class="gd-panel" id="astor-plot" data-panel="Plot">' +
    '<p class="gd-progress" data-astor-progress hidden></p>' +
    parts +
    '</div>';
}

function charactersPanel(book) {
  const entries = book.characters.map(character =>
    '<section class="gd-entry" id="astor-character-' + escapeHtml(character.id) + '">' +
    '<h2>' + escapeHtml(character.name) + '</h2>' +
    (character.role ? '<p class="gd-role">' + escapeHtml(character.role) + '</p>' : '') +
    '<p>' + escapeHtml(character.summary) + '</p>' +
    ((character.traits || []).length ? '<p class="gd-traits">' + escapeHtml(character.traits.join(', ')) + '</p>' : '') +
    '</section>'
  ).join('');
  return '<div class="gd-panel" id="astor-characters" data-panel="Characters">' +
    entries +
    '<section class="gd-entry gd-map-section" aria-labelledby="gd-connections">' +
    '<h2 id="gd-connections">How they connect</h2>' +
    '<p>The map redraws the relationships ' + (isPlay(book) ? 'act by act' : 'section by section') + '.</p>' +
    '<div class="astor-character-map" data-astor-character-map="' + escapeHtml(book.slug) + '">' +
    '<p><a href="/explore/characters/?book=' + escapeHtml(book.slug) + '">Open the relationship map</a></p>' +
    '</div>' +
    '</section>' +
    '</div>';
}

function themesPanel(book) {
  const entries = book.themes.map(theme =>
    '<section class="gd-entry" id="astor-theme-' + escapeHtml(theme.id) + '">' +
    '<h2>' + escapeHtml(theme.name) + '</h2>' +
    '<p>' + escapeHtml(theme.summary) + '</p>' +
    (theme.development ? '<p>' + escapeHtml(theme.development) + '</p>' : '') +
    '</section>'
  ).join('');
  return '<div class="gd-panel" id="astor-themes" data-panel="Themes">' +
    entries +
    seeAlso('The <a href="/explore/themes/">themes explorer</a> follows each of these ideas through the other books in the library.') +
    '</div>';
}

// Where a quotation comes from: the speaker and the reference, leaving out a
// reference that only repeats the heading it sits under ("Book I" under Book I).
function citation(quotation, stageLabel) {
  const reference = quotation.reference && quotation.reference !== stageLabel ? quotation.reference : '';
  return [quotation.speaker, reference].filter(Boolean).map(escapeHtml).join(', ');
}

function quotationsPanel(book) {
  const stages = book.structure.map(stage => ({ stage, quotations: book.quotations.filter(quotation => quotation.stage === stage.id) }));
  const placed = new Set(stages.flatMap(group => group.quotations));
  const rest = book.quotations.filter(quotation => !placed.has(quotation));
  if (rest.length) stages.push({ stage: { id: 'elsewhere', label: 'Elsewhere', title: '' }, quotations: rest });

  const card = (quotation, stage) => {
    const cite = citation(quotation, stage.label);
    // The commonplace book keeps the line with its full reference.
    const reference = (quotation.speaker ? quotation.speaker + ' · ' : '') + book.title + ' ' + quotation.reference;
    return '<article class="gd-quote" id="astor-quote-' + escapeHtml(quotation.id) + '" data-quote-id="' + escapeHtml(quotation.id) + '" data-quote-reference="' + escapeHtml(reference) + '">' +
      '<blockquote><p>' + escapeHtml(quotation.text) + '</p></blockquote>' +
      '<div class="gd-quote-cite">' + (cite ? '<p>' + cite + '</p>' : '') + '<span class="gd-quote-tools" data-quote-tools></span></div>' +
      (quotation.context ? '<p class="gd-moment">' + escapeHtml(quotation.context) + '</p>' : '') +
      '<p>' + escapeHtml(quotation.analysis) + '</p>' +
      '</article>';
  };

  const groups = stages.filter(group => group.quotations.length).map(({ stage, quotations }) =>
    '<section class="gd-quote-group" aria-labelledby="gd-quotes-' + escapeHtml(stage.id) + '">' +
    '<h2 id="gd-quotes-' + escapeHtml(stage.id) + '">' + escapeHtml(stage.label) +
    (stage.title && !isPlay(book) && stage.label !== stage.title ? ' <span>' + escapeHtml(stage.title) + '</span>' : '') + '</h2>' +
    quotations.map(quotation => card(quotation, stage)).join('') +
    '</section>'
  ).join('');

  return '<div class="gd-panel" id="astor-quotations" data-panel="Quotations">' +
    '<p class="gd-intro">' + book.quotations.length + ' lines, in the order they come in the ' + (isPlay(book) ? 'play' : book.form === 'poem' ? 'poem' : 'book') +
    ', each with where it comes from and what it does. Quoted from ' + escapeHtml(sourceLabel(book.sourceText.label)) + '.</p>' +
    groups +
    seeAlso('The <a href="/explore/quotations/?book=' + escapeHtml(book.slug) + '">quotation explorer</a> sorts these lines by theme, technique and character.') +
    '</div>';
}

// "the Project Gutenberg text of…", but a named edition or translation
// ("The Brothers Karamazov, translated by…", "Samuel Butler’s prose translation…")
// carries its own article or needs none.
function sourceLabel(label) {
  return /^(Project Gutenberg|Standard Ebooks|Globe\/Moby) /.test(label) ? 'the ' + label : label;
}

function techniquesPanel(book) {
  if (!book.techniques.length) return '';
  const entries = book.techniques.map(technique =>
    '<section class="gd-entry" id="astor-technique-' + escapeHtml(technique.id) + '">' +
    '<h2>' + escapeHtml(technique.name) + '</h2>' +
    '<p>' + escapeHtml(technique.definition) + '</p>' +
    '<p><span class="gd-runin">In ' + escapeHtml(shortTitle(book)) + '</span> ' + escapeHtml(technique.inThisBook) + '</p>' +
    '</section>'
  ).join('');
  return '<div class="gd-panel" id="astor-techniques" data-panel="Form &amp; language">' +
    entries +
    seeAlso('The <a href="/explore/techniques/">technique glossary</a> shows each of these terms at work in other books.') +
    '</div>';
}

function contextPanel(book) {
  const timeline = (book.timeline || []).length
    ? '<section class="gd-entry" aria-labelledby="gd-dates"><h2 id="gd-dates">Dates</h2>' +
      '<dl class="gd-dates">' + book.timeline.slice().sort((a, b) => a.year - b.year).map(entry =>
        '<div><dt>' + escapeHtml(formatYear(entry.year)) + '</dt><dd><b>' + escapeHtml(entry.label) + '.</b>' +
        (entry.detail ? ' ' + escapeHtml(entry.detail) : '') + '</dd></div>'
      ).join('') + '</dl>' +
      seeAlso('See these dates among the other books on the <a href="/explore/timeline/?view=events&amp;mark=' + escapeHtml(book.slug) + '">library timeline</a>.') +
      '</section>'
    : '';
  const views = (book.criticalViews || []).length
    ? '<section class="gd-entry" aria-labelledby="gd-views"><h2 id="gd-views">Critical views</h2>' +
      book.criticalViews.map(view =>
        '<h3>' + escapeHtml(view.position) + '</h3>' +
        '<p>' + escapeHtml(view.summary) + '</p>' +
        (view.counter ? '<p><span class="gd-runin">Against it</span> ' + escapeHtml(view.counter) + '</p>' : '')
      ).join('') + '</section>'
    : '';
  const places = (book.places || []).length
    ? '<section class="gd-entry" aria-labelledby="gd-places"><h2 id="gd-places">Places</h2>' +
      '<div class="astor-book-map-box" data-astor-book-map="' + escapeHtml(book.slug) + '">' +
      '<dl class="gd-places">' + book.places.map(place =>
        '<div><dt>' + escapeHtml(place.name) + '</dt>' + (place.note ? '<dd>' + escapeHtml(place.note) + '</dd>' : '') + '</div>').join('') + '</dl>' +
      '</div>' +
      seeAlso('<a href="/explore/map/?book=' + escapeHtml(book.slug) + '">Open the full map</a>') +
      '</section>'
    : '';
  if (!timeline && !views) return '';
  return '<div class="gd-panel" id="astor-context" data-panel="Context">' +
    timeline + views + places +
    '</div>';
}

function essaysPanel(book) {
  const questions = (book.essayQuestions || []).map(question =>
    '<section class="gd-entry gd-essay">' +
    '<h2>' + escapeHtml(question.question) + '</h2>' +
    (question.focus ? '<p class="gd-role">' + escapeHtml(question.focus) + '</p>' : '') +
    '<ol class="gd-plan">' + (question.plan || []).map(step => '<li>' + escapeHtml(step) + '</li>').join('') + '</ol>' +
    '</section>'
  ).join('');
  const discussion = (book.discussionQuestions || []).length
    ? '<section class="gd-entry" aria-labelledby="gd-discussion"><h2 id="gd-discussion">For discussion</h2><ol class="gd-plan">' +
      book.discussionQuestions.map(question => '<li>' + escapeHtml(question) + '</li>').join('') + '</ol></section>'
    : '';
  if (!questions && !discussion) return '';
  return '<div class="gd-panel" id="astor-essays" data-panel="Essays">' +
    '<p class="gd-intro">Each question comes with the outline of an answer, a paragraph to a line.</p>' +
    questions + discussion +
    seeAlso('To turn one of these into a full plan with quotations, use the <a href="/play/essay-forge/?book=' + escapeHtml(book.slug) + '">essay planner</a>.') +
    '</div>';
}

// Watching. Nothing is embedded until a reader asks for it: the entry is plain
// markup, and only a click loads a frame, from youtube-nocookie.com or
// player.vimeo.com. Until then the page contacts neither.
//
// A record lists videos with a title, provider, id, url and a plain note on
// what each is; with none, the section is left out.
function videosPanel(book) {
  if (!(book.videos || []).length) return '';
  const entries = book.videos.map(video =>
    '<article class="astor-video" data-video-provider="' + escapeHtml(video.provider) + '" data-video-id="' + escapeHtml(video.id) + '">' +
    '<h3>' + escapeHtml(video.title) + '</h3>' +
    '<p>' + escapeHtml(video.note) + ' <span class="gd-role">' + escapeHtml(video.source || video.provider) + '</span></p>' +
    '<p><button class="gd-text-button" type="button" data-video-play>Play here</button> · ' +
    '<a href="' + escapeHtml(video.url) + '" rel="noopener noreferrer">Watch on YouTube</a></p>' +
    '</article>'
  ).join('');
  return '<section class="gd-panel gd-entry" id="astor-watch" data-panel="Watch" aria-labelledby="gd-videos">' +
    '<h2 id="gd-videos">Videos</h2>' +
    '<p class="gd-intro">Nothing loads until you press play.</p>' +
    entries +
    '</section>';
}

function relatedPanel(book, titleFor, passages = []) {
  if (!(book.related || []).length && !passages.length) return '';
  const item = (href, title, note) =>
    '<li><a href="' + escapeHtml(href) + '">' + escapeHtml(title) + '</a>' + (note ? ' ' + escapeHtml(note) : '') + '</li>';
  const readings = passages.length
    ? (book.related || []).length ? '<h3>Close readings</h3>' : ''
    : '';
  return '<section class="gd-read-next" id="astor-related" data-panel="Read next" aria-labelledby="gd-read-next">' +
    '<h2 id="gd-read-next">Read next</h2>' +
    (passages.length ? readings + '<ul class="gd-reading-list">' + passages.map(passage => item(passage.href, passage.title, passage.description)).join('') + '</ul>' : '') +
    ((book.related || []).length
      ? (passages.length ? '<h3>Related books</h3>' : '') +
        '<ul class="gd-reading-list">' + book.related.map(related => item(related.href, titleFor(related.href), related.why)).join('') + '</ul>'
      : '') +
    '</section>';
}

// Related links carry a reason, not a title: the catalogue already knows what
// each page is called, so the guide asks it rather than storing the name twice.
function fallbackTitle(href) {
  return href.replace(/^\/[a-z-]+\//, '').replace(/\/$/, '').replace(/-/g, ' ')
    .replace(/(^|\s)\S/g, character => character.toUpperCase());
}

module.exports = {
  escapeHtml, readingTimeLabel, formatYear, fallbackTitle, sourceLabel, DIFFICULTY_WORDS,
  // The study guides (scripts/guide-pages.js) give each section a page of its own.
  glance, plotPanel, charactersPanel, themesPanel, quotationsPanel, techniquesPanel, contextPanel,
  essaysPanel, videosPanel, relatedPanel
};

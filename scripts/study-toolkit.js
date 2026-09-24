// Renders the Astor study toolkit that build-static.js injects into every book
// page and generated study page that has a data/books/<slug>.json file.
//
// The whole region is written out as plain sequential sections. JavaScript then
// upgrades it into a tabbed panel, adds the save button, the progress ticks,
// the quotation filters and the commonplace-book controls. A reader with no
// JavaScript gets all of the same material, stacked, and nothing is hidden
// from a search engine.

const { accentFor, motifSvg } = require('./book-motifs');

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

function glance(book) {
  const cells = [];
  if (book.form) {
    cells.push({
      label: 'Form',
      value: book.genre || book.form.replace(/^./, character => character.toUpperCase()),
      note: book.lengthNote || ''
    });
  }
  if (book.written || book.firstPublished) {
    cells.push({
      label: book.form === 'play' ? 'Written / printed' : 'First published',
      value: book.written || String(book.firstPublished),
      note: book.written && book.firstPublished ? 'First printed ' + book.firstPublished + '.' : ''
    });
  }
  if (book.readingTime) {
    cells.push({
      label: 'Reading time',
      value: readingTimeLabel(book.readingTime),
      note: 'At an easy pace, without notes.'
    });
  }
  if (book.difficulty) {
    cells.push({
      label: 'Difficulty',
      value: DIFFICULTY_WORDS[book.difficulty],
      note: 'Rated ' + book.difficulty + ' out of 5 for first-time readers.'
    });
  }
  if (book.setting) {
    cells.push({ label: 'Setting', value: book.setting, note: '' });
  }
  if (!cells.length) return '';
  return '<dl class="astor-glance">' + cells.map(cell =>
    '<div><dt>' + escapeHtml(cell.label) + '</dt><dd><strong>' + escapeHtml(cell.value) + '</strong>' +
    (cell.note ? '<small>' + escapeHtml(cell.note) + '</small>' : '') + '</dd></div>'
  ).join('') + '</dl>';
}

function plotPanel(book) {
  const stages = book.structure.map(stage => {
    const scenes = (stage.scenes || []).length
      ? '<ol class="astor-scene-list">' + stage.scenes.map(scene =>
        '<li><b>' + escapeHtml(scene.ref) + '</b><span>' + escapeHtml(scene.summary) + '</span></li>'
      ).join('') + '</ol>'
      : '';
    return '<li data-stage="' + escapeHtml(stage.id) + '">' +
      '<span class="astor-stage-label">' + escapeHtml(stage.label) + '</span>' +
      '<div><h4>' + escapeHtml(stage.title) + '</h4><p>' + escapeHtml(stage.summary) + '</p>' + scenes + '</div>' +
      '<span class="astor-stage-slot"></span>' +
      '</li>';
  }).join('');
  return '<section class="astor-panel" id="astor-plot" data-panel="Plot">' +
    '<h3>What happens in ' + escapeHtml(book.title) + '</h3>' +
    '<p class="astor-panel-note">' + escapeHtml(book.summary) + '</p>' +
    '<ol class="astor-spine">' + stages + '</ol>' +
    '</section>';
}

function charactersPanel(book) {
  const cards = book.characters.map(character => {
    const traits = (character.traits || []).length
      ? '<p class="astor-tag-row">' + character.traits.map(trait => '<span class="astor-tag">' + escapeHtml(trait) + '</span>').join('') + '</p>'
      : '';
    return '<article class="astor-character-card" id="astor-character-' + escapeHtml(character.id) + '">' +
      '<h4>' + escapeHtml(character.name) + '</h4>' +
      (character.role ? '<span class="astor-role">' + escapeHtml(character.role) + '</span>' : '') +
      '<p>' + escapeHtml(character.summary) + '</p>' + traits +
      '</article>';
  }).join('');
  return '<section class="astor-panel" id="astor-characters" data-panel="Characters">' +
    '<h3>Who is who</h3>' +
    '<p class="astor-panel-note">' +
    'The map shows how their connections change across the ' + (book.form === 'play' ? 'acts' : 'sections') + '.</p>' +
    '<div class="astor-character-map" data-astor-character-map="' + escapeHtml(book.slug) + '">' +
    '<p class="astor-toolkit-actions"><a class="button secondary" href="/explore/characters/?book=' + escapeHtml(book.slug) + '">Open the relationship map</a></p>' +
    '</div>' +
    '<div class="astor-character-grid">' + cards + '</div>' +
    '</section>';
}

function themesPanel(book) {
  const notes = book.themes.map(theme =>
    '<article class="astor-note" id="astor-theme-' + escapeHtml(theme.id) + '">' +
    '<h4><a href="/explore/themes/#' + escapeHtml(theme.id) + '">' + escapeHtml(theme.name) + '</a></h4>' +
    '<p>' + escapeHtml(theme.summary) + '</p>' +
    (theme.development ? '<p class="astor-note-aside">' + escapeHtml(theme.development) + '</p>' : '') +
    '</article>'
  ).join('');
  return '<section class="astor-panel" id="astor-themes" data-panel="Themes">' +
    '<h3>What the book keeps coming back to</h3>' +
    '<p class="astor-panel-note">' +
    'Compare these with other books in the <a href="/explore/themes/">themes explorer</a>.</p>' +
    '<div class="astor-note-grid">' + notes + '</div>' +
    '</section>';
}

function quotationsPanel(book) {
  const themeNames = new Map(book.themes.map(theme => [theme.id, theme.name]));
  const techniqueNames = new Map(book.techniques.map(technique => [technique.id, technique.name]));
  const characterNames = new Map(book.characters.map(character => [character.id, character.name]));

  const filters = ['<button class="astor-filter" type="button" data-quote-filter="all" aria-pressed="true">All</button>']
    .concat(book.themes.map(theme =>
      '<button class="astor-filter" type="button" data-quote-filter="theme:' + escapeHtml(theme.id) + '" aria-pressed="false">' + escapeHtml(theme.name) + '</button>'
    ))
    .join('');

  const cards = book.quotations.map(quotation => {
    const tags = [
      ...(quotation.themes || []).map(id => themeNames.get(id)),
      ...(quotation.techniques || []).map(id => techniqueNames.get(id)),
      ...(quotation.characters || []).map(id => characterNames.get(id))
    ].filter(Boolean);
    const keys = [
      ...(quotation.themes || []).map(id => 'theme:' + id),
      ...(quotation.techniques || []).map(id => 'technique:' + id),
      ...(quotation.characters || []).map(id => 'character:' + id)
    ].join(' ');
    return '<article class="astor-quote-card" id="astor-quote-' + escapeHtml(quotation.id) + '" data-quote-keys="' + escapeHtml(keys) + '" data-quote-id="' + escapeHtml(quotation.id) + '">' +
      '<blockquote><p>' + escapeHtml(quotation.text) + '</p></blockquote>' +
      '<p class="astor-quote-attribution">' +
      (quotation.speaker ? escapeHtml(quotation.speaker) + ' &middot; ' : '') +
      escapeHtml(book.title) + ' ' + escapeHtml(quotation.reference) +
      '</p>' +
      (quotation.context ? '<p class="astor-context">' + escapeHtml(quotation.context) + '</p>' : '') +
      '<p class="astor-analysis">' + escapeHtml(quotation.analysis) + '</p>' +
      '<div class="astor-quote-foot">' +
      tags.map(tag => '<span class="astor-tag">' + escapeHtml(tag) + '</span>').join('') +
      '</div>' +
      '</article>';
  }).join('');

  return '<section class="astor-panel" id="astor-quotations" data-panel="Quotations">' +
    '<h3>Key quotations</h3>' +
    '<p class="astor-panel-note">' + book.quotations.length + ' quotations, each with the place it comes from.</p>' +
    '<div class="astor-quote-filters" role="group" aria-label="Filter quotations by theme">' + filters + '</div>' +
    '<div class="astor-quote-list">' + cards + '</div>' +
    '<p class="astor-inline-note">Quoted from the ' + escapeHtml(book.sourceText.label) + '.</p>' +
    '</section>';
}

function techniquesPanel(book) {
  if (!book.techniques.length) return '';
  const notes = book.techniques.map(technique =>
    '<article class="astor-note" id="astor-technique-' + escapeHtml(technique.id) + '">' +
    '<h4>' + escapeHtml(technique.name) + '</h4>' +
    '<p>' + escapeHtml(technique.definition) + '</p>' +
    '<p class="astor-note-aside">' + escapeHtml(technique.inThisBook) + '</p>' +
    '</article>'
  ).join('');
  return '<section class="astor-panel" id="astor-techniques" data-panel="Form &amp; language">' +
    '<h3>How it is written</h3>' +
    '<p class="astor-panel-note">' +
    'The <a href="/explore/techniques/">technique glossary</a> shows these terms across the library.</p>' +
    '<div class="astor-note-grid">' + notes + '</div>' +
    '</section>';
}

function contextPanel(book) {
  const timeline = (book.timeline || []).length
    ? '<ol class="astor-spine">' + book.timeline.slice().sort((a, b) => a.year - b.year).map(entry =>
      '<li><span class="astor-stage-label">' + escapeHtml(formatYear(entry.year)) + '</span>' +
      '<div><h4>' + escapeHtml(entry.label) + '</h4>' +
      (entry.detail ? '<p>' + escapeHtml(entry.detail) + '</p>' : '') + '</div><span></span></li>'
    ).join('') + '</ol>'
    : '';
  const views = (book.criticalViews || []).length
    ? '<h4 class="astor-subhead">Ways the book has been read</h4><div class="astor-note-grid">' +
    book.criticalViews.map(view =>
      '<article class="astor-note"><h4>' + escapeHtml(view.position) + '</h4>' +
      '<p>' + escapeHtml(view.summary) + '</p>' +
      (view.counter ? '<p class="astor-note-aside">Against it: ' + escapeHtml(view.counter) + '</p>' : '') +
      '</article>'
    ).join('') + '</div>'
    : '';
  const places = (book.places || []).length
    ? '<h4 class="astor-subhead">Where it happens</h4>' +
    '<div class="astor-book-map-box" data-astor-book-map="' + escapeHtml(book.slug) + '">' +
    '<ul class="astor-place-plain">' + book.places.map(place =>
      '<li><strong>' + escapeHtml(place.name) + '</strong>' + (place.note ? ' — ' + escapeHtml(place.note) : '') + '</li>').join('') + '</ul>' +
    '</div>' +
    '<p class="astor-inline-note"><a href="/explore/map/?book=' + escapeHtml(book.slug) +
    '">Open the full map →</a></p>'
    : '';
  if (!timeline && !views) return '';
  return '<section class="astor-panel" id="astor-context" data-panel="Context">' +
    '<h3>Background</h3>' +
    '<p class="astor-panel-note">Key dates and how the book has been read. ' +
    'See them among the other books on the <a href="/explore/timeline/?view=events&amp;mark=' + escapeHtml(book.slug) + '">library timeline</a>.</p>' +
    timeline + views + places +
    '</section>';
}

function essaysPanel(book) {
  const questions = (book.essayQuestions || []).map((question, index) =>
    '<article class="astor-note">' +
    '<h4>' + escapeHtml(question.question) + '</h4>' +
    (question.focus ? '<p class="astor-note-aside">' + escapeHtml(question.focus) + '</p>' : '') +
    '<ol class="astor-plan">' + (question.plan || []).map(step => '<li>' + escapeHtml(step) + '</li>').join('') + '</ol>' +
    '</article>'
  ).join('');
  const discussion = (book.discussionQuestions || []).length
    ? '<h4 class="astor-subhead">For discussion</h4><ul class="astor-question-list">' +
    book.discussionQuestions.map(question => '<li>' + escapeHtml(question) + '</li>').join('') + '</ul>'
    : '';
  if (!questions && !discussion) return '';
  return '<section class="astor-panel" id="astor-essays" data-panel="Essays">' +
    '<h3>Essay questions</h3>' +
    '<p class="astor-panel-note">Each question has a plan. ' +
    'Build a full plan in the <a href="/play/essay-forge/?book=' + escapeHtml(book.slug) + '">essay planner</a>.</p>' +
    '<div class="astor-note-grid">' + questions + '</div>' + discussion +
    '</section>';
}

const GAMES = [
  ['who-said-it', 'Who said it?', 'Read a line and name who says it.'],
  ['fill-the-line', 'Fill the line', 'Fill in the missing words.'],
  ['theme-match', 'Theme match', 'Match each quotation to its theme.'],
  ['technique-spotter', 'Technique spotter', 'Spot the technique in each quotation.'],
  ['character-identification', 'Who is this?', 'Guess the character from a description.'],
  ['order-the-plot', 'Order the plot', 'Put the plot back in order.'],
  ['mixed-round', 'Mixed questions', 'A few questions of every kind.']
];

function revisePanel(book) {
  const cards = GAMES.map(([id, title, note]) =>
    '<a class="astor-play-card" href="/play/' + id + '/?book=' + escapeHtml(book.slug) + '">' +
    '<span class="astor-play-kind">Quiz</span><h4>' + escapeHtml(title) + '</h4><p>' + escapeHtml(note) + '</p></a>'
  ).join('');
  return '<section class="astor-panel" id="astor-revise" data-panel="Revise">' +
    '<h3>Revise ' + escapeHtml(book.title) + '</h3>' +
    '<p class="astor-panel-note">Test yourself on this book. ' +
    'Scores are saved in this browser.</p>' +
    '<div class="astor-revise-tools">' +
    '<div class="astor-plan" data-astor-plan="' + escapeHtml(book.slug) + '">' +
    '<h4>Plan your reading</h4>' +
    '<p>Pick a finish date and the days you can read, and the ' + (book.form === 'play' ? 'acts' : 'sections') +
    ' are split between them.</p>' +
    '</div>' +
    '<div class="astor-sheet-box" data-astor-sheet="' + escapeHtml(book.slug) + '">' +
    '<h4>Revision sheet</h4>' +
    '<p>Plot, characters, themes and ' + Math.min(8, book.quotations.length) + ' key quotations on one page to print.</p>' +
    '</div>' +
    '</div>' +
    '<div class="astor-play-grid">' + cards +
    '<a class="astor-play-card" href="/play/flashcards/?book=' + escapeHtml(book.slug) + '">' +
    '<span class="astor-play-kind">Flashcards</span><h4>Learn the quotations</h4>' +
    '<p>' + book.quotations.length + ' cards. The ones you get wrong come back sooner.</p></a>' +
    '<a class="astor-play-card" href="/today/"><span class="astor-play-kind">Daily</span><h4>Today’s questions</h4>' +
    '<p>Five questions. New every day.</p></a>' +
    '</div>' +
    '</section>';
}

// Watching. Nothing is embedded until a reader asks for it: the card is plain
// markup, and only a click loads a frame, from youtube-nocookie.com or
// player.vimeo.com. Until then the page contacts neither.
//
// The `videos` array is empty in every record shipped so far, because a video
// id cannot be verified from this environment and an invented one is worse
// than none. Add an entry with a title, provider, id, url and a plain note on
// what it is, and the section appears.
function videosPanel(book) {
  if (!(book.videos || []).length) return '';
  const cards = book.videos.map(video =>
    '<article class="astor-video" data-video-provider="' + escapeHtml(video.provider) + '" data-video-id="' + escapeHtml(video.id) + '">' +
    '<h4>' + escapeHtml(video.title) + '</h4>' +
    '<p>' + escapeHtml(video.note) + '</p>' +
    '<p class="astor-inline-note">' + escapeHtml(video.source || video.provider) + '</p>' +
    '<button class="button secondary" type="button" data-video-play>Play</button> ' +
    '<a class="button secondary" href="' + escapeHtml(video.url) + '" rel="noopener noreferrer">Watch on YouTube</a>' +
    '</article>'
  ).join('');
  return '<section class="astor-panel" id="astor-watch" data-panel="Watch">' +
    '<h3>Worth watching</h3>' +
    '<p class="astor-panel-note">Nothing loads until you press play.</p>' +
    '<div class="astor-note-grid">' + cards + '</div>' +
    '</section>';
}

function relatedPanel(book, titleFor, passages = []) {
  if (!(book.related || []).length && !passages.length) return '';
  const readings = passages.length
    ? '<h4 class="astor-subhead">Close readings of this book</h4>' +
      '<p class="astor-panel-note">Close readings of single passages from this book.</p>' +
      '<div class="astor-note-grid">' + passages.map(passage =>
        '<article class="astor-note"><h4><a href="' + escapeHtml(passage.href) + '">' + escapeHtml(passage.title) + '</a></h4>' +
        '<p>' + escapeHtml(passage.description || '') + '</p></article>'
      ).join('') + '</div>'
    : '';
  const cards = (book.related || []).map(related =>
    '<article class="astor-note"><h4><a href="' + escapeHtml(related.href) + '">' + escapeHtml(titleFor(related.href)) + '</a></h4>' +
    '<p>' + escapeHtml(related.why) + '</p></article>'
  ).join('');
  const related = cards
    ? (readings ? '<h4 class="astor-subhead">Where to go from here</h4>' : '') +
      '<p class="astor-panel-note">Where to go next.</p>' +
      '<div class="astor-note-grid">' + cards + '</div>'
    : '';
  return '<section class="astor-panel" id="astor-related" data-panel="Read next">' +
    '<h3>' + (readings ? 'Closer, and further' : 'Where to go from here') + '</h3>' +
    readings + related +
    '</section>';
}

// Related links carry a reason, not a title: the catalogue already knows what
// each page is called, so the toolkit asks it rather than storing the name twice.
function fallbackTitle(href) {
  return href.replace(/^\/[a-z-]+\//, '').replace(/\/$/, '').replace(/-/g, ' ')
    .replace(/(^|\s)\S/g, character => character.toUpperCase());
}

function renderToolkit(book, { heading, titleFor, passages, showGlance = true } = {}) {
  const resolveTitle = href => (titleFor && titleFor(href)) || fallbackTitle(href);
  const panels = [
    plotPanel(book),
    charactersPanel(book),
    themesPanel(book),
    quotationsPanel(book),
    techniquesPanel(book),
    contextPanel(book),
    essaysPanel(book),
    videosPanel(book),
    revisePanel(book),
    relatedPanel(book, resolveTitle, passages || [])
  ].filter(Boolean);

  const tabs = panels.map((panel, index) => {
    const id = panel.match(/id="([^"]+)"/)[1];
    const label = panel.match(/data-panel="([^"]*)"/)[1];
    return '<button class="astor-tab" type="button" data-tab-target="' + id + '"' +
      (index === 0 ? ' aria-selected="true"' : ' aria-selected="false"') + '>' + label + '</button>';
  }).join('');

  return '<section class="astor-toolkit" id="astor-study-toolkit"' +
    ' style="--book-accent: ' + accentFor(book.slug) + '"' +
    ' data-astor-book="' + escapeHtml(book.slug) + '"' +
    ' data-astor-book-title="' + escapeHtml(book.title) + '"' +
    ' data-astor-book-href="' + escapeHtml(book.href) + '"' +
    ' aria-labelledby="astor-toolkit-title">' +
    '<div class="astor-toolkit-head">' +
    '<div><p class="kicker">' + motifSvg(book, 22) + 'Astor study toolkit</p>' +
    '<h2 id="astor-toolkit-title">' + escapeHtml(heading || ('Work through ' + book.title + '.')) + '</h2>' +
    '<p>Plot, characters, themes, quotations, language, context, essay plans and quizzes.</p></div>' +
    '<div class="astor-toolkit-actions">' +
    '<button class="button secondary" type="button" data-astor-save aria-pressed="false">Save to my library</button>' +
    '<a class="button primary" href="/play/?book=' + escapeHtml(book.slug) + '">Revise this book</a>' +
    '</div>' +
    '</div>' +
    (showGlance ? glance(book) : '') +
    '<div class="astor-tabs" role="tablist" aria-label="Study toolkit sections">' + tabs + '</div>' +
    panels.join('') +
    '</section>';
}

module.exports = { renderToolkit, escapeHtml, readingTimeLabel, formatYear, fallbackTitle, DIFFICULTY_WORDS };

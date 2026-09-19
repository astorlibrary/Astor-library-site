// Renders the Astor study toolkit that build-static.js injects into every book
// page and generated study page that has a data/books/<slug>.json file.
//
// The whole region is written out as plain sequential sections. JavaScript then
// upgrades it into a tabbed panel, adds the save button, the progress ticks,
// the quotation filters and the commonplace-book controls. A reader with no
// JavaScript gets all of the same material, stacked, and nothing is hidden
// from a search engine.

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
      note: 'An unhurried first reading, without notes.'
    });
  }
  if (book.difficulty) {
    cells.push({
      label: 'Going in cold',
      value: DIFFICULTY_WORDS[book.difficulty],
      note: 'Astor rates this ' + book.difficulty + ' out of 5 for first-time readers.'
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
    '<h3>The shape of ' + escapeHtml(book.title) + '</h3>' +
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
    '<p class="astor-panel-note">Each entry says what the character is for, not only what they do. ' +
    'The relationship map shows how the connections change as the ' + (book.form === 'play' ? 'acts' : 'sections') + ' pass.</p>' +
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
    '<h3>What the book keeps returning to</h3>' +
    '<p class="astor-panel-note">Every quotation below is tagged with the themes it carries, so a theme can be followed through the text rather than asserted. ' +
    'The <a href="/explore/themes/">themes explorer</a> sets each of these beside the other books that share it.</p>' +
    '<div class="astor-note-grid">' + notes + '</div>' +
    '</section>';
}

function quotationsPanel(book) {
  const themeNames = new Map(book.themes.map(theme => [theme.id, theme.name]));
  const techniqueNames = new Map(book.techniques.map(technique => [technique.id, technique.name]));
  const characterNames = new Map(book.characters.map(character => [character.id, character.name]));

  const filters = ['<button class="astor-filter" type="button" data-quote-filter="all" aria-pressed="true">Everything</button>']
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
    '<h3>Lines worth knowing, and what to say about them</h3>' +
    '<p class="astor-panel-note">' + book.quotations.length + ' quotations, each checked against the ' +
    escapeHtml(book.sourceText.label) + ' and referenced by ' + escapeHtml(book.referenceStyle) + '.' +
    (book.sourceText.note ? ' ' + escapeHtml(book.sourceText.note) : '') + '</p>' +
    '<div class="astor-quote-filters" role="group" aria-label="Filter quotations by theme">' + filters + '</div>' +
    '<div class="astor-quote-list">' + cards + '</div>' +
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
    '<p class="astor-panel-note">Each term is defined generally and then shown doing a particular job in this text. ' +
    'The <a href="/explore/techniques/">technique glossary</a> collects the same terms across the whole library.</p>' +
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
    '">Open these places on the map of settings →</a></p>'
    : '';
  if (!timeline && !views) return '';
  return '<section class="astor-panel" id="astor-context" data-panel="Context">' +
    '<h3>The book in its moment</h3>' +
    '<p class="astor-panel-note">Dates that matter to the text, and the readings the book has attracted since. ' +
    'The <a href="/explore/timeline/">library timeline</a> sets these beside every other Astor title.</p>' +
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
    '<h3>Questions, and how to answer them</h3>' +
    '<p class="astor-panel-note">Each plan is a route through the text rather than a set of conclusions. ' +
    'The <a href="/play/essay-forge/?book=' + escapeHtml(book.slug) + '">essay forge</a> turns any of them into a paragraph-by-paragraph outline you can keep.</p>' +
    '<div class="astor-note-grid">' + questions + '</div>' + discussion +
    '</section>';
}

const GAMES = [
  ['who-said-it', 'Who said it?', 'A line appears; name the speaker.'],
  ['fill-the-line', 'Fill the line', 'Put the missing words back into a famous speech.'],
  ['theme-match', 'Theme match', 'Decide which theme a quotation is carrying.'],
  ['technique-spotter', 'Technique spotter', 'Name the device doing the work.'],
  ['character-identification', 'Who is this?', 'Identify a character from a description that never names them.'],
  ['order-the-plot', 'Order the plot', 'Put the acts, chapters and scenes back into sequence.'],
  ['mixed-round', 'Mixed round', 'Every kind of question, one book, one run.']
];

function revisePanel(book) {
  const cards = GAMES.map(([id, title, note]) =>
    '<a class="astor-play-card" href="/play/' + id + '/?book=' + escapeHtml(book.slug) + '">' +
    '<span class="astor-play-kind">Game</span><h4>' + escapeHtml(title) + '</h4><p>' + escapeHtml(note) + '</p></a>'
  ).join('');
  return '<section class="astor-panel" id="astor-revise" data-panel="Revise">' +
    '<h3>Revise ' + escapeHtml(book.title) + '</h3>' +
    '<p class="astor-panel-note">Every question in these games is built from the material above, so nothing appears that the page has not already taught. ' +
    'Your scores and your revision streak are kept on this device only.</p>' +
    '<div class="astor-revise-tools">' +
    '<div class="astor-plan" data-astor-plan="' + escapeHtml(book.slug) + '">' +
    '<h4>Plan your reading</h4>' +
    '<p>Choose a finishing date and the days you have free, and the ' + (book.form === 'play' ? 'acts' : 'sections') +
    ' above are shared out across them, with a rough time for each sitting. The plan stays on this device and can be added to your calendar.</p>' +
    '</div>' +
    '<div class="astor-sheet-box" data-astor-sheet="' + escapeHtml(book.slug) + '">' +
    '<h4>One page to take with you</h4>' +
    '<p>The shape of the book, who is who, the themes, ' + Math.min(8, book.quotations.length) + ' lines worth knowing with their references, and three questions to practise on, laid out to print on a single sheet.</p>' +
    '</div>' +
    '</div>' +
    '<div class="astor-play-grid">' + cards +
    '<a class="astor-play-card" href="/play/flashcards/?book=' + escapeHtml(book.slug) + '">' +
    '<span class="astor-play-kind">Flashcards</span><h4>Spaced repetition</h4>' +
    '<p>A deck of ' + book.quotations.length + ' quotations that returns the ones you keep forgetting.</p></a>' +
    '<a class="astor-play-card" href="/today/"><span class="astor-play-kind">Daily</span><h4>The Daily Five</h4>' +
    '<p>Five questions drawn from across the library, the same five for everybody, changing at midnight.</p></a>' +
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
    '<button class="button secondary" type="button" data-video-play>Load the video</button> ' +
    '<a class="button secondary" href="' + escapeHtml(video.url) + '" rel="noopener noreferrer">Watch it on the original site</a>' +
    '</article>'
  ).join('');
  return '<section class="astor-panel" id="astor-watch" data-panel="Watch">' +
    '<h3>Worth watching</h3>' +
    '<p class="astor-panel-note">Nothing here loads until you ask for it, and nothing is embedded from a service that would set a cookie before you do.</p>' +
    '<div class="astor-note-grid">' + cards + '</div>' +
    '</section>';
}

function relatedPanel(book, titleFor, passages = []) {
  if (!(book.related || []).length && !passages.length) return '';
  const readings = passages.length
    ? '<h4 class="astor-subhead">Close readings of this book</h4>' +
      '<p class="astor-panel-note">One passage at a time, with the wording annotated phrase by phrase in the Passage Room.</p>' +
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
      '<p class="astor-panel-note">Connections worth following, each with a reason rather than a category.</p>' +
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

function renderToolkit(book, { heading, titleFor, passages } = {}) {
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
    ' data-astor-book="' + escapeHtml(book.slug) + '"' +
    ' data-astor-book-title="' + escapeHtml(book.title) + '"' +
    ' data-astor-book-href="' + escapeHtml(book.href) + '"' +
    ' aria-labelledby="astor-toolkit-title">' +
    '<div class="astor-toolkit-head">' +
    '<div><p class="kicker">Astor study toolkit</p>' +
    '<h2 id="astor-toolkit-title">' + escapeHtml(heading || ('Work through ' + book.title + '.')) + '</h2>' +
    '<p>Plot, characters, themes, checked quotations with analysis, language, context, essay plans and a set of revision games — all built from the same material, so nothing here contradicts anything else.</p></div>' +
    '<div class="astor-toolkit-actions">' +
    '<button class="button secondary" type="button" data-astor-save aria-pressed="false">Save to my library</button>' +
    '<a class="button primary" href="/play/?book=' + escapeHtml(book.slug) + '">Revise this book</a>' +
    '</div>' +
    '</div>' +
    glance(book) +
    '<div class="astor-tabs" role="tablist" aria-label="Study toolkit sections">' + tabs + '</div>' +
    panels.join('') +
    '</section>';
}

module.exports = { renderToolkit, escapeHtml, readingTimeLabel, formatYear, fallbackTitle, DIFFICULTY_WORDS };

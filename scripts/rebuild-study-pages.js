// Generates the Play, Explore, Today, My Library and For Teachers pages.
//
// These pages share one shell: a hero, a mount point, a plain fallback for
// readers without JavaScript, and an end navigation. Writing them by hand
// twenty times would guarantee that they drifted apart, so the shell lives
// here and each page contributes its own words and its own module.
//
// build-static.js replaces the header and footer on the way to dist/, exactly
// as it does for every other page.

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HEADER = `<header class="site-header">
  <a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt="Astor Library torch"><span class="word">LIBRARY</span></a>
  <nav class="nav" aria-label="Primary navigation"><a class="nav-link" href="/library/">Books</a><a class="nav-link" href="/study/">Study editions</a><a class="nav-link" href="/resources/">Free resources</a><a class="nav-link" href="/play/">Revise</a></nav>
</header>`;

const FOOTER = `<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Classic books, study editions and free literature resources.</p></div><div class="footer-links"><a href="/library/">Books</a><a href="/study/">Study editions</a><a href="/play/">Revise</a><a href="/explore/">Search</a></div></footer>`;

function endNav(links) {
  const all = links.concat([
    { href: '/explore/', label: 'Search the library' },
    { href: '/library/', label: 'All books' },
    { href: '/study/', label: 'Study editions' },
    { href: '/resources/', label: 'Free resources' }
  ]);
  const seen = new Set();
  return '<nav class="book-end-nav" aria-label="End of page">' +
    '<a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a>' +
    all.filter(link => !seen.has(link.href) && seen.add(link.href))
      .map(link => '<a href="' + link.href + '">' + link.label + '</a>').join('') +
    '</nav>';
}

function page({ dir, title, description, kicker, heading, deck, breadcrumb, module: moduleName, intro, mount, fallback, tail, links }) {
  const html = `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="stylesheet" href="/assets/astor-study.css">
  ${moduleName ? `<script type="module" src="/assets/astor/${moduleName}"></script>` : ''}
</head>
<body>
${HEADER}
<main id="main-content" class="page-wrap">
  <nav class="book-breadcrumb" aria-label="Breadcrumb">${breadcrumb}</nav>
  <section class="page-intro">
    <div><p class="kicker">${escapeHtml(kicker)}</p><h1>${escapeHtml(heading)}</h1><p class="deck">${deck}</p></div>
  </section>
${intro || ''}
${mount || ''}
${fallback ? `<noscript><div class="astor-empty">${fallback}</div></noscript>` : ''}
${tail || ''}
  ${endNav(links || [])}
</main>
${FOOTER}
</body>
</html>
`;
  const directory = path.join(root, dir);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), html);
  return dir;
}

// --------------------------------------------------------------- the games

const GAMES = [
  {
    slug: 'who-said-it',
    name: 'Who said it?',
    scope: 'book',
    blurb: 'A line appears with the speaker removed. Name who says it.',
    deck: 'Read a line and name who says it.',
    why: 'Attribution is where quotation marks stop being decoration. Knowing that Lady Macbeth says one line and the Doctor the other is the difference between a paragraph about the play and a paragraph about a character.'
  },
  {
    slug: 'fill-the-line',
    name: 'Fill the line',
    scope: 'book',
    blurb: 'Words are taken out of a famous speech. Put them back.',
    deck: 'Words are missing from a speech. Put them back.',
    why: 'A quotation you can only half remember is a quotation you cannot use. Rebuilding a line word by word is the fastest way to learn it exactly, and the decoys are drawn from the same book so nothing is given away by register alone.'
  },
  {
    slug: 'theme-match',
    name: 'Theme match',
    scope: 'book',
    blurb: 'Decide which theme a quotation is carrying.',
    deck: 'Read a quotation and pick the theme it carries.',
    why: 'Most essays lose marks not for missing a theme but for attaching the wrong evidence to it. This is the drill for that specific habit.'
  },
  {
    slug: 'technique-spotter',
    name: 'Technique spotter',
    scope: 'book',
    blurb: 'Name the device doing the work in a line.',
    deck: 'Name the technique at work in the line.',
    why: 'Naming a device earns nothing on its own. Every answer here pairs the term with the job it is doing in that line, so the habit you build is the useful one.'
  },
  {
    slug: 'character-identification',
    name: 'Who is this?',
    scope: 'book',
    blurb: 'Identify a character from a description that never names them.',
    deck: 'Work out who is being described.',
    why: 'It forces you to hold a character as a set of actions and functions rather than a name attached to a plot summary.'
  },
  {
    slug: 'order-the-plot',
    name: 'Order the plot',
    scope: 'book',
    blurb: 'Put acts, chapters and scenes back into sequence.',
    deck: 'Put the acts, chapters and scenes back in order.',
    why: 'Sequence is an argument. Knowing that the banquet comes after the ambush and before the apparitions is what lets you write about cause instead of listing incidents.'
  },
  {
    slug: 'mixed-round',
    name: 'Mixed questions',
    scope: 'book',
    blurb: 'Every kind of question the book supports, in one run.',
    deck: 'A bit of everything from one book.',
    why: 'Drilling one kind of question teaches the shape of the question as much as the book. A quiz that changes the kind of question every time only rewards knowing the text.'
  },
  {
    slug: 'which-book',
    name: 'Which book?',
    scope: 'library',
    blurb: 'One line from a book in the library. Name the book it comes from.',
    deck: 'One line from anywhere in the library. Name the book.',
    why: 'Reading across titles is how a reader stops treating each book as a separate examination and starts hearing a period.'
  },
  {
    slug: 'context-sprint',
    name: 'Which year?',
    scope: 'library',
    blurb: 'Place an event in the right year.',
    deck: 'Place an event in the right year.',
    why: 'Context marks are lost on decades, not on centuries. The wrong answers here are deliberately close.'
  },
  {
    slug: 'opening-lines',
    name: 'Opening lines',
    scope: 'library',
    blurb: 'Name the book from its first sentence.',
    deck: 'Name the book from its first line.',
    why: 'First sentences carry more of a book than almost any other line in it, and they are the easiest thing in literature to half-know.'
  }
];

// --------------------------------------------------------------- the pages

function buildPages() {
  const written = [];

  // --- Play hub ---
  written.push(page({
    dir: 'play',
    title: 'Revise | Astor Library',
    description: 'Short quizzes on the quotations, characters, themes and plot of each book with a study guide, plus flashcards, an essay planner and five questions a day.',
    kicker: 'Revise',
    heading: 'Revise a book.',
    deck: 'Short quizzes on the quotations, characters and plot, with flashcards and an essay planner. Choose a book to start.',
    breadcrumb: '<a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">Revise</span>',
    module: 'play-hub.mjs',
    intro: `  <section class="astor-dash-grid" id="astor-play-stats" aria-label="Your revision"></section>
  <div class="astor-chooser" id="astor-play-chooser"></div>`,
    mount: `  <section class="section-title" id="single-book"><p class="kicker">One book at a time</p><h2>Quizzes on this book.</h2><p>Every question comes from the book chosen above.</p></section>
  <div class="astor-play-grid" id="astor-play-book-games"></div>
  <section class="section-title" id="whole-library"><p class="kicker">Across the whole library</p><h2>Quizzes across the library.</h2><p>Questions come from every book with a study guide.</p></section>
  <div class="astor-play-grid" id="astor-play-library-games"></div>
  <section class="section-title" id="tools"><p class="kicker">Longer work</p><h2>Flashcards and essay tools.</h2><p>Learn quotations by heart, plan an essay, or argue for and against a reading.</p></section>
  <div class="astor-play-grid" id="astor-play-tools"></div>`,
    fallback: 'The quizzes need JavaScript. The quotations are on the book pages: <a href="/library/">browse the catalogue</a>.',
    tail: '',
    links: [{ href: '/today/', label: 'Today' }, { href: '/my-library/', label: 'My library' }]
  }));

  // --- one page per game ---
  for (const game of GAMES) {
    written.push(page({
      dir: 'play/' + game.slug,
      title: game.name + ' | Astor Library',
      description: game.blurb + ' A free revision quiz from Astor Library.',
      kicker: game.scope === 'book' ? 'Revision quiz · one book' : 'Revision quiz · every book',
      heading: game.name,
      deck: game.deck,
      breadcrumb: '<a href="/play/">Revise</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(game.name) + '</span>',
      module: 'game.mjs',
      intro: game.scope === 'book' ? '  <div class="astor-chooser" id="astor-game-chooser"></div>' : '',
      mount: `  <div class="astor-game" id="astor-game" data-game="${escapeHtml(game.slug)}" data-scope="${game.scope}"></div>`,
      fallback: 'This quiz needs JavaScript. The quotations are on the book pages: <a href="/library/">browse the catalogue</a>.',
      tail: '  <p class="astor-inline-note">Keyboard: 1 picks A, 2 picks B and so on. Enter checks and moves on. R restarts.</p>',
      links: [{ href: '/play/', label: 'Revise' }, { href: '/today/', label: 'Today' }]
    }));
  }

  // --- flashcards ---
  written.push(page({
    dir: 'play/flashcards',
    title: 'Flashcards | Astor Library',
    description: 'Flashcards for the quotations in each Astor Library study guide, set so the lines you keep forgetting come back sooner.',
    kicker: 'Flashcards',
    heading: 'Flashcards.',
    deck: 'A deck for each book. Cards you get wrong come back sooner.',
    breadcrumb: '<a href="/play/">Revise</a><span aria-hidden="true">/</span><span aria-current="page">Flashcards</span>',
    module: 'flashcards.mjs',
    intro: '  <div class="astor-chooser" id="astor-deck-chooser"></div>',
    mount: '  <div class="astor-game" id="astor-flashcards"></div>',
    fallback: 'The flashcards need JavaScript. The same quotations are on each book page.',
    tail: '  <p class="astor-inline-note">Your cards are saved in this browser only.</p>',
    links: [{ href: '/play/', label: 'Revise' }, { href: '/my-library/', label: 'My library' }]
  }));

  // --- essay forge ---
  written.push(page({
    dir: 'play/essay-forge',
    title: 'Essay planner | Astor Library',
    description: 'Build an essay plan: choose a question, take a line of argument and attach quotations to each paragraph.',
    kicker: 'Planning tool',
    heading: 'Essay planner.',
    deck: 'Choose a question and build the plan paragraph by paragraph.',
    breadcrumb: '<a href="/play/">Revise</a><span aria-hidden="true">/</span><span aria-current="page">Essay planner</span>',
    module: 'essay-forge.mjs',
    intro: '  <div class="astor-chooser" id="astor-essay-chooser"></div>',
    mount: '  <div id="astor-essay-forge"></div>',
    fallback: 'The planner needs JavaScript. Every book page has essay questions with a plan for each.',
    tail: '',
    links: [{ href: '/play/', label: 'Revise' }, { href: '/for-teachers/', label: 'For teachers' }]
  }));

  // --- defend the reading ---
  written.push(page({
    dir: 'play/defend-the-reading',
    title: 'Defend the reading | Astor Library',
    description: 'Argue for a reading of a book, then read the strongest case against it, with quotations for both sides.',
    kicker: 'Argument tool',
    heading: 'Defend the reading.',
    deck: 'Take a side on a reading of the book, choose quotations to support it, then answer the objection.',
    breadcrumb: '<a href="/play/">Revise</a><span aria-hidden="true">/</span><span aria-current="page">Defend the reading</span>',
    module: 'defend.mjs',
    intro: '  <div class="astor-chooser" id="astor-defend-chooser"></div>',
    mount: '  <div id="astor-defend"></div>',
    fallback: 'This needs JavaScript. The readings are on each book page under “The book in its moment”.',
    tail: '  <p class="astor-inline-note">These readings are described in Astor Library’s own words. No critic is quoted.</p>',
    links: [{ href: '/play/', label: 'Revise' }, { href: '/explore/quotations/', label: 'Quotation explorer' }]
  }));

  // --- today ---
  written.push(page({
    dir: 'today',
    title: 'Today at Astor Library',
    description: 'A passage of the day, a literary anniversary and five quick questions, new every morning.',
    kicker: 'Today',
    heading: 'Astor today.',
    deck: 'A passage, a book and five questions. New every day.',
    breadcrumb: '<a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">Today</span>',
    module: 'daily.mjs',
    intro: '  <div class="astor-daily-strip" id="astor-daily-strip"></div>',
    mount: '  <div class="astor-game" id="astor-daily-game"></div>',
    fallback: 'Today’s questions need JavaScript. The close readings in the <a href="/passage-room/">Passage Room</a> work without it.',
    tail: '  <p class="astor-inline-note">Everyone gets the same five questions each day.</p>',
    links: [{ href: '/play/', label: 'Revise' }, { href: '/my-library/', label: 'My library' }]
  }));

  // --- explore: quotations ---
  written.push(page({
    dir: 'explore/quotations',
    title: 'Quotation explorer | Astor Library',
    description: 'Search every quotation in the Astor Library study guides by word or speaker, or narrow them by book, character, theme, technique or period.',
    kicker: 'Explore',
    heading: 'Every quotation.',
    deck: 'Every quotation in the study guides, each checked word for word against its source text. Search by word or speaker, or narrow by book, character, theme or technique.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Quotations</span>',
    module: 'quotation-explorer.mjs',
    mount: `  <div class="astor-qx">
    <form class="astor-qx-controls" id="astor-quote-filters" aria-label="Filter quotations"></form>
    <p class="astor-explorer-count" id="astor-quote-count" aria-live="polite">Loading quotations&hellip;</p>
    <div id="astor-quote-results"></div>
  </div>`,
    fallback: 'This needs JavaScript. Every quotation is also on its own book page.',
    links: [{ href: '/explore/techniques/', label: 'Technique glossary' }, { href: '/play/', label: 'Revise' }]
  }));

  // --- explore: timeline ---
  written.push(page({
    dir: 'explore/timeline',
    title: 'Literature timeline | Astor Library',
    description: 'Every book with an Astor Library study guide, in order of first publication, with the dates around each one: when it was written and performed, the history it came out of, and what happened to it afterwards.',
    kicker: 'Explore',
    heading: 'When each book appeared.',
    deck: 'Every book with a study guide, in order of first publication. Open a book to see its own dates, or switch to every date to see what else was happening at the time.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Timeline</span>',
    module: 'chronology.mjs',
    mount: `  <div id="astor-timeline-controls" class="astor-tl-controls"></div>
  <nav class="astor-tl-jump" id="astor-timeline-jump" aria-label="Jump to a century" hidden></nav>
  <div class="astor-tl" id="astor-timeline"><p class="astor-tl-summary">Loading the timeline&hellip;</p></div>`,
    fallback: 'The timeline needs JavaScript. Each book page has its own dates under “The book in its moment”.',
    links: [{ href: '/explore/map/', label: 'Map of settings' }, { href: '/classic-literature/', label: 'Periods' }]
  }));

  // --- explore: characters ---
  written.push(page({
    dir: 'explore/characters',
    title: 'Character maps | Astor Library',
    description: 'Character maps for each Astor Library study guide, showing how the connections change act by act or section by section.',
    kicker: 'Explore',
    heading: 'Character maps.',
    deck: 'Pick a book to see how its characters are linked, then choose an act or section to see who is connected at that point.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Character maps</span>',
    module: 'characters.mjs',
    intro: '  <div class="astor-chooser" id="astor-character-chooser"></div>',
    mount: `  <div class="astor-stage-switch" id="astor-stage-switch"></div>
  <div class="astor-graph-wrap"><div id="astor-character-graph"></div></div>
  <div id="astor-character-detail"></div>`,
    fallback: 'The maps need JavaScript. Every character is described on the book page.',
    links: [{ href: '/play/character-identification/', label: 'Who is this?' }, { href: '/library/', label: 'All books' }]
  }));

  // --- explore: themes ---
  written.push(page({
    dir: 'explore/themes',
    title: 'Themes across the library | Astor Library',
    description: 'Every theme in the Astor Library catalogue, book by book, with the quotations that carry it.',
    kicker: 'Explore',
    heading: 'Themes across the library.',
    deck: 'Search for a theme or a book. Each theme lists the books that deal with it, with a quotation from each.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Themes</span>',
    module: 'themes.mjs',
    mount: `  <div class="astor-chooser" id="astor-theme-search"></div>
  <div id="astor-theme-list"></div>`,
    fallback: 'This needs JavaScript. Each book page covers its own themes.',
    links: [{ href: '/explore/quotations/', label: 'Quotation explorer' }, { href: '/explore/compare/', label: 'Compare two texts' }]
  }));

  // --- explore: techniques ---
  written.push(page({
    dir: 'explore/techniques',
    title: 'Technique glossary | Astor Library',
    description: 'A glossary of literary techniques, each explained and shown at work in a line from a book.',
    kicker: 'Explore',
    heading: 'Technique glossary.',
    deck: 'What each term means, with a line from a book using it.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Technique glossary</span>',
    module: 'techniques.mjs',
    mount: `  <div class="astor-chooser" id="astor-technique-search"></div>
  <div id="astor-technique-list"></div>`,
    fallback: 'The glossary needs JavaScript. Each book page has a “How it is written” section.',
    links: [{ href: '/play/technique-spotter/', label: 'Technique spotter' }, { href: '/explore/quotations/', label: 'Quotation explorer' }]
  }));

  // --- explore: map ---
  written.push(page({
    dir: 'explore/map',
    title: 'Map of settings | Astor Library',
    description: 'Where the books are set: an interactive map of the places in the Astor Library catalogue, with what happens at each.',
    kicker: 'Explore',
    heading: 'Map of settings.',
    deck: 'The places where the books are set, on one map. Choose a book or a region to narrow it down.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Map of settings</span>',
    module: 'map.mjs',
    intro: '  <div class="astor-chooser" id="astor-map-controls"></div>',
    mount: `  <div class="astor-graph-wrap"><div id="astor-map"></div></div>
  <div id="astor-map-list"></div>`,
    fallback: 'The map needs JavaScript. Each book page names its settings in the “At a glance” panel.',
    tail: '',
    links: [{ href: '/explore/timeline/', label: 'Timeline' }, { href: '/subjects/travel-and-landscape/', label: 'Travel &amp; landscape' }]
  }));

  // --- explore: compare ---
  written.push(page({
    dir: 'explore/compare',
    title: 'Compare two texts | Astor Library',
    description: 'Put two Astor Library titles side by side: shared themes and techniques, and paired quotations.',
    kicker: 'Explore',
    heading: 'Compare two books.',
    deck: 'Choose two books to see the themes and techniques they share, with a quotation from each book for every shared theme.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Compare</span>',
    module: 'compare.mjs',
    intro: '  <div class="astor-chooser" id="astor-compare-chooser"></div>',
    mount: '  <div id="astor-compare"></div>',
    fallback: 'This needs JavaScript. Each book page lists its own themes and techniques.',
    links: [{ href: '/reading-routes/', label: 'Reading routes' }, { href: '/explore/quotations/', label: 'Quotation explorer' }]
  }));

  // --- offline ---
  written.push(page({
    dir: 'offline',
    title: 'Offline | Astor Library',
    description: 'What Astor Library keeps on your device for reading and revising without a connection.',
    kicker: 'Offline',
    heading: 'Saved for offline reading.',
    deck: 'These pages are saved on this device and open without a connection.',
    breadcrumb: '<a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">Offline</span>',
    module: 'offline.mjs',
    mount: '  <div id="astor-offline-list"><p class="astor-inline-note">Checking what is saved\u2026</p></div>',
    fallback: 'This page lists what your browser has kept, which needs JavaScript.',
    links: [{ href: '/play/', label: 'Revise' }, { href: '/my-library/', label: 'My library' }]
  }));

  // --- my library ---
  written.push(page({
    dir: 'my-library',
    title: 'My library | Astor Library',
    description: 'Your saved books, recent pages, reading progress, scores and kept quotations, all in your browser.',
    kicker: 'My library',
    heading: 'What you have been reading.',
    deck: 'Your saved books, reading progress, scores and kept quotations, all stored in this browser.',
    breadcrumb: '<a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">My library</span>',
    module: 'my-library.mjs',
    mount: `  <section class="astor-dash-grid" id="astor-dash" aria-label="Your reading at a glance"></section>
  <section class="section-title" id="saved"><p class="kicker">Saved</p><h2>Books you have kept.</h2><p>Saved from any book page with the button in the study toolkit.</p></section>
  <div id="astor-saved"></div>
  <section class="section-title" id="progress"><p class="kicker">Progress</p><h2>Reading progress.</h2><p>The acts and sections you have marked as read.</p></section>
  <div id="astor-progress"></div>
  <section class="section-title" id="recent"><p class="kicker">Recently viewed</p><h2>Recent pages.</h2><p>The last pages you opened on this device.</p></section>
  <div id="astor-recent"></div>
  <section class="section-title" id="commonplace"><p class="kicker">Commonplace book</p><h2>Quotations you have kept.</h2><p>Add a note to any of them. The whole book exports as plain text.</p></section>
  <div id="astor-commonplace"></div>
  <section class="section-title" id="plans"><p class="kicker">Reading plans</p><h2>What to read next, and when.</h2><p>Plans made from the Revise tab on a book page: the next sitting, and how far along you are.</p></section>
  <div id="astor-plans"></div>
  <section class="section-title" id="scores"><p class="kicker">Revision</p><h2>Scores and streak.</h2><p>Your best score in each quiz, and how many days in a row you have revised.</p></section>
  <div id="astor-scores"></div>`,
    fallback: 'This page needs JavaScript to read what your browser has saved.',
    tail: `  <section class="section-title" id="data"><p class="kicker">Your data</p><h2>Download or clear your data.</h2></section>
  <p class="deck">Everything here is saved in this browser only.</p>
  <div class="button-row" id="astor-data-controls"></div>`,
    links: [{ href: '/play/', label: 'Revise' }, { href: '/today/', label: 'Today' }]
  }));

  // --- for teachers ---
  written.push(page({
    dir: 'for-teachers',
    title: 'For teachers | Astor Library',
    description: 'Lesson starters, printable worksheets, discussion questions and a projector mode, free to use in class.',
    kicker: 'For teachers',
    heading: 'Worksheets and lesson starters.',
    deck: 'Choose a book, then print a worksheet or show its quotations and questions in projector mode.',
    breadcrumb: '<a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">For teachers</span>',
    module: 'teachers.mjs',
    intro: '  <div class="astor-chooser" id="astor-teacher-chooser"></div>',
    mount: `  <div class="button-row" id="astor-teacher-actions"></div>
  <div id="astor-teacher-output"></div>
  <div class="astor-projector" id="astor-projector" hidden></div>`,
    fallback: 'The worksheets need JavaScript. Every book page has its questions and quotations ready to print.',
    tail: `  <p class="astor-inline-note">Worksheets print straight from your browser. Free to use in class.</p>
  <p class="astor-inline-note">Projector mode: open it from the buttons above, then use the arrow keys. Escape closes it.</p>`,
    links: [{ href: '/resources/', label: 'Free resources' }, { href: '/study/', label: 'Study editions' }]
  }));

  return written;
}

const written = buildPages();
console.log('Rebuilt ' + written.length + ' study, play and explore pages.');

module.exports = { GAMES, buildPages };

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
  <nav class="nav" aria-label="Primary navigation"><a class="nav-link" href="/library/">Books</a><a class="nav-link" href="/study/">Study editions</a><a class="nav-link" href="/resources/">Free resources</a><a class="nav-link" href="/play/">Play &amp; revise</a></nav>
</header>`;

const FOOTER = `<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Classic books, study editions and free literature resources.</p></div><div class="footer-links"><a href="/library/">Books</a><a href="/study/">Study editions</a><a href="/play/">Play &amp; revise</a><a href="/explore/">Search</a></div></footer>`;

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
    deck: 'A line appears without its speaker. Name who says it, and read why it matters to them rather than to anybody else in the book.',
    why: 'Attribution is where quotation marks stop being decoration. Knowing that Lady Macbeth says one line and the Doctor the other is the difference between a paragraph about the play and a paragraph about a character.'
  },
  {
    slug: 'fill-the-line',
    name: 'Fill the line',
    scope: 'book',
    blurb: 'Words are taken out of a famous speech. Put them back.',
    deck: 'Words are taken out of a speech and mixed into a bank with decoys. Put the right ones back where they belong.',
    why: 'A quotation you can only half remember is a quotation you cannot use. Rebuilding a line word by word is the fastest way to learn it exactly, and the decoys are drawn from the same book so nothing is given away by register alone.'
  },
  {
    slug: 'theme-match',
    name: 'Theme match',
    scope: 'book',
    blurb: 'Decide which theme a quotation is carrying.',
    deck: 'A quotation appears; choose the theme it carries. Every answer comes back with the reason it is that theme and not the neighbouring one.',
    why: 'Most essays lose marks not for missing a theme but for attaching the wrong evidence to it. This is the drill for that specific habit.'
  },
  {
    slug: 'technique-spotter',
    name: 'Technique spotter',
    scope: 'book',
    blurb: 'Name the device doing the work in a line.',
    deck: 'Name the technique at work in a quotation — and then read what it is actually doing there, which is the half most technique lists leave out.',
    why: 'Naming a device earns nothing on its own. Every answer here pairs the term with the job it is doing in that line, so the habit you build is the useful one.'
  },
  {
    slug: 'character-identification',
    name: 'Who is this?',
    scope: 'book',
    blurb: 'Identify a character from a description that never names them.',
    deck: 'A character is described without being named. Work out who it is from what they do, what they want and what the book uses them for.',
    why: 'It forces you to hold a character as a set of actions and functions rather than a name attached to a plot summary.'
  },
  {
    slug: 'order-the-plot',
    name: 'Order the plot',
    scope: 'book',
    blurb: 'Put acts, chapters and scenes back into sequence.',
    deck: 'Acts, chapters and scenes arrive shuffled. Put them back into the order the book actually uses.',
    why: 'Sequence is an argument. Knowing that the banquet comes after the ambush and before the apparitions is what lets you write about cause instead of listing incidents.'
  },
  {
    slug: 'which-book',
    name: 'Which book?',
    scope: 'library',
    blurb: 'One line, every Astor title. Name the book it comes from.',
    deck: 'A line is drawn from anywhere in the library. Name the book. The wrong answers are chosen from the same kind of writing, so period and form will not save you.',
    why: 'Reading across titles is how a reader stops treating each book as a separate examination and starts hearing a period.'
  },
  {
    slug: 'context-sprint',
    name: 'Context sprint',
    scope: 'library',
    blurb: 'Place an event in the right year.',
    deck: 'An event appears — a first performance, a publication, a political crisis. Place it in the right year, against three near misses rather than three centuries.',
    why: 'Context marks are lost on decades, not on centuries. The wrong answers here are deliberately close.'
  },
  {
    slug: 'opening-lines',
    name: 'Opening lines',
    scope: 'library',
    blurb: 'Name the book from its first sentence.',
    deck: 'The first line of a book, and four titles. Openings are where a writer tells you how to read everything that follows.',
    why: 'First sentences carry more of a book than almost any other line in it, and they are the easiest thing in literature to half-know.'
  }
];

// --------------------------------------------------------------- the pages

function buildPages() {
  const written = [];

  // --- Play hub ---
  written.push(page({
    dir: 'play',
    title: 'Play & revise | Astor Library',
    description: 'Nine revision games, spaced-repetition flashcards, an essay planner and a daily puzzle, all built from the same checked quotations as the book pages.',
    kicker: 'Play & revise',
    heading: 'Revision that comes from the books.',
    deck: 'Every question in every game here is generated from the same checked quotations, characters and themes that appear on the book pages. Nothing is invented for a quiz, so nothing you learn playing will contradict what you read studying.',
    breadcrumb: '<a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">Play &amp; revise</span>',
    module: 'play-hub.mjs',
    intro: `  <section class="astor-dash-grid" id="astor-play-stats" aria-label="Your revision"></section>
  <div class="astor-chooser" id="astor-play-chooser"></div>`,
    mount: `  <section class="section-title" id="single-book"><p class="kicker">One book at a time</p><h2>Games that take a single title.</h2><p>Choose a book above and these six will draw every question from it.</p></section>
  <div class="astor-play-grid" id="astor-play-book-games"></div>
  <section class="section-title" id="whole-library"><p class="kicker">Across the whole library</p><h2>Games that range over everything.</h2><p>These three mix titles, periods and forms, which is harder and considerably more useful.</p></section>
  <div class="astor-play-grid" id="astor-play-library-games"></div>
  <section class="section-title" id="tools"><p class="kicker">Longer work</p><h2>Not a game, but not reading either.</h2><p>Three tools for the part of revision that a quiz cannot reach: memorising, planning and arguing.</p></section>
  <div class="astor-play-grid" id="astor-play-tools"></div>`,
    fallback: 'The games need JavaScript. The material they are built from is on the book pages themselves: <a href="/library/">browse the catalogue</a> and open any title with a study toolkit.',
    tail: `  <section class="section-title"><p class="kicker">How it works</p><h2>Where the questions come from.</h2><p>Nothing here is a separate question bank.</p></section>
  <div class="astor-note-grid">
    <article class="astor-note"><h4>One source</h4><p>Each title has a single structured record holding its plot, characters, themes, techniques and quotations. The book page, the study page, the explorers and all nine games read that one record.</p></article>
    <article class="astor-note"><h4>Checked quotations</h4><p>Every line used as a question was located in a public-domain text before it was published, and carries its act, scene and line or its chapter. A line that could not be found was left out.</p></article>
    <article class="astor-note"><h4>Kept on your device</h4><p>Scores, streaks and flashcard schedules are stored in your browser. There is no account, no server and nothing sent anywhere. Clearing your browser data clears them.</p></article>
  </div>`,
    links: [{ href: '/today/', label: 'The Daily Five' }, { href: '/my-library/', label: 'My library' }]
  }));

  // --- one page per game ---
  for (const game of GAMES) {
    written.push(page({
      dir: 'play/' + game.slug,
      title: game.name + ' | Astor Library',
      description: game.blurb + ' A revision game built from checked quotations in the Astor Library catalogue.',
      kicker: game.scope === 'book' ? 'Revision game · one book' : 'Revision game · whole library',
      heading: game.name,
      deck: game.deck,
      breadcrumb: '<a href="/play/">Play &amp; revise</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(game.name) + '</span>',
      module: 'game.mjs',
      intro: game.scope === 'book' ? '  <div class="astor-chooser" id="astor-game-chooser"></div>' : '',
      mount: `  <div class="astor-game" id="astor-game" data-game="${escapeHtml(game.slug)}" data-scope="${game.scope}"></div>`,
      fallback: 'This game needs JavaScript. The quotations and characters it draws on are all on the book pages: <a href="/library/">browse the catalogue</a>.',
      tail: `  <section class="section-title"><p class="kicker">Why this one</p><h2>What it is for.</h2></section>
  <p class="deck">${escapeHtml(game.why)}</p>
  <p class="astor-inline-note">Keyboard: number keys choose an answer, Enter checks and moves on, R restarts at the end.</p>`,
      links: [{ href: '/play/', label: 'All games' }, { href: '/today/', label: 'The Daily Five' }]
    }));
  }

  // --- flashcards ---
  written.push(page({
    dir: 'play/flashcards',
    title: 'Flashcards | Astor Library',
    description: 'Spaced-repetition flashcard decks built from the checked quotations for each Astor title, scheduled so the lines you keep forgetting come back soonest.',
    kicker: 'Spaced repetition',
    heading: 'Flashcards that know what you forget.',
    deck: 'A deck for each title, built from its checked quotations. Answer a card correctly and it comes back later; get it wrong and it returns tomorrow. The schedule runs on five boxes at one, two, four, eight and sixteen days.',
    breadcrumb: '<a href="/play/">Play &amp; revise</a><span aria-hidden="true">/</span><span aria-current="page">Flashcards</span>',
    module: 'flashcards.mjs',
    intro: '  <div class="astor-chooser" id="astor-deck-chooser"></div>',
    mount: '  <div class="astor-game" id="astor-flashcards"></div>',
    fallback: 'The flashcards need JavaScript. The same quotations, with analysis, are on each book page.',
    tail: `  <section class="section-title"><p class="kicker">How the schedule works</p><h2>Why the same card keeps coming back.</h2></section>
  <p class="deck">Spacing beats repetition. A card you answer correctly moves up a box and is not shown again for twice as long; a card you miss drops to the first box and returns the next day. Over a fortnight that means most of your time goes on the fifteen lines you cannot hold rather than the forty you already know.</p>
  <p class="astor-inline-note">Your schedule is kept in this browser only. It is not sent anywhere and it does not follow you to another device.</p>`,
    links: [{ href: '/play/', label: 'All games' }, { href: '/my-library/', label: 'My library' }]
  }));

  // --- essay forge ---
  written.push(page({
    dir: 'play/essay-forge',
    title: 'Essay forge | Astor Library',
    description: 'Build an essay plan from a real question: choose a line of argument, attach checked quotations to each paragraph and export the plan.',
    kicker: 'Planning tool',
    heading: 'Essay forge.',
    deck: 'Choose a question, take a position, and build the plan paragraph by paragraph. Each paragraph asks for a point, the evidence that carries it and what the evidence is doing. The quotations come from the same checked set as the book page, so nothing you attach will turn out to be misremembered.',
    breadcrumb: '<a href="/play/">Play &amp; revise</a><span aria-hidden="true">/</span><span aria-current="page">Essay forge</span>',
    module: 'essay-forge.mjs',
    intro: '  <div class="astor-chooser" id="astor-essay-chooser"></div>',
    mount: '  <div id="astor-essay-forge"></div>',
    fallback: 'The planner needs JavaScript. Every book page carries four essay questions with a five-step plan for each.',
    tail: `  <section class="section-title"><p class="kicker">The shape it teaches</p><h2>Point, evidence, effect, and then the argument.</h2></section>
  <div class="astor-note-grid">
    <article class="astor-note"><h4>A point is a claim, not a topic</h4><p>“Ambition” is a topic. “The play refuses to let ambition be a motive, because Macbeth cannot name a reason for the murder” is a point. The forge will not accept a paragraph without one.</p></article>
    <article class="astor-note"><h4>Evidence is quoted exactly</h4><p>Pick from the checked quotations and the reference comes with it. A quotation typed from memory is the commonest way an otherwise good paragraph becomes unusable.</p></article>
    <article class="astor-note"><h4>Effect is the analysis</h4><p>Say what the language is doing, not what it means in other words. If your sentence could begin “this shows that”, write the next sentence instead.</p></article>
  </div>`,
    links: [{ href: '/play/', label: 'All games' }, { href: '/for-teachers/', label: 'For teachers' }]
  }));

  // --- defend the reading ---
  written.push(page({
    dir: 'play/defend-the-reading',
    title: 'Defend the reading | Astor Library',
    description: 'Argue for a reading of a text against the strongest case on the other side, with checked quotations on both sides of the question.',
    kicker: 'Argument tool',
    heading: 'Defend the reading.',
    deck: 'A critical position appears, along with the strongest objection to it. Assemble the evidence for your side, then read the case against and decide whether it survives. It is the part of literary argument a quiz cannot test: holding two defensible readings at once and choosing between them for a reason.',
    breadcrumb: '<a href="/play/">Play &amp; revise</a><span aria-hidden="true">/</span><span aria-current="page">Defend the reading</span>',
    module: 'defend.mjs',
    intro: '  <div class="astor-chooser" id="astor-defend-chooser"></div>',
    mount: '  <div id="astor-defend"></div>',
    fallback: 'This tool needs JavaScript. The critical positions it uses are printed on each book page under “The book in its moment”.',
    tail: `  <p class="astor-inline-note">The positions described here are ways the books have been read, written in Astor Library’s own words. No words are attributed to a named critic.</p>`,
    links: [{ href: '/play/', label: 'All games' }, { href: '/explore/quotations/', label: 'Quotation explorer' }]
  }));

  // --- today ---
  written.push(page({
    dir: 'today',
    title: 'Today at Astor Library',
    description: 'A passage of the day, a literary anniversary and the Daily Five puzzle — the same five questions for everybody, changing at midnight.',
    kicker: 'Today',
    heading: 'Astor today.',
    deck: 'A passage chosen for the day, whatever happened in literature on this date, and five questions drawn from across the library. Everybody gets the same five, they change at midnight, and the result is a small grid you can share without giving anything away.',
    breadcrumb: '<a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">Today</span>',
    module: 'daily.mjs',
    intro: '  <div class="astor-daily-strip" id="astor-daily-strip"></div>',
    mount: '  <div class="astor-game" id="astor-daily-game"></div>',
    fallback: 'Today’s puzzle needs JavaScript. The <a href="/passage-room/">Passage Room</a> has ninety close readings that need nothing but a browser.',
    tail: `  <section class="section-title"><p class="kicker">How today is chosen</p><h2>The same five for everybody, with no server involved.</h2></section>
  <p class="deck">The date itself is the seed. Every browser runs the same arithmetic on it and arrives at the same five questions, so two readers comparing grids are comparing the same puzzle. Nothing is sent anywhere and nothing is recorded except on your own device.</p>`,
    links: [{ href: '/play/', label: 'All games' }, { href: '/my-library/', label: 'My library' }]
  }));

  // --- explore: quotations ---
  written.push(page({
    dir: 'explore/quotations',
    title: 'Quotation explorer | Astor Library',
    description: 'Search and filter every checked quotation in the Astor Library catalogue by book, theme, character, technique and period.',
    kicker: 'Explore',
    heading: 'Every quotation, filterable.',
    deck: 'Filter the whole library by theme, technique, character, period or form, and read what each line is doing rather than only that it exists. Every quotation carries its reference and the text it was checked against.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Quotations</span>',
    module: 'quotations.mjs',
    mount: `  <div class="astor-explorer-layout">
    <form class="astor-explorer-filters" id="astor-quote-filters" aria-label="Filter quotations"></form>
    <div><p class="astor-explorer-count" id="astor-quote-count">Loading quotations&hellip;</p><div class="astor-quote-list" id="astor-quote-results"></div></div>
  </div>`,
    fallback: 'The explorer needs JavaScript. Every quotation it holds is printed, with its analysis, on the book page it belongs to.',
    links: [{ href: '/explore/techniques/', label: 'Technique glossary' }, { href: '/play/', label: 'Play &amp; revise' }]
  }));

  // --- explore: timeline ---
  written.push(page({
    dir: 'explore/timeline',
    title: 'Literature timeline | Astor Library',
    description: 'An interactive timeline placing every Astor Library title against its historical moment and against the other books in the catalogue.',
    kicker: 'Explore',
    heading: 'The books against their moment.',
    deck: 'Publication, first performance and the political weather each book was written into, laid on one scale. Filter by period or by kind of event, and see which books were being written at the same time as which.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Timeline</span>',
    module: 'timeline.mjs',
    mount: `  <div id="astor-timeline-controls" class="astor-chooser"></div>
  <div class="astor-timeline" id="astor-timeline"></div>
  <div class="astor-timeline-detail" id="astor-timeline-detail" hidden></div>`,
    fallback: 'The timeline needs JavaScript. Each book page carries its own dated context under “The book in its moment”.',
    links: [{ href: '/explore/map/', label: 'Map of settings' }, { href: '/classic-literature/', label: 'Periods' }]
  }));

  // --- explore: characters ---
  written.push(page({
    dir: 'explore/characters',
    title: 'Character maps | Astor Library',
    description: 'Relationship diagrams for the characters in each Astor Library title, showing how the connections change act by act.',
    kicker: 'Explore',
    heading: 'Who is connected to whom, and when.',
    deck: 'A relationship diagram for each title. Marriages, alliances, rivalries and enmities are drawn as they stand, and the map redraws for each act or section so you can watch a household come apart in the right order.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Character maps</span>',
    module: 'characters.mjs',
    intro: '  <div class="astor-chooser" id="astor-character-chooser"></div>',
    mount: `  <div class="astor-stage-switch" id="astor-stage-switch"></div>
  <div class="astor-graph-wrap"><div id="astor-character-graph"></div></div>
  <div id="astor-character-detail"></div>`,
    fallback: 'The maps need JavaScript. Every character, with their role and their connections, is described on the book page.',
    links: [{ href: '/play/character-identification/', label: 'Who is this?' }, { href: '/library/', label: 'All books' }]
  }));

  // --- explore: techniques ---
  written.push(page({
    dir: 'explore/techniques',
    title: 'Technique glossary | Astor Library',
    description: 'A glossary of literary techniques, each defined and then shown at work in checked quotations from across the Astor Library catalogue.',
    kicker: 'Explore',
    heading: 'Literary terms, with the evidence attached.',
    deck: 'Every term is defined once and then shown doing a particular job in a particular line, across as many books as use it. A glossary that only defines is a glossary you cannot write from.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Technique glossary</span>',
    module: 'techniques.mjs',
    mount: `  <div class="astor-chooser" id="astor-technique-search"></div>
  <div id="astor-technique-list"></div>`,
    fallback: 'The glossary needs JavaScript. Each book page has a “How it is written” section covering the same terms for that title.',
    links: [{ href: '/play/technique-spotter/', label: 'Technique spotter' }, { href: '/explore/quotations/', label: 'Quotation explorer' }]
  }));

  // --- explore: map ---
  written.push(page({
    dir: 'explore/map',
    title: 'Map of settings | Astor Library',
    description: 'Where the books are set: an interactive map of the places in the Astor Library catalogue, with what happens at each.',
    kicker: 'Explore',
    heading: 'Where the books happen.',
    deck: 'Inverness, Thornfield, Transylvania, the Pequod’s track. Every place a book in this catalogue puts you, plotted on one map, with a note on what happens there.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Map of settings</span>',
    module: 'map.mjs',
    intro: '  <div class="astor-chooser" id="astor-map-controls"></div>',
    mount: `  <div class="astor-graph-wrap"><div id="astor-map"></div></div>
  <div id="astor-map-list"></div>`,
    fallback: 'The map needs JavaScript. Each book page names its settings in the “At a glance” panel.',
    tail: '  <p class="astor-inline-note">The map is drawn from coordinates held with each book’s record; it loads no tiles and contacts no third party.</p>',
    links: [{ href: '/explore/timeline/', label: 'Timeline' }, { href: '/subjects/travel-and-landscape/', label: 'Travel &amp; landscape' }]
  }));

  // --- explore: compare ---
  written.push(page({
    dir: 'explore/compare',
    title: 'Compare two texts | Astor Library',
    description: 'Set two Astor Library titles side by side: shared themes and techniques, contrasting form and context, and paired quotations for a comparative essay.',
    kicker: 'Explore',
    heading: 'Two books, side by side.',
    deck: 'Choose any two titles. The tool finds the themes and techniques they share, sets their form, period and structure against each other, and pairs quotations that carry the same theme in both — which is where a comparative paragraph actually starts.',
    breadcrumb: '<a href="/explore/">Explore</a><span aria-hidden="true">/</span><span aria-current="page">Compare</span>',
    module: 'compare.mjs',
    intro: '  <div class="astor-chooser" id="astor-compare-chooser"></div>',
    mount: '  <div id="astor-compare"></div>',
    fallback: 'The comparison tool needs JavaScript. Each book page lists its themes and techniques, which can be set beside another title’s by hand.',
    links: [{ href: '/reading-routes/', label: 'Reading routes' }, { href: '/explore/quotations/', label: 'Quotation explorer' }]
  }));

  // --- my library ---
  written.push(page({
    dir: 'my-library',
    title: 'My library | Astor Library',
    description: 'Saved books, recently viewed pages, reading progress, revision streak, game scores and your commonplace book — all kept on your own device.',
    kicker: 'My library',
    heading: 'What you have been reading.',
    deck: 'Saved books, what you last opened, how far through each title you are, your revision streak and the quotations you have kept. All of it is stored in this browser, on this device. There is no account and nothing is sent anywhere.',
    breadcrumb: '<a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">My library</span>',
    module: 'my-library.mjs',
    mount: `  <section class="astor-dash-grid" id="astor-dash" aria-label="Your reading at a glance"></section>
  <section class="section-title" id="saved"><p class="kicker">Saved</p><h2>Books you have kept.</h2><p>Saved from any book page with the button in the study toolkit.</p></section>
  <div id="astor-saved"></div>
  <section class="section-title" id="progress"><p class="kicker">Progress</p><h2>How far through.</h2><p>Marked by you, act by act or section by section, rather than guessed from how far you scrolled.</p></section>
  <div id="astor-progress"></div>
  <section class="section-title" id="recent"><p class="kicker">Recently viewed</p><h2>Where you have been.</h2><p>The last pages you opened on this device.</p></section>
  <div id="astor-recent"></div>
  <section class="section-title" id="commonplace"><p class="kicker">Commonplace book</p><h2>Quotations you have kept.</h2><p>Add a note to any of them. The whole book exports as plain text.</p></section>
  <div id="astor-commonplace"></div>
  <section class="section-title" id="scores"><p class="kicker">Revision</p><h2>Scores and streak.</h2><p>Best results by game, and the run of days you have played.</p></section>
  <div id="astor-scores"></div>`,
    fallback: 'This page reads what your browser has remembered, which needs JavaScript. Nothing is stored on a server, so there is nothing to recover elsewhere.',
    tail: `  <section class="section-title" id="data"><p class="kicker">Your data</p><h2>It is yours, and it is here.</h2></section>
  <p class="deck">Everything on this page lives in this browser’s local storage. Astor Library never receives it. You can export it as a file or clear any part of it below, and clearing your browser data will remove it whether you use these buttons or not.</p>
  <div class="button-row" id="astor-data-controls"></div>`,
    links: [{ href: '/play/', label: 'Play &amp; revise' }, { href: '/today/', label: 'The Daily Five' }]
  }));

  // --- for teachers ---
  written.push(page({
    dir: 'for-teachers',
    title: 'For teachers | Astor Library',
    description: 'Lesson starters, printable worksheets, discussion questions and a projector mode built from Astor Library’s checked quotations and study material.',
    kicker: 'For teachers',
    heading: 'Material you can take into a room.',
    deck: 'Lesson starters that need no preparation, worksheets that print cleanly, discussion questions with something at stake, and a projector mode that puts a single quotation on the wall at a readable size. Everything is generated from the same checked material as the book pages.',
    breadcrumb: '<a href="/">Astor Library</a><span aria-hidden="true">/</span><span aria-current="page">For teachers</span>',
    module: 'teachers.mjs',
    intro: '  <div class="astor-chooser" id="astor-teacher-chooser"></div>',
    mount: `  <div class="button-row" id="astor-teacher-actions"></div>
  <div id="astor-teacher-output"></div>
  <div class="astor-projector" id="astor-projector" hidden></div>`,
    fallback: 'The generators need JavaScript. Every book page carries its discussion questions, essay questions and quotations in printable form already.',
    tail: `  <section class="section-title"><p class="kicker">Notes</p><h2>What this is and is not.</h2></section>
  <div class="astor-note-grid">
    <article class="astor-note"><h4>Board-neutral</h4><p>Astor Library does not claim to cover any particular specification. The material is built around the texts, and the questions are written to be usable wherever a text is set. Check anything against your own specification before you rely on it.</p></article>
    <article class="astor-note"><h4>Free to print and use</h4><p>The worksheets are generated in your browser and print from it. Use them in class as they are, or edit them once printed. Nothing needs an account.</p></article>
    <article class="astor-note"><h4>Every quotation is referenced</h4><p>Each line carries its act, scene and line or its chapter, and the text it was checked against, so a pupil can look it up and a colleague can verify it.</p></article>
  </div>
  <p class="astor-inline-note">Projector mode: open it from the buttons above, then use the arrow keys. Escape closes it.</p>`,
    links: [{ href: '/resources/', label: 'Free resources' }, { href: '/study/', label: 'Study editions' }]
  }));

  return written;
}

const written = buildPages();
console.log('Rebuilt ' + written.length + ' study, play and explore pages.');

module.exports = { GAMES, buildPages };

// The Revise page, served at /play/.
//
// It opens on one book, set like the jacket of that book: its cover, its
// colour, a line from the text, how much of it the reader knows, and the one
// thing to do next. Below that is a map of every key line, coloured by how
// well it is known (choose one to read it), and every activity as a card that
// shows a real piece of this book, so a student can see what each one asks
// before they open it. The library-wide quizzes close the page.

import { el, clear, shuffle, seededRandom, hashString, describeError } from './util.mjs';
import { snapshot, today, streak, recentlyViewed, dailyResult, isRemembering } from './store.mjs';
import { resultGrid } from './questions.mjs';
import { maskName } from './questions.mjs';
import { scoreRing, starsFor } from './quiz-round.mjs';
import {
  motif, hasMotifs, loadFailed,
  loadShelf, loadBook, drawing, setAccent, keepAddress, preferredSlug,
  LIBRARY_QUIZZES, availableQuizzes, buildFailures, bookLines, lineSummary, lastRevised,
  sessionPlan, sessionLine, whenLabel, clip, STATE_WORDS, shortTitle,
  changeBookButton, coverImage, monogram, activityIcon, activityHref, hasActivity, quoted, modeToggle
} from './revise-kit.mjs';

const titleMount = document.querySelector('#rv-title');
const hubMount = document.querySelector('#rv-hub');

if (hubMount) start();

let shelf = null;

async function start() {
  try {
    shelf = await loadShelf();
  } catch (error) {
    loadFailed(hubMount, undefined, error);
    return;
  }
  const recent = recentlyViewed(20).map(entry => entry.slug);
  const wanted = preferredSlug();
  const first = shelf.books.find(book => book.slug === wanted)
    || shelf.books.find(book => recent.includes(book.slug))
    || shelf.books.find(book => book.slug === 'macbeth')
    || shelf.books[0];
  show(first);
}

let generation = 0;

async function show(meta) {
  // A slow book must not overwrite a quicker, later choice.
  const ticket = ++generation;
  keepAddress(meta.slug);
  setAccent(document.querySelector('main'), meta);
  let book;
  try {
    book = await loadBook(meta.slug);
  } catch (error) {
    if (ticket !== generation) return;
    loadFailed(hubMount, 'That book didn’t load.', error);
    return;
  }
  if (ticket !== generation || book.slug !== meta.slug) return;
  const state = snapshot();
  const day = today();
  const lines = bookLines(book, state.cards || {}, day);
  const counts = lineSummary(lines);

  // Each part is drawn on its own, so one that fails leaves the rest.
  let partError = null;
  const part = (draw, what) => {
    try { return draw(); } catch (error) {
      console.error('Astor Library: could not draw ' + what + ' for ' + book.slug + '.', error);
      partError = error;
      return null;
    }
  };
  part(() => drawHero(meta, book, state, counts, day), 'the cover');
  clear(hubMount);
  // What to do comes first; how well each line is known, after.
  const activities = part(() => drawActivities(book, meta, state, counts), 'the activities');
  if (!activities) loadFailed(hubMount, 'The activities for ' + shortTitle(book) + ' didn’t open.', partError, 'Try again, or choose another book.');
  hubMount.append(...[
    activities,
    part(() => drawLines(book, meta, lines, counts), 'the lines'),
    part(() => drawLibrary(day), 'the library quizzes')
  ].filter(Boolean));
  document.title = 'Revise ' + shortTitle(book) + ' | Astor Library';
}

// --- the jacket ----------------------------------------------------------------

function drawHero(meta, book, state, counts, day) {
  if (!titleMount) return;
  clear(titleMount);
  titleMount.className = 'rx-hero';
  const total = book.quotations.length;
  const plan = sessionPlan(book, { cards: state.cards || {}, day, random: () => 0.5 });

  const cover = el('a', { class: 'rx-hero-cover', href: book.href, 'aria-label': 'Open the page for ' + book.title }, [
    coverImage(meta, { width: 200, eager: true })
  ]);

  const words = el('div', { class: 'rx-hero-words' }, [
    el('p', { class: 'rx-hero-kicker' }, [drawing(meta.motif, 18), el('span', { text: 'Revising · ' + book.author })]),
    el('h1', { class: 'rx-hero-title', text: shortTitle(book) }),
    book.openingLine ? el('p', { class: 'rx-hero-epigraph', text: quoted(clip(book.openingLine, 140)) }) : null,
    el('div', { class: 'rx-hero-actions' }, [
      el('a', { class: 'rx-hero-start', href: activityHref('mixed-round', book.slug) }, [
        el('span', { class: 'rx-hero-start-label' }, [el('span', { class: 'rx-hero-start-kicker', text: counts.known + counts.growing + counts.shaky ? 'Pick up where you left off' : 'Start here' }), el('b', { text: counts.due ? 'Revise the lines that are due' : 'Start a ten-question session' }), el('small', { text: sessionLine(plan.counts) + ' About five minutes.' })]),
        el('span', { class: 'rx-hero-start-arrow', 'aria-hidden': 'true', text: '→' })
      ]),
      el('div', { class: 'rx-hero-links' }, [
        hasActivity(meta, 'flashcards') ? el('a', { class: 'rx-hero-link', href: activityHref('flashcards', book.slug) }, [
          activityIcon(shelf.icons, 'flashcards', 18),
          el('span', { text: counts.due ? 'Flashcards · ' + counts.due + ' due' : 'Flashcards' })
        ]) : null,
        changeBookButton({ books: shelf.books, current: meta, onChoose: choice => show(choice), className: 'rx-hero-link is-button' }),
        modeToggle('rx-hero-link is-icon rx-mode-toggle')
      ])
    ])
  ]);

  // How well the book is known, as one ring and three plain facts.
  const known = counts.known;
  const panel = el('div', { class: 'rx-hero-panel' }, [
    scoreRing(known, total, 112),
    el('p', { class: 'rx-hero-panel-caption', text: known === total ? 'Every key line known' : 'key lines known' }),
    el('ul', { class: 'rx-hero-stats' }, statFacts(book, state, counts).map(([big, small]) => el('li', {}, [el('b', { text: big }), el('span', { text: small })])))
  ]);

  // The hero is set like the cover itself: its ground and its drawings.
  titleMount.classList.toggle('is-cover', hasMotifs());
  titleMount.append(el('span', { class: 'rx-hero-art', 'aria-hidden': 'true' }), el('div', { class: 'rx-hero-inner' }, [cover, words, panel]));
}

function statFacts(book, state, counts) {
  const facts = [];
  if (!isRemembering()) return [['—', 'this browser isn’t saving progress']];
  facts.push([String(counts.due), counts.due === 1 ? 'line due today' : 'lines due today']);
  facts.push([String(counts.new), 'not met yet']);
  const run = streak();
  const last = lastRevised(book, state);
  if (run.live && run.current >= 1) facts.push([String(run.current), run.current === 1 ? 'day of revision' : 'days running']);
  else facts.push([last.time ? whenLabel(last.time) : last.before ? 'Before' : 'New', last.time || last.before ? 'last revised' : 'to you here']);
  return facts;
}

// --- the map of lines ----------------------------------------------------------

function drawLines(book, meta, lines, counts) {
  const section = el('section', { class: 'rx-section rx-linemap', 'aria-labelledby': 'rx-lines-title' });
  section.append(el('header', { class: 'rx-section-head' }, [
    el('div', {}, [
      el('p', { class: 'rx-eyebrow', text: 'Your lines' }),
      el('h2', { id: 'rx-lines-title', text: 'The ' + lines.length + ' key lines in ' + shortTitle(book) })
    ]),
    el('p', { text: 'Each square is a key quotation, filling in as you learn it. Tap one to read it.' })
  ]));

  const detail = el('div', { class: 'rx-line-detail', 'aria-live': 'polite' });
  const map = el('div', { class: 'rx-map' });
  const stages = book.structure.length ? book.structure : [{ id: '', label: '' }];
  let first = null;
  const buttons = new Map();
  const groups = stages.map(stage => ({
    label: stage.label,
    lines: lines.filter(line => !stage.id || (line.quotation.stage || '') === stage.id)
  }));
  const loose = book.structure.length ? lines.filter(line => !book.structure.some(stage => stage.id === line.quotation.stage)) : [];
  if (loose.length) groups.push({ label: 'Elsewhere', lines: loose });

  const select = (button, line) => {
    for (const node of map.querySelectorAll('.rx-tile-line')) node.setAttribute('aria-pressed', String(node === button));
    clear(detail);
    const quotation = line.quotation;
    const stage = book.structure.find(entry => entry.id === quotation.stage);
    detail.append(
      el('p', { class: 'rx-line-state is-' + line.state }, [el('i', { 'aria-hidden': 'true' }), STATE_WORDS[line.state].replace(/^./, c => c.toUpperCase()) + (line.due ? ' · due today' : '')]),
      el('blockquote', {}, [el('p', { text: quotation.text })]),
      el('p', { class: 'rx-line-where', text: [quotation.speaker, stage?.label, quotation.reference].filter(Boolean).join(' · ') }),
      el('p', { class: 'rx-line-analysis', text: clip(quotation.analysis, 240) }),
      el('p', { class: 'rx-line-links' }, [
        el('a', { href: book.href + '#astor-quote-' + quotation.id, text: 'See it in the book →' }),
        hasActivity(meta, 'flashcards') ? el('a', { href: activityHref('flashcards', book.slug), text: 'Practise with flashcards →' }) : null
      ])
    );
  };

  for (const group of groups) {
    if (!group.lines.length) continue;
    const row = el('div', { class: 'rx-map-row' });
    if (group.label) row.append(el('p', { class: 'rx-map-label', text: group.label.replace(/^(Act|Book|Part|Chapter|Stave|Volume|Lines) /, '$1 ') }));
    const tiles = el('div', { class: 'rx-map-tiles' });
    for (const line of group.lines) {
      const button = el('button', {
        type: 'button', class: 'rx-tile-line is-' + line.state + (line.due ? ' is-due' : ''), 'aria-pressed': 'false',
        'aria-label': clip(line.quotation.text, 70) + ' — ' + STATE_WORDS[line.state] + (line.due ? ', due today' : ''),
        onclick: event => select(event.currentTarget, line)
      });
      tiles.append(button);
      buttons.set(line, button);
      if (!first) first = [button, line];
    }
    row.append(tiles);
    map.append(row);
  }

  const legend = el('ul', { class: 'rx-legend' });
  for (const state of ['new', 'shaky', 'growing', 'known']) {
    legend.append(el('li', {}, [el('i', { class: 'rx-tile-line is-' + state, 'aria-hidden': 'true' }), el('span', { text: STATE_WORDS[state] + ' (' + counts[state] + ')' })]));
  }
  legend.append(el('li', {}, [el('i', { class: 'rx-tile-line is-growing is-due', 'aria-hidden': 'true' }), el('span', { text: 'due today (' + counts.due + ')' })]));

  section.append(el('div', { class: 'rx-map-wrap' }, [el('div', {}, [map, legend]), detail]));
  // Open on the first line that needs work, else the first line.
  const needy = lines.find(line => line.due) || lines.find(line => line.state === 'new');
  const start = needy ? buttons.get(needy) : null;
  if (start && needy) select(start, needy); else if (first) select(first[0], first[1]);
  return section;
}

// --- the activities ------------------------------------------------------------

const GROUPS = [
  { title: 'Learn the words', note: 'Know the lines exactly, and who says them.', ids: ['who-said-it', 'fill-the-line', 'flashcards'] },
  { title: 'Understand the ideas', note: 'Attach each line to what it is doing.', ids: ['theme-match', 'technique-spotter'] },
  { title: 'Know the story', note: 'The people and the order things happen in.', ids: ['character-identification', 'order-the-plot'] },
  { title: 'Write about it', note: 'Turn what you know into an argument.', ids: ['essay-forge', 'defend-the-reading'] }
];

const DESCRIPTIONS = {
  'who-said-it': ['Who said it?', 'Read a line and name the speaker.'],
  'fill-the-line': ['Fill the line', 'Put the missing words back into a quotation.'],
  'flashcards': ['Flashcards', 'Three ways to learn each line until it sticks.'],
  'theme-match': ['Theme match', 'Match each line to the theme it carries.'],
  'technique-spotter': ['Technique spotter', 'Name the technique doing the work.'],
  'character-identification': ['Who is this?', 'Identify a character from their file.'],
  'order-the-plot': ['Order the plot', 'Tap the events in the order they happen.'],
  'essay-forge': ['Essay planner', 'Build a plan step by step, with checked quotations.'],
  'defend-the-reading': ['Defend the reading', 'Take a side in a critical debate and answer the objection.']
};

function drawActivities(book, meta, state, counts) {
  const available = new Set(availableQuizzes(book).map(quiz => quiz.id));
  if (book.quotations.length >= 5) available.add('flashcards');
  if ((book.essayQuestions || []).length) available.add('essay-forge');
  if ((book.criticalViews || []).length >= 2 && book.quotations.length >= 6) available.add('defend-the-reading');

  const section = el('section', { class: 'rx-section rx-activities', 'aria-labelledby': 'rx-acts-title' });
  section.append(el('header', { class: 'rx-section-head' }, [
    el('div', {}, [el('p', { class: 'rx-eyebrow', text: 'Activities' }), el('h2', { id: 'rx-acts-title', text: 'Choose what to work on' })]),
    el('p', { text: 'Every activity uses only ' + shortTitle(book) + '.' })
  ]));

  for (const group of GROUPS) {
    const ids = group.ids.filter(id => available.has(id));
    if (!ids.length) continue;
    const grid = el('ul', { class: 'rx-gallery' });
    for (const id of ids) grid.append(el('li', {}, [activityCard(id, book, meta, state, counts)]));
    section.append(el('div', { class: 'rx-group' }, [
      el('div', { class: 'rx-group-head' }, [el('h3', { text: group.title }), el('p', { text: group.note })]),
      grid
    ]));
  }
  const failed = buildFailures.filter(item => item.book === book.slug);
  if (failed.length) {
    section.append(el('p', { class: 'rx-load-why', text: failed.map(item => item.name).join(', ') + ' couldn’t be prepared in this browser. Reason: ' + describeError(failed[0].error) }));
  }
  return section;
}

const ACTIVITY_ORDER = ['mixed-round', 'who-said-it', 'fill-the-line', 'theme-match', 'technique-spotter', 'character-identification', 'order-the-plot', 'flashcards', 'essay-forge', 'defend-the-reading'];

function activityCard(id, book, meta, state, counts) {
  const [name, note] = DESCRIPTIONS[id];
  const result = state.scores?.[id]?.byBook?.[book.slug];
  let status = 'New';
  let ratio = null;
  let stars = null;
  if (result) {
    const last = result.lastTotal ? result.last + '/' + result.lastTotal : result.best + '/' + result.total;
    status = 'Last ' + last + (result.lastAt ? ' · ' + whenLabel(result.lastAt) : '');
    if (result.total) stars = starsFor(result.best, result.total);
  }
  if (id === 'flashcards') {
    const met = counts.known + counts.growing + counts.shaky;
    status = met ? counts.known + ' of ' + book.quotations.length + ' known' : 'New';
    ratio = met ? counts.known / book.quotations.length : null;
  }
  if (id === 'essay-forge' || id === 'defend-the-reading') status = id === 'essay-forge' ? book.essayQuestions.length + ' questions' : book.criticalViews.length + ' readings';

  return el('a', { class: 'rx-activity', href: activityHref(id, book.slug), 'data-activity': id }, [
    el('span', { class: 'rx-activity-preview', 'aria-hidden': 'true' }, [preview(id, book), hasMotifs() ? motif(ACTIVITY_ORDER.indexOf(id), 'rx-activity-motif') : null]),
    el('span', { class: 'rx-activity-body' }, [
      el('span', { class: 'rx-activity-name' }, [activityIcon(shelf.icons, id, 20), el('span', { text: name })]),
      el('span', { class: 'rx-activity-note', text: note }),
      el('span', { class: 'rx-activity-status' + (result || ratio !== null ? ' is-tried' : '') }, [
        el('span', { text: status }),
        stars !== null ? el('span', { class: 'rx-mini-stars', role: 'img', 'aria-label': 'Best: ' + stars + ' of 3 stars' }, [0, 1, 2].map(index => el('i', { class: index < stars ? 'is-earned' : '', text: '★' }))) : null,
        ratio !== null ? el('span', { class: 'rx-meter' }, [el('i', { style: 'width:' + Math.round(ratio * 100) + '%' })]) : null
      ])
    ])
  ]);
}

// A small, real piece of the book in the shape the activity will ask for it.
function preview(id, book) {
  const random = seededRandom(hashString(book.slug + id));
  const spoken = book.quotations.find(quotation => quotation.speaker && quotation.text.length > 20 && quotation.text.length < 120) || book.quotations[0];
  if (id === 'who-said-it') {
    const names = shuffle(book.characters.map(character => character.name), random).slice(0, 3);
    return el('span', { class: 'rx-pv rx-pv-who' }, [
      el('span', { class: 'rx-pv-quote', text: quoted(clip(spoken.text, 70)) }),
      el('span', { class: 'rx-pv-people' }, names.map(name => monogram(name)))
    ]);
  }
  if (id === 'fill-the-line') {
    const line = book.quotations.find(quotation => (quotation.cloze || []).length && quotation.text.length < 110) || spoken;
    const words = (line.cloze || []).slice(0, 2);
    const text = clip(line.text, 86);
    const node = el('span', { class: 'rx-pv-quote' });
    let rest = text;
    for (const word of words) {
      const at = rest.toLowerCase().indexOf(word.toLowerCase());
      if (at < 0) continue;
      node.append(rest.slice(0, at), el('span', { class: 'rx-pv-gap' }));
      rest = rest.slice(at + word.length);
    }
    node.append(rest);
    if (!node.querySelector('.rx-pv-gap')) node.append(' ', el('span', { class: 'rx-pv-gap' }));
    return el('span', { class: 'rx-pv rx-pv-fill' }, [node, el('span', { class: 'rx-pv-chips' }, words.concat(['…']).map(word => el('span', { class: 'rx-pv-chip', text: word })))]);
  }
  if (id === 'flashcards') {
    return el('span', { class: 'rx-pv rx-pv-cards' }, [
      el('span', { class: 'rx-pv-card is-back' }),
      el('span', { class: 'rx-pv-card is-mid' }),
      el('span', { class: 'rx-pv-card' }, [el('span', { text: quoted(clip(book.quotations[1]?.text || spoken.text, 60)) })])
    ]);
  }
  if (id === 'theme-match' || id === 'technique-spotter') {
    const list = id === 'theme-match' ? book.themes : book.techniques;
    return el('span', { class: 'rx-pv rx-pv-tags' }, shuffle(list, random).slice(0, 4).map((item, index) => el('span', { class: 'rx-pv-chip' + (index === 1 ? ' is-on' : ''), text: item.name })));
  }
  if (id === 'character-identification') {
    const person = book.characters.find(character => character.clue) || book.characters[0];
    const text = clip(maskName(person.clue || person.summary, person.name), 110);
    const node = el('span', { class: 'rx-pv-file' });
    text.split('———').forEach((part, index) => { if (index) node.append(el('span', { class: 'rx-redact' })); node.append(part); });
    return el('span', { class: 'rx-pv rx-pv-dossier' }, [el('span', { class: 'rx-pv-label', text: 'Character file' }), node]);
  }
  if (id === 'order-the-plot') {
    const stages = book.structure.length >= 3 ? book.structure : [];
    const picked = stages.length ? [stages[1], stages[0], stages[2]] : [];
    return el('span', { class: 'rx-pv rx-pv-order' }, picked.map((stage, index) => el('span', { class: 'rx-pv-strip', style: '--tilt:' + [-1.2, 0.8, -0.4][index] + 'deg' }, [el('b', { text: String(index + 1) }), clip(stage.title || stage.label, 40)])));
  }
  if (id === 'essay-forge') {
    return el('span', { class: 'rx-pv rx-pv-essay' }, [
      el('span', { class: 'rx-pv-q', text: clip(book.essayQuestions[0].question, 80) }),
      el('span', { class: 'rx-pv-steps' }, ['Argument', 'Point', 'Evidence', 'Analysis'].map((step, index) => el('span', { class: index < 2 ? 'is-on' : '', text: step })))
    ]);
  }
  if (id === 'defend-the-reading') {
    const view = book.criticalViews[0];
    return el('span', { class: 'rx-pv rx-pv-debate' }, [
      el('span', { class: 'rx-pv-side is-for' }, [el('b', { text: 'For' }), clip(view.position, 50)]),
      el('span', { class: 'rx-pv-vs', text: 'vs' }),
      el('span', { class: 'rx-pv-side is-against' }, [el('b', { text: 'Against' }), clip(view.counter || 'The objection', 50)])
    ]);
  }
  return el('span', {});
}

// --- across the library ----------------------------------------------------------

function drawLibrary(day) {
  const section = el('section', { class: 'rx-section rx-library', 'aria-labelledby': 'rx-library-title' });
  section.append(el('header', { class: 'rx-section-head' }, [
    el('div', {}, [el('p', { class: 'rx-eyebrow', text: 'Across the library' }), el('h2', { id: 'rx-library-title', text: 'Questions from every book' })]),
    el('p', { text: 'Quick rounds across every title.' })
  ]));

  const done = dailyResult(day);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const squares = el('span', { class: 'rx-daily-squares', 'aria-hidden': 'true' });
  for (let index = 0; index < 5; index += 1) {
    const mark = done?.marks?.[index];
    squares.append(el('i', { class: done ? (mark ? 'is-right' : 'is-wrong') : '' }));
  }
  const grid = el('ul', { class: 'rx-library-grid' });
  grid.append(el('li', { class: 'is-daily' }, [el('a', { class: 'rx-library-card is-daily', href: '/today/' }, [
    el('span', { class: 'rx-library-kicker', text: date }),
    el('span', { class: 'rx-library-name', text: 'Today’s five questions' }),
    squares,
    el('span', { class: 'rx-library-note', text: done ? 'Done today: ' + done.score + ' of ' + (done.total || 5) + ' ' + resultGrid(done.marks || []) : 'The same five for everyone, new at midnight.' })
  ])]));

  const random = seededRandom(hashString('covers:' + day));
  const covers = shuffle(shelf.books.filter(book => book.cover), random).slice(0, 3);
  for (const quiz of LIBRARY_QUIZZES) {
    const result = snapshot().scores?.[quiz.id];
    let art = null;
    if (quiz.id === 'which-book') art = el('span', { class: 'rx-library-covers', 'aria-hidden': 'true' }, covers.map(book => coverImage(book, { width: 60 })));
    if (quiz.id === 'context-sprint') art = el('span', { class: 'rx-library-years', 'aria-hidden': 'true' }, ['1597', '1818', '1847', '1925'].map(year => el('span', { text: year })));
    if (quiz.id === 'opening-lines') art = el('span', { class: 'rx-library-opening', 'aria-hidden': 'true', text: '“It was…”' });
    grid.append(el('li', {}, [el('a', { class: 'rx-library-card', href: '/play/' + quiz.id + '/' }, [
      el('span', { class: 'rx-library-name' }, [activityIcon(shelf.icons, quiz.id, 18), el('span', { text: quiz.name })]),
      art,
      el('span', { class: 'rx-library-note', text: result?.bestTotal ? quiz.note + ' Best ' + result.best + ' of ' + result.bestTotal + '.' : quiz.note })
    ])]));
  }
  section.append(grid);
  return section;
}

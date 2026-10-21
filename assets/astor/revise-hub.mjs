// The Revise page, served at /play/.
//
// It opens on one book, set like the jacket of that book: its cover, its
// colour, a line from the text, how much of it the reader knows, and the one
// thing to do next. Below that is a map of every key line, coloured by how
// well it is known (choose one to read it), and every activity as a card that
// shows a real piece of this book, so a student can see what each one asks
// before they open it. The library-wide quizzes close the page.

import { el, clear, shuffle, seededRandom, hashString, describeError, guideHref } from './util.mjs';
import { snapshot, today, streak, recentlyViewed, dailyResult, isRemembering } from './store.mjs';
import { resultGrid } from './questions.mjs';
import { starsFor } from './quiz-round.mjs';
import {
  motif, hasMotifs, loadFailed,
  loadShelf, loadBook, drawing, setAccent, keepAddress, preferredSlug,
  LIBRARY_QUIZZES, availableQuizzes, buildFailures, bookLines, lineSummary, lastRevised,
  sessionPlan, sessionLine, whenLabel, clip, STATE_WORDS, shortTitle,
  changeBookButton, coverImage, activityIcon, activityHref, hasActivity, quoted, modeToggle
} from './revise-kit.mjs';

const titleMount = document.querySelector('#rv-title');
const hubMount = document.querySelector('#rv-hub');


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
  const plan = sessionPlan(book, { cards: state.cards || {}, day, random: () => 0.5 });

  const cover = el('a', { class: 'rx-hero-cover', href: book.href, 'aria-label': 'The Astor edition of ' + book.title }, [
    coverImage(meta, { width: 200, eager: true })
  ]);

  // One way to start, and one line on how well the book is known.
  const words = el('div', { class: 'rx-hero-words' }, [
    el('p', { class: 'rx-hero-kicker' }, [drawing(meta.motif, 18), el('span', { text: 'Revising · ' + book.author })]),
    el('h1', { class: 'rx-hero-title', text: shortTitle(book) }),
    book.openingLine ? el('p', { class: 'rx-hero-epigraph', text: quoted(clip(book.openingLine, 140)) }) : null,
    el('div', { class: 'rx-hero-actions' }, [
      el('a', { class: 'rx-hero-start', href: activityHref('mixed-round', book.slug) }, [
        el('span', { class: 'rx-hero-start-label' }, [el('span', { class: 'rx-hero-start-kicker', text: counts.known + counts.growing + counts.shaky ? 'Pick up where you left off' : 'Start here' }), el('b', { text: counts.due ? 'Revise the lines that are due' : 'Start a ten-question session' }), el('small', { text: sessionLine(plan.counts) + ' About five minutes.' })]),
        el('span', { class: 'rx-hero-start-arrow', 'aria-hidden': 'true', text: '→' })
      ])
    ]),
    el('p', { class: 'rx-hero-meta' }, [
      el('span', { class: 'rx-hero-progress', text: progressLine(book, state, counts) }),
      changeBookButton({ books: shelf.books, current: meta, onChoose: choice => show(choice), className: 'rx-hero-text-button' }),
      modeToggle('rx-hero-link is-icon rx-mode-toggle')
    ])
  ]);

  // The hero is set like the cover itself: its ground and its drawings.
  titleMount.classList.toggle('is-cover', hasMotifs());
  titleMount.append(el('span', { class: 'rx-hero-art', 'aria-hidden': 'true' }), el('div', { class: 'rx-hero-inner' }, [cover, words]));
}

// How well the book is known, in one line: lines known, lines due, and the
// run of days (or when it was last revised).
function progressLine(book, state, counts) {
  if (!isRemembering()) return 'This browser isn’t saving progress.';
  const parts = [counts.known + ' of ' + book.quotations.length + ' key lines known'];
  if (counts.due) parts.push(counts.due + ' due today');
  const run = streak();
  const last = lastRevised(book, state);
  if (run.live && run.current > 1) parts.push(run.current + ' days running');
  else if (last.time) parts.push('last revised ' + whenLabel(last.time).toLowerCase());
  return parts.join(' · ');
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
        el('a', { href: guideHref(book.slug, 'quotations', 'astor-quote-' + quotation.id), text: 'Read it in the study guide →' }),
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
//
// Three groups, each a short list: practise (the quizzes), learn (flashcards,
// the study guide, the key lines) and write (the essay planner, the debate).
// Each row says what the activity is and how it went last time; nothing else.

const GROUPS = [
  { id: 'practise', title: 'Practise', note: 'Quick quizzes on the lines, the ideas and the story.', ids: ['who-said-it', 'fill-the-line', 'theme-match', 'technique-spotter', 'character-identification', 'order-the-plot'] },
  { id: 'learn', title: 'Learn', note: 'Get the key lines by heart, and read the book closely.', ids: ['flashcards', 'guide', 'lines'] },
  { id: 'write', title: 'Write', note: 'Turn what you know into an argument.', ids: ['essay-forge', 'defend-the-reading'] }
];

const DESCRIPTIONS = {
  'who-said-it': ['Who said it?', 'Read a line and name the speaker.'],
  'fill-the-line': ['Fill the line', 'Put the missing words back into a quotation.'],
  'theme-match': ['Theme match', 'Match each line to the theme it carries.'],
  'technique-spotter': ['Technique spotter', 'Name the technique doing the work.'],
  'character-identification': ['Who is this?', 'Identify a character from their file.'],
  'order-the-plot': ['Order the plot', 'Tap the events in the order they happen.'],
  flashcards: ['Flashcards', 'Recall, complete or memorise each key line.'],
  guide: ['Study guide', 'What happens, the characters, themes and context, a section at a time.'],
  lines: ['Your key lines', 'Which lines you know, and which are due for another look.'],
  'essay-forge': ['Essay planner', 'Build a plan step by step, with checked quotations.'],
  'defend-the-reading': ['Defend the reading', 'Take a side in a critical debate and answer the objection.']
};

// Two drawings of the hub's own: an open book for the guide, a grid for the lines.
const OWN_ICONS = {
  guide: '<path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1Z"/><path d="M12 6.5v13"/>',
  lines: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'
};

function drawActivities(book, meta, state, counts) {
  const available = new Set(availableQuizzes(book).map(quiz => quiz.id));
  if (book.quotations.length >= 5) available.add('flashcards');
  if ((book.essayQuestions || []).length) available.add('essay-forge');
  if ((book.criticalViews || []).length >= 2 && book.quotations.length >= 6) available.add('defend-the-reading');
  available.add('guide');
  if (book.quotations.length) available.add('lines');

  const section = el('section', { class: 'rx-section rx-activities', 'aria-labelledby': 'rx-acts-title' });
  section.append(el('h2', { id: 'rx-acts-title', class: 'rx-visually-hidden', text: 'Activities on ' + shortTitle(book) }));
  const columns = el('div', { class: 'rx-groups' });
  for (const group of GROUPS) {
    const ids = group.ids.filter(id => available.has(id));
    if (!ids.length) continue;
    columns.append(el('section', { class: 'rx-group is-' + group.id, 'aria-labelledby': 'rx-group-' + group.id }, [
      el('h3', { id: 'rx-group-' + group.id, class: 'rx-group-title', text: group.title }),
      el('p', { class: 'rx-group-note', text: group.note }),
      el('ul', { class: 'rx-list' }, ids.map(id => el('li', {}, [activityRow(id, book, meta, state, counts)])))
    ]));
  }
  section.append(columns);
  const failed = buildFailures.filter(item => item.book === book.slug);
  if (failed.length) {
    section.append(el('p', { class: 'rx-load-why', text: failed.map(item => item.name).join(', ') + ' couldn’t be prepared in this browser. Reason: ' + describeError(failed[0].error) }));
  }
  return section;
}

function activityRow(id, book, meta, state, counts) {
  const [name, note] = DESCRIPTIONS[id];
  const result = state.scores?.[id]?.byBook?.[book.slug];
  let status = 'New';
  let stars = null;
  let tried = Boolean(result);
  if (result) {
    status = result.lastTotal ? 'Last ' + result.last + '/' + result.lastTotal : 'Best ' + result.best + '/' + result.total;
    if (result.total) stars = starsFor(result.best, result.total);
  }
  if (id === 'flashcards' || id === 'lines') {
    const met = counts.known + counts.growing + counts.shaky;
    tried = met > 0;
    status = id === 'lines'
      ? (counts.due ? counts.due + ' due today' : met ? counts.known + ' of ' + book.quotations.length + ' known' : book.quotations.length + ' lines')
      : (met ? counts.known + ' of ' + book.quotations.length + ' known' : 'New');
  }
  if (id === 'essay-forge') status = plural(book.essayQuestions.length, 'question');
  if (id === 'defend-the-reading') status = plural(book.criticalViews.length, 'reading');
  if (id === 'guide') status = '';
  const href = id === 'guide' ? guideHref(book.slug) : id === 'lines' ? '#rx-lines-title' : activityHref(id, book.slug);
  const icon = OWN_ICONS[id] ? drawing(OWN_ICONS[id], 22, 'rx-icon') : activityIcon(shelf.icons, id, 22);
  return el('a', { class: 'rx-entry', href, 'data-activity': id }, [
    icon,
    el('span', { class: 'rx-entry-main' }, [el('span', { class: 'rx-entry-name', text: name }), el('span', { class: 'rx-entry-note', text: note })]),
    status ? el('span', { class: 'rx-entry-status' + (tried ? ' is-tried' : '') }, [
      el('span', { text: status }),
      stars !== null ? el('span', { class: 'rx-mini-stars', role: 'img', 'aria-label': 'Best: ' + stars + ' of 3 stars' }, [0, 1, 2].map(index => el('i', { class: index < stars ? 'is-earned' : '', text: '★' }))) : null
    ]) : null
  ]);
}

function plural(count, word) {
  return count + ' ' + word + (count === 1 ? '' : 's');
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

// Started last, once every declaration above has run: Safari checks a
// variable as soon as an assignment to it begins, so starting earlier made
// `shelf = await loadShelf()` throw "Cannot access 'shelf' before
// initialization" there, and every Revise page reported the books as not
// loaded.
if (hubMount) start();

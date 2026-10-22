// The Revise page, served at /play/.
//
// It opens on one book: its cover and title, one line on how well it is
// known, and one way to start. Below that, every activity as a plain list in
// three groups (practise, learn, write), then the book's key lines, folded,
// and the quizzes that range across the whole library.

import { el, clear, describeError, guideHref } from './util.mjs';
import { snapshot, today, streak, recentlyViewed, dailyResult, isRemembering } from './store.mjs';
import {
  loadFailed,
  loadShelf, loadBook, setAccent, keepAddress, preferredSlug,
  LIBRARY_QUIZZES, availableQuizzes, buildFailures, bookLines, lineSummary, lastRevised,
  sessionPlan, sessionLine, whenLabel, clip, STATE_WORDS, shortTitle,
  changeBookButton, coverImage, activityHref
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
    part(() => drawLines(book, lines, counts), 'the lines'),
    part(() => drawLibrary(day), 'the library quizzes')
  ].filter(Boolean));
  // "Your key lines" in the activities opens the fold below.
  if (window.location.hash === '#rx-lines') openLines();
  document.title = 'Revise ' + shortTitle(book) + ' | Astor Library';
}

// --- the book ---------------------------------------------------------------------

function drawHero(meta, book, state, counts, day) {
  if (!titleMount) return;
  clear(titleMount);
  titleMount.className = 'rx-hero';
  const plan = sessionPlan(book, { cards: state.cards || {}, day, random: () => 0.5 });
  const started = counts.known + counts.growing + counts.shaky > 0;

  const cover = el('a', { class: 'rx-hero-cover', href: book.href, 'aria-label': 'The Astor edition of ' + book.title }, [
    coverImage(meta, { width: 160, eager: true })
  ]);
  const words = el('div', { class: 'rx-hero-words' }, [
    el('p', { class: 'rx-hero-kicker', text: 'Revise' }),
    el('h1', { class: 'rx-hero-title', text: shortTitle(book) }),
    el('p', { class: 'rx-hero-author', text: book.author }),
    el('p', { class: 'rx-hero-meta' }, [
      el('span', { text: progressLine(book, state, counts) }),
      changeBookButton({ books: shelf.books, current: meta, onChoose: choice => show(choice), className: 'rx-text-button' })
    ]),
    el('p', { class: 'rx-hero-start' }, [
      el('a', { class: 'rx-button is-primary', href: activityHref('mixed-round', book.slug) }, [
        el('span', { text: counts.due ? 'Revise the lines that are due' : started ? 'Ten more questions' : 'Start with ten questions' }),
        el('span', { 'aria-hidden': 'true', text: '→' })
      ]),
      el('small', { text: sessionLine(plan.counts) + ' About five minutes.' })
    ])
  ]);
  titleMount.append(el('div', { class: 'rx-hero-inner' }, [cover, words]));
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

// --- the key lines ---------------------------------------------------------------
//
// Every key line, under the part of the book it comes from, with how well it
// is known. Folded, so the page opens on what to do rather than on a list.

function drawLines(book, lines, counts) {
  const section = el('details', { id: 'rx-lines', class: 'rx-section rx-lines' });
  const known = counts.known + ' of ' + lines.length + ' known' + (counts.due ? ', ' + counts.due + ' due today' : '');
  section.append(el('summary', {}, [el('h2', { text: 'Your key lines' }), el('span', { text: known })]));
  const stages = book.structure.length ? book.structure : [{ id: '', label: '' }];
  const groups = stages.map(stage => ({ label: stage.label, lines: lines.filter(line => !stage.id || (line.quotation.stage || '') === stage.id) }));
  const loose = book.structure.length ? lines.filter(line => !book.structure.some(stage => stage.id === line.quotation.stage)) : [];
  if (loose.length) groups.push({ label: 'Elsewhere', lines: loose });
  for (const group of groups) {
    if (!group.lines.length) continue;
    if (group.label) section.append(el('h3', { text: group.label }));
    section.append(el('ul', { class: 'rx-line-list' }, group.lines.map(line => el('li', { class: 'is-' + line.state + (line.due ? ' is-due' : '') }, [
      el('a', { href: guideHref(book.slug, 'quotations', 'astor-quote-' + line.quotation.id), text: clip(line.quotation.text, 90) }),
      el('span', { text: STATE_WORDS[line.state] + (line.due ? ', due today' : '') })
    ]))));
  }
  return section;
}

function openLines() {
  const fold = document.getElementById('rx-lines');
  if (!fold) return;
  fold.open = true;
  fold.scrollIntoView({ block: 'start' });
}

// --- the activities ------------------------------------------------------------
//
// Three groups, each a short list: practise (the quizzes), learn (flashcards,
// the study guide, the key lines) and write (the essay planner, the debate).
// Each row says what the activity is and how it went last time; nothing else.

const GROUPS = [
  { id: 'practise', title: 'Practise', ids: ['who-said-it', 'fill-the-line', 'theme-match', 'technique-spotter', 'character-identification', 'order-the-plot'] },
  { id: 'learn', title: 'Learn', ids: ['flashcards', 'guide', 'lines'] },
  { id: 'write', title: 'Write', ids: ['essay-forge', 'defend-the-reading'] }
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

function drawActivities(book, meta, state, counts) {
  const available = new Set(availableQuizzes(book).map(quiz => quiz.id));
  if (book.quotations.length >= 5) available.add('flashcards');
  if ((book.essayQuestions || []).length) available.add('essay-forge');
  if ((book.criticalViews || []).length >= 2 && book.quotations.length >= 6) available.add('defend-the-reading');
  available.add('guide');
  if (book.quotations.length) available.add('lines');

  const section = el('section', { class: 'rx-section rx-activities' });
  section.setAttribute('aria-label', 'Activities on ' + shortTitle(book));
  const columns = el('div', { class: 'rx-groups' });
  for (const group of GROUPS) {
    const ids = group.ids.filter(id => available.has(id));
    if (!ids.length) continue;
    columns.append(el('section', { class: 'rx-group is-' + group.id, 'aria-labelledby': 'rx-group-' + group.id }, [
      el('h2', { id: 'rx-group-' + group.id, class: 'rx-group-title', text: group.title }),
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
  let status = '';
  if (result) status = result.lastTotal ? 'Last time ' + result.last + ' of ' + result.lastTotal : 'Best ' + result.best + ' of ' + result.total;
  if (id === 'flashcards' || id === 'lines') {
    const met = counts.known + counts.growing + counts.shaky;
    status = id === 'lines'
      ? (counts.due ? counts.due + ' due today' : met ? counts.known + ' of ' + book.quotations.length + ' known' : book.quotations.length + ' lines')
      : (met ? counts.known + ' of ' + book.quotations.length + ' known' : '');
  }
  if (id === 'essay-forge') status = plural(book.essayQuestions.length, 'question');
  if (id === 'defend-the-reading') status = plural(book.criticalViews.length, 'reading');
  if (id === 'guide') status = '';
  const href = id === 'guide' ? guideHref(book.slug) : id === 'lines' ? '#rx-lines' : activityHref(id, book.slug);
  const link = el('a', { class: 'rx-entry', href, 'data-activity': id }, [
    el('span', { class: 'rx-entry-name', text: name }),
    el('span', { class: 'rx-entry-note', text: note }),
    status ? el('span', { class: 'rx-entry-status', text: status }) : null
  ]);
  if (id === 'lines') link.addEventListener('click', event => { event.preventDefault(); openLines(); });
  return link;
}

function plural(count, word) {
  return count + ' ' + word + (count === 1 ? '' : 's');
}

// --- across the library ----------------------------------------------------------

function drawLibrary(day) {
  const section = el('section', { class: 'rx-section rx-library', 'aria-labelledby': 'rx-library-title' });
  section.append(el('h2', { id: 'rx-library-title', class: 'rx-group-title', text: 'Across the library' }));
  const done = dailyResult(day);
  const list = el('ul', { class: 'rx-list' });
  list.append(el('li', {}, [el('a', { class: 'rx-entry', href: '/today/' }, [
    el('span', { class: 'rx-entry-name', text: 'Today’s five questions' }),
    el('span', { class: 'rx-entry-note', text: 'The same five for everyone, new at midnight.' }),
    done ? el('span', { class: 'rx-entry-status', text: 'Done today: ' + done.score + ' of ' + (done.total || 5) }) : null
  ])]));
  for (const quiz of LIBRARY_QUIZZES) {
    const result = snapshot().scores?.[quiz.id];
    list.append(el('li', {}, [el('a', { class: 'rx-entry', href: '/play/' + quiz.id + '/' }, [
      el('span', { class: 'rx-entry-name', text: quiz.name }),
      el('span', { class: 'rx-entry-note', text: quiz.note }),
      result?.bestTotal ? el('span', { class: 'rx-entry-status', text: 'Best ' + result.best + ' of ' + result.bestTotal }) : null
    ])]));
  }
  section.append(list);
  return section;
}

// Started last, once every declaration above has run: Safari checks a
// variable as soon as an assignment to it begins, so starting earlier made
// `shelf = await loadShelf()` throw "Cannot access 'shelf' before
// initialization" there, and every Revise page reported the books as not
// loaded.
if (hubMount) start();

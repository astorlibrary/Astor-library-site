// The Revise page, served at /play/.
//
// It opens on one book, set like the title page of that book: its cover, its
// colour and drawing, a line from the text, and one sentence about where the
// reader has got to. Below that is a single way in (Ten questions, built from
// the reader's own lines), the state of every key line in the book, and each
// kind of quiz as a row with a real sample from the book and the reader's last
// result. Nothing here counts across the whole library.

import { el, clear } from './util.mjs';
import { snapshot, today, streak, recentlyViewed, dailyResult, isRemembering } from './store.mjs';
import { resultGrid } from './questions.mjs';
import {
  loadShelf, loadBook, drawing, setAccent, bookSwitcher, keepAddress, preferredSlug,
  QUIZZES, LIBRARY_QUIZZES, GROUPS, availableQuizzes, bookLines, lineSummary, lastRevised,
  sessionPlan, sessionLine, whenLabel, clip, STATE_WORDS, shortTitle
} from './revise-kit.mjs';

const titleMount = document.querySelector('#rv-title');
const hubMount = document.querySelector('#rv-hub');

if (hubMount) start();

async function start() {
  let shelf;
  try {
    shelf = await loadShelf();
  } catch {
    hubMount.append(el('p', { class: 'rv-empty', text: 'The books didn’t load. Try reloading the page.' }));
    return;
  }
  icons = shelf.icons || {};
  const recent = recentlyViewed(20).map(entry => entry.slug);
  const wanted = preferredSlug();
  const first = shelf.books.find(book => book.slug === wanted)
    || shelf.books.find(book => recent.includes(book.slug))
    || shelf.books.find(book => book.slug === 'macbeth')
    || shelf.books[0];
  show(shelf, first);
}

let generation = 0;

async function show(shelf, meta) {
  // A slow book must not overwrite a quicker, later choice.
  const ticket = ++generation;
  keepAddress(meta.slug);
  setAccent(document.querySelector('main'), meta);
  let book;
  try {
    book = await loadBook(meta.slug);
  } catch {
    if (ticket !== generation) return;
    clear(hubMount);
    hubMount.append(el('p', { class: 'rv-empty', text: 'That book didn’t load. Try another, or reload the page.' }));
    return;
  }
  if (ticket !== generation) return;
  const state = snapshot();
  const day = today();
  const lines = bookLines(book, state.cards || {}, day);
  const counts = lineSummary(lines);

  drawTitle(shelf, meta, book, state, counts);
  clear(hubMount);
  hubMount.append(
    drawSession(book, state, day),
    drawLines(book, lines, counts),
    drawContents(book, state),
    drawLonger(book, meta, counts),
    drawLibrary(shelf, day)
  );
  document.title = 'Revise ' + book.title + ' | Astor Library';
}

// --- the title page ----------------------------------------------------------

function drawTitle(shelf, meta, book, state, counts) {
  if (!titleMount) return;
  clear(titleMount);
  titleMount.classList.add('is-book');
  const recent = recentlyViewed(20).map(entry => entry.slug);

  const words = el('div', { class: 'rv-title-words' }, [
    el('p', { class: 'rv-kicker' }, [drawing(meta.motif, 20), el('span', { text: 'Revising · ' + book.author })]),
    el('h1', { class: 'rv-title-book', text: book.title }),
    book.openingLine ? el('p', { class: 'rv-epigraph', text: '“' + clip(book.openingLine, 150).replace(/^[“"]|[”"]$/g, '') + '”' }) : null,
    el('p', { class: 'rv-status', text: statusSentence(book, state, counts) }),
    bookSwitcher(shelf.books, meta, recent, choice => show(shelf, choice))
  ]);

  const cover = meta.cover
    ? el('a', { class: 'rv-cover', href: book.href, 'aria-label': 'Open the page for ' + book.title }, [
        el('img', { src: meta.cover, alt: '', width: '120', height: '180', decoding: 'async' })
      ])
    : null;
  titleMount.append(el('div', { class: 'rv-title-page' }, [cover, words]));
}

function statusSentence(book, state, counts) {
  if (!isRemembering()) return 'This browser isn’t keeping anything between visits, so each quiz starts fresh.';
  const parts = [];
  const last = lastRevised(book, state);
  if (last.time) parts.push('Last revised ' + whenLabel(last.time) + '.');
  else if (last.before) parts.push('You have revised ' + shortTitle(book) + ' here before.');
  else parts.push('You haven’t revised ' + shortTitle(book) + ' here yet.');
  if (counts.due) parts.push(counts.due + (counts.due === 1 ? ' line is' : ' lines are') + ' due for another look.');
  const run = streak();
  if (run.live && run.current >= 2) parts.push(run.current + ' days running.');
  return parts.join(' ');
}

// --- one way in --------------------------------------------------------------

function drawSession(book, state, day) {
  const plan = sessionPlan(book, { cards: state.cards || {}, day, random: () => 0.5 });
  const section = el('section', { class: 'rv-session', 'aria-labelledby': 'rv-session-title' });
  section.append(
    el('h2', { class: 'rv-visually-hidden', id: 'rv-session-title', text: 'Start here' }),
    el('a', { class: 'rv-start', href: '/play/mixed-round/?book=' + encodeURIComponent(book.slug) }, [
      el('span', { class: 'rv-start-label', text: 'Ten questions on ' + shortTitle(book) }),
      el('span', { class: 'rv-start-arrow', 'aria-hidden': 'true', text: '→' })
    ]),
    el('p', { class: 'rv-start-note', text: sessionLine(plan.counts) + ' About five minutes.' })
  );
  return section;
}

// --- the lines ---------------------------------------------------------------

function drawLines(book, lines, counts) {
  const section = el('section', { class: 'rv-lines', 'aria-labelledby': 'rv-lines-title' });
  section.append(el('div', { class: 'rv-section-head' }, [
    el('h2', { id: 'rv-lines-title', text: 'Your lines' }),
    el('p', { text: 'The ' + lines.length + ' key lines in ' + shortTitle(book) + (book.structure.length ? ', by ' + (book.form === 'play' ? 'act' : 'part') : '') + '. Get one right in a quiz or the flashcards and it moves along; get it wrong and it starts again.' })
  ]));

  const described = [
    counts.known ? counts.known + ' known' : '',
    counts.growing ? counts.growing + ' getting there' : '',
    counts.shaky ? counts.shaky + ' shaky' : '',
    counts.new ? counts.new + ' not met yet' : '',
    counts.due ? counts.due + ' due for another look' : ''
  ].filter(Boolean).join(', ');
  const strip = el('div', { class: 'rv-strip', role: 'img', 'aria-label': lines.length + ' key lines: ' + described + '.' });
  const stages = book.structure.length ? book.structure : [{ id: '', label: '' }];
  for (const stage of stages) {
    const inStage = lines.filter(line => (line.quotation.stage || '') === stage.id || (!stage.id));
    if (!inStage.length) continue;
    const marks = el('span', { class: 'rv-marks' });
    for (const line of inStage) {
      marks.append(el('i', {
        class: 'rv-mark is-' + line.state + (line.due ? ' is-due' : ''),
        title: clip(line.quotation.text, 60) + ' — ' + STATE_WORDS[line.state] + (line.due ? ', ready to go over' : '')
      }));
    }
    strip.append(el('span', { class: 'rv-strip-group' }, [
      stage.label ? el('span', { class: 'rv-strip-stage', text: stage.label.replace(/^(Act|Book|Part|Chapter|Stave|Volume|Lines) /, '$1\u00a0') }) : null,
      marks
    ]));
  }
  // Lines placed in no stage still count.
  const loose = book.structure.length ? lines.filter(line => !book.structure.some(stage => stage.id === line.quotation.stage)) : [];
  if (loose.length) {
    const marks = el('span', { class: 'rv-marks' });
    for (const line of loose) marks.append(el('i', { class: 'rv-mark is-' + line.state }));
    strip.append(el('span', { class: 'rv-strip-group' }, [marks]));
  }
  section.append(strip);

  const legend = el('p', { class: 'rv-legend', 'aria-hidden': 'true' });
  for (const state of ['new', 'shaky', 'growing', 'known']) {
    legend.append(el('span', {}, [el('i', { class: 'rv-mark is-' + state }), ' ' + STATE_WORDS[state]]));
  }
  if (counts.due) legend.append(el('span', {}, [el('i', { class: 'rv-mark is-growing is-due' }), ' due for another look']));
  section.append(legend);
  return section;
}

// --- practise one thing ------------------------------------------------------

function drawContents(book, state) {
  const available = new Set(availableQuizzes(book).map(quiz => quiz.id));
  const section = el('section', { class: 'rv-contents', 'aria-labelledby': 'rv-contents-title' });
  section.append(el('div', { class: 'rv-section-head' }, [
    el('h2', { id: 'rv-contents-title', text: 'Quizzes' }),
    el('p', { text: 'Questions of one kind, all from ' + shortTitle(book) + '.' })
  ]));
  for (const group of GROUPS) {
    const quizzes = QUIZZES.filter(quiz => quiz.group === group.id && available.has(quiz.id));
    if (!quizzes.length) continue;
    const list = el('ul', { class: 'rv-rows' });
    for (const quiz of quizzes) {
      const result = state.scores?.[quiz.id]?.byBook?.[book.slug];
      list.append(el('li', {}, [row({
        href: '/play/' + quiz.id + '/?book=' + encodeURIComponent(book.slug),
        icon: quiz.id,
        name: quiz.name,
        sample: sampleFor(quiz.id, book),
        state: result ? resultLine(result) : 'Not tried yet',
        tried: Boolean(result)
      })]));
    }
    section.append(el('h3', { class: 'rv-group', text: group.label }), list);
  }
  return section;
}

function resultLine(result) {
  const last = result.lastTotal ? result.last + ' of ' + result.lastTotal : result.best + ' of ' + result.total;
  const when = result.lastAt ? ', ' + whenLabel(result.lastAt) : '';
  return 'Last ' + last + when;
}

let icons = {};

function row({ href, icon, name, sample, state, tried }) {
  return el('a', { class: 'rv-row', href }, [
    el('span', { class: 'rv-row-icon', 'aria-hidden': 'true', html: iconSvg(icon) }),
    el('span', { class: 'rv-row-main' }, [
      el('span', { class: 'rv-row-name', text: name }),
      sample ? el('span', { class: 'rv-row-sample', text: sample }) : null
    ]),
    state ? el('span', { class: 'rv-row-state' + (tried ? ' is-tried' : ''), text: state }) : null
  ]);
}

function iconSvg(name) {
  return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" focusable="false">' + (icons[name] || '') + '</svg>';
}

// A real piece of the book in every row, so the list says what the quiz is.
function sampleFor(id, book) {
  const spoken = book.quotations.find(quotation => quotation.speaker && quotation.text.length > 20);
  if (id === 'who-said-it' && spoken) return '“' + clip(spoken.text, 58) + '” Who says it?';
  if (id === 'fill-the-line') {
    const line = book.quotations.find(quotation => quotation !== spoken && (quotation.cloze || []).length && quotation.text.length < 110)
      || book.quotations.find(quotation => quotation !== spoken) || book.quotations[0];
    if (line) {
      let text = line.text;
      for (const word of (line.cloze || []).slice(0, 2)) text = text.replace(new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '____');
      return '“' + clip(text, 64) + '”';
    }
  }
  if (id === 'theme-match') return book.themes.slice(0, 3).map(theme => theme.name).join(' · ');
  if (id === 'technique-spotter') return book.techniques.slice(0, 3).map(technique => technique.name).join(' · ');
  if (id === 'character-identification') return book.characters.slice(0, 3).map(character => character.name).join(', ') + '…';
  if (id === 'order-the-plot' && book.structure.length) {
    return book.structure[0].label + ' to ' + book.structure[book.structure.length - 1].label + ', in order';
  }
  return '';
}

// --- longer work -------------------------------------------------------------

function drawLonger(book, meta, counts) {
  const section = el('section', { class: 'rv-contents rv-longer', 'aria-labelledby': 'rv-longer-title' });
  section.append(el('div', { class: 'rv-section-head' }, [
    el('h2', { id: 'rv-longer-title', text: 'Longer work' }),
    el('p', { text: 'For when you have more than five minutes.' })
  ]));
  const list = el('ul', { class: 'rv-rows' });
  const slug = encodeURIComponent(book.slug);
  const met = counts.known + counts.growing + counts.shaky;
  list.append(el('li', {}, [row({
    href: '/play/flashcards/?book=' + slug, icon: 'flashcards', name: 'Flashcards',
    sample: 'The ' + book.quotations.length + ' key lines, ten at a time. The ones you forget come back sooner.',
    state: met ? counts.known + ' of ' + book.quotations.length + ' known' : '', tried: Boolean(met)
  })]));
  const question = (book.essayQuestions || [])[0];
  list.append(el('li', {}, [row({
    href: '/play/essay-forge/?book=' + slug, icon: 'essay-forge', name: 'Essay planner',
    sample: question ? '“' + clip(question.question, 90) + '”' : 'Plan an essay paragraph by paragraph.',
    state: ''
  })]));
  if ((book.criticalViews || []).length) {
    list.append(el('li', {}, [row({
      href: '/play/defend-the-reading/?book=' + slug, icon: 'defend-the-reading', name: 'Defend the reading',
      sample: '“' + clip(book.criticalViews[0].position, 70) + '” Argue for this reading, then answer the case against.',
      state: ''
    })]));
  }
  section.append(list);
  return section;
}

// --- across the library ------------------------------------------------------

function drawLibrary(shelf, day) {
  const section = el('section', { class: 'rv-contents rv-library', 'aria-labelledby': 'rv-library-title' });
  section.append(el('div', { class: 'rv-section-head' }, [
    el('h2', { id: 'rv-library-title', text: 'Across the library' }),
    el('p', { text: 'Questions from every book with a study guide.' })
  ]));
  const list = el('ul', { class: 'rv-rows' });
  const done = dailyResult(day);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  list.append(el('li', {}, [row({
    href: '/today/', icon: 'today', name: 'Today’s questions',
    sample: date + '. Five questions, the same for everyone today.',
    state: done ? resultGrid(done.marks || []) + ' ' + done.score + ' of ' + (done.total || 5) : '', tried: Boolean(done)
  })]));
  for (const quiz of LIBRARY_QUIZZES) {
    const result = snapshot().scores?.[quiz.id];
    list.append(el('li', {}, [row({
      href: '/play/' + quiz.id + '/', icon: quiz.id, name: quiz.name, sample: quiz.note,
      state: result?.bestTotal ? 'Best ' + result.best + ' of ' + result.bestTotal : '', tried: Boolean(result)
    })]));
  }
  section.append(list);
  return section;
}


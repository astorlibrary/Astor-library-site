// The teachers' area: lesson starters, printable worksheets and a projector
// mode, generated from the same checked material as the book pages.
//
// Everything is produced in the browser and printed from it. Nothing needs an
// account, and every quotation on a sheet carries its reference so a pupil can
// look it up and a colleague can check it.

import { el, clear, shuffle, sample, prefersReducedMotion } from './util.mjs';
import { withBooks } from './chooser.mjs';
import { maskName } from './questions.mjs';

const chooser = document.querySelector('#astor-teacher-chooser');
const actions = document.querySelector('#astor-teacher-actions');
const output = document.querySelector('#astor-teacher-output');
const projector = document.querySelector('#astor-projector');

if (output) {
  withBooks(chooser, { label: 'Which text?' }, book => render(book));
}

function render(book) {
  clear(actions);
  clear(output);

  const builders = [
    ['Lesson starters', () => starters(book)],
    ['Quotation worksheet', () => quotationSheet(book)],
    ['Character worksheet', () => characterSheet(book)],
    ['Sequencing worksheet', () => sequenceSheet(book)],
    ['Discussion sheet', () => discussionSheet(book)],
    ['Knowledge check', () => knowledgeSheet(book)]
  ];

  for (const [label, build] of builders) {
    actions.append(el('button', {
      class: 'button secondary', type: 'button', text: label,
      onclick: () => { clear(output); output.append(build()); output.scrollIntoView({ block: 'start' }); }
    }));
  }

  actions.append(el('button', {
    class: 'button primary', type: 'button', text: 'Projector mode',
    onclick: () => openProjector(book)
  }));
  actions.append(el('button', {
    class: 'button secondary', type: 'button', text: 'Print what is on screen',
    onclick: () => window.print()
  }));

  output.append(starters(book));
}

function sheetShell(book, title, meta) {
  const sheet = el('section', { class: 'astor-worksheet' });
  sheet.append(el('h3', { text: title }));
  sheet.append(el('p', { class: 'astor-worksheet-meta', text: book.title + ' · ' + book.author + ' · ' + meta }));
  return sheet;
}

function rules(count) {
  const wrap = el('div');
  for (let index = 0; index < count; index += 1) wrap.append(el('div', { class: 'astor-rule' }));
  return wrap;
}

function starters(book) {
  const sheet = sheetShell(book, 'Five lesson starters', 'no preparation needed');
  const quotations = sample(book.quotations, 3);
  const items = [
    'Put this on the board and give them four minutes: “' + (quotations[0]?.text || '') + '” (' + (quotations[0]?.reference || '') + '). One question only: who benefits from this being said?',
    'Name a character without naming them: “' + maskName(book.characters[0].clue || book.characters[0].summary, book.characters[0].name) + '” Who is it, and which word gave it away?',
    'Two minutes in pairs: put the ' + (book.form === 'play' ? 'acts' : 'sections') + ' in order — ' + shuffle(book.structure.map(stage => stage.label)).join(', ') + '. Then ask which one could be moved without breaking the book.',
    'A theme on the board — ' + book.themes[0].name + '. Sixty seconds to write down one line that carries it. Collect three and argue about which is strongest.',
    quotations[1]
      ? 'Read this aloud twice, the second time badly on purpose: “' + quotations[1].text + '” What does the wrong reading reveal about the right one?'
      : 'Ask what the first page of this book teaches you about how to read the rest of it.'
  ];
  sheet.append(el('ol', {}, items.map(item => el('li', { text: item }))));
  sheet.append(el('p', { class: 'astor-inline-note', text: 'Regenerate the page for a different set. Every quotation is referenced and checked.' }));
  return sheet;
}

function quotationSheet(book) {
  const sheet = sheetShell(book, 'Quotation worksheet', 'six quotations, space to annotate');
  const quotations = sample(book.quotations, 6);
  const list = el('ol', {});
  for (const quotation of quotations) {
    const item = el('li', {});
    item.append(el('blockquote', { class: 'astor-game-quote' }, [el('p', { text: quotation.text })]));
    item.append(el('p', { class: 'astor-worksheet-meta', text: (quotation.speaker ? quotation.speaker + ' · ' : '') + book.title + ' ' + quotation.reference }));
    item.append(el('p', { text: 'What is the language doing here, and why does it matter that it is this character saying it?' }));
    item.append(rules(3));
    list.append(item);
  }
  sheet.append(list);
  sheet.append(el('p', { class: 'astor-inline-note astor-print-only', text: 'Astor Library · astorlibrary.com' }));
  return sheet;
}

function characterSheet(book) {
  const sheet = sheetShell(book, 'Character worksheet', book.characters.length + ' characters');
  const list = el('ol', {});
  for (const character of book.characters) {
    const item = el('li', {});
    item.append(el('p', { text: character.name + (character.role ? ' — ' + character.role : '') }));
    item.append(el('p', { text: 'One thing they want. One thing that stops them. One line that proves it.' }));
    item.append(rules(3));
    list.append(item);
  }
  sheet.append(list);
  return sheet;
}

function sequenceSheet(book) {
  const sheet = sheetShell(book, 'Sequencing worksheet', 'cut up, or number in order');
  const shuffled = shuffle(book.structure.map(stage => stage.label + ': ' + stage.title));
  sheet.append(el('p', { text: 'Number these from first to last, then write one sentence saying why the order matters.' }));
  const list = el('ol', {});
  for (const line of shuffled) {
    const item = el('li', {});
    item.append(el('p', { text: line }));
    list.append(item);
  }
  sheet.append(list);
  sheet.append(rules(4));
  return sheet;
}

function discussionSheet(book) {
  const sheet = sheetShell(book, 'Discussion sheet', 'questions with something at stake');
  const questions = (book.discussionQuestions || []).concat(
    (book.criticalViews || []).map(view => view.position + '. ' + view.summary + ' Is the objection — ' + (view.counter || 'that it proves too much') + ' — fatal to it?')
  );
  sheet.append(el('ol', {}, questions.map(question => {
    const item = el('li', {});
    item.append(el('p', { text: question }));
    item.append(rules(2));
    return item;
  })));
  return sheet;
}

function knowledgeSheet(book) {
  const sheet = sheetShell(book, 'Knowledge check', 'ten questions, answers below');
  // The same draw has to answer the same questions, so the samples are taken
  // once and used twice rather than redrawn for the answer list.
  const quotations = sample(book.quotations, 6);
  const characters = sample(book.characters, 2);
  const events = sample(book.timeline || [], 2);

  const questions = [
    ...quotations.map(quotation => 'Who says “' + quotation.text + '”, and where?'),
    ...characters.map(character => maskName(character.clue || character.summary, character.name) + ' Who is this?'),
    ...events.map(event => 'In which year: ' + event.label + '?')
  ];

  sheet.append(el('ol', {}, questions.map(question => {
    const item = el('li', {});
    item.append(el('p', { text: question }));
    item.append(rules(1));
    return item;
  })));

  const answers = el('div');
  answers.append(el('p', { class: 'astor-compare-heading', text: 'Answers' }));
  answers.append(el('ol', {}, [
    ...quotations.map(quotation => el('li', { text: (quotation.speaker || 'Narrator') + ', ' + book.title + ' ' + quotation.reference })),
    ...characters.map(character => el('li', { text: character.name })),
    ...events.map(event => el('li', { text: String(event.year) }))
  ]));
  sheet.append(answers);
  sheet.append(el('p', { class: 'astor-inline-note', text: 'The answer list is regenerated with the sheet; print them together or fold the page.' }));
  return sheet;
}

// --- projector -------------------------------------------------------------

function openProjector(book) {
  const slides = [
    ...book.quotations.map(quotation => ({
      text: quotation.text,
      meta: (quotation.speaker ? quotation.speaker + ' · ' : '') + book.title + ' ' + quotation.reference
    })),
    ...book.themes.map(theme => ({ text: theme.name, meta: book.title + ' · theme' })),
    ...(book.discussionQuestions || []).map(question => ({ text: question, meta: book.title + ' · discussion' }))
  ];
  if (!slides.length) return;

  let position = 0;
  const lastFocus = document.activeElement;

  function draw() {
    clear(projector);
    const slide = slides[position];
    projector.append(el('blockquote', {}, [el('p', { text: slide.text })]));
    projector.append(el('p', { class: 'astor-projector-meta', text: slide.meta + '  ·  ' + (position + 1) + ' of ' + slides.length }));
    projector.append(el('div', { class: 'astor-projector-controls' }, [
      el('button', { type: 'button', text: '← Back', onclick: () => step(-1) }),
      el('button', { type: 'button', text: 'Forward →', onclick: () => step(1) }),
      el('button', { type: 'button', text: 'Close', onclick: close })
    ]));
    projector.querySelector('button')?.focus({ preventScroll: true });
    if (!prefersReducedMotion()) projector.animate?.([{ opacity: 0.4 }, { opacity: 1 }], { duration: 140 });
  }

  function step(direction) {
    position = (position + direction + slides.length) % slides.length;
    draw();
  }

  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); step(1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  }

  function close() {
    projector.hidden = true;
    clear(projector);
    document.removeEventListener('keydown', onKey);
    lastFocus?.focus?.();
  }

  projector.hidden = false;
  document.addEventListener('keydown', onKey);
  draw();
}

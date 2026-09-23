// The essay forge: build a plan paragraph by paragraph from a real question.
//
// It asks for the three things a paragraph needs and refuses to let the first
// one be a topic. Evidence is chosen from the checked quotations, so the
// reference comes with it and nothing ends up misquoted. The finished plan
// copies out as plain text or prints.

import { el, clear } from './util.mjs';
import { withBooks } from './chooser.mjs';

const chooser = document.querySelector('#astor-essay-chooser');
const mount = document.querySelector('#astor-essay-forge');

const STARTERS = [
  'The text refuses to…',
  'What looks like … is in fact…',
  'The turn comes at…',
  'Against the obvious reading,…',
  'The language does the opposite of what the plot does when…'
];

if (mount) {
  withBooks(chooser, { label: 'Which book?', filter: book => (book.essayQuestions || []).length }, book => render(book));
}

function render(book) {
  clear(mount);
  const state = {
    question: book.essayQuestions[0],
    thesis: '',
    paragraphs: []
  };

  const questionSelect = el('select', { id: 'astor-essay-question', 'aria-label': 'Choose a question' });
  for (const [index, question] of book.essayQuestions.entries()) {
    questionSelect.append(el('option', { value: String(index), text: question.question }));
  }
  questionSelect.addEventListener('change', () => {
    state.question = book.essayQuestions[Number(questionSelect.value)];
    state.paragraphs = [];
    draw();
  });

  const thesis = el('textarea', {
    'aria-label': 'Your line of argument',
    placeholder: 'One sentence: what are you arguing?'
  });
  thesis.addEventListener('input', () => { state.thesis = thesis.value; paintOutput(); });

  const body = el('div');
  mount.append(el('div', { class: 'astor-toolkit' }, [
    el('div', { class: 'astor-toolkit-head' }, [
      el('div', {}, [
        el('p', { class: 'kicker', text: 'Essay planner · ' + book.title }),
        el('h2', { text: 'Build the plan.' }),
        el('p', { text: 'Write your argument in one sentence, then add paragraphs. Each needs a point, a quotation and a comment on its effect.' })
      ])
    ]),
    el('div', { class: 'astor-panel' }, [
      el('label', { class: 'astor-compare-heading', for: questionSelect.id, text: 'The question' }),
      questionSelect,
      el('div', { class: 'astor-note', id: 'astor-essay-suggestion' }),
      el('label', { class: 'astor-compare-heading', for: 'astor-essay-thesis', text: 'Your line of argument' }),
      thesis,
      el('p', { class: 'astor-inline-note', text: 'Sentence starters: ' + STARTERS.join('  ·  ') }),
      body
    ])
  ]));
  thesis.id = 'astor-essay-thesis';

  const output = el('div');
  mount.append(output);

  function draw() {
    const suggestion = mount.querySelector('#astor-essay-suggestion');
    clear(suggestion);
    suggestion.append(el('h4', { text: 'A suggested plan' }));
    if (state.question.focus) suggestion.append(el('p', { class: 'astor-note-aside', text: state.question.focus }));
    suggestion.append(el('ol', { class: 'astor-plan' }, (state.question.plan || []).map(step => el('li', { text: step }))));
    suggestion.append(el('p', { class: 'astor-inline-note', text: 'One possible plan. Your argument can go a different way.' }));

    clear(body);
    state.paragraphs.forEach((paragraph, index) => body.append(paragraphEditor(paragraph, index)));
    body.append(el('div', { class: 'button-row' }, [
      el('button', {
        class: 'button primary', type: 'button', text: 'Add a paragraph',
        onclick: () => {
          state.paragraphs.push({ point: '', quotationId: '', effect: '' });
          draw();
          body.querySelector('.astor-note:last-of-type textarea')?.focus();
        }
      }),
      state.paragraphs.length ? el('button', {
        class: 'button secondary', type: 'button', text: 'Remove the last one',
        onclick: () => { state.paragraphs.pop(); draw(); }
      }) : null
    ].filter(Boolean)));
    paintOutput();
  }

  function paragraphEditor(paragraph, index) {
    const wrap = el('article', { class: 'astor-note' });
    wrap.append(el('h4', { text: 'Paragraph ' + (index + 1) }));

    const point = el('textarea', {
      value: paragraph.point,
      'aria-label': 'Point for paragraph ' + (index + 1),
      placeholder: 'Make a claim, not a topic. “Ambition” is a topic.'
    });
    point.addEventListener('input', () => { paragraph.point = point.value; paintOutput(); });

    const evidence = el('select', { 'aria-label': 'Evidence for paragraph ' + (index + 1) });
    evidence.append(el('option', { value: '', text: 'Choose a quotation…' }));
    for (const quotation of book.quotations) {
      evidence.append(el('option', {
        value: quotation.id,
        selected: quotation.id === paragraph.quotationId,
        text: (quotation.speaker ? quotation.speaker + ': ' : '') + shorten(quotation.text) + ' (' + quotation.reference + ')'
      }));
    }
    evidence.addEventListener('change', () => { paragraph.quotationId = evidence.value; paintOutput(); draw(); });

    const effect = el('textarea', {
      value: paragraph.effect,
      'aria-label': 'Effect for paragraph ' + (index + 1),
      placeholder: 'What is the language doing here?'
    });
    effect.addEventListener('input', () => { paragraph.effect = effect.value; paintOutput(); });

    wrap.append(el('p', { class: 'astor-compare-heading', text: 'Point' }), point);
    wrap.append(el('p', { class: 'astor-compare-heading', text: 'Evidence' }), evidence);

    const chosen = book.quotations.find(quotation => quotation.id === paragraph.quotationId);
    if (chosen) {
      wrap.append(el('blockquote', { class: 'astor-game-quote' }, [el('p', { text: chosen.text })]));
      wrap.append(el('p', { class: 'astor-quote-attribution', text: book.title + ' ' + chosen.reference }));
      wrap.append(el('p', { class: 'astor-note-aside', text: 'Astor’s note: ' + chosen.analysis }));
    }

    wrap.append(el('p', { class: 'astor-compare-heading', text: 'Effect' }), effect);
    return wrap;
  }

  function paintOutput() {
    clear(output);
    const usable = state.paragraphs.filter(paragraph => paragraph.point.trim());
    if (!state.thesis.trim() && !usable.length) return;

    const lines = [
      state.question.question,
      '',
      'Line of argument: ' + (state.thesis.trim() || '[not yet written]'),
      ''
    ];
    usable.forEach((paragraph, index) => {
      const quotation = book.quotations.find(entry => entry.id === paragraph.quotationId);
      lines.push((index + 1) + '. ' + paragraph.point.trim());
      if (quotation) lines.push('   “' + quotation.text + '” — ' + book.title + ' ' + quotation.reference);
      if (paragraph.effect.trim()) lines.push('   ' + paragraph.effect.trim());
      lines.push('');
    });
    lines.push('Plan made with the Astor Library essay planner — ' + book.href);
    const text = lines.join('\n');

    const panel = el('section', { class: 'astor-worksheet' });
    panel.append(el('h3', { text: 'Your plan' }));
    panel.append(el('p', { class: 'astor-worksheet-meta', text: book.title + ' · ' + usable.length + ' paragraph' + (usable.length === 1 ? '' : 's') }));
    panel.append(el('pre', { class: 'astor-analysis', style: 'white-space:pre-wrap;font-family:inherit', text }));

    const missing = [];
    if (!state.thesis.trim()) missing.push('a line of argument');
    if (usable.some(paragraph => !paragraph.quotationId)) missing.push('evidence in every paragraph');
    if (usable.some(paragraph => !paragraph.effect.trim())) missing.push('an effect in every paragraph');
    if (usable.length < 3) missing.push('at least three paragraphs');
    if (missing.length) {
      panel.append(el('p', { class: 'astor-inline-note', text: 'Still to do: ' + missing.join(', ') + '.' }));
    }

    const row = el('div', { class: 'button-row' });
    const copy = el('button', { class: 'button primary', type: 'button', text: 'Copy the plan' });
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; }
      catch { copy.textContent = 'Select the plan above to copy it'; }
    });
    row.append(copy);
    row.append(el('button', { class: 'button secondary', type: 'button', text: 'Print it', onclick: () => window.print() }));
    panel.append(row);
    output.append(panel);
  }

  draw();
}

function shorten(text) {
  return text.length > 54 ? text.slice(0, 52).trim() + '…' : text;
}

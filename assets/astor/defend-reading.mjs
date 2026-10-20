// Defend the reading.
//
// A critical position is set against the strongest objection to it, like two
// sides of a debate. The reader picks a side, assembles three or four lines of
// evidence for it (the balance between the two cards tips as they do), and
// then meets the line their case most needs to survive: evidence they did not
// use, drawn from themes their own evidence leaves out. They answer it in a
// sentence or two, and the case is set out as a page to copy.
//
// It is the part of literary argument a quiz cannot test: holding two
// defensible readings at once and choosing between them for a reason.
//
// The positions are described in Astor Library's own words. No words are put
// into a named critic's mouth.

import { el, clear, shuffle, prefersReducedMotion } from './util.mjs';
import { openBookPage, shortTitle, quoted } from './revise-kit.mjs';

const head = document.querySelector('#rv-head-book');
const mount = document.querySelector('#astor-defend');

if (mount) {
  openBookPage({ head, mount, active: 'defend-the-reading', filter: book => book.views >= 2 && book.quotations >= 6, render: book => render(book) });
}

const words = text => String(text || '').trim().split(/\s+/).filter(Boolean).length;

function render(book) {
  clear(mount);
  const views = book.criticalViews;
  const themeNames = new Map(book.themes.map(theme => [theme.id, theme.name]));
  let index = 0;
  let side = '';
  let theme = '';
  let chosen = [];
  let rebuttal = '';
  let counter = null;
  let skipped = new Set();

  const app = el('div', { class: 'rx-debate' });
  mount.append(app);

  function resetCase() {
    side = ''; theme = ''; chosen = []; rebuttal = ''; counter = null; skipped = new Set();
  }

  function draw(focus) {
    clear(app);
    const view = views[index];

    // The readings, as tabs.
    const tabs = el('div', { class: 'rx-reading-tabs', role: 'tablist', 'aria-label': 'Readings of ' + shortTitle(book) });
    views.forEach((entry, position) => tabs.append(el('button', {
      type: 'button', role: 'tab', class: 'rx-reading-tab', 'aria-selected': String(position === index),
      onclick: () => { if (position === index) return; index = position; resetCase(); draw('.rx-debate-title'); }
    }, [el('span', { class: 'rx-reading-num', text: 'Reading ' + (position + 1) }), el('span', { text: entry.position })])));
    app.append(tabs);

    // The two sides, with the balance between them.
    const lean = side ? Math.min(chosen.length, 4) * (side === 'for' ? -1 : 1) : 0;
    app.append(el('div', { class: 'rx-sides' }, [
      el('article', { class: 'rx-side-card is-for' + (side === 'for' ? ' is-mine' : '') }, [
        el('p', { class: 'rx-side-label', text: 'The reading' }),
        el('h2', { class: 'rx-debate-title', tabindex: '-1', text: view.position }),
        el('p', { text: view.summary })
      ]),
      el('div', { class: 'rx-balance', 'aria-hidden': 'true', style: '--lean:' + (lean * 4) + 'deg' }, [balanceSvg()]),
      el('article', { class: 'rx-side-card is-against' + (side === 'against' ? ' is-mine' : '') }, [
        el('p', { class: 'rx-side-label', text: 'The objection' }),
        el('p', { class: 'rx-side-counter', text: view.counter || 'No objection is given for this reading. What would make it fail?' })
      ])
    ]));

    // Step one: a side.
    const stepSide = el('section', { class: 'rx-debate-step' + (side ? ' is-done' : ' is-current') }, [
      stepHead(1, 'Take a side', side ? (side === 'for' ? 'You are defending the reading.' : 'You are arguing against it.') : 'Which is more convincing to you? There is no wrong choice — only an unsupported one.')
    ]);
    const choices = el('div', { class: 'rx-side-choice', role: 'radiogroup', 'aria-label': 'Your side' });
    for (const [key, label, note] of [['for', 'Defend the reading', 'Find the lines that prove it'], ['against', 'Argue against it', 'Find the lines that break it']]) {
      choices.append(el('button', {
        type: 'button', role: 'radio', class: 'rx-side-button is-' + key, 'aria-checked': String(side === key),
        onclick: () => { side = key; draw(side && chosen.length ? null : '.rx-bench'); }
      }, [el('b', { text: label }), el('span', { text: note })]));
    }
    stepSide.append(choices);
    app.append(stepSide);
    if (!side) { finishDraw(focus); return; }

    // Step two: the evidence.
    const enough = chosen.length >= 3;
    const stepEvidence = el('section', { class: 'rx-debate-step' + (chosen.length >= 2 ? ' is-done' : ' is-current') }, [
      stepHead(2, 'Build your case', 'Choose three or four quotations that ' + (side === 'for' ? 'support the reading' : 'tell against it') + '. ' + (chosen.length ? chosen.length + ' chosen.' : ''))
    ]);
    const layout = el('div', { class: 'rx-bench-layout' });
    const bench = el('div', { class: 'rx-bench', tabindex: '-1' });
    const chips = el('div', { class: 'rx-filter-chips', role: 'group', 'aria-label': 'Filter by theme' });
    chips.append(el('button', { type: 'button', class: 'rx-chip', 'aria-pressed': String(!theme), text: 'All lines', onclick: () => { theme = ''; draw('.rx-bench'); } }));
    for (const entry of book.themes) chips.append(el('button', { type: 'button', class: 'rx-chip', 'aria-pressed': String(theme === entry.id), text: entry.name, onclick: () => { theme = entry.id; draw('.rx-bench'); } }));
    bench.append(chips);
    const list = el('ul', { class: 'rx-bench-list' });
    for (const quotation of book.quotations.filter(entry => !theme || (entry.themes || []).includes(theme))) {
      const isIn = chosen.includes(quotation.id);
      list.append(el('li', {}, [el('button', {
        type: 'button', class: 'rx-bench-card' + (isIn ? ' is-in' : ''), 'aria-pressed': String(isIn),
        onclick: () => {
          if (isIn) chosen = chosen.filter(id => id !== quotation.id);
          else chosen.push(quotation.id);
          counter = null;
          draw();
          app.querySelector('[data-q="' + quotation.id + '"]')?.focus({ preventScroll: true });
        },
        'data-q': quotation.id
      }, [
        el('span', { class: 'rx-bench-text', text: quoted(quotation.text) }),
        el('span', { class: 'rx-bench-meta', text: [quotation.speaker, quotation.reference].filter(Boolean).join(' · ') }),
        el('span', { class: 'rx-bench-tags', text: (quotation.themes || []).map(id => themeNames.get(id)).filter(Boolean).join(' · ') }),
        el('span', { class: 'rx-bench-add', 'aria-hidden': 'true', text: isIn ? '✓ In your case' : '+ Add' })
      ])]));
    }
    bench.append(list);

    const caseList = el('aside', { class: 'rx-case', 'aria-label': 'Your case so far' }, [
      el('p', { class: 'rx-eyebrow', text: side === 'for' ? 'Your case for' : 'Your case against' }),
      el('div', { class: 'rx-case-meter' }, [0, 1, 2, 3].map(slot => el('i', { class: slot < chosen.length ? 'is-on' : '' })))
    ]);
    if (!chosen.length) caseList.append(el('p', { class: 'rx-case-empty', text: 'Nothing yet. Add lines from the list.' }));
    const caseItems = el('ol', { class: 'rx-case-list' });
    for (const id of chosen) {
      const quotation = book.quotations.find(entry => entry.id === id);
      caseItems.append(el('li', {}, [
        el('span', { text: quoted(clip(quotation.text, 90)) }),
        el('button', { type: 'button', class: 'rx-icon-button', 'aria-label': 'Remove this line from your case', html: '&times;', onclick: () => { chosen = chosen.filter(entry => entry !== id); counter = null; draw(); } })
      ]));
    }
    caseList.append(caseItems);
    caseList.append(el('p', { class: 'rx-case-hint', text: chosen.length < 3 ? (3 - chosen.length) + ' more for a strong case.' : chosen.length > 4 ? 'Strong cases are selective: four lines you can analyse beat eight you can’t.' : 'A strong case. Now face the hardest objection.' }));
    layout.append(bench, caseList);
    stepEvidence.append(layout);
    app.append(stepEvidence);
    if (chosen.length < 2) { finishDraw(focus); return; }

    // Step three: the evidence the case has to survive.
    if (!counter) counter = pickCounterEvidence(book, new Set(chosen), skipped);
    const stepAnswer = el('section', { class: 'rx-debate-step is-current' }, [
      stepHead(3, 'Answer the other side', 'A case is only as good as its answer to the best evidence against it. Here is a line your case leaves out.')
    ]);
    if (counter) {
      stepAnswer.append(el('figure', { class: 'rx-counter' }, [
        el('p', { class: 'rx-label', text: 'Evidence you have not used' }),
        el('blockquote', {}, [el('p', { text: counter.text })]),
        el('figcaption', { text: [counter.speaker, counter.reference].filter(Boolean).join(' · ') }),
        el('details', { class: 'rx-help' }, [el('summary', { text: 'What Astor’s note says about it' }), el('p', { text: counter.analysis })]),
        el('button', { type: 'button', class: 'rx-link-button', text: 'Show me a different line', onclick: () => { skipped.add(counter.id); counter = null; draw('.rx-counter'); } })
      ]));
    }
    const coach = el('p', { class: 'rx-mini-coach', 'aria-live': 'polite' });
    const box = el('textarea', { class: 'rx-textarea', id: 'rx-rebuttal', rows: '4', placeholder: 'Admit what the line shows, then say why your case still stands. “This line does suggest …, but …”' });
    box.value = rebuttal;
    const paint = () => {
      const count = words(box.value);
      const concedes = /\b(but|however|although|though|admittedly|yet|even so|nevertheless|while)\b/i.test(box.value);
      coach.textContent = !count ? '' : count < 15 ? 'Say a little more: what does the line show, and why doesn’t it sink your case?' : !concedes ? 'Strong answers concede something first. Try “Admittedly … but …”.' : '✓ You concede a point and keep your argument. That is how critics argue.';
      coach.className = 'rx-mini-coach ' + (!count ? '' : count < 15 || !concedes ? 'is-warn' : 'is-good');
    };
    box.addEventListener('input', () => { rebuttal = box.value; paint(); });
    paint();
    stepAnswer.append(el('label', { class: 'rx-field-label', for: 'rx-rebuttal', text: 'Your answer' }), box, coach,
      el('div', { class: 'rx-results-actions is-left' }, [el('button', { type: 'button', class: 'rx-button is-primary', text: 'Set out my case', onclick: () => showCase(view) })]));
    app.append(stepAnswer);
    finishDraw(focus);
  }

  function finishDraw(focus) {
    if (!focus) return;
    const node = app.querySelector(focus);
    node?.focus?.({ preventScroll: true });
    node?.scrollIntoView?.({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  function showCase(view) {
    const quotations = chosen.map(id => book.quotations.find(quotation => quotation.id === id));
    const text = [
      (side === 'for' ? 'Defending: ' : 'Arguing against: ') + view.position,
      '',
      view.summary,
      '',
      'Evidence:',
      ...quotations.map(quotation => '  ' + quoted(quotation.text) + ' — ' + book.title + ' ' + quotation.reference),
      '',
      'The objection: ' + (view.counter || '—'),
      counter ? 'The hardest line: ' + quoted(counter.text) + ' (' + counter.reference + ')' : '',
      'My answer: ' + (rebuttal.trim() || '[not yet written]')
    ].filter(line => line !== null).join('\n');

    const sheet = el('article', { class: 'rx-doc rx-case-sheet', tabindex: '-1' }, [
      el('p', { class: 'rx-doc-kicker', text: book.title + ' · ' + (side === 'for' ? 'The case for' : 'The case against') }),
      el('h3', { class: 'rx-doc-question', text: view.position }),
      el('p', { text: view.summary }),
      el('p', { class: 'rx-label', text: 'Evidence' }),
      el('ol', { class: 'rx-doc-paras' }, quotations.map(quotation => el('li', {}, [el('p', { class: 'rx-doc-evidence', text: quoted(quotation.text) + ' (' + [quotation.speaker, quotation.reference].filter(Boolean).join(', ') + ')' })]))),
      el('p', {}, [el('b', { text: 'The objection. ' }), view.counter || '—']),
      counter ? el('p', { class: 'rx-doc-evidence' }, [el('b', { text: 'The hardest line. ' }), quoted(counter.text) + ' (' + counter.reference + ')']) : null,
      el('p', {}, [el('b', { text: 'My answer. ' }), rebuttal.trim() || el('em', { text: 'Not yet written — answer the line above to finish the case.' })])
    ]);
    const copy = el('button', { class: 'rx-button is-primary', type: 'button', text: 'Copy my case' });
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; } catch { copy.textContent = 'Select the case above to copy it'; }
    });
    const wrap = el('section', { class: 'rx-case-out' }, [sheet, el('div', { class: 'rx-results-actions is-left' }, [
      copy,
      el('button', { class: 'rx-button is-secondary', type: 'button', text: 'Argue the other side', onclick: () => { side = side === 'for' ? 'against' : 'for'; chosen = []; counter = null; rebuttal = ''; skipped = new Set(); draw('.rx-bench'); } }),
      views.length > 1 ? el('button', { class: 'rx-button is-quiet', type: 'button', text: 'Try another reading', onclick: () => { index = (index + 1) % views.length; resetCase(); draw('.rx-debate-title'); } }) : null
    ])]);
    app.querySelector('.rx-case-out')?.remove();
    app.append(wrap);
    sheet.focus({ preventScroll: true });
    sheet.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  draw();
}

function stepHead(number, title, note) {
  return el('header', { class: 'rx-debate-head' }, [
    el('span', { class: 'rx-step-number', text: String(number) }),
    el('div', {}, [el('h3', { text: title }), el('p', { text: note })])
  ]);
}

function clip(text, length) {
  return text.length > length ? text.slice(0, text.lastIndexOf(' ', length)) + '…' : text;
}

function balanceSvg() {
  const span = el('span', { class: 'rx-balance-art' });
  span.innerHTML = '<svg width="74" height="64" viewBox="0 0 74 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M37 10v46M27 58h20"/><circle cx="37" cy="8" r="2.4"/>' +
    '<g class="rx-balance-beam"><path d="M9 14h56"/><path d="M13 14 6 30h14Z"/><path d="M61 14l-7 16h14Z"/><path d="M5 30c1 4 4 6 8 6s7-2 8-6M53 30c1 4 4 6 8 6s7-2 8-6"/></g></svg>';
  return span;
}

// Something the reader has deliberately not used is a better prompt than a
// random line: it is the evidence their argument has to survive.
function pickCounterEvidence(book, chosen, skipped = new Set()) {
  const unused = book.quotations.filter(quotation => !chosen.has(quotation.id) && !skipped.has(quotation.id));
  const chosenThemes = new Set(book.quotations
    .filter(quotation => chosen.has(quotation.id))
    .flatMap(quotation => quotation.themes || []));
  const contrasting = unused.filter(quotation => !(quotation.themes || []).some(id => chosenThemes.has(id)));
  return shuffle(contrasting.length ? contrasting : unused)[0] || null;
}

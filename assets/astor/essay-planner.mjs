// The essay planner: build a plan in four steps from a real question.
//
//   1 Question    choose one of the book's essay questions
//   2 Argument    say in a sentence what you will argue, with coaching on
//                 whether it is an argument yet, and one model route to compare
//   3 Paragraphs  each one a point, a piece of checked evidence and the
//                 analysis of it; evidence is chosen from the book's
//                 quotations, the ones that fit the question first, so the
//                 reference comes with it and nothing ends up misquoted
//   4 Review      a conclusion, a checklist, and the plan set out as a page to
//                 copy, download or print
//
// Plans are kept in this browser, one for each question of each book, so a
// student can leave and come back. Nothing is sent anywhere.

import { el, clear, download, prefersReducedMotion } from './util.mjs';
import { openBookPage, shortTitle, quoted } from './revise-kit.mjs';

const head = document.querySelector('#rv-head-book');
const mount = document.querySelector('#astor-essay-forge');
const STORE = 'astor-essay-plans';

const STEPS = [
  { id: 'question', label: 'Question' },
  { id: 'argument', label: 'Argument' },
  { id: 'paragraphs', label: 'Paragraphs' },
  { id: 'review', label: 'Review' }
];

const STARTERS = [
  'Although it first seems that …, in fact …',
  'Through …, the writer shows that …',
  'The book presents … not as … but as …',
  'By the end, … has become …'
];

const ANALYSIS_PROMPTS = [
  'The word “…” suggests …',
  'This makes the reader feel …',
  'This links to the wider theme of … because …',
  'A contemporary audience would have …'
];

if (mount) {
  openBookPage({ head, mount, active: 'essay-forge', filter: book => book.essays > 0, render: book => render(book) });
}

function readPlans() {
  try { return JSON.parse(window.localStorage.getItem(STORE) || '{}') || {}; } catch { return {}; }
}
function writePlans(plans) {
  try { window.localStorage.setItem(STORE, JSON.stringify(plans)); return true; } catch { return false; }
}

const words = text => String(text || '').trim().split(/\s+/).filter(Boolean).length;
const REASONING = /\b(because|through|by|although|though|while|whereas|rather than|not .+ but|so that|which|shows|suggests|reveals|presents|uses|exposes|argues|turns|becomes)\b/i;

function blankPlan() {
  return { thesis: '', paragraphs: [blankParagraph(), blankParagraph(), blankParagraph()], conclusion: '', step: 'question', updated: 0 };
}
function blankParagraph() {
  return { point: '', quotationId: '', analysis: '' };
}

// The quotations that fit a question best: those carrying a theme, technique
// or character the question names, or sharing its words.
function suggestions(book, question, paragraphIndex = -1) {
  const text = (question.question + ' ' + (question.focus || '') + ' ' + (question.plan || []).join(' ')).toLowerCase();
  const terms = new Set(text.match(/\p{L}{4,}/gu) || []);
  const named = list => new Set((list || []).filter(item => (item.name || '').toLowerCase().split(/\W+/).some(word => word.length > 3 && terms.has(word))).map(item => item.id));
  const themes = named(book.themes);
  const characters = named(book.characters);
  const techniques = named(book.techniques);
  // Plans often cite references ("1.3", "5.5"); a quotation from there fits.
  const refs = new Set(text.match(/\b\d+\.\d+\b/g) || []);
  // The step of the model route this paragraph matches counts most.
  const step = String((question.plan || [])[paragraphIndex] || '').toLowerCase();
  const stepRefs = new Set(step.match(/\b\d+\.\d+\b/g) || []);
  const stepTerms = new Set(step.match(/\p{L}{5,}/gu) || []);
  const inRefs = (quotation, set) => quotation.reference && [...set].some(ref => quotation.reference.startsWith(ref + '.') || quotation.reference === ref);
  return book.quotations.map(quotation => {
    let score = 0;
    for (const id of quotation.themes || []) if (themes.has(id)) score += 2;
    for (const id of quotation.characters || []) if (characters.has(id)) score += 2;
    for (const id of quotation.techniques || []) if (techniques.has(id)) score += 1;
    if (inRefs(quotation, stepRefs)) score += 6;
    else if (inRefs(quotation, refs)) score += 2;
    for (const word of (quotation.text + ' ' + (quotation.context || '')).toLowerCase().match(/\p{L}{5,}/gu) || []) if (stepTerms.has(word)) score += 1;
    for (const word of (quotation.analysis || '').toLowerCase().match(/\p{L}{6,}/gu) || []) if (terms.has(word)) score += 0.25;
    return { quotation, score };
  }).sort((a, b) => b.score - a.score);
}

function render(book) {
  clear(mount);
  const plans = readPlans();
  const mine = plans[book.slug] || { question: 0, byQuestion: {} };
  let questionIndex = Math.min(mine.question || 0, book.essayQuestions.length - 1);
  let plan = mine.byQuestion?.[questionIndex] || blankPlan();
  let picking = -1;   // which paragraph's evidence picker is open
  let saved = true;

  const app = el('div', { class: 'rx-essay' });
  const stepper = el('ol', { class: 'rx-stepper', 'aria-label': 'Steps' });
  const main = el('div', { class: 'rx-essay-main' });
  const side = el('aside', { class: 'rx-essay-side', 'aria-label': 'How your plan is going' });
  const status = el('p', { class: 'rx-save-status', 'aria-live': 'polite' });
  app.append(stepper, el('div', { class: 'rx-essay-layout' }, [main, side]));
  mount.append(app);

  let saveTimer = null;
  function save() {
    plan.updated = Date.now();
    const all = readPlans();
    const entry = all[book.slug] || { question: 0, byQuestion: {} };
    entry.question = questionIndex;
    entry.byQuestion = entry.byQuestion || {};
    entry.byQuestion[questionIndex] = plan;
    all[book.slug] = entry;
    saved = writePlans(all);
    status.textContent = saved ? 'Saved in this browser' : 'This browser isn’t saving, so copy your plan before you leave';
  }
  function soon() {
    status.textContent = 'Saving…';
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => { save(); drawSide(); }, 400);
  }

  const question = () => book.essayQuestions[questionIndex];

  function go(step) {
    plan.step = step;
    save();
    draw();
    const top = app.getBoundingClientRect().top;
    if (top < 0) app.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    main.querySelector('h2')?.focus({ preventScroll: true });
  }

  function checks() {
    const filled = plan.paragraphs.filter(paragraph => paragraph.point.trim() || paragraph.quotationId || paragraph.analysis.trim());
    return [
      { done: true, label: 'A question chosen' },
      { done: words(plan.thesis) >= 10 && REASONING.test(plan.thesis), label: 'An argument that says how or why', partial: words(plan.thesis) > 0 },
      { done: filled.length >= 3, label: 'At least three paragraphs', partial: filled.length > 0 },
      { done: filled.length > 0 && filled.every(paragraph => words(paragraph.point) >= 6), label: 'A clear point in each paragraph', partial: filled.some(paragraph => paragraph.point.trim()) },
      { done: filled.length > 0 && filled.every(paragraph => paragraph.quotationId), label: 'Evidence in each paragraph', partial: filled.some(paragraph => paragraph.quotationId) },
      { done: filled.length > 0 && filled.every(paragraph => words(paragraph.analysis) >= 12), label: 'Analysis of every quotation', partial: filled.some(paragraph => paragraph.analysis.trim()) },
      { done: words(plan.conclusion) >= 8, label: 'A conclusion that answers the question', partial: words(plan.conclusion) > 0 }
    ];
  }

  function drawStepper() {
    clear(stepper);
    const list = checks();
    const doneFor = { question: true, argument: list[1].done, paragraphs: list[2].done && list[4].done, review: list.every(item => item.done) };
    STEPS.forEach((step, index) => {
      const here = plan.step === step.id;
      stepper.append(el('li', {}, [el('button', {
        type: 'button', class: 'rx-step' + (here ? ' is-here' : '') + (doneFor[step.id] && !here ? ' is-done' : ''),
        'aria-current': here ? 'step' : null, onclick: () => go(step.id)
      }, [el('span', { class: 'rx-step-number', text: doneFor[step.id] && !here ? '✓' : String(index + 1) }), el('span', { text: step.label })])]));
    });
  }

  function drawSide() {
    drawStepper();
    clear(side);
    const list = checks();
    const done = list.filter(item => item.done).length;
    side.append(
      el('p', { class: 'rx-eyebrow', text: 'Your plan' }),
      el('p', { class: 'rx-side-question', text: question().question }),
      el('div', { class: 'rx-meter is-large', role: 'img', 'aria-label': done + ' of ' + list.length + ' things a strong plan needs' }, [el('i', { style: 'width:' + Math.round(done / list.length * 100) + '%' })]),
      el('p', { class: 'rx-side-count', text: done === list.length ? 'Ready to write.' : done + ' of ' + list.length + ' done' }),
      el('ul', { class: 'rx-checklist' }, list.map(item => el('li', { class: item.done ? 'is-done' : item.partial ? 'is-partial' : '' }, [el('i', { 'aria-hidden': 'true' }), el('span', { text: item.label }), el('span', { class: 'rx-visually-hidden', text: item.done ? ' (done)' : ' (not yet)' })]))),
      status
    );
  }

  function draw() {
    clear(main);
    picking = -1;
    if (plan.step === 'question') drawQuestion();
    else if (plan.step === 'argument') drawArgument();
    else if (plan.step === 'paragraphs') drawParagraphs();
    else drawReview();
    drawSide();
  }

  // --- 1: the question -------------------------------------------------------

  function drawQuestion() {
    main.append(el('h2', { class: 'rx-essay-title', tabindex: '-1', text: 'Choose a question' }),
      el('p', { class: 'rx-essay-lede', text: 'Pick the one you want to practise. Each question keeps its own plan, so you can come back to any of them.' }));
    const list = el('div', { class: 'rx-question-list', role: 'radiogroup', 'aria-label': 'Essay questions' });
    const all = readPlans()[book.slug]?.byQuestion || {};
    book.essayQuestions.forEach((entry, index) => {
      const started = all[index] && (all[index].thesis || all[index].paragraphs?.some(paragraph => paragraph.point));
      list.append(el('button', {
        type: 'button', role: 'radio', class: 'rx-question', 'aria-checked': String(index === questionIndex),
        onclick: () => {
          if (index !== questionIndex) {
            save();
            questionIndex = index;
            plan = readPlans()[book.slug]?.byQuestion?.[index] || blankPlan();
          }
          go(words(plan.thesis) ? (plan.step === 'question' ? 'argument' : plan.step) : 'argument');
        }
      }, [
        el('span', { class: 'rx-question-number', text: String(index + 1) }),
        el('span', { class: 'rx-question-body' }, [
          el('span', { class: 'rx-question-text', text: entry.question }),
          entry.focus ? el('span', { class: 'rx-question-focus', text: entry.focus }) : null
        ]),
        started ? el('span', { class: 'rx-badge', text: 'Started' }) : null
      ]));
    });
    main.append(list);
  }

  // --- 2: the argument -------------------------------------------------------

  function drawArgument() {
    main.append(el('h2', { class: 'rx-essay-title', tabindex: '-1', text: 'What are you arguing?' }),
      el('p', { class: 'rx-essay-question', text: question().question }),
      el('p', { class: 'rx-essay-lede', text: 'Answer the question in one or two sentences. A good argument takes a position and says how or why — it is something a reader could disagree with.' }));

    const coach = el('div', { class: 'rx-coach', 'aria-live': 'polite' });
    const thesis = el('textarea', { class: 'rx-textarea is-large', id: 'rx-thesis', rows: '4', placeholder: 'e.g. Macbeth is responsible for his downfall because the witches only predict; every decision to kill is his own.' });
    thesis.value = plan.thesis;
    const paint = () => {
      clear(coach);
      const count = words(thesis.value);
      let tone = 'is-idle';
      let text = 'Write your argument above. Aim for one sentence of 15 to 40 words.';
      if (count > 0 && count < 8) { tone = 'is-warn'; text = 'That’s a topic, not yet an argument. Say what you think about it, and why.'; }
      else if (count >= 8 && !REASONING.test(thesis.value)) { tone = 'is-warn'; text = 'Good start. Now add how or why: try “because…”, “through…” or “although…”.'; }
      else if (count >= 8 && count < 10) { tone = 'is-warn'; text = 'Nearly. Add a few words on how the writer shows it.'; }
      else if (count > 60) { tone = 'is-warn'; text = 'That’s long for an argument. Can you say the heart of it in one sentence?'; }
      else if (count >= 10) { tone = 'is-good'; text = 'That’s an argument: it takes a position and gives a reason. Every paragraph should now prove part of it.'; }
      coach.className = 'rx-coach ' + tone;
      coach.append(el('span', { class: 'rx-coach-mark', 'aria-hidden': 'true', text: tone === 'is-good' ? '✓' : tone === 'is-warn' ? '!' : '✎' }), el('span', { text }), el('span', { class: 'rx-coach-count', text: count + ' words' }));
    };
    thesis.addEventListener('input', () => { plan.thesis = thesis.value; paint(); soon(); });
    paint();

    const starters = el('div', { class: 'rx-starters' }, [el('span', { class: 'rx-label', text: 'Stuck? Start with' })]);
    for (const starter of STARTERS) {
      starters.append(el('button', { type: 'button', class: 'rx-chip', text: starter, onclick: () => insert(thesis, starter) }));
    }

    main.append(el('label', { class: 'rx-field-label', for: 'rx-thesis', text: 'Your argument' }), thesis, coach, starters);

    if ((question().plan || []).length) {
      main.append(el('details', { class: 'rx-model' }, [
        el('summary', { text: 'Compare with one possible route through this question' }),
        question().focus ? el('p', { class: 'rx-model-focus', text: question().focus }) : null,
        el('ol', {}, question().plan.map(step => el('li', { text: step }))),
        el('p', { class: 'rx-model-note', text: 'One route among many. Your argument can go a different way — examiners reward a clear line, not this one.' })
      ]));
    }
    main.append(nav('question', 'paragraphs', 'Next: build your paragraphs'));
  }

  // --- 3: the paragraphs -----------------------------------------------------

  function drawParagraphs() {
    main.append(el('h2', { class: 'rx-essay-title', tabindex: '-1', text: 'Build your paragraphs' }),
      el('p', { class: 'rx-essay-lede', text: 'Each paragraph proves one part of your argument: a point, a quotation that supports it, and what the language in it is doing.' }));
    if (plan.thesis.trim()) main.append(el('p', { class: 'rx-thesis-echo' }, [el('span', { class: 'rx-label', text: 'Your argument' }), el('span', { text: plan.thesis })]));

    const list = el('ol', { class: 'rx-paragraphs' });
    plan.paragraphs.forEach((paragraph, index) => list.append(el('li', {}, [paragraphCard(paragraph, index)])));
    main.append(list);
    main.append(el('div', { class: 'rx-row' }, [
      el('button', { type: 'button', class: 'rx-button is-secondary', text: '+ Add a paragraph', onclick: () => {
        plan.paragraphs.push(blankParagraph());
        save(); draw();
        main.querySelectorAll('.rx-para')[plan.paragraphs.length - 1]?.querySelector('textarea')?.focus();
      } })
    ]));
    main.append(nav('argument', 'review', 'Next: conclusion and review'));
  }

  function paragraphCard(paragraph, index) {
    const card = el('article', { class: 'rx-para' });
    const model = (question().plan || [])[index];
    card.append(el('header', { class: 'rx-para-head' }, [
      el('h3', { text: 'Paragraph ' + (index + 1) }),
      el('span', { class: 'rx-para-tools' }, [
        el('button', { type: 'button', class: 'rx-icon-button', 'aria-label': 'Move paragraph ' + (index + 1) + ' up', disabled: index === 0, html: '&uarr;', onclick: () => { swap(index, index - 1); } }),
        el('button', { type: 'button', class: 'rx-icon-button', 'aria-label': 'Move paragraph ' + (index + 1) + ' down', disabled: index === plan.paragraphs.length - 1, html: '&darr;', onclick: () => { swap(index, index + 1); } }),
        plan.paragraphs.length > 1 ? el('button', { type: 'button', class: 'rx-icon-button', 'aria-label': 'Remove paragraph ' + (index + 1), html: '&times;', onclick: () => {
          if ((paragraph.point || paragraph.analysis) && !window.confirm('Remove paragraph ' + (index + 1) + '? What you wrote in it will go.')) return;
          plan.paragraphs.splice(index, 1); save(); draw();
        } }) : null
      ])
    ]));
    if (model) card.append(el('p', { class: 'rx-para-model' }, [el('span', { class: 'rx-label', text: 'One idea' }), el('span', { text: model })]));

    // Point
    const pointId = 'rx-point-' + index;
    const point = el('textarea', { class: 'rx-textarea', id: pointId, rows: '2', placeholder: 'The claim this paragraph proves. “Ambition” is a topic; “Macbeth’s ambition needs his wife’s scorn to become action” is a point.' });
    point.value = paragraph.point;
    const pointCoach = el('p', { class: 'rx-mini-coach', 'aria-live': 'polite' });
    const paintPoint = () => {
      const count = words(point.value);
      pointCoach.textContent = !count ? '' : count < 6 ? 'Make it a claim: what about it?' : '✓ A clear point.';
      pointCoach.className = 'rx-mini-coach ' + (!count ? '' : count < 6 ? 'is-warn' : 'is-good');
    };
    point.addEventListener('input', () => { paragraph.point = point.value; paintPoint(); soon(); });
    paintPoint();
    card.append(el('div', { class: 'rx-pea' }, [
      el('label', { class: 'rx-pea-label', for: pointId }, [el('b', { text: 'P' }), el('span', { text: 'Point' })]),
      el('div', {}, [point, pointCoach])
    ]));

    // Evidence
    const chosen = book.quotations.find(quotation => quotation.id === paragraph.quotationId);
    const evidence = el('div', {});
    if (chosen) {
      evidence.append(el('figure', { class: 'rx-evidence' }, [
        el('blockquote', {}, [el('p', { text: chosen.text })]),
        el('figcaption', { text: [chosen.speaker, chosen.reference].filter(Boolean).join(' · ') }),
        el('button', { type: 'button', class: 'rx-link-button', text: 'Change quotation', onclick: () => openPicker(index, card) })
      ]));
    } else {
      evidence.append(el('button', { type: 'button', class: 'rx-choose-evidence', onclick: () => openPicker(index, card) }, [
        el('span', { 'aria-hidden': 'true', text: '❝' }), el('span', { text: 'Choose a quotation as evidence' })
      ]));
    }
    card.append(el('div', { class: 'rx-pea' }, [
      el('span', { class: 'rx-pea-label' }, [el('b', { text: 'E' }), el('span', { text: 'Evidence' })]),
      evidence
    ]));
    card.append(el('div', { class: 'rx-picker-slot' }));

    // Analysis
    const analysisId = 'rx-analysis-' + index;
    const analysis = el('textarea', { class: 'rx-textarea', id: analysisId, rows: '3', placeholder: 'What is the language doing? Zoom in on a word or image, then say what it shows and how it supports your point.' });
    analysis.value = paragraph.analysis;
    const analysisCoach = el('p', { class: 'rx-mini-coach', 'aria-live': 'polite' });
    const paintAnalysis = () => {
      const count = words(analysis.value);
      const quotes = /[“"‘'][^”"’']{2,}[”"’']/.test(analysis.value);
      analysisCoach.textContent = !count ? '' : count < 12 ? 'Say more: what does a single word or image suggest?' : !quotes ? 'Strong analysis usually quotes a single word. Try putting one in quotation marks.' : '✓ Close analysis.';
      analysisCoach.className = 'rx-mini-coach ' + (!count ? '' : count < 12 || !quotes ? 'is-warn' : 'is-good');
    };
    analysis.addEventListener('input', () => { paragraph.analysis = analysis.value; paintAnalysis(); soon(); });
    paintAnalysis();
    const prompts = el('div', { class: 'rx-starters is-small' });
    for (const prompt of ANALYSIS_PROMPTS) prompts.append(el('button', { type: 'button', class: 'rx-chip', text: prompt, onclick: () => insert(analysis, prompt) }));
    const help = chosen ? el('details', { class: 'rx-help' }, [
      el('summary', { text: 'Stuck? Read Astor’s note on this line' }),
      el('p', { text: chosen.analysis })
    ]) : null;
    card.append(el('div', { class: 'rx-pea' }, [
      el('label', { class: 'rx-pea-label', for: analysisId }, [el('b', { text: 'A' }), el('span', { text: 'Analysis' })]),
      el('div', {}, [analysis, analysisCoach, prompts, help])
    ]));
    return card;
  }

  function swap(from, to) {
    [plan.paragraphs[from], plan.paragraphs[to]] = [plan.paragraphs[to], plan.paragraphs[from]];
    save(); draw();
    main.querySelectorAll('.rx-para')[to]?.querySelector('.rx-icon-button:not([disabled])')?.focus();
  }

  function openPicker(index, card) {
    const slot = card.querySelector('.rx-picker-slot');
    if (picking === index) { clear(slot); picking = -1; return; }
    for (const other of main.querySelectorAll('.rx-picker-slot')) clear(other);
    picking = index;
    const ranked = suggestions(book, question(), index);
    const used = new Set(plan.paragraphs.map(paragraph => paragraph.quotationId).filter(Boolean));
    const search = el('input', { type: 'search', class: 'rx-search', placeholder: 'Search the quotations, speakers or themes', 'aria-label': 'Search the quotations' });
    let theme = '';
    const chips = el('div', { class: 'rx-filter-chips', role: 'group', 'aria-label': 'Filter by theme' });
    const themeChip = (id, label) => el('button', { type: 'button', class: 'rx-chip', 'aria-pressed': String(theme === id), text: label, onclick: event => {
      theme = id;
      for (const node of chips.children) node.setAttribute('aria-pressed', String(node === event.currentTarget));
      paint();
    } });
    chips.append(themeChip('', 'Best fit first'));
    for (const entry of book.themes) chips.append(themeChip(entry.id, entry.name));
    const list = el('ul', { class: 'rx-pick-list' });
    const themeNames = new Map(book.themes.map(entry => [entry.id, entry.name]));
    const paint = () => {
      clear(list);
      const query = search.value.trim().toLowerCase();
      const shown = ranked.filter(({ quotation }) => (!theme || (quotation.themes || []).includes(theme))
        && (!query || (quotation.text + ' ' + (quotation.speaker || '') + ' ' + (quotation.themes || []).map(id => themeNames.get(id)).join(' ')).toLowerCase().includes(query)));
      const top = ranked[0]?.score || 0;
      for (const { quotation, score } of shown) {
        list.append(el('li', {}, [el('button', {
          type: 'button', class: 'rx-pick' + (quotation.id === plan.paragraphs[index].quotationId ? ' is-chosen' : ''),
          onclick: () => { plan.paragraphs[index].quotationId = quotation.id; save(); draw(); main.querySelectorAll('.rx-para')[index]?.querySelector('[id^=rx-analysis]')?.focus(); }
        }, [
          el('span', { class: 'rx-pick-text', text: quoted(quotation.text) }),
          el('span', { class: 'rx-pick-meta' }, [
            el('span', { text: [quotation.speaker, quotation.reference].filter(Boolean).join(' · ') }),
            !theme && !query && top > 0 && score >= top * 0.6 ? el('span', { class: 'rx-badge is-fit', text: 'Fits this question' }) : null,
            used.has(quotation.id) && quotation.id !== plan.paragraphs[index].quotationId ? el('span', { class: 'rx-badge', text: 'Used in another paragraph' }) : null
          ]),
          el('span', { class: 'rx-pick-tags', text: (quotation.themes || []).map(id => themeNames.get(id)).filter(Boolean).join(' · ') })
        ])]));
      }
      if (!shown.length) list.append(el('li', { class: 'rx-pick-none', text: 'No quotation matches. Try another word.' }));
    };
    search.addEventListener('input', paint);
    paint();
    slot.append(el('div', { class: 'rx-picker' }, [
      el('div', { class: 'rx-picker-head' }, [
        el('p', { class: 'rx-label', text: 'Choose evidence for paragraph ' + (index + 1) }),
        el('button', { type: 'button', class: 'rx-link-button', text: 'Close', onclick: () => { clear(slot); picking = -1; } })
      ]),
      search, chips, list
    ]));
    search.focus({ preventScroll: true });
    slot.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  // --- 4: review ---------------------------------------------------------------

  function drawReview() {
    main.append(el('h2', { class: 'rx-essay-title', tabindex: '-1', text: 'Conclude and review' }),
      el('p', { class: 'rx-essay-lede', text: 'Finish by answering the question directly, then read your plan through as one page.' }));
    const conclusion = el('textarea', { class: 'rx-textarea', id: 'rx-conclusion', rows: '3', placeholder: 'Return to the question: so how far, or why? Say what your paragraphs add up to, in a sentence or two.' });
    conclusion.value = plan.conclusion;
    conclusion.addEventListener('input', () => { plan.conclusion = conclusion.value; soon(); paintDoc(); });
    main.append(el('label', { class: 'rx-field-label', for: 'rx-conclusion', text: 'Your conclusion' }), conclusion);

    const docSlot = el('div', {});
    main.append(docSlot);
    const paintDoc = () => { clear(docSlot); docSlot.append(planDocument()); };
    paintDoc();

    const missing = checks().filter(item => !item.done);
    if (missing.length) {
      main.append(el('div', { class: 'rx-coach is-warn' }, [
        el('span', { class: 'rx-coach-mark', 'aria-hidden': 'true', text: '!' }),
        el('span', { text: 'Still to do: ' + missing.map(item => item.label.charAt(0).toLowerCase() + item.label.slice(1)).join('; ') + '.' })
      ]));
    }

    const copy = el('button', { class: 'rx-button is-primary', type: 'button', text: 'Copy the plan' });
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(planText()); copy.textContent = 'Copied'; }
      catch { copy.textContent = 'Select the plan above to copy it'; }
    });
    main.append(el('div', { class: 'rx-results-actions is-left' }, [
      copy,
      el('button', { class: 'rx-button is-secondary', type: 'button', text: 'Download as text', onclick: () => download(shortTitle(book).replace(/\W+/g, '-').toLowerCase() + '-essay-plan.txt', planText()) }),
      el('button', { class: 'rx-button is-secondary', type: 'button', text: 'Print', onclick: () => {
        document.documentElement.classList.add('rx-print-plan');
        window.print();
        window.setTimeout(() => document.documentElement.classList.remove('rx-print-plan'), 500);
      } }),
      el('button', { class: 'rx-button is-quiet', type: 'button', text: 'Start this plan again', onclick: () => {
        if (!window.confirm('Clear this plan and start again? This can’t be undone.')) return;
        plan = blankPlan(); plan.step = 'argument'; save(); draw();
      } })
    ]));
    main.append(nav('paragraphs', null));
  }

  function planDocument() {
    const doc = el('article', { class: 'rx-doc' });
    doc.append(
      el('p', { class: 'rx-doc-kicker', text: book.title + ' · Essay plan' }),
      el('h3', { class: 'rx-doc-question', text: question().question }),
      el('p', { class: 'rx-doc-thesis' }, [el('b', { text: 'Argument. ' }), plan.thesis.trim() || el('em', { text: 'Not written yet.' })])
    );
    const list = el('ol', { class: 'rx-doc-paras' });
    for (const paragraph of plan.paragraphs) {
      if (!paragraph.point.trim() && !paragraph.quotationId && !paragraph.analysis.trim()) continue;
      const quotation = book.quotations.find(entry => entry.id === paragraph.quotationId);
      list.append(el('li', {}, [
        el('p', {}, [el('b', { text: 'Point. ' }), paragraph.point.trim() || el('em', { text: 'Missing.' })]),
        el('p', { class: 'rx-doc-evidence' }, [el('b', { text: 'Evidence. ' }), quotation ? quoted(quotation.text) + ' (' + [quotation.speaker, quotation.reference].filter(Boolean).join(', ') + ')' : el('em', { text: 'Missing.' })]),
        el('p', {}, [el('b', { text: 'Analysis. ' }), paragraph.analysis.trim() || el('em', { text: 'Missing.' })])
      ]));
    }
    doc.append(list);
    doc.append(el('p', { class: 'rx-doc-thesis' }, [el('b', { text: 'Conclusion. ' }), plan.conclusion.trim() || el('em', { text: 'Not written yet.' })]));
    doc.append(el('p', { class: 'rx-doc-foot', text: 'Planned with the Astor Library essay planner · quotations checked against ' + (book.sourceText?.label || 'the public-domain text') }));
    return doc;
  }

  function planText() {
    const lines = [book.title + ' — essay plan', '', question().question, '', 'ARGUMENT: ' + (plan.thesis.trim() || '[not yet written]'), ''];
    plan.paragraphs.filter(paragraph => paragraph.point.trim() || paragraph.quotationId || paragraph.analysis.trim()).forEach((paragraph, index) => {
      const quotation = book.quotations.find(entry => entry.id === paragraph.quotationId);
      lines.push('PARAGRAPH ' + (index + 1));
      lines.push('  Point: ' + (paragraph.point.trim() || '[missing]'));
      lines.push('  Evidence: ' + (quotation ? quoted(quotation.text) + ' — ' + book.title + ' ' + quotation.reference : '[missing]'));
      lines.push('  Analysis: ' + (paragraph.analysis.trim() || '[missing]'));
      lines.push('');
    });
    lines.push('CONCLUSION: ' + (plan.conclusion.trim() || '[not yet written]'), '');
    lines.push('Plan made with the Astor Library essay planner: ' + new URL(book.href, window.location.origin).href);
    return lines.join('\n');
  }

  function nav(back, forward, label) {
    const row = el('div', { class: 'rx-essay-nav' });
    row.append(back ? el('button', { type: 'button', class: 'rx-button is-quiet', text: '← Back', onclick: () => go(back) }) : el('span'));
    if (forward) row.append(el('button', { type: 'button', class: 'rx-button is-primary', onclick: () => go(forward) }, [el('span', { text: label }), el('span', { 'aria-hidden': 'true', text: ' →' })]));
    return row;
  }

  if (!plan.step) plan.step = 'question';
  draw();
}

function insert(textarea, text) {
  const value = textarea.value;
  const gap = value && !/\s$/.test(value) ? ' ' : '';
  textarea.value = value + gap + text;
  textarea.dispatchEvent(new Event('input'));
  textarea.focus();
  // Put the cursor on the first gap to fill.
  const at = textarea.value.indexOf('…', value.length);
  if (at >= 0) textarea.setSelectionRange(at, at + 1);
}


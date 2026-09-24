// The quiz runner behind every Revise quiz and Today's questions.
//
// A quiz is set like a page of the book: the line in large type, the choices
// as a list beneath it, and after each answer a note that says what the line
// is doing and where it comes. Multiple-choice questions are answered with one
// tap or key; Fill the line and Order the plot keep a Check button, because
// their answers are built up. Nothing is timed and there is no running tally.
//
// Every answer to a question built from a quotation is also a flashcard
// review of that line (store.mjs), so a line missed here comes back tomorrow
// in the flashcards and in Ten questions.
//
// Keyboard: 1 to 9 or A to D answer, Enter checks or moves on, R starts again
// at the end.

import { el, clear, shuffle, announce, prefersReducedMotion } from './util.mjs';
import { recordScore, reviewCard, scores, toggleCommonplace, inCommonplace, isRemembering } from './store.mjs';
import { cardId } from './data.mjs';
import { quotationKey, quotationFor, firstSentence, drawing, quizName, shortTitle } from './revise-kit.mjs';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export class QuizRound {
  // options: { gameId, book (full record or null), meta (shelf entry), practice,
  //            reshuffle(), onFinish(result), ownEnd, next(book) }
  constructor(container, questions, options = {}) {
    this.container = container;
    this.questions = questions;
    this.options = options;
    this.index = 0;
    this.answers = [];
    this.picked = [];
    this.checked = false;
    this.selection = null;
    this.order = null;
    this.blanks = null;
    this.live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
    this.onKey = this.handleKey.bind(this);
  }

  start() {
    document.addEventListener('keydown', this.onKey);
    this.render();
  }

  stop() {
    document.removeEventListener('keydown', this.onKey);
  }

  get current() { return this.questions[this.index]; }
  get score() { return this.answers.filter(Boolean).length; }

  handleKey(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : document.body;
    // Keys belong to whatever has focus: the book switcher, the search box and
    // any dialog keep theirs, and Enter on a button or link does what it says.
    if (target !== document.body && !this.container.contains(target)) return;
    if (target.closest('input, textarea, select')) return;
    if (event.key === 'Enter' && target.closest('button, a, summary')) return;
    if (this.index >= this.questions.length) {
      if (event.key.toLowerCase() === 'r' && !this.options.ownEnd) { event.preventDefault(); this.restart(); }
      return;
    }
    const question = this.current;
    if (question.kind === 'choice' && !this.checked) {
      const key = event.key.toUpperCase();
      const position = /^[1-9]$/.test(key) ? Number(key) - 1 : LETTERS.indexOf(key);
      if (position >= 0 && position < question.options.length && key.length === 1) {
        event.preventDefault();
        this.answerChoice(position);
        return;
      }
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.checked) this.next();
      else if (question.kind !== 'choice') this.check();
    }
  }

  // --- the question ----------------------------------------------------------

  render() {
    clear(this.container);
    this.container.append(this.live);
    if (this.index >= this.questions.length) return this.finish();

    const question = this.current;
    const total = this.questions.length;
    const page = el('div', { class: 'rv-q', 'data-kind': question.kind });

    const ticks = el('span', { class: 'rv-ticks', 'aria-hidden': 'true' });
    for (let position = 0; position < total; position += 1) {
      ticks.append(el('i', { class: position < this.index ? 'is-done' : position === this.index ? 'is-now' : '' }));
    }
    page.append(el('div', { class: 'rv-q-folio' }, [
      el('p', { text: 'Question ' + (this.index + 1) + ' of ' + total }),
      ticks
    ]));

    page.append(el('h2', { class: 'rv-q-stem', tabindex: '-1', text: question.stem }));
    if (question.quote) {
      const isClue = /^character:/.test(question.id);
      page.append(el('blockquote', { class: 'rv-q-line' + (isClue ? ' is-clue' : '') }, [el('p', { text: question.quote })]));
    }

    if (question.kind === 'choice') page.append(this.renderChoice(question));
    else if (question.kind === 'cloze') page.append(this.renderCloze(question));
    else if (question.kind === 'order') page.append(this.renderOrder(question));

    this.actions = el('div', { class: 'rv-q-actions' });
    if (question.kind !== 'choice') {
      this.actions.append(el('button', { class: 'button primary', type: 'button', text: 'Check', onclick: () => this.check() }));
    }
    this.actions.append(el('button', { class: 'rv-q-unsure', type: 'button', text: 'I don’t know', onclick: () => this.giveUp() }));
    page.append(this.actions);

    this.feedback = el('div', { class: 'rv-note', hidden: true, tabindex: '-1' });
    page.append(this.feedback);

    this.container.append(page);
    if (!prefersReducedMotion()) page.animate?.([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'ease-out' });
    // At page load focus stays where the reader is. After that it goes to the
    // question itself, so a screen reader reads the question before the answers.
    if (this.moved) page.querySelector('.rv-q-stem')?.focus({ preventScroll: true });
    this.moved = true;
  }

  renderChoice(question) {
    const list = el('div', { class: 'rv-options', role: 'group', 'aria-label': 'Answers. Choose one.' });
    this.optionButtons = question.options.map((option, position) => {
      const button = el('button', {
        class: 'rv-option', type: 'button',
        onclick: () => this.answerChoice(position)
      }, [
        el('span', { class: 'rv-option-key', text: LETTERS[position], 'aria-hidden': 'true' }),
        el('span', { class: 'rv-option-text', text: option })
      ]);
      list.append(button);
      return button;
    });
    return list;
  }

  renderCloze(question) {
    this.blanks = new Array(question.answer.length).fill(null);
    const line = el('p', { class: 'rv-cloze-line' });
    this.blankButtons = [];
    question.segments.forEach((segment, position) => {
      line.append(document.createTextNode(segment));
      if (position < question.answer.length) {
        const blank = el('button', {
          class: 'rv-blank', type: 'button',
          'aria-label': 'Blank ' + (position + 1) + ', empty',
          style: '--blank:' + Math.max(4, question.answer[position].length) + 'ch',
          onclick: () => this.clearBlank(position)
        });
        this.blankButtons.push(blank);
        line.append(blank);
      }
    });
    const bank = el('div', { class: 'rv-bank', role: 'group', 'aria-label': 'Words to place, in order' });
    this.bankButtons = question.bank.map(word => el('button', {
      class: 'rv-word', type: 'button', text: word,
      onclick: event => this.fillBlank(word, event.currentTarget)
    }));
    for (const button of this.bankButtons) bank.append(button);
    return el('div', { class: 'rv-cloze' }, [line, bank]);
  }

  fillBlank(word, button) {
    if (this.checked) return;
    const position = this.blanks.indexOf(null);
    if (position < 0) return;
    this.blanks[position] = word;
    const blank = this.blankButtons[position];
    blank.textContent = word;
    blank.classList.add('is-filled');
    blank.setAttribute('aria-label', 'Blank ' + (position + 1) + ', ' + word + '. Select to clear.');
    const others = this.bankButtons.filter(candidate => candidate !== button && !candidate.disabled);
    const after = others.find(candidate => this.bankButtons.indexOf(candidate) > this.bankButtons.indexOf(button)) || others[0];
    button.disabled = true;
    if (!this.blanks.every(Boolean)) after?.focus({ preventScroll: true });
    if (this.blanks.every(Boolean)) this.actions.querySelector('.button.primary')?.focus({ preventScroll: true });
  }

  clearBlank(position) {
    if (this.checked || !this.blanks[position]) return;
    const word = this.blanks[position];
    this.blanks[position] = null;
    const blank = this.blankButtons[position];
    blank.textContent = '';
    blank.classList.remove('is-filled');
    blank.setAttribute('aria-label', 'Blank ' + (position + 1) + ', empty');
    const button = this.bankButtons.find(candidate => candidate.textContent === word && candidate.disabled);
    if (button) button.disabled = false;
  }

  renderOrder(question) {
    this.order = question.items.slice();
    const list = el('ol', { class: 'rv-order' });
    const draw = (focusId, direction) => {
      clear(list);
      this.order.forEach((item, position) => {
        list.append(el('li', { class: 'rv-order-row' }, [
          el('span', { class: 'rv-order-label', text: item.label }),
          el('span', { class: 'rv-order-text', text: item.text }),
          el('span', { class: 'rv-order-moves' }, [
            el('button', {
              class: 'astor-game-move', type: 'button', 'aria-label': 'Move "' + item.label + '" earlier',
              disabled: position === 0, html: '&uarr;',
              onclick: () => { [this.order[position - 1], this.order[position]] = [this.order[position], this.order[position - 1]]; draw(item.id, 'up'); announce(this.live, item.label + ' moved to position ' + position); }
            }),
            el('button', {
              class: 'astor-game-move', type: 'button', 'aria-label': 'Move "' + item.label + '" later',
              disabled: position === this.order.length - 1, html: '&darr;',
              onclick: () => { [this.order[position + 1], this.order[position]] = [this.order[position], this.order[position + 1]]; draw(item.id, 'down'); announce(this.live, item.label + ' moved to position ' + (position + 2)); }
            })
          ])
        ]));
      });
      if (!focusId) return;
      const moved = this.order.findIndex(item => item.id === focusId);
      const controls = list.children[moved]?.querySelectorAll('.astor-game-move');
      const wanted = controls?.[direction === 'up' ? 0 : 1];
      (wanted && !wanted.disabled ? wanted : controls?.[direction === 'up' ? 1 : 0])?.focus();
    };
    draw();
    return list;
  }

  // --- answering -------------------------------------------------------------

  answerChoice(position) {
    if (this.checked) return;
    this.selection = position;
    this.check();
  }

  giveUp() {
    if (this.checked) return;
    this.check(true);
  }

  check(gaveUp = false) {
    if (this.checked) return this.next();
    const question = this.current;
    let correct = false;

    if (question.kind === 'choice') {
      if (!gaveUp && this.selection === null) { announce(this.live, 'Choose an answer first.'); return; }
      correct = !gaveUp && this.selection === question.answer;
      this.optionButtons.forEach((button, index) => {
        button.disabled = true;
        if (index === question.answer) button.classList.add('is-right');
        else if (index === this.selection) button.classList.add('is-wrong');
        else button.classList.add('is-other');
      });
    } else if (question.kind === 'cloze') {
      if (!gaveUp && this.blanks.includes(null)) { announce(this.live, 'Fill every blank first.'); return; }
      correct = !gaveUp && this.blanks.every((word, position) => word.toLowerCase() === question.answer[position].toLowerCase());
      this.blankButtons.forEach((blank, position) => {
        const theirs = this.blanks[position] || '';
        const right = !gaveUp && theirs.toLowerCase() === question.answer[position].toLowerCase();
        blank.classList.add(right ? 'is-right' : 'is-wrong');
        blank.textContent = question.answer[position];
        blank.disabled = true;
        blank.setAttribute('aria-label', 'Blank ' + (position + 1) + ': ' + question.answer[position] + (right ? ', right' : theirs ? ', you had ' + theirs : ''));
        if (!right && theirs) blank.after(el('s', { class: 'rv-blank-was', 'aria-hidden': 'true', text: theirs }));
      });
      for (const button of this.bankButtons) button.disabled = true;
    } else if (question.kind === 'order') {
      correct = !gaveUp && this.order.every((item, position) => item.id === question.answer[position]);
      for (const button of this.container.querySelectorAll('.astor-game-move')) button.disabled = true;
      [...this.container.querySelectorAll('.rv-order-row')].forEach((row, position) => {
        const right = correct || this.order[position].id === question.answer[position];
        row.classList.add(right ? 'is-right' : 'is-wrong');
        row.querySelector('.rv-order-moves')?.replaceWith(el('span', {
          class: 'rv-order-verdict', text: right ? 'Right place' : 'Belongs ' + ordinal(question.answer.indexOf(this.order[position].id) + 1)
        }));
      });
    }

    this.checked = true;
    this.answers.push(correct);
    this.picked.push(question.kind === 'choice' && !gaveUp ? this.selection : null);

    // A quotation answered here is a review of that line.
    const key = quotationKey(question);
    if (key && isRemembering() && !this.options.practice) reviewCard(cardId(key.slug, key.id), correct);

    clear(this.actions);
    const last = this.index === this.questions.length - 1;
    const onward = el('button', {
      class: 'button primary', type: 'button', text: last ? 'See how you did' : 'Next question',
      onclick: () => this.next()
    });

    this.writeNote(question, correct, gaveUp);
    this.feedback.after(el('div', { class: 'rv-q-actions rv-q-onward' }, [onward]));
    this.actions.remove();

    const verdict = correct ? 'Right.' : gaveUp ? 'Here is the answer.' : 'Not this time.';
    announce(this.live, verdict + ' ' + this.answerText(question) + '.');
    if (!prefersReducedMotion()) this.feedback.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    onward.focus({ preventScroll: true });
    const rect = this.feedback.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.7) this.feedback.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  answerText(question) {
    if (question.kind === 'choice') return 'The answer: ' + question.options[question.answer];
    if (question.kind === 'cloze') return 'The missing words: ' + question.answer.join(', ');
    return 'The right order is shown';
  }

  writeNote(question, correct, gaveUp) {
    const book = this.options.book;
    const quotation = quotationFor(book, question);
    const note = this.feedback;
    note.hidden = false;
    note.className = 'rv-note ' + (correct ? 'is-right' : 'is-wrong');
    clear(note);

    note.append(el('p', { class: 'rv-note-verdict', text: correct ? 'Right.' : gaveUp ? 'Here is the answer.' : 'Not this time.' }));

    if (question.kind === 'choice') {
      const answer = question.options[question.answer];
      note.append(el('p', { class: 'rv-note-answer' }, [el('span', { text: 'The answer' }), el('strong', { text: answer })]));
      if (!correct && this.selection !== null && !gaveUp) {
        const chosen = question.options[this.selection];
        const gloss = this.gloss(question, chosen);
        note.append(el('p', { class: 'rv-note-yours' }, [
          el('span', { text: 'Your answer' }), el('strong', { text: chosen }), gloss ? el('em', { text: gloss }) : null
        ]));
      }
    } else if (question.kind === 'cloze' && !correct && quotation) {
      note.append(el('p', { class: 'rv-note-answer' }, [el('span', { text: 'The line reads' }), el('strong', { text: quotation.text })]));
    } else if (question.kind === 'order' && !correct) {
      const labels = new Map(question.items.map(item => [item.id, item]));
      const list = el('ol', { class: 'rv-note-order' });
      for (const id of question.answer) {
        const item = labels.get(id);
        list.append(el('li', {}, [el('b', { text: item?.label || id }), ' ', item?.text || '']));
      }
      note.append(el('p', { class: 'rv-note-answer' }, [el('span', { text: 'The right order' })]), list);
    }

    // Where the line comes, then what it is doing.
    const where = this.whereLine(question, quotation);
    if (where) note.append(el('p', { class: 'rv-note-where', text: where }));
    const analysis = quotation?.analysis || question.explain;
    if (analysis) note.append(el('p', { class: 'rv-note-body', text: analysis }));
    if (quotation && question.explain && question.explain !== quotation.analysis) {
      note.append(el('p', { class: 'rv-note-aside' }, [el('b', { text: question.options?.[question.answer] || '' }), ' ', firstSentence(question.explain)]));
    }

    const links = el('p', { class: 'rv-note-links' });
    const key = quotationKey(question);
    const href = question.book?.href ? question.book.href + (key ? '#astor-quote-' + key.id : '') : '';
    if (href) links.append(el('a', { href, text: key ? 'Read it in the book' : 'Open ' + question.book.title }));
    if (key && (quotation || question.quote)) {
      const id = key.slug + ':' + key.id;
      const keep = el('button', {
        type: 'button', class: 'rv-keep', 'aria-pressed': String(inCommonplace(id)),
        text: inCommonplace(id) ? 'Kept in your commonplace book' : 'Keep this line'
      });
      keep.addEventListener('click', () => {
        const added = toggleCommonplace({
          id, text: quotation?.text || question.quote, reference: question.source,
          book: question.book?.title || '', bookHref: question.book?.href || ''
        });
        keep.setAttribute('aria-pressed', String(added));
        keep.textContent = added ? 'Kept in your commonplace book' : 'Keep this line';
      });
      links.append(keep);
    }
    if (links.childNodes.length) note.append(links);
  }

  // A short note on the answer the reader chose, from the book's own record:
  // who that character is, what that theme or technique means.
  gloss(question, chosen) {
    const book = this.options.book;
    if (!book) return '';
    const kind = String(question.id).split(':')[0];
    if (kind === 'who' || kind === 'character') {
      const person = book.characters.find(character => character.name === chosen);
      return person ? (person.role || firstSentence(person.summary)) : '';
    }
    if (kind === 'theme') {
      const theme = book.themes.find(entry => entry.name === chosen);
      return theme ? firstSentence(theme.summary) : '';
    }
    if (kind === 'technique') {
      const technique = book.techniques.find(entry => entry.name === chosen);
      return technique ? firstSentence(technique.definition) : '';
    }
    return '';
  }

  whereLine(question, quotation) {
    const book = this.options.book;
    const parts = [];
    if (quotation) {
      const stage = book?.structure?.find(entry => entry.id === quotation.stage);
      if (stage) parts.push(stage.label + (stage.title ? ', ' + stage.title : ''));
      if (quotation.reference) parts.push(quotation.reference);
      if (quotation.context) parts.push(quotation.context);
    } else if (question.source) {
      parts.push(question.source);
    }
    return parts.join(' · ');
  }

  next() {
    this.index += 1;
    this.checked = false;
    this.selection = null;
    this.order = null;
    this.blanks = null;
    this.render();
    this.container.scrollIntoView?.({ block: 'nearest' });
  }

  restart(questions) {
    this.index = 0;
    this.answers = [];
    this.picked = [];
    this.checked = false;
    this.selection = null;
    if (questions) this.questions = questions;
    else if (this.options.reshuffle) {
      // A fresh ten always counts, even after going over the misses.
      this.options.practice = false;
      this.questions = this.options.reshuffle();
    }
    this.render();
    this.container.scrollIntoView?.({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  // --- the end page ----------------------------------------------------------

  finish() {
    const total = this.questions.length;
    const score = this.score;
    const { gameId, book, meta, practice } = this.options;
    const slug = book?.slug || meta?.slug;
    const before = gameId && slug ? scores()[gameId]?.byBook?.[slug] || null : null;
    if (gameId && !practice) recordScore(gameId, { score, total, bookSlug: slug });
    this.options.onFinish?.({ score, total, answers: this.answers.slice() });
    if (this.options.ownEnd) return;

    const page = el('div', { class: 'rv-end' });
    if (meta?.motif) page.append(drawing(meta.motif, 30, 'rv-tailpiece'));
    page.append(el('h2', { class: 'rv-end-score', tabindex: '-1', text: score === total ? 'All ' + total + '.' : score + ' of ' + total }));
    page.append(el('p', { class: 'rv-end-what', text: [book ? shortTitle(book) : '', practice ? 'Going over the ones you missed' : quizName(gameId)].filter(Boolean).join(' · ') }));

    const marks = el('p', { class: 'rv-end-marks', role: 'img', 'aria-label': score + ' right out of ' + total });
    for (const right of this.answers) marks.append(el('i', { class: right ? 'is-right' : 'is-wrong', 'aria-hidden': 'true' }));
    page.append(marks);

    const lines = [];
    if (before && before.total && score / total > before.best / before.total && !practice) lines.push('Your best on ' + shortTitle(book) + ' was ' + before.best + ' of ' + before.total + '.');
    const pattern = this.pattern();
    if (pattern) lines.push(pattern);
    if (lines.length) page.append(el('p', { class: 'rv-end-note', text: lines.join(' ') }));

    const missed = this.questions.map((question, position) => ({ question, position })).filter(entry => !this.answers[entry.position]);
    if (missed.length) {
      page.append(el('h3', { class: 'rv-end-head', text: missed.length === 1 ? 'One to go over' : missed.length + ' to go over' }));
      const list = el('ol', { class: 'rv-end-list' });
      for (const { question, position } of missed) list.append(this.missedItem(question, this.picked[position]));
      page.append(list);
      const lines = missed.filter(entry => quotationKey(entry.question)).length;
      if (lines && isRemembering() && !practice) {
        page.append(el('p', { class: 'rv-end-small', text: (lines === 1 ? 'You’ll see this line again' : 'You’ll see these ' + lines + ' lines again') + ' tomorrow, in Ten questions and the flashcards.' }));
      }
    }

    const actions = el('div', { class: 'button-row rv-end-actions' });
    if (missed.length) {
      actions.append(el('button', {
        class: 'button primary', type: 'button', text: missed.length === 1 ? 'Go over it again' : 'Go over these ' + missed.length + ' again',
        onclick: () => this.goOver(missed.map(entry => entry.question))
      }));
    }
    const step = book && this.options.next ? this.options.next(book) : null;
    if (step) {
      page.append(el('p', { class: 'rv-end-next' }, [step.sentence + ' ', el('a', { href: step.href, text: step.label + ' →' })]));
    }
    actions.append(el('button', { class: missed.length ? 'button secondary' : 'button primary', type: 'button', text: total >= 10 ? 'Ten more' : 'Start again', onclick: () => this.restart() }));
    page.append(actions);

    const more = el('p', { class: 'rv-end-links' });
    if (book?.href) more.append(el('a', { href: book.href, text: 'Back to ' + shortTitle(book) }));
    more.append(el('a', { href: '/play/' + (slug ? '?book=' + encodeURIComponent(slug) : ''), text: 'All revision' }));
    page.append(more);

    this.container.append(page);
    announce(this.live, 'Finished. ' + score + ' out of ' + total + '.');
    page.querySelector('.rv-end-score')?.focus({ preventScroll: true });
    page.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    if (!prefersReducedMotion()) page.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
  }

  missedItem(question, pickedIndex) {
    const book = this.options.book;
    const quotation = quotationFor(book, question);
    const item = el('li', {});
    const isClue = /^character:/.test(question.id);
    const shown = quotation?.text || question.quote || '';
    if (isClue) item.append(el('p', { class: 'rv-end-line is-clue', text: shown }));
    else if (shown) item.append(el('q', { class: 'rv-end-line', text: shown }));
    else item.append(el('p', { class: 'rv-end-line', text: question.stem }));
    const facts = [];
    if (question.kind === 'choice') {
      facts.push(el('span', {}, ['The answer: ', el('strong', { text: question.options[question.answer] })]));
      if (pickedIndex !== null && pickedIndex !== undefined) facts.push(el('span', {}, ['You chose ', el('span', { text: question.options[pickedIndex] })]));
    }
    if (quotation?.reference) facts.push(el('span', { text: quotation.reference }));
    if (facts.length) item.append(el('p', { class: 'rv-end-facts' }, facts));
    const reason = firstSentence(quotation?.analysis || question.explain || '');
    // A clue can be the start of the character's summary; don't say it twice.
    if (reason && !shown.replace(/———/g, '').includes(reason.slice(0, 40).replace(/———/g, ''))) item.append(el('p', { class: 'rv-end-reason', text: reason }));
    const key = quotationKey(question);
    if (key && question.book?.href) {
      item.append(el('p', { class: 'rv-note-links' }, [el('a', { href: question.book.href + '#astor-quote-' + key.id, text: 'Read it in the book' })]));
    }
    return item;
  }

  // One true sentence about the misses, when there is one to say.
  pattern() {
    const book = this.options.book;
    if (!book) return '';
    const missed = this.questions.filter((_, position) => !this.answers[position]);
    if (missed.length < 2) return '';
    const quotations = missed.map(question => quotationFor(book, question)).filter(Boolean);
    const speakers = new Map();
    for (const quotation of quotations) if (quotation.speaker) speakers.set(quotation.speaker, (speakers.get(quotation.speaker) || 0) + 1);
    const [speaker, speakerCount] = [...speakers.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const lineCount = quotations.length;
    if (speakerCount >= 2 && speakerCount * 2 > lineCount) {
      const who = speaker.replace(/^The /, 'the ');
      return (speakerCount === lineCount
        ? (lineCount === 2 ? 'Both' : 'All ' + lineCount) + ' of the lines you missed are spoken by '
        : speakerCount + ' of the ' + lineCount + ' lines you missed are spoken by ') + who + '.';
    }
    const stages = new Map();
    for (const quotation of quotations) if (quotation.stage) stages.set(quotation.stage, (stages.get(quotation.stage) || 0) + 1);
    const [stageId, stageCount] = [...stages.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const stage = book.structure.find(entry => entry.id === stageId);
    if (stage && stageCount >= 2 && stageCount * 2 > lineCount) {
      return (stageCount === lineCount ? 'All the lines you missed come from ' : stageCount + ' of the ' + lineCount + ' lines you missed come from ') + stage.label + '.';
    }
    return '';
  }

  goOver(questions) {
    // The same questions, with the choices and words in a new order.
    const again = shuffle(questions).map(question => {
      if (question.kind === 'choice') {
        const correct = question.options[question.answer];
        const options = shuffle(question.options);
        return { ...question, options, answer: options.indexOf(correct) };
      }
      if (question.kind === 'cloze') return { ...question, bank: shuffle(question.bank) };
      if (question.kind === 'order') return { ...question, items: shuffle(question.items) };
      return question;
    });
    // The same round goes on, so the page never has two listening for keys.
    this.options = { ...this.options, practice: true };
    this.restart(again);
  }
}

function ordinal(number) {
  const tail = number % 100 >= 11 && number % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[number % 10] || 'th';
  return number + tail;
}

export function emptyState(container, message, links = []) {
  clear(container);
  const panel = el('div', { class: 'rv-empty' });
  panel.append(el('p', { text: message }));
  if (links.length) {
    const row = el('div', { class: 'button-row' });
    for (const link of links) row.append(el('a', { class: 'button secondary', href: link.href, text: link.label }));
    panel.append(row);
  }
  container.append(panel);
}

// The quiz runner behind every Revise quiz and Today's questions.
//
// A round is a stage: a progress track that fills green and red as the reader
// goes, one question card at a time, and after each answer a note that says
// why the answer is right and, when the reader chose wrongly, what the answer
// they chose actually is. Each kind of question has its own way of being
// answered, so a round never feels like the same form filled in ten times:
//
//   who said it       speakers as monogrammed roundels
//   who is this       a dossier with the name struck out
//   theme, technique  tiles that each explain themselves once answered
//   fill the line     words placed into the line itself
//   order the plot    cards dragged (or moved with buttons) into sequence
//   which book        the covers themselves
//   which year        the four years laid out on a timeline
//
// Every answer to a question built from a quotation is also a flashcard
// review of that line (store.mjs), so a line missed here comes back tomorrow.
// A line answered only after a hint is not counted as learned.
//
// Keyboard: 1 to 9 or A to D answer, H narrows the choices, Enter checks or
// moves on, R starts again at the end.

import { el, clear, shuffle, announce, prefersReducedMotion, formatYear } from './util.mjs';
import { recordScore, reviewCard, scores, toggleCommonplace, inCommonplace, isRemembering, streak } from './store.mjs';
import { cardId } from './data.mjs';
import { quotationKey, quotationFor, firstSentence, drawing, quizName, shortTitle, monogram, coverImage, quoted } from './revise-kit.mjs';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

// What each kind of question is called on its card, and which drawing it uses.
const KINDS = {
  who: { label: 'Who said it?', icon: 'who-said-it', game: 'who-said-it' },
  cloze: { label: 'Fill the line', icon: 'fill-the-line', game: 'fill-the-line' },
  theme: { label: 'Theme match', icon: 'theme-match', game: 'theme-match' },
  technique: { label: 'Technique spotter', icon: 'technique-spotter', game: 'technique-spotter' },
  character: { label: 'Who is this?', icon: 'character-identification', game: 'character-identification' },
  order: { label: 'Order the plot', icon: 'order-the-plot', game: 'order-the-plot' },
  book: { label: 'Which book?', icon: 'which-book', game: 'which-book' },
  context: { label: 'Which year?', icon: 'context-sprint', game: 'context-sprint' },
  opening: { label: 'Opening lines', icon: 'opening-lines', game: 'opening-lines' }
};

export function kindOf(question) {
  return String(question?.id || '').split(':')[0];
}

// In Order the plot the labels (1.2, Chapter III, Act I) would give the order
// away, so cards show their current position until the answer is checked and
// the move buttons are named by the start of each event.
const brief = text => {
  const words = String(text).split(/\s+/);
  return words.length > 6 ? words.slice(0, 6).join(' ') + '…' : words.join(' ');
};

const yearValue = label => {
  const match = String(label).match(/(-?\d+)\s*(BC)?/);
  if (!match) return NaN;
  return match[2] ? -Number(match[1]) : Number(match[1]);
};

const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const CROSS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
const GRIP = '<svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="1.6"/><circle cx="10" cy="4" r="1.6"/><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="4" cy="16" r="1.6"/><circle cx="10" cy="16" r="1.6"/></svg>';

export class QuizRound {
  // options: { gameId, book (full record or null), meta (shelf entry), practice,
  //            reshuffle(), onFinish(result), ownEnd, next(book), icons,
  //            catalogue (Map of title -> shelf entry), noHints }
  constructor(container, questions, options = {}) {
    this.container = container;
    this.questions = questions;
    this.options = options;
    this.reset();
    this.live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
    this.onKey = this.handleKey.bind(this);
  }

  reset() {
    this.index = 0;
    this.answers = [];
    this.picked = [];
    this.helped = [];
    this.run = 0;
    this.bestRun = 0;
    this.clearQuestionState();
  }

  clearQuestionState() {
    this.checked = false;
    this.selection = null;
    this.order = null;
    this.blanks = null;
    this.hinted = false;
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
    // Keys belong to whatever has focus: the book picker, the search box and
    // any dialog keep theirs, and Enter on a button or link does what it says.
    if (target !== document.body && !this.container.contains(target)) return;
    if (target.closest('input, textarea, select, dialog')) return;
    if (event.key === 'Enter' && target.closest('button, a, summary')) return;
    if (this.index >= this.questions.length) {
      if (event.key.toLowerCase() === 'r' && !this.options.ownEnd) { event.preventDefault(); this.restart(); }
      return;
    }
    const question = this.current;
    if (question.kind === 'choice' && !this.checked) {
      const key = event.key.toUpperCase();
      if (key === 'H' && this.hintButton && !this.hintButton.disabled) { event.preventDefault(); this.hint(); return; }
      const position = /^[1-9]$/.test(key) ? Number(key) - 1 : LETTERS.indexOf(key);
      if (position >= 0 && position < question.options.length && key.length === 1 && !this.optionButtons[position]?.disabled) {
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

  // --- the stage -------------------------------------------------------------

  progress() {
    const total = this.questions.length;
    const track = el('ol', { class: 'rx-track', 'aria-hidden': 'true' });
    for (let position = 0; position < total; position += 1) {
      const done = position < this.answers.length;
      track.append(el('li', {
        class: done ? (this.answers[position] ? (this.helped[position] ? 'is-right is-helped' : 'is-right') : 'is-wrong') : position === this.index ? 'is-now' : ''
      }));
    }
    const shown = Math.min(this.index + 1, total);
    return el('div', { class: 'rx-progress' }, [
      el('p', { class: 'rx-progress-count' }, [
        el('span', { class: 'rx-visually-hidden', text: 'Question ' }),
        el('b', { text: String(shown) }),
        el('span', { text: ' of ' + total })
      ]),
      track,
      el('p', { class: 'rx-run' + (this.run >= 2 ? ' is-live' : ''), 'aria-hidden': this.run >= 2 ? null : 'true', text: this.run >= 2 ? this.run + ' in a row' : '' })
    ]);
  }

  render() {
    clear(this.container);
    this.container.append(this.live);
    if (this.index >= this.questions.length) return this.finish();

    const question = this.current;
    const kind = kindOf(question);
    const about = KINDS[kind] || { label: '', icon: '' };
    this.container.classList.add('rx-stage-mount');

    const stage = el('div', { class: 'rx-stage', 'data-kind': question.kind, 'data-q': kind });
    this.stage = stage;
    stage.append(this.progress());

    const card = el('article', { class: 'rx-card' });
    const showKind = this.options.gameId === 'mixed-round' || this.options.gameId === 'daily';
    if (showKind && about.label) {
      card.append(el('p', { class: 'rx-card-kind' }, [drawing((this.options.icons || {})[about.icon] || '', 18), el('span', { text: about.label })]));
    }
    card.append(el('h2', { class: 'rx-stem', tabindex: '-1', text: question.stem }));

    if (question.quote) card.append(this.renderPrompt(question, kind));

    if (question.kind === 'choice') card.append(this.renderChoice(question, kind));
    else if (question.kind === 'cloze') card.append(this.renderCloze(question));
    else if (question.kind === 'order') card.append(this.renderOrder(question));

    this.actions = el('div', { class: 'rx-actions' });
    if (question.kind !== 'choice') {
      this.checkButton = el('button', { class: 'rx-button is-primary', type: 'button', text: 'Check my answer', onclick: () => this.check() });
      this.actions.append(this.checkButton);
    }
    this.hintButton = null;
    if (!this.options.noHints) {
      if (question.kind === 'choice' && question.options.length >= 4) {
        this.hintButton = el('button', { class: 'rx-button is-quiet', type: 'button', onclick: () => this.hint() }, [
          el('span', { class: 'rx-hint-icon', 'aria-hidden': 'true', text: '½' }), el('span', { text: 'Narrow it down' })
        ]);
      } else if (question.kind === 'cloze') {
        this.hintButton = el('button', { class: 'rx-button is-quiet', type: 'button', onclick: () => this.hint() }, [
          el('span', { class: 'rx-hint-icon', 'aria-hidden': 'true', text: 'A' }), el('span', { text: 'Show first letters' })
        ]);
      }
      if (this.hintButton) this.actions.append(this.hintButton);
    }
    this.actions.append(el('button', { class: 'rx-button is-quiet', type: 'button', text: 'Show me the answer', onclick: () => this.giveUp() }));
    card.append(this.actions);
    stage.append(card);

    this.feedback = el('section', { class: 'rx-feedback', hidden: true, tabindex: '-1', 'aria-label': 'Answer' });
    stage.append(this.feedback);
    this.container.append(stage);

    if (!prefersReducedMotion()) card.animate?.([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
    // At page load focus stays where the reader is. After that it goes to the
    // question itself, so a screen reader reads the question before the answers.
    if (this.moved) card.querySelector('.rx-stem')?.focus({ preventScroll: true });
    this.moved = true;
  }

  renderPrompt(question, kind) {
    if (kind === 'character') {
      // The masked name is drawn as a struck-out bar, like a redacted file.
      const text = el('p', {});
      String(question.quote).split('———').forEach((part, index) => {
        if (index) text.append(el('span', { class: 'rx-redact', 'aria-label': 'name hidden', role: 'img' }));
        text.append(document.createTextNode(part));
      });
      return el('figure', { class: 'rx-dossier' }, [
        el('p', { class: 'rx-dossier-label', text: 'Character file' }),
        text
      ]);
    }
    if (kind === 'context') {
      return el('figure', { class: 'rx-event' }, [el('p', { text: question.quote })]);
    }
    if (kind === 'opening') {
      return el('figure', { class: 'rx-quote is-opening' }, [el('p', { class: 'rx-quote-chapter', text: 'Chapter the first' }), el('blockquote', {}, [el('p', { text: question.quote })])]);
    }
    return el('figure', { class: 'rx-quote' }, [el('blockquote', {}, [el('p', { text: question.quote })])]);
  }

  renderChoice(question, kind) {
    let layout = 'is-list';
    if (kind === 'who' || kind === 'character') layout = 'is-people';
    else if (kind === 'book' || kind === 'opening') layout = 'is-covers';
    else if (kind === 'context') layout = 'is-years';
    else if (question.options.every(option => option.length <= 32)) layout = 'is-tiles';
    const list = el('div', { class: 'rx-options ' + layout, role: 'group', 'aria-label': 'Answers. Choose one.' });

    // Years read in order along a line, so the choices are put in date order
    // (and the letters with them) before they are drawn.
    if (kind === 'context') {
      const correct = question.options[question.answer];
      question.options = question.options.slice().sort((a, b) => yearValue(a) - yearValue(b));
      question.answer = question.options.indexOf(correct);
    }

    this.optionButtons = [];
    for (let position = 0; position < question.options.length; position += 1) {
      const option = question.options[position];
      const parts = [el('span', { class: 'rx-key', text: LETTERS[position], 'aria-hidden': 'true' })];
      if (layout === 'is-people') parts.push(monogram(option));
      if (layout === 'is-covers') {
        const meta = this.options.catalogue?.get(option);
        parts.push(el('span', { class: 'rx-option-cover' }, [coverImage(meta || { title: option }, { width: 120 })]));
      }
      parts.push(el('span', { class: 'rx-option-body' }, [
        el('span', { class: 'rx-option-text', text: option }),
        layout === 'is-covers' && this.options.catalogue?.get(option)?.author ? el('span', { class: 'rx-option-sub', text: this.options.catalogue.get(option).author }) : null
      ]));
      parts.push(el('span', { class: 'rx-option-mark', 'aria-hidden': 'true' }));
      const button = el('button', {
        class: 'rx-option', type: 'button', 'data-position': String(position),
        onclick: () => this.answerChoice(position)
      }, parts);
      this.optionButtons[position] = button;
      list.append(button);
    }
    if (layout === 'is-years') return el('div', { class: 'rx-years' }, [el('span', { class: 'rx-years-rail', 'aria-hidden': 'true' }), list]);
    return list;
  }

  renderCloze(question) {
    this.blanks = new Array(question.answer.length).fill(null);
    const line = el('p', { class: 'rx-cloze-line' });
    this.blankButtons = [];
    question.segments.forEach((segment, position) => {
      line.append(document.createTextNode(segment));
      if (position < question.answer.length) {
        const blank = el('button', {
          class: 'rx-blank' + (position === 0 ? ' is-next' : ''), type: 'button',
          'aria-label': 'Blank ' + (position + 1) + ', empty',
          style: '--blank:' + Math.max(4, question.answer[position].length + 1) + 'ch',
          onclick: () => this.clearBlank(position)
        });
        this.blankButtons.push(blank);
        line.append(blank);
      }
    });
    const bank = el('div', { class: 'rx-bank', role: 'group', 'aria-label': 'Words to place, in order' });
    this.bankButtons = question.bank.map(word => el('button', {
      class: 'rx-word', type: 'button', text: word,
      onclick: event => this.fillBlank(word, event.currentTarget)
    }));
    for (const button of this.bankButtons) bank.append(button);
    return el('div', { class: 'rx-cloze' }, [
      el('figure', { class: 'rx-quote is-cloze' }, [el('blockquote', {}, [line])]),
      el('p', { class: 'rx-instruction', text: 'Tap the words in the order they belong. Tap a placed word to take it back.' }),
      bank
    ]);
  }

  markNextBlank() {
    const next = this.blanks.indexOf(null);
    this.blankButtons.forEach((blank, position) => blank.classList.toggle('is-next', position === next));
  }

  fillBlank(word, button) {
    if (this.checked) return;
    const position = this.blanks.indexOf(null);
    if (position < 0) return;
    this.blanks[position] = word;
    const blank = this.blankButtons[position];
    blank.textContent = word;
    blank.classList.add('is-filled');
    blank.setAttribute('aria-label', 'Blank ' + (position + 1) + ', ' + word + '. Select to take it back.');
    if (!prefersReducedMotion()) blank.animate?.([{ transform: 'scale(.86)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'ease-out' });
    const others = this.bankButtons.filter(candidate => candidate !== button && !candidate.disabled);
    const after = others.find(candidate => this.bankButtons.indexOf(candidate) > this.bankButtons.indexOf(button)) || others[0];
    button.disabled = true;
    this.markNextBlank();
    if (!this.blanks.every(Boolean)) after?.focus({ preventScroll: true });
    else this.checkButton?.focus({ preventScroll: true });
  }

  clearBlank(position) {
    if (this.checked || !this.blanks[position]) return;
    const word = this.blanks[position];
    this.blanks[position] = null;
    const blank = this.blankButtons[position];
    blank.textContent = this.hinted ? this.current.answer[position][0] : '';
    blank.classList.remove('is-filled');
    blank.setAttribute('aria-label', 'Blank ' + (position + 1) + ', empty');
    const button = this.bankButtons.find(candidate => candidate.textContent === word && candidate.disabled);
    if (button) button.disabled = false;
    this.markNextBlank();
  }

  renderOrder(question) {
    this.order = question.items.slice();
    const list = el('ol', { class: 'rx-order' });
    this.orderList = list;
    const move = (from, to, direction) => {
      const [item] = this.order.splice(from, 1);
      this.order.splice(to, 0, item);
      draw(item.id, direction);
      announce(this.live, brief(item.text) + ' moved to position ' + (to + 1));
    };
    const draw = (focusId, direction) => {
      clear(list);
      this.order.forEach((item, position) => {
        const row = el('li', { class: 'rx-order-row', 'data-id': item.id }, [
          el('span', { class: 'rx-order-grip', html: GRIP, title: 'Drag to move' }),
          el('span', { class: 'rx-order-number', text: String(position + 1) }),
          el('span', { class: 'rx-order-text', text: item.text }),
          el('span', { class: 'rx-order-moves' }, [
            el('button', {
              class: 'rx-move', type: 'button', 'aria-label': 'Move "' + brief(item.text) + '" earlier',
              disabled: position === 0, html: '&uarr;', onclick: () => move(position, position - 1, 'up')
            }),
            el('button', {
              class: 'rx-move', type: 'button', 'aria-label': 'Move "' + brief(item.text) + '" later',
              disabled: position === this.order.length - 1, html: '&darr;', onclick: () => move(position, position + 1, 'down')
            })
          ])
        ]);
        this.makeDraggable(row, list, draw);
        list.append(row);
      });
      if (!focusId) return;
      const moved = this.order.findIndex(item => item.id === focusId);
      const controls = list.children[moved]?.querySelectorAll('.rx-move');
      const wanted = controls?.[direction === 'up' ? 0 : 1];
      (wanted && !wanted.disabled ? wanted : controls?.[direction === 'up' ? 1 : 0])?.focus();
    };
    draw();
    return el('div', {}, [
      el('p', { class: 'rx-instruction', text: 'Drag the cards into the order they happen, or use the arrows. Earliest at the top.' }),
      list
    ]);
  }

  // Pointer dragging for Order the plot. The row follows the finger; when it
  // passes the middle of a neighbour the two change places in the list, and on
  // release the order is read back from the page.
  makeDraggable(row, list, draw) {
    const grip = row.querySelector('.rx-order-grip');
    const text = row.querySelector('.rx-order-text');
    for (const handle of [grip, text]) {
      handle.addEventListener('pointerdown', event => {
        if (this.checked || event.button > 0) return;
        event.preventDefault();
        row.setPointerCapture?.(event.pointerId);
        let startY = event.clientY;
        let moved = false;
        row.classList.add('is-dragging');
        list.classList.add('is-sorting');
        const follow = moveEvent => {
          const offset = moveEvent.clientY - startY;
          if (Math.abs(offset) > 3) moved = true;
          const next = row.nextElementSibling;
          const previous = row.previousElementSibling;
          const before = row.offsetTop;
          if (next && moveEvent.clientY > next.getBoundingClientRect().top + next.offsetHeight / 2) {
            list.insertBefore(next, row);
            startY += row.offsetTop - before;
          } else if (previous && moveEvent.clientY < previous.getBoundingClientRect().top + previous.offsetHeight / 2) {
            list.insertBefore(row, previous);
            startY += row.offsetTop - before;
          }
          row.style.transform = 'translateY(' + (moveEvent.clientY - startY) + 'px)';
        };
        const drop = () => {
          row.removeEventListener('pointermove', follow);
          row.removeEventListener('pointerup', drop);
          row.removeEventListener('pointercancel', drop);
          row.style.transform = '';
          row.classList.remove('is-dragging');
          list.classList.remove('is-sorting');
          if (!moved) return;
          const ids = [...list.children].map(child => child.dataset.id);
          this.order = ids.map(id => this.order.find(item => item.id === id));
          const position = ids.indexOf(row.dataset.id);
          draw();
          announce(this.live, brief(this.order[position].text) + ' moved to position ' + (position + 1));
        };
        row.addEventListener('pointermove', follow);
        row.addEventListener('pointerup', drop);
        row.addEventListener('pointercancel', drop);
      });
    }
  }

  // --- answering -------------------------------------------------------------

  hint() {
    if (this.checked || this.hinted) return;
    const question = this.current;
    this.hinted = true;
    if (question.kind === 'choice') {
      const wrong = shuffle(question.options.map((_, position) => position).filter(position => position !== question.answer)).slice(0, question.options.length - 2);
      for (const position of wrong) {
        const button = this.optionButtons[position];
        button.disabled = true;
        button.classList.add('is-struck');
      }
      announce(this.live, 'Two answers taken away. ' + question.options.filter((_, position) => !wrong.includes(position)).join(' or ') + '.');
    } else if (question.kind === 'cloze') {
      this.blankButtons.forEach((blank, position) => {
        if (!this.blanks[position]) blank.textContent = question.answer[position][0];
        blank.classList.add('is-hinted');
      });
      announce(this.live, 'The first letter of each missing word is shown.');
    }
    if (this.hintButton) this.hintButton.disabled = true;
  }

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
        const mark = button.querySelector('.rx-option-mark');
        if (index === question.answer) { button.classList.add('is-right'); if (mark) mark.innerHTML = CHECK; }
        else if (index === this.selection) { button.classList.add('is-wrong'); if (mark) mark.innerHTML = CROSS; }
        else button.classList.add('is-other');
        // Every option now says what it is, so a wrong guess still teaches.
        const gloss = this.gloss(question, question.options[index]);
        if (gloss) button.querySelector('.rx-option-body')?.append(el('span', { class: 'rx-option-gloss', text: gloss }));
      });
      if (kindOf(question) === 'context' && !gaveUp && !correct) {
        const gap = Math.abs(yearValue(question.options[this.selection]) - yearValue(question.options[question.answer]));
        this.yearGap = gap;
      } else this.yearGap = null;
    } else if (question.kind === 'cloze') {
      if (!gaveUp && this.blanks.includes(null)) { announce(this.live, 'Place a word in every gap first.'); this.shake(this.container.querySelector('.rx-cloze-line')); return; }
      correct = !gaveUp && this.blanks.every((word, position) => word.toLowerCase() === question.answer[position].toLowerCase());
      this.blankButtons.forEach((blank, position) => {
        const theirs = this.blanks[position] || '';
        const right = !gaveUp && theirs.toLowerCase() === question.answer[position].toLowerCase();
        blank.classList.remove('is-next');
        blank.classList.add(right ? 'is-right' : 'is-wrong');
        blank.textContent = question.answer[position];
        blank.disabled = true;
        blank.setAttribute('aria-label', 'Blank ' + (position + 1) + ': ' + question.answer[position] + (right ? ', right' : theirs ? ', you had ' + theirs : ''));
        if (!right && theirs) blank.before(el('s', { class: 'rx-blank-was', 'aria-hidden': 'true', text: theirs }));
      });
      for (const button of this.bankButtons) button.disabled = true;
    } else if (question.kind === 'order') {
      correct = !gaveUp && this.order.every((item, position) => item.id === question.answer[position]);
      for (const button of this.container.querySelectorAll('.rx-move')) button.disabled = true;
      this.orderList?.classList.add('is-checked');
      [...this.container.querySelectorAll('.rx-order-row')].forEach((row, position) => {
        const right = correct || this.order[position].id === question.answer[position];
        row.classList.add(right ? 'is-right' : 'is-wrong');
        const label = row.querySelector('.rx-order-number');
        if (label) label.textContent = this.order[position].label;
        row.querySelector('.rx-order-moves')?.replaceWith(el('span', {
          class: 'rx-order-verdict', html: right ? CHECK + '<span>In place</span>' : '<span>Belongs ' + ordinal(question.answer.indexOf(this.order[position].id) + 1) + '</span>'
        }));
      });
    }

    this.checked = true;
    this.answers.push(correct);
    this.helped.push(Boolean(this.hinted && correct));
    this.picked.push(question.kind === 'choice' && !gaveUp ? this.selection : null);
    this.run = correct && !this.hinted ? this.run + 1 : 0;
    this.bestRun = Math.max(this.bestRun, this.run);

    // A quotation answered here is a review of that line, unless a hint did
    // half the work: then it is neither promoted nor sent back.
    const key = quotationKey(question);
    if (key && isRemembering() && !this.options.practice && !(this.hinted && correct)) reviewCard(cardId(key.slug, key.id), correct);

    this.actions.remove();
    // The progress track takes the new mark at once.
    this.stage.querySelector('.rx-progress')?.replaceWith(this.progress());
    if (!correct && !gaveUp) this.shake(this.stage.querySelector('.rx-card'));

    this.writeNote(question, correct, gaveUp);
    const last = this.index === this.questions.length - 1;
    const onward = el('button', {
      class: 'rx-button is-primary is-onward', type: 'button',
      onclick: () => this.next()
    }, [el('span', { text: last ? 'See how you did' : 'Next question' }), el('span', { 'aria-hidden': 'true', text: '→' })]);
    this.feedback.append(el('div', { class: 'rx-onward' }, [onward, el('span', { class: 'rx-onward-key', 'aria-hidden': 'true', text: 'or press Enter' })]));

    const verdict = correct ? 'Right.' : gaveUp ? 'Here is the answer.' : 'Not this time.';
    announce(this.live, verdict + ' ' + this.answerText(question) + '.');
    if (!prefersReducedMotion()) this.feedback.animate?.([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' });
    onward.focus({ preventScroll: true });
    const rect = this.feedback.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.62) this.feedback.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  shake(node) {
    if (!node || prefersReducedMotion()) return;
    node.animate?.([
      { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }
    ], { duration: 320, easing: 'ease-out' });
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
    note.className = 'rx-feedback ' + (correct ? 'is-right' : gaveUp ? 'is-shown' : 'is-wrong');
    clear(note);

    const word = correct ? (this.hinted ? 'Right, with a hint.' : pickPraise(this.run)) : gaveUp ? 'Here’s the answer.' : 'Not quite.';
    const head = el('header', { class: 'rx-verdict' }, [
      el('span', { class: 'rx-verdict-mark', html: correct ? CHECK : gaveUp ? '<span aria-hidden="true">i</span>' : CROSS }),
      el('div', {}, [
        el('p', { class: 'rx-verdict-word', text: word }),
        question.kind === 'choice' ? el('p', { class: 'rx-verdict-answer', text: question.options[question.answer] }) : null
      ])
    ]);
    note.append(head);

    if (question.kind === 'choice' && !correct && this.selection !== null && !gaveUp) {
      const chosen = question.options[this.selection];
      const gloss = this.gloss(question, chosen);
      const box = el('div', { class: 'rx-whynot' }, [el('p', { class: 'rx-label', text: 'Why not ' + chosen + '?' })]);
      if (this.yearGap !== null && this.yearGap !== undefined) {
        box.append(el('p', { text: 'You were ' + this.yearGap + (this.yearGap === 1 ? ' year' : ' years') + ' out. ' + (this.yearGap <= 15 ? 'Close: the right decade, or nearly.' : 'Think about what else was happening around it.') }));
      } else if (gloss) {
        box.append(el('p', { text: gloss }));
      } else {
        box.append(el('p', { text: 'It is a fair guess, but it isn’t this one. Read the note below for what gives the answer away.' }));
      }
      note.append(box);
    } else if (question.kind === 'cloze' && !correct && quotation) {
      note.append(el('div', { class: 'rx-whynot' }, [el('p', { class: 'rx-label', text: 'The line reads' }), el('p', { class: 'rx-fullline', text: quotation.text })]));
    } else if (question.kind === 'order' && !correct) {
      const labels = new Map(question.items.map(item => [item.id, item]));
      const list = el('ol', { class: 'rx-right-order' });
      for (const id of question.answer) {
        const item = labels.get(id);
        list.append(el('li', {}, [el('b', { text: item?.label || id }), el('span', { text: item?.text || '' })]));
      }
      note.append(el('div', { class: 'rx-whynot' }, [el('p', { class: 'rx-label', text: 'The right order' }), list]));
    }

    // Where the line comes, then what it is doing.
    const where = this.whereLine(question, quotation);
    const analysis = quotation?.analysis || question.explain;
    if (where || analysis) {
      const explain = el('div', { class: 'rx-explain' });
      if (where) explain.append(el('p', { class: 'rx-where', text: where }));
      if (analysis) explain.append(el('p', { class: 'rx-analysis', text: analysis }));
      if (quotation && question.explain && question.explain !== quotation.analysis) {
        explain.append(el('p', { class: 'rx-aside' }, [el('b', { text: (question.options?.[question.answer] || '') + '. ' }), firstSentence(question.explain)]));
      }
      note.append(explain);
    }

    const links = el('p', { class: 'rx-links' });
    const key = quotationKey(question);
    const href = question.book?.href ? question.book.href + (key ? '#astor-quote-' + key.id : '') : '';
    if (href) links.append(el('a', { href, text: key ? 'See it in the book →' : 'Open ' + shortTitle(question.book) + ' →' }));
    if (key && (quotation || question.quote)) {
      const id = key.slug + ':' + key.id;
      const keep = el('button', {
        type: 'button', class: 'rx-keep', 'aria-pressed': String(inCommonplace(id)),
        text: inCommonplace(id) ? '★ Kept' : '☆ Keep this line'
      });
      keep.addEventListener('click', () => {
        const added = toggleCommonplace({
          id, text: quotation?.text || question.quote, reference: question.source,
          book: question.book?.title || '', bookHref: question.book?.href || ''
        });
        keep.setAttribute('aria-pressed', String(added));
        keep.textContent = added ? '★ Kept' : '☆ Keep this line';
      });
      links.append(keep);
    }
    if (links.childNodes.length) note.append(links);
  }

  // A short note on any answer, from the book's own record: who that
  // character is, what that theme or technique means, who wrote that book.
  gloss(question, chosen) {
    const kind = kindOf(question);
    if (kind === 'book' || kind === 'opening') {
      const meta = this.options.catalogue?.get(chosen);
      return meta?.author ? 'By ' + meta.author + '.' : '';
    }
    const book = this.options.book;
    if (!book) return '';
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
      if (quotation.speaker) parts.push(quotation.speaker);
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
    this.clearQuestionState();
    this.render();
    const top = this.container.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.4) this.container.scrollIntoView?.({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  restart(questions) {
    this.reset();
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
    const beforeAll = gameId && !slug ? scores()[gameId] || null : null;
    if (gameId && !practice) recordScore(gameId, { score, total, bookSlug: slug });
    this.options.onFinish?.({ score, total, answers: this.answers.slice(), helped: this.helped.slice() });
    if (this.options.ownEnd) return;

    const ratio = total ? score / total : 0;
    const page = el('div', { class: 'rx-results' });

    const hero = el('div', { class: 'rx-results-hero' }, [
      scoreRing(score, total),
      el('div', { class: 'rx-results-words' }, [
        el('p', { class: 'rx-results-what', text: [book ? shortTitle(book) : '', practice ? 'Going over the ones you missed' : quizName(gameId)].filter(Boolean).join(' · ') }),
        el('h2', { class: 'rx-results-title', tabindex: '-1', text: headline(ratio, practice) }),
        el('p', { class: 'rx-results-sub', text: subline(score, total, this.helped.filter(Boolean).length) })
      ])
    ]);
    page.append(hero);

    // The facts that are true of this round, as small tiles.
    const facts = [];
    if (this.bestRun >= 3) facts.push([String(this.bestRun), 'in a row, your longest run']);
    const previous = before?.total ? before.best / before.total : beforeAll?.bestTotal ? beforeAll.best / beforeAll.bestTotal : null;
    if (previous !== null && !practice) {
      if (ratio > previous) facts.push(['New best', 'up from ' + (before ? before.best + ' of ' + before.total : beforeAll.best + ' of ' + beforeAll.bestTotal)]);
      else facts.push([before ? before.best + '/' + before.total : beforeAll.best + '/' + beforeAll.bestTotal, 'your best before today']);
    }
    const run = streak();
    if (run.live && run.current >= 2) facts.push([String(run.current), 'days of revision running']);
    if (facts.length) {
      page.append(el('ul', { class: 'rx-facts' }, facts.map(([big, small]) => el('li', {}, [el('b', { text: big }), el('span', { text: small })]))));
    }

    const marks = el('ol', { class: 'rx-results-marks', 'aria-label': 'Each question in turn' });
    this.questions.forEach((question, position) => {
      const right = this.answers[position];
      marks.append(el('li', { class: right ? (this.helped[position] ? 'is-right is-helped' : 'is-right') : 'is-wrong' }, [
        el('span', { class: 'rx-visually-hidden', text: 'Question ' + (position + 1) + ': ' + (right ? (this.helped[position] ? 'right with a hint' : 'right') : 'missed') }),
        el('span', { 'aria-hidden': 'true', text: String(position + 1) })
      ]));
    });
    page.append(marks);

    const pattern = this.pattern();
    if (pattern) page.append(el('p', { class: 'rx-insight' }, [el('b', { text: 'A pattern. ' }), pattern]));

    const missed = this.questions.map((question, position) => ({ question, position })).filter(entry => !this.answers[entry.position]);
    if (missed.length) {
      const section = el('section', { class: 'rx-review' });
      section.append(el('h3', { text: missed.length === 1 ? 'One to go over' : missed.length + ' to go over' }));
      section.append(el('p', { class: 'rx-review-note', text: 'Each one with the right answer and the reason. Open any to read the note in full.' }));
      const list = el('ol', { class: 'rx-review-list' });
      missed.forEach(({ question, position }, order) => list.append(this.missedItem(question, this.picked[position], order === 0)));
      section.append(list);
      const lines = missed.filter(entry => quotationKey(entry.question)).length;
      if (lines && isRemembering() && !practice) {
        section.append(el('p', { class: 'rx-review-note', text: (lines === 1 ? 'You’ll see this line again' : 'You’ll see these ' + lines + ' lines again') + ' tomorrow, in Ten questions and the flashcards.' }));
      }
      page.append(section);
    }

    const actions = el('div', { class: 'rx-results-actions' });
    if (missed.length) {
      actions.append(el('button', {
        class: 'rx-button is-primary', type: 'button', text: missed.length === 1 ? 'Try that one again' : 'Try these ' + missed.length + ' again',
        onclick: () => this.goOver(missed.map(entry => entry.question))
      }));
    }
    actions.append(el('button', { class: missed.length ? 'rx-button is-secondary' : 'rx-button is-primary', type: 'button', text: total >= 10 ? 'Ten more questions' : 'Play again', onclick: () => this.restart() }));
    page.append(actions);

    const step = book && this.options.next ? this.options.next(book) : null;
    if (step) {
      page.append(el('a', { class: 'rx-next', href: step.href }, [
        el('span', { class: 'rx-next-kicker', text: 'Up next' }),
        el('span', { class: 'rx-next-title', text: step.label }),
        el('span', { class: 'rx-next-text', text: step.sentence }),
        el('span', { class: 'rx-next-arrow', 'aria-hidden': 'true', text: '→' })
      ]));
    }

    const more = el('p', { class: 'rx-results-links' });
    if (book?.href) more.append(el('a', { href: book.href, text: 'Back to ' + shortTitle(book) }));
    more.append(el('a', { href: '/play/' + (slug ? '?book=' + encodeURIComponent(slug) : ''), text: 'All revision for ' + (book ? shortTitle(book) : 'your book') }));
    page.append(more);

    this.container.append(page);
    announce(this.live, 'Finished. ' + score + ' out of ' + total + '.');
    page.querySelector('.rx-results-title')?.focus({ preventScroll: true });
    page.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    if (!prefersReducedMotion()) {
      page.animate?.([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
      const arc = page.querySelector('.rx-ring-value');
      if (arc) arc.animate?.([{ strokeDashoffset: arc.getAttribute('data-full') }, { strokeDashoffset: arc.style.strokeDashoffset }], { duration: 900, easing: 'cubic-bezier(.3,.7,.2,1)' });
    }
  }

  missedItem(question, pickedIndex, open) {
    const book = this.options.book;
    const quotation = quotationFor(book, question);
    const isClue = kindOf(question) === 'character';
    const shown = (quotation?.text || question.quote || question.stem).replace(/———/g, '▬▬');
    const details = el('details', { class: 'rx-review-item', open: open || null });
    const summary = el('summary', {}, [
      el('span', { class: 'rx-review-line' + (isClue ? ' is-clue' : ''), text: isClue ? shown : quoted(shown) }),
      question.kind === 'choice' ? el('span', { class: 'rx-review-answer' }, [el('b', { text: question.options[question.answer] }),
        pickedIndex !== null && pickedIndex !== undefined ? el('span', { text: ' — you said ' + question.options[pickedIndex] }) : null]) : null
    ]);
    details.append(summary);
    const body = el('div', { class: 'rx-review-body' });
    if (quotation?.reference) body.append(el('p', { class: 'rx-where', text: [quotation.speaker, quotation.reference].filter(Boolean).join(' · ') }));
    const reason = quotation?.analysis || question.explain || '';
    if (reason && !shown.includes(reason.slice(0, 40))) body.append(el('p', { class: 'rx-analysis', text: reason }));
    if (question.kind === 'choice' && pickedIndex !== null && pickedIndex !== undefined) {
      const gloss = this.gloss(question, question.options[pickedIndex]);
      if (gloss) body.append(el('p', { class: 'rx-aside' }, [el('b', { text: question.options[pickedIndex] + ': ' }), gloss]));
    }
    const key = quotationKey(question);
    if (key && question.book?.href) {
      body.append(el('p', { class: 'rx-links' }, [el('a', { href: question.book.href + '#astor-quote-' + key.id, text: 'See it in the book →' })]));
    }
    details.append(body);
    return el('li', {}, [details]);
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
        : speakerCount + ' of the ' + lineCount + ' lines you missed are spoken by ') + who + '. Their speeches are worth a second look.';
    }
    const stages = new Map();
    for (const quotation of quotations) if (quotation.stage) stages.set(quotation.stage, (stages.get(quotation.stage) || 0) + 1);
    const [stageId, stageCount] = [...stages.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const stage = book.structure.find(entry => entry.id === stageId);
    if (stage && stageCount >= 2 && stageCount * 2 > lineCount) {
      return (stageCount === lineCount ? 'All the lines you missed come from ' : stageCount + ' of the ' + lineCount + ' lines you missed come from ') + stage.label + '. Rereading it would pay off.';
    }
    const kinds = new Map();
    for (const question of missed) kinds.set(kindOf(question), (kinds.get(kindOf(question)) || 0) + 1);
    const [kind, kindCount] = [...kinds.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    if (this.options.gameId === 'mixed-round' && kindCount >= 2 && kindCount * 2 > missed.length && KINDS[kind]) {
      return kindCount + ' of your ' + missed.length + ' misses were ' + KINDS[kind].label.replace(/\?$/, '') + ' questions. A round of that quiz on its own would help.';
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

const PRAISE = ['Right.', 'Yes — well done.', 'Exactly.', 'Right again.', 'Spot on.'];
function pickPraise(run) {
  if (run >= 5) return run + ' in a row. Excellent.';
  if (run >= 3) return 'Right — ' + run + ' in a row.';
  return PRAISE[Math.floor(Math.random() * 3)];
}

function headline(ratio, practice) {
  if (practice) return ratio === 1 ? 'All put right.' : 'Better each time.';
  if (ratio === 1) return 'Word-perfect.';
  if (ratio >= 0.8) return 'A strong reading.';
  if (ratio >= 0.6) return 'Good ground covered.';
  if (ratio >= 0.4) return 'Halfway there.';
  return 'A place to start.';
}

function subline(score, total, helped) {
  const base = score + ' of ' + total + ' right';
  return base + (helped ? ', ' + helped + ' with a hint.' : '.') + (score < total ? ' The ones you missed are below, with the reasons.' : '');
}

export function scoreRing(score, total, size = 132) {
  const radius = 54;
  const length = 2 * Math.PI * radius;
  const ratio = total ? score / total : 0;
  const wrap = el('div', { class: 'rx-ring', role: 'img', 'aria-label': score + ' out of ' + total });
  wrap.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 132 132" aria-hidden="true">' +
    '<circle cx="66" cy="66" r="' + radius + '" class="rx-ring-track"/>' +
    '<circle cx="66" cy="66" r="' + radius + '" class="rx-ring-value" data-full="' + length.toFixed(1) + '" style="stroke-dasharray:' + length.toFixed(1) + ';stroke-dashoffset:' + (length * (1 - ratio)).toFixed(1) + '"/>' +
    '</svg>';
  wrap.append(el('span', { class: 'rx-ring-label', 'aria-hidden': 'true' }, [el('b', { text: String(score) }), el('span', { text: '/' + total })]));
  return wrap;
}

function ordinal(number) {
  const tail = number % 100 >= 11 && number % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[number % 10] || 'th';
  return number + tail;
}

export function emptyState(container, message, links = []) {
  clear(container);
  const panel = el('div', { class: 'rx-empty' });
  panel.append(el('p', { text: message }));
  if (links.length) {
    const row = el('div', { class: 'rx-results-actions' });
    links.forEach((link, index) => row.append(el('a', { class: 'rx-button ' + (index ? 'is-secondary' : 'is-primary'), href: link.href, text: link.label })));
    panel.append(row);
  }
  container.append(panel);
}

export { formatYear };

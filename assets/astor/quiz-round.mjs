// The quiz runner behind every Revise quiz and Today's questions.
//
// A round is played, not read. The progress bar fills green and red as the
// reader goes, with a running score and a streak; each question is one card;
// an answer is marked on the card itself, with a one-line verdict and the
// Next button beside it, and the full note folded away for anyone who wants
// it. Each kind of question has its own way of being answered:
//
//   who said it       speakers as monogrammed roundels, the line as speech
//   who is this       a dossier with the name struck out
//   theme, technique  coloured tiles
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
import { quotationKey, quotationFor, firstSentence, drawing, quizName, shortTitle, monogram, coverImage, quoted, headerOffset } from './revise-kit.mjs';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

// What each kind of question is called on its card, and which drawing it uses.
const KINDS = {
  who: { label: 'Who said it?', icon: 'who-said-it' },
  cloze: { label: 'Fill the line', icon: 'fill-the-line' },
  theme: { label: 'Theme match', icon: 'theme-match' },
  technique: { label: 'Technique spotter', icon: 'technique-spotter' },
  character: { label: 'Who is this?', icon: 'character-identification' },
  order: { label: 'Order the plot', icon: 'order-the-plot' },
  book: { label: 'Which book?', icon: 'which-book' },
  context: { label: 'Which year?', icon: 'context-sprint' },
  opening: { label: 'Opening lines', icon: 'opening-lines' }
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

const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const CROSS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
const GRIP = '<svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="1.6"/><circle cx="10" cy="4" r="1.6"/><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="4" cy="16" r="1.6"/><circle cx="10" cy="16" r="1.6"/></svg>';
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.6 6.1 6.6.6-5 4.4 1.5 6.5L12 17l-5.7 3.4 1.5-6.5-5-4.4 6.6-.6Z"/></svg>';

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

  progress(bump = false) {
    const total = this.questions.length;
    const track = el('ol', { class: 'rx-track', 'aria-hidden': 'true' });
    for (let position = 0; position < total; position += 1) {
      const done = position < this.answers.length;
      track.append(el('li', {
        class: done ? (this.answers[position] ? (this.helped[position] ? 'is-right is-helped' : 'is-right') : 'is-wrong') : position === this.index ? 'is-now' : ''
      }, [el('i')]));
    }
    const shown = Math.min(this.index + 1, total);
    return el('div', { class: 'rx-progress' }, [
      el('p', { class: 'rx-progress-count' }, [
        el('span', { class: 'rx-visually-hidden', text: 'Question ' }),
        el('b', { text: String(shown) }),
        el('span', { text: '/' + total })
      ]),
      track,
      el('p', { class: 'rx-score' + (bump ? ' is-bump' : ''), 'aria-label': this.score + ' right so far' }, [
        el('span', { class: 'rx-score-star', 'aria-hidden': 'true', html: STAR }),
        el('b', { text: String(this.score) })
      ]),
      el('p', { class: 'rx-run' + (this.run >= 2 ? ' is-live' : ''), 'aria-hidden': 'true', text: this.run >= 2 ? this.run + ' in a row' : '' })
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
    this.card = card;
    // Each game's drawing, faint in the corner: its emblem on every card.
    card.append(drawing((this.options.icons || {})[about.icon] || '', 120, 'rx-card-emblem'));
    const showKind = this.options.gameId === 'mixed-round' || this.options.gameId === 'daily';
    const head = el('div', { class: 'rx-card-head' }, [
      showKind && about.label ? el('p', { class: 'rx-card-kind' }, [drawing((this.options.icons || {})[about.icon] || '', 16), el('span', { text: about.label })]) : null,
      el('h2', { class: 'rx-stem', tabindex: '-1', text: question.stem })
    ]);
    card.append(head);

    if (question.quote) card.append(this.renderPrompt(question, kind));

    if (question.kind === 'choice') card.append(this.renderChoice(question, kind));
    else if (question.kind === 'cloze') card.append(this.renderCloze(question));
    else if (question.kind === 'order') card.append(this.renderOrder(question));

    this.actions = el('div', { class: 'rx-actions' });
    if (question.kind !== 'choice') {
      this.checkButton = el('button', { class: 'rx-button is-primary', type: 'button', text: 'Check', onclick: () => this.check() });
      this.actions.append(this.checkButton);
    }
    this.hintButton = null;
    if (!this.options.noHints) {
      if (question.kind === 'choice' && question.options.length >= 4) {
        this.hintButton = el('button', { class: 'rx-button is-quiet', type: 'button', title: 'Take away two wrong answers (H)', onclick: () => this.hint() }, [
          el('span', { class: 'rx-hint-icon', 'aria-hidden': 'true', text: '½' }), el('span', { text: '50:50' })
        ]);
      } else if (question.kind === 'cloze') {
        this.hintButton = el('button', { class: 'rx-button is-quiet', type: 'button', onclick: () => this.hint() }, [
          el('span', { class: 'rx-hint-icon', 'aria-hidden': 'true', text: 'A' }), el('span', { text: 'First letters' })
        ]);
      }
      if (this.hintButton) this.actions.append(this.hintButton);
    }
    this.actions.append(el('button', { class: 'rx-button is-quiet', type: 'button', text: 'Skip', title: 'Show me the answer', onclick: () => this.giveUp() }));
    card.append(this.actions);
    stage.append(card);
    this.container.append(stage);

    if (!prefersReducedMotion()) card.animate?.([{ opacity: 0, transform: 'translateX(18px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' });
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
      return el('figure', { class: 'rx-dossier' }, [el('p', { class: 'rx-dossier-label', text: 'Character file' }), text]);
    }
    if (kind === 'context') return el('figure', { class: 'rx-event' }, [el('p', { text: question.quote })]);
    if (kind === 'opening') {
      return el('figure', { class: 'rx-quote is-opening' }, [el('p', { class: 'rx-quote-chapter', text: 'Chapter the first' }), el('blockquote', {}, [el('p', { text: question.quote })])]);
    }
    if (kind === 'who') return el('figure', { class: 'rx-quote is-speech' }, [el('blockquote', {}, [el('p', { text: question.quote })])]);
    return el('figure', { class: 'rx-quote' + (kind === 'technique' ? ' is-lens' : '') }, [el('blockquote', {}, [el('p', { text: question.quote })])]);
  }

  renderChoice(question, kind) {
    let layout = 'is-list';
    if (kind === 'who' || kind === 'character') layout = 'is-people';
    else if (kind === 'book' || kind === 'opening') layout = 'is-covers';
    else if (kind === 'context') layout = 'is-years';
    else if (question.options.every(option => option.length <= 34)) layout = 'is-tiles';
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
        class: 'rx-option', type: 'button', 'data-position': String(position), style: '--i:' + position,
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
    this.bankButtons = question.bank.map((word, index) => el('button', {
      class: 'rx-word', type: 'button', text: word, style: '--i:' + index,
      onclick: event => this.fillBlank(word, event.currentTarget)
    }));
    for (const button of this.bankButtons) bank.append(button);
    return el('div', { class: 'rx-cloze' }, [
      el('figure', { class: 'rx-quote is-cloze' }, [el('blockquote', {}, [line])]),
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
    if (!prefersReducedMotion()) blank.animate?.([{ transform: 'translateY(-10px) scale(.9)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.3,1.4,.5,1)' });
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
    return el('div', { class: 'rx-order-wrap' }, [
      el('p', { class: 'rx-order-end', 'aria-hidden': 'true', text: 'First' }),
      list,
      el('p', { class: 'rx-order-end', 'aria-hidden': 'true', text: 'Last' })
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
    let line = '';

    if (question.kind === 'choice') {
      if (!gaveUp && this.selection === null) { announce(this.live, 'Choose an answer first.'); return; }
      correct = !gaveUp && this.selection === question.answer;
      this.optionButtons.forEach((button, index) => {
        button.disabled = true;
        const mark = button.querySelector('.rx-option-mark');
        if (index === question.answer) { button.classList.add('is-right'); if (mark) mark.innerHTML = CHECK; }
        else if (index === this.selection) { button.classList.add('is-wrong'); if (mark) mark.innerHTML = CROSS; }
        else button.classList.add('is-other');
        // The right answer and the reader's own wrong one say what they are.
        if (index === question.answer || index === this.selection) {
          const gloss = this.gloss(question, question.options[index]);
          if (gloss) button.querySelector('.rx-option-body')?.append(el('span', { class: 'rx-option-gloss', text: gloss }));
        }
      });
      const answer = question.options[question.answer];
      if (correct) line = '';
      else if (kindOf(question) === 'context' && !gaveUp) {
        const gap = Math.abs(yearValue(question.options[this.selection]) - yearValue(answer));
        line = answer + ' — you were ' + gap + (gap === 1 ? ' year' : ' years') + ' out.';
      } else line = 'It’s ' + answer + '.';
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
      this.container.querySelector('.rx-bank')?.classList.add('is-spent');
      if (!correct) line = 'The corrected words are shown in the line.';
    } else if (question.kind === 'order') {
      correct = !gaveUp && this.order.every((item, position) => item.id === question.answer[position]);
      // The cards slide into the right order, so the sequence to learn is the
      // one on screen. A card the reader had in place keeps a tick; any other
      // says where they had it.
      const had = new Map(this.order.map((item, position) => [item.id, position]));
      const labels = new Map(question.items.map(item => [item.id, item]));
      const rows = new Map([...this.orderList.children].map(row => [row.dataset.id, row]));
      const before = new Map([...rows].map(([id, row]) => [id, row.getBoundingClientRect().top]));
      this.orderList.classList.add('is-checked');
      let inPlace = 0;
      question.answer.forEach((id, position) => {
        const row = rows.get(id);
        if (!row) return;
        const right = !gaveUp && had.get(id) === position;
        if (right) inPlace += 1;
        row.classList.add(right ? 'is-right' : 'is-moved');
        const label = row.querySelector('.rx-order-number');
        if (label) label.textContent = labels.get(id)?.label || String(position + 1);
        row.querySelector('.rx-order-moves')?.replaceWith(el('span', {
          class: 'rx-order-verdict', html: right ? CHECK + '<span class="rx-visually-hidden">In place</span>' : '<span>You had it ' + ordinal(had.get(id) + 1) + '</span>'
        }));
        this.orderList.append(row);
      });
      for (const button of this.container.querySelectorAll('.rx-move')) button.disabled = true;
      if (!prefersReducedMotion()) {
        for (const [id, row] of rows) {
          const shift = before.get(id) - row.getBoundingClientRect().top;
          if (shift) row.animate?.([{ transform: 'translateY(' + shift + 'px)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,.8,.25,1)' });
        }
      }
      if (!correct) line = (gaveUp ? 'Here is the right order.' : inPlace + ' of ' + this.order.length + ' were in place. This is the right order.');
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
    this.stage.querySelector('.rx-progress')?.replaceWith(this.progress(correct));
    this.card.classList.add(correct ? 'is-correct' : 'is-missed');
    if (!correct && !gaveUp) this.shake(this.card);

    this.writeNote(question, correct, gaveUp, line);
    const verdict = correct ? 'Right.' : gaveUp ? 'Here is the answer.' : 'Not quite.';
    announce(this.live, verdict + ' ' + this.answerText(question) + '.');
    this.onward.focus({ preventScroll: true });
    const rect = this.feedback.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) this.feedback.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  shake(node) {
    if (!node || prefersReducedMotion()) return;
    node.animate?.([
      { transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' },
      { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }
    ], { duration: 320, easing: 'ease-out' });
  }

  answerText(question) {
    if (question.kind === 'choice') return 'The answer: ' + question.options[question.answer];
    if (question.kind === 'cloze') return 'The missing words: ' + question.answer.join(', ');
    return 'The right order is shown';
  }

  // The verdict in one line with Next beside it. Everything longer — where the
  // line comes, what it is doing — is folded under "Why?".
  writeNote(question, correct, gaveUp, line) {
    const book = this.options.book;
    const quotation = quotationFor(book, question);
    const last = this.index === this.questions.length - 1;
    const tone = correct ? 'is-right' : gaveUp ? 'is-shown' : 'is-wrong';
    const word = correct ? (this.hinted ? 'Right, with a hint' : praise(this.run)) : gaveUp ? 'The answer' : 'Not quite';

    this.onward = el('button', { class: 'rx-button is-primary is-onward', type: 'button', onclick: () => this.next() }, [
      el('span', { text: last ? 'Finish' : 'Next' }), el('span', { 'aria-hidden': 'true', text: '→' })
    ]);
    const note = el('section', { class: 'rx-feedback ' + tone, 'aria-label': 'Answer' });
    note.append(el('div', { class: 'rx-verdict' }, [
      el('span', { class: 'rx-verdict-mark', html: correct ? CHECK : gaveUp ? '<span aria-hidden="true">i</span>' : CROSS }),
      el('div', { class: 'rx-verdict-words' }, [
        el('p', { class: 'rx-verdict-word', text: word }),
        line ? el('p', { class: 'rx-verdict-line', text: line }) : null
      ]),
      this.onward
    ]));

    const more = el('div', { class: 'rx-more-body' });
    const where = this.whereLine(question, quotation);
    if (where) more.append(el('p', { class: 'rx-where', text: where }));
    if (question.kind === 'cloze' && quotation && !correct) more.append(el('p', { class: 'rx-fullline', text: quoted(quotation.text) }));
    const analysis = quotation?.analysis || question.explain;
    if (analysis) more.append(el('p', { class: 'rx-analysis', text: analysis }));
    if (quotation && question.explain && question.explain !== quotation.analysis) {
      more.append(el('p', { class: 'rx-aside' }, [el('b', { text: (question.options?.[question.answer] || '') + '. ' }), firstSentence(question.explain)]));
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
    if (links.childNodes.length) more.append(links);
    if (more.childNodes.length) {
      note.append(el('details', { class: 'rx-more' }, [
        el('summary', { text: correct ? 'About this line' : 'Why?' }),
        more
      ]));
    }
    this.feedback = note;
    this.card.append(note);
    if (!prefersReducedMotion()) note.animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
  }

  // A short note on any answer, from the book's own record: who that
  // character is, what that theme or technique means, who wrote that book.
  gloss(question, chosen) {
    const kind = kindOf(question);
    if (kind === 'book' || kind === 'opening') {
      const meta = this.options.catalogue?.get(chosen);
      return meta?.author ? meta.author : '';
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
    if (top < headerOffset() || top > window.innerHeight * 0.4) this.container.scrollIntoView?.({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
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
    const previous = before?.total ? before.best / before.total : beforeAll?.bestTotal ? beforeAll.best / beforeAll.bestTotal : null;
    const bestStars = before?.total ? starsFor(before.best, before.total) : beforeAll?.bestTotal ? starsFor(beforeAll.best, beforeAll.bestTotal) : null;
    const newBest = previous !== null && !practice && ratio > previous;
    const missed = this.questions.map((question, position) => ({ question, position })).filter(entry => !this.answers[entry.position]);

    const page = el('div', { class: 'rx-results' + (ratio >= 0.8 && !practice ? ' is-shining' : '') });
    page.append(completion({
      score, total,
      kicker: [book ? shortTitle(book) : '', practice ? 'Second go' : quizName(gameId)].filter(Boolean).join(' · '),
      title: headline(ratio, practice),
      sub: encouragement(score, total, practice),
      best: practice ? null : bestStars,
      chips: [
        this.bestRun >= 3 ? this.bestRun + ' in a row' : '',
        newBest ? 'New best score' : '',
        (() => { const run = streak(); return run.live && run.current >= 2 ? run.current + '-day streak' : ''; })()
      ].filter(Boolean)
    }));

    const marks = el('ol', { class: 'rx-results-marks', 'aria-label': 'Each question in turn' });
    this.questions.forEach((question, position) => {
      const right = this.answers[position];
      marks.append(el('li', { class: right ? (this.helped[position] ? 'is-right is-helped' : 'is-right') : 'is-wrong', style: '--i:' + position }, [
        el('span', { class: 'rx-visually-hidden', text: 'Question ' + (position + 1) + ': ' + (right ? (this.helped[position] ? 'right with a hint' : 'right') : 'to try again') }),
        el('span', { 'aria-hidden': 'true', html: right ? CHECK : String(position + 1) })
      ]));
    });
    page.append(marks);

    const actions = el('div', { class: 'rx-results-actions' });
    if (missed.length) {
      actions.append(el('button', {
        class: 'rx-button is-primary is-retry', type: 'button', html: '<span aria-hidden="true">↻</span> ' + (missed.length === 1 ? 'Try the one I missed again' : 'Try the ' + missed.length + ' I missed again'),
        onclick: () => this.goOver(missed.map(entry => entry.question))
      }));
    }
    actions.append(el('button', { class: missed.length ? 'rx-button is-secondary' : 'rx-button is-primary', type: 'button', text: 'Play again', onclick: () => this.restart() }));
    page.append(actions);

    const pattern = this.pattern();
    if (pattern) page.append(el('p', { class: 'rx-insight', text: pattern }));

    if (missed.length) {
      const list = el('ol', { class: 'rx-review-list' });
      for (const { question, position } of missed) list.append(this.missedItem(question, this.picked[position]));
      page.append(el('details', { class: 'rx-review' }, [
        el('summary', {}, [el('span', { text: missed.length === 1 ? 'Look over the one you missed' : 'Look over the ' + missed.length + ' you missed' })]),
        list,
        quotationCount(missed) && isRemembering() && !practice ? el('p', { class: 'rx-review-note', text: 'Missed lines come back tomorrow in Ten questions and the flashcards.' }) : null
      ]));
    }

    const step = book && this.options.next ? this.options.next(book) : null;
    if (step) {
      page.append(el('a', { class: 'rx-next', href: step.href }, [
        el('span', { class: 'rx-next-kicker', text: 'Up next' }),
        el('span', { class: 'rx-next-title', text: step.label }),
        el('span', { class: 'rx-next-arrow', 'aria-hidden': 'true', text: '→' })
      ]));
    }

    this.container.append(page);
    announce(this.live, 'Finished. ' + score + ' out of ' + total + '.');
    page.querySelector('.rx-results-title')?.focus({ preventScroll: true });
    page.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    celebrate(page);
  }

  missedItem(question, pickedIndex) {
    const book = this.options.book;
    const quotation = quotationFor(book, question);
    const isClue = kindOf(question) === 'character';
    const shown = (quotation?.text || question.quote || question.stem).replace(/———/g, '▬▬');
    const item = el('li', { class: 'rx-review-item' });
    item.append(el('p', { class: 'rx-review-line' + (isClue ? ' is-clue' : ''), text: isClue ? shown : quoted(shown) }));
    if (question.kind === 'choice') {
      item.append(el('p', { class: 'rx-review-answer' }, [
        el('b', { text: question.options[question.answer] }),
        pickedIndex !== null && pickedIndex !== undefined ? el('s', { text: question.options[pickedIndex] }) : null
      ]));
    }
    const reason = firstSentence(quotation?.analysis || question.explain || '');
    if (reason && !isClue) item.append(el('p', { class: 'rx-review-reason', text: reason }));
    return el('li', {}, [item]);
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
      return 'Most of your misses are ' + speaker.replace(/^The /, 'the ') + '’s lines.';
    }
    const stages = new Map();
    for (const quotation of quotations) if (quotation.stage) stages.set(quotation.stage, (stages.get(quotation.stage) || 0) + 1);
    const [stageId, stageCount] = [...stages.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const stage = book.structure.find(entry => entry.id === stageId);
    if (stage && stageCount >= 2 && stageCount * 2 > lineCount) return 'Most of your misses come from ' + stage.label + '.';
    const kinds = new Map();
    for (const question of missed) kinds.set(kindOf(question), (kinds.get(kindOf(question)) || 0) + 1);
    const [kind, kindCount] = [...kinds.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    if (this.options.gameId === 'mixed-round' && kindCount >= 2 && kindCount * 2 > missed.length && KINDS[kind]) {
      return 'Most of your misses were ' + KINDS[kind].label.replace(/\?$/, '') + ' questions.';
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

const quotationCount = missed => missed.filter(entry => quotationKey(entry.question)).length;

const PRAISE = ['Right', 'Yes!', 'Exactly', 'Spot on', 'Correct'];
function praise(run) {
  if (run >= 5) return run + ' in a row!';
  if (run >= 3) return 'Right — ' + run + ' in a row';
  return PRAISE[Math.floor(Math.random() * PRAISE.length)];
}

function headline(ratio, practice) {
  if (practice) return ratio === 1 ? 'All put right.' : 'Better each time.';
  if (ratio === 1) return 'Word-perfect.';
  if (ratio >= 0.8) return 'Excellent.';
  if (ratio >= 0.6) return 'Well read.';
  if (ratio >= 0.4) return 'Getting there.';
  return 'Good start.';
}

function encouragement(score, total, practice) {
  const missed = total - score;
  if (!missed) return practice ? 'Every one right this time.' : '';
  if (practice) return score + ' of ' + total + ' put right. Another go will fix the rest.';
  return 'You got ' + score + ' right. Trying the ' + (missed === 1 ? 'one' : missed) + ' you missed again is the quickest way to learn ' + (missed === 1 ? 'it' : 'them') + '.';
}

// Stars, the same everywhere: one for finishing, two for 70 per cent or
// better (7 out of 10), three for a perfect round.
export function starsFor(score, total) {
  if (!total) return 0;
  if (score >= total) return 3;
  if (score >= starTarget(total)) return 2;
  return 1;
}
export function starTarget(total) {
  return Math.max(1, Math.ceil(total * 0.7 - 1e-9));
}

// The top of every completion screen: the score counting up inside its ring,
// up to three stars, the headline and a few small facts as chips.
export function completion({ score, total, kicker, title, chips = [], sub = '', best = null }) {
  const stars = starsFor(score, total);
  const starRow = el('p', { class: 'rx-stars', role: 'img', 'aria-label': stars + ' of 3 stars' });
  for (let index = 0; index < 3; index += 1) {
    starRow.append(el('span', { class: 'rx-star' + (index < stars ? ' is-earned' : ''), style: '--i:' + index, html: STAR }));
  }
  if (best !== null && stars > best) chips = ['New best: ' + '★'.repeat(stars), ...chips.filter(chip => chip !== 'New best score')];
  // What each star is for, with the next one to aim at picked out.
  const target = starTarget(total);
  const key = el('ul', { class: 'rx-star-key', 'aria-label': 'How stars are earned' }, [
    ['★', 'Finish'], ['★★', target + ' out of ' + total], ['★★★', 'All ' + total]
  ].map(([mark, label], index) => el('li', { class: index < stars ? 'is-earned' : index === stars ? 'is-next' : '' }, [
    el('b', { 'aria-hidden': 'true', text: mark }), el('span', { text: label })
  ])));
  return el('div', { class: 'rx-results-hero' }, [
    el('div', { class: 'rx-ring-wrap' }, [scoreRing(score, total), el('span', { class: 'rx-burst', 'aria-hidden': 'true' }, Array.from({ length: 14 }, (_, index) => el('i', { style: '--a:' + (index * 360 / 14) + 'deg;--d:' + (70 + (index % 3) * 14) + 'px;--i:' + index })))]),
    el('div', { class: 'rx-results-words' }, [
      kicker ? el('p', { class: 'rx-results-what', text: kicker }) : null,
      el('h2', { class: 'rx-results-title', tabindex: '-1', text: title }),
      starRow,
      key,
      sub ? el('p', { class: 'rx-results-sub', text: sub }) : null,
      chips.length ? el('ul', { class: 'rx-chips' }, chips.map(chip => el('li', { text: chip }))) : null
    ])
  ]);
}

// The ring fills and the number counts up; both are skipped when the reader
// has asked for less motion.
export function celebrate(page) {
  if (prefersReducedMotion()) return;
  page.animate?.([{ opacity: 0, transform: 'translateY(12px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2,.7,.2,1)' });
  const arc = page.querySelector('.rx-ring-value');
  if (arc) arc.animate?.([{ strokeDashoffset: arc.getAttribute('data-full') }, { strokeDashoffset: arc.style.strokeDashoffset }], { duration: 1000, easing: 'cubic-bezier(.3,.7,.2,1)' });
  const number = page.querySelector('.rx-ring-label b');
  const target = Number(number?.textContent || 0);
  if (number && target > 0) {
    const start = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - start) / 900);
      number.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(tick);
    };
    number.textContent = '0';
    requestAnimationFrame(tick);
  }
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

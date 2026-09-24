// The shared round runner behind every revision game.
//
// It takes a list of questions from questions.js and plays them in a panel:
// multiple choice, cloze and ordering all run through the same loop, the same
// keyboard rules and the same end screen. Games differ in the questions they
// are given, not in how they behave, which is why a reader who has played one
// can play all of them.
//
// Keyboard: 1-9 choose an option, Enter checks or continues, R restarts.

import { el, clear, escapeHtml, announce, prefersReducedMotion } from './util.mjs';
import { recordScore, toggleCommonplace, inCommonplace } from './store.mjs';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export class Round {
  constructor(container, questions, options = {}) {
    this.container = container;
    this.questions = questions;
    this.options = options;
    this.index = 0;
    this.answers = [];
    this.checked = false;
    this.selection = null;
    this.order = null;
    this.blanks = null;
    this.startedAt = Date.now();
    this.live = el('p', { class: 'astor-game-live', 'aria-live': 'polite', role: 'status' });
    this.onKey = this.handleKey.bind(this);
  }

  start() {
    clear(this.container);
    this.container.append(this.live);
    document.addEventListener('keydown', this.onKey);
    this.render();
  }

  stop() {
    document.removeEventListener('keydown', this.onKey);
  }

  get current() {
    return this.questions[this.index];
  }

  get score() {
    return this.answers.filter(Boolean).length;
  }

  handleKey(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (this.index >= this.questions.length) {
      if (event.key.toLowerCase() === 'r') { event.preventDefault(); this.restart(); }
      return;
    }
    const question = this.current;
    if (/^[1-9]$/.test(event.key) && question.kind === 'choice' && !this.checked) {
      const position = Number(event.key) - 1;
      if (position < question.options.length) {
        event.preventDefault();
        this.select(position);
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.checked) this.next();
      else this.check();
    }
  }

  // --- rendering -----------------------------------------------------------

  render() {
    clear(this.container);
    this.container.append(this.live);
    if (this.index >= this.questions.length) return this.renderEnd();

    const question = this.current;
    const panel = el('div', { class: 'astor-game-panel', 'data-kind': question.kind });

    panel.append(el('div', { class: 'astor-game-meta' }, [
      el('p', { class: 'astor-game-count', text: `Question ${this.index + 1} of ${this.questions.length}` }),
      el('p', { class: 'astor-game-score', text: `${this.score} right so far` })
    ]));

    const bar = el('div', { class: 'astor-game-bar', role: 'presentation' });
    bar.append(el('span', { style: `width:${Math.round((this.index / this.questions.length) * 100)}%` }));
    panel.append(bar);

    panel.append(el('h2', { class: 'astor-game-stem', text: question.stem }));

    if (question.quote) {
      panel.append(el('blockquote', { class: 'astor-game-quote' }, [el('p', { text: question.quote })]));
    }

    if (question.kind === 'choice') panel.append(this.renderChoice(question));
    else if (question.kind === 'cloze') panel.append(this.renderCloze(question));
    else if (question.kind === 'order') panel.append(this.renderOrder(question));

    const actions = el('div', { class: 'astor-game-actions' });
    this.checkButton = el('button', {
      class: 'button primary', type: 'button', text: 'Check',
      onclick: () => this.check()
    });
    actions.append(this.checkButton);
    actions.append(el('button', {
      class: 'button secondary astor-game-skip', type: 'button', text: 'Skip',
      onclick: () => { this.answers.push(false); this.index += 1; this.checked = false; this.reset(); this.render(); }
    }));
    panel.append(actions);

    this.feedback = el('div', { class: 'astor-game-feedback', hidden: true });
    panel.append(this.feedback);

    this.container.append(panel);
    panel.querySelector('button, [tabindex="0"]')?.focus({ preventScroll: true });
  }

  renderChoice(question) {
    const list = el('div', { class: 'astor-game-options', role: 'group', 'aria-label': 'Answer options' });
    this.optionButtons = question.options.map((option, position) => {
      const button = el('button', {
        class: 'astor-game-option', type: 'button', 'aria-pressed': 'false',
        onclick: () => this.select(position)
      }, [
        el('span', { class: 'astor-game-key', text: LETTERS[position], 'aria-hidden': 'true' }),
        el('span', { class: 'astor-game-label', text: option })
      ]);
      list.append(button);
      return button;
    });
    return list;
  }

  select(position) {
    if (this.checked) return;
    this.selection = position;
    for (const [index, button] of this.optionButtons.entries()) {
      button.setAttribute('aria-pressed', index === position ? 'true' : 'false');
      button.classList.toggle('is-chosen', index === position);
    }
  }

  renderCloze(question) {
    this.blanks = new Array(question.answer.length).fill(null);
    const line = el('p', { class: 'astor-game-cloze-line' });
    this.blankButtons = [];
    question.segments.forEach((segment, position) => {
      line.append(document.createTextNode(segment));
      if (position < question.answer.length) {
        const blank = el('button', {
          class: 'astor-game-blank', type: 'button',
          'aria-label': `Blank ${position + 1}, empty`,
          text: ' '.repeat(Math.max(4, question.answer[position].length)),
          onclick: () => this.clearBlank(position)
        });
        this.blankButtons.push(blank);
        line.append(blank);
      }
    });

    const bank = el('div', { class: 'astor-game-bank', role: 'group', 'aria-label': 'Word bank' });
    this.bankButtons = question.bank.map(word => el('button', {
      class: 'astor-game-word', type: 'button', text: word,
      onclick: event => this.fillBlank(word, event.currentTarget)
    }));
    for (const button of this.bankButtons) bank.append(button);

    return el('div', { class: 'astor-game-cloze' }, [line, bank]);
  }

  fillBlank(word, button) {
    if (this.checked) return;
    const position = this.blanks.indexOf(null);
    if (position < 0) return;
    this.blanks[position] = word;
    const blank = this.blankButtons[position];
    blank.textContent = word;
    blank.classList.add('is-filled');
    blank.setAttribute('aria-label', `Blank ${position + 1}, ${word}. Select to clear.`);
    button.disabled = true;
    button.classList.add('is-used');
  }

  clearBlank(position) {
    if (this.checked || !this.blanks[position]) return;
    const word = this.blanks[position];
    this.blanks[position] = null;
    const blank = this.blankButtons[position];
    blank.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;';
    blank.classList.remove('is-filled');
    blank.setAttribute('aria-label', `Blank ${position + 1}, empty`);
    const button = this.bankButtons.find(candidate => candidate.textContent === word && candidate.disabled);
    if (button) { button.disabled = false; button.classList.remove('is-used'); }
  }

  renderOrder(question) {
    this.order = question.items.slice();
    const list = el('ol', { class: 'astor-game-order' });
    // Moving an item rebuilds the list, which would otherwise drop the
    // keyboard focus back to the top of the page; the item that moved keeps it.
    const draw = (focusId, direction) => {
      clear(list);
      this.order.forEach((item, position) => {
        const row = el('li', { class: 'astor-game-order-row' }, [
          el('span', { class: 'astor-game-order-label', text: item.label }),
          el('span', { class: 'astor-game-order-text', text: item.text }),
          el('span', { class: 'astor-game-order-controls' }, [
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
        ]);
        list.append(row);
      });
      if (!focusId) return;
      const moved = this.order.findIndex(item => item.id === focusId);
      const controls = list.children[moved]?.querySelectorAll('.astor-game-move');
      const wanted = controls?.[direction === 'up' ? 0 : 1];
      // At the top or bottom the button that moved the item is now disabled,
      // so focus goes to the one that is still usable.
      (wanted && !wanted.disabled ? wanted : controls?.[direction === 'up' ? 1 : 0])?.focus();
    };
    draw();
    return list;
  }

  // --- checking ------------------------------------------------------------

  check() {
    if (this.checked) return this.next();
    const question = this.current;
    let correct = false;

    if (question.kind === 'choice') {
      if (this.selection === null) { announce(this.live, 'Pick an answer first.'); return; }
      correct = this.selection === question.answer;
      for (const [index, button] of this.optionButtons.entries()) {
        button.disabled = true;
        if (index === question.answer) button.classList.add('is-correct');
        else if (index === this.selection) button.classList.add('is-wrong');
      }
    } else if (question.kind === 'cloze') {
      if (this.blanks.includes(null)) { announce(this.live, 'Fill every blank first.'); return; }
      correct = this.blanks.every((word, position) => word.toLowerCase() === question.answer[position].toLowerCase());
      this.blankButtons.forEach((blank, position) => {
        const right = this.blanks[position].toLowerCase() === question.answer[position].toLowerCase();
        blank.classList.add(right ? 'is-correct' : 'is-wrong');
        if (!right) blank.textContent = question.answer[position];
        blank.disabled = true;
      });
      for (const button of this.bankButtons) button.disabled = true;
    } else if (question.kind === 'order') {
      correct = this.order.every((item, position) => item.id === question.answer[position]);
      for (const button of this.container.querySelectorAll('.astor-game-move')) button.disabled = true;
      if (!correct) {
        const rows = [...this.container.querySelectorAll('.astor-game-order-row')];
        rows.forEach((row, position) => {
          row.classList.add(this.order[position].id === question.answer[position] ? 'is-correct' : 'is-wrong');
        });
      } else {
        for (const row of this.container.querySelectorAll('.astor-game-order-row')) row.classList.add('is-correct');
      }
    }

    this.checked = true;
    this.answers.push(correct);
    this.checkButton.textContent = this.index === this.questions.length - 1 ? 'See your score' : 'Next';
    this.container.querySelector('.astor-game-skip')?.remove();

    const feedback = this.feedback;
    feedback.hidden = false;
    feedback.className = 'astor-game-feedback ' + (correct ? 'is-correct' : 'is-wrong');
    clear(feedback);
    feedback.append(el('p', { class: 'astor-game-verdict', text: correct ? 'Right.' : 'Not quite.' }));
    if (question.kind === 'choice' && !correct) {
      feedback.append(el('p', { class: 'astor-game-answer', text: 'The answer is ' + question.options[question.answer] + '.' }));
    }
    if (question.explain) feedback.append(el('p', { class: 'astor-game-explain', text: question.explain }));
    if (question.source) feedback.append(el('p', { class: 'astor-game-source', text: question.source }));
    announce(this.live, (correct ? 'Correct. ' : 'Incorrect. ') + (question.explain || ''));
    if (!prefersReducedMotion()) feedback.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
  }

  next() {
    this.index += 1;
    this.checked = false;
    this.reset();
    this.render();
  }

  reset() {
    this.selection = null;
    this.order = null;
    this.blanks = null;
  }

  restart() {
    this.index = 0;
    this.answers = [];
    this.checked = false;
    this.startedAt = Date.now();
    this.reset();
    if (this.options.reshuffle) this.questions = this.options.reshuffle();
    this.render();
  }

  renderEnd() {
    const total = this.questions.length;
    const score = this.score;
    if (this.options.gameId) {
      recordScore(this.options.gameId, { score, total, bookSlug: this.options.bookSlug });
    }
    this.options.onFinish?.({ score, total, answers: this.answers });

    const seconds = Math.round((Date.now() - this.startedAt) / 1000);
    const panel = el('div', { class: 'astor-game-end' });
    panel.append(el('p', { class: 'kicker', text: 'Finished' }));
    panel.append(el('h2', { text: `${score} out of ${total}` }));
    panel.append(el('p', { class: 'astor-game-end-note', text: verdict(score, total) + ` Finished in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.` }));

    const missed = this.questions.filter((_, position) => !this.answers[position]);
    if (missed.length) {
      panel.append(el('h3', { class: 'astor-game-missed-title', text: 'The ones you missed' }));
      const list = el('ul', { class: 'astor-game-missed' });
      for (const question of missed) {
        const item = el('li', {}, [
          question.quote ? el('q', { text: question.quote }) : el('span', { text: question.stem }),
          el('span', { class: 'astor-game-source', text: question.source })
        ]);
        if (question.quote && question.book) {
          const id = question.book.slug + ':' + question.id;
          const save = el('button', {
            class: 'astor-save-quote', type: 'button',
            'aria-pressed': String(inCommonplace(id)),
            text: inCommonplace(id) ? 'In your commonplace book' : 'Save this quotation'
          });
          save.addEventListener('click', () => {
            const added = toggleCommonplace({
              id, text: question.quote, reference: question.source,
              book: question.book.title, bookHref: question.book.href
            });
            save.setAttribute('aria-pressed', String(added));
            save.textContent = added ? 'In your commonplace book' : 'Save this quotation';
          });
          item.append(save);
        }
        list.append(item);
      }
      panel.append(list);
    }

    const actions = el('div', { class: 'button-row' });
    actions.append(el('button', { class: 'button primary', type: 'button', text: 'Try again', onclick: () => this.restart() }));
    for (const link of this.options.endLinks || []) {
      actions.append(el('a', { class: 'button secondary', href: link.href, text: link.label }));
    }
    panel.append(actions);
    this.container.append(panel);
    announce(this.live, `Finished. ${score} out of ${total}.`);
    panel.querySelector('button')?.focus({ preventScroll: true });
  }
}

function verdict(score, total) {
  const ratio = total ? score / total : 0;
  if (ratio === 1) return 'Full marks.';
  if (ratio >= 0.8) return 'Very good.';
  if (ratio >= 0.5) return 'Not bad.';
  if (ratio > 0) return 'Worth another go.';
  return 'Read the book page, then try again.';
}

export function emptyState(container, message, links = []) {
  clear(container);
  const panel = el('div', { class: 'astor-game-empty' });
  panel.append(el('p', { text: message }));
  if (links.length) {
    const row = el('div', { class: 'button-row' });
    for (const link of links) row.append(el('a', { class: 'button secondary', href: link.href, text: link.label }));
    panel.append(row);
  }
  container.append(panel);
}

export { escapeHtml };

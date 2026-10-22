// The quiz runner behind every Revise quiz and Today's questions.
//
// One question at a time, and the question is the page: the line set large,
// the answers under it as plain ruled rows, a quiet count of how far the round
// has got. An answer is marked where it was given, with a one-line verdict and
// Next beside it; the longer note on the line is folded under "Why?". Each
// kind of question is answered in the way that suits it:
//
//   who said it, theme, technique, who is this   a choice of names
//   fill the line     words placed into the line itself
//   order the plot    events tapped in the order they happen
//   which book        the covers themselves
//   which year        the four years in date order
//
// Every answer to a question built from a quotation is also a flashcard
// review of that line (store.mjs), so a line missed here comes back tomorrow.
// A line answered only after a hint is not counted as learned.
//
// Keyboard: 1 to 9 or A to D answer, H narrows the choices, Enter checks or
// moves on, R starts again at the end.

import { el, clear, shuffle, announce, prefersReducedMotion, formatYear, guideHref } from './util.mjs';
import { recordScore, reviewCard, scores, toggleCommonplace, inCommonplace, isRemembering } from './store.mjs';
import { cardId } from './data.mjs';
import { quotationKey, quotationFor, firstSentence, quizName, shortTitle, coverImage, quoted, headerOffset, currentBook } from './revise-kit.mjs';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

// What each kind of question is called, for the sentence on the results page
// that says where the misses cluster.
const KINDS = {
  who: { label: 'Who said it?' },
  cloze: { label: 'Fill the line' },
  theme: { label: 'Theme match' },
  technique: { label: 'Technique spotter' },
  character: { label: 'Who is this?' },
  order: { label: 'Order the plot' },
  book: { label: 'Which book?' },
  context: { label: 'Which year?' },
  opening: { label: 'Opening lines' }
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
      else if (question.kind === 'cloze') this.check();
    }
  }

  // --- the stage -------------------------------------------------------------

  // How far the round has got: a count and one thin line, nothing else.
  progress() {
    const total = this.questions.length;
    const shown = Math.min(this.index + 1, total);
    const line = el('span', { class: 'rx-progress-line', 'aria-hidden': 'true' }, [el('i')]);
    line.firstChild.style.width = (100 * Math.min(this.answers.length, total) / total) + '%';
    return el('div', { class: 'rx-progress' }, [
      el('p', { class: 'rx-progress-count', text: (this.options.practice ? 'Second go · ' : '') + shown + ' of ' + total }),
      line
    ]);
  }

  render() {
    clear(this.container);
    this.container.append(this.live);
    if (this.index >= this.questions.length) return this.finish();

    const question = this.current;
    const kind = kindOf(question);
    this.container.classList.add('rx-stage-mount');

    const stage = el('div', { class: 'rx-stage', 'data-kind': question.kind, 'data-q': kind });
    this.stage = stage;
    stage.append(this.progress());

    const card = el('article', { class: 'rx-card' });
    this.card = card;
    card.append(el('h2', { class: 'rx-stem', tabindex: '-1', text: question.stem }));

    if (question.quote) card.append(this.renderPrompt(question, kind));

    if (question.kind === 'choice') card.append(this.renderChoice(question, kind));
    else if (question.kind === 'cloze') card.append(this.renderCloze(question));
    else if (question.kind === 'order') card.append(this.renderOrder(question));

    this.actions = el('div', { class: 'rx-actions' });
    if (question.kind === 'cloze') {
      this.checkButton = el('button', { class: 'rx-button is-primary', type: 'button', text: 'Check', onclick: () => this.check() });
      this.actions.append(this.checkButton);
    }
    this.hintButton = null;
    if (!this.options.noHints) {
      if (question.kind === 'choice' && question.options.length >= 4) {
        this.hintButton = el('button', { class: 'rx-text-button', type: 'button', text: 'Take away two', title: 'Take away two wrong answers (H)', onclick: () => this.hint() });
      } else if (question.kind === 'cloze') {
        this.hintButton = el('button', { class: 'rx-text-button', type: 'button', text: 'Show first letters', onclick: () => this.hint() });
      } else if (question.kind === 'order') {
        this.hintButton = el('button', { class: 'rx-text-button', type: 'button', text: 'Show the next one', onclick: () => this.hint() });
      }
      if (this.hintButton) this.actions.append(this.hintButton);
    }
    this.actions.append(el('button', { class: 'rx-text-button', type: 'button', text: 'Show the answer', onclick: () => this.giveUp() }));
    card.append(this.actions);
    stage.append(card);
    this.container.append(stage);

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
      return el('figure', { class: 'rx-dossier' }, [text]);
    }
    if (kind === 'context') return el('figure', { class: 'rx-event' }, [el('p', { text: question.quote })]);
    if (kind === 'opening') {
      return el('figure', { class: 'rx-quote is-opening' }, [el('blockquote', {}, [el('p', { text: question.quote })])]);
    }
    return el('figure', { class: 'rx-quote' }, [el('blockquote', {}, [el('p', { text: question.quote })])]);
  }

  renderChoice(question, kind) {
    let layout = 'is-list';
    if (kind === 'book' || kind === 'opening') layout = 'is-covers';
    else if (kind === 'context') layout = 'is-years';
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
      class: 'rx-word', type: 'button', text: word,
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

  // Order the plot, played by tapping: the story so far fills from the top,
  // one event at a time, and the reader taps whichever event comes next. A
  // wrong tap is marked where it stands ("Later than that") and counts as a
  // slip, so the list on screen only ever holds the right order and there is
  // nothing to untangle at the end. The round is right with no slips.
  renderOrder(question) {
    this.order = { placed: [], slips: 0 };
    const labels = new Map(question.items.map(item => [item.id, item]));
    const total = question.answer.length;
    const story = el('ol', { class: 'rx-story', 'aria-label': 'The story so far' });
    const slots = question.answer.map((_, position) => {
      const slot = el('li', { class: 'rx-story-slot' + (position === 0 ? ' is-next' : '') }, [
        el('span', { class: 'rx-story-number', text: String(position + 1) }),
        el('span', { class: 'rx-story-text' }, [el('span', { class: 'rx-visually-hidden', text: 'Not placed yet' })])
      ]);
      story.append(slot);
      return slot;
    });
    // Only the events placed are drawn, under a count of how many there are.
    const tally = el('span', { class: 'rx-story-tally' });
    const head = el('div', { class: 'rx-story-head' }, [el('span', { class: 'rx-story-title', text: 'The story so far' }), tally]);
    const empty = el('li', { class: 'rx-story-empty', text: 'Nothing placed yet.' });
    story.append(empty);
    const countLeft = () => {
      const placed = this.order.placed.length;
      tally.textContent = placed + ' of ' + total;
      empty.hidden = placed > 0;
    };
    countLeft();
    const prompt = el('p', { class: 'rx-story-prompt', 'aria-live': 'polite', text: 'What comes first?' });
    const pool = el('div', { class: 'rx-story-pool', role: 'group', 'aria-label': 'Events to place' });
    this.orderList = story;
    this.orderPool = pool;
    this.orderSlots = slots;
    this.placeNext = (id, helped = false) => {
      const position = this.order.placed.length;
      const item = labels.get(id);
      this.order.placed.push(id);
      const slot = slots[position];
      slot.classList.remove('is-next');
      slot.classList.add('is-filled');
      if (helped) slot.classList.add('is-helped');
      slot.querySelector('.rx-story-number').textContent = item.label || String(position + 1);
      const text = slot.querySelector('.rx-story-text');
      clear(text);
      text.append(item.text);
      pool.querySelector('[data-id="' + CSS.escape(id) + '"]')?.remove();
      slots[position + 1]?.classList.add('is-next');
      countLeft();
      const left = total - this.order.placed.length;
      prompt.textContent = left === 0 ? '' : left === 1 ? 'And last?' : 'What comes next?';
      announce(this.live, (item.label ? item.label + ': ' : '') + brief(item.text) + ' placed ' + ordinal(position + 1) + '.');
    };
    for (const item of question.items) {
      const button = el('button', { type: 'button', class: 'rx-story-card', 'data-id': item.id }, [
        el('span', { class: 'rx-story-card-text', text: item.text })
      ]);
      button.addEventListener('click', () => {
        if (this.checked) return;
        const expected = question.answer[this.order.placed.length];
        if (item.id === expected) {
          this.placeNext(item.id);
          if (this.order.placed.length === total) this.check();
          return;
        }
        this.order.slips += 1;
        button.classList.add('is-slip');
        if (!button.querySelector('.rx-story-card-note')) button.append(el('span', { class: 'rx-story-card-note', text: 'Later than that. Try another.' }));
        announce(this.live, 'Not yet: that comes later.');
      });
      pool.append(button);
    }
    return el('div', { class: 'rx-story-wrap' }, [el('div', { class: 'rx-story-box' }, [head, story]), prompt, pool]);
  }

  // --- answering -------------------------------------------------------------

  hint() {
    if (this.checked || this.hinted) return;
    const question = this.current;
    this.hinted = true;
    if (question.kind === 'order') {
      this.hinted = false;
      this.order.slips += 1;
      this.placeNext(question.answer[this.order.placed.length], true);
      if (this.order.placed.length === question.answer.length) { this.hinted = true; this.check(); }
      return;
    }
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
        line = [el('b', { text: answer }), ' — you were ' + gap + (gap === 1 ? ' year' : ' years') + ' out.'];
      } else line = ['It’s ', el('b', { text: answer }), '.'];
    } else if (question.kind === 'cloze') {
      if (!gaveUp && this.blanks.includes(null)) { announce(this.live, 'Place a word in every gap first.'); return; }
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
      // A round given up is finished for the reader, in the right order.
      while (this.order.placed.length < question.answer.length) this.placeNext(question.answer[this.order.placed.length], true);
      correct = !gaveUp && !this.hinted && this.order.slips === 0;
      this.orderPool?.remove();
      this.orderList?.classList.add('is-checked');
      const slips = this.order.slips;
      if (gaveUp) line = 'Here is the order.';
      else if (!correct) line = (slips === 1 ? 'One slip' : slips + ' slips') + ' on the way. The story is in order above.';
    }

    this.checked = true;
    this.answers.push(correct);
    this.helped.push(Boolean(this.hinted && correct));
    this.picked.push(question.kind === 'choice' && !gaveUp ? this.selection : null);

    // A quotation answered here is a review of that line, unless a hint did
    // half the work: then it is neither promoted nor sent back.
    const key = quotationKey(question);
    if (key && isRemembering() && !this.options.practice && !(this.hinted && correct)) reviewCard(cardId(key.slug, key.id), correct);

    this.actions.remove();
    this.stage.querySelector('.rx-progress')?.replaceWith(this.progress());
    this.card.classList.add(correct ? 'is-correct' : 'is-missed');

    this.writeNote(question, correct, gaveUp, line);
    const verdict = correct ? 'Right.' : gaveUp ? 'Here is the answer.' : 'Not quite.';
    announce(this.live, verdict + ' ' + this.answerText(question) + '.');
    this.onward.focus({ preventScroll: true });
    const rect = this.feedback.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) this.feedback.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
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
    const nearly = question.kind === 'order' && !this.hinted && this.order.slips <= 2;
    const word = correct ? (this.hinted ? 'Right, with a hint.' : 'Right.') : gaveUp ? 'The answer.' : nearly ? 'Nearly.' : 'Not quite.';

    this.onward = el('button', { class: 'rx-button is-primary is-onward', type: 'button', onclick: () => this.next() }, [
      el('span', { text: last ? 'Finish' : 'Next' }), el('span', { 'aria-hidden': 'true', text: '→' })
    ]);
    const note = el('section', { class: 'rx-feedback ' + tone, 'aria-label': 'Answer' });
    note.append(el('div', { class: 'rx-verdict' }, [
      el('p', { class: 'rx-verdict-words' }, [
        el('b', { class: 'rx-verdict-word', text: word }),
        line && line.length ? ' ' : null,
        ...(line && line.length ? [].concat(line) : [])
      ].filter(part => part !== null)),
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
    const href = key ? guideHref(key.slug, 'quotations', 'astor-quote-' + key.id) : (question.book?.slug ? guideHref(question.book.slug) : '');
    if (href) links.append(el('a', { href, text: key ? 'Read it in the study guide' : 'The ' + shortTitle(question.book) + ' study guide' }));
    if (key && (quotation || question.quote)) {
      const id = key.slug + ':' + key.id;
      const keep = el('button', {
        type: 'button', class: 'rx-text-button rx-keep', 'aria-pressed': String(inCommonplace(id)),
        text: inCommonplace(id) ? 'Saved to your commonplace book' : 'Save this line'
      });
      keep.addEventListener('click', () => {
        const added = toggleCommonplace({
          id, text: quotation?.text || question.quote, reference: question.source,
          book: question.book?.title || '', bookHref: question.book?.href || ''
        });
        keep.setAttribute('aria-pressed', String(added));
        keep.textContent = added ? 'Saved to your commonplace book' : 'Save this line';
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
      if (quotation.reference && quotation.reference !== stage?.label) parts.push(quotation.reference);
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

  // The result, simply: the score, one line on what it means, one thing to do
  // next, and then the questions missed, each with its answer.
  finish() {
    const total = this.questions.length;
    const score = this.score;
    const { gameId, book, meta, practice } = this.options;
    const slug = book?.slug || meta?.slug;
    const before = gameId && slug ? scores()[gameId]?.byBook?.[slug] || null : null;
    if (gameId && !practice) recordScore(gameId, { score, total, bookSlug: slug });
    this.options.onFinish?.({ score, total, answers: this.answers.slice(), helped: this.helped.slice() });
    if (this.options.ownEnd) return;

    const missed = this.questions.map((question, position) => ({ question, position })).filter(entry => !this.answers[entry.position]);
    const step = book && this.options.next ? this.options.next(book) : null;

    const page = el('div', { class: 'rx-results' });
    const words = resultWords({ score, total, practice, before, pattern: this.pattern(), remembering: isRemembering() });
    page.append(completion({
      score, total,
      kicker: practice ? 'The ones you missed' : quizName(gameId),
      title: words.title, sub: words.sub
    }));

    const actions = el('div', { class: 'rx-results-actions' });
    if (missed.length) {
      actions.append(el('button', {
        class: 'rx-button is-primary', type: 'button',
        text: practice ? (missed.length === 1 ? 'Try the last one again' : 'Try the ' + missed.length + ' still missed') : missed.length === 1 ? 'Try the one you missed' : 'Try the ' + missed.length + ' you missed',
        onclick: () => this.goOver(missed.map(entry => entry.question))
      }));
      actions.append(el('button', { class: 'rx-text-button', type: 'button', text: 'New round', onclick: () => this.restart() }));
    } else if (step && !practice) {
      actions.append(el('a', { class: 'rx-button is-primary', href: step.href, text: 'Next: ' + step.label }));
      actions.append(el('button', { class: 'rx-text-button', type: 'button', text: 'New round', onclick: () => this.restart() }));
    } else {
      actions.append(el('button', { class: 'rx-button is-primary', type: 'button', text: 'New round', onclick: () => this.restart() }));
    }
    page.append(actions);

    if (missed.length) {
      const list = el('ol', { class: 'rx-review-list' });
      for (const { question, position } of missed) list.append(this.missedItem(question, this.picked[position]));
      page.append(el('section', { class: 'rx-review', 'aria-labelledby': 'rx-review-title' }, [
        el('h3', { id: 'rx-review-title', text: missed.length === 1 ? 'The one you missed' : 'The ' + missed.length + ' you missed' }),
        list,
        quotationCount(missed) && isRemembering() && !practice ? el('p', { class: 'rx-review-note', text: 'They come back tomorrow in Ten questions and the flashcards.' }) : null
      ]));
    }

    this.container.append(page);
    announce(this.live, 'Finished. ' + score + ' out of ' + total + '.');
    page.querySelector('.rx-results-title')?.focus({ preventScroll: true });
    page.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  missedItem(question, pickedIndex) {
    const book = this.options.book;
    const quotation = quotationFor(book, question);
    const isClue = kindOf(question) === 'character';
    const shown = (quotation?.text || question.quote || question.stem).replace(/———/g, '▬▬');
    const item = el('div', { class: 'rx-review-item' });
    // A line from the book is quoted; a clue or a plain question is not.
    const plain = isClue || !(quotation || question.quote);
    item.append(el('p', { class: 'rx-review-line' + (plain ? ' is-clue' : ''), text: plain ? shown : quoted(shown) }));
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

// What the completion screen says, from what actually happened: the score,
// how it compares with the reader's best and last go on this book, and
// (passed in as `pattern`) where the misses cluster. Kept free of the page so
// it can be tested.
export function resultWords({ score, total, practice = false, before = null, pattern = '', remembering = false }) {
  const missed = total - score;
  const ratio = total ? score / total : 0;
  if (practice) {
    if (!missed) {
      return {
        title: total === 1 ? 'Put right.' : 'All ' + inWords(total) + ' put right.',
        sub: remembering ? 'They come back in a day or two, to make sure they stick.' : 'Those lines are yours now.'
      };
    }
    return {
      title: score ? score + ' of ' + total + ' put right.' : 'Still learning these.',
      sub: (missed === 1 ? 'One still to learn.' : inWords(missed).replace(/^./, c => c.toUpperCase()) + ' still to learn.') + ' Another go fixes them faster than a new round.'
    };
  }
  let title;
  if (!missed) title = 'Flawless.';
  else if (missed === 1 && total >= 5) title = 'One away from perfect.';
  else if (ratio >= 0.7) title = 'A strong round.';
  else if (ratio >= 0.5) title = 'More right than wrong.';
  else if (ratio >= 0.3) title = 'Some of these are sticking.';
  else if (score) title = 'A tough round.';
  else title = 'None this time.';

  const bestRatio = before?.total ? before.best / before.total : null;
  const lastRatio = before?.lastTotal ? before.last / before.lastTotal : null;
  const best = bestRatio !== null && ratio > bestRatio;
  let change = '';
  if (best) change = 'A new best, up from ' + before.best + (before.total !== total ? ' of ' + before.total : '') + '.';
  else if (lastRatio !== null && ratio > lastRatio) change = 'Up from ' + before.last + ' last time.';
  const advice = pattern || (ratio < 0.5 && missed ? 'The ones you missed are the lines to learn next.' : '');
  const sub = [change, advice].filter(Boolean).join(' ');
  return { title, sub, best: best && ratio >= 0.5 };
}

const NUMBER_WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const inWords = number => NUMBER_WORDS[number] || String(number);

// The top of every completion screen: what was played, the score in large
// type, the headline and one line.
export function completion({ score, total, kicker, title, chips = [], sub = '' }) {
  const book = currentBook();
  return el('div', { class: 'rx-results-hero' }, [
    el('p', { class: 'rx-results-what', text: [book ? shortTitle(book) : '', kicker].filter(Boolean).join(' · ') }),
    el('p', { class: 'rx-results-score', role: 'img', 'aria-label': score + ' out of ' + total }, [
      el('b', { 'aria-hidden': 'true', text: String(score) }),
      el('span', { 'aria-hidden': 'true', text: ' out of ' + total })
    ]),
    el('h2', { class: 'rx-results-title', tabindex: '-1', text: title }),
    sub ? el('p', { class: 'rx-results-sub', text: sub }) : null,
    chips.length ? el('p', { class: 'rx-results-note', text: chips.join(' · ') }) : null
  ]);
}

function ordinal(number) {
  const tail = number % 100 >= 11 && number % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[number % 10] || 'th';
  return number + tail;
}

export function emptyState(container, message, links = [], reason = '') {
  clear(container);
  const panel = el('div', { class: 'rx-empty' });
  panel.append(el('p', { text: message }));
  if (reason) panel.append(el('p', { class: 'rx-load-why', text: 'Reason: ' + reason }));
  if (links.length) {
    const row = el('div', { class: 'rx-results-actions' });
    links.forEach((link, index) => row.append(el('a', { class: 'rx-button ' + (index ? 'is-secondary' : 'is-primary'), href: link.href, text: link.label })));
    panel.append(row);
  }
  container.append(panel);
}

export { formatYear };

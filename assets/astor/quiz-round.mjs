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
import { quotationKey, quotationFor, firstSentence, drawing, quizName, shortTitle, monogram, coverImage, quoted, headerOffset, motif, hasMotifs, burst, currentBook } from './revise-kit.mjs';

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
      else if (question.kind === 'cloze') this.check();
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
      }, [hasMotifs() ? motif(position) : el('i')]));
    }
    track.classList.toggle('is-motifs', hasMotifs());
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
    // The book's own drawing for this question heads the card like a
    // printer's ornament, on the same line as what is being asked.
    const head = el('div', { class: 'rx-card-head' }, [
      showKind && about.label ? el('p', { class: 'rx-card-kind' }, [drawing((this.options.icons || {})[about.icon] || '', 16), el('span', { text: about.label })]) : null,
      this.options.practice ? el('p', { class: 'rx-card-kind is-practice', text: 'Second go at the ones you missed' }) : null,
      el('div', { class: 'rx-stem-row' }, [hasMotifs() ? motif(this.index, 'rx-card-motif') : null, el('h2', { class: 'rx-stem', tabindex: '-1', text: question.stem })])
    ]);
    card.append(head);

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
        this.hintButton = el('button', { class: 'rx-button is-quiet', type: 'button', title: 'Take away two wrong answers (H)', onclick: () => this.hint() }, [
          el('span', { class: 'rx-hint-icon', 'aria-hidden': 'true', text: '½' }), el('span', { text: '50:50' })
        ]);
      } else if (question.kind === 'cloze') {
        this.hintButton = el('button', { class: 'rx-button is-quiet', type: 'button', onclick: () => this.hint() }, [
          el('span', { class: 'rx-hint-icon', 'aria-hidden': 'true', text: 'A' }), el('span', { text: 'First letters' })
        ]);
      } else if (question.kind === 'order') {
        this.hintButton = el('button', { class: 'rx-button is-quiet', type: 'button', text: 'Show the next one', onclick: () => this.hint() });
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
    // Only the events placed are drawn; above them, a dot for every event
    // says how far the story has got.
    const dots = el('ol', { class: 'rx-story-dots', 'aria-hidden': 'true' }, question.answer.map(() => el('li')));
    const tally = el('span', { class: 'rx-story-tally' });
    const head = el('div', { class: 'rx-story-head' }, [el('span', { class: 'rx-story-title', text: 'The story so far' }), dots, tally]);
    const empty = el('li', { class: 'rx-story-empty', text: 'Nothing placed yet.' });
    story.append(empty);
    const countLeft = () => {
      const placed = this.order.placed.length;
      [...dots.children].forEach((dot, index) => dot.classList.toggle('is-on', index < placed));
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
      if (!prefersReducedMotion()) slot.animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
      pool.querySelector('[data-id="' + CSS.escape(id) + '"]')?.remove();
      slots[position + 1]?.classList.add('is-next');
      countLeft();
      const left = total - this.order.placed.length;
      prompt.textContent = left === 0 ? '' : left === 1 ? 'And last?' : 'What comes next?';
      announce(this.live, (item.label ? item.label + ': ' : '') + brief(item.text) + ' placed ' + ordinal(position + 1) + '.');
    };
    for (const item of question.items) {
      const button = el('button', { type: 'button', class: 'rx-story-card', 'data-id': item.id, style: '--i:' + question.items.indexOf(item) }, [
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
        this.shake(button);
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
    this.run = correct && !this.hinted ? this.run + 1 : 0;
    this.bestRun = Math.max(this.bestRun, this.run);

    // A quotation answered here is a review of that line, unless a hint did
    // half the work: then it is neither promoted nor sent back.
    const key = quotationKey(question);
    if (key && isRemembering() && !this.options.practice && !(this.hinted && correct)) reviewCard(cardId(key.slug, key.id), correct);

    this.actions.remove();
    this.stage.querySelector('.rx-progress')?.replaceWith(this.progress(correct));
    this.card.classList.add(correct ? 'is-correct' : 'is-missed');
    if (correct) {
      const target = question.kind === 'choice' ? this.optionButtons[question.answer]
        : question.kind === 'cloze' ? this.container.querySelector('.rx-cloze-line') : this.orderList;
      burst(target || this.card);
      this.stage.querySelector('.rx-track li:nth-child(' + this.answers.length + ')')?.classList.add('is-fresh');
    }
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
    const nearly = question.kind === 'order' && !this.hinted && this.order.slips <= 2;
    const word = correct ? (this.hinted ? 'Right, with a hint' : praise(this.run)) : gaveUp ? 'The answer' : nearly ? 'Nearly' : 'Not quite';

    this.onward = el('button', { class: 'rx-button is-primary is-onward', type: 'button', onclick: () => this.next() }, [
      el('span', { text: last ? 'Finish' : 'Next' }), el('span', { 'aria-hidden': 'true', text: '→' })
    ]);
    const note = el('section', { class: 'rx-feedback ' + tone, 'aria-label': 'Answer' });
    note.append(el('div', { class: 'rx-verdict' }, [
      el('span', { class: 'rx-verdict-mark', html: correct ? CHECK : gaveUp ? '<span aria-hidden="true">i</span>' : CROSS }),
      el('div', { class: 'rx-verdict-words' }, [
        el('p', { class: 'rx-verdict-word', text: word }),
        line && line.length ? el('p', { class: 'rx-verdict-line' }, [].concat(line)) : null
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

  // The result, simply: the stars, the number, a mark for each question, one
  // line and one thing to do next. The lines missed are there for anyone who
  // wants them, folded under a link.
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
    const bestStars = before?.total ? starsFor(before.best, before.total) : beforeAll?.bestTotal ? starsFor(beforeAll.best, beforeAll.bestTotal) : null;
    const missed = this.questions.map((question, position) => ({ question, position })).filter(entry => !this.answers[entry.position]);
    const step = book && this.options.next ? this.options.next(book) : null;

    const page = el('div', { class: 'rx-results' + (ratio >= 0.8 && !practice ? ' is-shining' : '') });
    const words = resultWords({ score, total, practice, before, pattern: this.pattern(), remembering: isRemembering() });
    page.append(completion({
      score, total, marks: this.answers,
      kicker: practice ? 'The ones you missed' : quizName(gameId),
      title: words.title, sub: words.sub, badge: words.best ? 'New best' : '',
      stars: !practice, best: practice ? null : bestStars
    }));

    const actions = el('div', { class: 'rx-results-actions' });
    if (missed.length) {
      actions.append(el('button', {
        class: 'rx-button is-primary is-wide', type: 'button',
        text: practice ? (missed.length === 1 ? 'Try the last one again' : 'Try the ' + missed.length + ' still missed') : missed.length === 1 ? 'Try the one you missed' : 'Try the ' + missed.length + ' you missed',
        onclick: () => this.goOver(missed.map(entry => entry.question))
      }));
      actions.append(el('button', { class: 'rx-text-button', type: 'button', text: 'New round', onclick: () => this.restart() }));
    } else if (step && !practice) {
      actions.append(el('a', { class: 'rx-button is-primary is-wide', href: step.href, text: 'Next: ' + step.label }));
      actions.append(el('button', { class: 'rx-text-button', type: 'button', text: 'New round', onclick: () => this.restart() }));
    } else {
      actions.append(el('button', { class: 'rx-button is-primary is-wide', type: 'button', text: 'New round', onclick: () => this.restart() }));
    }
    page.append(actions);

    if (missed.length) {
      const list = el('ol', { class: 'rx-review-list' });
      for (const { question, position } of missed) list.append(this.missedItem(question, this.picked[position]));
      page.append(el('details', { class: 'rx-review' }, [
        el('summary', {}, [el('span', { text: missed.length === 1 ? 'See the one you missed' : 'See the ' + missed.length + ' you missed' })]),
        list,
        quotationCount(missed) && isRemembering() && !practice ? el('p', { class: 'rx-review-note', text: 'They come back tomorrow in Ten questions and the flashcards.' }) : null
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
  const sub = [change, advice, starHint(score, total, bestRatio === null ? null : starsFor(before.best, before.total))].filter(Boolean).slice(0, 2).join(' ');
  // The badge celebrates; on a weak round the line says it quietly instead.
  return { title, sub, best: best && ratio >= 0.5 };
}

const NUMBER_WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const inWords = number => NUMBER_WORDS[number] || String(number);

// What the next star asks for, in a sentence.
export function starHint(score, total, best = null) {
  const stars = starsFor(score, total);
  if (stars === 3) return best !== null && best < 3 ? 'All three stars, and a new best.' : 'All three stars.';
  if (stars === 2) return 'Get all ' + inWords(total) + ' for the third star.';
  return 'Get ' + starTarget(total) + ' for the second star.';
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

// The top of every completion screen: up to three stars, the score in large
// type, a small mark for each question (filled or empty, never red), the
// headline and one line. `chips` are a few short facts set as one quiet line.
export function completion({ score, total, kicker, title, chips = [], sub = '', best = null, marks = null, badge = '', stars: showStars = true }) {
  const stars = starsFor(score, total);
  const starRow = showStars ? el('p', { class: 'rx-stars', role: 'img', 'aria-label': stars + ' of 3 stars' }) : null;
  for (let index = 0; showStars && index < 3; index += 1) {
    starRow.append(el('span', { class: 'rx-star' + (index < stars ? ' is-earned' : ''), style: '--i:' + index, html: STAR }));
  }
  const drawn = hasMotifs();
  const markRow = marks && marks.length ? el('ol', { class: 'rx-results-marks' + (drawn ? ' is-motifs' : ''), 'aria-hidden': 'true', style: '--n:' + marks.length },
    marks.map((right, index) => el('li', { class: right ? 'is-right' : '', style: '--i:' + index }, drawn ? [motif(index)] : []))) : null;
  // Set like the book's cover: its name where the cover has the imprint.
  const book = currentBook();
  return el('div', { class: 'rx-results-hero' + (drawn ? ' is-cover' : '') }, [
    drawn ? el('span', { class: 'rx-results-art', 'aria-hidden': 'true' }) : null,
    drawn && book ? el('p', { class: 'rx-results-book', text: shortTitle(book) }) : null,
    kicker ? el('p', { class: 'rx-results-what', text: kicker }) : null,
    starRow,
    el('p', { class: 'rx-results-score', role: 'img', 'aria-label': score + ' out of ' + total }, [
      el('b', { 'aria-hidden': 'true', text: String(score) }),
      el('span', { 'aria-hidden': 'true', text: 'out of ' + inWords(total) })
    ]),
    markRow,
    el('div', { class: 'rx-results-words' }, [
      badge ? el('p', { class: 'rx-results-badge', text: badge }) : null,
      el('h2', { class: 'rx-results-title', tabindex: '-1', text: title }),
      sub ? el('p', { class: 'rx-results-sub', text: sub }) : null,
      chips.length ? el('p', { class: 'rx-results-note', text: chips.join(' · ') }) : null
    ])
  ]);
}

// The number counts up and the stars arrive; both are skipped when the
// reader has asked for less motion.
export function celebrate(page) {
  if (prefersReducedMotion()) return;
  page.animate?.([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2,.7,.2,1)' });
  const number = page.querySelector('.rx-results-score b');
  const target = Number(number?.textContent || 0);
  if (number && target > 0) {
    const start = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - start) / 800);
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

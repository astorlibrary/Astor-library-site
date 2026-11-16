// Astor Today: five questions on literature, the same for everyone, one at a
// time. The first and the last are on one book, the day's book; the three
// between come from elsewhere in the library. Each question has a hint for
// anyone who wants it, and every answer is followed by a short explanation
// and, where there is one, a way back to the line or the scene itself. The
// questions are written and checked by hand (assets/today-questions.json);
// today-pick.mjs puts the day's five together.

import { el, clear, announce, fetchJson } from './util.mjs';
import { today, dailyResult, recordDaily, isRemembering } from './store.mjs';
import { roundFor, shareGrid, PER_DAY } from './today-pick.mjs';

const head = document.querySelector('#astor-today-head');
const mount = document.querySelector('#astor-daily-game');
const LETTERS = ['A', 'B', 'C', 'D'];
// What a question is about, said above it: the round moves outwards from the
// words on the page to the world round the book.
const KIND_LABEL = { text: 'In the text', book: 'How the book was made', world: 'Round the book' };

// Titles of works are marked *thus* in the bank and set in italics.
const plain = text => String(text).replace(/\*/g, '');
const rich = text => String(text).split(/(\*[^*]+\*)/).filter(Boolean)
  .map(part => (/^\*[^*]+\*$/.test(part) ? el('em', { text: part.slice(1, -1) }) : part));

if (mount) start();

async function start() {
  const day = today();
  renderHead(null);
  let bank;
  try {
    bank = await fetchJson('/assets/today-questions.json');
  } catch {
    clear(mount);
    mount.append(el('p', { class: 'today-empty', text: 'Today’s questions didn’t load. Check your connection and reload the page.' }));
    return;
  }
  const round = roundFor(bank.questions, day);
  const questions = round.questions;
  if (!questions.length) return;
  // The day's book, named only once the questions are answered: its title is
  // sometimes the answer to the first of them.
  round.work = round.book && bank.books ? { slug: round.book, ...bank.books[round.book] } : null;
  renderHead(round);
  const done = dailyResult(day);
  if (done && Array.isArray(done.picks) && done.picks.length === questions.length) return renderEnd(questions, done, day, round);
  play(questions, day, round);
}


function renderHead(round) {
  if (!head) return;
  clear(head);
  const now = new Date();
  const line = round?.occasion ? rich(round.occasion)
    : round?.book ? ['Five questions. The first and the last are on the same book.']
    : ['Five questions a day on books, plays and poems.'];
  head.append(
    el('h1', { class: 'today-title', text: 'Today' }),
    el('p', { class: 'today-date', text: now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) }),
    el('p', { class: 'today-deck' + (round?.occasion ? ' is-occasion' : '') }, line)
  );
}

function play(questions, day, round) {
  const picks = [];
  const hinted = [];
  const live = el('p', { class: 'rx-visually-hidden', 'aria-live': 'polite' });
  let index = 0;

  function show() {
    clear(mount);
    mount.append(live);
    if (index >= questions.length) return finish();
    const question = questions[index];
    const card = el('section', { class: 'today-card', 'aria-labelledby': 'today-q' });
    const again = index === questions.length - 1 && round.book && question.book === round.book;
    const about = again ? 'The same book as the first question' : KIND_LABEL[question.kind] || '';
    const count = el('p', { class: 'today-count' }, [
      el('span', { text: 'Question ' + (index + 1) + ' of ' + questions.length }),
      about ? el('span', { class: 'today-kind', text: about }) : null
    ]);
    const prompt = el('h2', { class: 'today-question', id: 'today-q', tabindex: '-1' }, rich(question.question));
    const options = el('ol', { class: 'today-options' });
    const buttons = question.options.map((option, position) => {
      const button = el('button', { type: 'button', class: 'today-option' }, [
        el('span', { class: 'today-letter', 'aria-hidden': 'true', text: LETTERS[position] }),
        el('span', { class: 'today-option-text' }, rich(option))
      ]);
      button.addEventListener('click', () => answer(position));
      options.append(el('li', {}, [button]));
      return button;
    });
    const hintText = el('p', { class: 'today-hint', hidden: true }, rich(question.hint));
    const hintButton = el('button', { type: 'button', class: 'today-hint-button', text: 'Show a hint' });
    hintButton.addEventListener('click', () => {
      hintText.hidden = false;
      hintButton.hidden = true;
      hinted[index] = true;
      announce(live, 'Hint: ' + plain(question.hint));
    });
    const feedback = el('div', { class: 'today-feedback', hidden: true });
    card.append(count, prompt, options, el('div', { class: 'today-hint-row' }, [hintButton, hintText]), feedback);
    mount.append(card);
    prompt.focus({ preventScroll: true });

    function answer(position) {
      if (picks[index] !== undefined) return;
      picks[index] = position;
      const right = position === question.answer;
      buttons.forEach((button, place) => {
        button.disabled = true;
        if (place === question.answer) button.classList.add('is-answer');
        if (place === position && !right) button.classList.add('is-wrong');
      });
      hintButton.hidden = true;
      feedback.hidden = false;
      feedback.className = 'today-feedback ' + (right ? 'is-right' : 'is-wrong');
      feedback.append(
        el('p', { class: 'today-verdict' }, right
          ? [el('b', { text: 'Right.' })]
          : [el('b', { text: 'Not quite.' }), ' The answer is ', ...rich(question.options[question.answer]), '.']),
        el('p', { class: 'today-explanation' }, rich(question.explanation)),
        question.link ? el('p', { class: 'today-more' }, [el('a', { href: question.link.href, text: plain(question.link.label) })]) : null
      );
      const next = el('button', { type: 'button', class: 'today-next', text: index + 1 < questions.length ? 'Next question' : 'See how you did' });
      next.addEventListener('click', () => { index += 1; show(); });
      feedback.append(next);
      announce(live, (right ? 'Right. ' : 'Not quite. The answer is ' + plain(question.options[question.answer]) + '. ') + plain(question.explanation));
      next.focus({ preventScroll: true });
      feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    keyHandler = event => {
      if (event.target.closest?.('input, textarea')) return;
      const key = event.key.toUpperCase();
      const chosen = LETTERS.indexOf(key) >= 0 ? LETTERS.indexOf(key) : ['1', '2', '3', '4'].indexOf(event.key);
      if (chosen >= 0 && chosen < question.options.length && picks[index] === undefined) { event.preventDefault(); answer(chosen); }
      else if (key === 'H' && picks[index] === undefined && !hintButton.hidden) hintButton.click();
    };
  }

  function finish() {
    document.removeEventListener('keydown', onKey);
    const marks = questions.map((question, position) => picks[position] === question.answer);
    const result = { score: marks.filter(Boolean).length, total: questions.length, marks, picks: picks.slice(), hints: questions.map((_, position) => Boolean(hinted[position])) };
    if (isRemembering()) recordDaily(result, day);
    renderEnd(questions, result, day, round);
  }

  let keyHandler = null;
  const onKey = event => keyHandler?.(event);
  document.addEventListener('keydown', onKey);
  show();
}

function renderEnd(questions, result, day, round) {
  clear(mount);
  const total = result.total || PER_DAY;
  const summary = el('section', { class: 'today-end', 'aria-labelledby': 'today-score' }, [
    el('h2', { class: 'today-score', id: 'today-score', tabindex: '-1', text: 'You got ' + result.score + ' of ' + total + '.' }),
    el('p', { class: 'today-deck', text: 'There will be five new questions tomorrow.' })
  ]);
  // The day's book, and the two ways back into it.
  const work = round?.work;
  if (work?.title) {
    summary.append(el('div', { class: 'today-book' }, [
      el('p', { class: 'today-book-label', text: 'Today’s book' }),
      el('p', { class: 'today-book-title' }, [el('a', { href: work.href, text: work.title })]),
      el('p', { class: 'today-book-links' }, [
        el('a', { href: work.href, text: work.revise ? 'Read the study guide' : 'Read about the book' }),
        work.revise ? el('a', { href: '/play/?book=' + encodeURIComponent(work.slug), text: 'Ten questions on ' + work.title }) : null
      ])
    ]));
  }
  const review = el('ol', { class: 'today-review' });
  questions.forEach((question, position) => {
    const pick = result.picks?.[position];
    const right = pick === question.answer;
    review.append(el('li', { class: right ? 'is-right' : 'is-wrong' }, [
      el('p', { class: 'today-review-question' }, rich(question.question)),
      el('p', { class: 'today-review-answer' }, [
        el('span', { class: 'today-mark', text: right ? 'Right' : 'Missed' }),
        ' ', ...rich(question.options[question.answer]),
        ...(right || pick === undefined || pick === null ? [] : [' (you chose ', ...rich(question.options[pick]), ')'])
      ]),
      el('p', { class: 'today-explanation' }, rich(question.explanation)),
      question.link ? el('p', { class: 'today-more' }, [el('a', { href: question.link.href, text: plain(question.link.label) })]) : null
    ]));
  });
  const shareText = 'Astor Library, Today, ' + day + '\n' + shareGrid(result.marks || []) + ' ' + result.score + '/' + total + '\nhttps://astorlibrary.com/today/';
  const copy = el('button', { type: 'button', class: 'today-next', text: 'Copy your result' });
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(shareText); copy.textContent = 'Copied'; } catch { copy.textContent = 'Copying is not available here'; }
  });
  summary.append(review, el('p', { class: 'today-actions' }, [copy, el('a', { href: '/play/', text: 'Revise a book' })]));
  mount.append(summary);
  summary.querySelector('#today-score')?.focus({ preventScroll: true });
}

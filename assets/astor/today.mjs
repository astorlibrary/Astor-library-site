// Astor Today: five questions on literature, the same for everyone, one at a
// time. Each question has a hint for anyone who wants it, and every answer is
// followed by a short explanation. The questions are written and checked by
// hand (assets/today-questions.json); today-pick.mjs chooses the day's five.

import { el, clear, announce, fetchJson } from './util.mjs';
import { today, dailyResult, recordDaily, isRemembering } from './store.mjs';
import { questionsFor, shareGrid, PER_DAY } from './today-pick.mjs';

const head = document.querySelector('#astor-today-head');
const mount = document.querySelector('#astor-daily-game');
const LETTERS = ['A', 'B', 'C', 'D'];

if (mount) start();

async function start() {
  const day = today();
  renderHead();
  let bank;
  try {
    bank = await fetchJson('/assets/today-questions.json');
  } catch {
    clear(mount);
    mount.append(el('p', { class: 'today-empty', text: 'Today’s questions didn’t load. Check your connection and reload the page.' }));
    return;
  }
  const questions = questionsFor(bank.questions, day);
  if (!questions.length) return;
  const done = dailyResult(day);
  if (done && Array.isArray(done.picks) && done.picks.length === questions.length) return renderEnd(questions, done, day);
  play(questions, day);
}

function renderHead() {
  if (!head) return;
  clear(head);
  const now = new Date();
  head.append(
    el('h1', { class: 'today-title', text: 'Today' }),
    el('p', { class: 'today-date', text: now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) }),
    el('p', { class: 'today-deck', text: 'Five questions on literature, one at a time. New questions every day.' })
  );
}

function play(questions, day) {
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
    const count = el('p', { class: 'today-count', text: 'Question ' + (index + 1) + ' of ' + questions.length });
    const prompt = el('h2', { class: 'today-question', id: 'today-q', tabindex: '-1', text: question.question });
    const options = el('ol', { class: 'today-options' });
    const buttons = question.options.map((option, position) => {
      const button = el('button', { type: 'button', class: 'today-option' }, [
        el('span', { class: 'today-letter', 'aria-hidden': 'true', text: LETTERS[position] }),
        el('span', { class: 'today-option-text', text: option })
      ]);
      button.addEventListener('click', () => answer(position));
      options.append(el('li', {}, [button]));
      return button;
    });
    const hintText = el('p', { class: 'today-hint', hidden: true, text: question.hint });
    const hintButton = el('button', { type: 'button', class: 'today-hint-button', text: 'Show a hint' });
    hintButton.addEventListener('click', () => {
      hintText.hidden = false;
      hintButton.hidden = true;
      hinted[index] = true;
      announce(live, 'Hint: ' + question.hint);
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
          : [el('b', { text: 'Not quite.' }), ' The answer is ' + question.options[question.answer] + '.']),
        el('p', { class: 'today-explanation', text: question.explanation }),
        question.link ? el('p', { class: 'today-more' }, [el('a', { href: question.link.href, text: question.link.label })]) : null
      );
      const next = el('button', { type: 'button', class: 'today-next', text: index + 1 < questions.length ? 'Next question' : 'See how you did' });
      next.addEventListener('click', () => { index += 1; show(); });
      feedback.append(next);
      announce(live, (right ? 'Right. ' : 'Not quite. The answer is ' + question.options[question.answer] + '. ') + question.explanation);
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
    renderEnd(questions, result, day);
  }

  let keyHandler = null;
  const onKey = event => keyHandler?.(event);
  document.addEventListener('keydown', onKey);
  show();
}

function renderEnd(questions, result, day) {
  clear(mount);
  const total = result.total || PER_DAY;
  const summary = el('section', { class: 'today-end', 'aria-labelledby': 'today-score' }, [
    el('h2', { class: 'today-score', id: 'today-score', tabindex: '-1', text: 'You got ' + result.score + ' of ' + total + '.' }),
    el('p', { class: 'today-deck', text: 'There will be five new questions tomorrow.' })
  ]);
  const review = el('ol', { class: 'today-review' });
  questions.forEach((question, position) => {
    const pick = result.picks?.[position];
    const right = pick === question.answer;
    review.append(el('li', { class: right ? 'is-right' : 'is-wrong' }, [
      el('p', { class: 'today-review-question', text: question.question }),
      el('p', { class: 'today-review-answer' }, [
        el('span', { class: 'today-mark', text: right ? 'Right' : 'Missed' }),
        ' ' + question.options[question.answer] + (right ? '' : (pick !== undefined && pick !== null ? ' (you chose ' + question.options[pick] + ')' : ''))
      ]),
      el('p', { class: 'today-explanation', text: question.explanation })
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

// The homepage's "today" box.
//
// The box is written into the page as plain prose with a link, so it reads
// without JavaScript. With it, the passage of the day is fetched from the
// study index and set into the box — the same passage the Today page shows,
// chosen by the same arithmetic on the same date — with the reader's own
// result for the day if this device has one.

import { el, clear } from './util.mjs';
import { loadIndex } from './data.mjs';
import { dailyPassage } from './questions.mjs';
import { today, dailyResult, streak } from './store.mjs';

const box = document.querySelector('[data-astor-home-today]');
if (box) fill(box);

async function fill(mount) {
  let index;
  try {
    index = await loadIndex();
  } catch {
    return;
  }
  const day = today();
  const passage = dailyPassage(index, day);
  if (!passage) return;

  const result = dailyResult(day);
  const run = streak();
  const status = result
    ? 'You scored ' + result.score + ' of ' + result.total + ' today.'
    : run.live && run.current
      ? 'Your streak is ' + run.current + (run.current === 1 ? ' day' : ' days') + '. Today’s questions are ready.'
      : 'Five quick questions. New every day.';

  clear(mount);
  mount.append(
    el('p', { class: 'home-kicker', text: 'Today on Astor' }),
    el('blockquote', {}, [el('p', { text: passage.text })]),
    el('p', { class: 'home-today-attribution', text: (passage.speaker ? passage.speaker + ' · ' : '') + passage.bookTitle + ' ' + passage.reference }),
    el('p', { class: 'home-today-status', text: status }),
    el('nav', {}, [
      el('a', { class: 'home-more', href: '/today/', text: result ? 'See today’s page →' : 'Play today’s questions →' }),
      el('a', { class: 'home-more', href: passage.bookHref, text: 'Read ' + passage.bookTitle + ' →' })
    ])
  );
}

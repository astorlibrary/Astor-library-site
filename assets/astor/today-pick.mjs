// Which five questions Today asks on a given day.
//
// The bank in /assets/today-questions.json is put into one fixed order and
// walked five at a time, a step a day, so a question does not come round again
// until the whole bank has been used. Every browser does the same arithmetic
// on the same date and asks the same questions. Nothing here touches the page,
// so the tests can check it directly.

import { seededRandom, hashString, shuffle } from './util.mjs';

export const PER_DAY = 5;
const EPOCH = Date.UTC(2026, 0, 1);

export function dayNumber(day) {
  const [year, month, date] = String(day).split('-').map(Number);
  return Math.floor((Date.UTC(year, month - 1, date) - EPOCH) / 86400000);
}

export function questionsFor(bank, day, count = PER_DAY) {
  if (!Array.isArray(bank) || bank.length < count) return [];
  const order = shuffle(bank.map((_, index) => index), seededRandom(hashString('astor-today-order')));
  const rounds = Math.floor(order.length / count);
  const round = ((dayNumber(day) % rounds) + rounds) % rounds;
  return order.slice(round * count, round * count + count).map(index => withShuffledOptions(bank[index], day));
}

// The right answer should not always sit in the same place.
function withShuffledOptions(question, day) {
  const correct = question.options[question.answer];
  const options = shuffle(question.options, seededRandom(hashString(question.id + ':' + day)));
  return { ...question, options, answer: options.indexOf(correct) };
}

export function shareGrid(marks) {
  return marks.map(right => (right ? '■' : '□')).join('');
}

// Which five questions Today asks on a given day.
//
// A day's five are put together as a set, not drawn at random. The first and
// the last are on the same book, the day's book; the three between them come
// from three other books. Within the set the questions move outwards: what is
// in the text first, then how the book was written and printed, then the life
// and the stage around it. A question that belongs to a day of the year (the
// first Globe burned down on 29 June) is asked first on that day, introduced
// by a line saying why.
//
// The bank in /assets/today-questions.json is dealt into days once, in a fixed
// order, and the days are taken in turn, so nothing comes round again until
// every day has been played. Every browser does the same arithmetic on the
// same date and asks the same questions. Nothing here touches the page, so
// the tests can check it directly.

import { seededRandom, hashString, shuffle } from './util.mjs';

export const PER_DAY = 5;
const EPOCH = Date.UTC(2026, 0, 1);
const KIND_ORDER = { text: 0, book: 1, world: 2 };
const kindOf = question => KIND_ORDER[question.kind] ?? 0;

export function dayNumber(day) {
  const [year, month, date] = String(day).split('-').map(Number);
  return Math.floor((Date.UTC(year, month - 1, date) - EPOCH) / 86400000);
}

const plans = new WeakMap();

// The bank, dealt into days. Dated questions are kept out of the deal and
// asked on their own days.
function dealt(bank) {
  if (plans.has(bank)) return plans.get(bank);
  const pool = bank.filter(question => !question.on);
  const count = Math.floor(pool.length / PER_DAY);
  const order = shuffle(pool, seededRandom(hashString('astor-today-order')));

  // Two questions on one book open and close a day: the one nearest the text
  // first, the one furthest from it last. Books take turns, so a book is the
  // day's book once before any book is twice.
  const byBook = new Map();
  for (const question of order) {
    if (!question.book) continue;
    if (!byBook.has(question.book)) byBook.set(question.book, []);
    byBook.get(question.book).push(question);
  }
  const lists = [...byBook.values()].map(list => list.slice().sort((a, b) => kindOf(a) - kindOf(b)));
  const days = [];
  const used = new Set();
  for (let pass = 0; days.length < count; pass++) {
    let took = false;
    for (const list of lists) {
      if (days.length >= count || list.length < 2) continue;
      const lead = list.shift();
      const close = list.pop();
      used.add(lead).add(close);
      days.push({ book: lead.book, lead, close, middle: [] });
      took = true;
    }
    if (!took) break;
  }
  // Too few pairs for every day: the remaining days have no book of their own.
  while (days.length < count) days.push({ book: '', lead: null, close: null, middle: [] });

  // The rest are dealt round the days, the widest-ranging kinds first so that
  // every day gets its share, and never two from one book on the same day.
  const rest = order.filter(question => !used.has(question)).sort((a, b) => kindOf(b) - kindOf(a));
  const room = day => PER_DAY - day.middle.length - (day.lead ? 2 : 0);
  const clashes = (day, question) => question.book && (day.book === question.book || day.middle.some(other => other.book === question.book));
  let at = 0;
  for (const question of rest) {
    let placed = false;
    for (let step = 0; step < count && !placed; step++) {
      const day = days[(at + step) % count];
      if (room(day) > 0 && !clashes(day, question)) { day.middle.push(question); at = (at + step + 1) % count; placed = true; }
    }
    if (!placed) {
      const day = days.find(candidate => room(candidate) > 0);
      if (day) day.middle.push(question);
    }
  }
  for (const day of days) day.middle.sort((a, b) => kindOf(a) - kindOf(b));
  const plan = { days, dated: bank.filter(question => question.on) };
  plans.set(bank, plan);
  return plan;
}

// How many days pass before a question can come round again.
export function cycleLength(bank) {
  return Array.isArray(bank) ? dealt(bank).days.length : 0;
}

// The day's set: its questions in order, the book it opens and closes on, and
// the line that introduces a dated question.
export function roundFor(bank, day) {
  if (!Array.isArray(bank)) return { questions: [], book: '', occasion: '' };
  const plan = dealt(bank);
  if (!plan.days.length) return { questions: [], book: '', occasion: '' };
  const index = ((dayNumber(day) % plan.days.length) + plan.days.length) % plan.days.length;
  const set = plan.days[index];
  const monthDay = String(day).slice(5);
  const dated = plan.dated.find(question => question.on === monthDay);
  let questions = set.lead ? [set.lead, ...set.middle, set.close] : set.middle.slice();
  // A dated question takes the first place; the book's second question still closes the day.
  if (dated) questions = [dated, ...questions.slice(1)];
  questions = questions.slice(0, PER_DAY);
  return {
    questions: questions.map(question => withShuffledOptions(question, day)),
    book: dated ? '' : set.book,
    occasion: dated ? dated.occasion || '' : ''
  };
}

export function questionsFor(bank, day, count = PER_DAY) {
  if (!Array.isArray(bank) || bank.length < count) return [];
  return roundFor(bank, day).questions.slice(0, count);
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

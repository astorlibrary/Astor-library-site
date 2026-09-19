// Reading plans.
//
// A book's record already divides it into acts or sections and says how long
// an unhurried first reading takes. Given a finishing date and the days of the
// week a reader has free, this turns those into dated sittings: which parts to
// read on which day, and roughly how long each will take. Nothing here touches
// the page, so the same code is tested in Node and run in the browser.

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Dates are handled as 'YYYY-MM-DD' strings and compared as UTC days, so a
// plan made in one time zone reads the same in another.
export function parseDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDay(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(day, count) {
  return formatDay(new Date(parseDay(day).getTime() + count * DAY_MS));
}

export function todayKey(now = new Date()) {
  return formatDay(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function readableDay(day) {
  const date = parseDay(day);
  if (!date) return String(day);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// Every date from start to finish, inclusive, that falls on a chosen weekday.
export function availableDays(start, finish, weekdays) {
  const from = parseDay(start);
  const to = parseDay(finish);
  if (!from || !to || to < from) return [];
  const allowed = new Set(weekdays && weekdays.length ? weekdays : [0, 1, 2, 3, 4, 5, 6]);
  const days = [];
  for (let time = from.getTime(); time <= to.getTime(); time += DAY_MS) {
    const date = new Date(time);
    if (allowed.has(date.getUTCDay())) days.push(formatDay(date));
  }
  return days;
}

// Splits the book's parts into sittings. Parts are never split; a sitting
// holds one or more whole parts, weighted by how many scenes or chapters
// each carries, and the sittings fall evenly across the free days.
export function buildPlan(book, { start, finish, weekdays } = {}) {
  const stages = (book.structure || []).map(stage => ({
    id: stage.id,
    label: stage.label,
    title: stage.title || '',
    weight: Math.max(1, (stage.scenes || []).length)
  }));
  if (!stages.length) return null;

  const from = start || todayKey();
  const to = finish || addDays(from, 13);
  const days = availableDays(from, to, weekdays);
  if (!days.length) return null;

  const totalWeight = stages.reduce((total, stage) => total + stage.weight, 0);
  const totalMinutes = Number(book.readingTime) > 0 ? Number(book.readingTime) : totalWeight * 15;

  const count = Math.max(1, Math.min(days.length, stages.length));
  const groups = [];
  let current = [];
  let carried = 0;
  for (const stage of stages) {
    const remainingGroups = count - groups.length;
    const remainingWeight = totalWeight - carried;
    // Close the sitting once it has its fair share, as long as enough parts
    // are left to fill the sittings still to come; and close it regardless
    // when the parts left are exactly enough for those sittings.
    if (current.length && remainingGroups > 1) {
      const target = remainingWeight / remainingGroups;
      const held = current.reduce((total, item) => total + item.weight, 0);
      const stagesLeft = stages.length - stages.indexOf(stage);
      const groupsAfterThis = remainingGroups - 1;
      if (stagesLeft === groupsAfterThis || (held + stage.weight / 2 >= target && stagesLeft >= groupsAfterThis)) {
        groups.push(current);
        current = [];
      }
    }
    current.push(stage);
    carried += stage.weight;
  }
  if (current.length) groups.push(current);

  const sittings = groups.map((group, index) => {
    const position = groups.length === 1 ? 0 : Math.round((index * (days.length - 1)) / (groups.length - 1));
    const weight = group.reduce((total, stage) => total + stage.weight, 0);
    return {
      date: days[position],
      stages: group.map(stage => stage.id),
      label: group.length === 1
        ? group[0].label
        : group[0].label + ' to ' + group[group.length - 1].label,
      minutes: Math.max(5, Math.round((totalMinutes * weight) / totalWeight / 5) * 5),
      done: false
    };
  });

  return {
    slug: book.slug,
    title: book.title,
    href: book.href,
    form: book.form,
    start: from,
    finish: to,
    weekdays: weekdays && weekdays.length ? [...weekdays].sort() : [0, 1, 2, 3, 4, 5, 6],
    created: todayKey(),
    sittings
  };
}

export function nextSitting(plan, today = todayKey()) {
  const pending = (plan.sittings || []).filter(sitting => !sitting.done);
  if (!pending.length) return null;
  return pending.find(sitting => sitting.date >= today) || pending[pending.length - 1];
}

export function planSummary(plan, today = todayKey()) {
  const total = plan.sittings.length;
  const done = plan.sittings.filter(sitting => sitting.done).length;
  const overdue = plan.sittings.filter(sitting => !sitting.done && sitting.date < today).length;
  return { total, done, overdue, finished: done === total };
}

// --- calendar file ---------------------------------------------------------
//
// One all-day event per sitting, in the plain iCalendar form every calendar
// application imports. Text is escaped and long lines folded as RFC 5545 asks.

function icsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

const encoder = new TextEncoder();

function fold(line) {
  const parts = [];
  let current = '';
  for (const character of line) {
    if (encoder.encode(current + character).length > 74) {
      parts.push(current);
      current = ' ' + character;
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts.join('\r\n');
}

export function toIcs(plan, { site = 'https://astorlibrary.com', stamp = new Date() } = {}) {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Astor Library//Reading plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + icsText('Reading ' + plan.title)
  ];
  plan.sittings.forEach((sitting, index) => {
    lines.push(
      'BEGIN:VEVENT',
      'UID:astor-plan-' + plan.slug + '-' + (index + 1) + '-' + plan.created.replace(/-/g, '') + '@astorlibrary.com',
      'DTSTAMP:' + dtstamp,
      'DTSTART;VALUE=DATE:' + sitting.date.replace(/-/g, ''),
      'DTEND;VALUE=DATE:' + addDays(sitting.date, 1).replace(/-/g, ''),
      'SUMMARY:' + icsText('Read ' + plan.title + ': ' + sitting.label),
      'DESCRIPTION:' + icsText('About ' + sitting.minutes + ' minutes. Sitting ' + (index + 1) + ' of ' + plan.sittings.length + '.\n' + site + plan.href),
      'URL:' + site + plan.href,
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

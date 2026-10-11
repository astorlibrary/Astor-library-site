// Which seasonal hero the homepage shows on a given day, and which one-line
// notes go with it. The windows live in home-calendar.json.
//
// rebuild-seasons.js calls this to choose the hero built into index.html,
// and inlines the same function into the homepage so a reader's browser
// moves on to the right hero when a date passes between deploys. It runs
// before any other script on the page, so it stays plain ES5.
//
// A window is one of
//   { "from": "MM-DD", "to": "MM-DD" }      fixed dates, may run over New Year
//   { "easter": 0, "span": [-7, 1] }        days relative to Easter Sunday
//   { "nth": [month, weekday, n] }          e.g. [11, 4, 4], the fourth Thursday of November
//   { "solar": "jun" }                      the solstice or equinox in mar, jun, sep or dec
// and the last three can carry a "span" of days either side.
//
// When windows overlap, the theme with the higher priority wins, then the
// shorter window: so Halloween (October) beats Autumn (September–November),
// and World Poetry Day beats Easter week when they fall together.
function astorHomeCalendar(date, calendar) {
  var DAY = 864e5;
  var year = date.getFullYear();
  var today = stamp(date);

  function stamp(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function shift(d, days) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days); }
  function monthDay(y, text) {
    var parts = text.split('-'), month = +parts[0], day = +parts[1];
    var last = new Date(y, month, 0).getDate();
    return new Date(y, month - 1, Math.min(day, last));
  }
  // Anonymous Gregorian computus.
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var n = h + l - 7 * m + 114;
    return new Date(y, Math.floor(n / 31) - 1, n % 31 + 1);
  }
  function nth(y, month, weekday, n) {
    var first = new Date(y, month - 1, 1);
    return new Date(y, month - 1, 1 + (weekday - first.getDay() + 7) % 7 + (n - 1) * 7);
  }
  // Meeus's mean solstices and equinoxes, good to within an hour or so
  // between 2000 and 3000; the reader's own clock decides the date.
  function solar(y, which) {
    var t = (y - 2000) / 1000, jde;
    if (which === 'mar') jde = 2451623.80984 + 365242.37404 * t + 0.05169 * t * t - 0.00411 * t * t * t - 0.00057 * t * t * t * t;
    else if (which === 'jun') jde = 2451716.56767 + 365241.62603 * t + 0.00325 * t * t + 0.00888 * t * t * t - 0.0003 * t * t * t * t;
    else if (which === 'sep') jde = 2451810.21715 + 365242.01767 * t - 0.11575 * t * t + 0.00337 * t * t * t + 0.00078 * t * t * t * t;
    else jde = 2451900.05952 + 365242.74049 * t - 0.06223 * t * t - 0.00823 * t * t * t + 0.00032 * t * t * t * t;
    var moment = new Date((jde - 2440587.5) * DAY);
    return new Date(moment.getFullYear(), moment.getMonth(), moment.getDate());
  }
  // The window's dates in the year before and this year, so that a window
  // running over New Year still contains early January.
  function spans(window) {
    var out = [], y, start, end, base, span;
    for (y = year - 1; y <= year; y++) {
      if (window.from) {
        start = monthDay(y, window.from);
        end = monthDay(y, window.to);
        if (end < start) end = monthDay(y + 1, window.to);
      } else {
        base = window.easter !== undefined ? easter(y)
          : window.nth ? nth(y, window.nth[0], window.nth[1], window.nth[2])
          : solar(y, window.solar);
        span = window.span || [0, 0];
        start = shift(base, span[0]);
        end = shift(base, span[1]);
      }
      out.push([stamp(start), stamp(end), Math.round((end - start) / DAY) + 1]);
    }
    return out;
  }
  // The shortest window of an entry that contains today, or 0.
  function fit(entry) {
    var best = 0, i, j, list;
    for (i = 0; i < entry.when.length; i++) {
      list = spans(entry.when[i]);
      for (j = 0; j < list.length; j++) {
        if (today >= list[j][0] && today <= list[j][1] && (!best || list[j][2] < best)) best = list[j][2];
      }
    }
    return best;
  }

  var theme = null, rank = null, i, length, priority;
  for (i = 0; i < calendar.themes.length; i++) {
    length = fit(calendar.themes[i]);
    if (!length) continue;
    priority = calendar.themes[i].priority || 0;
    if (!theme || priority > rank[0] || (priority === rank[0] && length < rank[1])) {
      theme = calendar.themes[i].slug;
      rank = [priority, length];
    }
  }

  var notes = [];
  for (i = 0; i < (calendar.notes || []).length; i++) {
    length = fit(calendar.notes[i]);
    if (length) notes.push({ note: calendar.notes[i], length: length, order: i });
  }
  // A note for the day itself comes before a note that runs all month.
  notes.sort(function (a, b) { return a.length - b.length || a.order - b.order; });
  var shown = [];
  for (i = 0; i < notes.length && i < 2; i++) {
    shown.push({
      text: notes[i].note.text.replace('{uk}', year - 71).replace('{us}', year - 96),
      href: notes[i].note.href || '',
      link: notes[i].note.link || ''
    });
  }
  return { theme: theme, notes: shown };
}

if (typeof module !== 'undefined') module.exports = { astorHomeCalendar: astorHomeCalendar };

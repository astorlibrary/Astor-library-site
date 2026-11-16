// Which close reading the homepage features on a given day.
//
// Below the seasonal hero the homepage prints one passage with two of its
// notes, taken from a close reading in the Passage Room. It changes every
// Monday. scripts/home-features.json holds the plan: date windows, each with
// the readings that suit that part of the year, and the order they come in.
//
// rebuild-home-feature.js calls this to choose the reading built into
// index.html, build-static.js calls it again on the day of the build, and
// the same function is inlined into the homepage so a reader's browser moves
// on when a Monday passes between deploys. It stays plain ES5 for that reason.
//
// A window is { "from": "MM-DD", "to": "MM-DD", "slugs": [...] } and may run
// over New Year. When windows overlap the shorter one wins, so Halloween
// (October) beats Autumn (September to November). Inside a window the
// readings take turns, a week each, counted from Monday 5 January 2026.
function astorHomeFeature(date, plan) {
  var DAY = 864e5;
  var year = date.getFullYear();
  var today = stamp(date);
  function stamp(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function monthDay(y, text) {
    var parts = text.split('-'), month = +parts[0], day = +parts[1];
    var last = new Date(y, month, 0).getDate();
    return new Date(y, month - 1, Math.min(day, last));
  }
  var week = Math.floor((Date.UTC(year, date.getMonth(), date.getDate()) - Date.UTC(2026, 0, 5)) / (7 * DAY));
  var best = null, bestLength = 0, i, y, start, end, length, list;
  for (i = 0; i < plan.windows.length; i++) {
    list = plan.windows[i].slugs || [];
    if (!list.length) continue;
    for (y = year - 1; y <= year; y++) {
      start = monthDay(y, plan.windows[i].from);
      end = monthDay(y, plan.windows[i].to);
      if (end < start) end = monthDay(y + 1, plan.windows[i].to);
      if (today < stamp(start) || today > stamp(end)) continue;
      length = Math.round((end - start) / DAY) + 1;
      if (!best || length < bestLength) { best = list; bestLength = length; }
    }
  }
  if (!best) best = plan.order || [];
  if (!best.length) return '';
  return best[((week % best.length) + best.length) % best.length];
}

if (typeof module !== 'undefined') module.exports = { astorHomeFeature: astorHomeFeature };

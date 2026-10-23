// Small helpers shared by the scripts that write study material into pages.
// (The tabbed "study toolkit" that used to be injected into book pages has
// been replaced by the study guides under /guides/, built by
// rebuild-guides.js.)

const DIFFICULTY_WORDS = {
  1: 'Straightforward',
  2: 'Steady going',
  3: 'Demanding in places',
  4: 'Difficult',
  5: 'Very difficult'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Years before the common era are stored as negative integers and shown the
// way a reader writes them.
function formatYear(year) {
  const value = Number(year);
  if (!Number.isFinite(value)) return String(year);
  return value < 0 ? Math.abs(value) + ' BC' : String(value);
}

function readingTimeLabel(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return minutes + ' minutes';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours + (hours === 1 ? ' hour' : ' hours') + (rest ? ' ' + rest + ' minutes' : '');
}

// "the Project Gutenberg text of…", but a named edition or translation
// ("The Brothers Karamazov, translated by…", "Samuel Butler’s prose translation…")
// carries its own article or needs none.
function sourceLabel(label) {
  return /^(Project Gutenberg|Standard Ebooks|Globe\/Moby) /.test(label) ? 'the ' + label : label;
}

// Related links carry a reason, not a title: the catalogue already knows what
// each page is called.
function fallbackTitle(href) {
  return href.replace(/^\/[a-z-]+\//, '').replace(/\/$/, '').replace(/-/g, ' ')
    .replace(/(^|\s)\S/g, character => character.toUpperCase());
}

module.exports = { escapeHtml, readingTimeLabel, formatYear, fallbackTitle, sourceLabel, DIFFICULTY_WORDS };

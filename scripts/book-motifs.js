// A colour and an ornament for each book.
//
// The colour is taken from the book's own cover by scripts/build-book-accents.js
// and read here from assets/book-accents.json. The ornament is chosen from the
// record: its genre first, then its form, then the period it belongs to. Two
// books that share a genre share an ornament, which is the point — the shelf
// should look like a shelf — but no two share a colour.

const fs = require('fs');
const path = require('path');

const accents = (() => {
  const file = path.join(__dirname, '..', 'assets', 'book-accents.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
})();

const HOUSE = '#6E1F2B';

// Each ornament is drawn in a 24x24 box, in line weights that match the site's
// rules rather than a heavier icon set.
const MOTIFS = {
  arch: '<path d="M12 2.5c4 0 6.4 3 6.4 6.8V21.5H5.6V9.3C5.6 5.5 8 2.5 12 2.5Z"/><path d="M12 6.4c1.9 0 3 1.5 3 3.4v11.7"/><path d="M9 21.5V9.8c0-1.9 1.1-3.4 3-3.4"/>',
  keyhole: '<circle cx="12" cy="9.5" r="4.2"/><path d="M9.9 13.2 8.4 21.5h7.2l-1.5-8.3"/>',
  meander: '<path d="M2.5 19.5h19M4.5 16.5v-9h15v9M7.5 16.5v-6h9v6M10.5 16.5v-3h3v3"/>',
  wave: '<path d="M2 9.5c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 5 0"/><path d="M2 15c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 5 0"/>',
  lozenge: '<path d="M12 2.5 21.5 12 12 21.5 2.5 12Z"/><path d="M12 7.5 16.5 12 12 16.5 7.5 12Z"/>',
  crown: '<path d="M3 18.5h18M3.5 18.5 2.5 7l5 4L12 4l4.5 7 5-4-1 11.5"/>',
  star: '<path d="M12 2.5 14.6 9h6.9l-5.6 4.2 2.1 7-6-4.4-6 4.4 2.1-7L2.5 9h6.9Z"/>',
  quatrefoil: '<path d="M12 3.5a3.4 3.4 0 0 1 3.4 3.4A3.4 3.4 0 0 1 20.5 12a3.4 3.4 0 0 1-5.1 5.1A3.4 3.4 0 0 1 12 20.5a3.4 3.4 0 0 1-3.4-3.4A3.4 3.4 0 0 1 3.5 12a3.4 3.4 0 0 1 5.1-5.1A3.4 3.4 0 0 1 12 3.5Z"/>',
  laurel: '<path d="M12 21.5V6"/><path d="M12 9.5c-3.4 0-5.2-1.8-5.2-5.2 3.4 0 5.2 1.8 5.2 5.2Z"/><path d="M12 9.5c3.4 0 5.2-1.8 5.2-5.2-3.4 0-5.2 1.8-5.2 5.2Z"/><path d="M12 15.5c-3 0-4.6-1.6-4.6-4.6 3 0 4.6 1.6 4.6 4.6Z"/><path d="M12 15.5c3 0 4.6-1.6 4.6-4.6-3 0-4.6 1.6-4.6 4.6Z"/>',
  column: '<path d="M4.5 4.5h15M6 4.5v15M18 4.5v15M4 19.5h16"/><path d="M9.5 4.5v15M14.5 4.5v15"/>',
  fleuron: '<path d="M12 21.5c0-5 3-7 6.5-7.6C18 17.4 15.4 20 12 21.5Z"/><path d="M12 21.5c0-5-3-7-6.5-7.6C6 17.4 8.6 20 12 21.5Z"/><path d="M12 14.5c0-5.5 2.2-8.6 5.5-9.9C17 9.4 15 13 12 14.5Z"/><path d="M12 14.5C12 9 9.8 5.9 6.5 4.6 7 9.4 9 13 12 14.5Z"/>'
};

const BY_GENRE = [
  [/gothic|ghost|sensation|scientific romance/i, 'arch'],
  [/detective|mystery/i, 'keyhole'],
  [/epic/i, 'meander'],
  [/sea|adventure|naturalist/i, 'wave'],
  [/comedy|comic|satire|picaresque|manners/i, 'lozenge'],
  [/history/i, 'crown'],
  [/children|fable|boyhood|fantasy/i, 'star'],
  [/romance|domestic|bildungsroman/i, 'quatrefoil'],
  [/ballad|poem/i, 'laurel'],
  [/treatise|dialogue|slave narrative|political/i, 'column']
];

const BY_FORM = { poem: 'laurel', 'non-fiction': 'column', memoir: 'column', 'story collection': 'quatrefoil' };
const BY_PERIOD = { 'Ancient & Epic': 'meander', Shakespeare: 'fleuron' };

function motifName(book) {
  for (const [pattern, name] of BY_GENRE) if (pattern.test(book.genre || '')) return name;
  if (BY_FORM[book.form]) return BY_FORM[book.form];
  if (BY_PERIOD[book.period]) return BY_PERIOD[book.period];
  return 'fleuron';
}

function accentFor(slug) {
  return accents[slug] || HOUSE;
}

// `size` is the drawn size in pixels; the stroke is scaled to match so a small
// ornament does not turn into a blot.
function motifSvg(book, size = 26, extraClass = '') {
  const name = motifName(book);
  return '<svg class="astor-motif' + (extraClass ? ' ' + extraClass : '') + '" data-motif="' + name +
    '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    MOTIFS[name] + '</svg>';
}

module.exports = { accentFor, motifName, motifSvg, MOTIFS };

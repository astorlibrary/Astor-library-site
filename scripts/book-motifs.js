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
  lightning: '<path d="M13.6 2.5 6.5 13.4h4.3l-1.4 8.1 7.1-11.2h-4.3Z"/>',
  bat: '<path d="M12 8.6c1 0 1.7.8 1.7 1.9 0 1.5 1.2 2.6 2.4 2.6.6 0 1.1-.2 1.5-.6.3 1.6 1.4 2.9 2.9 3.4-2.3.3-4.3 1.6-5.4 3.5-.6-1.4-1.8-2.3-3.1-2.3s-2.5.9-3.1 2.3c-1.1-1.9-3.1-3.2-5.4-3.5 1.5-.5 2.6-1.8 2.9-3.4.4.4.9.6 1.5.6 1.2 0 2.4-1.1 2.4-2.6 0-1.1.7-1.9 1.7-1.9Z"/><path d="M10.4 7.2 12 4.5l1.6 2.7"/>',
  whale: '<path d="M2.5 15.5c3.6 0 5.4-1.3 6.8-3.1 1.6-2.1 3.4-3.9 6.4-3.9 3 0 5.8 2.3 5.8 5.6 0 2.4-1.6 4.4-4.2 4.4H8.6c-3.4 0-6.1-1.2-6.1-3Z"/><path d="M15.5 8.5c.4-2.4 2-4 4.2-4.4-.7 1.6-.6 3.2.3 4.6"/><circle cx="16.6" cy="13.2" r=".7" fill="currentColor"/>',
  candle: '<path d="M9.5 9.5h5v11h-5Z"/><path d="M7.5 20.5h9"/><path d="M12 9.5c0-2 1.8-2.6 1.8-4.4 0-1-.7-2.1-1.8-2.6-.3 1.3-1.8 1.9-1.8 3.4 0 1.7 1.8 2 1.8 3.6Z"/>',
  dagger: '<path d="M12 2.5 13.6 9v8.5h-3.2V9Z"/><path d="M8 17.5h8"/><path d="M12 17.5v4"/>',
  skull: '<path d="M12 2.8c4.2 0 7 2.9 7 6.9 0 2.5-1 4-2.2 5v3.3c0 1-.8 1.7-1.8 1.7H9c-1 0-1.8-.7-1.8-1.7v-3.3C6 13.7 5 12.2 5 9.7c0-4 2.8-6.9 7-6.9Z"/><circle cx="9.4" cy="10.4" r="1.5"/><circle cx="14.6" cy="10.4" r="1.5"/><path d="M12 13.6v2"/>',
  vial: '<path d="M9.5 2.8h5"/><path d="M10.5 2.8v6.1L7.8 17c-.6 1.9.6 3.7 2.4 3.7h3.6c1.8 0 3-1.8 2.4-3.7l-2.7-8.1V2.8"/><path d="M8.6 14h6.8"/>',
  flask: '<path d="M10 2.8h4"/><path d="M10.8 2.8v5.6l-4 8.4c-.8 1.7.4 3.5 2.2 3.5h6c1.8 0 3-1.8 2.2-3.5l-4-8.4V2.8"/><path d="M7.6 15.5h8.8"/>',
  tripod: '<path d="M12 3.5c2.2 0 4 1.7 4 3.9 0 2.1-1.8 3.8-4 3.8s-4-1.7-4-3.8c0-2.2 1.8-3.9 4-3.9Z"/><path d="M9.4 10.6 4.5 20.5M14.6 10.6l4.9 9.9M12 11.2v9.3"/>',
  pocketwatch: '<circle cx="12" cy="13.5" r="7"/><path d="M12 9.8v3.7l2.6 1.8"/><path d="M9.8 3.5h4.4M12 3.5v3"/>',
  ship: '<path d="M4 16.5h16l-2.4 4H6.4Z"/><path d="M12 16.5v-13"/><path d="M12 6 18 9l-6 2.6Z"/><path d="M12 6 6.5 8.6 12 11"/>',
  shield: '<path d="M12 2.8 20 5.5v6.1c0 4.7-3.3 8.1-8 9.6-4.7-1.5-8-4.9-8-9.6V5.5Z"/><path d="M12 7v9M8 11.5h8"/>',
  rowboat: '<path d="M3 15.5c2.5 3 5.6 4.5 9 4.5s6.5-1.5 9-4.5"/><path d="M5.5 15.8 4 11.5h16l-1.5 4.3"/><path d="M8 11.5 15.5 5M16 11.5 8.5 5"/>',
  train: '<rect x="5" y="4.5" width="14" height="11" rx="2"/><path d="M5 10.5h14"/><circle cx="8.5" cy="18" r="1.6"/><circle cx="15.5" cy="18" r="1.6"/><path d="M7 20.5h10"/>',
  island: '<path d="M2.5 18.5c2.4 0 2.4 1.6 4.8 1.6s2.4-1.6 4.7-1.6c2.4 0 2.4 1.6 4.8 1.6s2.4-1.6 4.7-1.6"/><path d="M6.5 16.5c1.4-3.6 3.3-5.4 5.5-5.4s4.1 1.8 5.5 5.4"/><path d="M12 11.1V6.5"/><path d="M12 6.5c1.8-1.8 3.4-2 4.6-.8-1.4 1.4-2.9 1.7-4.6.8Z"/>',
  deco: '<path d="M12 21V3"/><path d="M12 3 5 21M12 3l7 18"/><path d="M7.4 14.5h9.2"/>',
  anvil: '<path d="M4 8.5h13c0 2.4-1.2 3.8-3 4.4v1.6h2.5l-1.5 4H9l-1.5-4H10v-1.6C7.6 12.3 6 11 4 11Z"/>',
  moor: '<path d="M2.5 19.5h19"/><path d="M2.5 19.5c3-6 5.4-9 7.3-9s2.7 2.4 4.4 2.4c1.4 0 2.6-1.6 3.8-1.6 1.5 0 2.7 2.7 3.5 8.2"/><path d="M15.5 6.5v3M14 8l1.5-1.5L17 8"/>',
  flame: '<path d="M12 21.5c3.5 0 5.8-2.3 5.8-5.4 0-4.4-4.6-5.8-3.6-13.6-3 1.8-6.6 5.6-6.6 9.9 0 1.5.6 2.8 1.6 3.6-.2-2.4.8-4 2.4-5-.6 3.4 1.7 4 1.7 6.1 0 1.2-.7 2.2-1.9 2.4Z"/>',
  wheat: '<path d="M12 21.5V8"/><path d="M12 8c-2.4-.6-3.6-2.2-3.6-4.8 2.4.6 3.6 2.2 3.6 4.8Z"/><path d="M12 8c2.4-.6 3.6-2.2 3.6-4.8-2.4.6-3.6 2.2-3.6 4.8Z"/><path d="M12 13.5c-2.2-.6-3.3-2-3.3-4.4 2.2.6 3.3 2 3.3 4.4Z"/><path d="M12 13.5c2.2-.6 3.3-2 3.3-4.4-2.2.6-3.3 2-3.3 4.4Z"/>',
  tophat: '<path d="M8 3.5h8v11H8Z"/><path d="M3.5 14.5h17"/><path d="M6 14.5c0 3 2.7 5 6 5s6-2 6-5"/>',
  paw: '<ellipse cx="12" cy="16.2" rx="4.6" ry="3.8"/><ellipse cx="6.4" cy="11.4" rx="1.9" ry="2.4"/><ellipse cx="17.6" cy="11.4" rx="1.9" ry="2.4"/><ellipse cx="9.6" cy="7.4" rx="1.8" ry="2.3"/><ellipse cx="14.4" cy="7.4" rx="1.8" ry="2.3"/>',
  handbag: '<path d="M4.5 8.5h15l-1.2 12H5.7Z"/><path d="M8.6 8.5V6.2c0-1.9 1.5-3.4 3.4-3.4s3.4 1.5 3.4 3.4v2.3"/>',
  frame: '<rect x="4.5" y="3.5" width="15" height="17" rx="1"/><rect x="7.5" y="6.5" width="9" height="11" rx="1"/><path d="M9.8 14.5c.9-2.4 1.8-3.6 2.7-3.6s1.5 1 1.9 3"/>',
  diamond: '<path d="M7 3.5h10l4 6-9 11-9-11Z"/><path d="M3 9.5h18M7 3.5l-2.6 6L12 20.5l7.6-11-2.6-6M9.8 9.5 12 3.5l2.2 6-2.2 11"/>',
  web: '<path d="M12 3.5v17M3.5 12h17M5.8 5.8l12.4 12.4M18.2 5.8 5.8 18.2"/><path d="M12 8.2c2 0 3.8 1.7 3.8 3.8S14 15.8 12 15.8 8.2 14.1 8.2 12 10 8.2 12 8.2Z"/><path d="M12 5c3.8 0 7 3.1 7 7s-3.2 7-7 7-7-3.1-7-7 3.2-7 7-7Z"/>',
  willow: '<path d="M12 21.5V9"/><path d="M12 9c-4 0-6.5-2.2-6.5-6.2C9.5 2.8 12 5 12 9Z"/><path d="M12 9c4 0 6.5-2.2 6.5-6.2C14.5 2.8 12 5 12 9Z"/><path d="M8 13.5c-1.6.9-2.6 2.4-2.6 4.4M16 13.5c1.6.9 2.6 2.4 2.6 4.4"/>',
  snowflake: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8"/><path d="M12 6.4 9.6 4.4M12 6.4l2.4-2M12 17.6l-2.4 2M12 17.6l2.4 2"/>',
  moon: '<path d="M16.5 3.6c-4 1-6.9 4.4-6.9 8.4 0 4.1 3 7.5 7 8.4-1.2.6-2.6 1-4 1-4.8 0-8.6-3.8-8.6-8.5S7.8 4.5 12.6 4.5c1.4 0 2.7.4 3.9 1Z"/><path d="M18 8.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"/>',
  scales: '<path d="M12 3.5v17M7 20.5h10"/><path d="M4.5 7.5h15"/><path d="M4.5 7.5 2 13.5h5ZM19.5 7.5 17 13.5h5Z"/><path d="M12 3.5 4.5 7.5M12 3.5l7.5 4"/>',
  letterA: '<path d="m6.5 20.5 5.5-17 5.5 17"/><path d="M8.8 13.5h6.4"/>',
  envelope: '<rect x="3" y="5.5" width="18" height="13" rx="1"/><path d="m3.6 6.4 8.4 6.6 8.4-6.6"/>',
  raft: '<path d="M3 17.5h18"/><path d="M4.5 14.5h15l1.5 3H3Z"/><path d="M6.5 14.5v-3M9.5 14.5v-3M12.5 14.5v-3M15.5 14.5v-3M18 14.5v-3"/><path d="M12 11.5V4l4 2.5"/>',
  clockface: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5V12l3.5 2.4"/><path d="M12 3.5v1.5M20.5 12H19M12 20.5V19M3.5 12H5"/>',
  apple: '<path d="M12 7.6c2-2 4.4-2 6 .2 1.6 2.3 1 6.5-1.2 9.6-1.3 1.8-2.6 2.6-3.6 2.6-.6 0-1-.2-1.2-.3-.2.1-.6.3-1.2.3-1 0-2.3-.8-3.6-2.6C5 14.3 4.4 10.1 6 7.8c1.6-2.2 4-2.2 6-.2Z"/><path d="M12 7.6V4.5M12 4.5c1.8-1.2 3.2-1 4 .4-1.4 1-2.8 1-4-.4Z"/>',
  chain: '<path d="M9.4 14.6 6.6 17.4a3.4 3.4 0 0 1-4.8-4.8l2.8-2.8"/><path d="M14.6 9.4l2.8-2.8a3.4 3.4 0 0 1 4.8 4.8l-2.8 2.8"/><path d="M8.8 15.2l6.4-6.4"/>',
  drum: '<rect x="3.5" y="8.5" width="17" height="8" rx="1.6"/><path d="m3.5 10 17 5M20.5 10l-17 5"/><path d="M6.5 6 8 8.5M17.5 6 16 8.5"/>',
  hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M8 3.5v3.1c0 2 4 3.9 4 5.4s-4 3.4-4 5.4v3.1M16 3.5v3.1c0 2-4 3.9-4 5.4s4 3.4 4 5.4v3.1"/>',
  gable: '<path d="M3.5 12 12 4.5l8.5 7.5"/><path d="M5.5 10.8v9.7h13v-9.7"/><path d="M10 20.5v-5.5h4v5.5"/>',
  albatross: '<path d="M2.5 13.5c3.4-4.4 6.2-6.6 8.4-6.6 1.4 0 2.4.7 3 2.1.6-1.4 1.6-2.1 3-2.1 2.2 0 5 2.2 8.4 6.6"/><path d="M13.9 9c-.6 3.6-1.2 6.4-1.9 8.4-.7-2-1.3-4.8-1.9-8.4"/>',
  beetle: '<ellipse cx="12" cy="13.5" rx="4.6" ry="6.4"/><path d="M12 7.1V20M7.4 9.5 3.5 7M16.6 9.5 20.5 7M7 13.5H3M17 13.5h4M7.6 17.6 4.2 20.4M16.4 17.6l3.4 2.8"/><circle cx="12" cy="5.2" r="2"/>',
  quill: '<path d="M4.5 20.5c0-7 5-13 15-15.5-1 9-5.5 14-12 14.5"/><path d="M4.5 20.5 9 16"/><path d="M11 14.5c2.4-.4 4.2-1.6 5.4-3.6"/>',
  holly: '<path d="M12 8.5c0-3 2-5 6-5.5-.4 3.6-2.4 5.5-6 5.5Z"/><path d="M12 8.5c0-3-2-5-6-5.5.4 3.6 2.4 5.5 6 5.5Z"/><path d="M12 8.5c2.6 0 4.4 1.4 5.4 4-3.4.6-5.4-.6-5.4-4Z"/><path d="M12 8.5c-2.6 0-4.4 1.4-5.4 4 3.4.6 5.4-.6 5.4-4Z"/><circle cx="10.4" cy="17.6" r="1.7"/><circle cx="13.8" cy="19" r="1.7"/>',
  fleuron: '<path d="M12 21.5c0-5 3-7 6.5-7.6C18 17.4 15.4 20 12 21.5Z"/><path d="M12 21.5c0-5-3-7-6.5-7.6C6 17.4 8.6 20 12 21.5Z"/><path d="M12 14.5c0-5.5 2.2-8.6 5.5-9.9C17 9.4 15 13 12 14.5Z"/><path d="M12 14.5C12 9 9.8 5.9 6.5 4.6 7 9.4 9 13 12 14.5Z"/>'
};

// Where a book has a symbol of its own, it gets one. Genre is the fallback,
// not the first answer: Frankenstein is a lightning bolt before it is a Gothic
// arch, and Moby-Dick a whale before it is a sea narrative.
const BOOK_MOTIFS = {
  frankenstein: 'lightning',
  dracula: 'bat',
  'moby-dick': 'whale',
  'a-christmas-carol': 'candle',
  macbeth: 'dagger',
  hamlet: 'skull',
  'romeo-and-juliet': 'vial',
  'jekyll-and-hyde': 'flask',
  'war-of-the-worlds': 'tripod',
  'alices-adventures-in-wonderland': 'pocketwatch',
  'the-odyssey': 'ship',
  'the-iliad': 'shield',
  'three-men-in-a-boat': 'rowboat',
  'the-railway-children': 'train',
  utopia: 'island',
  'the-great-gatsby': 'deco',
  'great-expectations': 'anvil',
  'wuthering-heights': 'moor',
  'jane-eyre': 'flame',
  'tess-of-the-durbervilles': 'wheat',
  'the-diary-of-a-nobody': 'tophat',
  'white-fang': 'paw',
  'call-of-the-wild': 'paw',
  'the-importance-of-being-earnest': 'handbag',
  'dorian-gray': 'frame',
  'the-moonstone': 'diamond',
  'the-turn-of-the-screw': 'web',
  'the-wind-in-the-willows': 'willow',
  'the-winters-tale': 'snowflake',
  'a-midsummer-nights-dream': 'moon',
  'measure-for-measure': 'scales',
  'the-scarlet-letter': 'letterA',
  'the-tempest': 'wave',
  'robinson-crusoe': 'island',
  'gullivers-travels': 'ship',
  'the-woman-in-white': 'envelope',
  'adventures-of-huckleberry-finn': 'raft',
  'the-adventures-of-tom-sawyer': 'raft',
  'mrs-dalloway': 'clockface',
  'paradise-lost': 'apple',
  'the-awakening': 'wave',
  'uncle-toms-cabin': 'chain',
  'narrative-of-the-life-of-frederick-douglass': 'chain',
  'red-badge-of-courage': 'drum',
  'ethan-frome': 'snowflake',
  'the-prince': 'column',
  'doctor-faustus': 'hourglass',
  'the-duchess-of-malfi': 'arch',
  'anne-of-green-gables': 'gable',
  'sign-of-four': 'keyhole',
  'adventures-of-sherlock-holmes': 'keyhole',
  'the-rime-of-the-ancient-mariner': 'albatross',
  'the-metamorphosis': 'beetle'
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
  if (BOOK_MOTIFS[book.slug] && MOTIFS[BOOK_MOTIFS[book.slug]]) return BOOK_MOTIFS[book.slug];
  for (const [pattern, name] of BY_GENRE) if (pattern.test(book.genre || '')) return name;
  if (BY_FORM[book.form]) return BY_FORM[book.form];
  if (BY_PERIOD[book.period]) return BY_PERIOD[book.period];
  return 'fleuron';
}

// A page with no study record still has a title and a slug to go on.
const BY_TITLE = [
  [/christmas|carol|chimes|cricket on the hearth|haunted man/i, 'holly'],
  [/ghost|haunt|wendigo|carnacki|borderland|willows|turn of the screw/i, 'web'],
  [/halloween|sleepy hollow|bonfire/i, 'candle'],
  [/sonnet|poems|poetry|lyrical ballads|selected verse|michael robartes/i, 'quill'],
  [/\b(henry|richard|edward)\b\s*(i{1,3}|iv|vi{1,3}|viii|part|the)/i, 'crown'],
  [/king john|cromwell|sir thomas more|locrine|arden of faversham|puritan|london prodigal|yorkshire tragedy/i, 'crown'],
  [/odyssey|iliad|aeneid|voyage|sea|island|crusoe|moby|whale|open boat/i, 'ship'],
  [/sherlock|sign of four|moonstone|woman in white|detective/i, 'keyhole'],
  [/utopia|prince|leviathan|charles i|seven pillars|room of one/i, 'column'],
  [/alice|wonderland|railway|green gables|blue castle|selfish giant|wind in the willows|tom sawyer/i, 'star'],
  [/dream|tempest|winter|midsummer/i, 'moon'],
  [/war|badge|worlds|kinsmen|troilus|coriolanus|lucrece/i, 'shield'],
  [/love|romeo|much ado|twelfth|as you like|shrew|errors|merry wives|gentlemen|labour/i, 'quatrefoil']
];

// Everything a page needs to wear its book's colours, record or no record.
function identityFor(slug, title) {
  if (BOOK_MOTIFS[slug] && MOTIFS[BOOK_MOTIFS[slug]]) return { accent: accentFor(slug), motif: BOOK_MOTIFS[slug] };
  const text = ((title || '') + ' ' + slug.replace(/-/g, ' ')).trim();
  for (const [pattern, name] of BY_TITLE) if (pattern.test(text)) return { accent: accentFor(slug), motif: name };
  return { accent: accentFor(slug), motif: 'fleuron' };
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

// The same drawing, addressed by name rather than by record.
function motifSvgByName(name, size = 26, extraClass = '') {
  const shape = MOTIFS[name] || MOTIFS.fleuron;
  return '<svg class="astor-motif' + (extraClass ? ' ' + extraClass : '') + '" data-motif="' + name +
    '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    shape + '</svg>';
}

module.exports = { accentFor, motifName, motifSvg, motifSvgByName, identityFor, MOTIFS };

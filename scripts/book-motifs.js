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
  quatrefoil: '<path d="M8.1 8.1A4 4 0 1 1 15.9 8.1 4 4 0 1 1 15.9 15.9 4 4 0 1 1 8.1 15.9 4 4 0 1 1 8.1 8.1Z"/><circle cx="12" cy="12" r="1.5"/>',
  laurel: '<path d="M12 21.5V6"/><path d="M12 9.5c-3.4 0-5.2-1.8-5.2-5.2 3.4 0 5.2 1.8 5.2 5.2Z"/><path d="M12 9.5c3.4 0 5.2-1.8 5.2-5.2-3.4 0-5.2 1.8-5.2 5.2Z"/><path d="M12 15.5c-3 0-4.6-1.6-4.6-4.6 3 0 4.6 1.6 4.6 4.6Z"/><path d="M12 15.5c3 0 4.6-1.6 4.6-4.6-3 0-4.6 1.6-4.6 4.6Z"/>',
  column: '<path d="M4.5 4.5h15M6 4.5v15M18 4.5v15M4 19.5h16"/><path d="M9.5 4.5v15M14.5 4.5v15"/>',
  lightning: '<path d="M13.6 2.5 6.5 13.4h4.3l-1.4 8.1 7.1-11.2h-4.3Z"/>',
  bat: '<path d="M12 9c1 0 1.9.9 1.9 2.1 0 1.6-1.9 4.1-1.9 4.1s-1.9-2.5-1.9-4.1C10.1 9.9 11 9 12 9Z"/><path d="M10.4 10.4C8.5 8.1 5.9 7.1 2.5 7.5c1.3 1.5 1.7 3 1.2 4.6 1.6-.7 2.9-.4 4.1.8-.3 1.4.1 2.5 1.3 3.5.8-2 1.6-3.3 2.4-4"/><path d="M13.6 10.4c1.9-2.3 4.5-3.3 7.9-2.9-1.3 1.5-1.7 3-1.2 4.6-1.6-.7-2.9-.4-4.1.8.3 1.4-.1 2.5-1.3 3.5-.8-2-1.6-3.3-2.4-4"/>',
  whale: '<path d="M2.8 13.4c2.5-3.1 5.6-4.7 9.2-4.7 2.9 0 5.2 1.1 6.8 3.2-1.6 2.1-3.9 3.2-6.8 3.2-3.6 0-6.7-.5-9.2-1.7Z"/><path d="M18.8 11.9c.9-1.1 1.9-1.8 3-2-.5 1.3-.6 2.6 0 3.9-1.1-.2-2.1-.8-3-1.9Z"/><path d="M6.4 8.3c.3-1.3 1.2-2.2 2.5-2.6"/><circle cx="7" cy="11.4" r=".5" fill="currentColor"/>',
  candle: '<path d="M9.4 10.8c0-.7.6-1.1 1.3-1.1h2.6c.7 0 1.3.4 1.3 1.1v9.4H9.4Z"/><path d="M7.6 20.2h8.8"/><path d="M9.4 13.4c.9.5 1.7.5 2.6 0"/><path d="M12 9.7V8.4"/><path d="M12 8.4c0-1.9 1.7-2.5 1.7-4.2 0-1-.7-2-1.7-2.4-.3 1.2-1.7 1.8-1.7 3.2 0 1.6 1.7 1.9 1.7 3.4Z"/>',
  dagger: '<path d="M12 2.5 13.6 9v8.5h-3.2V9Z"/><path d="M8 17.5h8"/><path d="M12 17.5v4"/>',
  skull: '<path d="M12 2.8c4.2 0 7 2.9 7 6.9 0 2.5-1 4-2.2 5v3.3c0 1-.8 1.7-1.8 1.7H9c-1 0-1.8-.7-1.8-1.7v-3.3C6 13.7 5 12.2 5 9.7c0-4 2.8-6.9 7-6.9Z"/><circle cx="9.4" cy="10.4" r="1.5"/><circle cx="14.6" cy="10.4" r="1.5"/><path d="M12 13.6v2"/>',
  vial: '<path d="M9.5 2.8h5"/><path d="M10.5 2.8v6.1L7.8 17c-.6 1.9.6 3.7 2.4 3.7h3.6c1.8 0 3-1.8 2.4-3.7l-2.7-8.1V2.8"/><path d="M8.6 14h6.8"/>',
  flask: '<path d="M10 2.8h4"/><path d="M10.8 2.8v5.6l-4 8.4c-.8 1.7.4 3.5 2.2 3.5h6c1.8 0 3-1.8 2.2-3.5l-4-8.4V2.8"/><path d="M7.6 15.5h8.8"/>',
  tripod: '<path d="M5.6 7.4c0-1.7 2.9-3 6.4-3s6.4 1.3 6.4 3-2.9 3-6.4 3-6.4-1.3-6.4-3Z"/><path d="M8.6 10.1c.6 1.2 1.7 1.9 3.4 1.9s2.8-.7 3.4-1.9"/><path d="M12 12v1.6"/><path d="M12 13.6 7.4 16.2 4.2 20.9M12 13.6l4.6 2.6 3.2 4.7M12 13.6v3.1l-.3 4.2"/>',
  pocketwatch: '<circle cx="12" cy="13.5" r="7"/><path d="M12 9.8v3.7l2.6 1.8"/><path d="M9.8 3.5h4.4M12 3.5v3"/>',
  ship: '<path d="M3.5 15.8h17l-2.6 3.9H6.1Z"/><path d="M12 3.4v12.4"/><path d="M12 5c3.1 2.5 4.8 5.7 5.1 9.1H12"/><path d="M12 6.8c-2.4 2.2-3.8 4.6-4.1 7.3H12"/><path d="M12 3.4l2.4 1-2.4 1"/>',
  shield: '<path d="M12 2.8 20 5.5v6.1c0 4.7-3.3 8.1-8 9.6-4.7-1.5-8-4.9-8-9.6V5.5Z"/><path d="M12 7v9M8 11.5h8"/>',
  rowboat: '<path d="M3.6 14.8h16.8c-.8 2.7-2.8 4.1-5.9 4.1H9.5c-3.1 0-5.1-1.4-5.9-4.1Z"/><path d="M7.4 14.8 2.9 9.3M16.6 14.8l4.5-5.5"/><path d="M12 14.8v-3.4"/>',
  train: '<rect x="5" y="4.5" width="14" height="11" rx="2"/><path d="M5 10.5h14"/><circle cx="8.5" cy="18" r="1.6"/><circle cx="15.5" cy="18" r="1.6"/><path d="M7 20.5h10"/>',
  island: '<path d="M2.6 19c2.9-1.6 6.1-2.4 9.8-2.4s6.9.8 9.8 2.4"/><path d="M12.6 16.8c-.3-4 .5-6.7 2.4-8.2"/><path d="M15 8.6c-2.2-1.1-4.2-.6-6.1 1.4 2.1-.2 3.7.3 4.7 1.6"/><path d="M15 8.6c2.4-.4 4.1.8 5.2 3.4-2-1-3.6-1-4.8-.2"/><path d="M15 8.6c.3-2.3 1.7-3.6 4.1-3.9-1.1 1.9-1.5 3.4-1 4.7"/>',
  deco: '<path d="M3.6 20.4h16.8"/><path d="M12 20.4V4.6"/><path d="M12 9.2c2.6 0 4.7 1.9 5.2 4.5M12 9.2c-2.6 0-4.7 1.9-5.2 4.5"/><path d="M12 4.6c4.1 0 7.6 2.9 8.4 6.9M12 4.6c-4.1 0-7.6 2.9-8.4 6.9"/>',
  anvil: '<path d="M4 8.5h13c0 2.4-1.2 3.8-3 4.4v1.6h2.5l-1.5 4H9l-1.5-4H10v-1.6C7.6 12.3 6 11 4 11Z"/>',
  moor: '<path d="M2.4 19.6c3.6-1.6 6.8-2.4 9.8-2.4s6.2.8 9.8 2.4"/><path d="M7.8 17.4c.4-4.2 1.1-7.1 2.2-8.8"/><path d="M10 8.6c2.9.2 5 1.3 6.2 3.2M9.3 11.2c2.7.1 4.6 1 5.7 2.7M8.7 13.8c2.3.1 3.9.9 4.8 2.3"/>',
  flame: '<path d="M12 21.5c3.5 0 5.8-2.3 5.8-5.4 0-4.4-4.6-5.8-3.6-13.6-3 1.8-6.6 5.6-6.6 9.9 0 1.5.6 2.8 1.6 3.6-.2-2.4.8-4 2.4-5-.6 3.4 1.7 4 1.7 6.1 0 1.2-.7 2.2-1.9 2.4Z"/>',
  wheat: '<path d="M12 21.5V8"/><path d="M12 8c-2.4-.6-3.6-2.2-3.6-4.8 2.4.6 3.6 2.2 3.6 4.8Z"/><path d="M12 8c2.4-.6 3.6-2.2 3.6-4.8-2.4.6-3.6 2.2-3.6 4.8Z"/><path d="M12 13.5c-2.2-.6-3.3-2-3.3-4.4 2.2.6 3.3 2 3.3 4.4Z"/><path d="M12 13.5c2.2-.6 3.3-2 3.3-4.4-2.2.6-3.3 2-3.3 4.4Z"/>',
  tophat: '<path d="M8 3.5h8v11H8Z"/><path d="M3.5 14.5h17"/><path d="M6 14.5c0 3 2.7 5 6 5s6-2 6-5"/>',
  paw: '<ellipse cx="12" cy="16.2" rx="4.6" ry="3.8"/><ellipse cx="6.4" cy="11.4" rx="1.9" ry="2.4"/><ellipse cx="17.6" cy="11.4" rx="1.9" ry="2.4"/><ellipse cx="9.6" cy="7.4" rx="1.8" ry="2.3"/><ellipse cx="14.4" cy="7.4" rx="1.8" ry="2.3"/>',
  handbag: '<path d="M4.5 8.5h15l-1.2 12H5.7Z"/><path d="M8.6 8.5V6.2c0-1.9 1.5-3.4 3.4-3.4s3.4 1.5 3.4 3.4v2.3"/>',
  frame: '<rect x="4.5" y="3.5" width="15" height="17" rx="1"/><rect x="7.5" y="6.5" width="9" height="11" rx="1"/><path d="M9.8 14.5c.9-2.4 1.8-3.6 2.7-3.6s1.5 1 1.9 3"/>',
  diamond: '<path d="M7 3.5h10l4 6-9 11-9-11Z"/><path d="M3 9.5h18M7 3.5l-2.6 6L12 20.5l7.6-11-2.6-6M9.8 9.5 12 3.5l2.2 6-2.2 11"/>',
  web: '<path d="M12 3.5v17M3.5 12h17M5.8 5.8l12.4 12.4M18.2 5.8 5.8 18.2"/><path d="M12 8.2c2 0 3.8 1.7 3.8 3.8S14 15.8 12 15.8 8.2 14.1 8.2 12 10 8.2 12 8.2Z"/><path d="M12 5c3.8 0 7 3.1 7 7s-3.2 7-7 7-7-3.1-7-7 3.2-7 7-7Z"/>',
  willow: '<path d="M12 21v-5.4"/><path d="M5.8 10.2c0-3.5 2.8-6.2 6.2-6.2s6.2 2.7 6.2 6.2c0 1.5-.5 2.8-1.4 3.9H7.2c-.9-1.1-1.4-2.4-1.4-3.9Z"/><path d="M7.8 14.1v4.6M10.3 14.4v3.6M13.7 14.4v3.6M16.2 14.1v4.6"/>',
  snowflake: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8"/><path d="M12 6.4 9.6 4.4M12 6.4l2.4-2M12 17.6l-2.4 2M12 17.6l2.4 2"/>',
  moon: '<path d="M16.5 3.6c-4 1-6.9 4.4-6.9 8.4 0 4.1 3 7.5 7 8.4-1.2.6-2.6 1-4 1-4.8 0-8.6-3.8-8.6-8.5S7.8 4.5 12.6 4.5c1.4 0 2.7.4 3.9 1Z"/><path d="M18 8.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"/>',
  scales: '<path d="M12 3.5v17M7 20.5h10"/><path d="M4.5 7.5h15"/><path d="M4.5 7.5 2 13.5h5ZM19.5 7.5 17 13.5h5Z"/><path d="M12 3.5 4.5 7.5M12 3.5l7.5 4"/>',
  letterA: '<path d="m6.5 20.5 5.5-17 5.5 17"/><path d="M8.8 13.5h6.4"/>',
  envelope: '<rect x="3" y="5.5" width="18" height="13" rx="1"/><path d="m3.6 6.4 8.4 6.6 8.4-6.6"/>',
  raft: '<path d="M2.8 16.6h18.4M2.8 19.2h18.4"/><path d="M6.2 16.6v2.6M9.6 16.6v2.6M13 16.6v2.6M16.4 16.6v2.6M19.8 16.6v2.6"/><path d="M16.8 16.6V4.8"/><path d="M16.8 6c1.8.5 2.9 1.4 3.3 2.7h-3.3Z"/>',
  clockface: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5V12l3.5 2.4"/><path d="M12 3.5v1.5M20.5 12H19M12 20.5V19M3.5 12H5"/>',
  apple: '<path d="M12 7.6c2-2 4.4-2 6 .2 1.6 2.3 1 6.5-1.2 9.6-1.3 1.8-2.6 2.6-3.6 2.6-.6 0-1-.2-1.2-.3-.2.1-.6.3-1.2.3-1 0-2.3-.8-3.6-2.6C5 14.3 4.4 10.1 6 7.8c1.6-2.2 4-2.2 6-.2Z"/><path d="M12 7.6V4.5M12 4.5c1.8-1.2 3.2-1 4 .4-1.4 1-2.8 1-4-.4Z"/>',
  chain: '<rect x="2.4" y="9.1" width="10.4" height="5.8" rx="2.9"/><rect x="11.2" y="9.1" width="10.4" height="5.8" rx="2.9"/>',
  drum: '<path d="M3.8 8c0-1.5 3.7-2.8 8.2-2.8S20.2 6.5 20.2 8s-3.7 2.8-8.2 2.8S3.8 9.5 3.8 8Z"/><path d="M3.8 8v8c0 1.5 3.7 2.8 8.2 2.8s8.2-1.3 8.2-2.8V8"/><path d="m4.6 10.6 3.2 5.4M9.2 9.9l-2.3 6.6M14.8 9.9l2.3 6.6M19.4 10.6l-3.2 5.4"/>',
  hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M8 3.5v3.1c0 2 4 3.9 4 5.4s-4 3.4-4 5.4v3.1M16 3.5v3.1c0 2-4 3.9-4 5.4s4 3.4 4 5.4v3.1"/>',
  gable: '<path d="M3.5 12 12 4.5l8.5 7.5"/><path d="M5.5 10.8v9.7h13v-9.7"/><path d="M10 20.5v-5.5h4v5.5"/>',
  albatross: '<path d="M12 14.6c-.9 0-1.7-.9-1.7-2 0-1.4.6-2.8 1.7-4.1 1.1 1.3 1.7 2.7 1.7 4.1 0 1.1-.8 2-1.7 2Z"/><path d="M10.5 10.2C8.1 8 5.1 7.3 1.6 8.1c1.7 1.3 2.6 2.7 2.8 4.3 2-1 3.8-.8 5.4.5"/><path d="M13.5 10.2c2.4-2.2 5.4-2.9 8.9-2.1-1.7 1.3-2.6 2.7-2.8 4.3-2-1-3.8-.8-5.4.5"/>',
  beetle: '<ellipse cx="12" cy="13.5" rx="4.6" ry="6.4"/><path d="M12 7.1V20M7.4 9.5 3.5 7M16.6 9.5 20.5 7M7 13.5H3M17 13.5h4M7.6 17.6 4.2 20.4M16.4 17.6l3.4 2.8"/><circle cx="12" cy="5.2" r="2"/>',
  quill: '<path d="m3.8 20.2 5-5"/><path d="M8.8 15.2c-1.3-3.1.1-6.3 4-9.5C15.6 3.4 18.1 2.7 20.2 3c.3 2.1-.4 4.6-2.7 7.4-3.2 3.9-6.4 5.3-8.7 4.8Z"/><path d="M11.4 12.6c1.7-2.5 3.6-4.4 5.6-5.6"/>',
  holly: '<path d="M11 14.2 Q10.54 12.69 11.2 10.11 Q9.28 10.03 9.94 7.43 Q7.2 8.15 6.76 6.63 Q4.39 6.99 3.2 6.2 Q3.96 7.41 3.54 9.77 Q5.05 10.25 4.26 12.97 Q6.87 12.37 6.9 14.29 Q9.51 13.71 11 14.2Z"/><path d="M11 14.2L4.6 7.64"/><path d="M13 14.2 Q14.49 13.71 17.1 14.29 Q17.13 12.37 19.74 12.97 Q18.95 10.25 20.46 9.77 Q20.04 7.41 20.8 6.2 Q19.61 6.99 17.24 6.63 Q16.8 8.15 14.06 7.43 Q14.72 10.03 12.8 10.11 Q13.46 12.69 13 14.2Z"/><path d="M13 14.2L19.4 7.64"/><circle cx="10.4" cy="16.6" r="1.6"/><circle cx="13.6" cy="16.6" r="1.6"/><circle cx="12" cy="19.3" r="1.6"/>',
  fingerprint: '<path d="M12 21.5c-1.2-2-1.6-4.3-1.6-7.1"/><path d="M8.9 20.4c-1.1-2-1.5-4-1.5-6.2A4.6 4.6 0 0 1 12 9.6a4.6 4.6 0 0 1 4.6 4.6c0 1.3-.1 2.5-.4 3.6"/><path d="M5.8 17.9a13 13 0 0 1-.4-3.7A6.6 6.6 0 0 1 12 7.6a6.6 6.6 0 0 1 6.6 6.6"/><path d="M3.3 13.4A8.7 8.7 0 0 1 12 5.2a8.7 8.7 0 0 1 6.2 2.6"/><path d="M13.6 21c.5-1.9.7-3.9.7-6"/>',
  eclipse: '<circle cx="10.5" cy="12" r="5.6"/><circle cx="14.4" cy="10.6" r="5.6"/><path d="M10.5 3.4V1.8M4.1 5.6 3 4.5M2.9 12H1.3M4.1 18.4 3 19.5M10.5 22.2v-1.6"/>',
  mask: '<path d="M3.6 8.2c2.8-1 5.6-1.5 8.4-1.5s5.6.5 8.4 1.5c0 6-2.4 9.4-5.4 9.4-1.6 0-2.4-1.1-3-2.6-.6 1.5-1.4 2.6-3 2.6-3 0-5.4-3.4-5.4-9.4Z"/><path d="M7.2 11.2c.9-.5 1.9-.5 2.8 0M14 11.2c.9-.5 1.9-.5 2.8 0"/>',
  bars: '<rect x="4" y="3.5" width="16" height="17" rx="1"/><path d="M8.7 3.5v17M12 3.5v17M15.3 3.5v17"/>',
  ring: '<circle cx="12" cy="14.5" r="5.5"/><path d="M12 9 9.6 5.2h4.8L12 9Z"/><path d="M9.6 5.2 8.4 3.3h7.2l-1.2 1.9"/>',
  coin: '<ellipse cx="12" cy="7.6" rx="7.2" ry="2.8"/><path d="M4.8 7.6v3.2c0 1.5 3.2 2.8 7.2 2.8s7.2-1.3 7.2-2.8V7.6"/><path d="M4.8 11.6v3.2c0 1.5 3.2 2.8 7.2 2.8s7.2-1.3 7.2-2.8v-3.2"/><path d="M4.8 15.6v3.2c0 1.5 3.2 2.8 7.2 2.8s7.2-1.3 7.2-2.8v-3.2"/>',
  eagle: '<path d="M12 20.5V9.5"/><path d="M12 9.5 4 5.2c0 3.4 1.6 5.8 4.6 7L12 9.5Z"/><path d="M12 9.5 20 5.2c0 3.4-1.6 5.8-4.6 7L12 9.5Z"/><circle cx="12" cy="6.4" r="1.9"/><path d="M8.6 20.5h6.8"/>',
  mirror: '<circle cx="7.6" cy="7.4" r="3.1"/><path d="M2.6 20.6c0-2.8 2.2-5 5-5s5 2.2 5 5"/><circle cx="16.4" cy="7.4" r="3.1"/><path d="M11.4 20.6c0-2.8 2.2-5 5-5s5 2.2 5 5"/>',
  owl: '<path d="M12 21c-3.6 0-6.4-2.9-6.4-6.6 0-4.4 2-8.7 6.4-11.4 4.4 2.7 6.4 7 6.4 11.4C18.4 18.1 15.6 21 12 21Z"/><circle cx="9.4" cy="11" r="1.9"/><circle cx="14.6" cy="11" r="1.9"/><path d="m12 13.6-1.3 1.7h2.6L12 13.6Z"/>',
  thorn: '<path d="M12 21.5V4.5"/><path d="M12 9 7.2 6.2M12 13.2l4.8-2.8M12 17.4l-4 -2.4"/><path d="m7.2 6.2 1.3 1.2M16.8 10.4l-1.3 1.2M8 15l1.3 1.2"/>',
  funnel: '<path d="M3.4 17.6c2.6-1 5.5-1.5 8.6-1.5s6 .5 8.6 1.5"/><path d="M5.6 8.4h12.8L12 18.2Z"/><path d="M12 18.2v2.6"/>',
  pine: '<path d="M12 21v-3"/><path d="M12 3.2 7.4 9.4h9.2Z"/><path d="M12 8.2 5.8 14h12.4Z"/><path d="M12 12.6 4.4 18.4h15.2Z"/>',
  pentacle: '<circle cx="12" cy="12" r="9"/><path d="M12 3.4 19 18.2 4.2 9.2h15.6L5 18.2Z"/>',
  chasm: '<path d="M2.2 8.6h7c.5 3.4.8 7.3.8 11.8"/><path d="M21.8 8.6h-7c-.5 3.4-.8 7.3-.8 11.8"/><path d="M10.6 12.4h1.2M12.2 15.4h1.2M10.4 18.4h1.2"/>',
  whistle: '<path d="M9 9h4.8c2.5 0 4.5 1.3 4.5 2.9s-2 2.9-4.5 2.9H9a2.9 2.9 0 0 1 0-5.8Z"/><circle cx="11.6" cy="11.9" r="1.1"/><path d="M9 9 3.6 7.3v9.2L9 14.8"/>',
  pumpkin: '<path d="M12 7.4C9.8 6.4 6.3 6.7 4.4 8.7 2.7 10.5 2.5 14.6 3.9 17.1c1.4 2.5 5 3.5 8.1 2.5 3.1 1 6.7 0 8.1-2.5 1.4-2.5 1.2-6.6-.5-8.4-1.9-2-5.4-2.3-7.6-1.3Z"/><path d="M9.3 7.1c-1.9 2.6-2.1 9.6.1 12.8"/><path d="M14.7 7.1c1.9 2.6 2.1 9.6-.1 12.8"/><path d="M12 7.4c-.1-1.5.3-2.7 1.3-3.6"/><path d="M13.3 4.8c1.1-.8 2.5-.9 3.6-.2-1.1.9-2.4 1-3.6.2Z"/>',
  // A roof over walls that are only dotted in: the house that is not there.
  hauntedhouse: '<path d="M3.5 11.5 12 4.5l8.5 7"/><path d="M16.6 8.3V5.3h2v4.3"/><path d="M5.5 10.3v10.2h13V10.3" stroke-dasharray="0 2.25"/><path d="M10.6 13.4h2.8v2.8h-2.8z"/>',
  // Eight for the Dickens Christmas books and the Shakespeare records of September 2026.
  bell: '<path d="M12 6.6V4.2"/><path d="M10.4 4.2h3.2"/><path d="M5.5 17.2 7 16c1-1.5 1-3.5 1-5 0-2.6 1.8-4.4 4-4.4s4 1.8 4 4.4c0 1.5 0 3.5 1 5l1.5 1.2Z"/><circle cx="12" cy="19.3" r="1.3"/>',
  retort: '<path d="M6.3 10.9C6.6 6.9 10.3 5.4 12.9 7.1L21 12.9"/><path d="M10.6 10.6c-.2-1.4.8-2.1 1.9-1.4l7.9 5"/><path d="M21 12.9c.4.5.1 1.1-.6 1.3"/><path d="M11 11.1a4.4 4.4 0 1 1-4.7-.2"/><path d="M4.4 16c2.4.9 5.2.9 7.6 0"/><path d="M8.2 19.4v1.6"/><path d="M4.8 21h6.8"/>',
  kettle: '<path d="M6 19.8h12"/><path d="M6.8 19.8c-.8-3.4-.3-6.9 2.3-8.6h6c2.6 1.7 3.1 5.2 2.3 8.6"/><path d="M11 11.2v-.9a1 1 0 0 1 2 0v.9"/><path d="M8.6 11.2c0-4.3 6.8-4.3 6.8 0"/><path d="M7.1 14.3 3.8 11.6l-.5 1.5 3.4 3.2"/><path d="M3.4 9.4c-.6-.8-.1-1.6.5-2.2.6-.6.9-1.4.4-2.1"/>',
  anemone: '<ellipse cx="12" cy="6.3" rx="2.2" ry="1.5" transform="rotate(-90 12 6.3)"/><ellipse cx="14.68" cy="7.85" rx="2.2" ry="1.5" transform="rotate(-30 14.68 7.85)"/><ellipse cx="14.68" cy="10.95" rx="2.2" ry="1.5" transform="rotate(30 14.68 10.95)"/><ellipse cx="12" cy="12.5" rx="2.2" ry="1.5" transform="rotate(90 12 12.5)"/><ellipse cx="9.32" cy="10.95" rx="2.2" ry="1.5" transform="rotate(150 9.32 10.95)"/><ellipse cx="9.32" cy="7.85" rx="2.2" ry="1.5" transform="rotate(210 9.32 7.85)"/><circle cx="12" cy="9.4" r="1.6" fill="currentColor" fill-opacity=".35"/><path d="M12 13.9V21"/><path d="M12 18.1c-2.1-.2-3.5-1.4-4.1-3.1 2.1 0 3.5 1.1 4.1 3.1Z"/>',
  tankard: '<path d="M7 7.2h8.5v12.3a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1Z"/><path d="M15.5 9.6h1.7a2 2 0 0 1 2 2v3.4a2 2 0 0 1-2 2h-1.7"/><path d="M6.4 7.2h9.7c0-1.6-1.2-2.6-2.6-2.6H9c-1.4 0-2.6 1-2.6 2.6Z"/><path d="M7 11h8.5"/><path d="M7 16.6h8.5"/>',
  basket: '<path d="M3.5 10.5h17"/><path d="M4.6 10.5 6.2 20h11.6l1.6-9.5"/><path d="M9.2 10.5l.4 9.5"/><path d="M12 10.5V20"/><path d="M14.8 10.5l-.4 9.5"/><path d="M5.4 15.2h13.2"/><path d="M7.5 10.5c.2-2.6 1.5-4 3-4"/><path d="M16.5 10.5c-.2-2.6-1.5-4-3-4"/><path d="M10.5 6.5h3"/>',
  mortar: '<path d="M4.5 12h15c0 4.3-3.2 7-7.5 7s-7.5-2.7-7.5-7Z"/><path d="M9.2 19l-.9 1.8h7.4l-.9-1.8"/><path d="M13 12l5.6-7.6a1.3 1.3 0 0 1 2.1 1.5L14.6 12"/>',
  ladder: '<path d="M4.5 4.5h15"/><path d="M8 4.5V20.5"/><path d="M16 4.5V20.5"/><path d="M8 8.4h8"/><path d="M8 12.2h8"/><path d="M8 16h8"/><path d="M8 19.8h8"/><path d="M8 4.5c-.9.6-.9 1.6 0 2.2"/><path d="M16 4.5c.9.6.9 1.6 0 2.2"/>',
  fleuron: '<path d="M12 4c1.9 2.4 3.5 4.2 4.7 5.4 2 1.9 2 4.2 0 6.1-1.2 1.2-2.8 3-4.7 5.4-1.9-2.4-3.5-4.2-4.7-5.4-2-1.9-2-4.2 0-6.1C8.5 8.2 10.1 6.4 12 4Z"/><circle cx="12" cy="12.4" r="2.1"/>'
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
  'the-metamorphosis': 'beetle',
  'puddnhead-wilson': 'fingerprint',
  'a-connecticut-yankee-in-king-arthurs-court': 'eclipse',
  'the-man-who-was-thursday': 'mask',
  'the-yellow-wallpaper-and-the-giant-wistaria': 'bars',
  cymbeline: 'ring',
  'timon-of-athens': 'coin',
  'titus-andronicus': 'eagle',
  'comedy-of-errors': 'mirror',
  'loves-labours-lost': 'owl',
  'lyrical-ballads': 'thorn',
  'shakespeares-sonnets': 'quill',
  'the-willows': 'funnel',
  'the-wendigo': 'pine',
  'carnacki-the-ghost-finder': 'pentacle',
  'the-house-on-the-borderland': 'chasm',
  'm-r-james-collected-ghost-stories': 'whistle',
  'sleepy-hollow-and-other-stories': 'pumpkin',
  'american-ghost-stories': 'hauntedhouse',
  'the-chimes': 'bell',
  'the-haunted-man-and-the-ghosts-bargain': 'retort',
  'cricket-on-the-hearth': 'kettle',
  'venus-and-adonis': 'anemone',
  'henry-iv-part-2': 'tankard',
  'merry-wives-of-windsor': 'basket',
  'alls-well-that-ends-well': 'mortar',
  'the-two-gentlemen-of-verona': 'ladder'
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

const BY_FORM = { poem: 'laurel', 'poetry collection': 'laurel', 'non-fiction': 'column', memoir: 'column', 'story collection': 'quatrefoil' };
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

'use strict';
// Regenerates the rooms section of passage-room/index.html.
//
// The order of readings and their metadata come from the discovery index;
// each card's copy and tint come from scripts/passage-cards.json; and the
// room a reading is shelved in is derived from the paper treatment set on
// its own page, so the hub and the pages can never disagree.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const hubFile = path.join(root, 'passage-room', 'index.html');
const cardsFile = path.join(__dirname, 'passage-cards.json');
const discovery = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'content-index.json'), 'utf8'));
const cards = JSON.parse(fs.readFileSync(cardsFile, 'utf8'));

const ROOMS = [
  ['playhouse', 'The playhouse', 'Speeches with their cues and line numbers.', 'Drama from Marlowe, Shakespeare and Webster: soliloquies, set-pieces and exchanges, set as a prompt-book with speaker cues and numbered lines.'],
  ['verse', 'The verse room', 'Poems, numbered.', 'Sonnet, epic and lyric, with line numbers in the gutter—and, for the Mariner, Coleridge’s own marginal gloss.'],
  ['manuscripts', 'The manuscript room', 'Journals, letters, statements, narratives.', 'Texts that are written documents inside their fiction: a shorthand journal, a confession, a slave narrative, a first letter home.'],
  ['openings', 'Openings', 'First pages.', 'The first sentences of great books, read for what they promise and what they already know.'],
  ['endings', 'Endings', 'Last pages.', 'Final paragraphs and the weight they carry: a black flag, a boat against the current, a fly in the waste-paper basket.'],
  ['prose', 'The prose room', 'Scenes, arguments, portraits.', 'Novels, epics in prose, a treatise, a preface: passages where a scene or an argument turns.']
];
const FORM = [
  ['paper-script', 'playhouse', 'Playscript'],
  ['paper-verse', 'verse', 'Verse'],
  ['paper-journal', 'manuscripts', 'Manuscript'],
  ['paper-opening', 'openings', 'Opening'],
  ['paper-closing', 'endings', 'Ending'],
  ['paper-aphorism', 'prose', 'Aphorisms']
];

function roomFor(slug) {
  const page = fs.readFileSync(path.join(root, 'passage-room', slug, 'index.html'), 'utf8');
  const classes = (page.match(/<div class="passage-paper([^"]*)"/) || [, ''])[1].split(/\s+/);
  for (const [cls, room, label] of FORM) if (classes.includes(cls)) return { room, label };
  return { room: 'prose', label: 'Prose' };
}

const groups = Object.fromEntries(ROOMS.map(([key]) => [key, []]));
discovery.passages.forEach((passage, index) => {
  const slug = passage.href.split('/')[2];
  const card = cards[slug];
  if (!card) throw new Error('No card copy in scripts/passage-cards.json for ' + slug);
  const { room, label } = roomFor(slug);
  const number = String(index + 1).padStart(2, '0');
  groups[room].push(
    '<a class="passage-card ' + card.tint + '" href="' + passage.href + '">' +
    '<i class="passage-card-form">' + label + '</i>' +
    '<span class="passage-card-number">' + number + '</span>' +
    '<small>' + card.small + '</small>' +
    '<blockquote>' + card.quote + '</blockquote>' +
    '<p>' + card.blurb + '</p>' +
    '<b>Read with the notes <span aria-hidden="true">&rarr;</span></b></a>'
  );
});

const nav = '<nav class="passage-hub-nav" aria-label="Rooms"><span>Rooms</span>' +
  ROOMS.map(([key, title]) => '<a href="#' + key + '">' + title + '<small>' + groups[key].length + '</small></a>').join('') +
  '</nav>';
const sections = ROOMS.map(([key, title, heading, deck]) =>
  '    <section class="passage-room" id="' + key + '" aria-labelledby="' + key + '-title">\n' +
  '      <div class="passage-room-head"><div><span>' + title + '</span><h3 id="' + key + '-title">' + heading + '</h3></div><p>' + deck + '</p></div>\n' +
  '      <div class="passage-card-grid">\n' +
  groups[key].map(card => '        ' + card + '\n').join('') +
  '      </div>\n    </section>\n'
).join('');

let hub = fs.readFileSync(hubFile, 'utf8');
const start = hub.indexOf('    <nav class="passage-hub-nav"');
const end = hub.lastIndexOf('  </section>\n  <section class="passage-next">');
if (start < 0 || end < 0) throw new Error('Could not find the rooms section of the Passage Room hub');
hub = hub.slice(0, start) + '    ' + nav + '\n' + sections + hub.slice(end);

const total = discovery.passages.length;
const words = { 15: 'Fifteen', 30: 'Thirty', 42: 'Forty-two', 54: 'Fifty-four', 66: 'Sixty-six', 78: 'Seventy-eight', 90: 'Ninety' };
const word = words[total] || String(total);
hub = hub.replace(/<p class="kicker">[A-Za-z-]+ close readings<\/p>/, '<p class="kicker">' + word + ' close readings</p>');
hub = hub.replace(/<p class="deck">[A-Za-z-]+ passages from drama/, '<p class="deck">' + word + ' passages from drama');
hub = hub.replace(/content="Read [a-z-]+ passages from/, 'content="Read ' + word.toLowerCase() + ' passages from');
fs.writeFileSync(hubFile, hub);
console.log('Rebuilt the Passage Room hub with ' + total + ' readings in ' + ROOMS.length + ' rooms: ' + ROOMS.map(([k, t]) => t + ' ' + groups[k].length).join(', ') + '.');

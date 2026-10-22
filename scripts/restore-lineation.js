// Puts the line breaks back into verse quotations, from each record's own
// source text.
//
//   node scripts/restore-lineation.js                  report what would change
//   node scripts/restore-lineation.js --write          write the changes
//   node scripts/restore-lineation.js --write macbeth  only these records
//   node scripts/restore-lineation.js --why macbeth    say why longer lines were left
//
// The records stored every quotation as one run of words, so a line of verse
// read as prose with stray capitals: "the fruit Of that forbidden Tree". This
// finds each quotation in the source named by `sourceText.url` (the same
// text scripts/verify-quotations.js checks it against, cached in
// .cache/sources/) and copies the source's line breaks into it as "\n".
//
// Only verse is lineated. Sources break prose too (the MIT Shakespeare keeps
// the Globe's numbered prose lines, Project Gutenberg wraps at seventy
// characters), so a quotation takes its breaks only when every new line opens
// with a capital, as verse does and wrapped prose almost never does, and no
// line is longer than a verse line runs. A quotation already lineated, one
// with an ellipsis, or one that follows an emended reading is left alone.
// Line ends marked by hand as " / " become line breaks too.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cacheDir = path.join(root, '.cache', 'sources');
const emendations = JSON.parse(fs.readFileSync(path.join(__dirname, 'quotation-emendations.json'), 'utf8'));
const VERSE_FORMS = new Set(['play', 'poem', 'poetry collection']);
const LONGEST_LINE = 16;

// The same reduction scripts/verify-quotations.js uses, applied a word at a time.
function normalise(text) {
  return String(text)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/æ/gi, 'ae').replace(/œ/gi, 'oe')
    .toLowerCase()
    .replace(/--+|[–—]/g, ' ')
    .replace(/(?<=[a-z])-(?=[a-z])/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };

// The source as plain text with one line of the original to a line.
function linesOf(body, url) {
  if (!/<(?:html|body)\b/i.test(body)) return body.replace(/\r\n?/g, '\n');
  let text = body.replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, ' ');
  if (/shakespeare\.mit\.edu/.test(url)) text = text.replace(/<p>\s*<i>[\s\S]*?<\/i>\s*<\/p>/gi, '\n');
  return text
    .replace(/\s*\n\s*/g, ' ')
    .replace(/<\/?(?:p|br|div|h[1-6]|li|ul|ol|dl|dt|dd|table|tr|td|th|section|article|header|footer|blockquote|figure|figcaption|hr|title|body|html)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&([a-z]+);/gi, (entity, name) => ENTITIES[name.toLowerCase()] ?? ' ');
}

function sourceFile(url) {
  return path.join(cacheDir, url.replace(/[^a-z0-9]+/gi, '_').slice(-120));
}

async function fetchSource(url) {
  const file = sourceFile(url);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error('could not fetch ' + url + ' (' + response.status + ')');
    fs.writeFileSync(file, await response.text());
  }
  return linesOf(fs.readFileSync(file, 'utf8'), url);
}

// The source as a list of normalised words, each marked if a line of the
// original begins with it.
function wordsOf(text) {
  const words = [];
  const pattern = /\S+/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text))) {
    const broken = text.slice(last, match.index).includes('\n');
    normalise(match[0]).split(' ').filter(Boolean).forEach((word, index) => words.push({ word, broken: broken && index === 0 }));
    last = match.index + match[0].length;
  }
  return words;
}

// Where each run of words starts, for finding a quotation quickly.
function indexOf(words) {
  const at = new Map();
  words.forEach((entry, index) => {
    if (!at.has(entry.word)) at.set(entry.word, []);
    at.get(entry.word).push(index);
  });
  return at;
}

// A quotation's words, each tied to the word of the quotation it came from.
function quotationWords(text) {
  const raw = text.split(/\s+/).filter(Boolean);
  const words = [];
  raw.forEach((token, position) => normalise(token).split(' ').filter(Boolean)
    .forEach((word, index) => words.push({ word, position, first: index === 0 })));
  return { raw, words };
}

function find(source, at, words) {
  for (const start of at.get(words[0]?.word) || []) {
    if (words.every((entry, offset) => source[start + offset]?.word === entry.word)) return start;
  }
  return -1;
}

const opensWithCapital = token => /^[^\p{L}]*\p{Lu}/u.test(token);

// The quotation with the source's line breaks, or null if it should stay as it is.
function lineate(text, source, at, why = () => {}) {
  if (/\n/.test(text) || /…|\.\.\./.test(text)) return why('already lineated, or has an ellipsis');
  const { raw, words } = quotationWords(text);
  if (words.length < 2) return null;
  const start = find(source, at, words);
  if (start === -1) return why('not found word for word in the source');
  const breaks = new Set();
  words.forEach((entry, offset) => {
    if (offset && entry.first && source[start + offset].broken) breaks.add(entry.position);
  });
  if (!breaks.size) return why('one line in the source');
  if (![...breaks].every(position => opensWithCapital(raw[position]))) return why('a line opens in lower case (prose)');
  const lines = [];
  let line = [];
  raw.forEach((token, position) => {
    if (breaks.has(position)) { lines.push(line); line = []; }
    line.push(token);
  });
  lines.push(line);
  if (lines.some(words => words.length > LONGEST_LINE)) return why('a line is longer than verse runs');
  return lines.map(words => words.join(' ')).join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const explain = args.includes('--why');
  const wanted = args.filter(arg => !arg.startsWith('--'));
  const dir = path.join(root, 'data', 'books');
  let changed = 0;
  let left = 0;
  for (const name of fs.readdirSync(dir).filter(file => file.endsWith('.json')).sort()) {
    const slug = name.replace(/\.json$/, '');
    if (wanted.length && !wanted.includes(slug)) continue;
    const file = path.join(dir, name);
    let stored = fs.readFileSync(file, 'utf8');
    const book = JSON.parse(stored);
    if (!VERSE_FORMS.has(book.form)) continue;
    const urls = [].concat(book.sourceText?.url || []);
    if (!urls.length) continue;
    const source = wordsOf((await Promise.all(urls.map(fetchSource))).join('\n'));
    const at = indexOf(source);
    const emended = emendations[slug] || {};
    let here = 0;
    for (const quotation of book.quotations) {
      if (emended[quotation.id]) continue;
      // Two verse collections marked their line ends with " / " by hand.
      const lined = / \/ /.test(quotation.text)
        ? quotation.text.replace(/\s+\/\s+/g, '\n')
        : lineate(quotation.text, source, at, reason => {
          if (explain && quotation.text.split(/\s+/).length >= 10) console.log('  left ' + quotation.id + ': ' + reason);
          return null;
        });
      if (!lined) { left += 1; continue; }
      here += 1;
      if (!write) console.log('  ' + slug + ' ' + quotation.id + '\n    ' + lined.replace(/\n/g, '\n    '));
      // Edited in place, so the rest of a hand-formatted record is untouched:
      // the text that follows this quotation's id is the one replaced.
      const anchor = stored.indexOf('"id": ' + JSON.stringify(quotation.id) + ',');
      const before = '"text": ' + JSON.stringify(quotation.text);
      const place = anchor === -1 ? -1 : stored.indexOf(before, anchor);
      if (place === -1) throw new Error(slug + ': could not find the stored text of ' + quotation.id);
      stored = stored.slice(0, place) + '"text": ' + JSON.stringify(lined) + stored.slice(place + before.length);
      quotation.text = lined;
    }
    changed += here;
    if (here) console.log(slug + ': ' + here + ' of ' + book.quotations.length + ' lineated');
    if (write && here) {
      if (JSON.stringify(JSON.parse(stored)) !== JSON.stringify(book)) throw new Error(slug + ': the edited record does not match');
      fs.writeFileSync(file, stored);
    }
  }
  console.log(changed + ' quotations lineated' + (write ? '' : ' (not written; add --write)') + ', ' + left + ' left as they were');
}

main().catch(error => { console.error(error.message); process.exit(1); });
